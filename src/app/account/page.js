'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setCredentials } from '../../redux/slices/authSlice.js';
import { showToast } from '../../redux/slices/cartSlice.js';
import { useGetOrdersQuery, useLoginMutation } from '../../redux/services/api.js';
import { formatPrice, formatDate } from '../../utils/helpers.js';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();

  const handleQuickDemoLogin = async () => {
    try {
      const res = await loginMutation({
        email: 'customer@specbee.com',
        password: 'Password@123',
      }).unwrap();
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Welcome back, John Doe!' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Demo sign-in failed' }));
    }
  };
  const [activeTab, setActiveTab] = useState('portfolio');

  const { data: ordersData } = useGetOrdersQuery(undefined, {
    skip: !isAuthenticated,
  });

  const orders = ordersData?.data || [];
  const totalSettled = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? Number(o.totalAmount) : 0), 0);

  const handleSignOut = () => {
    dispatch(logout());
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-inter">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xl p-8 sm:p-10 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#14213D] text-[#fca311] flex items-center justify-center mx-auto mb-6 shadow-md">
            <span className="material-symbols-outlined text-[32px]">person</span>
          </div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#14213D] uppercase tracking-tight">
            Sign In to Your Account
          </h2>
          <p className="font-['Inter'] text-sm text-[#6C757D] mt-2 max-w-md mx-auto leading-relaxed">
            Please sign in to view your profile, manage your orders, and track deliveries in real time.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-[#fca311] hover:bg-[#E08F07] text-black font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <span>{isLoggingIn ? 'Signing In...' : 'Quick Demo Sign-In (Customer)'}</span>
            </button>
            <Link
              href="/login"
              className="w-full py-3.5 px-6 rounded-xl bg-[#14213D] hover:bg-black text-white font-['Montserrat'] text-xs uppercase font-bold tracking-wider transition flex items-center justify-center gap-2"
            >
              <span>Sign In with Email &amp; Password</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface min-h-screen pb-16 font-inter">
      {/* Profile Header Card */}
      <section className="w-full bg-text-secondary text-white py-10 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="flex items-center gap-5">
            <img src="/logo.png" alt="Center Shopping Logo" className="h-14 w-auto object-contain shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-md text-2xl font-extrabold uppercase tracking-tight text-white">
                  {user?.name}
                </h1>
                <span className="font-label-caps text-[10px] text-primary uppercase font-bold bg-primary-fixed px-2 py-0.5 rounded">
                  {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'SALES_AGENT' ? 'Sales Agent' : 'Customer'}
                </span>
              </div>
              <p className="text-xs text-secondary-fixed-dim mt-1 font-mono">
                {user?.email} • Customer ID: #CS-UID-{user?.id?.slice(0, 6).toUpperCase() || '8842'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="bg-[#0d1b36] p-3.5 rounded-xl border border-slate-700/60 min-w-[120px]">
              <span className="font-label-caps text-[9px] uppercase text-secondary-fixed-dim block">
                Total Orders Value
              </span>
              <span className="font-headline-md text-lg font-bold text-primary-container mt-0.5 block font-mono">
                {formatPrice(totalSettled)}
              </span>
            </div>
            <div className="bg-[#0d1b36] p-3.5 rounded-xl border border-slate-700/60 min-w-[120px]">
              <span className="font-label-caps text-[9px] uppercase text-secondary-fixed-dim block">
                Placed Orders
              </span>
              <span className="font-headline-md text-lg font-bold text-white mt-0.5 block font-mono">
                {orders.length} Orders
              </span>
            </div>
          </div>
        </div>

        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-primary-container/15 blur-3xl pointer-events-none"></div>
      </section>

      {/* Tabs Bar */}
      <div className="w-full bg-white border-b border-hairline px-4 sm:px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto flex items-center gap-6">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`py-4 font-label-caps text-xs uppercase tracking-wider font-bold border-b-2 transition ${
              activeTab === 'portfolio'
                ? 'border-primary-container text-text-secondary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            My Profile &amp; Benefits
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 font-label-caps text-xs uppercase tracking-wider font-bold border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-primary-container text-text-secondary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            My Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 font-label-caps text-xs uppercase tracking-wider font-bold border-b-2 transition ${
              activeTab === 'security'
                ? 'border-primary-container text-text-secondary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Account Security
          </button>
        </div>
      </div>

      {/* Main Tab Stage */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-text-muted uppercase">Membership Status</span>
                <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase mt-1">Verified Shopper</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Enjoy free express delivery on eligible orders, genuine product guarantees, and dedicated customer support across India.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs font-semibold text-primary">
                <span>Verified Member</span>
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-text-muted uppercase">Safe &amp; Secure Payments</span>
                <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase mt-1">100% Protected</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Every order is backed by secure 256-bit SSL encryption and guaranteed buyer protection on every transaction.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs font-semibold text-text-secondary">
                <span>Pan-India Delivery</span>
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-text-muted uppercase">Account Management</span>
                <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase mt-1">Active Session</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Log out of your current account session safely from this browser.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline">
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-label-caps text-[10px] uppercase font-bold tracking-wider transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl border border-hairline shadow-xs p-6">
            <h3 className="font-headline-sm text-base text-text-secondary uppercase font-bold mb-4">
              Order History
            </h3>
            {orders.length === 0 ? (
              <p className="text-xs text-text-muted">You haven&apos;t placed any orders yet. Explore our products and start shopping!</p>
            ) : (
              <div className="divide-y divide-hairline">
                {orders.map((o) => (
                  <div key={o.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-mono font-bold text-text-secondary">#CS-ORD-{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-text-muted ml-3">{formatDate(o.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-text-primary">{formatPrice(Number(o.totalAmount))}</span>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-label-caps text-[10px] text-primary uppercase font-bold hover:underline"
                      >
                        View Order
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-xl border border-hairline shadow-xs p-6 max-w-2xl">
            <h3 className="font-headline-sm text-base text-text-secondary uppercase font-bold mb-3">
              Security &amp; Account Settings
            </h3>
            <div className="space-y-4 text-xs text-text-secondary">
              <div className="p-4 rounded-xl bg-surface-subtle border border-hairline flex items-center justify-between">
                <div>
                  <div className="font-bold">256-Bit SSL Encryption</div>
                  <div className="text-text-muted text-[11px] mt-0.5">Session encrypted via industry-standard protocols</div>
                </div>
                <span className="font-label-caps text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold uppercase">
                  Enabled
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-hairline flex items-center justify-between">
                <div>
                  <div className="font-bold">Secure Authentication</div>
                  <div className="text-text-muted text-[11px] mt-0.5">JWT Tokenized credentials protection</div>
                </div>
                <span className="font-label-caps text-[10px] text-primary bg-primary-fixed px-2 py-0.5 rounded font-bold uppercase">
                  Active
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
