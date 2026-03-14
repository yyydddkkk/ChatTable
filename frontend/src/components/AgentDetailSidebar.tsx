import { useState } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { X, Edit2, Trash2, Power, Loader2, Save, Bot } from 'lucide-react';
import { MODEL_OPTIONS } from '../config/models';
import Dropdown from './Dropdown';

interface AgentDetailSidebarProps {
  agent: Agent;
  onClose: () => void;
}

const LENGTH_OPTIONS = [
  { value: 1, label: '1 - Very Short' },
  { value: 2, label: '2 - Short' },
  { value: 3, label: '3 - Normal' },
  { value: 4, label: '4 - Long' },
  { value: 5, label: '5 - Very Long' },
];

const MODEL_DROPDOWN_OPTIONS = MODEL_OPTIONS.flatMap(group => 
  group.models.map(model => ({
    value: model.value,
    label: `${model.label} (${group.group})`
  }))
);

export default function AgentDetailSidebar({ agent, onClose }: AgentDetailSidebarProps) {
  const { updateAgent, deleteAgent, toggleActive, isLoading } = useAgentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: agent.name,
    avatar: agent.avatar || 'Robot',
    description: agent.description || '',
    model: agent.model,
    api_base: agent.api_base || '',
    system_prompt: agent.system_prompt,
    response_speed: agent.response_speed,
    reply_probability: agent.reply_probability,
    default_length: agent.default_length,
  });

  const [showApiKeyField, setShowApiKeyField] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  const handleSave = async () => {
    const updateData = {
      ...formData,
      api_base: formData.api_base || undefined,
    };
    if (newApiKey) {
      (updateData as { api_key?: string }).api_key = newApiKey;
    }
    const result = await updateAgent(agent.id, updateData);
    if (result) {
      setIsEditing(false);
      setShowApiKeyField(false);
      setNewApiKey('');
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
    if (formData.avatar && formData.avatar.startsWith('http')) {
      return <img src={formData.avatar} alt={formData.name} className="w-20 h-20 rounded-full object-cover" />;
    }
    return <Bot size={40} className="text-primary" />;
  };

  return (
    <div className="w-80 border-l border-border bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text">Agent Details</h2>
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
              className="text-center px-3 py-1 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          ) : (
            <h3 className="text-xl font-semibold text-text">{agent.name}</h3>
          )}
          <span className={`text-sm mt-1 ${agent.is_active ? 'text-green-600' : 'text-gray-500'}`}>
            {agent.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
              rows={2}
            />
          ) : (
            <p className="text-sm text-text">{agent.description || 'No description'}</p>
          )}
        </div>

        {/* Model */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">Model</label>
          {isEditing ? (
            <Dropdown
              options={MODEL_DROPDOWN_OPTIONS}
              value={formData.model}
              onChange={(val) => setFormData((prev) => ({ ...prev, model: val as string }))}
              placeholder="Select a model"
            />
          ) : (
            <p className="text-sm text-text">{agent.model}</p>
          )}
        </div>

        {/* API Base URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">API Base URL</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.api_base}
              onChange={(e) => setFormData((prev) => ({ ...prev, api_base: e.target.value }))}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
            />
          ) : (
            <p className="text-sm text-text bg-background p-2 rounded truncate" title={agent.api_base || 'Default (OpenAI)'}>
              {agent.api_base || 'Default (OpenAI)'}
            </p>
          )}
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">API Key</label>
          {isEditing ? (
            showApiKeyField ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter new API key"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyField(false);
                    setNewApiKey('');
                  }}
                  className="text-sm text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowApiKeyField(true)}
                className="text-sm text-primary hover:underline"
              >
                Change API Key
              </button>
            )
          ) : (
            <p className="text-sm text-text bg-background p-2 rounded">
              ••••••••••••
            </p>
          )}
        </div>

        {/* System Prompt */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">System Prompt</label>
          {isEditing ? (
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
              rows={3}
            />
          ) : (
            <p className="text-sm text-text bg-background p-2 rounded">{agent.system_prompt}</p>
          )}
        </div>

        {/* Response Speed */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">
            Response Speed: {isEditing ? formData.response_speed.toFixed(1) : agent.response_speed.toFixed(1)}
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
            Reply Probability: {isEditing ? Math.round(formData.reply_probability * 100) : Math.round(agent.reply_probability * 100)}%
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
            Default Response Length: {isEditing ? formData.default_length : agent.default_length}
          </label>
          {isEditing ? (
            <Dropdown
              options={LENGTH_OPTIONS}
              value={formData.default_length}
              onChange={(val) => setFormData((prev) => ({ ...prev, default_length: val as number }))}
              placeholder="Select length"
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
          <label className="block text-sm font-medium text-text-muted mb-1">Created At</label>
          <p className="text-sm text-text">
            {new Date(agent.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full py-3 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              aria-label="Save changes"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="w-full py-3 text-text-muted hover:text-text transition min-h-[44px]"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 min-h-[44px]"
              aria-label="Edit agent"
            >
              <Edit2 size={16} />
              Edit Agent
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px] ${
                agent.is_active
                  ? 'bg-gray-100 text-text hover:bg-gray-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              aria-label={agent.is_active ? 'Deactivate agent' : 'Activate agent'}
            >
              <Power size={16} />
              {agent.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 text-red-500 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px]"
              aria-label="Delete agent"
            >
              <Trash2 size={16} />
              Delete Agent
            </button>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-surface p-6 rounded-xl shadow-xl max-w-sm">
            <h3 className="text-lg font-semibold text-text mb-2">Delete Agent?</h3>
            <p className="text-text-muted mb-4">
              Are you sure you want to delete "{agent.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-text-muted hover:text-text transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
