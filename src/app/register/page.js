'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useRegisterMutation } from '../../redux/services/api.js';
import { setCredentials } from '../../redux/slices/authSlice.js';
import { showToast } from '../../redux/slices/cartSlice.js';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [registerMutation, { isLoading }] = useRegisterMutation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Vault Passcodes do not match.');
      return;
    }

    try {
      const res = await registerMutation({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      }).unwrap();

      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Custody Account registered successfully!' }));
      
      if (res.data.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (res.data.user.role === 'SALES_AGENT') {
        router.push('/agent');
      } else {
        router.push('/');
      }
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Registration failed');
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Registration failed' }));
    }
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
              Privileged Depository Access
            </span>
            <h2 className="font-headline-md text-2xl font-extrabold leading-tight text-white uppercase">
              Establish Your Consignment Title
            </h2>
            <p className="text-xs text-secondary-fixed-dim mt-2 leading-relaxed">
              Open an institutional account with direct-to-vault title reservation, real-time bullion valuations, and zero-fee escrow routing.
            </p>
          </div>

          <div className="z-10 flex flex-col gap-3 border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">shield_check</span>
              <span>Zero-Trust Architecture</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">fingerprint</span>
              <span>FIDO2 Tokenization Protocol</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="material-symbols-outlined text-[16px] text-primary-container">verified</span>
              <span>LBMA / GIA Audited Compliance</span>
            </div>
          </div>

          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Registration Form (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="font-label-caps text-[10px] uppercase tracking-widest text-primary font-bold">
                Membership Registration
              </span>
              <h1 className="font-headline-md text-2xl font-extrabold text-text-secondary uppercase tracking-tight mt-1">
                Create Custody Account
              </h1>
              <p className="text-xs text-text-muted mt-1">
                Sign up to access verified enterprise tiers and unlock exclusive privileges.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@institution.com"
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    Vault Passcode
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    Confirm Passcode
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                  Account Designation Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary transition"
                >
                  <option value="CUSTOMER">Custodial Client / Private Collector</option>
                  <option value="SALES_AGENT">Authorized Vault Sales Agent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-container text-text-primary py-3 rounded-lg font-label-caps text-xs uppercase font-bold tracking-wider hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4"
              >
                <span>{isLoading ? 'Creating Vault Title...' : 'Complete Registration & Enter Vault'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-text-muted">
              <span>Already possess custodial access? </span>
              <Link href="/login" className="font-label-caps text-xs uppercase font-bold text-text-secondary hover:text-primary ml-1">
                Sign In
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
