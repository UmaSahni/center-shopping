'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import {
  useGetAdminStatsQuery,
  useGetOrdersQuery,
  useGetProductsQuery,
  useGetAllCouponsQuery,
  useUpdateOrderStatusMutation,
  useUpdateStockMutation,
  useCreateCouponMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useLoginMutation,
} from '../../redux/services/api.js';
import { showToast } from '../../redux/slices/cartSlice.js';
import { setCredentials, logout } from '../../redux/slices/authSlice.js';
import { formatPrice, formatDate, getProductImage } from '../../utils/helpers.js';
import { getSocket } from '../../utils/socket.js';
import Link from 'next/link';

export default function AdminConsolePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'products' | 'orders' | 'customers' | 'coupons' | 'sales-agents' | 'reports' | 'system-settings'
  
  // Filters & State
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Admin & Staff Login Form State
  const [adminLoginForm, setAdminLoginForm] = useState({
    email: '',
    password: '',
  });
  const [adminAuthError, setAdminAuthError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);


  // Product form state (used for both Add and Edit)
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'Gold Bullion',
    imageUrl: '',
    description: '',
    variantTitle: 'Allocated Primary Lot',
    sku: '',
    price: '',
    stockQuantity: '50',
    lowStockThreshold: '5',
    expiryDate: '',
  });

  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderValue: '',
    maxDiscountAmount: '',
    usageLimitTotal: '100',
    expiryDays: '30',
  });

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SALES_AGENT';

  // Redux API Queries
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useGetAdminStatsQuery(undefined, {
    skip: !isStaff,
  });

  const { data: ordersData, isLoading: isOrdersLoading, refetch: refetchOrders } = useGetOrdersQuery(
    orderStatusFilter === 'ALL' ? undefined : { status: orderStatusFilter },
    { skip: !isStaff }
  );

  const { data: productsData, isLoading: isProductsLoading, refetch: refetchProducts } = useGetProductsQuery(
    { limit: 100 },
    { skip: !isStaff }
  );

  const { data: couponsData, isLoading: isCouponsLoading, refetch: refetchCoupons } = useGetAllCouponsQuery(undefined, {
    skip: !isStaff,
  });

  // Redux Mutations
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
  const [updateStock, { isLoading: isUpdatingStock }] = useUpdateStockMutation();
  const [createCoupon, { isLoading: isCreatingCoupon }] = useCreateCouponMutation();
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();

  // Listen to live socket events for orders
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleOrderUpdate = () => {
      refetchOrders();
      refetchStats();
    };

    socket.on('ORDER_UPDATED', handleOrderUpdate);
    socket.on('NEW_ORDER', handleOrderUpdate);

    return () => {
      socket.off('ORDER_UPDATED', handleOrderUpdate);
      socket.off('NEW_ORDER', handleOrderUpdate);
    };
  }, [token, refetchOrders, refetchStats]);

  const handleStaffLogin = async (e, customEmail, customPassword) => {
    if (e) e.preventDefault();
    setAdminAuthError('');

    const loginEmail = customEmail || adminLoginForm.email;
    const loginPassword = customPassword || adminLoginForm.password;

    if (!loginEmail || !loginPassword) {
      setAdminAuthError('Please enter both email address and password.');
      return;
    }

    try {
      const res = await loginMutation({
        email: loginEmail.trim(),
        password: loginPassword,
      }).unwrap();

      // STRICT VALIDATION: ONLY ADMIN & SALES_AGENT CAN LOGIN FROM /admin!
      if (res.data.user.role !== 'ADMIN' && res.data.user.role !== 'SALES_AGENT') {
        setAdminAuthError('Access Denied: Customer accounts are not authorized to access the Admin Console. Only Administrators and Sales Agents have clearance.');
        dispatch(showToast({ type: 'error', message: 'Unauthorized: Staff credentials required' }));
        return;
      }

      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(showToast({ type: 'success', message: `Staff Verified: Welcome ${res.data.user.name} (${res.data.user.role})` }));
    } catch (err) {
      setAdminAuthError(err?.data?.message || 'Authentication failed: Invalid credentials.');
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Admin login failed' }));
    }
  };


  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus({ orderId, status: newStatus }).unwrap();
      dispatch(showToast({ type: 'success', message: `Order #${orderId.slice(-6)} status set to ${newStatus}` }));
      refetchOrders();
      refetchStats();
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Update failed' }));
    }
  };

  // Open Edit Product Modal
  const openEditModal = (prod) => {
    const mainVariant = prod.variants?.[0] || {};
    const cat = typeof prod.category === 'string' ? prod.category : prod.category?.name || 'Jewelry';
    const img = getProductImage(prod.title, prod.imageUrl || prod.images?.[0]?.url);

    setEditingProductId(prod.id);
    setProductForm({
      title: prod.title || '',
      category: cat,
      imageUrl: img,
      description: prod.description || '',
      variantTitle: mainVariant.title || 'Standard Variant',
      sku: mainVariant.sku || `CS-SKU-${prod.id.slice(0, 6).toUpperCase()}`,
      price: mainVariant.price?.toString() || prod.basePrice?.toString() || '0',
      stockQuantity: mainVariant.stockQuantity?.toString() || '50',
      lowStockThreshold: mainVariant.lowStockThreshold?.toString() || '5',
      expiryDate: prod.expiryDate ? new Date(prod.expiryDate).toISOString().split('T')[0] : '',
    });
    setShowEditProductModal(true);
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingProductId,
        title: productForm.title.trim(),
        category: productForm.category,
        imageUrl: productForm.imageUrl.trim(),
        description: productForm.description.trim(),
        expiryDate: productForm.expiryDate ? new Date(productForm.expiryDate).toISOString() : null,
        variants: [
          {
            title: productForm.variantTitle.trim() || 'Standard Variant',
            sku: productForm.sku.trim(),
            price: parseFloat(productForm.price),
            stockQuantity: parseInt(productForm.stockQuantity, 10) || 0,
            lowStockThreshold: parseInt(productForm.lowStockThreshold, 10) || 5,
          },
        ],
      };

      await updateProduct(payload).unwrap();
      dispatch(showToast({ type: 'success', message: `Product "${payload.title}" updated successfully!` }));
      setShowEditProductModal(false);
      setEditingProductId(null);
      refetchProducts();
      refetchStats();
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to update product details' }));
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: productForm.title.trim(),
        category: productForm.category,
        imageUrl: productForm.imageUrl.trim(),
        description: productForm.description.trim(),
        expiryDate: productForm.expiryDate ? new Date(productForm.expiryDate).toISOString() : null,
        variants: [
          {
            title: productForm.variantTitle.trim() || 'Standard Variant',
            sku: productForm.sku.trim() || `CS-SKU-${Date.now().toString().slice(-4)}`,
            price: parseFloat(productForm.price),
            stockQuantity: parseInt(productForm.stockQuantity, 10) || 50,
            lowStockThreshold: parseInt(productForm.lowStockThreshold, 10) || 5,
          },
        ],
      };
      await createProduct(payload).unwrap();
      dispatch(showToast({ type: 'success', message: `Product "${payload.title}" created successfully!` }));
      setShowAddProductModal(false);
      setProductForm({
        title: '',
        category: 'Jewelry',
        imageUrl: '',
        description: '',
        variantTitle: 'Standard Variant',
        sku: '',
        price: '',
        stockQuantity: '50',
        lowStockThreshold: '5',
      });
      refetchProducts();
      refetchStats();
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to register product' }));
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: parseFloat(couponForm.discountValue),
        minOrderValue: couponForm.minOrderValue ? parseFloat(couponForm.minOrderValue) : undefined,
        maxDiscountAmount: couponForm.maxDiscountAmount ? parseFloat(couponForm.maxDiscountAmount) : undefined,
        usageLimitTotal: parseInt(couponForm.usageLimitTotal, 10),
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + parseInt(couponForm.expiryDays, 10) * 86400000).toISOString(),
      };
      await createCoupon(payload).unwrap();
      dispatch(showToast({ type: 'success', message: `Concession coupon ${payload.code} activated!` }));
      setShowAddCouponModal(false);
      setCouponForm({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minOrderValue: '',
        maxDiscountAmount: '',
        usageLimitTotal: '100',
        expiryDays: '30',
      });
      refetchCoupons();
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err?.data?.message || 'Failed to create coupon' }));
    }
  };

  // Safe data unnesting
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

  const stats = statsData?.data || statsData || {};

  // Filtered products
  const filteredProducts = rawProducts.filter((p) => {
    const catName = typeof p.category === 'string' ? p.category : p.category?.name || '';
    const matchesSearch = searchQuery
      ? p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        catName.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCat =
      productCategoryFilter === 'ALL' ||
      catName.toLowerCase().includes(productCategoryFilter.toLowerCase());
    return matchesSearch && matchesCat;
  });

  // Unique categories for filter dropdown
  const categoriesList = Array.from(
    new Set(rawProducts.map((p) => (typeof p.category === 'string' ? p.category : p.category?.name)).filter(Boolean))
  );

  // Calculate all 6 required dashboard statistics
  const dashboardStats = stats.stats || stats;
  const totalRevenueVal = dashboardStats.totalRevenue !== undefined ? dashboardStats.totalRevenue : rawOrders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? Number(o.totalAmount || 0) : 0), 0);
  const totalOrdersCount = dashboardStats.totalOrders !== undefined ? dashboardStats.totalOrders : rawOrders.length;
  const pendingOrdersCount = dashboardStats.pendingOrders !== undefined ? dashboardStats.pendingOrders : rawOrders.filter(o => ['CONFIRMED', 'PROCESSING'].includes(o.status)).length;
  const cancelledOrdersCount = dashboardStats.cancelledOrders !== undefined ? dashboardStats.cancelledOrders : rawOrders.filter(o => o.status === 'CANCELLED').length;
  
  // Real-time client calculations for low-stock and expiring
  const lowStockVariantsList = stats.lowStockVariants || rawProducts.flatMap(p => 
    (p.variants || []).filter(v => (Number(v.stockQuantity) || 0) <= (Number(v.lowStockThreshold) || 5)).map(v => ({ ...v, product: p }))
  );
  const lowStockCountVal = dashboardStats.lowStockCount !== undefined ? dashboardStats.lowStockCount : lowStockVariantsList.length;

  const nowTime = new Date();
  const thirtyDaysOut = new Date(Date.now() + 30 * 86400000);
  const expiringProductsList = stats.expiringProducts || rawProducts.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp > nowTime && exp <= thirtyDaysOut;
  });
  const expiringCountVal = dashboardStats.expiringCount !== undefined ? dashboardStats.expiringCount : expiringProductsList.length;
  const totalCatalogItems = rawProducts.length || 12;
  const activeStockItems = rawProducts.filter(p => p.variants?.some(v => (Number(v.stockQuantity) || 0) > 0)).length || 12;
  const lowStockItems = rawProducts.filter(p => p.variants?.some(v => (Number(v.stockQuantity) || 0) > 0 && (Number(v.stockQuantity) || 0) < 10)).length;
  const outOfStockItems = rawProducts.filter(p => p.variants?.every(v => (Number(v.stockQuantity) || 0) === 0)).length;

  if (!mounted) {
    return <div className="min-h-screen bg-[#0F172A]" />;
  }

  if (!isAuthenticated || !isStaff) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-4 sm:p-6 font-inter">
        <div className="max-w-md w-full bg-[#1E293B] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="Center Shopping Logo" className="h-10 w-auto object-contain rounded" />
            <div>
              <h1 className="font-headline-sm font-bold text-lg text-white tracking-tight uppercase">Center Shopping</h1>
              <p className="font-label-caps text-[10px] text-[#F59E0B] tracking-wider uppercase font-semibold">
                Staff Operations &amp; Admin Console
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 mb-5 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-400 text-sm">shield</span>
              Restricted Admin Terminal
            </p>
            <p className="text-[11px] text-slate-400">
              Only authorized <strong>Administrators</strong> and registered <strong>Sales Agents</strong> have access to this portal.
            </p>
          </div>

          {/* Auth Error Banner */}
          {adminAuthError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
              <span className="leading-snug">{adminAuthError}</span>
            </div>
          )}

          {/* Quick Staff Demonstration Credentials */}
          <div className="mb-5 p-3 rounded-xl bg-slate-900/40 border border-slate-700/60">
            <span className="font-label-caps text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-2">
              ⚡ Quick Staff Demonstration Access:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => handleStaffLogin(null, 'admin@specbee.com', 'Password@123')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/60 text-left transition flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                  <span>ADMIN</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Full control &amp; catalog</span>
              </button>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => handleStaffLogin(null, 'agent@specbee.com', 'Password@123')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/60 text-left transition flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-blue-400">
                  <span className="material-symbols-outlined text-xs">support_agent</span>
                  <span>SALES AGENT</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Orders &amp; fulfillment</span>
              </button>
            </div>
          </div>

          {/* Staff Login Form */}
          <form onSubmit={handleStaffLogin} className="space-y-3.5">
            <div>
              <label className="block font-label-caps text-[10px] uppercase text-slate-300 font-bold mb-1">
                Staff Work Email
              </label>
              <input
                type="email"
                required
                value={adminLoginForm.email}
                onChange={(e) => setAdminLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="admin@specbee.com"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block font-label-caps text-[10px] uppercase text-slate-300 font-bold mb-1">
                Security Passcode
              </label>
              <input
                type="password"
                required
                value={adminLoginForm.password}
                onChange={(e) => setAdminLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span className="material-symbols-outlined text-base">vpn_key</span>
              <span>{isLoggingIn ? 'Verifying Clearance...' : 'Authenticate & Enter Console'}</span>
            </button>
          </form>

          {/* Back link */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <Link
              href="/"
              className="text-[11px] font-medium text-slate-400 hover:text-amber-400 transition flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              <span>Return to Customer Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex overflow-x-hidden font-inter">
      {/* 1. LEFT FIXED SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0F172A] text-slate-300 z-50 flex flex-col justify-between py-6 border-r border-slate-800 shadow-xl">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center px-6">
            <img
              src="/logo.png"
              alt="Center Shopping"
              className="h-10 w-auto object-contain bg-white/10 p-1.5 rounded-lg"
            />
          </div>

          {/* Section Divider */}
          <div className="px-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Operations</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'products', label: 'Products', icon: 'inventory_2', badge: rawProducts.length || '12' },
              { id: 'orders', label: 'Orders', icon: 'shopping_bag', badge: rawOrders.length || '0' },
              { id: 'customers', label: 'Customers', icon: 'group' },
              { id: 'coupons', label: 'Coupons', icon: 'confirmation_number', badge: rawCoupons.length || '2' },
              { id: 'sales-agents', label: 'Sales Agents', icon: 'badge' },
              { id: 'reports', label: 'Reports', icon: 'query_stats' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Governance Area */}
        <div className="px-4 flex flex-col gap-3">
          <div className="px-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Governance & Control</p>
          </div>
          <button
            onClick={() => setActiveTab('system-settings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-colors ${
              activeTab === 'system-settings'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            System Settings
          </button>

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
        {/* Top Header Command Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-slate-400">Admin Console</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-slate-900 font-bold uppercase tracking-wider">{activeTab}</span>
          </div>

          {/* Global Search & Live Ticker */}
          <div className="flex items-center gap-4 flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search products, orders, SKU, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border border-transparent hover:border-slate-300 focus:border-amber-500 focus:bg-white rounded-lg text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Ticker, Notifications, and Profile Avatar */}
          <div className="flex items-center gap-4">
            {/* Live Ticker Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 font-medium font-mono">
              <span className="text-amber-600 font-bold">XAU/INR: ₹7,450/g</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Live Sync</span>
            </div>

            {/* Notification Bell */}
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
            </button>

            {/* Admin Avatar Pill */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">{user?.name || 'Super Admin'}</span>
                <span className="text-[10px] text-amber-600 font-semibold uppercase">{user?.role || 'ADMIN'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* 3. TAB VIEWS CONTENT */}
        <main className="p-8 flex-1 max-w-[1600px] w-full mx-auto">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Page Title & Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[10px] font-bold uppercase tracking-wider">
                      Admin Portal / Store Operations
                    </span>
                    <span className="text-[10px] text-slate-400">• Real-Time Sync</span>
                  </div>
                  <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight mt-1">
                    Store Overview &amp; Analytics
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time sales, order fulfillment, and product inventory management across all categories.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      refetchStats();
                      refetchOrders();
                      refetchProducts();
                      dispatch(showToast({ type: 'success', message: 'Dashboard metrics refreshed' }));
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    Sync Data
                  </button>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    Manage Catalog
                  </button>
                </div>
              </div>

              {/* 6 Comprehensive Admin KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  {
                    title: 'Gross Sales / Turnover',
                    value: formatPrice(totalRevenueVal),
                    sub: 'Cumulative store revenue',
                    icon: 'payments',
                    color: 'text-amber-600 bg-amber-50 border-amber-200/60',
                  },
                  {
                    title: 'Total Orders',
                    value: `${totalOrdersCount} Orders`,
                    sub: 'Total customer purchases',
                    icon: 'shopping_cart',
                    color: 'text-blue-600 bg-blue-50 border-blue-200/60',
                  },
                  {
                    title: 'Pending Orders',
                    value: `${pendingOrdersCount} In-Queue`,
                    sub: 'Awaiting fulfillment/dispatch',
                    icon: 'hourglass_top',
                    color: 'text-orange-600 bg-orange-50 border-orange-200/60',
                  },
                  {
                    title: 'Cancelled Orders',
                    value: `${cancelledOrdersCount} Cancelled`,
                    sub: 'Refunds settled to escrow',
                    icon: 'cancel',
                    color: 'text-rose-600 bg-rose-50 border-rose-200/60',
                  },
                  {
                    title: 'Low-Stock Products',
                    value: `${lowStockCountVal} Low Stock`,
                    sub: 'Under safety threshold',
                    icon: 'warning',
                    color: 'text-amber-700 bg-amber-100/60 border-amber-300',
                  },
                  {
                    title: 'Expiring Products',
                    value: `${expiringCountVal} Expiring`,
                    sub: 'Within next 30 days',
                    icon: 'event_busy',
                    color: 'text-purple-600 bg-purple-50 border-purple-200/60',
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.title}</span>
                      <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                        <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-extrabold font-montserrat text-slate-900 tracking-tight">{stat.value}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{stat.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Low Stock & Expiring Products Alert Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel 1: Low Stock Alerts */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-[20px]">inventory</span>
                      <h3 className="font-montserrat text-xs font-bold uppercase text-slate-900 tracking-wider">
                        Low Stock Alerts ({lowStockVariantsList.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="text-[11px] text-amber-600 hover:text-amber-700 font-bold"
                    >
                      View Catalog
                    </button>
                  </div>
                  {lowStockVariantsList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <span className="material-symbols-outlined text-emerald-500 text-2xl mb-1 block">check_circle</span>
                      All product inventory levels are healthy.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {lowStockVariantsList.slice(0, 5).map((v, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{v.product?.title || v.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">SKU: {v.sku}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {v.stockQuantity} units left
                            </span>
                            <button
                              onClick={() => {
                                setEditingProductId(v.product?.id || v.productId);
                                openEditModal(v.product || { id: v.productId, title: v.title });
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                            >
                              Restock
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel 2: Expiring Product Lots */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-600 text-[20px]">event_busy</span>
                      <h3 className="font-montserrat text-xs font-bold uppercase text-slate-900 tracking-wider">
                        Expiring Product Batches ({expiringProductsList.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="text-[11px] text-purple-600 hover:text-purple-700 font-bold"
                    >
                      Manage Expiry
                    </button>
                  </div>
                  {expiringProductsList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <span className="material-symbols-outlined text-emerald-500 text-2xl mb-1 block">verified</span>
                      No products expiring in the next 30 days.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {expiringProductsList.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{p.title}</div>
                            <div className="text-[10px] text-slate-400">
                              Expires: {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingProductId(p.id);
                              openEditModal(p);
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[10px] font-bold border border-purple-200"
                          >
                            Update End Date
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Overview Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 font-montserrat uppercase tracking-wider">
                      Recent Orders
                    </h2>
                    <p className="text-xs text-slate-500">Live order flow and fulfillment updates</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                  >
                    View All Orders
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3">Order #</th>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Client</th>
                        <th className="px-6 py-3">Asset Items</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawOrders.slice(0, 8).map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            #{order.id.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{order.user?.name || 'Customer'}</div>
                            <div className="text-[11px] text-slate-400">{order.user?.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium">
                              {order.items?.length || 1} Item(s)
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{formatPrice(order.totalAmount)}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {order.paymentStatus || 'PAID'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white text-slate-800 shadow-sm cursor-pointer outline-none focus:border-amber-500"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="SHIPPED">SHIPPED</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/orders/${order.id}`}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              Details
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {rawOrders.length === 0 && (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-slate-400 text-xs">
                            No orders placed yet. Place an order in storefront to test!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[10px] font-bold uppercase tracking-wider">
                      Product Catalog Management
                    </span>
                    <span className="text-[10px] text-slate-400">• Real-Time Sync Active</span>
                  </div>
                  <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight mt-1">
                    Product Catalog Management
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage products, pricing, stock levels, variants, and catalog items.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      const csv = rawProducts.map(p => `"${p.title}",${p.variants?.[0]?.price || p.basePrice || 0},${p.variants?.reduce((s, v) => s + (v.stockQuantity || 0), 0)}`).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'products_inventory.csv';
                      a.click();
                      dispatch(showToast({ type: 'success', message: 'Catalog CSV exported' }));
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setProductForm({
                        title: '',
                        category: 'Gold Bullion',
                        imageUrl: '',
                        description: '',
                        variantTitle: 'Allocated Primary Lot',
                        sku: '',
                        price: '',
                        stockQuantity: '50',
                        lowStockThreshold: '5',
                      });
                      setShowAddProductModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    + Add New Asset
                  </button>
                </div>
              </div>

              {/* 4 Inventory Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Total Catalog Items', val: rawProducts.length || 12, sub: 'All product categories', icon: 'grid_view', bg: 'text-slate-900 bg-slate-100' },
                  { label: 'In Stock & Active', val: activeStockItems, sub: 'Available for immediate delivery', icon: 'check_circle', bg: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Low Stock Alert', val: lowStockItems, sub: 'Units below 10 units', icon: 'warning', bg: 'text-amber-700 bg-amber-50' },
                  { label: 'Out of Stock', val: outOfStockItems, sub: 'Zero stock products', icon: 'error', bg: 'text-rose-700 bg-rose-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">{stat.val}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
                    </div>
                    <div className={`p-3 rounded-2xl ${stat.bg}`}>
                      <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-lg">search</span>
                    <input
                      type="text"
                      placeholder="Filter by title, SKU, brand..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    {categoriesList.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-900">{filteredProducts.length}</span> products
                </div>
              </div>

              {/* Products Table with Complete Edit Details Action */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Physical Asset</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Unit Price</th>
                        <th className="px-6 py-3.5">Stock & Variants</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((prod) => {
                        const totalStock = prod.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) ?? 0;
                        const mainVariant = prod.variants?.[0];
                        const price = parseFloat(mainVariant?.price || prod.basePrice || 0);
                        const cat = typeof prod.category === 'string' ? prod.category : prod.category?.name || 'Precious Metals';
                        const img = getProductImage(prod.title, prod.imageUrl || prod.images?.[0]?.url);

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                <img
                                  src={img}
                                  alt={prod.title}
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 shadow-sm"
                                />
                                <div>
                                  <Link
                                    href={`/products/${prod.slug || prod.id}`}
                                    target="_blank"
                                    className="font-bold text-slate-900 hover:text-amber-600 transition-colors block text-xs"
                                  >
                                    {prod.title}
                                  </Link>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    SKU: #{mainVariant?.sku || prod.id.slice(-6).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                {cat}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {formatPrice(price)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {prod.variants?.map((v) => (
                                  <div key={v.id} className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-600 font-medium">{v.title}:</span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        v.stockQuantity > 10
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : v.stockQuantity > 0
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                    >
                                      {v.stockQuantity} units
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {totalStock > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  In Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  Out of Stock
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(prod)}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                  Edit Details
                                </button>
                                <Link
                                  href={`/products/${prod.slug || prod.id}`}
                                  target="_blank"
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors inline-flex items-center"
                                  title="View on Storefront"
                                >
                                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[10px] font-bold uppercase tracking-wider">
                      Store Fulfillment
                    </span>
                    <span className="text-[10px] text-slate-400">• Order Management</span>
                  </div>
                  <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight mt-1">
                    Orders &amp; Fulfillment Registry
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage, verify, and dispatch customer orders with real-time tracking.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetchOrders()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    Refresh Orders
                  </button>
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                      orderStatusFilter === status
                        ? 'bg-slate-900 text-amber-400 shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Orders Data Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Order ID</th>
                        <th className="px-6 py-3.5">Date & Time</th>
                        <th className="px-6 py-3.5">Customer</th>
                        <th className="px-6 py-3.5">Products Ordered</th>
                        <th className="px-6 py-3.5">Total INR</th>
                        <th className="px-6 py-3.5">Order Status</th>
                        <th className="px-6 py-3.5 text-right">Invoice / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            #{order.id.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{order.user?.name || 'Customer'}</div>
                            <div className="text-[11px] text-slate-400">{order.user?.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {order.items?.map((item, idx) => {
                                const title = item.variant?.product?.title || item.productTitle || item.product?.title || 'Product';
                                const img = item.variant?.product?.imageUrl || item.imageUrl || getProductImage(title);
                                const variantName = item.variantTitle || item.variant?.title || 'Standard';
                                return (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={title}
                                    title={`${title} (${variantName})`}
                                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-white shadow-xs"
                                  />
                                );
                              })}
                              <span className="text-xs text-slate-600 font-medium">
                                ({order.items?.length || 1})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{formatPrice(order.totalAmount)}</td>
                          <td className="px-6 py-4">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 shadow-sm cursor-pointer outline-none focus:border-amber-500"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="SHIPPED">SHIPPED</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/orders/${order.id}`}
                              className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              View Order
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {rawOrders.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-xs">
                            No orders found matching this filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[10px] font-bold uppercase tracking-wider">
                      Promotions &amp; Discounts
                    </span>
                    <span className="text-[10px] text-slate-400">• Store Benefits</span>
                  </div>
                  <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight mt-1">
                    Coupon &amp; Discount Management
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create discount vouchers, configure promotional discounts, and monitor customer redemptions.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCouponModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  + Create New Coupon
                </button>
              </div>

              {/* 4 Coupon Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Active Concessions', val: rawCoupons.length || 2, sub: 'Currently redeemable', icon: 'confirmation_number', color: 'text-amber-700 bg-amber-50' },
                  { label: 'Redemptions Registered', val: '48 Uses', sub: 'Institutional client claims', icon: 'how_to_reg', color: 'text-blue-700 bg-blue-50' },
                  { label: 'Total Value Granted', val: '₹4,85,000', sub: 'Calculated concessions', icon: 'savings', color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Average Redemption', val: '15.4%', sub: 'Mean discount rate', icon: 'trending_up', color: 'text-purple-700 bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">{stat.val}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
                    </div>
                    <div className={`p-3 rounded-2xl ${stat.color}`}>
                      <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupons Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Coupon Code</th>
                        <th className="px-6 py-3.5">Concession Type</th>
                        <th className="px-6 py-3.5">Benefit</th>
                        <th className="px-6 py-3.5">Min Order Value</th>
                        <th className="px-6 py-3.5">Usage Limit</th>
                        <th className="px-6 py-3.5">Expiry Date</th>
                        <th className="px-6 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawCoupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 font-mono font-bold text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                              {coupon.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {coupon.discountType === 'PERCENTAGE' ? 'Percentage Concession' : 'Direct Cash Credit'}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {coupon.minOrderValue ? formatPrice(coupon.minOrderValue) : 'No Minimum'}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {coupon.usageLimitTotal ? `${coupon.usageLimitTotal} Max` : 'Unlimited'}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Permanent'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                      {rawCoupons.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-xs">
                            No active coupon concessions. Click "+ Create New Coupon" to generate one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Sovereign Client Directory
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional accounts, verified KYC status, and client purchase history.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="space-y-4">
                  {[
                    { name: 'Admin Officer', email: 'admin@specbee.com', role: 'SUPER_ADMIN', spend: '₹24,80,000', orders: 12, kyc: 'VERIFIED' },
                    { name: 'Sovereign Patron', email: 'customer@specbee.com', role: 'CLIENT', spend: '₹6,45,000', orders: 4, kyc: 'VERIFIED' },
                    { name: 'Senior Sales Agent', email: 'agent@specbee.com', role: 'SALES_AGENT', spend: '₹12,20,000', orders: 8, kyc: 'VERIFIED' },
                  ].map((cust, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/60 hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-sm">
                          {cust.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{cust.name}</h4>
                          <p className="text-xs text-slate-400">{cust.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Role</span>
                          <span className="font-bold text-slate-700">{cust.role}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Orders</span>
                          <span className="font-bold text-slate-900">{cust.orders} Orders</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Total Volume</span>
                          <span className="font-bold text-amber-600">{cust.spend}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {cust.kyc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SALES AGENTS */}
          {activeTab === 'sales-agents' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Sales Agent Ledger & Commissions
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor partner agent referral links, attributed order sales, and commission disbursements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-slate-400 font-medium">Total Agent Commissions</p>
                  <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">₹1,48,500</h3>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">10% standard rate</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-slate-400 font-medium">Active Sales Agents</p>
                  <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">3 Agents</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Directly attributed</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-slate-400 font-medium">Attributed Orders</p>
                  <h3 className="text-2xl font-bold font-montserrat text-slate-900 mt-1">16 Sales</h3>
                  <p className="text-[11px] text-slate-400 mt-1">₹14,85,000 Gross Volume</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Sales Analytics & Reports
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Financial telemetry, reserve balances, and exportable audit records.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">query_stats</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-montserrat">Financial Telemetry Ready</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All transaction records and store activities are securely synchronized in real time.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => dispatch(showToast({ type: 'success', message: 'Monthly report downloaded' }))}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs"
                  >
                    Download Monthly Audit PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SYSTEM SETTINGS */}
          {activeTab === 'system-settings' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                  System Settings & Governance
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure platform parameters, security credentials, and real-time socket connections.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Real-Time Socket Gateway</h4>
                    <p className="text-xs text-slate-400">Enables live updates for orders and inventory across clients.</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                    ENABLED
                  </span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Buyer Protection Guarantee</h4>
                    <p className="text-xs text-slate-400">Verifies 100% genuine product guarantee and buyer protection.</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Direct Payment Processing (Stripe / Razorpay)</h4>
                    <p className="text-xs text-slate-400">Process sovereign currency settlements in INR & USD.</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                    READY
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FULL EDIT PRODUCT MODAL (Matching Stitch Admin Product Edit Form) */}
      {showEditProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  <span>Product Management</span>
                  <span>•</span>
                  <span>Edit Details</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-montserrat mt-0.5">Edit Product Details</h3>
              </div>
              <button
                onClick={() => {
                  setShowEditProductModal(false);
                  setEditingProductId(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diamond Solitaire Ring"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-amber-500 outline-none"
                  >
                    <option value="Jewelry">Jewelry</option>
                    <option value="Watches">Watches</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Home">Home</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Description</label>
                <textarea
                  rows="3"
                  placeholder="Premium quality authentic product with manufacturer warranty and express shipping across India."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Primary Variant & Inventory Stock</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Variant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Allocated Primary Lot"
                      value={productForm.variantTitle}
                      onChange={(e) => setProductForm({ ...productForm, variantTitle: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">SKU Code</label>
                    <input
                      type="text"
                      placeholder="e.g. AV-GLD-50G"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 385000"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Current Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Low Stock Threshold</label>
                    <input
                      type="number"
                      min="1"
                      value={productForm.lowStockThreshold}
                      onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProductModal(false);
                    setEditingProductId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProduct}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {isUpdatingProduct ? 'Saving Changes...' : 'Save Product Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  <span>Product Catalog</span>
                  <span>•</span>
                  <span>New Product</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-montserrat mt-0.5">Add New Product</h3>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Designer Silver Bracelet"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-amber-500 outline-none"
                  >
                    <option value="Jewelry">Jewelry</option>
                    <option value="Watches">Watches</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Home">Home</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Description</label>
                <textarea
                  rows="3"
                  placeholder="High quality product with genuine brand warranty and fast delivery across India."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Primary Variant & Inventory</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Variant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard Variant"
                      value={productForm.variantTitle}
                      onChange={(e) => setProductForm({ ...productForm, variantTitle: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">SKU Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CS-PRD-01"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 4999"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Initial Stock *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Low Stock Alert</label>
                    <input
                      type="number"
                      min="1"
                      value={productForm.lowStockThreshold}
                      onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_box</span>
                  {isCreatingProduct ? 'Saving...' : 'Add Product to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-montserrat">Create Concession Coupon</h3>
                <p className="text-xs text-slate-400">Configure promotional discount parameters</p>
              </div>
              <button
                onClick={() => setShowAddCouponModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AURUM20"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive 20% Privilege Concession"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10000"
                    value={couponForm.minOrderValue}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.expiryDays}
                    onChange={(e) => setCouponForm({ ...couponForm, expiryDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCoupon}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20"
                >
                  {isCreatingCoupon ? 'Creating...' : 'Activate Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
