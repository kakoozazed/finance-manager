// app/(dashboard)/sales/page.js
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
    AlertCircle,
    Calendar,
    User,
    Package,
    TrendingUp,
    Coffee,
    ShoppingCart,
    Receipt,
    Plus,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
    Banknote,
    Smartphone,
    Building2,
    Wallet,
    FileText,
    Users,
    Warehouse,
    Activity,
    Target,
    Sparkles,
    ArrowUpRight,
    Printer,
    Download,
    BarChart3,
    HandCoins,
    Landmark,
    FileCheck,
    BadgeCheck,
    AlertTriangle,
    Layers,
    Box,
    Clock,
    Award,
    Zap,
    Shield,
    MapPin,
    Phone,
    Mail,
    Building,
    TrendingDown,
    PieChart,
    ListChecks,
    Menu,
    Grid3x3,
    List,
    Star,
    Truck,
    Briefcase,
    Rocket,
    Tag,
    Percent,
    TruckIcon,
    ClipboardCheck,
    FileSpreadsheet,
    PrintIcon,
    DownloadCloud,
    Upload,
    Settings,
    Sliders,
    SortAsc,
    SortDesc,
    Info,
    AtSign,
    PhoneCall,
    CircleDollarSign,
    PiggyBank
} from 'lucide-react';

