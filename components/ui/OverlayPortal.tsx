'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const OVERLAY_ROOT_ID = 'ua-overlay-root';

function getOverlayRoot() {
  let root = document.getElementById(OVERLAY_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = OVERLAY_ROOT_ID;
    root.className = 'ua-app ua-overlay-host';
    root.dataset.uaOverlayRoot = 'true';
    document.body.appendChild(root);
  }
  return root;
}

/** Keeps transient UI outside route animation, clipping, and stacking contexts. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(getOverlayRoot());
  }, []);

  return root ? createPortal(children, root) : null;
}
