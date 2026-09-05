'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import {
  useGetOrdersQuery,
  useGetAdminStatsQuery,
  useGetAdminCustomersQuery,
  useLoginMutation,
} from '../../redux/services/api.js';
import { formatPrice, formatDate } from '../../utils/helpers.js';
import { showToast } from '../../redux/slices/cartSlice.js';
import { setCredentials, logout } from '../../redux/slices/authSlice.js';
import Link from 'next/link';

export default function SalesAgentDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'clients' | 'orders' | 'vouchers' | 'commissions' | 'settings'
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  // Unauthenticated Login Form State
  const [agentLoginForm, setAgentLoginForm] = useState({
    email: '',
    password: '',
  });
  const [agentAuthError, setAgentAuthError] = useState('');

  const { data: statsData } = useGetAdminStatsQuery(undefined, {
    skip: !mounted || !isAuthenticated || (user?.role !== 'SALES_AGENT' && user?.role !== 'ADMIN'),
  });

  const { data: ordersData } = useGetOrdersQuery(undefined, {
    skip: !mounted || !isAuthenticated || (user?.role !== 'SALES_AGENT' && user?.role !== 'ADMIN'),
  });

  const { data: customersData } = useGetAdminCustomersQuery(undefined, {
    skip: !mounted || !isAuthenticated || (user?.role !== 'SALES_AGENT' && user?.role !== 'ADMIN'),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAgentFormLogin = async (e, directEmail, directPassword) => {
    if (e) e.preventDefault();
    setAgentAuthError('');

    const targetEmail = directEmail || agentLoginForm.email;
    const targetPassword = directPassword || agentLoginForm.password;

    try {
      const res = await loginMutation({
        email: targetEmail,
        password: targetPassword,
      }).unwrap();

      const loggedInUser = res.data.user;
      if (loggedInUser.role !== 'SALES_AGENT' && loggedInUser.role !== 'ADMIN') {
        setAgentAuthError('Access Denied: This account does not have Sales Agent permissions.');
        return;
      }

      dispatch(setCredentials({ user: loggedInUser, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Sales Agent Portal Unlocked: Welcome ' + loggedInUser.name }));
    } catch (err) {
      setAgentAuthError(err?.data?.message || 'Invalid agent email or password');
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Agent login failed' }));
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(showToast({ type: 'info', message: 'Signed out of Sales Agent Console' }));
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  // Strict Role Guard: Display Dedicated Sales Agent Login Screen if unauthenticated
  if (!isAuthenticated || (user?.role !== 'SALES_AGENT' && user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-inter">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <span className="material-symbols-outlined text-[32px]">support_agent</span>
            </div>
            <span className="font-label-caps text-[10px] uppercase tracking-widest text-amber-400 font-bold">
              Restricted Staff Portal
            </span>
            <h2 className="font-['Montserrat'] text-2xl font-bold text-white uppercase tracking-tight mt-1">
              Sales Agent Login
            </h2>
            <p className="font-['Inter'] text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Sign in to manage assigned clients, track attributed sales GMV, and generate client vouchers.
            </p>
          </div>

          {/* Error message */}
          {agentAuthError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
              <span className="leading-snug">{agentAuthError}</span>
            </div>
          )}

          {/* Sales Agent Sign-In Form */}
          <form onSubmit={(e) => handleAgentFormLogin(e)} className="space-y-4">
            <div>
              <label className="block font-label-caps text-[10px] uppercase text-slate-300 font-bold mb-1">
                Sales Agent Work Email
              </label>
              <input
                type="email"
                required
                value={agentLoginForm.email}
                onChange={(e) => setAgentLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="agent@gmail.com"
                className="w-full bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block font-label-caps text-[10px] uppercase text-slate-300 font-bold mb-1">
                Security Passcode
              </label>
              <input
                type="password"
                required
                value={agentLoginForm.password}
                onChange={(e) => setAgentLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              <span>{isLoggingIn ? 'Verifying Credentials...' : 'Authenticate & Enter Agent Console'}</span>
            </button>
          </form>

          {/* Quick Demo Credentials Autofill Helper */}
          <div className="mt-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase">Demo Credentials:</p>
              <p className="text-[11px] text-slate-300 font-mono">agent@gmail.com • Password@123</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAgentLoginForm({ email: 'agent@gmail.com', password: 'Password@123' });
              }}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-amber-300 text-[10px] font-bold rounded-lg border border-slate-600 shadow-2xs transition"
            >
              Autofill
            </button>
          </div>

          {/* Switch Portal Navigation */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link href="/login" className="hover:text-white font-medium inline-flex items-center gap-1 transition">
              <span className="material-symbols-outlined text-[14px]">storefront</span>
              <span>Customer Login</span>
            </Link>
            <Link href="/admin" className="hover:text-amber-400 font-bold inline-flex items-center gap-1 transition">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span>Admin Terminal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allOrders = Array.isArray(ordersData?.data)
    ? ordersData.data
    : Array.isArray(ordersData?.data?.orders)
    ? ordersData.data.orders
    : Array.isArray(ordersData?.orders)
    ? ordersData.orders
    : [];

  const allCustomers = Array.isArray(customersData?.data)
    ? customersData.data
    : Array.isArray(customersData)
    ? customersData
    : [];

  // Filter clients assigned specifically to this sales agent (or all if admin viewing)
  const assignedClients = user?.role === 'ADMIN'
    ? allCustomers
    : allCustomers.filter((c) => c.salesAgentId === user.id);

  const assignedClientIds = new Set(assignedClients.map((c) => c.id));

  // Filter orders strictly to this agent's assigned customers
  const agentOrders = user?.role === 'ADMIN'
    ? allOrders
    : allOrders.filter((o) => assignedClientIds.has(o.userId || o.user?.id) || o.user?.salesAgentId === user.id);

  const filteredClients = assignedClients.filter((c) =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter orders by status
  const filteredOrders = agentOrders.filter((o) => {
    if (orderStatusFilter === 'ALL') return true;
    return o.status === orderStatusFilter;
  });

  const totalSalesAttributed = agentOrders.reduce(
    (sum, o) => sum + (o.status !== 'CANCELLED' ? Number(o.totalAmount || 0) : 0),
    0
  );
  const agentCommission = totalSalesAttributed * 0.05; // 5% Commission
  const pendingOrdersCount = agentOrders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING').length;

  const copyPromoCode = () => {
    navigator.clipboard.writeText('AGENTPROMO');
    dispatch(showToast({ type: 'success', message: 'Promo Code "AGENTPROMO" (15% Off) copied to clipboard!' }));
  };

  const copyReferralLink = () => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=AGT-${user?.id?.slice(0, 6).toUpperCase() || 'AGENT'}`;
    navigator.clipboard.writeText(link);
    dispatch(showToast({ type: 'success', message: 'Client Referral Link copied to clipboard!' }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex overflow-x-hidden font-inter">
      {/* 1. LEFT FIXED SIDEBAR FOR SALES AGENT */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0F172A] text-slate-300 z-50 flex flex-col justify-between py-6 border-r border-slate-800 shadow-xl">
        <div className="flex flex-col gap-6">
          {/* Logo & Portal Badge */}
          <div className="flex flex-col px-6">
            <Link href="/agent" className="block">
              <img
                src="/logo.png"
                alt="Center Shopping"
                className="w-44 h-auto max-h-16 object-contain brightness-0 invert"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </Link>
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Sales Agent Console
              </span>
            </div>
          </div>

          {/* Section Divider */}
          <div className="px-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client &amp; Commission Ops</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'clients', label: 'My Assigned Clients', icon: 'contacts', badge: assignedClients.length },
              { id: 'orders', label: 'Client Orders', icon: 'receipt_long', badge: agentOrders.length },
              { id: 'vouchers', label: 'Promo Vouchers', icon: 'confirmation_number', badge: '15% Off' },
              { id: 'commissions', label: 'Commission & Payouts', icon: 'payments', badge: '5% Rate' },
              { id: 'settings', label: 'Agent Profile', icon: 'person' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive ? 'text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Agent Card & Logout */}
        <div className="px-4 flex flex-col gap-3">
          {/* Agent Status Pill */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {user?.name || 'Sales Agent'}
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">5% COMM</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              ID: #AGT-{user?.id?.slice(0, 8).toUpperCase() || '7740'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>Storefront</span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded-lg transition"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE (Offset by Sidebar Width) */}
      <main className="ml-72 flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
        {/* TOP AGENT APP BAR */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search assigned clients, orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Promo Action */}
            <button
              onClick={copyPromoCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 rounded-xl text-xs transition shadow-2xs cursor-pointer"
              title="Copy Promo Code AGENTPROMO"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">local_activity</span>
              <span>AGENTPROMO (15%)</span>
            </button>

            {/* Quick Referral Link */}
            <button
              onClick={copyReferralLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14213D] hover:bg-black text-white font-bold rounded-xl text-xs transition shadow-2xs cursor-pointer"
              title="Copy Client Referral Link"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-400">link</span>
              <span>Referral Link</span>
            </button>

            {/* Agent Profile Pill */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#14213D] text-amber-400 font-bold flex items-center justify-center text-xs shadow-xs">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Verified Sales Partner</p>
              </div>
            </div>
          </div>
        </header>

        {/* 3. DYNAMIC CONTENT AREA */}
        <div className="p-8 space-y-8 flex-1">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Welcome Hero Banner */}
              <div className="bg-gradient-to-r from-[#14213D] via-slate-900 to-[#1E293B] rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                      Partner Console
                    </span>
                    <span className="text-xs text-slate-300">
                      Representative ID: <strong className="text-white font-mono">#AGT-{user?.id?.slice(0, 8).toUpperCase() || '7740'}</strong>
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-montserrat tracking-tight mt-2">
                    Welcome back, {user?.name || 'Sales Partner'}!
                  </h1>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Monitor your assigned customer accounts, track attributed sales volumes, generate custom discount vouchers, and earn 5% commission on closed sales.
                  </p>
                </div>

                <div className="z-10 flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('clients')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">contacts</span>
                    <span>View Managed Clients</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('commissions')}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Commission Ledger</span>
                  </button>
                </div>

                {/* Ambient glow */}
                <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
              </div>

              {/* 4 Agent Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Attributed Sales GMV</p>
                    <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">
                      {formatPrice(totalSalesAttributed)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Cumulative customer volume</p>
                  </div>
                  <div className="p-3 rounded-2xl text-amber-700 bg-amber-50">
                    <span className="material-symbols-outlined text-[24px]">trending_up</span>
                  </div>
                </div>

                <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between bg-emerald-50/20">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-emerald-800">Earned Commission (5%)</p>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">READY</span>
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat text-emerald-700 mt-1">
                      {formatPrice(agentCommission)}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Available for payout</p>
                  </div>
                  <div className="p-3 rounded-2xl text-white bg-emerald-600">
                    <span className="material-symbols-outlined text-[24px]">payments</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Assigned Client Accounts</p>
                    <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">
                      {assignedClients.length} Clients
                    </h3>
                    <p className="text-[11px] text-blue-600 font-medium mt-0.5">Managed customer roster</p>
                  </div>
                  <div className="p-3 rounded-2xl text-blue-700 bg-blue-50">
                    <span className="material-symbols-outlined text-[24px]">group</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Closed Customer Orders</p>
                    <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">
                      {allOrders.length} Orders
                    </h3>
                    <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                      {pendingOrdersCount} in fulfillment
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl text-purple-700 bg-purple-50">
                    <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
                  </div>
                </div>
              </div>

              {/* Split Dashboard View */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Quick Managed Client Roster (2 cols) */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-amber-600">contacts</span>
                      <h3 className="text-sm font-bold text-slate-900">Managed Client Accounts</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('clients')}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      View All ({assignedClients.length}) →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[550px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                          <th className="px-6 py-3.5">Client</th>
                          <th className="px-6 py-3.5">Orders</th>
                          <th className="px-6 py-3.5">Spend</th>
                          <th className="px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assignedClients.slice(0, 5).map((client) => (
                          <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#14213D] text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                                  {client.name?.[0]?.toUpperCase() || 'C'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{client.name}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">{client.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 font-bold text-slate-800">
                              {client.ordersCount || client.orderCount || 0}
                            </td>
                            <td className="px-6 py-3.5 font-bold text-emerald-700">
                              {formatPrice(client.totalSpend || client.totalSpent || 0)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <Link
                                href="/"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition shadow-2xs"
                              >
                                <span>Assist</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Quick Voucher & Commission Box (1 col) */}
                <div className="space-y-6">
                  {/* Voucher Promotion Card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-[22px]">confirmation_number</span>
                        <h4 className="font-bold text-slate-900 text-sm">Agent Client Voucher</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Share this code with your customers for an immediate 15% discount on all purchases.
                      </p>
                      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-amber-900 tracking-wider">
                          AGENTPROMO
                        </span>
                        <button
                          onClick={copyPromoCode}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 shadow-2xs transition"
                        >
                          Copy Code
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400">
                        Commission Rate: <strong className="text-slate-800">5.0% flat GMV</strong>
                      </p>
                    </div>
                  </div>

                  {/* Payout Schedule Notice */}
                  <div className="bg-gradient-to-br from-slate-900 to-[#14213D] rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500 text-slate-950">
                        Monthly Direct Deposit
                      </span>
                      <h4 className="font-bold text-sm mt-2">Commission Payout Ready</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Cleared earnings of <strong className="text-amber-400">{formatPrice(agentCommission)}</strong> are eligible for bank transfer on the 1st of every month.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY ASSIGNED CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                    My Managed Client Accounts
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct roster of customers assigned to your agent profile. Assist with orders and customer support.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  {assignedClients.length} Total Clients
                </span>
              </div>

              {/* Clients Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5 min-w-[220px]">Client Details</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[120px]">Account Role</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[110px]">Total Orders</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[120px]">Lifetime Spend</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[130px]">Join Date</th>
                        <th className="px-6 py-3.5 text-right whitespace-nowrap min-w-[150px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#14213D] text-amber-400 font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                                {client.name?.[0]?.toUpperCase() || 'C'}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{client.name}</h4>
                                <p className="text-xs text-slate-400 font-mono">{client.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {client.role || 'CUSTOMER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                            {client.ordersCount || client.orderCount || 0} Orders
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-700 whitespace-nowrap">
                            {formatPrice(client.totalSpend || client.totalSpent || 0)}
                          </td>
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            {client.createdAt ? formatDate(client.createdAt) : 'Recent'}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <Link
                              href="/"
                              className="px-3 py-1.5 bg-[#14213D] hover:bg-black text-amber-400 font-bold rounded-lg text-xs transition inline-flex items-center gap-1 shadow-sm"
                            >
                              <span>Assist Order</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT ORDERS STREAM */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                    Attributed Client Orders
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Orders placed by your assigned customer accounts, eligible for 5% commission credit.
                  </p>
                </div>

                {/* Status Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition uppercase tracking-wider ${
                        orderStatusFilter === status
                          ? 'bg-[#14213D] text-amber-400 shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[110px]">Order ID</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[140px]">Date &amp; Time</th>
                        <th className="px-6 py-3.5 min-w-[180px]">Customer</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[120px]">Order Amount</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[130px]">Commission (5%)</th>
                        <th className="px-6 py-3.5 whitespace-nowrap min-w-[120px]">Status</th>
                        <th className="px-6 py-3.5 text-right whitespace-nowrap min-w-[120px]">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((order) => {
                        const comm = Number(order.totalAmount || 0) * 0.05;
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              #{order.id.slice(-6).toUpperCase()}
                            </td>
                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{order.user?.name || 'Client'}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{order.user?.email}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                              {formatPrice(order.totalAmount)}
                            </td>
                            <td className="px-6 py-4 font-bold text-emerald-700 whitespace-nowrap">
                              +{formatPrice(comm)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  order.status === 'DELIVERED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : order.status === 'CANCELLED'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedReceiptOrder(order)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-amber-400 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                                title="Generate & Print Official Receipt"
                              >
                                <span className="material-symbols-outlined text-[15px]">print</span>
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROMO VOUCHERS */}
          {activeTab === 'vouchers' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Sales Agent Vouchers &amp; Marketing Links
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribute unique discount codes to prospective clients to lock them into your attribution tree.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Promo Voucher Box */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        Active Promotion
                      </span>
                      <span className="text-xs font-bold text-emerald-600">15% Immediate Discount</span>
                    </div>

                    <h3 className="font-['Montserrat'] text-xl font-bold text-slate-900 mt-3">
                      Exclusive 15% Client Promo Code
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Share this coupon code with your clients. When applied at checkout, it provides a 15% concession across our entire physical product vault.
                    </p>

                    <div className="mt-5 p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest block">
                          Coupon Code
                        </span>
                        <span className="text-lg font-mono font-bold tracking-wider">AGENTPROMO</span>
                      </div>
                      <button
                        onClick={copyPromoCode}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md"
                      >
                        Copy Voucher
                      </button>
                    </div>
                  </div>
                </div>

                {/* Referral Link Generator */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                        Referral Link
                      </span>
                      <span className="text-xs font-bold text-blue-600">Auto-Attribution</span>
                    </div>

                    <h3 className="font-['Montserrat'] text-xl font-bold text-slate-900 mt-3">
                      Direct Storefront Referral Link
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Send clients this direct link. Any new customer registering or buying through this link will be automatically assigned to your agent account.
                    </p>

                    <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-700 truncate">
                        {typeof window !== 'undefined' ? `${window.location.origin}?ref=AGT-${user?.id?.slice(0, 6).toUpperCase() || '7740'}` : ''}
                      </span>
                      <button
                        onClick={copyReferralLink}
                        className="px-3 py-1.5 bg-[#14213D] hover:bg-black text-white font-bold rounded-xl text-xs transition shrink-0 shadow-2xs"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COMMISSIONS & PAYOUTS */}
          {activeTab === 'commissions' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Commission Ledger &amp; Earnings
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete breakdown of your 5% commission earnings on all closed client orders.
                </p>
              </div>

              {/* Commission Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20">
                  <p className="text-xs font-medium text-emerald-800">Total Cleared Commission</p>
                  <h3 className="text-2xl font-bold font-montserrat text-emerald-700 mt-1">
                    {formatPrice(agentCommission)}
                  </h3>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Calculated at 5% of GMV</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Total Attributed Sales</p>
                  <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">
                    {formatPrice(totalSalesAttributed)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Across all client accounts</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Payout Status</p>
                  <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Ready
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Direct deposit schedule active</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AGENT PROFILE & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Sales Agent Profile
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your representative identification and compensation parameters.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-2xl bg-[#14213D] text-amber-400 font-bold flex items-center justify-center text-xl shadow-md">
                    {user?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 mt-1">
                      Role: SALES_AGENT
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Representative Code</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      #AGT-{user?.id?.slice(0, 8).toUpperCase() || '7740'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Commission Rate</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block">5.0% Standard Tier</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* 4. PRINTABLE TAX INVOICE & OFFICIAL RECEIPT MODAL */}
      {/* ============================================================ */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          {/* Print specific stylesheet */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-receipt-modal,
              #printable-receipt-modal * {
                visibility: visible;
              }
              #printable-receipt-modal {
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px;
                border: none;
                box-shadow: none;
                background: white;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div
            id="printable-receipt-modal"
            className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative my-8"
          >
            {/* Modal Action Bar (Hidden on Print) */}
            <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">receipt_long</span>
                <span className="text-xs font-bold uppercase tracking-wider">Official Tax Invoice &amp; Customer Receipt</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setSelectedReceiptOrder(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                  title="Close Modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Body */}
            <div className="p-8 sm:p-10 space-y-6 text-slate-800 bg-white">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <img
                    src="/logo.png"
                    alt="Center Shopping"
                    className="h-12 w-auto object-contain"
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Center Shopping India Pvt Ltd • GSTIN: 27AABCS1429B1Z8
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Express Fulfillment Hub, Electronic City, Bengaluru, KA 560100
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-amber-400">
                    TAX INVOICE
                  </span>
                  <h3 className="font-mono font-bold text-sm text-slate-900 mt-1.5">
                    INV-#{selectedReceiptOrder.id.slice(-8).toUpperCase()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Date: {formatDate(selectedReceiptOrder.createdAt)}
                  </p>
                </div>
              </div>

              {/* Billed To & Sales Representative Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    Billed &amp; Delivered To:
                  </p>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedReceiptOrder.user?.name || 'Valued Customer'}</h4>
                  <p className="text-slate-600 font-mono text-[11px]">{selectedReceiptOrder.user?.email}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Verified Online Customer</p>
                </div>

                <div className="border-l border-slate-200 pl-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    Attributed Sales Representative:
                  </p>
                  <h4 className="font-bold text-slate-900 text-sm">{user?.name || 'Sales Agent'}</h4>
                  <p className="text-slate-600 font-mono text-[11px]">
                    ID: #AGT-{user?.id?.slice(0, 8).toUpperCase() || '7740'}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                    5% Attribution Credited
                  </span>
                </div>
              </div>

              {/* Purchased Line Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Item Description</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedReceiptOrder.items || selectedReceiptOrder.orderItems || []).length > 0 ? (
                      (selectedReceiptOrder.items || selectedReceiptOrder.orderItems).map((item, idx) => {
                        const title = item.variant?.product?.title || item.productTitle || item.product?.title || 'Physical Item';
                        const sku = item.variant?.sku || item.sku || `SKU-${idx + 1}`;
                        const unitPrice = parseFloat(item.price || item.unitPrice || 0);
                        const qty = item.quantity || 1;
                        const lineTotal = unitPrice * qty;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{title}</p>
                              <p className="text-[10px] text-slate-400 font-mono">SKU: #{sku}</p>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">{qty}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">{formatPrice(unitPrice)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatPrice(lineTotal)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">Custom Physical Goods Order</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: #CS-GEN-001</p>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">1</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatPrice(selectedReceiptOrder.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatPrice(selectedReceiptOrder.totalAmount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown Summary */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-2">
                <div className="space-y-1.5 text-xs text-slate-500 max-w-xs">
                  <p className="font-semibold text-slate-700">Payment &amp; Fulfillment:</p>
                  <p className="text-[11px]">
                    Method: <strong className="text-slate-900 font-mono">{selectedReceiptOrder.payment?.paymentMethod || 'NMI Direct Post (Credit/Debit Card)'}</strong>
                  </p>
                  <p className="text-[11px]">
                    Status:{' '}
                    <span className="font-bold text-emerald-700 uppercase">
                      {selectedReceiptOrder.status === 'CANCELLED' ? 'REFUNDED' : 'PAID & CONFIRMED'}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 italic">
                    * Computer-generated tax invoice. No signature required. 100% authentic merchandise guarantee.
                  </p>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPrice(selectedReceiptOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Express Shipping:</span>
                    <span className="font-semibold text-emerald-600">FREE</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>GST (18% inclusive):</span>
                    <span className="font-mono text-slate-700">
                      {formatPrice(Number(selectedReceiptOrder.totalAmount || 0) * 0.18 / 1.18)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>Total Amount Paid:</span>
                    <span className="font-mono text-base text-amber-600">
                      {formatPrice(selectedReceiptOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
                <p>Thank you for choosing Center Shopping • For inquiries contact support@specbee.com or call 1800-123-9876</p>
              </div>
            </div>

            {/* Bottom Footer Actions (Hidden on Print) */}
            <div className="no-print bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Ready to print on standard A4 / Letter format.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedReceiptOrder(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-[#14213D] hover:bg-black text-amber-400 font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

