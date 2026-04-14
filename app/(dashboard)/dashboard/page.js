// app/(dashboard)/dashboard/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  DollarSign,
  Coffee,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Wallet,
  Package,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  UserCheck,
  Briefcase,
  RefreshCw,
  Loader2,
  Award,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Eye,
  MessageSquare,
  Send,
  X,
  ChevronRight
} from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState(null);
  const [stats, setStats] = useState({
    employees: { total: 0, present: 0, absent: 0, onLeave: 0 },
    salaries: { total: 0, paid: 0, pending: 0, percentage: 0 },
    coffee: { totalLots: 0, pendingPayment: 0, totalAmount: 0, paidAmount: 0, percentage: 0 },
    requisitions: { total: 0, pendingFinance: 0, pendingAdmin: 0, approved: 0, totalAmount: 0 }
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [trends, setTrends] = useState({});
  const [error, setError] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalAction, setApprovalAction] = useState(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Authentication error');
      if (!user) throw new Error('No user found');
      
      setUserId(user.id);

      // Get user name and role
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('name, role, id')
        .eq('email', user.email)
        .single();
      
      if (!employeeError && employee) {
        setUserName(employee.name?.split(' ')[0] || 'User');
        setUserRole(employee.role || 'Employee');
      }

      // Fetch all data in parallel for better performance
      const [
        employeesResult,
        attendanceResult,
        salaryResult,
        coffeeResult,
        requisitionsResult,
        recentReqsResult,
        recentCoffeeResult,
        recentSalaryResult,
        userEmployeeResult
      ] = await Promise.allSettled([
        // Employees stats
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Active'),
        
        // Attendance today
        (async () => {
          const today = new Date().toISOString().split('T')[0];
          return await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .eq('status', 'present');
        })(),
        
        // Salary stats
        (async () => {
          const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          const { data } = await supabase
            .from('employee_salary_payments')
            .select('status, net_salary')
            .eq('payment_month', currentMonth);
          return { data };
        })(),
        
        // Coffee lots stats
        supabase
          .from('finance_coffee_lots')
          .select('finance_status, total_amount_ugx'),
        
        // Requisitions stats with more details
        supabase
          .from('approval_requests')
          .select(`
            *,
            employees:requested_by (name, email, role)
          `)
          .order('created_at', { ascending: false }),
        
        // Recent requisitions
        supabase
          .from('approval_requests')
          .select(`
            *,
            employees:requested_by (name, email, role)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Recent coffee lots
        supabase
          .from('finance_coffee_lots')
          .select('*, suppliers(name)')
          .order('assessed_at', { ascending: false })
          .limit(3),
        
        // Recent salary payments
        supabase
          .from('employee_salary_payments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        
        // User role for approvals
        supabase
          .from('employees')
          .select('role, id')
          .eq('email', user.email)
          .single()
      ]);

      // Process employees stats
      const totalEmployees = employeesResult.status === 'fulfilled' ? employeesResult.value.count || 0 : 0;
      const presentToday = attendanceResult.status === 'fulfilled' ? attendanceResult.value.count || 0 : 0;

      // Process salary stats
      let totalSalary = 0, paidSalary = 0;
      if (salaryResult.status === 'fulfilled' && salaryResult.value.data) {
        const salaryPayments = salaryResult.value.data;
        totalSalary = salaryPayments?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0;
        paidSalary = salaryPayments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0;
      }

      // Process coffee stats
      let totalLots = 0, pendingPaymentLots = 0, totalCoffeeAmount = 0, paidCoffeeAmount = 0;
      if (coffeeResult.status === 'fulfilled' && coffeeResult.value.data) {
        const coffeeLots = coffeeResult.value.data;
        totalLots = coffeeLots?.length || 0;
        pendingPaymentLots = coffeeLots?.filter(l => l.finance_status === 'READY_FOR_FINANCE').length || 0;
        totalCoffeeAmount = coffeeLots?.reduce((sum, l) => sum + (l.total_amount_ugx || 0), 0) || 0;
        paidCoffeeAmount = coffeeLots?.filter(l => l.finance_status === 'PAID').reduce((sum, l) => sum + (l.total_amount_ugx || 0), 0) || 0;
      }

      // Process requisitions stats
      let totalReqs = 0, pendingFinanceReqs = 0, pendingAdminReqs = 0, approvedReqs = 0, totalReqsAmount = 0;
      if (requisitionsResult.status === 'fulfilled' && requisitionsResult.value.data) {
        const requisitions = requisitionsResult.value.data;
        totalReqs = requisitions?.length || 0;
        pendingFinanceReqs = requisitions?.filter(r => r.finance_approved === false && r.status === 'Pending Finance').length || 0;
        pendingAdminReqs = requisitions?.filter(r => r.finance_approved === true && r.admin_approved === false).length || 0;
        approvedReqs = requisitions?.filter(r => r.admin_approved === true).length || 0;
        totalReqsAmount = requisitions?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      }

      // Process recent activities
      const activities = [];
      if (recentReqsResult.status === 'fulfilled' && recentReqsResult.value.data) {
        recentReqsResult.value.data.forEach(req => {
          activities.push({
            id: req.id,
            type: 'requisition',
            title: req.title,
            amount: req.amount,
            status: req.admin_approved ? 'approved' : (req.finance_approved ? 'pending_admin' : 'pending_finance'),
            time: req.created_at,
            user: req.employees?.name || req.requestedby_name,
            description: req.description
          });
        });
      }
      
      if (recentCoffeeResult.status === 'fulfilled' && recentCoffeeResult.value.data) {
        recentCoffeeResult.value.data.forEach(coffee => {
          activities.push({
            id: coffee.id,
            type: 'coffee',
            title: `${coffee.quantity_kg} kg Coffee Lot`,
            amount: coffee.total_amount_ugx,
            status: coffee.finance_status,
            time: coffee.assessed_at,
            supplier: coffee.suppliers?.name
          });
        });
      }
      
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      // Process pending approvals with full details
      let pendingReqs = [];
      if (userEmployeeResult.status === 'fulfilled' && userEmployeeResult.value.data && requisitionsResult.status === 'fulfilled' && requisitionsResult.value.data) {
        const userEmployee = userEmployeeResult.value.data;
        const requisitions = requisitionsResult.value.data;
        
        if (userEmployee?.role === 'finance') {
          pendingReqs = requisitions
            .filter(r => r.finance_approved === false && r.status === 'Pending Finance')
            .map(r => ({ ...r, approval_type: 'finance' }))
            .slice(0, 10);
        } else if (userEmployee?.role === 'admin') {
          pendingReqs = requisitions
            .filter(r => r.finance_approved === true && r.admin_approved === false)
            .map(r => ({ ...r, approval_type: 'admin' }))
            .slice(0, 10);
        }
      }

      // Calculate trends
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: prevSalary } = await supabase
        .from('employee_salary_payments')
        .select('net_salary')
        .eq('payment_month', lastMonthStr)
        .eq('status', 'completed');
      
      const prevSalaryTotal = prevSalary?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0;
      const salaryTrend = prevSalaryTotal > 0 ? ((paidSalary - prevSalaryTotal) / prevSalaryTotal) * 100 : 0;

      setStats({
        employees: {
          total: totalEmployees,
          present: presentToday,
          absent: totalEmployees - presentToday,
          onLeave: 0
        },
        salaries: {
          total: totalSalary,
          paid: paidSalary,
          pending: totalSalary - paidSalary,
          percentage: totalSalary > 0 ? (paidSalary / totalSalary) * 100 : 0
        },
        coffee: {
          totalLots: totalLots,
          pendingPayment: pendingPaymentLots,
          totalAmount: totalCoffeeAmount,
          paidAmount: paidCoffeeAmount,
          percentage: totalCoffeeAmount > 0 ? (paidCoffeeAmount / totalCoffeeAmount) * 100 : 0
        },
        requisitions: {
          total: totalReqs,
          pendingFinance: pendingFinanceReqs,
          pendingAdmin: pendingAdminReqs,
          approved: approvedReqs,
          totalAmount: totalReqsAmount
        }
      });

      setRecentActivities(activities.slice(0, 8));
      setPendingApprovals(pendingReqs);
      setRecentPayments(recentSalaryResult.status === 'fulfilled' ? recentSalaryResult.value.data || [] : []);
      setTrends({
        salary: salaryTrend,
        coffee: pendingPaymentLots > 0 ? -15 : 5,
        requisitions: pendingAdminReqs > 0 ? 20 : -5
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleApproveRequisition = async (requisition, action, comment = '') => {
    setProcessingAction(requisition.id);
    
    try {
      const updates = {};
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      if (requisition.approval_type === 'finance') {
        updates.finance_approved = action === 'approve';
        updates.finance_approved_by = userId;
        updates.finance_approved_at = new Date().toISOString();
        updates.status = action === 'approve' ? 'Pending Admin' : 'Rejected by Finance';
      } else if (requisition.approval_type === 'admin') {
        updates.admin_approved = action === 'approve';
        updates.admin_approved_by = userId;
        updates.admin_approved_at = new Date().toISOString();
        updates.status = action === 'approve' ? newStatus : 'Rejected by Admin';
      }
      
      if (comment) {
        updates.approval_notes = comment;
      }
      
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update(updates)
        .eq('id', requisition.id);
      
      if (updateError) throw updateError;
      
      // Refresh data
      await fetchDashboardData(true);
      
      // Close modal
      setShowApprovalModal(false);
      setSelectedRequisition(null);
      setApprovalComment('');
      setApprovalAction(null);
      
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Failed to process approval: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  const openApprovalModal = (requisition, action) => {
    setSelectedRequisition(requisition);
    setApprovalAction(action);
    setApprovalComment('');
    setShowApprovalModal(true);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'UGX 0';
    return `UGX ${Math.round(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Good {getGreeting()}, {userName}! 👋
          </h2>
          <p className="text-gray-500 mt-2">
            Here's what's happening with your business today
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={`${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Employees Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trends.salary >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trends.salary >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trends.salary).toFixed(1)}%
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{stats.employees.total}</h3>
          <p className="text-sm text-gray-500 mt-1">Total Employees</p>
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">{stats.employees.present} Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">{stats.employees.absent} Absent</span>
            </div>
          </div>
        </div>

        {/* Salaries Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-green-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trends.salary >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trends.salary >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trends.salary).toFixed(1)}%
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(stats.salaries.total)}</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly Budget</p>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Paid: {formatCurrency(stats.salaries.paid)}</span>
              <span className="text-orange-500">Pending: {formatCurrency(stats.salaries.pending)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 rounded-full h-2 transition-all duration-500"
                style={{ width: `${stats.salaries.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Coffee Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Coffee size={24} className="text-orange-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trends.coffee >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trends.coffee >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trends.coffee).toFixed(1)}%
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(stats.coffee.totalAmount)}</h3>
          <p className="text-sm text-gray-500 mt-1">Total Coffee Value</p>
          <div className="flex justify-between mt-4 text-sm">
            <span className="text-green-600">Paid: {formatCurrency(stats.coffee.paidAmount)}</span>
            <span className="text-orange-500">{stats.coffee.pendingPayment} lots pending</span>
          </div>
        </div>

        {/* Requisitions Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-purple-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trends.requisitions >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trends.requisitions >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trends.requisitions).toFixed(1)}%
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{stats.requisitions.total}</h3>
          <p className="text-sm text-gray-500 mt-1">Total Requisitions</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Finance: {stats.requisitions.pendingFinance}</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Admin: {stats.requisitions.pendingAdmin}</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approved: {stats.requisitions.approved}</span>
          </div>
        </div>
      </div>

      {/* Second Row - Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {recentActivities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activity.type === 'requisition' ? 'bg-purple-100' : 'bg-orange-100'
                  }`}>
                    {activity.type === 'requisition' ? (
                      <FileText size={18} className="text-purple-600" />
                    ) : (
                      <Coffee size={18} className="text-orange-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activity.amount && formatCurrency(activity.amount)} • 
                      {activity.user ? ` ${activity.user}` : activity.supplier ? ` ${activity.supplier}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                    activity.status === 'pending_finance' ? 'bg-yellow-100 text-yellow-700' :
                    activity.status === 'pending_admin' ? 'bg-orange-100 text-orange-700' :
                    activity.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {activity.status === 'pending_finance' ? 'Pending Finance' :
                     activity.status === 'pending_admin' ? 'Pending Admin' :
                     activity.status === 'approved' ? 'Approved' :
                     activity.status === 'PAID' ? 'Paid' : activity.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(activity.time)}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500 text-sm">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals with Action Buttons */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
            <AlertCircle size={18} className="text-orange-500" />
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval) => (
                <div key={approval.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{approval.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested by: {approval.employees?.name || approval.requestedby_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{approval.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(approval.amount)}</span>
                        <span className="text-xs text-gray-400">{formatDate(approval.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => openApprovalModal(approval, 'approve')}
                        disabled={processingAction === approval.id}
                        className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        title="Approve"
                      >
                        {processingAction === approval.id ? (
                          <Loader2 size={16} className="animate-spin text-green-600" />
                        ) : (
                          <ThumbsUp size={16} className="text-green-600" />
                        )}
                      </button>
                      <button
                        onClick={() => openApprovalModal(approval, 'reject')}
                        disabled={processingAction === approval.id}
                        className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <ThumbsDown size={16} className="text-red-600" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequisition(approval);
                          setShowApprovalModal(true);
                          setApprovalAction(null);
                        }}
                        className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
                <p className="text-gray-500 text-sm">No pending approvals</p>
                <p className="text-xs text-gray-400 mt-1">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Third Row - Recent Payments and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Salary Payments */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Salary Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">{payment.employee_name}</p>
                      <p className="text-xs text-gray-500">{payment.payment_month}</p>
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-green-600">
                      {formatCurrency(payment.net_salary)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500 text-sm">
                      No recent payments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats & Insights */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Quick Insights</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Target size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Completion Rate</p>
                  <p className="text-lg font-bold text-gray-900">{(stats.salaries.percentage).toFixed(1)}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Salary Progress</p>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(stats.salaries.paid)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending Actions</p>
                  <p className="text-lg font-bold text-gray-900">{stats.requisitions.pendingFinance + stats.requisitions.pendingAdmin + stats.coffee.pendingPayment}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Requires Attention</p>
                <p className="text-sm font-semibold text-orange-600">Action needed</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Award size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Processed</p>
                  <p className="text-lg font-bold text-gray-900">{stats.requisitions.approved}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Approved Requisitions</p>
                <p className="text-sm font-semibold text-purple-600">This month</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowApprovalModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Requisition Details</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Review and process this request</p>
                </div>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Requisition Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{selectedRequisition.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Requested by: {selectedRequisition.employees?.name || selectedRequisition.requestedby_name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedRequisition.approval_type === 'finance' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    Pending {selectedRequisition.approval_type === 'finance' ? 'Finance' : 'Admin'} Approval
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-700">{selectedRequisition.description || 'No description provided'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-500">Amount Requested</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(selectedRequisition.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Request Date</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedRequisition.created_at)}</p>
                    </div>
                  </div>
                  
                  {selectedRequisition.department && (
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="text-sm text-gray-900">{selectedRequisition.department}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalAction ? 'Approval Comment (Optional)' : 'Add a comment'}
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder={approvalAction === 'approve' ? "Add a note about your approval..." : "Please provide a reason for rejection..."}
                />
              </div>

              {/* Action Buttons */}
              {approvalAction && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setApprovalAction(null);
                      setApprovalComment('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApproveRequisition(selectedRequisition, approvalAction, approvalComment)}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      approvalAction === 'approve'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                    }`}
                  >
                    {processingAction === selectedRequisition.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      approvalAction === 'approve' ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />
                    )}
                    {approvalAction === 'approve' ? 'Approve Requisition' : 'Reject Requisition'}
                  </button>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}