'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DotPattern } from '@/components/ui/dot-pattern';

const SANS  = 'var(--font-dm-sans, sans-serif)';
const MONO  = 'var(--font-dm-mono, monospace)';
const SERIF = 'var(--font-serif, serif)';

const ACCENT     = '#7B2D26';
const ACCENT_FG  = '#F8F5EE';
const INK        = '#1A1814';
const INK_MUTED  = '#6B655C';
const INK_FAINT  = '#A09889';
const CREAM      = '#F5F1EA';
const CREAM_2    = '#EBE5D8';
const PAPER      = '#FFFFFF';
const LINE       = '#E5DFCF';
const LINE_FAINT = '#EFEADD';

const DWELL = 4200;

type TabId = 0 | 1 | 2 | 3;

const TABS = [
  {
    n: '01', label: 'Upload', t: '11ms',
    stat: '11', unit: 'ms', statSub: 'CSV parse latency',
    headline: 'No schema changes. No checkout work.',
    body: 'Upload orders, refunds, returns, and deliveries as CSV. The pipeline accepts your existing exports — no engineering team required.',
  },
  {
    n: '02', label: 'Hash', t: '4ms',
    stat: '0', unit: 'PII', statSub: 'fields transmitted to Unauth',
    headline: 'Sensitive fields stay in the browser.',
    body: 'Email, phone, address, and card references are HMAC-SHA256 hashed with a per-merchant salt before anything leaves your origin.',
  },
  {
    n: '03', label: 'Resolve', t: '17ms',
    stat: '7', unit: 'merchants', statSub: 'in the surfaced cluster',
    headline: 'Cross-merchant clusters surface in milliseconds.',
    body: 'Hashed signals resolve against the cross-merchant identity graph. Only clusters that clear the k ≥ 3 threshold surface as evidence.',
  },
  {
    n: '04', label: 'Case File', t: '6ms',
    stat: '0.92', unit: 'risk', statSub: 'DEFINITE verdict · CONF 0.96',
    headline: 'Scored verdict and evidence packet, ready to act on.',
    body: 'You get the risk score, cluster ID, fired signals, confidence grade, and an evidence packet — ready for review or dispute response.',
  },
] as const;

// ── Shared data ────────────────────────────────────────────────────────────────

const ROWS = [
  { id: '8723941', email: 'customer.a@examplemail.com',  addr: '91c2…f4', card: '••4419', amt: '$112.00', type: 'order'  },
  { id: '8723995', email: 'customer.a@examplemail.com',  addr: '91c2…f4', card: '••4419', amt: '$89.00',  type: 'refund' },
  { id: '8724002', email: 'customera91@example.com',     addr: '91c2…f4', card: '••4419', amt: '$67.00',  type: 'return' },
  { id: '8724111', email: 'customer.a91@example.com',    addr: '91c2…f4', card: '••4419', amt: '$213.00', type: 'order'  },
  { id: '8724302', email: 'customer.orders@example.net', addr: '91c2…f4', card: '••4419', amt: '$76.00',  type: 'order'  },
  { id: '8724418', email: 'customer.orders@example.net', addr: '91c2…f4', card: '••6671', amt: '$44.00',  type: 'refund' },
  { id: '8724501', email: 'customer.a@examplemail.com',  addr: '7e19…b2', card: '••4419', amt: '$158.00', type: 'order'  },
];

const HASHES = [
  'a4f7c2…e9d3', 'a4f7c2…e9d3', 'f3c891…22aa',
  '2b91ef…34a1', '9c3d8f…17b2', '9c3d8f…17b2', 'a4f7c2…e9d3',
];

const SIGNALS = [
  { l: 'refund_rate_over_60pct',       v: 0.92, hi: true  },
  { l: 'cross_merchant_inr_pattern',   v: 0.88, hi: true  },
  { l: 'shipping_address_variant',     v: 0.74, hi: true  },
  { l: 'denial_then_chargeback',       v: 0.68, hi: true  },
  { l: 'payment_fingerprint_match',    v: 0.64, hi: false },
  { l: 'multi_email_same_device',      v: 0.61, hi: false },
  { l: 'card_reuse_cross_merchant',    v: 0.57, hi: false },
  { l: 'velocity_72h_window',          v: 0.44, hi: false },
];

const EMAIL_VARIANTS = [
  { email: 'customer.a@examplemail.com',  seen: '7×', flags: 'primary · 3 merchants' },
  { email: 'customer.a91@example.com',    seen: '2×', flags: '2 merchants'           },
  { email: 'customer.orders@example.net', seen: '3×', flags: '2 merchants'           },
  { email: 'customera91@example.com',     seen: '1×', flags: 'variant'               },
];

