'use client';

import { useState } from 'react';
import { useCancelOrderMutation } from '../redux/services/api.js';
import { showToast } from '../redux/slices/cartSlice.js';
import { useDispatch } from 'react-redux';
import { X, Loader2 } from 'lucide-react';

const REASONS = [
  { id: 'mistake', label: 'Ordered by mistake / Changed my mind', badge: 'Quick Refund', desc: 'Instant refund initiated back to your original payment method.' },
  { id: 'timeline', label: 'Delivery time is too long', badge: 'Shipping', desc: 'Need the item sooner than current estimated delivery date.' },
  { id: 'price', label: 'Found a better price / deal elsewhere', badge: 'Price', desc: 'Found another alternative or special discount.' },
  { id: 'address', label: 'Want to change delivery address or phone number', badge: 'Address', desc: 'Need to modify delivery location or recipient details.' },
];

export default function CancelOrderModal({ orderId, onClose }) {
  const dispatch = useDispatch();
  const [selectedReason, setSelectedReason] = useState(REASONS[0].label);
  const [notes, setNotes] = useState('');
  const [cancelOrderMutation, { isLoading }] = useCancelOrderMutation();

  const handleConfirmCancel = async () => {
    try {
      await cancelOrderMutation({
        orderId,
        reason: `${selectedReason}${notes ? ': ' + notes : ''}`,
      }).unwrap();

      dispatch(showToast({ type: 'success', message: 'Order cancelled successfully. Refund initiated.' }));
      onClose();
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to cancel order' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14213D]/70 backdrop-blur-sm animate-in fade-in duration-200 font-['Inter']">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213D] text-[#fca311] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[24px]">cancel</span>
            </div>
            <div>
              <span className="font-['Montserrat'] text-[10px] uppercase tracking-widest text-[#855300] font-bold">
                Order Support
              </span>
              <h3 className="font-['Montserrat'] font-bold text-lg text-[#14213D] uppercase tracking-tight">
                Cancel Order
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6C757D] hover:text-[#14213D] hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Protocol Status Box */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-['Montserrat'] text-xs uppercase font-bold text-emerald-900">
                    Eligible for Full Refund
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[9px] font-['Montserrat'] uppercase bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    100% Guaranteed
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                  Your order is currently processing and hasn't been shipped yet. Your payment will be refunded immediately with zero cancellation charges.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Selector */}
          <div>
            <label className="block font-['Montserrat'] text-xs font-bold text-[#14213D] uppercase tracking-wider mb-2.5">
              Select Reason for Cancellation
            </label>
            <div className="space-y-2">
              {REASONS.map((r) => {
                const isSelected = selectedReason === r.label;
                return (
                  <label
                    key={r.id}
                    onClick={() => setSelectedReason(r.label)}
                    className={`flex items-start p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#14213D] bg-[#F8F9FA] shadow-sm'
                        : 'border-[#E5E5E5] bg-white hover:border-[#14213D]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancellation_reason"
                      checked={isSelected}
                      onChange={() => setSelectedReason(r.label)}
                      className="mt-1 w-4 h-4 text-[#14213D] focus:ring-0 cursor-pointer"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-['Montserrat'] text-xs font-bold text-[#14213D]">
                          {r.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-['Montserrat'] uppercase bg-[#fca311]/20 text-[#14213D] font-bold">
                          {r.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6C757D] mt-0.5 leading-snug">
                        {r.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block font-['Montserrat'] text-xs font-bold text-[#14213D] uppercase tracking-wider mb-2">
              Additional Feedback (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please let us know how we can improve..."
              className="w-full p-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-xl text-xs text-[#14213D] focus:outline-none focus:border-[#fca311] focus:bg-white transition"
            />
          </div>

          {/* Guarantee Checklist */}
          <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-xs text-[#6C757D]">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#855300]">lock_reset</span>
              Zero Cancellation Fee
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#855300]">bolt</span>
              Fast Refund
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#855300]">support_agent</span>
              24/7 Support
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-3 bg-[#F8F9FA] border-t border-[#E5E5E5] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl font-['Montserrat'] text-xs font-bold uppercase tracking-wider text-[#14213D] hover:bg-slate-200/60 transition"
          >
            Don't Cancel
          </button>
          <button
            onClick={handleConfirmCancel}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-['Montserrat'] text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Cancel Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}
