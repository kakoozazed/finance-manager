// app/(dashboard)/profile/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    DollarSign,
    Wallet,
    TrendingUp,
    TrendingDown,
    Award,
    Shield,
    Settings,
    Edit2,
    Save,
    X,
    Loader2,
    CreditCard,
    History,
    Clock,
    CheckCircle,
    AlertCircle,
    Building2,
    Smartphone,
    Banknote,
    FileText,
    Users,
    Star,
    BadgeCheck,
    Sparkles,
    Eye,
    EyeOff,
    Lock,
    Key,
    LogOut,
    ChevronRight,
    Copy,
    Check,
    Gift,
    PiggyBank,
    Landmark,
    HandCoins,
    CircleDollarSign,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    PieChart,
    TrendingUp as TrendingUpIcon,
    Target,
    Zap,
    Crown,
    Medal,
    Briefcase,
    Clock as ClockIcon,
    Calendar as CalendarIcon,
    PhoneCall,
    AtSign,
    Globe,
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
    Youtube,
    Github
} from 'lucide-react';

export default function ProfilePage() {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [userAccount, setUserAccount] = useState(null);
    const [userRoles, setUserRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showBalanceHistory, setShowBalanceHistory] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        avatar_url: ''
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [balanceHistory, setBalanceHistory] = useState([]);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            
            // Get current user
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError) throw userError;
            if (!currentUser) throw new Error('No user found');
            
            setUser(currentUser);
            
            // Set form data
            setFormData({
                full_name: currentUser.user_metadata?.full_name || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                address: currentUser.user_metadata?.address || '',
                avatar_url: currentUser.user_metadata?.avatar_url || ''
            });
            
            // Fetch user account
            const { data: accountData, error: accountError } = await supabase
                .from('user_accounts')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
            
            if (!accountError && accountData) {
                setUserAccount(accountData);
            } else {
                // Create account if doesn't exist
                const { data: newAccount, error: createError } = await supabase
                    .from('user_accounts')
                    .insert([{
                        user_id: currentUser.id,
                        current_balance: 0,
                        total_earned: 0,
                        total_withdrawn: 0,
                        salary_approved: 0
                    }])
                    .select()
                    .single();
                
                if (!createError && newAccount) {
                    setUserAccount(newAccount);
                }
            }
            
            // Fetch user roles
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', currentUser.id);
            
            if (!rolesError && rolesData) {
                setUserRoles(rolesData);
            }
            
            // Fetch balance history (from sales or transactions)
            await fetchBalanceHistory(currentUser.id);
            
        } catch (error) {
            console.error('Error fetching user data:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };
    
    const fetchBalanceHistory = async (userId) => {
        try {
            // Fetch sales made by this user
            const { data: sales, error: salesError } = await supabase
                .from('sales_inventory_tracking')
                .select('*')
                .eq('created_by', user?.email)
                .order('sale_date', { ascending: false })
                .limit(10);
            
            if (!salesError && sales) {
                const history = sales.map(sale => ({
                    id: sale.id,
                    type: 'sale',
                    amount: (sale.price_per_kg || 0) * (sale.quantity_kg || 0),
                    date: sale.sale_date,
                    description: `Sale of ${sale.quantity_kg}kg ${sale.coffee_type} to ${sale.customer_name}`,
                    reference: sale.sale_id
                }));
                setBalanceHistory(history);
            }
        } catch (error) {
            console.error('Error fetching balance history:', error);
        }
    };

    const handleUpdateProfile = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: formData.full_name,
                    address: formData.address,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url
                }
            });
            
            if (updateError) throw updateError;
            
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setEditing(false);
            
            // Refresh user data
            await fetchUserData();
            
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };
    
    const handleChangePassword = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        
        if (passwordData.new_password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        
        setSaving(true);
        setMessage({ type: '', text: '' });
        
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.new_password
            });
            
            if (error) throw error;
            
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            setShowSettings(false);
            
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };
    
    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
            setMessage({ type: 'error', text: error.message });
        }
    };
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: 'Copied to clipboard!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const getRoleBadge = (role) => {
        const roleConfig = {
            admin: { color: 'purple', icon: Shield, label: 'Administrator' },
            manager: { color: 'blue', icon: Briefcase, label: 'Manager' },
            staff: { color: 'green', icon: User, label: 'Staff' },
            cashier: { color: 'orange', icon: CreditCard, label: 'Cashier' }
        };
        
        const config = roleConfig[role.toLowerCase()] || { color: 'gray', icon: User, label: role };
        const Icon = config.icon;
        
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative inline-block">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
                        <User size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-500" />
                    </div>
                    <p className="mt-4 text-gray-500">Loading profile...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                                    <User size={24} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                        My Profile
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                        <Sparkles size={14} className="text-emerald-500" />
                                        Manage your account settings and view your financial summary
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                <Settings size={16} />
                                Settings
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-all"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Message Alert */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                        message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    } animate-in slide-in-from-top duration-300`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <p className="text-sm">{message.text}</p>
                        <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
                            <X size={16} />
                        </button>
                    </div>
                )}
                
                {/* Settings Panel */}
                {showSettings && (
                    <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-top duration-300">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Lock size={20} className="text-emerald-500" />
                                Security Settings
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwordData.new_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                            className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={saving || !passwordData.new_password}
                                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                                        Update Password
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSettings(false);
                                            setPasswordData({
                                                current_password: '',
                                                new_password: '',
                                                confirm_password: ''
                                            });
                                        }}
                                        className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Information Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                                        <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
                                    </div>
                                    {!editing ? (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                            Edit Profile
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditing(false)}
                                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                                            >
                                                <X size={16} />
                                            </button>
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={saving}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                            >
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-2xl flex items-center justify-center">
                                        <User size={32} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {formData.full_name || user?.email?.split('@')[0] || 'User'}
                                        </h3>
                                        <p className="text-sm text-gray-500">{user?.email}</p>
                                        <div className="flex gap-1 mt-1">
                                            {userRoles.map(role => (
                                                <div key={role.id}>{getRoleBadge(role.role)}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Mail size={18} className="text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">Email Address</p>
                                            {editing ? (
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    disabled
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-900">{user?.email}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Phone size={18} className="text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">Phone Number</p>
                                            {editing ? (
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="+256..."
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-900">{formData.phone || 'Not provided'}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">Address</p>
                                            {editing ? (
                                                <textarea
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                    rows={2}
                                                    className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Your address"
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-900">{formData.address || 'Not provided'}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Calendar size={18} className="text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">Member Since</p>
                                            <p className="text-sm text-gray-900">{formatDate(user?.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                                        <p className="text-sm text-gray-500 mt-1">Your recent sales and transactions</p>
                                    </div>
                                    <button
                                        onClick={() => setShowBalanceHistory(!showBalanceHistory)}
                                        className="text-sm text-emerald-600 hover:text-emerald-700"
                                    >
                                        {showBalanceHistory ? 'Show Less' : 'View All'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                                {balanceHistory.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-flex p-4 bg-gray-100 rounded-full mb-3">
                                            <History size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">No recent activity</p>
                                        <p className="text-xs text-gray-400 mt-1">Your sales transactions will appear here</p>
                                    </div>
                                ) : (
                                    balanceHistory.slice(0, showBalanceHistory ? undefined : 5).map((activity) => (
                                        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${
                                                        activity.type === 'sale' ? 'bg-emerald-100' : 'bg-blue-100'
                                                    }`}>
                                                        {activity.type === 'sale' ? (
                                                            <TrendingUp size={16} className="text-emerald-600" />
                                                        ) : (
                                                            <TrendingDown size={16} className="text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                            <Clock size={10} />
                                                            {formatDate(activity.date)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-semibold ${
                                                        activity.type === 'sale' ? 'text-emerald-600' : 'text-blue-600'
                                                    }`}>
                                                        {activity.type === 'sale' ? '+' : '-'} {formatUGX(activity.amount)}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-mono mt-1">{activity.reference}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Financial Summary Card */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <Wallet size={18} className="text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-emerald-100">Financial Summary</span>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(user?.id || '')}
                                        className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
                                        title="Copy User ID"
                                    >
                                        <Copy size={14} className="text-white" />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-emerald-100 mb-1">Current Balance</p>
                                        <p className="text-3xl font-bold text-white">{formatUGX(userAccount?.current_balance)}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp size={14} className="text-emerald-200" />
                                                <p className="text-xs text-emerald-100">Total Earned</p>
                                            </div>
                                            <p className="text-sm font-semibold text-white">{formatUGX(userAccount?.total_earned)}</p>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingDown size={14} className="text-emerald-200" />
                                                <p className="text-xs text-emerald-100">Total Withdrawn</p>
                                            </div>
                                            <p className="text-sm font-semibold text-white">{formatUGX(userAccount?.total_withdrawn)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-white/20 pt-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-emerald-100">Salary Approved</p>
                                            <p className="text-sm font-semibold text-white">{formatUGX(userAccount?.salary_approved)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Quick Stats */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart3 size={16} className="text-emerald-500" />
                                Quick Statistics
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total Sales</span>
                                    <span className="text-sm font-semibold text-gray-900">{balanceHistory.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Roles Assigned</span>
                                    <span className="text-sm font-semibold text-gray-900">{userRoles.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Account Status</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <BadgeCheck size={10} />
                                        Active
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* User ID Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Key size={16} className="text-emerald-500" />
                                User Information
                            </h3>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500">User ID</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                                            {user?.id}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(user?.id || '')}
                                            className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Last Sign In</p>
                                    <p className="text-sm text-gray-900">{formatDate(user?.last_sign_in_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}