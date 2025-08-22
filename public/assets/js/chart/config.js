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

// デフォルトチャート設定
const DEFAULT_CHART_CONTENT = 'graph LR\n    node_start[開始]\n    node_process[処理]\n    node_end[終了]\n    node_start --> node_process\n    node_process --> node_end';
