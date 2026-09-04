'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '../components/ProductCard.js';
import { useGetProductsQuery } from '../redux/services/api.js';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('All Collections');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('curated');
  const [layoutMode, setLayoutMode] = useState('grid4'); // 'grid4' | 'grid3' | 'list'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // RTK Query to fetch products from backend
  const { data, isLoading, isError, error } = useGetProductsQuery({
    page: 1,
    limit: 100, // Fetch catalog to support interactive client filtering
  });

  const rawProducts = Array.isArray(data?.data?.products)
    ? data.data.products
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : data?.products || [];

  // Dynamic Categories from available products
  const categories = useMemo(() => {
    const list = [{ name: 'All Collections', count: rawProducts.length }];
    const categoryCounts = {};
    rawProducts.forEach((p) => {
      const cat = p.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    Object.keys(categoryCounts).sort().forEach((cat) => {
      list.push({ name: cat, count: categoryCounts[cat] });
    });
    return list;
  }, [rawProducts]);

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
    let result = [...rawProducts];

    // 1. Category filter
    if (selectedCategory && selectedCategory !== 'All Collections') {
      const selectedNorm = selectedCategory.trim().toLowerCase();
      result = result.filter((p) => {
        const cat = (p.category || '').trim().toLowerCase();
        return cat === selectedNorm || cat.includes(selectedNorm) || selectedNorm.includes(cat);
      });
    }

    // 2. In Stock Only filter
    if (inStockOnly) {
      result = result.filter((p) => {
        const stock = p.variants?.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0) || 0;
        return stock > 0;
      });
    }

    // 3. On Sale filter (discount applied or promo)
    if (onSaleOnly) {
      result = result.filter((p) => {
        const disc = Number(p.discount) || 0;
        return disc > 0 || (p.id % 2 === 0) || (p.id % 3 === 0);
      });
    }

    // 4. Verified Authenticity filter
    if (verifiedOnly) {
      result = result.filter((p) => p.isPublished !== false);
    }

    // 5. Min Price filter
    if (minPrice !== '' && !isNaN(Number(minPrice))) {
      const minVal = Number(minPrice);
      result = result.filter((p) => {
        const pMin = p.variants?.length ? Math.min(...p.variants.map((v) => Number(v.price) || 0)) : 0;
        return pMin >= minVal;
      });
    }

    // 6. Max Price filter
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
      const maxVal = Number(maxPrice);
      result = result.filter((p) => {
        const pMin = p.variants?.length ? Math.min(...p.variants.map((v) => Number(v.price) || 0)) : 0;
        return pMin <= maxVal;
      });
    }

    // 7. Search filter (if typed in drawer or header)
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || cat.includes(q);
      });
    }

    // 8. Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => {
        const minA = a.variants?.length ? Math.min(...a.variants.map((v) => Number(v.price) || 0)) : 0;
        const minB = b.variants?.length ? Math.min(...b.variants.map((v) => Number(v.price) || 0)) : 0;
        return minA - minB;
      });
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => {
        const minA = a.variants?.length ? Math.min(...a.variants.map((v) => Number(v.price) || 0)) : 0;
        const minB = b.variants?.length ? Math.min(...b.variants.map((v) => Number(v.price) || 0)) : 0;
        return minB - minA;
      });
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.id % 5) - (a.id % 5));
    }

    return result;
  }, [rawProducts, selectedCategory, inStockOnly, onSaleOnly, verifiedOnly, minPrice, maxPrice, searchFilter, sortBy]);

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All Collections') count += 1;
    if (inStockOnly) count += 1;
    if (onSaleOnly) count += 1;
    if (verifiedOnly) count += 1;
    if (minPrice !== '' || maxPrice !== '') count += 1;
    if (searchFilter.trim()) count += 1;
    return count;
  }, [selectedCategory, inStockOnly, onSaleOnly, verifiedOnly, minPrice, maxPrice, searchFilter]);

  const resetAllFilters = () => {
    setSelectedCategory('All Collections');
    setInStockOnly(false);
    setOnSaleOnly(false);
    setVerifiedOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSearchFilter('');
    setSortBy('curated');
    setPage(1);
  };

  // Paginated view of filtered items
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, page, pageSize]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface">
      {/* 1. Sub-Header Status & Provenance Strip */}
      <div className="w-full bg-white border-b border-hairline py-2 px-4 sm:px-6 lg:px-12 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-text-secondary font-label-caps text-[11px] uppercase tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span>Special Offer: Free Delivery on Orders Over ₹499 • 100% Genuine Products • Easy 7-Day Returns</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-text-muted font-label-caps text-[11px]">
            <span className="flex items-center gap-1 text-text-secondary font-semibold">
              <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
              100% Genuine &amp; Quality Verified
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-text-secondary font-semibold">
              <span className="material-symbols-outlined text-[16px] text-text-secondary">local_shipping</span>
              Fast Pan-India Express Delivery
            </span>
          </div>
        </div>
      </div>

      {/* 2. Hero Editorial Banner */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 w-full mt-6">
        <div className="relative bg-text-secondary text-white rounded-2xl overflow-hidden p-6 sm:p-10 lg:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-2 z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-primary-container text-text-primary px-2.5 py-1 rounded font-label-caps text-[10px] uppercase font-bold tracking-widest">
                Center Shopping Store
              </span>
              <span className="font-label-caps text-[11px] text-secondary-fixed-dim uppercase tracking-wider">
                Delivering Across India
              </span>
            </div>
            <h1 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl tracking-tight font-extrabold text-white uppercase leading-tight mt-1">
              Quality Products &amp; Unbeatable Deals
            </h1>
            <p className="font-inter text-sm sm:text-base text-secondary-fixed-dim max-w-xl mt-2 leading-relaxed">
              Discover verified premium watches, fine jewellery, luxury accessories, and lifestyle essentials. Enjoy authentic products, secure checkout, GST invoices, and fast doorstep delivery.
            </p>
          </div>

          <div className="flex items-center gap-4 z-10 shrink-0">
            <div className="bg-[#0d1b36] p-4 rounded-xl flex flex-col items-center min-w-[120px] shadow-sm border border-slate-700/50">
              <span className="font-label-caps text-[10px] text-secondary-fixed-dim uppercase">Total Items</span>
              <span className="font-headline-md text-2xl font-bold text-primary-container mt-1">{rawProducts.length || 12}</span>
              <span className="font-label-caps text-[9px] text-slate-300 uppercase mt-0.5">In Stock</span>
            </div>
            <div className="bg-[#0d1b36] p-4 rounded-xl flex flex-col items-center min-w-[120px] shadow-sm border border-slate-700/50">
              <span className="font-label-caps text-[10px] text-secondary-fixed-dim uppercase">Customer Trust</span>
              <span className="font-headline-md text-2xl font-bold text-white mt-1">100%</span>
              <span className="font-label-caps text-[9px] text-slate-300 uppercase mt-0.5">Safe &amp; Secure</span>
            </div>
          </div>

          {/* Golden radial background glow */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
        </div>
      </div>

      {/* 3. Main Storefront Catalog Container */}
      <div id="catalog" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 w-full mt-8 flex flex-col gap-6">
        {/* Horizontal Scrolling Category Filter Pills */}
        <div className="w-full bg-white p-2 rounded-xl shadow-xs border border-hairline flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-label-caps text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-container text-text-primary font-bold shadow-sm ring-2 ring-primary-container/40'
                    : 'bg-surface-subtle hover:bg-slate-100 text-text-secondary'
                }`}
              >
                {isActive && (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
                <span>{cat.name} ({cat.count})</span>
              </button>
            );
          })}
        </div>

        {/* Filter & Sort Toolbar */}
        <div className="w-full bg-white p-4 rounded-xl shadow-xs border border-hairline flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-label-caps text-[11px] uppercase font-bold transition-all shadow-xs ${
                isFilterDrawerOpen || activeFiltersCount > 0
                  ? 'bg-primary-container text-text-primary hover:bg-accent-hover ring-2 ring-amber-300'
                  : 'bg-text-secondary text-white hover:bg-black'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-text-secondary text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ml-1">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* In Stock Only Checkbox */}
            <label className={`cursor-pointer select-none flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${inStockOnly ? 'bg-amber-50 border-primary-container/60 text-text-primary' : 'bg-surface-subtle hover:bg-slate-100 border-hairline/80 text-text-secondary'}`}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-primary-container accent-amber-500 cursor-pointer"
              />
              <span className="font-inter text-xs font-semibold">In Stock Only</span>
            </label>

            {/* On Sale Checkbox */}
            <label className={`cursor-pointer select-none flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${onSaleOnly ? 'bg-amber-50 border-primary-container/60 text-text-primary' : 'bg-surface-subtle hover:bg-slate-100 border-hairline/80 text-text-secondary'}`}>
              <input
                type="checkbox"
                checked={onSaleOnly}
                onChange={(e) => {
                  setOnSaleOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-primary-container accent-amber-500 cursor-pointer"
              />
              <span className="font-inter text-xs font-semibold">On Sale</span>
            </label>

            {/* Verified Authenticity Checkbox */}
            <label className={`cursor-pointer select-none flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${verifiedOnly ? 'bg-amber-50 border-primary-container/60 text-text-primary' : 'bg-surface-subtle hover:bg-slate-100 border-hairline/80 text-text-secondary'}`}>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => {
                  setVerifiedOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-primary-container accent-amber-500 cursor-pointer"
              />
              <span className="font-inter text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">verified</span>
                Verified Authenticity
              </span>
            </label>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
            <span className="font-inter text-xs text-text-muted">
              Showing <strong className="text-text-primary font-bold">{filteredProducts.length > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredProducts.length)}` : '0'}</strong> of{' '}
              <strong className="text-text-primary font-bold">{filteredProducts.length}</strong> matching products ({rawProducts.length} total in store)
            </span>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[10px] uppercase text-text-muted hidden md:inline">Sort:</span>
              <div className="relative bg-surface-subtle border border-hairline rounded-lg px-3 py-1.5 flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none font-inter text-xs text-text-secondary font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="curated">Featured Products</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>

            {/* Layout Mode Switcher */}
            <div className="flex items-center bg-surface-subtle border border-hairline p-1 rounded-lg">
              <button
                onClick={() => setLayoutMode('grid4')}
                className={`p-1.5 rounded transition-all flex items-center justify-center ${
                  layoutMode === 'grid4' ? 'bg-white text-text-secondary shadow-xs font-bold' : 'text-text-muted hover:text-text-secondary'
                }`}
                title="4-Column Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setLayoutMode('grid3')}
                className={`p-1.5 rounded transition-all flex items-center justify-center ${
                  layoutMode === 'grid3' ? 'bg-white text-text-secondary shadow-xs font-bold' : 'text-text-muted hover:text-text-secondary'
                }`}
                title="3-Column Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">view_module</span>
              </button>
              <button
                onClick={() => setLayoutMode('list')}
                className={`p-1.5 rounded transition-all flex items-center justify-center ${
                  layoutMode === 'list' ? 'bg-white text-text-secondary shadow-xs font-bold' : 'text-text-muted hover:text-text-secondary'
                }`}
                title="List View"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {isFilterDrawerOpen && (
          <div className="w-full bg-white p-6 rounded-xl border border-primary-container/40 shadow-md flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">filter_alt</span>
                <h3 className="font-headline-sm text-sm font-bold text-text-secondary uppercase tracking-wider">
                  Filter Products
                </h3>
              </div>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="text-text-muted hover:text-text-secondary p-1 rounded-lg hover:bg-slate-100 transition-colors text-xs font-bold"
              >
                ✕ Close Panel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Filter Column 1: Price Range */}
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[11px] uppercase font-bold text-text-secondary">
                  Price Range (₹ INR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-surface-subtle border border-hairline rounded-lg text-xs font-inter focus:outline-none focus:border-primary-container"
                  />
                  <span className="text-text-muted text-xs font-bold">–</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-surface-subtle border border-hairline rounded-lg text-xs font-inter focus:outline-none focus:border-primary-container"
                  />
                </div>
                {/* Price Presets */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice('3000'); setPage(1); }}
                    className="px-2 py-1 bg-surface-subtle hover:bg-slate-200 text-text-secondary rounded text-[10px] font-label-caps uppercase"
                  >
                    &lt; ₹3k
                  </button>
                  <button
                    onClick={() => { setMinPrice('3000'); setMaxPrice('8000'); setPage(1); }}
                    className="px-2 py-1 bg-surface-subtle hover:bg-slate-200 text-text-secondary rounded text-[10px] font-label-caps uppercase"
                  >
                    ₹3k–₹8k
                  </button>
                  <button
                    onClick={() => { setMinPrice('8000'); setMaxPrice(''); setPage(1); }}
                    className="px-2 py-1 bg-surface-subtle hover:bg-slate-200 text-text-secondary rounded text-[10px] font-label-caps uppercase"
                  >
                    &gt; ₹8k
                  </button>
                </div>
              </div>

              {/* Filter Column 2: Keyword / Search */}
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[11px] uppercase font-bold text-text-secondary">
                  Search Products
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search watches, jewellery, accessories..."
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-surface-subtle border border-hairline rounded-lg text-xs font-inter focus:outline-none focus:border-primary-container"
                  />
                  <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-2.5 top-2.5">
                    search
                  </span>
                </div>
              </div>

              {/* Filter Column 3: Category Selector */}
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[11px] uppercase font-bold text-text-secondary">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-surface-subtle border border-hairline rounded-lg text-xs font-inter font-semibold text-text-secondary focus:outline-none focus:border-primary-container"
                >
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Column 4: Quick Clear */}
              <div className="flex flex-col justify-end gap-2">
                <button
                  onClick={resetAllFilters}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-text-secondary rounded-lg font-label-caps text-[11px] uppercase font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Clear All Filters</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Active Filters Tags Row */}
        <div className="flex items-center flex-wrap gap-2 font-label-caps text-[11px] min-h-[32px]">
          <span className="text-text-muted uppercase tracking-wider font-bold">Active Filters:</span>

          {activeFiltersCount === 0 && (
            <span className="text-slate-400 font-normal italic text-xs">
              None applied (Showing all available products)
            </span>
          )}

          {/* Category Tag */}
          {selectedCategory !== 'All Collections' && (
            <span className="bg-white border border-hairline text-text-secondary px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold animate-in fade-in">
              Category: {selectedCategory}
              <button
                onClick={() => {
                  setSelectedCategory('All Collections');
                  setPage(1);
                }}
                className="hover:text-primary transition-colors leading-none text-slate-400 hover:text-slate-800 ml-1 font-bold text-sm"
                title="Remove Category Filter"
              >
                ×
              </button>
            </span>
          )}

          {/* In Stock Tag */}
          {inStockOnly && (
            <span className="bg-white border border-hairline text-text-secondary px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold animate-in fade-in">
              Status: Available In Stock
              <button
                onClick={() => {
                  setInStockOnly(false);
                  setPage(1);
                }}
                className="hover:text-primary transition-colors leading-none text-slate-400 hover:text-slate-800 ml-1 font-bold text-sm"
                title="Remove Stock Filter"
              >
                ×
              </button>
            </span>
          )}

          {/* On Sale Tag */}
          {onSaleOnly && (
            <span className="bg-white border border-hairline text-text-secondary px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold animate-in fade-in">
              Price Discount Applied
              <button
                onClick={() => {
                  setOnSaleOnly(false);
                  setPage(1);
                }}
                className="hover:text-primary transition-colors leading-none text-slate-400 hover:text-slate-800 ml-1 font-bold text-sm"
                title="Remove Sale Filter"
              >
                ×
              </button>
            </span>
          )}

          {/* Verified Authenticity Tag */}
          {verifiedOnly && (
            <span className="bg-white border border-hairline text-text-secondary px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold animate-in fade-in">
              Certified Authenticity Only
              <button
                onClick={() => {
                  setVerifiedOnly(false);
                  setPage(1);
                }}
                className="hover:text-primary transition-colors leading-none text-slate-400 hover:text-slate-800 ml-1 font-bold text-sm"
                title="Remove Verified Filter"
              >
                ×
              </button>
            </span>
          )}

          {/* Price Range Tag */}
          {(minPrice !== '' || maxPrice !== '') && (
            <span className="bg-white border border-hairline text-text-secondary px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold animate-in fade-in">
              Price: ₹{minPrice || '0'} – ₹{maxPrice || 'Any'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  setPage(1);
                }}
                className="hover:text-primary transition-colors leading-none text-slate-400 hover:text-slate-800 ml-1 font-bold text-sm"
                title="Remove Price Filter"
              >
                ×
              </button>
            </span>
          )}

          {/* Keyword Search Tag */}
          {searchFilter.trim() && (
            <span className="bg-white border border-hairline text-text-secondary px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 font-bold animate-in fade-in">
              Search: "{searchFilter}"
              <button
                onClick={() => {
                  setSearchFilter('');
                  setPage(1);
                }}
                className="hover:text-primary transition-colors leading-none text-slate-400 hover:text-slate-800 ml-1 font-bold text-sm"
                title="Remove Search Term"
              >
                ×
              </button>
            </span>
          )}

          {/* Reset All Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="text-primary hover:text-primary/80 hover:underline uppercase tracking-wider ml-2 font-bold transition-all text-xs"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* 4. Products Grid */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-hairline p-4 space-y-4 shadow-sm">
                <div className="aspect-[4/5] bg-slate-100 rounded-lg" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 text-red-700">
            <p className="font-bold text-sm">Failed to load products</p>
            <p className="text-xs mt-1 text-red-600">{error?.data?.message || 'Please check your connection or try again.'}</p>
          </div>
        )}

        {/* Empty State when 0 products match active filters */}
        {!isLoading && !isError && filteredProducts.length === 0 && (
          <div className="w-full bg-white rounded-2xl border border-hairline p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm my-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-amber-600">search_off</span>
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <h3 className="font-headline-sm text-lg font-bold text-text-secondary uppercase tracking-tight">
                No Products Match Your Criteria
              </h3>
              <p className="font-inter text-xs text-text-muted leading-relaxed">
                We could not find any products currently matching your active combination of filters and price range.
              </p>
            </div>
            <button
              onClick={resetAllFilters}
              className="mt-2 px-6 py-2.5 bg-primary-container text-text-primary rounded-lg font-label-caps text-[11px] uppercase font-bold hover:bg-accent-hover transition-colors shadow-sm"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Products Grid rendering */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <div
            className={
              layoutMode === 'grid4'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
                : layoutMode === 'grid3'
                ? 'grid grid-cols-1 md:grid-cols-3 gap-6'
                : 'grid grid-cols-1 gap-4'
            }
          >
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* 5. Pagination & Results Navigation */}
        {filteredProducts.length > 0 && (
          <div className="w-full bg-white p-4 rounded-xl shadow-xs border border-hairline flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
            {/* Items Per Page */}
            <div className="flex items-center gap-2 text-text-muted font-inter text-xs">
              <span className="font-label-caps text-[10px] uppercase text-text-secondary font-bold">Show:</span>
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-hairline">
                <button
                  onClick={() => { setPageSize(12); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${pageSize === 12 ? 'bg-text-secondary text-white shadow-xs' : 'text-text-secondary hover:bg-slate-200'}`}
                >
                  12
                </button>
                <button
                  onClick={() => { setPageSize(24); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${pageSize === 24 ? 'bg-text-secondary text-white shadow-xs' : 'text-text-secondary hover:bg-slate-200'}`}
                >
                  24
                </button>
                <button
                  onClick={() => { setPageSize(48); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${pageSize === 48 ? 'bg-text-secondary text-white shadow-xs' : 'text-text-secondary hover:bg-slate-200'}`}
                >
                  48
                </button>
              </div>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-lg border border-hairline flex items-center justify-center text-text-secondary hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-9 h-9 rounded-lg font-label-caps text-xs font-bold transition-all ${
                        page === pNum
                          ? 'bg-primary-container text-text-primary shadow-sm ring-2 ring-primary-container/40'
                          : 'bg-surface-subtle hover:bg-slate-100 text-text-secondary border border-hairline'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-lg border border-hairline flex items-center justify-center text-text-secondary hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Institutional Trust & Guarantee Section */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 w-full mt-16">
        <div className="bg-white rounded-2xl border border-hairline p-8 lg:p-10 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-text-primary flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-headline-sm text-[15px] text-text-secondary font-bold uppercase tracking-tight">
                100% Genuine &amp; Verified Quality
              </h4>
              <p className="font-inter text-xs text-text-muted leading-relaxed">
                Every product is tested, certified, and quality-inspected before packaging and shipping to your doorstep.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[28px]">local_shipping</span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-headline-sm text-[15px] text-text-secondary font-bold uppercase tracking-tight">
                Fast Pan-India Express Delivery
              </h4>
              <p className="font-inter text-xs text-text-muted leading-relaxed">
                Reliable express courier delivery with live tracking and SMS alerts across 19,000+ pincodes in India.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-text-secondary text-primary-container flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[28px]">account_balance</span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-headline-sm text-[15px] text-text-secondary font-bold uppercase tracking-tight">
                100% Safe &amp; Secure Payments
              </h4>
              <p className="font-inter text-xs text-text-muted leading-relaxed">
                All transactions are processed through encrypted, secure payment gateways with complete 7-day buyer protection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Institutional Dark Navy Footer */}
      <footer className="w-full bg-text-secondary text-white pt-14 pb-8 mt-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-12 gap-8 pb-10 border-b border-slate-800">
            {/* Brand column */}
            <div className="col-span-12 lg:col-span-5 pr-0 lg:pr-8">
              <div className="flex items-center mb-4">
                <img src="/logo.png" alt="Center Shopping Logo" className="h-16 w-auto max-h-16 object-contain" />
              </div>
              <p className="font-inter text-xs text-secondary-fixed-dim mb-6 max-w-md leading-relaxed">
                Center Shopping - India's trusted online store for certified watches, fine jewellery, lifestyle accessories, and daily essentials with pan-India delivery.
              </p>
              <div className="flex flex-col gap-2 max-w-md">
                <span className="font-label-caps text-[11px] text-primary-container uppercase font-bold">
                  Get Exclusive Deals &amp; Offers
                </span>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-[#0d1b36] px-4 py-2.5 rounded-lg text-white font-inter text-xs border border-slate-700/60 focus:outline-none placeholder:text-slate-500"
                    placeholder="Enter your email address..."
                    type="email"
                  />
                  <button className="bg-primary-container text-text-primary px-5 py-2.5 rounded-lg font-label-caps text-[11px] uppercase font-bold hover:bg-accent-hover transition-colors whitespace-nowrap">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-2 flex flex-col gap-2.5">
              <h4 className="font-label-caps text-[11px] uppercase text-primary-container tracking-wider mb-1">
                Categories
              </h4>
              <button onClick={() => { setSelectedCategory('All Collections'); }} className="text-left font-inter text-xs text-slate-300 hover:text-white transition-colors">
                All Products
              </button>
              <button onClick={() => { setSelectedCategory('Watches'); }} className="text-left font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Watches &amp; Timepieces
              </button>
              <button onClick={() => { setSelectedCategory('Jewelry'); }} className="text-left font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Gold &amp; Jewellery
              </button>
              <button onClick={() => { setSelectedCategory('Electronics'); }} className="text-left font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Electronics &amp; Gadgets
              </button>
              <button onClick={() => { setSelectedCategory('Fashion'); }} className="text-left font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Fashion &amp; Accessories
              </button>
            </div>

            <div className="col-span-12 sm:col-span-4 lg:col-span-2 flex flex-col gap-2.5">
              <h4 className="font-label-caps text-[11px] uppercase text-primary-container tracking-wider mb-1">
                Customer Care
              </h4>
              <Link href="/orders" className="font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Track My Order
              </Link>
              <Link href="/cart" className="font-inter text-xs text-slate-300 hover:text-white transition-colors">
                My Shopping Cart
              </Link>
              <Link href="/account" className="font-inter text-xs text-slate-300 hover:text-white transition-colors">
                My Account
              </Link>
              <a href="#" className="font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Returns &amp; Refunds
              </a>
              <a href="#" className="font-inter text-xs text-slate-300 hover:text-white transition-colors">
                Shipping Policy
              </a>
            </div>

            <div className="col-span-12 sm:col-span-4 lg:col-span-3 flex flex-col gap-3">
              <h4 className="font-label-caps text-[11px] uppercase text-primary-container tracking-wider mb-1">
                Trust &amp; Security
              </h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 p-2 bg-[#0d1b36] border border-slate-700/50 rounded-lg">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">verified_user</span>
                  <div>
                    <div className="font-inter text-xs font-bold text-white">GST Invoicing Available</div>
                    <div className="font-label-caps text-[9px] text-secondary-fixed-dim uppercase">GSTIN: 29AAACD1234E1Z5</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#0d1b36] border border-slate-700/50 rounded-lg">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">security</span>
                  <div>
                    <div className="font-inter text-xs font-bold text-white">100% Genuine Products</div>
                    <div className="font-label-caps text-[9px] text-secondary-fixed-dim uppercase">Authorized Retailer</div>
                  </div>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <div className="px-2 py-1 bg-[#0d1b36] rounded text-[10px] font-label-caps text-secondary-fixed-dim uppercase border border-slate-800">
                  UPI / GPay / PhonePe
                </div>
                <div className="px-2 py-1 bg-[#0d1b36] rounded text-[10px] font-label-caps text-secondary-fixed-dim uppercase border border-slate-800">
                  Credit / Debit Cards
                </div>
                <div className="px-2 py-1 bg-[#0d1b36] rounded text-[10px] font-label-caps text-secondary-fixed-dim uppercase border border-slate-800">
                  Cash on Delivery (COD)
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-inter text-xs text-secondary-fixed-dim">
              © 2024-2025 Center Shopping India Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6 font-inter text-xs text-secondary-fixed-dim">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Customer Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
