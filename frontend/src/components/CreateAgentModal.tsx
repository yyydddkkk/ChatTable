import { useState } from 'react';
import {
  AlertCircle,
  Bot,
  BookOpen,
  Code,
  FlaskConical,
  Lightbulb,
  Loader2,
  Palette,
  Sparkles,
  Star,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api';
import { MODEL_OPTIONS, getProviderNameForModel } from '../config/models';
import { useAgentStore } from '../stores/agentStore';
import { useProviderStore } from '../stores/providerStore';
import { apiFetch } from '../services/http';
import Dropdown from './Dropdown';

interface CreateAgentModalProps {
  onClose: () => void;
}

const avatarOptions = [
  { icon: Bot, label: 'Robot' },
  { icon: User, label: 'User' },
  { icon: Sparkles, label: 'Sparkles' },
  { icon: Wand2, label: 'Magic' },
  { icon: Code, label: 'Developer' },
  { icon: FlaskConical, label: 'Scientist' },
  { icon: Palette, label: 'Artist' },
  { icon: BookOpen, label: 'Scholar' },
  { icon: Star, label: 'Star' },
  { icon: Lightbulb, label: 'Idea' },
];

const lengthOptions = [
  { value: 1, label: '1 - 极短' },
  { value: 2, label: '2 - 简短' },
  { value: 3, label: '3 - 适中' },
  { value: 4, label: '4 - 偏长' },
  { value: 5, label: '5 - 详细' },
];

const modelDropdownOptions = MODEL_OPTIONS.flatMap((group) =>
  group.models.map((model) => ({
    value: model.value,
    label: `${model.label} (${group.group})`,
  })),
);

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[--color-text]">{title}</h3>
      {description && <p className="mt-1 text-xs leading-6 text-[--color-text-muted]">{description}</p>}
    </div>
  );
}

