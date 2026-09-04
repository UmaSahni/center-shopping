import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import cartReducer from './slices/cartSlice.js';
import { ecomApi } from './services/api.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    [ecomApi.reducerPath]: ecomApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ecomApi.middleware),
});
