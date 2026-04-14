// app/(dashboard)/reports/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coffee,
  Users,
  CreditCard,
  Package,
  Printer,
  Mail,
  ChevronDown,
  PieChart,
  BarChart3,
  LineChart,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileSpreadsheet,
  FileJson,
  FilePieChart,
  Receipt,
  Landmark,
  Briefcase,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  X
} from 'lucide-react';

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('financial');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Report types configuration
  const reportTypes = [
    { id: 'financial', name: 'Financial Summary', icon: Landmark, color: 'blue' },
    { id: 'salaries', name: 'Salary Report', icon: DollarSign, color: 'green' },
    { id: 'coffee', name: 'Coffee Payments', icon: Coffee, color: 'orange' },
    { id: 'requisitions', name: 'Requisitions', icon: FileText, color: 'purple' },
    { id: 'attendance', name: 'Attendance', icon: Users, color: 'cyan' },
    { id: 'tax', name: 'Tax Summary', icon: Receipt, color: 'red' },
  ];

  const dateRanges = [
    { id: 'today', name: 'Today', days: 1 },
    { id: 'week', name: 'This Week', days: 7 },
    { id: 'month', name: 'This Month', days: 30 },
    { id: 'quarter', name: 'This Quarter', days: 90 },
    { id: 'year', name: 'This Year', days: 365 },
    { id: 'custom', name: 'Custom Range', days: null },
  ];

  useEffect(() => {
    const initDates = () => {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    };
    initDates();
    fetchReportData();
  }, []);

  useEffect(() => {
    if (dateRange !== 'custom') {
      updateDateRange();
    }
    fetchReportData();
  }, [reportType, dateRange, startDate, endDate]);

  const updateDateRange = () => {
    const range = dateRanges.find(r => r.id === dateRange);
    if (range && range.days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - range.days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch data based on report type
      let data = {};
      let summary = {};

      switch (reportType) {
        case 'financial':
          data = await fetchFinancialReport();
          summary = calculateFinancialSummary(data);
          break;
        case 'salaries':
          data = await fetchSalaryReport();
          summary = calculateSalarySummary(data);
          break;
        case 'coffee':
          data = await fetchCoffeeReport();
          summary = calculateCoffeeSummary(data);
          break;
        case 'requisitions':
          data = await fetchRequisitionsReport();
          summary = calculateRequisitionsSummary(data);
          break;
        case 'attendance':
          data = await fetchAttendanceReport();
          summary = calculateAttendanceSummary(data);
          break;
        case 'tax':
          data = await fetchTaxReport();
          summary = calculateTaxSummary(data);
          break;
      }

      setReportData(data);
      setSummaryStats(summary);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialReport = async () => {
    // Fetch salaries data
    const { data: salaries } = await supabase
      .from('employee_salary_payments')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Fetch coffee payments
    const { data: coffeePayments } = await supabase
      .from('finance_coffee_lots')
      .select('*')
      .gte('assessed_at', startDate)
      .lte('assessed_at', endDate);

    // Fetch requisitions
    const { data: requisitions } = await supabase
      .from('approval_requests')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    return {
      salaries: salaries || [],
      coffeePayments: coffeePayments || [],
      requisitions: requisitions || [],
    };
  };

  const fetchSalaryReport = async () => {
    const { data } = await supabase
      .from('employee_salary_payments')
      .select(`
        *,
        employees:employee_id (name, department, position)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    return data || [];
  };

  const fetchCoffeeReport = async () => {
    const { data } = await supabase
      .from('finance_coffee_lots')
      .select(`
        *,
        suppliers:supplier_id (name, contact_person, phone)
      `)
      .gte('assessed_at', startDate)
      .lte('assessed_at', endDate)
      .order('assessed_at', { ascending: false });
    
    return data || [];
  };

  const fetchRequisitionsReport = async () => {
    const { data } = await supabase
      .from('approval_requests')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    return data || [];
  };

  const fetchAttendanceReport = async () => {
    const { data } = await supabase
      .from('attendance')
      .select(`
        *,
        employees:employee_id (name, department)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    return data || [];
  };

  const fetchTaxReport = async () => {
    const { data: salaries } = await supabase
      .from('employee_salary_payments')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Calculate PAYE (tax) - assuming 30% tax rate for example
    const taxData = (salaries || []).map(salary => ({
      ...salary,
      paye: (salary.net_salary || 0) * 0.3,
      nssf: (salary.net_salary || 0) * 0.05,
    }));

    return taxData;
  };

  const calculateFinancialSummary = (data) => {
    const totalSalaries = data.salaries?.reduce((sum, s) => sum + (s.net_salary || 0), 0) || 0;
    const paidSalaries = data.salaries?.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.net_salary || 0), 0) || 0;
    const totalCoffee = data.coffeePayments?.reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0) || 0;
    const paidCoffee = data.coffeePayments?.filter(c => c.finance_status === 'PAID').reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0) || 0;
    const totalRequisitions = data.requisitions?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    
    return {
      totalExpenses: totalSalaries + totalCoffee + totalRequisitions,
      totalSalaries,
      paidSalaries,
      pendingSalaries: totalSalaries - paidSalaries,
      totalCoffee,
      paidCoffee,
      pendingCoffee: totalCoffee - paidCoffee,
      totalRequisitions,
      netCashflow: (paidCoffee + paidSalaries) - totalRequisitions,
    };
  };

  const calculateSalarySummary = (data) => {
    const total = data.reduce((sum, s) => sum + (s.net_salary || 0), 0);
    const paid = data.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.net_salary || 0), 0);
    const byDepartment = data.reduce((acc, s) => {
      const dept = s.employees?.department || 'Other';
      acc[dept] = (acc[dept] || 0) + (s.net_salary || 0);
      return acc;
    }, {});
    
    return { total, paid, pending: total - paid, byDepartment, count: data.length };
  };

  const calculateCoffeeSummary = (data) => {
    const totalValue = data.reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0);
    const paidValue = data.filter(c => c.finance_status === 'PAID').reduce((sum, c) => sum + (c.total_amount_ugx || 0), 0);
    const totalKg = data.reduce((sum, c) => sum + (c.quantity_kg || 0), 0);
    
    return { totalValue, paidValue, pendingValue: totalValue - paidValue, totalKg, count: data.length };
  };

  const calculateRequisitionsSummary = (data) => {
    const total = data.reduce((sum, r) => sum + (r.amount || 0), 0);
    const approved = data.filter(r => r.admin_approved).reduce((sum, r) => sum + (r.amount || 0), 0);
    const pending = data.filter(r => !r.admin_approved).reduce((sum, r) => sum + (r.amount || 0), 0);
    
    return { total, approved, pending, count: data.length, approvedCount: data.filter(r => r.admin_approved).length };
  };

  const calculateAttendanceSummary = (data) => {
    const present = data.filter(a => a.status === 'present').length;
    const absent = data.filter(a => a.status === 'absent').length;
    const late = data.filter(a => a.status === 'late').length;
    const total = data.length;
    
    return { present, absent, late, total, attendanceRate: total ? (present / total) * 100 : 0 };
  };

  const calculateTaxSummary = (data) => {
    const totalSalary = data.reduce((sum, s) => sum + (s.net_salary || 0), 0);
    const totalPaye = data.reduce((sum, s) => sum + (s.paye || 0), 0);
    const totalNssf = data.reduce((sum, s) => sum + (s.nssf || 0), 0);
    
    return { totalSalary, totalPaye, totalNssf, netSalary: totalSalary - totalPaye - totalNssf, count: data.length };
  };

  const handleExport = async (format) => {
    setGeneratingReport(true);
    try {
      // Simulate export generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, you would generate actual PDF/Excel/JSON files
      alert(`${format.toUpperCase()} report exported successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setGeneratingReport(false);
      setShowExportMenu(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'UGX 0';
    return `UGX ${Math.round(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Pending Finance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-500">Generating report...</p>
          </div>
        </div>
      );
    }

    switch (reportType) {
      case 'financial':
        return renderFinancialReport();
      case 'salaries':
        return renderSalaryReport();
      case 'coffee':
        return renderCoffeeReport();
      case 'requisitions':
        return renderRequisitionsReport();
      case 'attendance':
        return renderAttendanceReport();
      case 'tax':
        return renderTaxReport();
      default:
        return null;
    }
  };

  const renderFinancialReport = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Expenses</span>
            <DollarSign size={20} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats?.totalExpenses)}</p>
          <p className="text-xs text-gray-500 mt-1">Period: {formatDate(startDate)} - {formatDate(endDate)}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Salaries</span>
            <Users size={20} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats?.totalSalaries)}</p>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-600">Paid: {formatCurrency(summaryStats?.paidSalaries)}</span>
            <span className="text-orange-500">Pending: {formatCurrency(summaryStats?.pendingSalaries)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Coffee Payments</span>
            <Coffee size={20} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats?.totalCoffee)}</p>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-600">Paid: {formatCurrency(summaryStats?.paidCoffee)}</span>
            <span className="text-orange-500">Pending: {formatCurrency(summaryStats?.pendingCoffee)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Net Cashflow</span>
            <TrendingUp size={20} className={summaryStats?.netCashflow >= 0 ? 'text-green-500' : 'text-red-500'} />
          </div>
          <p className={`text-2xl font-bold ${summaryStats?.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summaryStats?.netCashflow)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Requisitions: {formatCurrency(summaryStats?.totalRequisitions)}</p>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Salary Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Employee</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Month</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reportData?.salaries?.slice(0, 5).map((salary) => (
                <tr key={salary.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{salary.employee_name}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-green-600">{formatCurrency(salary.net_salary)}</td>
                  <td className="px-6 py-3 text-center text-sm text-gray-600">{salary.payment_month}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getStatusColor(salary.status)}`}>
                      {salary.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSalaryReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">Total Payroll</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(summaryStats?.total)}</p>
          <p className="text-xs opacity-80 mt-2">{summaryStats?.count} payments</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">Paid Amount</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(summaryStats?.paid)}</p>
          <p className="text-xs opacity-80 mt-2">Completed payments</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">Pending Amount</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(summaryStats?.pending)}</p>
          <p className="text-xs opacity-80 mt-2">Awaiting processing</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">Departments</p>
          <p className="text-2xl font-bold mt-1">{Object.keys(summaryStats?.byDepartment || {}).length}</p>
          <p className="text-xs opacity-80 mt-2">Active departments</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Salary Details by Department</h3>
        </div>
        <div className="p-6">
          {Object.entries(summaryStats?.byDepartment || {}).map(([dept, amount]) => (
            <div key={dept} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{dept}</span>
                <span className="text-gray-600 dark:text-gray-400">{formatCurrency(amount)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 rounded-full h-2"
                  style={{ width: `${(amount / summaryStats?.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCoffeeReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats?.totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.totalKg?.toLocaleString()} kg</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Average Price/kg</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency((summaryStats?.totalValue || 0) / (summaryStats?.totalKg || 1))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Lots Processed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.count}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Coffee Lots Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Quantity (kg)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reportData?.map((coffee) => (
                <tr key={coffee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{coffee.suppliers?.name}</td>
                  <td className="px-6 py-3 text-right text-sm text-gray-600">{coffee.quantity_kg?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-green-600">{formatCurrency(coffee.total_amount_ugx)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getStatusColor(coffee.finance_status)}`}>
                      {coffee.finance_status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-gray-500">{formatDate(coffee.assessed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRequisitionsReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Total Requisitions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.count}</p>
          <p className="text-xs text-green-600 mt-1">{summaryStats?.approvedCount} approved</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats?.total)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Approved Amount</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats?.approved)}</p>
          <p className="text-xs text-orange-500 mt-1">Pending: {formatCurrency(summaryStats?.pending)}</p>
        </div>
      </div>
    </div>
  );

  const renderAttendanceReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
          <p className="text-sm text-green-600 dark:text-green-400">Present</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{summaryStats?.present}</p>
          <p className="text-xs text-green-500 mt-1">{summaryStats?.attendanceRate?.toFixed(1)}% rate</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5">
          <p className="text-sm text-red-600 dark:text-red-400">Absent</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{summaryStats?.absent}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-5">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">Late</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{summaryStats?.late}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
          <p className="text-sm text-blue-600 dark:text-blue-400">Total Records</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{summaryStats?.total}</p>
        </div>
      </div>
    </div>
  );

  const renderTaxReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Gross Salary</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats?.totalSalary)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">PAYE (30%)</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summaryStats?.totalPaye)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">NSSF (5%)</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(summaryStats?.totalNssf)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Net Salary</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats?.netSalary)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Generate and export financial reports</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <Filter size={18} />
            <span>Filters</span>
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileText size={16} /> Export as PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileSpreadsheet size={16} /> Export as Excel
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileJson size={16} /> Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Type</label>
              <div className="grid grid-cols-2 gap-2">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        reportType === type.id
                          ? `bg-${type.color}-50 text-${type.color}-600 border-2 border-${type.color}-500`
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {dateRanges.map((range) => (
                  <option key={range.id} value={range.id}>{range.name}</option>
                ))}
              </select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}