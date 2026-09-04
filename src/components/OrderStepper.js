'use client';

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: 'receipt_long', desc: 'Order received & confirmed' },
  { key: 'PROCESSING', label: 'Processing', icon: 'inventory_2', desc: 'Preparing package' },
  { key: 'SHIPPED', label: 'Shipped', icon: 'local_shipping', desc: 'In transit with courier' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'check_circle', desc: 'Successfully delivered' },
];

export default function OrderStepper({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800">
        <span className="material-symbols-outlined text-rose-600 text-[24px]">cancel</span>
        <div>
          <h4 className="font-montserrat text-xs uppercase font-bold text-rose-900">Order Cancelled</h4>
          <p className="text-xs text-rose-700">This order has been cancelled and refunded.</p>
        </div>
      </div>
    );
  }

  const getStepIndex = (st) => {
    switch (st) {
      case 'PENDING':
      case 'CONFIRMED':
        return 0;
      case 'PROCESSING':
        return 1;
      case 'SHIPPED':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="w-full py-4 font-inter">
      <div className="relative flex items-center justify-between">
        {/* Track Line Background */}
        <div className="absolute top-5 left-12 right-12 h-1 bg-slate-200 -translate-y-1/2 z-0" />
        {/* Track Line Active */}
        <div 
          className="absolute top-5 left-12 h-1 bg-amber-500 -translate-y-1/2 z-0 transition-all duration-700"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 82}%` }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  isDone
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : isCurrent
                    ? 'bg-white text-slate-900 ring-4 ring-amber-500/20 border-2 border-amber-500 shadow-md'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {isDone ? (
                  <span className="material-symbols-outlined text-[20px] text-slate-950 font-bold">check</span>
                ) : (
                  <span className={`material-symbols-outlined text-[18px] ${isCurrent ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {step.icon}
                  </span>
                )}
              </div>

              <div className="text-center mt-2.5">
                <p className={`font-montserrat text-xs uppercase font-bold tracking-wider ${
                  isCurrent ? 'text-amber-600' : isDone ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-500 hidden sm:block max-w-[120px] leading-tight mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
