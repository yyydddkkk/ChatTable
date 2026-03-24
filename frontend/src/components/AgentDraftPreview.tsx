import { AvatarIcon } from '../lib/agentPalette';
import type { AgentDraftPreviewInput } from '../lib/agentDraftPreview';
import { buildAgentDraftPreview } from '../lib/agentDraftPreview';

interface AgentDraftPreviewProps extends AgentDraftPreviewInput {
  avatar?: string;
}

export default function AgentDraftPreview({ avatar = 'Robot', ...input }: AgentDraftPreviewProps) {
  const preview = buildAgentDraftPreview(input);
  const description = input.description.trim() || 'Add a short description to make this agent easier to recognize.';
  const name = input.name.trim() || 'Untitled agent';

  return (
    <section className="rounded-xl bg-surface p-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <AvatarIcon avatarLabel={avatar} size={24} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-text">{name}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {preview.visibilityLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>Profile readiness</span>
          <span>{preview.completionScore}%</span>
        </div>
        <div className="h-2 rounded-full bg-background">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${preview.completionScore}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 text-xs text-text-muted">
        <div>
          <span className="font-medium text-text">Model:</span>{' '}
          {input.model}
          {input.matchedProviderName ? ` via ${input.matchedProviderName}` : ' ? provider not ready'}
        </div>
        <div>
          <span className="font-medium text-text">Behavior:</span> {preview.responseSummary}
        </div>
        {preview.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {preview.highlights.map((item) => (
              <span key={item} className="rounded-full bg-background px-2 py-0.5 text-[11px] text-text">
                #{item}
              </span>
            ))}
          </div>
        )}
        {preview.warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700" style={{ border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div className="mb-1 font-medium">Needs attention</div>
            <ul className="space-y-1">
              {preview.warnings.map((warning) => (
                <li key={warning}>? {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
