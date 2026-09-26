'use client';

import { useEffect, useRef, useState } from 'react';
import { PublicButton as Button } from '@/components/public/PublicButton';
import { Modal } from '@/components/ui/Modal';
import { PublicNav, PublicFooter } from '@/components/public/PublicUI';
import styles from '@/components/public/public.module.css';
import { formatCurrency } from '@/lib/utils/format';
import { ProductThumbnail } from '@/components/ui/ProductThumbnail';
import { DEMO_CASES, DEMO_FEATURED_CASE_IDS, DEMO_CASE_STEPS, DEMO_VERSION, DEMO_CAPABILITY, DEMO_PRESENTATION, RECOVERY_STAGES, demoStorageKey, demoUrl, resolveDemoUrl, emptyDemoProgress, readDemoProgress, confirmDemoChoice, advanceDemo, demoAmounts, demoComplete, type DemoProgress, type DemoStep } from '@/lib/demo/merchantCaseV1';

export function OperationalCaseDemo() {
  const [view, setView] = useState({ caseId: 'legitimate', step: 'inspect' as DemoStep });
  const [progress, setProgress] = useState<DemoProgress>(emptyDemoProgress);
  const currentProgress = useRef(progress);
  const bootstrapped = useRef(false);
  const localProgress = useRef<Record<string, DemoProgress>>({});
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [review, setReview] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const c = DEMO_CASES.find(item => item.id === view.caseId)!;
  const orderItem = DEMO_PRESENTATION[c.id];
  const choice = c.choices.find(item => item.id === review);
  const decision = c.choices.find(item => item.id === progress.decision);
  const amounts = demoAmounts(c, progress);
  const money = (minor: number) => formatCurrency(minor / 100, 'GBP');

  function display(p: DemoProgress) { currentProgress.current = p; setProgress(p); }
  function navigate(caseId: string, step: DemoStep, replace = false, supplied?: DemoProgress) {
    const nextCase = DEMO_CASES.find(item => item.id === caseId)!;
    let p = supplied ?? (caseId === view.caseId && ready ? currentProgress.current : localProgress.current[caseId] ?? emptyDemoProgress());
    if (!supplied && (caseId !== view.caseId || !ready)) {
      try { p = localProgress.current[caseId] ?? readDemoProgress(nextCase, localStorage.getItem(demoStorageKey(caseId))); }
      catch { setStorageError('Browser storage is unavailable. Progress lasts only while this page remains open.'); }
    }
    const blocked = step === 'outcome' && !p.decision;
    const resolved = blocked ? 'decide' : step;
    setNotice(blocked ? 'No decision has been made for this case. Review and confirm a choice before opening Outcome.' : '');
    window.history[replace ? 'replaceState' : 'pushState'](null, '', demoUrl(caseId, resolved));
    localProgress.current[caseId] = p;
    setReview(null); setRationale(''); display(p); setView({ caseId, step: resolved }); setReady(true);
  }
  useEffect(() => {
    function restore() {
      const next = resolveDemoUrl(new URLSearchParams(window.location.search));
      const nextCase = DEMO_CASES.find(item => item.id === next.caseId)!;
      let p = localProgress.current[next.caseId] ?? emptyDemoProgress();
      try { p = localProgress.current[next.caseId] ?? readDemoProgress(nextCase, localStorage.getItem(demoStorageKey(next.caseId))); }
      catch { setStorageError('Browser storage is unavailable. Progress lasts only while this page remains open.'); }
      navigate(next.caseId, next.step, true, p);
    }
    if (!bootstrapped.current) { bootstrapped.current = true; restore(); }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
    // Navigation restoration reads the URL and storage, never a captured case state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function save(p: DemoProgress) {
    localProgress.current[c.id] = p;
    display(p);
    try { localStorage.setItem(demoStorageKey(c.id), JSON.stringify({ version: DEMO_VERSION, caseId: c.id, progress: p })); setStorageError(''); }
    catch { setStorageError('Progress could not be saved in this browser. Keep this page open or enable browser storage before continuing.'); }
  }
  function confirm() {
    if (!choice) return;
    const p = confirmDemoChoice(c, currentProgress.current, choice.id, rationale);
    if (!p.decision) return;
    save(p); navigate(c.id, 'outcome', false, p);
  }
  function reset() {
    try { localStorage.removeItem(demoStorageKey(c.id)); }
    catch { setStorageError('Saved progress could not be cleared. Enable browser storage and retry Reset this case.'); return; }
    navigate(c.id, 'inspect', false, emptyDemoProgress());
  }
  return <><PublicNav/><main id="public-content" data-surface-id="interactive-product-demo" data-demo-fixture={DEMO_VERSION} data-demo-case={c.id} data-demo-step={view.step} className={styles.demo}>
    <p className={styles.notice}>Fictional cases · illustrative GBP amounts · browser-local simulation</p>
    <div>
      <nav aria-label="Sample cases" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>{DEMO_FEATURED_CASE_IDS.map(id => DEMO_CASES.find(item => item.id === id)!).map(item => <Button key={item.id} variant={item.id === c.id ? 'primary' : 'secondary'} disabled={!ready} aria-current={item.id === c.id ? 'page' : undefined} onClick={() => navigate(item.id, 'inspect')}>{item.title}</Button>)}</nav>
      <h1>{c.title}</h1>
      <p style={{ color: 'var(--public-muted)', maxWidth: '75ch', lineHeight: 1.65 }}>{DEMO_CAPABILITY}</p>
      <p>All decisions and outcomes below are simulations saved only in this browser. No real refund, replacement, claim or message is sent.</p>
      {!ready ? <p role="status">Loading this browser’s sample progress…</p> : <>
        <p role="status">{notice}</p>{storageError && <p role="alert">{storageError}</p>}
        <nav aria-label="Case steps" style={{ display: 'flex', gap: 12, padding: '14px 0', borderBlock: '1px solid #eae8e5' }}>{DEMO_CASE_STEPS.map((s, i) => <Button key={s} variant={s === view.step ? 'primary' : 'secondary'} aria-current={s === view.step ? 'step' : undefined} onClick={() => navigate(c.id, s)}>{i + 1}. {s[0].toUpperCase() + s.slice(1)}</Button>)}</nav>
        <section aria-label="Fictional source facts" style={{ padding: '20px 0', borderBottom: '1px solid var(--public-paper)' }}>
          <h2 style={{ fontSize: 18 }}>Case facts <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>{c.reference}</span></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360, padding: 10, border: '1px solid #eae8e5', borderRadius: 10, background: '#fff' }}>
            <ProductThumbnail src={orderItem.image} size={48}/>
            <div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, lineHeight: '19px' }}>{orderItem.item}</strong><span style={{ display: 'block', color: 'var(--public-muted)', fontSize: 11, lineHeight: '17px' }}>{orderItem.sku} · Qty 1</span></div>
          </div>
          <ul style={{ paddingLeft: 20, color: 'var(--public-muted)', lineHeight: 1.8 }}>{c.facts.map(f => <li key={f}>{f}</li>)}</ul>
        </section>
        <section aria-label={view.step} style={{ padding: '20px 0', maxWidth: 920 }}>
          {view.step === 'inspect' && <><h2 style={{ fontSize: 22 }}>Inspect the evidence before choosing</h2><p>The facts above are one fixed example, not a live account. A recommendation does not execute an action.</p><Button onClick={() => navigate(c.id, 'decide')}>Compare choices</Button></>}
          {view.step === 'decide' && <><h2 style={{ fontSize: 22 }}>Compare the resolution options</h2><p>Known immediate costs remain separate from possible recovery. Selection opens review; confirmation records a simulated choice.</p>{c.choices.map(item => <div key={item.id} style={{ borderTop: '1px solid var(--public-paper)', padding: '16px 0' }}><h3 style={{ fontSize: 16 }}>{item.label}</h3><p style={{ lineHeight: 1.65 }}>{item.detail}</p><Button disabled={!!decision} onClick={() => { setRationale(''); setReview(item.id); }}>Review {item.label.toLowerCase()}</Button></div>)}{decision && <p>A simulated decision is already recorded. Use Reset this case to choose differently.</p>}</>}
          {view.step === 'outcome' && decision && <>
            <h2 style={{ fontSize: 22 }}>Simulated decision: {decision.label}</h2><p>{decision.detail}</p>{progress.rationale && <p>Recorded rationale: {progress.rationale}</p>}
            <p><strong>Manual handoff · {c.reference}:</strong> {['review', 'escalate'].includes(decision.id) ? 'Ask a colleague to review this case in your existing support tool. This case remains unresolved.' : 'Use the original order and the evidence above in your existing tools. This demo prepares instructions only.'}</p>
            <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 1fr', gap: 12, padding: 18, background: 'var(--public-paper)', borderRadius: 12 }}>
              <dt>Total refunds observed (sample)</dt><dd style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>{money(amounts.refunded)}</dd>
              {c.ceiling && <><dt>Recovery stage (sample)</dt><dd style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>{decision.id === 'refund-recovery' ? RECOVERY_STAGES[progress.recovery] : 'Not prepared'}</dd><dt>Recovery received (sample)</dt><dd style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>{money(amounts.received)}</dd><dt>Recovery reconciled (sample)</dt><dd style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>{money(amounts.reconciled)}</dd><dt>Unrecovered refund balance (sample)</dt><dd style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>{money(amounts.balance)}</dd></>}
              {decision.id === 'replace' && <><dt>Replacement dispatch (sample)</dt><dd style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>{progress.replacementDispatched ? 'Observed in simulation' : 'Not observed'}</dd></>}
            </dl>
            {c.ceiling && <p>The balance uses observed refunds less reconciled recovery. It is not profit or total economic loss. Recovery can advance independently of the refund; an interim negative balance is possible.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
              {['refund', 'goodwill', 'refund-recovery'].includes(decision.id) && <Button disabled={progress.refundObserved} onClick={() => save(advanceDemo(c, currentProgress.current, 'refund'))}>Simulate refund observed</Button>}
              {decision.id === 'replace' && <Button disabled={progress.replacementDispatched} onClick={() => save(advanceDemo(c, currentProgress.current, 'replacement'))}>Simulate replacement dispatched</Button>}
              {decision.id === 'refund-recovery' && progress.recovery < 5 && <Button onClick={() => save(advanceDemo(c, currentProgress.current, progress.recovery + 1))}>Simulate recovery {RECOVERY_STAGES[progress.recovery + 1].toLowerCase()}</Button>}
            </div>
            {demoComplete(c, progress) && <div role="status" style={{ marginTop: 24 }}><h3>Sample walkthrough complete</h3><p>The recorded stages describe this fictional case only.</p><Button onClick={() => navigate(DEMO_FEATURED_CASE_IDS[(DEMO_FEATURED_CASE_IDS.findIndex(id => id === c.id) + 1) % DEMO_FEATURED_CASE_IDS.length], 'inspect')}>Try the next case</Button> <a href="/signup">Create a workspace</a></div>}
          </>}
        </section>
        <footer style={{ borderTop: '1px solid var(--public-paper)', paddingTop: 20 }}><Button variant="secondary" onClick={reset}>Reset this case</Button><p>Reset clears only this example’s decision and progress. Other cases are preserved.</p></footer>
      </>}
    </div>
    <Modal open={!!choice} onClose={() => setReview(null)} title={`Review ${choice?.label.toLowerCase() ?? 'choice'}`} actions={[{ label: 'Confirm simulated decision', onClick: confirm, disabled: !!choice?.rationale && !rationale.trim() }]}>
      <p>{c.title} · {c.reference} · fictional original order {money(c.amount)}</p><p>{choice?.detail}</p><p>Only a simulated merchant decision is saved in this browser. External progress remains unchanged until a separate Simulate action.</p>
      {choice?.rationale && <label style={{ display: 'grid', gap: 8 }}>Goodwill rationale (required)<textarea value={rationale} maxLength={1000} rows={4} onChange={e => setRationale(e.target.value)} /></label>}
    </Modal>
  </main><PublicFooter/></>;
}
