"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const OVERLAY_ROOT_ID = "full-app-overlay-root";

function getOverlayRoot() {
  let root = document.getElementById(OVERLAY_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = OVERLAY_ROOT_ID;
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '1000',
      pointerEvents: 'none',
    });
    root.dataset.overlayHost = "true";
    document.body.appendChild(root);
  }
  return root;
}

function syncOverlayScope(root: HTMLElement) {
  const source = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-version], [data-unauth-ui]'))
    .find((candidate) => candidate !== root && !root.contains(candidate));
  const scope = source?.dataset.unauthUi ?? 'supplied-package';
  if (root.dataset.unauthUi !== scope) root.dataset.unauthUi = scope;

  return source;
}

/** Keeps overlays outside route animation, clipping, and stacking contexts. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const overlayRoot = getOverlayRoot();
    const source = syncOverlayScope(overlayRoot);
    setRoot(overlayRoot);
    if (!source) return;
    const observer = new MutationObserver(() => syncOverlayScope(overlayRoot));
    observer.observe(source, { attributes: true, attributeFilter: ['data-unauth-ui', 'data-ui-version'] });
    return () => observer.disconnect();
  }, []);
  return root ? createPortal(children, root) : null;
}
