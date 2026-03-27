import { useState } from 'react';
import { Edit2, Loader2, Power, Save, Trash2, Wand2, X } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api';
import { MODEL_OPTIONS, getProviderNameForModel } from '../config/models';
import { parseTokenList } from '../lib/agentConfig';
import { AGENT_QUICK_FILL_PRESETS, applyAgentQuickFill } from '../lib/agentQuickFill';
import { buildAgentSectionStats } from '../lib/agentSectionStats';
import { AvatarIcon } from '../lib/agentPalette';
import { handleApiError } from '../lib/apiError';
import { apiFetch } from '../services/http';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useProviderStore } from '../stores/providerStore';
import AgentDraftPreview from './AgentDraftPreview';
import ConfigSection from './ConfigSection';
import Dropdown from './Dropdown';
import QuickFillPresets from './QuickFillPresets';
import TokenInput from './TokenInput';

interface AgentDetailSidebarProps {
  agent: Agent;
  onClose: () => void;
}

type SectionKey = 'identity' | 'persona' | 'brain' | 'behavior' | 'preview' | 'meta';

const LENGTH_OPTIONS = [
  { value: 1, label: '1 - Very short' },
  { value: 2, label: '2 - Short' },
  { value: 3, label: '3 - Balanced' },
  { value: 4, label: '4 - Detailed' },
  { value: 5, label: '5 - Very detailed' },
];

const MODEL_DROPDOWN_OPTIONS = MODEL_OPTIONS.flatMap((group) =>
  group.models.map((model) => ({
    value: model.value,
    label: `${model.label} (${group.group})`,
  })),
);

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  identity: true,
  persona: false,
  brain: false,
  behavior: false,
  preview: false,
  meta: false,
};

