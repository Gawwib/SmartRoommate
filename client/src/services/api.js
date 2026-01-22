import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

export function setAuthToken(token) {
  if (token) API.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete API.defaults.headers.common.Authorization;
}

export function clearAuthToken() {
  delete API.defaults.headers.common.Authorization;
}

const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
if (storedToken) {
  setAuthToken(storedToken);
}

API.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
