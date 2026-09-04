import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeCoupon: null,
  toast: null, // { type: 'success' | 'error' | 'info', message: string }
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setActiveCoupon: (state, action) => {
      state.activeCoupon = action.payload;
    },
    removeActiveCoupon: (state) => {
      state.activeCoupon = null;
    },
    showToast: (state, action) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
  },
});

export const { setActiveCoupon, removeActiveCoupon, showToast, clearToast } = cartSlice.actions;
export default cartSlice.reducer;
