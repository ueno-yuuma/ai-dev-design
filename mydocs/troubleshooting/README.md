# トラブルシューティング・ガイド

このディレクトリには開発中に遭遇した問題と解決策をまとめています。

## 📋 インデックス

### FuelPHP 関連

#### [🔐 FuelPHP REST Controller Authentication](./fuelphp-rest-auth.md)
**問題**: FuelPHPのController_Restで認証エラー時に適切な401ステータスコードを返せない  
**解決**: `router()`メソッドをオーバーライドして認証処理を実装

#### [🗄️ SQLite ORM エラー解決集](./sqlite-orm-setup.md)
**よくあるエラー**:
- `Class 'Orm\Model' not found`
- `Call to undefined method Model_User::query()`
- `attempt to write a readonly database`
- 1対多のリレーション設定方法

#### [🌐 REST API エラー対応集](./rest-api-best-practices.md)
**よくあるエラー**:
- APIがXMLで返される
- CORS エラーが発生する
- try-catch で例外が捕捉されない
- 認証ヘッダーが取得できない
- テスト時の認証トークンが必要

## 🔍 問題別クイック検索

### エラーメッセージで探す
| エラーメッセージ | 参照ファイル |
|---|---|
| `Class 'Orm\Model' not found` | [sqlite-orm-setup.md](./sqlite-orm-setup.md#問題-class-ormmodel-not-found) |
| `Call to undefined method Model_User::query()` | [sqlite-orm-setup.md](./sqlite-orm-setup.md#問題-call-to-undefined-method-model_userquery) |
| `attempt to write a readonly database` | [sqlite-orm-setup.md](./sqlite-orm-setup.md#問題-attempt-to-write-a-readonly-database) |
| 401エラーが返されない | [fuelphp-rest-auth.md](./fuelphp-rest-auth.md) |
| XMLが返される | [rest-api-best-practices.md](./rest-api-best-practices.md#問題-apiがxmlで返される) |
| CORSエラー | [rest-api-best-practices.md](./rest-api-best-practices.md#問題-cors-エラーが発生する) |

### 機能別で探す
| 機能 | 参照ファイル |
|---|---|
| REST API認証 | [fuelphp-rest-auth.md](./fuelphp-rest-auth.md) |
| SQLite + ORM設定 | [sqlite-orm-setup.md](./sqlite-orm-setup.md) |
| API JSON レスポンス | [rest-api-best-practices.md](./rest-api-best-practices.md) |
| テスト用認証 | [rest-api-best-practices.md](./rest-api-best-practices.md#問題-テスト時の認証トークン) |

## 📝 新しい問題の追加方法

1. 該当するカテゴリのファイルに追加するか、新しいファイルを作成
2. このREADME.mdのインデックスを更新
3. 以下の形式で記述:

```markdown
## 問題: [問題の概要]

**症状**: 具体的な症状・エラーメッセージ

**解決策**: 解決方法
\`\`\`
コード例
\`\`\`
```

## 🔗 関連ドキュメント

- [API仕様書](../api.yml)
- [システム仕様書](../specifications.md)
- [プロジェクト概要](../../README.md)