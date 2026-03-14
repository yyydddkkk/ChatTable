export const MODEL_OPTIONS = [
  {
    group: 'OpenAI',
    providerName: 'OpenAI',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ]
  },
  {
    group: 'Anthropic',
    providerName: 'Anthropic',
    models: [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    ]
  },
  {
    group: 'Google',
    providerName: 'Google',
    models: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ]
  },
  {
    group: '通义千问 (Qwen)',
    providerName: 'DashScope',
    models: [
      { value: 'qwen-max', label: 'Qwen Max' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
    ]
  },
  {
    group: '智谱 (GLM)',
    providerName: '智谱 (GLM)',
    models: [
      { value: 'glm-4', label: 'GLM-4' },
      { value: 'glm-4-plus', label: 'GLM-4 Plus' },
      { value: 'glm-3-turbo', label: 'GLM-3 Turbo' },
    ]
  },
  {
    group: 'DeepSeek',
    providerName: 'DeepSeek',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ]
  },
  {
    group: 'MiniMax',
    providerName: 'MiniMax',
    models: [
      { value: 'abab6.5-chat', label: 'ABAB 6.5 Chat' },
      { value: 'abab5.5-chat', label: 'ABAB 5.5 Chat' },
    ]
  },
  {
    group: '其他国产模型',
    providerName: '其他',
    models: [
      { value: 'moonshot-v1', label: 'Moonshot (Kimi)' },
      { value: 'yi-large', label: '零一万物 Yi Large' },
      { value: 'baichuan2', label: '百川 Baichuan2' },
    ]
  },
];

export function getProviderNameForModel(modelValue: string): string | null {
  for (const group of MODEL_OPTIONS) {
    if (group.models.some(m => m.value === modelValue)) {
      return group.providerName;
    }
  }
  return null;
}