export default function CreateAgentModal({ onClose }: CreateAgentModalProps) {
  const { createAgent, isLoading } = useAgentStore();
  const { providers } = useProviderStore();

  const [formData, setFormData] = useState({
    name: '',
    avatar: 'Robot',
    description: '',
    model: 'gpt-4o',
    system_prompt: 'You are a helpful AI companion living in Pluto.',
    personality: '',
    background: '',
    skills: '',
    tags: '',
    response_speed: 1.0,
    reply_probability: 0.8,
    default_length: 3,
    is_public: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDesc, setGenerateDesc] = useState('');

  const providerName = getProviderNameForModel(formData.model);
  const matchedProvider = providerName ? providers.find((provider) => provider.name === providerName) : null;

  const handleOptimizePrompt = async () => {
    if (!formData.system_prompt.trim() || isOptimizing) {
      return;
    }

    setIsOptimizing(true);
    setOptimizeError('');
    try {
      const response = await apiFetch(API_ENDPOINTS.optimizePrompt, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: formData.system_prompt }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || '优化失败');
      }

      const data = await response.json();
      setFormData((previous) => ({ ...previous, system_prompt: data.optimized_prompt }));
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : '优化失败，请检查后端配置');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGeneratePersona = async () => {
    if (!generateDesc.trim() || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setOptimizeError('');
    try {
      const response = await apiFetch(API_ENDPOINTS.generatePersona, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: generateDesc }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || '生成失败');
      }

      const data = await response.json();
      setFormData((previous) => ({
        ...previous,
        name: data.name || previous.name,
        description: data.description || previous.description,
        personality: data.personality || '',
        background: data.background || '',
        skills: data.skills || '',
        tags: data.tags || '',
        system_prompt: data.system_prompt || previous.system_prompt,
      }));
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      nextErrors.name = '请输入 Agent 名称';
    }
    if (!matchedProvider) {
      nextErrors.model = `请先在设置中配置 ${providerName || '对应'} Provider`;
    }
    if (formData.response_speed < 0.5 || formData.response_speed > 2.0) {
      nextErrors.response_speed = '回复速度范围是 0.5 - 2.0';
    }
    if (formData.reply_probability < 0 || formData.reply_probability > 1) {
      nextErrors.reply_probability = '回复概率范围是 0 - 1';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const result = await createAgent({
      ...formData,
      provider_id: matchedProvider?.id,
    });

    if (result) {
      onClose();
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-8 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] pluto-modal-shell">
        <div className="flex items-center justify-between border-b border-[--color-border-light] px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[--color-text-subtle]">创建 Agent</p>
            <h2 className="mt-2 text-2xl font-semibold text-[--color-text]">创建新的 Pluto Agent</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] text-[--color-text-muted] transition hover:bg-white/10 hover:text-[--color-text]"
            aria-label="关闭创建 Agent 弹窗"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[0.92fr_1.08fr]">
          <div className="overflow-y-auto border-b border-[--color-border-light] px-6 py-5 xl:border-b-0 xl:border-r">
            <SectionTitle title="角色印象" description="先决定这个 Agent 在 Pluto 世界里给人的第一感觉。" />

            <div className="mt-5">
              <label htmlFor="agent-name" className="mb-2 block text-sm font-medium text-[--color-text]">名称 *</label>
              <input
                id="agent-name"
                type="text"
                value={formData.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="比如：夜航心理师 / 熬夜搭子 / 代码室友"
                className="h-12 w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle] focus:border-[--color-secondary]/25"
                aria-describedby={errors.name ? 'agent-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p id="agent-name-error" className="mt-2 text-xs text-rose-300" role="alert">{errors.name}</p>}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[--color-text]">头像风格</label>
              <div className="grid grid-cols-5 gap-2">
                {avatarOptions.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleChange('avatar', label)}
                    className={`flex h-12 items-center justify-center rounded-2xl border transition ${
                      formData.avatar === label
                        ? 'border-[--color-secondary]/30 bg-[linear-gradient(135deg,rgba(124,108,255,0.22),rgba(92,225,230,0.14))] text-[--color-text]'
                        : 'border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] text-[--color-text-muted] hover:bg-white/10'
                    }`}
                    aria-label={`选择 ${label} 头像`}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[--color-text]">一句话简介</label>
              <textarea
                value={formData.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={3}
                placeholder="告诉用户，这个 Agent 会以什么方式陪伴他。"
                className="w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 py-3 text-sm leading-7 text-[--color-text] outline-none placeholder:text-[--color-text-subtle] focus:border-[--color-secondary]/25"
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-[--color-primary]/15 bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] p-4">
              <SectionTitle title="AI 一键生成人设" description="描述一个角色，后端接入后会自动帮你补全人设草稿。" />
              <div className="mt-4 flex gap-3">
                <input
                  type="text"
                  value={generateDesc}
                  onChange={(event) => setGenerateDesc(event.target.value)}
                  placeholder="比如：一个会安慰人、懂电影、深夜不睡的朋友"
                  className="h-11 flex-1 rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface)_76%,var(--color-background)_24%)] px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
                />
                <button
                  type="button"
                  onClick={handleGeneratePersona}
                  disabled={isGenerating || !generateDesc.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[--color-primary] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  生成草稿
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[--color-text]">性格特征</label>
                <textarea
                  value={formData.personality}
                  onChange={(event) => handleChange('personality', event.target.value)}
                  rows={4}
                  placeholder="比如：温柔、冷静、会接梗、愿意安静陪伴"
                  className="w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 py-3 text-sm leading-7 text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[--color-text]">背景故事</label>
                <textarea
                  value={formData.background}
                  onChange={(event) => handleChange('background', event.target.value)}
                  rows={4}
                  placeholder="写下这个 Agent 的来历，后面可作为长期记忆基础。"
                  className="w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 py-3 text-sm leading-7 text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <SectionTitle title="能力与回复风格" description="这里控制模型、系统提示词和回复节奏。" />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <Dropdown label="模型 *" options={modelDropdownOptions} value={formData.model} onChange={(value) => handleChange('model', value as string)} placeholder="选择模型" />
                {providerName && (
                  matchedProvider ? (
                    <p className="mt-2 text-xs text-emerald-300">将使用 Provider：{matchedProvider.name}</p>
                  ) : (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-300">
                      <AlertCircle size={12} />
                      请先在设置中配置 {providerName}
                    </p>
                  )
                )}
                {errors.model && <p className="mt-2 text-xs text-rose-300" role="alert">{errors.model}</p>}
              </div>

              <div>
                <Dropdown label="默认回复长度" options={lengthOptions} value={formData.default_length} onChange={(value) => handleChange('default_length', value as number)} placeholder="选择长度" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[--color-text]">技能标签</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(event) => handleChange('skills', event.target.value)}
                  placeholder='JSON 数组，如：["写作","倾听","陪聊"]'
                  className="h-12 w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[--color-text]">话题标签</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(event) => handleChange('tags', event.target.value)}
                  placeholder='JSON 数组，如：["深夜","电影","情绪价值"]'
                  className="h-12 w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
                />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface)_76%,var(--color-background)_24%)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle title="系统提示词" description="决定这个 Agent 的行为边界、语气和角色稳定性。" />
                <button
                  type="button"
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing || !formData.system_prompt.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[--color-primary]/15 bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-2 text-xs font-medium text-[--color-primary] disabled:opacity-40"
                >
                  {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  AI 优化
                </button>
              </div>
              <textarea
                value={formData.system_prompt}
                onChange={(event) => handleChange('system_prompt', event.target.value)}
                rows={8}
                placeholder="给这个 Agent 一段足够清晰的系统提示词。"
                className="w-full rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 py-3 text-sm leading-7 text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
              />
              {optimizeError && <p className="mt-2 text-xs text-rose-300">{optimizeError}</p>}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface)_76%,var(--color-background)_24%)] p-4">
                <label className="mb-2 block text-sm font-medium text-[--color-text]">回复速度：{formData.response_speed.toFixed(1)}</label>
                <input type="range" min="0.5" max="2" step="0.1" value={formData.response_speed} onChange={(event) => handleChange('response_speed', parseFloat(event.target.value))} className="w-full" />
                <div className="mt-2 flex justify-between text-xs text-[--color-text-muted]">
                  <span>慢一点</span>
                  <span>正常</span>
                  <span>更快</span>
                </div>
                {errors.response_speed && <p className="mt-2 text-xs text-rose-300">{errors.response_speed}</p>}
              </div>

              <div className="rounded-[24px] border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface)_76%,var(--color-background)_24%)] p-4">
                <label className="mb-2 block text-sm font-medium text-[--color-text]">回复概率：{Math.round(formData.reply_probability * 100)}%</label>
                <input type="range" min="0" max="1" step="0.1" value={formData.reply_probability} onChange={(event) => handleChange('reply_probability', parseFloat(event.target.value))} className="w-full" />
                <div className="mt-2 flex justify-between text-xs text-[--color-text-muted]">
                  <span>被点名再说</span>
                  <span>适中</span>
                  <span>积极回应</span>
                </div>
                {errors.reply_probability && <p className="mt-2 text-xs text-rose-300">{errors.reply_probability}</p>}
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-[20px] border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 py-3 text-sm text-[--color-text]">
              <input type="checkbox" checked={formData.is_public} onChange={(event) => handleChange('is_public', event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-transparent" />
              公开这个 Agent（功能先占位，后端后续补）
            </label>
          </div>

          <div className="col-span-full flex items-center justify-between border-t border-[--color-border-light] px-6 py-4">
            <p className="text-xs text-[--color-text-subtle]">Create Agent 会直接写入当前租户下的 Agent 列表。</p>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="rounded-2xl border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-4 py-3 text-sm font-medium text-[--color-text] transition hover:bg-white/10">取消</button>
              <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 rounded-2xl bg-[--color-primary] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_30px_rgba(92,225,230,0.22)] disabled:opacity-50">
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                创建 Agent
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


