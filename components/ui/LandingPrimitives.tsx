'use client';

import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Hash,
  ImageIcon,
  Mic,
  MoreHorizontal,
  Plus,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type StepBadgeVariant, uiTokens } from './tokens';

export function StepBadge({
  variant,
  children,
  className,
}: {
  variant: StepBadgeVariant;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        uiTokens.stepBadges[variant].badge,
        className,
      )}
    >
      {children ?? variant}
    </div>
  );
}

export function SectionEyebrow({
  children,
  tone = 'light',
  className,
}: {
  children: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <p
      className={
        className
          ? cn(className)
          : cn(
              uiTokens.typography.sectionEyebrow,
              tone === 'dark' ? 'text-[var(--lime)]' : 'text-[var(--ink-secondary)]',
            )
      }
    >
      {children}
    </p>
  );
}

export function SectionHeadline({
  children,
  tone = 'light',
  className,
}: {
  children: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <h2
      className={
        className
          ? cn(className)
          : cn(
              uiTokens.typography.sectionHeadline,
              tone === 'dark' ? 'text-[var(--ink-inverse)]' : 'text-[var(--ink-primary)]',
            )
      }
    >
      {children}
    </h2>
  );
}

export function SectionBody({
  children,
  tone = 'light',
  className,
}: {
  children: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <p
      className={
        className
          ? cn(className)
          : cn(
              uiTokens.typography.sectionBody,
              tone === 'dark'
                ? 'text-[color-mix(in_srgb,var(--ink-inverse)_72%,transparent)]'
                : 'text-[var(--ink-secondary)]',
            )
      }
    >
      {children}
    </p>
  );
}

export function PanelCard({
  children,
  as,
  variant = 'kanban',
  className,
  style,
  ...props
}: {
  children: ReactNode;
  as?: ElementType;
  variant?: 'kanban' | 'surface' | 'dark' | 'plain';
  className?: string;
  style?: CSSProperties;
  type?: 'button' | 'submit' | 'reset';
} & HTMLAttributes<HTMLElement>) {
  const Component = as ?? 'div';
  const variantClassName = {
    kanban: cn(
      'relative min-h-[112px] rounded-lg border border-black/[0.07] bg-white/78 p-4',
      uiTokens.shadows.card,
    ),
    surface:
      'rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-5 py-5',
    dark: 'rounded-[var(--radius-lg)] border border-white/12 bg-white/5 px-5 py-5',
    plain: '',
  }[variant];

  return (
    <Component className={cn(variantClassName, className)} style={style} {...props}>
      {children}
    </Component>
  );
}

export function EvidenceLine({
  icon,
  text,
  timestamp,
  className,
}: {
  icon: 'pending' | 'confirmed';
  text: ReactNode;
  timestamp?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-[33px] items-center gap-[11px] text-[13.5px] tracking-[-0.01em] text-[rgba(17,17,17,0.8)]',
        className,
      )}
    >
      {icon === 'confirmed' ? (
        <CheckCircle2 size={16} strokeWidth={1.6} className="shrink-0 text-[#1f9d57]" />
      ) : (
        <Circle size={16} strokeWidth={1.5} className="shrink-0 text-black/28" />
      )}
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{text}</span>
      {timestamp ? (
        <span className="ml-auto flex shrink-0 items-center gap-[6px] text-[12px] text-[rgba(29,32,39,0.42)]">
          {timestamp}
        </span>
      ) : null}
    </div>
  );
}

export type ThreadPanelMessage = {
  avatar: string;
  name: string;
  time: string;
  message: ReactNode;
};

export function ThreadPanel({
  channel = 'Thread in #cases',
  messages,
  className,
}: {
  channel?: ReactNode;
  messages: ThreadPanelMessage[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative z-20 mx-auto w-full max-w-[520px] overflow-hidden rounded-[16px] border border-black/[0.12] bg-white/92 backdrop-blur-2xl lg:absolute lg:left-0 lg:top-0 lg:mx-0 lg:w-[508px]',
        uiTokens.shadows.panel,
        className,
      )}
    >
      <div className="flex h-[70px] items-center justify-between border-b border-black/[0.08] px-7">
        <div className="flex items-center gap-4 text-[18px] font-medium tracking-[-0.03em] text-black/48">
          <Hash size={20} />
          <span>{channel}</span>
        </div>
        <MoreHorizontal size={19} className="text-black/40" />
      </div>

      <div className="px-7 pb-5 pt-8">
        <div className="space-y-7">
          {messages.map((message) => (
            <ThreadMessage key={`${message.name}-${message.time}`} {...message} />
          ))}
        </div>

        <ThreadComposer />
      </div>
    </div>
  );
}

