"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const OVERLAY_ROOT_ID = "ua-overlay-root";

function getOverlayRoot() {
  let root = document.getElementById(OVERLAY_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = OVERLAY_ROOT_ID;
    root.className = "ua-app ua-overlay-host";
    root.dataset.uaOverlayHost = "true";
    document.body.appendChild(root);
  }
  return root;
}

function syncOverlayTheme(root: HTMLElement) {
  const productRoot = document.querySelector<HTMLElement>('.uo-product');
  const entryRoot = document.querySelector<HTMLElement>('.uo-entry');
  const source = productRoot ?? entryRoot;

  root.classList.toggle('uo-product', Boolean(productRoot));
  root.classList.toggle('uo-entry', !productRoot && Boolean(entryRoot));
  const authenticatedTheme = productRoot?.dataset.authTheme;
  if (authenticatedTheme) root.dataset.authTheme = authenticatedTheme;
  else delete root.dataset.authTheme;
  root.dataset.unauthUi = source?.dataset.unauthUi ?? 'evidence-operations-v1';

  return source;
}

/** Keeps overlays outside route animation, clipping, and stacking contexts. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const overlayRoot = getOverlayRoot();
    const source = syncOverlayTheme(overlayRoot);
    setRoot(overlayRoot);
    if (!source) return;
    const observer = new MutationObserver(() => syncOverlayTheme(overlayRoot));
    observer.observe(source, { attributes: true, attributeFilter: ['class', 'data-auth-theme', 'data-unauth-ui'] });
    return () => observer.disconnect();
  }, []);
  return root ? createPortal(children, root) : null;
}
