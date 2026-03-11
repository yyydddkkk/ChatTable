import { useState } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { X, Loader2 } from 'lucide-react';

interface CreateAgentModalProps {
  onClose: () => void;
}

const AVATAR_OPTIONS = ['🤖', '👤', '🎭', '🧙', '👩‍💻', '👨‍🔬', '🎨', '📚', '🌟', '💡'];

const MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
];

export default function CreateAgentModal({ onClose }: CreateAgentModalProps) {
  const { createAgent, isLoading } = useAgentStore();
  
  const [formData, setFormData] = useState({
    name: '',
    avatar: '🤖',
    description: '',
    model: 'gpt-4',
    api_key: '',
    api_base: '',
    system_prompt: 'You are a helpful AI assistant.',
    response_speed: 1.0,
    reply_probability: 0.8,
    default_length: 3,
    is_public: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.api_key.trim()) newErrors.api_key = 'API key is required';
    if (formData.response_speed < 0.5 || formData.response_speed > 2.0) {
      newErrors.response_speed = 'Speed must be between 0.5 and 2.0';
    }
    if (formData.reply_probability < 0 || formData.reply_probability > 1) {
      newErrors.reply_probability = 'Probability must be between 0 and 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await createAgent({
      ...formData,
      api_base: formData.api_base || undefined,
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
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Create New Agent</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-background transition"
          >
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                errors.name ? 'border-red-500' : 'border-border'
              }`}
              placeholder="Enter agent name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Avatar</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleChange('avatar', emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition ${
                    formData.avatar === emoji
                      ? 'bg-primary text-white'
                      : 'bg-background hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
              rows={2}
              placeholder="Brief description of the agent"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Model *</label>
            <select
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">API Key *</label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => handleChange('api_key', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                errors.api_key ? 'border-red-500' : 'border-border'
              }`}
              placeholder="Enter your API key"
            />
            {errors.api_key && <p className="text-red-500 text-xs mt-1">{errors.api_key}</p>}
          </div>

          {/* API Base (Optional) */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">API Base URL (Optional)</label>
            <input
              type="text"
              value={formData.api_base}
              onChange={(e) => handleChange('api_base', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">System Prompt</label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => handleChange('system_prompt', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
              rows={3}
              placeholder="Instructions for the agent"
            />
          </div>

          {/* Response Speed */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Response Speed: {formData.response_speed.toFixed(1)}
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
              <span>Slow (0.5)</span>
              <span>Normal (1.0)</span>
              <span>Fast (2.0)</span>
            </div>
          </div>

          {/* Reply Probability */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Reply Probability: {Math.round(formData.reply_probability * 100)}%
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
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Default Response Length: {formData.default_length}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleChange('default_length', level)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    formData.default_length === level
                      ? 'bg-primary text-white'
                      : 'bg-background text-text hover:bg-gray-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Public */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => handleChange('is_public', e.target.checked)}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <label htmlFor="is_public" className="text-sm text-text">
              Make this agent publicly visible
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Create Agent
          </button>
        </div>
      </div>
    </div>
  );
}
