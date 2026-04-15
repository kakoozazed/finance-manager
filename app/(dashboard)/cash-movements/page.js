'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ChevronDown,
  Eye,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Wallet,
  X,
  Check,
  Shield,
  Download,
  ArrowUpCircle,
  Info,
  CheckCheck,
  XCircle,
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
    confirmed_count: 0,
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const [depositForm, setDepositForm] = useState({
    amount: '',
    reference: '',
    notes: '',
    deposit_method: 'CASH',
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchCashBalance();
    fetchTransactions();
  }, [currentUser, filterType, filterStatus, dateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, dateRange]);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      setCurrentUser(user || null);
    } catch (error) {
      showToast(error.message || 'Failed to get current user', 'error');
    }
  };

  const fetchCashBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_cash_balance')
        .select('id, current_balance, last_updated, updated_by, created_at, singleton')
        .eq('singleton', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newBalance, error: insertError } = await supabase
            .from('finance_cash_balance')
            .insert([
              {
                current_balance: 0,
                updated_by: currentUser?.email || 'system',
              },
            ])
            .select('id, current_balance, last_updated, updated_by, created_at, singleton')
            .single();

          if (insertError) throw insertError;
          setCashBalance(newBalance);
          return;
        }

        throw error;
      }

      setCashBalance(data);
    } catch (error) {
      showToast(error.message || 'Failed to fetch cash balance', 'error');
    }
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('finance_cash_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('transaction_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      }

      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      setTransactions(rows);
      calculateStats(rows);
    } catch (error) {
      showToast(error.message || 'Failed to load transactions', 'error');
      setTransactions([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filterType, filterStatus, dateRange, showToast]);

  const calculateStats = (rows) => {
    const inflows = rows
      .filter((t) => t.transaction_type === 'deposit' && t.status === 'confirmed')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const outflows = rows
      .filter((t) => (t.transaction_type === 'withdrawal' || t.transaction_type === 'expense') && t.status === 'confirmed')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const pending = rows.filter((t) => t.status === 'pending').length;
    const confirmed = rows.filter((t) => t.status === 'confirmed').length;

    setStats({
      total_inflows: inflows,
      total_outflows: outflows,
      net_change: inflows - outflows,
      transaction_count: rows.length,
      pending_count: pending,
      confirmed_count: confirmed,
    });
  };

  const formatUGX = (amount) => {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return 'Ush 0';
    }

    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(Number(amount))
      .replace('UGX', 'Ush');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validateAmount = (amount) => {
    const num = parseFloat(amount);

    if (Number.isNaN(num) || num <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return false;
    }

    if (num > 1000000000) {
      showToast('Amount exceeds maximum limit (1,000,000,000 UGX)', 'error');
      return false;
    }

    return true;
  };

  const handleDeposit = async () => {
    if (!validateAmount(depositForm.amount)) return;

    setProcessing(true);

    try {
      const transactionReference = depositForm.reference.trim() || `DEP-${Date.now()}`;
      const currentBalanceValue = Number(cashBalance?.current_balance || 0);

      const depositNotes = depositForm.notes?.trim()
        ? depositForm.notes.trim()
        : `Cash deposit via ${depositForm.deposit_method}`;

      const { error } = await supabase.from('finance_cash_transactions').insert([
        {
          transaction_type: 'deposit',
          amount: parseFloat(depositForm.amount),
          balance_after: currentBalanceValue,
          reference: transactionReference,
          notes: depositNotes,
          created_by: currentUser?.email || 'system',
          status: 'pending',
        },
      ]);

      if (error) throw error;

      showToast('Deposit recorded successfully and is waiting confirmation.', 'success');
      setShowDepositModal(false);
      setDepositForm({
        amount: '',
        reference: '',
        notes: '',
        deposit_method: 'CASH',
      });

      await fetchTransactions();
    } catch (error) {
      showToast(error.message || 'Error recording deposit', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmTransaction = async (transaction) => {
    const ok = confirm(
      `Confirm this deposit of ${formatUGX(
        transaction.amount
      )}?\n\nThis will update the cash balance immediately.`
    );

    if (!ok) return;

    setApprovingId(transaction.id);
    setProcessing(true);

    try {
      const { data, error } = await supabase.rpc('confirm_cash_transaction', {
        p_transaction_id: transaction.id,
        p_confirmed_by: currentUser?.email || 'system',
        p_approval_role: 'logged_in_user',
      });

      if (error) throw error;

      if (data?.success) {
        showToast('Deposit confirmed successfully.', 'success');
      } else {
        showToast(data?.message || 'Confirmation failed', 'error');
      }

      await fetchTransactions();
      await fetchCashBalance();
    } catch (error) {
      showToast(error.message || 'Error confirming transaction', 'error');
    } finally {
      setProcessing(false);
      setApprovingId(null);
    }
  };

  const handleRejectTransaction = async (transaction) => {
    const ok = confirm(
      `Reject this transaction of ${formatUGX(transaction.amount)}?\n\nThis action cannot be undone.`
    );

    if (!ok) return;

    setApprovingId(transaction.id);
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('finance_cash_transactions')
        .update({
          status: 'rejected',
        })
        .eq('id', transaction.id);

      if (error) throw error;

      showToast('Transaction rejected successfully.', 'success');
      await fetchTransactions();
      await fetchCashBalance();
    } catch (error) {
      showToast(error.message || 'Error rejecting transaction', 'error');
    } finally {
      setProcessing(false);
      setApprovingId(null);
    }
  };

  const exportToCSV = () => {
    const filtered = transactions.filter((t) => {
      if (!searchTerm) return true;

      const search = searchTerm.toLowerCase();
      return (
        (t.reference || '').toLowerCase().includes(search) ||
        (t.notes || '').toLowerCase().includes(search) ||
        (t.created_by || '').toLowerCase().includes(search)
      );
    });

    if (filtered.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const csvData = filtered.map((t) => ({
      Date: formatDate(t.created_at),
      Type:
        t.transaction_type === 'deposit'
          ? 'Deposit'
          : t.transaction_type === 'withdrawal'
          ? 'Withdrawal'
          : t.transaction_type === 'expense'
          ? 'Expense'
          : t.transaction_type,
      Amount: t.amount,
      Reference: t.reference || '-',
      Status: t.status,
      'Created By': t.created_by || '-',
      'Confirmed By': t.confirmed_by || '-',
      Notes: t.notes || '-',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Export successful.', 'success');
  };

  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case 'deposit':
        return { label: 'DEPOSIT', icon: TrendingUp, color: 'emerald' };
      case 'withdrawal':
        return { label: 'WITHDRAWAL', icon: TrendingDown, color: 'red' };
      case 'expense':
        return { label: 'EXPENSE', icon: TrendingDown, color: 'orange' };
      default:
        return { label: String(type).toUpperCase(), icon: Banknote, color: 'gray' };
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!searchTerm) return true;

      const search = searchTerm.toLowerCase();
      return (
        (t.reference || '').toLowerCase().includes(search) ||
        (t.notes || '').toLowerCase().includes(search) ||
        (t.created_by || '').toLowerCase().includes(search)
      );
    });
  }, [transactions, searchTerm]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === 'pending');
  }, [transactions]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <Shield className="mx-auto text-gray-400 mb-4" size={40} />
          <h1 className="text-xl font-semibold text-gray-900">Login required</h1>
          <p className="text-sm text-gray-500 mt-2">
            You must be logged in to record or confirm cash transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`rounded-lg shadow-lg p-4 ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? (
                <CheckCircle className="text-green-500" size={20} />
              ) : (
                <AlertCircle className="text-red-500" size={20} />
              )}
              <p className={toast.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Cash Movements
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Deposit recording and confirmation only
              </p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                <Shield size={12} />
                Logged in as {currentUser?.email}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowDepositModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
              >
                <ArrowUpCircle size={18} />
                Record Deposit
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Download size={16} />
                Export
              </button>

              <button
                onClick={async () => {
                  await fetchTransactions();
                  await fetchCashBalance();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Current Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatUGX(cashBalance?.current_balance)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Wallet size={22} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Last updated: {formatDate(cashBalance?.last_updated)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Inflows</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formatUGX(stats.total_inflows)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <TrendingUp size={22} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-3">Confirmed deposits</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Outflows</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {formatUGX(stats.total_outflows)}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <TrendingDown size={22} className="text-red-600" />
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3">Historical withdrawals/expenses</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-100 uppercase">Pending Confirmation</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.pending_count}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Clock size={22} className="text-white" />
              </div>
            </div>
            <p className="text-xs text-blue-100 mt-3">Awaiting confirmation</p>
          </div>
        </div>

        <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-blue-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white border border-emerald-100">
                  <CheckCheck className="text-emerald-600" size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pending Confirmation Queue</h2>
                  <p className="text-sm text-gray-600">
                    Confirm or reject submitted deposits
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                  {pendingTransactions.length} Pending
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {pendingTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <CheckCircle size={36} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="text-base font-semibold text-gray-900">No pending transactions</h3>
                <p className="text-sm text-gray-500 mt-1">
                  There is nothing waiting for confirmation right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pendingTransactions.map((transaction) => {
                  const typeInfo = getTransactionTypeLabel(transaction.transaction_type);
                  const TypeIcon = typeInfo.icon;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-xl border border-gray-200 p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-xl bg-emerald-50`}>
                          <TypeIcon size={20} className="text-emerald-600" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{typeInfo.label}</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              pending
                            </span>
                          </div>

                          <p className="text-2xl font-bold mt-2 text-emerald-600">
                            + {formatUGX(transaction.amount)}
                          </p>

                          <div className="mt-3 space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium text-gray-800">Reference:</span>{' '}
                              {transaction.reference || '-'}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">Created by:</span>{' '}
                              {transaction.created_by || '-'}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">Created at:</span>{' '}
                              {formatDate(transaction.created_at)}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">Balance at entry:</span>{' '}
                              {formatUGX(transaction.balance_after)}
                            </p>
                          </div>

                          {transaction.notes && (
                            <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
                              <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Notes</p>
                              <p className="text-sm text-gray-700">{transaction.notes}</p>
                            </div>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              onClick={() => handleConfirmTransaction(transaction)}
                              disabled={processing && approvingId === transaction.id}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing && approvingId === transaction.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                              Confirm Cash
                            </button>

                            <button
                              onClick={() => handleRejectTransaction(transaction)}
                              disabled={processing && approvingId === transaction.id}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing && approvingId === transaction.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <XCircle size={16} />
                              )}
                              Reject
                            </button>

                            <button
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setShowDetailsModal(true);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
                            >
                              <Eye size={16} />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Filter size={16} />
                Filters
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>

              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by reference, user, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 animate-slide-down">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposits</option>
                  <option value="expense">Expenses</option>
                  <option value="withdrawal">Withdrawals</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>

                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />

                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Cash Transactions</h2>
              <p className="text-sm text-gray-500">Full history of cash movements</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Banknote size={48} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No transactions found</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((transaction) => {
                    const typeInfo = getTransactionTypeLabel(transaction.transaction_type);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(transaction.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              typeInfo.color === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : typeInfo.color === 'red'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : typeInfo.color === 'orange'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            <TypeIcon size={12} />
                            {typeInfo.label}
                          </span>
                        </td>

                        <td
                          className={`px-6 py-4 text-right text-sm font-bold ${
                            transaction.transaction_type === 'deposit'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.transaction_type === 'deposit' ? '+' : '-'}{' '}
                          {formatUGX(transaction.amount)}
                        </td>

                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                          {transaction.reference || '-'}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : transaction.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {transaction.status === 'confirmed' ? (
                              <CheckCircle size={12} />
                            ) : transaction.status === 'rejected' ? (
                              <AlertCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            {transaction.status}
                          </span>
                        </td>

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

                            {transaction.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleConfirmTransaction(transaction)}
                                  disabled={processing && approvingId === transaction.id}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium"
                                >
                                  {processing && approvingId === transaction.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={12} />
                                  )}
                                  Confirm
                                </button>

                                <button
                                  onClick={() => handleRejectTransaction(transaction)}
                                  disabled={processing && approvingId === transaction.id}
                                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium"
                                >
                                  {processing && approvingId === transaction.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <X size={12} />
                                  )}
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredTransactions.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-gray-500">
                  Showing {Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{' '}
                  {filteredTransactions.length} transactions
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>

                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDepositModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Record Cash Deposit</h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
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
                  autoFocus
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
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    This deposit will be saved as pending until a logged-in user confirms it.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleDeposit}
                disabled={processing || !depositForm.amount}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Submit Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTransaction && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div
                className={`rounded-lg p-4 ${
                  selectedTransaction.transaction_type === 'deposit' ? 'bg-emerald-50' : 'bg-red-50'
                }`}
              >
                <p className="text-sm text-gray-500">Amount</p>
                <p
                  className={`text-2xl font-bold ${
                    selectedTransaction.transaction_type === 'deposit'
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {selectedTransaction.transaction_type === 'deposit' ? '+' : '-'}{' '}
                  {formatUGX(selectedTransaction.amount)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Type</span>
                  <span className="text-sm font-medium capitalize">{selectedTransaction.transaction_type}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Status</span>
                  <span
                    className={`text-sm font-medium capitalize ${
                      selectedTransaction.status === 'confirmed'
                        ? 'text-emerald-600'
                        : selectedTransaction.status === 'rejected'
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {selectedTransaction.status}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Reference</span>
                  <span className="text-sm font-mono">{selectedTransaction.reference || '-'}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Created By</span>
                  <span className="text-sm">{selectedTransaction.created_by}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Created At</span>
                  <span className="text-sm">{formatDate(selectedTransaction.created_at)}</span>
                </div>

                {selectedTransaction.confirmed_by && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Confirmed By</span>
                      <span className="text-sm">{selectedTransaction.confirmed_by}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Confirmed At</span>
                      <span className="text-sm">{formatDate(selectedTransaction.confirmed_at)}</span>
                    </div>
                  </>
                )}

                {selectedTransaction.approval_role && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Approval Role</span>
                    <span className="text-sm">{selectedTransaction.approval_role}</span>
                  </div>
                )}

                {selectedTransaction.notes && (
                  <div className="py-2">
                    <span className="text-sm text-gray-500">Notes</span>
                    <p className="text-sm mt-1 text-gray-700">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              {selectedTransaction.status === 'pending' && (
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => {
                      handleRejectTransaction(selectedTransaction);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => {
                      handleConfirmTransaction(selectedTransaction);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Confirm Cash
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slide-down {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}