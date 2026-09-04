'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGetProductsQuery, useGetCategoriesQuery } from '../../redux/services/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import ProductCard from '../../components/ProductCard.js';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';
  const catParam = searchParams.get('category') || searchParams.get('cat') || '';
  const parseCatParam = (param) => {
    if (!param || param === 'all') return [];
    return param.split(',').map((c) => c.trim()).filter(Boolean);
  };

  // Local search input with Debouncing
  const [searchInput, setSearchInput] = useState(queryParam);
  const debouncedSearch = useDebounce(searchInput, 400);

  const [selectedCategories, setSelectedCategories] = useState(() => parseCatParam(catParam));
  const [sortBy, setSortBy] = useState('curated');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Sync state if URL params change externally
  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setSelectedCategories(parseCatParam(catParam));
  }, [catParam]);

  const toggleCategory = (cat) => {
    setPage(1);
    setSelectedCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (next.length > 0) params.set('category', next.join(','));
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
      return next;
    });
  };

  const toggleAllCategories = () => {
    setPage(1);
    setSelectedCategories([]);
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  };

  // When debounced search term changes, update URL smoothly
  useEffect(() => {
    if (debouncedSearch !== queryParam) {
      setPage(1);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    }
  }, [debouncedSearch, queryParam, selectedCategories, router]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategories, sortBy, inStockOnly, minPrice, maxPrice]);

  // Categories query
  const { data: categoriesData } = useGetCategoriesQuery();
  const categories = categoriesData?.data || categoriesData || [];

  // Products query with pagination and filters
  const { data: productsData, isLoading, isFetching } = useGetProductsQuery({
    search: debouncedSearch.trim() || undefined,
    category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
    inStockOnly: inStockOnly || undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    sortBy: sortBy !== 'curated' ? sortBy : undefined,
    page,
    limit,
  });

  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : Array.isArray(productsData)
    ? productsData
    : productsData?.products || [];

  const pagination = productsData?.meta || productsData?.pagination || {
    page: 1,
    totalPages: Math.ceil(products.length / limit) || 1,
    totalItems: products.length,
  };

  const getPageRange = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pb-20 font-inter">
      {/* Header Search Banner */}
      <section className="bg-white border-b border-hairline py-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-montserrat text-[10px] uppercase tracking-widest text-[#fca311] font-bold">
              Global Catalog Search &amp; Discovery
            </span>
            {isFetching && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Filtering...
              </span>
            )}
          </div>
          <h1 className="font-montserrat text-2xl sm:text-3xl font-extrabold text-[#14213D] uppercase tracking-tight">
            Search Authenticated Physical Reserves
          </h1>

          {/* Search Input Bar with Debouncing Indicator */}
          <div className="mt-6 max-w-2xl relative">
            <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products, brands, categories and more..."
              className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#14213D] shadow-xs transition"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1"
                title="Clear Search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Filter & Results Layout */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Filter Rail (3 cols) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-hairline shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <h3 className="font-montserrat text-xs uppercase tracking-wider text-[#14213D] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Refine Search
              </h3>
              {(selectedCategories.length > 0 || inStockOnly || minPrice || maxPrice || sortBy !== 'curated') && (
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setInStockOnly(false);
                    setMinPrice('');
                    setMaxPrice('');
                    setSortBy('curated');
                  }}
                  className="text-[10px] text-amber-600 hover:text-amber-700 font-bold uppercase"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Category Multiselect Checkboxes Filter */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block font-montserrat text-[11px] font-bold text-[#14213D] uppercase tracking-wider">
                  Category
                </label>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={toggleAllCategories}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold uppercase"
                  >
                    Clear ({selectedCategories.length})
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {/* All Categories checkbox option */}
                <label
                  onClick={toggleAllCategories}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs select-none border ${
                    selectedCategories.length === 0
                      ? 'bg-amber-500/10 border-amber-500/40 text-slate-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === 0}
                      onChange={toggleAllCategories}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span>All Categories</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">
                    1050+
                  </span>
                </label>

                {/* Individual Categories checkboxes */}
                {categories.map((cat, idx) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={idx}
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs select-none border ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                        <span>{cat}</span>
                      </div>
                      {isChecked ? (
                        <span className="material-symbols-outlined text-[16px] text-amber-600">check_circle</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">175</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Stock Availability */}
            <div>
              <label className="block font-montserrat text-[11px] font-bold text-[#14213D] uppercase tracking-wider mb-2.5">
                Availability
              </label>
              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">In Stock Only</span>
              </label>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block font-montserrat text-[11px] font-bold text-[#14213D] uppercase tracking-wider mb-2.5">
                Price Range (₹)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-[#14213D]"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-[#14213D]"
                />
              </div>
            </div>
          </div>

          {/* Right Results Grid & Pagination (9 cols) */}
          <div className="lg:col-span-9 flex flex-col gap-6">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-hairline shadow-xs flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <strong className="font-bold text-slate-900">{products.length}</strong> of{' '}
                  <strong className="font-bold text-slate-900">{pagination.totalItems || products.length}</strong> authenticated assets
                  {debouncedSearch && (
                    <span> matching "<strong className="text-slate-900 font-bold">{debouncedSearch}</strong>"</span>
                  )}
                </div>

                {/* Sorting Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="font-montserrat text-[10px] uppercase font-bold text-slate-400">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="curated">Featured Curations</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="title">Alphabetical (A - Z)</option>
                  </select>
                </div>
              </div>

              {/* Active Category Badges */}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mr-1">
                    Filtered Categories:
                  </span>
                  {selectedCategories.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 bg-[#14213D] text-[#fca311] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs"
                    >
                      <span>{c}</span>
                      <button
                        onClick={() => toggleCategory(c)}
                        className="hover:text-white transition flex items-center"
                        title={`Remove ${c} filter`}
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={toggleAllCategories}
                    className="text-[11px] text-amber-600 hover:text-amber-800 hover:underline font-bold ml-1"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-white border border-slate-200 rounded-2xl animate-pulse p-4">
                    <div className="w-full h-48 bg-slate-100 rounded-xl mb-4"></div>
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-hairline p-12 text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[32px]">search_off</span>
                </div>
                <h3 className="font-montserrat text-lg font-bold text-slate-900 uppercase">
                  No Matching Assets Found
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No catalog items matched your active search query or filter criteria. Try clearing search filters or searching for terms like "Gold", "Watch", or "Ingot".
                </p>
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSelectedCategory('all');
                    setInStockOnly(false);
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#fca311] hover:bg-[#e5940e] text-[#14213D] font-montserrat text-xs uppercase font-extrabold tracking-wider transition shadow-sm"
                >
                  Clear All Filters &amp; Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  Previous
                </button>

                {getPageRange(page, pagination.totalPages).map((pageNum, idx) =>
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold transition ${
                        page === pageNum
                          ? 'bg-[#14213D] text-[#fca311] shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages || isFetching}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs flex items-center gap-1"
                >
                  Next
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-inter text-xs text-text-muted">Loading products...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
