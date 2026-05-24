'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DotPattern } from '@/components/ui/dot-pattern';
import { t } from '../_tokens';

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

type ArtifactEntry = {
  src: string;
  alt: string;
  w: number;
  h: number;
  crop?: { top: number; left: number };
};

const SCREENSHOT_ARTIFACTS: ArtifactEntry[] = [
  {
    src: '/screenshots/upload.png',
    alt: 'Unauth new audit upload page — drag and drop CSV export with step-by-step format guidance',
    w: 2400, h: 900,
  },
  {
    src: '/screenshots/hash-demo.png',
    alt: 'Unauth new audit hash step — email and phone fields transforming to HMAC-SHA256 hashes before transmission',
    w: 2880, h: 1800,
    // crop sidebar (~455px) and top nav bar (~160px) from the full-app screenshot
    crop: { top: 58, left: 165 },
  },
  {
    src: '/screenshots/customers-clusters.png',
    alt: 'Unauth customers clusters view with cross-merchant identity matches, confidence grades, and network links',
    w: 2400, h: 1060,
  },
  {
    src: '/screenshots/case-file-full.png',
    alt: 'Unauth customer case file showing DEFINITE verdict, CONF 0.99, signal strength, behaviour roadmap and merchant dossier',
    w: 2400, h: 1200,
  },
];

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
      background: accent ? 'rgba(123,45,38,0.06)' : t.cream,
      borderBottom: `1px solid ${t.line}`,
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: t.mono, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.inkMuted }}>
        {left}
      </span>
      <span style={{ fontFamily: t.mono, fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: accent ? t.accent : t.inkFaint }}>
        {right}
      </span>
    </div>
  );
}

function ArtifactFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 20px', background: t.cream, borderTop: `1px solid ${t.line}`, flexShrink: 0 }}>
      {children}
    </div>
  );
}

