# RFC 004: prevent duplicate message within cooldown

## 目的
一定時間内の同一 message 再送を防ぐ

## 非目的
- 永続ストレージ導入
- ユーザー単位管理
- 分散環境対応

## ユーザーストーリー
- 同じ message を短時間で再送すると 409 を受け取る
- 時間が十分に経てば再送できる

## 受け入れ条件
- 同じ message を一定時間内に再送すると 409
- 一定時間を超えれば 200
- 時刻取得は domain 層で行わない
- OpenAPI とテストが更新される

## 禁止事項
- domain 層で Date.now() を使わない
- usecase 層で HTTP status code を扱わない