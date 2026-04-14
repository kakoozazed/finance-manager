// app/(dashboard)/supplier-payments/page.js
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    Search, Filter, Eye, DollarSign, CheckCircle, XCircle, Clock,
    User, Package, Wallet, Send, Loader2, FileText,
    ChevronDown, AlertCircle, Calendar, Receipt, Download,
    Coffee, Zap, Banknote, Smartphone, Building2, X, RefreshCw,
    ChevronLeft, ChevronRight, Phone, Landmark, Hash, MessageSquare,
    Trash2, ExternalLink, Tag, Edit2, Save, Upload, FileCheck,
    ArrowUpDown, SortAsc, SortDesc, Printer, CreditCard,
    TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight,
    Info, CheckCheck, AlertTriangle, Copy, EyeOff, FilterX
} from 'lucide-react';

export default function SupplierPaymentsPage() {
    const supabase = createClient();
    const [payments, setPayments] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showVoidModal, setShowVoidModal] = useState(false);

    // Filters & Sorting
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMethod, setFilterMethod] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortField, setSortField] = useState('payment_date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [stats, setStats] = useState({
        total_payments: 0,
        total_amount: 0,
        avg_payment: 0,
        method_breakdown: {},
        monthly_trend: []
    });

    const printRef = useRef();

    useEffect(() => {
        fetchCurrentUser();
        fetchSuppliers();
        fetchPayments();
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [filterStatus, filterMethod, selectedSupplier, dateRange]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);
    };

    const fetchSuppliers = async () => {
        const { data } = await supabase
            .from('suppliers')
            .select('id, name, code, phone, email, bank_name, account_name, account_number')
            .order('name');
        if (data) setSuppliers(data);
    };

    const fetchPayments = async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('supplier_payments')
                .select(`
                    *,
                    suppliers (id, name, code, phone, email, bank_name, account_name, account_number),
                    finance_coffee_lots (
                        id, 
                        grn_number, 
                        batch_number, 
                        quantity_kg, 
                        unit_price_ugx, 
                        total_amount_ugx,
                        assessed_at
                    )
                `);

            if (filterStatus !== 'all') query = query.eq('status', filterStatus);
            if (filterMethod !== 'all') query = query.eq('method', filterMethod);
            if (selectedSupplier !== 'all') query = query.eq('supplier_id', selectedSupplier);
            if (dateRange.start) query = query.gte('payment_date', dateRange.start);
            if (dateRange.end) query = query.lte('payment_date', dateRange.end);

            const { data, error: paymentsError } = await query.order('payment_date', { ascending: false });

            if (paymentsError) throw paymentsError;

            setPayments(data || []);
            calculateStats(data || []);

        } catch (err) {
            console.error('Error fetching payments:', err);
            setError('Failed to load payment records');
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (paymentsData) => {
        const total = paymentsData.length;
        const totalAmount = paymentsData.reduce((sum, p) => sum + Number(p.amount_paid_ugx || 0), 0);
        const avgPayment = total > 0 ? totalAmount / total : 0;

        const methodBreakdown = {};
        paymentsData.forEach(p => {
            const method = p.method;
            methodBreakdown[method] = (methodBreakdown[method] || 0) + Number(p.amount_paid_ugx);
        });

        const monthlyData = {};
        paymentsData.forEach(p => {
            const month = new Date(p.payment_date).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyData[month] = (monthlyData[month] || 0) + Number(p.amount_paid_ugx);
        });

        const monthlyTrend = Object.entries(monthlyData)
            .map(([month, amount]) => ({ month, amount }))
            .slice(-6);

        setStats({
            total_payments: total,
            total_amount: totalAmount,
            avg_payment: avgPayment,
            method_breakdown: methodBreakdown,
            monthly_trend: monthlyTrend
        });
    };

    const voidPayment = async (paymentId, reason) => {
        if (!confirm('Are you sure you want to void this payment? This action cannot be undone.')) {
            return;
        }

        setLoading(true);

        try {
            const { data: payment, error: fetchError } = await supabase
                .from('supplier_payments')
                .select('lot_id, supplier_id, amount_paid_ugx, method, status')
                .eq('id', paymentId)
                .single();

            if (fetchError) throw fetchError;

            if (payment.status !== 'POSTED') {
                alert(`Cannot void payment with status: ${payment.status}. Only POSTED payments can be voided.`);
                setShowVoidModal(false);
                setLoading(false);
                return;
            }

            const { error: updateError } = await supabase
                .from('supplier_payments')
                .update({
                    notes: payment.notes 
                        ? `${payment.notes}\n[VOIDED ON ${new Date().toISOString().split('T')[0]}]: ${reason}`
                        : `[VOIDED ON ${new Date().toISOString().split('T')[0]}]: ${reason}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentId);

            if (updateError) throw updateError;

            if (payment.lot_id) {
                const { error: lotError } = await supabase
                    .from('finance_coffee_lots')
                    .update({
                        finance_status: 'READY_FOR_FINANCE',
                        finance_notes: `Payment voided on ${new Date().toISOString().split('T')[0]}. Reason: ${reason}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', payment.lot_id);

                if (lotError) throw lotError;
            }

            if (payment.method === 'CASH') {
                const { data: balance } = await supabase
                    .from('finance_cash_balance')
                    .select('current_balance')
                    .eq('singleton', true)
                    .single();

                if (balance) {
                    await supabase
                        .from('finance_cash_transactions')
                        .insert({
                            transaction_type: 'REFUND',
                            amount: payment.amount_paid_ugx,
                            balance_after: balance.current_balance + Number(payment.amount_paid_ugx),
                            reference: `VOID-${paymentId.slice(0, 8)}`,
                            notes: `Voided payment to supplier: ${reason}`,
                            created_by: currentUser?.email,
                            status: 'confirmed'
                        });

                    await supabase
                        .from('finance_cash_balance')
                        .update({
                            current_balance: balance.current_balance + Number(payment.amount_paid_ugx),
                            updated_by: currentUser?.email,
                            last_updated: new Date().toISOString()
                        })
                        .eq('singleton', true);
                }
            }

            alert('Payment voided successfully!');
            setShowVoidModal(false);
            await fetchPayments();

        } catch (err) {
            console.error('Error voiding payment:', err);
            alert('Error voiding payment: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const exportPayments = () => {
        const exportData = filteredAndSortedPayments.map(payment => ({
            'Date': formatDate(payment.payment_date),
            'Supplier': payment.suppliers?.name,
            'Supplier Code': payment.suppliers?.code,
            'Method': getPaymentMethodLabel(payment.method),
            'Gross Payable': payment.gross_payable_ugx,
            'Advance Recovered': payment.advance_recovered_ugx,
            'Amount Paid': payment.amount_paid_ugx,
            'Reference': payment.reference,
            'Status': payment.status,
            'Is Voided': payment.notes?.includes('[VOIDED') ? 'Yes' : 'No',
            'Requested By': payment.requested_by,
            'GRN Number': payment.finance_coffee_lots?.grn_number,
            'Batch Number': payment.finance_coffee_lots?.batch_number,
            'Notes': payment.notes
        }));
        
        const headers = Object.keys(exportData[0] || {});
        const csvContent = [
            headers.join(','),
            ...exportData.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supplier_payments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Print payment receipt
    const printPaymentReceipt = (payment) => {
        const printWindow = window.open('', '_blank');
        const voided = isPaymentVoided(payment);
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Receipt - ${payment.reference || 'Payment'}</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 20px; }
                        .no-print { display: none; }
                        .page-break { page-break-before: always; }
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        background: white;
                        padding: 40px;
                        font-size: 14px;
                    }
                    .receipt {
                        max-width: 800px;
                        margin: 0 auto;
                        border: 2px solid #333;
                        padding: 30px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #333;
                    }
                    .company-name {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .receipt-title {
                        font-size: 18px;
                        margin-top: 10px;
                    }
                    .void-stamp {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 48px;
                        color: rgba(220, 38, 38, 0.3);
                        font-weight: bold;
                        border: 3px solid rgba(220, 38, 38, 0.3);
                        padding: 20px 40px;
                        white-space: nowrap;
                        pointer-events: none;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        padding: 5px 0;
                    }
                    .info-label {
                        font-weight: bold;
                        min-width: 150px;
                    }
                    .info-value {
                        text-align: right;
                    }
                    .section {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #ddd;
                    }
                    .section-title {
                        font-weight: bold;
                        margin-bottom: 15px;
                        padding-bottom: 5px;
                        border-bottom: 1px solid #ddd;
                        font-size: 16px;
                    }
                    .amount-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 10px 0;
                        padding: 10px 0;
                    }
                    .total-row {
                        font-size: 18px;
                        font-weight: bold;
                        border-top: 2px solid #333;
                        margin-top: 10px;
                        padding-top: 10px;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 12px;
                    }
                    .signature-line {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature {
                        text-align: center;
                    }
                    .signature-line-item {
                        width: 200px;
                        border-top: 1px solid #333;
                        margin-top: 30px;
                        padding-top: 5px;
                    }
                    ${voided ? '.void-overlay { position: relative; }' : ''}
                </style>
            </head>
            <body>
                <div class="receipt ${voided ? 'void-overlay' : ''}">
                    ${voided ? '<div class="void-stamp">VOIDED</div>' : ''}
                    
                    <div class="header">
                        <div class="company-name">GREAT AGRO COFFEE LTD</div>
                        <div>Supplier Payment Receipt</div>
                        <div class="receipt-title">Payment Confirmation</div>
                    </div>

                    <div class="section">
                        <div class="section-title">PAYMENT INFORMATION</div>
                        <div class="info-row">
                            <span class="info-label">Receipt Number:</span>
                            <span class="info-value">${payment.reference || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Transaction ID:</span>
                            <span class="info-value">${payment.transaction_id || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Payment Date:</span>
                            <span class="info-value">${formatDate(payment.payment_date)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Payment Method:</span>
                            <span class="info-value">${getPaymentMethodLabel(payment.method)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value">${voided ? 'VOIDED' : payment.status}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Processed By:</span>
                            <span class="info-value">${payment.requested_by || 'System'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">SUPPLIER DETAILS</div>
                        <div class="info-row">
                            <span class="info-label">Supplier Name:</span>
                            <span class="info-value">${payment.suppliers?.name || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Supplier Code:</span>
                            <span class="info-value">${payment.suppliers?.code || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span class="info-value">${payment.suppliers?.phone || 'N/A'}</span>
                        </div>
                        ${payment.suppliers?.email ? `
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${payment.suppliers.email}</span>
                        </div>
                        ` : ''}
                        ${payment.suppliers?.bank_name ? `
                        <div class="info-row">
                            <span class="info-label">Bank:</span>
                            <span class="info-value">${payment.suppliers.bank_name}</span>
                        </div>
                        ` : ''}
                        ${payment.suppliers?.account_number ? `
                        <div class="info-row">
                            <span class="info-label">Account Number:</span>
                            <span class="info-value">${payment.suppliers.account_number}</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="section">
                        <div class="section-title">LOT INFORMATION</div>
                        ${payment.finance_coffee_lots ? `
                        <div class="info-row">
                            <span class="info-label">GRN Number:</span>
                            <span class="info-value">${payment.finance_coffee_lots.grn_number || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Batch Number:</span>
                            <span class="info-value">${payment.finance_coffee_lots.batch_number || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Quantity:</span>
                            <span class="info-value">${Number(payment.finance_coffee_lots.quantity_kg).toLocaleString()} kg</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Unit Price:</span>
                            <span class="info-value">${formatUGX(payment.finance_coffee_lots.unit_price_ugx)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Assessment Date:</span>
                            <span class="info-value">${formatDate(payment.finance_coffee_lots.assessed_at)}</span>
                        </div>
                        ` : '<div class="info-row"><span class="info-value">No lot information available</span></div>'}
                    </div>

                    <div class="section">
                        <div class="section-title">AMOUNT DETAILS</div>
                        <div class="amount-row">
                            <span>Gross Payable:</span>
                            <span>${formatUGX(payment.gross_payable_ugx)}</span>
                        </div>
                        ${payment.advance_recovered_ugx > 0 ? `
                        <div class="amount-row">
                            <span>Advance Recovered:</span>
                            <span style="color: red;">-${formatUGX(payment.advance_recovered_ugx)}</span>
                        </div>
                        ` : ''}
                        <div class="amount-row total-row">
                            <span><strong>Net Amount Paid:</strong></span>
                            <span><strong>${formatUGX(payment.amount_paid_ugx)}</strong></span>
                        </div>
                    </div>

                    ${payment.notes ? `
                    <div class="section">
                        <div class="section-title">NOTES</div>
                        <div class="info-row">
                            <span class="info-value" style="white-space: pre-wrap;">${payment.notes}</span>
                        </div>
                    </div>
                    ` : ''}

                    <div class="footer">
                        <div>This is a computer-generated receipt and requires no signature.</div>
                        <div>For any inquiries, please contact finance department.</div>
                        <div>Generated on: ${new Date().toLocaleString()}</div>
                    </div>

                    <div class="signature-line">
                        <div class="signature">
                            <div class="signature-line-item">_________________</div>
                            <div>Supplier Signature</div>
                        </div>
                        <div class="signature">
                            <div class="signature-line-item">_________________</div>
                            <div>Company Stamp</div>
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 1000); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Check if a payment is voided
    const isPaymentVoided = (payment) => {
        return payment.notes?.includes('[VOIDED') || false;
    };

    // Sorting and filtering
    const filteredAndSortedPayments = useMemo(() => {
        let result = [...payments];

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(payment =>
                payment.suppliers?.name?.toLowerCase().includes(search) ||
                payment.suppliers?.code?.toLowerCase().includes(search) ||
                payment.reference?.toLowerCase().includes(search) ||
                payment.transaction_id?.toLowerCase().includes(search) ||
                payment.finance_coffee_lots?.grn_number?.toLowerCase().includes(search)
            );
        }

        if (filterStatus === 'VOIDED') {
            result = result.filter(payment => isPaymentVoided(payment));
        } else if (filterStatus === 'ACTIVE') {
            result = result.filter(payment => !isPaymentVoided(payment));
        }

        result.sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case 'supplier_name':
                    aVal = a.suppliers?.name || '';
                    bVal = b.suppliers?.name || '';
                    break;
                case 'amount':
                    aVal = Number(a.amount_paid_ugx || 0);
                    bVal = Number(b.amount_paid_ugx || 0);
                    break;
                case 'payment_date':
                    aVal = a.payment_date || '';
                    bVal = b.payment_date || '';
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
    }, [payments, searchTerm, sortField, sortDirection, filterStatus]);

    const paginatedPayments = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedPayments.slice(start, start + itemsPerPage);
    }, [filteredAndSortedPayments, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAndSortedPayments.length / itemsPerPage);

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

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-UG', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-UG').format(num || 0);
    };

    const getStatusBadge = (payment) => {
        const isVoided = isPaymentVoided(payment);
        
        if (isVoided) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                    <XCircle size={12} />
                    Voided
                </span>
            );
        }
        
        const config = {
            'POSTED': {
                icon: <CheckCircle size={12} />,
                text: 'Posted',
                className: 'bg-green-50 text-green-700 border-green-200',
                dotColor: 'bg-green-500'
            },
            'APPROVED': {
                icon: <CheckCheck size={12} />,
                text: 'Approved',
                className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dotColor: 'bg-emerald-500'
            },
            'PENDING': {
                icon: <Clock size={12} />,
                text: 'Pending',
                className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                dotColor: 'bg-yellow-500'
            }
        };
        const c = config[payment.status] || {
            icon: null,
            text: payment.status,
            className: 'bg-gray-50 text-gray-600 border-gray-200',
            dotColor: 'bg-gray-500'
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor}`}></span>
                {c.icon}
                {c.text}
            </span>
        );
    };

    const getPaymentMethodIcon = (method) => {
        const icons = {
            'MOBILE_MONEY': <Smartphone size={14} className="text-purple-600" />,
            'BANK_TRANSFER': <Building2 size={14} className="text-blue-600" />,
            'CASH': <Banknote size={14} className="text-emerald-600" />,
            'CHEQUE': <Receipt size={14} className="text-orange-600" />
        };
        return icons[method] || <CreditCard size={14} className="text-gray-600" />;
    };

    const getPaymentMethodLabel = (method) => {
        const labels = {
            'MOBILE_MONEY': 'Mobile Money',
            'BANK_TRANSFER': 'Bank Transfer',
            'CASH': 'Cash',
            'CHEQUE': 'Cheque'
        };
        return labels[method] || method;
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
            className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors group"
        >
            {children}
            <span className="text-gray-400 group-hover:text-gray-600">
                {sortField === field ? (
                    sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                ) : <ArrowUpDown size={14} />}
            </span>
        </button>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                                <Receipt size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Supplier Payments</h1>
                                <p className="text-sm text-gray-500 mt-1">Track and manage all supplier payment transactions</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportPayments}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                                onClick={fetchPayments}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Same as before */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Receipt size={20} className="text-blue-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Total Payments</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_payments}</p>
                        <p className="text-xs text-gray-400 mt-1">Transactions recorded</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <Wallet size={20} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                        <p className="text-xl font-bold text-gray-900">{formatUGX(stats.total_amount)}</p>
                        <p className="text-xs text-gray-400 mt-1">Disbursed to suppliers</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <TrendingUp size={20} className="text-purple-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Average Payment</p>
                        <p className="text-xl font-bold text-gray-900">{formatUGX(stats.avg_payment)}</p>
                        <p className="text-xs text-gray-400 mt-1">Per transaction</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <PieChart size={20} className="text-white" />
                            </div>
                        </div>
                        <p className="text-sm text-blue-100 mb-1">Payment Methods</p>
                        <p className="text-xl font-bold text-white">
                            {Object.keys(stats.method_breakdown).length} methods
                        </p>
                        <p className="text-xs text-blue-100 mt-1">Multiple channels</p>
                    </div>
                </div>

                {/* Method Breakdown Cards */}
                {Object.keys(stats.method_breakdown).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {Object.entries(stats.method_breakdown).map(([method, amount]) => (
                            <div key={method} className="bg-white rounded-xl shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {getPaymentMethodIcon(method)}
                                    <span className="text-sm font-medium text-gray-700">{getPaymentMethodLabel(method)}</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{formatUGX(amount)}</p>
                                <p className="text-xs text-gray-500">
                                    {((amount / stats.total_amount) * 100).toFixed(1)}% of total
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters Bar */}
                <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by supplier, reference, GRN number..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    <Filter size={18} />
                                    <span className="font-medium">Filters</span>
                                    <ChevronDown size={16} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                                {(filterStatus !== 'all' || filterMethod !== 'all' || selectedSupplier !== 'all' || dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => {
                                            setFilterStatus('all');
                                            setFilterMethod('all');
                                            setSelectedSupplier('all');
                                            setDateRange({ start: '', end: '' });
                                            setSearchTerm('');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <FilterX size={18} />
                                        <span className="font-medium">Clear</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="p-5 bg-gray-50/50 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="POSTED">Posted</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="ACTIVE">Active (Not Voided)</option>
                                        <option value="VOIDED">Voided</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                    <select
                                        value={filterMethod}
                                        onChange={(e) => { setFilterMethod(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Methods</option>
                                        <option value="MOBILE_MONEY">Mobile Money</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CASH">Cash</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                                    <select
                                        value={selectedSupplier}
                                        onChange={(e) => { setSelectedSupplier(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Suppliers</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.code && `(${s.code})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <Loader2 size={48} className="animate-spin mx-auto text-blue-500 mb-4" />
                            <p className="text-gray-500">Loading payment records...</p>
                        </div>
                    ) : paginatedPayments.length === 0 ? (
                        <div className="text-center py-12">
                            <Receipt size={64} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-500">No payment records found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search criteria</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left">
                                                <SortButton field="payment_date">Payment Date</SortButton>
                                            </th>
                                            <th className="px-6 py-4 text-left">
                                                <SortButton field="supplier_name">Supplier</SortButton>
                                            </th>
                                            <th className="px-6 py-4 text-left">Lot Details</th>
                                            <th className="px-6 py-4 text-center">Method</th>
                                            <th className="px-6 py-4 text-right">
                                                <SortButton field="amount">Amount</SortButton>
                                            </th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedPayments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900">{formatDate(payment.payment_date)}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(payment.created_at)}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                                            <User size={18} className="text-blue-700" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{payment.suppliers?.name}</p>
                                                            <p className="text-xs text-gray-500">Code: {payment.suppliers?.code || 'N/A'}</p>
                                                            {payment.suppliers?.phone && (
                                                                <p className="text-xs text-gray-400">{payment.suppliers.phone}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {payment.finance_coffee_lots?.grn_number && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Tag size={12} className="text-amber-500" />
                                                                <span className="text-xs font-mono text-gray-600">GRN: {payment.finance_coffee_lots.grn_number}</span>
                                                            </div>
                                                        )}
                                                        {payment.finance_coffee_lots?.batch_number && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Hash size={12} className="text-blue-500" />
                                                                <span className="text-xs font-mono text-gray-600">Batch: {payment.finance_coffee_lots.batch_number}</span>
                                                            </div>
                                                        )}
                                                        {payment.reference && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Hash size={12} className="text-gray-400" />
                                                                <span className="text-xs text-gray-500">Ref: {payment.reference}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        {getPaymentMethodIcon(payment.method)}
                                                        <span className="text-xs font-medium text-gray-600">
                                                            {getPaymentMethodLabel(payment.method)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div>
                                                        <p className={`font-bold ${isPaymentVoided(payment) ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>
                                                            {formatUGX(payment.amount_paid_ugx)}
                                                        </p>
                                                        {payment.advance_recovered_ugx > 0 && (
                                                            <p className="text-xs text-gray-500">
                                                                Advance: {formatUGX(payment.advance_recovered_ugx)}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400">
                                                            Gross: {formatUGX(payment.gross_payable_ugx)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusBadge(payment)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedPayment(payment); setShowDetailsModal(true); }}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {payment.status === 'POSTED' && !isPaymentVoided(payment) && (
                                                            <button
                                                                onClick={() => { setSelectedPayment(payment); setShowVoidModal(true); }}
                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Void Payment"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => printPaymentReceipt(payment)}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                                            title="Print Receipt"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="text-sm text-gray-500">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedPayments.length)} of {filteredAndSortedPayments.length} results
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="flex gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                                                                ? 'bg-blue-600 text-white shadow-sm'
                                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

            {/* Details Modal */}
            {showDetailsModal && selectedPayment && (
                <PaymentDetailsModal
                    payment={selectedPayment}
                    supplier={selectedPayment.suppliers}
                    lot={selectedPayment.finance_coffee_lots}
                    onClose={() => setShowDetailsModal(false)}
                    formatUGX={formatUGX}
                    formatDate={formatDate}
                    formatDateTime={formatDateTime}
                    getStatusBadge={getStatusBadge}
                    getPaymentMethodIcon={getPaymentMethodIcon}
                    getPaymentMethodLabel={getPaymentMethodLabel}
                    isPaymentVoided={isPaymentVoided}
                    printPaymentReceipt={printPaymentReceipt}
                />
            )}

            {/* Void Modal */}
            {showVoidModal && selectedPayment && (
                <VoidPaymentModal
                    payment={selectedPayment}
                    onClose={() => setShowVoidModal(false)}
                    onConfirm={voidPayment}
                    formatUGX={formatUGX}
                />
            )}
        </div>
    );
}

// Payment Details Modal Component (updated with print button)
function PaymentDetailsModal({ payment, supplier, lot, onClose, formatUGX, formatDate, formatDateTime, getStatusBadge, getPaymentMethodIcon, getPaymentMethodLabel, isPaymentVoided, printPaymentReceipt }) {
    const [activeTab, setActiveTab] = useState('details');

    const tabs = [
        { id: 'details', label: 'Payment Details', icon: FileText },
        { id: 'supplier', label: 'Supplier Info', icon: User },
        { id: 'lot', label: 'Lot Information', icon: Package }
    ];

    const voided = isPaymentVoided(payment);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                            <Receipt size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg">Payment Details</h3>
                            <p className="text-sm text-gray-500">Transaction #{payment.reference?.slice(0, 12)}...</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => printPaymentReceipt(payment)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                            title="Print Receipt"
                        >
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {voided && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-red-600" />
                            <p className="text-sm text-red-700 font-medium">This payment has been voided</p>
                        </div>
                    </div>
                )}

                <div className="border-b border-gray-100 px-6">
                    <div className="flex gap-6">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">Transaction Info</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Reference:</span>
                                            <span className="text-sm font-mono font-medium">{payment.reference || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Transaction ID:</span>
                                            <span className="text-sm font-mono">{payment.transaction_id || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Payment Date:</span>
                                            <span className="text-sm font-medium">{formatDate(payment.payment_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Requested By:</span>
                                            <span className="text-sm">{payment.requested_by}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Status:</span>
                                            {getStatusBadge(payment)}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">Payment Method</p>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-white rounded-lg">
                                            {getPaymentMethodIcon(payment.method)}
                                        </div>
                                        <span className="font-medium">{getPaymentMethodLabel(payment.method)}</span>
                                    </div>
                                    {payment.method === 'MOBILE_MONEY' && payment.external_reference && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500">Mobile Number</p>
                                            <p className="text-sm font-medium">{payment.external_reference}</p>
                                        </div>
                                    )}
                                    {payment.method === 'BANK_TRANSFER' && payment.provider_name && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500">Bank Reference</p>
                                            <p className="text-sm font-medium">{payment.provider_name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 ${voided ? 'bg-gray-100' : 'bg-emerald-50'}`}>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Gross Payable:</span>
                                        <span className={`font-medium ${voided ? 'line-through text-gray-500' : ''}`}>
                                            {formatUGX(payment.gross_payable_ugx)}
                                        </span>
                                    </div>
                                    {payment.advance_recovered_ugx > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Advance Recovered:</span>
                                            <span className="font-medium text-red-600">-{formatUGX(payment.advance_recovered_ugx)}</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-3 border-emerald-200">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-800">Net Payment:</span>
                                            <span className={`font-bold text-xl ${voided ? 'text-gray-500 line-through' : 'text-emerald-700'}`}>
                                                {formatUGX(payment.amount_paid_ugx)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {payment.notes && (
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <p className="text-xs text-blue-600 uppercase mb-2">Payment Notes</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{payment.notes}</p>
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 uppercase mb-2">Timeline</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Requested At:</span>
                                        <span className="font-medium">{formatDateTime(payment.requested_at)}</span>
                                    </div>
                                    {payment.approved_at && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Approved At:</span>
                                            <span className="font-medium">{formatDateTime(payment.approved_at)}</span>
                                        </div>
                                    )}
                                    {payment.processed_at && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Processed At:</span>
                                            <span className="font-medium">{formatDateTime(payment.processed_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'supplier' && supplier && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                                        <User size={32} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{supplier.name}</h3>
                                        <p className="text-gray-500">Code: {supplier.code}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    {supplier.phone && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Phone</p>
                                            <p className="text-sm font-medium">{supplier.phone}</p>
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Email</p>
                                            <p className="text-sm font-medium">{supplier.email}</p>
                                        </div>
                                    )}
                                    {supplier.bank_name && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Bank</p>
                                            <p className="text-sm font-medium">{supplier.bank_name}</p>
                                        </div>
                                    )}
                                    {supplier.account_number && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Account Number</p>
                                            <p className="text-sm font-medium">{supplier.account_number}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lot' && lot && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 rounded-xl p-5">
                                <h3 className="font-semibold text-gray-900 mb-3">Coffee Lot Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">GRN Number</p>
                                        <p className="text-sm font-mono font-medium">{lot.grn_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Batch Number</p>
                                        <p className="text-sm font-mono font-medium">{lot.batch_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Quantity</p>
                                        <p className="text-sm font-medium">{Number(lot.quantity_kg).toLocaleString()} kg</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Unit Price</p>
                                        <p className="text-sm font-medium">{formatUGX(lot.unit_price_ugx)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Assessment Date</p>
                                        <p className="text-sm">{formatDate(lot.assessed_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                    <button
                        onClick={() => printPaymentReceipt(payment)}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Print Receipt
                    </button>
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Void Payment Modal Component
function VoidPaymentModal({ payment, onClose, onConfirm, formatUGX }) {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) {
            alert('Please provide a reason for voiding this payment');
            return;
        }

        setIsSubmitting(true);
        await onConfirm(payment.id, reason);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-xl">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-lg">Void Payment</h3>
                    </div>

                    <div className="mb-4">
                        <p className="text-sm text-gray-600">
                            Are you sure you want to void this payment of <strong className="text-red-600">{formatUGX(payment.amount_paid_ugx)}</strong> to <strong>{payment.suppliers?.name}</strong>?
                        </p>
                        <p className="text-xs text-gray-500 mt-2">This action cannot be undone and will:
                            <br />• Mark this payment as voided
                            <br />• Return the lot status to "Ready for Payment"
                            <br />• Reverse cash balance if applicable
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason for voiding *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Please explain why this payment is being voided..."
                            required
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSubmitting || !reason.trim()}
                            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-2.5 rounded-xl font-medium hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                            {isSubmitting ? 'Processing...' : 'Yes, Void Payment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}