# RFC 003: prevent duplicate message

## 目的
同じ message の連続送信を防ぐ

## 非目的
- DB永続化
- ユーザー単位の履歴管理
- 時間窓つきの重複判定

## ユーザーストーリー
- クライアントが前回と同じ message を送ると 409 を受け取る
- 異なる message なら正常に送信できる

## 受け入れ条件
- POST /messages で前回と同じ message を送ると 409 を返す
- レスポンスにエラーコードを含む
- 異なる message は 200 を返す
- OpenAPI が更新される
- テストが追加される

## 禁止事項
- presentation 層に重複判定ロジックを書かない
- usecase 層で HTTP status code を直接扱わない