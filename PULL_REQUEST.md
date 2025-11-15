# チャット機能でコンテキスト残量を視覚的に表示し、上限到達前に警告を表示

Fixes #1314

## 概要

チャット機能にコンテキストウィンドウの使用状況を視覚的に表示し、上限到達前に警告を表示する機能を実装しました。

## 背景と実装方針

### 課題

現在、Amazon Bedrock APIでは**使用中のモデルのコンテキストウィンドウサイズを動的に取得する方法が提供されていません**。そのため、ユーザーがチャットを続けていると予期せずエラーが発生し、特に生成AIに詳しくない一般ユーザーにとって困惑する状況が発生していました。

### 実装方針

Bedrock APIからコンテキストウィンドウサイズを取得できないため、以下の方針で実装しました：

1. **静的設定ファイルによる管理**
   - 各モデルのコンテキストウィンドウサイズを設定ファイルで定義
   - AWS公式ドキュメントとモデルプロバイダーの情報を基に100以上のモデルをサポート
   - 将来的にAPIで取得可能になった場合は、設定ファイルをフォールバックとして使用可能

2. **視覚的なフィードバック**
   - 各メッセージにパーセント表示を追加
   - チャット画面右上に詳細なインジケーターを表示
   - 80%/90%の閾値で段階的に警告

3. **保守性の確保**
   - 新しいモデルの追加が容易な構造
   - リージョン別モデルに対応
   - ベータ機能の注釈をサポート

## 実装内容

### 1. モデルコンテキストウィンドウ設定ファイル

**ファイル**: `packages/common/src/application/model-context-window.ts`

- 100以上のモデルのコンテキストウィンドウサイズを定義
- サポートモデル:
  - Anthropic Claude (3.5, 4, 4.5シリーズ)
  - Amazon Nova (Pro, Lite, Micro, Premier)
  - Meta Llama (3, 3.1, 3.2, 3.3, 4)
  - Mistral, Cohere, DeepSeek, Qwen, Writer等
- リージョン別モデル（us.、eu.、apac.、jp.、global.）に対応
- ベータ機能の注釈（例: Claude Sonnet 4の1Mトークン拡張）

**提供する関数**:
```typescript
getMaxTokens(modelId: string, defaultValue?: number): number
getRemainingTokens(modelId: string, usedTokens: number): number | null
getContextWindowUsagePercentage(modelId: string, usedTokens: number): number | null
getModelContextWindowSize(modelId: string): ModelContextWindowSize | undefined
```

### 2. UI実装

#### A. ChatMessage内のパーセント表示

各メッセージのトークン情報の右側にコンテキストウィンドウ使用率を表示：

```
us.anthropic.claude-3-5-haiku ↑ 4 ↓ 654 ☁↓ 713 (7.7%)
                                              ^^^^^^
```

**特徴**:
- Cache read input tokensと同じスタイルで統一
- 80%以上で黄色、90%以上で赤色に変化
- ツールチップで詳細情報を表示

#### B. ChatPage右上の詳細インジケーター

**ファイル**: `packages/web/src/components/ContextWindowIndicator.tsx`

```
┌─────────────────────────────────┐
│ コンテキストウィンドウ使用状況 7.7% │
│ ████░░░░░░░░░░░░ (プログレスバー) │
│ 使用: 15,433 tokens              │
│ 残り: 184,567 tokens             │
│ ℹ️ 使用量が多くなっています      │
└─────────────────────────────────┘
```

**特徴**:
- プログレスバーによる視覚的な表示
- 使用トークン数と残りトークン数の表示
- 警告メッセージの自動表示
- ダークモード対応

### 3. 警告レベル

| 使用率 | 表示色 | メッセージ |
|--------|--------|-----------|
| 80%未満 | グレー | なし |
| 80%以上 | 黄色 | ℹ️ コンテキストウィンドウの使用量が多くなっています |
| 90%以上 | 赤色 | ⚠️ コンテキストウィンドウの上限に近づいています。新しいチャットを開始することをお勧めします |

### 4. 型定義

**ファイル**: `packages/types/src/model.d.ts`

```typescript
export type ModelContextWindowSize = {
  maxTokens: number;
  notes?: string;
};
```

## 主要モデルのコンテキストウィンドウサイズ

