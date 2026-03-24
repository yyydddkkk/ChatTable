import { useMemo, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

import { appendTokenDraft, parseTokenList, serializeTokenList } from '../lib/agentConfig';

interface TokenInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helperText?: string;
}

export default function TokenInput({
  label,
  value,
  onChange,
  placeholder,
  helperText = 'Press Enter, comma, or paste multiple values.',
}: TokenInputProps) {
  const [draft, setDraft] = useState('');
  const tokens = useMemo(() => parseTokenList(value), [value]);

  const commitDraft = (source: string) => {
    if (!source.trim()) {
      setDraft('');
      return;
    }

    const nextTokens = appendTokenDraft(tokens, source);
    onChange(serializeTokenList(nextTokens));
    setDraft('');
  };

  const removeToken = (tokenToRemove: string) => {
    onChange(serializeTokenList(tokens.filter((token) => token !== tokenToRemove)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === ',' || event.key === 'Tab') && draft.trim()) {
      event.preventDefault();
      commitDraft(draft);
      return;
    }

    if (event.key === 'Backspace' && !draft && tokens.length > 0) {
      event.preventDefault();
      removeToken(tokens[tokens.length - 1]);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (
      pasted.includes(',') ||
      pasted.includes(';') ||
      pasted.includes(String.fromCharCode(10))
    ) {
      event.preventDefault();
      commitDraft(pasted);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">{label}</label>
      <div className="rounded-lg px-3 py-2" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex flex-wrap gap-2">
          {tokens.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              {token}
              <button
                type="button"
                onClick={() => removeToken(token)}
                className="rounded-full p-0.5 text-primary/70 transition hover:bg-primary/10 hover:text-primary"
                aria-label={`Remove ${token}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => commitDraft(draft)}
            onPaste={handlePaste}
            className="min-w-[140px] flex-1 border-none bg-transparent py-1 text-sm outline-none"
            placeholder={placeholder}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-text-muted">{helperText}</p>
    </div>
  );
}
