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
    n: '01', label: 'Upload', timing: '11ms',
    stat: '11', unit: 'ms',
    headline: 'No schema changes. No checkout work.',
    body: 'Upload your existing order, refund, and return exports as CSV. No schema changes, no developer, no checkout work - if you can export a report, you can run an audit.',
    screenshot: '/screenshots/pipeline-upload-cohesive.png',
    alt: 'Unauth New Audit - Upload CSV step with file drop zone, max file 200 MB, max rows 500k, Map → Process flow',
  },
  {
    n: '02', label: 'Hash', timing: '4ms',
    stat: 'k-safe', unit: 'network signals',
    headline: 'Sensitive fields are minimised for matching.',
    body: 'Email, phone, address, and card references are normalised into HMAC-SHA256 matching keys before cross-merchant graph comparison.',
    screenshot: '/screenshots/hash-demo.png',
    alt: 'Unauth Hash Demo - Privacy Boundary Active banner and table of rows with email and phone replaced by HMAC tokens',
  },
  {
    n: '03', label: 'Resolve', timing: '17ms',
    stat: '6', unit: 'merchants in cluster',
    headline: 'Cross-merchant clusters surface in milliseconds.',
    body: 'Hashed signals resolve against the cross-merchant identity graph. Only patterns confirmed across three or more merchants surface as evidence - everything else is filtered out.',
    screenshot: '/screenshots/inbox.png',
    alt: 'Unauth Inbox · Cases - identity-matched cases queue with cross-merchant identity match signals, confidence grades, values, and dates',
  },
  {
    n: '04', label: 'Case File', timing: '6ms',
    stat: 'DEFINITE', unit: 'confidence grade',
    headline: 'Identity grade, claims history, and evidence packet - ready to act on.',
    body: 'You get the identity confidence grade, every signal that fired, a factual claims history, and a formatted evidence packet - ready to review, act on, or submit for dispute.',
    screenshot: '/screenshots/pipeline-casefile-v3.png',
    alt: 'Unauth customer profile - Nora Kessler, DEFINITE match, confidence 0.99, order value, order history, merchant record, and identity signals',
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
    <section id="how-it-works" className="ua-landing-pipeline-section ua-section-flow">
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
