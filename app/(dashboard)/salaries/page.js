// app/(dashboard)/salaries/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  DollarSign,
  User,
  Calendar,
  Banknote,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
  Printer,
  FileText,
  CreditCard,
  Smartphone,
  Building2,
  History,
  Zap,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Info,
  RefreshCw
} from 'lucide-react';

export default function SalariesPage() {
  const supabase = createClient();
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalProcessing: 0,
    totalFailed: 0,
    totalNetSalary: 0,
    totalDeductions: 0,
    pendingCount: 0
  });

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatMonth(month) {
    if (!month) return 'Not specified';
    const [year, monthNum] = month.split('-');
    const date = new Date(year, parseInt(monthNum) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  useEffect(() => {
    fetchEmployees();
    fetchPayments();
  }, [selectedMonth]);

  useEffect(() => {
    calculateStats();
  }, [payments, employees]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'Active')
      .eq('disabled', false)
      .order('name');

    if (!error && data) {
      setEmployees(data);
      const uniqueDepts = [...new Set(data.map(e => e.department).filter(Boolean))];
      setDepartments(uniqueDepts);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employee_salary_payments')
      .select('*')
      .eq('payment_month', selectedMonth)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  const calculateStats = () => {
    const completedPayments = payments.filter(p => p.status === 'completed');
    const processingPayments = payments.filter(p => p.status === 'processing');
    const failedPayments = payments.filter(p => p.status === 'failed');
    
    const paidEmployeeIds = completedPayments.map(p => p.employee_id);
    const pendingCount = employees.filter(emp => 
      !paidEmployeeIds.includes(emp.employee_id || emp.id)
    ).length;
    
    setStats({
      totalPaid: completedPayments.length,
      totalProcessing: processingPayments.length,
      totalFailed: failedPayments.length,
      totalNetSalary: completedPayments.reduce((sum, p) => sum + (p.net_salary || 0), 0),
      totalDeductions: completedPayments.reduce((sum, p) => sum + (p.advance_deduction + p.time_deduction), 0),
      pendingCount
    });
  };

  const handleProcessPayment = async (employee) => {
    setSelectedEmployee(employee);
    setShowPaymentModal(true);
  };

  const submitPayment = async (paymentData) => {
    setProcessing(true);

    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;

    const grossSalary = paymentData.salary_amount;
    const advanceDeduction = paymentData.advance_deduction || 0;
    const timeDeduction = paymentData.time_deduction || 0;
    const netSalary = grossSalary - advanceDeduction - timeDeduction;

    const { error } = await supabase
      .from('employee_salary_payments')
      .insert([{
        employee_id: paymentData.employee_id,
        employee_name: paymentData.employee_name,
        employee_email: paymentData.employee_email,
        employee_phone: paymentData.employee_phone || null,
        salary_amount: grossSalary,
        payment_month: selectedMonth,
        payment_method: paymentData.payment_method,
        status: 'completed',
        processed_by: currentUser?.email || currentUser?.id,
        processed_by_email: currentUser?.email,
        completed_at: new Date().toISOString(),
        completed_by: currentUser?.email,
        gross_salary: grossSalary,
        advance_deduction: advanceDeduction,
        time_deduction: timeDeduction,
        time_deduction_hours: paymentData.time_deduction_hours || 0,
        net_salary: netSalary,
        notes: paymentData.notes || null,
        payment_label: `Salary Payment - ${formatMonth(selectedMonth)}`
      }]);

    if (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment: ' + error.message);
    } else {
      alert('Payment processed successfully!');
      setShowPaymentModal(false);
      fetchPayments();
      fetchEmployees();
    }
    setProcessing(false);
  };

  const updatePaymentStatus = async (paymentId, status) => {
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = currentUser?.email;
    }
    
    const { error } = await supabase
      .from('employee_salary_payments')
      .update(updateData)
      .eq('id', paymentId);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      fetchPayments();
    }
  };

  const handleViewPayslip = (payment) => {
    setSelectedPayment(payment);
    setShowPayslipModal(true);
  };

  const handleExportPayments = () => {
    const headers = [
      'Employee Name', 'Employee Email', 'Employee Phone', 
      'Gross Salary (UGX)', 'Advance Deduction', 'Time Deduction', 
      'Net Salary (UGX)', 'Payment Method', 'Status', 
      'Payment Date', 'Processed By', 'Notes'
    ];
    
    const csvData = payments.map(p => [
      p.employee_name,
      p.employee_email,
      p.employee_phone || '',
      p.gross_salary || 0,
      p.advance_deduction || 0,
      p.time_deduction || 0,
      p.net_salary || 0,
      p.payment_method,
      p.status,
      p.completed_at ? new Date(p.completed_at).toLocaleDateString() : '',
      p.processed_by_email,
      p.notes || ''
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_payments_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
            <CheckCircle size={12} /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <Clock size={12} /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'Bank Transfer': return <Building2 size={14} className="text-blue-500" />;
      case 'Mobile Money': return <Smartphone size={14} className="text-green-500" />;
      case 'Cash': return <Banknote size={14} className="text-amber-500" />;
      default: return <CreditCard size={14} className="text-gray-500" />;
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    const notPaid = !payments.some(p => p.employee_id === (emp.employee_id || emp.id) && p.status === 'completed');
    return matchesSearch && matchesDepartment && notPaid;
  });

  const filteredPayments = payments.filter(payment => {
    if (filterStatus === 'all') return true;
    return payment.status === filterStatus;
  });

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Salary Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Process and manage employee salary payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPayments}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportPayments}
            disabled={payments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Paid" 
          value={stats.totalPaid} 
          icon={Wallet} 
          color="bg-emerald-600"
          subtitle={`${stats.pendingCount} pending`}
        />
        <StatCard 
          title="Total Payroll" 
          value={`UGX ${stats.totalNetSalary.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-purple-600"
        />
        <StatCard 
          title="Total Deductions" 
          value={`UGX ${stats.totalDeductions.toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-amber-600"
        />
        <StatCard 
          title="Active Employees" 
          value={employees.length} 
          icon={Users} 
          color="bg-blue-600"
        />
      </div>

      {/* Month Selector & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Calendar size={18} className="text-emerald-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatMonth(selectedMonth)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Payments Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap size={16} className="text-emerald-600" />
                  Pending Payments
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{filteredEmployees.length} employees pending</p>
              </div>
              <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                {formatMonth(selectedMonth)}
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-300 mb-3" />
                <p className="text-gray-500 text-sm">All employees have been paid for this period</p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-amber-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-sm">
                        {employee.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.position} • {employee.department}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{employee.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">UGX {employee.salary?.toLocaleString()}</p>
                      <button
                        onClick={() => handleProcessPayment(employee)}
                        className="mt-2 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                      >
                        <DollarSign size={12} />
                        Process Payment
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History size={16} className="text-blue-600" />
                  Payment History
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{payments.length} payments recorded</p>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 size={24} className="animate-spin text-emerald-600 mx-auto" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No payments found for this period</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
                        {payment.employee_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.employee_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            {getPaymentMethodIcon(payment.payment_method)}
                            {payment.payment_method}
                          </span>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">UGX {payment.net_salary?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Net Salary</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-400">Gross Salary</p>
                      <p className="text-sm font-medium text-gray-900">UGX {payment.gross_salary?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Deductions</p>
                      <p className="text-sm font-medium text-red-600">- UGX {(payment.advance_deduction + payment.time_deduction)?.toLocaleString()}</p>
                      {(payment.time_deduction_hours > 0) && (
                        <p className="text-xs text-gray-400">{payment.time_deduction_hours} hours</p>
                      )}
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => handleViewPayslip(payment)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 ml-auto"
                      >
                        <Eye size={12} />
                        View Payslip
                      </button>
                      {payment.status === 'processing' && (
                        <button
                          onClick={() => updatePaymentStatus(payment.id, 'completed')}
                          className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 ml-auto mt-1"
                        >
                          <Check size={12} />
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {payment.notes && (
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                      <Info size={10} />
                      {payment.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedEmployee && (
        <PaymentModal
          employee={selectedEmployee}
          month={selectedMonth}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={submitPayment}
          processing={processing}
          formatMonth={formatMonth}
        />
      )}

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayment && (
        <PayslipModal
          payment={selectedPayment}
          onClose={() => setShowPayslipModal(false)}
          formatMonth={formatMonth}
        />
      )}
    </div>
  );
}

// Payment Modal Component
function PaymentModal({ employee, month, onClose, onSubmit, processing, formatMonth }) {
  const [formData, setFormData] = useState({
    employee_id: employee.employee_id || employee.id,
    employee_name: employee.name,
    employee_email: employee.email,
    employee_phone: employee.phone || '',
    salary_amount: employee.salary || 0,
    payment_method: 'Bank Transfer',
    advance_deduction: 0,
    time_deduction: 0,
    time_deduction_hours: 0,
    notes: ''
  });

  const netSalary = formData.salary_amount - formData.advance_deduction - formData.time_deduction;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Process Salary Payment</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Employee Info */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-amber-500 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                {employee.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{employee.name}</p>
                <p className="text-xs text-gray-500">{employee.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{employee.position} • {employee.department}</p>
              </div>
            </div>
          </div>

          {/* Payment Period */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Payment Period</p>
            <p className="font-medium text-gray-900 dark:text-white">{formatMonth(month)}</p>
          </div>

          {/* Salary Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gross Salary (UGX)</label>
            <input
              type="number"
              value={formData.salary_amount}
              onChange={(e) => setFormData({ ...formData, salary_amount: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deductions</label>
            <div>
              <input
                type="number"
                placeholder="Advance Deduction (UGX)"
                value={formData.advance_deduction}
                onChange={(e) => setFormData({ ...formData, advance_deduction: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Time Deduction Hours"
                value={formData.time_deduction_hours}
                onChange={(e) => {
                  const hours = parseInt(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    time_deduction_hours: hours,
                    time_deduction: hours * 3000
                  });
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {formData.time_deduction_hours > 0 && (
                <p className="text-xs text-red-500 mt-1">Deduction: UGX {formData.time_deduction.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-4 text-center">
            <p className="text-sm text-emerald-100">Net Salary</p>
            <p className="text-3xl font-bold text-white">UGX {netSalary.toLocaleString()}</p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Cash</option>
              <option>Cheque</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(formData)}
            disabled={processing}
            className="flex-1 bg-emerald-600 text-white py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {processing ? 'Processing...' : 'Process Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Payslip Modal Component
function PayslipModal({ payment, onClose, formatMonth }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Salary Payslip</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Printer size={18} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        <div className="p-6" id="payslip-content">
          {/* Company Header */}
          <div className="text-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Great Pearl Coffee</h2>
            <p className="text-sm text-gray-500">Official Salary Payslip</p>
            <p className="text-xs text-gray-400 mt-1">Payment Period: {formatMonth(payment.payment_month)}</p>
            <p className="text-xs text-gray-400">Payment Reference: {payment.payment_label || `SL-${payment.id.slice(0,8)}`}</p>
          </div>

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="text-xs text-gray-500">Employee Name</p>
              <p className="font-semibold text-gray-900 dark:text-white">{payment.employee_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Employee ID</p>
              <p className="text-sm text-gray-900 dark:text-white">{payment.employee_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email Address</p>
              <p className="text-sm text-gray-900 dark:text-white">{payment.employee_email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone Number</p>
              <p className="text-sm text-gray-900 dark:text-white">{payment.employee_phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Date</p>
              <p className="text-sm text-gray-900 dark:text-white">{payment.completed_at ? new Date(payment.completed_at).toLocaleDateString() : 'Pending'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Transaction ID</p>
              <p className="text-sm text-gray-900 dark:text-white">{payment.transaction_id || 'N/A'}</p>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white">Salary Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600">Gross Salary</span>
                <span className="font-medium text-gray-900">UGX {payment.gross_salary?.toLocaleString()}</span>
              </div>
              {payment.advance_deduction > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 text-red-600">
                  <span>Advance Deduction</span>
                  <span>- UGX {payment.advance_deduction?.toLocaleString()}</span>
                </div>
              )}
              {payment.time_deduction > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 text-red-600">
                  <span>Time Deduction ({payment.time_deduction_hours} hours @ UGX 3,000/hour)</span>
                  <span>- UGX {payment.time_deduction?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 -mx-3 mt-2">
                <span className="font-bold text-gray-900">Net Salary</span>
                <span className="font-bold text-emerald-600 text-lg">UGX {payment.net_salary?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900">{payment.payment_method}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Status</p>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle size={14} /> {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="text-sm text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="font-medium mb-1">Notes:</p>
              <p>{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
            <p>This is a system-generated payslip. For any discrepancies, please contact the HR department within 7 days.</p>
            <p className="mt-1">Processed by: {payment.processed_by_email} on {payment.completed_at ? new Date(payment.completed_at).toLocaleString() : 'N/A'}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}