const MERCHANTS = [
  { short: 'K', name: 'Kessler',     orders: 4, risk: 'HIGH'   },
  { short: 'M', name: 'Midform',     orders: 2, risk: 'HIGH'   },
  { short: 'N', name: 'Northrun',    orders: 1, risk: 'MED'    },
  { short: 'O', name: 'Oakshelf',    orders: 2, risk: 'HIGH'   },
  { short: 'B', name: 'Bridleworks', orders: 1, risk: 'MED'    },
  { short: 'P', name: 'Prime & Co',  orders: 1, risk: 'MED'    },
  { short: 'V', name: 'Vantage Co',  orders: 1, risk: 'WATCH'  },
];

// ── Shared chrome components ──────────────────────────────────────────────────

function ArtifactChrome({ left, right, accent = false }: { left: React.ReactNode; right: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      background: accent ? 'rgba(123,45,38,0.06)' : CREAM,
      borderBottom: `1px solid ${LINE}`,
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_MUTED }}>
        {left}
      </span>
      <span style={{ fontFamily: MONO, fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: accent ? ACCENT : INK_FAINT }}>
        {right}
      </span>
    </div>
  );
}

function ArtifactFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 20px', background: CREAM, borderTop: `1px solid ${LINE}`, flexShrink: 0 }}>
      {children}
    </div>
  );
}

