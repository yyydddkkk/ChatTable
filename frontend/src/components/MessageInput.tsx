import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send } from 'lucide-react';
import type { Agent } from '../stores/agentStore';
import { COMMANDS, type Command } from '../config/commands';

interface MentionListProps {
  agents: Agent[];
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (agent: Agent) => void;
}

export function CommandList({ isOpen, selectedIndex, onSelect }: { isOpen: boolean; selectedIndex: number; onSelect: (cmd: Command) => void }) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl overflow-hidden z-10"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      <div className="p-3 text-xs font-medium text-[--color-text-subtle]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        命令列表
      </div>
      <div className="max-h-48 overflow-y-auto">
        {COMMANDS.map((cmd, idx) => (
          <div
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            className="px-4 py-3 cursor-pointer transition-all duration-150"
            style={{
              background: idx === selectedIndex ? 'rgba(234,120,80,0.1)' : 'transparent',
            }}
          >
            <span className="text-sm font-semibold text-[--color-text]">{cmd.usage}</span>
            <span className="text-sm text-[--color-text-muted] ml-2">{cmd.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MentionList({ agents, isOpen, selectedIndex, onSelect }: MentionListProps) {
  if (!isOpen || agents.length === 0) return null;

  return (
    <div 
      className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl overflow-hidden z-10"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      <div className="p-3 text-xs font-medium text-[--color-text-subtle]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        提及成员
      </div>
      <div className="max-h-48 overflow-y-auto">
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            onClick={() => onSelect(agent)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150"
            style={{
              background: idx === selectedIndex ? 'rgba(234,120,80,0.1)' : 'transparent',
            }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: 'rgba(234,120,80,0.1)', color: 'var(--color-primary)' }}
            >
              {agent.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[--color-text] truncate">{agent.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MessageInputProps {
  onSend: (content: string) => void;
  onCommand?: (command: string, args: string) => void;
  disabled?: boolean;
  agents?: Agent[];
}

export default function MessageInput({
  onSend,
  onCommand,
  disabled,
  agents = [],
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [showCommandList, setShowCommandList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const handleSend = () => {
    if (content.trim() && !disabled) {
      const trimmed = content.trim();
      
      if (onCommand && trimmed.startsWith('/')) {
        const parts = trimmed.slice(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        onCommand(command, args);
      } else {
        onSend(trimmed);
      }
      
      setContent('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        insertCommand(filteredCommands[selectedCommandIndex]);
      } else if (e.key === 'Escape') {
        setShowCommandList(false);
      }
      return;
    }

    if (showMentionList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.min(prev + 1, filteredAgents.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredAgents.length > 0) {
        e.preventDefault();
        insertMention(filteredAgents[selectedMentionIndex].name);
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setContent(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    
    if (textBeforeCursor.startsWith('/') && !textBeforeCursor.includes(' ')) {
      setShowCommandList(true);
      setCommandQuery(textBeforeCursor.slice(1).toLowerCase());
      setSelectedCommandIndex(0);
      setShowMentionList(false);
      return;
    }
    
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    const lastSpacePos = textBeforeCursor.lastIndexOf(' ');
    
    if (lastAtPos > lastSpacePos) {
      const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
      if (!textAfterAt.includes(' ')) {
        setShowCommandList(false);
        setShowMentionList(true);
        setMentionQuery(textAfterAt);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowCommandList(false);
    setShowMentionList(false);
    setMentionQuery('');
    setCommandQuery('');
  };

  const insertMention = (name: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = content.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      const newContent = content.slice(0, lastAtPos) + '@' + name + ' ' + content.slice(cursorPos);
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = lastAtPos + name.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowMentionList(false);
    setMentionQuery('');
  };

  const insertCommand = (cmd: Command) => {
    setContent(cmd.usage + ' ');
    setShowCommandList(false);
    setCommandQuery('');
    textareaRef.current?.focus();
  };

  const isActive = content.trim().length > 0 && !disabled;

  return (
    <div className="p-4 pb-5 bg-transparent">
      <div 
        className="relative bg-white rounded-[24px] p-3 pl-5 flex flex-col gap-3"
        style={{ 
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[--color-text-subtle] ml-auto">
            Enter 发送 · Shift+Enter 换行
          </span>
        </div>

        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (@ 提及, /命令)"
            disabled={disabled}
            rows={1}
            style={{
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 15,
              lineHeight: 1.6,
              minHeight: 44,
              maxHeight: 120,
              color: '#2C2A27',
              background: 'transparent',
              flex: 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!isActive}
            className="transition-all duration-200"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: 'none',
              cursor: isActive ? 'pointer' : 'not-allowed',
              background: isActive 
                ? 'linear-gradient(135deg, #EA7850 0%, #E86848 100%)' 
                : '#F0EDE8',
              color: isActive ? '#fff' : '#bbb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isActive ? '0 4px 16px rgba(234,120,80,0.35)' : 'none',
              transform: isActive ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            <Send size={18} />
          </button>
        </div>

        <MentionList
          agents={filteredAgents}
          isOpen={showMentionList}
          selectedIndex={selectedMentionIndex}
          onSelect={(agent) => insertMention(agent.name)}
        />
        <CommandList
          isOpen={showCommandList}
          selectedIndex={selectedCommandIndex}
          onSelect={(cmd) => insertCommand(cmd)}
        />
      </div>
    </div>
  );
}
