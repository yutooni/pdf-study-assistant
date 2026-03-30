# AI-Driven Test

このリポジトリは、Claude Code を使った AI駆動開発の最小参照実装です。RFC → 実装 → Guard による検証というサイクルを通じて、AI が実装しても守るべきアーキテクチャ境界を guardrail で強制できることを実証しています。

## 何を検証しているか

- AI が実装しても守るべき境界を guardrail で強制できるか
- OpenAPI を SSOT（Single Source of Truth）として扱えるか
- 非決定性を排除した domain 層の実現可能性
- Result<T> 型による一貫したエラーハンドリング
- 人間が設計・判断、AI が実装・検証を担当する協調開発フロー

## アーキテクチャ概要

### 3層アーキテクチャ

```
presentation → usecase → domain
```

- **domain**: 他層への依存禁止、外部I/O禁止、非決定性禁止、純粋な業務ロジック
- **usecase**: domain のみ依存可、外部I/O禁止、orchestration 層
- **presentation**: usecase のみ依存可（domain への直接依存は禁止）、HTTP やフレームワーク依存

### RFC / OpenAPI / Guards / Judge の役割

- **RFC** (`docs/rfc/`): 実装する機能の仕様を記述。Claude Code がこれを読んで実装する
- **OpenAPI** (`openapi/openapi.yaml`): API 契約の SSOT。router との整合性を guard が検証
- **Guardrails** (`docs/guardrails/`): アーキテクチャルールを明文化。Claude Code が遵守すべき制約
- **Guards** (`scripts/guards/judge.js`): アーキテクチャルールの自動検証スクリプト
- **Judge** (`npm run judge`): lint + typecheck + test + guard の統合コマンド。すべて GREEN で初めて commit 可能

## 開発フロー

1. **RFC を書く**: `docs/rfc/` に実装したい機能の仕様を記述
2. **Claude Code が実装する**: RFC と guardrails を読み、最小変更で実装
3. **npm run judge で判定する**: lint, typecheck, test, guard すべてが GREEN であることを確認
4. **commit & push**: CI で再度検証し、GREEN なら merge 可能

このフローにより、人間は設計・判断に専念し、AI は実装・検証を担当します。

## 実装されている API

### GET /health

ヘルスチェックエンドポイント

```bash
curl http://localhost:3000/health
# => {"status":"ok"}
```

### POST /messages

メッセージエコーエンドポイント

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
# => {"message":"hello"}
```

**空文字の場合は 400**:
```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"message":""}'
# => {"error":"message must not be empty"}
```

**同一メッセージを 5 秒以内に再送した場合は 409**:
```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
# => {"message":"hello"}

curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
# => {"error":"duplicate message detected"}  (409 Conflict)
```

5 秒経過後は再送可能です。

## Guard 一覧

`npm run guard` で以下 7 つの guard を自動実行します。

### 1. domain-purity
domain 層に外部依存（express 等）がないかチェック。domain 層は純粋な業務ロジックのみを持つべきです。

### 2. usecase-purity
usecase 層に外部 I/O 依存（express, process.env, fetch, axios 等）がないかチェック。usecase 層は orchestration 専念で、I/O は presentation 層で行います。

### 3. dependency-direction
レイヤー依存方向が `presentation → usecase → domain` の順であることをチェック。presentation が domain に直接依存することを禁止します。

### 4. openapi-consistency
OpenAPI 定義と router 実装が双方向で一致するかチェック。OpenAPI に定義されているが実装されていないルート、または実装されているが OpenAPI に記載されていないルートを検出します。

### 5. domain-determinism
domain 層に非決定的コード（Date.now(), Math.random(), process.env 等）がないかチェック。domain 層は決定論的であるべきで、時刻や乱数は外部から注入します。

### 6. anti-shortcut
暫定対応コード（any, @ts-ignore, .skip(), .only(), TODO temporary 等）がないかチェック。技術的負債の蓄積を防ぎます。

### 7. result-enforcement
Repository インターフェースのメソッドが `Result<T>` または `Promise<Result<T>>` を返すことをチェック。一貫したエラーハンドリングを強制します。

## Result<T> パターン

Repository インターフェースは `Result<T>` 型を返します。これにより：

- **一貫したエラーハンドリング**: 例外に頼らず、成功/失敗を型で表現
- **明示的なエラー処理**: 呼び出し側は必ず `ok` をチェックする必要がある
- **テスタビリティ**: 例外をスローしないため、テストが書きやすい

```typescript
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
```

例:
```typescript
const result = repository.isDuplicate(message, currentTime, cooldownMs);
if (!result.ok) {
  // エラーハンドリング
  return { success: false, error: 'duplicate' };
}
const isDuplicate = result.value; // ok: true の場合のみアクセス可能
```

## セットアップ

```bash
npm install
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm test

