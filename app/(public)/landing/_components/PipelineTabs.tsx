'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PIPELINE_TABS_RESPONSIVE_STYLES,
  PipelineScreenshot,
  PipelineStepNav,
  PipelineTabsHeader,
  type PipelineStep,
} from './PipelineTabsParts';
import type { TabId } from './pipelineTabsTypes';

const DWELL = 5200;

const STEPS = [
  {
    n: '01', label: 'Connect', timing: '~1 min',
    stat: '2', unit: 'live sources',
    headline: 'Connect one order source and one helpdesk.',
    body: 'Authorize Shopify, WooCommerce, or BigCommerce plus Gorgias, Zendesk, or Freshdesk. CSV backfill is available when live sources are not connected yet.',
    screenshot: '/screenshots/inbox.png',
    alt: 'Unauth inbox showing identity-matched cases from connected order source and helpdesk',
  },
  {
    n: '02', label: 'Sync', timing: 'continuous',
    stat: 'live', unit: 'order & support sync',
    headline: 'Orders, refunds, fulfillment, claims, and support context sync.',
    body: 'Purchase and fulfillment data from your store and dispute history from your helpdesk stay current — no manual exports once connected.',
    screenshot: '/screenshots/dashboard.png',
    alt: 'Unauth merchant dashboard showing synced claim metrics, transaction volume, and chargeback trend',
  },
  {
    n: '03', label: 'Resolve', timing: '17ms',
    stat: 'own-store', unit: 'identity + claims',
    headline: 'Own-store identity and claim patterns resolve first.',
    body: 'Signals resolve into customer-level identity and claim patterns. Thresholded cross-merchant network signal surfaces only when k-anonymity density exists.',
    screenshot: '/screenshots/customers-clusters.png',
    alt: 'Unauth customers view showing resolved identity clusters with confidence grades and claim history',
  },
  {
    n: '04', label: 'Review', timing: '6ms',
    stat: 'DEFINITE', unit: 'confidence grade',
    headline: 'Confidence grade, evidence context, queue action.',
    body: 'Each claim carries a confidence grade, documented signals, claim history, and assembled evidence context — you decide whether to trust, review, or challenge.',
    screenshot: '/screenshots/pipeline-casefile-v3.png',
    alt: 'Unauth customer profile - DEFINITE match, confidence grade, order history, merchant record, and identity signals',
  },
] as const satisfies readonly PipelineStep[];

export default function PipelineTabs() {
  const [active, setActive] = useState<TabId>(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fade, setFade] = useState(true);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  const triggerFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFade(false);
    fadeTimer.current = setTimeout(() => setFade(true), 351);
  }, []);

  const advance = useCallback(() => {
    triggerFade();
    setActive((p) => ((p + 1) % 4) as TabId);
    setProgress(0);
    startRef.current = 0;
  }, [triggerFade]);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = 0;
    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const p = Math.min((now - startRef.current) / DWELL, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else advance();
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, paused, advance]);

  const jumpTo = useCallback(
    (i: TabId) => {
      if (i === active) return;
      cancelAnimationFrame(rafRef.current);
      triggerFade();
      setActive(i);
      setProgress(0);
      startRef.current = 0;
    },
    [active, triggerFade],
  );

  const step = STEPS[active];

  return (
    <section id="workflow" className="ua-landing-pipeline-section ua-section-flow">
      <div className="ua-pipeline-shell ua-landing-pipeline-shell-pad relative mx-auto max-w-[1400px] px-6 md:px-10 pb-16 md:pb-24">
        <PipelineTabsHeader />
        <div className="ua-pipeline-stage ua-landing-pipeline-stage">
          <PipelineStepNav
            steps={STEPS}
            active={active}
            progress={progress}
            paused={paused}
            onJump={jumpTo}
            onTogglePause={() => setPaused((p) => !p)}
          />
          <PipelineScreenshot step={step} active={active} fade={fade} />
        </div>
      </div>
      <style>{PIPELINE_TABS_RESPONSIVE_STYLES}</style>
    </section>
  );
}
