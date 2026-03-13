import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, AtSign } from 'lucide-react';
import type { Agent } from '../stores/agentStore';

interface MentionListProps {
  agents: Agent[];
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (agent: Agent) => void;
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
  disabled?: boolean;
  agents?: Agent[];
}

export default function MessageInput({ onSend, disabled, agents = [] }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
      if (!textAfterAt.includes(' ') && lastAtPos >= 0) {
        setShowMentionList(true);
        setMentionQuery(textAfterAt);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowMentionList(false);
    setMentionQuery('');
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
            placeholder="输入消息... (@ 提及)"
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
