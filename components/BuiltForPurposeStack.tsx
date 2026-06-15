'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

function FourPartLinearSection() {
  return (
    <div className="relative pt-14 lg:pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-160px] h-[420px] w-[920px] -translate-x-1/2 rounded-full bg-black/[0.025] blur-[110px]" />
      </div>

      <div className="relative grid grid-cols-1 items-start border-t border-black/[0.08] sm:grid-cols-2 lg:grid-cols-4">
        <FourPartCard
          number="1.0"
          label="Connect"
          heading="Link your store"
          body="Shopify, BigCommerce, or WooCommerce. One OAuth flow, no engineering required."
        />

        <FourPartCard
          number="2.0"
          label="Connect"
          heading="Link your helpdesk"
          body="Gorgias, Zendesk, or Freshdesk. Unauth attaches to the tools your team already lives in."
        />

        <FourPartCard
          number="3.0"
          label="Enrich"
          heading="Claims enrich automatically"
          body="Every inbound ticket pulls in order history, delivery signals, and cross-merchant flags — no manual lookups."
        />

        <FourPartCard
          number="4.0"
          label="Review"
          heading="Reply with full context"
          body="Order history, delivery signals, and cross-merchant flags are already loaded when the ticket opens. No tabs, no manual lookups."
        />
      </div>
    </div>
  );
}

function FourPartCard({
  number,
  label,
  heading,
  body,
}: {
  number: string;
  label: string;
  heading: string;
  body: string;
}) {
  return (
    <article className="flex h-full flex-col border-b border-black/[0.08] px-0 py-8 sm:px-7 lg:border-b-0 lg:pb-12">
      <div className="font-mono text-[14px] tracking-[-0.015em] text-black/40">
        <span>{number}</span>
        <span className="ml-2">{label}</span>
      </div>

      <h3 className={`${foundationStyles.landingSubsectionTitle} mt-8 max-w-[280px] leading-[1.2]`}>
        {heading}
      </h3>

      <p className={`${foundationStyles.landingSectionBody} mt-4 max-w-[270px]`}>{body}</p>
    </article>
  );
}

export default function BuiltForPurposeStack() {
  return (
    <section
      className="relative overflow-hidden bg-white pb-14 text-[#111111] sm:pb-16 lg:pb-20 border-t border-black/[0.07]"
      data-nav-theme="light"
    >
      <Background />

      <div className="relative mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-10 xl:px-12">
        <div className="grid gap-10 pb-8 pt-14 sm:pt-16 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:items-center lg:gap-12 xl:gap-16">
          <div className="max-w-[620px] pt-2 lg:max-w-none">
            <p className={foundationStyles.landingSectionEyebrow}>Integrations</p>
            <h2 className={`${foundationStyles.landingSectionTitle} max-w-[440px]`}>
              Connect your stack in minutes.
            </h2>
            <p className={`${foundationStyles.landingSectionLead} max-w-[620px] lg:max-w-[390px]`}>
              Link your store and helpdesk once. Unauth pulls in orders, refunds, and delivery data automatically
              — cross-merchant intelligence appears beside every claim before your team replies.
            </p>
          </div>

          <div className="relative flex min-w-0 items-center justify-center overflow-visible lg:justify-end">
            <div className="relative h-[220px] w-full max-w-[765px] overflow-visible sm:h-[330px] md:h-[405px] lg:h-[435px] xl:h-[463px]">
              <div className="absolute left-1/2 top-0 w-[1020px] origin-top -translate-x-1/2 scale-[0.3] sm:scale-[0.46] md:scale-[0.58] lg:scale-[0.65] xl:scale-[0.75]">
                <div className="pl-5 font-mono text-[25px] tracking-[0.12em] text-black/40">INTEGRATION</div>

                <div className="relative mt-6 h-[560px] w-full" aria-hidden>
                  <StackDiagram />

                  <div className="absolute inset-0 translate-x-[3%]">
                    <EvidenceAnnotation />
                    <HelpdeskAnnotation />
                    <StoreAnnotation />
                    <HelpdeskLogoRail />
                    <StoreLogoRail />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FourPartLinearSection />
      </div>
    </section>
  );
}

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-white" />
      <div className="absolute left-[22%] top-[160px] h-[420px] w-[620px] rounded-full bg-black/[0.035] blur-[110px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_38%_32%,rgba(0,0,0,0.038)_0%,transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_60%,rgba(0,0,0,0.06)_86%,rgba(0,0,0,0.12)_100%)]" />
    </div>
  );
}

