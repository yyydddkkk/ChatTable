import { useState } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useProviderStore } from '../stores/providerStore';
import { X, Edit2, Trash2, Power, Loader2, Save, Wand2 } from 'lucide-react';
import { getAvatarIcon } from '../lib/agentPalette';
import { API_ENDPOINTS } from '../config/api';
import { MODEL_OPTIONS, getProviderNameForModel } from '../config/models';
import Dropdown from './Dropdown';

interface AgentDetailSidebarProps {
  agent: Agent;
  onClose: () => void;
}

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

export default function AgentDetailSidebar({ agent, onClose }: AgentDetailSidebarProps) {
  const { updateAgent, deleteAgent, toggleActive, isLoading } = useAgentStore();
  const { providers } = useProviderStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: agent.name,
    avatar: agent.avatar || 'Robot',
    description: agent.description || '',
    model: agent.model,
    system_prompt: agent.system_prompt,
    personality: agent.personality || '',
    background: agent.background || '',
    skills: agent.skills || '',
    tags: agent.tags || '',
    response_speed: agent.response_speed,
    reply_probability: agent.reply_probability,
    default_length: agent.default_length,
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');

  // Resolve provider from model
  const providerName = getProviderNameForModel(agent.model);
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

  const handleSave = async () => {
    // Auto-resolve provider from new model
    const newProviderName = getProviderNameForModel(formData.model);
    const newProvider = newProviderName
      ? providers.find(p => p.name === newProviderName)
      : null;

    const updateData = {
      ...formData,
      provider_id: newProvider?.id,
    };
    const result = await updateAgent(agent.id, updateData);
    if (result) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    const success = await deleteAgent(agent.id);
    if (success) {
      onClose();
    }
  };

  const handleToggleActive = async () => {
    await toggleActive(agent.id);
  };

  const getAvatarDisplay = () => {
    const AvatarIcon = getAvatarIcon(formData.avatar);
    return <AvatarIcon size={40} className="text-primary" />;
  };

  return (
    <div className="w-80 bg-surface flex flex-col" style={{ boxShadow: '-1px 0 8px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <h2 className="text-lg font-semibold text-text">Agent 详情</h2>
        <button onClick={onClose} className="p-2 rounded hover:bg-background transition" aria-label="Close sidebar">
          <X size={20} className="text-text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {getAvatarDisplay()}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="text-center px-3 py-1 rounded-lg focus:outline-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
            />
          ) : (
            <h3 className="text-xl font-semibold text-text">{agent.name}</h3>
          )}
          <span className={`text-sm mt-1 ${agent.is_active ? 'text-green-600' : 'text-gray-500'}`}>
            {agent.is_active ? '已启用' : '已停用'}
          </span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">简介</label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={2}
            />
          ) : (
            <p className="text-sm text-text">{agent.description || '暂无简介'}</p>
          )}
        </div>

        {/* Model */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">模型</label>
          {isEditing ? (
            <Dropdown
              options={MODEL_DROPDOWN_OPTIONS}
              value={formData.model}
              onChange={(val) => setFormData((prev) => ({ ...prev, model: val as string }))}
              placeholder="选择模型"
            />
          ) : (
            <p className="text-sm text-text">{agent.model}</p>
          )}
        </div>

        {/* Provider (read-only) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">服务商</label>
          <p className="text-sm text-text bg-background p-2 rounded">
            {matchedProvider ? matchedProvider.name : (
              <span className="text-amber-600">未配置 {providerName || ''}</span>
            )}
          </p>
        </div>

        {/* System Prompt */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-text-muted">系统提示词</label>
            {isEditing && (
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
            )}
          </div>
          {isEditing ? (
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={3}
            />
          ) : (
            <p className="text-sm text-text bg-background p-2 rounded">{agent.system_prompt}</p>
          )}
          {optimizeError && <p className="text-red-500 text-xs mt-1">{optimizeError}</p>}
        </div>

        {/* Personality */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">性格特征</label>
          {isEditing ? (
            <textarea
              value={formData.personality}
              onChange={(e) => setFormData((prev) => ({ ...prev, personality: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={2}
              placeholder="如：开朗、幽默、善于倾听"
            />
          ) : (
            agent.personality && <p className="text-sm text-text bg-background p-2 rounded">{agent.personality}</p>
          )}
        </div>

        {/* Background */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">背景故事</label>
          {isEditing ? (
            <textarea
              value={formData.background}
              onChange={(e) => setFormData((prev) => ({ ...prev, background: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              rows={2}
              placeholder="角色的背景经历"
            />
          ) : (
            agent.background && <p className="text-sm text-text bg-background p-2 rounded">{agent.background}</p>
          )}
        </div>

        {/* Skills */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">技能</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData((prev) => ({ ...prev, skills: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              placeholder='JSON 数组'
            />
          ) : (
            agent.skills && (
              <div className="flex flex-wrap gap-1">
                {(() => { try { return JSON.parse(agent.skills); } catch { return []; } })().map((s: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>
                ))}
              </div>
            )
          )}
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">标签</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              placeholder='JSON 数组'
            />
          ) : (
            agent.tags && (
              <div className="flex flex-wrap gap-1">
                {(() => { try { return JSON.parse(agent.tags); } catch { return []; } })().map((t: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{t}</span>
                ))}
              </div>
            )
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">
            回复速度: {isEditing ? formData.response_speed.toFixed(1) : agent.response_speed.toFixed(1)}
          </label>
          {isEditing ? (
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={formData.response_speed}
              onChange={(e) => setFormData((prev) => ({ ...prev, response_speed: parseFloat(e.target.value) }))}
              className="w-full"
            />
          ) : (
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(agent.response_speed / 2) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Reply Probability */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">
            回复概率: {isEditing ? Math.round(formData.reply_probability * 100) : Math.round(agent.reply_probability * 100)}%
          </label>
          {isEditing ? (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.reply_probability}
              onChange={(e) => setFormData((prev) => ({ ...prev, reply_probability: parseFloat(e.target.value) }))}
              className="w-full"
            />
          ) : (
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="bg-secondary h-2 rounded-full"
                style={{ width: `${agent.reply_probability * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Default Length */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">
            默认回复长度: {isEditing ? formData.default_length : agent.default_length}
          </label>
          {isEditing ? (
            <Dropdown
              options={LENGTH_OPTIONS}
              value={formData.default_length}
              onChange={(val) => setFormData((prev) => ({ ...prev, default_length: val as number }))}
              placeholder="选择长度"
            />
          ) : (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`flex-1 py-1 rounded text-xs text-center ${
                    level <= agent.default_length ? 'bg-primary text-white' : 'bg-background text-text-muted'
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Created At */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">创建时间</label>
          <p className="text-sm text-text">
            {new Date(agent.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full py-3 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              aria-label="保存修改"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              保存修改
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="w-full py-3 text-text-muted hover:text-text transition min-h-[44px]"
              aria-label="取消编辑"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 min-h-[44px]"
              aria-label="编辑 Agent"
            >
              <Edit2 size={16} />
              编辑 Agent
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px] ${
                agent.is_active
                  ? 'bg-gray-100 text-text hover:bg-gray-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              aria-label={agent.is_active ? '停用 Agent' : '启用 Agent'}
            >
              <Power size={16} />
              {agent.is_active ? '停用' : '启用'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 text-red-500 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px]"
              aria-label="删除 Agent"
            >
              <Trash2 size={16} />
              删除 Agent
            </button>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-surface p-6 rounded-xl shadow-xl max-w-sm">
            <h3 className="text-lg font-semibold text-text mb-2">确认删除？</h3>
            <p className="text-text-muted mb-4">
              确定要删除「{agent.name}」吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-text-muted hover:text-text transition"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
