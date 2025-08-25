<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($page_title) ? $page_title : 'エラー'; ?></title>
    
    <!-- Bootstrap CSS -->
    <?php echo Asset::css('bootstrap.min.css'); ?>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background-color: #f8f9fa;
        }
        
        .error-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .error-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 3rem;
            text-align: center;
            max-width: 600px;
            margin: 2rem;
        }
        
        .error-icon {
            font-size: 4rem;
            color: #dc3545;
            margin-bottom: 1rem;
        }
        
        .error-title {
            color: #495057;
            margin-bottom: 1rem;
        }
        
        .error-message {
            color: #6c757d;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        .error-code {
            background: #f8f9fa;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            color: #6c757d;
            font-family: monospace;
            margin-bottom: 2rem;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            padding: 0.75rem 2rem;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        
        .help-links {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #dee2e6;
        }
        
        .help-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 1rem;
        }
        
        .help-links a:hover {
            color: #5a6fd8;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-card">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            
            <h2 class="error-title">エラーが発生しました</h2>
            
            <p class="error-message">
                <?php echo e($error_message); ?>
            </p>
            
            <?php if (isset($error_code)): ?>
            <div class="error-code">
                エラーコード: <?php echo e($error_code); ?>
            </div>
            <?php endif; ?>
            
            <div class="action-buttons">
                <a href="<?php echo Uri::base(); ?>" class="btn btn-primary">
                    <i class="fas fa-home"></i> ホームに戻る
                </a>
                
                <button onclick="window.history.back()" class="btn btn-outline-secondary ml-2">
                    <i class="fas fa-arrow-left"></i> 前のページに戻る
                </button>
            </div>
            
            <div class="help-links">
                <a href="<?php echo Uri::create('chart/help'); ?>">
                    <i class="fas fa-question-circle"></i> ヘルプ
                </a>
                
                <a href="<?php echo Uri::create('chart/demo'); ?>">
                    <i class="fas fa-play"></i> デモを試す
                </a>
                
                <a href="javascript:void(0)" onclick="location.reload()">
                    <i class="fas fa-redo"></i> ページを再読み込み
                </a>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <?php echo Asset::js('bootstrap.min.js'); ?>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Font Awesome -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
</body>
</html>