'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

function FourPartLinearSection() {
  return (
    <div className="relative pt-8 lg:pt-10">
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
          label="Decide"
          heading="Your team stays in control"
          body="Context surfaces beside the ticket. Evidence in, verdict yours."
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

      <a
        href="#"
        className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.02em] text-black/52 transition hover:text-black"
      >
        Learn more
        <ArrowRight size={14} strokeWidth={1.7} />
      </a>
    </article>
  );
}

export default function BuiltForPurposeStack() {
  return (
    <section
      className="relative overflow-hidden bg-[#f7f7f5] pb-14 text-[#111111] sm:pb-16 lg:pb-20"
      data-nav-theme="light"
    >
      <Background />

      <div className="relative mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-10 xl:px-12">
        <div className="grid gap-10 pb-8 pt-14 sm:pt-16 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:items-center lg:gap-12 xl:gap-16">
          <div className="max-w-[620px] pt-2 lg:max-w-none">
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
      <div className="absolute inset-0 bg-[#f7f7f5]" />
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

      <StackArrow x={418} y={228} height={14} />
      <StackArrow x={418} y={433} height={14} />

      <Connector fromX={455} fromY={125} toX={520} />
      <Connector fromX={455} fromY={330} toX={520} />
      <Connector fromX={455} fromY={535} toX={520} />
    </>
  );
}

function IsometricPlate({ className, prominent = false }: { className: string; prominent?: boolean }) {
  const uid = className.replace(/\W/g, '');

  return (
    <div className={`absolute h-[190px] w-[440px] ${className}`}>
      <svg
        viewBox="0 0 440 190"
        width={440}
        height={190}
        className="block"
        aria-hidden
      >
        <defs>
          <filter id={`plate-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.16" />
          </filter>
        </defs>

        <polygon
          points="20,80 220,150 420,80 420,98 220,168 20,98"
          fill="#e6e6e2"
          stroke="rgba(0,0,0,0.26)"
          strokeWidth="1"
        />
        <polygon
          points="220,10 420,80 220,150 20,80"
          fill="#f5f5f2"
          stroke={prominent ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.34)'}
          strokeWidth="1"
          filter={`url(#plate-shadow-${uid})`}
        />
      </svg>
    </div>
  );
}

function StackArrow({ x, y, height }: { x: number; y: number; height: number }) {
  return (
    <svg
      className="absolute"
      style={{ left: x - 6, top: y, width: 12, height: height + 10 }}
      aria-hidden
    >
      <line
        x1="6"
        y1={height + 6}
        x2="6"
        y2="4"
        stroke="rgba(0,0,0,0.86)"
        strokeWidth="1.5"
        strokeDasharray="2 4"
      />
      <path
        d="M2.5 9 L6 4 L9.5 9"
        fill="none"
        stroke="rgba(0,0,0,0.86)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      className="left-[520px] top-[120px]"
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
      className="left-[520px] top-[311px]"
      eyebrow="HELPDESK"
      title="Your helpdesk"
      body="Evidence appears beside the ticket before your team replies"
    />
  );
}

function StoreAnnotation() {
  return (
    <AnnotationBlock
      className="left-[520px] top-[544px]"
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
    <LogoRail className="left-[780px] top-[311px]" label="HELPDESK">
      <LogoRow src="/integrations/gorgias.png" name="Gorgias" />
      <LogoRow src="/integrations/zendesk.svg" name="Zendesk" />
      <LogoRow src="/integrations/freshdesk.svg" name="Freshdesk" />
    </LogoRail>
  );
}

function StoreLogoRail() {
  return (
    <LogoRail className="left-[780px] top-[544px]" label="STORE">
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
        className="h-8 w-8 shrink-0 object-contain"
      />
      <div className="text-[20px] font-medium tracking-[-0.04em] text-[#111111]">{name}</div>
    </div>
  );
}