function ThreadMessage({ avatar, name, time, message }: ThreadPanelMessage) {
  return (
    <div className="flex gap-4">
      <img
        src={avatar}
        alt=""
        className="mt-1 h-[42px] w-[42px] shrink-0 rounded-lg object-cover ring-1 ring-black/10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <div className="text-[18px] font-semibold tracking-[-0.035em] text-[#111111]">{name}</div>
          <div className="text-[15px] text-black/38">{time}</div>
        </div>
        <p className="mt-2 max-w-[360px] text-[17px] leading-[1.46] tracking-[-0.025em] text-black/58">
          {message}
        </p>
      </div>
    </div>
  );
}

function ThreadComposer() {
  const mentionStyle: CSSProperties = {
    background: '#F4E6E0',
    color: '#7B2D26',
    boxShadow: 'inset 0 0 0 1px rgba(168,80,64,0.24)',
  };

  return (
    <div className="mt-10 rounded-[14px] border border-black/[0.10] bg-[#f8f8f6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_36px_rgba(0,0,0,0.08)]">
      <div className="min-h-[95px] text-[19px] leading-[1.45] tracking-[-0.035em] text-[#111111]">
        <span className="rounded-md px-1.5 py-0.5 font-medium" style={mentionStyle}>
          @Unauth
        </span>{' '}
        explain why this refund was held
        <span className="ml-0.5 inline-block h-[22px] w-px translate-y-[4px] bg-black/70" />
      </div>

      <div className="mt-7 flex items-center justify-between text-black/44">
        <div className="flex items-center gap-5">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-black/[0.055]">
            <Plus size={22} />
          </div>
          <span className="text-[20px]">Aa</span>
          <Smile size={20} />
          <span className="text-[22px]">@</span>
          <Video size={20} />
          <Mic size={20} />
          <ImageIcon size={20} />
        </div>

        <button
          className="flex h-[34px] overflow-hidden rounded-md text-white"
          style={{
            background: '#A85040',
            boxShadow: '0 0 34px rgba(168,80,64,0.32)',
          }}
        >
          <span className="flex h-full w-[42px] items-center justify-center">
            <Send size={17} fill="currentColor" />
          </span>
          <span className="my-2 w-px bg-white/22" />
          <span className="flex h-full w-[34px] items-center justify-center">
            <ChevronDown size={16} />
          </span>
        </button>
      </div>
    </div>
  );
}

export type KanbanCardItem = {
  id: string;
  title: ReactNode;
  tags: string[];
  evidence: {
    confirmed: boolean;
    line: string;
    timestamp: string;
  };
  avatar?: string;
  muted?: boolean;
};

export type KanbanColumnItem = {
  title: string;
  count?: string;
  type: 'todo' | 'progress' | 'done';
  cards: KanbanCardItem[];
};

export function KanbanBoard({
  columns,
  className,
}: {
  columns: KanbanColumnItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative z-10 h-[640px] w-[914px] overflow-hidden rounded-[16px] border border-black/[0.11] bg-white/72 backdrop-blur-xl lg:absolute lg:left-[508px] lg:top-[29px]',
        uiTokens.shadows.board,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_24%,rgba(0,0,0,0.035),transparent_38%)]" />

      <div className="relative z-10 grid h-full grid-cols-3 gap-3 p-4">
        {columns.map((column) => (
          <KanbanColumn key={column.title} {...column} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[360px] bg-gradient-to-r from-transparent via-white/46 to-white/88" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[270px] bg-gradient-to-t from-white via-white/78 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[80px] bg-gradient-to-b from-white/82 to-transparent" />
    </div>
  );
}

export function KanbanColumn({ title, count, type, cards }: KanbanColumnItem) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex h-[52px] items-center justify-between px-4 text-[17px] tracking-[-0.03em] text-black/58">
        <div className="flex items-center gap-3">
          {type === 'todo' && <Circle size={17} className="text-black/38" />}
          {type === 'progress' && <CircleDot size={17} className="text-[#f4b82f]" />}
          {type === 'done' && (
            <CheckCircle2 size={18} style={{ color: '#A85040' }} fill="currentColor" />
          )}
          <span>{title}</span>
          {count && <span className="text-black/38">{count}</span>}
        </div>
        <div className="flex items-center gap-4 text-black/36">
          <Plus size={17} />
          <MoreHorizontal size={17} />
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card) => (
          <KanbanCard key={card.id} {...card} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ id, title, tags, evidence, avatar, muted }: KanbanCardItem) {
  return (
    <PanelCard style={{ opacity: muted ? 0.55 : 1 }}>
      {avatar && (
        <img
          src={avatar}
          alt=""
          className="absolute right-4 top-4 h-[22px] w-[22px] rounded-full object-cover ring-1 ring-black/12"
        />
      )}
      <div className="text-[13px] font-medium text-black/34">{id}</div>
      <div className="mt-2 max-w-[215px] text-[16px] leading-[1.35] tracking-[-0.025em] text-black/62">
        {title}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <TagPill key={tag} label={tag} />
        ))}
      </div>
      <div className="mt-[22px]">
        <div className="mb-[6px] text-[13px] font-semibold tracking-[-0.02em] text-[#1d2027]">
          Evidence
        </div>
        <EvidenceLine
          icon={evidence.confirmed ? 'confirmed' : 'pending'}
          text={evidence.line}
          timestamp={evidence.timestamp}
        />
      </div>
    </PanelCard>
  );
}