function Pill({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' | 'faint' | 'green' | 'warn' }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: CREAM_2,              color: INK_MUTED,  border: `1px solid ${LINE}`                    },
    accent:  { background: ACCENT,               color: ACCENT_FG,  border: 'none'                                  },
    faint:   { background: 'transparent',         color: INK_FAINT,  border: `1px solid ${LINE}`                    },
    green:   { background: 'rgba(40,100,60,0.08)',color: '#2A5E3A',  border: '1px solid rgba(40,100,60,0.2)'        },
    warn:    { background: 'rgba(160,80,30,0.08)',color: '#8A4010',  border: '1px solid rgba(160,80,30,0.25)'       },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: MONO, fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 8px', ...styles[variant],
    }}>
      {children}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const color = type === 'refund' ? ACCENT : type === 'return' ? '#6B655C' : 'rgba(40,100,60,0.8)';
  return (
    <span style={{ fontFamily: MONO, fontSize: '9px', color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {type}
    </span>
  );
}

// ── Table (shared by Upload + Hash) ──────────────────────────────────────────

function DataTable({ hashP }: { hashP: number }) {
  return (
    <table style={{ fontFamily: MONO, fontSize: '11.5px', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '13%' }} />
        <col style={{ width: '8%'  }} />
        <col style={{ width: '34%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '20%' }} />
      </colgroup>
      <thead>
        <tr style={{ background: CREAM }}>
          {[
            { l: 'order_id',        sens: false },
            { l: 'type',            sens: false },
            { l: 'email',           sens: true  },
            { l: 'addr',            sens: false },
            { l: 'card',            sens: false },
            { l: 'total',           sens: false },
          ].map((h, ci) => (
            <th key={ci} style={{
              fontFamily: MONO, fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: 400, textAlign: 'left',
              padding: h.sens ? '11px 12px 11px 14px' : '11px 8px',
              color: h.sens ? ACCENT : INK_FAINT,
              borderLeft: h.sens ? `3px solid ${ACCENT}` : 'none',
              borderBottom: `1px solid ${LINE}`,
              whiteSpace: 'nowrap',
            }}>
              {h.l}
              {h.sens && (
                <span style={{ marginLeft: '6px', fontSize: '8px', background: 'rgba(123,45,38,0.08)', color: ACCENT, padding: '2px 5px' }}>
                  SENSITIVE
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row, ri) => {
          const threshold = (ri + 1) / ROWS.length * 0.88;
          const isHashed  = hashP >= threshold;
          const isActive  = !isHashed && hashP > threshold - 0.12 && hashP > 0;
          const hashing   = hashP > 0;
          return (
            <tr key={row.id} style={{
              borderBottom: `1px solid ${LINE_FAINT}`,
              background: isHashed && hashing ? 'rgba(123,45,38,0.025)' : 'transparent',
              transition: 'background 400ms',
            }}>
              <td style={{ padding: '12px 8px', color: INK_MUTED, fontVariantNumeric: 'tabular-nums', fontSize: '11px' }}>{row.id}</td>
              <td style={{ padding: '12px 8px' }}><TypeBadge type={row.type} /></td>
              <td style={{
                padding: '12px 14px',
                borderLeft: `3px solid ${isHashed && hashing ? ACCENT : 'rgba(123,45,38,0.15)'}`,
                color: isHashed && hashing ? ACCENT : isActive ? '#A85040' : INK,
                fontSize: '11px',
                transition: 'color 350ms, border-color 350ms',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {isHashed && hashing ? HASHES[ri] : isActive ? '· · · · · · ·' : row.email}
              </td>
              <td style={{ padding: '12px 8px', color: INK_MUTED, fontSize: '11px' }}>{row.addr}</td>
              <td style={{ padding: '12px 8px', color: INK_MUTED, fontSize: '11px' }}>{row.card}</td>
              <td style={{ padding: '12px 8px', color: INK, fontVariantNumeric: 'tabular-nums', fontSize: '11px' }}>{row.amt}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Upload artifact (tab 01) ──────────────────────────────────────────────────

function UploadArtifact() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ArtifactChrome
        left={<>orders_export.csv · 7 rows · 2.1 kb</>}
        right={<Pill variant="green">✓ PARSED</Pill>}
      />

      {/* File stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: `1px solid ${LINE_FAINT}`,
        background: 'rgba(245,241,234,0.5)',
      }}>
        {[
          { l: 'rows', v: '7' },
          { l: 'columns', v: '6' },
          { l: 'PII fields', v: '2' },
          { l: 'amount total', v: '$759' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderRight: i < 3 ? `1px solid ${LINE_FAINT}` : 'none',
          }}>
            <div style={{ fontFamily: SANS, fontSize: '15px', fontWeight: 500, color: INK, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {s.v}
            </div>
            <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_FAINT, marginTop: '3px' }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DataTable hashP={0} />
      </div>

      <ArtifactFooter>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_MUTED }}>
            2 PII fields identified (email, addr) · ready to hash
          </span>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_FAINT, letterSpacing: '0.06em' }}>
            NO DATA TRANSMITTED
          </span>
        </div>
      </ArtifactFooter>
    </div>
  );
}

// ── Hash artifact (tab 02) ────────────────────────────────────────────────────

function HashArtifact({ progress }: { progress: number }) {
  const counted = ROWS.filter((_, i) => progress >= (i + 1) / ROWS.length * 0.88).length;
  const hashing = progress > 0 && counted < ROWS.length;
  const done    = counted === ROWS.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ArtifactChrome
        left={<>hashing in browser · hmac-sha256 · per-merchant salt</>}
        right={
          done    ? <Pill variant="green">✓ COMPLETE</Pill>
          : hashing ? <Pill variant="accent">PROCESSING</Pill>
          :            <Pill variant="faint">PENDING</Pill>
        }
        accent={hashing}
      />

      {/* Scan progress bar */}
      <div style={{ height: '3px', background: LINE_FAINT, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        {progress > 0 && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: done ? 'rgba(40,100,60,0.6)' : ACCENT,
            transition: 'background 600ms',
          }} />
        )}
      </div>

      {/* Hash stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: `1px solid ${LINE_FAINT}`,
        background: 'rgba(245,241,234,0.5)',
      }}>
        {[
          { l: 'rows hashed',   v: `${counted}/${ROWS.length}` },
          { l: 'PII removed',   v: done ? '14' : `${counted * 2}` },
          { l: 'bytes sent',    v: '0' },
          { l: 'hash algo',     v: 'SHA-256' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderRight: i < 3 ? `1px solid ${LINE_FAINT}` : 'none',
          }}>
            <div style={{
              fontFamily: SANS, fontSize: '15px', fontWeight: 500,
              color: i === 2 ? (done ? '#2A5E3A' : INK) : INK,
              letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              transition: 'color 400ms',
            }}>
              {s.v}
            </div>
            <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_FAINT, marginTop: '3px' }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DataTable hashP={progress} />
      </div>

      <ArtifactFooter>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_MUTED }}>
            {done
              ? `${counted}/${ROWS.length} rows hashed · 0 bytes of PII transmitted`
              : hashing
              ? `hashing row ${counted + 1} of ${ROWS.length}…`
              : 'awaiting hash pass'}
          </span>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: done ? '#2A5E3A' : INK_FAINT, letterSpacing: '0.06em', transition: 'color 400ms' }}>
            {done ? '0 PII FIELDS SENT' : 'HMAC-SHA256'}
          </span>
        </div>
      </ArtifactFooter>
    </div>
  );
}

// ── Resolve artifact (tab 03) — pure SVG, no ReactFlow ────────────────────────

// Node layout: viewBox 680×370
// Central identity: center (340, 185), rect 150×80 → (265, 145, 150, 80)
// 7 merchant nodes: rect 110×36
const SVG_NODES = [
  { id: 'k', short: 'K', name: 'Kessler',     cx: 85,  cy: 75  },
  { id: 'm', short: 'M', name: 'Midform',      cx: 340, cy: 28  },
  { id: 'n', short: 'N', name: 'Northrun',     cx: 595, cy: 75  },
  { id: 'o', short: 'O', name: 'Oakshelf',     cx: 610, cy: 220 },
  { id: 'b', short: 'B', name: 'Bridleworks',  cx: 460, cy: 340 },
  { id: 'p', short: 'P', name: 'Prime & Co',   cx: 210, cy: 340 },
  { id: 'v', short: 'V', name: 'Vantage Co',   cx: 70,  cy: 230 },
];
const SVG_CX = 340, SVG_CY = 185; // central node center

function ResolveArtifact() {
  const [visNodes, setVisNodes] = useState<string[]>([]);
  const [visEdges, setVisEdges] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setVisNodes([]); setVisEdges([]); setResolved(false);
    const t = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    // Centre appears first
    t(() => setVisNodes(['c']), 80);
    SVG_NODES.forEach((n, i) => {
      t(() => {
        setVisNodes((p) => [...p, n.id]);
        setVisEdges((p) => [...p, n.id]);
      }, 400 + i * 240);
    });
    const allDone = 400 + SVG_NODES.length * 240 + 200;
    t(() => setResolved(true), allDone);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ArtifactChrome
        left={<>identity graph · cross-merchant lookup · k ≥ 3 gate</>}
        right={resolved ? <Pill variant="accent">RESOLVED</Pill> : <Pill variant="faint">LIVE</Pill>}
        accent={resolved}
      />

      {/* Cluster stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: `1px solid ${LINE_FAINT}`,
        background: 'rgba(245,241,234,0.5)',
      }}>
        {[
          { l: 'merchants', v: resolved ? '7' : visNodes.length > 0 ? String(visNodes.length - 1) : '–' },
          { l: 'cluster k',  v: resolved ? '7' : '–' },
          { l: 'signals matched', v: resolved ? '8' : '–' },
          { l: 'cluster id', v: resolved ? '#u_k.07' : '…' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderRight: i < 3 ? `1px solid ${LINE_FAINT}` : 'none',
            transition: 'opacity 300ms',
          }}>
            <div style={{ fontFamily: SANS, fontSize: '15px', fontWeight: 500, color: resolved ? INK : INK_FAINT, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, transition: 'color 400ms' }}>
              {s.v}
            </div>
            <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_FAINT, marginTop: '3px' }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* SVG graph */}
      <div style={{ flex: 1, position: 'relative', background: CREAM, overflow: 'hidden' }}>
        <svg
          viewBox="0 0 680 370"
          style={{ display: 'block', width: '100%', height: '100%' }}
          aria-label="Cross-merchant identity cluster graph"
        >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(123,45,38,0.5)" />
            </marker>
            <style>{`
              @keyframes ua-dash-flow {
                from { stroke-dashoffset: 20; }
                to   { stroke-dashoffset: 0; }
              }
              .ua-edge-line {
                animation: ua-dash-flow 1.2s linear infinite;
              }
            `}</style>
          </defs>

          {/* Edges */}
          {SVG_NODES.map((n) => {
            const visible = visEdges.includes(n.id);
            // Clip line endpoint at node rect edge (approximate)
            const dx = SVG_CX - n.cx;
            const dy = SVG_CY - n.cy;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / len; const ny = dy / len;
            // Merchant node half-extents: 55 wide, 18 tall
            const mhw = 55; const mhh = 18;
            const tMerch = Math.min(Math.abs(mhw / nx), Math.abs(mhh / ny));
            const x1 = n.cx + nx * tMerch;
            const y1 = n.cy + ny * tMerch;
            // Central node half-extents: 75 wide, 40 tall
            const chw = 75; const chh = 40;
            const tCentre = Math.min(Math.abs(chw / nx), Math.abs(chh / ny));
            const x2 = SVG_CX - nx * tCentre;
            const y2 = SVG_CY - ny * tCentre;
            return (
              <line
                key={n.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={ACCENT}
                strokeWidth="1.25"
                strokeDasharray="5 3"
                strokeOpacity={visible ? 0.55 : 0}
                className={visible ? 'ua-edge-line' : ''}
                style={{ transition: 'stroke-opacity 350ms' }}
              />
            );
          })}

          {/* Merchant nodes */}
          {SVG_NODES.map((n) => {
            const visible = visNodes.includes(n.id);
            return (
              <g key={n.id} style={{ opacity: visible ? 1 : 0, transition: 'opacity 350ms' }}>
                <rect
                  x={n.cx - 55} y={n.cy - 18} width={110} height={36}
                  fill={PAPER} stroke={LINE} strokeWidth="1"
                />
                <text
                  x={n.cx} y={n.cy - 3}
                  textAnchor="middle"
                  fill={INK_FAINT}
                  fontFamily={MONO}
                  fontSize="8.5"
                  letterSpacing="0.08em"
                  style={{ textTransform: 'uppercase' }}
                >
                  {n.short}
                </text>
                <text
                  x={n.cx} y={n.cy + 10}
                  textAnchor="middle"
                  fill={INK}
                  fontFamily={MONO}
                  fontSize="11"
                  letterSpacing="0.02em"
                >
                  {n.name}
                </text>
              </g>
            );
          })}

          {/* Central identity node */}
          <g style={{ opacity: visNodes.includes('c') ? 1 : 0, transition: 'opacity 500ms' }}>
            {resolved && (
              <rect
                x={SVG_CX - 82} y={SVG_CY - 44} width={164} height={88}
                fill="none" stroke={ACCENT} strokeWidth="1"
                strokeOpacity="0.2"
              />
            )}
            <rect
              x={SVG_CX - 75} y={SVG_CY - 38} width={150} height={76}
              fill={ACCENT}
              style={{
                filter: resolved ? 'drop-shadow(0 0 12px rgba(123,45,38,0.25))' : 'none',
                transition: 'filter 600ms',
              }}
            />
            <text x={SVG_CX} y={SVG_CY - 16} textAnchor="middle" fill="rgba(248,245,238,0.65)" fontFamily={MONO} fontSize="9" letterSpacing="0.1em">
              IDENTITY
            </text>
            <text x={SVG_CX} y={SVG_CY + 3} textAnchor="middle" fill={ACCENT_FG} fontFamily={MONO} fontSize="13" fontWeight="600" letterSpacing="0.02em">
              #u_kessler.07
            </text>
            {resolved && (
              <>
                <line x1={SVG_CX - 44} y1={SVG_CY + 12} x2={SVG_CX + 44} y2={SVG_CY + 12} stroke="rgba(248,245,238,0.25)" strokeWidth="1" />
                <text x={SVG_CX} y={SVG_CY + 28} textAnchor="middle" fill="rgba(248,245,238,0.75)" fontFamily={MONO} fontSize="10" letterSpacing="0.04em">
                  7 merchants seen
                </text>
              </>
            )}
          </g>

          {/* DEFINITE verdict chip (appears after resolve) */}
          {resolved && (
            <g>
              <rect x={502} y={300} width={162} height={50} fill={PAPER} stroke={LINE} strokeWidth="1" />
              <rect x={502} y={300} width={3} height={50} fill={ACCENT} />
              <text x={514} y={320} fill={ACCENT} fontFamily={MONO} fontSize="9.5" fontWeight="600" letterSpacing="0.1em">
                DEFINITE
              </text>
              <text x={514} y={336} fill={INK_FAINT} fontFamily={MONO} fontSize="9" letterSpacing="0.06em">
                RISK 0.92 · CONF 0.96
              </text>
              <text x={514} y={344} fill={INK_FAINT} fontFamily={MONO} fontSize="8" letterSpacing="0.04em">
                k = 7 · gate cleared
              </text>
            </g>
          )}
        </svg>
      </div>

      <ArtifactFooter>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: resolved ? INK_MUTED : INK_FAINT, transition: 'color 400ms' }}>
            {resolved ? '#u_kessler.07 · k = 7 · cleared k ≥ 3 threshold' : `resolving ${visNodes.length > 1 ? visNodes.length - 1 : 0} / ${SVG_NODES.length} merchants…`}
          </span>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_FAINT, letterSpacing: '0.06em' }}>17ms</span>
        </div>
      </ArtifactFooter>
    </div>
  );
}

// ── Case file artifact (tab 04) ───────────────────────────────────────────────

function CaseArtifact() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ArtifactChrome
        left={<>case file · output packet</>}
        right={<>UN-2026-05-20-0083</>}
        accent
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Verdict header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <span style={{
            fontFamily: MONO, fontSize: '10.5px', letterSpacing: '0.12em',
            background: ACCENT, color: ACCENT_FG, padding: '6px 12px',
            flexShrink: 0, alignSelf: 'flex-start',
          }}>DEFINITE</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: SANS, fontSize: '14px', fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>
                Noah K████
              </span>
              <span style={{ fontFamily: MONO, fontSize: '9.5px', color: INK_FAINT, letterSpacing: '0.06em' }}>→ #u_kessler.07</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Pill variant="faint">RISK 0.92</Pill>
              <Pill variant="faint">CONF 0.96</Pill>
              <Pill variant="faint">k = 7</Pill>
              <Pill variant="warn">8 / 12 signals</Pill>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.06em', color: INK_FAINT }}>generated</div>
            <div style={{ fontFamily: MONO, fontSize: '10px', color: INK_MUTED }}>09:42 EST</div>
          </div>
        </div>

        {/* Two-column: Signals + Email variants */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${LINE}` }}>
          {/* Signals */}
          <div style={{ padding: '16px 20px', borderRight: `1px solid ${LINE}` }}>
            <p style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', color: INK_FAINT, textTransform: 'uppercase', marginBottom: '12px' }}>
              Signals fired — 8 / 12
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {SIGNALS.map((s, i) => (
                <div key={s.l} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 32px', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: MONO, fontSize: '10px', color: s.hi ? INK : INK_MUTED,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.l}
                  </span>
                  <div style={{ height: '3px', background: CREAM_2, position: 'relative' }}>
                    <div
                      className="ua-signal-bar"
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${s.v * 100}%`,
                        background: s.hi ? ACCENT : 'rgba(123,45,38,0.3)',
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.hi ? INK : INK_MUTED }}>
                    {s.v.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: email variants + merchants */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Email variants */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}` }}>
              <p style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', color: INK_FAINT, textTransform: 'uppercase', marginBottom: '10px' }}>
                Email variants — 4 seen
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {EMAIL_VARIANTS.map((e) => (
                  <div key={e.email} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '9.5px', color: INK, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.email}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: '9px', color: INK_FAINT, flexShrink: 0 }}>{e.seen}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Network footprint mini-table */}
            <div style={{ padding: '14px 20px', flex: 1 }}>
              <p style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', color: INK_FAINT, textTransform: 'uppercase', marginBottom: '10px' }}>
                Merchant exposure
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {MERCHANTS.slice(0, 5).map((m) => (
                  <div key={m.short} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_MUTED }}>{m.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: '9.5px', color: INK_FAINT }}>{m.orders} orders</span>
                    <span style={{
                      fontFamily: MONO, fontSize: '8.5px', letterSpacing: '0.06em',
                      color: m.risk === 'HIGH' ? ACCENT : m.risk === 'MED' ? '#8A4010' : INK_FAINT,
                    }}>{m.risk}</span>
                  </div>
                ))}
                <span style={{ fontFamily: MONO, fontSize: '9px', color: INK_FAINT }}>+2 more merchants</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network footprint stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${LINE}` }}>
          {[
            { l: 'merchants', v: '7' },
            { l: 'cards seen', v: '4' },
            { l: 'total orders', v: '11' },
            { l: 'refund rate', v: '62%' },
          ].map((item, i) => (
            <div key={item.l} style={{
              padding: '14px 16px',
              borderRight: i < 3 ? `1px solid ${LINE}` : 'none',
            }}>
              <div style={{ fontFamily: SANS, fontSize: '20px', fontWeight: 500, color: INK, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
                {item.v}
              </div>
              <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_FAINT }}>
                {item.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence footer */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(123,45,38,0.04)',
        borderTop: `1px solid rgba(123,45,38,0.18)`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: MONO, fontSize: '10.5px', color: ACCENT, letterSpacing: '0.08em' }}>
          EVIDENCE PACKET → READY
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_FAINT }}>packet.pdf · 2.4 mb</span>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_FAINT }}>·</span>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_FAINT }}>sent to founders@kessler.com</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PipelineTabs() {
  const [active, setActive]     = useState<TabId>(0);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [fade, setFade]         = useState(true);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  const triggerFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFade(false);
    fadeTimer.current = setTimeout(() => setFade(true), 140);
  }, []);

  const advance = useCallback(() => {
    triggerFade();
    setActive((p) => ((p + 1) % 4) as TabId);
    setProgress(0);
    startRef.current = 0;
  }, [triggerFade]);

  useEffect(() => {
    if (paused) { cancelAnimationFrame(rafRef.current); return; }
    startRef.current = 0;
    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const p = Math.min((now - startRef.current) / DWELL, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else advance();
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, paused, advance]);

  function jumpTo(i: TabId) {
    if (i === active) return;
    cancelAnimationFrame(rafRef.current);
    triggerFade();
    setActive(i);
    setProgress(0);
    startRef.current = 0;
  }

  const tab  = TABS[active];
  const hashP = active === 1 ? progress : active > 1 ? 1 : 0;

  return (
    <section id="how-it-works" style={{ scrollMarginTop: '72px', background: CREAM, position: 'relative', overflow: 'hidden' }} className="ua-section-flow">
      <DotPattern
        width={36} height={36} cx={1} cy={1} cr={1}
        className="text-[#7B2D26] opacity-[0.07] [mask-image:radial-gradient(ellipse_70%_60%_at_80%_15%,white,transparent)]"
      />
      <DotPattern
        width={36} height={36} cx={1} cy={1} cr={1}
        className="text-[#7B2D26] opacity-[0.05] [mask-image:radial-gradient(ellipse_60%_50%_at_15%_90%,white,transparent)]"
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-24">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{
            fontFamily: MONO, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '20px',
          }}>
            § 2 — The Pipeline
          </p>
          <h2 style={{
            fontFamily: SANS, fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 500, letterSpacing: '-0.028em', lineHeight: 1.05,
            color: INK, marginBottom: '18px', maxWidth: '780px',
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            CSV in.{' '}
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, color: INK_MUTED }}>
              Actionable cases out.
            </span>
          </h2>
          <p style={{
            fontFamily: SERIF, fontSize: 'clamp(15px, 1.15vw, 18px)',
            color: INK_MUTED, lineHeight: 1.55, margin: 0,
            maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Hash sensitive fields in the browser. Get scored clusters, signals, and case files back — in 38ms, end-to-end.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          background: CREAM_2, padding: '4px',
          marginBottom: '0',
          border: `1px solid ${LINE}`, borderBottom: 'none',
        }}>
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume' : 'Pause'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', flexShrink: 0,
              background: 'transparent', border: 'none', cursor: 'pointer', color: INK_MUTED,
            }}
          >
            {paused ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M1 1l8 5-8 5V1z" fill="currentColor"/></svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><rect x="1" y="1" width="2.5" height="10" fill="currentColor"/><rect x="6.5" y="1" width="2.5" height="10" fill="currentColor"/></svg>
            )}
          </button>

          {TABS.map((t, i) => {
            const on = active === i;
            return (
              <button
                key={t.n}
                onClick={() => jumpTo(i as TabId)}
                style={{
                  position: 'relative', flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
                  gap: '2px', padding: '14px 18px',
                  background: on ? PAPER : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 200ms', overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', width: '100%' }}>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: on ? ACCENT : INK_FAINT, letterSpacing: '0.06em' }}>
                    {t.n}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: '14px', fontWeight: on ? 600 : 500, color: on ? INK : INK_MUTED, letterSpacing: '-0.005em' }}>
                    {t.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: '10px', color: on ? INK_MUTED : INK_FAINT, fontVariantNumeric: 'tabular-nums' }}>
                    {t.t}
                  </span>
                </div>
                {on && !paused && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: '3px', width: `${progress * 100}%`,
                    background: ACCENT, transition: 'none',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div
          className="ua-glass-card"
          style={{
            background: 'rgba(253, 251, 246, 0.91)',
            border: '1px solid #D8D0BD',
            padding: '48px',
            minHeight: '640px',
            boxShadow: '0 1px 0 #D8D0BD, 0 22px 54px -26px rgba(26,24,20,0.18), 0 44px 96px -48px rgba(123,45,38,0.12)',
            backdropFilter: 'saturate(132%) blur(12px)',
            WebkitBackdropFilter: 'saturate(132%) blur(12px)',
          }}
        >
          <div
            style={{
              opacity: fade ? 1 : 0,
              transition: 'opacity 140ms',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.55fr)',
              gap: '64px',
              alignItems: 'stretch',
              minHeight: '540px',
            }}
            className="ua-pipeline-grid"
          >
            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: SANS, fontSize: 'clamp(56px, 6.5vw, 92px)',
                  fontWeight: 500, letterSpacing: '-0.045em',
                  color: INK, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums',
                }}>
                  {tab.stat}
                </span>
                <span style={{ fontFamily: SANS, fontSize: '18px', fontWeight: 400, color: INK_MUTED, letterSpacing: '-0.01em' }}>
                  {tab.unit}
                </span>
              </div>
              <p style={{ fontFamily: MONO, fontSize: '11px', color: INK_FAINT, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '24px' }}>
                {tab.statSub}
              </p>
              <div style={{ height: '1px', background: LINE, marginBottom: '24px' }} />
              <h3 style={{ fontFamily: SANS, fontSize: 'clamp(22px, 2vw, 28px)', fontWeight: 500, letterSpacing: '-0.018em', lineHeight: 1.15, color: INK, marginBottom: '16px' }}>
                {tab.headline}
              </h3>
              <p style={{ fontFamily: SERIF, fontSize: '16px', lineHeight: 1.6, color: INK_MUTED, marginBottom: '24px', maxWidth: '460px' }}>
                {tab.body}
              </p>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: MONO, fontSize: '10px', color: INK_FAINT, letterSpacing: '0.1em' }}>STEP {tab.n} / 04</span>
                <div style={{ display: 'inline-flex', gap: '4px' }}>
                  {TABS.map((_, i) => (
                    <span key={i} style={{
                      width: i === active ? '20px' : '8px', height: '2px',
                      background: i === active ? ACCENT : LINE,
                      transition: 'width 250ms, background 250ms',
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — artifact */}
            <div
              key={active}
              className="ua-artifact-enter"
              style={{
                background: PAPER,
                border: '1px solid #D8D0BD',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '540px',
                boxShadow: '0 1px 0 rgba(216,208,189,0.6), 0 12px 30px -18px rgba(26,24,20,0.18)',
              }}
            >
              {active === 0 && <UploadArtifact />}
              {active === 1 && <HashArtifact progress={hashP} />}
              {active === 2 && <ResolveArtifact />}
              {active === 3 && <CaseArtifact />}
            </div>
          </div>
        </div>

        {/* ── § 6 — Data Schema ──────────────────────────────────── */}
        <div style={{ marginTop: '64px' }}>
          <div style={{ marginBottom: '28px' }}>
            <p style={{
              fontFamily: MONO, fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: ACCENT, marginBottom: '12px',
            }}>
              § 6 — Data Schema
            </p>
            <h2 style={{
              fontFamily: SANS, fontSize: 'clamp(24px, 2.4vw, 36px)',
              fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05,
              color: INK, marginBottom: '10px', maxWidth: '760px',
            }}>
              Use data you already have.
            </h2>
            <p style={{
              fontFamily: SERIF, fontSize: 'clamp(14px, 1.05vw, 16px)',
              color: INK_MUTED, lineHeight: 1.55, maxWidth: '560px', margin: 0,
            }}>
              Standard order, refund, return, delivery, and payment exports. No integration required.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#D8D0BD', border: '1px solid #D8D0BD' }} className="ua-schema-grid">
            {/* Required fields */}
            <div
              className="ua-glass-card ua-schema-required"
              style={{ background: 'rgba(253, 251, 246, 0.92)', padding: '22px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: ACCENT, margin: 0 }}>
                  REQUIRED — CORE FIELDS (24)
                </p>
                <span style={{ fontFamily: MONO, fontSize: '10.5px', color: INK_FAINT, letterSpacing: '0.06em' }}>
                  shopify · woocommerce · custom OMS · stripe
                </span>
              </div>
              <div
                className="ua-schema-fields"
                style={{ fontFamily: MONO, fontSize: '12px', color: INK_MUTED, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 16px' }}
              >
                {[
                  'order_id', 'order_date', 'customer_id', 'email',
                  'phone', 'shipping_name', 'shipping_address', 'shipping_postcode',
                  'billing_name', 'billing_address', 'billing_postcode', 'order_value',
                  'item_count', 'sku / category', 'payment_method', 'card_bin',
                  'card_last4', 'refund_requested', 'refund_reason', 'return_reason',
                  'chargeback_status', 'carrier', 'tracking_number', 'delivery_status',
                ].map((f) => (
                  <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: 3, height: 3, background: ACCENT, display: 'inline-block', borderRadius: '50%', flexShrink: 0 }} />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Optional fields */}
            <div
              className="ua-glass-card"
              style={{ background: 'rgba(253, 251, 246, 0.92)', padding: '22px 24px' }}
            >
              <p style={{ fontFamily: MONO, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_MUTED, marginBottom: '14px' }}>
                OPTIONAL — ENRICHMENT
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 16px', fontFamily: MONO, fontSize: '12px', color: INK_MUTED, marginBottom: '16px' }} className="ua-schema-opt-fields">
                {[
                  'ip_address', 'device_fingerprint', 'payment_fingerprint',
                  'browser_fingerprint', 'delivery_photo_metadata', 'courier_gps_proof',
                ].map((f) => (
                  <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: 3, height: 3, background: INK_FAINT, display: 'inline-block', borderRadius: '50%', flexShrink: 0 }} />
                    {f}
                  </span>
                ))}
              </div>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '13px', color: INK_FAINT, lineHeight: 1.5, margin: 0 }}>
                Improves resolution for clusters where email + address alone don&rsquo;t meet the DEFINITE threshold.
              </p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .ua-pipeline-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ua-schema-fields { grid-template-columns: repeat(2, 1fr) !important; }
          .ua-schema-opt-fields { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .ua-schema-fields { grid-template-columns: 1fr !important; }
          .ua-schema-opt-fields { grid-template-columns: 1fr !important; }
        }
        @keyframes ua-artifact-enter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ua-artifact-enter {
          animation: ua-artifact-enter 360ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        @keyframes ua-bar-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .ua-signal-bar {
          transform-origin: left center;
          animation: ua-bar-grow 700ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
      `}</style>
    </section>
  );
}
