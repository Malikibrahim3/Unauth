import {
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Globe,
  Link,
  MousePointer2,
  Shield,
  ShieldCheck,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './EvidenceNotVerdictsHero.module.css';

const evidenceItems: Array<{
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}> = [
  { title: 'Delivery evidence', subtitle: 'GPS, photo, signature', Icon: Camera },
  { title: 'Identity signals', subtitle: 'Hashed & privacy safe', Icon: User },
  { title: 'Merchant history', subtitle: 'Claims, returns, behavior', Icon: BarChart3 },
  { title: 'Cross-merchant context', subtitle: 'Signals across stores', Icon: Globe },
  { title: 'Chargeback evidence', subtitle: 'Dispute reason, timeline', Icon: ShieldCheck },
];

const principleCards: Array<{
  number: string;
  title: string;
  body: string;
  Icon: LucideIcon;
}> = [
  {
    number: '01',
    Icon: Shield,
    title: 'Zero automated\ndecisions, by design',
    body: 'Unauth does not approve, deny, or refund. It only provides evidence.',
  },
  {
    number: '02',
    Icon: FileText,
    title: 'Every claim arrives\nwith context',
    body: 'The full picture is attached before you open the ticket.',
  },
  {
    number: '03',
    Icon: Link,
    title: 'Repeated signals are\nmatched across merchants',
    body: 'See patterns across stores, not just isolated events.',
  },
  {
    number: '04',
    Icon: MousePointer2,
    title: 'Evidence packs sit\none click from the ticket',
    body: 'Open the pack, review the context, and decide with confidence.',
  },
];

function anim(delay: number): CSSProperties {
  return { animationDelay: `${delay}ms` };
}

function IncomingClaimCard({ className = '' }: { className?: string }) {
  return (
    <article className={`${styles.lightCard} z-[2] h-[280px] w-[192px] p-6 ${className}`}>
      <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-[#161616]">
        INCOMING CLAIM
      </p>
      <div className="mt-[34px] flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[rgba(166,106,66,0.16)] bg-[#F3E9DF]">
        <Ticket size={22} className="text-[#8F5B39]" aria-hidden />
      </div>
      <h3 className="mt-5 text-[15px] font-semibold leading-5 tracking-[-0.02em] text-[#111111]">
        “Never arrived”
      </h3>
      <p className="mt-2.5 text-sm font-normal leading-6 text-[rgba(17,17,17,0.58)]">
        Order #174582
        <br />
        5 days ago
      </p>
      <p className="mt-[22px] inline-flex h-[30px] items-center gap-2 rounded-full bg-[#F1E5D9] px-3 text-[12.5px] font-medium tracking-[-0.01em] text-[#A0643A]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A0643A] opacity-75" aria-hidden />
        Chargeback threat
      </p>
    </article>
  );
}

function EvidenceItem({ title, subtitle, Icon, index }: (typeof evidenceItems)[number] & { index: number }) {
  return (
    <article
      className={`${styles.evidenceItem} flex h-[76px] w-full items-center gap-4 rounded-[12px] border border-[rgba(126,86,55,0.13)] bg-[rgba(255,255,255,0.74)] py-0 pl-[18px] pr-5 shadow-[0_16px_40px_rgba(73,50,34,0.09),inset_0_1px_0_rgba(255,255,255,0.9)]`}
      style={anim(260 + index * 60)}
    >
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[rgba(166,106,66,0.14)] bg-[#F8F1EA]">
        <Icon size={20} strokeWidth={1.7} className="text-[#111111]" aria-hidden />
      </div>
      <div className="min-w-0">
        <h4 className="text-[15px] font-semibold leading-[19px] tracking-[-0.02em] text-[#111111]">{title}</h4>
        <p className="mt-[3px] text-[13px] font-normal leading-[18px] text-[rgba(17,17,17,0.56)]">
          {subtitle}
        </p>
      </div>
      <div className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(166,106,66,0.22)] opacity-85">
        <Check size={14} className="text-[#A0643A]" aria-hidden />
      </div>
    </article>
  );
}

function EvidenceLayerStack({ className = '' }: { className?: string }) {
  return (
    <div className={`z-[2] w-[390px] max-w-full ${className}`}>
      <p className="mb-[18px] text-center text-[11px] font-bold uppercase leading-[14px] tracking-[0.16em] text-[#8D5F41]">
        UNAUTH EVIDENCE LAYER
      </p>
      <div className="relative h-[425px] w-[390px] max-w-full rounded-[18px] border border-dotted border-[rgba(166,106,66,0.24)] bg-[rgba(255,255,255,0.16)]">
        <div className="absolute left-[58px] top-[66px] h-[355px] w-[282px] rounded-[14px] border border-[rgba(126,86,55,0.08)] bg-[rgba(255,255,255,0.18)]" />
        <div className="absolute left-[70px] top-[82px] h-[350px] w-[258px] rounded-[14px] border border-[rgba(126,86,55,0.06)] bg-[rgba(255,255,255,0.14)]" />
        <div className="absolute left-10 top-[27px] flex w-[310px] max-w-[calc(100%-80px)] flex-col gap-2.5">
          {evidenceItems.map((item, index) => (
            <EvidenceItem key={item.title} {...item} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewOutcomeCard({ className = '' }: { className?: string }) {
  return (
    <article className={`z-[2] h-[236px] w-[190px] rounded-2xl border border-[rgba(126,86,55,0.15)] bg-[rgba(255,255,255,0.54)] px-6 py-[26px] shadow-[0_20px_60px_rgba(72,50,34,0.09),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[10px] ${className}`}>
      <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-[#161616]">
        REVIEW OUTCOME
      </p>
      <div className="mt-[34px] flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(166,106,66,0.14)] bg-[#F8F1EA]">
        <Users size={24} className="text-[#111111]" aria-hidden />
      </div>
      <h3 className="mt-[26px] text-base font-medium leading-[22px] tracking-[-0.02em] text-[#111111]">
        Your team decides
      </h3>
      <p className="mt-[18px] text-sm font-normal leading-5 text-[rgba(17,17,17,0.56)]">No automated decision</p>
    </article>
  );
}

function FlowConnectors() {
  const dotClass =
    'absolute z-[3] h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[rgba(255,255,255,0.9)] bg-[#D49A64] shadow-[0_0_0_4px_rgba(212,154,100,0.10),0_0_18px_rgba(212,154,100,0.42)]';

  return (
    <>
      <svg
        className="absolute inset-0 z-[1] h-full w-full overflow-visible"
        viewBox="0 0 920 520"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M 232 310 C 260 310, 282 307, 310 304"
          fill="none"
          stroke="rgba(166,106,66,0.62)"
          strokeWidth="1.4"
          strokeDasharray="4 5"
          strokeLinecap="round"
          filter="drop-shadow(0 0 5px rgba(166,106,66,0.22))"
        />
        <path
          d="M 700 304 C 742 306, 770 312, 795 316"
          fill="none"
          stroke="rgba(166,106,66,0.62)"
          strokeWidth="1.4"
          strokeDasharray="4 5"
          strokeLinecap="round"
          filter="drop-shadow(0 0 5px rgba(166,106,66,0.22))"
        />
      </svg>
      <span className={dotClass} style={{ left: 232, top: 310 }} />
      <span className={`${dotClass} h-[10px] w-[10px] bg-[#DFA56D]`} style={{ left: 310, top: 304 }} />
      <span className={dotClass} style={{ left: 700, top: 304 }} />
      <span className={`${dotClass} h-[10px] w-[10px] bg-[#DFA56D]`} style={{ left: 795, top: 316 }} />
    </>
  );
}

function MobileConnector() {
  return (
    <div className="flex h-14 items-center justify-center" aria-hidden>
      <div className="h-full border-l border-dashed border-[rgba(166,106,66,0.58)]" />
      <div className="-ml-[5px] mt-10 h-[10px] w-[10px] rounded-full border-2 border-[rgba(255,255,255,0.9)] bg-[#DFA56D] shadow-[0_0_0_4px_rgba(212,154,100,0.10),0_0_18px_rgba(212,154,100,0.42)]" />
    </div>
  );
}

function PrincipleCard({ number, title, body, Icon, index }: (typeof principleCards)[number] & { index: number }) {
  return (
    <article
      className={`${styles.principleCard} relative min-h-[230px] overflow-hidden rounded-[14px] border border-[rgba(126,86,55,0.11)] bg-[rgba(255,255,255,0.22)] p-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[transform,background,border-color,box-shadow] duration-[220ms] ease-out md:h-[240px] ${
        index === 0 ? styles.principleCardActive : ''
      }`}
      style={anim(520 + index * 80)}
    >
      {index === 0 ? (
        <span className="absolute left-7 top-0 h-0.5 w-[42px] rounded-full bg-[linear-gradient(90deg,rgba(166,106,66,0),rgba(166,106,66,0.55),rgba(166,106,66,0))]" />
      ) : null}
      <p className="relative z-[2] text-xl font-medium leading-6 tracking-[-0.02em] text-[#A0643A]">{number}</p>
      <div className="mt-[18px] flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[rgba(126,86,55,0.15)] bg-[rgba(255,255,255,0.35)] text-[#111111]">
        <Icon size={24} strokeWidth={1.7} aria-hidden />
      </div>
      <div className="absolute right-6 top-7 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(126,86,55,0.12)] text-[#111111] opacity-75">
        <ChevronRight size={16} aria-hidden />
      </div>
      <h3 className="mt-5 whitespace-pre-line text-[22px] font-normal leading-[1.18] tracking-[-0.035em] text-[#111111]">
        {title}
      </h3>
      <p className="mt-4 text-sm font-normal leading-[1.45] tracking-[-0.01em] text-[rgba(17,17,17,0.60)]">
        {body}
      </p>
    </article>
  );
}

export default function EvidenceNotVerdictsHero() {
  return (
    <section className="relative min-h-[1010px] overflow-hidden bg-[#F6F1EA] px-6 pb-[54px] pt-[110px] text-[#111111] md:px-11 md:pt-[150px] xl:min-h-[1010px]">
      <div className="pointer-events-none absolute right-[260px] top-[120px] h-[520px] w-[720px] bg-[radial-gradient(circle,rgba(184,125,76,0.085),transparent_62%)] blur-[20px]" />
      <div className="pointer-events-none absolute left-[-120px] top-[100px] h-[520px] w-[520px] bg-[radial-gradient(circle,rgba(184,125,76,0.045),transparent_65%)] blur-[18px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-multiply [background-image:radial-gradient(rgba(17,17,17,0.55)_0.65px,transparent_0.65px)] [background-size:4px_4px]" />

      <div className="relative z-[2] grid items-start gap-12 min-[1380px]:grid-cols-[minmax(0,560px)_minmax(0,1fr)] min-[1380px]:gap-10 min-[1536px]:gap-14">
        <div className={`${styles.sectionRise} w-full pt-3 xl:w-[560px]`}>
          <p className="mb-7 text-[13px] font-semibold uppercase leading-[18px] tracking-[0.16em] text-[#A0643A]">
            EVIDENCE, NOT VERDICTS.
          </p>
          <h2 className="max-w-[540px] text-[34px] font-normal leading-[1.22] tracking-[-0.045em] text-[#111111] md:text-[34px] md:leading-[1.22]">
            Whether the ticket says
            <br />
            <span className="font-normal text-[#A66A42]">“never arrived”</span> or the
            <br />
            chargeback lands weeks later,
            <br />
            Unauth attaches cross-merchant
            <br />
            claim context to the review —
            <br />
            <span className="font-normal text-[#A66A42]">graded evidence</span>, assembled
            <br />
            automatically, decided by your team.
          </h2>
          <p className="mt-7 max-w-[560px] text-base font-normal leading-[1.55] tracking-[-0.02em] text-[rgba(17,17,17,0.68)] md:text-[17px]">
            Unauth links hashed identity signals across participating merchants so post-checkout claims arrive with
            context attached. It never blocks orders, never denies refunds, and never makes the decision for you.
          </p>
        </div>

        <div className={`${styles.diagramRise} relative min-h-[560px] min-[1380px]:min-h-[500px] min-[1536px]:min-h-[520px]`}>
          <div className={`${styles.diagramDesktop} relative mx-auto hidden h-[520px] w-[920px] max-w-full md:block min-[1380px]:ml-auto min-[1380px]:max-w-none`}>
            <FlowConnectors />
            <IncomingClaimCard className="absolute left-10 top-[170px]" />
            <EvidenceLayerStack className="absolute left-[310px] top-[45px]" />
            <ReviewOutcomeCard className="absolute right-0 top-[175px]" />
          </div>

          <div className="mx-auto flex w-full max-w-[420px] flex-col items-center md:hidden">
            <IncomingClaimCard />
            <MobileConnector />
            <EvidenceLayerStack />
            <MobileConnector />
            <ReviewOutcomeCard />
          </div>
        </div>
      </div>

      <div className="relative z-[2] mt-[72px] grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {principleCards.map((card, index) => (
          <PrincipleCard key={card.number} {...card} index={index} />
        ))}
      </div>
    </section>
  );
}
