# FuelPHP REST API エラー対応集

## 問題: APIがXMLで返される

**解決策**: コントローラーでJSONを強制設定
```php
class Controller_Api extends Controller_Rest
{
    protected $format = 'json';
    
    public function before()
    {
        parent::before();
        $this->format = 'json';
        $this->response->set_header('Content-Type', 'application/json');
    }
}
```

## 問題: CORS エラーが発生する

**症状**: フロントエンドからのAPIアクセスでCORSエラー

**解決策**: CORS ヘッダーを設定
```php
$this->response->set_header('Access-Control-Allow-Origin', '*');
$this->response->set_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
$this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

// Preflight 対応
if (Input::method() === 'OPTIONS') {
    return $this->response();
}
```

## 問題: 例外処理で500エラーになる

**症状**: try-catch で `Exception` が捕捉されない

**解決策**: 名前空間を明示
```php
// ❌ 間違い
} catch (Exception $e) {

// ✅ 正しい
} catch (\Exception $e) {
    \Log::error('API Error: ' . $e->getMessage());
    return $this->response(array(
        'error' => 'Internal server error'
    ), 500);
}
```

## 問題: 認証ヘッダーが取得できない

**症状**: `getallheaders()` が動作しない

**解決策**: FuelPHP の Input::headers() を使用
```php
// ❌ 間違い
$headers = getallheaders();
$auth = $headers['Authorization'];

// ✅ 正しい
$auth_header = \Input::headers('Authorization');
if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
    $token = $matches[1];
}
```

## 問題: テスト時の認証トークン

**症状**: 開発時にGoogle認証なしでAPIテストしたい

**解決策**: テスト用トークンを実装
```php
if ($token === 'test-token') {
    return array(
        'google_user_id' => 'test-user-123',
        'email' => 'test@example.com',
        'name' => 'Test User'
    );
}
```