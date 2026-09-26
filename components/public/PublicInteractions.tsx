'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DEMO_CASES, DEMO_FEATURED_CASE_IDS, DEMO_PRESENTATION, DEMO_LANDING_POLICY_OUTCOMES, DEMO_LANDING_CASE_CHECKS } from '@/lib/demo/merchantCaseV1';
import styles from './public.module.css';
import { EvidenceFocus } from './PublicEvidenceVisuals';
import { OperatingPathVisual } from './LandingOutcomeVisuals';
import { SampleEvidenceVisual } from './SampleEvidenceVisual';
import { ProductThumbnail } from '@/components/ui/ProductThumbnail';
import { LandingDetailModal } from './LandingDetailModal';

function moveTab(event: KeyboardEvent<HTMLButtonElement>, index:number, count:number, select:(n:number)=>void, vertical = false) {
  const next=event.key===(vertical?'ArrowDown':'ArrowRight')?(index+1)%count:event.key===(vertical?'ArrowUp':'ArrowLeft')?(index+count-1)%count:event.key==='Home'?0:event.key==='End'?count-1:null;
  if(next===null)return; event.preventDefault(); select(next);
  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
}
export function SampleCases() {
  const [dialogCase, setDialogCase] = useState<{ title: string; details: ReactNode } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const orderedCases=DEMO_FEATURED_CASE_IDS.map(id=>DEMO_CASES.find(sample=>sample.id===id)!);
  const labels:Record<string,string>={'not-received':'Not received',recoverable:'Wrong item',legitimate:'Damaged item',duplicate:'Already refunded'};
  const lessons:Record<string,string>={'not-received':'No parcel. A refund and a loss to recover.',recoverable:'Refund due. Warehouse recovery capped.',legitimate:'Customer left with a broken item.',duplicate:'A second payout on the same item.'};
  const decisions:Record<string,string>={'not-received':'Refund £248',recoverable:'Refund £248',legitimate:'Send replacement'};
  return <div className={styles.sampleChapter} data-story-artifact="case-comparison">
    <div className={styles.chapterCopy}>
      <h2 className={styles.heading}>Costly mistakes.<br/><span>Clear system decisions.</span></h2>
      <p className={styles.lead}>Unauth applies your rules to the evidence and selects the outcome. Your team handles the exceptions.</p>
    </div>
    <div className={styles.caseCardGrid} aria-label="Three customer situations and Unauth decisions">{orderedCases.map(sample=>{
      const outcome=DEMO_LANDING_POLICY_OUTCOMES[sample.id];
      const presentation=DEMO_PRESENTATION[sample.id];
      const caseDetails=<div className={styles.caseCardDetails}>
        <div className={styles.caseCardOpenDecision}><span>Unauth decides</span><strong>{decisions[sample.id]}</strong></div>
        <dl className={styles.caseCardFacts}>
          <div><dt>Evidence</dt><dd className={styles.sampleEvidenceLine}><SampleEvidenceVisual caseId={sample.id}/><span>{presentation.record}</span></dd></div>
          <div><dt>Your rule</dt><dd>{outcome.rule}</dd></div>
        </dl>
        <p>{outcome.reason}</p>
      </div>;
      return <details key={sample.id} className={styles.caseDecisionCard}>
        <summary aria-label={`Details: ${labels[sample.id]}`} aria-haspopup="dialog" onClick={event=>{
          event.preventDefault();
          event.currentTarget.focus();
          setDialogCase({title:labels[sample.id],details:caseDetails});
          setDialogOpen(true);
        }}>
          <div className={styles.caseCardSummary}>
            <div className={styles.caseCardHeader}><span>{labels[sample.id]}</span><strong>{sample.reference}</strong></div>
            <h3>{lessons[sample.id]}</h3>
            <div className={styles.caseCardAnchor}>
              {sample.id === 'not-received'
                ? <ProductThumbnail src={presentation.image} size={44}/>
                : <SampleEvidenceVisual caseId={sample.id}/>}
              <span>{sample.id === 'not-received' ? presentation.item : sample.id === 'recoverable' ? 'Packing photo' : 'Damage photo'}</span>
            </div>
            <div className={styles.caseCardChecks}><span>Evidence matched</span><ul>{DEMO_LANDING_CASE_CHECKS[sample.id].split(' · ').map(check=><li key={check}>{check}</li>)}</ul></div>
            <div className={styles.caseCardDecision}><span>Unauth decides</span><strong>{decisions[sample.id]}</strong></div>
          </div>
          <span className={styles.artifactArrow} aria-hidden="true">
            <svg className={styles.artifactOpenIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18 18 6M6 6h12v12"/></svg>
            <svg className={styles.artifactCloseIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </span>
        </summary>
        {caseDetails}
      </details>;
    })}</div>
    <LandingDetailModal open={dialogOpen} onClose={()=>setDialogOpen(false)} title={dialogCase?.title ?? 'Case decision'} eyebrow="How the decision was reached">
      {dialogCase?.details}
    </LandingDetailModal>
  </div>;
}
const evidenceChecks=[
  {id:'order',title:'What did they buy?',text:'Check the order, the item and the quantity involved. The selling price and the cost of sending a replacement are different amounts.'},
  {id:'payouts',title:'Have we already put this right?',text:'Look for a recorded refund or replacement for the same item before approving another one.'},
  {id:'support',title:'What is the customer telling us?',text:'Read the conversation and any photos or attachments. Keep what the customer reports separate from what the records confirm.'},
  {id:'fulfilment',title:'What happened to the parcel?',text:'Check available packing and delivery records. Show what is missing. Naming a carrier or warehouse does not prove it is responsible.'},
  {id:'policy',title:'What do our rules allow?',text:'See which rule applies, why it applies and what still needs checking. Your team reviews the recommendation and decides.'},
];
export function EvidenceChecks() {
  const [selected,setSelected]=useState(0);
  return <div className={styles.gateSection} data-source-construction="loop-accordion">
    <div className={styles.gateIntro}>
      <div className={styles.splitIntro}><h2 className={styles.heading}>Resolve with the facts.</h2>
      <p className={styles.lead}>The gate is the checkpoint before a resolution decision. It checks available evidence and your rules, then explains the recommended next step.</p></div>
      <div className={styles.gateActors}><div><strong>For people: a recommendation with reasons.</strong><p>Review the route, record the decision and prepare the manual handoff. Authorised people can record an exception.</p></div><div><strong>For participating AI: a route it must follow.</strong><p>Intended connected claims enter automatically before a decision. AI must follow the authorised route or escalate; it cannot approve its own exception.</p></div></div>
      <p className={styles.fine}>Automatic entry and enforcement depend on participating integrations. Public AI connections are pre-launch; actions in unconnected tools are not intercepted.</p>
    </div>
    <div className={styles.split}>
      <div><h3 className={styles.subheading}>Five questions before you decide.</h3><div className={styles.accordionList}>
        {evidenceChecks.map((item,index)=><div className={styles.accordionItem} key={item.id}><h4><button id={`check-${item.id}`} className={styles.accordionButton} aria-expanded={selected===index} aria-controls={`check-body-${item.id}`} onClick={()=>setSelected(index)}>{item.title}<span aria-hidden="true">{selected===index?'−':'+'}</span></button></h4><div id={`check-body-${item.id}`} role="region" aria-labelledby={`check-${item.id}`} hidden={selected!==index} className={styles.accordionBody}>{item.text}</div></div>)}
      </div></div><div className={styles.mediaSide}><EvidenceFocus selected={selected}/></div>
    </div>
  </div>;
}
const controls=[
  {title:'Team follow-up',heading:'Make it clear who does what next.',text:'From the first missing photo to the last payment check, assign the work and a due or review date. Support, recovery and finance keep their tasks linked to the same case. A customer resolution does not silently close a recovery task.',art:'Team follow-up linked to the case, evidence and next action'},
  {title:'Policy checks',heading:'Check a rule before you use it.',text:'Preview how a proposed rule would treat the cases you have. See which requests and amounts it affects before publishing it. A preview does not change your live rules.',art:'Current-evidence policy comparison before publication'},
  {title:'Loss patterns',heading:'Spot problems worth investigating.',text:'Look for repeated issues involving a product, warehouse or carrier. Open the cases to understand the facts before changing a rule. A repeated problem alone does not prove who is at fault.',art:'A supported loss pattern with its underlying cases'},
];
export function OperationalControls() {
  const [selected,setSelected]=useState(0);
  const [vertical,setVertical]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(min-width: 1100px)');
    const update=()=>setVertical(media.matches);
    update(); media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);
  return <div className={styles.controls} data-source-construction="loop-capabilities"><div className={styles.controlTabs} role="tablist" aria-label="Operational controls" aria-orientation={vertical?"vertical":"horizontal"}>{controls.map((c,i)=><button key={c.title} role="tab" id={`control-${i}`} aria-controls={`control-panel-${i}`} aria-selected={selected===i} tabIndex={selected===i?0:-1} onClick={()=>setSelected(i)} onKeyDown={e=>moveTab(e,i,controls.length,setSelected,vertical)}>{c.title}</button>)}</div>{controls.map((item,index)=><div key={item.title} hidden={selected!==index} className={styles.controlPanel} role="tabpanel" id={`control-panel-${index}`} aria-labelledby={`control-${index}`} tabIndex={0}><div><h3>{item.heading}</h3><p>{item.text}</p></div><OperatingPathVisual selected={index}/></div>)}</div>;
}
export function PublicFAQ({ items, native = false }: { items:readonly {question:string;answer:ReactNode}[]; native?:boolean }) {
  const [selected,setSelected]=useState<number|null>(null);
  if(native)return <div>{items.map((item,index)=><details className={styles.nativeFaq} key={item.question}><summary className={styles.faqButton}><h3>{item.question}</h3><span className={styles.faqIndicator} aria-hidden="true">+</span></summary><div className={styles.faqBody} id={`faq-answer-${index}`}>{item.answer}</div></details>)}</div>;
  return <div>{items.map((item,index)=><div className={styles.faqItem} key={item.question}><h3><button className={styles.faqButton} aria-expanded={selected===index} aria-controls={`faq-answer-${index}`} id={`faq-question-${index}`} onClick={()=>setSelected(selected===index?null:index)}><span>{item.question}</span><span aria-hidden="true">{selected===index?'−':'+'}</span></button></h3><div className={styles.faqBody} id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} hidden={selected!==index}>{item.answer}</div></div>)}</div>;
}

