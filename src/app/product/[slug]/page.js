'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGetProductBySlugQuery, useAddToCartMutation } from '../../../redux/services/api.js';
import { showToast } from '../../../redux/slices/cartSlice.js';
import { useDispatch, useSelector } from 'react-redux';
import { formatPrice } from '../../../utils/helpers.js';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const { data: productData, isLoading, isError, error } = useGetProductBySlugQuery(slug);
  const [addToCartMutation, { isLoading: isAdding }] = useAddToCartMutation();

  const product = productData?.data || productData?.product;

  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Set default variant when product arrives
  const selectedVariant =
    product?.variants?.find((v) => v.id === selectedVariantId) ||
    product?.variants?.[0] ||
    null;

  const currentStock = selectedVariant?.stockQuantity || 0;
  const isOutOfStock = currentStock === 0;
  const isLowStock = currentStock > 0 && currentStock <= 3;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      dispatch(showToast({ type: 'error', message: 'Please sign in to reserve vault acquisitions' }));
      router.push('/login');
      return;
    }

    if (!selectedVariant || isOutOfStock) return;

    try {
      await addToCartMutation({
        variantId: selectedVariant.id,
        quantity,
      }).unwrap();
      dispatch(showToast({ type: 'success', message: `Reserved: "${product.title}" added to your vault escrow portfolio.` }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to allocate asset' }));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 aspect-[4/3] bg-slate-200 animate-pulse rounded-2xl"></div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-6 bg-slate-200 animate-pulse rounded w-1/3"></div>
            <div className="h-10 bg-slate-200 animate-pulse rounded w-3/4"></div>
            <div className="h-8 bg-slate-200 animate-pulse rounded w-1/4"></div>
            <div className="h-24 bg-slate-200 animate-pulse rounded"></div>
            <div className="h-12 bg-slate-200 animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-text-secondary text-primary-container flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h2 className="font-headline-md text-2xl font-bold text-text-secondary uppercase">
          Asset Record Not Found
        </h2>
        <p className="text-xs text-text-muted mt-2">
          {error?.data?.message || 'The specified lot has been retired or does not exist in active vaults.'}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-container text-text-primary font-label-caps text-xs uppercase font-bold tracking-wider hover:bg-accent-hover transition"
        >
          <span>Return to Vault Catalog</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    );
  }

  const discountPercent = 18;
  const originalPrice = selectedVariant ? (Number(selectedVariant.price) * 1.18).toFixed(2) : 0;

  return (
    <div className="w-full bg-surface min-h-screen pb-16 font-inter">
      {/* Breadcrumb Sub-Header */}
      <div className="w-full bg-surface-subtle py-3 border-b border-hairline">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <nav className="flex items-center gap-2 font-label-caps text-[10px] uppercase tracking-wider text-text-muted">
            <Link href="/" className="hover:text-text-secondary transition-colors">
              Home
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link href="/#catalog" className="hover:text-text-secondary transition-colors">
              {product.category || 'Vault Reserves'}
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-text-secondary font-bold truncate max-w-xs sm:max-w-md">
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Product Stage */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Image & Badges */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-hairline shadow-sm group p-6 flex items-center justify-center">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                <span className="bg-text-secondary text-white font-label-caps text-[10px] px-2.5 py-1 rounded uppercase shadow-sm">
                  Curated Reserve
                </span>
                <span className="bg-primary-container text-text-primary font-label-caps text-[10px] px-2.5 py-1 rounded uppercase font-bold shadow-sm">
                  Lot #AV-{String(product.id).padStart(3, '0')}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`w-10 h-10 rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center ${isWishlisted ? 'text-primary' : 'text-text-secondary'} hover:scale-110 transition`}
                  title="Add to Vault Watchlist"
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-text-secondary/90 backdrop-blur px-4 py-2 rounded-xl flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                  <span className="font-label-caps text-[10px] uppercase tracking-wide">
                    Tamper-Evident Depository Seal Intact
                  </span>
                </div>
                <span className="font-inter text-[11px] text-secondary-fixed-dim">
                  Bengaluru Vault Hub
                </span>
              </div>
            </div>

            {/* Trust Callouts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-hairline shadow-xs flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container text-[26px]">verified</span>
                <div>
                  <div className="font-headline-sm text-xs font-bold text-text-secondary uppercase">BIS Hallmarking</div>
                  <div className="font-inter text-[11px] text-text-muted">Certified 999 Purity</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-hairline shadow-xs flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container text-[26px]">local_shipping</span>
                <div>
                  <div className="font-headline-sm text-xs font-bold text-text-secondary uppercase">Insured Logistics</div>
                  <div className="font-inter text-[11px] text-text-muted">Sequel / Blue Dart Armored</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-hairline shadow-xs flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container text-[26px]">account_balance</span>
                <div>
                  <div className="font-headline-sm text-xs font-bold text-text-secondary uppercase">100% Escrow Protection</div>
                  <div className="font-inter text-[11px] text-text-muted">7-Day Return Guarantee</div>
                </div>
              </div>
            </div>

            {/* Provenance Description */}
            <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col gap-3">
              <h3 className="font-label-caps text-xs uppercase tracking-wider text-text-secondary font-bold">
                Provenance &amp; Specifications
              </h3>
              <p className="font-inter text-xs text-text-secondary leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>

          {/* Right Column: Buy Box */}
          <div className="lg:col-span-5 flex flex-col gap-6 bg-white p-8 rounded-2xl border border-hairline shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-label-caps text-[10px] tracking-widest text-primary font-bold uppercase">
                  AURUM VAULT • VERIFIED ALLOCATION
                </span>
                <span className="bg-surface-subtle border border-hairline text-text-secondary font-label-caps text-[9px] px-2 py-0.5 rounded uppercase font-semibold">
                  Tier 1 Custody
                </span>
              </div>

              <h1 className="font-headline-md text-2xl font-extrabold text-text-secondary uppercase tracking-tight">
                {product.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center text-primary-container">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="font-inter text-xs font-bold text-text-secondary">4.9</span>
                <span className="text-text-muted text-xs">·</span>
                <span className="font-inter text-xs text-text-secondary underline">
                  184 Verified Reviews
                </span>
              </div>
            </div>

            {/* Pricing Block */}
            <div className="bg-surface-subtle p-4 rounded-xl border border-hairline flex flex-col gap-1">
              <div className="flex items-baseline gap-3">
                <span className="font-headline-md text-3xl font-extrabold text-text-primary tracking-tight">
                  {selectedVariant ? formatPrice(Number(selectedVariant.price)) : formatPrice(0)}
                </span>
                <span className="font-inter text-sm line-through text-text-muted font-mono">
                  {formatPrice(originalPrice)}
                </span>
                <span className="bg-primary-container/20 text-primary font-label-caps text-[10px] px-2 py-0.5 rounded uppercase font-bold">
                  -{discountPercent}% OFF
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary font-inter text-[11px] mt-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>BIS Hallmarked Authenticity Guaranteed</span>
              </div>
            </div>

            {/* Variant Selector */}
            {product.variants?.length > 1 && (
              <div className="flex flex-col gap-2">
                <span className="font-label-caps text-[10px] uppercase text-text-secondary font-bold">
                  Select Lot Specification
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`p-3 rounded-lg text-left text-xs border transition ${
                        selectedVariant?.id === v.id
                          ? 'border-primary-container bg-primary-container/10 font-bold text-text-secondary shadow-xs'
                          : 'border-hairline bg-white text-text-muted hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-text-secondary">{v.title}</div>
                      <div className="font-mono text-[11px] text-text-muted">{formatPrice(Number(v.price))}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Concurrency Stock Indicator */}
            <div>
              {isOutOfStock ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Allocation Exhausted: No available lots in vault</span>
                </div>
              ) : isLowStock ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">warning</span>
                  <span>High Concurrency Demand: Only {currentStock} lot(s) remaining!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-text-secondary text-xs font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Authenticated Vault Lot Available for Acquisition</span>
                </div>
              )}
            </div>

            {/* Quantity Selector & Action Button */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-hairline rounded-lg bg-surface-subtle p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={isOutOfStock}
                    className="w-8 h-8 flex items-center justify-center text-text-secondary font-bold hover:bg-slate-200 rounded"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-xs">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                    disabled={isOutOfStock || quantity >= currentStock}
                    className="w-8 h-8 flex items-center justify-center text-text-secondary font-bold hover:bg-slate-200 rounded"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || isOutOfStock}
                  className="flex-1 bg-primary-container text-text-primary py-3.5 px-6 rounded-lg font-label-caps text-xs uppercase font-bold tracking-wider hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  <span>{isAdding ? 'Allocating...' : isOutOfStock ? 'Sold Out' : 'Acquire Lot & Secure Custody'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-text-muted font-inter text-[11px] pt-2">
                <span className="material-symbols-outlined text-[15px] text-primary">lock</span>
                <span>Protected by 256-Bit Escrow Vault Protocol</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
