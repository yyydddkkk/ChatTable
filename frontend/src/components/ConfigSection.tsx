import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface ConfigSectionProps {
  title: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  action?: ReactNode;
  summary?: string;
}

export default function ConfigSection({
  title,
  description,
  isOpen,
  onToggle,
  children,
  action,
  summary,
}: ConfigSectionProps) {
  return (
    <section className="rounded-xl bg-surface" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex flex-1 items-start gap-3 text-left">
          <ChevronDown
            size={16}
            className={`mt-0.5 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-text">{title}</div>
              {summary && (
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  {summary}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-text-muted">{description}</div>
          </div>
        </button>
        {action}
      </div>
      {isOpen && <div className="space-y-4 border-t border-black/5 px-4 py-4">{children}</div>}
    </section>
  );
}
