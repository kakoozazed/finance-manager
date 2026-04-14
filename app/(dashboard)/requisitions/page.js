// app/(dashboard)/requisitions/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Send,
  Loader2,
  FileText,
  Upload,
  File,
  X,
  Download,
  Trash2,
  Calendar,
  Building2,
  Tag,
  CreditCard,
  UserCircle,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Printer,
  CheckSquare,
  Users,
  Stamp,
  Receipt,
  Image,
  AlertTriangle
} from 'lucide-react';

export default function RequisitionsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState('');
  const [userPosition, setUserPosition] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [stats, setStats] = useState({
    total: 0,
    document_uploaded: 0,
    payment_pending: 0,
    payment_processed: 0,
    completed: 0,
    rejected: 0,
    total_amount: 0,
    pending_amount: 0
  });

  useEffect(() => {
    getUserRole();
  }, []);

  useEffect(() => {
    if (userRole !== null) {
      fetchRequests();
    }
  }, [filterStatus, filterType, filterDepartment, userRole]);

  const getUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email);
      const { data: employee } = await supabase
        .from('employees')
        .select('role, department, id, name, position')
        .eq('email', user.email)
        .single();
      
      if (employee) {
        const fullRole = employee.role;
        setUserRole(fullRole);
        setUserName(employee.name || '');
        setUserPosition(employee.position || '');
      } else {
        if (user.email === 'admin@example.com') {
          setUserRole('admin');
          setUserName('Admin User');
          setUserPosition('Administrator');
        } else if (user.email === 'finance@example.com') {
          setUserRole('finance');
          setUserName('Finance User');
          setUserPosition('Finance Officer');
        } else {
          setUserRole('staff');
          setUserName(user.email?.split('@')[0] || 'Staff');
          setUserPosition('Staff');
        }
      }
    }
  };

  const isFinanceRole = (role) => {
    if (!role) return false;
    if (typeof role !== 'string') return false;
    const lowerRole = role.toLowerCase();
    return lowerRole === 'finance' || 
           lowerRole === 'finance assistant' || 
           lowerRole === 'finance officer' ||
           lowerRole === 'finance manager' ||
           lowerRole.includes('finance');
  };

  const fetchRequests = async () => {
    setLoading(true);
    
    let query = supabase
      .from('requisitions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isFinanceRole(userRole)) {
      query = query.eq('created_by_email', userEmail);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }

    if (filterDepartment !== 'all') {
      query = query.eq('department', filterDepartment);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRequests(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (requestsData) => {
    const total = requestsData.length;
    const document_uploaded = requestsData.filter(r => r.status === 'Document Uploaded').length;
    const payment_pending = requestsData.filter(r => r.status === 'Payment Pending').length;
    const payment_processed = requestsData.filter(r => r.status === 'Payment Processed').length;
    const completed = requestsData.filter(r => r.status === 'Completed').length;
    const rejected = requestsData.filter(r => r.status === 'Rejected').length;
    const total_amount = requestsData.reduce((sum, r) => sum + (r.amount || 0), 0);
    const pending_amount = requestsData.reduce((sum, r) => {
      if (r.status !== 'Rejected' && r.payment_processed !== true) {
        return sum + (r.amount || 0);
      }
      return sum;
    }, 0);

    setStats({
      total,
      document_uploaded,
      payment_pending,
      payment_processed,
      completed,
      rejected,
      total_amount,
      pending_amount
    });
  };

  const uploadDocument = async (file, folder = 'requisitions') => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('requisition-documents')
      .upload(filePath, file);
    
    if (uploadError) {
      throw new Error('Failed to upload document: ' + uploadError.message);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('requisition-documents')
      .getPublicUrl(filePath);
    
    return {
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath
    };
  };

  // Helper function to convert empty strings to null for date fields
  const parseDate = (dateValue) => {
    if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
      return null;
    }
    return dateValue;
  };

  const createRequisition = async (formData, stampedDocument, receipts) => {
    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a requisition');
      }
      
      // Upload the stamped document (required)
      if (!stampedDocument) {
        throw new Error('Please upload the stamped requisition document');
      }
      
      const stampedDocumentInfo = await uploadDocument(stampedDocument, 'requisitions');
      
      // Upload all receipts
      const receiptUrls = [];
      if (receipts && receipts.length > 0) {
        for (const receipt of receipts) {
          const receiptInfo = await uploadDocument(receipt, 'receipts');
          receiptUrls.push(receiptInfo);
        }
      }
      
      // Prepare the data for insertion with proper null handling for dates
      const requisitionData = {
        // Basic information
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        department: formData.department,
        priority: formData.priority || 'Medium',
        
        // Financial details
        amount: parseFloat(formData.amount),
        currency: 'UGX',
        
        // Payment already processed (money received)
        payment_processed: true,
        payment_processed_at: new Date().toISOString(),
        payment_processed_by: user.email,
        payment_processed_by_id: user.id,
        payment_reference_number: formData.payment_reference_number || null,
        payment_method: formData.payment_method || 'transfer',
        payment_notes: formData.payment_notes || null,
        
        // Disbursement details
        disbursement_method: formData.disbursement_method || 'cash',
        disbursement_phone: formData.disbursement_phone || null,
        disbursement_bank_name: formData.disbursement_bank_name || null,
        disbursement_account_number: formData.disbursement_account_number || null,
        disbursement_account_name: formData.disbursement_account_name || null,
        
        // Created by (finance user)
        created_by_email: user.email,
        created_by_name: userName || formData.created_by_name || user.email,
        created_by_position: userPosition || formData.created_by_position || 'Staff',
        created_by_department: formData.department,
        created_by_employee_id: user.id,
        
        // Original requester (from physical document)
        original_requester_name: formData.original_requester_name || null,
        original_requester_position: formData.original_requester_position || null,
        original_requester_department: formData.original_requester_department || null,
        original_requester_signature_date: parseDate(formData.original_requester_signature_date),
        
        // Approval stamps from physical document
        supervisor_approved: formData.supervisor_approved || false,
        supervisor_name: formData.supervisor_name || null,
        supervisor_position: formData.supervisor_position || null,
        supervisor_signature_date: parseDate(formData.supervisor_signature_date),
        
        admin_approved: formData.admin_approved || false,
        admin_name: formData.admin_name || null,
        admin_position: formData.admin_position || null,
        admin_signature_date: parseDate(formData.admin_signature_date),
        
        finance_approved: formData.finance_approved || false,
        finance_name: formData.finance_name || null,
        finance_position: formData.finance_position || null,
        finance_signature_date: parseDate(formData.finance_signature_date),
        
        // Stamp information
        stamp_received_date: parseDate(formData.stamp_received_date) || new Date().toISOString().split('T')[0],
        stamp_reference_number: formData.stamp_reference_number || null,
        stamp_issuing_authority: formData.stamp_issuing_authority || 'Company Stamp',
        
        // Stamped document
        stamped_document_url: stampedDocumentInfo.url,
        stamped_document_name: stampedDocumentInfo.name,
        stamped_document_size: stampedDocumentInfo.size,
        stamped_document_type: stampedDocumentInfo.type,
        stamped_document_uploaded_at: new Date().toISOString(),
        
        // Receipts
        receipts: receiptUrls,
        receipts_count: receiptUrls.length,
        
        // Financial coding
        budget_code: formData.budget_code || null,
        cost_center: formData.cost_center || null,
        project_code: formData.project_code || null,
        account_code: formData.account_code || null,
        
        // Status - since payment is already processed, go directly to Payment Processed
        status: 'Payment Processed',
        
        // Notes
        general_notes: formData.general_notes || null,
        
        // Metadata
        metadata: formData.metadata || {}
      };
      
      const { data, error } = await supabase
        .from('requisitions')
        .insert([requisitionData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to create requisition');
      }
      
      setShowRequestModal(false);
      await fetchRequests();
      
      alert('Requisition created successfully with payment processed and receipts attached!');
      
    } catch (error) {
      console.error('Creation error:', error);
      alert('Error creating requisition: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const updatePaymentStatus = async (requestId, paymentProcessed, paymentReference = null) => {
    setProcessing(true);
    
    const updateData = {
      payment_processed: paymentProcessed,
      payment_processed_at: paymentProcessed ? new Date().toISOString() : null,
      status: paymentProcessed ? 'Payment Processed' : 'Payment Pending'
    };
    
    if (paymentReference) {
      updateData.payment_reference_number = paymentReference;
    }
    
    const { error } = await supabase
      .from('requisitions')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      alert('Error updating payment status: ' + error.message);
    } else {
      await fetchRequests();
      alert(`Payment ${paymentProcessed ? 'processed' : 'marked as pending'} successfully!`);
    }
    setProcessing(false);
  };

  const markAsCompleted = async (requestId, journalEntryNumber = null) => {
    setProcessing(true);
    
    const updateData = {
      status: 'Completed',
      journal_entry_created: true,
      journal_entry_created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };
    
    if (journalEntryNumber) {
      updateData.journal_entry_number = journalEntryNumber;
    }
    
    const { error } = await supabase
      .from('requisitions')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      alert('Error marking as completed: ' + error.message);
    } else {
      await fetchRequests();
      alert('Requisition marked as completed!');
    }
    setProcessing(false);
  };

  const rejectRequisition = async (requestId, reason) => {
    setProcessing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('requisitions')
      .update({
        status: 'Rejected',
        rejected: true,
        rejected_by: user?.email,
        rejected_by_id: user?.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', requestId);

    if (error) {
      alert('Error rejecting requisition: ' + error.message);
    } else {
      await fetchRequests();
      alert('Requisition rejected!');
    }
    setProcessing(false);
  };

  const getStatusBadge = (request) => {
    const statusConfig = {
      'Draft': { color: 'gray', icon: FileText, text: 'Draft', bg: 'bg-gray-50', textColor: 'text-gray-700', border: 'border-gray-200' },
      'Document Uploaded': { color: 'blue', icon: Upload, text: 'Document Uploaded', bg: 'bg-blue-50', textColor: 'text-blue-700', border: 'border-blue-200' },
      'Payment Pending': { color: 'orange', icon: Clock, text: 'Payment Pending', bg: 'bg-orange-50', textColor: 'text-orange-700', border: 'border-orange-200' },
      'Payment Processed': { color: 'purple', icon: CreditCard, text: 'Payment Processed', bg: 'bg-purple-50', textColor: 'text-purple-700', border: 'border-purple-200' },
      'Completed': { color: 'green', icon: CheckCircle, text: 'Completed', bg: 'bg-green-50', textColor: 'text-green-700', border: 'border-green-200' },
      'Rejected': { color: 'red', icon: XCircle, text: 'Rejected', bg: 'bg-red-50', textColor: 'text-red-700', border: 'border-red-200' }
    };
    return statusConfig[request.status] || { color: 'gray', icon: Clock, text: request.status, bg: 'bg-gray-50', textColor: 'text-gray-700', border: 'border-gray-200' };
  };

  const canProcessPayment = (request) => {
    // Since money is already received when creating, this should rarely be needed
    return isFinanceRole(userRole) && 
           (request.status === 'Document Uploaded' || request.status === 'Payment Pending') &&
           !request.payment_processed;
  };

  const canMarkCompleted = (request) => {
    return isFinanceRole(userRole) && 
           request.payment_processed === true && 
           request.status !== 'Completed';
  };

  const getPriorityConfig = (priority) => {
    switch(priority) {
      case 'High': return { bg: 'bg-red-50', text: 'text-red-700', icon: TrendingUp, label: 'High Priority' };
      case 'Medium': return { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: MinusCircle, label: 'Medium Priority' };
      default: return { bg: 'bg-green-50', text: 'text-green-700', icon: TrendingDown, label: 'Low Priority' };
    }
  };

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true;
    return request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.original_requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.requisition_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                  <Stamp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">
                    Stamped Requisitions
                  </h1>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-500" />
                    Manage physical requisition forms with official stamps and receipts
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* View Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* New Requisition Button */}
              {isFinanceRole(userRole) && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Stamped Requisition
                </button>
              )}
            </div>
          </div>

          {/* User Role Banner */}
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Logged in as: <span className="font-bold">{isFinanceRole(userRole) ? 'Finance' : userRole}</span>
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {isFinanceRole(userRole) 
                    ? 'You can add stamped requisitions with receipts, process payments, and mark as completed'
                    : 'You can only view requisitions'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requisitions</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-sm font-medium text-emerald-600">UGX {stats.total_amount.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total requested amount</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Processed</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.payment_processed}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Payments already processed</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.document_uploaded}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Awaiting payment verification</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Completed</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.completed}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs text-emerald-100">Fully processed & closed</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="Document Uploaded">Document Uploaded</option>
                <option value="Payment Pending">Payment Pending</option>
                <option value="Payment Processed">Payment Processed</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">All Types</option>
                <option value="Expense">Expense</option>
                <option value="Purchase">Purchase</option>
                <option value="Travel">Travel</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">All Departments</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="IT">IT</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, reference, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'table' ? (
          <TableView 
            filteredRequests={filteredRequests} 
            loading={loading} 
            getStatusBadge={getStatusBadge} 
            getPriorityConfig={getPriorityConfig} 
            setSelectedRequest={setSelectedRequest} 
            setShowDetailsModal={setShowDetailsModal} 
            canProcessPayment={canProcessPayment}
            canMarkCompleted={canMarkCompleted}
            isFinanceRole={isFinanceRole}
            userRole={userRole}
            updatePaymentStatus={updatePaymentStatus}
            markAsCompleted={markAsCompleted}
            rejectRequisition={rejectRequisition}
          />
        ) : (
          <CardView 
            filteredRequests={filteredRequests} 
            loading={loading} 
            getStatusBadge={getStatusBadge} 
            getPriorityConfig={getPriorityConfig} 
            setSelectedRequest={setSelectedRequest} 
            setShowDetailsModal={setShowDetailsModal} 
            canProcessPayment={canProcessPayment}
            canMarkCompleted={canMarkCompleted}
            isFinanceRole={isFinanceRole}
            userRole={userRole}
            updatePaymentStatus={updatePaymentStatus}
            markAsCompleted={markAsCompleted}
            rejectRequisition={rejectRequisition}
          />
        )}
      </div>

      {/* Modals */}
      {showRequestModal && (
        <RequisitionModal
          onClose={() => setShowRequestModal(false)}
          onSubmit={createRequisition}
          processing={processing}
          userName={userName}
          userPosition={userPosition}
        />
      )}

      {showDetailsModal && selectedRequest && (
        <DetailsModal
          request={selectedRequest}
          onClose={() => setShowDetailsModal(false)}
          userRole={userRole}
          isFinanceRole={isFinanceRole}
          canProcessPayment={canProcessPayment(selectedRequest)}
          canMarkCompleted={canMarkCompleted(selectedRequest)}
          onProcessPayment={() => {
            const ref = prompt('Enter payment reference number:', selectedRequest.payment_reference_number || '');
            if (ref) {
              updatePaymentStatus(selectedRequest.id, true, ref);
            }
            setShowDetailsModal(false);
          }}
          onMarkCompleted={() => {
            const journalRef = prompt('Enter journal entry number:');
            if (journalRef) {
              markAsCompleted(selectedRequest.id, journalRef);
            }
            setShowDetailsModal(false);
          }}
          onReject={() => {
            const reason = prompt('Please enter rejection reason:');
            if (reason && reason.trim()) {
              rejectRequisition(selectedRequest.id, reason);
              setShowDetailsModal(false);
            }
          }}
        />
      )}
    </div>
  );
}

