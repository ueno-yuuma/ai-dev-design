# AIフローチャート設計支援システム 仕様書

## 概要
ユーザーがフローチャートを作成・編集し、AIが設計を支援するWebアプリケーションシステム

---

## 主要機能

### 1. ノード管理機能

#### 1.1 ノード作成
- ユーザーがフローチャート上に新しいノードを作成
- ノードタイプ（開始、処理、判定、終了等）の選択
- ノード内容（テキスト）の入力
- Mermaidコードへの自動変換

#### 1.2 ノード編集
- 既存ノードの内容を編集
- ノードタイプの変更
- ノードの位置変更（ドラッグ操作）
- 編集内容のMermaidコード反映

#### 1.3 ノード削除
- 不要なノードの削除
- 関連する接続線の自動削除
- Mermaidコードからの自動除去

### 2. データ保存機能

#### 2.1 サーバー保存
- フローチャートデータのサーバー保存
- ユーザー別のデータ管理
- 保存データの読み込み・復元

#### 2.2 データ形式
- 内部データ構造（ノード・接続情報）
- Mermaidテキスト形式での保存
- 双方向変換機能（ビジュアル編集 ⇔ Mermaidコード）

### 3. AI詳細化機能

#### 3.1 詳細化実行
- ユーザーがノードを選択
- 「詳細化」ボタンをクリック
- AIが複数のより具体的なノードに分割

#### 3.2 AI処理内容
- 選択されたノードの内容を解析
- 処理を複数のステップに分解
- 新しいノード群を生成・配置

### 4. ノード接続機能

#### 4.1 接続操作
- ドラッグ&ドロップによるノード間接続
- 矢印による方向性の表示
- 接続線の削除・編集
- Mermaidコードへの自動変換

#### 4.2 接続ラベル
- 接続線にテキストを付与
- 処理の流れや条件の記述
- 例：「成功時」「失敗時」「Yes」「No」
- ラベル情報のMermaidコード反映

### 5. エクスポート機能

#### 5.1 エクスポート形式
- テキストベース形式での出力
- Mermaid形式での出力
- 階層構造での表現
- 処理フローの可読性確保

---

## 技術要件

### フロントエンド
- Mermaid.js による図表描画・レンダリング
- Knockout.js による動的UI制御
- ドラッグ&ドロップライブラリ（Interact.js等）
- Ajax による非同期通信
- 双方向データバインディング（ビジュアル ⇔ Mermaidコード）

### バックエンド
- FuelPHP フレームワーク
- REST API による通信
- JSON形式でのデータ交換
- SQLite データベース
- Google OAuth 認証

### AI機能
- AI API との連携
- 自然言語処理による詳細化
- フローチャート構造の理解

---

## ユーザーインターフェース

### メイン画面
- フローチャート描画エリア（Mermaidレンダリング）
- ノード作成ツールバー
- 保存・読み込みボタン
- エクスポートボタン
- AI詳細化ボタン

### ノード操作
- 右クリックメニュー（編集・削除・詳細化）
- ダブルクリックによる編集
- ドラッグによる移動・接続
- ノード選択時のプロパティ表示

### デュアルビュー（オプション）
- ビジュアル編集エリア
- Mermaidコードエディタ
- リアルタイム同期表示


---

## データベース設計（SQLite）

### userテーブル
ユーザーの基本情報を管理

| カラム名 | データ型 | NULL | デフォルト | 備考 |
|----------|----------|------|------------|------|
| id | TEXT | NO | - | ユーザーID（主キー、UUID） |
| google_user_id | TEXT | NO | - | Google OAuth ID（一意） |
| email | TEXT | YES | - | メールアドレス |
| name | TEXT | YES | - | ユーザー名 |
| created_at | TEXT | YES | CURRENT_TIMESTAMP | 作成日時 |

### chartsテーブル
フローチャートの基本情報を管理

