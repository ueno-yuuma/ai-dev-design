# Google OAuth 設定ガイド

このガイドでは、アプリケーションでGoogle OAuth認証を有効にするための設定方法を説明します。

## 🔧 設定の概要

本アプリケーションでは、Google OAuthのクライアントIDを環境変数を通じて設定します。設定はプロジェクトのルートディレクトリにある `.env` ファイルに記述します。

---

### 1. Google Cloud Console での設定

まず、Google Cloud ConsoleでOAuth 2.0 クライアントIDを取得する必要があります。

#### 1.1 OAuth 2.0 クライアントの作成

1.  [Google Cloud Console](https://console.cloud.google.com/) にアクセスします。
2.  **APIとサービス** > **認証情報** に移動します。
3.  **認証情報を作成** > **OAuth 2.0 クライアント ID** を選択します。
4.  **アプリケーションの種類**で「**ウェブアプリケーション**」を選択します。
5.  **名前**を入力します（例：AI Chart Design System）。

#### 1.2 承認済みJavaScript生成元の設定

アプリケーションが動作するオリジンを登録します。開発環境では通常 `http://localhost:8080` を使用します。

-   **承認済みのJavaScript生成元** > **URIを追加** をクリックし、以下を入力します。
    ```
    http://localhost:8080
    ```

#### 1.3 クライアントIDの取得

1.  **作成** をクリックすると、クライアントIDが作成されます。
2.  表示された**クライアントID**をコピーします。これは次のステップで使用します。
    -   例: `949592250367-xxxxxxxx.apps.googleusercontent.com`

---

### 2. プロジェクトでの設定

次に、取得したクライアントIDをプロジェクトに設定します。

#### 2.1 `.env` ファイルの作成

プロジェクトのルートディレクトリ（このファイルがあるディレクトリの親）に `.env` という名前のファイルを作成します。`.env.example` ファイルをコピーして作成することもできます。

```bash
# .env.example をコピーして .env を作成
cp .env.example .env
```

#### 2.2 `.env` ファイルの編集

作成した `.env` ファイルを開き、`GOOGLE_CLIENT_ID` の値を、先ほどGoogle Cloud Consoleで取得したクライアントIDに設定します。

```dotenv
# .env

# Google OAuth Client ID
# Google Cloud Consoleで取得したOAuth 2.0 クライアントIDを設定します。
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
```
`"YOUR_GOOGLE_CLIENT_ID_HERE"` の部分を、ご自身のクライアントIDに置き換えてください。

---

### 3. 動作確認

設定が完了したら、アプリケーションを起動して動作を確認します。

#### 3.1 アプリケーションの起動

```bash
# Dockerコンテナを起動
cd docker
docker-compose up -d
```

#### 3.2 ブラウザでのアクセス

ブラウザで `http://localhost:8080` にアクセスします。Googleのログインボタンが表示され、ログインが正常に完了すれば設定は成功です。

---

### 4. トラブルシューティング

**認証エラーが発生する場合**

-   `.env` ファイルの `GOOGLE_CLIENT_ID` が正しいか確認してください。
-   Google Cloud Consoleで、**承認済みのJavaScript生成元**に `http://localhost:8080` が正しく登録されているか確認してください。
-   コンテナを再起動 (`docker-compose restart`) して、環境変数が再読み込みされるようにしてください。

これで、Google OAuthが正しく設定されます。
