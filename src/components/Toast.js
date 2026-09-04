'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearToast } from '../redux/slices/cartSlice.js';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const toast = useSelector((state) => state.cart.toast);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch(clearToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-up">
      <div
        className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-md ${
          isSuccess
            ? 'bg-[#14213D]/95 text-white border-[#fca311]/40 shadow-[0_8px_30px_rgb(252,163,17,0.15)]'
            : isError
            ? 'bg-[#14213D]/95 text-white border-rose-500/40 shadow-[0_8px_30px_rgb(244,63,94,0.15)]'
            : 'bg-[#14213D]/95 text-white border-blue-500/40 shadow-xl'
        }`}
      >
        {isSuccess && (
          <div className="w-8 h-8 rounded-full bg-[#fca311]/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#fca311] text-lg">verified</span>
          </div>
        )}
        {isError && (
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-rose-400 text-lg">error</span>
          </div>
        )}
        {!isSuccess && !isError && (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-400 text-lg">info</span>
          </div>
        )}

        <div className="flex-1 pr-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            {isSuccess ? 'Vault Escrow Notice' : isError ? 'Custody Alert' : 'Notification'}
          </p>
          <p className="text-sm font-medium text-slate-100 mt-0.5">{toast.message}</p>
        </div>

        <button
          onClick={() => dispatch(clearToast())}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
