# インターン課題環境構築手順

## Dockerの基本知識
Dockerの基本的な概念については、以下のリンクを参考にしてください：
- [Docker入門（1）](https://qiita.com/Sicut_study/items/4f301d000ecee98e78c9)
- [Docker入門（2）](https://qiita.com/takusan64/items/4d622ce1858c426719c7)

## セットアップ手順

1. **リポジトリをクローン**
   ```bash
   git clone <リポジトリURL>
   ```

2. **dockerディレクトリに移動**
   ```bash
   cd docker
   ```

3. **データベース設定確認**
   このプロジェクトはMySQLデータベースを使用します。Docker Composeによって自動的にMySQLコンテナが起動され、データベースとユーザーが作成されます。

4. **Dockerイメージのビルドとコンテナの起動**
   ```bash
   docker-compose up --build -d
   ```

5. **初期セットアップコマンドの実行**
   
   コンテナ起動後、以下のコマンドを順番に実行してください：
   
   ```bash
   # Composerで依存関係をインストール
   docker compose exec --user www-data app bash -c "cd /var/www/html/my_fuel_project && php composer.phar install --no-dev --optimize-autoloader --no-scripts"
   
   # データベースマイグレーションの実行
   docker compose exec app php oil refine migrate --catchup
   
   # ログディレクトリの作成と権限設定
   docker compose exec app bash -c "mkdir -p /var/www/html/my_fuel_project/fuel/app/logs && chown -R www-data:www-data /var/www/html/my_fuel_project/fuel/app/logs && chmod -R 755 /var/www/html/my_fuel_project/fuel/app/logs"
   ```

6. **ブラウザからlocalhostにアクセス**
   
   セットアップ完了後、`http://localhost:8080` にアクセスしてアプリケーションを確認できます。

## PHP周りのバージョン
- **PHP**: 7.3
- **FuelPHP**: 1.8

## ログについて
- **アクセスログ**: Dockerのコンテナのログ
- **FuelPHPのエラーログ**: /var/www/html/intern_kadai/fuel/app/logs/
  - 年月日ごとにログが管理されている
  - tail -f {見たいログファイル}でログを出力

## データベース設定
このプロジェクトではMySQLデータベースを使用しています。

- **データベース種別**: MySQL 8.0
- **データベース名**: `ai_dev_design`
- **ホスト**: `db:3306` (コンテナ内部)
- **ユーザー**: `ai_dev_user`
- **パスワード**: `ai_dev_password`
- **テーブル**: users, charts, sessions

### 重要な注意点
- MySQLコンテナが自動的にデータベースとユーザーを作成します
- マイグレーションは手動実行が必要です（`docker compose exec app php oil refine migrate --catchup`）
- データはDockerボリューム `mysql_data` に永続化されます

## 📚 ドキュメント

- **[API仕様書](./docs/api.yml)** - OpenAPI 3.0形式のREST API仕様
- **[システム仕様書](./docs/specifications.md)** - 全体システム設計・要件
- **[🔧 トラブルシューティング](./docs/troubleshooting/)** - 開発中の問題と解決策集

### よく発生する問題
- [FuelPHP REST Controller で401エラーが返されない](./docs/troubleshooting/fuelphp-rest-auth.md)
- [SQLite ORM関連エラー (`Class 'Orm\Model' not found` など)](./docs/troubleshooting/sqlite-orm-setup.md)
- [REST API設定エラー (CORS, JSON形式など)](./docs/troubleshooting/rest-api-best-practices.md)
