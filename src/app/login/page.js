'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../../redux/services/api.js';
import { setCredentials } from '../../redux/slices/authSlice.js';
import { showToast } from '../../redux/slices/cartSlice.js';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loginMutation, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await loginMutation({ email, password }).unwrap();

      // Enforce: Only customers can sign in through the customer storefront login
      if (res.data.user.role === 'ADMIN' || res.data.user.role === 'SALES_AGENT') {
        setErrorMsg('Staff accounts (Administrator / Sales Agent) must sign in via the Admin Console at /admin.');
        dispatch(showToast({ type: 'error', message: 'Staff accounts must sign in via /admin' }));
        return;
      }

      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: `Welcome back, ${res.data.user.name}!` }));
      router.push('/');
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Invalid credentials');
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Login failed' }));
    }
  };

  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password@123');
  };


  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-surface py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-inter">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-xl border border-hairline overflow-hidden">
        {/* Left Hero Brand Panel (5 cols) */}
        <div className="hidden lg:flex lg:col-span-5 bg-text-secondary text-white p-8 flex-col justify-between relative overflow-hidden">
          <div className="z-10 flex flex-col gap-3">
            <div className="flex items-center mb-2">
              <img src="/logo.png" alt="Dropyhub Logo" className="h-20 w-auto max-h-20 object-contain" />
            </div>
            <span className="font-label-caps text-[9px] uppercase tracking-widest text-primary-container font-bold mt-2">
              The Sovereign Archive
            </span>
            <h2 className="font-headline-md text-2xl font-extrabold leading-tight text-white uppercase">
              Curated Custody &amp; Verified Title
            </h2>
            <p className="text-xs text-secondary-fixed-dim mt-2 leading-relaxed">
              Institutional security protocols for physical bullion allocations, rare numismatics, and bonded vault reserves.
            </p>
          </div>

          <div className="z-10 flex flex-col gap-3 border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">shield_check</span>
              <span>100% Insured Depository Transit</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">verified</span>
              <span>256-Bit Escrow Concurrency</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">local_shipping</span>
              <span>Armored Courier Transit</span>
            </div>
          </div>

          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Authentication Form (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="font-label-caps text-[10px] uppercase tracking-widest text-primary font-bold">
                Secure Client Portal
              </span>
              <h1 className="font-headline-md text-2xl font-extrabold text-text-secondary uppercase tracking-tight mt-1">
                Sign In to Vault
              </h1>
              <p className="text-xs text-text-muted mt-1">
                Enter your registered credentials to access your depository portfolio.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Demo Customer Helper */}
            <div className="mb-6 p-3.5 rounded-xl bg-surface-subtle border border-hairline">
              <span className="font-label-caps text-[9px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                ⚡ Quick Demonstration Access:
              </span>
              <button
                type="button"
                onClick={() => handleQuickLogin('customer@specbee.com')}
                className="w-full px-3 py-2 rounded-lg bg-white border border-hairline hover:border-primary-container text-xs font-label-caps uppercase font-bold text-text-secondary shadow-2xs transition flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                <span>Customer (John Vault Collector)</span>
              </button>
            </div>


            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.com"
                  className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-label-caps text-[10px] uppercase text-text-secondary font-bold">
                    Vault Passcode
                  </label>
                  <a href="#" className="font-inter text-[11px] text-text-muted hover:text-text-secondary">
                    Forgot Key?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-container text-text-primary py-3 rounded-lg font-label-caps text-xs uppercase font-bold tracking-wider hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Vault'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-text-muted">
              <span>Do not possess custodial credentials? </span>
              <Link href="/register" className="font-label-caps text-xs uppercase font-bold text-text-secondary hover:text-primary ml-1">
                Register Consignment Account
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-text-muted">
              <span>Staff or Depository Officer? </span>
              <Link href="/admin" className="font-label-caps text-xs uppercase font-bold text-amber-600 hover:underline ml-1">
                Access Admin Console →
              </Link>
            </div>

          </div>

          <div className="pt-6 border-t border-hairline flex items-center justify-between text-text-muted text-[10px] font-label-caps uppercase">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">lock</span>
              256-Bit SSL
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
              ISO 27001 Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-text-secondary">shield</span>
              Tier 4 Depository
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
