# RFC 002: get document by id

## 目的
アップロード済みDocumentを取得できるようにする

## 非目的
- PDF本文抽出
- ノート機能
- AI質問機能

## 受け入れ条件
- GET /documents/:id を追加
- 存在するDocumentは200で返す
- 存在しないDocumentは404で返す
- OpenAPIを更新する
- テストを追加する

## 禁止事項
- presentation層に取得ロジックを書かない
- usecase層でHTTP status codeを扱わない