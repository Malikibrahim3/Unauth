'use client';

import Image from 'next/image';
import type { TabId } from './pipelineTabsTypes';

export type PipelineStep = {
  readonly n: string;
  readonly label: string;
  readonly timing: string;
  readonly stat: string;
  readonly unit: string;
  readonly headline: string;
  readonly body: string;
  readonly screenshot: string;
  readonly alt: string;
};

export function PipelineTabsHeader() {
  return (
    <div className="ua-pipeline-header ua-landing-pipeline-header-center">
      <p className="ua-landing-pipeline-header-eyebrow">§ 2 - THE PIPELINE</p>
      <h2 className="ua-landing-pipeline-header-title">
        CSV in.{' '}
        <span className="ua-landing-pipeline-title-italic">Actionable cases out.</span>
      </h2>
      <p className="ua-landing-pipeline-header-body">
        Hash sensitive fields in the browser. Get scored clusters, signals, and case files back - in 38ms, end-to-end.
      </p>
    </div>
  );
}

type PipelineStepNavProps = {
  steps: readonly PipelineStep[];
  active: TabId;
  progress: number;
  paused: boolean;
  onJump: (index: TabId) => void;
  onTogglePause: () => void;
};

export function PipelineStepNav({
  steps,
  active,
  progress,
  paused,
  onJump,
  onTogglePause,
}: PipelineStepNavProps) {
  return (
    <div className="ua-pipeline-control ua-landing-pipeline-control">
      {steps.map((s, i) => {
        const on = active === i;
        return (
          <button
            type="button"
            key={s.n}
            onClick={() => onJump(i as TabId)}
            className={`ua-landing-pipeline-step-btn${on ? ' ua-landing-pipeline-step-btn--active' : ''}`}
          >
            <span className="ua-landing-pipeline-step-num">{s.n}</span>
            <span className="ua-landing-pipeline-step-label">{s.label}</span>
            <span className="ua-landing-pipeline-step-timing">{s.timing}</span>
            {on && !paused && (
              <div
                className="ua-landing-pipeline-progress"
                style={{ ['--ua-pipeline-progress' as string]: `${progress * 100}%` }}
              />
            )}
          </button>
        );
      })}

      <PipelineActiveStepContent step={steps[active]} activeKey={active} />
      <PipelinePauseBar paused={paused} onTogglePause={onTogglePause} />
    </div>
  );
}

function PipelineActiveStepContent({
  step,
  activeKey,
}: {
  step: PipelineStep;
  activeKey: TabId;
}) {
  return (
    <div key={activeKey} className="ua-step-content ua-landing-pipeline-step-content">
      <div className="ua-landing-pipeline-stat-row">
        <span className="ua-landing-pipeline-stat-value">{step.stat}</span>
        <span className="ua-landing-pipeline-stat-unit">{step.unit}</span>
      </div>
      <h3 className="ua-landing-pipeline-step-headline">{step.headline}</h3>
      <p className="ua-landing-pipeline-step-body">{step.body}</p>
    </div>
  );
}

function PipelinePauseBar({
  paused,
  onTogglePause,
}: {
  paused: boolean;
  onTogglePause: () => void;
}) {
  return (
    <div className="ua-landing-pipeline-bottom-bar">
      <button
        type="button"
        onClick={onTogglePause}
        aria-label={paused ? 'Resume' : 'Pause'}
        className="ua-landing-pipeline-pause-btn"
      >
        {paused ? (
          <svg width="7" height="9" viewBox="0 0 7 9" fill="none">
            <path d="M1 0.5l5.5 4L1 8.5V0.5z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="7" height="9" viewBox="0 0 7 9" fill="none">
            <rect x="0.5" y="0.5" width="2" height="8" rx="0.5" fill="currentColor" />
            <rect x="4.5" y="0.5" width="2" height="8" rx="0.5" fill="currentColor" />
          </svg>
        )}
        <span className="ua-landing-pipeline-pause-label">{paused ? 'Play' : 'Pause'}</span>
      </button>
      <span className="ua-landing-pipeline-timing-note">38ms end-to-end</span>
    </div>
  );
}

type PipelineScreenshotProps = {
  step: PipelineStep;
  active: TabId;
  fade: boolean;
};

export function PipelineScreenshot({ step, active, fade }: PipelineScreenshotProps) {
  return (
    <div
      key={active}
      className={`ua-artifact-enter ua-pipeline-screenshot ua-landing-pipeline-screenshot-panel${fade ? '' : ' ua-landing-pipeline-screenshot-panel--hidden'}`}
    >
      <Image
        src={step.screenshot}
        alt={step.alt}
        fill
        className="ua-pipeline-screenshot-img"
        sizes="(max-width: 900px) 100vw, 60vw"
        priority={active === 0}
      />
    </div>
  );
}

export const PIPELINE_TABS_RESPONSIVE_STYLES = `
  .ua-pipeline-screenshot-img { object-fit: cover; object-position: top left; }
  @media (max-width: 900px) {
    .ua-pipeline-screenshot-img { object-fit: contain !important; object-position: center !important; background: #fdfbf6; }
    .ua-pipeline-header { margin-bottom: 24px !important; }
    .ua-pipeline-header h2 { font-size: clamp(28px, 7vw, 40px) !important; margin-bottom: 12px !important; }
    .ua-pipeline-header p { font-size: 14px !important; }
    .ua-pipeline-stage {
      display: flex !important;
      flex-direction: column !important;
      grid-template-columns: 1fr !important;
      height: auto !important;
      gap: 14px !important;
    }
    .ua-pipeline-control {
      order: 2;
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border-radius: 6px !important;
    }
    .ua-pipeline-screenshot {
      order: 1;
      width: 100%;
      margin-left: 0;
      margin-right: 0;
      aspect-ratio: 16 / 11 !important;
      min-height: 0 !important;
      height: auto !important;
      border-radius: 6px !important;
      border: 1px solid var(--landing-line) !important;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08) !important;
      background: #fdfbf6;
    }
    .ua-pipeline-control > button {
      min-height: 48px;
      padding: 8px 4px !important;
      justify-content: center;
      border-left: none !important;
      border-right: 1px solid var(--landing-line-faint) !important;
    }
    .ua-pipeline-control > button:nth-child(4) {
      border-right: none !important;
    }
    .ua-pipeline-control > button span:first-child {
      display: none;
    }
    .ua-pipeline-control > button span:nth-child(2) {
      flex: unset !important;
      font-size: 11.5px !important;
      text-align: center;
    }
    .ua-pipeline-control > button span:nth-child(3) {
      display: none;
    }
    .ua-step-content {
      grid-column: 1 / -1;
      flex: unset !important;
      padding: 14px 16px 16px !important;
      gap: 8px !important;
    }
    .ua-step-content > div:first-child span:first-child {
      font-size: 32px !important;
    }
    .ua-step-content h3 {
      font-size: 15px !important;
      line-height: 1.22 !important;
    }
    .ua-step-content p {
      font-size: 13px !important;
      line-height: 1.42 !important;
    }
    .ua-pipeline-control > div:last-child {
      grid-column: 1 / -1;
      padding: 9px 16px !important;
    }
  }
  @keyframes ua-artifact-enter {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .ua-artifact-enter {
    animation: ua-artifact-enter 878ms ease;
  }
  @keyframes ua-step-content-enter {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ua-step-content {
    animation: ua-step-content-enter 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`;
