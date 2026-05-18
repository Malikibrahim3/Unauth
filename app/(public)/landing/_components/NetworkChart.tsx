const data = [
  { week: 'W01', clusters: 612,  abusers: 92  },
  { week: 'W02', clusters: 894,  abusers: 154 },
  { week: 'W03', clusters: 1180, abusers: 233 },
  { week: 'W04', clusters: 1672, abusers: 361 },
  { week: 'W05', clusters: 2244, abusers: 502 },
  { week: 'W06', clusters: 3018, abusers: 689 },
  { week: 'W07', clusters: 3994, abusers: 921 },
  { week: 'W08', clusters: 5210, abusers: 1188 },
  { week: 'W09', clusters: 6612, abusers: 1502 },
  { week: 'W10', clusters: 8344, abusers: 1879 },
  { week: 'W11', clusters: 10298, abusers: 2398 },
  { week: 'W12', clusters: 12484, abusers: 3107 },
];

const chart = {
  width: 920,
  height: 260,
  left: 58,
  right: 24,
  top: 24,
  bottom: 38,
  maxValue: 13000,
};

function xPosition(index: number) {
  const drawableWidth = chart.width - chart.left - chart.right;
  return chart.left + (drawableWidth * index) / (data.length - 1);
}

function yPosition(value: number) {
  const drawableHeight = chart.height - chart.top - chart.bottom;
  return chart.top + drawableHeight - (value / chart.maxValue) * drawableHeight;
}

function linePath(key: 'clusters' | 'abusers') {
  return data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xPosition(index).toFixed(1)} ${yPosition(point[key]).toFixed(1)}`)
    .join(' ');
}

function formatTick(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

export default function NetworkChart() {
  const tickValues = [0, 3000, 6000, 9000, 12000];
  const clusterPath = linePath('clusters');
  const abuserPath = linePath('abusers');

  return (
    <div
      style={{
        border: '1px solid #2B2922',
        background: '#0F0E0B',
        padding: '20px 16px 8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#8A8472',
            margin: 0,
          }}
        >
          ILLUSTRATIVE · PROJECTED 12-WEEK WINDOW
        </p>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '11px',
            color: '#A59F8E',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 1, background: '#E8E4D8', display: 'inline-block' }} />
            identity clusters
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 1, background: '#B6512A', display: 'inline-block' }} />
            network-known abusers
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Projected identity clusters and network-known abusers over 12 weeks" style={{ display: 'block', width: '100%', height: 240 }}>
        <defs>
          <linearGradient id="cluster-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#8A8472" />
            <stop offset="100%" stopColor="#E8E4D8" />
          </linearGradient>
          <linearGradient id="abuser-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#7B2D26" />
            <stop offset="100%" stopColor="#D67448" />
          </linearGradient>
          <linearGradient id="cluster-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#E8E4D8" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#E8E4D8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="abuser-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#B6512A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#B6512A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {tickValues.map((value) => {
          const tickY = yPosition(value);
          return (
            <g key={value}>
              <line x1={chart.left} x2={chart.width - chart.right} y1={tickY} y2={tickY} stroke="#2B2922" strokeWidth="1" />
              <text x={chart.left - 12} y={tickY + 4} textAnchor="end" fill="#8A8472" fontFamily="var(--font-dm-mono, monospace)" fontSize="11">
                {formatTick(value)}
              </text>
            </g>
          );
        })}

        {data.filter((_, index) => index % 2 === 0).map((point, index) => {
          const dataIndex = index * 2;
          const tickX = xPosition(dataIndex);
          return (
            <text key={point.week} x={tickX} y={chart.height - 10} textAnchor="middle" fill="#8A8472" fontFamily="var(--font-dm-mono, monospace)" fontSize="11">
              {point.week}
            </text>
          );
        })}

        <path d={`${clusterPath} L ${xPosition(data.length - 1).toFixed(1)} ${chart.height - chart.bottom} L ${chart.left} ${chart.height - chart.bottom} Z`} fill="url(#cluster-area)" />
        <path d={`${abuserPath} L ${xPosition(data.length - 1).toFixed(1)} ${chart.height - chart.bottom} L ${chart.left} ${chart.height - chart.bottom} Z`} fill="url(#abuser-area)" />

        <path className="ua-draw" d={clusterPath} fill="none" stroke="url(#cluster-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ ['--ua-line-len' as string]: 1200, ['--ua-draw-delay' as string]: '120ms' }} />
        <path className="ua-draw" d={abuserPath} fill="none" stroke="url(#abuser-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ ['--ua-line-len' as string]: 1200, ['--ua-draw-delay' as string]: '260ms' }} />

        {[data[4], data[8], data[11]].map((point) => (
          <circle key={point.week} cx={xPosition(data.indexOf(point))} cy={yPosition(point.clusters)} r="3.5" fill="#E8E4D8" />
        ))}
        {[data[5], data[9], data[11]].map((point) => (
          <circle key={point.week} cx={xPosition(data.indexOf(point))} cy={yPosition(point.abusers)} r="3.5" fill="#B6512A" />
        ))}
      </svg>
    </div>
  );
}
