import { useState, useEffect } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { X, Edit2, Trash2, Power, Loader2, Save } from 'lucide-react';
import { MODEL_OPTIONS } from '../config/models';

interface AgentDetailSidebarProps {
  agent: Agent;
  onClose: () => void;
}

export default function AgentDetailSidebar({ agent, onClose }: AgentDetailSidebarProps) {
  const { updateAgent, deleteAgent, toggleActive, isLoading } = useAgentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: agent.name,
    avatar: agent.avatar || '🤖',
    description: agent.description || '',
    model: agent.model,
    system_prompt: agent.system_prompt,
    response_speed: agent.response_speed,
    reply_probability: agent.reply_probability,
    default_length: agent.default_length,
  });

  useEffect(() => {
    setFormData({
      name: agent.name,
      avatar: agent.avatar || '🤖',
      description: agent.description || '',
      model: agent.model,
      system_prompt: agent.system_prompt,
      response_speed: agent.response_speed,
      reply_probability: agent.reply_probability,
      default_length: agent.default_length,
    });
    setIsEditing(false);
  }, [agent]);

  const handleSave = async () => {
    const result = await updateAgent(agent.id, formData);
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
    if (formData.avatar) {
      return formData.avatar.startsWith('http') ? (
        <img src={formData.avatar} alt={formData.name} className="w-20 h-20 rounded-full object-cover" />
      ) : (
        <span className="text-4xl">{formData.avatar}</span>
      );
    }
    return <span className="text-4xl">{formData.name.charAt(0).toUpperCase()}</span>;
  };

  return (
    <div className="w-80 border-l border-border bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text">Agent Details</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-background transition">
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
            <select
              value={formData.model}
              onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              {MODEL_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.models.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <p className="text-sm text-text">{agent.model}</p>
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
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, default_length: level }))}
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
              className="w-full py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="w-full py-2 text-text-muted hover:text-text transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
            >
              <Edit2 size={16} />
              Edit Agent
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isLoading}
              className={`w-full py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                agent.is_active
                  ? 'bg-gray-100 text-text hover:bg-gray-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              <Power size={16} />
              {agent.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-red-500 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2"
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
