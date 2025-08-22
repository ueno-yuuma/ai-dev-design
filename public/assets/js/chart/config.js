// グローバル変数
let currentUser = null;
let authToken = null;
let mermaidInitialized = false;

// APIエンドポイント設定
const API_BASE = '/api';
const API_ENDPOINTS = {
    health: `${API_BASE}/health`,
    charts: `${API_BASE}/charts`,
    chart: (id) => `${API_BASE}/chart/${id}`,
    login: `${API_BASE}/login`,
    logout: `${API_BASE}/logout`,
    authStatus: `${API_BASE}/status`
};