/** The server page supplies the nav; only its measured clearance and menu behaviour are client-owned. */
export function LandingNavigation({children}:{children:ReactNode}) {
  const frame=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=frame.current;
    const landing=element?.closest<HTMLElement>('[data-landing-page]');
    if(!element||!landing)return;
    const measure=()=>landing.style.setProperty('--landing-header-height',`${element.getBoundingClientRect().height}px`);
    measure();
    const observer=new ResizeObserver(measure); observer.observe(element);
    const motionTargets=landing.querySelectorAll<HTMLElement>('[data-landing-artifact="source-records"], [data-landing-artifact="policy-gate"], [data-landing-artifact="recovery-evidence"], [data-landing-artifact="verified-money"]');
    const motionObserver=typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        (entry.target as HTMLElement).dataset.motionVisible='true';
        motionObserver?.unobserve(entry.target);
      }
    },{rootMargin:'0px 0px -8% 0px',threshold:.12});
    if(motionObserver){
      motionTargets.forEach(target=>motionObserver.observe(target));
      landing.dataset.motionReady='true';
    }
    const closeOnHistory=()=>{ const menu=element.querySelector('details'); if(menu)menu.open=false; };
    window.addEventListener('popstate',closeOnHistory);
    return ()=>{observer.disconnect();motionObserver?.disconnect();delete landing.dataset.motionReady;window.removeEventListener('popstate',closeOnHistory);};
  },[]);
  return <div ref={frame} data-landing-navigation className={styles.landingNav} onClick={event=>{
    if((event.target as Element).closest('a')){const menu=frame.current?.querySelector('details');if(menu)menu.open=false;}
  }} onKeyDown={event=>{
    if(event.key==='Escape'){const menu=frame.current?.querySelector('details');if(menu?.open){menu.open=false;menu.querySelector('summary')?.focus();event.preventDefault();}}
  }} onBlur={event=>{
    if(!event.currentTarget.contains(event.relatedTarget)){const menu=frame.current?.querySelector('details');if(menu)menu.open=false;}
  }}>{children}</div>;
}
