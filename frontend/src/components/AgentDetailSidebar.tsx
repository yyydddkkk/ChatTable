import { createElement, useMemo, useState } from 'react';
import { Edit2, Loader2, Power, Save, Trash2, Wand2, X } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api';
import { MODEL_OPTIONS, getProviderNameForModel } from '../config/models';
import { getAvatarIcon } from '../lib/agentPalette';
import { apiFetch } from '../services/http';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useProviderStore } from '../stores/providerStore';
import Dropdown from './Dropdown';

interface AgentDetailSidebarProps {
  agent: Agent;
  onClose: () => void;
}

const lengthOptions = [
  { value: 1, label: '1 - ??' },
  { value: 2, label: '2 - ??' },
  { value: 3, label: '3 - ??' },
  { value: 4, label: '4 - ??' },
  { value: 5, label: '5 - ??' },
];

const modelDropdownOptions = MODEL_OPTIONS.flatMap((group) =>
  group.models.map((model) => ({
    value: model.value,
    label: `${model.label} (${group.group})`,
  })),
);

function parseList(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function StatBar({ label, value, widthClass }: { label: string; value: string; widthClass: string }) {
  return (
    <div className="rounded-2xl pluto-modal-section p-3">
      <div className="flex items-center justify-between text-xs text-[--color-text-subtle]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--color-text)_10%,transparent)]">
        <div className={`h-2 rounded-full bg-[--color-primary] ${widthClass}`} />
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <p className="pluto-agent-section-title mb-3">{title}</p>;
}

export default function AgentDetailSidebar({ agent, onClose }: AgentDetailSidebarProps) {
  const { updateAgent, deleteAgent, toggleActive, isLoading } = useAgentStore();
  const { providers } = useProviderStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');

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

  const providerName = getProviderNameForModel(formData.model);
  const matchedProvider = providerName
    ? providers.find((provider) => provider.name === providerName)
    : null;
  const avatarIcon = getAvatarIcon(formData.avatar);
  const skillList = useMemo(
    () => parseList(isEditing ? formData.skills : agent.skills),
    [agent.skills, formData.skills, isEditing],
  );
  const tagList = useMemo(
    () => parseList(isEditing ? formData.tags : agent.tags),
    [agent.tags, formData.tags, isEditing],
  );

  const handleOptimizePrompt = async () => {
    if (!formData.system_prompt.trim() || isOptimizing) return;
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
        throw new Error(data.detail || '????');
      }
      const data = await response.json();
      setFormData((previous) => ({ ...previous, system_prompt: data.optimized_prompt }));
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : '????');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = async () => {
    const selectedProviderName = getProviderNameForModel(formData.model);
    const selectedProvider = selectedProviderName
      ? providers.find((provider) => provider.name === selectedProviderName)
      : null;
    const result = await updateAgent(agent.id, {
      ...formData,
      provider_id: selectedProvider?.id,
    });
    if (result) setIsEditing(false);
  };

  const handleDelete = async () => {
    const success = await deleteAgent(agent.id);
    if (success) onClose();
  };

  return (
    <div className="pluto-agent-shell flex h-full w-[340px] flex-col px-4 py-4 text-[--color-text]">
      <div className="pluto-agent-header flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-subtle]">
            Agent ??
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[--color-text]">{agent.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pluto-modal-secondary flex h-10 w-10 items-center justify-center rounded-2xl"
          aria-label="?? Agent ??"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        <section className="pluto-agent-panel p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-elevated))]">
              {createElement(avatarIcon, { size: 26, className: 'text-[--color-primary]' })}
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="pluto-modal-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              ) : (
                <h3 className="text-lg font-semibold text-[--color-text]">{agent.name}</h3>
              )}
              <p className="mt-2 text-sm text-[--color-text-muted]">{agent.description || '???'}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <StatBar
              label="????"
              value={formData.response_speed.toFixed(1)}
              widthClass={
                formData.response_speed >= 1.5
                  ? 'w-[85%]'
                  : formData.response_speed >= 1
                    ? 'w-[60%]'
                    : 'w-[35%]'
              }
            />
            <StatBar
              label="????"
              value={`${Math.round(formData.reply_probability * 100)}%`}
              widthClass={
                formData.reply_probability >= 0.8
                  ? 'w-[85%]'
                  : formData.reply_probability >= 0.5
                    ? 'w-[60%]'
                    : 'w-[30%]'
              }
            />
          </div>
        </section>

        <section className="pluto-agent-panel p-4">
          <SectionTitle title="?????" />
          <div className="space-y-4">
            <div>
              <Dropdown
                label="??"
                options={modelDropdownOptions}
                value={formData.model}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, model: value as string }))
                }
                placeholder="????"
              />
              <p className="mt-2 text-xs text-[--color-text-muted]">
                {matchedProvider ? matchedProvider.name : `???? ${providerName || '??'} Provider`}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[--color-text]">?????</label>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !formData.system_prompt.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[--color-primary]/15 bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-2 text-xs font-medium text-[--color-primary] disabled:opacity-40"
                  >
                    {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    ??
                  </button>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={formData.system_prompt}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, system_prompt: event.target.value }))
                  }
                  rows={7}
                  className="pluto-modal-textarea w-full rounded-2xl px-4 py-3 text-sm leading-7 outline-none"
                />
              ) : (
                <div className="rounded-2xl pluto-modal-section px-4 py-3 text-sm leading-7 text-[--color-text-muted]">
                  {agent.system_prompt}
                </div>
              )}
              {optimizeError && <p className="mt-2 text-xs text-rose-300">{optimizeError}</p>}
            </div>

            {isEditing && (
              <Dropdown
                label="??????"
                options={lengthOptions}
                value={formData.default_length}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, default_length: value as number }))
                }
                placeholder="????"
              />
            )}
          </div>
        </section>

        <section className="pluto-agent-panel p-4">
          <SectionTitle title="?????" />
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[--color-text]">??</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, tags: event.target.value }))
                  }
                  className="pluto-modal-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(tagList.length > 0 ? tagList : ['??']).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[--color-primary]/15 bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-1 text-xs text-[--color-primary]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!isEditing && skillList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skillList.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] px-3 py-1 text-xs text-[--color-text]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="pluto-agent-footer mt-4 px-4 py-4">
        {showDeleteConfirm ? (
          <div>
            <p className="text-sm font-medium text-rose-500">?????</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="pluto-modal-secondary flex-1 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                ??
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : '??'}
              </button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="pluto-modal-secondary flex-1 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              ??
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[--color-primary] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              ??
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[--color-primary] px-4 py-3 text-sm font-medium text-white"
            >
              <Edit2 size={14} />
              ??
            </button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleActive(agent.id)}
                disabled={isLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${
                  agent.is_active
                    ? 'pluto-modal-secondary text-[--color-text]'
                    : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                }`}
              >
                <Power size={14} />
                {agent.is_active ? '??' : '??'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/15 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-200"
              >
                <Trash2 size={14} />
                ??
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
