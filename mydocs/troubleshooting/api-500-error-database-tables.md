# API 500エラー - データベーステーブル欠如問題

## 問題の概要
FuelPHPアプリケーションでPOST `/api/login` を実行した際、以下のエラーが発生しました：
```
POST http://localhost:8080/api/login 500 (Internal Server Error)
```

## 症状
- Google Sign-Inのクライアント側処理で500エラーが発生
- サーバーサイドでの処理が失敗
- エラースタック: `window.handleCredentialResponse @ app.js`

## 根本原因
**データベーステーブルが存在しないことが原因でした。**

## 詳細な原因分析

### 1. マイグレーション実行状況の誤認
```bash
# マイグレーション状況確認
docker exec fuelphp-app bash -c "cd /var/www/html/my_fuel_project && php oil refine migrate --version"
# 結果: "Already on the latest migration for app:default"
```
- マイグレーションは完了していると表示されていたが、実際のテーブルは作成されていませんでした

### 2. ログで確認された実際のエラー
```
ERROR - 2025-08-25 13:02:22 --> Login error: SQLSTATE[HY000]: General error: 1 no such table: users
ERROR - 2025-08-25 13:00:33 --> Database connection test failed: SQLSTATE[HY000]: General error: 1 no such table: charts
```

### 3. マイグレーション設定ファイルの欠如
- `fuel/app/config/migrations.php` が存在しませんでした
- FuelPHPがマイグレーションの状態管理を正しく行えませんでした

## 解決手順

### ステップ1: マイグレーション設定ファイル作成
```php
// fuel/app/config/migrations.php
<?php
return array(
    'version' => array(
        'app' => array(
            'default' => 3, // 最新のマイグレーション番号
        ),
    ),
    'folder' => 'migrations/',
    'table' => 'migration',
    'connection' => null,
);
```

### ステップ2: セッションテーブルのマイグレーション追加
```php
// fuel/app/migrations/003_create_sessions_table.php
class Create_sessions_table
{
    public function up()
    {
        \DB::query("
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                google_user_id TEXT,
                email TEXT,
                name TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ")->execute();
        
        // インデックス作成
        \DB::query("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")->execute();
        \DB::query("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")->execute();
    }
    
    public function down()
    {
        \DB::query("DROP TABLE IF EXISTS sessions")->execute();
    }
}
```

### ステップ3: マイグレーションの再実行
```bash
# マイグレーションをリセットして再実行
docker exec fuelphp-app bash -c "cd /var/www/html/my_fuel_project && php oil refine migrate --version=0 && php oil refine migrate --version=3"
```

**実行結果:**
```
Sessions table dropped successfully.
Users table created successfully with SQLite.
Charts table created successfully with SQLite.
Sessions table created successfully with SQLite.
Performed migrations for app:default:
001_create_users_table
002_create_charts_table
003_create_sessions_table
```

### ステップ4: 動作確認
```bash
# APIヘルスチェックでデータベース接続確認
curl -s http://localhost/api/health
```

**修正前:**
```json
{"database":false}
```

**修正後:**
```json
{"database":true}
```

## 学んだ教訓

### 1. マイグレーション状況の正確な確認方法
- `php oil refine migrate --version` だけでは不十分
- 実際のデータベースファイルサイズとテーブル存在確認が必要

### 2. FuelPHPマイグレーションの要件
- `config/migrations.php` 設定ファイルが必須
- マイグレーションクラスは `\Fuel\Core\Migration` を継承不要（バージョン依存）

### 3. エラー診断のアプローチ
1. **クライアントサイドエラー** → サーバーサイドログを確認
2. **500エラー** → 具体的なSQLエラーを特定
3. **マイグレーション完了表示** → 実際のテーブル作成を検証

## 予防策

### 1. マイグレーション後の検証手順
```bash
# 1. マイグレーション実行
php oil refine migrate

# 2. データベースファイルサイズ確認
ls -la fuel/app/database/test.db

# 3. APIヘルスチェック実行
curl -s http://localhost/api/health

# 4. ログファイル確認
tail -n 20 fuel/app/logs/YYYY/MM/DD.php
```

### 2. 開発環境でのチェックリスト
- [ ] マイグレーション設定ファイルの存在確認
- [ ] 全必要テーブルの作成確認
- [ ] API基本動作の確認
- [ ] エラーログの定期確認

## 関連ファイル
- `fuel/app/config/migrations.php`
- `fuel/app/migrations/001_create_users_table.php`
- `fuel/app/migrations/002_create_charts_table.php`
- `fuel/app/migrations/003_create_sessions_table.php`

## 日時
- 問題発生日: 2025-08-25
- 解決日: 2025-08-25
- 解決時間: 約2時間