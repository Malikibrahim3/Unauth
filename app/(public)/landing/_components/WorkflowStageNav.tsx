'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import styles from '../landing.module.css';

type WorkflowStage = {
  id: string;
  label: string;
  title: string;
  description: string;
};

export function WorkflowStageNav({ stages }: { stages: WorkflowStage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 98 });

  useLayoutEffect(() => {
    const activeTab = tabRefs.current[activeIndex];
    const tabRail = activeTab?.parentElement;
    if (!activeTab || !tabRail) return undefined;

    const updateIndicator = () => {
      setIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
    };

    updateIndicator();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(activeTab);
    observer.observe(tabRail);
    return () => observer.disconnect();
  }, [activeIndex, stages.length]);

  const selectStage = (index: number, moveFocus = false) => {
    setActiveIndex(index);
    const tab = tabRefs.current[index];
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (moveFocus) tab?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % stages.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + stages.length) % stages.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = stages.length - 1;
    if (nextIndex === undefined || stages.length === 0) return;

    event.preventDefault();
    selectStage(nextIndex, true);
  };

  return (
    <div className={styles.workflowStages} data-reference-structure="persona-how-it-works">
      <div className={styles.workflowStageTabs} role="tablist" aria-label="Evidence-to-outcome stages">
        <span
          className={styles.workflowStageUnderline}
          aria-hidden="true"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
        {stages.map((stage, index) => {
          const tabId = `workflow-tab-${stage.id}`;
          const panelId = `workflow-panel-${stage.id}`;
          const isActive = activeIndex === index;
          return (
            <button
              key={stage.id}
              ref={(tab) => { tabRefs.current[index] = tab; }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              className={styles.workflowStageTab}
              onClick={() => selectStage(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{stage.label}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.workflowStagePanels}>
        {stages.map((stage, index) => {
          const panelId = `workflow-panel-${stage.id}`;
          return (
            <div
              key={stage.id}
              id={panelId}
              role="tabpanel"
              aria-labelledby={`workflow-tab-${stage.id}`}
              hidden={activeIndex !== index}
              className={styles.workflowStagePanel}
            >
              <strong>{stage.title}</strong>
              <p>{stage.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
