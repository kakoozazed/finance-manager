// app/(dashboard)/coffee-payments/page.js
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    Search, Filter, Eye, DollarSign, CheckCircle, XCircle, Clock,
    User, Package, Wallet, Send, Loader2, FileText,
    ChevronDown, AlertCircle, Calendar, Receipt, Download,
    Coffee, Zap, Banknote, Smartphone, Building2, X, RefreshCw,
    ChevronLeft, ChevronRight, Phone, Landmark, Hash, MessageSquare,
    Trash2, ExternalLink, Tag, Edit2, Save, Upload, FileCheck,
    ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';

export default function CoffeePaymentsPage() {
    const supabase = createClient();
    const [lots, setLots] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLot, setSelectedLot] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Filters & Sorting
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [sortField, setSortField] = useState('assessed_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [error, setError] = useState(null);
    const [cashBalance, setCashBalance] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Stats
    const stats = useMemo(() => {
        const total = lots.length;
        const pending = lots.filter(l => l.finance_status === 'READY_FOR_FINANCE').length;
        const paid = lots.filter(l => l.finance_status === 'PAID').length;
        const totalAmount = lots.reduce((sum, l) => sum + Number(l.total_amount_ugx || 0), 0);
        const paidAmount = lots.filter(l => l.finance_status === 'PAID')
            .reduce((sum, l) => sum + Number(l.total_amount_ugx || 0), 0);
        return { total, pending, totalAmount, paidAmount, paidCount: paid };
    }, [lots]);

    // Load current user on mount
    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
            }
        };
        loadUser();
    }, [supabase]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await fetchSuppliers();
            await fetchCashBalance();
            await fetchLots();
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchLots();
    }, [filterStatus, selectedSupplier]);

    const fetchCashBalance = async () => {
        const { data, error } = await supabase
            .from('finance_cash_balance')
            .select('current_balance')
            .eq('singleton', true)
            .single();
        
        if (!error && data) {
            setCashBalance(data.current_balance);
        } else if (error?.code === 'PGRST116') {
            const { data: newBalance } = await supabase
                .from('finance_cash_balance')
                .insert([{ current_balance: 0, updated_by: 'system' }])
                .select()
                .single();
            if (newBalance) setCashBalance(newBalance.current_balance);
        }
    };

    const fetchSuppliers = async () => {
        const { data } = await supabase
            .from('suppliers')
            .select('id, name, code, phone, email, bank_name, account_name, account_number')
            .order('name');
        if (data) setSuppliers(data);
    };

    const fetchLots = async () => {
        try {
            let query = supabase
                .from('finance_coffee_lots')
                .select(`
                    *,
                    suppliers (id, name, code, phone, email, bank_name, account_name, account_number)
                `);

            if (filterStatus !== 'all') query = query.eq('finance_status', filterStatus);
            if (selectedSupplier !== 'all') query = query.eq('supplier_id', selectedSupplier);

            const { data, error: lotsError } = await query;
            if (lotsError) throw lotsError;

            // Fetch receipts for each lot
            const lotsWithDetails = await Promise.all(
                (data || []).map(async (lot) => {
                    const { data: receipts } = await supabase
                        .from('payment_receipts')
                        .select('*')
                        .eq('lot_id', lot.id)
                        .order('created_at', { ascending: false });
                    
                    const { data: payment } = await supabase
                        .from('supplier_payments')
                        .select('*')
                        .eq('lot_id', lot.id)
                        .maybeSingle();
                    
                    return { ...lot, receipts: receipts || [], payment };
                })
            );

            setLots(lotsWithDetails);
        } catch (err) {
            console.error('Error fetching lots:', err);
            setError('Failed to load coffee lots');
            setLots([]);
        }
    };

    const getCurrentUserEmail = async () => {
        if (currentUser?.email) return currentUser.email;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            setCurrentUser(user);
            return user.email;
        }
        
        return 'system@coffeeapp.com';
    };

    const processPayment = async (paymentData) => {
        if (!paymentData.payment_date) {
            alert('Please select a payment date');
            return;
        }

        const netPayment = paymentData.amount_paid - (paymentData.advance_recovered || 0);
        
        if (netPayment <= 0) {
            alert('Net payment amount must be greater than 0');
            return;
        }
        
        if (paymentData.method === 'CASH' && cashBalance < netPayment) {
            alert(`Insufficient cash balance. Available: ${formatUGX(cashBalance)}`);
            return;
        }

        setProcessing(true);

        try {
            const userEmail = await getCurrentUserEmail();

            // 1. Handle GRN file upload if present
            let grnFileUrl = selectedLot.grn_file_url;
            let grnFileName = selectedLot.grn_file_name;

            if (paymentData.grn_file) {
                const fileExt = paymentData.grn_file.name.split('.').pop();
                const fileName = `grn_${selectedLot.id}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('payment_documents')
                    .upload(`grn_files/${fileName}`, paymentData.grn_file);
                
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('payment_documents')
                    .getPublicUrl(`grn_files/${fileName}`);
                grnFileUrl = publicUrl;
                grnFileName = paymentData.grn_file.name;
            }

            // 2. Update the lot with GRN info and change status to PAID
            const updateData = {
                grn_number: paymentData.grn_number,
                batch_number: paymentData.batch_number,
                grn_file_url: grnFileUrl,
                grn_file_name: grnFileName,
                finance_status: 'PAID',
                finance_notes: `Paid on ${paymentData.payment_date} via ${paymentData.method}. Ref: ${paymentData.reference || 'N/A'}. Notes: ${paymentData.notes || ''}`,
                updated_at: new Date().toISOString()
            };
            
            const { error: lotUpdateError } = await supabase
                .from('finance_coffee_lots')
                .update(updateData)
                .eq('id', selectedLot.id);
            
            if (lotUpdateError) throw lotUpdateError;

            // 3. Upload receipt files
            if (paymentData.receipt_files && paymentData.receipt_files.length > 0) {
                const receipts = await Promise.all(paymentData.receipt_files.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `receipt_${selectedLot.id}_${Date.now()}_${Math.random()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('payment_documents')
                        .upload(`receipts/${fileName}`, file);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from('payment_documents')
                        .getPublicUrl(`receipts/${fileName}`);
                    
                    return {
                        lot_id: selectedLot.id,
                        receipt_url: publicUrl,
                        receipt_name: file.name,
                        receipt_type: 'PAYMENT_RECEIPT',
                        uploaded_by: userEmail,
                        created_at: new Date().toISOString()
                    };
                }));
                
                const { error: receiptsError } = await supabase
                    .from('payment_receipts')
                    .insert(receipts);
                
                if (receiptsError) throw receiptsError;
            }

            // 4. Record the payment in supplier_payments table
            const paymentRecord = {
                lot_id: selectedLot.id,
                supplier_id: selectedLot.supplier_id,
                method: paymentData.method,
                status: 'POSTED',
                requested_by: userEmail,
                gross_payable_ugx: selectedLot.total_amount_ugx,
                advance_recovered_ugx: paymentData.advance_recovered || 0,
                amount_paid_ugx: netPayment,
                reference: paymentData.reference || `PAY-${Date.now()}`,
                notes: paymentData.notes || '',
                payment_date: paymentData.payment_date,
                transaction_id: paymentData.reference || `PAY-${Date.now()}`,
                created_at: new Date().toISOString()
            };
            
            const { error: paymentError } = await supabase
                .from('supplier_payments')
                .insert(paymentRecord);
            
            if (paymentError) throw paymentError;

            // 5. Handle cash transaction if payment method is CASH
            if (paymentData.method === 'CASH') {
                const newBalance = (cashBalance || 0) - netPayment;
                const { error: transactionError } = await supabase
                    .from('finance_cash_transactions')
                    .insert({
                        transaction_type: 'PAYMENT_OUT',
                        amount: netPayment,
                        balance_after: newBalance,
                        reference: `PAYMENT-${selectedLot.id.slice(0, 8)}-${Date.now()}`,
                        notes: `Coffee payment to ${selectedLot.suppliers?.name} for lot ${selectedLot.id}`,
                        created_by: userEmail,
                        status: 'confirmed',
                        created_at: new Date().toISOString()
                    });
                
                if (transactionError) throw transactionError;
                
                // Update cash balance
                const { error: balanceUpdateError } = await supabase
                    .from('finance_cash_balance')
                    .update({ 
                        current_balance: newBalance, 
                        updated_by: userEmail,
                        last_updated: new Date().toISOString()
                    })
                    .eq('singleton', true);
                
                if (balanceUpdateError) throw balanceUpdateError;
                
                setCashBalance(newBalance);
            }

            alert('Payment processed successfully!');
            setShowPaymentModal(false);
            await fetchLots();
            
        } catch (err) {
            console.error('Payment error:', err);
            alert('Error processing payment: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const updateLotDocuments = async (updateData) => {
        setProcessing(true);
        
        try {
            const userEmail = await getCurrentUserEmail();
            const updates = {
                grn_number: updateData.grn_number,
                batch_number: updateData.batch_number,
                finance_notes: updateData.finance_notes,
                updated_at: new Date().toISOString()
            };

            // Handle GRN file upload
            if (updateData.grn_file) {
                const fileExt = updateData.grn_file.name.split('.').pop();
                const fileName = `grn_${selectedLot.id}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('payment_documents')
                    .upload(`grn_files/${fileName}`, updateData.grn_file);
                
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('payment_documents')
                    .getPublicUrl(`grn_files/${fileName}`);
                updates.grn_file_url = publicUrl;
                updates.grn_file_name = updateData.grn_file.name;
            }

            // Upload new receipts
            if (updateData.receipt_files && updateData.receipt_files.length > 0) {
                const receipts = await Promise.all(updateData.receipt_files.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `receipt_${selectedLot.id}_${Date.now()}_${Math.random()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('payment_documents')
                        .upload(`receipts/${fileName}`, file);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from('payment_documents')
                        .getPublicUrl(`receipts/${fileName}`);
                    
                    return {
                        lot_id: selectedLot.id,
                        receipt_url: publicUrl,
                        receipt_name: file.name,
                        receipt_type: 'PAYMENT_RECEIPT',
                        uploaded_by: userEmail,
                        notes: updateData.receipt_notes,
                        created_at: new Date().toISOString()
                    };
                }));
                
                const { error: receiptsError } = await supabase
                    .from('payment_receipts')
                    .insert(receipts);
                
                if (receiptsError) throw receiptsError;
            }

            // Delete receipts
            if (updateData.delete_receipt_ids && updateData.delete_receipt_ids.length > 0) {
                const { error: deleteError } = await supabase
                    .from('payment_receipts')
                    .delete()
                    .in('id', updateData.delete_receipt_ids);
                
                if (deleteError) throw deleteError;
            }

            const { error: updateError } = await supabase
                .from('finance_coffee_lots')
                .update(updates)
                .eq('id', selectedLot.id);
            
            if (updateError) throw updateError;
            
            alert('Lot updated successfully!');
            setShowEditModal(false);
            await fetchLots();
            
        } catch (err) {
            console.error('Update error:', err);
            alert('Error updating lot: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const deleteReceipt = async (receiptId, receiptUrl) => {
        if (!confirm('Delete this receipt?')) return;
        
        try {
            if (receiptUrl) {
                const urlParts = receiptUrl.split('/');
                const fileName = urlParts[urlParts.length - 1];
                await supabase.storage
                    .from('payment_documents')
                    .remove([`receipts/${fileName}`])
                    .catch(console.error);
            }
            
            const { error } = await supabase
                .from('payment_receipts')
                .delete()
                .eq('id', receiptId);
            
            if (error) throw error;
            
            alert('Receipt deleted successfully!');
            await fetchLots();
            
        } catch (err) {
            alert('Error deleting receipt: ' + err.message);
        }
    };

    // Sorting and filtering
    const filteredAndSortedLots = useMemo(() => {
        let result = [...lots];
        
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(lot => 
                lot.suppliers?.name?.toLowerCase().includes(search) ||
                lot.batch_number?.toLowerCase().includes(search) ||
                lot.grn_number?.toLowerCase().includes(search) ||
                lot.suppliers?.code?.toLowerCase().includes(search)
            );
        }
        
        result.sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case 'supplier_name':
                    aVal = a.suppliers?.name || '';
                    bVal = b.suppliers?.name || '';
                    break;
                case 'total_amount':
                    aVal = Number(a.total_amount_ugx || 0);
                    bVal = Number(b.total_amount_ugx || 0);
                    break;
                case 'quantity':
                    aVal = Number(a.quantity_kg || 0);
                    bVal = Number(b.quantity_kg || 0);
                    break;
                default:
                    aVal = a[sortField] || '';
                    bVal = b[sortField] || '';
            }
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        return result;
    }, [lots, searchTerm, sortField, sortDirection]);

    const paginatedLots = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedLots.slice(start, start + itemsPerPage);
    }, [filteredAndSortedLots, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAndSortedLots.length / itemsPerPage);

    const formatUGX = (amount) => {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-UG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const config = {
            'READY_FOR_FINANCE': { 
                icon: <Zap size={12} />, 
                text: 'Ready for Payment', 
                className: 'bg-amber-50 text-amber-700 border-amber-200'
            },
            'PAID': { 
                icon: <CheckCircle size={12} />, 
                text: 'Paid', 
                className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            },
            'PENDING_APPROVAL': { 
                icon: <Clock size={12} />, 
                text: 'Pending Approval', 
                className: 'bg-blue-50 text-blue-700 border-blue-200'
            }
        };
        const c = config[status] || { 
            icon: null, 
            text: status, 
            className: 'bg-gray-50 text-gray-600 border-gray-200'
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.className}`}>
                {c.icon}
                {c.text}
            </span>
        );
    };

    const SortButton = ({ field, children }) => (
        <button 
            onClick={() => {
                if (sortField === field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                    setSortField(field);
                    setSortDirection('asc');
                }
            }} 
            className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
        >
            {children}
            {sortField === field ? (
                sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
            ) : <ArrowUpDown size={14} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                                <Coffee size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Coffee Payments</h1>
                                <p className="text-sm text-gray-500 mt-1">Manage and track supplier coffee lot payments</p>
                            </div>
                        </div>
                        <button 
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="text-red-600" />
                            <div className="flex-1">
                                <p className="font-medium text-red-800">Error Loading Data</p>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                            <button onClick={fetchData} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <Package size={20} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Total Lots</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-400 mt-1">{stats.paidCount} paid, {stats.pending} pending</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Clock size={20} className="text-amber-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Pending Payment</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Wallet size={20} className="text-blue-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                        <p className="text-xl font-bold text-gray-900">{formatUGX(stats.totalAmount)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Banknote size={20} className="text-white" />
                            </div>
                        </div>
                        <p className="text-sm text-emerald-100 mb-1">Cash Balance</p>
                        <p className="text-xl font-bold text-white">{formatUGX(cashBalance)}</p>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by supplier, batch number, or GRN..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50"
                            >
                                <Filter size={18} />
                                Filters
                                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="p-5 bg-gray-50 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                                    <select 
                                        value={filterStatus} 
                                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="READY_FOR_FINANCE">Ready for Payment</option>
                                        <option value="PAID">Paid</option>
                                        <option value="PENDING_APPROVAL">Pending Approval</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                                    <select 
                                        value={selectedSupplier} 
                                        onChange={(e) => { setSelectedSupplier(e.target.value); setCurrentPage(1); }} 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    >
                                        <option value="all">All Suppliers</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} {s.code && `(${s.code})`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <Loader2 size={48} className="animate-spin mx-auto text-emerald-500 mb-4" />
                            <p className="text-gray-500">Loading coffee lots...</p>
                        </div>
                    ) : paginatedLots.length === 0 ? (
                        <div className="text-center py-12">
                            <Package size={64} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-500">No coffee lots found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left">
                                                <SortButton field="supplier_name">Supplier</SortButton>
                                            </th>
                                            <th className="px-6 py-4 text-left">Lot Details</th>
                                            <th className="px-6 py-4 text-right">
                                                <SortButton field="quantity">Quantity (kg)</SortButton>
                                            </th>
                                            <th className="px-6 py-4 text-right">
                                                <SortButton field="total_amount">Total Amount</SortButton>
                                            </th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedLots.map((lot) => (
                                            <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                                                            <User size={18} className="text-emerald-700" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{lot.suppliers?.name}</p>
                                                            <p className="text-xs text-gray-500">Code: {lot.suppliers?.code || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {lot.grn_number && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Tag size={12} className="text-amber-500" />
                                                                <span className="text-xs font-mono text-gray-600">GRN: {lot.grn_number}</span>
                                                            </div>
                                                        )}
                                                        {lot.batch_number && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Hash size={12} className="text-blue-500" />
                                                                <span className="text-xs font-mono text-gray-600">Batch: {lot.batch_number}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={12} className="text-gray-400" />
                                                            <span className="text-xs text-gray-500">{formatDate(lot.assessed_at)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-medium">{Number(lot.quantity_kg).toLocaleString()}</span>
                                                    <span className="text-xs text-gray-400 ml-1">kg</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-emerald-600">{formatUGX(lot.total_amount_ugx)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusBadge(lot.finance_status)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedLot(lot); setShowDetailsModal(true); }}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedLot(lot); setShowEditModal(true); }}
                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit Lot"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        {lot.finance_status === 'READY_FOR_FINANCE' && (
                                                            <button
                                                                onClick={() => { setSelectedLot(lot); setShowPaymentModal(true); }}
                                                                className="p-2 text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg transition-all shadow-sm"
                                                                title="Process Payment"
                                                            >
                                                                <DollarSign size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="text-sm text-gray-500">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedLots.length)} of {filteredAndSortedLots.length}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="flex gap-1">
                                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;
                                                
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                            currentPage === pageNum
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showPaymentModal && selectedLot && (
                <PaymentModal 
                    lot={selectedLot} 
                    supplier={selectedLot.suppliers} 
                    cashBalance={cashBalance} 
                    onClose={() => setShowPaymentModal(false)} 
                    onSubmit={processPayment} 
                    formatUGX={formatUGX} 
                    formatDate={formatDate}
                    processing={processing}
                />
            )}
            {showDetailsModal && selectedLot && (
                <DetailsModal 
                    lot={selectedLot} 
                    supplier={selectedLot.suppliers} 
                    onClose={() => setShowDetailsModal(false)} 
                    formatUGX={formatUGX} 
                    formatDate={formatDate}
                    onEdit={() => { setShowDetailsModal(false); setShowEditModal(true); }} 
                    onDeleteReceipt={deleteReceipt}
                    getStatusBadge={getStatusBadge}
                />
            )}
            {showEditModal && selectedLot && (
                <EditModal 
                    lot={selectedLot} 
                    supplier={selectedLot.suppliers} 
                    onClose={() => setShowEditModal(false)} 
                    onSave={updateLotDocuments} 
                    formatUGX={formatUGX} 
                    formatDate={formatDate}
                    processing={processing}
                />
            )}
        </div>
    );
}

// Payment Modal Component
function PaymentModal({ lot, supplier, cashBalance, onClose, onSubmit, formatUGX, formatDate, processing }) {
    const [formData, setFormData] = useState({
        method: 'MOBILE_MONEY',
        amount_paid: Number(lot.total_amount_ugx),
        advance_recovered: 0,
        reference: '',
        notes: '',
        payment_date: new Date().toISOString().split('T')[0],
        mobile_money_number: supplier?.phone || '',
        bank_account: supplier?.account_number || '',
        bank_name: supplier?.bank_name || '',
        account_name: supplier?.account_name || '',
        grn_number: lot.grn_number || '',
        batch_number: lot.batch_number || '',
        grn_file: null,
        receipt_files: []
    });
    
    const [grnFileName, setGrnFileName] = useState('');
    const [receiptFileNames, setReceiptFileNames] = useState([]);
    const netPayment = formData.amount_paid - formData.advance_recovered;
    const hasSufficientCash = formData.method !== 'CASH' || netPayment <= (cashBalance || 0);

    const handleSubmit = () => {
        if (!formData.payment_date) {
            alert('Please select a payment date');
            return;
        }
        if (formData.method === 'MOBILE_MONEY' && !formData.mobile_money_number) {
            alert('Please enter mobile money number');
            return;
        }
        if (netPayment <= 0) {
            alert('Net payment amount must be greater than 0');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                            <Send size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg">Process Payment</h3>
                            <p className="text-sm text-gray-500">Complete supplier payment transaction</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={22} />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    {/* Cash Balance Warning */}
                    {formData.method === 'CASH' && !hasSufficientCash && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-600" />
                                <p className="text-sm text-red-800">Insufficient balance! Available: {formatUGX(cashBalance)}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Supplier Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Supplier</p>
                                <p className="font-semibold text-gray-900">{supplier?.name}</p>
                                <p className="text-sm text-gray-500">Code: {supplier?.code}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase">Total Payable</p>
                                <p className="font-bold text-emerald-600 text-xl">{formatUGX(lot.total_amount_ugx)}</p>
                                <p className="text-xs text-gray-500">{Number(lot.quantity_kg).toLocaleString()} kg</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* GRN and Batch */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">GRN Number</label>
                            <input
                                type="text"
                                value={formData.grn_number}
                                onChange={(e) => setFormData({...formData, grn_number: e.target.value})}
                                placeholder="e.g., GRN-2024-001"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                            <input
                                type="text"
                                value={formData.batch_number}
                                onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                                placeholder="Batch number"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>
                    
                    {/* Payment Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    
                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
                                { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
                                { value: 'CASH', label: 'Cash', icon: Banknote },
                                { value: 'CHEQUE', label: 'Cheque', icon: Receipt }
                            ].map(m => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setFormData({...formData, method: m.value})}
                                    className={`p-3 rounded-xl text-center transition-all ${
                                        formData.method === m.value
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <m.icon size={20} className="mx-auto mb-1.5" />
                                    <span className="text-xs font-medium">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Method-specific fields */}
                    {formData.method === 'MOBILE_MONEY' && (
                        <div className="bg-purple-50 rounded-xl p-4">
                            <label className="block text-sm font-medium text-purple-800 mb-2">Mobile Money Number</label>
                            <input
                                type="tel"
                                value={formData.mobile_money_number}
                                onChange={(e) => setFormData({...formData, mobile_money_number: e.target.value})}
                                placeholder="e.g., 256712345678"
                                className="w-full px-4 py-2.5 border border-purple-200 rounded-xl"
                            />
                        </div>
                    )}
                    
                    {formData.method === 'BANK_TRANSFER' && (
                        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                                    placeholder="e.g., Centenary Bank"
                                    className="w-full px-4 py-2.5 border border-blue-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.bank_account}
                                    onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                                    placeholder="Account number"
                                    className="w-full px-4 py-2.5 border border-blue-200 rounded-xl"
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Amount Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid</label>
                            <input
                                type="number"
                                value={formData.amount_paid}
                                onChange={(e) => setFormData({...formData, amount_paid: parseFloat(e.target.value) || 0})}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Advance Recovered</label>
                            <input
                                type="number"
                                value={formData.advance_recovered}
                                onChange={(e) => setFormData({...formData, advance_recovered: parseFloat(e.target.value) || 0})}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>
                    
                    {/* Net Payment */}
                    <div className={`rounded-xl p-5 ${hasSufficientCash ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white`}>
                        <p className="text-sm opacity-90">Net Payment Amount</p>
                        <p className="text-2xl font-bold mt-1">{formatUGX(netPayment)}</p>
                        <p className="text-xs opacity-80 mt-1">Amount to be transferred</p>
                    </div>
                    
                    {/* Reference */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reference / Transaction ID</label>
                        <input
                            type="text"
                            value={formData.reference}
                            onChange={(e) => setFormData({...formData, reference: e.target.value})}
                            placeholder="Optional reference number"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                        />
                    </div>
                    
                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            rows={2}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            placeholder="Additional notes about this payment..."
                        />
                    </div>
                    
                    {/* File Uploads */}
                    <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">GRN Document (Optional)</label>
                        <label className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setFormData({...formData, grn_file: file});
                                        setGrnFileName(file.name);
                                    }
                                }} />
                                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload GRN document</p>
                                <p className="text-xs text-gray-400">PDF, JPG, PNG (max 5MB)</p>
                            </div>
                        </label>
                        {grnFileName && (
                            <div className="mt-2 flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                                <FileCheck size={14} className="text-emerald-600" />
                                <span className="text-sm text-gray-700">{grnFileName}</span>
                                <button onClick={() => { setFormData({...formData, grn_file: null}); setGrnFileName(''); }} className="ml-auto text-red-500">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Receipts (Optional)</label>
                        <label className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                                <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    setFormData({...formData, receipt_files: files});
                                    setReceiptFileNames(files.map(f => f.name));
                                }} />
                                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload payment receipts</p>
                                <p className="text-xs text-gray-400">Multiple files allowed</p>
                            </div>
                        </label>
                        {receiptFileNames.map(name => (
                            <div key={name} className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                <FileCheck size={14} className="text-gray-600" />
                                <span className="text-sm text-gray-700">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing || netPayment <= 0 || !formData.payment_date || !hasSufficientCash}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        {processing ? 'Processing...' : 'Process Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Details Modal Component
function DetailsModal({ lot, supplier, onClose, formatUGX, formatDate, onEdit, onDeleteReceipt, getStatusBadge }) {
    const [activeTab, setActiveTab] = useState('details');
    
    const qualityData = lot.quality_json || {};
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                            <FileText size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg">Lot Details</h3>
                            <p className="text-sm text-gray-500">Complete assessment and payment information</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">
                            <Edit2 size={18} />
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="border-b border-gray-100 px-6">
                    <div className="flex gap-6">
                        {['details', 'quality', 'financial', 'documents'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 text-sm font-medium capitalize border-b-2 transition-all ${
                                    activeTab === tab
                                        ? 'border-emerald-500 text-emerald-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="p-6">
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">Supplier</p>
                                    <p className="font-semibold">{supplier?.name}</p>
                                    <p className="text-sm text-gray-500">Code: {supplier?.code}</p>
                                    {supplier?.phone && <p className="text-sm mt-1">Phone: {supplier.phone}</p>}
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">Status</p>
                                    {getStatusBadge(lot.finance_status)}
                                    <p className="text-sm mt-2">Assessed: {formatDate(lot.assessed_at)}</p>
                                </div>
                            </div>
                            {(lot.grn_number || lot.batch_number) && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">References</p>
                                    {lot.grn_number && <p className="text-sm">GRN: {lot.grn_number}</p>}
                                    {lot.batch_number && <p className="text-sm">Batch: {lot.batch_number}</p>}
                                </div>
                            )}
                            {lot.finance_notes && (
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <p className="text-xs text-blue-600 uppercase mb-2">Notes</p>
                                    <p className="text-sm">{lot.finance_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'quality' && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Moisture:</span>
                                    <span className="font-semibold">{qualityData.moisture || '-'}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Outturn:</span>
                                    <span className="font-semibold">{qualityData.outturn || '-'}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Group 1 Defects:</span>
                                    <span className="font-semibold">{qualityData.group1_defects || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Group 2 Defects:</span>
                                    <span className="font-semibold">{qualityData.group2_defects || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">FM:</span>
                                    <span className="font-semibold">{qualityData.fm || 0}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'financial' && (
                        <div className="bg-emerald-50 rounded-xl p-6">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-emerald-700">Quantity:</span>
                                    <span className="font-semibold">{Number(lot.quantity_kg).toLocaleString()} kg</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-emerald-700">Unit Price:</span>
                                    <span className="font-semibold">{formatUGX(lot.unit_price_ugx)}</span>
                                </div>
                                <div className="border-t border-emerald-200 pt-3">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-emerald-800">Total Amount:</span>
                                        <span className="font-bold text-emerald-800 text-xl">{formatUGX(lot.total_amount_ugx)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            {lot.grn_file_url && (
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-blue-800">GRN Document</p>
                                            <p className="text-sm text-blue-600">{lot.grn_file_name || 'GRN File'}</p>
                                        </div>
                                        <button onClick={() => window.open(lot.grn_file_url)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                            <ExternalLink size={14} className="inline mr-1" /> View
                                        </button>
                                    </div>
                                </div>
                            )}
                            {lot.receipts?.length > 0 && (
                                <div>
                                    <p className="font-medium text-gray-900 mb-3">Payment Receipts ({lot.receipts.length})</p>
                                    <div className="space-y-2">
                                        {lot.receipts.map(receipt => (
                                            <div key={receipt.id} className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <FileText size={20} className="text-gray-500" />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{receipt.receipt_name}</p>
                                                        <p className="text-xs text-gray-500">Uploaded: {formatDate(receipt.created_at)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => window.open(receipt.receipt_url)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button onClick={() => onDeleteReceipt(receipt.id, receipt.receipt_url)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Edit Modal Component
function EditModal({ lot, supplier, onClose, onSave, formatUGX, formatDate, processing }) {
    const [formData, setFormData] = useState({
        grn_number: lot.grn_number || '',
        batch_number: lot.batch_number || '',
        finance_notes: lot.finance_notes || '',
        grn_file: null,
        receipt_files: [],
        delete_receipt_ids: [],
        receipt_notes: ''
    });
    const [grnFileName, setGrnFileName] = useState('');
    const [receiptFileNames, setReceiptFileNames] = useState([]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                            <Edit2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg">Edit Lot Information</h3>
                            <p className="text-sm text-gray-500">Update GRN, batch numbers, and documents</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={22} />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Supplier</p>
                                <p className="font-semibold">{supplier?.name}</p>
                                <p className="text-sm text-gray-500">Code: {supplier?.code}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase">Total Amount</p>
                                <p className="font-bold text-emerald-600">{formatUGX(lot.total_amount_ugx)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">GRN Number</label>
                            <input
                                type="text"
                                value={formData.grn_number}
                                onChange={(e) => setFormData({...formData, grn_number: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                            <input
                                type="text"
                                value={formData.batch_number}
                                onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Replace GRN Document</label>
                        <label className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setFormData({...formData, grn_file: file});
                                        setGrnFileName(file.name);
                                    }
                                }} />
                                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload new GRN document</p>
                            </div>
                        </label>
                        {grnFileName && (
                            <div className="mt-2 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                                <FileCheck size={14} className="text-blue-600" />
                                <span className="text-sm text-gray-700">{grnFileName}</span>
                                <button onClick={() => { setFormData({...formData, grn_file: null}); setGrnFileName(''); }} className="ml-auto text-red-500">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Payment Receipts</label>
                        <label className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                                <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    setFormData({...formData, receipt_files: files});
                                    setReceiptFileNames(files.map(f => f.name));
                                }} />
                                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload payment receipts</p>
                            </div>
                        </label>
                        {receiptFileNames.map(name => (
                            <div key={name} className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                <FileCheck size={14} className="text-gray-600" />
                                <span className="text-sm text-gray-700">{name}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Finance Notes</label>
                        <textarea
                            value={formData.finance_notes}
                            onChange={(e) => setFormData({...formData, finance_notes: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                            placeholder="Additional notes about this lot..."
                        />
                    </div>
                </div>
                
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                        Cancel
                    </button>
                    <button onClick={() => onSave(formData)} disabled={processing} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}