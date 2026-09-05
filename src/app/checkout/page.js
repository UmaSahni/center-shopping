'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { useGetCartQuery, useCheckoutMutation, useLoginMutation, useRemoveCartItemMutation } from '../../redux/services/api.js';
import { removeActiveCoupon, showToast } from '../../redux/slices/cartSlice.js';
import { setCredentials } from '../../redux/slices/authSlice.js';
import { formatPrice } from '../../utils/helpers.js';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const activeCoupon = useSelector((state) => state.cart.activeCoupon);

  const { data: cartData, isLoading: isCartLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [checkoutMutation, { isLoading: isSubmitting }] = useCheckoutMutation();
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();
  const [removeCartItem, { isLoading: isRemovingItem }] = useRemoveCartItemMutation();
  const [submitError, setSubmitError] = useState('');

  const handleRemoveItem = async (itemId, itemTitle) => {
    try {
      await removeCartItem(itemId).unwrap();
      dispatch(showToast({ type: 'success', message: `Removed ${itemTitle || 'item'} from cart` }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to remove item from cart' }));
    }
  };

  const handleQuickDemoLogin = async () => {
    try {
      const res = await loginMutation({
        email: 'customer@specbee.com',
        password: 'Password@123',
      }).unwrap();
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: 'Signed in successfully as ' + (res.data.user?.name || 'Customer') }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Sign in failed' }));
    }
  };

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || 'Rahul Sharma',
    address: 'Flat 402, Prestige Tech Park, Outer Ring Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    country: 'India',
  });

  const [transitMethod, setTransitMethod] = useState('express_courier');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');

  const cart = cartData?.data || cartData || null;
  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.variant?.price || item.price || 0) * (item.quantity || 1), 0);

  const hasOutOfStock = items.some(
    (it) => it.variant?.stockQuantity !== undefined && it.variant?.stockQuantity <= 0
  );

  let discountAmount = 0;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * activeCoupon.discountValue) / 100;
      if (activeCoupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(activeCoupon.maxDiscountAmount));
      }
    } else if (activeCoupon.discountType === 'FLAT') {
      discountAmount = Math.min(Number(activeCoupon.discountValue), subtotal);
    }
  }

  const shippingCost = subtotal >= 999 || subtotal === 0 ? 0 : 99;
  const gstAmount = Math.round((subtotal - discountAmount) * 0.03);
  const finalTotal = Math.max(0, subtotal - discountAmount + (subtotal > 0 ? shippingCost : 0) + gstAmount);

  const handleAddressChange = (e) => {
    setShippingAddress({ ...shippingAddress, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitError('');

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Please add products before placing an order.');
      dispatch(showToast({ type: 'error', message: 'Your cart is empty' }));
      return;
    }

    if (hasOutOfStock) {
      setSubmitError('Some items in your cart are currently out of stock. Please remove them to proceed.');
      dispatch(showToast({ type: 'error', message: 'Some items in cart are out of stock' }));
      return;
    }

    if (!shippingAddress.fullName || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      setSubmitError('Please complete all required delivery address fields.');
      return;
    }

    try {
      const payload = {
        items: items.map((it) => ({
          variantId: it.variantId || it.variant?.id,
          quantity: it.quantity,
        })),
        shippingAddress: `${shippingAddress.fullName}, ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}, ${shippingAddress.country} (Delivery: ${transitMethod === 'express_courier' ? 'Express Courier Delivery' : 'Store Pick-up'})`,
        paymentMethod,
        couponCode: activeCoupon ? activeCoupon.code : undefined,
        idempotencyKey: 'IDEMP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      };

      const res = await checkoutMutation(payload).unwrap();
      dispatch(removeActiveCoupon());
      dispatch(showToast({ type: 'success', message: 'Order placed successfully!' }));
      
      const orderId = res?.data?.order?.id || res?.data?.id || res?.order?.id;
      if (orderId) {
        router.push(`/orders/${orderId}`);
      } else {
        router.push('/orders');
      }
    } catch (err) {
      const errMsg = err?.data?.message || err?.message || 'Order processing failed. Please try again.';
      setSubmitError(errMsg);
      dispatch(showToast({ type: 'error', message: errMsg }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xl p-8 sm:p-10 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#14213D] text-[#fca311] flex items-center justify-center mx-auto mb-6 shadow-md">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#14213D] uppercase tracking-tight">
            Account Sign-In Required
          </h2>
          <p className="font-['Inter'] text-sm text-[#6C757D] mt-2 max-w-md mx-auto leading-relaxed">
            Please sign in to your authenticated account to confirm your shipping address and complete checkout.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-[#fca311] hover:bg-[#E08F07] text-black font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <span>{isLoggingIn ? 'Signing In...' : 'Instant Demo Sign-In (Collector)'}</span>
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
      {/* Stepper Header */}
      <section className="w-full bg-surface-subtle border-b border-hairline py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <ol className="flex items-center gap-2 sm:gap-3 text-xs">
              <li className="flex items-center gap-2 text-text-muted">
                <Link href="/cart" className="flex items-center gap-1.5 hover:text-text-secondary">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-text-muted font-label-caps text-[11px] flex items-center justify-center font-bold">
                    1
                  </span>
                  <span className="font-label-caps text-[11px] uppercase tracking-wider text-text-muted">
                    Shopping Cart
                  </span>
                </Link>
              </li>
              <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="w-6 h-6 rounded-full bg-text-secondary text-white font-label-caps text-[11px] flex items-center justify-center font-bold">
                  2
                </span>
                <span className="font-label-caps text-[11px] uppercase tracking-wider text-text-secondary font-bold">
                  Shipping &amp; Payment
                </span>
              </li>
              <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
              <li className="flex items-center gap-2 text-text-muted">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-text-muted font-label-caps text-[11px] flex items-center justify-center font-semibold">
                  3
                </span>
                <span className="font-label-caps text-[11px] uppercase tracking-wider text-text-muted">
                  Order Confirmation
                </span>
              </li>
            </ol>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-hairline shadow-xs text-text-secondary text-xs">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
              <span className="font-semibold">Transit Insurance &amp; Safe Checkout Active</span>
            </div>
          </div>

          <div>
            <span className="font-label-caps text-[10px] uppercase tracking-widest text-[#fca311] font-bold">
              Secure Checkout Protocol
            </span>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-text-secondary uppercase font-extrabold tracking-tight mt-1">
              Checkout &amp; Delivery Details
            </h1>
          </div>
        </div>
      </section>

      {/* Main Checkout Grid */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Address & Payment */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Step 1: Delivery Address */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-hairline shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-text-secondary text-primary-container font-label-caps text-[12px] flex items-center justify-center font-bold">
                    1
                  </div>
                  <h2 className="font-headline-sm text-base text-text-secondary uppercase font-bold">
                    Delivery &amp; Shipping Address
                  </h2>
                </div>
                <span className="font-label-caps text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider font-semibold">
                  Doorstep Insured Delivery
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    Full Legal Name (Recipient) *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={shippingAddress.fullName}
                    onChange={handleAddressChange}
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary"
                    placeholder="Enter full recipient name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    Street Address &amp; Landmark *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={shippingAddress.address}
                    onChange={handleAddressChange}
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary"
                    placeholder="Flat / House No, Building, Street, Area"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                    City / Municipality *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={shippingAddress.city}
                    onChange={handleAddressChange}
                    className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary"
                    placeholder="e.g. Bengaluru"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary"
                      placeholder="e.g. Karnataka"
                    />
                  </div>
                  <div>
                    <label className="block font-label-caps text-[10px] uppercase text-text-secondary font-bold mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      required
                      value={shippingAddress.postalCode}
                      onChange={handleAddressChange}
                      className="w-full bg-surface-subtle border border-hairline px-3.5 py-2.5 rounded-lg text-xs font-inter focus:outline-none focus:border-text-secondary"
                      placeholder="e.g. 560103"
                    />
                  </div>
                </div>
              </div>

              {/* Transit Method Radio Cards */}
              <div className="mt-2 flex flex-col gap-2">
                <span className="font-label-caps text-[10px] uppercase text-text-secondary font-bold">
                  Select Delivery Option
                </span>
                <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${transitMethod === 'express_courier' ? 'border-[#fca311] bg-amber-50/50' : 'border-hairline bg-surface-subtle'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="transit"
                      checked={transitMethod === 'express_courier'}
                      onChange={() => setTransitMethod('express_courier')}
                      className="accent-[#fca311] cursor-pointer"
                    />
                    <div>
                      <div className="font-headline-sm text-xs font-bold text-text-secondary uppercase">
                        Express Doorstep Delivery
                      </div>
                      <div className="font-inter text-[11px] text-text-muted">
                        Fast delivery across India via Blue Dart / Delhivery with SMS &amp; OTP tracking
                      </div>
                    </div>
                  </div>
                  <span className="font-label-caps text-[10px] uppercase text-[#fca311] font-bold">
                    {subtotal >= 999 ? 'Complimentary' : '₹99.00'}
                  </span>
                </label>

                <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${transitMethod === 'store_pickup' ? 'border-[#fca311] bg-amber-50/50' : 'border-hairline bg-surface-subtle'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="transit"
                      checked={transitMethod === 'store_pickup'}
                      onChange={() => setTransitMethod('store_pickup')}
                      className="accent-[#fca311] cursor-pointer"
                    />
                    <div>
                      <div className="font-headline-sm text-xs font-bold text-text-secondary uppercase">
                        Center Shopping Store Pick-up
                      </div>
                      <div className="font-inter text-[11px] text-text-muted">
                        Direct store pickup from our local retail hub in your city
                      </div>
                    </div>
                  </div>
                  <span className="font-label-caps text-[10px] uppercase text-emerald-600 font-bold">
                    FREE
                  </span>
                </label>
              </div>
            </div>

            {/* Step 2: Payment Method */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-hairline shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-text-secondary text-primary-container font-label-caps text-[12px] flex items-center justify-center font-bold">
                    2
                  </div>
                  <h2 className="font-headline-sm text-base text-text-secondary uppercase font-bold">
                    Payment Method
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-medium">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">lock</span>
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              {/* Payment Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`p-4 rounded-xl text-left border flex flex-col justify-between h-24 transition cursor-pointer ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'bg-[#14213D] text-white border-[#14213D] shadow-sm'
                      : 'bg-surface-subtle border-hairline hover:bg-slate-100 text-text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-[#fca311]">credit_card</span>
                  <div>
                    <span className="font-label-caps text-[11px] font-bold block uppercase">Credit / Debit Card</span>
                    <span className="text-[10px] opacity-70">RuPay / Visa / Mastercard / Amex</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-4 rounded-xl text-left border flex flex-col justify-between h-24 transition cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'bg-[#14213D] text-white border-[#14213D] shadow-sm'
                      : 'bg-surface-subtle border-hairline hover:bg-slate-100 text-text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-[#fca311]">account_balance_wallet</span>
                  <div>
                    <span className="font-label-caps text-[11px] font-bold block uppercase">UPI / Instant Pay</span>
                    <span className="text-[10px] opacity-70">Google Pay / PhonePe / Paytm / BHIM</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-4 rounded-xl text-left border flex flex-col justify-between h-24 transition cursor-pointer ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'bg-[#14213D] text-white border-[#14213D] shadow-sm'
                      : 'bg-surface-subtle border-hairline hover:bg-slate-100 text-text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-[#fca311]">account_balance</span>
                  <div>
                    <span className="font-label-caps text-[11px] font-bold block uppercase">Net Banking / NEFT</span>
                    <span className="text-[10px] opacity-70">All Major Indian Banks Supported</span>
                  </div>
                </button>
              </div>

              <div className="p-4 bg-surface-subtle border border-hairline rounded-xl text-xs text-text-muted leading-relaxed flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">verified</span>
                <span>
                  <strong className="text-text-secondary">Security Guarantee:</strong> Your payment is processed through bank-grade 256-bit encrypted channels with 100% transit replacement insurance.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Order Summary */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-xs border border-hairline p-6 sticky top-24">
              <h3 className="font-label-caps text-[11px] uppercase tracking-wider text-text-secondary font-bold pb-4 border-b border-hairline">
                Order Summary
              </h3>

              {/* Items in cart */}
              <div className="py-3 flex flex-col divide-y divide-hairline max-h-60 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">Your shopping cart is empty.</p>
                ) : (
                  items.map((item) => {
                    const prod = item.variant?.product || item.product;
                    const price = Number(item.variant?.price || item.price || 0);
                    const qty = item.quantity || 1;
                    const isOutOfStock = item.variant?.stockQuantity !== undefined && item.variant?.stockQuantity <= 0;

                    return (
                      <div key={item.id} className="py-2.5 flex items-start justify-between text-xs group">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-10 h-12 bg-surface-subtle rounded border border-hairline p-0.5 flex items-center justify-center shrink-0">
                            {prod?.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.title || 'Product'} className="w-full h-full object-contain" />
                            ) : (
                              <span className="material-symbols-outlined text-[18px] text-text-muted">diamond</span>
                            )}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-text-secondary truncate" title={prod?.title}>{prod?.title || 'Product Item'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-text-muted">Qty: {qty}</span>
                              {isOutOfStock && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                                  Out of Stock
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <button
                            type="button"
                            disabled={isRemovingItem}
                            onClick={() => handleRemoveItem(item.id, prod?.title)}
                            title="Remove item from cart"
                            className="p-1 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center -mr-1 -mt-1 disabled:opacity-50"
                            aria-label="Remove item"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                          <span className="font-mono font-bold text-text-primary mt-1">
                            {formatPrice(price * qty)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="py-4 border-t border-hairline flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-text-secondary font-mono">{formatPrice(subtotal)}</span>
                </div>

                {activeCoupon && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Coupon ({activeCoupon.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-text-muted">
                  <span>Express Delivery</span>
                  <span className="font-semibold text-text-secondary font-mono">
                    {shippingCost === 0 ? 'Complimentary' : formatPrice(shippingCost)}
                  </span>
                </div>

                <div className="flex justify-between text-text-muted">
                  <span>GST (Goods &amp; Services Tax 3%)</span>
                  <span className="font-semibold text-text-secondary font-mono">
                    {formatPrice(gstAmount)}
                  </span>
                </div>

                <div className="pt-3 border-t border-hairline flex justify-between items-baseline">
                  <span className="font-label-caps text-xs uppercase text-text-secondary font-bold">
                    Total Amount Payable
                  </span>
                  <span className="font-headline-md text-2xl font-extrabold text-text-primary tracking-tight">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Submit Error Alert */}
              {submitError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0 mt-0.5">error</span>
                  <div className="flex-1 leading-relaxed">
                    <p className="font-bold">Checkout Notice</p>
                    <p>{submitError}</p>
                  </div>
                </div>
              )}

              {/* Meaningful, Clickable Action Button */}
              <button
                type="submit"
                onClick={handlePlaceOrder}
                disabled={isSubmitting || items.length === 0 || hasOutOfStock}
                className="w-full bg-[#fca311] hover:bg-[#e5940e] text-[#14213D] py-4 px-6 rounded-xl font-['Montserrat'] text-xs uppercase font-extrabold tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isSubmitting ? 'hourglass_top' : 'shopping_bag'}
                </span>
                <span>
                  {isSubmitting
                    ? 'Placing Your Order...'
                    : `Place Order • ${formatPrice(finalTotal)}`}
                </span>
              </button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-text-muted text-[11px] font-medium">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
                <span>100% Safe &amp; Secure Checkout Guarantee</span>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
