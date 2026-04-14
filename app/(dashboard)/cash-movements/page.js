// app/(dashboard)/cash-movements/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    Banknote,
    TrendingUp,
    TrendingDown,
    Calendar,
    Search,
    Filter,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    Download,
    RefreshCw,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    User,
    Hash,
    MessageSquare,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    DollarSign,
    Wallet,
    Receipt,
    FileText,
    X,
    Printer,
    Plus,
    Upload,
    Check,
    Shield
} from 'lucide-react';

export default function CashMovementsPage() {
    const supabase = createClient();
    const [transactions, setTransactions] = useState([]);
    const [cashBalance, setCashBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [stats, setStats] = useState({
        total_inflows: 0,
        total_outflows: 0,
        net_change: 0,
        transaction_count: 0,
        pending_count: 0,
        confirmed_count: 0
    });
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [canApprove, setCanApprove] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [approvingId, setApprovingId] = useState(null);
    const [depositForm, setDepositForm] = useState({
        amount: '',
        reference: '',
        notes: '',
        deposit_date: new Date().toISOString().split('T')[0],
        deposit_method: 'CASH'
    });

    useEffect(() => {
        fetchCurrentUser();
        fetchCashBalance();
        fetchTransactions();
    }, [filterType, filterStatus, dateRange]);

    useEffect(() => {
        if (currentUser) {
            fetchUserRole();
        }
    }, [currentUser]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUser(user);
            console.log('Current user:', user.email, user.id);
        }
    };

    const fetchUserRole = async () => {
        if (!currentUser) return;
        
        try {
            // Query using user_id
            const { data, error } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', currentUser.id)
                .maybeSingle();
            
            console.log('User role query result:', data, error);
            
            if (!error && data) {
                setUserRole(data);
                // Check if user can approve
                const canApproveRoles = ['admin', 'finance_manager', 'accountant', 'finance_assistant'];
                const hasApprovePermission = canApproveRoles.includes(data.role) || data.can_approve_transactions === true;
                setCanApprove(hasApprovePermission);
                console.log('Can approve:', hasApprovePermission, 'Role:', data.role);
            } else {
                console.log('No role found for user');
                // If no role found, try to add as admin (for testing)
                const { data: newRole, error: insertError } = await supabase
                    .from('user_roles')
                    .insert([{
                        user_id: currentUser.id,
                        role: 'admin',
                        can_approve_transactions: true,
                        can_record_deposits: true,
                        can_fully_approve: true
                    }])
                    .select()
                    .single();
                
                if (!insertError && newRole) {
                    console.log('Created admin role for user');
                    setUserRole(newRole);
                    setCanApprove(true);
                } else {
                    setUserRole({ role: 'viewer', can_approve_transactions: false });
                    setCanApprove(false);
                }
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRole({ role: 'viewer', can_approve_transactions: false });
            setCanApprove(false);
        }
    };

    const fetchCashBalance = async () => {
        const { data, error } = await supabase
            .from('finance_cash_balance')
            .select('current_balance, last_updated, updated_by')
            .eq('singleton', true)
            .single();

        if (!error && data) {
            setCashBalance(data);
        } else if (error && error.code === 'PGRST116') {
            const { data: newBalance } = await supabase
                .from('finance_cash_balance')
                .insert([{ current_balance: 0, updated_by: currentUser?.email || 'system' }])
                .select()
                .single();
            if (newBalance) setCashBalance(newBalance);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        let query = supabase
            .from('finance_cash_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (filterType !== 'all') query = query.eq('transaction_type', filterType);
        if (filterStatus !== 'all') query = query.eq('status', filterStatus);
        if (dateRange.start) query = query.gte('created_at', dateRange.start);
        if (dateRange.end) query = query.lte('created_at', dateRange.end);

        const { data, error } = await query;
        if (!error && data) {
            setTransactions(data);
            calculateStats(data);
        }
        setLoading(false);
    };

    const calculateStats = (transactionsData) => {
        const inflows = transactionsData
            .filter(t => t.transaction_type === 'CASH_IN' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);
        const outflows = transactionsData
            .filter(t => t.transaction_type === 'PAYMENT_OUT' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);
        const pending = transactionsData.filter(t => t.status === 'pending').length;
        const confirmed = transactionsData.filter(t => t.status === 'confirmed').length;

        setStats({
            total_inflows: inflows,
            total_outflows: outflows,
            net_change: inflows - outflows,
            transaction_count: transactionsData.length,
            pending_count: pending,
            confirmed_count: confirmed
        });
    };

    const formatUGX = (amount) => {
        if (!amount && amount !== 0) return 'Ush 0';
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('UGX', 'Ush');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-UG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionTypeBadge = (type) => {
        if (type === 'CASH_IN') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <TrendingUp size={12} />
                    DEPOSIT
                </span>
            );
        } else if (type === 'PAYMENT_OUT') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                    <TrendingDown size={12} />
                    PAYMENT
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200">
                {type}
            </span>
        );
    };

    const getStatusBadge = (status) => {
        if (status === 'confirmed') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle size={12} />
                    approved
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                <Clock size={12} />
                pending approval
            </span>
        );
    };

    const handleDeposit = async () => {
        if (!depositForm.amount || depositForm.amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setProcessing(true);
        try {
            const transactionReference = depositForm.reference || `DEPOSIT-${Date.now()}`;
            
            const { error: transactionError } = await supabase
                .from('finance_cash_transactions')
                .insert([{
                    transaction_type: 'CASH_IN',
                    amount: parseFloat(depositForm.amount),
                    balance_after: (cashBalance?.current_balance || 0) + parseFloat(depositForm.amount),
                    reference: transactionReference,
                    notes: depositForm.notes || `Cash deposit via ${depositForm.deposit_method}`,
                    created_by: currentUser?.email || 'system',
                    status: 'pending'
                }]);

            if (transactionError) throw transactionError;

            alert('Deposit recorded successfully! Waiting for approval.');
            setShowDepositModal(false);
            setDepositForm({
                amount: '',
                reference: '',
                notes: '',
                deposit_date: new Date().toISOString().split('T')[0],
                deposit_method: 'CASH'
            });
            fetchTransactions();
        } catch (error) {
            alert('Error recording deposit: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmTransaction = async (transaction) => {
        const action = transaction.transaction_type === 'CASH_IN' ? 'deposit' : 'payment';
        
        const confirmMessage = `You are about to approve this ${action} of ${formatUGX(transaction.amount)}.\n\nThis will update the cash balance immediately.\n\nDo you want to proceed?`;
        
        if (!confirm(confirmMessage)) return;

        setApprovingId(transaction.id);
        setProcessing(true);
        
        try {
            console.log('Approving transaction:', transaction.id);
            
            // Calculate new balance after approval
            let newBalance = cashBalance?.current_balance || 0;
            if (transaction.transaction_type === 'CASH_IN') {
                newBalance += transaction.amount;
            } else {
                newBalance -= transaction.amount;
            }
            
            // Update transaction status to confirmed
            const { error: updateError } = await supabase
                .from('finance_cash_transactions')
                .update({
                    status: 'confirmed',
                    confirmed_by: currentUser?.email,
                    confirmed_at: new Date().toISOString(),
                    approval_role: userRole?.role,
                    balance_after: newBalance
                })
                .eq('id', transaction.id);

            if (updateError) {
                console.error('Update error:', updateError);
                throw updateError;
            }
            
            // Update cash balance
            const { error: balanceError } = await supabase
                .from('finance_cash_balance')
                .update({
                    current_balance: newBalance,
                    updated_by: currentUser?.email,
                    last_updated: new Date().toISOString()
                })
                .eq('singleton', true);

            if (balanceError) {
                console.error('Balance update error:', balanceError);
                // Don't throw, transaction is approved but balance update failed
                alert('Transaction approved but balance update failed. Please check records.');
            }
            
            alert(`✅ ${action.charAt(0).toUpperCase() + action.slice(1)} approved successfully!`);
            fetchTransactions();
            fetchCashBalance();
        } catch (error) {
            console.error('Approval error:', error);
            alert('Error approving transaction: ' + error.message);
        } finally {
            setProcessing(false);
            setApprovingId(null);
        }
    };

    const handleRejectTransaction = async (transaction) => {
        if (!confirm(`Reject this transaction of ${formatUGX(transaction.amount)}? This action cannot be undone.`)) return;

        setApprovingId(transaction.id);
        setProcessing(true);
        
        try {
            const { error } = await supabase
                .from('finance_cash_transactions')
                .delete()
                .eq('id', transaction.id);

            if (error) throw error;
            
            alert('Transaction rejected and removed!');
            fetchTransactions();
        } catch (error) {
            console.error('Rejection error:', error);
            alert('Error rejecting transaction: ' + error.message);
        } finally {
            setProcessing(false);
            setApprovingId(null);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            (t.reference || '').toLowerCase().includes(search) ||
            (t.notes || '').toLowerCase().includes(search) ||
            t.created_by.toLowerCase().includes(search)
        );
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header with Buttons */}
                <div className="mb-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Cash Movements</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Monitor and manage cash transactions
                                {userRole && (
                                    <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                        canApprove ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        <Shield size={12} />
                                        Role: {userRole.role} {canApprove ? '(Can Approve)' : '(View Only)'}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDepositModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-md"
                            >
                                <Plus size={18} />
                                Record Deposit
                            </button>
                            <button
                                onClick={() => {
                                    fetchTransactions();
                                    fetchCashBalance();
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Current Balance</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{formatUGX(cashBalance?.current_balance)}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <Wallet size={22} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Last updated: {formatDate(cashBalance?.last_updated)}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Total Inflows</p>
                                <p className="text-xl font-bold text-emerald-600 mt-1">{formatUGX(stats.total_inflows)}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <TrendingUp size={22} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-xs text-emerald-600 mt-3">Approved deposits</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Total Outflows</p>
                                <p className="text-xl font-bold text-red-600 mt-1">{formatUGX(stats.total_outflows)}</p>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg">
                                <TrendingDown size={22} className="text-red-600" />
                            </div>
                        </div>
                        <p className="text-xs text-red-600 mt-3">Approved payments</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-blue-100 uppercase">Net Change</p>
                                <p className={`text-xl font-bold mt-1 ${stats.net_change >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {formatUGX(Math.abs(stats.net_change))}
                                    <span className="text-xs ml-1">{stats.net_change >= 0 ? 'inflow' : 'outflow'}</span>
                                </p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-lg">
                                <PieChart size={22} className="text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-blue-100 mt-3">{stats.transaction_count} total transactions</p>
                    </div>
                </div>

                {/* Pending Alert with Approval Info */}
                {stats.pending_count > 0 && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="text-amber-600" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-amber-800">
                                    {stats.pending_count} transaction(s) awaiting approval
                                </p>
                                {canApprove ? (
                                    <p className="text-xs text-amber-700 mt-1">
                                        You have approval权限. Click the ✅ button to approve or ❌ to reject pending transactions.
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-700 mt-1">
                                        Waiting for finance team approval.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700"
                            >
                                <Filter size={16} />
                                Filters
                                <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by reference or user..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="all">All Types</option>
                                    <option value="CASH_IN">Deposits</option>
                                    <option value="PAYMENT_OUT">Payments</option>
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="all">All Status</option>
                                    <option value="confirmed">Approved</option>
                                    <option value="pending">Pending Approval</option>
                                </select>
                                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Start Date" />
                                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="End Date" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Created By</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center">
                                            <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto" />
                                            <p className="text-sm text-gray-500 mt-2">Loading...</p>
                                        </td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center">
                                            <Banknote size={48} className="text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No transactions found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(transaction.created_at)}</td>
                                            <td className="px-6 py-4">{getTransactionTypeBadge(transaction.transaction_type)}</td>
                                            <td className={`px-6 py-4 text-right text-sm font-bold ${transaction.transaction_type === 'CASH_IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {transaction.transaction_type === 'CASH_IN' ? '+' : '-'} {formatUGX(transaction.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{transaction.reference || '-'}</td>
                                            <td className="px-6 py-4 text-center">{getStatusBadge(transaction.status)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{transaction.created_by}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedTransaction(transaction);
                                                            setShowDetailsModal(true);
                                                        }} 
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" 
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {/* Approve button - always show for pending transactions */}
                                                    {transaction.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleConfirmTransaction(transaction)} 
                                                            disabled={processing && approvingId === transaction.id}
                                                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1" 
                                                            title="Approve Transaction"
                                                        >
                                                            {processing && approvingId === transaction.id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <CheckCircle size={14} />
                                                            )}
                                                            <span className="text-xs">Approve</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && filteredTransactions.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTransactions.length)} of {filteredTransactions.length}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded border bg-white disabled:opacity-50">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-3 py-1 text-sm">{currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded border bg-white disabled:opacity-50">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDepositModal(false)}>
                    <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Record Cash Deposit</h3>
                                <button onClick={() => setShowDepositModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (UGX) *</label>
                                <input
                                    type="number"
                                    value={depositForm.amount}
                                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                                    placeholder="Enter amount"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                                <input
                                    type="text"
                                    value={depositForm.reference}
                                    onChange={(e) => setDepositForm({ ...depositForm, reference: e.target.value })}
                                    placeholder="Reference number"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea
                                    value={depositForm.notes}
                                    onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Additional notes..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-700">
                                    ⓘ This deposit will be recorded as <strong>pending approval</strong>. 
                                    You can approve it immediately using the Approve button.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowDepositModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleDeposit} disabled={processing || !depositForm.amount} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {processing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Record Deposit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-500">Amount</p>
                                <p className={`text-2xl font-bold ${selectedTransaction.transaction_type === 'CASH_IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {selectedTransaction.transaction_type === 'CASH_IN' ? '+' : '-'} {formatUGX(selectedTransaction.amount)}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p><span className="text-sm text-gray-500">Type:</span> <span className="text-sm font-medium">{selectedTransaction.transaction_type === 'CASH_IN' ? 'Deposit' : 'Payment'}</span></p>
                                <p><span className="text-sm text-gray-500">Status:</span> <span className="text-sm font-medium capitalize">{selectedTransaction.status}</span></p>
                                <p><span className="text-sm text-gray-500">Reference:</span> <span className="text-sm font-mono">{selectedTransaction.reference || '-'}</span></p>
                                <p><span className="text-sm text-gray-500">Created By:</span> <span className="text-sm">{selectedTransaction.created_by}</span></p>
                                <p><span className="text-sm text-gray-500">Created At:</span> <span className="text-sm">{formatDate(selectedTransaction.created_at)}</span></p>
                                {selectedTransaction.confirmed_by && (
                                    <>
                                        <p><span className="text-sm text-gray-500">Approved By:</span> <span className="text-sm">{selectedTransaction.confirmed_by}</span></p>
                                        <p><span className="text-sm text-gray-500">Approved At:</span> <span className="text-sm">{formatDate(selectedTransaction.confirmed_at)}</span></p>
                                    </>
                                )}
                                {selectedTransaction.notes && (
                                    <p><span className="text-sm text-gray-500">Notes:</span> <span className="text-sm">{selectedTransaction.notes}</span></p>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100">
                            {selectedTransaction.status === 'pending' && (
                                <div className="flex gap-3 mb-3">
                                    <button onClick={() => {
                                        handleRejectTransaction(selectedTransaction);
                                        setShowDetailsModal(false);
                                    }} className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                                        Reject
                                    </button>
                                    <button onClick={() => {
                                        handleConfirmTransaction(selectedTransaction);
                                        setShowDetailsModal(false);
                                    }} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700">
                                        Approve
                                    </button>
                                </div>
                            )}
                            <button onClick={() => setShowDetailsModal(false)} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}