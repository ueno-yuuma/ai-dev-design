# Dockerfile改良による根本的問題解決

## 背景
以下の問題を根本的に解決するため、Dockerfileを改良しました：

1. **Composer権限問題** (`docker-composer-permissions.md`)
2. **データベーステーブル欠如問題** (`api-500-error-database-tables.md`)

## 改良前の問題

### 手動対応が必要だった問題
```bash
# 1. Composer権限修正
docker exec fuelphp-app bash -c "chown -R www-data:www-data /var/www/html/my_fuel_project/fuel/vendor/"

# 2. ログディレクトリ作成
docker exec fuelphp-app bash -c "mkdir -p /var/www/html/my_fuel_project/fuel/app/logs"

# 3. データベースマイグレーション実行
docker exec fuelphp-app bash -c "cd /var/www/html/my_fuel_project && php oil refine migrate"
```

## 改良されたDockerfileの特徴

### 1. Composer依存関係の自動インストール
```dockerfile
# Composerファイルをコピーして依存関係をインストール
COPY composer.json composer.lock oil ./
RUN curl -sS https://getcomposer.org/installer | php && \
    php composer.phar install --no-dev --optimize-autoloader --ignore-platform-reqs --no-scripts

# プロジェクトファイルをすべてコピー
COPY . .

# Composerを再実行（古いcomposer.pharが上書きされた場合の対応）
RUN rm -f composer.phar && \
    curl -sS https://getcomposer.org/installer | php && \
    php composer.phar install --no-dev --optimize-autoloader --ignore-platform-reqs --no-scripts
```

**解決する問題:**
- 最新のComposer 2を使用してPHPバージョン互換性問題を回避
- `--ignore-platform-reqs`でPlatform requirementエラーを回避
- `--no-scripts`でpost-installスクリプトエラーを回避

### 2. SQLite拡張の追加インストール
```dockerfile
# SQLite拡張が必要な場合はインストール
RUN docker-php-ext-install pdo_sqlite
```

### 3. 権限設定の自動化
```dockerfile
# アプリケーション用ディレクトリの作成と権限設定
RUN mkdir -p fuel/app/logs fuel/app/database && \
    chown -R www-data:www-data fuel/vendor fuel/app/logs fuel/app/database && \
    chmod -R 775 fuel/app/logs fuel/app/database
```

**解決する問題:**
- `www-data`ユーザーがvendor/autoload.phpを読み取れない問題
- ログディレクトリへの書き込み権限問題

### 4. データベースマイグレーションの自動実行
```dockerfile
# データベースマイグレーションの実行
RUN php oil refine migrate && \
    chown -R www-data:www-data fuel/app/database
```

**解決する問題:**
- 初回起動時に`users`, `charts`, `sessions`テーブルが存在しない問題
- API実行時の「no such table」エラー

### 5. 最終的な権限設定
```dockerfile
# 最終的な権限設定
RUN chown -R www-data:www-data /var/www/html/my_fuel_project && \
    chmod -R 755 /var/www/html/my_fuel_project && \
    chmod -R 775 fuel/app/logs fuel/app/database fuel/vendor
```

## テスト手順

### 1. イメージのクリーンビルド
```bash
# 既存イメージとコンテナを削除
docker-compose down
docker system prune -f
docker rmi docker-app:latest 2>/dev/null || true

# 新しいイメージをビルド
cd docker
docker-compose build --no-cache
```

### 2. 動作確認
```bash
# コンテナ起動
docker-compose up -d

# APIヘルスチェック（データベース接続確認）
curl -s http://localhost:8080/api/health | jq '.'

# 期待される結果:
# {
#   "status": "healthy",
#   "timestamp": "2025-08-25 13:15:00",
#   "database": true,  # <- これがtrueであること
#   "database_type": "SQLite"
# }
```

### 3. Google認証テスト
```bash
# ブラウザでアクセス
# http://localhost:8080

# Google Sign-Inボタンをクリック
# 500エラーが発生しないことを確認
```

## 期待される効果

### ビルド時に自動解決される問題
1. ✅ Composer依存関係のインストール
2. ✅ 権限設定（vendor, logs, database）
3. ✅ データベーステーブル作成
4. ✅ SQLite拡張のインストール

### 手動操作不要になる作業
- Composer installの実行
- 権限修正コマンドの実行
- マイグレーションの実行
- ログディレクトリの作成

## 追加の改良案

### 1. ヘルスチェック機能
```dockerfile
# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/api/health || exit 1
```

### 2. 非rootユーザーでの実行
```dockerfile
# セキュリティ向上のため、www-dataユーザーで実行
USER www-data
```

### 3. マルチステージビルド
```dockerfile
# 本番環境用の軽量イメージ作成
FROM composer:2 AS composer
# ... composer install

FROM php:7.3-apache AS runtime
COPY --from=composer /app/vendor ./vendor
# ...
```

## 注意事項

1. **キャッシュの影響**
   - `docker-compose build --no-cache`でクリーンビルドを推奨
   - 既存のボリュームデータは削除が必要な場合がある

2. **ポート競合**
   - 既存コンテナが8080ポートを使用している場合は停止が必要

3. **権限設定**
   - ホストOSとの権限マッピングに注意
   - 必要に応じてUID/GIDの調整

## 日時
- 作成日: 2025-08-25
- 対象問題: Composer権限、データベーステーブル欠如
- 効果: 初回起動時の手動設定作業を完全自動化