/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SampleCases, EvidenceChecks, OperationalControls, PublicFAQ, LandingNavigation } from '@/components/public/PublicInteractions';
import { PublicNav } from '@/components/public/PublicUI';
import { LandingArtifact } from '@/components/public/LandingArtifact';
import { RecoveryEvidenceVisual, FinancialOutcomeVisual } from '@/components/public/LandingOutcomeVisuals';
import { formatMoney } from '@/lib/utils/format';
import PublicLegal from '@/components/public/PublicLegal';
import Privacy from '@/components/visual-authority/generated/Legal-Privacy-Clean';
import Dpa from '@/components/visual-authority/generated/Legal-DPA-Clean';
import Handling from '@/components/visual-authority/generated/Legal-Data-Handling-Clean';
import Terms from '@/components/visual-authority/generated/Legal-Pilot-Terms-Clean';
import { DEMO_CASES, DEMO_FEATURED_CASE_IDS, DEMO_LANDING_POLICY_OUTCOMES, demoUrl } from '@/lib/demo/merchantCaseV1';

it('opens case explanations in a focused dialog without moving the cards or saving progress',async()=>{
 const storage=jest.spyOn(Storage.prototype,'setItem');
 const {container}=render(<SampleCases/>);
 const cards=[...container.querySelectorAll('details')];
 for(const [index,sample] of DEMO_FEATURED_CASE_IDS.map(id=>DEMO_CASES.find(sample=>sample.id===id)!).entries()){
  const card=cards[index];
  expect(card).toHaveTextContent(sample.reference);
  expect(card).toHaveTextContent(DEMO_LANDING_POLICY_OUTCOMES[sample.id].rule);
  expect(card).toHaveTextContent(DEMO_LANDING_POLICY_OUTCOMES[sample.id].reason);
  expect(card.open).toBe(false);
  const summary=card.querySelector('summary')!;
  fireEvent.click(summary);
  expect(card.open).toBe(false);
  const dialog=screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal','true');
  expect(dialog).toHaveTextContent(DEMO_LANDING_POLICY_OUTCOMES[sample.id].rule);
  fireEvent.click(screen.getByRole('button',{name:'Close'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(()=>expect(summary).toHaveFocus());
 }
 expect(cards).toHaveLength(3);
 expect(cards[0].querySelector('summary img')).toHaveAttribute('src','/demo/items/wool-coat.jpg');
 expect(cards[0].querySelector('dd img')).toBeNull();
 expect(cards[1].querySelector('summary img')).toHaveAttribute('src','/demo/evidence/wrong-item-packing.jpg');
 expect(cards[2].querySelector('summary img')).toHaveAttribute('src','/demo/evidence/damaged-bowl.jpg');
 expect(cards[1].querySelector('img')).toHaveAttribute('src','/demo/evidence/wrong-item-packing.jpg');
 expect(cards[1].querySelector('img')).toHaveAttribute('alt',expect.stringContaining('packing photo'));
 expect(cards[2].querySelector('img')).toHaveAttribute('src','/demo/evidence/damaged-bowl.jpg');
 expect(cards[2].querySelector('img')).toHaveAttribute('alt',expect.stringContaining('customer photo'));
 expect(screen.queryByRole('link',{name:'Explore this case'})).not.toBeInTheDocument();
 expect(container).not.toHaveTextContent(/already refunded|fictional|illustrated|supervised|pre-launch/i);
 expect(storage).not.toHaveBeenCalled();storage.mockRestore();
});
it('opens an artefact explanation above a stable canvas and returns focus on Escape',async()=>{
 const {container}=render(<LandingArtifact id="test" title="Recovery evidence" details={<p>Why this amount can be pursued.</p>}><p>Visible case artwork</p></LandingArtifact>);
 const summary=container.querySelector('summary')!;
 fireEvent.click(summary);
 expect(container.querySelector('details')).not.toHaveAttribute('open');
 expect(screen.getByText('Visible case artwork')).toBeVisible();
 expect(screen.getByRole('dialog',{name:'Recovery evidence details'})).toHaveTextContent('Why this amount can be pursued.');
 fireEvent.keyDown(document,{key:'Escape'});
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 await waitFor(()=>expect(summary).toHaveFocus());
});
it('keeps exactly one evidence input open and updates the stable media frame',()=>{
 render(<EvidenceChecks/>);
 fireEvent.click(screen.getByRole('button',{name:'Have we already put this right?'}));
 expect(screen.getByRole('button',{name:'Have we already put this right?'})).toHaveAttribute('aria-expanded','true');
 expect(screen.getByRole('button',{name:'What did they buy?'})).toHaveAttribute('aria-expanded','false');
 expect(screen.getAllByRole('region')).toHaveLength(1);
 expect(screen.getByText(DEMO_CASES[1].facts[1])).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'What happened to the parcel?'}));
 expect(screen.getByText(DEMO_CASES[2].facts[3])).toBeVisible();
 expect(screen.queryByText(DEMO_CASES[1].facts[1])).not.toBeInTheDocument();
});
it('changes operational-control content rather than presenting decorative tabs',()=>{
 render(<OperationalControls/>);fireEvent.click(screen.getByRole('tab',{name:'Policy checks'}));
 expect(screen.getByRole('tabpanel')).toHaveTextContent('A preview does not change your live rules.');
});
it.each([['privacy-policy',Privacy],['data-processing-addendum',Dpa],['data-handling-explainer',Handling],['pilot-terms',Terms]] as const)('preserves legal article and sidebar wording for %s',(surfaceId,source)=>{
 const original=source();
 function children(node:React.ReactElement<{children?:React.ReactNode;style?:React.CSSProperties}>){return React.Children.toArray(node.props.children).filter(React.isValidElement) as React.ReactElement<{children?:React.ReactNode;style?:React.CSSProperties}>[];}
 function find(node:React.ReactElement<{children?:React.ReactNode;style?:React.CSSProperties}>):typeof node|undefined {if(children(node).some(c=>c.props.style?.maxWidth==='660px'))return node;for(const child of children(node)){const found=find(child);if(found)return found;}}
 const layout=find(original)!;
 function text(node:React.ReactNode):string{if(React.isValidElement(node))return React.Children.toArray((node.props as {children?:React.ReactNode}).children).map(text).join(' ');return typeof node==='string'||typeof node==='number'?String(node):'';}
 // Block-element spacing changes with presentation; every non-whitespace
 // character, including dates, numbers and punctuation, must remain identical.
 const expected=text(layout).replace(/\s+/g,'');
 render(<PublicLegal source={source} surfaceId={surfaceId}/>);
 expect(screen.getByRole('main').textContent?.replace(/\s+/g,'')).toBe(expected);
 expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
});

