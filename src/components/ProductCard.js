'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice, getProductImage } from '../utils/helpers.js';
import { useAddToCartMutation } from '../redux/services/api.js';
import { showToast } from '../redux/slices/cartSlice.js';
import { useDispatch, useSelector } from 'react-redux';

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addToCartMutation, { isLoading: isAdding }] = useAddToCartMutation();

  const minPrice = product.variants?.length ? Math.min(...product.variants.map((v) => Number(v.price))) : 0;
  const totalStock = product.variants?.reduce((acc, v) => acc + v.stockQuantity, 0) || 0;
  const isOutOfStock = totalStock === 0;

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      dispatch(showToast({ type: 'error', message: 'Please sign in to add items to your cart' }));
      return;
    }

    const defaultVariant = product.variants?.find((v) => v.stockQuantity > 0) || product.variants?.[0];
    if (!defaultVariant || isOutOfStock) return;

    try {
      await addToCartMutation({
        variantId: defaultVariant.id,
        quantity: 1,
      }).unwrap();
      dispatch(showToast({ type: 'success', message: `Added "${product.title}" to your cart.` }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to add item' }));
    }
  };

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    dispatch(showToast({
      type: 'info',
      message: !isWishlisted ? 'Added item to your wishlist.' : 'Removed from wishlist.'
    }));
  };

  // Pseudo-stable discount calculation based on id
  const discountPercent = (product.id % 3 === 0 ? 18 : product.id % 2 === 0 ? 12 : 15);
  const originalPrice = minPrice > 0 ? (minPrice * (1 + discountPercent / 100)).toFixed(2) : 0;
  const skuId = `#SKU-${String(product.id || '101').slice(0, 6).toUpperCase()}`;

  return (
    <div className="product-card group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden relative border border-hairline">
      {/* Visual Image & Overlays */}
      <div className="relative bg-surface-subtle p-2.5 flex items-center justify-center overflow-hidden aspect-[16/10]">
        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          <span className="bg-primary-container text-text-primary px-2 py-0.5 rounded font-label-caps text-[10px] font-bold uppercase tracking-wider shadow-sm">
            -{discountPercent}% OFF
          </span>
          <span className="bg-text-secondary text-white px-2 py-0.5 rounded font-label-caps text-[10px] uppercase tracking-wider">
            {skuId}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
          <button
            onClick={toggleWishlist}
            className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur ${isWishlisted ? 'text-primary bg-primary-fixed' : 'text-text-secondary'} hover:scale-110 flex items-center justify-center shadow-md transition-transform`}
            title="Save to Wishlist"
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
          <Link
            href={`/product/${product.slug}`}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur text-text-secondary hover:text-primary hover:scale-110 flex items-center justify-center shadow-md transition-transform"
            title="View Product"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </Link>
        </div>

        {/* Product Media */}
        <Link href={`/product/${product.slug}`} className="w-full h-full flex items-center justify-center">
          {product.imageUrl ? (
            <img
              src={getProductImage(product.title, product.imageUrl)}
              alt={product.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <span className="material-symbols-outlined text-[36px] text-outline">verified</span>
              <span className="font-label-caps text-[10px] uppercase">Center Shopping</span>
            </div>
          )}
        </Link>
      </div>

      {/* Product Information Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-outline font-bold uppercase tracking-wider">
              {product.category || 'Featured'}
            </span>
            <span className="font-label-caps text-[10px] text-primary-container bg-text-secondary px-1.5 py-0.5 rounded font-bold uppercase">
              100% Genuine
            </span>
          </div>

          <Link href={`/product/${product.slug}`}>
            <h3 className="font-headline-sm text-[16px] leading-snug text-text-secondary font-bold group-hover:text-primary transition-colors line-clamp-1">
              {product.title}
            </h3>
          </Link>

          {/* Rating Display */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center text-primary-container">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-[15px] text-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
            <span className="font-label-caps text-[11px] text-text-secondary font-bold">4.9</span>
            <span className="text-xs text-text-muted font-inter">(128 reviews)</span>
          </div>
        </div>

        {/* Pricing & Acquisition Action */}
        <div className="flex flex-col gap-2 pt-2 border-t border-hairline/60">
          {totalStock <= 2 && !isOutOfStock ? (
            <div className="flex items-center gap-1 text-primary font-label-caps text-[10px] uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
              <span>🔥 Only {totalStock} left in stock</span>
            </div>
          ) : isOutOfStock ? (
            <div className="flex items-center gap-1 text-red-600 font-label-caps text-[10px] uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-[14px]">block</span>
              <span>Out of Stock</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-text-secondary font-label-caps text-[10px] uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
              <span>100% Genuine &amp; Verified</span>
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="font-headline-md text-xl font-extrabold text-text-primary tracking-tight">
              {formatPrice(minPrice)}
            </span>
            {originalPrice > minPrice && (
              <span className="text-xs text-text-muted line-through font-inter">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={isAdding || isOutOfStock}
            className="w-full bg-primary-container text-text-primary py-2 px-3.5 rounded-lg font-label-caps text-[11px] uppercase font-bold tracking-wider hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            <span>{isAdding ? 'Adding...' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
