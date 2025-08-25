# Docker環境でのComposer権限問題

## 問題の概要
FuelPHPアプリケーションをDockerコンテナで起動した際、以下のエラーが発生しました：
```
Composer is not installed. Please run "php composer.phar update" in the root to install Composer
```

## 根本原因
ファイル所有者権限の問題でした。

### 詳細な原因
1. **Composerインストール時の所有者**: Docker内で`composer install`を`root`ユーザーで実行
2. **Webサーバーのユーザー**: ApacheはDockerコンテナ内で`www-data`ユーザーとして動作
3. **権限の不一致**: `root`所有のファイル（`fuel/vendor/autoload.php`等）を`www-data`ユーザーが読み取れない

### FuelPHPのチェック処理
```php
// fuel/core/bootstrap.php:339-342
if ( ! is_file(VENDORPATH.'autoload.php'))
{
    die('Composer is not installed. Please run "php composer.phar update" in the root to install Composer');
}
```

`www-data`ユーザーから見ると権限がないため`is_file()`が`false`を返していました。

## 解決方法
### 即座の解決
```bash
docker exec fuelphp-app bash -c "chown -R www-data:www-data /var/www/html/my_fuel_project/fuel/vendor/"
```

### Dockerfileでの恒久的解決
以下のいずれかを実装：

#### 方法1: 後でchownを実行
```dockerfile
RUN php composer.phar install --no-dev --optimize-autoloader
RUN chown -R www-data:www-data fuel/vendor/
```

#### 方法2: www-dataユーザーでcomposer install実行
```dockerfile
USER www-data
RUN php composer.phar install --no-dev --optimize-autoloader
USER root
```

## 関連する問題
同様の問題は以下のケースでも発生する可能性があります：
- ログファイルの書き込み権限
- アップロードディレクトリの権限
- キャッシュディレクトリの権限

## 予防策
1. Dockerfileでファイル作成後は適切な所有者を設定
2. `USER`命令を使用して適切なユーザーでコマンド実行
3. `chown`や`chmod`を適切に使用してWebサーバーユーザーがアクセス可能にする

## 日時
作成日: 2025-08-25
解決日: 2025-08-25