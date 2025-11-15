# コンテキストウィンドウ表示機能の実装

## 概要

GitHub Issue #1314 に対応し、チャット機能でコンテキストウィンドウの残量を視覚的に表示し、上限到達前に警告を表示する機能を実装しました。

## 実装内容

### 1. モデルコンテキストウィンドウ設定ファイル

**ファイル:** `packages/common/src/application/model-context-window.ts`

各モデルIDに対応するコンテキストウィンドウサイズ（最大トークン数）を定義した設定ファイルです。

**主な機能:**
- 100以上のモデルのコンテキストウィンドウサイズを定義
- Anthropic Claude、Amazon Nova、Meta Llama、Mistral、Cohere、DeepSeek、Qwen、Writerなど主要なモデルをサポート
- リージョン別のモデル（us.、eu.、apac.、jp.、global.プレフィックス）に対応
- ベータ機能の注釈（例: Claude Sonnet 4の1Mトークン拡張）

**提供する関数:**
```typescript
// モデルの最大トークン数を取得
getMaxTokens(modelId: string, defaultValue?: number): number

// 残りのトークン数を計算
getRemainingTokens(modelId: string, usedTokens: number): number | null

// 使用率をパーセンテージで取得
getContextWindowUsagePercentage(modelId: string, usedTokens: number): number | null

// 詳細情報を取得
getModelContextWindowSize(modelId: string): ModelContextWindowSize | undefined
```

### 2. TypeScript型定義

**ファイル:** `packages/types/src/model.d.ts`

```typescript
export type ModelContextWindowSize = {
  maxTokens: number;
  notes?: string;
};
```

### 3. UIコンポーネント

#### 3.1 ContextWindowIndicator

**ファイル:** `packages/web/src/components/ContextWindowIndicator.tsx`

詳細な情報を表示する完全版のコンポーネント。

**特徴:**
- プログレスバーによる視覚的な表示
- 使用トークン数と残りトークン数の表示
- 3段階の警告レベル（通常、警告、危険）
- 警告メッセージの自動表示
- ダークモード対応

**警告閾値:**
- 80%以上: 警告（黄色）
- 90%以上: 危険（赤色）

#### 3.2 ContextWindowBadge

**ファイル:** `packages/web/src/components/ContextWindowBadge.tsx`

コンパクトなバッジ形式のコンポーネント。

**特徴:**
- コンパクトモードとノーマルモードの切り替え
- スペースが限られた場所での使用に最適
- ツールチップによる詳細情報の表示
- 警告アイコンの表示

### 4. ドキュメント

- **設定ファイルのREADME:** `packages/common/src/application/MODEL_CONTEXT_WINDOW_README.md`
- **使用例ドキュメント:** `packages/web/src/components/CONTEXT_WINDOW_USAGE_EXAMPLE.md`

## 使用方法

### 基本的な使用例

```typescript
import ContextWindowIndicator from '../components/ContextWindowIndicator';
import { useChat } from '../hooks/useChat';

const ChatPage = () => {
  const { modelId, messages } = useChat('chat');
  
  // メッセージからトークン数を計算
  const totalTokens = messages.reduce((sum, message) => {
    return sum + (message.metadata?.usage?.totalTokens || 0);
  }, 0);

  return (
    <div>
      <ContextWindowIndicator
        modelId={modelId}
        usedTokens={totalTokens}
      />
      {/* チャットUI */}
    </div>
  );
};
```

### コンパクト表示

```typescript
import ContextWindowBadge from '../components/ContextWindowBadge';

<ContextWindowBadge
  modelId={modelId}
  usedTokens={totalTokens}
  compact
/>
```

## サポートされているモデル

### Anthropic Claude
- Claude 3.5 Sonnet/Haiku: 200K tokens
- Claude 3 Opus/Sonnet/Haiku: 200K tokens
- Claude 4 Series: 200K tokens (1M tokens with beta header)
- Claude 4.5 Series: 200K tokens (1M tokens with beta header)

### Amazon
- Titan Text Express: 8K tokens
- Titan Text Premier: 32K tokens
- Nova Pro/Lite: 300K tokens
- Nova Micro: 128K tokens
- Nova Premier: 300K tokens

### Meta Llama
- Llama 3: 8K tokens
- Llama 3.1/3.2/3.3: 128K tokens
- Llama 4: 128K tokens

### その他
- Mistral: 32K-128K tokens
- Cohere Command R/R+: 128K tokens
- DeepSeek: 64K tokens
- Qwen: 32K tokens
- Writer Palmyra X4: 128K tokens
- Writer Palmyra X5: 1M tokens

## 設定の更新方法

### 新しいモデルの追加

`packages/common/src/application/model-context-window.ts`に追加：

