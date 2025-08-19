# Google OAuth 設定ガイド

## 🔧 JSONファイルベースの設定方法

### 1. Google Cloud Console での設定

#### 1.1 OAuth 2.0 クライアント作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **APIとサービス** > **認証情報** に移動
3. **認証情報を作成** > **OAuth 2.0 クライアント ID** を選択
4. アプリケーションの種類: **ウェブアプリケーション**
5. 名前を入力（例：AI Chart Design System）

#### 1.2 承認済みオリジン設定

**承認済みのJavaScript生成元:**
```
http://localhost:8080
```

**承認済みのリダイレクトURI:**
```
（設定不要 - JavaScript APIを使用するため）
```

#### 1.3 JSONファイルのダウンロード

1. **作成** をクリック
2. **JSONをダウンロード** ボタンをクリック
3. ファイル名例: `client_secret_949592250367-xxx.apps.googleusercontent.com.json`

### 2. プロジェクトでの設定

#### 2.1 JSONファイルの配置

```bash
# ダウンロードしたJSONファイルをコピー
cp ~/Downloads/client_secret_*.json secrets/google_oauth_client.json

# ファイル権限設定
chmod 600 secrets/google_oauth_client.json
```

#### 2.2 .envファイルの設定

```bash
# .env
GOOGLE_OAUTH_JSON=file:secrets/google_oauth_client.json
```

### 3. JSONファイルの構造

```json
{
  "web": {
    "client_id": "949592250367-5ivu3q06a1ef7k2mh2b4lo94s646f1p9.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-your-actual-client-secret",
    "redirect_uris": [],
    "javascript_origins": [
      "http://localhost:8080"
    ]
  }
}
```

### 4. 動作確認

#### 4.1 設定値の確認

```php
// PHPで設定値確認
$google_config = Config::load('google');
echo "Client ID: " . $google_config['client_id'] . "\n";
echo "Auth URI: " . $google_config['auth_uri'] . "\n";
```

#### 4.2 アプリケーション起動

```bash
# Docker起動
cd docker
docker-compose up -d

# ブラウザでアクセス
# http://localhost:8080
```

### 5. トラブルシューティング

#### 5.1 よくある問題

**JSONファイルが見つからない**
```bash
# ファイル存在確認
ls -la secrets/google_oauth_client.json

# パーミッション確認
ls -la secrets/
```

**認証エラー**
- クライアントIDが正しいか確認
- ポート番号が8080になっているか確認
- JavaScriptオリジンに `http://localhost:8080` が設定されているか確認

**CORS エラー**
- リダイレクトURIに `http://localhost:8080/chart` が設定されているか確認

#### 5.2 デバッグ用

```bash
# JSONファイル内容確認（機密情報注意）
cat secrets/google_oauth_client.json | jq .

# 設定値確認
php -r "
include 'fuel/app/classes/env.php';
\$config = Env::get_google_oauth();
echo 'Client ID: ' . \$config['client_id'] . PHP_EOL;
"
```

### 6. セキュリティ

- ✅ JSONファイルは `.gitignore` で除外
- ✅ ファイル権限を `600` に設定
- ✅ 本番環境では適切な認証済みオリジンを設定
- ❌ JSONファイルを絶対にGitにコミットしない

これでGoogle OAuthがJSONファイルベースで安全に設定できます。