export default function SalesPage() {
    const supabase = createClient();
    const [inventoryBatches, setInventoryBatches] = useState([]);
    const [salesRecords, setSalesRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedSale, setSelectedSale] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('inventory');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [processing, setProcessing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [viewMode, setViewMode] = useState('table');
    const [stats, setStats] = useState({
        total_inventory: 0,
        total_sold: 0,
        total_revenue: 0,
        remaining_inventory: 0,
        total_transactions: 0,
        unique_customers: 0,
        low_stock_count: 0,
        out_of_stock_count: 0
    });

    useEffect(() => {
        fetchInventoryData();
        fetchSalesData();
    }, []);

    const fetchInventoryData = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory_batches')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (data) {
                setInventoryBatches(data);
                calculateInventoryStats(data);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const fetchSalesData = async () => {
        try {
            const { data, error } = await supabase
                .from('sales_inventory_tracking')
                .select('*')
                .order('sale_date', { ascending: false });

            if (error) throw error;
            
            if (data) {
                setSalesRecords(data);
                calculateSalesStats(data);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateInventoryStats = (batches) => {
        const total = batches.reduce((sum, b) => sum + (b.total_kilograms || 0), 0);
        const remaining = batches.reduce((sum, b) => sum + (b.remaining_kilograms || 0), 0);
        const sold = total - remaining;
        const lowStock = batches.filter(b => {
            const percentage = (b.remaining_kilograms / b.total_kilograms) * 100;
            return percentage > 0 && percentage < 20;
        }).length;
        const outOfStock = batches.filter(b => b.remaining_kilograms === 0).length;
        
        setStats(prev => ({
            ...prev,
            total_inventory: total,
            remaining_inventory: remaining,
            total_sold: sold,
            low_stock_count: lowStock,
            out_of_stock_count: outOfStock
        }));
    };

    const calculateSalesStats = (sales) => {
        const revenue = sales.reduce((sum, s) => sum + ((s.price_per_kg || 0) * (s.quantity_kg || 0)), 0);
        const uniqueCustomers = new Set(sales.map(s => s.customer_name).filter(Boolean)).size;
        
        setStats(prev => ({
            ...prev,
            total_revenue: revenue,
            total_transactions: sales.length,
            unique_customers: uniqueCustomers
        }));
    };

    const handleRecordSale = async (saleData) => {
        setProcessing(true);
        
        try {
            const { data: userData } = await supabase.auth.getUser();
            const currentUser = userData?.user;
            
            const saleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            
            const { error: insertError } = await supabase
                .from('sales_inventory_tracking')
                .insert([{
                    sale_id: saleId,
                    coffee_record_id: saleData.batch_id,
                    batch_number: saleData.batch_code,
                    coffee_type: saleData.coffee_type,
                    quantity_kg: parseFloat(saleData.quantity),
                    sale_date: saleData.sale_date || new Date().toISOString(),
                    customer_name: saleData.customer_name || 'Walk-in Customer',
                    created_by: currentUser?.email,
                    price_per_kg: parseFloat(saleData.price_per_kg),
                    payment_method: saleData.payment_method,
                    notes: saleData.notes || null
                }]);

            if (insertError) throw insertError;

            const batchToUpdate = inventoryBatches.find(b => b.id === saleData.batch_id);
            if (batchToUpdate) {
                const newRemaining = batchToUpdate.remaining_kilograms - parseFloat(saleData.quantity);
                const { error: updateError } = await supabase
                    .from('inventory_batches')
                    .update({ 
                        remaining_kilograms: newRemaining,
                        status: newRemaining === 0 ? 'sold_out' : 'active',
                        sold_out_at: newRemaining === 0 ? new Date().toISOString() : null
                    })
                    .eq('id', saleData.batch_id);

                if (updateError) throw updateError;
            }

            alert('Sale recorded successfully!');
            await fetchInventoryData();
            await fetchSalesData();
            setShowSaleModal(false);
            setSelectedBatch(null);
        } catch (error) {
            console.error('Error recording sale:', error);
            alert('Error recording sale: ' + error.message);
        } finally {
            setProcessing(false);
        }
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatShortDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-UG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (remaining, total) => {
        if (!total || total === 0) return null;
        const percentage = (remaining / total) * 100;
        if (percentage === 0) {
            return { color: 'red', text: 'Out of Stock', icon: XCircle };
        } else if (percentage < 20) {
            return { color: 'amber', text: 'Low Stock', icon: AlertCircle };
        } else if (percentage < 50) {
            return { color: 'blue', text: 'Medium Stock', icon: CheckCircle };
        } else {
            return { color: 'green', text: 'In Stock', icon: CheckCircle };
        }
    };

    const getPaymentMethodIcon = (method) => {
        switch(method) {
            case 'CASH': return <Banknote size={14} />;
            case 'BANK_TRANSFER': return <Building2 size={14} />;
            case 'MOBILE_MONEY': return <Smartphone size={14} />;
            default: return <Wallet size={14} />;
        }
    };

    const getPaymentMethodColor = (method) => {
        switch(method) {
            case 'CASH': return 'bg-emerald-100 text-emerald-700';
            case 'BANK_TRANSFER': return 'bg-purple-100 text-purple-700';
            case 'MOBILE_MONEY': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredInventory = inventoryBatches.filter(batch => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return batch.coffee_type?.toLowerCase().includes(search) ||
               batch.batch_code?.toLowerCase().includes(search) ||
               (batch.supplier_name && batch.supplier_name.toLowerCase().includes(search));
    });

    const filteredSales = salesRecords.filter(sale => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return sale.customer_name?.toLowerCase().includes(search) ||
               sale.batch_number?.toLowerCase().includes(search) ||
               sale.coffee_type?.toLowerCase().includes(search) ||
               sale.sale_id?.toLowerCase().includes(search);
    });

    const dateFilteredSales = filteredSales.filter(sale => {
        if (dateRange.start && dateRange.end) {
            const saleDate = new Date(sale.sale_date);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59);
            return saleDate >= startDate && saleDate <= endDate;
        }
        return true;
    });

    const currentData = filterType === 'inventory' ? filteredInventory : dateFilteredSales;
    const paginatedData = currentData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(currentData.length / itemsPerPage);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                                    <ShoppingCart size={24} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                        Sales & Inventory
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                        <Sparkles size={14} className="text-emerald-500" />
                                        Track coffee sales, manage inventory, and monitor stock levels
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                                <button
                                    onClick={() => {
                                        setFilterType('inventory');
                                        setCurrentPage(1);
                                        setSearchTerm('');
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                        filterType === 'inventory'
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Package size={16} />
                                    Inventory
                                </button>
                                <button
                                    onClick={() => {
                                        setFilterType('sales');
                                        setCurrentPage(1);
                                        setSearchTerm('');
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                        filterType === 'sales'
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Receipt size={16} />
                                    Sales
                                </button>
                            </div>
                            <button
                                onClick={() => setShowSaleModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                <Plus size={16} />
                                Record Sale
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Inventory</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total_inventory.toLocaleString()} <span className="text-sm font-normal">kg</span></p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-xl group-hover:scale-110 transition-transform">
                                    <Package size={22} className="text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 text-gray-500">
                                    <Warehouse size={12} />
                                    <span>{stats.remaining_inventory.toLocaleString()} kg left</span>
                                </div>
                                {stats.low_stock_count > 0 && (
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <AlertCircle size={12} />
                                        <span>{stats.low_stock_count} low stock</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    </div>

                    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sold</p>
                                    <p className="text-2xl font-bold text-blue-600 mt-2">{stats.total_sold.toLocaleString()} <span className="text-sm font-normal">kg</span></p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-xl group-hover:scale-110 transition-transform">
                                    <TrendingUp size={22} className="text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                                <Activity size={12} />
                                <span>{stats.total_transactions} transactions completed</span>
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    </div>

                    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-xl font-bold text-purple-600 mt-2">{formatUGX(stats.total_revenue)}</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-50 rounded-xl group-hover:scale-110 transition-transform">
                                    <DollarSign size={22} className="text-purple-600" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-purple-600">
                                <Users size={12} />
                                <span>{stats.unique_customers} unique customers</span>
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    </div>

                    <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Turnover Rate</p>
                                    <p className="text-3xl font-bold text-white mt-2">
                                        {stats.total_inventory > 0 ? Math.round((stats.total_sold / stats.total_inventory) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <Target size={22} className="text-white" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-100">
                                <Clock size={12} />
                                <span>Inventory turnover rate</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Big Record Sale Button - Added for easy access */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowSaleModal(true)}
                        className="w-full md:w-auto px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
                    >
                        <Plus size={24} />
                        Record New Sale
                        <ArrowUpRight size={20} />
                    </button>
                </div>

                {/* Filters Bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <Filter size={16} />
                                    Filters
                                    <ChevronLeft size={14} className={`transition-transform duration-200 ${showFilters ? 'rotate-90' : ''}`} />
                                </button>
                                <div className="hidden sm:flex gap-1 bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
                                    >
                                        <List size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
                                    >
                                        <Grid3x3 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={filterType === 'inventory' ? "Search by coffee type, batch code..." : "Search by customer, batch code, coffee type..."}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    fetchInventoryData();
                                    fetchSalesData();
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                                Refresh
                            </button>
                        </div>
                    </div>
                    
                    {showFilters && filterType === 'sales' && (
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-100 animate-in slide-down duration-200">
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span className="text-sm text-gray-600">Date Range:</span>
                                </div>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                />
                                {(dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => setDateRange({ start: '', end: '' })}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Display - Inventory Table View (Sell button removed) */}
                {filterType === 'inventory' && viewMode === 'table' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch Details</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coffee Type</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total (kg)</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining (kg)</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold (kg)</th>
                                        <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                        <Coffee size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" />
                                                    </div>
                                                    <p className="text-sm text-gray-500">Loading inventory...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-4 bg-gray-100 rounded-full">
                                                        <Package size={48} className="text-gray-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-500">No inventory found</p>
                                                    <p className="text-xs text-gray-400">Coffee batches will appear here once processed</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((batch, index) => {
                                            const sold = (batch.total_kilograms || 0) - (batch.remaining_kilograms || 0);
                                            const status = getStatusBadge(batch.remaining_kilograms, batch.total_kilograms);
                                            const StatusIcon = status?.icon;
                                            return (
                                                <tr key={batch.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200 group animate-in slide-in-from-bottom duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Batch #{batch.batch_code}</p>
                                                            <p className="text-xs text-gray-500 mt-1">Received: {formatShortDate(batch.batch_date || batch.created_at)}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-50 rounded-xl flex items-center justify-center">
                                                                <Coffee size={14} className="text-amber-600" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {batch.coffee_type || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="text-sm text-gray-900">{batch.supplier_name || 'N/A'}</p>
                                                            {batch.supplier_contact && (
                                                                <p className="text-xs text-gray-500">{batch.supplier_contact}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-medium text-gray-900">{batch.total_kilograms?.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-sm font-semibold ${batch.remaining_kilograms > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {batch.remaining_kilograms?.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm text-blue-600 font-medium">{sold.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {status && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-700`}>
                                                                <StatusIcon size={10} />
                                                                {status.text}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && filteredInventory.length > 0 && (
                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredInventory.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                )}

                {/* Inventory Grid View (Sell button removed) */}
                {filterType === 'inventory' && viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-500">
                        {loading ? (
                            <div className="col-span-full text-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                        <Coffee size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" />
                                    </div>
                                    <p className="text-sm text-gray-500">Loading inventory...</p>
                                </div>
                            </div>
                        ) : paginatedData.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-4 bg-gray-100 rounded-full">
                                        <Package size={48} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No inventory found</p>
                                    <p className="text-xs text-gray-400">Coffee batches will appear here once processed</p>
                                </div>
                            </div>
                        ) : (
                            paginatedData.map((batch) => {
                                const sold = (batch.total_kilograms || 0) - (batch.remaining_kilograms || 0);
                                const status = getStatusBadge(batch.remaining_kilograms, batch.total_kilograms);
                                const StatusIcon = status?.icon;
                                return (
                                    <div key={batch.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-50 rounded-xl flex items-center justify-center">
                                                        <Coffee size={20} className="text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{batch.coffee_type || 'N/A'}</h3>
                                                        <p className="text-xs text-gray-500">Batch #{batch.batch_code}</p>
                                                    </div>
                                                </div>
                                                {status && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-700`}>
                                                        <StatusIcon size={10} />
                                                        {status.text}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-3 mb-4">
                                                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                    <span className="text-xs text-gray-500">Total Quantity</span>
                                                    <span className="text-sm font-semibold text-gray-900">{batch.total_kilograms?.toLocaleString()} kg</span>
                                                </div>
                                                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                    <span className="text-xs text-gray-500">Remaining</span>
                                                    <span className={`text-sm font-semibold ${batch.remaining_kilograms > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {batch.remaining_kilograms?.toLocaleString()} kg
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500">Sold</span>
                                                    <span className="text-sm font-medium text-blue-600">{sold.toLocaleString()} kg</span>
                                                </div>
                                            </div>
                                            
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                <div 
                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(batch.remaining_kilograms / batch.total_kilograms) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {!loading && filteredInventory.length > 0 && (
                            <div className="col-span-full mt-4">
                                <Pagination 
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={filteredInventory.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Sales Table View */}
                {filterType === 'sales' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sale ID</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coffee Type</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity (kg)</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price/kg</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                                        <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="10" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                        <Receipt size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" />
                                                    </div>
                                                    <p className="text-sm text-gray-500">Loading sales...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-4 bg-gray-100 rounded-full">
                                                        <Receipt size={48} className="text-gray-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-500">No sales recorded</p>
                                                    <p className="text-xs text-gray-400">Click "Record Sale" to get started</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((sale, index) => (
                                            <tr key={sale.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200 group animate-in slide-in-from-bottom duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono font-medium text-gray-600">{sale.sale_id}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        <span className="text-sm text-gray-900">{formatShortDate(sale.sale_date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900">{sale.customer_name || 'Walk-in Customer'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-50 rounded-xl flex items-center justify-center">
                                                            <Coffee size={14} className="text-amber-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{sale.coffee_type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono text-gray-500">{sale.batch_number}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-semibold text-blue-600">{sale.quantity_kg?.toLocaleString()} kg</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm text-gray-700">{formatUGX(sale.price_per_kg)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-bold text-emerald-600">{formatUGX((sale.price_per_kg || 0) * (sale.quantity_kg || 0))}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getPaymentMethodColor(sale.payment_method)}`}>
                                                        {getPaymentMethodIcon(sale.payment_method)}
                                                        <span>{sale.payment_method?.replace('_', ' ') || 'CASH'}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSale(sale);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 border border-gray-200 rounded-lg transition-all hover:border-emerald-200 hover:shadow-sm"
                                                    >
                                                        <Eye size={14} className="text-gray-500" />
                                                        <span className="text-xs text-gray-600">View</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && dateFilteredSales.length > 0 && (
                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={dateFilteredSales.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showSaleModal && (
                <SaleModal
                    batch={selectedBatch}
                    inventoryBatches={inventoryBatches}
                    onClose={() => {
                        setShowSaleModal(false);
                        setSelectedBatch(null);
                    }}
                    onSubmit={handleRecordSale}
                    processing={processing}
                    formatUGX={formatUGX}
                />
            )}

            {showDetailsModal && selectedSale && (
                <SaleDetailsModal
                    sale={selectedSale}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedSale(null);
                    }}
                    formatUGX={formatUGX}
                    formatDate={formatDate}
                    getPaymentMethodIcon={getPaymentMethodIcon}
                    getPaymentMethodColor={getPaymentMethodColor}
                />
            )}
        </div>
    );
}

// Pagination Component
function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) {
    return (
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-500">
                    Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex gap-1">
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) {
                                pageNum = currentPage - 3 + i;
                                if (pageNum > totalPages) return null;
                            }
                            if (pageNum <= totalPages) {
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                            currentPage === pageNum
                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            }
                            return null;
                        })}
                    </div>
                    <button
                        onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Sale Modal Component
function SaleModal({ batch, inventoryBatches, onClose, onSubmit, processing, formatUGX }) {
    const [selectedBatchId, setSelectedBatchId] = useState(batch?.id || '');
    const [formData, setFormData] = useState({
        batch_id: batch?.id || '',
        batch_code: batch?.batch_code || '',
        coffee_type: batch?.coffee_type || '',
        customer_name: '',
        quantity: '',
        price_per_kg: '',
        payment_method: 'CASH',
        sale_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const selectedBatchDetails = inventoryBatches.find(b => b.id === selectedBatchId);
    const maxQuantity = selectedBatchDetails?.remaining_kilograms || 0;
    const totalAmount = formData.quantity && formData.price_per_kg ? parseFloat(formData.quantity) * parseFloat(formData.price_per_kg) : 0;

    const handleBatchChange = (batchId) => {
        const selected = inventoryBatches.find(b => b.id === batchId);
        if (selected) {
            setSelectedBatchId(batchId);
            setFormData({
                ...formData,
                batch_id: batchId,
                batch_code: selected.batch_code,
                coffee_type: selected.coffee_type
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                            <ShoppingCart size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Record Coffee Sale</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Record a new coffee sale transaction</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {!batch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Coffee Batch *</label>
                            <select
                                value={selectedBatchId}
                                onChange={(e) => handleBatchChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            >
                                <option value="">Select a batch...</option>
                                {inventoryBatches
                                    .filter(b => b.remaining_kilograms > 0)
                                    .map(batchItem => (
                                        <option key={batchItem.id} value={batchItem.id}>
                                            Batch #{batchItem.batch_code} - {batchItem.coffee_type} ({batchItem.remaining_kilograms} kg available)
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {selectedBatchDetails && (
                        <>
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-emerald-700">Batch Information</span>
                                    <span className="text-xs font-mono text-emerald-600">#{selectedBatchDetails.batch_code}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-emerald-600">Available Stock</span>
                                    <span className="text-lg font-bold text-emerald-700">{selectedBatchDetails.remaining_kilograms} kg</span>
                                </div>
                                <div className="text-xs text-emerald-500 mt-2">
                                    Coffee Type: {selectedBatchDetails.coffee_type}
                                </div>
                                {selectedBatchDetails.supplier_name && (
                                    <div className="text-xs text-emerald-500">
                                        Supplier: {selectedBatchDetails.supplier_name}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                                <input
                                    type="text"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                    placeholder="Walk-in Customer"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (kg) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.quantity}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) && value <= maxQuantity) {
                                                setFormData({ ...formData, quantity: e.target.value });
                                            } else if (isNaN(value)) {
                                                setFormData({ ...formData, quantity: '' });
                                            }
                                        }}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                    {formData.quantity > maxQuantity && (
                                        <p className="text-xs text-red-500 mt-1">Exceeds available stock ({maxQuantity} kg available)</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Price per kg (UGX) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">UGX</span>
                                        <input
                                            type="number"
                                            value={formData.price_per_kg}
                                            onChange={(e) => setFormData({ ...formData, price_per_kg: e.target.value })}
                                            className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {totalAmount > 0 && (
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-emerald-700">Total Amount</span>
                                        <span className="text-2xl font-bold text-emerald-700">{formatUGX(totalAmount)}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'CASH', label: 'Cash', icon: Banknote, color: 'emerald' },
                                        { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2, color: 'purple' },
                                        { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, color: 'blue' }
                                    ].map(method => {
                                        const Icon = method.icon;
                                        return (
                                            <button
                                                key={method.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, payment_method: method.value })}
                                                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                                    formData.payment_method === method.value
                                                        ? `bg-gradient-to-r from-${method.color}-600 to-${method.color}-600 text-white shadow-md`
                                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                }`}
                                            >
                                                <Icon size={14} />
                                                {method.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sale Date</label>
                                <input
                                    type="date"
                                    value={formData.sale_date}
                                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    placeholder="Additional notes about this sale..."
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={processing || !formData.batch_id || !formData.quantity || !formData.price_per_kg || parseFloat(formData.quantity) > maxQuantity}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                        {processing ? 'Processing...' : 'Record Sale'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Sale Details Modal Component
function SaleDetailsModal({ sale, onClose, formatUGX, formatDate, getPaymentMethodIcon, getPaymentMethodColor }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                            <Receipt size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Sale Details</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Transaction information</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Sale Summary */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-emerald-700">Sale Amount</span>
                            <span className="text-2xl font-bold text-emerald-700">{formatUGX((sale.price_per_kg || 0) * (sale.quantity_kg || 0))}</span>
                        </div>
                        <div className="border-t border-emerald-200 pt-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-600">Quantity Sold</span>
                                <span className="font-semibold text-emerald-800">{sale.quantity_kg} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-600">Price per kg</span>
                                <span className="font-semibold text-emerald-800">{formatUGX(sale.price_per_kg)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sale ID */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Sale ID</span>
                            <span className="text-sm font-mono font-medium text-gray-900">{sale.sale_id}</span>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <User size={16} className="text-emerald-500" />
                            Customer Information
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Customer Name</span>
                                <span className="text-sm font-medium text-gray-900">{sale.customer_name || 'Walk-in Customer'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Sale Date</span>
                                <span className="text-sm font-medium text-gray-900">{formatDate(sale.sale_date)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Payment Method</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getPaymentMethodColor(sale.payment_method)}`}>
                                    {getPaymentMethodIcon(sale.payment_method)}
                                    <span>{sale.payment_method?.replace('_', ' ') || 'CASH'}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Coffee Details */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Coffee size={16} className="text-amber-500" />
                            Coffee Details
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Coffee Type</span>
                                <span className="text-sm font-medium text-gray-900">{sale.coffee_type || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Batch Number</span>
                                <span className="text-sm font-mono text-gray-900">{sale.batch_number || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    {(sale.created_by || sale.notes) && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <FileText size={16} className="text-purple-500" />
                                Additional Information
                            </h4>
                            <div className="space-y-2">
                                {sale.created_by && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Recorded By</span>
                                        <span className="text-sm text-gray-900">{sale.created_by}</span>
                                    </div>
                                )}
                                {sale.notes && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Notes</p>
                                        <p className="text-sm text-gray-700">{sale.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}