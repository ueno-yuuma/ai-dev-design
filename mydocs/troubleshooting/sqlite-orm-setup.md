# FuelPHP SQLite ORM エラー解決集

## 問題: `Class 'Orm\Model' not found`

**症状**: モデルクラスで`extends \Orm\Model`としているのにクラスが見つからない

**解決策**: config.phpでORMパッケージを有効化
```php
// fuel/app/config/config.php
'always_load' => array(
    'packages' => array(
        'orm',
    ),
),
```

## 問題: `Call to undefined method Model_User::query()`

**症状**: `Model_User::query()->where()->get_one()`でメソッドが見つからない

**解決策**: モデルの継承クラスを変更
```php
// ❌ 間違い
class Model_User extends \Model

// ✅ 正しい  
class Model_User extends \Orm\Model
```

## 問題: `attempt to write a readonly database`

**症状**: SQLiteデータベースへの書き込み時にエラー

**解決策**: データベースファイルの権限修正
```bash
# Docker内で実行
chmod 666 fuel/app/database/test.db
```

## 問題: 1対多のリレーション設定方法

**症状**: ユーザーと複数チャートの関連付けをどう実装するか

**解決策**: has_many/belongs_to設定
```php
// 1:n リレーション
class Model_User extends \Orm\Model
{
    protected static $_has_many = array(
        'charts' => array(
            'key_from' => 'id',
            'model_to' => 'Model_Chart',
            'key_to' => 'user_id',
        )
    );
}

class Model_Chart extends \Orm\Model  
{
    protected static $_belongs_to = array(
        'user' => array(
            'key_from' => 'user_id',
            'model_to' => 'Model_User', 
            'key_to' => 'id',
        )
    );
}
```