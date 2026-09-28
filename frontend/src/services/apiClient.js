import axios from 'axios';

const TOKEN_KEY = 'servimap_token';

export const getAuthToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setAuthToken = (token) => {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch { /* El estado se validará contra /auth/me. */ }
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && getAuthToken()) {
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('servimap:session-expired'));
  }
  return Promise.reject(error);
});

export default apiClient;
