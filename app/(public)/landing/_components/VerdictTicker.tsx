'use client';

import type React from 'react';

type Grade = 'DEFINITE' | 'PROBABLE' | 'POSSIBLE' | 'WEAK';
type Action = 'block' | 'review' | 'watch' | 'allow';

interface VerdictEntry {
  id: string;
  grade: Grade;
  score: number;
  signals: string[];
  action: Action;
}

const verdicts: VerdictEntry[] = [
  { id: '#u_kessler.07',    grade: 'DEFINITE', score: 0.94, signals: ['shared_card', 'shared_ip'],      action: 'block'  },
  { id: '#u_midform.13',    grade: 'PROBABLE', score: 0.81, signals: ['shared_email', 'name_variant'],  action: 'review' },
  { id: '#u_northrun.02',   grade: 'DEFINITE', score: 0.97, signals: ['shared_device', 'shared_card'],  action: 'block'  },
  { id: '#u_primeco.19',    grade: 'POSSIBLE', score: 0.58, signals: ['shared_ip', 'address_mismatch'], action: 'watch'  },
  { id: '#u_oakshelf.04',   grade: 'PROBABLE', score: 0.76, signals: ['shared_email', 'shared_card'],   action: 'review' },
  { id: '#u_bridleworks.11',grade: 'DEFINITE', score: 0.92, signals: ['shared_card', 'shared_device'],  action: 'block'  },
  { id: '#u_kessler.21',    grade: 'WEAK',     score: 0.38, signals: ['name_variant'],                  action: 'watch'  },
  { id: '#u_midform.05',    grade: 'DEFINITE', score: 0.89, signals: ['shared_ip', 'shared_email'],     action: 'block'  },
  { id: '#u_northrun.17',   grade: 'PROBABLE', score: 0.72, signals: ['shared_address', 'name_variant'],action: 'review' },
  { id: '#u_primeco.08',    grade: 'POSSIBLE', score: 0.51, signals: ['shared_ip'],                     action: 'watch'  },
  { id: '#u_oakshelf.33',   grade: 'DEFINITE', score: 0.96, signals: ['shared_card', 'shared_email', 'shared_device'], action: 'block' },
  { id: '#u_bridleworks.24',grade: 'PROBABLE', score: 0.68, signals: ['shared_email'],                  action: 'review' },
  { id: '#u_kessler.14',    grade: 'DEFINITE', score: 0.91, signals: ['shared_device', 'shared_ip'],    action: 'block'  },
  { id: '#u_midform.29',    grade: 'POSSIBLE', score: 0.44, signals: ['address_mismatch'],              action: 'watch'  },
  { id: '#u_northrun.06',   grade: 'PROBABLE', score: 0.83, signals: ['shared_card', 'name_variant'],   action: 'review' },
  { id: '#u_primeco.31',    grade: 'DEFINITE', score: 0.95, signals: ['shared_email', 'shared_card'],   action: 'block'  },
  { id: '#u_oakshelf.09',   grade: 'WEAK',     score: 0.31, signals: ['shared_ip'],                     action: 'allow'  },
  { id: '#u_bridleworks.16',grade: 'DEFINITE', score: 0.88, signals: ['shared_device', 'shared_email'], action: 'block'  },
  { id: '#u_kessler.38',    grade: 'PROBABLE', score: 0.77, signals: ['shared_card'],                   action: 'review' },
  { id: '#u_midform.42',    grade: 'POSSIBLE', score: 0.62, signals: ['shared_ip', 'name_variant'],     action: 'watch'  },
];

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-dm-mono, monospace)',
  fontSize: '12px',
  letterSpacing: '0.07em',
  color: '#C8BAA4',
};

function VerdictChip({ id, grade, score, signals, action }: VerdictEntry) {
  return (
    <span className="inline-flex shrink-0 items-center gap-[6px]" style={mono}>
      <span>{id}</span>
      <span style={{ opacity: 0.3 }}>·</span>
      <span>{grade}</span>
      <span style={{ opacity: 0.3 }}>·</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{score.toFixed(2)}</span>
      <span style={{ opacity: 0.3 }}>·</span>
      {signals.map((s, i) => (
        <span key={s}>{s}{i < signals.length - 1 ? ' ' : ''}</span>
      ))}
      <span style={{ opacity: 0.3 }}>·</span>
      <span>{action.toUpperCase()}</span>
    </span>
  );
}

export default function VerdictTicker() {
  const doubled = [...verdicts, ...verdicts];

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#15140F', borderTop: '1px solid rgba(248,245,238,0.08)', borderBottom: '1px solid rgba(248,245,238,0.08)' }}>
      <style>{`
        @keyframes ua-verdict-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ua-verdict-ticker {
          animation: ua-verdict-scroll 158s linear infinite;
          will-change: transform;
        }
        .ua-verdict-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ua-verdict-ticker flex items-center gap-8 py-[11px] w-max">
        {doubled.map((v, i) => (
          <VerdictChip key={`${v.id}-${i}`} {...v} />
        ))}
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#15140F] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#15140F] to-transparent" />
    </div>
  );
}
