// app/(dashboard)/employees/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  Shield,
  Award,
  UserCheck,
  Building2,
  CreditCard,
  Smartphone,
  Heart,
  IdCard,
  Banknote,
  Cake,
  Users as UsersIcon,
  HeartHandshake,
  Globe,
  MapPinned,
  RefreshCw,
  Check,
  Circle,
  Venus,
  Mars,
  AlertCircle
} from 'lucide-react';

export default function EmployeesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    inactive: 0,
    newThisMonth: 0,
    totalSalary: 0
  });

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        setError('No user logged in');
        setLoading(false);
        return;
      }
      
      // Get current user's employee record
      const { data: currentEmployee, error: empError } = await supabase
        .from('employees')
        .select('role, permissions, auth_user_id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (empError && empError.code !== 'PGRST116') {
        console.error('Error fetching current employee:', empError);
      }
      
      setCurrentUser({
        id: user.id,
        email: user.email,
        role: currentEmployee?.role,
        permissions: currentEmployee?.permissions || []
      });
      
      // Fetch all employees
      await fetchEmployees();
      
    } catch (err) {
      console.error('Error in checkUserAndFetch:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch all employees
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Supabase error:', fetchError);
        
        // Check if it's a permission error
        if (fetchError.code === '42501') {
          setError('Permission denied. You need administrator or HR access to view all employees. Please contact your system administrator.');
        } else {
          setError(fetchError.message);
        }
        setLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`Fetched ${data.length} employees`);
        setEmployees(data);
        filterEmployees(data);
        calculateStats(data);
        extractDepartments(data);
      } else {
        setEmployees([]);
        setFilteredEmployees([]);
        setStats({
          total: 0,
          active: 0,
          onLeave: 0,
          inactive: 0,
          newThisMonth: 0,
          totalSalary: 0
        });
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const extractDepartments = (data) => {
    const uniqueDepts = [...new Set(data.map(e => e.department).filter(Boolean))];
    setDepartments(uniqueDepts);
  };

  const calculateStats = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const newThisMonth = data.filter(e => {
      const joinDate = new Date(e.join_date);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;
    
    setStats({
      total: data.length,
      active: data.filter(e => e.status === 'Active' && !e.disabled).length,
      onLeave: data.filter(e => e.status === 'On Leave' && !e.disabled).length,
      inactive: data.filter(e => e.status === 'Inactive' || e.disabled === true).length,
      newThisMonth: newThisMonth,
      totalSalary: data.reduce((sum, e) => sum + (parseFloat(e.salary) || 0), 0)
    });
  };

  const filterEmployees = (data) => {
    let filtered = [...data];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.employee_id?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term) ||
        emp.phone?.includes(term) ||
        emp.department?.toLowerCase().includes(term)
      );
    }
    
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === filterDepartment);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => {
        if (filterStatus === 'Active') return emp.status === 'Active' && !emp.disabled;
        if (filterStatus === 'Inactive') return emp.status === 'Inactive' || emp.disabled === true;
        return emp.status === filterStatus;
      });
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(emp => emp.role === filterRole);
    }
    
    setFilteredEmployees(filtered);
  };

  useEffect(() => {
    if (employees.length > 0) {
      filterEmployees(employees);
    }
  }, [searchTerm, filterDepartment, filterStatus, filterRole, employees]);

  const handleUpdateEmployee = async (formData) => {
    setProcessing(true);
    
    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        salary: parseFloat(formData.salary) || 0,
        role: formData.role,
        status: formData.status,
        address: formData.address,
        emergency_contact: formData.emergency_contact,
        bank_name: formData.bank_name,
        account_name: formData.account_name,
        account_number: formData.account_number,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender,
        marital_status: formData.marital_status,
        national_id_number: formData.national_id_number,
        tribe: formData.tribe,
        district: formData.district,
        next_of_kin_name: formData.next_of_kin_name,
        next_of_kin_phone: formData.next_of_kin_phone,
        next_of_kin_relationship: formData.next_of_kin_relationship,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', selectedEmployee.id);
      
      if (error) throw error;
      
      alert('Employee updated successfully!');
      setShowEditModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error updating employee: ' + error.message);
    }
    setProcessing(false);
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      alert('Employee deleted successfully!');
      fetchEmployees();
    } catch (error) {
      alert('Error deleting employee: ' + error.message);
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Department', 'Position', 'Salary (UGX)', 'Status', 'Role', 'Join Date', 'Gender', 'Marital Status', 'National ID', 'Tribe', 'District'];
    const csvData = filteredEmployees.map(emp => [
      emp.name || '',
      emp.email || '',
      emp.phone || '',
      emp.department || '',
      emp.position || '',
      emp.salary || 0,
      emp.status || '',
      emp.role || '',
      emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '',
      emp.gender || '',
      emp.marital_status || '',
      emp.national_id_number || '',
      emp.tribe || '',
      emp.district || ''
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status, disabled) => {
    if (disabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700">
          <XCircle size={12} /> Disabled
        </span>
      );
    }
    switch(status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700">
            <CheckCircle size={12} /> Active
          </span>
        );
      case 'On Leave':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700">
            <Clock size={12} /> On Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700">
            <XCircle size={12} /> {status || 'Inactive'}
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    const roleLower = role?.toLowerCase() || '';
    if (roleLower.includes('admin') || role === 'Administrator') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700">
          <Shield size={12} /> Admin
        </span>
      );
    }
    if (roleLower.includes('finance')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
          <Banknote size={12} /> Finance
        </span>
      );
    }
    if (roleLower.includes('manager')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700">
          <Award size={12} /> Manager
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700">
        <Users size={12} /> {role || 'User'}
      </span>
    );
  };

  const getGenderIcon = (gender) => {
    if (gender === 'Male') return <Mars size={14} className="text-blue-500" />;
    if (gender === 'Female') return <Venus size={14} className="text-pink-500" />;
    return null;
  };

  const formatCurrency = (amount) => {
    return `UGX ${parseFloat(amount)?.toLocaleString() || '0'}`;
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employees</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your workforce and employee information</p>
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Access Error</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={checkUserAndFetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your workforce and employee information</p>
          {currentUser && (
            <p className="text-xs text-gray-400 mt-1">
          Logged in as: {currentUser.email} {currentUser.role && `(${currentUser.role})`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={filteredEmployees.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats.total} icon={Users} color="bg-emerald-600" />
        <StatCard title="Active" value={stats.active} icon={UserCheck} color="bg-blue-600" />
        <StatCard title="On Leave" value={stats.onLeave} icon={Clock} color="bg-amber-600" />
        <StatCard title="Monthly Payroll" value={formatCurrency(stats.totalSalary)} icon={DollarSign} color="bg-purple-600" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Filters:</span>
          </div>
          
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Roles</option>
            <option value="Administrator">Administrator</option>
            <option value="Admin">Admin</option>
            <option value="Finance">Finance</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
          </select>

          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID, phone, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salary</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <Loader2 size={32} className="animate-spin text-emerald-600 mx-auto" />
                    <p className="text-gray-500 mt-2">Loading employees...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <Users size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No employees found</p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {employee.avatar_url ? (
                          <img 
                            src={employee.avatar_url} 
                            alt={employee.name}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-amber-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-sm">
                            {employee.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</p>
                            {getGenderIcon(employee.gender)}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{employee.email}</p>
                          {employee.employee_id && (
                            <p className="text-xs text-gray-400">ID: {employee.employee_id}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{employee.department || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{employee.position || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(employee.salary)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {getRoleBadge(employee.role)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {getStatusBadge(employee.status, employee.disabled)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowViewModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Showing {filteredEmployees.length} of {employees.length} employees
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDepartment('all');
                    setFilterStatus('all');
                    setFilterRole('all');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateEmployee}
          processing={processing}
          departments={departments}
        />
      )}

      {showViewModal && selectedEmployee && (
        <ViewEmployeeModal
          employee={selectedEmployee}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </div>
  );
}

// Edit Employee Modal
function EmployeeModal({ employee, onClose, onSubmit, processing, departments }) {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    department: employee?.department || '',
    salary: employee?.salary || '',
    role: employee?.role || 'User',
    status: employee?.status || 'Active',
    address: employee?.address || '',
    emergency_contact: employee?.emergency_contact || '',
    bank_name: employee?.bank_name || '',
    account_name: employee?.account_name || '',
    account_number: employee?.account_number || '',
    date_of_birth: employee?.date_of_birth || '',
    gender: employee?.gender || '',
    marital_status: employee?.marital_status || '',
    national_id_number: employee?.national_id_number || '',
    tribe: employee?.tribe || '',
    district: employee?.district || '',
    next_of_kin_name: employee?.next_of_kin_name || '',
    next_of_kin_phone: employee?.next_of_kin_phone || '',
    next_of_kin_relationship: employee?.next_of_kin_relationship || '',
  });

  const [activeTab, setActiveTab] = useState('basic');

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Users },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'personal', label: 'Personal', icon: IdCard },
    { id: 'bank', label: 'Bank Details', icon: Building2 },
    { id: 'emergency', label: 'Emergency', icon: HeartHandshake },
  ];

  const formatCurrency = (amount) => {
    return `UGX ${parseFloat(amount)?.toLocaleString() || '0'}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <Edit size={18} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              Edit Employee: {employee.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marital Status</label>
                <select
                  value={formData.marital_status}
                  onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary (UGX)</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
                {formData.salary && (
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(formData.salary)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="User">User</option>
                  <option value="Finance">Finance</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">National ID Number</label>
                <input
                  type="text"
                  value={formData.national_id_number}
                  onChange={(e) => setFormData({...formData, national_id_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tribe</label>
                <input
                  type="text"
                  value={formData.tribe}
                  onChange={(e) => setFormData({...formData, tribe: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">District</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Stanbic Bank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next of Kin Name</label>
                <input
                  type="text"
                  value={formData.next_of_kin_name}
                  onChange={(e) => setFormData({...formData, next_of_kin_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next of Kin Phone</label>
                <input
                  type="text"
                  value={formData.next_of_kin_phone}
                  onChange={(e) => setFormData({...formData, next_of_kin_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
                <input
                  type="text"
                  value={formData.next_of_kin_relationship}
                  onChange={(e) => setFormData({...formData, next_of_kin_relationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(formData)}
            disabled={processing || !formData.name}
            className="flex-1 bg-emerald-600 text-white py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {processing ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// View Employee Modal
function ViewEmployeeModal({ employee, onClose }) {
  const formatCurrency = (amount) => {
    return `UGX ${parseFloat(amount)?.toLocaleString() || '0'}`;
  };

  const InfoSection = ({ title, children }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-emerald-600 to-amber-500 rounded-t-2xl"></div>
          
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
              {employee.avatar_url ? (
                <img 
                  src={employee.avatar_url} 
                  alt={employee.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-amber-500 rounded-xl flex items-center justify-center text-white text-3xl font-bold">
                  {employee.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
          
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur rounded-lg text-white hover:bg-white/30 transition-colors">
            ✕
          </button>
        </div>

        <div className="pt-16 pb-6 px-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.name}</h2>
              <p className="text-gray-500 dark:text-gray-400">{employee.position || 'No position'} • {employee.department || 'No department'}</p>
              {employee.employee_id && (
                <p className="text-sm text-gray-400 mt-1">ID: {employee.employee_id}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                employee.disabled ? 'bg-red-100 text-red-700' :
                employee.status === 'Active' ? 'bg-green-100 text-green-700' :
                employee.status === 'On Leave' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  employee.disabled ? 'bg-red-500' :
                  employee.status === 'Active' ? 'bg-green-500' :
                  employee.status === 'On Leave' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium">{employee.disabled ? 'Disabled' : employee.status || 'Active'}</span>
              </div>
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{employee.role || 'User'}</span>
              </div>
            </div>
          </div>

          <InfoSection title="Basic Information">
            <InfoRow label="Email" value={employee.email} icon={Mail} />
            <InfoRow label="Phone" value={employee.phone} icon={Phone} />
            <InfoRow label="Date of Birth" value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : null} icon={Cake} />
            <InfoRow label="Gender" value={employee.gender} icon={Users} />
            <InfoRow label="Marital Status" value={employee.marital_status} icon={Circle} />
            <InfoRow label="Address" value={employee.address} icon={MapPin} />
          </InfoSection>

          <InfoSection title="Employment Details">
            <InfoRow label="Department" value={employee.department} icon={Building2} />
            <InfoRow label="Position" value={employee.position} icon={Briefcase} />
            <InfoRow label="Salary" value={formatCurrency(employee.salary)} icon={DollarSign} />
            <InfoRow label="Join Date" value={employee.join_date ? new Date(employee.join_date).toLocaleDateString() : 'Not set'} icon={Calendar} />
          </InfoSection>

          {(employee.national_id_number || employee.tribe || employee.district) && (
            <InfoSection title="Personal Details">
              <InfoRow label="National ID" value={employee.national_id_number} icon={IdCard} />
              <InfoRow label="Tribe" value={employee.tribe} icon={Globe} />
              <InfoRow label="District" value={employee.district} icon={MapPinned} />
            </InfoSection>
          )}

          {(employee.bank_name || employee.account_name || employee.account_number) && (
            <InfoSection title="Bank Details">
              <InfoRow label="Bank Name" value={employee.bank_name} icon={Building2} />
              <InfoRow label="Account Name" value={employee.account_name} icon={CreditCard} />
              <InfoRow label="Account Number" value={employee.account_number} icon={CreditCard} />
            </InfoSection>
          )}

          {(employee.emergency_contact || employee.next_of_kin_name) && (
            <InfoSection title="Emergency Contact">
              <InfoRow label="Emergency Phone" value={employee.emergency_contact} icon={Phone} />
              <InfoRow label="Next of Kin" value={employee.next_of_kin_name} icon={HeartHandshake} />
              <InfoRow label="Next of Kin Phone" value={employee.next_of_kin_phone} icon={Smartphone} />
              <InfoRow label="Relationship" value={employee.next_of_kin_relationship} icon={UsersIcon} />
            </InfoSection>
          )}

          <div className="flex gap-3 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}