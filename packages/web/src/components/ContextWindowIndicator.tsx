import React from 'react';
import {
  getMaxTokens,
  getContextWindowUsagePercentage,
  getRemainingTokens,
} from '@generative-ai-use-cases/common';
import { PiWarningFill } from 'react-icons/pi';

type Props = {
  modelId: string;
  usedTokens: number;
  className?: string;
};

const ContextWindowIndicator: React.FC<Props> = ({
  modelId,
  usedTokens,
  className,
}) => {
  const maxTokens = getMaxTokens(modelId);
  const usagePercentage = getContextWindowUsagePercentage(modelId, usedTokens);
  const remainingTokens = getRemainingTokens(modelId, usedTokens);

  if (usagePercentage === null || remainingTokens === null) {
    return null;
  }

  // 警告レベルの判定
  const warningThreshold = 80;
  const criticalThreshold = 90;
  const isWarning = usagePercentage >= warningThreshold;
  const isCritical = usagePercentage >= criticalThreshold;

  // プログレスバーの色を決定
  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-aws-smile';
    return 'bg-aws-sea-blue';
  };

  // 背景色を決定
  const getBackgroundColor = () => {
    if (isCritical) return 'bg-red-50 dark:bg-red-900/20';
    if (isWarning) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-gray-50 dark:bg-gray-800';
  };

  // テキスト色を決定
  const getTextColor = () => {
    if (isCritical) return 'text-red-700 dark:text-red-300';
    if (isWarning) return 'text-yellow-700 dark:text-yellow-300';
    return 'text-gray-700 dark:text-gray-300';
  };

  return (
    <div className={`${className || ''}`}>
      <div
        className={`rounded-lg border p-3 ${getBackgroundColor()} ${
          isCritical
            ? 'border-red-300 dark:border-red-700'
            : isWarning
              ? 'border-yellow-300 dark:border-yellow-700'
              : 'border-gray-200 dark:border-gray-700'
        }`}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWarning && (
              <PiWarningFill
                className={isCritical ? 'text-red-500' : 'text-aws-smile'}
              />
            )}
            <span className={`text-sm font-medium ${getTextColor()}`}>
              コンテキストウィンドウ使用状況
            </span>
          </div>
          <span className={`text-xs ${getTextColor()}`}>
            {usagePercentage.toFixed(1)}%
          </span>
        </div>

        {/* プログレスバー */}
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, usagePercentage)}%` }}
          />
        </div>

        {/* トークン数の詳細 */}
        <div className="flex items-center justify-between text-xs">
          <span className={getTextColor()}>
            使用: {usedTokens.toLocaleString()} tokens
          </span>
          <span className={getTextColor()}>
            残り: {remainingTokens.toLocaleString()} tokens
          </span>
        </div>

        {/* 警告メッセージ */}
        {isCritical && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            ⚠️
            コンテキストウィンドウの上限に近づいています。新しいチャットを開始することをお勧めします。
          </div>
        )}
        {isWarning && !isCritical && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            ℹ️ コンテキストウィンドウの使用量が多くなっています。
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextWindowIndicator;
