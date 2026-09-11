import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

/**
 * Auth slice (Redux Toolkit)
 * ---------------------------
 * Holds the logged-in user + token in global state, so any component can read
 * "who is logged in" without prop-drilling.
 *
 * We persist token + user in localStorage so a page refresh doesn't log you out.
 * The slice's initial state is seeded from localStorage.
 *
 * `loginUser` is an async thunk: it calls the backend, and Redux Toolkit
 * automatically dispatches pending/fulfilled/rejected actions we handle below.
 */

// Seed initial state from localStorage (survives refresh).
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async thunk: log in via the backend.
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return res.data; // { success, user, token }
    } catch (err) {
      // Pass a clean error message to the rejected case.
      return rejectWithValue(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous logout: clear state + storage.
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Persist so refresh keeps you logged in.
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
