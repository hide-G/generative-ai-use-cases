import React from 'react';
import {
  getMaxTokens,
  getContextWindowUsagePercentage,
} from '@generative-ai-use-cases/common';
import { PiWarningFill } from 'react-icons/pi';

type Props = {
  modelId: string;
  usedTokens: number;
  className?: string;
  compact?: boolean;
};

/**
 * コンパクトなコンテキストウィンドウ使用状況バッジ
 * チャット入力欄の近くなど、スペースが限られた場所での使用を想定
 */
const ContextWindowBadge: React.FC<Props> = ({
  modelId,
  usedTokens,
  className,
  compact = false,
}) => {
  const maxTokens = getMaxTokens(modelId);
  const usagePercentage = getContextWindowUsagePercentage(modelId, usedTokens);

  if (usagePercentage === null) {
    return null;
  }

  // 警告レベルの判定
  const warningThreshold = 80;
  const criticalThreshold = 90;
  const isWarning = usagePercentage >= warningThreshold;
  const isCritical = usagePercentage >= criticalThreshold;

  // バッジの色を決定
  const getBadgeColor = () => {
    if (isCritical) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (isWarning) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  if (compact) {
    // コンパクト表示: アイコンとパーセンテージのみ
    return (
      <div
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${getBadgeColor()} ${className || ''}`}
        title={`コンテキストウィンドウ使用状況: ${usedTokens.toLocaleString()} / ${maxTokens.toLocaleString()} tokens`}>
        {isWarning && <PiWarningFill className="text-sm" />}
        <span>{usagePercentage.toFixed(0)}%</span>
      </div>
    );
  }

  // 通常表示: 詳細情報を含む
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${getBadgeColor()} ${className || ''}`}>
      {isWarning && <PiWarningFill className="text-sm" />}
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()}
        </span>
        <span className="opacity-75">({usagePercentage.toFixed(1)}%)</span>
      </div>
    </div>
  );
};

export default ContextWindowBadge;