it.each([true,false])('matches operational keyboard navigation to vertical=%s',vertical=>{
 const original=window.matchMedia;
 jest.spyOn(window,'matchMedia').mockImplementation(query=>({...original(query),matches:vertical}));
 render(<OperationalControls/>);
 expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation',vertical?'vertical':'horizontal');
 const tabs=screen.getAllByRole('tab');tabs[0].focus();
 fireEvent.keyDown(tabs[0],{key:vertical?'ArrowRight':'ArrowDown'});
 expect(tabs[0]).toHaveFocus();
 fireEvent.keyDown(tabs[0],{key:vertical?'ArrowDown':'ArrowRight'});
 expect(tabs[1]).toHaveFocus();expect(tabs[1]).toHaveAttribute('aria-selected','true');
 fireEvent.keyDown(tabs[1],{key:'End'});expect(tabs[2]).toHaveFocus();
 fireEvent.keyDown(tabs[2],{key:'Home'});expect(tabs[0]).toHaveFocus();
 fireEvent.keyDown(tabs[0],{key:vertical?'ArrowUp':'ArrowLeft'});expect(tabs[2]).toHaveFocus();
 jest.restoreAllMocks();
});

it('keeps FAQ content exclusive and removes closed links from keyboard access',()=>{
 render(<PublicFAQ items={[{question:'First',answer:<a href="/pricing">Plans</a>},{question:'Second',answer:'Details'}]}/>);
 expect(screen.queryByRole('link',{name:'Plans'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'First'}));expect(screen.getByRole('link',{name:'Plans'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Second'}));expect(screen.queryByRole('link',{name:'Plans'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Second'}));expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
it('keeps default navigation destinations independent and landing sample links on the recovery story',()=>{
 const {container,rerender}=render(<PublicNav/>);
 expect(container.querySelector('a[href="/pricing"]')).toBeTruthy();
 expect(container.querySelectorAll('a[href*="case=not-received"]')).toHaveLength(0);
 rerender(<PublicNav landing/>);
 expect(container.querySelectorAll('a[href*="case=not-received"]')).toHaveLength(2);
 for(const href of ['/login','/pricing'])expect(container.querySelector(`a[href="${href}"]`)).toBeTruthy();
 expect(container.querySelector('a[href="/signup"]')).toBeNull();
 expect(container.querySelector('a[href="#product"]')).toHaveTextContent('Product');
});
it('closes the landing menu on Escape and restores summary focus',()=>{
 const previous=global.ResizeObserver;
 global.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}} as typeof ResizeObserver;
 const {container}=render(<div data-landing-page><LandingNavigation><PublicNav landing/></LandingNavigation></div>);
 const menu=container.querySelector('details')!;const summary=menu.querySelector('summary')!;
 menu.open=true;fireEvent.keyDown(summary,{key:'Escape'});
 expect(menu.open).toBe(false);expect(summary).toHaveFocus();
 global.ResizeObserver=previous;
});


it('keeps a prepared recovery ceiling separate from a hypothetical reconciled result without writing progress',()=>{
 const storage=jest.spyOn(Storage.prototype,'setItem');
 const sample=DEMO_CASES.find(item=>item.id==='not-received')!;
 const {container,unmount}=render(<RecoveryEvidenceVisual/>);
 expect(screen.getByRole('link',{name:'Explore this recovery'})).toHaveAttribute('href',demoUrl(sample.id));
 expect(container.querySelector('[data-story-artifact="recovery-pack"]')).toHaveTextContent('CARRIER-DEMO-01');
 expect(container).toHaveTextContent(formatMoney(sample.ceiling!,'GBP'));
 expect(container).toHaveTextContent('eligible agreement limit');
 expect(container).toHaveTextContent(/not submitted/i);
 expect(container).toHaveTextContent(/ceiling is not money received/i);
 unmount();
 const result=render(<FinancialOutcomeVisual/>);
 expect(result.container).toHaveTextContent('Verified outcome');
 const rows=[...result.container.querySelectorAll('[data-story-artifact="reconciled-outcome"] dl > div')];
 expect(rows[0]).toHaveTextContent(formatMoney(sample.amount,'GBP'));
 expect(rows[1]).toHaveTextContent(formatMoney(sample.ceiling!,'GBP'));
 expect(rows[2]).toHaveTextContent(formatMoney(sample.amount-sample.ceiling!,'GBP'));
 expect(result.container).toHaveTextContent('Not total loss or profit.');
 expect(screen.getByRole('region',{name:'Receipt review'})).toHaveTextContent('Awaiting match');
 expect(screen.getByRole('region',{name:'Receipt review'})).not.toHaveTextContent('received, matched and reconciled');
 expect(result.container).toHaveTextContent('Follow the money');
 expect(storage).not.toHaveBeenCalled();storage.mockRestore();
});
