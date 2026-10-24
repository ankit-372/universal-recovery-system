import axios from 'axios';
// ... existing exports
export const getMyItems = () => API.get('/items/mine');

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const baseURL = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;

export const getProxyImageUrl = (url: string) => {
  if (!url) return '';
  return `${baseURL}/items/image/proxy?url=${encodeURIComponent(url)}`;
};

const API = axios.create({
  baseURL: baseURL,
  withCredentials: true, // 🍪 CRITICAL: Allows browser to send/receive HttpOnly cookies automatically
});

// Attach Bearer token as fallback for cross-site environments where cookies are blocked
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (email: string, password: string) =>
  API.post('/auth/login', { email, password });

export const logout = () =>
  API.post('/auth/logout');

export const checkAuth = () =>
  API.get('/auth/me'); // Calls the new endpoint to verify session

export const signup = (userData: any) =>
  API.post('/users', userData);

export const uploadItem = (formData: FormData) =>
  API.post('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const searchItems = (query: string) =>
  API.post('/items/search', { text: query });

export default API;