```typescript
export const modelContextWindowSize: Record<string, ModelContextWindowSize> = {
  // ... 既存のモデル
  
  'new-provider.new-model-v1:0': {
    maxTokens: 128000,
    notes: 'Optional notes',
  },
};
```

### 既存モデルの更新

該当するエントリを更新：

```typescript
'anthropic.claude-3-5-sonnet-20241022-v2:0': {
  maxTokens: 300000, // 更新された値
  notes: 'Updated context window size',
},
```

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

## 参考リンク

- [GitHub Issue #1314](https://github.com/aws-samples/generative-ai-use-cases/issues/1314)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Bedrock CountTokens API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_CountTokens.html)
- [Anthropic Claude Context Window](https://docs.anthropic.com/claude/docs/models-overview)

## 注意事項

1. **トークン数の取得**: Bedrock APIのレスポンスに含まれる`metadata.usage`情報を使用します。
2. **未知のモデル**: 設定ファイルに存在しないモデルの場合、デフォルト値（200,000トークン）が使用されます。
3. **ベータ機能**: 一部のモデルは特定のベータヘッダーを使用することでコンテキストウィンドウを拡張できます。
4. **定期的な更新**: AWS re:Inventなどの大型イベント後は、新しいモデルや機能が追加される可能性が高いため、定期的に設定ファイルを更新してください。

## トラブルシューティング

### コンポーネントが表示されない

1. モデルIDが正しいか確認
2. `usedTokens`が0以上の値か確認
3. パッケージが正しくインポートされているか確認

### トークン数が正しく表示されない

1. `message.metadata.usage`が正しく設定されているか確認
2. Bedrock APIのレスポンスに`usage`情報が含まれているか確認
3. 複数のメッセージのトークン数を正しく合計しているか確認

## 実装ファイル一覧

```
generative-ai-use-cases-5.3.0/
├── packages/
│   ├── common/
│   │   └── src/
│   │       ├── application/
│   │       │   └── model-context-window.ts          # コンテキストウィンドウ設定
│   │       └── index.ts                              # エクスポート追加
│   ├── types/
│   │   └── src/
│   │       └── model.d.ts                            # 型定義追加
│   └── web/
│       └── src/
│           ├── components/
│           │   ├── ContextWindowIndicator.tsx        # 詳細表示コンポーネント
│           │   ├── ContextWindowBadge.tsx            # コンパクト表示コンポーネント
│           │   └── ChatMessage.tsx                   # メッセージ内にパーセント表示追加
│           └── pages/
│               └── ChatPage.tsx                      # 詳細インジケーター表示
└── CONTEXT_WINDOW_IMPLEMENTATION.md                  # このファイル
```

## 詳細な使用方法とAPI

### ユーティリティ関数

#### getMaxTokens

モデルの最大トークン数を取得します。

```typescript
import { getMaxTokens } from '@generative-ai-use-cases/common';

const maxTokens = getMaxTokens('anthropic.claude-3-5-sonnet-20241022-v2:0');
console.log(maxTokens); // 200000

// デフォルト値を指定
const maxTokensWithDefault = getMaxTokens('unknown-model', 100000);
console.log(maxTokensWithDefault); // 100000
```

#### getRemainingTokens

残りのトークン数を計算します。

```typescript
import { getRemainingTokens } from '@generative-ai-use-cases/common';

const remaining = getRemainingTokens(
  'anthropic.claude-3-5-sonnet-20241022-v2:0',
  150000
);
console.log(remaining); // 50000

// モデルが見つからない場合はnullを返す
const unknownRemaining = getRemainingTokens('unknown-model', 1000);
console.log(unknownRemaining); // null
```

#### getContextWindowUsagePercentage

使用率をパーセンテージで取得します。

```typescript
import { getContextWindowUsagePercentage } from '@generative-ai-use-cases/common';

const usagePercentage = getContextWindowUsagePercentage(
  'anthropic.claude-3-5-sonnet-20241022-v2:0',
  150000
);
console.log(usagePercentage); // 75

// モデルが見つからない場合はnullを返す
const unknownUsage = getContextWindowUsagePercentage('unknown-model', 1000);
console.log(unknownUsage); // null
```

#### getModelContextWindowSize

詳細情報を取得します。

```typescript
import { getModelContextWindowSize } from '@generative-ai-use-cases/common';

const config = getModelContextWindowSize('us.writer.palmyra-x5-v1:0');
console.log(config);
// { maxTokens: 1000000 }

const configWithNotes = getModelContextWindowSize('us.anthropic.claude-sonnet-4-20250514-v1:0');
console.log(configWithNotes);
// { 
//   maxTokens: 200000,
//   notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07'
// }
```

### コンポーネントの使用例

#### ChatMessage内での表示（実装済み）

各メッセージのトークン情報の右側にコンテキストウィンドウ使用率が表示されます：

```
us.anthropic.claude-3-5-haiku-20241022-v1:0 ↑ 4 ↓ 654 ☁↓ 713 (7.7%)
                                                              ^^^^^^
                                                         使用率パーセント
```

- 通常時（80%未満）: グレー
- 警告時（80%以上）: 黄色
- 危険時（90%以上）: 赤色

#### ChatPage右上の詳細インジケーター（実装済み）

チャット画面の右上に詳細なインジケーターが表示されます：

```typescript
// ChatPage.tsx内で自動的に表示
{totalTokens > 0 && (
  <div className="w-full max-w-md">
    <ContextWindowIndicator
      modelId={modelId}
      usedTokens={totalTokens}
    />
  </div>
)}
```

### カスタムフックの作成例

コンテキストウィンドウの状態を管理するカスタムフック：

```typescript
import { useMemo } from 'react';
import {
  getMaxTokens,
  getContextWindowUsagePercentage,
  getRemainingTokens,
} from '@generative-ai-use-cases/common';

export const useContextWindow = (modelId: string, usedTokens: number) => {
  const contextWindow = useMemo(() => {
    const maxTokens = getMaxTokens(modelId);
    const usagePercentage = getContextWindowUsagePercentage(modelId, usedTokens);
    const remainingTokens = getRemainingTokens(modelId, usedTokens);

    const warningThreshold = 80;
    const criticalThreshold = 90;

    return {
      maxTokens,
      usedTokens,
      remainingTokens,
      usagePercentage,
      isWarning: usagePercentage !== null && usagePercentage >= warningThreshold,
      isCritical: usagePercentage !== null && usagePercentage >= criticalThreshold,
      shouldShowWarning: usagePercentage !== null && usagePercentage >= warningThreshold,
    };
  }, [modelId, usedTokens]);

  return contextWindow;
};

// 使用例
const ChatComponent = () => {
  const { modelId, totalTokens } = useChat('chat');
  const contextWindow = useContextWindow(modelId, totalTokens);

  return (
    <div>
      {contextWindow.isCritical && (
        <Alert severity="error">
          コンテキストウィンドウの上限に達しています。
          新しいチャットを開始してください。
        </Alert>
      )}
      
      <ContextWindowIndicator
        modelId={modelId}
        usedTokens={totalTokens}
      />
    </div>
  );
};
```

### スタイリングのカスタマイズ

#### 警告閾値の変更

```typescript
// ContextWindowIndicator.tsx または ChatMessage.tsx 内
const warningThreshold = 70;  // デフォルト: 80
const criticalThreshold = 85; // デフォルト: 90
```

#### 色のカスタマイズ

```typescript
// ContextWindowIndicator.tsx 内
const getProgressColor = () => {
  if (isCritical) return 'bg-red-600';      // より濃い赤
  if (isWarning) return 'bg-orange-500';    // オレンジ色
  return 'bg-blue-500';                     // 青色
};
```

## データソース

コンテキストウィンドウサイズの情報は以下のソースから取得しています：

1. **AWS公式ドキュメント**
   - [Amazon Bedrock Supported Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
   - [Model Parameters Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html)

2. **モデルプロバイダーのドキュメント**
   - [Anthropic Claude Documentation](https://docs.anthropic.com/)
   - [Meta Llama Documentation](https://llama.meta.com/)
   - その他のプロバイダー公式サイト

3. **AWS What's New**
   - [AWS News Blog](https://aws.amazon.com/about-aws/whats-new/)

## 新しいモデルの追加手順

1. **情報収集**
   - AWS公式ドキュメントでモデルのコンテキストウィンドウサイズを確認
   - モデルプロバイダーの公式サイトで詳細を確認

2. **設定ファイルに追加**

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

3. **テスト**
   - 開発環境で新しいモデルを選択
   - トークン数が正しく表示されることを確認
   - 警告表示が正しく動作することを確認

## よくある質問（FAQ）

### Q: モデルが見つからない場合はどうなりますか？

A: `getMaxTokens()`はデフォルト値（200,000トークン）を返します。`getRemainingTokens()`と`getContextWindowUsagePercentage()`は`null`を返します。

### Q: ベータ機能のモデルはどう扱いますか？

A: `notes`フィールドにベータヘッダーの情報を記載しています。例：

```typescript
'us.anthropic.claude-sonnet-4-20250514-v1:0': {
  maxTokens: 200000,
  notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
}
```

### Q: リージョン別のモデルはどう管理していますか？

A: プレフィックス（us.、eu.、apac.、jp.、global.）を含む完全なモデルIDで管理しています。

### Q: トークン数が正しく表示されない場合は？

A: 以下を確認してください：
1. `message.metadata.usage`が正しく設定されているか
2. Bedrock APIのレスポンスに`usage`情報が含まれているか
3. 複数のメッセージのトークン数を正しく合計しているか
