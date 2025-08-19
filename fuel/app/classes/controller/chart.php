<?php

/**
 * フロントエンド チャートコントローラー
 * AIフローチャート設計支援システムのメインページ表示
 */
class Controller_Chart extends Controller
{
    /**
     * メインページ表示
     */
    public function action_index()
    {
        try {
            // ヘルスチェック用にAPIの状態を確認
            $api_status = $this->check_api_health();
            
            // Google OAuth設定を直接読み込み
            $json_file = DOCROOT . '../secrets/google_oauth_client.json';
            $client_id = '';
            
            if (file_exists($json_file)) {
                $json_content = file_get_contents($json_file);
                $json_data = json_decode($json_content, true);
                if ($json_data && isset($json_data['web']['client_id'])) {
                    $client_id = $json_data['web']['client_id'];
                }
            }
            
            // ビューにデータを渡す
            $data = array(
                'api_status' => $api_status,
                'page_title' => 'AIフローチャート設計支援システム',
                'app_version' => '1.0.0',
                'google_client_id' => $client_id,
                'api_base_url' => Uri::base() . 'api'
            );
            
            return View::forge('chart/index', $data);
            
        } catch (Exception $e) {
            Log::error('Chart controller error: ' . $e->getMessage());
            
            // エラー時はシンプルなエラーページを表示
            return View::forge('chart/error', array(
                'error_message' => 'システムエラーが発生しました。しばらくお待ちください。',
                'error_code' => 'CHART_CONTROLLER_ERROR'
            ));
        }
    }
    
    /**
     * デモページ（認証なしでテスト可能）
     */
    public function action_demo()
    {
        try {
            $data = array(
                'page_title' => 'AIフローチャート設計支援システム - デモ',
                'is_demo' => true,
                'demo_data' => $this->get_demo_data()
            );
            
            return View::forge('chart/demo', $data);
            
        } catch (Exception $e) {
            Log::error('Chart demo controller error: ' . $e->getMessage());
            return View::forge('chart/error', array(
                'error_message' => 'デモページの読み込みに失敗しました。',
                'error_code' => 'CHART_DEMO_ERROR'
            ));
        }
    }
    
    /**
     * ヘルプページ
     */
    public function action_help()
    {
        $data = array(
            'page_title' => 'ヘルプ - AIフローチャート設計支援システム',
            'help_sections' => $this->get_help_sections()
        );
        
        return View::forge('chart/help', $data);
    }
    
    /**
     * APIヘルスチェック
     */
    private function check_api_health()
    {
        try {
            // 簡易的なヘルスチェック（データベース接続確認）
            DB::query('SELECT 1')->execute();
            
            return array(
                'status' => 'healthy',
                'database' => true,
                'timestamp' => date('Y-m-d H:i:s')
            );
            
        } catch (Exception $e) {
            Log::warning('API health check failed: ' . $e->getMessage());
            
            return array(
                'status' => 'unhealthy',
                'database' => false,
                'timestamp' => date('Y-m-d H:i:s'),
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * デモ用サンプルデータ取得
     */
    private function get_demo_data()
    {
        return array(
            'sample_charts' => array(
                array(
                    'id' => 'demo_001',
                    'title' => 'サンプルフローチャート1',
                    'content' => 'graph TD
    A[開始] --> B[ユーザー入力]
    B --> C{入力値チェック}
    C -->|有効| D[データ処理]
    C -->|無効| E[エラーメッセージ]
    D --> F[結果表示]
    E --> B
    F --> G[終了]',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ),
                array(
                    'id' => 'demo_002',
                    'title' => 'サンプルフローチャート2',
                    'content' => 'graph TD
    Start[開始] --> Input[データ入力]
    Input --> Process[データ処理]
    Process --> Check{処理結果確認}
    Check -->|成功| Output[結果出力]
    Check -->|失敗| Error[エラー処理]
    Output --> End[終了]
    Error --> Input',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                )
            ),
            'node_templates' => array(
                'start' => array('label' => '開始', 'shape' => 'oval'),
                'process' => array('label' => '処理', 'shape' => 'rectangle'),
                'decision' => array('label' => '判定', 'shape' => 'diamond'),
                'end' => array('label' => '終了', 'shape' => 'oval'),
                'input' => array('label' => '入力', 'shape' => 'parallelogram'),
                'output' => array('label' => '出力', 'shape' => 'parallelogram')
            )
        );
    }
    
    /**
     * ヘルプセクション取得
     */
    private function get_help_sections()
    {
        return array(
            array(
                'title' => '基本的な使い方',
                'content' => '
                    <p>AIフローチャート設計支援システムの基本的な使い方を説明します。</p>
                    <ol>
                        <li>Googleアカウントでログインしてください</li>
                        <li>「新規作成」ボタンをクリックして新しいチャートを作成</li>
                        <li>左のパレットからノードをドラッグしてキャンバスに配置</li>
                        <li>ノードをクリックして内容を編集</li>
                        <li>「保存」ボタンでチャートを保存</li>
                    </ol>
                '
            ),
            array(
                'title' => 'ノードの種類',
                'content' => '
                    <ul>
                        <li><strong>開始</strong>: プロセスの開始点を示します</li>
                        <li><strong>処理</strong>: 一般的な処理ステップを示します</li>
                        <li><strong>判定</strong>: 条件分岐を示します</li>
                        <li><strong>終了</strong>: プロセスの終了点を示します</li>
                        <li><strong>入力</strong>: データの入力を示します</li>
                        <li><strong>出力</strong>: データの出力を示します</li>
                    </ul>
                '
            ),
            array(
                'title' => 'AI機能',
                'content' => '
                    <p>AI機能を使用してフローチャートを改善できます。</p>
                    <ul>
                        <li><strong>ノード詳細化</strong>: 選択したノードをより詳細なステップに分割</li>
                        <li><strong>フロー最適化</strong>: フローチャート全体の構造を最適化</li>
                    </ul>
                    <p><em>注意: AI機能は将来のアップデートで実装予定です。</em></p>
                '
            ),
            array(
                'title' => 'キーボードショートカット',
                'content' => '
                    <ul>
                        <li><strong>Ctrl+S</strong>: チャートを保存</li>
                        <li><strong>Ctrl+Z</strong>: 元に戻す</li>
                        <li><strong>Ctrl+Shift+Z</strong>: やり直し</li>
                        <li><strong>Ctrl+N</strong>: 新規チャート作成</li>
                    </ul>
                '
            ),
            array(
                'title' => 'トラブルシューティング',
                'content' => '
                    <h5>よくある問題と解決方法</h5>
                    <ul>
                        <li><strong>ログインできない</strong>: ブラウザのポップアップブロックを確認してください</li>
                        <li><strong>チャートが表示されない</strong>: Mermaidコードの構文を確認してください</li>
                        <li><strong>保存できない</strong>: インターネット接続を確認してください</li>
                        <li><strong>ノードが追加できない</strong>: ページを再読み込みしてください</li>
                    </ul>
                '
            )
        );
    }
    
    /**
     * エラー処理用のアクション
     */
    public function action_error()
    {
        $error_code = Input::get('code', 'UNKNOWN_ERROR');
        $error_message = Input::get('message', 'システムエラーが発生しました。');
        
        $data = array(
            'error_code' => $error_code,
            'error_message' => $error_message,
            'page_title' => 'エラー - AIフローチャート設計支援システム'
        );
        
        return View::forge('chart/error', $data);
    }
}