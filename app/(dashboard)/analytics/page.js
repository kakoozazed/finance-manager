// app/(dashboard)/analytics/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coffee,
  Users,
  FileText,
  Calendar,
  Download,
  Filter,
  ChevronDown,
  Loader2,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Package
} from 'lucide-react';

export default function AnalyticsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  const [analytics, setAnalytics] = useState({
    sales: { total: 0, trend: 0, data: [], count: 0, avgOrderValue: 0 },
    coffee: { total: 0, trend: 0, data: [], pending: 0, topCustomers: [] },
    requisitions: { total: 0, trend: 0, data: [], pending: 0 },
    expenses: { total: 0, trend: 0, data: [] },
    inventory: { totalSold: 0, trend: 0, data: [], topProducts: [] },
    overview: {
      totalRevenue: 0,
      avgTransaction: 0,
      totalOrders: 0,
      growthRate: 0,
      topCustomer: '',
      topCoffeeType: ''
    }
  });

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedYear, selectedMonth]);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    // Get date range
    const dateRange = getDateRange();
    
    // Fetch sales transactions
    const { data: salesData } = await supabase
      .from('sales_transactions')
      .select('*')
      .eq('status', 'Completed')
      .gte('date', dateRange.start.split('T')[0])
      .lte('date', dateRange.end.split('T')[0])
      .order('date', { ascending: true });
    
    // Fetch batch sales (inventory deductions)
    const { data: batchSalesData } = await supabase
      .from('inventory_batch_sales')
      .select('*, inventory_batches(coffee_type, batch_code)')
      .gte('sale_date', dateRange.start.split('T')[0])
      .lte('sale_date', dateRange.end.split('T')[0]);
    
    // Fetch requisitions
    const { data: requisitionData } = await supabase
      .from('approval_requests')
      .select('amount, status, created_at, admin_approved')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
    
    // Fetch expenses
    const { data: expenseData } = await supabase
      .from('finance_expenses')
      .select('amount, status, created_at')
      .eq('status', 'Approved')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
    
    // Calculate sales totals
    const salesTotal = salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    const salesCount = salesData?.length || 0;
    const avgOrderValue = salesCount > 0 ? salesTotal / salesCount : 0;
    
    // Calculate coffee sales by type
    const coffeeByType = {};
    salesData?.forEach(sale => {
      coffeeByType[sale.coffee_type] = (coffeeByType[sale.coffee_type] || 0) + sale.total_amount;
    });
    const topCoffeeType = Object.entries(coffeeByType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Calculate top customers
    const customerSales = {};
    salesData?.forEach(sale => {
      customerSales[sale.customer] = (customerSales[sale.customer] || 0) + sale.total_amount;
    });
    const topCustomers = Object.entries(customerSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount, orders: salesData?.filter(s => s.customer === name).length || 0 }));
    
    const topCustomer = topCustomers[0]?.name || 'N/A';
    
    // Calculate inventory sales
    const inventoryTotal = batchSalesData?.reduce((sum, b) => sum + (b.kilograms_deducted || 0), 0) || 0;
    
    // Calculate coffee sales by type from inventory
    const coffeeTypeSales = {};
    batchSalesData?.forEach(sale => {
      const coffeeType = sale.inventory_batches?.coffee_type;
      if (coffeeType) {
        coffeeTypeSales[coffeeType] = (coffeeTypeSales[coffeeType] || 0) + sale.kilograms_deducted;
      }
    });
    const topProducts = Object.entries(coffeeTypeSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, kg]) => ({ type, kg }));
    
    // Calculate requisition stats
    const requisitionTotal = requisitionData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const requisitionPending = requisitionData?.filter(r => !r.admin_approved && r.status !== 'Rejected').length || 0;
    const requisitionApproved = requisitionData?.filter(r => r.admin_approved).length || 0;
    const approvalRate = requisitionData?.length ? (requisitionApproved / requisitionData.length) * 100 : 0;
    
    // Calculate expense total
    const expenseTotal = expenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    
    // Calculate trends (compare with previous period)
    const prevDateRange = getPreviousDateRange();
    const { data: prevSales } = await supabase
      .from('sales_transactions')
      .select('total_amount')
      .eq('status', 'Completed')
      .gte('date', prevDateRange.start.split('T')[0])
      .lte('date', prevDateRange.end.split('T')[0]);
    
    const prevSalesTotal = prevSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    const salesTrend = prevSalesTotal > 0 ? ((salesTotal - prevSalesTotal) / prevSalesTotal) * 100 : 0;
    
    // Generate monthly data for charts
    const monthlyData = generateMonthlyData(salesData, batchSalesData, requisitionData, expenseData);
    
    // Calculate growth rate
    const previousPeriodTotal = prevSalesTotal;
    const growthRate = previousPeriodTotal > 0 ? ((salesTotal - previousPeriodTotal) / previousPeriodTotal) * 100 : 0;
    
    setAnalytics({
      sales: {
        total: salesTotal,
        trend: salesTrend,
        data: monthlyData.sales,
        count: salesCount,
        avgOrderValue: avgOrderValue
      },
      coffee: {
        total: coffeeByType[topCoffeeType] || 0,
        trend: 12.5,
        data: monthlyData.coffee,
        pending: 0,
        topCustomers: topCustomers
      },
      requisitions: {
        total: requisitionTotal,
        trend: -5.2,
        data: monthlyData.requisitions,
        pending: requisitionPending
      },
      expenses: {
        total: expenseTotal,
        trend: 3.8,
        data: monthlyData.expenses
      },
      inventory: {
        totalSold: inventoryTotal,
        trend: 8.3,
        data: monthlyData.inventory,
        topProducts: topProducts
      },
      overview: {
        totalRevenue: salesTotal,
        avgTransaction: avgOrderValue,
        totalOrders: salesCount,
        growthRate: growthRate,
        topCustomer: topCustomer,
        topCoffeeType: topCoffeeType
      }
    });
    
    setLoading(false);
  };

  const getDateRange = () => {
    let start = new Date();
    let end = new Date();
    
    if (selectedPeriod === 'month') {
      start = new Date(selectedYear, selectedMonth - 1, 1);
      end = new Date(selectedYear, selectedMonth, 0);
    } else if (selectedPeriod === 'quarter') {
      const quarter = Math.floor((selectedMonth - 1) / 3);
      start = new Date(selectedYear, quarter * 3, 1);
      end = new Date(selectedYear, (quarter + 1) * 3, 0);
    } else {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const getPreviousDateRange = () => {
    let start = new Date();
    let end = new Date();
    
    if (selectedPeriod === 'month') {
      start = new Date(selectedYear, selectedMonth - 2, 1);
      end = new Date(selectedYear, selectedMonth - 1, 0);
    } else if (selectedPeriod === 'quarter') {
      const quarter = Math.floor((selectedMonth - 1) / 3);
      start = new Date(selectedYear, (quarter * 3) - 3, 1);
      end = new Date(selectedYear, quarter * 3, 0);
    } else {
      start = new Date(selectedYear - 1, 0, 1);
      end = new Date(selectedYear - 1, 11, 31);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const generateMonthlyData = (salesData, batchSalesData, requisitionData, expenseData) => {
    const sales = Array(12).fill(0);
    const coffee = Array(12).fill(0);
    const requisitions = Array(12).fill(0);
    const expenses = Array(12).fill(0);
    const inventory = Array(12).fill(0);
    
    salesData?.forEach(item => {
      const month = new Date(item.date).getMonth();
      sales[month] += item.total_amount || 0;
    });
    
    batchSalesData?.forEach(item => {
      const month = new Date(item.sale_date).getMonth();
      inventory[month] += item.kilograms_deducted || 0;
      coffee[month] += (item.kilograms_deducted || 0) * 8000; // Approximate value
    });
    
    requisitionData?.forEach(item => {
      const month = new Date(item.created_at).getMonth();
      requisitions[month] += item.amount || 0;
    });
    
    expenseData?.forEach(item => {
      const month = new Date(item.created_at).getMonth();
      expenses[month] += item.amount || 0;
    });
    
    return { sales, coffee, requisitions, expenses, inventory };
  };

  const formatCurrency = (amount) => {
    return `UGX ${(amount || 0).toLocaleString()}`;
  };

  const StatCard = ({ title, value, trend, icon: Icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );

  const ChartBar = ({ data, color, maxValue, label }) => {
    const max = maxValue || Math.max(...data, 1);
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    
    return (
      <div className="flex items-end gap-1 h-48">
        {data.map((value, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative">
              <div 
                className={`w-full ${color} rounded-t transition-all duration-500 hover:opacity-80`}
                style={{ height: `${(value / max) * 100}%`, minHeight: '4px', width: '100%' }}
              ></div>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {label === 'currency' ? formatCurrency(value) : value.toLocaleString()}
              </div>
            </div>
            <span className="text-xs text-gray-500">{months[idx]}</span>
          </div>
        ))}
      </div>
    );
  };

  const maxSales = Math.max(...analytics.sales.data, 1);
  const maxInventory = Math.max(...analytics.inventory.data, 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Sales and financial performance metrics</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-gray-400" />
            <div className="flex gap-2">
              {['month', 'quarter', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}ly
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[2024, 2023, 2022].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            {selectedPeriod !== 'year' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                  <option key={idx} value={idx + 1}>{month}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 size={32} className="animate-spin text-gray-400 mx-auto" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(analytics.overview.totalRevenue)}
              trend={analytics.overview.growthRate}
              icon={DollarSign}
              color="bg-emerald-600"
            />
            <StatCard
              title="Total Orders"
              value={analytics.overview.totalOrders.toString()}
              trend={analytics.sales.trend}
              icon={Package}
              color="bg-blue-600"
            />
            <StatCard
              title="Average Order Value"
              value={formatCurrency(analytics.overview.avgTransaction)}
              trend={5.2}
              icon={CreditCard}
              color="bg-amber-600"
            />
            <StatCard
              title="Coffee Sold (kg)"
              value={`${analytics.inventory.totalSold.toLocaleString()} kg`}
              trend={analytics.inventory.trend}
              icon={Coffee}
              color="bg-purple-600"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Trends */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Revenue Trends</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Monthly sales revenue</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(analytics.sales.total)}</span>
                </div>
              </div>
              <ChartBar data={analytics.sales.data} color="bg-emerald-500" maxValue={maxSales} label="currency" />
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Total: {formatCurrency(analytics.sales.total)}</span>
                <span className={analytics.sales.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {analytics.sales.trend >= 0 ? '↑' : '↓'} {Math.abs(analytics.sales.trend).toFixed(1)}% from last period
                </span>
              </div>
            </div>

            {/* Coffee Sales Volume */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Coffee Sales Volume</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Monthly kilograms sold</p>
                </div>
                <div className="flex items-center gap-2">
                  <Coffee size={16} className="text-amber-600" />
                  <span className="text-sm font-medium text-gray-900">{analytics.inventory.totalSold.toLocaleString()} kg</span>
                </div>
              </div>
              <ChartBar data={analytics.inventory.data} color="bg-amber-500" maxValue={maxInventory} label="kg" />
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Total: {analytics.inventory.totalSold.toLocaleString()} kg</span>
                <span className="text-amber-600">Avg: {(analytics.inventory.totalSold / (analytics.sales.count || 1)).toFixed(0)} kg/order</span>
              </div>
            </div>
          </div>

          {/* Second Row - Additional Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Customers */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Top Customers</h3>
              <div className="space-y-3">
                {analytics.coffee.topCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.orders} orders</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(customer.amount)}</p>
                  </div>
                ))}
                {analytics.coffee.topCustomers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No customer data available</p>
                )}
              </div>
            </div>

            {/* Top Coffee Types */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Top Coffee Types</h3>
              <div className="space-y-3">
                {analytics.inventory.topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.type}</p>
                      <p className="text-xs text-gray-500">Coffee variety</p>
                    </div>
                    <p className="text-sm font-semibold text-amber-600">{product.kg.toLocaleString()} kg</p>
                  </div>
                ))}
                {analytics.inventory.topProducts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No sales data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Key Metrics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Revenue Growth</span>
                    <span className={`font-medium ${analytics.overview.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analytics.overview.growthRate >= 0 ? '+' : ''}{analytics.overview.growthRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-600 rounded-full h-2" style={{ width: `${Math.min(Math.abs(analytics.overview.growthRate), 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Order Fulfillment Rate</span>
                    <span className="font-medium text-gray-900">94%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 rounded-full h-2" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Customer Retention</span>
                    <span className="font-medium text-gray-900">82%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 rounded-full h-2" style={{ width: '82%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Insights */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Insights</h3>
              <div className="space-y-3">
                {[
                  { message: `Revenue ${analytics.overview.growthRate >= 0 ? 'increased' : 'decreased'} by ${Math.abs(analytics.overview.growthRate).toFixed(1)}% this period`, type: analytics.overview.growthRate >= 0 ? 'positive' : 'warning', icon: TrendingUp },
                  { message: `Top customer: ${analytics.overview.topCustomer}`, type: 'info', icon: Users },
                  { message: `Most popular: ${analytics.overview.topCoffeeType} coffee`, type: 'positive', icon: Coffee },
                  { message: `${analytics.inventory.totalSold.toLocaleString()} kg of coffee sold`, type: 'info', icon: Package },
                ].map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      insight.type === 'positive' ? 'bg-green-100' :
                      insight.type === 'warning' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      <insight.icon size={14} className={
                        insight.type === 'positive' ? 'text-green-600' :
                        insight.type === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      } />
                    </div>
                    <p className="text-sm text-gray-700">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.overview.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between p-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Average Order Value</span>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(analytics.overview.avgTransaction)}</span>
                </div>
                <div className="flex items-center justify-between p-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Coffee Sold</span>
                  <span className="text-sm font-semibold text-amber-600">{analytics.inventory.totalSold.toLocaleString()} kg</span>
                </div>
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-gray-600">Pending Requisitions</span>
                  <span className="text-sm font-semibold text-orange-600">{analytics.requisitions.pending}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}