# PDF Study Assistant

PDFファイルをアップロードし、ノートを保存できるシステムです。

## アーキテクチャ

レイヤードアーキテクチャ（Clean Architecture）に基づいた構成：

- **domain**: エンティティ、リポジトリインターフェース、Result型
- **usecase**: ビジネスロジックのオーケストレーション
- **infra**: リポジトリの実装（現在はインメモリ）
- **presentation**: HTTPハンドラー、ルーティング

## API エンドポイント

### POST /documents
PDFファイルをアップロードします。

**Request**: multipart/form-data
- `file`: PDF file

**Response**: 201 Created
```json
{
  "id": "uuid",
  "filename": "example.pdf",
  "status": "uploaded"
}
```

### GET /documents/:id
指定したIDのDocumentを取得します。

**Response**: 200 OK / 404 Not Found

### PUT /documents/:id/note
指定したDocumentにノートを保存します。

**Request**: application/json
```json
{
  "content": "ノート内容"
}
```

**Response**: 200 OK / 404 Not Found

## 開発

### セットアップ
```bash
npm install
```

### 開発サーバー起動
```bash
npm run dev
```

### テスト実行
```bash
npm test
```

### Lint & Typecheck
```bash
npm run lint
npm run typecheck
```

### Guard scripts
```bash
npm run guard
```

### すべてのチェック実行
```bash
npm run judge
```

## Guard Scripts

以下のガードが自動チェックされます：

- **domain-purity**: domain層に外部依存がないことを確認
- **usecase-purity**: usecase層に外部I/O依存がないことを確認
- **dependency-direction**: レイヤー間の依存方向が正しいことを確認
- **openapi-consistency**: OpenAPI仕様とルーター実装が一致していることを確認
- **domain-determinism**: domain層に非決定的コードがないことを確認
- **anti-shortcut**: `any`、`@ts-ignore`、`.skip()`などの使用を禁止
- **result-enforcement**: Repositoryメソッドが`Result<T>`を返すことを確認

## 設計原則

- presentation層に業務ロジックを書かない
- usecase層でHTTP status codeを扱わない
- domain層に非決定性を持ち込まない（`crypto.randomUUID()`などはinfra層で実装）
- OpenAPI/型/schemaを契約のSSOTとして扱う
