import { useState } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useProviderStore } from '../stores/providerStore';
import { X, Loader2, Bot, User, Sparkles, Wand2, Code, FlaskConical, Palette, BookOpen, Star, Lightbulb, AlertCircle, Zap } from 'lucide-react';
import { MODEL_OPTIONS, getProviderNameForModel } from '../config/models';
import { API_ENDPOINTS } from '../config/api';
import Dropdown from './Dropdown';

interface CreateAgentModalProps {
  onClose: () => void;
}

const AVATAR_OPTIONS = [
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

const LENGTH_OPTIONS = [
  { value: 1, label: '1 - 极短' },
  { value: 2, label: '2 - 简短' },
  { value: 3, label: '3 - 适中' },
  { value: 4, label: '4 - 较长' },
  { value: 5, label: '5 - 详细' },
];

const MODEL_DROPDOWN_OPTIONS = MODEL_OPTIONS.flatMap(group =>
  group.models.map(model => ({
    value: model.value,
    label: `${model.label} (${group.group})`
  }))
);

export default function CreateAgentModal({ onClose }: CreateAgentModalProps) {
  const { createAgent, isLoading } = useAgentStore();
  const { providers } = useProviderStore();

  const [formData, setFormData] = useState({
    name: '',
    avatar: 'Robot',
    description: '',
    model: 'gpt-4o',
    system_prompt: 'You are a helpful AI assistant.',
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

  // Auto-resolve provider from selected model
  const providerName = getProviderNameForModel(formData.model);
  const matchedProvider = providerName
    ? providers.find(p => p.name === providerName)
    : null;

  const handleOptimizePrompt = async () => {
    if (!formData.system_prompt.trim() || isOptimizing) return;
    setIsOptimizing(true);
    setOptimizeError('');
    try {
      const res = await fetch(API_ENDPOINTS.optimizePrompt, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: formData.system_prompt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '优化失败');
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, system_prompt: data.optimized_prompt }));
    } catch (e) {
      setOptimizeError(e instanceof Error ? e.message : '优化失败，请检查后端配置');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGeneratePersona = async () => {
    if (!generateDesc.trim() || isGenerating) return;
    setIsGenerating(true);
    setOptimizeError('');
    try {
      const res = await fetch(API_ENDPOINTS.generatePersona, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: generateDesc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '生成失败');
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        personality: data.personality || '',
        background: data.background || '',
        skills: data.skills || '',
        tags: data.tags || '',
        system_prompt: data.system_prompt || prev.system_prompt,
      }));
    } catch (e) {
      setOptimizeError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '请输入名称';
    if (!matchedProvider) newErrors.model = `请先在设置中配置 ${providerName || '对应'} 服务商`;
    if (formData.response_speed < 0.5 || formData.response_speed > 2.0) {
      newErrors.response_speed = '速度范围 0.5 - 2.0';
    }
    if (formData.reply_probability < 0 || formData.reply_probability > 1) {
      newErrors.reply_probability = '概率范围 0 - 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await createAgent({
      ...formData,
      provider_id: matchedProvider?.id,
    });

    if (result) {
      onClose();
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="text-lg font-semibold text-text">创建新 Agent</h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-background transition"
            aria-label="Close dialog"
          >
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="agent-name" className="block text-sm font-medium text-text mb-1">名称 *</label>
            <input
              id="agent-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ border: errors.name ? '1px solid #ef4444' : '1px solid rgba(0,0,0,0.06)' }}
              placeholder="输入 Agent 名称"
              aria-describedby={errors.name ? 'name-error' : undefined}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1" role="alert">{errors.name}</p>}
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">头像</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_OPTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleChange('avatar', label)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                    formData.avatar === label
                      ? 'bg-primary text-white'
                      : 'bg-background hover:bg-gray-100 text-text-muted'
                  }`}
                  aria-label={`Select ${label} avatar`}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">简介</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={2}
              placeholder="简要描述 Agent 的特点"
            />
          </div>

          {/* AI Generate Persona */}
          <div className="p-3 rounded-lg" style={{ background: 'rgba(7,193,96,0.05)', border: '1px dashed rgba(7,193,96,0.3)' }}>
            <label className="block text-sm font-medium text-text mb-2">AI 一键生成人格</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={generateDesc}
                onChange={(e) => setGenerateDesc(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg focus:outline-none text-sm"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                placeholder="输入角色描述，如：一个幽默的历史老师"
              />
              <button
                type="button"
                onClick={handleGeneratePersona}
                disabled={isGenerating || !generateDesc.trim()}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                生成
              </button>
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">性格特征</label>
            <textarea
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={2}
              placeholder="如：开朗、幽默、善于倾听"
            />
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">背景故事</label>
            <textarea
              value={formData.background}
              onChange={(e) => handleChange('background', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={2}
              placeholder="角色的背景经历"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">技能</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => handleChange('skills', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              placeholder='JSON 数组，如：["写作", "编程", "翻译"]'
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">标签</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              placeholder='JSON 数组，如：["助手", "创意"]'
            />
          </div>

          {/* Model */}
          <div>
            <Dropdown
              label="模型 *"
              options={MODEL_DROPDOWN_OPTIONS}
              value={formData.model}
              onChange={(val) => handleChange('model', val as string)}
              placeholder="选择模型"
            />
            {/* Provider auto-match hint */}
            {providerName && (
              matchedProvider ? (
                <p className="text-xs text-green-600 mt-1">
                  将使用服务商: {matchedProvider.name}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  请先在设置中配置 {providerName} 服务商
                </p>
              )
            )}
            {errors.model && <p className="text-red-500 text-xs mt-1" role="alert">{errors.model}</p>}
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-text">系统提示词</label>
              <button
                type="button"
                onClick={handleOptimizePrompt}
                disabled={isOptimizing || !formData.system_prompt.trim()}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 disabled:opacity-40"
                style={{
                  background: 'rgba(234,120,80,0.1)',
                  color: 'var(--color-primary)',
                  border: 'none',
                  cursor: isOptimizing || !formData.system_prompt.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                AI 优化
              </button>
            </div>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => handleChange('system_prompt', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={3}
              placeholder="给 Agent 的指令"
            />
            {optimizeError && <p className="text-red-500 text-xs mt-1">{optimizeError}</p>}
          </div>

          {/* Response Speed */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              回复速度: {formData.response_speed.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={formData.response_speed}
              onChange={(e) => handleChange('response_speed', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>慢 (0.5)</span>
              <span>正常 (1.0)</span>
              <span>快 (2.0)</span>
            </div>
          </div>

          {/* Reply Probability */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              回复概率: {Math.round(formData.reply_probability * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.reply_probability}
              onChange={(e) => handleChange('reply_probability', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Default Length */}
          <Dropdown
            label="默认回复长度"
            options={LENGTH_OPTIONS}
            value={formData.default_length}
            onChange={(val) => handleChange('default_length', val as number)}
            placeholder="选择长度"
          />

          {/* Public */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => handleChange('is_public', e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
            />
            <label htmlFor="is_public" className="text-sm text-text">
              公开此 Agent
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            创建 Agent
          </button>
        </div>
      </div>
    </div>
  );
}
