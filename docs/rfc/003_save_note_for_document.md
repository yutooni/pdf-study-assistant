# RFC 003: save note for document

## 目的
アップロード済みDocumentにノートを保存できるようにする

## 非目的
- ノートの履歴管理
- ノートの削除
- AI質問機能

## 受け入れ条件
- PUT /documents/:id/note を追加
- request body は { "content": string }
- 存在するDocumentは200で返す
- 存在しないDocumentは404で返す
- OpenAPIを更新する
- テストを追加する

## 禁止事項
- presentation層にノート保存ロジックを書かない
- usecase層でHTTP status codeを扱わない
