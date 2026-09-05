import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../slices/authSlice.js';

// When running in browser on Vercel (or any non-localhost host), always use same-origin relative /api/v1
// Next.js rewrites in next.config.mjs automatically proxy /api/v1 to the live VPS backend
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!isLocalhost) {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
      return '/api/v1';
    }
    return envUrl || '/api/v1';
  }
  return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result?.error && result?.error.status === 401) {
    const errCode = result.error.data?.errorCode;
    if (errCode === 'USER_NOT_FOUND' || errCode === 'INVALID_TOKEN' || errCode === 'TOKEN_EXPIRED') {
      api.dispatch(logout());
    }
  }
  return result;
};

export const ecomApi = createApi({
  reducerPath: 'ecomApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Cart', 'Order', 'Coupon', 'AdminStats', 'AdminCustomers', 'AdminSalesAgents'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Cart', 'Order', 'AdminStats'],
    }),
    googleAuth: builder.mutation({
      query: (payload) => ({
        url: '/auth/google',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Cart', 'Order', 'AdminStats', 'AdminCustomers'],
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['AdminCustomers', 'AdminSalesAgents'],
    }),
    getProfile: builder.query({
      query: () => '/auth/profile',
    }),

    // Products
    getProducts: builder.query({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.search) query.set('search', params.search);
        if (params?.category) query.set('category', params.category);
        if (params?.minPrice) query.set('minPrice', params.minPrice);
        if (params?.maxPrice) query.set('maxPrice', params.maxPrice);
        if (params?.inStockOnly) query.set('inStockOnly', 'true');
        if (params?.includeExpired) query.set('includeExpired', 'true');
        if (params?.sortBy) query.set('sortBy', params.sortBy);
        if (params?.page) query.set('page', params.page);
        if (params?.limit) query.set('limit', params.limit);
        return `/products?${query.toString()}`;
      },
      providesTags: ['Product'],
    }),
    getProductBySlug: builder.query({
      query: (slug) => `/products/slug/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Product', id: slug }],
    }),
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    getCategories: builder.query({
      query: () => '/products/categories',
    }),
    createProduct: builder.mutation({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product', 'AdminStats'],
    }),
        updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Product', 'AdminStats'],
    }),
    updateStock: builder.mutation({
      query: ({ variantId, stockQuantity }) => ({
        url: `/products/variants/${variantId}/stock`,
        method: 'PATCH',
        body: { stockQuantity },
      }),
      invalidatesTags: ['Product', 'AdminStats'],
    }),

    // Cart
    getCart: builder.query({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation({
      query: ({ variantId, quantity }) => ({
        url: '/cart/items',
        method: 'POST',
        body: { variantId, quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation({
      query: ({ itemId, quantity }) => ({
        url: `/cart/items/${itemId}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation({
      query: (itemId) => ({
        url: `/cart/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Coupons
    validateCoupon: builder.mutation({
      query: ({ code, subtotal }) => ({
        url: '/coupons/validate',
        method: 'POST',
        body: { code, subtotal },
      }),
    }),
    getAllCoupons: builder.query({
      query: () => '/coupons',
      providesTags: ['Coupon'],
    }),
    createCoupon: builder.mutation({
      query: (body) => ({
        url: '/coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),

    // Checkout & Orders
    checkout: builder.mutation({
      query: (payload) => ({
        url: '/orders/checkout',
        method: 'POST',
        headers: payload.idempotencyKey ? { 'idempotency-key': payload.idempotencyKey } : {},
        body: payload,
      }),
      invalidatesTags: ['Cart', 'Order', 'Product', 'AdminStats'],
    }),
    getOrders: builder.query({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.status) query.set('status', params.status);
        if (params?.page) query.set('page', params.page);
        if (params?.limit) query.set('limit', params.limit);
        return `/orders?${query.toString()}`;
      },
      providesTags: ['Order'],
    }),
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status, notes }) => ({
        url: `/orders/${orderId}/status`,
        method: 'PATCH',
        body: { status, notes },
      }),
      invalidatesTags: ['Order', 'AdminStats'],
    }),
    cancelOrder: builder.mutation({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Order', 'Product', 'AdminStats'],
    }),

    // Admin Dashboard
    getAdminStats: builder.query({
      query: () => '/admin/stats',
      providesTags: ['AdminStats'],
    }),
    getAdminCustomers: builder.query({
      query: (search = '') => `/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      providesTags: ['AdminCustomers'],
    }),
    getAdminSalesAgents: builder.query({
      query: () => '/admin/sales-agents',
      providesTags: ['AdminSalesAgents'],
    }),
    assignCustomerAgent: builder.mutation({
      query: ({ customerId, salesAgentId }) => ({
        url: `/admin/customers/${customerId}/agent`,
        method: 'PATCH',
        body: { salesAgentId },
      }),
      invalidatesTags: ['AdminCustomers', 'AdminSalesAgents'],
    }),
    createSalesAgent: builder.mutation({
      query: (agentData) => ({
        url: '/admin/sales-agents',
        method: 'POST',
        body: agentData,
      }),
      invalidatesTags: ['AdminSalesAgents'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGoogleAuthMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useGetProductsQuery,
  useGetProductBySlugQuery,
  useGetProductByIdQuery,
  useGetCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateStockMutation,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  useValidateCouponMutation,
  useGetAllCouponsQuery,
  useCreateCouponMutation,
  useCheckoutMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
  useGetAdminStatsQuery,
  useGetAdminCustomersQuery,
  useGetAdminSalesAgentsQuery,
  useAssignCustomerAgentMutation,
  useCreateSalesAgentMutation,
} = ecomApi;
