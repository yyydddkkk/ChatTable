import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Command, Send } from 'lucide-react';

import { COMMANDS, type Command as SlashCommand } from '../config/commands';
import type { Agent } from '../stores/agentStore';

interface MentionListProps {
  agents: Agent[];
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (agent: Agent) => void;
}

function CommandList({
  commands,
  isOpen,
  selectedIndex,
  onSelect,
}: {
  commands: SlashCommand[];
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="pluto-input-menu absolute bottom-full left-0 mb-3 w-80 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(10,16,34,0.95)] shadow-[0_24px_60px_rgba(7,10,24,0.45)]">
      <div className="pluto-input-menu-header border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-[--color-text-subtle]">
        Slash Commands
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {commands.map((command, index) => (
          <button
            key={command.name}
            type="button"
            onClick={() => onSelect(command)}
            data-selected={index === selectedIndex ? 'true' : 'false'}
            className={`pluto-input-menu-item flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
              index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/6'
            }`}
          >
            <span className="pluto-input-menu-icon mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 text-[--color-secondary]">
              <Command size={14} />
            </span>
            <div>
              <div className="text-sm font-medium text-[--color-text]">{command.usage}</div>
              <div className="mt-1 text-xs leading-5 text-[--color-text-muted]">
                {command.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MentionList({ agents, isOpen, selectedIndex, onSelect }: MentionListProps) {
  if (!isOpen || agents.length === 0) {
    return null;
  }

  return (
    <div className="pluto-input-menu absolute bottom-full left-0 mb-3 w-72 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(10,16,34,0.95)] shadow-[0_24px_60px_rgba(7,10,24,0.45)]">
      <div className="pluto-input-menu-header border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-[--color-text-subtle]">
        Mention Agent
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelect(agent)}
            data-selected={index === selectedIndex ? 'true' : 'false'}
            className={`pluto-input-menu-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
              index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/6'
            }`}
          >
            <span className="pluto-input-menu-icon flex h-9 w-9 items-center justify-center rounded-xl border border-[--color-secondary]/15 bg-[--color-secondary]/10 text-xs font-semibold text-[--color-secondary]">
              {agent.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-[--color-text]">{agent.name}</div>
              <div className="truncate text-xs text-[--color-text-muted]">
                {agent.description || '点名让这个 Agent 先说'}
              </div>
            </div>
          </button>
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
  disabled = false,
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
    agent.name.toLowerCase().includes(mentionQuery.toLowerCase()),
  );
  const filteredCommands = COMMANDS.filter((command) =>
    command.name.toLowerCase().includes(commandQuery.toLowerCase()),
  );

  const resizeTextarea = () => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  };

  const closeMenus = () => {
    setShowMentionList(false);
    setShowCommandList(false);
    setMentionQuery('');
    setCommandQuery('');
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) {
      return;
    }

    if (onCommand && trimmed.startsWith('/')) {
      const [commandName, ...rest] = trimmed.slice(1).split(' ');
      onCommand(commandName.toLowerCase(), rest.join(' '));
    } else {
      onSend(trimmed);
    }

    setContent('');
    closeMenus();
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const insertMention = (name: string) => {
    const cursorPosition = textareaRef.current?.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const lastAtPosition = textBeforeCursor.lastIndexOf('@');

    if (lastAtPosition >= 0) {
      const nextContent = `${content.slice(0, lastAtPosition)}@${name} ${content.slice(cursorPosition)}`;
      setContent(nextContent);
      closeMenus();

      queueMicrotask(() => {
        if (textareaRef.current) {
          const nextPosition = lastAtPosition + name.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextPosition, nextPosition);
          resizeTextarea();
        }
      });
    }
  };

  const insertCommand = (command: SlashCommand) => {
    setContent(`${command.usage} `);
    setShowCommandList(false);
    setCommandQuery('');

    queueMicrotask(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { selectionStart, value } = event.target;
    const cursorPosition = selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPosition);
    setContent(value);
    resizeTextarea();

    if (textBeforeCursor.startsWith('/') && !textBeforeCursor.includes(' ')) {
      setShowCommandList(true);
      setCommandQuery(textBeforeCursor.slice(1).toLowerCase());
      setSelectedCommandIndex(0);
      setShowMentionList(false);
      return;
    }

    const lastAtPosition = textBeforeCursor.lastIndexOf('@');
    const lastSpacePosition = textBeforeCursor.lastIndexOf(' ');
    if (lastAtPosition > lastSpacePosition) {
      const textAfterAt = textBeforeCursor.slice(lastAtPosition + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentionList(true);
        setMentionQuery(textAfterAt);
        setSelectedMentionIndex(0);
        setShowCommandList(false);
        return;
      }
    }

    closeMenus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandList) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedCommandIndex((previous) =>
          Math.min(previous + 1, filteredCommands.length - 1),
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedCommandIndex((previous) => Math.max(previous - 1, 0));
      } else if (event.key === 'Enter' && filteredCommands.length > 0) {
        event.preventDefault();
        insertCommand(filteredCommands[selectedCommandIndex]);
      } else if (event.key === 'Escape') {
        closeMenus();
      }
      return;
    }

    if (showMentionList) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedMentionIndex((previous) =>
          Math.min(previous + 1, filteredAgents.length - 1),
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedMentionIndex((previous) => Math.max(previous - 1, 0));
      } else if (event.key === 'Enter' && filteredAgents.length > 0) {
        event.preventDefault();
        insertMention(filteredAgents[selectedMentionIndex].name);
      } else if (event.key === 'Escape') {
        closeMenus();
      }
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const sendEnabled = content.trim().length > 0 && !disabled;

  return (
    <div className="pluto-message-composer-wrap border-t border-white/10 px-6 pb-5 pt-3">
      <div className="relative mx-auto max-w-4xl">
        <MentionList
          agents={filteredAgents}
          isOpen={showMentionList}
          selectedIndex={selectedMentionIndex}
          onSelect={(agent) => insertMention(agent.name)}
        />
        <CommandList
          commands={filteredCommands}
          isOpen={showCommandList}
          selectedIndex={selectedCommandIndex}
          onSelect={insertCommand}
        />

        <div className="pluto-message-composer rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,48,0.92),rgba(13,18,38,0.92))] p-3 shadow-[0_24px_60px_rgba(7,10,24,0.4)]">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="把今晚想说的话发给 Pluto…"
              disabled={disabled}
              className="pluto-message-textarea min-h-[44px] max-h-[160px] flex-1 resize-none bg-transparent px-2 py-[10px] text-[15px] leading-[1.6] text-white outline-none placeholder:text-[--color-text-subtle]"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!sendEnabled}
              className="pluto-send-fly"
              aria-label="发送消息"
            >
              <span className="svg-wrapper">
                <Send size={18} />
              </span>
              <span>发送</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
