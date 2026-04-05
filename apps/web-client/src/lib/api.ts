import axios from 'axios';
// ... existing exports
export const getMyItems = () => API.get('/items/mine');

const API = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // 🍪 CRITICAL: Allows browser to send/receive HttpOnly cookies automatically
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