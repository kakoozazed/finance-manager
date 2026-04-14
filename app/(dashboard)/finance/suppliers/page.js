// app/(dashboard)/finance/suppliers/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    Search,
    Filter,
    Eye,
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Package,
    TrendingUp,
    Wallet,
    Send,
    Loader2,
    FileText,
    ChevronDown,
    Printer,
    AlertCircle,
    Calendar,
    CreditCard,
    Receipt,
    Download,
    ArrowUpRight,
    Users,
    Coffee,
    Zap,
    Shield,
    Banknote,
    Smartphone,
    Building2,
    X,
    Award,
    Plus,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Info,
    Edit,
    Trash2,
    Phone,
    Mail,
    MapPin,
    Building,
    History,
    Activity,
    BarChart3,
    CircleDollarSign,
    HandCoins,
    PiggyBank,
    Landmark,
    PhoneCall,
    AtSign,
    FileCheck,
    BadgeCheck,
    AlertTriangle,
    TrendingDown,
    BarChart,
    PieChart,
    ListChecks,
    ClipboardList
} from 'lucide-react';

export default function SuppliersPage() {
    const supabase = createClient();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOrigin, setFilterOrigin] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [processing, setProcessing] = useState(false);
    const [stats, setStats] = useState({
        total_suppliers: 0,
        total_advances: 0,
        total_outstanding: 0,
        total_paid: 0,
        active_advances: 0,
        total_coffee_delivered: 0,
        total_coffee_value: 0
    });
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [coffeeHistory, setCoffeeHistory] = useState([]);
    const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState(null);
    const [showCoffeeHistoryModal, setShowCoffeeHistoryModal] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        
        // Fetch suppliers
        let query = supabase
            .from('suppliers')
            .select('*')
            .order('name');

        const { data: suppliersData, error: suppliersError } = await query;

        if (!suppliersError && suppliersData) {
            setSuppliers(suppliersData);
            calculateStats(suppliersData);
            
            // Fetch advances for each supplier to calculate outstanding
            const { data: advancesData, error: advancesError } = await supabase
                .from('supplier_advances')
                .select('*')
                .in('supplier_id', suppliersData.map(s => s.id))
                .eq('is_closed', false);

            if (!advancesError && advancesData) {
                const supplierAdvances = {};
                advancesData.forEach(advance => {
                    if (!supplierAdvances[advance.supplier_id]) {
                        supplierAdvances[advance.supplier_id] = 0;
                    }
                    supplierAdvances[advance.supplier_id] += parseFloat(advance.outstanding_ugx);
                });
                
                setSuppliers(suppliersData.map(supplier => ({
                    ...supplier,
                    outstanding_advances: supplierAdvances[supplier.id] || 0
                })));
            }
        }
        setLoading(false);
    };

    const calculateStats = (suppliersData) => {
        const total = suppliersData.length;
        setStats(prev => ({ ...prev, total_suppliers: total }));
    };

    const fetchSupplierDetails = async (supplierId) => {
        // Fetch coffee delivery history
        const { data: coffeeData, error: coffeeError } = await supabase
            .from('finance_coffee_lots')
            .select(`
                *,
                coffee_records (coffee_type, batch_number, date),
                quality_assessments (moisture, outturn, final_price, quality_note)
            `)
            .eq('supplier_id', supplierId)
            .order('assessed_at', { ascending: false });

        if (!coffeeError) {
            setCoffeeHistory(coffeeData || []);
            const totalQuantity = coffeeData?.reduce((sum, c) => sum + (c.quantity_kg || 0), 0) || 0;
            const totalValue = coffeeData?.reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0) || 0;
            setStats(prev => ({
                ...prev,
                total_coffee_delivered: totalQuantity,
                total_coffee_value: totalValue
            }));
        }

        // Fetch advances
        const { data: advancesData, error: advancesError } = await supabase
            .from('supplier_advances')
            .select('*')
            .eq('supplier_id', supplierId)
            .order('issued_at', { ascending: false });

        if (!advancesError) {
            setAdvances(advancesData || []);
            const totalOutstanding = advancesData?.reduce((sum, a) => sum + parseFloat(a.outstanding_ugx), 0) || 0;
            const totalAdvances = advancesData?.reduce((sum, a) => sum + parseFloat(a.amount_ugx), 0) || 0;
            setStats(prev => ({
                ...prev,
                total_advances: totalAdvances,
                total_outstanding: totalOutstanding,
                active_advances: advancesData?.filter(a => !a.is_closed).length || 0
            }));
        }

        // Fetch payment history
        const { data: paymentsData, error: paymentsError } = await supabase
            .from('supplier_payments')
            .select(`
                *,
                finance_coffee_lots (
                    batch_number,
                    coffee_type,
                    quantity_kg
                )
            `)
            .eq('supplier_id', supplierId)
            .order('payment_date', { ascending: false })
            .limit(20);

        if (!paymentsError) {
            setPaymentHistory(paymentsData || []);
            const totalPaid = paymentsData?.reduce((sum, p) => sum + parseFloat(p.amount_paid_ugx), 0) || 0;
            setStats(prev => ({ ...prev, total_paid: totalPaid }));
        }
    };

    const handleViewSupplier = async (supplier) => {
        setSelectedSupplier(supplier);
        await fetchSupplierDetails(supplier.id);
        setShowDetailsModal(true);
    };

    const handleViewCoffeeHistory = async (supplier) => {
        setSelectedSupplier(supplier);
        await fetchSupplierDetails(supplier.id);
        setShowCoffeeHistoryModal(true);
    };

    const handleAddAdvance = (supplier) => {
        setSelectedSupplier(supplier);
        setShowAdvanceModal(true);
    };

    const handleViewPaymentHistory = async (supplier) => {
        setSelectedSupplier(supplier);
        await fetchSupplierDetails(supplier.id);
        setShowPaymentHistoryModal(true);
    };

    const handleEditSupplier = (supplier) => {
        setSupplierToEdit(supplier);
        setShowEditSupplierModal(true);
    };

    const submitAdvance = async (advanceData) => {
        setProcessing(true);
        
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = userData?.user;

        const { error } = await supabase
            .from('supplier_advances')
            .insert([{
                supplier_id: selectedSupplier.id,
                issued_by: currentUser?.email,
                amount_ugx: advanceData.amount,
                description: advanceData.description,
                outstanding_ugx: advanceData.amount
            }]);

        if (error) {
            alert('Error recording advance: ' + error.message);
        } else {
            alert('Advance recorded successfully!');
            setShowAdvanceModal(false);
            fetchSuppliers();
            if (selectedSupplier) {
                fetchSupplierDetails(selectedSupplier.id);
            }
        }
        setProcessing(false);
    };

    const submitSupplier = async (supplierData) => {
        setProcessing(true);
        
        const { error } = await supabase
            .from('suppliers')
            .insert([{
                name: supplierData.name,
                code: supplierData.code.toUpperCase(),
                phone: supplierData.phone,
                origin: supplierData.origin,
                email: supplierData.email,
                alternative_phone: supplierData.alternative_phone,
                bank_name: supplierData.bank_name,
                account_name: supplierData.account_name,
                account_number: supplierData.account_number,
                opening_balance: supplierData.opening_balance || 0,
                date_registered: supplierData.date_registered
            }]);

        if (error) {
            alert('Error adding supplier: ' + error.message);
        } else {
            alert('Supplier added successfully!');
            setShowSupplierModal(false);
            fetchSuppliers();
        }
        setProcessing(false);
    };

    const updateSupplier = async (supplierData) => {
        setProcessing(true);
        
        const { error } = await supabase
            .from('suppliers')
            .update({
                name: supplierData.name,
                code: supplierData.code.toUpperCase(),
                phone: supplierData.phone,
                origin: supplierData.origin,
                email: supplierData.email,
                alternative_phone: supplierData.alternative_phone,
                bank_name: supplierData.bank_name,
                account_name: supplierData.account_name,
                account_number: supplierData.account_number,
                updated_at: new Date().toISOString()
            })
            .eq('id', supplierToEdit.id);

        if (error) {
            alert('Error updating supplier: ' + error.message);
        } else {
            alert('Supplier updated successfully!');
            setShowEditSupplierModal(false);
            fetchSuppliers();
        }
        setProcessing(false);
    };

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
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getOriginBadge = (origin) => {
        const colors = {
            'Kampala': 'bg-purple-50 text-purple-700 border-purple-200',
            'Jinja': 'bg-blue-50 text-blue-700 border-blue-200',
            'Mbale': 'bg-green-50 text-green-700 border-green-200',
            'Mukono': 'bg-orange-50 text-orange-700 border-orange-200',
            'Mityana': 'bg-cyan-50 text-cyan-700 border-cyan-200'
        };
        const colorClass = colors[origin] || 'bg-gray-50 text-gray-600 border-gray-200';
        
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                <MapPin size={12} />
                {origin}
            </span>
        );
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'PAID':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle size={10} /> Paid</span>;
            case 'READY_FOR_FINANCE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><Clock size={10} /> Pending</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{status}</span>;
        }
    };

    // Filter suppliers
    const filteredSuppliers = suppliers.filter(supplier => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return supplier.name.toLowerCase().includes(search) ||
               supplier.code.toLowerCase().includes(search) ||
               supplier.phone?.includes(search);
    });

    // Apply origin filter
    const finalFilteredSuppliers = filterOrigin === 'all' 
        ? filteredSuppliers 
        : filteredSuppliers.filter(s => s.origin === filterOrigin);

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = finalFilteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(finalFilteredSuppliers.length / itemsPerPage);

    // Get unique origins for filter
    const origins = ['all', ...new Set(suppliers.map(s => s.origin).filter(Boolean))];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                                    <Users size={24} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
                                    <p className="text-sm text-gray-500 mt-0.5">Manage suppliers, track advances, coffee deliveries and payment history</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSupplierModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md"
                        >
                            <Plus size={16} />
                            Add Supplier
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Suppliers</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_suppliers}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl">
                                    <Users size={22} className="text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                                <TrendingUp size={12} />
                                <span>Active suppliers</span>
                            </div>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Advances</p>
                                    <p className="text-xl font-bold text-blue-600 mt-2">{formatUGX(stats.total_advances)}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <HandCoins size={22} className="text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                                <Activity size={12} />
                                <span>{stats.active_advances} active advances</span>
                            </div>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</p>
                                    <p className="text-xl font-bold text-amber-600 mt-2">{formatUGX(stats.total_outstanding)}</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl">
                                    <CircleDollarSign size={22} className="text-amber-600" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-amber-600">
                                <AlertCircle size={12} />
                                <span>To be recovered</span>
                            </div>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Total Paid</p>
                                    <p className="text-xl font-bold text-white mt-2">{formatUGX(stats.total_paid)}</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Receipt size={22} className="text-white" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-100">
                                <CheckCircle size={12} />
                                <span>Coffee payments</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, code or phone..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <select
                                value={filterOrigin}
                                onChange={(e) => {
                                    setFilterOrigin(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                                {origins.map(origin => (
                                    <option key={origin} value={origin}>
                                        {origin === 'all' ? 'All Origins' : origin}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => fetchSuppliers()}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Suppliers Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origin</th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 size={32} className="animate-spin text-emerald-500" />
                                                <p className="text-sm text-gray-500">Loading suppliers...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users size={48} className="text-gray-300" />
                                                <p className="text-sm font-medium text-gray-500">No suppliers found</p>
                                                <p className="text-xs text-gray-400">Click "Add Supplier" to get started</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((supplier) => (
                                        <tr key={supplier.id} className="hover:bg-gray-50/50 transition-colors duration-150 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                                                        <User size={18} className="text-emerald-700" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">Code: {supplier.code}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">Reg: {formatDate(supplier.date_registered)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {supplier.phone && (
                                                        <div className="flex items-center gap-1 text-sm text-gray-700">
                                                            <Phone size={12} className="text-gray-400" />
                                                            <span>{supplier.phone}</span>
                                                        </div>
                                                    )}
                                                    {supplier.email && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Mail size={10} className="text-gray-400" />
                                                            <span>{supplier.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getOriginBadge(supplier.origin)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {supplier.outstanding_advances > 0 ? (
                                                    <span className="text-sm font-semibold text-amber-600">
                                                        {formatUGX(supplier.outstanding_advances)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                    <BadgeCheck size={12} />
                                                    Active
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewSupplier(supplier)}
                                                        className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} className="text-gray-500 group-hover/btn:text-blue-600" />
                                                        <span className="text-xs text-gray-600 group-hover/btn:text-blue-600">Details</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewCoffeeHistory(supplier)}
                                                        className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 rounded-lg transition-all"
                                                        title="Coffee History"
                                                    >
                                                        <Coffee size={14} className="text-gray-500 group-hover/btn:text-amber-600" />
                                                        <span className="text-xs text-gray-600 group-hover/btn:text-amber-600">Coffee</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddAdvance(supplier)}
                                                        className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all"
                                                        title="Record Advance"
                                                    >
                                                        <HandCoins size={14} className="text-gray-500 group-hover/btn:text-blue-600" />
                                                        <span className="text-xs text-gray-600 group-hover/btn:text-blue-600">Advance</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewPaymentHistory(supplier)}
                                                        className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-lg transition-all"
                                                        title="Payment History"
                                                    >
                                                        <History size={14} className="text-gray-500 group-hover/btn:text-emerald-600" />
                                                        <span className="text-xs text-gray-600 group-hover/btn:text-emerald-600">Payments</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditSupplier(supplier)}
                                                        className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-lg transition-all"
                                                        title="Edit Supplier"
                                                    >
                                                        <Edit size={14} className="text-gray-500 group-hover/btn:text-purple-600" />
                                                        <span className="text-xs text-gray-600 group-hover/btn:text-purple-600">Edit</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && finalFilteredSuppliers.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="text-sm text-gray-500">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, finalFilteredSuppliers.length)} of {finalFilteredSuppliers.length} suppliers
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                                currentPage === i + 1
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Supplier Modal */}
            {showSupplierModal && (
                <SupplierModal
                    onClose={() => setShowSupplierModal(false)}
                    onSubmit={submitSupplier}
                    processing={processing}
                    formatUGX={formatUGX}
                />
            )}

            {/* Edit Supplier Modal */}
            {showEditSupplierModal && supplierToEdit && (
                <EditSupplierModal
                    supplier={supplierToEdit}
                    onClose={() => setShowEditSupplierModal(false)}
                    onSubmit={updateSupplier}
                    processing={processing}
                    formatUGX={formatUGX}
                />
            )}

            {/* Record Advance Modal */}
            {showAdvanceModal && selectedSupplier && (
                <AdvanceModal
                    supplier={selectedSupplier}
                    onClose={() => setShowAdvanceModal(false)}
                    onSubmit={submitAdvance}
                    processing={processing}
                    formatUGX={formatUGX}
                />
            )}

            {/* Supplier Details Modal */}
            {showDetailsModal && selectedSupplier && (
                <SupplierDetailsModal
                    supplier={selectedSupplier}
                    advances={advances}
                    paymentHistory={paymentHistory}
                    coffeeHistory={coffeeHistory}
                    stats={stats}
                    onClose={() => setShowDetailsModal(false)}
                    formatUGX={formatUGX}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                />
            )}

            {/* Coffee History Modal */}
            {showCoffeeHistoryModal && selectedSupplier && (
                <CoffeeHistoryModal
                    supplier={selectedSupplier}
                    coffeeHistory={coffeeHistory}
                    onClose={() => setShowCoffeeHistoryModal(false)}
                    formatUGX={formatUGX}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                />
            )}

            {/* Payment History Modal */}
            {showPaymentHistoryModal && selectedSupplier && (
                <PaymentHistoryModal
                    supplier={selectedSupplier}
                    payments={paymentHistory}
                    onClose={() => setShowPaymentHistoryModal(false)}
                    formatUGX={formatUGX}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
}

// Add Supplier Modal Component (same as before)
function SupplierModal({ onClose, onSubmit, processing, formatUGX }) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        phone: '',
        origin: 'Kampala',
        email: '',
        alternative_phone: '',
        bank_name: '',
        account_name: '',
        account_number: '',
        opening_balance: 0,
        date_registered: new Date().toISOString().split('T')[0]
    });

    const origins = ['Kampala', 'Jinja', 'Mbale', 'Mukono', 'Mityana', 'Other'];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                            <Plus size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Add New Supplier</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Enter supplier information</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Code *</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g., SUP001"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Alternative Phone</label>
                            <input
                                type="tel"
                                value={formData.alternative_phone}
                                onChange={(e) => setFormData({ ...formData, alternative_phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Origin *</label>
                            <select
                                value={formData.origin}
                                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {origins.map(origin => (
                                    <option key={origin} value={origin}>{origin}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date Registered</label>
                            <input
                                type="date"
                                value={formData.date_registered}
                                onChange={(e) => setFormData({ ...formData, date_registered: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Opening Balance</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">UGX</span>
                                <input
                                    type="number"
                                    value={formData.opening_balance}
                                    onChange={(e) => setFormData({ ...formData, opening_balance: parseInt(e.target.value) || 0 })}
                                    className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Bank Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                                <input
                                    type="text"
                                    value={formData.account_name}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={processing || !formData.name || !formData.code}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        {processing ? 'Adding...' : 'Add Supplier'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Edit Supplier Modal Component
function EditSupplierModal({ supplier, onClose, onSubmit, processing, formatUGX }) {
    const [formData, setFormData] = useState({
        name: supplier.name,
        code: supplier.code,
        phone: supplier.phone || '',
        origin: supplier.origin,
        email: supplier.email || '',
        alternative_phone: supplier.alternative_phone || '',
        bank_name: supplier.bank_name || '',
        account_name: supplier.account_name || '',
        account_number: supplier.account_number || ''
    });

    const origins = ['Kampala', 'Jinja', 'Mbale', 'Mukono', 'Mityana', 'Other'];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                            <Edit size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Edit Supplier</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Update supplier information</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Code *</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Alternative Phone</label>
                            <input
                                type="tel"
                                value={formData.alternative_phone}
                                onChange={(e) => setFormData({ ...formData, alternative_phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Origin *</label>
                            <select
                                value={formData.origin}
                                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {origins.map(origin => (
                                    <option key={origin} value={origin}>{origin}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Bank Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                                <input
                                    type="text"
                                    value={formData.account_name}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={processing || !formData.name || !formData.code}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                        {processing ? 'Updating...' : 'Update Supplier'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Advance Modal Component
function AdvanceModal({ supplier, onClose, onSubmit, processing, formatUGX }) {
    const [formData, setFormData] = useState({
        amount: '',
        description: ''
    });

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                            <HandCoins size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Record Advance</h3>
                            <p className="text-xs text-gray-500">For {supplier.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-blue-600">Supplier Code</p>
                        <p className="font-mono text-sm text-blue-900">{supplier.code}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Advance Amount (UGX) *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">UGX</span>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                                className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description / Purpose</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="e.g., Advance for coffee delivery, Transport advance, etc."
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={processing || !formData.amount}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <HandCoins size={18} />}
                        {processing ? 'Recording...' : 'Record Advance'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Supplier Details Modal Component (Enhanced with Coffee History)
function SupplierDetailsModal({ supplier, advances, paymentHistory, coffeeHistory, stats, onClose, formatUGX, formatDate, getStatusBadge }) {
    const [activeTab, setActiveTab] = useState('overview');

    const totalCoffeeQuantity = coffeeHistory.reduce((sum, c) => sum + (c.quantity_kg || 0), 0);
    const totalCoffeeValue = coffeeHistory.reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0);
    const paidLots = coffeeHistory.filter(c => c.finance_status === 'PAID').length;
    const pendingLots = coffeeHistory.filter(c => c.finance_status === 'READY_FOR_FINANCE').length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                            <User size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                            <p className="text-xs text-gray-500">Code: {supplier.code} | Registered: {formatDate(supplier.date_registered)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50/50 border-b border-gray-100">
                    <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500">Total Coffee Delivered</p>
                        <p className="text-lg font-bold text-amber-600">{totalCoffeeQuantity.toLocaleString()} kg</p>
                        <p className="text-xs text-gray-400 mt-1">Value: {formatUGX(totalCoffeeValue)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500">Coffee Lots</p>
                        <p className="text-lg font-bold text-gray-900">{coffeeHistory.length}</p>
                        <div className="flex gap-2 mt-1 text-xs">
                            <span className="text-green-600">{paidLots} paid</span>
                            <span className="text-amber-600">{pendingLots} pending</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500">Advances</p>
                        <p className="text-lg font-bold text-blue-600">{formatUGX(stats.total_advances)}</p>
                        <p className="text-xs text-amber-600 mt-1">Outstanding: {formatUGX(stats.total_outstanding)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500">Payments Made</p>
                        <p className="text-lg font-bold text-emerald-600">{formatUGX(stats.total_paid)}</p>
                        <p className="text-xs text-gray-400 mt-1">{paymentHistory.length} transactions</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100 px-6">
                    <div className="flex gap-4 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'overview'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 size={16} />
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('coffee')}
                            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'coffee'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Coffee size={16} />
                            Coffee History ({coffeeHistory.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('advances')}
                            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'advances'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <HandCoins size={16} />
                            Advances ({advances.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'payments'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Receipt size={16} />
                            Payment History ({paymentHistory.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'info'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Info size={16} />
                            Information
                        </button>
                        <button
                            onClick={() => setActiveTab('banking')}
                            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'banking'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Landmark size={16} />
                            Banking Details
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-r from-amber-50 to-amber-50/30 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package size={16} className="text-amber-600" />
                                        <span className="text-sm font-medium text-amber-900">Coffee Summary</span>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-700">{totalCoffeeQuantity.toLocaleString()} kg</p>
                                    <p className="text-sm text-amber-600 mt-1">Total delivered</p>
                                </div>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-50/30 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <HandCoins size={16} className="text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900">Financial Summary</span>
                                    </div>
                                    <p className="text-sm text-blue-700">Net Position: {formatUGX(totalCoffeeValue - stats.total_paid)}</p>
                                    <p className="text-xs text-blue-600 mt-1">Coffee Value - Payments</p>
                                </div>
                                <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/30 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={16} className="text-emerald-600" />
                                        <span className="text-sm font-medium text-emerald-900">Payment Rate</span>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-700">
                                        {totalCoffeeValue > 0 ? Math.round((stats.total_paid / totalCoffeeValue) * 100) : 0}%
                                    </p>
                                    <p className="text-sm text-emerald-600 mt-1">of total paid</p>
                                </div>
                            </div>

                            {/* Recent Coffee Deliveries */}
                            {coffeeHistory.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Coffee size={16} className="text-amber-500" />
                                        Recent Coffee Deliveries
                                    </h4>
                                    <div className="space-y-2">
                                        {coffeeHistory.slice(0, 5).map((coffee) => (
                                            <div key={coffee.id} className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {coffee.coffee_records?.coffee_type || 'Coffee'} - Batch #{coffee.coffee_records?.batch_number}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {coffee.quantity_kg} kg @ {formatUGX(coffee.unit_price_ugx)}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            Assessed: {formatDate(coffee.assessed_at)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-emerald-600">{formatUGX(coffee.total_amount_ugx)}</p>
                                                        {getStatusBadge(coffee.finance_status)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'coffee' && (
                        <div className="space-y-3">
                            {coffeeHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <Coffee size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">No coffee deliveries recorded</p>
                                    <p className="text-xs text-gray-400">Coffee lots will appear here once assessed</p>
                                </div>
                            ) : (
                                coffeeHistory.map((coffee) => (
                                    <div key={coffee.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-sm transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {coffee.coffee_records?.coffee_type || 'Coffee'} - Batch #{coffee.coffee_records?.batch_number}
                                                    </span>
                                                    {getStatusBadge(coffee.finance_status)}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Quantity</p>
                                                        <p className="font-medium">{coffee.quantity_kg?.toLocaleString()} kg</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Unit Price</p>
                                                        <p className="font-medium">{formatUGX(coffee.unit_price_ugx)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Total Amount</p>
                                                        <p className="font-semibold text-emerald-600">{formatUGX(coffee.total_amount_ugx)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Assessed</p>
                                                        <p className="font-medium text-sm">{formatDate(coffee.assessed_at)}</p>
                                                    </div>
                                                </div>
                                                {coffee.quality_assessments && (
                                                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                                        <span>Moisture: {coffee.quality_assessments.moisture}% | </span>
                                                        <span>Outturn: {coffee.quality_assessments.outturn}% | </span>
                                                        <span>Final Price: {formatUGX(coffee.quality_assessments.final_price)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'advances' && (
                        <div className="space-y-3">
                            {advances.length === 0 ? (
                                <div className="text-center py-8">
                                    <HandCoins size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">No advances recorded</p>
                                    <p className="text-xs text-gray-400">Record an advance to get started</p>
                                </div>
                            ) : (
                                advances.map((advance) => (
                                    <div key={advance.id} className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatUGX(advance.amount_ugx)}
                                                </p>
                                                {advance.description && (
                                                    <p className="text-xs text-gray-500 mt-1">{advance.description}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Issued: {formatDate(advance.issued_at)} by {advance.issued_by}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-amber-600">
                                                    Outstanding: {formatUGX(advance.outstanding_ugx)}
                                                </p>
                                                {advance.is_closed && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                                                        <CheckCircle size={12} />
                                                        Closed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="space-y-3">
                            {paymentHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <Receipt size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">No payment history</p>
                                    <p className="text-xs text-gray-400">Payments will appear here once processed</p>
                                </div>
                            ) : (
                                paymentHistory.map((payment) => (
                                    <div key={payment.id} className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-semibold text-emerald-600">
                                                        {formatUGX(payment.amount_paid_ugx)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-500">{payment.method}</span>
                                                    {payment.reference && (
                                                        <>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs font-mono text-gray-500">Ref: {payment.reference}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {payment.finance_coffee_lots && (
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        Lot: {payment.finance_coffee_lots.batch_number} - {payment.finance_coffee_lots.coffee_type} ({payment.finance_coffee_lots.quantity_kg} kg)
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                    <span>Paid: {formatDate(payment.payment_date)}</span>
                                                    <span>Recorded: {formatDate(payment.created_at)}</span>
                                                </div>
                                                {payment.notes && (
                                                    <p className="text-xs text-gray-500 mt-2">{payment.notes}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                                    <CheckCircle size={12} />
                                                    Completed
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Phone size={14} />
                                        <span className="text-xs">Phone Numbers</span>
                                    </div>
                                    <p className="text-sm font-medium">{supplier.phone || 'N/A'}</p>
                                    {supplier.alternative_phone && (
                                        <p className="text-xs text-gray-500 mt-1">{supplier.alternative_phone}</p>
                                    )}
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Mail size={14} />
                                        <span className="text-xs">Email</span>
                                    </div>
                                    <p className="text-sm font-medium">{supplier.email || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <MapPin size={14} />
                                        <span className="text-xs">Origin</span>
                                    </div>
                                    <p className="text-sm font-medium">{supplier.origin}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Calendar size={14} />
                                        <span className="text-xs">Registered</span>
                                    </div>
                                    <p className="text-sm font-medium">{formatDate(supplier.date_registered)}</p>
                                </div>
                            </div>
                            {supplier.opening_balance > 0 && (
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                    <p className="text-sm text-amber-700">Opening Balance: {formatUGX(supplier.opening_balance)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'banking' && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-gray-500 mb-3">
                                    <Landmark size={16} />
                                    <span className="text-sm font-medium">Bank Information</span>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Bank Name</p>
                                        <p className="text-sm font-medium">{supplier.bank_name || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Account Name</p>
                                        <p className="text-sm font-medium">{supplier.account_name || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Account Number</p>
                                        <p className="text-sm font-medium">{supplier.account_number || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Coffee History Modal Component
function CoffeeHistoryModal({ supplier, coffeeHistory, onClose, formatUGX, formatDate, getStatusBadge }) {
    const totalQuantity = coffeeHistory.reduce((sum, c) => sum + (c.quantity_kg || 0), 0);
    const totalValue = coffeeHistory.reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0);
    const paidValue = coffeeHistory.filter(c => c.finance_status === 'PAID').reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                            <Coffee size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Coffee Delivery History</h3>
                            <p className="text-xs text-gray-500">{supplier.name} - {supplier.code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-gray-50/50 border-b border-gray-100">
                    <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">Total Deliveries</p>
                        <p className="text-2xl font-bold text-gray-900">{coffeeHistory.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">Total Quantity</p>
                        <p className="text-2xl font-bold text-amber-600">{totalQuantity.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">Total Value</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatUGX(totalValue)}</p>
                    </div>
                </div>

                <div className="p-6">
                    {coffeeHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <Coffee size={48} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No coffee deliveries recorded</p>
                            <p className="text-xs text-gray-400">Coffee lots will appear here once assessed</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {coffeeHistory.map((coffee) => (
                                <div key={coffee.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                <span className="text-base font-semibold text-gray-900">
                                                    {coffee.coffee_records?.coffee_type || 'Coffee'} - Batch #{coffee.coffee_records?.batch_number}
                                                </span>
                                                {getStatusBadge(coffee.finance_status)}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                                <div>
                                                    <p className="text-xs text-gray-500">Quantity</p>
                                                    <p className="text-sm font-semibold">{coffee.quantity_kg?.toLocaleString()} kg</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Unit Price</p>
                                                    <p className="text-sm font-semibold">{formatUGX(coffee.unit_price_ugx)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Total Amount</p>
                                                    <p className="text-sm font-bold text-emerald-600">{formatUGX(coffee.total_amount_ugx)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Assessment Date</p>
                                                    <p className="text-sm">{formatDate(coffee.assessed_at)}</p>
                                                </div>
                                            </div>

                                            {coffee.quality_assessments && (
                                                <div className="bg-white rounded-lg p-3 mt-2">
                                                    <p className="text-xs font-medium text-gray-700 mb-2">Quality Parameters</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                        <div>
                                                            <span className="text-xs text-gray-500">Moisture:</span>
                                                            <span className="ml-1 font-medium">{coffee.quality_assessments.moisture}%</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500">Outturn:</span>
                                                            <span className="ml-1 font-medium">{coffee.quality_assessments.outturn}%</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500">Final Price:</span>
                                                            <span className="ml-1 font-medium">{formatUGX(coffee.quality_assessments.final_price)}</span>
                                                        </div>
                                                        {coffee.quality_assessments.quality_note && (
                                                            <div className="col-span-2">
                                                                <span className="text-xs text-gray-500">Note:</span>
                                                                <span className="ml-1 text-xs">{coffee.quality_assessments.quality_note}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {coffee.finance_notes && (
                                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                                    <span className="font-medium">Finance Note:</span> {coffee.finance_notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Payment History Modal Component
function PaymentHistoryModal({ supplier, payments, onClose, formatUGX, formatDate }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                            <History size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Payment History</h3>
                            <p className="text-xs text-gray-500">{supplier.name} - {supplier.code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {payments.length === 0 ? (
                        <div className="text-center py-12">
                            <Receipt size={48} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No payment history</p>
                            <p className="text-xs text-gray-400">Payments will appear here once processed</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment) => (
                                <div key={payment.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-sm transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="text-sm font-semibold text-emerald-600">
                                                    {formatUGX(payment.amount_paid_ugx)}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">{payment.method}</span>
                                                {payment.reference && (
                                                    <>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs font-mono text-gray-500">Ref: {payment.reference}</span>
                                                    </>
                                                )}
                                            </div>
                                            {payment.finance_coffee_lots && (
                                                <div className="text-xs text-gray-500 mb-1">
                                                    Lot: {payment.finance_coffee_lots.batch_number} - {payment.finance_coffee_lots.coffee_type} ({payment.finance_coffee_lots.quantity_kg} kg)
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                <span>Paid: {formatDate(payment.payment_date)}</span>
                                                <span>Recorded: {formatDate(payment.created_at)}</span>
                                            </div>
                                            {payment.notes && (
                                                <p className="text-xs text-gray-500 mt-2">{payment.notes}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                                <CheckCircle size={12} />
                                                Completed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}