<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo e($page_title); ?></title>
    
    <!-- Bootstrap CSS -->
    <?php echo Asset::css('bootstrap.min.css'); ?>
    
    <!-- Chart App CSS -->
    <?php echo Asset::css('chart-app.css'); ?>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <!-- Mermaid.js -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    
    <!-- Knockout.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/knockout/3.5.1/knockout-latest.min.js"></script>
    
    <!-- Interact.js for drag and drop -->
    <script src="https://cdn.jsdelivr.net/npm/interactjs@1.10.17/dist/interact.min.js"></script>
    
    <!-- Google Identity Services API -->
    <script src="https://accounts.google.com/gsi/client" onload="window.googleScriptLoaded && window.googleScriptLoaded()"></script>
</head>
<body>
    <!-- 認証が必要な場合の表示 -->
    <div id="auth-required" class="auth-container" data-bind="visible: !isAuthenticated()">
        <div class="auth-box">
            <h3>ログインが必要です</h3>
            <p>AIフローチャート設計支援システムを使用するには、Googleアカウントでログインしてください。</p>
            <div id="google-signin-button" class="g_id_signin" data-type="standard" data-theme="filled_blue" data-size="large"></div>
        </div>
    </div>

    <!-- メインコンテンツ -->
    <div id="main-content" class="app-container" data-bind="visible: isAuthenticated">
        <!-- メインレイアウト -->
        <div class="main-layout">
            <!-- 左側サイドバー -->
            <div class="left-sidebar">
                <div class="sidebar-top">
                    <div class="sidebar-item" title="新規作成" data-bind="click: createNewChart">
                        <div class="sidebar-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </div>
                        <span class="sidebar-text">新規作成</span>
                    </div>
                    
                    <!-- チャートリスト -->
                    <div class="chart-list" data-bind="visible: savedCharts().length > 0">
                        <div class="chart-list-title">
                            <span class="sidebar-text">保存済みチャート</span>
                        </div>
                        <div class="chart-items" data-bind="foreach: savedCharts">
                            <div class="chart-item" data-bind="click: $parent.loadChart, attr: { title: title }">
                                <div class="sidebar-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span class="sidebar-text chart-title" data-bind="text: title"></span>
                                <div class="chart-actions">
                                    <div class="action-button" title="削除" data-bind="click: function(data, event) { event.stopPropagation(); $parent.deleteChart(data); }">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.5 3.5V2a1 1 0 011-1h3a1 1 0 011 1v1.5m-9 1V14a2 2 0 002 2h6a2 2 0 002-2V4.5m-9 0h9m-4.5 7v-4m-2 4v-4" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="sidebar-bottom">
                    <div class="sidebar-item" title="設定" data-bind="click: $root.showSettings">
                        <div class="sidebar-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span class="sidebar-text">設定</span>
                    </div>
                </div>
            </div>

            <!-- 中央のキャンバス -->
            <div class="canvas-container">
                <div class="canvas-content">
                    <div class="chart-canvas" id="chart-canvas" data-bind="event: { drop: onDrop, dragover: allowDrop }">
                        <!-- チャートタイトル入力エリア -->
                        <div class="chart-title-container" data-bind="visible: currentChart">
                            <input type="text" 
                                   class="chart-title-input" 
                                   placeholder="チャートタイトルを入力..."
                                   data-bind="value: currentChartTitle, valueUpdate: 'input'"
                                   maxlength="100">
                            <div class="chart-info">
                                <span data-bind="text: currentChart() && currentChart().id ? '保存済み' : '未保存', 
                                                 css: { 'status-saved': currentChart() && currentChart().id, 'status-unsaved': !currentChart() || !currentChart().id }"></span>
                                <span data-bind="text: currentChart() && currentChart().updated_at ? '・更新: ' + currentChart().updated_at : ''"></span>
                            </div>
                        </div>
                        
                        <!-- フローチャート操作ボタン -->
                        <div class="chart-controls">
                            <div class="control-button" title="元に戻す (Ctrl+Z)" data-bind="click: $root.undo, css: { disabled: !canUndo() }">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </div>
                            <div class="control-button" title="やり直し (Ctrl+Y)" data-bind="click: $root.redo, css: { disabled: !canRedo() }">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                </svg>
                            </div>
                            <div class="control-button" title="保存 (Ctrl+S)" data-bind="click: $root.saveChart">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div class="control-button" title="インポート" data-bind="click: $root.importChart">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                            </div>
                            <div class="control-button" title="エクスポート" data-bind="click: $root.exportChart">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div class="control-button" title="ズームリセット" data-bind="click: $root.resetZoomAndPan">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                            </div>
                            <div class="control-button" title="ログアウト" data-bind="click: $root.logout">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                        </div>
                        
                        <!-- エラー・成功メッセージ -->
                        <div class="error-message" id="error-message" data-bind="visible: errorMessage, text: errorMessage"></div>
                        <div class="success-message" id="success-message" data-bind="visible: successMessage, text: successMessage"></div>
                        
                        <div id="mermaid-display" data-bind="html: mermaidHtml"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- ノードコンテキストメニュー -->
        <div id="node-context-menu" class="node-context-menu">
            <div class="menu-item" data-bind="click: startInlineTextEdit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                テキスト編集
            </div>
            <div class="menu-item" data-bind="click: startInlineTypeChange">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                種類変更
            </div>
            <div class="menu-item delete" data-bind="click: deleteSelectedNode">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                削除
            </div>
        </div>
        
        <!-- インライン編集要素 -->
        <input type="text" id="inline-text-editor" class="inline-text-editor" style="display: none;" />
        
        <!-- ノード種類選択 -->
        <div id="inline-type-selector" class="inline-type-selector" style="display: none;">
            <div class="type-option" data-type="rect">
                <div class="type-icon">□</div>
                <span>処理</span>
            </div>
            <div class="type-option" data-type="round">
                <div class="type-icon">○</div>
                <span>開始/終了</span>
            </div>
            <div class="type-option" data-type="diamond">
                <div class="type-icon">◇</div>
                <span>判定</span>
            </div>
            <div class="type-option" data-type="hexagon">
                <div class="type-icon">⬢</div>
                <span>入力/出力</span>
            </div>
        </div>

        <!-- ローディング -->
        <div class="loading" id="loading" data-bind="visible: isLoading">
            <div class="spinner-border" role="status">
                <span class="sr-only">読み込み中...</span>
            </div>
            <p>処理中...</p>
        </div>
    </div>

    <!-- Mermaidコードエディタモーダル -->
    <div class="modal fade" id="code-editor-modal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Mermaidコード編集</h5>
                    <button type="button" class="close" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <textarea class="form-control code-editor" id="mermaid-code" 
                              data-bind="value: currentMermaidCode" rows="15"></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">キャンセル</button>
                    <button type="button" class="btn btn-primary" data-bind="click: updateFromCode">適用</button>
                </div>
            </div>
        </div>
    </div>

    <!-- jQuery (Bootstrap依存) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Bootstrap JS -->
    <?php echo Asset::js('bootstrap.min.js'); ?>
    
    <!-- Font Awesome -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>

    <!-- アプリケーションスクリプト -->
    <script>
        // Google Client IDを設定
        window.GOOGLE_CLIENT_ID = '<?php echo e($google_client_id); ?>';
        console.log('Setting Client ID:', window.GOOGLE_CLIENT_ID);
        
        // Client IDが空の場合の警告
        if (!window.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID === '') {
            console.error('ERROR: Google Client ID is empty or not configured');
        }
    </script>
    <script src="/assets/js/chart-app.js?v=<?php echo time(); ?>"></script>
</body>
</html>