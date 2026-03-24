import { Rocket } from 'lucide-react';

interface PlutoLoaderProps {
  label?: string;
  size?: 'md' | 'lg';
}

export function PlutoLoader({ label = '加载中…', size = 'md' }: PlutoLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`pluto-loader ${size === 'lg' ? 'pluto-loader--lg' : ''}`} aria-hidden="true">
        <div className="pluto-loader__planet">
          <span className="pluto-loader__ring" />
        </div>
        <div className="pluto-loader__orbit">
          <span className="pluto-loader__rocket">
            <Rocket size={size === 'lg' ? 16 : 14} strokeWidth={2.1} />
          </span>
        </div>
        <span className="pluto-loader__comet" />
      </div>
      <p className="text-sm text-[--color-text-muted]">{label}</p>
    </div>
  );
}

