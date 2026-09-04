'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice.js';
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
      dispatch(showToast({ type: 'success', message: 'Vault Access Granted: Welcome John Vault Collector' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Demo access failed' }));
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
            <span className="material-symbols-outlined text-[32px]">badge</span>
          </div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#14213D] uppercase tracking-tight">
            Client Dossier Clearance Required
          </h2>
          <p className="font-['Inter'] text-sm text-[#6C757D] mt-2 max-w-md mx-auto leading-relaxed">
            Personal vault security clearances, tier benefits, and consignee registries require an authenticated session.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-[#fca311] hover:bg-[#E08F07] text-black font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <span>{isLoggingIn ? 'Decrypting Session...' : 'Instant Demo Sign-In (Collector)'}</span>
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

  return (
    <div className="w-full bg-surface min-h-screen pb-16 font-inter">
      {/* Profile Header Card */}
      <section className="w-full bg-text-secondary text-white py-10 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="flex items-center gap-5">
            <img src="/logo.png" alt="Dropyhub Logo" className="h-14 w-auto object-contain shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-md text-2xl font-extrabold uppercase tracking-tight text-white">
                  {user?.name}
                </h1>
                <span className="font-label-caps text-[10px] text-primary uppercase font-bold bg-primary-fixed px-2 py-0.5 rounded">
                  {user?.role === 'ADMIN' ? 'Admin Officer' : user?.role === 'SALES_AGENT' ? 'Authorized Agent' : 'Gold Member'}
                </span>
              </div>
              <p className="text-xs text-secondary-fixed-dim mt-1 font-mono">
                {user?.email} • Custodial ID: #DH-UID-{user?.id?.slice(0, 6).toUpperCase() || '8842'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="bg-[#0d1b36] p-3.5 rounded-xl border border-slate-700/60 min-w-[120px]">
              <span className="font-label-caps text-[9px] uppercase text-secondary-fixed-dim block">
                Total Custodial Holdings
              </span>
              <span className="font-headline-md text-lg font-bold text-primary-container mt-0.5 block font-mono">
                {formatPrice(totalSettled)}
              </span>
            </div>
            <div className="bg-[#0d1b36] p-3.5 rounded-xl border border-slate-700/60 min-w-[120px]">
              <span className="font-label-caps text-[9px] uppercase text-secondary-fixed-dim block">
                Executed Orders
              </span>
              <span className="font-headline-md text-lg font-bold text-white mt-0.5 block font-mono">
                {orders.length} Consignments
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
            Custody Portfolio
          </button>
          <button
            onClick={() => setActiveTab('consignments')}
            className={`py-4 font-label-caps text-xs uppercase tracking-wider font-bold border-b-2 transition ${
              activeTab === 'consignments'
                ? 'border-primary-container text-text-secondary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Recent Consignments ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 font-label-caps text-xs uppercase tracking-wider font-bold border-b-2 transition ${
              activeTab === 'security'
                ? 'border-primary-container text-text-secondary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Security &amp; Fiduciary Keys
          </button>
        </div>
      </div>

      {/* Main Tab Stage */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-text-muted uppercase">Verified Vault Tier</span>
                <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase mt-1">Tier-1 Depository Member</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Complimentary transit insurance indemnity, expedited BIS assayer allocations, and zero-fee armored courier dispatches across India.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs font-semibold text-primary">
                <span>Direct Concierge Dedicated</span>
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-text-muted uppercase">Escrow Settlement Protocol</span>
                <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase mt-1">T+0 Instant Title Transfer</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Your physical bullion and timepiece titles are legally notarized immediately upon escrow authorization.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs font-semibold text-text-secondary">
                <span>Bengaluru &amp; Mumbai Depository</span>
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-[10px] text-text-muted uppercase">Account Maintenance</span>
                <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase mt-1">Terminal Session</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Terminate current session credentials across all active devices and secure your local vault token.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline">
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-label-caps text-[10px] uppercase font-bold tracking-wider transition"
                >
                  Sign Out of Vault
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consignments' && (
          <div className="bg-white rounded-xl border border-hairline shadow-xs p-6">
            <h3 className="font-headline-sm text-base text-text-secondary uppercase font-bold mb-4">
              Consignment Ledger
            </h3>
            {orders.length === 0 ? (
              <p className="text-xs text-text-muted">No recorded consignments found.</p>
            ) : (
              <div className="divide-y divide-hairline">
                {orders.map((o) => (
                  <div key={o.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-mono font-bold text-text-secondary">#DH-ORD-{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-text-muted ml-3">{formatDate(o.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-text-primary">{formatPrice(Number(o.totalAmount))}</span>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-label-caps text-[10px] text-primary uppercase font-bold hover:underline"
                      >
                        Inspect
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
              Depository Security & Compliance Parameters
            </h3>
            <div className="space-y-4 text-xs text-text-secondary">
              <div className="p-4 rounded-xl bg-surface-subtle border border-hairline flex items-center justify-between">
                <div>
                  <div className="font-bold">256-Bit Hardware Tokenization</div>
                  <div className="text-text-muted text-[11px] mt-0.5">Session encrypted via AES-256 GCM</div>
                </div>
                <span className="font-label-caps text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold uppercase">
                  Enabled
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-hairline flex items-center justify-between">
                <div>
                  <div className="font-bold">FIDO2 Biometric Authentication</div>
                  <div className="text-text-muted text-[11px] mt-0.5">Yubikey / TouchID Passkey validation</div>
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