# Lint
npm run lint

# 型チェック
npm run typecheck

# Guard 実行（アーキテクチャ検証）
npm run guard

# Judge（lint + typecheck + test + guard）
npm run judge
```

## Guard 検証例

### ❌ 違反例1: presentation 層が domain に直接依存

```typescript
// src/presentation/messagesHandler.ts
import { InMemoryMessageRepository } from '../domain/MessageRepository.js'; // NG
```

```bash
npm run guard
# ✗ guard:dependency-direction failed
#   - src/presentation/messagesHandler.ts: presentation must not depend on domain
```

**修正**: usecase 層を経由して repository を取得する

### ❌ 違反例2: usecase 層で process.env 使用

```typescript
// src/usecase/EchoMessageUseCase.ts
const env = process.env.NODE_ENV; // NG
```

```bash
npm run guard
# ✗ guard:usecase-purity failed
#   - src/usecase/EchoMessageUseCase.ts: external I/O dependency detected (process.env)
```

**修正**: 環境変数は presentation 層で読み、usecase に注入する

### ❌ 違反例3: domain 層で非決定性コード

```typescript
// src/domain/EchoMessage.ts
const timestamp = Date.now(); // NG
```

```bash
npm run guard
# ✗ guard:domain-determinism failed
#   - src/domain/EchoMessage.ts: non-deterministic code detected (Date.now())
```

**修正**: TimeProvider を usecase 層で定義し、presentation 層から注入する

### ❌ 違反例4: Repository が生の戻り値を返す

```typescript
// src/domain/MessageRepository.ts
export interface MessageRepository {
  isDuplicate(message: string): boolean; // NG: Result<boolean> にすべき
}
```

```bash
npm run guard
# ✗ guard:result-enforcement failed
#   - src/domain/MessageRepository.ts: method 'isDuplicate' returns 'boolean' instead of Result<T>
```

**修正**: `Result<boolean>` を返すように変更する

### ✅ 正常例

```bash
npm run judge
# > ai-driven-test@1.0.0 judge
# > npm run lint && npm run typecheck && npm test && npm run guard
#
# ✓ lint passed
# ✓ typecheck passed
# ✓ 7 tests passed
# ✓ guard:domain-purity passed
# ✓ guard:usecase-purity passed
# ✓ guard:dependency-direction passed
# ✓ guard:openapi-consistency passed
# ✓ guard:domain-determinism passed
# ✓ guard:anti-shortcut passed
# ✓ guard:result-enforcement passed
#
# ✓ All guard checks passed
```

## CI

GitHub Actions で以下を自動実行します：

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run guard`

すべて GREEN でなければ merge できません。

## プロジェクト構成

```
.
├── docs/
│   ├── rfc/                    # 仕様定義（Request for Comments）
│   │   ├── 001_init.md
│   │   ├── 002_add_message_echo.md
│   │   ├── 003_prevent_duplicate_message.md
│   │   └── 004_prevent_duplicate_message_within_cooldown.md
│   └── guardrails/             # アーキテクチャルール
│       ├── architecture.md     # 依存関係ルール
│       ├── coding_rules.md     # コーディング規約
│       └── acceptance_criteria.md
├── openapi/
│   └── openapi.yaml            # API契約（SSOT）
├── scripts/
│   └── guards/
│       └── judge.js            # アーキテクチャ検証スクリプト（7 guards）
├── src/
│   ├── domain/                 # ドメイン層（依存なし）
│   │   ├── EchoMessage.ts
│   │   ├── MessageRepository.ts
│   │   └── Result.ts
│   ├── usecase/                # ユースケース層
│   │   ├── EchoMessageUseCase.ts
│   │   ├── TimeProvider.ts
│   │   └── repositories.ts
│   └── presentation/           # プレゼンテーション層
│       ├── router.ts
│       ├── healthHandler.ts
│       ├── messagesHandler.ts
│       └── SystemTimeProvider.ts
└── tests/                      # テスト
    ├── health.test.ts
    └── messages.test.ts
```

## 今後の拡張候補

- ユーザー認証（RFC 005 として定義予定）
- データベース永続化（現在は in-memory）
- ログ出力の標準化
- メトリクス収集
- より複雑な業務ルールの追加

これらは RFC を書き、guardrails を満たす形で実装されます。

## リポジトリの位置づけ

このリポジトリは本番用の完成品ではなく、**AI 駆動開発の設計・運用を試す最小実装**です。

- Guard によってアーキテクチャが守られるか
- AI が RFC を読んで正しく実装できるか
- Result<T> パターンがエラーハンドリングに有効か
- OpenAPI を SSOT として扱えるか

これらを検証するための参照実装として位置づけています。

## ライセンス

MIT

## 生成情報

🤖 Generated with [Claude Code](https://claude.com/claude-code)
