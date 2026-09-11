import axios from 'axios';

/**
 * Central Axios instance for all API calls.
 * ------------------------------------------
 * Instead of calling axios directly everywhere (and repeating the base URL and
 * the auth header), we configure ONE instance here and import it wherever we
 * need to talk to the backend.
 *
 * Two interceptors do the heavy lifting:
 *  - request:  automatically attach the JWT (from localStorage) to every request
 *  - response: if the server says 401 (token invalid/expired), log the user out
 *              and send them back to the login page.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach the token to every outgoing request, if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired/invalid tokens globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if we're not already on the login page.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
