import { Sparkles } from 'lucide-react';

import { AGENT_QUICK_FILL_PRESETS } from '../lib/agentQuickFill';

interface QuickFillPresetsProps {
  onApply: (presetId: string) => void;
}

export default function QuickFillPresets({ onApply }: QuickFillPresetsProps) {
  return (
    <div className="space-y-2 rounded-xl bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
        <Sparkles size={14} className="text-primary" />
        Quick fill templates
      </div>
      <div className="flex flex-wrap gap-2">
        {AGENT_QUICK_FILL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-85 ${preset.accent}`}
            title={preset.helper}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-muted">Fills blank persona fields, upgrades the default prompt, and appends preset skills/tags.</p>
    </div>
  );
}