// Table View Component
function TableView({ filteredRequests, loading, getStatusBadge, getPriorityConfig, setSelectedRequest, setShowDetailsModal, canProcessPayment, canMarkCompleted, isFinanceRole, userRole, updatePaymentStatus, markAsCompleted, rejectRequisition }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ref #</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title & Details</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Original Requester</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  <p className="text-sm text-slate-500 mt-3">Loading requisitions...</p>
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No requisitions found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or add a new stamped requisition</p>
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => {
                const status = getStatusBadge(request);
                const StatusIcon = status.icon;
                const priorityConfig = getPriorityConfig(request.priority);
                const PriorityIcon = priorityConfig.icon;
                
                return (
                  <tr key={request.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {request.requisition_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{request.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <Tag className="w-3 h-3" />
                            {request.type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <Building2 className="w-3 h-3" />
                            {request.department}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs ${priorityConfig.text} ${priorityConfig.bg} px-2 py-0.5 rounded`}>
                            <PriorityIcon className="w-3 h-3" />
                            {priorityConfig.label}
                          </span>
                          {request.receipts_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                              <Receipt className="w-3 h-3" />
                              {request.receipts_count} receipt(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{request.original_requester_name || request.created_by_name}</p>
                        <p className="text-xs text-slate-500">{request.original_requester_position}</p>
                        {request.stamp_received_date && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Stamp: {new Date(request.stamp_received_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-emerald-600">UGX {request.amount?.toLocaleString()}</p>
                      {request.payment_reference_number && (
                        <p className="text-xs text-slate-400 mt-1">Ref: {request.payment_reference_number}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${status.bg} ${status.textColor} ${status.border} border`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {canMarkCompleted(request) && (
                          <button
                            onClick={() => {
                              const journalRef = prompt('Enter journal entry number:');
                              if (journalRef) {
                                markAsCompleted(request.id, journalRef);
                              }
                            }}
                            className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-all"
                            title="Mark as Completed"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {isFinanceRole(userRole) && request.status !== 'Rejected' && request.status !== 'Completed' && (
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                rejectRequisition(request.id, reason);
                              }
                            }}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
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
    </div>
  );
}

// Card View Component
function CardView({ filteredRequests, loading, getStatusBadge, getPriorityConfig, setSelectedRequest, setShowDetailsModal, canProcessPayment, canMarkCompleted, isFinanceRole, userRole, updatePaymentStatus, markAsCompleted, rejectRequisition }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
        <p className="text-sm text-slate-500 mt-3">Loading requisitions...</p>
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No requisitions found</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or add a new stamped requisition</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredRequests.map((request) => {
        const status = getStatusBadge(request);
        const StatusIcon = status.icon;
        const priorityConfig = getPriorityConfig(request.priority);
        const PriorityIcon = priorityConfig.icon;
        
        return (
          <div key={request.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {request.requisition_number}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.textColor}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.text}
                </span>
              </div>
              
              <h3 className="text-base font-semibold text-slate-800 mb-2 line-clamp-2">{request.title}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-emerald-600">UGX {request.amount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    <Tag className="w-3 h-3" />
                    {request.type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    <Building2 className="w-3 h-3" />
                    {request.department}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs ${priorityConfig.text} ${priorityConfig.bg} px-2 py-1 rounded`}>
                    <PriorityIcon className="w-3 h-3" />
                    {priorityConfig.label.split(' ')[0]}
                  </span>
                </div>
                {request.receipts_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-purple-600">
                    <Receipt className="w-3 h-3" />
                    <span>{request.receipts_count} receipt(s) attached</span>
                  </div>
                )}
              </div>
              
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {(request.original_requester_name || request.created_by_name)?.charAt(0) || 'R'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{request.original_requester_name || request.created_by_name}</p>
                    <p className="text-xs text-slate-500">{request.original_requester_position || request.created_by_position}</p>
                  </div>
                </div>
                {request.stamp_received_date && (
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Stamp className="w-3 h-3" />
                    Stamp Date: {new Date(request.stamp_received_date).toLocaleDateString()}
                  </p>
                )}
                {request.payment_reference_number && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Payment Ref: {request.payment_reference_number}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetailsModal(true);
                  }}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  View Details
                </button>
                
                {canMarkCompleted(request) && (
                  <button
                    onClick={() => {
                      const journalRef = prompt('Enter journal entry number:');
                      if (journalRef) {
                        markAsCompleted(request.id, journalRef);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-all"
                  >
                    Mark Completed
                  </button>
                )}
                
                {isFinanceRole(userRole) && request.status !== 'Rejected' && request.status !== 'Completed' && (
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        rejectRequisition(request.id, reason);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-all"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Requisition Modal Component with Receipt Upload
function RequisitionModal({ onClose, onSubmit, processing, userName, userPosition }) {
  const [formData, setFormData] = useState({
    // Basic info
    department: '',
    type: 'Expense',
    title: '',
    description: '',
    amount: '',
    priority: 'Medium',
    
    // Payment info (money already received)
    payment_reference_number: '',
    payment_method: 'transfer',
    payment_notes: '',
    
    // Disbursement details
    disbursement_method: 'cash',
    disbursement_phone: '',
    disbursement_bank_name: '',
    disbursement_account_number: '',
    disbursement_account_name: '',
    
    // Original requester
    original_requester_name: '',
    original_requester_position: '',
    original_requester_department: '',
    original_requester_signature_date: '',
    
    // Approvals from stamp
    supervisor_approved: false,
    supervisor_name: '',
    supervisor_position: '',
    supervisor_signature_date: '',
    
    admin_approved: false,
    admin_name: '',
    admin_position: '',
    admin_signature_date: '',
    
    finance_approved: false,
    finance_name: '',
    finance_position: '',
    finance_signature_date: '',
    
    // Stamp info
    stamp_received_date: new Date().toISOString().split('T')[0],
    stamp_reference_number: '',
    stamp_issuing_authority: 'Company Stamp',
    
    // Financial coding
    budget_code: '',
    cost_center: '',
    project_code: '',
    account_code: '',
    
    // Notes
    general_notes: '',
    
    // Metadata
    created_by_name: userName,
    created_by_position: userPosition
  });
  
  const [stampedDocument, setStampedDocument] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [documentError, setDocumentError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setDocumentError('File size must be less than 10MB');
        return;
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setDocumentError('Only PDF, JPEG, PNG, and DOC files are allowed');
        return;
      }
      
      setDocumentError('');
      setStampedDocument(file);
    }
  };

  const handleReceiptUpload = (e) => {
    const files = Array.from(e.target.files);
    const newReceipts = [];
    const errors = [];
    
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name} is too large (max 10MB)`);
      } else if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        errors.push(`${file.name} has invalid format (use PDF, JPEG, or PNG)`);
      } else {
        newReceipts.push(file);
      }
    });
    
    if (errors.length > 0) {
      alert(errors.join('\n'));
    }
    
    if (newReceipts.length > 0) {
      setReceipts([...receipts, ...newReceipts]);
    }
  };

  const removeReceipt = (index) => {
    const newReceipts = [...receipts];
    newReceipts.splice(index, 1);
    setReceipts(newReceipts);
  };

  const removeDocument = () => {
    setStampedDocument(null);
    setDocumentError('');
  };

  const handleSubmit = () => {
    if (!stampedDocument) {
      alert('Please upload the stamped requisition document');
      return;
    }
    
    if (!formData.payment_reference_number) {
      alert('Please enter the payment reference number (money already received)');
      return;
    }
    
    onSubmit(formData, stampedDocument, receipts);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <Stamp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Add Stamped Requisition</h3>
              <p className="text-xs text-slate-500 mt-0.5">Upload stamped form, payment proof, and receipts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Steps */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  currentStep >= step ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step}
                </div>
                {step < 5 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${
                    currentStep > step ? 'bg-emerald-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-emerald-200 rounded-xl p-6 bg-emerald-50/30">
                <label className="block text-sm font-medium text-slate-700 mb-3">Stamped Requisition Document *</label>
                {!stampedDocument ? (
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                    <p className="text-sm text-slate-600 mb-2">Upload the physically stamped requisition form</p>
                    <p className="text-xs text-slate-500 mb-3">The document should show supervisor/admin/finance stamps and signatures</p>
                    <div className="flex justify-center">
                      <label className="cursor-pointer bg-emerald-600 px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                        Choose File
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">PDF, JPEG, PNG, DOC up to 10MB</p>
                    {documentError && <p className="text-xs text-red-500 mt-1">{documentError}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{stampedDocument.name}</p>
                        <p className="text-xs text-slate-500">{(stampedDocument.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={removeDocument}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Request Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Travel">Travel</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Brief title of the requisition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Detailed description of the requisition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount (UGX) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <h4 className="text-sm font-semibold text-green-800">Payment Information (Money Already Received)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Reference Number *</label>
                    <input
                      type="text"
                      value={formData.payment_reference_number}
                      onChange={(e) => setFormData({...formData, payment_reference_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Bank ref, transaction ID, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Notes</label>
                  <textarea
                    value={formData.payment_notes}
                    onChange={(e) => setFormData({...formData, payment_notes: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Additional payment details..."
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Upload Receipts/Proof of Payment</h4>
                </div>
                
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  <div className="text-center">
                    <Upload className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                    <p className="text-xs text-slate-600 mb-2">Upload receipts, invoices, or proof of payment</p>
                    <div className="flex justify-center">
                      <label className="cursor-pointer bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                        Upload Receipts
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          onChange={handleReceiptUpload}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">PDF, JPEG, PNG up to 10MB each</p>
                  </div>
                </div>

                {receipts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-700">Uploaded Receipts ({receipts.length})</p>
                    {receipts.map((receipt, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-700">{receipt.name}</span>
                          <span className="text-xs text-slate-400">({(receipt.size / 1024).toFixed(2)} KB)</span>
                        </div>
                        <button
                          onClick={() => removeReceipt(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Disbursement Method</label>
                  <select
                    value={formData.disbursement_method}
                    onChange={(e) => setFormData({...formData, disbursement_method: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile">Mobile Money</option>
                  </select>
                </div>
                {formData.disbursement_method === 'mobile' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.disbursement_phone}
                      onChange={(e) => setFormData({...formData, disbursement_phone: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0712 345678"
                    />
                  </div>
                )}
              </div>

              {formData.disbursement_method === 'bank' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={formData.disbursement_bank_name}
                      onChange={(e) => setFormData({...formData, disbursement_bank_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={formData.disbursement_account_number}
                      onChange={(e) => setFormData({...formData, disbursement_account_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Account number"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Name</label>
                    <input
                      type="text"
                      value={formData.disbursement_account_name}
                      onChange={(e) => setFormData({...formData, disbursement_account_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Account holder name"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Original Requester (from physical document)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Requester Name</label>
                  <input
                    type="text"
                    value={formData.original_requester_name}
                    onChange={(e) => setFormData({...formData, original_requester_name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Name of person who requested"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                  <input
                    type="text"
                    value={formData.original_requester_position}
                    onChange={(e) => setFormData({...formData, original_requester_position: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Position/Title"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={formData.original_requester_department}
                    onChange={(e) => setFormData({...formData, original_requester_department: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Department"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Signature Date</label>
                  <input
                    type="date"
                    value={formData.original_requester_signature_date}
                    onChange={(e) => setFormData({...formData, original_requester_signature_date: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Approval Stamps (from physical document)
              </h4>
              
              {/* Supervisor Approval */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.supervisor_approved}
                    onChange={(e) => setFormData({...formData, supervisor_approved: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label className="font-medium text-slate-800">Supervisor Approved</label>
                </div>
                {formData.supervisor_approved && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <input
                      type="text"
                      placeholder="Supervisor Name"
                      value={formData.supervisor_name}
                      onChange={(e) => setFormData({...formData, supervisor_name: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={formData.supervisor_position}
                      onChange={(e) => setFormData({...formData, supervisor_position: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      placeholder="Date"
                      value={formData.supervisor_signature_date}
                      onChange={(e) => setFormData({...formData, supervisor_signature_date: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Admin Approval */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.admin_approved}
                    onChange={(e) => setFormData({...formData, admin_approved: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label className="font-medium text-slate-800">Admin Approved</label>
                </div>
                {formData.admin_approved && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <input
                      type="text"
                      placeholder="Admin Name"
                      value={formData.admin_name}
                      onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={formData.admin_position}
                      onChange={(e) => setFormData({...formData, admin_position: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      placeholder="Date"
                      value={formData.admin_signature_date}
                      onChange={(e) => setFormData({...formData, admin_signature_date: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Finance Approval */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.finance_approved}
                    onChange={(e) => setFormData({...formData, finance_approved: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label className="font-medium text-slate-800">Finance Approved</label>
                </div>
                {formData.finance_approved && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <input
                      type="text"
                      placeholder="Finance Name"
                      value={formData.finance_name}
                      onChange={(e) => setFormData({...formData, finance_name: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={formData.finance_position}
                      onChange={(e) => setFormData({...formData, finance_position: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      placeholder="Date"
                      value={formData.finance_signature_date}
                      onChange={(e) => setFormData({...formData, finance_signature_date: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Stamp Information */}
              <div className="border border-slate-200 rounded-xl p-4 mt-4">
                <h4 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-600" />
                  Official Stamp Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Stamp Received Date</label>
                    <input
                      type="date"
                      value={formData.stamp_received_date}
                      onChange={(e) => setFormData({...formData, stamp_received_date: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Stamp Reference Number</label>
                    <input
                      type="text"
                      value={formData.stamp_reference_number}
                      onChange={(e) => setFormData({...formData, stamp_reference_number: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Reference number on stamp"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3">Review Requisition Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-emerald-100">
                    <span className="text-emerald-700">Title:</span>
                    <span className="font-medium text-emerald-900">{formData.title || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-100">
                    <span className="text-emerald-700">Amount:</span>
                    <span className="font-bold text-emerald-900">UGX {parseInt(formData.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-100">
                    <span className="text-emerald-700">Payment Reference:</span>
                    <span className="font-medium text-emerald-900">{formData.payment_reference_number || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-100">
                    <span className="text-emerald-700">Original Requester:</span>
                    <span className="font-medium text-emerald-900">{formData.original_requester_name || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-100">
                    <span className="text-emerald-700">Receipts:</span>
                    <span className="font-medium text-emerald-900">{receipts.length} receipt(s) attached</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-100">
                    <span className="text-emerald-700">Approvals:</span>
                    <span className="font-medium text-emerald-900">
                      {[
                        formData.supervisor_approved && 'Supervisor',
                        formData.admin_approved && 'Admin',
                        formData.finance_approved && 'Finance'
                      ].filter(Boolean).join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-emerald-700">Stamped Document:</span>
                    <span className="font-medium text-emerald-900">{stampedDocument ? stampedDocument.name : 'Not uploaded'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-all"
            >
              Back
            </button>
          )}
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {processing ? 'Creating...' : 'Submit Stamped Requisition'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Details Modal Component
function DetailsModal({ request, onClose, userRole, isFinanceRole, canProcessPayment, canMarkCompleted, onProcessPayment, onMarkCompleted, onReject }) {
  const downloadDocument = async (url, name) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Requisition Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Reference: {request.requisition_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Action Buttons */}
          {(canProcessPayment || canMarkCompleted || isFinanceRole(userRole)) && (
            <div className="flex gap-3 p-4 bg-slate-50 rounded-xl">
              {canProcessPayment && (
                <button
                  onClick={onProcessPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Process Payment
                </button>
              )}
              {canMarkCompleted && (
                <button
                  onClick={onMarkCompleted}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Completed
                </button>
              )}
              {isFinanceRole(userRole) && request.status !== 'Rejected' && request.status !== 'Completed' && (
                <button
                  onClick={onReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              )}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Requisition Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Title</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{request.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Description</p>
                    <p className="text-sm text-slate-700 mt-0.5">{request.description || 'No description provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Type</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{request.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Department</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{request.department}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Priority</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{request.priority || 'Medium'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-600" />
                  Original Requester (from physical document)
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{request.original_requester_name || request.created_by_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Position</p>
                    <p className="text-sm text-slate-700 mt-0.5">{request.original_requester_position || request.created_by_position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Department</p>
                    <p className="text-sm text-slate-700 mt-0.5">{request.original_requester_department}</p>
                  </div>
                  {request.original_requester_signature_date && (
                    <div>
                      <p className="text-xs text-slate-500">Signature Date</p>
                      <p className="text-sm text-slate-700 mt-0.5">{new Date(request.original_requester_signature_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Approval Stamps (from physical document)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-slate-600">Supervisor:</span>
                    <span className={`text-sm font-medium ${request.supervisor_approved ? 'text-green-600' : 'text-red-500'}`}>
                      {request.supervisor_approved ? `✓ ${request.supervisor_name || 'Approved'}` : '✗ Not Approved'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-slate-600">Admin:</span>
                    <span className={`text-sm font-medium ${request.admin_approved ? 'text-green-600' : 'text-red-500'}`}>
                      {request.admin_approved ? `✓ ${request.admin_name || 'Approved'}` : '✗ Not Approved'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-slate-600">Finance:</span>
                    <span className={`text-sm font-medium ${request.finance_approved ? 'text-green-600' : 'text-red-500'}`}>
                      {request.finance_approved ? `✓ ${request.finance_name || 'Approved'}` : '✗ Not Approved'}
                    </span>
                  </div>
                </div>
                {(request.stamp_received_date || request.stamp_reference_number) && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500">Stamp Information</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      {request.stamp_received_date && <span>📅 {new Date(request.stamp_received_date).toLocaleDateString()}</span>}
                      {request.stamp_reference_number && <span>🔖 {request.stamp_reference_number}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Details
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                    <span className="text-sm text-emerald-700">Requested Amount</span>
                    <span className="text-xl font-bold text-emerald-800">UGX {request.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">Payment Status</span>
                    <span className="text-sm font-medium text-green-600">✓ Payment Processed</span>
                  </div>
                  {request.payment_reference_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-emerald-700">Payment Reference</span>
                      <span className="text-sm font-mono text-emerald-800">{request.payment_reference_number}</span>
                    </div>
                  )}
                  {request.payment_processed_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-emerald-700">Payment Date</span>
                      <span className="text-sm text-emerald-800">{new Date(request.payment_processed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {request.journal_entry_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-emerald-700">Journal Entry</span>
                      <span className="text-sm font-mono text-emerald-800">{request.journal_entry_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {request.receipts && request.receipts.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Receipts & Proof of Payment ({request.receipts.length})
                  </h4>
                  <div className="space-y-2">
                    {request.receipts.map((receipt, index) => (
                      <button
                        key={index}
                        onClick={() => downloadDocument(receipt.url, receipt.name)}
                        className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-emerald-600" />
                          <div className="text-left">
                            <span className="text-sm text-slate-700">{receipt.name}</span>
                            <p className="text-xs text-slate-400">{(receipt.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {request.stamped_document_url && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-600" />
                    Stamped Document
                  </h4>
                  <button
                    onClick={() => downloadDocument(request.stamped_document_url, request.stamped_document_name)}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-slate-700">{request.stamped_document_name || 'Download Document'}</span>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}