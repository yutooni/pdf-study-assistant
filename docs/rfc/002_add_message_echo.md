# RFC 002: add message echo endpoint

## 目的
入力値を受け取ってそのまま返す簡単なPOST endpointを追加する

## 非目的
- DB保存
- 認証認可
- 永続化

## ユーザーストーリー
- クライアントは message を送ると同じ値を受け取れる
- 不正な入力なら 400 を受け取る

## 受け入れ条件
- POST /messages が追加される
- request body は { "message": string }
- message が空文字なら 400
- 正常時は 200 で { "message": string } を返す
- OpenAPI が更新される
- テストが追加される

## 禁止事項
- domain層にHTTP処理を書かない
- 変更範囲を不必要に広げない