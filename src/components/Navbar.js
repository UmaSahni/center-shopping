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
              Free Express Delivery on Orders Over ₹999 • 100% Secure Escrow Protection Guarantee
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-slate-300">
            <span>Customer Care: 1800-123-9876</span>
            <span className="text-slate-600">|</span>
            <Link href="/orders" className="hover:text-amber-400 transition-colors">
              Track Consignment
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Escrow Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <header className="w-full bg-white shadow-[0_1px_8px_rgba(20,33,61,0.06)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex items-center justify-between gap-6">
          {/* Brand / Logo */}
          <Link href="/" className="flex items-center group py-0.5">
            <img
              src="/logo.png"
              alt="Center Shopping"
              className="h-12 sm:h-14 w-auto max-h-14 object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>


          {/* Global Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative flex items-center bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 focus-within:border-amber-500 rounded-xl px-2 py-1 transition-all">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg text-slate-700 font-medium text-xs border border-slate-200/80 shadow-xs cursor-pointer select-none">
                  <span className="text-[11px] font-bold uppercase text-slate-800">All Vaults</span>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                </div>
                <div className="h-5 w-px bg-slate-200 mx-2"></div>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search authenticated bullion, timepieces, numismatics..."
                  className="w-full bg-transparent border-none text-slate-800 text-xs px-2.5 py-1.5 focus:outline-none placeholder:text-slate-400"
                />
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-slate-200/60 rounded text-[10px] font-mono text-slate-500 font-semibold mr-1">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>
            </form>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-5">
            {/* Wishlist Icon */}
            <Link
              href="/orders"
              className="relative p-2 text-slate-700 hover:text-amber-600 transition-colors flex items-center"
              title="Saved Vault Reserves"
            >
              <span className="material-symbols-outlined text-[22px]">bookmark</span>
            </Link>

            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-amber-600 transition-colors flex items-center"
              title="Custodial Allocation Cart"
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
                    <span className="font-label-caps text-[9px] text-slate-400 uppercase tracking-wider">Tier Status</span>
                    <span className="font-label-caps text-[10px] text-amber-700 uppercase font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                      {user?.role === 'ADMIN' ? 'Admin Officer' : 'Gold Member'}
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
                      Order History & Vault Records
                    </Link>

                    <Link
                      href="/account"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg text-slate-500">manage_accounts</span>
                      Client Dossier & Security
                    </Link>

                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-lg text-amber-600">admin_panel_settings</span>
                        Platform Admin Console
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
                  Open Vault
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
                href="/products?cat=Bullion"
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all"
              >
                Fine Bullion
              </Link>
              <Link
                href="/products?cat=Horology"
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all"
              >
                Haute Horlogerie
              </Link>
              <Link
                href="/products?cat=Coins"
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all"
              >
                Rare Minerals
              </Link>
              <Link
                href="/products"
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all"
              >
                Private Auctions
              </Link>
              <Link
                href="/products"
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all"
              >
                Vault Custody
              </Link>
            </nav>

            <div className="hidden lg:flex items-center gap-2 text-slate-400 font-label-caps text-[10px] uppercase tracking-wider font-semibold">
              <span className="material-symbols-outlined text-[14px] text-amber-600">lock</span>
              <span>Zurich • London • Singapore Vaults</span>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
