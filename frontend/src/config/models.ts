export interface ModelOption {
  label: string;
  value: string;
}

export interface ModelGroup {
  group: string;
  providerAliases: string[];
  providerKey: string;
  providerName: string;
  models: ModelOption[];
}

export const MODEL_OPTIONS: ModelGroup[] = [
  {
    group: 'OpenAI',
    providerAliases: ['openai', 'chatgpt', 'gpt'],
    providerKey: 'openai',
    providerName: 'OpenAI',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
  },
  {
    group: 'Anthropic',
    providerAliases: ['anthropic', 'claude'],
    providerKey: 'anthropic',
    providerName: 'Anthropic',
    models: [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    ],
  },
  {
    group: 'Google',
    providerAliases: ['google', 'gemini'],
    providerKey: 'google',
    providerName: 'Google',
    models: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  {
    group: '\u901a\u4e49\u5343\u95ee',
    providerAliases: ['dashscope', 'qwen', 'tongyi', 'aliyun'],
    providerKey: 'dashscope',
    providerName: 'DashScope',
    models: [
      { value: 'qwen-max', label: 'Qwen Max' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
    ],
  },
  {
    group: '\u667a\u8c31 GLM',
    providerAliases: ['zhipu', 'glm', '\u667a\u8c31'],
    providerKey: 'zhipu',
    providerName: '\u667a\u8c31 GLM',
    models: [
      { value: 'glm-4', label: 'GLM-4' },
      { value: 'glm-4-plus', label: 'GLM-4 Plus' },
      { value: 'glm-3-turbo', label: 'GLM-3 Turbo' },
    ],
  },
  {
    group: 'DeepSeek',
    providerAliases: ['deepseek'],
    providerKey: 'deepseek',
    providerName: 'DeepSeek',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ],
  },
  {
    group: 'MiniMax',
    providerAliases: ['minimax'],
    providerKey: 'minimax',
    providerName: 'MiniMax',
    models: [
      { value: 'abab6.5-chat', label: 'ABAB 6.5 Chat' },
      { value: 'abab5.5-chat', label: 'ABAB 5.5 Chat' },
    ],
  },
  {
    group: '\u5176\u4ed6\u6a21\u578b',
    providerAliases: ['moonshot', 'kimi', 'yi', 'baichuan'],
    providerKey: 'others',
    providerName: '\u5176\u4ed6',
    models: [
      { value: 'moonshot-v1', label: 'Moonshot (Kimi)' },
      { value: 'yi-large', label: '\u96f6\u4e00\u4e07\u7269 Yi Large' },
      { value: 'baichuan2', label: '\u767e\u5ddd Baichuan2' },
    ],
  },
];

function normalizeProviderName(value: string): string {
  return value.toLowerCase().replace(/[\s\-_.()/]+/g, '');
}

export function findModelGroupByProviderName(
  providerName: string | null | undefined,
): ModelGroup | null {
  if (!providerName) {
    return null;
  }

  const normalizedProviderName = normalizeProviderName(providerName);

  for (const group of MODEL_OPTIONS) {
    const candidates = [group.providerKey, group.providerName, ...group.providerAliases].map(
      normalizeProviderName,
    );

    if (
      candidates.some(
        (candidate) =>
          candidate === normalizedProviderName ||
          normalizedProviderName.includes(candidate) ||
          candidate.includes(normalizedProviderName),
      )
    ) {
      return group;
    }
  }

  return null;
}

export function getModelOptionsForProvider(
  providerName: string | null | undefined,
): ModelOption[] {
  return findModelGroupByProviderName(providerName)?.models ?? [];
}

export function getFirstModelForProvider(
  providerName: string | null | undefined,
): string | null {
  return getModelOptionsForProvider(providerName)[0]?.value ?? null;
}

export function getProviderNameForModel(modelValue: string): string | null {
  for (const group of MODEL_OPTIONS) {
    if (group.models.some((model) => model.value === modelValue)) {
      return group.providerName;
    }
  }

  return null;
}

export function isModelCompatibleWithProvider(
  modelValue: string,
  providerName: string | null | undefined,
): boolean {
  return getModelOptionsForProvider(providerName).some((model) => model.value === modelValue);
}
