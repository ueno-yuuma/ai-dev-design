# FuelPHP REST Controller Authentication

## 問題
FuelPHPの`Controller_Rest`で認証エラー時に適切な401ステータスコードを返せない

## 解決策
`before()`ではなく`router()`メソッドをオーバーライドして認証処理を実装

```php
class Controller_Api extends Controller_Rest
{
    protected $format = 'json';
    
    public function before()
    {
        parent::before();
        // CORS設定とJSONフォーマット設定のみ
        $this->format = 'json';
        $this->response->set_header('Content-Type', 'application/json');
        // CORS headers...
    }

    public function router($method, $params)
    {
        // 認証不要エンドポイントの例外処理
        if ($method === 'health') {
            return parent::router($method, $params);
        }

        // 認証処理
        $user = Model_Auth::get_authenticated_user();
        if (!$user) {
            $this->response(array(
                'error' => 'Authentication required'
            ), 401);
            return; // 重要: returnで処理停止
        }

        // 認証成功時は通常ルーティング
        parent::router($method, $params);
    }
}
```

## 重要なポイント

1. **`router()`メソッド使用** - `before()`での認証エラー処理は困難
2. **`return`で停止** - 認証失敗時は`return`で後続処理を停止
3. **例外エンドポイント** - 認証不要なエンドポイントは事前チェック
4. **`$this->response()`使用** - FuelPHPのREST専用レスポンスメソッド

## 参考
- [Stack Overflow - FuelPHP Rest Controller Before Method](https://ja.stackoverflow.com/questions/43012)
- FuelPHP 1.8 Controller_Rest では`router()`が実際のレスポンス振り分けを担当

## テスト結果
```bash
# 認証なし
curl -i GET /api/charts
# HTTP/1.1 401 Unauthorized

# 認証あり  
curl -i GET /api/charts -H "Authorization: Bearer token"
# HTTP/1.1 200 OK
```