function StackDiagram() {
  return (
    <>
      <IsometricPlate className="left-[20px] top-[40px]" prominent />
      <IsometricPlate className="left-[20px] top-[245px]" />
      <IsometricPlate className="left-[20px] top-[450px]" />

      {/* Left vertex = plate left(20) + SVG vertex x(20) = 40
          Right vertex = plate left(20) + SVG vertex x(420) = 440
          Gap 1: plate1 side bottom(174) → plate2 left vertex(325), centre=249, yTop=204
          Gap 2: plate2 side bottom(379) → plate3 left vertex(530), centre=454, yTop=409 */}
      <StackArrowColumn x={40}  yTop={204} />
      <StackArrowColumn x={440} yTop={204} baseDelay={0.18} />

      <StackArrowColumn x={40}  yTop={409} />
      <StackArrowColumn x={440} yTop={409} baseDelay={0.18} />

      <Connector fromX={455} fromY={147} toX={520} />
      <Connector fromX={455} fromY={352} toX={520} />
      <Connector fromX={455} fromY={557} toX={520} />
    </>
  );
}

function StackArrowColumn({ x, yTop, count = 5, baseDelay = 0 }: { x: number; yTop: number; count?: number; baseDelay?: number }) {
  const spacing = 18;
  const totalH = count * spacing;
  return (
    <svg
      className="absolute overflow-visible"
      style={{ left: x - 6, top: yTop, width: 12, height: totalH }}
      aria-hidden
    >
      <style>{`
        @keyframes ua-flow-up {
          0%   { opacity: 0.12; transform: translateY(3px);  }
          45%  { opacity: 0.85; transform: translateY(0px);  }
          100% { opacity: 0.12; transform: translateY(-3px); }
        }
      `}</style>
      {Array.from({ length: count }, (_, i) => {
        const cy = totalH - i * spacing - 6;
        const delay = `${(baseDelay + i * 0.14).toFixed(2)}s`;
        return (
          <path
            key={i}
            d={`M2.5 ${cy + 5} L6 ${cy} L9.5 ${cy + 5}`}
            fill="none"
            stroke="rgba(0,0,0,0.75)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: `ua-flow-up 1.05s ease-in-out infinite`, animationDelay: delay }}
          />
        );
      })}
    </svg>
  );
}

