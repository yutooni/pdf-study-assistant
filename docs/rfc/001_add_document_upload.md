# RFC 001: add document upload

## 目的
PDFファイルをアップロードしてDocumentを作成できるようにする

## 非目的
- PDF本文抽出
- AI質問
- ノート機能

## 受け入れ条件
- POST /documents を追加
- multipart/form-data で PDF を受け取る
- Document が作成される
- status は uploaded
- OpenAPI 更新
- テスト追加

## 禁止事項
- presentation に業務ロジックを書かない
- usecase で HTTP status code を扱わない