export function formatPrice(amount) {
  const val = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PRODUCT_IMAGE_MAP = {
  '100g 999.9 Fine Gold Minted Bar': 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=800&q=80',
  '1,000g Fine Silver Cast Ingot': 'https://images.unsplash.com/photo-1589782182703-2aaa69037b5b?auto=format&fit=crop&w=800&q=80',
  '10 oz Minted Palladium Bar': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
  '1882-CC Morgan Silver Dollar (GSA)': 'https://images.unsplash.com/photo-1598128558393-70ff21433be0?auto=format&fit=crop&w=800&q=80',
  'Platinum Commemorative Medallion': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
  'Natural Colombian Emerald 2.4ct': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
  '3.01ct Round Brilliant Diamond (D/VVS1)': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
  'Chronograph Obsidian V4 Automatic': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  'Titanium Dual-Time Edition': 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
  'Titanium Dual-Time Vault Edition': 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
  'Astronomer Perpetual Rose Gold': 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
  'Monogram Heritage Leather Briefcase': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  'Alligator Executive Portfolio Pad': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
};

export function getProductImage(title, defaultUrl) {
  if (defaultUrl && !defaultUrl.includes('photo-1610375461246')) {
    return defaultUrl;
  }
  if (title && PRODUCT_IMAGE_MAP[title]) {
    return PRODUCT_IMAGE_MAP[title];
  }

  const lower = (title || '').toLowerCase();
  if (lower.includes('cooker')) return 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('bedsheet') || lower.includes('bedding')) return 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('shoes') || lower.includes('sneakers')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('backpack') || lower.includes('daypack')) return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('watch') || lower.includes('timepiece')) return 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('earbuds') || lower.includes('neckband')) return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('bottle') || lower.includes('thermosteel')) return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('kurta') || lower.includes('sherwani')) return 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('serum')) return 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80';
  if (lower.includes('kettle')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80';

  return defaultUrl || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80';
}

export function getStatusBadge(status) {
  switch (status) {
    case 'CONFIRMED':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Order Confirmed',
      };
    case 'PROCESSING':
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
        label: 'Quality Check & Packing',
      };
    case 'SHIPPED':
      return {
        bg: 'bg-purple-50 text-purple-800 border-purple-200',
        dot: 'bg-purple-500',
        label: 'In Transit (Express Courier)',
      };
    case 'DELIVERED':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-600',
        label: 'Delivered',
      };
    case 'CANCELLED':
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
        label: 'Cancelled',
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: status,
      };
  }
}
