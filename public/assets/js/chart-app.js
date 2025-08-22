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
    self.isInlineEditing = ko.observable(false);
    self.inlineEditorType = null; // 'text' or 'type'
    
    // ノード間ドラッグ&ドロップ関連
    self.isNodeDragging = ko.observable(false);
    self.dragSourceNode = null;
    self.dragLine = null;
    self.dragStartPos = { x: 0, y: 0 };
    self.dragStartTime = 0;
    self.dragThreshold = 5; // ピクセル
    
    // 複数選択関連
    self.isSelecting = ko.observable(false);
    self.selectedNodes = ko.observableArray([]);
    self.selectedNodesCount = ko.computed(function() {
        return self.selectedNodes().length;
    });
    self.selectionStart = null;
    self.selectionCurrent = null;
    self.selectionRectangle = null;
    
    // レンダリング制御フラグ
    self.suppressAutoRender = false;
    
    // 操作履歴（Undo/Redo）
    self.history = [];
    self.historyIndex = -1;
    self.maxHistorySize = 50;
    
    // Undo/Redo状態
    self.canUndo = ko.computed(function() {
        const canUndoResult = self.historyIndex >= 1;
        return canUndoResult;
    });
    
    self.canRedo = ko.computed(function() {
        const canRedoResult = self.historyIndex < self.history.length - 1;
        return canRedoResult;
    });
    
    // 初期化
    self.initialize = function() {
        initializeMermaid();
        self.checkAuthStatus();
        self.setupDragAndDrop();
        self.setupNavTabs();
        self.setupKeyboardShortcuts();
        self.setupMultiSelection();
        self.renderMermaid();
        
        // 初期状態を履歴に追加
        self.addToHistory('初期状態');
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
            
            if (!code || code.trim() === '') {
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
                        self.updateNodeSelection(); // 複数選択状態を復元
                    }, 100);
                })
                .catch(error => {
                    console.error('Mermaidレンダリングエラー:', error);
                    self.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
                });
        } catch (error) {
            console.error('renderMermaid例外:', error);
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
        // インライン編集中やノードドラッグ中はズームを無効にする
        if (self.isInlineEditing() || self.isNodeDragging()) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const zoomFactor = 0.1;
        const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
        const newZoom = Math.max(0.1, Math.min(3.0, self.zoomLevel() + delta));
        
        self.zoomLevel(newZoom);
        self.updateMermaidTransform();
    };
    
    // マウスダウン（パン開始または選択開始）
    self.handleMouseDown = function(e) {
        // インライン編集中やノードドラッグ中は何もしない
        if (self.isInlineEditing() || self.isNodeDragging()) {
            return;
        }
        
        // ノード上でのクリックの場合はパンも選択もしない
        const target = e.target;
        if (target.closest && target.closest('g.node')) {
            return;
        }
        
        if (e.button === 0) { // Left mouse button - 選択開始
            const mermaidDisplay = document.getElementById('mermaid-display');
            const rect = mermaidDisplay.getBoundingClientRect();
            
            self.selectionStart = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            // Ctrlキーが押されていない場合は既存の選択をクリア（座標はリセットしない）
            if (!e.ctrlKey && !e.metaKey) {
                self.selectedNodes([]);
                self.updateNodeSelection();
            }
            
            self.isSelecting(true);
            
            // 選択中のスタイルを適用
            const chartCanvas = document.getElementById('chart-canvas');
            if (chartCanvas) {
                chartCanvas.classList.add('selecting');
            }
            
            e.preventDefault();
        } else if (e.button === 2) { // Right mouse button - パン開始
            self.isDragging(true);
            self.lastMousePos = { x: e.clientX, y: e.clientY };
            
            // パン中のスタイル適用
            const mermaidDisplay = document.getElementById('mermaid-display');
            if (mermaidDisplay) {
                mermaidDisplay.classList.add('panning');
            }
            
            e.preventDefault();
        }
    };
    
    // マウス移動（パンまたは選択）
    self.handleMouseMove = function(e) {
        if (self.isDragging()) {
            // パン処理
            const deltaX = e.clientX - self.lastMousePos.x;
            const deltaY = e.clientY - self.lastMousePos.y;
            
            self.panX(self.panX() + deltaX / self.zoomLevel());
            self.panY(self.panY() + deltaY / self.zoomLevel());
            
            self.lastMousePos = { x: e.clientX, y: e.clientY };
            self.updateMermaidTransform();
            e.preventDefault();
        } else if (self.isSelecting()) {
            // 選択矩形の更新
            const mermaidDisplay = document.getElementById('mermaid-display');
            const rect = mermaidDisplay.getBoundingClientRect();
            
            self.selectionCurrent = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            self.updateSelectionRectangle();
            e.preventDefault();
        }
    };
    
    // マウスアップ（パンまたは選択終了）
    self.handleMouseUp = function(e) {
        if (e.button === 2 || self.isDragging()) { // Right mouse button or currently dragging
            self.isDragging(false);
            
            // パン中のスタイル削除
            const mermaidDisplay = document.getElementById('mermaid-display');
            if (mermaidDisplay) {
                mermaidDisplay.classList.remove('panning');
            }
        } else if (e.button === 0 && self.isSelecting()) { // Left mouse button - 選択終了
            // 実際にドラッグ（移動）があったかチェック
            const hasActualDrag = self.selectionCurrent && 
                                  self.selectionStart &&
                                  (Math.abs(self.selectionCurrent.x - self.selectionStart.x) > 5 ||
                                   Math.abs(self.selectionCurrent.y - self.selectionStart.y) > 5);
            
            if (hasActualDrag) {
                self.finishSelection();
            } else {
                // 単一クリックの場合は選択をキャンセル
                self.isSelecting(false);
                self.selectionStart = null;
                self.selectionCurrent = null;
                
                // UI要素をクリア
                const selectionRect = document.getElementById('selection-rectangle');
                if (selectionRect) {
                    selectionRect.classList.remove('active');
                }
                
                const chartCanvas = document.getElementById('chart-canvas');
                if (chartCanvas) {
                    chartCanvas.classList.remove('selecting');
                }
                
                // 既存の選択も単一クリック時はクリア（Ctrlキーが押されていない場合）
                if (!e.ctrlKey && !e.metaKey) {
                    self.selectedNodes([]);
                    self.updateNodeSelection();
                }
            }
            
            e.preventDefault();
        }
    };
    
    // マウスリーブ（パンまたは選択終了）
    self.handleMouseLeave = function(e) {
        if (self.isDragging()) {
            self.isDragging(false);
            
            // パン中のスタイル削除
            const mermaidDisplay = document.getElementById('mermaid-display');
            if (mermaidDisplay) {
                mermaidDisplay.classList.remove('panning');
            }
        }
        
        if (self.isSelecting()) {
            self.finishSelection();
        }
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
            
            // マウスダウンでドラッグ/クリック処理を開始
            node.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // 左クリックでドラッグ開始
                    e.preventDefault();
                    e.stopPropagation();
                    self.startNodeDrag(e, this);
                }
            });
            
            // 右クリックでコンテキストメニュー表示
            node.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.handleNodeRightClick(e, this);
            });
            
            // ドロップターゲット
            node.addEventListener('dragover', function(e) {
                e.preventDefault();
            });
            
            node.addEventListener('drop', function(e) {
                e.preventDefault();
                self.handleNodeDrop(e, this);
            });
            
            // ホバー効果
            node.addEventListener('mouseenter', function() {
                if (!self.isDragging() && !self.isNodeDragging()) {
                    this.style.cursor = 'pointer';
                }
            });
            
            node.addEventListener('mouseleave', function() {
                if (!self.isDragging() && !self.isNodeDragging()) {
                    this.style.cursor = 'default';
                }
            });
        });
        
        // クリック外しでメニューを閉じる
        document.addEventListener('click', self.handleDocumentClick);
        
        // mermaid-display全体でブラウザの右クリックメニューを無効化
        const mermaidDisplay = document.getElementById('mermaid-display');
        if (mermaidDisplay) {
            mermaidDisplay.addEventListener('contextmenu', function(e) {
                // ノード以外の場所での右クリックメニューを無効化
                e.preventDefault();
            });
        }
    };
    
    // ノード右クリック処理
    self.handleNodeRightClick = function(event, nodeElement) {
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
    
    // ノードドラッグ開始
    self.startNodeDrag = function(event, nodeElement) {
        const nodeId = self.extractNodeId(nodeElement);
        if (!nodeId) return;
        
        // ドラッグ候補として記録
        self.dragSourceNode = {
            id: nodeId,
            element: nodeElement
        };
        
        // ドラッグ開始位置と時間を記録
        const mermaidDisplay = document.getElementById('mermaid-display');
        const displayRect = mermaidDisplay.getBoundingClientRect();
        self.dragStartPos = {
            x: event.clientX - displayRect.left,
            y: event.clientY - displayRect.top,
            clientX: event.clientX,
            clientY: event.clientY
        };
        self.dragStartTime = Date.now();
        
        // マウス移動とマウスアップのイベントリスナーを追加
        document.addEventListener('mousemove', self.handleNodeDragMove);
        document.addEventListener('mouseup', self.handleNodeDragEnd);
    };
    
    // ノードドラッグ移動
    self.handleNodeDragMove = function(event) {
        if (!self.dragSourceNode) return;
        
        // まだドラッグモードに入っていない場合、距離をチェック
        if (!self.isNodeDragging()) {
            const distance = Math.sqrt(
                Math.pow(event.clientX - self.dragStartPos.clientX, 2) + 
                Math.pow(event.clientY - self.dragStartPos.clientY, 2)
            );
            
            // しきい値を超えたらドラッグモードに入る
            if (distance > self.dragThreshold) {
                self.isNodeDragging(true);
                
                // 点線を作成
                self.createDragLine(self.dragStartPos.x, self.dragStartPos.y);
                
                // ドラッグ中のスタイルを適用
                self.dragSourceNode.element.style.opacity = '0.7';
                const mermaidDisplay = document.getElementById('mermaid-display');
                mermaidDisplay.style.cursor = 'crosshair';
            } else {
                return; // まだドラッグしていない
            }
        }
        
        const mermaidDisplay = document.getElementById('mermaid-display');
        const displayRect = mermaidDisplay.getBoundingClientRect();
        const currentX = event.clientX - displayRect.left;
        const currentY = event.clientY - displayRect.top;
        
        // 点線を更新
        self.updateDragLine(self.dragStartPos.x, self.dragStartPos.y, currentX, currentY);
    };
    
    // ノードドラッグ終了
    self.handleNodeDragEnd = function(event) {
        const wasDragging = self.isNodeDragging();
        const currentTime = Date.now();
        const timeDiff = currentTime - self.dragStartTime;
        
        if (wasDragging) {
            // ドラッグ処理
            const mermaidDisplay = document.getElementById('mermaid-display');
            const displayRect = mermaidDisplay.getBoundingClientRect();
            const dropX = event.clientX - displayRect.left;
            const dropY = event.clientY - displayRect.top;
            
            // ドロップ先のノードを検索
            const targetNode = self.getNodeAtPosition(event.clientX, event.clientY);
            
            if (targetNode && targetNode !== self.dragSourceNode.element) {
                // 既存ノードにドロップ - 接続を作成
                const targetNodeId = self.extractNodeId(targetNode);
                if (targetNodeId) {
                    self.createConnection(self.dragSourceNode.id, targetNodeId);
                    self.addToHistory(`接続追加: ${self.dragSourceNode.id} -> ${targetNodeId}`);
                    self.showSuccess('ノード間に接続を作成しました');
                }
            } else {
                // 空の場所にドロップ - 新しいノードを作成
                self.createChildNode(self.dragSourceNode.id, dropX, dropY);
            }
        } else if (self.dragSourceNode && timeDiff < 300) {
            // 単純なクリック処理（300ms以内で移動距離が少ない場合）
            const nodeId = self.dragSourceNode.id;
            
            if (event.ctrlKey || event.metaKey) {
                // Ctrlキー押下時は選択を追加/削除
                self.toggleNodeSelection(nodeId);
            } else {
                // 通常クリックは既存選択をクリアして新規選択
                self.clearMultiSelection();
                self.addNodeToSelection(nodeId);
            }
        }
        
        // クリーンアップ
        self.endNodeDrag();
    };
    
    // ドラッグライン作成
    self.createDragLine = function(startX, startY) {
        const mermaidDisplay = document.getElementById('mermaid-display');
        
        // SVG要素を作成
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1000';
        svg.id = 'drag-line-svg';
        
        // 点線を作成
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', startX);
        line.setAttribute('y2', startY);
        line.setAttribute('stroke', '#007bff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.id = 'drag-line';
        
        svg.appendChild(line);
        mermaidDisplay.appendChild(svg);
        
        self.dragLine = line;
    };
    
    // ドラッグライン更新
    self.updateDragLine = function(startX, startY, endX, endY) {
        if (self.dragLine) {
            self.dragLine.setAttribute('x2', endX);
            self.dragLine.setAttribute('y2', endY);
        }
    };
    
    // ノードドラッグ終了処理
    self.endNodeDrag = function() {
        // ドラッグライン削除
        const dragSvg = document.getElementById('drag-line-svg');
        if (dragSvg) {
            dragSvg.remove();
        }
        
        // スタイルをリセット
        if (self.dragSourceNode && self.dragSourceNode.element) {
            self.dragSourceNode.element.style.opacity = '1';
        }
        
        const mermaidDisplay = document.getElementById('mermaid-display');
        if (mermaidDisplay) {
            mermaidDisplay.style.cursor = 'default';
        }
        
        // イベントリスナーを削除
        document.removeEventListener('mousemove', self.handleNodeDragMove);
        document.removeEventListener('mouseup', self.handleNodeDragEnd);
        
        // 状態をリセット
        self.isNodeDragging(false);
        self.dragSourceNode = null;
        self.dragLine = null;
    };
    
    // 位置からノードを取得
    self.getNodeAtPosition = function(clientX, clientY) {
        const elements = document.elementsFromPoint(clientX, clientY);
        for (let element of elements) {
            if (element.classList && element.classList.contains('node')) {
                return element;
            }
            // Mermaidのノード要素を探す
            const nodeParent = element.closest('g.node');
            if (nodeParent) {
                return nodeParent;
            }
        }
        return null;
    };
    
    // ノード間接続を作成
    self.createConnection = function(sourceId, targetId) {
        let code = self.currentMermaidCode();
        
        // 既存の接続を確認
        const connectionPattern = new RegExp(`${sourceId}\\s*-->\\s*${targetId}`, 'g');
        if (connectionPattern.test(code)) {
            self.showError('この接続は既に存在します');
            return;
        }
        
        // 新しい接続を追加
        code += `\n    ${sourceId} --> ${targetId}`;
        
        self.currentMermaidCode(code);
    };
    
    // 子ノードを作成
    self.createChildNode = function(parentId, x, y) {
        const newNodeId = 'node_' + Date.now();
        const newNodeLabel = '新しいノード';
        
        let code = self.currentMermaidCode();
        
        // 新しいノードと接続を追加
        code += `\n    ${newNodeId}[${newNodeLabel}]`;
        code += `\n    ${parentId} --> ${newNodeId}`;
        
        self.currentMermaidCode(code);
        self.addToHistory(`子ノード追加: ${parentId} -> ${newNodeId}`);
        self.showSuccess('新しい子ノードを作成しました');
    };
    
    // ノードドロップ処理
    self.handleNodeDrop = function(event, targetElement) {
        // この関数は現在のdragEndで処理されているため、空のままにしておきます
    };
    
    // キーボードショートカットの設定
    self.setupKeyboardShortcuts = function() {
        document.addEventListener('keydown', function(e) {
            // インライン編集中はショートカットを無効化
            if (self.isInlineEditing()) {
                return;
            }
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            self.redo();
                        } else {
                            self.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        self.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        self.saveChart();
                        break;
                    case 'a':
                        e.preventDefault();
                        self.selectAllNodes();
                        break;
                }
            } else {
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        e.preventDefault();
                        if (self.selectedNodes().length > 0) {
                            self.deleteSelectedNodes();
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        self.clearMultiSelection();
                        break;
                }
            }
        });
    };
    
    // 履歴管理
    self.addToHistory = function(description = '操作') {
        const state = {
            title: self.currentChartTitle(),
            code: self.currentMermaidCode(),
            description: description,
            timestamp: Date.now()
        };
        
        // 現在の位置より後の履歴を削除（新しい操作が行われた場合）
        if (self.historyIndex < self.history.length - 1) {
            self.history.splice(self.historyIndex + 1);
        }
        
        // 新しい状態を追加
        self.history.push(state);
        self.historyIndex = self.history.length - 1;
        
        // 履歴サイズ制限
        if (self.history.length > self.maxHistorySize) {
            self.history.shift();
            self.historyIndex--;
        }
        
    };
    
    // 元に戻す (Undo)
    self.undo = function() {
        // 直接的な条件チェック
        if (self.historyIndex < 1 || self.history.length < 2) {
            self.showError('これ以上元に戻せません');
            return;
        }
        
        self.historyIndex--;
        const state = self.history[self.historyIndex];
        
        // 状態を復元（履歴に追加せず）
        self.restoreState(state);
        self.showSuccess(`元に戻しました: ${state.description}`);
    };
    
    // やり直し (Redo)
    self.redo = function() {
        // 直接的な条件チェック
        if (self.historyIndex >= self.history.length - 1) {
            self.showError('これ以上やり直せません');
            return;
        }
        
        self.historyIndex++;
        const state = self.history[self.historyIndex];
        
        // 状態を復元（履歴に追加せず）
        self.restoreState(state);
        self.showSuccess(`やり直しました: ${state.description}`);
    };
    
    // 状態復元
    self.restoreState = function(state) {
        // 履歴追加を一時的に無効化
        const originalAddToHistory = self.addToHistory;
        self.addToHistory = function() {}; // 空関数で無効化
        
        try {
            // 状態を復元（自動レンダリングに任せる）
            self.currentChartTitle(state.title);
            self.currentMermaidCode(state.code); // この変更により自動レンダリングが実行される
            
        } catch (error) {
            console.error('状態復元エラー:', error);
            self.showError('状態復元中にエラーが発生しました');
        } finally {
            // 履歴追加機能を復元
            self.addToHistory = originalAddToHistory;
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
    
    // 操作方法表示
    self.showOperationGuide = function() {
        $('#operation-guide-modal').modal('show');
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
    
    // インライン編集機能
    
    // インラインテキスト編集開始
    self.startInlineTextEdit = function() {
        if (!self.selectedNodeId() || !self.selectedNodeElement) {
            self.showError('編集するノードが選択されていません');
            return;
        }
        
        self.hideContextMenu();
        self.startInlineEditor('text');
    };
    
    // インライン種類変更開始
    self.startInlineTypeChange = function() {
        if (!self.selectedNodeId() || !self.selectedNodeElement) {
            self.showError('変更するノードが選択されていません');
            return;
        }
        
        self.hideContextMenu();
        self.startInlineEditor('type');
    };
    
    // インライン編集器を開始
    self.startInlineEditor = function(type) {
        if (self.isInlineEditing()) {
            self.finishInlineEdit();
        }
        
        self.isInlineEditing(true);
        self.inlineEditorType = type;
        
        // ノードの位置を取得
        const nodeRect = self.getNodeBounds(self.selectedNodeElement);
        if (!nodeRect) return;
        
        if (type === 'text') {
            self.showInlineTextEditor(nodeRect);
        } else if (type === 'type') {
            self.showInlineTypeSelector(nodeRect);
        }
        
        // 編集中のスタイルを適用
        self.selectedNodeElement.classList.add('editing');
    };
    
    // インラインテキストエディター表示
    self.showInlineTextEditor = function(nodeRect) {
        const editor = document.getElementById('inline-text-editor');
        if (!editor) return;
        
        const currentText = self.getNodeText(self.selectedNodeId());
        editor.value = currentText;
        
        // 位置設定
        const canvasRect = document.getElementById('mermaid-display').getBoundingClientRect();
        editor.style.left = (canvasRect.left + nodeRect.centerX - 50) + 'px';
        editor.style.top = (canvasRect.top + nodeRect.centerY - 10) + 'px';
        editor.style.display = 'block';
        
        // フォーカスして選択
        setTimeout(() => {
            editor.focus();
            editor.select();
        }, 0);
        
        // イベントリスナー設定
        editor.onkeydown = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                self.finishTextEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                self.cancelInlineEdit();
            }
        };
        
        editor.onblur = function() {
            setTimeout(() => self.finishTextEdit(), 100);
        };
    };
    
    // インライン種類選択表示
    self.showInlineTypeSelector = function(nodeRect) {
        const selector = document.getElementById('inline-type-selector');
        if (!selector) return;
        
        // 現在の種類を取得
        const currentNodeInfo = self.getNodeInfo(self.selectedNodeId());
        const currentType = currentNodeInfo ? currentNodeInfo.shape : 'rect';
        
        // 現在の種類をハイライト
        selector.querySelectorAll('.type-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.type === currentType) {
                option.classList.add('selected');
            }
        });
        
        // 位置設定
        const canvasRect = document.getElementById('mermaid-display').getBoundingClientRect();
        selector.style.left = (canvasRect.left + nodeRect.centerX - 80) + 'px';
        selector.style.top = (canvasRect.top + nodeRect.centerY + 20) + 'px';
        selector.style.display = 'block';
        
        // クリックイベント設定
        selector.querySelectorAll('.type-option').forEach(option => {
            option.onclick = function() {
                const newType = this.dataset.type;
                if (newType !== currentType) {
                    self.changeNodeShape(self.selectedNodeId(), newType);
                    self.addToHistory('ノード種類変更');
                    self.showSuccess('ノードの種類を変更しました');
                }
                self.finishInlineEdit();
            };
        });
        
        // 外部クリックで閉じる
        setTimeout(() => {
            document.addEventListener('click', self.handleInlineEditorOutsideClick);
        }, 0);
    };
    
    // ノードの境界を取得
    self.getNodeBounds = function(nodeElement) {
        try {
            const rect = nodeElement.getBoundingClientRect();
            const canvasRect = document.getElementById('mermaid-display').getBoundingClientRect();
            
            return {
                centerX: rect.left + rect.width / 2 - canvasRect.left,
                centerY: rect.top + rect.height / 2 - canvasRect.top,
                width: rect.width,
                height: rect.height
            };
        } catch (error) {
            console.error('Error getting node bounds:', error);
            return null;
        }
    };
    
    // テキスト編集完了
    self.finishTextEdit = function() {
        const editor = document.getElementById('inline-text-editor');
        if (!editor || editor.style.display === 'none') return;
        
        const newText = editor.value.trim();
        const currentText = self.getNodeText(self.selectedNodeId());
        
        if (newText && newText !== currentText) {
            self.updateNodeText(self.selectedNodeId(), newText);
            self.addToHistory('テキスト編集');
            self.showSuccess('ノードのテキストを更新しました');
        }
        
        self.finishInlineEdit();
    };
    
    // インライン編集完了
    self.finishInlineEdit = function() {
        // エディターを非表示
        const textEditor = document.getElementById('inline-text-editor');
        const typeSelector = document.getElementById('inline-type-selector');
        
        if (textEditor) {
            textEditor.style.display = 'none';
            textEditor.onkeydown = null;
            textEditor.onblur = null;
        }
        
        if (typeSelector) {
            typeSelector.style.display = 'none';
            typeSelector.querySelectorAll('.type-option').forEach(option => {
                option.onclick = null;
            });
        }
        
        // 編集状態をクリア
        if (self.selectedNodeElement) {
            self.selectedNodeElement.classList.remove('editing');
        }
        
        self.isInlineEditing(false);
        self.inlineEditorType = null;
        
        // イベントリスナーを削除
        document.removeEventListener('click', self.handleInlineEditorOutsideClick);
    };
    
    // インライン編集キャンセル
    self.cancelInlineEdit = function() {
        self.finishInlineEdit();
    };
    
    // 外部クリック処理
    self.handleInlineEditorOutsideClick = function(event) {
        const textEditor = document.getElementById('inline-text-editor');
        const typeSelector = document.getElementById('inline-type-selector');
        
        if (textEditor && textEditor.contains(event.target)) return;
        if (typeSelector && typeSelector.contains(event.target)) return;
        
        self.finishInlineEdit();
    };
    
    // 従来の関数（互換性のため）
    self.editNode = function() {
        self.startInlineTextEdit();
    };
    
    self.changeNodeType = function() {
        self.startInlineTypeChange();
    };
    
    // 選択されたノード削除
    self.deleteSelectedNode = function() {
        if (!self.selectedNodeId()) {
            self.showError('削除するノードが選択されていません');
            return;
        }
        
        if (confirm(`ノード「${self.getNodeText(self.selectedNodeId())}」を削除しますか？`)) {
            const nodeText = self.getNodeText(self.selectedNodeId());
            self.removeNodeFromMermaidCode(self.selectedNodeId());
            self.addToHistory(`ノード削除: ${nodeText}`);
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
        if (!self.suppressAutoRender) {
            self.renderMermaid();
        }
    });
    
    // 複数選択機能のメソッド群
    
    // 複数選択機能のセットアップ
    self.setupMultiSelection = function() {
        // 複数選択機能の初期化（特別な処理は不要）
    };
    
    // 選択矩形の更新
    self.updateSelectionRectangle = function() {
        const selectionRect = document.getElementById('selection-rectangle');
        if (!selectionRect || !self.isSelecting()) return;
        
        const startX = Math.min(self.selectionStart.x, self.selectionCurrent.x);
        const startY = Math.min(self.selectionStart.y, self.selectionCurrent.y);
        const width = Math.abs(self.selectionCurrent.x - self.selectionStart.x);
        const height = Math.abs(self.selectionCurrent.y - self.selectionStart.y);
        
        
        selectionRect.style.left = startX + 'px';
        selectionRect.style.top = startY + 'px';
        selectionRect.style.width = width + 'px';
        selectionRect.style.height = height + 'px';
        selectionRect.classList.add('active');
    };
    
    // 選択完了処理
    self.finishSelection = function() {
        if (!self.isSelecting()) return;
        
        // 選択範囲内のノードを検出
        const selectedNodeIds = self.getNodesInSelectionArea();
        
        // 選択されたノードを追加
        selectedNodeIds.forEach(nodeId => {
            if (self.selectedNodes().indexOf(nodeId) === -1) {
                self.selectedNodes.push(nodeId);
            }
        });
        
        // 選択状態をクリア
        self.isSelecting(false);
        self.selectionStart = null;
        self.selectionCurrent = null;
        
        // UI要素をクリア
        const selectionRect = document.getElementById('selection-rectangle');
        if (selectionRect) {
            selectionRect.classList.remove('active');
        }
        
        const chartCanvas = document.getElementById('chart-canvas');
        if (chartCanvas) {
            chartCanvas.classList.remove('selecting');
        }
        
        // 選択されたノードを視覚的にハイライト
        self.updateNodeSelection();
    };
    
    // 選択範囲内のノードを取得
    self.getNodesInSelectionArea = function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return [];
        
        const nodes = mermaidContainer.querySelectorAll('g.node');
        const selectedNodeIds = [];
        
        const selectionMinX = Math.min(self.selectionStart.x, self.selectionCurrent.x);
        const selectionMinY = Math.min(self.selectionStart.y, self.selectionCurrent.y);
        const selectionMaxX = Math.max(self.selectionStart.x, self.selectionCurrent.x);
        const selectionMaxY = Math.max(self.selectionStart.y, self.selectionCurrent.y);
        
        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const mermaidDisplayRect = document.getElementById('mermaid-display').getBoundingClientRect();
            
            // ノードの位置をmermaid-display相対座標に変換
            const nodeX = rect.left - mermaidDisplayRect.left + rect.width / 2;
            const nodeY = rect.top - mermaidDisplayRect.top + rect.height / 2;
            
            // 選択範囲内にあるかチェック
            if (nodeX >= selectionMinX && nodeX <= selectionMaxX &&
                nodeY >= selectionMinY && nodeY <= selectionMaxY) {
                const nodeId = self.extractNodeId(node);
                if (nodeId) {
                    selectedNodeIds.push(nodeId);
                }
            }
        });
        
        return selectedNodeIds;
    };
    
    // 複数選択をクリア
    self.clearMultiSelection = function() {
        self.selectedNodes([]);
        
        // 選択中の場合のみ座標とUI状態をリセット
        if (self.isSelecting()) {
            self.isSelecting(false);
            self.selectionStart = null;
            self.selectionCurrent = null;
            
            // UI要素をクリア
            const selectionRect = document.getElementById('selection-rectangle');
            if (selectionRect) {
                selectionRect.classList.remove('active');
            }
            
            const chartCanvas = document.getElementById('chart-canvas');
            if (chartCanvas) {
                chartCanvas.classList.remove('selecting');
            }
        }
        
        self.updateNodeSelection();
    };
    
    // ノード選択の視覚的更新
    self.updateNodeSelection = function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return;
        
        // 全てのノードから選択状態を削除
        const nodes = mermaidContainer.querySelectorAll('g.node');
        nodes.forEach(node => {
            node.classList.remove('multi-selected');
        });
        
        // 選択されたノードにスタイルを適用
        self.selectedNodes().forEach(nodeId => {
            const nodeElement = mermaidContainer.querySelector(`g.node[id*="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.classList.add('multi-selected');
            }
        });
    };
    
    // 選択されたノードを削除
    self.deleteSelectedNodes = function() {
        const selectedCount = self.selectedNodes().length;
        if (selectedCount === 0) {
            self.showError('削除するノードが選択されていません');
            return;
        }
        
        if (confirm(`選択された${selectedCount}個のノードを削除しますか？`)) {
            // 複数ノードの場合のみ自動レンダリングを一時的に無効化
            if (selectedCount > 1) {
                self.suppressAutoRender = true;
            }
            
            // 複数ノードを一括削除
            self.selectedNodes().forEach(nodeId => {
                self.removeNodeFromMermaidCode(nodeId);
            });
            
            // 自動レンダリング機能を復元
            if (selectedCount > 1) {
                self.suppressAutoRender = false;
                // 一度だけ手動でレンダリング
                self.renderMermaid();
            }
            
            self.clearMultiSelection();
            self.addToHistory(`複数ノード削除: ${selectedCount}個`);
            self.showSuccess(`${selectedCount}個のノードを削除しました`);
        }
    };
    
    // 全ノード選択
    self.selectAllNodes = function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return;
        
        const nodes = mermaidContainer.querySelectorAll('g.node');
        const allNodeIds = [];
        
        nodes.forEach(node => {
            const nodeId = self.extractNodeId(node);
            if (nodeId) {
                allNodeIds.push(nodeId);
            }
        });
        
        self.selectedNodes(allNodeIds);
        self.updateNodeSelection();
    };
    
    // 単一ノードを選択に追加
    self.addNodeToSelection = function(nodeId) {
        if (self.selectedNodes().indexOf(nodeId) === -1) {
            self.selectedNodes.push(nodeId);
            self.updateNodeSelection();
        }
    };
    
    // ノード選択の切り替え（選択済みの場合は解除、未選択の場合は追加）
    self.toggleNodeSelection = function(nodeId) {
        const currentSelection = self.selectedNodes();
        const index = currentSelection.indexOf(nodeId);
        
        if (index !== -1) {
            // 既に選択されている場合は削除
            self.selectedNodes.splice(index, 1);
        } else {
            // 選択されていない場合は追加
            self.selectedNodes.push(nodeId);
        }
        
        self.updateNodeSelection();
    };
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