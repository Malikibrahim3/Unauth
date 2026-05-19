'use client';

import { cn } from '@/lib/utils';

const complaints = [
  {
    store: 'Kessler',
    handle: '@kessler',
    title: 'Parcel not received',
    body: 'Tracking shows delivered. Customer says nothing arrived at the door.',
    tone: 'New dispute',
  },
  {
    store: 'Midform',
    handle: '@midform',
    title: 'Missing item claim',
    body: 'Buyer says two items were missing from the parcel and wants a partial refund.',
    tone: 'Refund requested',
  },
  {
    store: 'Northrun',
    handle: '@northrun',
    title: 'Wrong item sent',
    body: 'Complaint says the item inside the box does not match the checkout order.',
    tone: 'Support escalation',
  },
  {
    store: 'Prime & Co',
    handle: '@primeco',
    title: 'Unauthorized purchase',
    body: 'Cardholder denies placing the order and says the transaction should be reversed.',
    tone: 'Chargeback risk',
  },
  {
    store: 'Oakshelf',
    handle: '@oakshelf',
    title: 'Damaged on arrival',
    body: 'Customer says the product arrived broken and unusable on first open.',
    tone: 'Refund requested',
  },
  {
    store: 'Bridleworks',
    handle: '@bridleworks',
    title: 'Duplicate charge',
    body: 'Buyer reports being charged twice for a single checkout session.',
    tone: 'Billing dispute',
  },
  {
    store: 'Northrun',
    handle: '@northrun',
    title: 'Box arrived empty',
    body: 'Customer says the package was sealed but had no product inside.',
    tone: 'Manual review',
  },
  {
    store: 'Kessler',
    handle: '@kessler',
    title: 'Item never turned up',
    body: 'Support ticket says the courier marked it complete but nothing was received.',
    tone: 'New dispute',
  },
];

const columns = [
  complaints.slice(0, 4),
  complaints.slice(2, 6),
  complaints.slice(4, 8),
];

function ComplaintCard({
  store,
  handle,
  title,
  body,
  tone,
}: {
  store: string;
  handle: string;
  title: string;
  body: string;
  tone: string;
}) {
  const initials = store
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <figure
      className={cn(
        'relative w-[208px] cursor-pointer overflow-hidden rounded-xl border px-4 py-4',
        'border-[#D8D0BD] bg-[rgba(253,251,246,0.94)] shadow-[0_20px_44px_-26px_rgba(0,0,0,0.42)]',
        'transition-transform duration-300 ease-out hover:scale-[1.05] hover:bg-[#FFFDF8]',
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#7B2D26] text-[10px] font-medium uppercase tracking-[0.08em] text-[#F8F5EE]">
          {initials}
        </div>
        <div className="min-w-0">
          <figcaption className="truncate text-[13px] font-medium text-[#1A1814]">{store}</figcaption>
          <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#8A8472]">{handle}</p>
        </div>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-5 text-[#1A1814]">{title}</p>
      <blockquote className="mt-2 text-[12.5px] leading-6 text-[#5D574D]">{body}</blockquote>
      <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[#7B2D26]">{tone}</p>
    </figure>
  );
}

function MarqueeColumn({
  items,
  reverse = false,
  duration = 22,
}: {
  items: typeof complaints;
  reverse?: boolean;
  duration?: number;
}) {
  const repeated = [...items, ...items];

    return (
    <div className="relative h-[396px] w-[208px] overflow-hidden">
      <div
        className={cn('ua-complaint-marquee flex flex-col gap-4', reverse && 'ua-complaint-marquee-reverse')}
        style={{ ['--ua-duration' as string]: `${duration}s` }}
      >
        {repeated.map((item, index) => (
          <ComplaintCard
            key={`${item.store}-${item.title}-${index}`}
            store={item.store}
            handle={item.handle}
            title={item.title}
            body={item.body}
            tone={item.tone}
          />
        ))}
      </div>
    </div>
  );
}

export default function HeroNotificationArtifact() {
  return (
    <div className="relative flex h-[500px] w-full items-center justify-end overflow-hidden [perspective:1400px]">
      <style>{`
        @keyframes ua-complaints-scroll {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(calc(-50% - 8px));
          }
        }

        @keyframes ua-complaints-scroll-reverse {
          from {
            transform: translateY(calc(-50% - 8px));
          }
          to {
            transform: translateY(0);
          }
        }

        .ua-complaint-marquee {
          animation: ua-complaints-scroll var(--ua-duration) linear infinite;
          will-change: transform;
        }

        .ua-complaint-marquee:hover {
          animation-play-state: paused;
        }

        .ua-complaint-marquee-reverse {
          animation-name: ua-complaints-scroll-reverse;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_28%,rgba(182,81,42,0.18),transparent_38%)]" />
      <div className="pointer-events-none absolute right-6 top-1/2 h-[392px] w-[720px] -translate-y-1/2 rounded-[28px] border border-[#2C2921] bg-[linear-gradient(180deg,rgba(32,30,25,0.42),rgba(18,17,14,0.12))]" />
      <div
        className="relative mr-4 flex flex-row items-start gap-5"
        style={{
          transform:
            'translateX(-10px) translateY(34px) translateZ(0) rotateX(10deg) rotateY(-11deg) rotateZ(6deg)',
        }}
      >
        <MarqueeColumn items={columns[0]} duration={30} />
        <MarqueeColumn items={columns[1]} reverse duration={34} />
        <MarqueeColumn items={columns[2]} duration={32} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#15140F] via-[#15140F]/54 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#15140F] via-[#15140F]/86 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#15140F] via-[#15140F]/78 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#15140F] via-[#15140F]/72 to-transparent" />
    </div>
  );
}
