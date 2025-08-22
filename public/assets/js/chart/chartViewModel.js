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
    self.currentMermaidCode = ko.observable(DEFAULT_CHART_CONTENT);
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
    
    // サブグラフ関連
    self.currentSubgraph = ko.observable(null);
    self.subgraphContextMenuVisible = ko.observable(false);

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
    self.isRendering = ko.observable(false);

    // デバウンス機能
    self.lastActionTime = 0;
    self.actionDebounceDelay = 300; // 300ms

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
        // self.setupNavTabs(); // This function is empty
        self.setupKeyboardShortcuts();
        self.setupMultiSelection();
        self.renderMermaid();

        // 初期状態を履歴に追加
        self.addToHistory('初期状態');
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
    
    // サブグラフ関連のメソッド
    self.renameSubgraph = function() {
        if (self.currentSubgraph()) {
            selectionComponent.renameSubgraph.call(self, self.currentSubgraph());
            self.hideContextMenu();
        }
    };
    
    self.ungroupSubgraph = function() {
        if (self.currentSubgraph()) {
            selectionComponent.ungroupSubgraph.call(self, self.currentSubgraph());
            self.hideContextMenu();
        }
    };
    
    self.deleteSubgraph = function() {
        if (self.currentSubgraph()) {
            selectionComponent.deleteSubgraph.call(self, self.currentSubgraph());
            self.hideContextMenu();
        }
    };
}

// メソッドをプロトタイプにマージ
Object.assign(ChartViewModel.prototype, apiComponent);
Object.assign(ChartViewModel.prototype, authComponent);
Object.assign(ChartViewModel.prototype, chartComponent);
Object.assign(ChartViewModel.prototype, dndComponent);
Object.assign(ChartViewModel.prototype, historyComponent);
Object.assign(ChartViewModel.prototype, importExportComponent);
Object.assign(ChartViewModel.prototype, inlineEditComponent);
Object.assign(ChartViewModel.prototype, mermaidComponent);
Object.assign(ChartViewModel.prototype, nodeComponent);
Object.assign(ChartViewModel.prototype, selectionComponent);
Object.assign(ChartViewModel.prototype, uiComponent);
Object.assign(ChartViewModel.prototype, zoomComponent);
