interface LengthAdjusterProps {
  level: number;
  onChange: (level: number) => void;
}

const LEVELS = [
  { level: 1, label: '极短', icon: '●' },
  { level: 2, label: '较短', icon: '●●' },
  { level: 3, label: '中等', icon: '●●●' },
  { level: 4, label: '较长', icon: '●●●●' },
  { level: 5, label: '极长', icon: '●●●●●' },
];

export default function LengthAdjuster({ level, onChange }: LengthAdjusterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">长度:</span>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l.level}
            onClick={() => onChange(l.level)}
            className={`px-2 py-1 text-xs rounded transition ${
              level === l.level
                ? 'bg-primary text-white'
                : 'bg-background text-text-muted hover:bg-primary/10'
            }`}
            title={l.label}
          >
            {l.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
