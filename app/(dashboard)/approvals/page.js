// app/(dashboard)/approvals/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    DollarSign,
    User,
    Building2,
    Calendar,
    AlertCircle,
    Loader2,
    Filter,
    Search,
    ChevronDown,
    Send,
    MessageSquare,
    FileText,
    Coffee,
    Users,
    TrendingUp
} from 'lucide-react';

export default function ApprovalsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [userName, setUserName] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [requisitions, setRequisitions] = useState([]);
    const [coffeeLots, setCoffeeLots] = useState([]);
    const [salaryPayments, setSalaryPayments] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [stats, setStats] = useState({
        requisitions: 0,
        coffeeLots: 0,
        salaries: 0,
        total: 0
    });

    useEffect(() => {
        getUserRole();
        fetchAllApprovals();
    }, []);

    const getUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: employee } = await supabase
                .from('employees')
                .select('role, name')
                .eq('email', user.email)
                .single();

            if (employee) {
                setUserRole(employee.role);
                setUserName(employee.name);
            }
        }
    };

    const fetchAllApprovals = async () => {
        setLoading(true);

        // Fetch pending requisitions based on role
        let reqQuery = supabase
            .from('approval_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (userRole === 'finance') {
            reqQuery = reqQuery.eq('finance_approved', false).eq('status', 'Pending Finance');
        } else if (userRole === 'admin') {
            reqQuery = reqQuery.eq('finance_approved', true).eq('admin_approved', false);
        }

        const { data: requisitionData } = await reqQuery;

        // Fetch pending coffee payments
        const { data: coffeeData } = await supabase
            .from('finance_coffee_lots')
            .select('*, suppliers(name, code)')
            .eq('finance_status', 'READY_FOR_FINANCE')
            .order('assessed_at', { ascending: false });

        // Fetch pending salary payments
        const { data: salaryData } = await supabase
            .from('employee_salary_payments')
            .select('*')
            .eq('status', 'processing')
            .order('created_at', { ascending: false });

        setRequisitions(requisitionData || []);
        setCoffeeLots(coffeeData || []);
        setSalaryPayments(salaryData || []);

        setStats({
            requisitions: requisitionData?.length || 0,
            coffeeLots: coffeeData?.length || 0,
            salaries: salaryData?.length || 0,
            total: (requisitionData?.length || 0) + (coffeeData?.length || 0) + (salaryData?.length || 0)
        });

        setLoading(false);
    };

    const handleApprove = async (type, item, comments) => {
        setProcessing(true);
        const { data: { user } } = await supabase.auth.getUser();

        let error = null;

        if (type === 'requisition') {
            if (userRole === 'finance') {
                const { error: updateError } = await supabase
                    .from('approval_requests')
                    .update({
                        finance_approved: true,
                        finance_approved_by: user?.email,
                        finance_approved_at: new Date().toISOString(),
                        status: 'Pending Admin',
                        finance_reviewed: true,
                        finance_review_at: new Date().toISOString(),
                        finance_review_by: user?.email,
                        admin_comments: comments
                    })
                    .eq('id', item.id);
                error = updateError;
            } else if (userRole === 'admin') {
                let updateData = {
                    admin_approved: true,
                    admin_approved_by: user?.email,
                    admin_approved_at: new Date().toISOString(),
                    status: 'Approved',
                    admin_comments: comments
                };

                // Handle 3-approval workflow
                if (item.requires_three_approvals) {
                    if (!item.admin_approved_1) {
                        updateData = {
                            admin_approved_1: true,
                            admin_approved_1_by: user?.email,
                            admin_approved_1_at: new Date().toISOString(),
                            status: 'Pending Second Approval'
                        };
                    } else if (!item.admin_approved_2) {
                        updateData = {
                            admin_approved_2: true,
                            admin_approved_2_by: user?.email,
                            admin_approved_2_at: new Date().toISOString(),
                            status: 'Pending Final Approval'
                        };
                    } else {
                        updateData = {
                            admin_final_approval: true,
                            admin_final_approval_by: user?.email,
                            admin_final_approval_at: new Date().toISOString(),
                            admin_approved: true,
                            status: 'Approved'
                        };
                    }
                }

                const { error: updateError } = await supabase
                    .from('approval_requests')
                    .update(updateData)
                    .eq('id', item.id);
                error = updateError;
            }
        } else if (type === 'coffee') {
            const { error: updateError } = await supabase
                .from('finance_coffee_lots')
                .update({
                    finance_status: 'PAID',
                    finance_notes: `Approved by ${user?.email} on ${new Date().toISOString()}`
                })
                .eq('id', item.id);
            error = updateError;
        } else if (type === 'salary') {
            const { error: updateError } = await supabase
                .from('employee_salary_payments')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    completed_by: user?.email
                })
                .eq('id', item.id);
            error = updateError;
        }

        if (error) {
            alert('Error processing approval: ' + error.message);
        } else {
            alert('Approved successfully!');
            setShowApproveModal(false);
            fetchAllApprovals();
        }
        setProcessing(false);
    };

    const handleReject = async (type, item, reason) => {
        setProcessing(true);
        const { data: { user } } = await supabase.auth.getUser();

        let error = null;

        if (type === 'requisition') {
            const { error: updateError } = await supabase
                .from('approval_requests')
                .update({
                    status: 'Rejected',
                    rejection_reason: reason,
                    rejection_comments: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id);
            error = updateError;
        } else if (type === 'coffee') {
            const { error: updateError } = await supabase
                .from('finance_coffee_lots')
                .update({
                    finance_status: 'REJECTED',
                    finance_notes: `Rejected by ${user?.email}: ${reason}`
                })
                .eq('id', item.id);
            error = updateError;
        } else if (type === 'salary') {
            const { error: updateError } = await supabase
                .from('employee_salary_payments')
                .update({
                    status: 'failed',
                    notes: `Rejected: ${reason}`
                })
                .eq('id', item.id);
            error = updateError;
        }

        if (error) {
            alert('Error rejecting: ' + error.message);
        } else {
            alert('Rejected successfully!');
            setShowApproveModal(false);
            fetchAllApprovals();
        }
        setProcessing(false);
    };

    const getRequisitionStatus = (item) => {
        if (item.status === 'Rejected') return 'rejected';
        if (item.admin_approved) return 'approved';
        if (item.finance_approved) {
            if (item.requires_three_approvals) {
                if (item.admin_approved_1 && !item.admin_approved_2) return 'pending_second';
                if (item.admin_approved_2 && !item.admin_final_approval) return 'pending_final';
            }
            return 'pending_admin';
        }
        return 'pending_finance';
    };

    const getStatusBadge = (type, item) => {
        if (type === 'requisition') {
            const status = getRequisitionStatus(item);
            switch (status) {
                case 'pending_finance':
                    return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-xs"><Clock size={12} /> Pending Finance</span>;
                case 'pending_admin':
                    return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg text-xs"><Clock size={12} /> Pending Admin</span>;
                case 'pending_second':
                    return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs"><Users size={12} /> Pending 2nd Approval</span>;
                case 'pending_final':
                    return <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg text-xs"><Users size={12} /> Pending Final</span>;
                case 'approved':
                    return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs"><CheckCircle size={12} /> Approved</span>;
                case 'rejected':
                    return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs"><XCircle size={12} /> Rejected</span>;
                default:
                    return <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded-lg text-xs">{item.status}</span>;
            }
        } else if (type === 'coffee') {
            return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-xs"><Coffee size={12} /> Pending Payment</span>;
        } else {
            return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs"><Clock size={12} /> Pending Completion</span>;
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'requisition': return <FileText size={16} className="text-purple-500" />;
            case 'coffee': return <Coffee size={16} className="text-amber-500" />;
            case 'salary': return <DollarSign size={16} className="text-green-500" />;
            default: return <AlertCircle size={16} className="text-gray-500" />;
        }
    };

    const filteredItems = () => {
        let items = [];

        if (activeTab === 'pending' || activeTab === 'requisitions') {
            items = items.concat(requisitions.map(r => ({ ...r, approvalType: 'requisition' })));
        }
        if (activeTab === 'pending' || activeTab === 'coffee') {
            items = items.concat(coffeeLots.map(c => ({ ...c, approvalType: 'coffee' })));
        }
        if (activeTab === 'pending' || activeTab === 'salary') {
            items = items.concat(salaryPayments.map(s => ({ ...s, approvalType: 'salary' })));
        }

        if (filterType !== 'all') {
            items = items.filter(item => item.approvalType === filterType);
        }

        if (searchTerm) {
            items = items.filter(item => {
                if (item.approvalType === 'requisition') {
                    return item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.requestedby_name?.toLowerCase().includes(searchTerm.toLowerCase());
                } else if (item.approvalType === 'coffee') {
                    return item.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
                } else {
                    return item.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
                }
            });
        }

        return items;
    };

    const tabs = [
        { id: 'pending', label: 'All Pending', count: stats.total },
        { id: 'requisitions', label: 'Requisitions', count: stats.requisitions },
        { id: 'coffee', label: 'Coffee Payments', count: stats.coffeeLots },
        { id: 'salary', label: 'Salary Payments', count: stats.salaries },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900">Approvals</h2>
                <p className="text-gray-500 text-sm mt-1">Review and manage pending approvals</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl border border-purple-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-purple-600 uppercase font-medium">Total Pending</p>
                            <p className="text-2xl font-bold text-purple-700 mt-1">{stats.total}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center">
                            <Clock size={20} className="text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl border border-orange-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-orange-600 uppercase font-medium">Requisitions</p>
                            <p className="text-2xl font-bold text-orange-700 mt-1">{stats.requisitions}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-200 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-amber-600 uppercase font-medium">Coffee Payments</p>
                            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.coffeeLots}</p>
                        </div>
                        <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center">
                            <Coffee size={20} className="text-amber-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100/50 rounded-xl border border-green-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-green-600 uppercase font-medium">Salary Payments</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{stats.salaries}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-200 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} className="text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6">
                <div className="flex border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                    ? 'text-emerald-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">All Types</option>
                            <option value="requisition">Requisitions</option>
                            <option value="coffee">Coffee Payments</option>
                            <option value="salary">Salary Payments</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search approvals..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* Approvals List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <Loader2 size={32} className="animate-spin text-gray-400 mx-auto" />
                    </div>
                ) : filteredItems().length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
                        <p className="text-sm text-gray-500">No pending approvals to review</p>
                    </div>
                ) : (
                    filteredItems().map((item, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        {getTypeIcon(item.approvalType)}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <h3 className="font-semibold text-gray-900">
                                                {item.approvalType === 'requisition' ? item.title :
                                                    item.approvalType === 'coffee' ? `${item.quantity_kg} kg Coffee Lot` :
                                                        `Salary Payment - ${item.employee_name}`}
                                            </h3>
                                            {getStatusBadge(item.approvalType, item)}
                                        </div>

                                        <div className="space-y-1 mt-2">
                                            {item.approvalType === 'requisition' && (
                                                <>
                                                    <p className="text-sm text-gray-600">{item.description}</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><User size={12} /> {item.requestedby_name}</span>
                                                        <span className="flex items-center gap-1"><Building2 size={12} /> {item.department}</span>
                                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </>
                                            )}

                                            {item.approvalType === 'coffee' && (
                                                <>
                                                    <p className="text-sm text-gray-600">Supplier: {item.suppliers?.name} ({item.suppliers?.code})</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><TrendingUp size={12} /> {item.quantity_kg} kg @ UGX {item.unit_price_ugx?.toLocaleString()}</span>
                                                        <span className="flex items-center gap-1"><Calendar size={12} /> Assessed: {new Date(item.assessed_at).toLocaleDateString()}</span>
                                                    </div>
                                                </>
                                            )}

                                            {item.approvalType === 'salary' && (
                                                <>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><DollarSign size={12} /> Gross: UGX {item.gross_salary?.toLocaleString()}</span>
                                                        <span className="flex items-center gap-1"><TrendingUp size={12} /> Net: UGX {item.net_salary?.toLocaleString()}</span>
                                                        <span className="flex items-center gap-1"><Calendar size={12} /> Month: {item.payment_month}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedItem({ type: item.approvalType, data: item });
                                            setShowApproveModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                    >
                                        <CheckCircle size={14} /> Review
                                    </button>
                                </div>
                            </div>

                            {/* Amount Display */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex justify-end">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Amount</p>
                                        <p className="text-lg font-bold text-emerald-600">
                                            UGX {(item.approvalType === 'requisition' ? item.amount :
                                                item.approvalType === 'coffee' ? item.total_amount_ugx :
                                                    item.net_salary)?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Approval Modal */}
            {showApproveModal && selectedItem && (
                <ApproveModal
                    item={selectedItem}
                    userRole={userRole}
                    onClose={() => setShowApproveModal(false)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    processing={processing}
                />
            )}
        </div>
    );
}

// Approval Modal Component
function ApproveModal({ item, userRole, onClose, onApprove, onReject, processing }) {
    const [action, setAction] = useState('approve');
    const [comments, setComments] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    const getTitle = () => {
        if (item.type === 'requisition') {
            return userRole === 'finance' ? 'Finance Approval' : 'Admin Approval';
        } else if (item.type === 'coffee') {
            return 'Coffee Payment Approval';
        } else {
            return 'Salary Payment Approval';
        }
    };

    const getDetails = () => {
        if (item.type === 'requisition') {
            return {
                title: item.data.title,
                amount: item.data.amount,
                requester: item.data.requestedby_name,
                department: item.data.department
            };
        } else if (item.type === 'coffee') {
            return {
                title: `${item.data.quantity_kg} kg Coffee Lot`,
                amount: item.data.total_amount_ugx,
                requester: item.data.suppliers?.name,
                department: 'Coffee Processing'
            };
        } else {
            return {
                title: `Salary Payment`,
                amount: item.data.net_salary,
                requester: item.data.employee_name,
                department: 'HR'
            };
        }
    };

    const details = getDetails();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <CheckCircle size={18} className="text-emerald-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-lg">{getTitle()}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Item Details */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-medium text-gray-900">{details.title}</p>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Requested by: {details.requester}</span>
                            <span className="text-xs text-gray-500">Department: {details.department}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Amount:</span>
                                <span className="text-xl font-bold text-emerald-600">UGX {details.amount?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Selection */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setAction('approve')}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${action === 'approve'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <CheckCircle size={16} /> Approve
                        </button>
                        <button
                            onClick={() => setAction('reject')}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${action === 'reject'
                                    ? 'bg-red-600 text-white shadow-md'
                                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <XCircle size={16} /> Reject
                        </button>
                    </div>

                    {/* Comments/Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {action === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
                        </label>
                        <textarea
                            value={action === 'approve' ? comments : rejectReason}
                            onChange={(e) => action === 'approve' ? setComments(e.target.value) : setRejectReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder={action === 'approve' ? 'Add any comments...' : 'Please provide a reason for rejection...'}
                            required={action === 'reject'}
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (action === 'approve') {
                                onApprove(item.type, item.data, comments);
                            } else {
                                if (!rejectReason.trim()) {
                                    alert('Please provide a rejection reason');
                                    return;
                                }
                                onReject(item.type, item.data, rejectReason);
                            }
                        }}
                        disabled={processing}
                        className="flex-1 bg-emerald-600 text-white py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {processing ? 'Processing...' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}