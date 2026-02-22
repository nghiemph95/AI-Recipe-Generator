import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const getData = (res) => res.data?.data ?? res.data;

// ——— Auth ———
export const authApi = {
  signup: (body) => api.post('/auth/signup', body).then(getData),
  signin: (body) => api.post('/auth/signin', body).then(getData),
  getMe: () => api.get('/auth/me').then(getData),
  requestPasswordReset: (body) => api.post('/auth/request-password-reset', body).then(getData),
  resetPassword: (body) => api.post('/auth/reset-password', body).then(getData),
};

// ——— Users ———
export const usersApi = {
  getProfile: () => api.get('/users/profile').then(getData),
  updateProfile: (body) => api.put('/users/profile', body).then(getData),
  getPreferences: () => api.get('/users/preferences').then(getData),
  updatePreferences: (body) => api.put('/users/preferences', body).then(getData),
  changePassword: (body) => api.put('/users/password', body).then(getData),
  deleteAccount: () => api.delete('/users/account').then(getData),
};

// ——— Pantry ———
export const pantryApi = {
  getItems: (params) => api.get('/pantry', { params }).then(getData),
  getStats: () => api.get('/pantry/stats').then(getData),
  getExpiringSoon: (params) => api.get('/pantry/expiring-soon', { params }).then(getData),
  addItem: (body) => api.post('/pantry', body).then(getData),
  updateItem: (id, body) => api.put(`/pantry/${id}`, body).then(getData),
  deleteItem: (id) => api.delete(`/pantry/${id}`).then(getData),
};

// ——— Recipes (CRUD + AI) ———
export const recipesApi = {
  getList: (params) => api.get('/recipes', { params }).then(getData),
  getRecent: (params) => api.get('/recipes/recent', { params }).then(getData),
  getStats: () => api.get('/recipes/stats').then(getData),
  getById: (id) => api.get(`/recipes/${id}`).then(getData),
  save: (body) => api.post('/recipes', body).then(getData),
  update: (id, body) => api.put(`/recipes/${id}`, body).then(getData),
  delete: (id) => api.delete(`/recipes/${id}`).then(getData),
  generate: (body) => api.post('/recipes/generate', body).then(getData),
  translate: (body) => api.post('/recipes/translate', body).then(getData),
  getPantrySuggestions: () => api.get('/recipes/pantry-suggestions').then(getData),
  generatePantrySuggestions: (body) => api.post('/recipes/generate/pantry-suggestions', body).then(getData),
};

// ——— Meal plans ———
export const mealPlansApi = {
  getWeekly: (params) => api.get('/meal-plans/weekly', { params }).then(getData),
  getUpcoming: (params) => api.get('/meal-plans/upcoming', { params }).then(getData),
  getStats: () => api.get('/meal-plans/stats').then(getData),
  add: (body) => api.post('/meal-plans', body).then(getData),
  delete: (id) => api.delete(`/meal-plans/${id}`).then(getData),
};

// ——— Shopping list ———
export const shoppingListApi = {
  getList: (params) => api.get('/shopping-list', { params }).then(getData),
  generateFromMealPlan: (body) => api.post('/shopping-list/generate', body).then(getData),
  addItem: (body) => api.post('/shopping-list', body).then(getData),
  updateItem: (id, body) => api.put(`/shopping-list/${id}`, body).then(getData),
  toggleChecked: (id) => api.patch(`/shopping-list/${id}/toggle`).then(getData),
  deleteItem: (id) => api.delete(`/shopping-list/${id}`).then(getData),
  clearChecked: () => api.delete('/shopping-list/checked').then(getData),
  clearAll: () => api.delete('/shopping-list/clear-all').then(getData),
  addCheckedToPantry: () => api.post('/shopping-list/add-checked-to-pantry').then(getData),
};

export default api;
