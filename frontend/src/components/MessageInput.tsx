import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, AtSign } from 'lucide-react';
import type { Agent } from '../stores/agentStore';

interface MentionListProps {
  agents: Agent[];
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (agent: Agent) => void;
}

export const COMMANDS = [
  { name: 'clear', description: '清除聊天记录和上下文', usage: '/clear' },
  { name: 'help', description: '显示可用命令', usage: '/help' },
  { name: 'length', description: '设置回复长度 (1-5)', usage: '/length 3' },
];

export function CommandList({ selectedIndex, onSelect }: { selectedIndex: number; onSelect: (cmd: typeof COMMANDS[0]) => void }) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-10">
      <div className="p-2 text-xs text-text-muted border-b border-border">
        Commands
      </div>
      <div className="max-h-48 overflow-y-auto">
        {COMMANDS.map((cmd, idx) => (
          <div
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            className={`px-3 py-2 cursor-pointer transition ${
              idx === selectedIndex ? 'bg-primary/10' : 'hover:bg-background'
            }`}
          >
            <span className="text-sm font-medium text-text">{cmd.usage}</span>
            <span className="text-sm text-text-muted ml-2">{cmd.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MentionList({ agents, isOpen, selectedIndex, onSelect }: MentionListProps) {
  if (!isOpen || agents.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-10">
      <div className="p-2 text-xs text-text-muted border-b border-border">
        Mention someone
      </div>
      <div className="max-h-48 overflow-y-auto">
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition ${
              idx === selectedIndex ? 'bg-primary/10' : 'hover:bg-background'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs">{agent.avatar || agent.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">{agent.name}</div>
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

export default function MessageInput({ onSend, onCommand, disabled, agents = [] }: MessageInputProps) {
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
      
      // Check for command (starts with /)
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
    
    // Check for command - only show when input starts with / and has no space before cursor
    if (textBeforeCursor.startsWith('/') && !textBeforeCursor.includes(' ')) {
      setShowCommandList(true);
      setCommandQuery(textBeforeCursor.slice(1).toLowerCase());
      setSelectedCommandIndex(0);
      setShowMentionList(false);
      return;
    }
    
    // Check for mention (@) - only show when preceded by @
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

  const insertCommand = (cmd: typeof COMMANDS[0]) => {
    setContent(cmd.usage + ' ');
    setShowCommandList(false);
    setCommandQuery('');
    textareaRef.current?.focus();
  };

  const handleMentionClick = () => {
    setShowMentionList(true);
    setMentionQuery('');
    setSelectedMentionIndex(0);
  };

  return (
    <div className="border-t border-border bg-surface p-4 relative">
      <div className="flex gap-3 items-end">
        <button
          onClick={handleMentionClick}
          disabled={disabled}
          className="p-2 text-text-muted hover:text-primary transition disabled:opacity-50"
          title="Mention someone"
        >
          <AtSign size={20} />
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (@ 提及, /命令)"
            disabled={disabled}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-primary disabled:opacity-50"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <MentionList
            agents={filteredAgents}
            isOpen={showMentionList}
            selectedIndex={selectedMentionIndex}
            onSelect={(agent) => insertMention(agent.name)}
          />
          <CommandList
            selectedIndex={selectedCommandIndex}
            onSelect={(cmd) => insertCommand(cmd)}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="p-2 rounded-lg bg-primary text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
