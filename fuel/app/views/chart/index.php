<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIフローチャート設計支援システム</title>
    
    <!-- Bootstrap CSS -->
    <?php echo Asset::css('bootstrap.min.css'); ?>
    
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
    
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background-color: #e5e5e5;
            margin: 0;
            height: 100vh;
            overflow: hidden;
        }
        
        /* アプリケーション全体のレイアウト */
        .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .main-layout {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        /* 左側サイドバー */
        .left-sidebar {
            width: 60px;
            background-color: #2c3e50;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 20px 0;
            gap: 20px;
            justify-content: space-between;
            transition: width 0.3s ease;
            overflow: hidden;
            position: relative;
            z-index: 100;
        }
        
        .left-sidebar:hover {
            width: 200px;
        }
        
        .sidebar-top,
        .sidebar-bottom {
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
            width: 100%;
            padding: 0 20px;
        }
        
        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 15px;
            color: #ecf0f1;
            cursor: pointer;
            transition: color 0.3s;
            white-space: nowrap;
            width: 100%;
            padding: 8px 0;
        }
        
        .sidebar-item:hover {
            color: #3498db;
        }
        
        .sidebar-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        
        .sidebar-text {
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .left-sidebar:hover .sidebar-text {
            opacity: 1;
        }
        
        /* チャートリストのスタイル */
        .chart-list {
            width: 100%;
            margin-top: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .left-sidebar:hover .chart-list {
            opacity: 1;
        }
        
        .chart-list-title {
            color: #bdc3c7;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 0 12px 0;
            border-bottom: 1px solid #34495e;
            margin-bottom: 12px;
        }
        
        .chart-items {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .chart-items::-webkit-scrollbar {
            width: 4px;
        }
        
        .chart-items::-webkit-scrollbar-track {
            background: #34495e;
        }
        
        .chart-items::-webkit-scrollbar-thumb {
            background: #7f8c8d;
            border-radius: 2px;
        }
        
        .chart-item {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #ecf0f1;
            cursor: pointer;
            padding: 8px 0;
            border-radius: 4px;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .chart-item:hover {
            background-color: rgba(52, 73, 94, 0.5);
            color: #3498db;
        }
        
        .chart-title {
            flex: 1;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 120px;
        }
        
        .chart-actions {
            opacity: 0;
            display: flex;
            gap: 4px;
            transition: opacity 0.2s ease;
        }
        
        .chart-item:hover .chart-actions {
            opacity: 1;
        }
        
        .action-button {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(231, 76, 60, 0.1);
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .action-button:hover {
            background-color: rgba(231, 76, 60, 0.3);
        }
        
        .action-button svg {
            width: 12px;
            height: 12px;
            color: #e74c3c;
        }

        /* フローチャート操作ボタン */
        .chart-controls {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 15px;
            z-index: 10;
        }
        
        .control-button {
            width: 40px;
            height: 40px;
            background-color: rgba(255, 255, 255, 0.9);
            border: 1px solid #ddd;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .control-button:hover {
            background-color: white;
            border-color: #007bff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .control-button svg {
            width: 20px;
            height: 20px;
            color: #495057;
            transition: color 0.3s ease;
        }
        
        .control-button:hover svg {
            color: #007bff;
        }
        
        
        /* 中央のキャンバス */
        .canvas-container {
            flex: 1;
            background-color: #e5e5e5;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .canvas-content {
            flex: 1;
            background-color: #e5e5e5;
            position: relative;
            overflow: auto;
        }
        
        .chart-canvas {
            width: 100%;
            height: 100%;
            min-height: 600px;
            background-color: #e5e5e5;
            position: relative;
        }
        
        /* フロー図のスタイル */
        .flow-node {
            background: linear-gradient(145deg, #b8e6b8, #90ee90);
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 2px 2px 6px rgba(0,0,0,0.1);
            position: absolute;
            cursor: move;
            font-size: 14px;
            text-align: center;
            min-width: 120px;
        }
        
        .flow-node.process {
            background: linear-gradient(145deg, #cce7ff, #87ceeb);
            border-color: #2196f3;
        }
        
        .flow-node.decision {
            background: linear-gradient(145deg, #ffe6cc, #ffb366);
            border-color: #ff9800;
            transform: rotate(45deg);
        }
        
        .flow-node.input {
            background: linear-gradient(145deg, #f0e6ff, #dda0dd);
            border-color: #9c27b0;
        }
        
        .flow-node.output {
            background: linear-gradient(145deg, #ffe6f0, #ffb3d9);
            border-color: #e91e63;
        }
        
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        
        /* メッセージとローディング */
        .loading {
            display: none;
            text-align: center;
            padding: 2rem;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
        }
        
        .error-message, .success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1001;
            max-width: 300px;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .success-message {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .auth-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: #e5e5e5;
            text-align: center;
        }
        
        .auth-box {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 400px;
        }
        
        #mermaid-display {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .modal-lg {
            max-width: 80%;
        }
        
        .code-editor {
            font-family: 'Courier New', monospace;
            min-height: 200px;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
            .left-sidebar {
                width: 50px;
            }
            
            .right-panel {
                width: 250px;
            }
            
            .nav-tab {
                padding: 6px 12px;
                font-size: 12px;
            }
        }
    </style>
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
                        <!-- フローチャート操作ボタン -->
                        <div class="chart-controls">
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
                            <div class="control-button" title="ログアウト" data-bind="click: $root.logout">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                        </div>
                        <div id="mermaid-display" data-bind="html: mermaidHtml"></div>
                    </div>
                </div>
            </div>

        </div>

        <!-- エラー・成功メッセージ -->
        <div class="error-message" id="error-message" data-bind="visible: errorMessage, text: errorMessage"></div>
        <div class="success-message" id="success-message" data-bind="visible: successMessage, text: successMessage"></div>
        
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