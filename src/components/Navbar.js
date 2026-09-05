'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice.js';
import { useGetCartQuery } from '../redux/services/api.js';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch cart if authenticated (called unconditionally)
  const { data: cartData } = useGetCartQuery(undefined, { skip: !isAuthenticated });
  const cart = cartData?.data || cartData;
  const items = cart?.items || [];
  const totalItems = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // If on admin routes, do not render consumer navbar
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleLogout = () => {
    dispatch(logout());
    setDropdownOpen(false);
    router.push('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="w-full z-50 bg-white font-inter">
      {/* 1. TOP ANNOUNCEMENT & PROVENANCE BAR */}
      <div className="w-full bg-[#14213D] text-white py-2 px-4 sm:px-6 lg:px-12 border-b border-white/10">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between font-label-caps text-[11px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium">
              Free Delivery on Orders Over ₹499 • 100% Safe &amp; Secure Shopping Guarantee
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-slate-300">
            <span>Customer Care: 1800-123-9876</span>
            <span className="text-slate-600">|</span>
            <Link href="/orders" className="hover:text-amber-400 transition-colors">
              Track Order
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>100% Authentic</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <header className="w-full bg-white shadow-[0_1px_8px_rgba(20,33,61,0.06)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-6">
          {/* Brand / Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img
              src="/logo.png"
              alt="Center Shopping"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain"
            />
          </Link>


          {/* Global Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative flex items-center bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 focus-within:border-amber-500 rounded-xl px-3 py-1 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, brands and more..."
                  className="w-full bg-transparent border-none text-slate-800 text-xs py-1.5 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </form>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-5">
            {/* Wishlist Icon */}
            <Link
              href="/orders"
              className="relative p-2 text-slate-700 hover:text-amber-600 transition-colors flex items-center"
              title="Wishlist"
            >
              <span className="material-symbols-outlined text-[22px]">bookmark</span>
            </Link>

            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-amber-600 transition-colors flex items-center"
              title="Shopping Cart"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              {mounted && totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-slate-950 font-montserrat font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="h-7 w-px bg-slate-200 hidden sm:block"></div>

            {/* User Profile / Authentication */}
            {mounted && isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-all text-left"
                >
                  <div className="flex flex-col items-end hidden sm:block">
                    <span className="font-label-caps text-[9px] text-slate-400 uppercase tracking-wider">Account</span>
                    <span className="font-label-caps text-[10px] text-amber-700 uppercase font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                      {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'SALES_AGENT' ? 'Sales Agent' : 'Customer'}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs shadow-sm">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2 z-50 animate-fadeIn"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    </div>

                    <Link
                      href="/orders"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg text-slate-500">receipt_long</span>
                      My Orders
                    </Link>

                    <Link
                      href="/account"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg text-slate-500">manage_accounts</span>
                      My Account &amp; Profile
                    </Link>

                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg text-amber-600">admin_panel_settings</span>
                        Admin Dashboard
                      </Link>
                    )}

                    {user?.role === 'SALES_AGENT' && (
                      <Link
                        href="/agent"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50/60 hover:bg-blue-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg text-blue-600">badge</span>
                        Sales Agent Portal
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : mounted && !isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-amber-600 uppercase tracking-wider transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 uppercase tracking-wider rounded-lg shadow-sm transition-all"
                >
                  Register
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* 3. CATEGORIES NAVIGATION BAR */}
        <div className="w-full border-t border-slate-100 bg-[#FBFBFB]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between py-1">
            <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none font-montserrat text-xs font-bold uppercase tracking-wider">
              <Link
                href="/search"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                All Products
              </Link>
              <Link
                href="/search?category=Electronics"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                Electronics
              </Link>
              <Link
                href="/search?category=Fashion"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                Fashion
              </Link>
              <Link
                href="/search?category=Jewelry+%26+Watches"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                Jewelry &amp; Watches
              </Link>
              <Link
                href="/search?category=Home+%26+Kitchen"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                Home &amp; Kitchen
              </Link>
              <Link
                href="/search?category=Beauty+%26+Personal+Care"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                Beauty &amp; Care
              </Link>
              <Link
                href="/search?category=Footwear+%26+Travel"
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all whitespace-nowrap"
              >
                Footwear &amp; Travel
              </Link>
            </nav>

            <div className="hidden lg:flex items-center gap-2 text-slate-500 font-label-caps text-[10px] uppercase tracking-wider font-semibold">
              <span className="material-symbols-outlined text-[14px] text-amber-600">local_shipping</span>
              <span>Pan-India Fast Delivery • COD Available</span>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
