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
- Cloudflare D1 データベース（SQLite互換）
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

## データベース設計（Cloudflare D1）

### chartテーブル
フローチャートの基本情報を管理

| カラム名 | データ型 | NULL | デフォルト | 備考 |
|----------|----------|------|------------|------|
| id | INTEGER | NO | - | チャートのID（主キー、自動増分） |
| title | TEXT | YES | NULL | チャートの名前、文字列 |
| google_user_id | TEXT | NO | - | 作成者のGoogle OAuth ID |
| content | TEXT | YES | NULL | Mermaid図のコード |
| updated_at | TEXT | YES | NULL | 最終更新日（ISO8601形式） |

### D1データベース特徴
- **SQLite互換**: Cloudflare D1はSQLiteベースのサーバーレスデータベース
- **エッジ配信**: 世界中のCloudflareエッジロケーションで実行
- **自動スケーリング**: サーバーレス環境での自動スケーリング
- **低レイテンシ**: エッジでの高速データアクセス

### テーブル設計方針
- **認証方式**: Google OAuth による認証
- **データ形式**: Mermaid形式のテキストデータをcontentカラムに保存
- **ユーザー管理**: google_user_idでユーザーを識別
- **チャート管理**: titleでチャート名を管理
- **日時管理**: ISO8601形式でタイムスタンプを記録

### SQL例（D1用）
```sql
CREATE TABLE chart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    google_user_id TEXT NOT NULL,
    content TEXT,
    updated_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_google_user_id ON chart(google_user_id);
CREATE INDEX idx_updated_at ON chart(updated_at);
```

### D1接続設定
```javascript
// Cloudflare Workers環境での接続例
export default {
  async fetch(request, env) {
    const db = env.DB; // D1データベースバインディング
    // クエリ実行例
    const result = await db.prepare(
      "SELECT * FROM chart WHERE google_user_id = ?"
    ).bind(userId).all();
  }
}
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