'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useGetOrdersQuery, useGetAdminStatsQuery, useLoginMutation } from '../../redux/services/api.js';
import { formatPrice, formatDate } from '../../utils/helpers.js';
import { showToast } from '../../redux/slices/cartSlice.js';
import { setCredentials } from '../../redux/slices/authSlice.js';
import Link from 'next/link';

export default function SalesAgentDashboard() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();

  const handleQuickAgentLogin = async () => {
    try {
      const res = await loginMutation({
        email: 'agent@specbee.com',
        password: 'Password@123',
      }).unwrap();
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Custodial Agent Console Unlocked: Welcome Sarah' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Agent access failed' }));
    }
  };

  const { data: statsData } = useGetAdminStatsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { data: ordersData } = useGetOrdersQuery(undefined, {
    skip: !isAuthenticated,
  });

  const orders = ordersData?.data || [];
  const stats = statsData?.data;

  if (!isAuthenticated || (user?.role !== 'SALES_AGENT' && user?.role !== 'ADMIN')) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-inter">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xl p-8 sm:p-10 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#14213D] text-[#fca311] flex items-center justify-center mx-auto mb-6 shadow-md">
            <span className="material-symbols-outlined text-[32px]">support_agent</span>
          </div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#14213D] uppercase tracking-tight">
            Sales Agent Access Required
          </h2>
          <p className="font-['Inter'] text-sm text-[#6C757D] mt-2 max-w-md mx-auto leading-relaxed">
            Sales reports, affiliate tracking, and customer order management are restricted to authorized Sales Agents.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleQuickAgentLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-[#fca311] hover:bg-[#E08F07] text-black font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
              <span>{isLoggingIn ? 'Signing In...' : 'Quick Demo Sign-In (Sales Agent)'}</span>
            </button>
            <Link
              href="/login"
              className="w-full py-3.5 px-6 rounded-xl bg-[#14213D] hover:bg-black text-white font-['Montserrat'] text-xs uppercase font-bold tracking-wider transition flex items-center justify-center gap-2"
            >
              <span>Sign In with Custom Credentials</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const copyPromoCode = () => {
    navigator.clipboard.writeText('AGENTPROMO');
    dispatch(showToast({ type: 'success', message: 'Voucher "AGENTPROMO" copied to clipboard!' }));
  };

  const agentCommission = (stats?.totalRevenue ? stats.totalRevenue * 0.03 : 0);

  return (
    <div className="w-full bg-surface min-h-screen pb-16 font-inter">
      {/* Agent Header Banner */}
      <section className="w-full bg-text-secondary text-white py-8 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[10px] uppercase tracking-widest text-primary-container font-bold">
                Sales Agent Console
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-white uppercase font-extrabold tracking-tight mt-1">
              Center Shopping Agent Portal
            </h1>
            <p className="text-xs text-secondary-fixed-dim mt-1">
              Sales Partner: <strong className="text-white">{user?.name}</strong> • ID: #AGT-{user?.id?.slice(0, 6).toUpperCase() || '7740'}
            </p>
          </div>

          {/* Agent Promo Code Pill */}
          <div className="flex items-center gap-3 bg-[#0d1b36] p-3 rounded-xl border border-slate-700/60">
            <div>
              <span className="font-label-caps text-[9px] uppercase text-secondary-fixed-dim block">
                Exclusive Referral Discount Code
              </span>
              <span className="font-mono text-sm font-bold text-primary-container">
                AGENTPROMO (15% OFF)
              </span>
            </div>
            <button
              onClick={copyPromoCode}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-label-caps text-[10px] uppercase font-bold transition border border-white/20"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-primary-container/15 blur-3xl pointer-events-none"></div>
      </section>

      {/* KPI Stats */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 -mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-hairline shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-text-secondary text-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
            <div>
              <span className="font-label-caps text-[9px] uppercase text-text-muted block">Total Sales Referred</span>
              <span className="font-headline-md text-xl font-bold text-text-primary font-mono block">
                {formatPrice(stats?.totalRevenue || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-hairline shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">paid</span>
            </div>
            <div>
              <span className="font-label-caps text-[9px] uppercase text-text-muted block">Estimated Commission Earned (3%)</span>
              <span className="font-headline-md text-xl font-bold text-emerald-700 font-mono block">
                {formatPrice(agentCommission)}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-hairline shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-text-secondary text-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
            <div>
              <span className="font-label-caps text-[9px] uppercase text-text-muted block">Referred Customers</span>
              <span className="font-headline-md text-xl font-bold text-text-secondary font-mono block">
                {new Set(orders.map(o => o.userId)).size || orders.length || 0} Customers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Client Orders */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="bg-white rounded-xl border border-hairline shadow-xs overflow-hidden">
          <div className="p-4 bg-surface-subtle border-b border-hairline flex items-center justify-between">
            <h3 className="font-headline-sm text-base text-text-secondary uppercase font-bold">
              Recent Customer Orders
            </h3>
            <span className="font-label-caps text-[10px] uppercase text-text-muted">
              Live Orders Stream
            </span>
          </div>

          <div className="divide-y divide-hairline">
            {orders.map((o) => (
              <div key={o.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-mono font-bold text-text-secondary">#DH-ORD-{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-text-muted ml-3">{formatDate(o.createdAt)}</span>
                  <p className="text-text-muted text-[11px] mt-0.5">Destination: {o.shippingAddress?.slice(0, 50)}...</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-text-primary text-sm">{formatPrice(Number(o.totalAmount))}</span>
                  <span className="font-label-caps text-[9px] uppercase font-bold bg-surface-subtle px-2 py-0.5 rounded text-text-secondary">
                    {o.status}
                  </span>
                  <Link
                    href={`/orders/${o.id}`}
                    className="p-1.5 text-text-muted hover:text-text-secondary"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
