'use client';

import {
  MessageSquare,
  ShoppingCart,
  Truck,
  AlertTriangle,
  FileImage,
  Mail,
  RefreshCw,
  CreditCard,
  Shield,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Zap,
  FileText,
  Package,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const INPUT_GROUPS = [
  {
    id: 'support',
    label: 'Support',
    color: '#E8E4FF',
    items: [
      { label: 'Gorgias', icon: <MessageSquare size={14} strokeWidth={1.75} /> },
      { label: 'Zendesk', icon: <MessageSquare size={14} strokeWidth={1.75} /> },
      { label: 'Email', icon: <Mail size={14} strokeWidth={1.75} /> },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    color: '#E0F0E8',
    items: [
      { label: 'Shopify', icon: <ShoppingCart size={14} strokeWidth={1.75} /> },
      { label: 'Stripe', icon: <CreditCard size={14} strokeWidth={1.75} /> },
      { label: 'Recharge', icon: <RefreshCw size={14} strokeWidth={1.75} /> },
    ],
  },
  {
    id: 'carriers',
    label: 'Carriers',
    color: '#FFF0E0',
    items: [
      { label: 'AfterShip', icon: <Truck size={14} strokeWidth={1.75} /> },
      { label: 'Royal Mail', icon: <MapPin size={14} strokeWidth={1.75} /> },
      { label: 'UPS', icon: <Package size={14} strokeWidth={1.75} /> },
    ],
  },
  {
    id: 'risk',
    label: 'Risk & disputes',
    color: '#FFE8E8',
    items: [
      { label: 'Chargebacks', icon: <AlertTriangle size={14} strokeWidth={1.75} /> },
      { label: 'Refunds', icon: <RefreshCw size={14} strokeWidth={1.75} /> },
      { label: 'Rules', icon: <Shield size={14} strokeWidth={1.75} /> },
    ],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    color: '#E8EEF8',
    items: [
      { label: 'Photos', icon: <FileImage size={14} strokeWidth={1.75} /> },
      { label: 'Tracking', icon: <Truck size={14} strokeWidth={1.75} /> },
      { label: 'History', icon: <Clock size={14} strokeWidth={1.75} /> },
    ],
  },
] as const;

const HUB_LINES = [
  { text: 'EVIDENCE SYNCED', muted: false },
  { text: 'RULES ACTIVE', muted: false },
  { text: 'CASES ROUTED', muted: true },
  { text: 'RECOVERY QUEUED', muted: true },
];

type CardStatus = 'now' | 'next' | 'queued';

interface AssistantCard {
  id: string;
  title: string;
  body: string;
  time: string;
  status: CardStatus;
  color: string;
  icon: React.ReactNode;
}

const ASSISTANT_CARDS: AssistantCard[] = [
  {
    id: 'evidence',
    title: 'Evidence Assistant',
    body: 'Delivery evidence compiled',
    time: 'Now',
    status: 'now',
    color: '#E8E4FF',
    icon: <FileImage size={11} strokeWidth={1.75} />,
  },
  {
    id: 'refund',
    title: 'Refund Assistant',
    body: 'Refund decision suggested',
    time: 'Next',
    status: 'next',
    color: '#E0F0E8',
    icon: <RefreshCw size={11} strokeWidth={1.75} />,
  },
  {
    id: 'carrier',
    title: 'Carrier Recovery',
    body: 'Carrier claim prepared',
    time: 'Next',
    status: 'next',
    color: '#FFF0E0',
    icon: <Truck size={11} strokeWidth={1.75} />,
  },
  {
    id: 'dispute',
    title: 'Dispute Assistant',
    body: 'Chargeback packet drafted',
    time: 'Queued',
    status: 'queued',
    color: '#FFE8E8',
    icon: <AlertTriangle size={11} strokeWidth={1.75} />,
  },
  {
    id: 'policy',
    title: 'Policy Assistant',
    body: 'Rule override flagged',
    time: 'Queued',
    status: 'queued',
    color: '#E8EEF8',
    icon: <Shield size={11} strokeWidth={1.75} />,
  },
];

// ─── Animated beam ────────────────────────────────────────────────────────────

function AnimatedBeam({
  path,
  delay = 0,
  duration = 2.4,
}: {
  path: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <>
      {/* static wire */}
      <path d={path} stroke="#D8D5D0" strokeWidth={1} fill="none" />
      {/* travelling highlight */}
      <path
        d={path}
        stroke="url(#beamGrad)"
        strokeWidth={1.5}
        fill="none"
        strokeDasharray="40 200"
        strokeDashoffset="240"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="240;-240"
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
          calcMode="linear"
        />
      </path>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputGroup({
  group,
}: {
  group: (typeof INPUT_GROUPS)[number];
}) {
  return (
    <div
      style={{
        border: '1px solid #E2DFDA',
        borderRadius: 8,
        background: '#FFFFFF',
        overflow: 'hidden',
        width: 148,
      }}
    >
      <div
        style={{
          background: group.color,
          padding: '4px 10px',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#1A1814',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-dm-mono, monospace)',
        }}
      >
        {group.label}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {group.items.map((item, i) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 4px',
              borderLeft: i > 0 ? '1px solid #F0EDE8' : 'none',
            }}
          >
            <span style={{ color: '#3D3730' }}>{item.icon}</span>
            <span
              style={{
                fontSize: 9,
                color: '#6B6560',
                fontWeight: 500,
                lineHeight: 1,
                textAlign: 'center',
                maxWidth: 36,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hub() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Circle */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          border: '1.5px solid #D8D5D0',
          background: '#FFFFFF',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-bricolage, var(--font-dm-sans, sans-serif))',
            fontWeight: 700,
            fontSize: 28,
            color: '#1A1814',
            letterSpacing: '-0.04em',
          }}
        >
          U
        </span>
      </div>

      {/* Status lines */}
      <div
        style={{
          border: '1px solid #E2DFDA',
          borderRadius: 6,
          background: '#FFFFFF',
          padding: '8px 12px',
          width: 168,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {HUB_LINES.map((line) => (
          <div
            key={line.text}
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: 9.5,
              letterSpacing: '0.07em',
              fontWeight: line.muted ? 400 : 500,
              color: line.muted ? '#B0A99E' : '#1A1814',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: line.muted ? '#D8D5D0' : '#2D7A4A',
                flexShrink: 0,
              }}
            />
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusNode({ status }: { status: CardStatus }) {
  if (status === 'now') {
    return (
      <CheckCircle2
        size={16}
        strokeWidth={2}
        style={{ color: '#2D7A4A', flexShrink: 0 }}
      />
    );
  }
  if (status === 'next') {
    return (
      <Circle
        size={16}
        strokeWidth={2}
        style={{ color: '#9A9088', flexShrink: 0 }}
      />
    );
  }
  return (
    <Circle
      size={16}
      strokeWidth={1.5}
      style={{ color: '#D8D5D0', flexShrink: 0 }}
    />
  );
}

function AssistantCardRow({ card }: { card: AssistantCard }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StatusNode status={card.status} />
      <div
        style={{
          border: '1px solid #E2DFDA',
          borderRadius: 7,
          background: card.status === 'queued' ? '#FAFAF8' : '#FFFFFF',
          overflow: 'hidden',
          flex: 1,
          opacity: card.status === 'queued' ? 0.72 : 1,
        }}
      >
        {/* Tab */}
        <div
          style={{
            background: card.color,
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ color: '#3D3730', display: 'flex', alignItems: 'center' }}>
            {card.icon}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#1A1814',
              letterSpacing: '0.01em',
            }}
          >
            {card.title}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 9,
              color: '#6B6560',
              fontFamily: 'var(--font-dm-mono, monospace)',
            }}
          >
            {card.time}
          </span>
        </div>
        {/* Body */}
        <div style={{ padding: '5px 8px' }}>
          <span
            style={{
              fontSize: 11.5,
              color: '#3D3730',
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            {card.body}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SVG wire layer ───────────────────────────────────────────────────────────
// Coordinates are relative to the 1140×400 diagram box.
// Hub center: x≈570, y≈188

const LEFT_CONNECTOR_X = 190; // right edge of left column
const HUB_CX = 570;
const HUB_CY = 188;
const RIGHT_CONNECTOR_X = 728; // left edge of right column

// Entry Y positions for each input group (approximate midpoints)
const GROUP_MID_Y = [64, 130, 196, 264, 330];

// Card Y positions for each assistant card
const CARD_MID_Y = [60, 120, 182, 244, 306];

function WireLayer() {
  const delayStep = 0.5;
  return (
    <svg
      viewBox="0 0 1140 400"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="40%" stopColor="#A89F94" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#A89F94" stopOpacity="0.9" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Left → Hub */}
      {GROUP_MID_Y.map((y, i) => {
        const mx = (LEFT_CONNECTOR_X + HUB_CX) / 2;
        const path = `M ${LEFT_CONNECTOR_X} ${y} C ${mx} ${y}, ${mx} ${HUB_CY}, ${HUB_CX - 48} ${HUB_CY}`;
        return (
          <AnimatedBeam key={`l${i}`} path={path} delay={i * delayStep} duration={2.2 + i * 0.1} />
        );
      })}

      {/* Hub → Right */}
      {CARD_MID_Y.map((y, i) => {
        const mx = (HUB_CX + RIGHT_CONNECTOR_X) / 2;
        const path = `M ${HUB_CX + 48} ${HUB_CY} C ${mx} ${HUB_CY}, ${mx} ${y}, ${RIGHT_CONNECTOR_X} ${y}`;
        return (
          <AnimatedBeam key={`r${i}`} path={path} delay={1.2 + i * delayStep} duration={2.2 + i * 0.1} />
        );
      })}
    </svg>
  );
}

// ─── Desktop diagram ──────────────────────────────────────────────────────────

function DesktopDiagram() {
  return (
    <div
      style={{
        position: 'relative',
        width: 1140,
        height: 400,
        margin: '0 auto',
      }}
    >
      <WireLayer />

      {/* Left column: input groups */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 2,
        }}
      >
        {INPUT_GROUPS.map((group) => (
          <InputGroup key={group.id} group={group} />
        ))}
      </div>

      {/* Center: hub */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
        }}
      >
        <Hub />
      </div>

      {/* Right column: assistant cards */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 16,
          width: 280,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 2,
        }}
      >
        {ASSISTANT_CARDS.map((card) => (
          <AssistantCardRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

function MobileDiagram() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hub first */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Hub />
      </div>

      {/* Input groups grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}
      >
        {INPUT_GROUPS.map((group) => (
          <InputGroup key={group.id} group={group} />
        ))}
      </div>

      {/* Assistant cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ASSISTANT_CARDS.map((card) => (
          <AssistantCardRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function AutomationHeroDiagram() {
  return (
    <section
      style={{
        background: '#FAFAF8',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav bar */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 40px',
          borderBottom: '1px solid #E8E5E0',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-bricolage, var(--font-dm-sans, sans-serif))',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '-0.03em',
            color: '#1A1814',
          }}
        >
          Unauth
        </span>
        <a
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontWeight: 600,
            background: '#1A1814',
            color: '#FFFFFF',
            borderRadius: 6,
            padding: '7px 14px',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Get access
          <ChevronRight size={14} strokeWidth={2.5} />
        </a>
      </nav>

      {/* Hero text */}
      <div
        style={{
          textAlign: 'center',
          padding: '56px 24px 40px',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#9A9088',
            marginBottom: 20,
          }}
        >
          Post-purchase loss accountability
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-bricolage, var(--font-dm-sans, sans-serif))',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4.2vw, 52px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            color: '#1A1814',
            marginBottom: 20,
          }}
        >
          Capture every support signal.
          <br />
          Automate every loss decision.
        </h1>
        <p
          style={{
            fontSize: 'clamp(15px, 1.5vw, 17px)',
            color: '#6B6560',
            lineHeight: 1.6,
            fontWeight: 400,
            maxWidth: 580,
            margin: '0 auto',
          }}
        >
          Unauth connects orders, support, carriers, refunds, and disputes
          so every claim has evidence, ownership, and a recovery route.
        </p>
      </div>

      {/* Diagram */}
      <div style={{ padding: '0 24px 48px', flex: 1 }}>
        {/* Desktop: hidden on small screens via CSS */}
        <div className="hidden xl:block" style={{ overflowX: 'auto' }}>
          <DesktopDiagram />
        </div>
        {/* Mobile/tablet */}
        <div className="xl:hidden" style={{ maxWidth: 480, margin: '0 auto' }}>
          <MobileDiagram />
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          background: '#EDE9FF',
          borderTop: '1px solid #DDD8F0',
          padding: '14px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {[
          { icon: <Zap size={13} strokeWidth={2} />, text: 'Rules-led recommendations' },
          { icon: <Shield size={13} strokeWidth={2} />, text: 'Evidence-first decisions' },
          { icon: <FileText size={13} strokeWidth={2} />, text: 'Recovery cases built automatically' },
          { icon: <CheckCircle2 size={13} strokeWidth={2} />, text: 'Gorgias & Shopify native' },
        ].map((item) => (
          <span
            key={item.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: '#4A4060',
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ color: '#7B6DB0' }}>{item.icon}</span>
            {item.text}
          </span>
        ))}
      </div>
    </section>
  );
}
