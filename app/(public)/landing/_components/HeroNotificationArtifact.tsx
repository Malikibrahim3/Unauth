'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const notifications = [
  { store: 'Kessler', title: 'Parcel not received', body: 'Tracking shows delivered. Customer says nothing arrived at the door.', tone: 'new dispute', time: '2m ago' },
  { store: 'Midform', title: 'Missing item claim', body: 'Buyer says two items were missing from the parcel and wants a partial refund.', tone: 'refund requested', time: '5m ago' },
  { store: 'Northrun', title: 'Wrong item sent', body: 'Complaint says the item inside the box does not match the checkout order.', tone: 'support escalation', time: '9m ago' },
  { store: 'Prime & Co', title: 'Unauthorized purchase', body: 'Cardholder denies placing the order and says the transaction should be reversed.', tone: 'chargeback risk', time: '12m ago' },
  { store: 'Oakshelf', title: 'Damaged on arrival', body: 'Customer says the product arrived broken and unusable on first open.', tone: 'refund requested', time: '16m ago' },
  { store: 'Bridleworks', title: 'Duplicate charge', body: 'Buyer reports being charged twice for a single checkout session.', tone: 'billing dispute', time: '21m ago' },
];

const visibleCount = 5;
const cardHeight = 124;
const cardStep = 140;
const intervalMs = 1800;

export default function HeroNotificationArtifact() {
  const nextId = useRef(visibleCount);
  const [items, setItems] = useState(() =>
    Array.from({ length: visibleCount }, (_, index) => ({
      id: index,
      noteIndex: (notifications.length - index) % notifications.length,
    })),
  );

  useEffect(() => {
    const advance = () => {
      setItems((current) => {
        const nextNoteIndex = (current[0].noteIndex + 1) % notifications.length;
        const incoming = { id: nextId.current, noteIndex: nextNoteIndex };

        nextId.current += 1;

        return [incoming, ...current].slice(0, visibleCount);
      });
    };

    let timer: number | undefined;
    const starter = window.setTimeout(() => {
      advance();
      timer = window.setInterval(advance, intervalMs);
    }, 650);

    return () => {
      window.clearTimeout(starter);
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative min-h-[560px] overflow-hidden" data-notification-artifact="incoming-feed">
      <style>{`
        @keyframes ua-notification-arrive {
          0% {
            opacity: 0.58;
            transform: translate3d(0, -18px, 0) scale(0.96);
            box-shadow: 0 4px 20px -20px rgba(26,24,20,0.18);
          }
          62% {
            opacity: 1;
            transform: translate3d(0, 4px, 0) scale(1.025);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            box-shadow: 0 18px 42px -24px rgba(26,24,20,0.55);
          }
        }

        .ua-live-notification-card {
          transition:
            top 380ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 420ms ease,
            filter 420ms ease,
            transform 220ms ease,
            box-shadow 220ms ease,
            background-color 220ms ease;
          will-change: top, opacity;
        }

        .ua-live-notification-card.is-new {
          animation: ua-notification-arrive 560ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(142,51,42,0.10),transparent_42%)]" />
      <div className="relative mx-auto h-[414px] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_7%,black_90%,transparent)]">
        <div className="absolute inset-x-0 top-4 mx-auto h-full w-full">
          {items.map((item, index) => {
            const note = notifications[item.noteIndex];

            return (
              <figure
                key={item.id}
                className={cn(
                  'ua-live-notification-card absolute inset-x-0 mx-auto h-[124px] w-[min(92%,560px)] overflow-hidden rounded-xl border border-[#D8D0BD] bg-[#FDFBF6] p-4',
                  'shadow-[0_18px_42px_-24px_rgba(26,24,20,0.55)] backdrop-blur-[2px]',
                  'hover:z-20 hover:scale-[1.035] hover:bg-[#FFFDF8] hover:shadow-[0_24px_50px_-24px_rgba(26,24,20,0.62)]',
                  index === 0 && 'is-new',
                  index === visibleCount - 1 && 'opacity-35 blur-[0.35px]',
                )}
                style={{
                  height: cardHeight,
                  top: index * cardStep,
                  zIndex: visibleCount - index,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <figcaption className="text-sm font-medium text-[#1A1814]">{note.title}</figcaption>
                    <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-[#8A8472]">{note.store} · {note.time}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[#7B2D26]">{note.tone}</span>
                </div>
                <blockquote className="mt-2 text-xs leading-5 text-[#5D574D]">{note.body}</blockquote>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
