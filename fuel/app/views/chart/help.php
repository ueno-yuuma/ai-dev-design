<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($page_title) ? $page_title : 'ヘルプ'; ?></title>
    
    <!-- Bootstrap CSS -->
    <?php echo Asset::css('bootstrap.min.css'); ?>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background-color: #f8f9fa;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            margin: 0;
            font-weight: 500;
        }
        
        .help-content {
            margin: 2rem 0;
        }
        
        .help-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            overflow: hidden;
        }
        
        .help-section-header {
            background: #f8f9fa;
            padding: 1.5rem;
            border-bottom: 1px solid #dee2e6;
        }
        
        .help-section-title {
            margin: 0;
            color: #495057;
            font-weight: 500;
        }
        
        .help-section-content {
            padding: 2rem;
            line-height: 1.7;
        }
        
        .help-section-content h5 {
            color: #495057;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .help-section-content ul, 
        .help-section-content ol {
            margin-bottom: 1rem;
        }
        
        .help-section-content li {
            margin-bottom: 0.5rem;
        }
        
        .help-section-content code {
            background: #f8f9fa;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            color: #e83e8c;
        }
        
        .toc {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 1.5rem;
            margin-bottom: 2rem;
            position: sticky;
            top: 2rem;
        }
        
        .toc h5 {
            color: #495057;
            margin-bottom: 1rem;
        }
        
        .toc ul {
            list-style: none;
            padding-left: 0;
        }
        
        .toc li {
            margin-bottom: 0.5rem;
        }
        
        .toc a {
            color: #667eea;
            text-decoration: none;
            display: block;
            padding: 0.25rem 0;
        }
        
        .toc a:hover {
            color: #5a6fd8;
            text-decoration: underline;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        
        .back-to-top {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: none;
        }
        
        .back-to-top:hover {
            background: #5a6fd8;
            color: white;
        }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <div class="header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1>
                        <i class="fas fa-question-circle"></i>
                        ヘルプ - AIフローチャート設計支援システム
                    </h1>
                </div>
                <div class="col-md-4 text-right">
                    <a href="<?php echo Uri::create('chart'); ?>" class="btn btn-outline-light">
                        <i class="fas fa-arrow-left"></i> アプリに戻る
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- コンテンツ -->
    <div class="container">
        <div class="row">
            <!-- 目次 -->
            <div class="col-md-3">
                <div class="toc">
                    <h5><i class="fas fa-list"></i> 目次</h5>
                    <ul>
                        <?php if (isset($help_sections) && is_array($help_sections)): ?>
                            <?php foreach ($help_sections as $index => $section): ?>
                                <li>
                                    <a href="#section-<?php echo $index; ?>">
                                        <?php echo e($section['title']); ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </ul>
                    
                    <hr>
                    
                    <ul>
                        <li><a href="<?php echo Uri::create('chart/demo'); ?>">
                            <i class="fas fa-play"></i> デモを試す
                        </a></li>
                        <li><a href="<?php echo Uri::base(); ?>">
                            <i class="fas fa-home"></i> ホーム
                        </a></li>
                    </ul>
                </div>
            </div>
            
            <!-- ヘルプセクション -->
            <div class="col-md-9">
                <div class="help-content">
                    <?php if (isset($help_sections) && is_array($help_sections)): ?>
                        <?php foreach ($help_sections as $index => $section): ?>
                            <div class="help-section" id="section-<?php echo $index; ?>">
                                <div class="help-section-header">
                                    <h3 class="help-section-title">
                                        <?php echo e($section['title']); ?>
                                    </h3>
                                </div>
                                <div class="help-section-content">
                                    <?php echo $section['content']; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="help-section">
                            <div class="help-section-header">
                                <h3 class="help-section-title">ヘルプ情報</h3>
                            </div>
                            <div class="help-section-content">
                                <p>申し訳ございませんが、現在ヘルプ情報を読み込めません。</p>
                                <p>しばらく時間をおいてから再度お試しください。</p>
                            </div>
                        </div>
                    <?php endif; ?>
                    
                    <!-- 追加情報セクション -->
                    <div class="help-section">
                        <div class="help-section-header">
                            <h3 class="help-section-title">技術情報</h3>
                        </div>
                        <div class="help-section-content">
                            <h5>使用技術</h5>
                            <ul>
                                <li><strong>フロントエンド</strong>: Knockout.js, Mermaid.js, Bootstrap</li>
                                <li><strong>バックエンド</strong>: FuelPHP, SQLite</li>
                                <li><strong>認証</strong>: Google OAuth 2.0</li>
                                <li><strong>図表描画</strong>: Mermaid.js</li>
                            </ul>
                            
                            <h5>ブラウザ対応</h5>
                            <ul>
                                <li>Chrome 80+</li>
                                <li>Firefox 75+</li>
                                <li>Safari 13+</li>
                                <li>Edge 80+</li>
                            </ul>
                            
                            <h5>推奨環境</h5>
                            <ul>
                                <li>画面解像度: 1366x768 以上</li>
                                <li>インターネット接続: 必須</li>
                                <li>JavaScript: 有効</li>
                                <li>ポップアップブロック: 無効</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- お問い合わせセクション -->
                    <div class="help-section">
                        <div class="help-section-header">
                            <h3 class="help-section-title">お問い合わせ</h3>
                        </div>
                        <div class="help-section-content">
                            <p>システムに関するご質問やご要望がございましたら、以下の方法でお問い合わせください。</p>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <h5>技術的な問題</h5>
                                    <ul>
                                        <li>ブラウザのコンソールエラーを確認</li>
                                        <li>ページの再読み込みを試行</li>
                                        <li>別のブラウザで動作確認</li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h5>機能改善の提案</h5>
                                    <ul>
                                        <li>具体的な改善案の記述</li>
                                        <li>使用環境の情報提供</li>
                                        <li>期待される効果の説明</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- ページトップへ戻るボタン -->
    <button class="back-to-top" id="backToTop">
        <i class="fas fa-arrow-up"></i>
    </button>

    <!-- Bootstrap JS -->
    <?php echo Asset::js('bootstrap.min.js'); ?>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Font Awesome -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
    
    <script>
        $(document).ready(function() {
            // ページトップへ戻るボタンの表示制御
            $(window).scroll(function() {
                if ($(this).scrollTop() > 300) {
                    $('#backToTop').fadeIn();
                } else {
                    $('#backToTop').fadeOut();
                }
            });
            
            // ページトップへ戻る
            $('#backToTop').click(function() {
                $('html, body').animate({scrollTop: 0}, 600);
                return false;
            });
            
            // スムーススクロール
            $('a[href^="#"]').click(function() {
                const target = $(this.hash);
                if (target.length) {
                    $('html, body').animate({
                        scrollTop: target.offset().top - 100
                    }, 600);
                    return false;
                }
            });
        });
    </script>
</body>
</html>