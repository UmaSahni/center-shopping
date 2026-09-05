'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useLoginMutation, useGoogleAuthMutation } from '../../redux/services/api.js';
import { setCredentials } from '../../redux/slices/authSlice.js';
import { showToast } from '../../redux/slices/cartSlice.js';
import { signInWithGoogle } from '../../utils/firebase.js';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loginMutation, { isLoading }] = useLoginMutation();
  const [googleAuthMutation, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      const googleUser = await signInWithGoogle();
      const res = await googleAuthMutation({
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        idToken: googleUser.idToken,
      }).unwrap();

      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: `Welcome to Center Shopping, ${res.data.user.name}!` }));
      router.push('/');
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        const msg = err?.data?.message || err?.message || 'Google sign-in failed. Please try again.';
        setErrorMsg(msg);
        dispatch(showToast({ type: 'error', message: msg }));
      }
    }
  };

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




  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-surface py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-inter">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-xl border border-hairline overflow-hidden">
        {/* Left Hero Brand Panel (5 cols) */}
        <div className="hidden lg:flex lg:col-span-5 bg-text-secondary text-white p-8 flex-col justify-between relative overflow-hidden">
          <div className="z-10 flex flex-col gap-3">
            <div className="flex items-center mb-2">
              <img
                src="/logo.png"
                alt="Center Shopping Logo"
                className="h-20 w-auto max-h-20 object-contain brightness-0 invert"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <span className="font-label-caps text-[9px] uppercase tracking-widest text-primary-container font-bold mt-2">
              Center Shopping
            </span>
            <h2 className="font-headline-md text-2xl font-extrabold leading-tight text-white uppercase">
              Quality Products &amp; Great Deals
            </h2>
            <p className="text-xs text-secondary-fixed-dim mt-2 leading-relaxed">
              Sign in to manage your orders, track deliveries in real time, and enjoy safe, verified shopping across India.
            </p>
          </div>

          <div className="z-10 flex flex-col gap-3 border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">shield_check</span>
              <span>100% Safe &amp; Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">verified</span>
              <span>100% Genuine Products</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">local_shipping</span>
              <span>Fast &amp; Reliable Delivery</span>
            </div>
          </div>

          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Authentication Form (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="font-label-caps text-[10px] uppercase tracking-widest text-primary font-bold">
                Welcome Back
              </span>
              <h1 className="font-headline-md text-2xl font-extrabold text-text-secondary uppercase tracking-tight mt-1">
                Sign In
              </h1>
              <p className="text-xs text-text-muted mt-1">
                Enter your email address and password to access your account.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Google Sign In */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-medium text-xs text-slate-700 shadow-2xs hover:shadow-xs transition-all duration-200 disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-semibold text-slate-800">
                  {isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}
                </span>
              </button>

              <div className="relative flex items-center justify-center my-5">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                  Or sign in with email
                </span>
                <div className="border-t border-slate-200 w-full"></div>
              </div>
            </div>


            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-label-caps text-[10px] uppercase text-text-secondary font-bold">
                    Password
                  </label>
                  <a href="#" className="font-inter text-[11px] text-text-muted hover:text-text-secondary">
                    Forgot Password?
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
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-text-muted">
              <span>Don't have an account? </span>
              <Link href="/register" className="font-label-caps text-xs uppercase font-bold text-text-secondary hover:text-primary ml-1">
                Create Account
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-text-muted">
              <span>Staff or Admin? </span>
              <Link href="/admin" className="font-label-caps text-xs uppercase font-bold text-amber-600 hover:underline ml-1">
                Admin Login →
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
              ISO Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-text-secondary">shield</span>
              100% Safe Payments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
