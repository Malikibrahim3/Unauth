'use client';

import { cn } from '@/lib/utils';

const complaints = [
  { store: 'Kessler', handle: '@kessler', title: 'I never received my package', body: 'Tracking shows delivered but nothing arrived at my address.', tone: 'New dispute' },
  { store: 'Midform', handle: '@midform', title: 'The box arrived completely empty', body: 'Box was sealed but there was absolutely nothing inside.', tone: 'Refund requested' },
  { store: 'Northrun', handle: '@northrun', title: 'This is not what I ordered', body: 'Item inside the box doesn\'t match what I checked out for.', tone: 'Support escalation' },
  { store: 'Prime & Co', handle: '@primeco', title: 'My item was broken when I opened it', body: 'Arrived with huge damage and completely unusable from day one.', tone: 'Chargeback risk' },
  { store: 'Oakshelf', handle: '@oakshelf', title: 'I was charged twice', body: 'Bank statement shows two identical charges on the same day.', tone: 'Billing dispute' },
  { store: 'Bridleworks', handle: '@bridleworks', title: 'I don\'t recognise this charge on my card', body: 'Never made this purchase. Someone used my card without permission.', tone: 'Chargeback risk' },
  { store: 'Kessler', handle: '@kessler', title: 'I never placed this order', body: 'This transaction appeared on my account. I have no record of it.', tone: 'Chargeback risk' },
  { store: 'Midform', handle: '@midform', title: 'The tracking says delivered but I have nothing', body: 'Courier marked it delivered but package never arrived.', tone: 'New dispute' },
  { store: 'Northrun', handle: '@northrun', title: 'Someone must have stolen it from my porch', body: 'Delivery was left outside. Package is now missing.', tone: 'New dispute' },
  { store: 'Prime & Co', handle: '@primeco', title: 'I only received half my order', body: 'Multiple items were in the order but only some arrived.', tone: 'Refund requested' },
  { store: 'Oakshelf', handle: '@oakshelf', title: 'This looks nothing like the photos on the website', body: 'Product appearance completely different from listing photos.', tone: 'Support escalation' },
  { store: 'Bridleworks', handle: '@bridleworks', title: 'The size I received is completely different to what I ordered', body: 'Wrong size shipped. I ordered medium and got small.', tone: 'Refund requested' },
  { store: 'Kessler', handle: '@kessler', title: 'It stopped working after two days', body: 'Broke immediately after arrival. Completely non-functional now.', tone: 'Escalated' },
  { store: 'Midform', handle: '@midform', title: 'There was a huge scratch on it straight out of the box', body: 'Major cosmetic damage visible on unboxing.', tone: 'Support escalation' },
  { store: 'Northrun', handle: '@northrun', title: 'I sent it back weeks ago and still haven\'t got my money', body: 'Returned item with your label three weeks ago. No refund yet.', tone: 'Escalated' },
  { store: 'Prime & Co', handle: '@primeco', title: 'You charged me after I cancelled my subscription', body: 'Cancelled subscription but was charged in next billing cycle.', tone: 'Billing dispute' },
  { store: 'Oakshelf', handle: '@oakshelf', title: 'The colour is completely different to what was listed', body: 'Product color doesn\'t match the website description at all.', tone: 'Support escalation' },
  { store: 'Bridleworks', handle: '@bridleworks', title: 'I returned it with the label you sent me, where\'s my refund', body: 'Sent back with tracking. Still waiting for money back.', tone: 'Escalated' },
  { store: 'Kessler', handle: '@kessler', title: 'My daughter used my card without my permission', body: 'Unauthorized purchase made by family member on my card.', tone: 'Chargeback risk' },
  { store: 'Midform', handle: '@midform', title: 'I cancelled the order immediately but it still shipped', body: 'Cancelled same day but shipment still processed.', tone: 'Billing dispute' },
  { store: 'Northrun', handle: '@northrun', title: 'The package was sealed but there was nothing inside it', body: 'Box sealed perfectly but completely empty inside.', tone: 'Refund requested' },
  { store: 'Prime & Co', handle: '@primeco', title: 'I got store credit but I want my money back', body: 'Refunded as credit not real money. Want actual refund.', tone: 'Policy abuse' },
  { store: 'Oakshelf', handle: '@oakshelf', title: 'The refund you sent was less than what I paid', body: 'Refund amount doesn\'t match original purchase price.', tone: 'Billing dispute' },
  { store: 'Bridleworks', handle: '@bridleworks', title: 'It\'s clearly a fake, this isn\'t the real product', body: 'Product appears to be counterfeit based on packaging.', tone: 'Manual review' },
  { store: 'Kessler', handle: '@kessler', title: 'My account was hacked, I didn\'t buy any of this', body: 'Multiple unauthorized purchases on my compromised account.', tone: 'Chargeback risk' },
  { store: 'Midform', handle: '@midform', title: 'The gift I sent never reached the person I sent it to', body: 'Shipped as gift but recipient says they never got it.', tone: 'New dispute' },
  { store: 'Northrun', handle: '@northrun', title: 'Three items were missing from the box', body: 'Order had five items but only two arrived.', tone: 'Refund requested' },
  { store: 'Prime & Co', handle: '@primeco', title: 'You said the promo was applied but you charged me full price', body: 'Promo code accepted but invoice shows full price.', tone: 'Billing dispute' },
  { store: 'Oakshelf', handle: '@oakshelf', title: 'The item inside the box wasn\'t what I checked out', body: 'Different product shipped than what I ordered.', tone: 'Support escalation' },
  { store: 'Bridleworks', handle: '@bridleworks', title: 'I already disputed this and you still haven\'t resolved it', body: 'Opened dispute weeks ago and no resolution yet.', tone: 'Escalated' },
];

