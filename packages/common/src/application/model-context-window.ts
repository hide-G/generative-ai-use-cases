/**
 * Model Context Window Size Configuration
 * 
 * This file defines the maximum context window size (in tokens) for each model.
 * Context window size represents the maximum number of tokens that can be processed
 * in a single request, including both input and output tokens.
 * 
 * Note: These values may change as AWS updates model capabilities.
 * Check AWS documentation for the latest information:
 * https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html
 */

export type ModelContextWindowSize = {
  /** Maximum context window size in tokens */
  maxTokens: number;
  /** Notes about special conditions or beta features */
  notes?: string;
};

export const modelContextWindowSize: Record<string, ModelContextWindowSize> = {
  // ==== Anthropic Claude Models ====

  // Claude 3.5 Series
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    maxTokens: 200000,
  },
  'anthropic.claude-3-5-haiku-20241022-v1:0': {
    maxTokens: 200000,
  },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': {
    maxTokens: 200000,
  },

  // Claude 3 Series
  'anthropic.claude-3-opus-20240229-v1:0': {
    maxTokens: 200000,
  },
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    maxTokens: 200000,
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    maxTokens: 200000,
  },

  // Claude 4 Series (US Region)
  'us.anthropic.claude-opus-4-1-20250805-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-opus-4-20250514-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-sonnet-4-20250514-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'us.anthropic.claude-3-7-sonnet-20250219-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-3-5-haiku-20241022-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-3-5-sonnet-20240620-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-3-opus-20240229-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-3-sonnet-20240229-v1:0': {
    maxTokens: 200000,
  },
  'us.anthropic.claude-3-haiku-20240307-v1:0': {
    maxTokens: 200000,
  },

  // Claude 4.5 Series (Global)
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'global.anthropic.claude-haiku-4-5-20251001-v1:0': {
    maxTokens: 200000,
  },
  'global.anthropic.claude-sonnet-4-20250514-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },

  // Claude 4.5 Series (US Region)
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'us.anthropic.claude-haiku-4-5-20251001-v1:0': {
    maxTokens: 200000,
  },

  // Claude 4 Series (EU Region)
  'eu.anthropic.claude-sonnet-4-5-20250929-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'eu.anthropic.claude-haiku-4-5-20251001-v1:0': {
    maxTokens: 200000,
  },
  'eu.anthropic.claude-sonnet-4-20250514-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'eu.anthropic.claude-3-7-sonnet-20250219-v1:0': {
    maxTokens: 200000,
  },
  'eu.anthropic.claude-3-5-sonnet-20240620-v1:0': {
    maxTokens: 200000,
  },
  'eu.anthropic.claude-3-sonnet-20240229-v1:0': {
    maxTokens: 200000,
  },
  'eu.anthropic.claude-3-haiku-20240307-v1:0': {
    maxTokens: 200000,
  },

  // Claude 4 Series (APAC/JP Region)
  'jp.anthropic.claude-sonnet-4-5-20250929-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'jp.anthropic.claude-haiku-4-5-20251001-v1:0': {
    maxTokens: 200000,
  },
  'apac.anthropic.claude-sonnet-4-20250514-v1:0': {
    maxTokens: 200000,
    notes: 'Can be extended to 1M tokens with beta header: context-1m-2025-08-07',
  },
  'apac.anthropic.claude-3-7-sonnet-20250219-v1:0': {
    maxTokens: 200000,
  },
  'apac.anthropic.claude-3-5-sonnet-20241022-v2:0': {
    maxTokens: 200000,
  },
  'apac.anthropic.claude-3-5-sonnet-20240620-v1:0': {
    maxTokens: 200000,
  },
  'apac.anthropic.claude-3-sonnet-20240229-v1:0': {
    maxTokens: 200000,
  },
  'apac.anthropic.claude-3-haiku-20240307-v1:0': {
    maxTokens: 200000,
  },

  // ==== Amazon Titan Models ====

  'amazon.titan-text-express-v1': {
    maxTokens: 8192,
  },
  'amazon.titan-text-premier-v1:0': {
    maxTokens: 32000,
  },

  // ==== Amazon Nova Models ====

  'amazon.nova-pro-v1:0': {
    maxTokens: 300000,
  },
  'amazon.nova-lite-v1:0': {
    maxTokens: 300000,
  },
  'amazon.nova-micro-v1:0': {
    maxTokens: 128000,
  },

  // Nova Models (US Region)
  'us.amazon.nova-premier-v1:0': {
    maxTokens: 300000,
  },
  'us.amazon.nova-pro-v1:0': {
    maxTokens: 300000,
  },
  'us.amazon.nova-lite-v1:0': {
    maxTokens: 300000,
  },
  'us.amazon.nova-micro-v1:0': {
    maxTokens: 128000,
  },

  // Nova Models (EU Region)
  'eu.amazon.nova-pro-v1:0': {
    maxTokens: 300000,
  },
  'eu.amazon.nova-lite-v1:0': {
    maxTokens: 300000,
  },
  'eu.amazon.nova-micro-v1:0': {
    maxTokens: 128000,
  },

  // Nova Models (APAC Region)
  'apac.amazon.nova-pro-v1:0': {
    maxTokens: 300000,
  },
  'apac.amazon.nova-lite-v1:0': {
    maxTokens: 300000,
  },
  'apac.amazon.nova-micro-v1:0': {
    maxTokens: 128000,
  },

  // ==== Meta Llama Models ====

  'meta.llama3-8b-instruct-v1:0': {
    maxTokens: 8192,
  },
  'meta.llama3-70b-instruct-v1:0': {
    maxTokens: 8192,
  },
  'meta.llama3-1-8b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'meta.llama3-1-70b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'meta.llama3-1-405b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama3-2-1b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama3-2-3b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama3-2-11b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama3-2-90b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama3-3-70b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama4-maverick-17b-instruct-v1:0': {
    maxTokens: 128000,
  },
  'us.meta.llama4-scout-17b-instruct-v1:0': {
    maxTokens: 128000,
  },

  // ==== Mistral Models ====

  'mistral.mistral-7b-instruct-v0:2': {
    maxTokens: 32000,
  },
  'mistral.mixtral-8x7b-instruct-v0:1': {
    maxTokens: 32000,
  },
  'mistral.mistral-small-2402-v1:0': {
    maxTokens: 32000,
  },
  'mistral.mistral-large-2402-v1:0': {
    maxTokens: 32000,
  },
  'mistral.mistral-large-2407-v1:0': {
    maxTokens: 128000,
  },
  'us.mistral.pixtral-large-2502-v1:0': {
    maxTokens: 128000,
  },
  'eu.mistral.pixtral-large-2502-v1:0': {
    maxTokens: 128000,
  },

  // ==== Cohere Models ====

  'cohere.command-r-v1:0': {
    maxTokens: 128000,
  },
  'cohere.command-r-plus-v1:0': {
    maxTokens: 128000,
  },

  // ==== DeepSeek Models ====

  'deepseek.v3-v1:0': {
    maxTokens: 64000,
  },
  'us.deepseek.r1-v1:0': {
    maxTokens: 64000,
  },

  // ==== Qwen Models ====

  'qwen.qwen3-235b-a22b-2507-v1:0': {
    maxTokens: 32768,
  },
  'qwen.qwen3-32b-v1:0': {
    maxTokens: 32768,
  },
  'qwen.qwen3-coder-480b-a35b-v1:0': {
    maxTokens: 32768,
  },
  'qwen.qwen3-coder-30b-a3b-v1:0': {
    maxTokens: 32768,
  },

  // ==== Writer Models ====

  'us.writer.palmyra-x4-v1:0': {
    maxTokens: 128000,
  },
  'us.writer.palmyra-x5-v1:0': {
    maxTokens: 1000000,
  },

  // ==== OpenAI Models ====

  'openai.gpt-oss-120b-1:0': {
    maxTokens: 8192,
  },
  'openai.gpt-oss-20b-1:0': {
    maxTokens: 8192,
  },
};

