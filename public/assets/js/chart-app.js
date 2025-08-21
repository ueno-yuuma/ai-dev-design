/**
 * AIフローチャート設計支援システム - メインアプリケーション
 * Knockout.js + Mermaid.js + Google OAuth
 */

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

// Mermaid初期化
function initializeMermaid() {
    if (!mermaidInitialized) {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                primaryColor: '#b8e6b8',
                primaryTextColor: '#333',
                primaryBorderColor: '#4caf50',
                lineColor: '#666',
                secondaryColor: '#cce7ff',
                tertiaryColor: '#ffe6cc',
                background: '#e5e5e5',
                mainBkg: '#ffffff',
                secondBkg: '#f8f9fa'
            },
            securityLevel: 'loose',
            fontFamily: 'Noto Sans JP, sans-serif',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                padding: 20
            }
        });
        mermaidInitialized = true;
    }
}

// ViewModel定義
function ChartViewModel() {
    const self = this;
    
    // 認証関連
    self.isAuthenticated = ko.observable(false);
    self.userName = ko.observable('');
    self.userEmail = ko.observable('');
    
    // チャート関連
    self.currentChart = ko.observable(null);
    self.currentChartTitle = ko.observable('');
    self.currentMermaidCode = ko.observable('graph TD\n    A[開始] --> B[処理]\n    B --> C[終了]');
    self.mermaidHtml = ko.observable('');
    self.savedCharts = ko.observableArray([]);
    
    // ノード関連
    self.selectedNode = ko.observable(null);
    self.selectedNodeType = ko.observable('');
    self.selectedNodeText = ko.observable('');
    self.nodeTypes = ko.observableArray([
        { value: 'start', label: '開始' },
        { value: 'process', label: '処理' },
        { value: 'decision', label: '判定' },
        { value: 'end', label: '終了' },
        { value: 'input', label: '入力' },
        { value: 'output', label: '出力' }
    ]);
    
    // UI状態
    self.isLoading = ko.observable(false);
    self.errorMessage = ko.observable('');
    self.successMessage = ko.observable('');
    
    // 操作履歴（Undo/Redo）
    self.history = [];
    self.historyIndex = -1;
    self.canUndo = ko.computed(() => self.historyIndex > 0);
    self.canRedo = ko.computed(() => self.historyIndex < self.history.length - 1);
    
    // 初期化
    self.initialize = function() {
        initializeMermaid();
        self.checkAuthStatus();
        self.setupDragAndDrop();
        self.setupNavTabs();
        self.renderMermaid();
    };
    
    // 認証状態チェック
    self.checkAuthStatus = function() {
        // Check authentication status from server
        fetch(API_ENDPOINTS.authStatus, {
            method: 'GET',
            credentials: 'include' // Include cookies
        })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated && data.user) {
                self.isAuthenticated(true);
                self.userName(data.user.name);
                self.userEmail(data.user.email);
                currentUser = data.user;
                
                // Load charts after authentication confirmed
                setTimeout(() => {
                    self.loadCharts();
                }, 100);
            } else {
                self.isAuthenticated(false);
                self.userName('');
                self.userEmail('');
                currentUser = null;
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
            self.isAuthenticated(false);
            self.userName('');
            self.userEmail('');
            currentUser = null;
        });
    };
    
    // Google Identity Services コールバック
    window.handleCredentialResponse = function(response) {
        // Send credential to server for verification
        fetch(API_ENDPOINTS.login, {
            method: 'POST',
            credentials: 'include', // Include cookies
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential: response.credential
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                currentUser = data.user;
                
                self.isAuthenticated(true);
                self.userName(currentUser.name);
                self.userEmail(currentUser.email);
                
                self.loadCharts();
                self.showSuccess('ログインしました');
            } else {
                self.showError('ログインに失敗しました: ' + (data.error || '不明なエラー'));
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            self.showError('ログインに失敗しました');
        });
    };
    
    // サインアウト
    window.signOut = function() {
        fetch(API_ENDPOINTS.logout, {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                google.accounts.id.disableAutoSelect();
                
                currentUser = null;
                authToken = null;
                
                self.isAuthenticated(false);
                self.userName('');
                self.userEmail('');
                self.savedCharts([]);
                self.currentChart(null);
                self.showSuccess('ログアウトしました');
                
                // ページをリロードして認証状態をリセット
                setTimeout(() => location.reload(), 1000);
            } else {
                self.showError('ログアウトに失敗しました');
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Even if server logout fails, clear client state
            google.accounts.id.disableAutoSelect();
            currentUser = null;
            authToken = null;
            
            self.isAuthenticated(false);
            self.userName('');
            self.userEmail('');
            self.savedCharts([]);
            self.currentChart(null);
            
            setTimeout(() => location.reload(), 1000);
        });
    };
    
    // API呼び出しヘルパー
    self.apiCall = function(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };
        
        return fetch(url, mergedOptions)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        // Unauthorized - redirect to login
                        self.isAuthenticated(false);
                        self.userName('');
                        self.userEmail('');
                        currentUser = null;
                        throw new Error('認証が必要です。再度ログインしてください。');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                self.showError(`API呼び出しエラー: ${error.message}`);
                throw error;
            });
    };
    
    // チャート一覧読み込み
    self.loadCharts = function() {
        if (!self.isAuthenticated()) return;
        
        self.isLoading(true);
        
        self.apiCall(API_ENDPOINTS.charts)
            .then(data => {
                if (data.success) {
                    self.savedCharts(data.data || []);
                }
            })
            .catch(error => {
                console.error('チャート読み込みエラー:', error);
            })
            .finally(() => {
                self.isLoading(false);
            });
    };
    
    // 新規チャート作成
    self.createNewChart = function() {
        const newChart = {
            id: null,
            title: '新しいフローチャート',
            content: 'graph TD\n    A[開始] --> B[処理]\n    B --> C[終了]',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        self.currentChart(newChart);
        self.currentChartTitle(newChart.title);
        self.currentMermaidCode(newChart.content);
        self.addToHistory();
        self.renderMermaid();
        self.showSuccess('新しいチャートを作成しました');
    };
    
    // チャート保存
    self.saveChart = function() {
        if (!self.currentChart()) {
            self.showError('保存するチャートがありません');
            return;
        }
        
        self.isLoading(true);
        
        const chartData = {
            title: self.currentChartTitle(),
            content: self.currentMermaidCode()
        };
        
        const isUpdate = self.currentChart().id;
        const url = isUpdate ? API_ENDPOINTS.chart(self.currentChart().id) : API_ENDPOINTS.charts;
        const method = isUpdate ? 'PUT' : 'POST';
        
        self.apiCall(url, {
            method: method,
            body: JSON.stringify(chartData)
        })
        .then(data => {
            if (data.success) {
                self.currentChart(data.data);
                self.loadCharts();
                self.showSuccess(isUpdate ? 'チャートを更新しました' : 'チャートを保存しました');
            }
        })
        .catch(error => {
            console.error('チャート保存エラー:', error);
        })
        .finally(() => {
            self.isLoading(false);
        });
    };
    
    // チャート読み込み
    self.loadChart = function(chart) {
        self.currentChart(chart);
        self.currentChartTitle(chart.title);
        self.currentMermaidCode(chart.content);
        self.addToHistory();
        self.renderMermaid();
        self.showSuccess(`「${chart.title}」を読み込みました`);
    };
    
    // チャート削除
    self.deleteChart = function(chart) {
        if (!confirm(`「${chart.title}」を削除しますか？`)) {
            return;
        }
        
        self.isLoading(true);
        
        self.apiCall(API_ENDPOINTS.chart(chart.id), {
            method: 'DELETE'
        })
        .then(data => {
            if (data.success) {
                self.loadCharts();
                if (self.currentChart() && self.currentChart().id === chart.id) {
                    self.currentChart(null);
                    self.currentChartTitle('');
                    self.currentMermaidCode('');
                    self.mermaidHtml('');
                }
                self.showSuccess('チャートを削除しました');
            }
        })
        .catch(error => {
            console.error('チャート削除エラー:', error);
        })
        .finally(() => {
            self.isLoading(false);
        });
    };
    
    // Mermaidレンダリング
    self.renderMermaid = function() {
        try {
            let code = self.currentMermaidCode();
            if (!code) {
                self.mermaidHtml('<div class="text-muted text-center p-5">フローチャートコードを入力してください</div>');
                return;
            }
            
            // Convert literal \n to actual newlines if they exist
            code = code.replace(/\\n/g, '\n');
            
            const element = document.createElement('div');
            element.className = 'mermaid';
            element.textContent = code;
            
            mermaid.render('mermaid-svg', code)
                .then(result => {
                    self.mermaidHtml(result.svg);
                })
                .catch(error => {
                    console.error('Mermaidレンダリングエラー:', error);
                    self.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
                });
        } catch (error) {
            console.error('Mermaidレンダリングエラー:', error);
            self.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
        }
    };
    
    // 履歴管理
    self.addToHistory = function() {
        const state = {
            title: self.currentChartTitle(),
            code: self.currentMermaidCode(),
            timestamp: Date.now()
        };
        
        // 現在位置以降の履歴を削除
        self.history = self.history.slice(0, self.historyIndex + 1);
        self.history.push(state);
        self.historyIndex = self.history.length - 1;
        
        // 履歴サイズ制限
        if (self.history.length > 50) {
            self.history.shift();
            self.historyIndex--;
        }
    };
    
    // Undo
    self.undo = function() {
        if (self.canUndo()) {
            self.historyIndex--;
            const state = self.history[self.historyIndex];
            self.currentChartTitle(state.title);
            self.currentMermaidCode(state.code);
            self.renderMermaid();
        }
    };
    
    // Redo
    self.redo = function() {
        if (self.canRedo()) {
            self.historyIndex++;
            const state = self.history[self.historyIndex];
            self.currentChartTitle(state.title);
            self.currentMermaidCode(state.code);
            self.renderMermaid();
        }
    };
    
    // ナビゲーションタブ設定（削除されたタブ用の空関数）
    self.setupNavTabs = function() {
        // Process, Decision, Input, Output tabs were removed
        // This function is kept for compatibility but does nothing
    };
    
    // ドラッグ&ドロップ設定
    self.setupDragAndDrop = function() {
        // タブからのドラッグは上記のsetupNavTabsで処理
    };
    
    // ドロップ許可
    self.allowDrop = function(vm, event) {
        event.preventDefault();
        return true;
    };
    
    // ドロップ処理
    self.onDrop = function(vm, event) {
        event.preventDefault();
        const nodeType = event.dataTransfer.getData('text/plain');
        
        if (nodeType) {
            self.addNodeToChart(nodeType);
        }
        
        return true;
    };
    
    // チャートにノード追加
    self.addNodeToChart = function(nodeType) {
        const nodeId = 'node_' + Date.now();
        const nodeLabel = self.getNodeLabel(nodeType);
        
        let currentCode = self.currentMermaidCode();
        
        // 簡単なノード追加ロジック
        if (currentCode.includes('graph TD')) {
            currentCode += `\n    ${nodeId}[${nodeLabel}]`;
        } else {
            currentCode = `graph TD\n    ${nodeId}[${nodeLabel}]`;
        }
        
        self.currentMermaidCode(currentCode);
        self.addToHistory();
        self.renderMermaid();
        self.showSuccess(`${nodeLabel}ノードを追加しました`);
    };
    
    // ノードタイプからラベル取得
    self.getNodeLabel = function(nodeType) {
        const typeMap = {
            'start': '開始',
            'process': '処理',
            'decision': '判定',
            'end': '終了',
            'input': '入力',
            'output': '出力'
        };
        return typeMap[nodeType] || '処理';
    };
    
    // 設定表示
    self.showSettings = function() {
        self.showError('設定機能は実装予定です');
    };
    
    // ノード詳細化（AI機能）
    self.detailNode = function() {
        if (!self.selectedNode()) {
            self.showError('詳細化するノードを選択してください');
            return;
        }
        
        self.showError('AI詳細化機能は実装予定です');
    };
    
    // フロー最適化（AI機能）
    self.optimizeFlow = function() {
        if (!self.currentChart()) {
            self.showError('最適化するフローチャートがありません');
            return;
        }
        
        self.showError('AI最適化機能は実装予定です');
    };
    
    // ノード更新
    self.updateNode = function() {
        self.showError('ノード更新機能は実装予定です');
    };
    
    // ノード削除
    self.deleteNode = function() {
        self.showError('ノード削除機能は実装予定です');
    };
    
    // エクスポート
    self.exportChart = function() {
        if (!self.currentChart()) {
            self.showError('エクスポートするチャートがありません');
            return;
        }
        
        const dataStr = JSON.stringify({
            title: self.currentChartTitle(),
            mermaidCode: self.currentMermaidCode(),
            exportedAt: new Date().toISOString()
        }, null, 2);
        
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${self.currentChartTitle()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        self.showSuccess('チャートをエクスポートしました');
    };

    // インポート
    self.importChart = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.title && data.mermaidCode) {
                            const importedChart = {
                                id: null,
                                title: data.title + ' (インポート)',
                                content: data.mermaidCode,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };
                            
                            self.currentChart(importedChart);
                            self.currentChartTitle(importedChart.title);
                            self.currentMermaidCode(importedChart.content);
                            self.addToHistory();
                            self.renderMermaid();
                            self.showSuccess('チャートをインポートしました');
                        } else {
                            self.showError('無効なファイル形式です');
                        }
                    } catch (error) {
                        self.showError('ファイルの読み込みに失敗しました');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // ログアウト
    self.logout = function() {
        if (typeof signOut === 'function') {
            signOut();
        } else {
            // フォールバック - サーバーサイドログアウトを試行
            fetch(API_ENDPOINTS.logout, {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => {
                currentUser = null;
                authToken = null;
                
                self.isAuthenticated(false);
                self.userName('');
                self.userEmail('');
                self.savedCharts([]);
                self.currentChart(null);
                self.showSuccess('ログアウトしました');
                
                setTimeout(() => location.reload(), 1000);
            })
            .catch(() => {
                // Even if server logout fails, clear client state
                currentUser = null;
                authToken = null;
                
                self.isAuthenticated(false);
                self.userName('');
                self.userEmail('');
                self.savedCharts([]);
                self.currentChart(null);
                
                setTimeout(() => location.reload(), 1000);
            });
        }
    };
    
    // コードからの更新
    self.updateFromCode = function() {
        self.addToHistory();
        self.renderMermaid();
        $('#code-editor-modal').modal('hide');
        self.showSuccess('Mermaidコードを更新しました');
    };
    
    // メッセージ表示
    self.showError = function(message) {
        self.errorMessage(message);
        self.successMessage('');
        setTimeout(() => self.errorMessage(''), 5000);
    };
    
    self.showSuccess = function(message) {
        self.successMessage(message);
        self.errorMessage('');
        setTimeout(() => self.successMessage(''), 3000);
    };
    
    // Mermaidコード変更時の自動レンダリング
    self.currentMermaidCode.subscribe(() => {
        self.renderMermaid();
    });
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', function() {
    const viewModel = new ChartViewModel();
    ko.applyBindings(viewModel);
    viewModel.initialize();
    
    // 初期化状態管理
    let isGoogleSignInInitialized = false;
    let isGoogleApiReady = false;
    
    // Google Script onload callback
    window.googleScriptLoaded = function() {
        isGoogleApiReady = true;
        // すぐに初期化を試行
        initializeGoogleSignInImmediately();
    };
    
    // 最適化されたGoogle API待機関数
    function waitForGoogleAPI() {
        return new Promise((resolve, reject) => {
            // 既にAPIが利用可能な場合
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                resolve();
                return;
            }
            
            // スクリプトが読み込まれている場合の短時間待機
            let attempts = 0;
            const maxAttempts = 20; // 1秒間待機 (20 × 50ms)
            
            const checkAPI = () => {
                attempts++;
                if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Google API not available after waiting 1 second'));
                } else {
                    setTimeout(checkAPI, 50); // 50ms間隔に短縮
                }
            };
            
            checkAPI();
        });
    }
    
    // 即座にGoogle Sign-Inを初期化（重複防止付き）
    function initializeGoogleSignInImmediately() {
        if (isGoogleSignInInitialized) {
            return; // 既に初期化済みの場合は何もしない
        }
        
        if (!window.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID === '') {
            console.error('Google Client ID is not set');
            return;
        }
        
        waitForGoogleAPI()
            .then(() => {
                isGoogleSignInInitialized = true;
                
                // 初期化
                google.accounts.id.initialize({
                    client_id: window.GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                
                // ボタン描画
                const buttonDiv = document.getElementById('google-signin-button');
                if (buttonDiv) {
                    google.accounts.id.renderButton(buttonDiv, {
                        theme: 'filled_blue',
                        size: 'large',
                        type: 'standard',
                        width: 280
                    });
                    console.log('Google Sign-In button rendered successfully');
                } else {
                    console.warn('Google Sign-In button container not found');
                }
            })
            .catch(error => {
                console.error('Google Sign-In setup failed:', error);
                // フォールバック: 500ms後に再試行
                setTimeout(() => {
                    isGoogleSignInInitialized = false;
                    initializeGoogleSignInImmediately();
                }, 500);
            });
    }
    
    // レガシー用の初期化関数（後方互換性のため保持）
    function initializeGoogleSignIn() {
        return initializeGoogleSignInImmediately();
    }
    
    // 最適化された初期化: 即座に実行、フォールバック付き
    function optimizedGoogleSignInInit() {
        // 即座に初期化を試行
        initializeGoogleSignInImmediately();
        
        // フォールバック: 200ms後にもう一度試行（DOM準備が遅い場合）
        setTimeout(() => {
            if (!isGoogleSignInInitialized) {
                initializeGoogleSignInImmediately();
            }
        }, 200);
    }
    
    // DOMContentLoaded時に即座に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', optimizedGoogleSignInInit);
    } else {
        // 既にDOMが準備済みの場合は即座に実行
        optimizedGoogleSignInInit();
    }
    
    // キーボードショートカット
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    viewModel.saveChart();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        viewModel.redo();
                    } else {
                        viewModel.undo();
                    }
                    break;
                case 'n':
                    e.preventDefault();
                    viewModel.createNewChart();
                    break;
            }
        }
    });
    
    // ウィンドウリサイズ時の再描画
    window.addEventListener('resize', function() {
        setTimeout(() => viewModel.renderMermaid(), 200);
    });
});