const columns = [
  complaints.filter((_, i) => i % 5 === 0),
  complaints.filter((_, i) => i % 5 === 1),
  complaints.filter((_, i) => i % 5 === 2),
  complaints.filter((_, i) => i % 5 === 3),
  complaints.filter((_, i) => i % 5 === 4),
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
  return (
    <figure
      className="group relative w-[252px] cursor-pointer transition-colors duration-200"
      style={{
        background: 'rgba(22,21,16,0.92)',
        border: '1px solid rgba(48,44,36,0.9)',
        borderRadius: 0,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -8px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(48,44,36,0.7)', background: 'rgba(15,14,10,0.6)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '9.5px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#5A5650',
          }}
        >
          {handle}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#7B2D26',
            fontWeight: 600,
          }}
        >
          {tone}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        <figcaption
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12.5px',
            fontWeight: 500,
            color: '#C8BAA4',
            lineHeight: 1.4,
            marginBottom: '6px',
          }}
        >
          {title}
        </figcaption>
        <blockquote
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '10.5px',
            color: '#5A5650',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {body}
        </blockquote>
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2"
        style={{ borderTop: '1px solid rgba(48,44,36,0.7)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '9.5px',
            letterSpacing: '0.08em',
            color: '#4A4640',
          }}
        >
          {store}
        </span>
      </div>
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
    <div className="relative h-[740px] w-[252px] overflow-hidden">
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
    <div className="relative flex h-[900px] w-full items-center justify-end overflow-hidden [perspective:1800px]">
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

      {/* Warm glow anchor — grounds the columns against the dark bg */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_55%_52%,rgba(123,45,38,0.13),transparent_70%)]" />
      {/* Secondary cool-dark vignette to push depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_50%,transparent_40%,rgba(15,14,10,0.55)_100%)]" />
      <div
        className="flex flex-row items-start gap-5"
        style={{
          transform:
            'translateX(543px) translateY(30px) translateZ(0) rotateX(9deg) rotateY(-10deg) rotateZ(5deg)',
        }}
      >
        <MarqueeColumn items={columns[0]} duration={30} />
        <MarqueeColumn items={columns[1]} reverse duration={34} />
        <MarqueeColumn items={columns[2]} duration={28} />
        <MarqueeColumn items={columns[3]} reverse duration={36} />
        <MarqueeColumn items={columns[4]} duration={32} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-[#15140F] via-[#15140F]/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#15140F] via-[#15140F]/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-64 bg-gradient-to-r from-[#15140F] via-[#15140F]/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-[#15140F] via-[#15140F]/80 to-transparent" />
    </div>
  );
}
