import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
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
import { AGENT_QUICK_FILL_PRESETS, applyAgentQuickFill } from '../lib/agentQuickFill';
import { buildAgentSectionStats } from '../lib/agentSectionStats';
import { handleApiError } from '../lib/apiError';
import { useAgentStore } from '../stores/agentStore';
import { useProviderStore } from '../stores/providerStore';
import { apiFetch } from '../services/http';
import AgentDraftPreview from './AgentDraftPreview';
import ConfigSection from './ConfigSection';
import Dropdown from './Dropdown';
import QuickFillPresets from './QuickFillPresets';
import TokenInput from './TokenInput';

interface CreateAgentModalProps {
  onClose: () => void;
}

type SectionKey = 'identity' | 'persona' | 'brain' | 'behavior' | 'preview';

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
  persona: true,
  brain: true,
  behavior: false,
  preview: true,
};

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
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDesc, setGenerateDesc] = useState('');

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
    isPublic: formData.is_public,
  });

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
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
        const errorMessage = await handleApiError(response);
        throw new Error(errorMessage);
      }
      const data = await response.json();
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
      setOpenSections((prev) => ({ ...prev, persona: true, brain: true, preview: true }));
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : 'Persona generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      nextErrors.name = 'Please enter an agent name.';
    }
    if (!matchedProvider) {
      nextErrors.model = `Configure ${providerName || 'a matching'} provider first.`;
    }
    if (formData.response_speed < 0.5 || formData.response_speed > 2.0) {
      nextErrors.response_speed = 'Response speed must stay between 0.5 and 2.0.';
    }
    if (formData.reply_probability < 0 || formData.reply_probability > 1) {
      nextErrors.reply_probability = 'Reply probability must stay between 0 and 1.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <h2 className="text-lg font-semibold text-text">Create Agent</h2>
            <p className="mt-1 text-sm text-text-muted">Build the profile first, then fine-tune prompt and behavior.</p>
          </div>
          <button onClick={onClose} className="rounded p-2 transition hover:bg-background" aria-label="Close dialog">
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-4">
          <ConfigSection
            title="Identity"
            description="Name, avatar, and the one-line summary people scan first."
            isOpen={openSections.identity}
            onToggle={() => toggleSection('identity')}
            summary={sectionStats.identity.label}
          >
            <div>
              <label htmlFor="agent-name" className="mb-1 block text-sm font-medium text-text">Name *</label>
              <input
                id="agent-name"
                type="text"
                value={formData.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ border: errors.name ? '1px solid #ef4444' : '1px solid rgba(0,0,0,0.06)' }}
                placeholder="Name your agent"
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p id="name-error" className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Avatar</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleChange('avatar', label)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                      formData.avatar === label ? 'bg-primary text-white' : 'bg-background text-text-muted hover:bg-gray-100'
                    }`}
                    aria-label={`Select ${label} avatar`}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Description</label>
              <textarea
                value={formData.description}
                onChange={(event) => handleChange('description', event.target.value)}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={2}
                placeholder="What makes this agent distinct?"
              />
            </div>
          </ConfigSection>

          <ConfigSection
            title="Persona"
            description="Quick-fill a role, then refine tone, background, skills, and tags."
            isOpen={openSections.persona}
            onToggle={() => toggleSection('persona')}
            summary={sectionStats.persona.label}
          >
            <QuickFillPresets onApply={handleApplyPreset} />

            <div className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-3">
              <label className="mb-2 block text-sm font-medium text-text">AI persona generation</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generateDesc}
                  onChange={(event) => setGenerateDesc(event.target.value)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                  placeholder="Describe the role, for example: a calm study partner"
                />
                <button
                  type="button"
                  onClick={handleGeneratePersona}
                  disabled={isGenerating || !generateDesc.trim()}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Personality</label>
              <textarea
                value={formData.personality}
                onChange={(event) => handleChange('personality', event.target.value)}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={2}
                placeholder="Describe how the agent should feel in conversation"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Background</label>
              <textarea
                value={formData.background}
                onChange={(event) => handleChange('background', event.target.value)}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={3}
                placeholder="Give the agent context, lived experience, or domain focus"
              />
            </div>

            <TokenInput
              label="Skills"
              value={formData.skills}
              onChange={(value) => handleChange('skills', value)}
              placeholder="Add a skill and press Enter"
              helperText="Supports Enter, comma, and pasted lists."
            />

            <TokenInput
              label="Tags"
              value={formData.tags}
              onChange={(value) => handleChange('tags', value)}
              placeholder="Add a tag and press Enter"
              helperText="Stored as a JSON array without changing the backend contract."
            />
          </ConfigSection>

          <ConfigSection
            title="Model & Prompt"
            description="Choose the runtime model and tighten the core instructions."
            isOpen={openSections.brain}
            onToggle={() => toggleSection('brain')}
            summary={sectionStats.brain.label}
          >
            <div>
              <Dropdown
                label="Model *"
                options={MODEL_DROPDOWN_OPTIONS}
                value={formData.model}
                onChange={(value) => handleChange('model', value as string)}
                placeholder="Select a model"
              />
              {providerName && (
                matchedProvider ? (
                  <p className="mt-1 text-xs text-green-600">Using provider: {matchedProvider.name}</p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle size={12} />
                    Configure {providerName} first.
                  </p>
                )
              )}
              {errors.model && <p className="mt-1 text-xs text-red-500">{errors.model}</p>}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-text">System prompt</label>
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
              </div>
              <textarea
                value={formData.system_prompt}
                onChange={(event) => handleChange('system_prompt', event.target.value)}
                className="w-full rounded-lg px-3 py-2 focus:outline-none resize-none"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                rows={4}
                placeholder="Write the instructions that should govern this agent"
              />
              {optimizeError && <p className="mt-1 text-xs text-red-500">{optimizeError}</p>}
            </div>
          </ConfigSection>

          <ConfigSection
            title="Behavior"
            description="Tune pacing, willingness to respond, and default reply length."
            isOpen={openSections.behavior}
            onToggle={() => toggleSection('behavior')}
            summary={sectionStats.behavior.label}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Response speed: {formData.response_speed.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={formData.response_speed}
                onChange={(event) => handleChange('response_speed', Number.parseFloat(event.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-text-muted">
                <span>Steady</span>
                <span>Balanced</span>
                <span>Fast</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Reply probability: {Math.round(formData.reply_probability * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.reply_probability}
                onChange={(event) => handleChange('reply_probability', Number.parseFloat(event.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-text-muted">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <Dropdown
              label="Default reply length"
              options={LENGTH_OPTIONS}
              value={formData.default_length}
              onChange={(value) => handleChange('default_length', value as number)}
              placeholder="Select a length"
            />

            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(event) => handleChange('is_public', event.target.checked)}
                className="h-4 w-4 rounded text-primary"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              />
              Public agent profile
            </label>
          </ConfigSection>

          <ConfigSection
            title="Live Preview"
            description="See the current profile, readiness score, and what still feels thin."
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
              isPublic={formData.is_public}
            />
          </ConfigSection>
        </form>

        <div className="flex justify-end gap-3 p-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button type="button" onClick={onClose} className="px-4 py-2 text-text-muted transition hover:text-text">
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Create Agent
          </button>
        </div>
      </div>
    </div>
  );
}
