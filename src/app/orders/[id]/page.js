'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOrderByIdQuery } from '../../../redux/services/api.js';
import { showToast } from '../../../redux/slices/cartSlice.js';
import { getSocket, disconnectSocket } from '../../../utils/socket.js';
import { formatPrice, formatDate, getProductImage } from '../../../utils/helpers.js';
import OrderStepper from '../../../components/OrderStepper.js';
import CancelOrderModal from '../../../components/CancelOrderModal.js';
import Link from 'next/link';

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  const { data: orderData, isLoading, refetch } = useGetOrderByIdQuery(id, {
    skip: !isAuthenticated,
  });

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const order = orderData?.data;
  const currentStatus = liveStatus || order?.status;

  // Real-Time Socket.io Connection
  useEffect(() => {
    if (!order?.id) return;

    const socket = getSocket(token);
    if (socket) {
      socket.emit('join_order_room', order.id);
      socket.emit('order:join', { orderId: order.id });

      const handleStatusUpdate = (data) => {
        if (data.orderId === order.id) {
          setLiveStatus(data.status);
          dispatch(showToast({
            type: 'info',
            message: `Live Update: Order status changed to ${data.status}`,
          }));
          refetch();
        }
      };

      socket.on('order:status_updated', handleStatusUpdate);

      return () => {
        socket.emit('leave_order_room', order.id);
        socket.emit('order:leave', { orderId: order.id });
        socket.off('order:status_updated', handleStatusUpdate);
      };
    }
  }, [order?.id, token, dispatch, refetch]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-hairline shadow-sm space-y-4">
          <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          <h2 className="text-xl font-bold font-montserrat text-text-secondary">Sign In Required</h2>
          <p className="text-xs text-text-muted">Please authenticate to view order tracking and consignment details.</p>
          <Link
            href="/login"
            className="block w-full py-3 bg-primary hover:bg-accent-hover text-text-primary font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
          >
            Sign In to Account
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-label-caps text-xs text-text-muted uppercase tracking-wider font-semibold">
            Loading Order Details...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-hairline shadow-sm space-y-4">
          <span className="material-symbols-outlined text-4xl text-rose-500">receipt_long</span>
          <h2 className="text-xl font-bold font-montserrat text-text-secondary">Order Record Not Found</h2>
          <p className="text-xs text-text-muted">The requested order does not exist or you do not have clearance to view it.</p>
          <Link
            href="/orders"
            className="block w-full py-3 bg-text-secondary hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const isCancellable = currentStatus === 'PENDING' || currentStatus === 'CONFIRMED' || currentStatus === 'PROCESSING';

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pb-16 font-inter">
      {/* Top Header Breadcrumb & Status */}
      <section className="bg-white border-b border-hairline py-6 px-4 sm:px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-primary uppercase tracking-wider transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to All Orders
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold uppercase tracking-wider">
                  Live Order Tracking
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-text-secondary tracking-tight uppercase mt-1">
                Order #{order.id.slice(-8).toUpperCase()}
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isCancellable && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs uppercase tracking-wider border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Cancel Order
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider border border-slate-300 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Order Content */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Live Stepper & Items */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Refund & Cancellation Settlement Banner */}
            {currentStatus === 'CANCELLED' && (
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <span className="material-symbols-outlined text-[24px]">currency_exchange</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-montserrat font-bold text-sm text-rose-900 uppercase">
                        Order Cancelled &amp; Full Refund Processed
                      </h4>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[10px] font-bold uppercase">
                        100% Refunded
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      The full amount of <strong className="font-bold text-rose-950">{formatPrice(order.totalAmount || order.total)}</strong> has been credited back to your <strong className="font-bold text-rose-950">Original Payment Source ({order.payment?.paymentMethod || 'Online Payment Method'})</strong>. Reserved catalog items have been restored to available inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Stepper Card */}
            <div className="bg-white p-6 rounded-2xl border border-hairline shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
                <h3 className="font-montserrat text-sm text-text-secondary uppercase font-bold">
                  Order Status &amp; Timeline
                </h3>
                <span className="font-mono text-xs text-text-muted">
                  Placed on: {formatDate(order.createdAt)}
                </span>
              </div>

              <OrderStepper status={currentStatus} />
            </div>

            {/* Items List */}
            <div className="bg-white rounded-2xl border border-hairline shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-hairline">
                <h3 className="font-montserrat text-sm text-text-secondary uppercase font-bold">
                  Order Items ({(order.items || order.orderItems || []).length})
                </h3>
              </div>

              <div className="p-5 flex flex-col divide-y divide-hairline">
                {(order.items || order.orderItems || []).map((item) => {
                  const title = item.productTitle || item.variant?.product?.title || item.product?.title || 'Physical Asset';
                  const variantName = item.variantTitle || item.variant?.title || 'Standard Unit';
                  const sku = item.variant?.sku || (item.variantId ? item.variantId.slice(0, 8).toUpperCase() : 'AV-1001');
                  const category = item.variant?.product?.category || item.category || 'Curated Category';
                  const imageUrl = getProductImage(title, item.variant?.product?.imageUrl || item.imageUrl);
                  const unitPrice = Number(item.price || item.variant?.price || 0);

                  return (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-16 h-16 bg-slate-50 rounded-xl border border-hairline p-1 flex items-center justify-center shrink-0">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-label-caps text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                            {category}
                          </span>
                          <h4 className="font-montserrat text-sm text-text-secondary font-bold truncate">
                            {title}
                          </h4>
                          <p className="font-mono text-xs text-slate-500 mt-0.5">
                            SKU: #{sku} • {variantName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block font-label-caps text-[11px] text-slate-400 font-semibold">
                          QTY: {item.quantity}
                        </span>
                        <span className="font-mono font-bold text-text-secondary text-sm">
                          {formatPrice(unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Shipping & Payment Details */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Shipping Details */}
            <div className="bg-white p-6 rounded-2xl border border-hairline shadow-xs flex flex-col gap-4">
              <h3 className="font-montserrat text-xs uppercase tracking-wider text-text-secondary font-bold pb-3 border-b border-hairline">
                Shipping &amp; Delivery Details
              </h3>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <span className="block font-label-caps text-[10px] text-slate-400 uppercase font-semibold">
                    Order Tracking ID
                  </span>
                  <span className="font-mono font-bold text-text-secondary text-xs">
                    #TRK-IND-{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <div>
                  <span className="block font-label-caps text-[10px] text-slate-400 uppercase font-semibold">
                    Courier Partner
                  </span>
                  <span className="font-inter font-semibold text-text-secondary flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-600">local_shipping</span>
                    Blue Dart Express / Sequel Logistics
                  </span>
                </div>

                <div>
                  <span className="block font-label-caps text-[10px] text-slate-400 uppercase font-semibold">
                    Shipping Address
                  </span>
                  <p className="font-inter text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {order.shippingAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Settlement Summary */}
            <div className="bg-white p-6 rounded-2xl border border-hairline shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <h3 className="font-montserrat text-xs uppercase tracking-wider text-text-secondary font-bold">
                  Payment &amp; Settlement Details
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  currentStatus === 'CANCELLED' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {currentStatus === 'CANCELLED' ? 'Refund Processed' : (order.payment?.status || 'Paid')}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-text-secondary font-mono">{formatPrice(Number(order.subtotal || order.totalAmount))}</span>
                </div>

                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount Applied {order.coupon?.code ? `(${order.coupon.code})` : ''}</span>
                    <span>-{formatPrice(Number(order.discountAmount))}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Express Insured Courier</span>
                  <span className="font-semibold text-emerald-600">Complimentary</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Payment Method</span>
                  <span className="font-semibold text-slate-800">
                    {order.payment?.paymentMethod === 'CARD' ? 'Credit / Debit Card' : 
                     order.payment?.paymentMethod === 'UPI' ? 'UPI Instant Settlement' : 
                     order.payment?.paymentMethod || 'Online Gateway'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Transaction ID</span>
                  <span className="font-mono font-bold text-slate-700 text-[11px]">
                    {order.payment?.transactionId || `TXN-${order.id.slice(0, 10).toUpperCase()}`}
                  </span>
                </div>

                {/* If Cancelled & Refunded, show Refund Ledger info */}
                {currentStatus === 'CANCELLED' && (
                  <div className="mt-1 pt-2.5 border-t border-dashed border-rose-200 flex flex-col gap-1.5 bg-rose-50/50 p-2.5 rounded-lg">
                    <div className="flex justify-between text-rose-800 font-bold text-[11px]">
                      <span>Refund Status</span>
                      <span className="uppercase text-emerald-700">Completed (Settled)</span>
                    </div>
                    <div className="flex justify-between text-rose-700 text-[11px]">
                      <span>Refund Destination</span>
                      <span>Original Payment Source</span>
                    </div>
                    <div className="flex justify-between text-rose-700 text-[11px]">
                      <span>Refund Reference</span>
                      <span className="font-mono font-bold">{order.refund?.id ? `REF-${order.refund.id.slice(0, 8).toUpperCase()}` : `REF-${order.id.slice(0, 8).toUpperCase()}`}</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-hairline flex justify-between items-baseline">
                  <span className="font-montserrat text-xs uppercase text-text-secondary font-bold">
                    {currentStatus === 'CANCELLED' ? 'Total Amount Refunded' : 'Total Amount Paid'}
                  </span>
                  <span className={`font-montserrat text-xl font-extrabold font-mono ${
                    currentStatus === 'CANCELLED' ? 'text-rose-700 line-through decoration-rose-400' : 'text-slate-900'
                  }`}>
                    {formatPrice(Number(order.totalAmount))}
                  </span>
                </div>

                {currentStatus === 'CANCELLED' && (
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-700 font-bold">
                      ✓ ₹{Number(order.totalAmount).toLocaleString('en-IN')} returned to buyer account
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <CancelOrderModal
          orderId={order.id}
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onSuccess={() => {
            setIsCancelModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