| カラム名 | データ型 | NULL | デフォルト | 備考 |
|----------|----------|------|------------|------|
| id | TEXT | NO | - | チャートID（主キー、UUID） |
| user_id | TEXT | NO | - | ユーザーID（外部キー、UUID） |
| title | TEXT | YES | - | チャートタイトル |
| content | TEXT | YES | - | Mermaidコード |
| created_at | TEXT | YES | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TEXT | YES | - | 最終更新日時 |

### SQLiteデータベース特徴
- **軽量**: ファイルベースのデータベース
- **高速**: 小〜中規模データに最適化
- **組み込み型**: サーバー不要、アプリケーションに組み込み
- **ACID準拠**: トランザクション機能完備
- **クロスプラットフォーム**: 多様な環境で動作

### テーブル設計方針
- **認証方式**: Google OAuth による認証
- **データ形式**: Mermaid形式のテキストデータをcontentカラムに保存
- **ユーザー管理**: usersテーブルで管理、1:n関係でchartsと関連付け
- **チャート管理**: titleでチャート名を管理
- **日時管理**: ISO8601形式でタイムスタンプを記録

### SQL例（SQLite用）
```sql
-- usersテーブル
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    google_user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- chartsテーブル
CREATE TABLE charts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス（パフォーマンス最適化）
CREATE INDEX idx_users_google_user_id ON users(google_user_id);
CREATE INDEX idx_charts_user_id ON charts(user_id);
CREATE INDEX idx_charts_created_at ON charts(created_at);
CREATE INDEX idx_charts_updated_at ON charts(updated_at);
CREATE INDEX idx_charts_title ON charts(title);
CREATE INDEX idx_charts_user_created ON charts(user_id, created_at);
```

### データベース接続設定
```php
// FuelPHP PDO接続例
'default' => array(
    'type'        => 'pdo',
    'connection'  => array(
        'dsn'        => 'sqlite:' . APPPATH . 'database/test.db',
        'username'   => '',
        'password'   => '',
        'persistent' => false,
    ),
    'identifier'   => '"',
    'table_prefix' => '',
    'charset'      => 'utf8',
    'enable_cache' => true,
    'profiling'    => false,
)
```

### 実装の簡素化について
データベースにSQLiteを採用した理由：
- **開発環境の簡素化**: サーバー不要でファイルベースの軽量データベース
- **設定の簡単さ**: 複雑な外部サービス設定が不要
- **デバッグの容易さ**: ローカルファイルでのデータ確認が可能
- **移植性**: プロジェクト全体を簡単に移動・共有可能

### UUID生成・管理
- **UUID形式**: UUID v4（ランダム生成）
- **生成方法**: PHPの`random_bytes()`関数を使用した暗号学的に安全な実装
- **例**: `550e8400-e29b-41d4-a716-446655440000`

### データベースファイル配置
- **開発環境**: `fuel/app/database/test.db`
- **本番環境**: `fuel/app/database/production.db`
- **バックアップ**: 定期的なファイルコピーによる簡易バックアップ
- **セキュリティ**: `.htaccess`による外部アクセス制限

### UUID生成PHP例
```php
// 暗号学的に安全なUUID生成
function generate_uuid() {
    // PHP 7.0+ の random_bytes() を使用（暗号学的に安全）
    if (function_exists('random_bytes')) {
        try {
            $data = random_bytes(16);
            
            // version 4 の設定
            $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
            // variant bits の設定
            $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
            
            return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        } catch (Exception $e) {
            // フォールバック処理
        }
    }
    
    // フォールバック: OpenSSL を使用
    if (function_exists('openssl_random_pseudo_bytes')) {
        $data = openssl_random_pseudo_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
    
    // 最終フォールバック（非推奨）
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// 使用例
$user_id = generate_uuid();  // "550e8400-e29b-41d4-a716-446655440000"
```

---

## セキュリティ要件

- ユーザー認証・認可
- CSRFトークンによる攻撃防止
- 入力値検証・サニタイズ
- SQLインジェクション対策

---

## パフォーマンス要件

- 中規模フローチャート（50ノード程度）での快適な動作
- レスポンス時間：2秒以内
- 同時接続ユーザー：50人以下
- Mermaidレンダリング時間：1秒以内