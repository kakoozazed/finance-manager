// app/components/Layout.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  DollarSign,
  Coffee,
  FileText,
  ScrollText,
  Settings,
  Users,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  TrendingUp,
  Wallet,
  ClipboardList,
  Menu,
  Search,
  HelpCircle,
  Moon,
  Sun,
  CreditCard,
  Package,
  ShoppingCart,
  Home,
  Star,
  Plus,
  Loader2,
  X
} from 'lucide-react';

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New salary approval pending', time: '5 min ago', read: false },
    { id: 2, message: 'Coffee payment processed', time: '1 hour ago', read: false },
    { id: 3, message: 'Monthly report ready', time: '2 hours ago', read: true },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const { data: employee } = await supabase
          .from('employees')
          .select('name, role')
          .eq('email', session.user.email)
          .single();
        setUserName(employee?.name || session.user.email.split('@')[0]);
        setUserRole(employee?.role || 'Employee');
      }
    };
    getUser();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Ctrl+K shortcut
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const getUnreadCount = () => notifications.filter(n => !n.read).length;

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/salaries', icon: DollarSign, label: 'Salaries' },
    { href: '/finance/suppliers', icon: Users, label: 'Suppliers' },
    { href: '/coffee-payments', icon: Coffee, label: 'Coffee Payments' },
    { href: '/supplier-payments', icon: Coffee, label: 'Supplier Payments' },
    { href: '/sales', icon: ShoppingCart, label: 'Sales' },
    { href: '/requisitions', icon: ClipboardList, label: 'Requisitions' },
    { href: '/cash-movements', icon: Wallet, label: 'Cash Movements' },
    { href: '/reports', icon: FileText, label: 'Reports' },
    { href: '/employees', icon: Users, label: 'Employees' },
    { href: '/settings', icon: Settings, label: 'Settings' },
    { href: '/help', icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center'} border-b border-gray-200 dark:border-gray-700`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">F</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">FinanceERP</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft size={18} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-600">
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center ${sidebarOpen ? 'px-4' : 'justify-center'} py-2.5 mx-2 rounded-lg transition-all
                  ${isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-semibold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-700 mt-1 flex items-center gap-1"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Search size={20} className="text-gray-500" />
            </button>

            {/* Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Bell size={20} />
                {getUnreadCount() > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-3 border-b border-gray-100 dark:border-gray-700 ${!notif.read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                        <p className="text-sm">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                  {userName?.[0]?.toUpperCase() || 'U'}
                </div>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                    <User size={14} /> Profile
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal onClose={() => setShowSearchModal(false)} />
      )}
    </div>
  );
}

// Search Modal Component
function SearchModal({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const router = useRouter();

  const searchItems = [
    { title: 'Dashboard', path: '/dashboard' },
    { title: 'Coffee Payments', path: '/coffee-payments' },
    { title: 'Suppliers', path: '/finance/suppliers' },
    { title: 'Inventory', path: '/inventory' },
    { title: 'Sales', path: '/sales' },
    { title: 'Salaries', path: '/salaries' },
    { title: 'Reports', path: '/reports' },
    { title: 'Employees', path: '/employees' },
    { title: 'Settings', path: '/settings' },
    { title: 'Help', path: '/help' },
  ];

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = searchItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const handleSelect = (path) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none dark:text-white"
              autoFocus
            />
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(result.path)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="text-sm font-medium">{result.title}</p>
              </button>
            ))
          ) : searchQuery ? (
            <p className="text-sm text-gray-500 text-center py-4">No results found</p>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Type to search...</p>
          )}
        </div>
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400">Press ESC to close</p>
        </div>
      </div>
    </div>
  );
}