function IsometricPlate({ className, prominent = false }: { className: string; prominent?: boolean }) {
  const uid = className.replace(/\W/g, '');
  const strokeColor = prominent ? 'rgba(0,0,0,0.44)' : 'rgba(0,0,0,0.28)';

  // r=8 rounded corners, pre-computed for each vertex.
  // Outer silhouette: (220,10)→(420,80)→(420,134)→(220,204)→(20,134)→(20,80)
  const outerPath =
    'M 212.44 12.64 Q 220 10 227.56 12.64 ' +
    'L 412.44 77.36 Q 420 80 420 88 ' +
    'L 420 126 Q 420 134 412.44 136.64 ' +
    'L 227.56 201.36 Q 220 204 212.44 201.36 ' +
    'L 27.56 136.64 Q 20 134 20 126 ' +
    'L 20 88 Q 20 80 27.56 77.36 Z';

  // Top face: (220,10)→(420,80)→(220,150)→(20,80)
  const topFacePath =
    'M 212.44 12.64 Q 220 10 227.56 12.64 ' +
    'L 412.44 77.36 Q 420 80 412.44 82.64 ' +
    'L 227.56 147.36 Q 220 150 212.44 147.36 ' +
    'L 27.56 82.64 Q 20 80 27.56 77.36 Z';

  // Interior crease — fold line between top face and side band
  const creasePath =
    'M 27.56 82.64 L 212.44 147.36 Q 220 150 227.56 147.36 L 412.44 82.64';

  return (
    <div className={`absolute h-[226px] w-[440px] ${className}`}>
      <svg viewBox="0 0 440 226" width={440} height={226} className="block" aria-hidden>
        <defs>
          <filter id={`plate-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* Full silhouette — side fill + shadow */}
        <path d={outerPath} fill="#e6e6e2" filter={`url(#plate-shadow-${uid})`} />

        {/* Top face — lighter fill drawn over the silhouette */}
        <path d={topFacePath} fill="#f5f5f2" />

        {/* Outer stroke — single clean outline, no double-stroke */}
        <path d={outerPath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />

        {/* Interior crease between top face and side band */}
        <path d={creasePath} fill="none" stroke={strokeColor} strokeWidth="1" opacity="0.55" />
      </svg>
    </div>
  );
}


function Connector({ fromX, fromY, toX }: { fromX: number; fromY: number; toX: number }) {
  const width = toX - fromX;

  return (
    <svg
      className="absolute overflow-visible"
      style={{ left: fromX, top: fromY - 2, width: width + 8, height: 6 }}
      aria-hidden
    >
      <line
        x1="0"
        y1="3"
        x2={width}
        y2="3"
        stroke="rgba(0,0,0,0.78)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <circle cx={width + 4} cy="3" r="3" fill="rgba(0,0,0,0.86)" />
    </svg>
  );
}

function EvidenceAnnotation() {
  return (
    <AnnotationBlock
      className="left-[520px] top-[142px]"
      eyebrow="UNAUTH"
      eyebrowPill
      title="Evidence layer"
      body="Cross-merchant context and graded evidence on every ticket"
    />
  );
}

function HelpdeskAnnotation() {
  return (
    <AnnotationBlock
      className="left-[520px] top-[333px]"
      eyebrow="HELPDESK"
      title="Your helpdesk"
      body="Evidence appears beside the ticket before your team replies"
    />
  );
}

function StoreAnnotation() {
  return (
    <AnnotationBlock
      className="left-[520px] top-[566px]"
      eyebrow="STORE"
      title="Your store"
      body="Orders, customers, deliveries, refunds, and chargebacks"
    />
  );
}

function AnnotationBlock({
  className,
  eyebrow,
  eyebrowPill = false,
  title,
  body,
}: {
  className: string;
  eyebrow: string;
  eyebrowPill?: boolean;
  title: string;
  body: string;
}) {
  return (
    <div className={`absolute max-w-[220px] -translate-y-1/2 ${className}`}>
      {eyebrowPill ? (
        <span className="inline-flex rounded-full border-[3px] border-black/25 bg-white px-5 py-2 text-[16px] font-bold uppercase tracking-[0.1em] text-[#111111]">
          {eyebrow}
        </span>
      ) : (
        <div className="font-mono text-[14px] uppercase tracking-[0.16em] text-black/40">{eyebrow}</div>
      )}
      <div className="mt-2 text-[24px] font-medium tracking-[-0.04em] text-[#111111]">{title}</div>
      <div className="mt-2 text-[19px] leading-[1.3] tracking-[-0.04em] text-black/56">{body}</div>
    </div>
  );
}

function HelpdeskLogoRail() {
  return (
    <LogoRail className="left-[780px] top-[333px]" label="HELPDESK">
      <LogoRow src="/integrations/gorgias.png" name="Gorgias" />
      <LogoRow src="/integrations/zendesk.svg" name="Zendesk" />
      <LogoRow src="/integrations/freshdesk.svg" name="Freshdesk" />
    </LogoRail>
  );
}

function StoreLogoRail() {
  return (
    <LogoRail className="left-[780px] top-[566px]" label="STORE">
      <LogoRow src="/integrations/shopify.svg" name="Shopify" />
      <LogoRow src="/integrations/bigcommerce.svg" name="BigCommerce" />
      <LogoRow src="/integrations/woocommerce.svg" name="WooCommerce" />
    </LogoRail>
  );
}

function LogoRail({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`absolute w-[210px] -translate-y-1/2 ${className}`}>
      <div className="relative">
        <div className="translate-y-[17px] font-mono text-[14px] uppercase tracking-[0.2em] text-black/40">{label}</div>
        <div className="relative mt-[38px] pl-[54px]">
          <div className="absolute left-0 top-0 h-[142px] w-[30px]">
            <div className="absolute left-0 top-0 h-full w-px bg-black/20" />
            <div className="absolute left-0 top-0 h-px w-[28px] bg-black/20" />
            <div className="absolute left-0 bottom-0 h-px w-[26.6px] bg-black/20" />
          </div>
          <div className="space-y-7 translate-x-[4%] -translate-y-[8%]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LogoRow({ src, name }: { src: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={src}
        alt=""
        width={32}
        height={32}
        loading="eager"
        unoptimized
        className="h-8 w-8 shrink-0 object-contain"
      />
      <div className="text-[20px] font-medium tracking-[-0.04em] text-[#111111]">{name}</div>
    </div>
  );
}
