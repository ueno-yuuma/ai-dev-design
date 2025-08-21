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
    
    // ズーム関連
    self.zoomLevel = ko.observable(1.0);
    self.panX = ko.observable(0);
    self.panY = ko.observable(0);
    self.isDragging = ko.observable(false);
    self.lastMousePos = { x: 0, y: 0 };
    
    // ノード選択・コンテキストメニュー関連
    self.selectedNodeId = ko.observable(null);
    self.selectedNodeElement = null;
    self.contextMenuVisible = ko.observable(false);
    
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
                    // Automatically create a new chart after login
                    self.createNewChart();
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
                // Automatically create a new chart after login
                self.createNewChart();
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
                    // Wrap the SVG in a zoomable container
                    const containerHtml = `<div class="mermaid-container" style="transform: scale(${self.zoomLevel()}) translate(${self.panX()}px, ${self.panY()}px);">${result.svg}</div>`;
                    self.mermaidHtml(containerHtml);
                    
                    // Setup zoom and pan event listeners after rendering
                    setTimeout(() => {
                        self.setupZoomAndPan();
                        self.setupNodeClickHandlers();
                    }, 100);
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
    
    // ズーム・パン機能のセットアップ
    self.setupZoomAndPan = function() {
        const mermaidDisplay = document.getElementById('mermaid-display');
        if (!mermaidDisplay) return;
        
        // Remove existing event listeners to prevent duplicates
        mermaidDisplay.removeEventListener('wheel', self.handleWheel);
        mermaidDisplay.removeEventListener('mousedown', self.handleMouseDown);
        mermaidDisplay.removeEventListener('mousemove', self.handleMouseMove);
        mermaidDisplay.removeEventListener('mouseup', self.handleMouseUp);
        mermaidDisplay.removeEventListener('mouseleave', self.handleMouseLeave);
        
        // Add event listeners
        mermaidDisplay.addEventListener('wheel', self.handleWheel, { passive: false });
        mermaidDisplay.addEventListener('mousedown', self.handleMouseDown);
        mermaidDisplay.addEventListener('mousemove', self.handleMouseMove);
        mermaidDisplay.addEventListener('mouseup', self.handleMouseUp);
        mermaidDisplay.addEventListener('mouseleave', self.handleMouseLeave);
    };
    
    // マウスホイールでズーム
    self.handleWheel = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const zoomFactor = 0.1;
        const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
        const newZoom = Math.max(0.1, Math.min(3.0, self.zoomLevel() + delta));
        
        self.zoomLevel(newZoom);
        self.updateMermaidTransform();
    };
    
    // マウスダウン（パン開始）
    self.handleMouseDown = function(e) {
        if (e.button === 0) { // Left mouse button
            self.isDragging(true);
            self.lastMousePos = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    };
    
    // マウス移動（パン）
    self.handleMouseMove = function(e) {
        if (self.isDragging()) {
            const deltaX = e.clientX - self.lastMousePos.x;
            const deltaY = e.clientY - self.lastMousePos.y;
            
            self.panX(self.panX() + deltaX / self.zoomLevel());
            self.panY(self.panY() + deltaY / self.zoomLevel());
            
            self.lastMousePos = { x: e.clientX, y: e.clientY };
            self.updateMermaidTransform();
            e.preventDefault();
        }
    };
    
    // マウスアップ（パン終了）
    self.handleMouseUp = function(e) {
        self.isDragging(false);
    };
    
    // マウスリーブ（パン終了）
    self.handleMouseLeave = function(e) {
        self.isDragging(false);
    };
    
    // Mermaidコンテナのトランスフォーム更新
    self.updateMermaidTransform = function() {
        const container = document.querySelector('#mermaid-display .mermaid-container');
        if (container) {
            container.style.transform = `scale(${self.zoomLevel()}) translate(${self.panX()}px, ${self.panY()}px)`;
        }
    };
    
    // ズーム・パンリセット
    self.resetZoomAndPan = function() {
        self.zoomLevel(1.0);
        self.panX(0);
        self.panY(0);
        self.updateMermaidTransform();
    };
    
    // ノードクリックハンドラー設定
    self.setupNodeClickHandlers = function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return;
        
        // すべてのMermaidノードを取得
        const nodes = mermaidContainer.querySelectorAll('g.node');
        
        nodes.forEach(node => {
            // 既存のイベントリスナーを削除
            node.removeEventListener('click', self.handleNodeClick);
            
            // 新しいイベントリスナーを追加
            node.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.handleNodeClick(e, this);
            });
            
            // ホバー効果
            node.addEventListener('mouseenter', function() {
                if (!self.isDragging()) {
                    this.style.cursor = 'pointer';
                }
            });
            
            node.addEventListener('mouseleave', function() {
                this.style.cursor = 'default';
            });
        });
        
        // クリック外しでメニューを閉じる
        document.addEventListener('click', self.handleDocumentClick);
    };
    
    // ノードクリック処理
    self.handleNodeClick = function(event, nodeElement) {
        const nodeId = self.extractNodeId(nodeElement);
        if (!nodeId) return;
        
        // 選択状態を更新
        self.clearNodeSelection();
        self.selectedNodeId(nodeId);
        self.selectedNodeElement = nodeElement;
        self.highlightSelectedNode(nodeElement);
        
        // コンテキストメニューを表示
        self.showContextMenu(event.clientX, event.clientY);
    };
    
    // ノードIDを抽出
    self.extractNodeId = function(nodeElement) {
        const id = nodeElement.id;
        if (id && id.startsWith('flowchart-')) {
            // Mermaidが生成するIDから実際のノードIDを抽出
            return id.replace('flowchart-', '').split('-')[0];
        }
        return null;
    };
    
    // ノード選択をクリア
    self.clearNodeSelection = function() {
        const prevSelected = document.querySelector('.node-rect.highlighted, .node-circle.highlighted, .node-diamond.highlighted, .node-hexagon.highlighted');
        if (prevSelected) {
            prevSelected.classList.remove('highlighted');
        }
        self.selectedNodeId(null);
        self.selectedNodeElement = null;
    };
    
    // 選択されたノードをハイライト
    self.highlightSelectedNode = function(nodeElement) {
        const shapes = nodeElement.querySelectorAll('rect, circle, polygon, path');
        shapes.forEach(shape => {
            if (shape.classList.contains('node-rect') || 
                shape.classList.contains('node-circle') || 
                shape.classList.contains('node-diamond') || 
                shape.classList.contains('node-hexagon') ||
                shape.getAttribute('class')?.includes('node')) {
                shape.classList.add('highlighted');
            }
        });
    };
    
    // コンテキストメニュー表示
    self.showContextMenu = function(x, y) {
        const menu = document.getElementById('node-context-menu');
        if (!menu) return;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.add('show');
        self.contextMenuVisible(true);
        
        // 画面外に出る場合の調整
        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            if (rect.right > viewportWidth) {
                menu.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > viewportHeight) {
                menu.style.top = (y - rect.height) + 'px';
            }
        }, 0);
    };
    
    // コンテキストメニューを隠す
    self.hideContextMenu = function() {
        const menu = document.getElementById('node-context-menu');
        if (menu) {
            menu.classList.remove('show');
        }
        self.contextMenuVisible(false);
    };
    
    // ドキュメントクリック処理
    self.handleDocumentClick = function(event) {
        const menu = document.getElementById('node-context-menu');
        if (menu && !menu.contains(event.target)) {
            self.hideContextMenu();
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
    
    // コンテキストメニュー機能
    
    // ノード編集
    self.editNode = function() {
        if (!self.selectedNodeId()) {
            self.showError('編集するノードが選択されていません');
            return;
        }
        
        const currentText = self.getNodeText(self.selectedNodeId());
        const newText = prompt('ノードのテキストを入力してください:', currentText);
        
        if (newText !== null && newText.trim() !== '' && newText !== currentText) {
            self.updateNodeText(self.selectedNodeId(), newText.trim());
            self.hideContextMenu();
            self.showSuccess('ノードのテキストを更新しました');
        }
    };
    
    // ノード複製
    self.duplicateNode = function() {
        if (!self.selectedNodeId()) {
            self.showError('複製するノードが選択されていません');
            return;
        }
        
        const nodeInfo = self.getNodeInfo(self.selectedNodeId());
        if (nodeInfo) {
            const newNodeId = 'node_' + Date.now();
            self.addNodeToMermaidCode(newNodeId, nodeInfo.text + ' (コピー)', nodeInfo.shape);
            self.hideContextMenu();
            self.showSuccess('ノードを複製しました');
        }
    };
    
    // ノード種類変更
    self.changeNodeType = function() {
        if (!self.selectedNodeId()) {
            self.showError('種類を変更するノードが選択されていません');
            return;
        }
        
        const types = [
            { value: 'rect', label: '□ 処理' },
            { value: 'round', label: '○ 開始/終了' },
            { value: 'diamond', label: '◇ 判定' },
            { value: 'hexagon', label: '⬢ 入力/出力' }
        ];
        
        let selection = prompt(
            'ノードの種類を選択してください:\n' +
            types.map((t, i) => `${i + 1}. ${t.label}`).join('\n') +
            '\n\n番号を入力してください (1-4):'
        );
        
        if (selection && selection >= 1 && selection <= 4) {
            const selectedType = types[selection - 1];
            self.changeNodeShape(self.selectedNodeId(), selectedType.value);
            self.hideContextMenu();
            self.showSuccess('ノードの種類を変更しました');
        }
    };
    
    // 接続追加
    self.addConnection = function() {
        if (!self.selectedNodeId()) {
            self.showError('接続元のノードが選択されていません');
            return;
        }
        
        self.showError('接続追加機能は実装予定です');
        self.hideContextMenu();
    };
    
    // 選択されたノード削除
    self.deleteSelectedNode = function() {
        if (!self.selectedNodeId()) {
            self.showError('削除するノードが選択されていません');
            return;
        }
        
        if (confirm(`ノード「${self.getNodeText(self.selectedNodeId())}」を削除しますか？`)) {
            self.removeNodeFromMermaidCode(self.selectedNodeId());
            self.hideContextMenu();
            self.clearNodeSelection();
            self.showSuccess('ノードを削除しました');
        }
    };
    
    // ヘルパー関数
    
    // ノードテキスト取得
    self.getNodeText = function(nodeId) {
        const code = self.currentMermaidCode();
        const regex = new RegExp(nodeId + '\\[([^\\]]+)\\]', 'g');
        const match = regex.exec(code);
        return match ? match[1] : nodeId;
    };
    
    // ノード情報取得
    self.getNodeInfo = function(nodeId) {
        const code = self.currentMermaidCode();
        
        // 矩形ノード [text]
        let regex = new RegExp(nodeId + '\\[([^\\]]+)\\]', 'g');
        let match = regex.exec(code);
        if (match) return { text: match[1], shape: 'rect' };
        
        // 丸ノード (text)
        regex = new RegExp(nodeId + '\\(([^\\)]+)\\)', 'g');
        match = regex.exec(code);
        if (match) return { text: match[1], shape: 'round' };
        
        // ダイヤモンドノード {text}
        regex = new RegExp(nodeId + '\\{([^\\}]+)\\}', 'g');
        match = regex.exec(code);
        if (match) return { text: match[1], shape: 'diamond' };
        
        // ヘキサゴンノード [[text]]
        regex = new RegExp(nodeId + '\\[\\[([^\\]]+)\\]\\]', 'g');
        match = regex.exec(code);
        if (match) return { text: match[1], shape: 'hexagon' };
        
        return null;
    };
    
    // ノードテキスト更新
    self.updateNodeText = function(nodeId, newText) {
        let code = self.currentMermaidCode();
        
        // 各形状のパターンでテキストを更新
        const patterns = [
            { regex: new RegExp(nodeId + '\\[([^\\]]+)\\]', 'g'), replacement: `${nodeId}[${newText}]` },
            { regex: new RegExp(nodeId + '\\(([^\\)]+)\\)', 'g'), replacement: `${nodeId}(${newText})` },
            { regex: new RegExp(nodeId + '\\{([^\\}]+)\\}', 'g'), replacement: `${nodeId}{${newText}}` },
            { regex: new RegExp(nodeId + '\\[\\[([^\\]]+)\\]\\]', 'g'), replacement: `${nodeId}[[${newText}]]` }
        ];
        
        patterns.forEach(pattern => {
            code = code.replace(pattern.regex, pattern.replacement);
        });
        
        self.currentMermaidCode(code);
        self.addToHistory();
    };
    
    // ノード形状変更
    self.changeNodeShape = function(nodeId, newShape) {
        let code = self.currentMermaidCode();
        const nodeInfo = self.getNodeInfo(nodeId);
        if (!nodeInfo) return;
        
        // 現在の形状を削除
        const currentPatterns = [
            new RegExp(nodeId + '\\[[^\\]]+\\]', 'g'),
            new RegExp(nodeId + '\\([^\\)]+\\)', 'g'),
            new RegExp(nodeId + '\\{[^\\}]+\\}', 'g'),
            new RegExp(nodeId + '\\[\\[[^\\]]+\\]\\]', 'g')
        ];
        
        currentPatterns.forEach(pattern => {
            code = code.replace(pattern, '');
        });
        
        // 新しい形状を追加
        const shapes = {
            'rect': `${nodeId}[${nodeInfo.text}]`,
            'round': `${nodeId}(${nodeInfo.text})`,
            'diamond': `${nodeId}{${nodeInfo.text}}`,
            'hexagon': `${nodeId}[[${nodeInfo.text}]]`
        };
        
        const newNodeDef = shapes[newShape];
        if (newNodeDef) {
            // グラフ定義の後に新しいノード定義を追加
            code = code.replace(/graph TD\s*\n/, `graph TD\n    ${newNodeDef}\n`);
        }
        
        self.currentMermaidCode(code);
        self.addToHistory();
    };
    
    // Mermaidコードにノード追加
    self.addNodeToMermaidCode = function(nodeId, text, shape = 'rect') {
        let code = self.currentMermaidCode();
        
        const shapes = {
            'rect': `${nodeId}[${text}]`,
            'round': `${nodeId}(${text})`,
            'diamond': `${nodeId}{${text}}`,
            'hexagon': `${nodeId}[[${text}]]`
        };
        
        const nodeDefinition = shapes[shape];
        if (nodeDefinition) {
            if (code.includes('graph TD')) {
                code += `\n    ${nodeDefinition}`;
            } else {
                code = `graph TD\n    ${nodeDefinition}`;
            }
            
            self.currentMermaidCode(code);
            self.addToHistory();
        }
    };
    
    // Mermaidコードからノード削除
    self.removeNodeFromMermaidCode = function(nodeId) {
        let code = self.currentMermaidCode();
        
        // ノード定義を削除
        const nodePatterns = [
            new RegExp(`\\s*${nodeId}\\[[^\\]]+\\]`, 'g'),
            new RegExp(`\\s*${nodeId}\\([^\\)]+\\)`, 'g'),
            new RegExp(`\\s*${nodeId}\\{[^\\}]+\\}`, 'g'),
            new RegExp(`\\s*${nodeId}\\[\\[[^\\]]+\\]\\]`, 'g')
        ];
        
        nodePatterns.forEach(pattern => {
            code = code.replace(pattern, '');
        });
        
        // ノードへの接続を削除
        const connectionPatterns = [
            new RegExp(`\\s*[A-Za-z0-9_]+\\s*-->\\s*${nodeId}`, 'g'),
            new RegExp(`\\s*${nodeId}\\s*-->\\s*[A-Za-z0-9_]+`, 'g'),
            new RegExp(`\\s*[A-Za-z0-9_]+\\s*->>\\s*${nodeId}`, 'g'),
            new RegExp(`\\s*${nodeId}\\s*->>\\s*[A-Za-z0-9_]+`, 'g')
        ];
        
        connectionPatterns.forEach(pattern => {
            code = code.replace(pattern, '');
        });
        
        self.currentMermaidCode(code);
        self.addToHistory();
    };
    
    // 従来のノード更新・削除関数（互換性のため）
    self.updateNode = function() {
        self.editNode();
    };
    
    self.deleteNode = function() {
        self.deleteSelectedNode();
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