| モデル | コンテキストウィンドウ | 備考 |
|--------|---------------------|------|
| Claude 3.5 Sonnet/Haiku | 200K tokens | |
| Claude 4 Opus/Sonnet | 200K tokens | |
| Claude Sonnet 4 | 200K tokens | beta headerで1M tokensに拡張可能 |
| Claude 4.5 Sonnet/Haiku | 200K tokens | beta headerで1M tokensに拡張可能 |
| Nova Pro/Lite | 300K tokens | |
| Nova Micro | 128K tokens | |
| Nova Premier | 300K tokens | |
| Llama 3.1/3.2/3.3/4 | 128K tokens | |
| Qwen3 32B | 32K tokens | |
| Writer Palmyra X5 | 1M tokens | |
| Writer Palmyra X4 | 128K tokens | |

## 変更ファイル

### 新規作成
- `packages/common/src/application/model-context-window.ts` - コンテキストウィンドウ設定
- `packages/web/src/components/ContextWindowIndicator.tsx` - 詳細インジケーター
- `packages/web/src/components/ContextWindowBadge.tsx` - コンパクトバッジ
- `CONTEXT_WINDOW_IMPLEMENTATION.md` - 実装ドキュメント

### 変更
- `packages/common/src/index.ts` - エクスポート追加
- `packages/types/src/model.d.ts` - 型定義追加
- `packages/web/src/components/ChatMessage.tsx` - パーセント表示追加
- `packages/web/src/pages/ChatPage.tsx` - 詳細インジケーター配置

## テスト方法

1. 開発サーバーを起動
2. チャット画面でメッセージを送信
3. 各メッセージの右下にパーセント表示が表示されることを確認
4. チャット画面右上に詳細インジケーターが表示されることを確認
5. 複数のメッセージを送信してトークン数が累積されることを確認
6. 異なるモデルを選択して正しいコンテキストウィンドウサイズが使用されることを確認

## スクリーンショット

### ChatMessage内のパーセント表示
```
us.anthropic.claude-3-5-haiku-20241022-v1:0 ↑ 4 ↓ 654 ☁↓ 713 (7.7%)
```
- 通常時: グレー
- 警告時（80%以上）: 黄色
- 危険時（90%以上）: 赤色

### ChatPage右上の詳細インジケーター
- プログレスバーで視覚的に表示
- 使用トークン数と残りトークン数を表示
- 警告メッセージを自動表示

## 今後の拡張予定

1. **AWS APIからの動的取得**
   - AWS re:Invent 2025以降、Bedrock APIでコンテキストウィンドウサイズが取得可能になる可能性
   - 実装時は設定ファイルをフォールバックとして使用

2. **リアルタイムトークン予測**
   - 入力中のテキストからトークン数を推定
   - CountTokens APIの活用

3. **トークン使用量の統計**
   - 会話ごとのトークン使用量の履歴
   - グラフによる可視化

4. **自動最適化**
   - コンテキストウィンドウが上限に近づいた際の自動的な新規チャット開始提案
   - 古いメッセージの自動要約

## 注意事項

### 設定ファイルの保守

- **定期的な更新が必要**: AWS re:Inventなどの大型イベント後は、新しいモデルや機能が追加される可能性が高いため、定期的に設定ファイルを更新してください
- **データソース**:
  - [Amazon Bedrock Supported Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
  - [Anthropic Claude Documentation](https://docs.anthropic.com/)
  - [AWS What's New](https://aws.amazon.com/about-aws/whats-new/)

### 新しいモデルの追加方法

```typescript
// packages/common/src/application/model-context-window.ts
export const modelContextWindowSize: Record<string, ModelContextWindowSize> = {
  // ... 既存のモデル
  
  'new-provider.new-model-v1:0': {
    maxTokens: 128000,
    notes: 'Optional notes about special features',
  },
};
```

### デフォルト値

モデルが設定ファイルに存在しない場合、`getMaxTokens()`は200,000トークンをデフォルト値として返します。

## 参考リンク

- [GitHub Issue #1314](https://github.com/aws-samples/generative-ai-use-cases/issues/1314)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Bedrock CountTokens API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_CountTokens.html)
- [Anthropic Claude Context Window](https://docs.anthropic.com/claude/docs/models-overview)

## チェックリスト

- [x] コードが正しく動作することを確認
- [x] 既存の機能に影響がないことを確認
- [x] 型定義が正しいことを確認
- [x] ドキュメントを作成
- [x] 100以上のモデルをサポート
- [x] リージョン別モデルに対応
- [x] ダークモード対応
- [x] 警告レベルの実装（80%、90%）
- [x] ツールチップによる詳細情報の表示
