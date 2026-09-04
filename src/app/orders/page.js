'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/slices/authSlice.js';
import { showToast } from '../../redux/slices/cartSlice.js';
import { useGetOrdersQuery, useLoginMutation } from '../../redux/services/api.js';
import { formatPrice, formatDate, getProductImage } from '../../utils/helpers.js';
import { getSocket } from '../../utils/socket.js';

export default function OrderHistoryPage() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();

  const handleQuickDemoLogin = async () => {
    try {
      const res = await loginMutation({
        email: 'customer@specbee.com',
        password: 'Password@123',
      }).unwrap();
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Signed in as Customer' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Sign in failed' }));
    }
  };

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: ordersData, isLoading, refetch } = useGetOrdersQuery(
    statusFilter === 'ALL' ? undefined : { status: statusFilter },
    { skip: !isAuthenticated }
  );

  const orders = ordersData?.data || [];

  // Real-time socket updates on orders list
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (socket) {
      const handleUpdate = (data) => {
        refetch();
        dispatch(showToast({
          type: 'info',
          message: `Order #${data.orderNumber || ''} status updated to ${data.status}`,
        }));
      };
      socket.on('order:status_updated', handleUpdate);
      return () => {
        socket.off('order:status_updated', handleUpdate);
      };
    }
  }, [token, refetch, dispatch]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-hairline shadow-sm space-y-4">
          <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          <h2 className="text-xl font-bold font-montserrat text-text-secondary">Sign In to View Orders</h2>
          <p className="text-xs text-text-muted">Sign in to track active orders, inspect shipments, and view past invoices.</p>
          <div className="space-y-3 pt-2">
            <button
              onClick={handleQuickDemoLogin}
              disabled={isLoggingIn}
              className="w-full py-3 bg-primary hover:bg-accent-hover text-text-primary font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In as Customer'}
            </button>
            <Link
              href="/login"
              className="block w-full py-3 bg-surface-subtle hover:bg-slate-200 text-text-secondary font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
            >
              Manual Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pb-16 font-inter">
      {/* Header Banner */}
      <section className="bg-white border-b border-hairline py-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold uppercase tracking-wider">
              Your Account
            </span>
          </div>
          <h1 className="font-montserrat text-3xl font-bold text-text-secondary tracking-tight uppercase mt-1">
            My Orders
          </h1>
          <p className="font-body-md text-xs text-text-muted mt-1">
            Track, view, and manage your placed orders and delivery status.
          </p>

          {/* Status Filters */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
            {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-text-secondary text-white shadow-xs'
                    : 'bg-surface-subtle text-text-muted hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'ALL ORDERS' : st}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Orders List */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-label-caps text-xs text-text-muted uppercase tracking-wider font-semibold">
              Loading Orders...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-hairline p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
            <div className="w-16 h-16 bg-surface-subtle text-text-muted rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">shopping_bag</span>
            </div>
            <h3 className="font-montserrat text-lg font-bold text-text-secondary uppercase">No Orders Found</h3>
            <p className="text-xs text-text-muted">
              {statusFilter === 'ALL'
                ? "You haven't placed any orders yet. Browse our curated catalog to make your first purchase."
                : `No orders found with status "${statusFilter}".`}
            </p>
            <Link
              href="/products"
              className="inline-block px-6 py-2.5 bg-primary hover:bg-accent-hover text-text-primary font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map((order) => {
              const items = order.items || order.orderItems || [];
              const statusColor =
                order.status === 'DELIVERED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : order.status === 'SHIPPED'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : order.status === 'PROCESSING'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : order.status === 'CANCELLED'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-50 text-slate-800 border-slate-200';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-hairline shadow-xs overflow-hidden hover:border-slate-300 transition-all"
                >
                  {/* Order Header */}
                  <div className="p-4 sm:p-5 bg-surface-subtle/60 border-b border-hairline flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6 text-xs">
                      <div>
                        <span className="block font-label-caps text-[10px] text-text-muted uppercase font-semibold">
                          Order #
                        </span>
                        <span className="font-mono font-bold text-text-secondary text-xs">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="block font-label-caps text-[10px] text-text-muted uppercase font-semibold">
                          Order Date
                        </span>
                        <span className="font-inter font-medium text-text-secondary text-xs">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="block font-label-caps text-[10px] text-text-muted uppercase font-semibold">
                          Delivery Method
                        </span>
                        <span className="font-inter font-medium text-text-secondary flex items-center gap-1 text-xs">
                          <span className="material-symbols-outlined text-[15px] text-primary">local_shipping</span>
                          Express Delivery
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusColor} flex items-center gap-1.5`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 sm:p-5 flex flex-col divide-y divide-hairline">
                    {items.map((item) => {
                      const title = item.productTitle || item.variant?.product?.title || item.product?.title || 'Product';
                      const variantName = item.variantTitle || item.variant?.title || 'Standard Lot';
                      const sku = item.variant?.sku || (item.variantId ? item.variantId.slice(0, 8).toUpperCase() : 'AV-1001');
                      const imageUrl = getProductImage(title, item.variant?.product?.imageUrl || item.imageUrl);
                      const unitPrice = Number(item.price || item.variant?.price || 0);

                      return (
                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 bg-surface-subtle rounded-xl border border-hairline p-1 flex items-center justify-center shrink-0">
                              <img
                                src={imageUrl}
                                alt={title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-montserrat text-xs sm:text-sm text-text-secondary font-bold truncate">
                                {title}
                              </h4>
                              <p className="font-mono text-[11px] text-text-muted mt-0.5">
                                SKU: #{sku} • {variantName}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="block font-label-caps text-[10px] text-text-muted font-semibold">
                              QTY: {item.quantity}
                            </span>
                            <span className="font-mono font-bold text-text-secondary text-xs sm:text-sm">
                              {formatPrice(unitPrice * item.quantity)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Footer Actions */}
                  <div className="p-4 sm:p-5 bg-surface-subtle/30 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-label-caps text-[11px] text-text-muted uppercase font-bold">
                        Total Amount:
                      </span>
                      <span className="font-montserrat text-lg font-bold text-text-secondary font-mono">
                        {formatPrice(Number(order.totalAmount))}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-4 py-2 bg-text-secondary hover:bg-slate-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>Track Order &amp; Details</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