export function TagPill({ label }: { label: string }) {
  const tones: Record<string, { bg: string; color: string; dot: string; strong?: boolean }> = {
    INR: { bg: '#fff0f0', color: '#b33d3d', dot: '#d94f4f' },
    Delivery: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Policy: { bg: '#edf6ff', color: '#326ea8', dot: '#4f93d2' },
    Quality: { bg: '#edf9f2', color: '#2f8a58', dot: '#46b779' },
    Risk: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Context: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Rules: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Evidence: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Approved: { bg: '#edf9f2', color: '#2f8a58', dot: '#46b779' },
    Closed: { bg: '#edf6ff', color: '#326ea8', dot: '#4f93d2' },
  };
  const tone = tones[label] || {
    bg: 'rgba(0,0,0,0.045)',
    color: 'rgba(0,0,0,0.5)',
    dot: 'rgba(0,0,0,0.4)',
  };

  if (/^\d/.test(label)) {
    return (
      <span className="inline-flex h-[27px] items-center rounded bg-black/[0.045] px-2.5 text-[14px] font-medium text-black/62">
        <span className="mr-1.5 text-[#50c878]">↟</span>
        {label}
      </span>
    );
  }

  return (
    <span
      className={uiTokens.badge.tag}
      style={{
        background: tone.bg,
        color: tone.color,
        boxShadow: tone.strong ? 'inset 0 0 0 1px rgba(168,80,64,0.16)' : undefined,
      }}
    >
      <span className={uiTokens.badge.dot} style={{ background: tone.dot }} />
      {label}
    </span>
  );
}

export function MockBrowserFrame({
  children,
  topBorderClassName,
  className,
  contentClassName,
}: {
  children: ReactNode;
  topBorderClassName?: string;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        'w-full max-w-[300px] rounded-[10px] border border-t-2 border-[rgba(20,24,31,0.10)] bg-[#fbfbfa] shadow-[0_24px_54px_rgba(23,28,36,0.16)] [&_h3]:text-[var(--step-text)]',
        topBorderClassName,
        className,
      )}
    >
      <div className="flex h-[40px] items-center gap-2 border-b border-[rgba(20,24,31,0.066)] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[rgba(20,24,31,0.16)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[rgba(20,24,31,0.16)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[rgba(20,24,31,0.16)]" />
      </div>
      <div className={cn('px-4 pb-5 pt-4', contentClassName)}>{children}</div>
    </div>
  );
}
