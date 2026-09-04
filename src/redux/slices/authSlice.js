import { createSlice } from '@reduxjs/toolkit';

const getInitialUser = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ecom_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

const getInitialToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ecom_token') || null;
  }
  return null;
};

const initialState = {
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ecom_user', JSON.stringify(user));
        localStorage.setItem('ecom_token', token);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ecom_user');
        localStorage.removeItem('ecom_token');
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