/**
 * Get the context window size for a given model ID
 * @param modelId - The model ID to look up
 * @returns The context window configuration, or undefined if not found
 */
export const getModelContextWindowSize = (
  modelId: string
): ModelContextWindowSize | undefined => {
  return modelContextWindowSize[modelId];
};

/**
 * Get the maximum tokens for a given model ID
 * @param modelId - The model ID to look up
 * @param defaultValue - Default value to return if model not found (default: 200000)
 * @returns The maximum number of tokens
 */
export const getMaxTokens = (
  modelId: string,
  defaultValue: number = 200000
): number => {
  const config = modelContextWindowSize[modelId];
  return config?.maxTokens ?? defaultValue;
};

/**
 * Calculate remaining context window tokens
 * @param modelId - The model ID
 * @param usedTokens - Number of tokens already used
 * @returns Remaining tokens, or null if model not found
 */
export const getRemainingTokens = (
  modelId: string,
  usedTokens: number
): number | null => {
  const config = modelContextWindowSize[modelId];
  if (!config) {
    return null;
  }
  return Math.max(0, config.maxTokens - usedTokens);
};

/**
 * Calculate context window usage percentage
 * @param modelId - The model ID
 * @param usedTokens - Number of tokens already used
 * @returns Usage percentage (0-100), or null if model not found
 */
export const getContextWindowUsagePercentage = (
  modelId: string,
  usedTokens: number
): number | null => {
  const config = modelContextWindowSize[modelId];
  if (!config) {
    return null;
  }
  return Math.min(100, (usedTokens / config.maxTokens) * 100);
};
