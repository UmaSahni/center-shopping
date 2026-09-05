'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  useValidateCouponMutation,
  useLoginMutation,
} from '../../redux/services/api.js';
import { setCredentials } from '../../redux/slices/authSlice.js';
import { setActiveCoupon, removeActiveCoupon, showToast } from '../../redux/slices/cartSlice.js';
import { formatPrice } from '../../utils/helpers.js';

export default function CartPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const activeCoupon = useSelector((state) => state.cart.activeCoupon);

  // Countdown timer for session lock (14m 28s)
  const [timeLeft, setTimeLeft] = useState(14 * 60 + 28);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 1-Click Demo Login
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();
  const handleQuickDemoLogin = async () => {
    try {
      const res = await loginMutation({
        email: 'customer@gmail.com',
        password: 'Password@123',
      }).unwrap();
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Welcome back, John Doe!' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Demo access failed' }));
    }
  };

  // Cart API
  const { data: cartData, isLoading, refetch } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeCartItem, { isLoading: isRemoving }] = useRemoveCartItemMutation();
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();
  const [validateCoupon, { isLoading: isValidatingCoupon }] = useValidateCouponMutation();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const cart = cartData?.data || cartData || null;
  const items = cart?.items || [];

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.variant?.price || 0);
    return sum + price * item.quantity;
  }, 0);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Free courier delivery threshold (₹999)
  const freeShippingThreshold = 999;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  // Concession calculation
  let discountAmount = 0;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * activeCoupon.discountValue) / 100;
    } else {
      discountAmount = Math.min(subtotal, activeCoupon.discountValue);
    }
  }

  const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 99;
  const taxAmount = Math.round((subtotal - discountAmount) * 0.03);
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee + taxAmount);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');

    try {
      const res = await validateCoupon({
        code: couponInput.trim().toUpperCase(),
        cartTotal: subtotal,
      }).unwrap();
      const couponObj = res.data?.coupon || res.coupon || res.data;
      dispatch(setActiveCoupon(couponObj));
      dispatch(showToast({ type: 'success', message: `Coupon "${couponObj.code}" applied successfully!` }));
      setCouponInput('');
    } catch (err) {
      setCouponError(err?.data?.message || 'Invalid or expired coupon code');
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Invalid coupon code' }));
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeActiveCoupon());
    dispatch(showToast({ type: 'info', message: 'Coupon removed' }));
  };

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    try {
      await updateCartItem({ itemId, quantity: newQty }).unwrap();
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Update failed' }));
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removeCartItem(itemId).unwrap();
      dispatch(showToast({ type: 'info', message: 'Item removed from cart' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Removal failed' }));
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to remove all items from your cart?')) return;
    try {
      await clearCart().unwrap();
      dispatch(showToast({ type: 'info', message: 'Cart cleared' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: 'Failed to clear cart' }));
    }
  };

  // Unauthenticated State with 1-Click Demo Sign-in
  if (!isAuthenticated) {
    return (
      <div className="w-full bg-[#f9f9f9] min-h-screen pb-20 pt-8">
        {/* Progress Header Banner */}
        <section className="w-full bg-[#F8F9FA] border-b border-[#E5E5E5] py-8">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
            <nav className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <ol className="flex items-center gap-2 sm:gap-3 text-xs">
                <li className="flex items-center gap-2 text-[#14213D]">
                  <span className="w-6 h-6 rounded-full bg-[#14213D] text-white font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                  <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#14213D] font-bold">Shopping Cart</span>
                </li>
                <span className="material-symbols-outlined text-[#867461] text-[18px]">chevron_right</span>
                <li className="flex items-center gap-2 text-[#6C757D]">
                  <span className="w-6 h-6 rounded-full bg-[#e8e8e8] text-[#6C757D] font-mono text-[11px] flex items-center justify-center font-semibold">2</span>
                  <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#6C757D]">Shipping Details</span>
                </li>
                <span className="material-symbols-outlined text-[#867461] text-[18px]">chevron_right</span>
                <li className="flex items-center gap-2 text-[#6C757D]">
                  <span className="w-6 h-6 rounded-full bg-[#e8e8e8] text-[#6C757D] font-mono text-[11px] flex items-center justify-center font-semibold">3</span>
                  <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#6C757D]">Payment</span>
                </li>
              </ol>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-[#E5E5E5] text-[#14213D]">
                <span className="material-symbols-outlined text-[#fca311] text-[18px] animate-pulse">timer</span>
                <span className="font-['Inter'] text-xs font-semibold">Session Timer:</span>
                <span className="font-mono text-xs font-bold tracking-widest text-[#855300]">{formatTimer(timeLeft)}</span>
              </div>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="font-['Montserrat'] text-xs uppercase tracking-widest text-[#855300] font-bold">Center Shopping</span>
                <h1 className="font-['Montserrat'] text-3xl sm:text-4xl font-extrabold text-[#14213D] uppercase tracking-tight mt-1">Shopping Cart</h1>
                <p className="font-['Inter'] text-sm text-[#6C757D] mt-1">Please sign in to view and manage your shopping cart items.</p>
              </div>
              <div className="flex items-center gap-2 text-[#6C757D] text-xs font-mono">
                <span className="material-symbols-outlined text-[18px] text-[#14213D]">shield_lock</span>
                <span>Ref: <strong className="text-[#14213D]">#CS-884</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* Access Gateway Card */}
        <div className="max-w-xl mx-auto px-4 mt-12">
          <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xl p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#fca311]/10 rounded-full blur-2xl"></div>

            <div className="w-16 h-16 rounded-2xl bg-[#14213D] text-[#fca311] flex items-center justify-center mx-auto mb-6 shadow-md">
              <span className="material-symbols-outlined text-[32px]">shopping_bag</span>
            </div>

            <h2 className="font-['Montserrat'] text-2xl font-bold text-[#14213D] uppercase tracking-tight">
              Sign In to View Your Cart
            </h2>
            <p className="font-['Inter'] text-sm text-[#6C757D] mt-2 max-w-md mx-auto leading-relaxed">
              Your selected items are saved in your account. Sign in to review your cart, apply discount coupons, and proceed to checkout.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={isLoggingIn}
                className="w-full py-3.5 px-6 rounded-xl bg-[#fca311] hover:bg-[#E08F07] text-[#000000] font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                <span>{isLoggingIn ? 'Signing In...' : 'Quick Demo Sign-In (Customer)'}</span>
              </button>

              <Link
                href="/login"
                className="w-full py-3.5 px-6 rounded-xl bg-[#14213D] hover:bg-black text-white font-['Montserrat'] text-xs uppercase font-bold tracking-wider transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Sign In with Email</span>
                <span className="material-symbols-outlined text-[18px]">login</span>
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E5E5E5] flex items-center justify-center gap-4 text-xs text-[#6C757D]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#fca311]">lock</span>
                256-Bit SSL Secure
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#fca311]">security</span>
                100% Safe Checkout
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f9f9f9] min-h-screen pb-20">
      {/* Progress Header Banner */}
      <section className="w-full bg-[#F8F9FA] border-b border-[#E5E5E5] py-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          {/* Stepper / Breadcrumbs */}
          <nav aria-label="Checkout Progress" className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <ol className="flex items-center gap-2 sm:gap-3 text-xs">
              <li className="flex items-center gap-2 text-[#14213D]">
                <span className="w-6 h-6 rounded-full bg-[#14213D] text-white font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#14213D] font-bold">Shopping Cart</span>
              </li>
              <span className="material-symbols-outlined text-[#867461] text-[18px]">chevron_right</span>
              <li className="flex items-center gap-2 text-[#6C757D]">
                <span className="w-6 h-6 rounded-full bg-[#e8e8e8] text-[#6C757D] font-mono text-[11px] flex items-center justify-center font-semibold">2</span>
                <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#6C757D]">Shipping Details</span>
              </li>
              <span className="material-symbols-outlined text-[#867461] text-[18px]">chevron_right</span>
              <li className="flex items-center gap-2 text-[#6C757D]">
                <span className="w-6 h-6 rounded-full bg-[#e8e8e8] text-[#6C757D] font-mono text-[11px] flex items-center justify-center font-semibold">3</span>
                <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#6C757D]">Payment</span>
              </li>
            </ol>

            {/* Session Timer Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-[#E5E5E5] text-[#14213D]">
              <span className="material-symbols-outlined text-[#fca311] text-[18px] animate-pulse">timer</span>
              <span className="font-['Inter'] text-xs font-semibold">Items Reserved:</span>
              <span className="font-mono text-xs font-bold tracking-widest text-[#855300]">{formatTimer(timeLeft)}</span>
            </div>
          </nav>

          {/* Section Title & Meta Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-['Montserrat'] text-xs uppercase tracking-widest text-[#855300] font-bold">Center Shopping</span>
              <h1 className="font-['Montserrat'] text-3xl sm:text-4xl font-extrabold text-[#14213D] uppercase tracking-tight mt-1">Your Shopping Cart</h1>
              <p className="font-['Inter'] text-sm text-[#6C757D] mt-1">
                {items.length === 0
                  ? 'No items currently in your cart.'
                  : `${items.length} item${items.length > 1 ? 's' : ''} ready for checkout`}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[#6C757D] text-xs font-mono">
              <span className="material-symbols-outlined text-[18px] text-[#14213D]">shopping_bag</span>
              <span>Cart Ref: <strong className="text-[#14213D] font-mono">#CS-884</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Stage: 65% Items | 35% Sticky Sidebar */}
      <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-12 py-10">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#F8F9FA] text-[#867461] flex items-center justify-center mx-auto mb-4 border border-[#E5E5E5]">
              <span className="material-symbols-outlined text-[32px]">shopping_bag</span>
            </div>
            <h3 className="font-['Montserrat'] text-xl font-bold text-[#14213D] uppercase">Your Shopping Cart is Empty</h3>
            <p className="font-['Inter'] text-sm text-[#6C757D] mt-2 max-w-md mx-auto">
              Explore our wide range of quality products and top deals.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="px-6 py-3 rounded-lg bg-[#fca311] hover:bg-[#E08F07] text-[#000000] font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-sm"
              >
                Browse Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: 65% (8/12 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Urgency / Courier Delivery Progress Tier */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#fca311] text-[24px]">local_shipping</span>
                    <p className="font-['Inter'] text-sm text-[#14213D]">
                      {subtotal >= freeShippingThreshold ? (
                        <>You have unlocked complimentary <span className="font-semibold text-[#14213D]">Free Express Delivery</span>.</>
                      ) : (
                        <>You're <strong className="text-black font-semibold">{formatPrice(amountToFreeShipping)}</strong> away from unlocking complimentary <span className="font-semibold text-[#14213D]">Free Express Delivery</span>.</>
                      )}
                    </p>
                  </div>
                  <span className="font-['Montserrat'] text-xs uppercase tracking-wider text-[#855300] font-bold whitespace-nowrap">
                    {progressPercent}% Qualified
                  </span>
                </div>

                {/* Visual Progress Track */}
                <div className="w-full h-2 bg-[#eeeeee] rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-[#fca311] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[#6C757D] text-xs mt-2">
                  <span>{formatPrice(subtotal)} Current</span>
                  <span className="text-[#14213D] font-medium">Free Delivery at ₹999</span>
                </div>
              </div>

              {/* Cart Table / Item List Container */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
                {/* Column Headers (Desktop) */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-[#F8F9FA] border-b border-[#E5E5E5] text-[#6C757D] font-['Montserrat'] text-[11px] uppercase tracking-wider font-semibold">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2">Variant</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Items Container */}
                <div className="flex flex-col divide-y divide-[#E5E5E5]/60">
                  {items.map((item) => {
                    const product = item.variant?.product || {};
                    const variant = item.variant || {};
                    const unitPrice = Number(variant.price || 0);
                    const itemSubtotal = unitPrice * item.quantity;
                    const stock = variant.stockQuantity ?? 10;
                    const isLowStock = stock <= 2;

                    return (
                      <div key={item.id} className="p-6 flex flex-col gap-4 transition-colors hover:bg-[#F8F9FA]/60">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* Product Image & Meta */}
                          <div className="md:col-span-5 flex items-center gap-4">
                            <div className="relative w-20 h-24 sm:w-24 sm:h-28 flex-shrink-0 bg-[#F8F9FA] rounded-lg overflow-hidden border border-[#E5E5E5]">
                              <img
                                src={product.imageUrl || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600'}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 left-1 bg-[#14213D] text-white font-['Montserrat'] text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase shadow-sm">
                                100% Genuine
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-['Montserrat'] text-[10px] uppercase tracking-widest text-[#6C757D] font-bold">
                                {product.category || 'Product'}
                              </span>
                              <Link
                                href={`/product/${product.slug || ''}`}
                                className="font-['Montserrat'] text-[15px] sm:text-[16px] text-[#14213D] uppercase font-bold tracking-tight truncate hover:text-[#855300] transition-colors mt-0.5"
                              >
                                {product.title}
                              </Link>
                              <p className="font-mono text-xs text-[#6C757D] mt-0.5">SKU: #{variant.sku || 'CS-8842'}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="font-['Inter'] text-xs text-[#14213D] font-semibold">In Stock</span>
                              </div>
                            </div>
                          </div>

                          {/* Variant Info */}
                          <div className="md:col-span-2 flex flex-col justify-center">
                            <span className="md:hidden font-['Montserrat'] text-[10px] uppercase text-[#6C757D]">Variant:</span>
                            <span className="font-['Inter'] text-xs font-semibold text-[#14213D]">{variant.title || 'Standard'}</span>
                            <span className="font-['Inter'] text-[11px] text-emerald-600 font-medium">Ready to Ship</span>
                          </div>

                          {/* Price */}
                          <div className="md:col-span-2 md:text-right flex items-baseline md:flex-col justify-between md:justify-center">
                            <span className="md:hidden font-['Montserrat'] text-[10px] uppercase text-[#6C757D]">Unit:</span>
                            <span className="font-['Inter'] text-sm font-semibold text-[#14213D]">{formatPrice(unitPrice)}</span>
                          </div>

                          {/* Stepper */}
                          <div className="md:col-span-1 flex justify-start md:justify-center items-center">
                            <div className="inline-flex items-center rounded-lg bg-[#F8F9FA] border border-[#E5E5E5] p-0.5">
                              <button
                                aria-label="Decrease quantity"
                                onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center text-[#14213D] hover:bg-[#eeeeee] rounded transition-colors text-sm font-bold"
                                type="button"
                              >
                                −
                              </button>
                              <span className="w-7 text-center font-mono text-xs font-bold text-[#14213D]">{item.quantity}</span>
                              <button
                                aria-label="Increase quantity"
                                onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                disabled={item.quantity >= stock}
                                className="w-7 h-7 flex items-center justify-center text-[#14213D] hover:bg-[#eeeeee] rounded transition-colors text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Subtotal & Actions */}
                          <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                            <div className="text-right">
                              <span className="md:hidden font-['Montserrat'] text-[10px] uppercase text-[#6C757D] mr-1">Subtotal:</span>
                              <span className="font-['Montserrat'] text-base text-[#14213D] font-bold">{formatPrice(itemSubtotal)}</span>
                            </div>
                            <button
                              aria-label="Remove item"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1.5 text-[#6C757D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete_outline</span>
                            </button>
                          </div>
                        </div>

                        {/* Low Stock Notice Banner */}
                        {isLowStock && (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#fca311]/15 text-[#14213D] border border-[#fca311]/30">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#855300] text-[20px]">warning</span>
                              <p className="font-['Inter'] text-xs">
                                <strong>Only {stock} left in stock</strong> — Order now to secure yours before it sells out!
                              </p>
                            </div>
                            <span className="font-['Montserrat'] text-[10px] uppercase text-[#855300] font-bold shrink-0">Limited Stock</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Row Navigation Inside Cart Table */}
                <div className="p-6 bg-[#F8F9FA] border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 font-['Montserrat'] text-xs uppercase tracking-wider text-[#14213D] hover:text-[#855300] transition-colors font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Continue Shopping</span>
                  </Link>
                  <button
                    onClick={handleClearCart}
                    className="text-[#6C757D] hover:text-rose-600 font-['Montserrat'] text-xs uppercase tracking-wider transition-colors font-medium"
                    type="button"
                  >
                    Clear Entire Cart
                  </button>
                </div>
              </div>

              {/* Promo Code Console & Applied Concession */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block font-['Montserrat'] text-xs uppercase tracking-wider text-[#14213D] font-bold mb-2">
                      Have a Coupon or Promo Code?
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined text-[#867461] absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">loyalty</span>
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Enter coupon code (e.g. SAVE10)..."
                          className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] rounded-lg text-[#14213D] font-['Inter'] text-xs border border-[#E5E5E5] focus:outline-none focus:bg-white focus:border-[#fca311]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        className="bg-[#14213D] text-white px-5 py-2.5 rounded-lg font-['Montserrat'] text-xs uppercase tracking-wider hover:bg-black transition-colors font-bold disabled:opacity-40"
                      >
                        {isValidatingCoupon ? 'Validating...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-rose-600 text-xs mt-1.5">{couponError}</p>}
                  </div>

                  {/* Active Concession Pill */}
                  {activeCoupon && (
                    <div className="flex flex-col md:items-end justify-center">
                      <span className="font-['Montserrat'] text-[10px] uppercase text-[#6C757D] mb-1">Coupon Applied</span>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#fca311]/20 text-[#14213D] border border-[#fca311]/40">
                        <span className="material-symbols-outlined text-[#855300] text-[18px]">sell</span>
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#14213D]">{activeCoupon.code}</span>
                        <span className="font-['Inter'] text-xs text-[#855300] font-semibold">
                          ({activeCoupon.discountType === 'PERCENTAGE' ? `-${activeCoupon.discountValue}% Off` : `-${formatPrice(activeCoupon.discountValue)}`})
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-[#14213D] hover:text-rose-600 ml-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust & Value Proposition Mini-Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-[#E5E5E5] shadow-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#fca311] text-[24px] mt-0.5">assignment_return</span>
                  <div>
                    <h4 className="font-['Montserrat'] text-xs uppercase text-[#14213D] font-bold">7-Day Easy Returns</h4>
                    <p className="font-['Inter'] text-xs text-[#6C757D] mt-1 leading-snug">
                      Hassle-free 7-day replacement or refund policy.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-[#E5E5E5] shadow-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#fca311] text-[24px] mt-0.5">shield_with_heart</span>
                  <div>
                    <h4 className="font-['Montserrat'] text-xs uppercase text-[#14213D] font-bold">100% Secure Payments</h4>
                    <p className="font-['Inter'] text-xs text-[#6C757D] mt-1 leading-snug">
                      Encrypted payments with zero transaction risk.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-[#E5E5E5] shadow-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#fca311] text-[24px] mt-0.5">verified</span>
                  <div>
                    <h4 className="font-['Montserrat'] text-xs uppercase text-[#14213D] font-bold">Authentic Products</h4>
                    <p className="font-['Inter'] text-xs text-[#6C757D] mt-1 leading-snug">
                      100% genuine products with manufacturer warranty and GST invoice.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 35% (4/12 Columns) - Sticky Order Summary */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">
              <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-md p-6 flex flex-col gap-6">
                {/* Summary Header */}
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
                  <h2 className="font-['Montserrat'] text-lg text-[#14213D] uppercase tracking-tight font-bold">Order Summary</h2>
                  <span className="font-['Montserrat'] text-[10px] uppercase tracking-wider bg-[#F8F9FA] px-2.5 py-1 rounded-full text-[#6C757D] font-bold border border-[#E5E5E5]">
                    {items.length} Item{items.length > 1 ? 's' : ''} ({totalItemsCount} Unit{totalItemsCount > 1 ? 's' : ''})
                  </span>
                </div>

                {/* Price Ledger Breakdown */}
                <div className="flex flex-col gap-3 font-['Inter'] text-sm">
                  <div className="flex justify-between items-center text-[#6C757D]">
                    <span>Items Subtotal</span>
                    <span className="text-[#14213D] font-medium font-mono">{formatPrice(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[#855300] font-medium">
                      <span className="flex items-center gap-1">
                        <span>Coupon Discount</span>
                        <span className="font-['Montserrat'] text-[10px] bg-[#fca311]/20 text-[#14213D] px-1.5 py-0.5 rounded font-bold">
                          {activeCoupon?.code}
                        </span>
                      </span>
                      <span className="font-mono">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[#6C757D]">
                    <span className="flex items-center gap-1">
                      <span>Delivery Charges</span>
                      <span className="material-symbols-outlined text-[#867461] text-[16px]" title="Standard courier delivery">info</span>
                    </span>
                    <span className="text-[#14213D] font-medium font-mono">
                      {shippingFee === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : formatPrice(shippingFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#6C757D]">
                    <span className="flex items-center gap-1">
                      <span>GST (Goods &amp; Services Tax)</span>
                      <span className="material-symbols-outlined text-[#867461] text-[16px]" title="Applicable GST included">info</span>
                    </span>
                    <span className="text-[#14213D] font-medium font-mono">{formatPrice(taxAmount)}</span>
                  </div>

                  {/* Divider */}
                  <div className="w-full h-px bg-[#E5E5E5] my-1"></div>

                  {/* Grand Total */}
                  <div className="flex justify-between items-baseline pt-1">
                    <div>
                      <span className="font-['Montserrat'] text-base text-[#14213D] uppercase font-bold tracking-tight">Total Amount</span>
                      <p className="font-mono text-[11px] text-[#6C757D]">INR (₹)</p>
                    </div>
                    <div className="text-right">
                      <span className="font-['Montserrat'] text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213D] font-mono">
                        {formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>
                  <p className="font-['Inter'] text-xs text-[#6C757D] leading-relaxed">
                    Includes all applicable taxes, GST, and doorstep delivery.
                  </p>
                </div>

                {/* Sticky Action Button */}
                <div className="flex flex-col gap-3">
                  <Link
                    href="/checkout"
                    className="w-full py-4 px-6 rounded-xl bg-[#fca311] hover:bg-[#E08F07] text-[#000000] font-['Montserrat'] text-xs uppercase tracking-wider font-extrabold text-center flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-0.5"
                  >
                    <span>Proceed to Checkout</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>

                  {/* Instant Checkout / Dividers */}
                  <div className="relative flex items-center justify-center my-1">
                    <div className="w-full h-px bg-[#E5E5E5]"></div>
                    <span className="absolute bg-white px-3 font-['Montserrat'] text-[10px] uppercase tracking-widest text-[#6C757D]">
                      Or Pay With UPI
                    </span>
                  </div>

                  {/* Quick Digital Wallets */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => router.push('/checkout')}
                      className="w-full py-2.5 px-3 rounded-lg bg-black text-white hover:bg-[#14213D] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-xs font-semibold"
                    >
                      <span className="font-['Montserrat'] font-bold">BHIM UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/checkout')}
                      className="w-full py-2.5 px-3 rounded-lg bg-white border border-[#E5E5E5] text-[#14213D] shadow-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
                    >
                      <span className="font-['Montserrat'] font-bold">PhonePe / GPay</span>
                    </button>
                  </div>
                </div>

                {/* Institutional Clearance Seals */}
                <div className="bg-[#F8F9FA] rounded-lg p-3 border border-[#E5E5E5] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[#6C757D]">
                    <span className="font-['Montserrat'] text-[10px] uppercase tracking-wider font-semibold">100% Safe Payments</span>
                    <span className="material-symbols-outlined text-[16px] text-[#14213D]">verified_user</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 items-center opacity-80 pt-1">
                    <div className="h-6 bg-white border border-[#E5E5E5] rounded flex items-center justify-center font-mono text-[9px] font-bold text-[#14213D]">VISA</div>
                    <div className="h-6 bg-white border border-[#E5E5E5] rounded flex items-center justify-center font-mono text-[9px] font-bold text-[#14213D]">UPI</div>
                    <div className="h-6 bg-white border border-[#E5E5E5] rounded flex items-center justify-center font-mono text-[9px] font-bold text-[#14213D]">RuPay</div>
                    <div className="h-6 bg-white border border-[#E5E5E5] rounded flex items-center justify-center font-mono text-[9px] font-bold text-[#14213D]">256-SSL</div>
                  </div>
                  <p className="font-['Inter'] text-[11px] text-[#6C757D] leading-snug">
                    Protected by 256-bit SSL encryption. All orders are delivered securely across India.
                  </p>
                </div>
              </div>

              {/* Support Card */}
              <div className="bg-[#14213D] text-white rounded-xl p-6 shadow-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#fca311] text-[24px]">support_agent</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-['Montserrat'] text-[11px] uppercase tracking-wider text-[#fca311] font-bold">Need Help?</span>
                  <p className="font-['Inter'] text-xs text-white/80 mt-0.5">Have questions about your order, delivery or payments? Call 1800-123-9876 or chat with us.</p>
                  <a href="mailto:support@centershopping.in" className="font-['Montserrat'] text-[11px] uppercase text-white hover:text-[#fca311] font-semibold mt-2 transition-colors underline">
                    Contact Customer Support →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