function ScreenshotArtifact({ artifact }: { artifact: ArtifactEntry }) {
  const { crop } = artifact;
  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      {crop ? (
        // Crop wrapper shifts image up/left to hide nav bar and sidebar.
        // height: calc(100% + top) ensures objectFit:cover fills the panel after the offset.
        // objectPosition 16% shifts right ~22px in rendered coords, clearing the sidebar edge.
        <div style={{
          position: 'absolute',
          top: `-${crop.top}px`,
          left: `-${crop.left}px`,
          width: `calc(100% + ${crop.left}px)`,
          height: `calc(100% + ${crop.top}px)`,
        }}>
          <img
            src={artifact.src}
            alt={artifact.alt}
            loading="lazy"
            width={artifact.w}
            height={artifact.h}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '16% 0%' }}
          />
        </div>
      ) : (
        <img
          src={artifact.src}
          alt={artifact.alt}
          loading="lazy"
          width={artifact.w}
          height={artifact.h}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
        />
      )}
      {/* Bottom fade — blends into panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '30%',
        background: `linear-gradient(to bottom, transparent, ${t.screenshotBg})`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function Pill({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' | 'faint' | 'green' | 'warn' }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: t.cream2,   color: t.inkMuted,  border: `1px solid ${t.line}`                    },
    accent:  { background: t.accent,   color: t.accentFg,  border: 'none'                                    },
    faint:   { background: 'transparent', color: t.inkFaint, border: `1px solid ${t.line}`                   },
    green:   { background: t.greenBg,  color: t.greenFg,   border: '1px solid rgba(40,100,60,0.2)'          },
    warn:    { background: t.warnBg,   color: t.warnFg,    border: '1px solid rgba(160,80,30,0.25)'         },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: t.mono, fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 8px', ...styles[variant],
    }}>
      {children}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const color = type === 'refund' ? t.accent : type === 'return' ? t.inkMuted : 'rgba(40,100,60,0.8)';
  return (
    <span style={{ fontFamily: t.mono, fontSize: '9px', color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {type}
    </span>
  );
}

// ── Table (shared by Upload + Hash) ──────────────────────────────────────────

function DataTable({ hashP }: { hashP: number }) {
  return (
    <table style={{ fontFamily: t.mono, fontSize: '11.5px', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '13%' }} />
        <col style={{ width: '8%'  }} />
        <col style={{ width: '34%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '20%' }} />
      </colgroup>
      <thead>
        <tr style={{ background: t.cream }}>
          {[
            { l: 'order_id',        sens: false },
            { l: 'type',            sens: false },
            { l: 'email',           sens: true  },
            { l: 'addr',            sens: false },
            { l: 'card',            sens: false },
            { l: 'total',           sens: false },
          ].map((h, ci) => (
            <th key={ci} style={{
              fontFamily: t.mono, fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: 400, textAlign: 'left',
              padding: h.sens ? '11px 12px 11px 14px' : '11px 8px',
              color: h.sens ? t.accent : t.inkFaint,
              borderLeft: h.sens ? `3px solid ${t.accent}` : 'none',
              borderBottom: `1px solid ${t.line}`,
              whiteSpace: 'nowrap',
            }}>
              {h.l}
              {h.sens && (
                <span style={{ marginLeft: '6px', fontSize: '8px', background: 'rgba(123,45,38,0.08)', color: t.accent, padding: '2px 5px' }}>
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
              borderBottom: `1px solid ${t.lineFaint}`,
              background: isHashed && hashing ? 'rgba(123,45,38,0.025)' : 'transparent',
              transition: 'background 400ms',
            }}>
              <td style={{ padding: '12px 8px', color: t.inkMuted, fontVariantNumeric: 'tabular-nums', fontSize: '11px' }}>{row.id}</td>
              <td style={{ padding: '12px 8px' }}><TypeBadge type={row.type} /></td>
              <td style={{
                padding: '12px 14px',
                borderLeft: `3px solid ${isHashed && hashing ? t.accent : 'rgba(123,45,38,0.15)'}`,
                color: isHashed && hashing ? t.accent : isActive ? t.accentDark : t.ink,
                fontSize: '11px',
                transition: 'color 350ms, border-color 350ms',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {isHashed && hashing ? HASHES[ri] : isActive ? '· · · · · · ·' : row.email}
              </td>
              <td style={{ padding: '12px 8px', color: t.inkMuted, fontSize: '11px' }}>{row.addr}</td>
              <td style={{ padding: '12px 8px', color: t.inkMuted, fontSize: '11px' }}>{row.card}</td>
              <td style={{ padding: '12px 8px', color: t.ink, fontVariantNumeric: 'tabular-nums', fontSize: '11px' }}>{row.amt}</td>
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
        borderBottom: `1px solid ${t.lineFaint}`,
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
            borderRight: i < 3 ? `1px solid ${t.lineFaint}` : 'none',
          }}>
            <div style={{ fontFamily: t.sans, fontSize: '15px', fontWeight: 500, color: t.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {s.v}
            </div>
            <div style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.inkFaint, marginTop: '3px' }}>
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
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkMuted }}>
            2 PII fields identified (email, addr) · ready to hash
          </span>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkFaint, letterSpacing: '0.06em' }}>
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
      <div style={{ height: '3px', background: t.lineFaint, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        {progress > 0 && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: done ? 'rgba(40,100,60,0.6)' : t.accent,
            transition: 'background 600ms',
          }} />
        )}
      </div>

      {/* Hash stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: `1px solid ${t.lineFaint}`,
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
            borderRight: i < 3 ? `1px solid ${t.lineFaint}` : 'none',
          }}>
            <div style={{
              fontFamily: t.sans, fontSize: '15px', fontWeight: 500,
              color: i === 2 ? (done ? t.greenFg : t.ink) : t.ink,
              letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              transition: 'color 400ms',
            }}>
              {s.v}
            </div>
            <div style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.inkFaint, marginTop: '3px' }}>
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
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkMuted }}>
            {done
              ? `${counted}/${ROWS.length} rows hashed · 0 bytes of PII transmitted`
              : hashing
              ? `hashing row ${counted + 1} of ${ROWS.length}…`
              : 'awaiting hash pass'}
          </span>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: done ? t.greenFg : t.inkFaint, letterSpacing: '0.06em', transition: 'color 400ms' }}>
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
        borderBottom: `1px solid ${t.lineFaint}`,
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
            borderRight: i < 3 ? `1px solid ${t.lineFaint}` : 'none',
            transition: 'opacity 300ms',
          }}>
            <div style={{ fontFamily: t.sans, fontSize: '15px', fontWeight: 500, color: resolved ? t.ink : t.inkFaint, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, transition: 'color 400ms' }}>
              {s.v}
            </div>
            <div style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.inkFaint, marginTop: '3px' }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* SVG graph */}
      <div style={{ flex: 1, position: 'relative', background: t.cream, overflow: 'hidden' }}>
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
                stroke={t.accent}
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
                  fill={t.paper} stroke={t.line} strokeWidth="1"
                />
                <text
                  x={n.cx} y={n.cy - 3}
                  textAnchor="middle"
                  fill={t.inkFaint}
                  fontFamily={t.mono}
                  fontSize="8.5"
                  letterSpacing="0.08em"
                  style={{ textTransform: 'uppercase' }}
                >
                  {n.short}
                </text>
                <text
                  x={n.cx} y={n.cy + 10}
                  textAnchor="middle"
                  fill={t.ink}
                  fontFamily={t.mono}
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
                fill="none" stroke={t.accent} strokeWidth="1"
                strokeOpacity="0.2"
              />
            )}
            <rect
              x={SVG_CX - 75} y={SVG_CY - 38} width={150} height={76}
              fill={t.accent}
              style={{
                filter: resolved ? 'drop-shadow(0 0 12px rgba(123,45,38,0.25))' : 'none',
                transition: 'filter 600ms',
              }}
            />
            <text x={SVG_CX} y={SVG_CY - 16} textAnchor="middle" fill="rgba(248,245,238,0.65)" fontFamily={t.mono} fontSize="9" letterSpacing="0.1em">
              IDENTITY
            </text>
            <text x={SVG_CX} y={SVG_CY + 3} textAnchor="middle" fill={t.accentFg} fontFamily={t.mono} fontSize="13" fontWeight="600" letterSpacing="0.02em">
              #u_kessler.07
            </text>
            {resolved && (
              <>
                <line x1={SVG_CX - 44} y1={SVG_CY + 12} x2={SVG_CX + 44} y2={SVG_CY + 12} stroke="rgba(248,245,238,0.25)" strokeWidth="1" />
                <text x={SVG_CX} y={SVG_CY + 28} textAnchor="middle" fill="rgba(248,245,238,0.75)" fontFamily={t.mono} fontSize="10" letterSpacing="0.04em">
                  7 merchants seen
                </text>
              </>
            )}
          </g>

          {/* DEFINITE verdict chip (appears after resolve) */}
          {resolved && (
            <g>
              <rect x={502} y={300} width={162} height={50} fill={t.paper} stroke={t.line} strokeWidth="1" />
              <rect x={502} y={300} width={3} height={50} fill={t.accent} />
              <text x={514} y={320} fill={t.accent} fontFamily={t.mono} fontSize="9.5" fontWeight="600" letterSpacing="0.1em">
                DEFINITE
              </text>
              <text x={514} y={336} fill={t.inkFaint} fontFamily={t.mono} fontSize="9" letterSpacing="0.06em">
                RISK 0.92 · CONF 0.96
              </text>
              <text x={514} y={344} fill={t.inkFaint} fontFamily={t.mono} fontSize="8" letterSpacing="0.04em">
                k = 7 · gate cleared
              </text>
            </g>
          )}
        </svg>
      </div>

      <ArtifactFooter>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: resolved ? t.inkMuted : t.inkFaint, transition: 'color 400ms' }}>
            {resolved ? '#u_kessler.07 · k = 7 · cleared k ≥ 3 threshold' : `resolving ${visNodes.length > 1 ? visNodes.length - 1 : 0} / ${SVG_NODES.length} merchants…`}
          </span>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkFaint, letterSpacing: '0.06em' }}>17ms</span>
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
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.line}`, display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <span style={{
            fontFamily: t.mono, fontSize: '10.5px', letterSpacing: '0.12em',
            background: t.accent, color: t.accentFg, padding: '6px 12px',
            flexShrink: 0, alignSelf: 'flex-start',
          }}>DEFINITE</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: t.sans, fontSize: '14px', fontWeight: 600, color: t.ink, letterSpacing: '-0.01em' }}>
                Noah K████
              </span>
              <span style={{ fontFamily: t.mono, fontSize: '9.5px', color: t.inkFaint, letterSpacing: '0.06em' }}>→ #u_kessler.07</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Pill variant="faint">RISK 0.92</Pill>
              <Pill variant="faint">CONF 0.96</Pill>
              <Pill variant="faint">k = 7</Pill>
              <Pill variant="warn">8 / 12 signals</Pill>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.06em', color: t.inkFaint }}>generated</div>
            <div style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkMuted }}>09:42 EST</div>
          </div>
        </div>

        {/* Two-column: Signals + Email variants */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${t.line}` }}>
          {/* Signals */}
          <div style={{ padding: '16px 20px', borderRight: `1px solid ${t.line}` }}>
            <p style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.12em', color: t.inkFaint, textTransform: 'uppercase', marginBottom: '12px' }}>
              Signals fired — 8 / 12
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {SIGNALS.map((s, i) => (
                <div key={s.l} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 32px', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: t.mono, fontSize: '10px', color: s.hi ? t.ink : t.inkMuted,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.l}
                  </span>
                  <div style={{ height: '3px', background: t.cream2, position: 'relative' }}>
                    <div
                      className="ua-signal-bar"
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${s.v * 100}%`,
                        background: s.hi ? t.accent : 'rgba(123,45,38,0.3)',
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: t.mono, fontSize: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.hi ? t.ink : t.inkMuted }}>
                    {s.v.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: email variants + merchants */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Email variants */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.line}` }}>
              <p style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.12em', color: t.inkFaint, textTransform: 'uppercase', marginBottom: '10px' }}>
                Email variants — 4 seen
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {EMAIL_VARIANTS.map((e) => (
                  <div key={e.email} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: t.mono, fontSize: '9.5px', color: t.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.email}
                    </span>
                    <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkFaint, flexShrink: 0 }}>{e.seen}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Network footprint mini-table */}
            <div style={{ padding: '14px 20px', flex: 1 }}>
              <p style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.12em', color: t.inkFaint, textTransform: 'uppercase', marginBottom: '10px' }}>
                Merchant exposure
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {MERCHANTS.slice(0, 5).map((m) => (
                  <div key={m.short} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkMuted }}>{m.name}</span>
                    <span style={{ fontFamily: t.mono, fontSize: '9.5px', color: t.inkFaint }}>{m.orders} orders</span>
                    <span style={{
                      fontFamily: t.mono, fontSize: '8.5px', letterSpacing: '0.06em',
                      color: m.risk === 'HIGH' ? t.accent : m.risk === 'MED' ? t.warnFg : t.inkFaint,
                    }}>{m.risk}</span>
                  </div>
                ))}
                <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkFaint }}>+2 more merchants</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network footprint stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${t.line}` }}>
          {[
            { l: 'merchants', v: '7' },
            { l: 'cards seen', v: '4' },
            { l: 'total orders', v: '11' },
            { l: 'refund rate', v: '62%' },
          ].map((item, i) => (
            <div key={item.l} style={{
              padding: '14px 16px',
              borderRight: i < 3 ? `1px solid ${t.line}` : 'none',
            }}>
              <div style={{ fontFamily: t.sans, fontSize: '20px', fontWeight: 500, color: t.ink, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
                {item.v}
              </div>
              <div style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.inkFaint }}>
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
        <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.accent, letterSpacing: '0.08em' }}>
          EVIDENCE PACKET → READY
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkFaint }}>packet.pdf · 2.4 mb</span>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkFaint }}>·</span>
          <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkFaint }}>sent to founders@kessler.com</span>
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
    <section id="how-it-works" style={{ scrollMarginTop: '72px', background: t.cream, position: 'relative', overflow: 'hidden' }} className="ua-section-flow">
      <DotPattern
        width={36} height={36} cx={1} cy={1} cr={1}
        className="text-[var(--landing-accent)] opacity-[0.07] [mask-image:radial-gradient(ellipse_70%_60%_at_80%_15%,white,transparent)]"
      />
      <DotPattern
        width={36} height={36} cx={1} cy={1} cr={1}
        className="text-[var(--landing-accent)] opacity-[0.05] [mask-image:radial-gradient(ellipse_60%_50%_at_15%_90%,white,transparent)]"
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10 pb-16 md:pb-24" style={{ paddingTop: 'clamp(80px, 10vw, 128px)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{
            fontFamily: t.mono, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: t.accent, marginBottom: '20px',
          }}>
            § 2 — The Pipeline
          </p>
          <h2 style={{
            fontFamily: t.sans, fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 500, letterSpacing: '-0.028em', lineHeight: 1.05,
            color: t.ink, marginBottom: '18px', maxWidth: '780px',
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            CSV in.{' '}
            <span style={{ fontFamily: t.serif, fontStyle: 'italic', fontWeight: 400, color: t.inkMuted }}>
              Actionable cases out.
            </span>
          </h2>
          <p style={{
            fontFamily: t.serif, fontSize: 'clamp(15px, 1.15vw, 18px)',
            color: t.inkMuted, lineHeight: 1.55, margin: 0,
            maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Hash sensitive fields in the browser. Get scored clusters, signals, and case files back — in 38ms, end-to-end.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          background: t.cream2, padding: '0',
          marginBottom: '0',
          borderTop: `1px solid ${t.line}`, borderLeft: `1px solid ${t.line}`, borderRight: `1px solid ${t.line}`, borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
        }}>
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume' : 'Pause'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '44px', flexShrink: 0,
              background: 'transparent', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRight: `1px solid ${t.line}`, cursor: 'pointer', color: t.inkFaint,
            }}
          >
            {paused ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M1 1l8 5-8 5V1z" fill="currentColor"/></svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><rect x="1" y="1" width="2.5" height="10" fill="currentColor"/><rect x="6.5" y="1" width="2.5" height="10" fill="currentColor"/></svg>
            )}
          </button>

          {TABS.map((tab, i) => {
            const on = active === i;
            return (
              <button
                key={tab.n}
                onClick={() => jumpTo(i as TabId)}
                style={{
                  position: 'relative', flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
                  gap: '3px', padding: '18px 22px',
                  background: on ? t.paper : 'transparent',
                  borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRight: i < 3 ? `1px solid ${t.line}` : 'none',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 200ms', overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', width: '100%' }}>
                  <span style={{ fontFamily: t.mono, fontSize: '10px', color: on ? t.accent : t.inkFaint, letterSpacing: '0.08em' }}>
                    {tab.n}
                  </span>
                  <span style={{ fontFamily: t.sans, fontSize: '15px', fontWeight: on ? 600 : 500, color: on ? t.ink : t.inkMuted, letterSpacing: '-0.01em' }}>
                    {tab.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: t.mono, fontSize: '10px', color: on ? t.inkFaint : t.inkFaint, fontVariantNumeric: 'tabular-nums' }}>
                    {tab.t}
                  </span>
                </div>
                {on && !paused && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: '3px', width: `${progress * 100}%`,
                    background: t.accent, transition: 'none',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div
          style={{
            background: t.paper,
            borderTop: 'none',
            borderRight: `1px solid ${t.line}`,
            borderBottom: `1px solid ${t.line}`,
            borderLeft: `1px solid ${t.line}`,
            borderRadius: '0 0 6px 6px',
            minHeight: '680px',
            boxShadow: '0 22px 54px -26px rgba(26,24,20,0.18), 0 44px 96px -48px rgba(123,45,38,0.10)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              opacity: fade ? 1 : 0,
              transition: 'opacity 140ms',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
              alignItems: 'stretch',
              minHeight: '680px',
            }}
            className="ua-pipeline-grid"
          >
            {/* LEFT — copy, padded */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '44px 40px', borderRight: `1px solid ${t.line}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontFamily: t.sans, fontSize: 'clamp(52px, 6vw, 84px)',
                  fontWeight: 500, letterSpacing: '-0.045em',
                  color: t.ink, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums',
                }}>
                  {tab.stat}
                </span>
                <span style={{ fontFamily: t.sans, fontSize: '18px', fontWeight: 400, color: t.inkMuted, letterSpacing: '-0.01em' }}>
                  {tab.unit}
                </span>
              </div>
              <p style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.inkFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '28px' }}>
                {tab.statSub}
              </p>
              <div style={{ height: '1px', background: t.line, marginBottom: '28px' }} />
              <h3 style={{ fontFamily: t.sans, fontSize: 'clamp(20px, 1.8vw, 26px)', fontWeight: 500, letterSpacing: '-0.018em', lineHeight: 1.2, color: t.ink, marginBottom: '14px' }}>
                {tab.headline}
              </h3>
              <p style={{ fontFamily: t.serif, fontSize: '15.5px', lineHeight: 1.65, color: t.inkMuted, marginBottom: '0' }}>
                {tab.body}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: t.mono, fontSize: '10px', color: t.inkFaint, letterSpacing: '0.1em' }}>STEP {tab.n} / 04</span>
                <div style={{ display: 'inline-flex', gap: '4px' }}>
                  {TABS.map((_, i) => (
                    <span key={i} style={{
                      width: i === active ? '20px' : '8px', height: '2px',
                      background: i === active ? t.accent : t.line,
                      transition: 'width 250ms, background 250ms',
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — screenshot, flush */}
            <div
              key={active}
              className="ua-artifact-enter"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: t.screenshotBg,
              }}
            >
              <ScreenshotArtifact artifact={SCREENSHOT_ARTIFACTS[active]} />
            </div>
          </div>
        </div>


      </div>

      <style>{`
        @media (max-width: 900px) {
          .ua-pipeline-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 600px) {
          .ua-schema-grid .ua-schema-row { grid-template-columns: 1fr !important; }
          .ua-schema-grid .ua-schema-row > div:first-child { border-right: none !important; border-bottom: 1px solid var(--landing-line-faint); }
        }
        @keyframes ua-artifact-enter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ua-artifact-enter {
          animation: ua-artifact-enter 360ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .ua-schema-required::before,
        .ua-schema-required::after,
        .ua-schema-optional::before,
        .ua-schema-optional::after {
          display: none !important;
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
