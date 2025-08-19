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
    <script src="https://accounts.google.com/gsi/client" onload="console.log('Google GSI loaded')" async defer></script>
    
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background-color: #f8f9fa;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            margin: 0;
            font-weight: 500;
        }
        
        .toolbar {
            background: white;
            border-bottom: 1px solid #dee2e6;
            padding: 1rem 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .chart-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 1rem 0;
            min-height: 500px;
            position: relative;
        }
        
        .chart-canvas {
            width: 100%;
            height: 500px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: auto;
            position: relative;
        }
        
        .node-palette {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 1rem;
        }
        
        .node-type {
            display: block;
            width: 100%;
            margin: 0.5rem 0;
            padding: 0.75rem;
            border: 2px solid #dee2e6;
            border-radius: 6px;
            background: #f8f9fa;
            cursor: grab;
            transition: all 0.2s;
        }
        
        .node-type:hover {
            background: #e9ecef;
            border-color: #6c757d;
        }
        
        .node-type.dragging {
            cursor: grabbing;
            opacity: 0.7;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        
        .chart-list {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 1rem;
            margin-bottom: 1rem;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .chart-item {
            padding: 0.75rem;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            margin: 0.5rem 0;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .chart-item:hover {
            background: #f8f9fa;
            border-color: #6c757d;
        }
        
        .auth-container {
            text-align: center;
            padding: 2rem;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 2rem;
        }
        
        .error-message {
            display: none;
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
        }
        
        .success-message {
            display: none;
            background: #d4edda;
            color: #155724;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
        }
        
        #mermaid-display {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-lg {
            max-width: 80%;
        }
        
        .code-editor {
            font-family: 'Courier New', monospace;
            min-height: 200px;
        }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <div class="header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1>AIフローチャート設計支援システム</h1>
                </div>
                <div class="col-md-4 text-right">
                    <div id="user-section" data-bind="visible: isAuthenticated">
                        <span data-bind="text: userName"></span>
                        <button class="btn btn-outline-light btn-sm ml-2" onclick="signOut()">ログアウト</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 認証が必要な場合の表示 -->
    <div id="auth-required" class="auth-container" data-bind="visible: !isAuthenticated()">
        <h3>ログインが必要です</h3>
        <p>AIフローチャート設計支援システムを使用するには、Googleアカウントでログインしてください。</p>
        <div id="google-signin-button" class="g_id_signin" data-type="standard" data-theme="filled_blue" data-size="large"></div>
    </div>

    <!-- メインコンテンツ -->
    <div id="main-content" data-bind="visible: isAuthenticated">
        <!-- ツールバー -->
        <div class="toolbar">
            <div class="container">
                <div class="row">
                    <div class="col-md-8">
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-primary" data-bind="click: createNewChart">
                                <i class="fa fa-plus"></i> 新規作成
                            </button>
                            <button type="button" class="btn btn-outline-primary" data-bind="click: saveChart, enable: currentChart">
                                <i class="fa fa-save"></i> 保存
                            </button>
                            <button type="button" class="btn btn-outline-primary" data-bind="click: exportChart, enable: currentChart">
                                <i class="fa fa-download"></i> エクスポート
                            </button>
                        </div>
                        <div class="btn-group ml-2" role="group">
                            <button type="button" class="btn btn-outline-secondary" data-bind="click: undo, enable: canUndo">
                                <i class="fa fa-undo"></i> 元に戻す
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-bind="click: redo, enable: canRedo">
                                <i class="fa fa-redo"></i> やり直し
                            </button>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="input-group">
                            <input type="text" class="form-control" placeholder="チャート名を入力" 
                                   data-bind="value: currentChartTitle, enable: currentChart">
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary" type="button" data-bind="click: loadCharts">
                                    <i class="fa fa-folder-open"></i> 読み込み
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- メインワークスペース -->
        <div class="container-fluid">
            <div class="row">
                <!-- ノードパレット -->
                <div class="col-md-2">
                    <div class="node-palette">
                        <h5>ノードタイプ</h5>
                        <div class="node-type" data-node-type="start" draggable="true">
                            <strong>開始</strong><br>
                            <small>プロセスの開始点</small>
                        </div>
                        <div class="node-type" data-node-type="process" draggable="true">
                            <strong>処理</strong><br>
                            <small>一般的な処理</small>
                        </div>
                        <div class="node-type" data-node-type="decision" draggable="true">
                            <strong>判定</strong><br>
                            <small>条件分岐</small>
                        </div>
                        <div class="node-type" data-node-type="end" draggable="true">
                            <strong>終了</strong><br>
                            <small>プロセスの終了点</small>
                        </div>
                        <div class="node-type" data-node-type="input" draggable="true">
                            <strong>入力</strong><br>
                            <small>データ入力</small>
                        </div>
                        <div class="node-type" data-node-type="output" draggable="true">
                            <strong>出力</strong><br>
                            <small>データ出力</small>
                        </div>
                    </div>

                    <!-- AI機能 -->
                    <div class="node-palette mt-3">
                        <h5>AI機能</h5>
                        <button class="btn btn-info btn-block" data-bind="click: detailNode, enable: selectedNode">
                            <i class="fa fa-magic"></i> ノード詳細化
                        </button>
                        <button class="btn btn-info btn-block" data-bind="click: optimizeFlow, enable: currentChart">
                            <i class="fa fa-brain"></i> フロー最適化
                        </button>
                    </div>
                </div>

                <!-- チャート描画エリア -->
                <div class="col-md-8">
                    <div class="chart-container">
                        <div class="chart-canvas" id="chart-canvas" data-bind="event: { drop: onDrop, dragover: allowDrop }">
                            <div id="mermaid-display" data-bind="html: mermaidHtml"></div>
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

                <!-- チャート一覧・プロパティ -->
                <div class="col-md-2">
                    <!-- 保存済みチャート一覧 -->
                    <div class="chart-list">
                        <h5>保存済みチャート</h5>
                        <div data-bind="foreach: savedCharts">
                            <div class="chart-item" data-bind="click: $parent.loadChart">
                                <strong data-bind="text: title"></strong><br>
                                <small data-bind="text: updated_at"></small>
                                <div class="btn-group-vertical btn-group-sm float-right">
                                    <button class="btn btn-outline-danger btn-sm" data-bind="click: $parent.deleteChart">
                                        <i class="fa fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ノードプロパティ -->
                    <div class="node-palette" data-bind="visible: selectedNode">
                        <h5>ノードプロパティ</h5>
                        <div class="form-group">
                            <label>ノードタイプ</label>
                            <select class="form-control" data-bind="value: selectedNodeType, options: nodeTypes, optionsText: 'label', optionsValue: 'value'"></select>
                        </div>
                        <div class="form-group">
                            <label>ノードテキスト</label>
                            <textarea class="form-control" rows="3" data-bind="value: selectedNodeText"></textarea>
                        </div>
                        <button class="btn btn-primary btn-block" data-bind="click: updateNode">更新</button>
                        <button class="btn btn-danger btn-block" data-bind="click: deleteNode">削除</button>
                    </div>
                </div>
            </div>
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
    <script src="/assets/js/chart-app.js"></script>
</body>
</html>