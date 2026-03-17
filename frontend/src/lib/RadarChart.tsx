import type { FC } from 'react';

interface RadarChartProps {
  values?: number[];
  className?: string;
}

const DEFAULT_LABELS = ['感性', '话痨', '好奇', '主动', '理性'];

export const RadarChart: FC<RadarChartProps> = ({ values = [60, 75, 45, 80, 55], className = '' }) => {
  const labels = DEFAULT_LABELS;
  const center = 65;
  const radius = 48;
  
  const toXY = (angle: number, dist: number) => ({
    x: center + dist * Math.sin(angle),
    y: center - dist * Math.cos(angle),
  });
  
  const angles = labels.map((_, i) => (i / labels.length) * Math.PI * 2);
  const dataPoints = values.map((v, i) => toXY(angles[i], (v / 100) * radius));
  const gridPoints = (scale: number) => angles.map(a => toXY(a, radius * scale));
  const toPolyStr = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 130 130" className={className} style={{ width: '100%', maxWidth: 200 }}>
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon 
          key={s} 
          points={toPolyStr(gridPoints(s))}
          fill="none" 
          stroke="#E5E2DC" 
          strokeWidth={0.8} 
        />
      ))}
      {angles.map((a, i) => {
        const end = toXY(a, radius);
        return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#E5E2DC" strokeWidth={0.8} />;
      })}
      <polygon 
        points={toPolyStr(dataPoints)}
        fill="rgba(234, 120, 80, 0.18)" 
        stroke="#EA7850" 
        strokeWidth={1.5} 
      />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#EA7850" />)}
      {labels.map((label, i) => {
        const pt = toXY(angles[i], radius + 12);
        return (
          <text 
            key={i} 
            x={pt.x} 
            y={pt.y} 
            textAnchor="middle" 
            dominantBaseline="middle"
            fontSize="7.5" 
            fill="#888" 
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};
