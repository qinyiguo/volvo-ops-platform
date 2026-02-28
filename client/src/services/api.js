const BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (res.status === 401) {
      this.setToken(null);
      // [FIX] 使用自訂事件通知 App 層，而非 window.location.href 硬跳轉
      // 這樣可以走 React Router，避免整頁重載導致 state 遺失
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('認證已過期');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || '請求失敗');
    }
    // 如果是檔案下載
    if (res.headers.get('content-type')?.includes('spreadsheetml')) {
      return res.blob();
    }
    return res.json();
  }

  get(path) { return this.request(path); }
  post(path, data) { return this.request(path, { method: 'POST', body: JSON.stringify(data) }); }
  put(path, data) { return this.request(path, { method: 'PUT', body: JSON.stringify(data) }); }
  del(path) { return this.request(path, { method: 'DELETE' }); }

  // 檔案上傳
  async upload(path, files) {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('上傳失敗');
    return res.json();
  }

  // Auth
  login(username, password) { return this.post('/auth/login', { username, password }); }
  getMe() { return this.get('/auth/me'); }

  // Upload
  uploadFiles(files) { return this.upload('/upload/files', files); }
  getUploadHistory() { return this.get('/upload/history'); }

  // Dashboard
  getSASummary(period, branch) { return this.get(`/dashboard/sa-summary?period=${period}&branch=${branch}`); }
  getSAEngine(period, branch) { return this.get(`/dashboard/sa-engine?period=${period}&branch=${branch}`); }
  getSABodywork(period, branch) { return this.get(`/dashboard/sa-bodywork?period=${period}&branch=${branch}`); }
  getTechSummary(period, branch) { return this.get(`/dashboard/tech-summary?period=${period}&branch=${branch}`); }
  getGROSales(period, branch) { return this.get(`/dashboard/gro-sales?period=${period}&branch=${branch}`); }
  getBeauty(period, branch) { return this.get(`/dashboard/beauty?period=${period}&branch=${branch}`); }
  getBranchOverview(period) { return this.get(`/dashboard/branch-overview?period=${period}`); }

  // Query
  getRepairList(params) { return this.get(`/repair/list?${new URLSearchParams(params)}`); }
  getRepairSummary(period, branch) { return this.get(`/repair/summary?period=${period}&branch=${branch || ''}`); }
  getTechList(params) { return this.get(`/tech/list?${new URLSearchParams(params)}`); }
  getTechRanking(period, branch) { return this.get(`/tech/ranking?period=${period}&branch=${branch || ''}`); }
  getPartsSales(params) { return this.get(`/parts/sales?${new URLSearchParams(params)}`); }
  getPartsSummary(period, branch) { return this.get(`/parts/summary?period=${period}&branch=${branch || ''}`); }

  // Targets
  getAnnualTargets(year, branch) { return this.get(`/targets/annual?year=${year}&branch=${branch || ''}`); }
  saveAnnualTargets(targets) { return this.post('/targets/annual', { targets }); }
  getMonthlyWeights(year, branch) { return this.get(`/targets/monthly-weights?year=${year}&branch=${branch}`); }
  saveMonthlyWeights(weights) { return this.post('/targets/monthly-weights', { weights }); }
  getStaffWeights(year, branch, type) { return this.get(`/targets/staff-weights?year=${year}&branch=${branch}&staff_type=${type || ''}`); }
  saveStaffWeights(weights) { return this.post('/targets/staff-weights', { weights }); }
  previewTargets(year, month, branch) { return this.get(`/targets/preview?year=${year}&month=${month}&branch=${branch}`); }

  // Admin
  getUsers() { return this.get('/admin/users'); }
  createUser(data) { return this.post('/admin/users', data); }
  updateUser(id, data) { return this.put(`/admin/users/${id}`, data); }
  getStaffMap(branch, type) { return this.get(`/admin/staff-map?branch=${branch || ''}&staff_type=${type || ''}`); }
  saveStaffMap(data) { return this.post('/admin/staff-map', data); }
  getTrackingItems() { return this.get('/admin/tracking-items'); }
  createTrackingItem(data) { return this.post('/admin/tracking-items', data); }
  updateTrackingItem(id, data) { return this.put(`/admin/tracking-items/${id}`, data); }
  deleteTrackingItem(id) { return this.del(`/admin/tracking-items/${id}`); }
  getPromoRules() { return this.get('/admin/promo-rules'); }
  savePromoRule(data) { return this.post('/admin/promo-rules', data); }
  updatePromoRule(id, data) { return this.put(`/admin/promo-rules/${id}`, data); }

  // Export
  async exportExcel(type, period, branch) {
    const blob = await this.get(`/export/${type}?period=${period}&branch=${branch || ''}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${period}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiService();
export default api;
