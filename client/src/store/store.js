import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

/**
 * The Redux store — the single source of truth for global state.
 * As we add more slices (e.g. a leave slice later), register them here under
 * `reducer`. configureStore sets up good defaults (Redux DevTools, thunk).
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
