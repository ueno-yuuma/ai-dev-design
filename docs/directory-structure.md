# ai-dev-design プロジェクト構造

## 概要
FuelPHP フレームワークを使用したWebアプリケーション開発プロジェクト

## ディレクトリ構造

### **プロジェクトルート**
```
ai-dev-design/
├── README.md              # プロジェクト説明
├── composer.json          # Composer依存関係
├── composer.lock          # 依存関係ロックファイル
├── composer.phar          # Composer実行ファイル
├── oil                    # FuelPHP CLIツール
├── docker/                # Docker環境設定
├── docs/                  # プロジェクトドキュメント
├── fuel/                  # FuelPHPフレームワーク
└── public/                # Webサーバー公開ディレクトリ
```

---

## 各ディレクトリの詳細

### **docker/** - 開発環境
**用途**: Docker を使用した開発環境の構築

- `Dockerfile` - PHPアプリケーション用コンテナ
- `docker-compose.yml` - マルチコンテナ構成
- `php.ini` - PHP設定
- `db/` - データベースコンテナ設定
  - `Dockerfile` - データベース用コンテナ
  - `my.cnf` - MySQL設定

### **docs/** - ドキュメント
**用途**: プロジェクトの設計書・仕様書・ルール

- `rules.md` - 開発ルール・コーディング規約
- `directory-structure.md` - このファイル（プロジェクト構造説明）

### **fuel/** - FuelPHPフレームワーク
**用途**: アプリケーションの中核部分

#### **fuel/app/** - アプリケーション本体（開発対象）
- `classes/` - アプリケーションクラス
  - `controller/` - コントローラー（URL処理）
  - `model/` - モデル（データ操作・ビジネスロジック）
  - `presenter/` - プレゼンター（表示データ整形）
- `config/` - 設定ファイル
  - 環境別設定ディレクトリ（development, production, staging, test）
- `views/` - ビューテンプレート（HTML）
- `tests/` - テストコード
- `modules/` - 機能モジュール
- `tasks/` - CLIタスク・バッチ処理
- `migrations/` - データベースマイグレーション
- `logs/` - アプリケーションログ
- `cache/` - キャッシュファイル
- `tmp/` - 一時ファイル
- `vendor/` - アプリケーション固有の外部ライブラリ

#### **fuel/core/** - フレームワークコア（編集禁止）
- `classes/` - FuelPHPコアクラス
- `config/` - フレームワークデフォルト設定
- `tests/` - フレームワークテスト
- `lang/` - 多言語対応ファイル

#### **fuel/packages/** - 再利用パッケージ
- 共通機能モジュール（認証、ORM、メール等）

#### **fuel/vendor/** - 外部ライブラリ（Composer管理）
- サードパーティ製ライブラリ

### **public/** - Web公開ディレクトリ
**用途**: Webサーバーのドキュメントルート

- `index.php` - アプリケーションエントリーポイント
- `assets/` - 静的ファイル
  - `css/` - スタイルシート（Bootstrap等）
  - `js/` - JavaScript（Bootstrap等）
  - `fonts/` - フォントファイル
  - `img/` - 画像ファイル
- `favicon.ico` - サイトアイコン
- `web.config` - IIS設定（Windows環境）

---

## 開発時の作業場所

### **メイン開発エリア**
- `fuel/app/classes/controller/` - URL処理とリクエスト制御
- `fuel/app/classes/model/` - データベース操作とビジネスロジック
- `fuel/app/views/` - HTMLテンプレート
- `fuel/app/config/` - アプリケーション設定
- `public/assets/` - CSS、JavaScript、画像

### **設定・環境**
- `docker/` - 開発環境の調整
- `fuel/app/config/` - データベース接続等の設定
- `fuel/app/migrations/` - データベース構造変更

### **テスト・品質管理**
- `fuel/app/tests/` - アプリケーションテスト
- `docs/` - ドキュメント管理

---

## 編集優先度

1. **fuel/app/** - メイン開発領域（最優先）
2. **public/assets/** - フロントエンド素材
3. **docs/** - ドキュメント
4. **docker/** - 環境設定（必要時のみ）
5. **fuel/packages/** - 共通機能開発時
6. **fuel/vendor/** - 基本的に編集しない
7. **fuel/core/** - 絶対に編集しない

---

## 注意事項

- **fuel/core/** は絶対に編集しない（フレームワーク本体）
- **fuel/vendor/** は Composer で管理されるため直接編集しない
- 設定ファイルは環境別に分けて管理する
- 静的ファイルは **public/assets/** に配置する
- ドキュメントは **docs/** で一元管理する