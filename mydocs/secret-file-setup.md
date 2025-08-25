# 機密ファイル設定ガイド（簡易版）

## 🔒 ファイル参照による機密情報管理

### 概要

`GOOGLE_CLIENT_SECRET` のような機密情報は、ファイル参照で管理します。

### 🚀 クイックセットアップ

#### 1. 機密ファイル作成

```bash
# 機密ファイル作成
echo "GOCSPX-your-actual-client-secret" > secrets/google_client_secret.txt

# ファイル権限設定（Linux/Mac）
chmod 600 secrets/google_client_secret.txt
```

#### 2. .envファイル設定

```bash
# .env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=file:secrets/google_client_secret.txt
```

### 📁 ファイル構成

```
project/
├── .env                              # 環境変数設定
├── secrets/
│   ├── google_client_secret.txt      # 機密ファイル（Git除外）
│   └── google_client_secret.txt.example  # テンプレート
└── .gitignore                        # secrets/*.txt を除外
```

### 🔧 動作原理

1. `.env` で `file:secrets/google_client_secret.txt` を指定
2. `Env::get('GOOGLE_CLIENT_SECRET')` 呼び出し時
3. プロジェクトルート + `secrets/google_client_secret.txt` からファイル内容を読み込み
4. ファイル内容（改行除去済み）を返す

### 🛡️ セキュリティ

- ✅ 機密ファイルは `.gitignore` で除外
- ✅ ファイル権限で読み取り制限
- ✅ ログに機密情報が出力されない

### 🐳 Docker環境

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ./secrets:/app/secrets:ro  # 読み取り専用
```

### 📋 トラブルシューティング

#### ファイルが見つからない

```bash
# ファイル存在確認
ls -la secrets/google_client_secret.txt

# 内容確認
cat secrets/google_client_secret.txt
```

#### 権限エラー

```bash
# 権限設定
chmod 600 secrets/google_client_secret.txt

# 所有者確認
ls -la secrets/
```

これで機密情報を安全に管理できます。