export default function AgentDetailSidebar({ agent, onClose }: AgentDetailSidebarProps) {
  const { updateAgent, deleteAgent, toggleActive, isLoading } = useAgentStore();
  const { providers } = useProviderStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);
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

  const providerName = getProviderNameForModel(formData.model);
  const matchedProvider = providerName
    ? providers.find((provider) => provider.name === providerName)
    : null;


  const sectionStats = buildAgentSectionStats({
    name: formData.name,
    avatar: formData.avatar,
    description: formData.description,
    model: formData.model,
    matchedProviderName: matchedProvider?.name ?? null,
    systemPrompt: formData.system_prompt,
    personality: formData.personality,
    background: formData.background,
    skills: formData.skills,
    tags: formData.tags,
    responseSpeed: formData.response_speed,
    replyProbability: formData.reply_probability,
    defaultLength: formData.default_length,
    isPublic: agent.is_public,
  });

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = AGENT_QUICK_FILL_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setFormData((prev) => ({ ...prev, ...applyAgentQuickFill(prev, preset) }));
    setOpenSections((prev) => ({ ...prev, persona: true, brain: true, behavior: true, preview: true }));
  };

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
        const errorMessage = await handleApiError(response);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setFormData((prev) => ({ ...prev, system_prompt: data.optimized_prompt }));
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : 'Prompt optimization failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = async () => {
    const nextProviderName = getProviderNameForModel(formData.model);
    const nextProvider = nextProviderName
      ? providers.find((provider) => provider.name === nextProviderName)
      : null;

    const result = await updateAgent(agent.id, {
      ...formData,
      provider_id: nextProvider?.id,
    });
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

  return (
    <div className="flex w-80 flex-col bg-surface" style={{ boxShadow: '-1px 0 8px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div>
          <h2 className="text-lg font-semibold text-text">Agent Details</h2>
          <p className="mt-1 text-xs text-text-muted">Inspect the profile or switch into edit mode.</p>
        </div>
        <button onClick={onClose} className="rounded p-2 transition hover:bg-background" aria-label="Close sidebar">
          <X size={20} className="text-text-muted" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <AvatarIcon avatarLabel={formData.avatar} size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-text">{formData.name}</h3>
          <span className={`mt-1 text-sm ${agent.is_active ? 'text-green-600' : 'text-gray-500'}`}>
            {agent.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <ConfigSection
          title="Identity"
          description="Core naming, summary, and top-line profile info."
          isOpen={openSections.identity}
          onToggle={() => toggleSection('identity')}
          summary={sectionStats.identity.label}
        >
          {isEditing ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-muted">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-muted">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                  rows={2}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-muted">Description</label>
              <p className="rounded bg-background p-2 text-sm text-text">{agent.description || 'No description yet.'}</p>
            </div>
          )}
        </ConfigSection>

        <ConfigSection
          title="Persona"
          description="Tone, background, skills, tags, and one-click role templates."
          isOpen={openSections.persona}
          onToggle={() => toggleSection('persona')}
          summary={sectionStats.persona.label}
        >
          {isEditing && <QuickFillPresets onApply={handleApplyPreset} />}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Personality</label>
            {isEditing ? (
              <textarea
                value={formData.personality}
                onChange={(event) => setFormData((prev) => ({ ...prev, personality: event.target.value }))}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={2}
              />
            ) : (
              agent.personality && <p className="rounded bg-background p-2 text-sm text-text">{agent.personality}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Background</label>
            {isEditing ? (
              <textarea
                value={formData.background}
                onChange={(event) => setFormData((prev) => ({ ...prev, background: event.target.value }))}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={3}
              />
            ) : (
              agent.background && <p className="rounded bg-background p-2 text-sm text-text">{agent.background}</p>
            )}
          </div>

          <div>
            {isEditing ? (
              <TokenInput
                label="Skills"
                value={formData.skills}
                onChange={(value) => setFormData((prev) => ({ ...prev, skills: value }))}
                placeholder="Add a skill and press Enter"
              />
            ) : (
              parseTokenList(agent.skills).length > 0 && (
                <>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Skills</label>
                  <div className="flex flex-wrap gap-1">
                    {parseTokenList(agent.skills).map((skill) => (
                      <span key={skill} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{skill}</span>
                    ))}
                  </div>
                </>
              )
            )}
          </div>

          <div>
            {isEditing ? (
              <TokenInput
                label="Tags"
                value={formData.tags}
                onChange={(value) => setFormData((prev) => ({ ...prev, tags: value }))}
                placeholder="Add a tag and press Enter"
              />
            ) : (
              parseTokenList(agent.tags).length > 0 && (
                <>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {parseTokenList(agent.tags).map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">{tag}</span>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </ConfigSection>

        <ConfigSection
          title="Model & Prompt"
          description="Runtime model, provider mapping, and instruction quality."
          isOpen={openSections.brain}
          onToggle={() => toggleSection('brain')}
          summary={sectionStats.brain.label}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Model</label>
            {isEditing ? (
              <Dropdown
                options={MODEL_DROPDOWN_OPTIONS}
                value={formData.model}
                onChange={(value) => setFormData((prev) => ({ ...prev, model: value as string }))}
                placeholder="Select a model"
              />
            ) : (
              <p className="rounded bg-background p-2 text-sm text-text">{agent.model}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Provider</label>
            <p className="rounded bg-background p-2 text-sm text-text">
              {matchedProvider ? matchedProvider.name : `Not configured${providerName ? ` (${providerName})` : ''}`}
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-text-muted">System prompt</label>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing || !formData.system_prompt.trim()}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-40"
                  style={{ background: 'rgba(234,120,80,0.1)', color: 'var(--color-primary)' }}
                >
                  {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  Optimize
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={formData.system_prompt}
                onChange={(event) => setFormData((prev) => ({ ...prev, system_prompt: event.target.value }))}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={4}
              />
            ) : (
              <p className="rounded bg-background p-2 text-sm text-text">{agent.system_prompt}</p>
            )}
            {optimizeError && <p className="mt-1 text-xs text-red-500">{optimizeError}</p>}
          </div>
        </ConfigSection>

        <ConfigSection
          title="Behavior"
          description="Pacing, reply rate, and default answer length."
          isOpen={openSections.behavior}
          onToggle={() => toggleSection('behavior')}
          summary={sectionStats.behavior.label}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">
              Response speed: {isEditing ? formData.response_speed.toFixed(1) : agent.response_speed.toFixed(1)}
            </label>
            {isEditing ? (
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={formData.response_speed}
                onChange={(event) => setFormData((prev) => ({ ...prev, response_speed: Number.parseFloat(event.target.value) }))}
                className="w-full"
              />
            ) : (
              <div className="h-2 rounded-full bg-background">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(agent.response_speed / 2) * 100}%` }} />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">
              Reply probability: {isEditing ? Math.round(formData.reply_probability * 100) : Math.round(agent.reply_probability * 100)}%
            </label>
            {isEditing ? (
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.reply_probability}
                onChange={(event) => setFormData((prev) => ({ ...prev, reply_probability: Number.parseFloat(event.target.value) }))}
                className="w-full"
              />
            ) : (
              <div className="h-2 rounded-full bg-background">
                <div className="h-2 rounded-full bg-secondary" style={{ width: `${agent.reply_probability * 100}%` }} />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Default length</label>
            {isEditing ? (
              <Dropdown
                options={LENGTH_OPTIONS}
                value={formData.default_length}
                onChange={(value) => setFormData((prev) => ({ ...prev, default_length: value as number }))}
                placeholder="Select a length"
              />
            ) : (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 rounded py-1 text-center text-xs ${
                      level <= agent.default_length ? 'bg-primary text-white' : 'bg-background text-text-muted'
                    }`}
                  >
                    {level}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ConfigSection>

        <ConfigSection
          title="Live Preview"
          description="Readiness, highlights, and behavior snapshot while you edit."
          isOpen={openSections.preview}
          onToggle={() => toggleSection('preview')}
          summary={sectionStats.preview.label}
        >
          <AgentDraftPreview
            avatar={formData.avatar}
            name={formData.name}
            description={formData.description}
            personality={formData.personality}
            background={formData.background}
            skills={formData.skills}
            tags={formData.tags}
            systemPrompt={formData.system_prompt}
            model={formData.model}
            matchedProviderName={matchedProvider?.name ?? null}
            responseSpeed={formData.response_speed}
            replyProbability={formData.reply_probability}
            defaultLength={formData.default_length}
            isPublic={agent.is_public}
          />
        </ConfigSection>

        <ConfigSection
          title="Meta"
          description="Creation time and current activation state."
          isOpen={openSections.meta}
          onToggle={() => toggleSection('meta')}
          summary={'1/1'}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Created at</label>
            <p className="text-sm text-text">{new Date(agent.created_at).toLocaleDateString()}</p>
          </div>
        </ConfigSection>
      </div>

      <div className="space-y-2 p-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="min-h-[44px] w-full py-3 text-text-muted transition hover:text-text"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-white transition hover:opacity-90"
            >
              <Edit2 size={16} />
              Edit Agent
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isLoading}
              className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg py-3 transition ${
                agent.is_active ? 'bg-gray-100 text-text hover:bg-gray-200' : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              <Power size={16} />
              {agent.is_active ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg py-3 text-red-500 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete Agent
            </button>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="max-w-sm rounded-xl bg-surface p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-text">Delete agent?</h3>
            <p className="mb-4 text-text-muted">Delete {agent.name}? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 text-text-muted transition hover:text-text">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
