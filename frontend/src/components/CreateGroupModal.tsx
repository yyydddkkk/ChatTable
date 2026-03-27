import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { useAgentStore } from '../stores/agentStore';
import { AgentAvatar } from './AgentAvatar';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: number[]) => void;
}

export default function CreateGroupModal({ onClose, onCreateGroup }: CreateGroupModalProps) {
  const { agents } = useAgentStore();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const activeAgents = agents.filter((agent) => agent.is_active);

  const toggleMember = (agentId: number) => {
    setSelectedMembers((previous) =>
      previous.includes(agentId)
        ? previous.filter((id) => id !== agentId)
        : [...previous, agentId],
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedMembers.length >= 2) {
      onCreateGroup(groupName.trim(), selectedMembers);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] pluto-modal-shell">
        <div className="flex items-center justify-between border-b border-[--color-border-light] px-6 py-5">
          <h2 className="text-xl font-semibold text-[--color-text]">新群聊</h2>
          <button
            type="button"
            onClick={onClose}
            className="pluto-modal-secondary flex h-10 w-10 items-center justify-center rounded-2xl"
            aria-label="关闭群聊创建弹窗"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <label className="mb-2 block text-sm font-medium text-[--color-text]">名称</label>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="输入群聊名称"
              className="pluto-modal-input h-12 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-[--color-text]">成员</label>
              <span className="pluto-inline-tag rounded-full px-3 py-1 text-xs">
                {selectedMembers.length}
              </span>
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {activeAgents.length === 0 ? (
                <div className="pluto-modal-section rounded-[24px] px-4 py-10 text-center text-sm text-[--color-text-muted]">
                  没有可用 Agent
                </div>
              ) : (
                activeAgents.map((agent) => {
                  const selected = selectedMembers.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggleMember(agent.id)}
                      className={`flex w-full items-center gap-3 rounded-[24px] border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-[--color-primary]/20 bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-elevated))]'
                          : 'border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_72%,var(--color-background)_28%)] hover:bg-[color-mix(in_srgb,var(--color-text)_4%,var(--color-surface-elevated))]'
                      }`}
                    >
                      <AgentAvatar agent={agent} size={46} iconSize={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[--color-text]">{agent.name}</div>
                        <div className="mt-1 truncate text-xs text-[--color-text-muted]">
                          {agent.description || '无简介'}
                        </div>
                      </div>
                      {selected && (
                        <span className="pluto-ios-icon-button flex h-9 w-9 items-center justify-center rounded-2xl text-[--color-primary]">
                          <Check size={16} />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[--color-border-light] px-6 py-4">
          <button type="button" onClick={onClose} className="pluto-modal-secondary rounded-2xl px-4 py-3 text-sm font-medium">
            取消
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.length < 2}
            className="pluto-modal-primary rounded-2xl px-5 py-3 text-sm font-medium disabled:opacity-50"
          >
            创建群聊
          </button>
        </div>
      </div>
    </div>
  );
}
