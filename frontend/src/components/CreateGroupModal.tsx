import { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: number[]) => void;
}

export default function CreateGroupModal({ onClose, onCreateGroup }: CreateGroupModalProps) {
  const { agents } = useAgentStore();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const toggleMember = (agentId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedMembers.length >= 2) {
      onCreateGroup(groupName.trim(), selectedMembers);
      onClose();
    }
  };

  const activeAgents = agents.filter((a) => a.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Create Group Chat</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Select Members ({selectedMembers.length} selected)
            </label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {activeAgents.length === 0 ? (
                <p className="text-text-muted text-sm">No active agents available</p>
              ) : (
                activeAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => toggleMember(agent.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      selectedMembers.includes(agent.id)
                        ? 'bg-primary/10 border border-primary'
                        : 'bg-background hover:bg-background/80 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg">{agent.avatar || agent.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">{agent.name}</div>
                      {agent.description && (
                        <div className="text-xs text-text-muted truncate">{agent.description}</div>
                      )}
                    </div>
                    {selectedMembers.includes(agent.id) && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.length < 2}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
