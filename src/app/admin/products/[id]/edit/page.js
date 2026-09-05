'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import {
  useGetProductByIdQuery,
  useGetCategoriesQuery,
  useUpdateProductMutation,
  useGetProductsQuery,
  useGetOrdersQuery,
  useGetAdminCustomersQuery,
  useGetAllCouponsQuery,
  useGetAdminSalesAgentsQuery,
} from '@/redux/services/api.js';
import { logout } from '@/redux/slices/authSlice.js';
import { showToast } from '@/redux/slices/cartSlice.js';
import { formatPrice, formatDate, getProductImage } from '@/utils/helpers.js';

const STANDARD_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Jewelry & Watches',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Footwear & Travel',
  'Gold Bullion',
  'Accessories',
];

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const productId = params?.id;

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SALES_AGENT';

  // Fetch product data
  const {
    data: productData,
    isLoading: isProductLoading,
    error: productError,
    refetch: refetchProduct,
  } = useGetProductByIdQuery(productId, { skip: !productId || !isStaff });

  // Fetch categories
  const { data: categoriesData } = useGetCategoriesQuery(undefined, { skip: !isStaff });

  // Sidebar metrics queries
  const { data: productsData } = useGetProductsQuery({ limit: 2000 }, { skip: !isStaff });
  const { data: ordersData } = useGetOrdersQuery(undefined, { skip: !isStaff });
  const { data: customersData } = useGetAdminCustomersQuery('', { skip: !isStaff });
  const { data: couponsData } = useGetAllCouponsQuery(undefined, { skip: !isStaff });
  const { data: salesAgentsData } = useGetAdminSalesAgentsQuery(undefined, { skip: !isStaff });

  const rawProducts = Array.isArray(productsData?.data)
    ? productsData.data
    : Array.isArray(productsData?.data?.products)
    ? productsData.data.products
    : Array.isArray(productsData?.products)
    ? productsData.products
    : [];

  const rawOrders = Array.isArray(ordersData?.data)
    ? ordersData.data
    : Array.isArray(ordersData?.data?.orders)
    ? ordersData.data.orders
    : Array.isArray(ordersData?.orders)
    ? ordersData.orders
    : [];

  const rawCoupons = Array.isArray(couponsData?.data)
    ? couponsData.data
    : Array.isArray(couponsData?.data?.coupons)
    ? couponsData.data.coupons
    : Array.isArray(couponsData?.coupons)
    ? couponsData.coupons
    : [];

  const rawCustomers = Array.isArray(customersData?.data)
    ? customersData.data
    : Array.isArray(customersData)
    ? customersData
    : [];

  const rawSalesAgents = Array.isArray(salesAgentsData?.data)
    ? salesAgentsData.data
    : Array.isArray(salesAgentsData)
    ? salesAgentsData
    : [];

  // Mutation
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    imageUrl: '',
    description: '',
    isPublished: true,
    expiryDate: '',
  });

  const [variants, setVariants] = useState([]);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Populate form once productData is loaded
  useEffect(() => {
    const prod = productData?.data || productData;
    if (prod && prod.id) {
      const cat = typeof prod.category === 'string' ? prod.category : prod.category?.name || 'Electronics';
      const img = prod.imageUrl || prod.images?.[0]?.url || '';

      setFormData({
        title: prod.title || '',
        category: cat,
        imageUrl: img,
        description: prod.description || '',
        isPublished: prod.isPublished !== undefined ? prod.isPublished : true,
        expiryDate: prod.expiryDate ? new Date(prod.expiryDate).toISOString().split('T')[0] : '',
      });

      setImageLoadError(false);

      if (prod.variants && Array.isArray(prod.variants) && prod.variants.length > 0) {
        setVariants(
          prod.variants.map((v) => ({
            id: v.id,
            title: v.title || 'Standard Variant',
            sku: v.sku || '',
            price: v.price?.toString() || '0',
            stockQuantity: v.stockQuantity?.toString() || '0',
            lowStockThreshold: v.lowStockThreshold?.toString() || '5',
          }))
        );
      } else {
        setVariants([
          {
            id: undefined,
            title: 'Standard Variant',
            sku: `CS-SKU-${prod.id.slice(0, 4).toUpperCase()}-1`,
            price: prod.basePrice?.toString() || '0',
            stockQuantity: '50',
            lowStockThreshold: '5',
          },
        ]);
      }
    }
  }, [productData]);

  // Derived Categories list
  const availableCategories = Array.from(
    new Set([
      ...STANDARD_CATEGORIES,
      ...(Array.isArray(categoriesData?.data) ? categoriesData.data : Array.isArray(categoriesData) ? categoriesData : []),
      formData.category,
    ].filter(Boolean))
  );

  // Variant management handlers
  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddVariant = () => {
    const nextIndex = variants.length + 1;
    const newSku = `CS-SKU-${(productId || 'PRD').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setVariants((prev) => [
      ...prev,
      {
        id: undefined,
        title: `Variant ${nextIndex}`,
        sku: newSku,
        price: variants[0]?.price || '999',
        stockQuantity: '25',
        lowStockThreshold: '5',
      },
    ]);
    dispatch(showToast({ type: 'info', message: 'New variant row added. Fill in details and click Save.' }));
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      dispatch(showToast({ type: 'error', message: 'Products must contain at least 1 variant.' }));
      return;
    }
    const targetTitle = variants[index].title || `Variant ${index + 1}`;
    setVariants((prev) => prev.filter((_, i) => i !== index));
    dispatch(showToast({ type: 'info', message: `Removed ${targetTitle}` }));
  };

  // Save product changes
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      dispatch(showToast({ type: 'error', message: 'Product title is required' }));
      return;
    }

    if (variants.length === 0) {
      dispatch(showToast({ type: 'error', message: 'At least one variant is required' }));
      return;
    }

    // Validate variants
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.title.trim()) {
        dispatch(showToast({ type: 'error', message: `Variant #${i + 1} must have a title` }));
        return;
      }
      if (isNaN(Number(v.price)) || Number(v.price) < 0) {
        dispatch(showToast({ type: 'error', message: `Variant "${v.title}" has an invalid price` }));
        return;
      }
      if (isNaN(Number(v.stockQuantity)) || Number(v.stockQuantity) < 0) {
        dispatch(showToast({ type: 'error', message: `Variant "${v.title}" has invalid stock` }));
        return;
      }
    }

    try {
      const payload = {
        id: productId,
        title: formData.title.trim(),
        category: formData.category,
        imageUrl: formData.imageUrl.trim() || null,
        description: formData.description.trim(),
        isPublished: formData.isPublished,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
        variants: variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          title: v.title.trim(),
          sku: v.sku.trim().toUpperCase(),
          price: parseFloat(v.price),
          stockQuantity: parseInt(v.stockQuantity, 10),
          lowStockThreshold: parseInt(v.lowStockThreshold || '5', 10),
        })),
      };

      await updateProduct(payload).unwrap();
      dispatch(showToast({ type: 'success', message: `Product "${formData.title}" saved successfully!` }));
      refetchProduct();
    } catch (err) {
      console.error('Update Product Error:', err);
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to update product details' }));
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  if (!isAuthenticated || !isStaff) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6 font-inter">
        <div className="max-w-md w-full bg-[#1E293B] border border-slate-700 rounded-2xl p-8 text-center shadow-xl">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-3">lock</span>
          <h2 className="text-xl font-bold font-montserrat text-white">Staff Clearance Required</h2>
          <p className="text-xs text-slate-400 mt-2">
            You must be logged in as an Administrator or Sales Agent to edit product specifications.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
          >
            <span>Go to Admin Login</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isProductLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-inter text-slate-600">
        <span className="material-symbols-outlined animate-spin text-4xl text-amber-500">progress_activity</span>
        <p className="text-xs font-semibold mt-4">Loading Complete Product Specifications...</p>
      </div>
    );
  }

  if (productError || !productData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-inter">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">error</span>
          <h3 className="text-lg font-bold text-slate-900">Product Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            The requested product (ID: {productId}) could not be retrieved from the catalog database.
          </p>
          <Link
            href="/admin"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs"
          >
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const prod = productData?.data || productData;
  const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stockQuantity, 10) || 0), 0);
  const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => parseFloat(v.price) || 0)) : 0;
  const maxPrice = variants.length > 0 ? Math.max(...variants.map((v) => parseFloat(v.price) || 0)) : 0;
  const priceDisplay = minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  const previewImage = formData.imageUrl?.trim() || getProductImage(formData.title || prod.title, '');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex overflow-x-hidden font-inter">
      {/* 1. LEFT FIXED SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0F172A] text-slate-300 z-50 flex flex-col justify-between py-6 border-r border-slate-800 shadow-xl">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center px-6">
            <Link href="/admin">
              <img
                src="/logo.png"
                alt="Center Shopping"
                className="w-44 h-auto max-h-20 object-contain brightness-0 invert cursor-pointer"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </Link>
          </div>

          {/* Section Divider */}
          <div className="px-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Operations</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin?tab=dashboard' },
              { id: 'products', label: 'Products', icon: 'inventory_2', badge: rawProducts.length || '12', href: '/admin?tab=products' },
              { id: 'orders', label: 'Orders', icon: 'shopping_bag', badge: rawOrders.length || '0', href: '/admin?tab=orders' },
              { id: 'customers', label: 'Customers', icon: 'group', badge: rawCustomers.length, href: '/admin?tab=customers' },
              { id: 'coupons', label: 'Coupons', icon: 'confirmation_number', badge: rawCoupons.length, href: '/admin?tab=coupons' },
              { id: 'sales-agents', label: 'Sales Agents', icon: 'badge', badge: rawSalesAgents.length, href: '/admin?tab=sales-agents' },
              { id: 'reports', label: 'Reports', icon: 'query_stats', href: '/admin?tab=reports' },
            ].map((tab) => {
              const isActive = tab.id === 'products';
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Governance Area */}
        <div className="px-4 flex flex-col gap-3">
          <div className="px-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Governance & Control</p>
          </div>
          <Link
            href="/admin?tab=system-settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span>System Settings</span>
          </Link>

          {/* Real-Time Node Status Pill */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Store Database</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Security Sync</span>
              <span className="text-amber-400 font-semibold">100% Active</span>
            </div>
          </div>

          {/* Quick User & Storefront Link */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 px-1">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>View Storefront</span>
            </Link>
            <button
              onClick={() => {
                dispatch(logout());
                router.push('/login');
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONSOLE CONTENT (Offset by Left Sidebar) */}
      <div className="pl-72 w-full flex flex-col min-h-screen">
        {/* 1. TOP HEADER & BREADCRUMBS BAR */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/admin?tab=products"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Catalog</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <nav className="flex items-center gap-1.5 text-xs text-slate-400">
                <Link href="/admin" className="hover:text-slate-600 transition">
                  Admin Console
                </Link>
                <span>/</span>
                <Link href="/admin?tab=products" className="hover:text-slate-600 transition">
                  Products
                </Link>
                <span>/</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                  {formData.title || 'Edit Product'}
                </span>
              </nav>
            </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {prod.slug && (
              <Link
                href={`/products/${prod.slug}`}
                target="_blank"
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs transition shadow-2xs"
                title="View live product listing on storefront"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500">open_in_new</span>
                <span className="hidden sm:inline">Storefront View</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => router.push('/admin?tab=products')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="edit-product-form"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Title Header with Quick Metrics */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200/60">
                  {formData.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: #{productId.slice(-8).toUpperCase()}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    totalStock > 10
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : totalStock > 0
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      totalStock > 10 ? 'bg-emerald-500' : totalStock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                  {totalStock > 10 ? 'In Stock' : totalStock > 0 ? 'Low Stock' : 'Out of Stock'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-montserrat text-slate-900 tracking-tight mt-1.5">
                {formData.title || 'Edit Product Asset'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Full-spectrum editing for asset information, variant matrices, inventory thresholds, and media assets.
              </p>
            </div>

            {/* Quick Summary Pill Box */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="px-3 border-r border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Variants</p>
                <p className="text-base font-bold text-slate-900">{variants.length} Variants</p>
              </div>
              <div className="px-3 border-r border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Units</p>
                <p className="text-base font-bold text-slate-900">{totalStock} in stock</p>
              </div>
              <div className="px-3">
                <p className="text-[10px] uppercase font-bold text-slate-400">Pricing Range</p>
                <p className="text-base font-bold text-amber-600 font-montserrat">{priceDisplay}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT 8 COLS: Core Details + Comprehensive Variant Matrix */}
            <div className="lg:col-span-8 space-y-8">
              {/* SECTION A: Product Information */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-[22px] text-amber-600">inventory_2</span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    General Asset Details
                  </h3>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Product Title / Asset Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Bata Summit Slip-On Orthopedic Comfort Slides for Daily Wear"
                    className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:border-amber-500 outline-none transition shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the full descriptive brand title that will appear in customer searches and invoices.
                  </p>
                </div>

                {/* Category & Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Store Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-amber-500 outline-none transition"
                    >
                      {availableCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Batch Expiry / Sales End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-amber-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Detailed Asset Description
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {formData.description.length} characters
                    </span>
                  </div>
                  <textarea
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide detailed material specifications, packaging dimensions, warranty terms, and certification..."
                    className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:border-amber-500 outline-none transition resize-none shadow-2xs leading-relaxed"
                  />
                </div>

                {/* Published toggle */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Catalog Publication Visibility</h4>
                    <p className="text-[11px] text-slate-400">
                      When published, this product is immediately available for customer cart checkout.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              {/* SECTION B: Complete Variants Matrix */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px] text-amber-600">style</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Variant Specifications &amp; Stock Levels
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Configure size, shade, unit pricing, SKU codes, and low-inventory safety alerts.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 transition-colors shadow-2xs self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>+ Add New Variant</span>
                  </button>
                </div>

                {/* Variant List / Cards */}
                <div className="space-y-4">
                  {variants.map((v, index) => {
                    const isLowStock =
                      (parseInt(v.stockQuantity, 10) || 0) <= (parseInt(v.lowStockThreshold, 10) || 5);
                    const isZeroStock = (parseInt(v.stockQuantity, 10) || 0) === 0;

                    return (
                      <div
                        key={v.id || `temp-${index}`}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isZeroStock
                            ? 'bg-rose-50/40 border-rose-200'
                            : isLowStock
                            ? 'bg-amber-50/30 border-amber-200'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Variant Header Row */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {v.title || `Variant ${index + 1}`}
                            </span>
                            {isZeroStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-100 text-rose-700">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                                Low Stock Alert
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                Healthy Stock
                              </span>
                            )}
                          </div>

                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(index)}
                              className="text-slate-400 hover:text-rose-600 p-1 text-xs flex items-center gap-1 transition"
                              title="Delete this variant"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                              <span className="hidden sm:inline text-[11px]">Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Variant Fields Grid - 2-Row Responsive Layout for Laptop 100% View & Mobile */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                          {/* Row 1: Designation (7 cols) & SKU (5 cols) */}
                          <div className="sm:col-span-7">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Variant Designation *
                            </label>
                            <input
                              type="text"
                              required
                              value={v.title}
                              onChange={(e) => handleVariantChange(index, 'title', e.target.value)}
                              placeholder="e.g. Size UK 9 / Tan Brown"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none shadow-2xs"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              SKU Code *
                            </label>
                            <input
                              type="text"
                              required
                              value={v.sku}
                              onChange={(e) => handleVariantChange(index, 'sku', e.target.value.toUpperCase())}
                              placeholder="e.g. CS-BATA-0994-UK9"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800 focus:border-amber-500 outline-none shadow-2xs"
                            />
                          </div>

                          {/* Row 2: Price (4 cols), Stock Units (4 cols), Alert Threshold (4 cols) */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Price (₹) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={v.price}
                                onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                placeholder="799"
                                className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold font-montserrat text-slate-900 focus:border-amber-500 outline-none shadow-2xs"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Stock Units *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={v.stockQuantity}
                              onChange={(e) => handleVariantChange(index, 'stockQuantity', e.target.value)}
                              placeholder="26"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-500 outline-none shadow-2xs"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Alert Threshold
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={v.lowStockThreshold}
                              onChange={(e) => handleVariantChange(index, 'lowStockThreshold', e.target.value)}
                              placeholder="5"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:border-amber-500 outline-none shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLS: Media & Live Image Preview + Inventory Summary */}
            <div className="lg:col-span-4 space-y-6 sticky top-20">
              {/* Media Asset Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-amber-600">photo_library</span>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Product Media &amp; Image
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Live Preview</span>
                </div>

                {/* Image URL Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Image Resource URL
                  </label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      setImageLoadError(false);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct HTTPS link to PNG, JPG, or WebP image.
                  </p>
                </div>

                {/* Live Image Rendering Container */}
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden aspect-square flex items-center justify-center group">
                  {imageLoadError ? (
                    <div className="p-6 text-center text-rose-500">
                      <span className="material-symbols-outlined text-3xl">broken_image</span>
                      <p className="text-xs font-bold mt-1">Image Load Error</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        The provided URL could not be resolved.
                      </p>
                    </div>
                  ) : (
                    <img
                      src={previewImage}
                      alt={formData.title || 'Product Image Preview'}
                      onError={() => setImageLoadError(true)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white p-2 rounded-lg text-[10px] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="truncate">{formData.title || 'Image Preview'}</span>
                    <span className="text-amber-400 font-bold shrink-0">1:1 Ratio</span>
                  </div>
                </div>

                {/* Preset Suggestions / Quick Actions */}
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Image Status:</span>
                  <span
                    className={`font-semibold ${
                      formData.imageUrl ? (imageLoadError ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-500'
                    }`}
                  >
                    {formData.imageUrl
                      ? imageLoadError
                        ? 'Invalid URL'
                        : 'Custom Image Active'
                      : 'Category Default'}
                  </span>
                </div>
              </div>

              {/* Inventory Governance Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-[20px] text-amber-600">tune</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Inventory Governance
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Aggregate Units:</span>
                    <span className="font-bold text-slate-900">{totalStock} Units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Variant Configurations:</span>
                    <span className="font-bold text-slate-900">{variants.length} Matrix Items</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Base Unit Valuation:</span>
                    <span className="font-bold text-amber-600 font-montserrat">{priceDisplay}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-600">{prod.createdAt ? formatDate(prod.createdAt) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Last Modified:</span>
                    <span className="text-slate-600">{prod.updatedAt ? formatDate(prod.updatedAt) : 'Just now'}</span>
                  </div>
                </div>

                {/* Save CTA */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">
                          progress_activity
                        </span>
                        <span>Saving All Changes...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        <span>Update Product &amp; Variants</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
        </main>
      </div>
    </div>
  );
}
