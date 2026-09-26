type OverlayRegistration = {
  id: symbol;
  onEscape: () => void;
};

const stack: OverlayRegistration[] = [];
let listening = false;

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  const top = stack.at(-1);
  if (!top) return;
  event.preventDefault();
  event.stopPropagation();
  top.onEscape();
}

function syncListener() {
  if (stack.length > 0 && !listening) {
    document.addEventListener('keydown', handleKeyDown, true);
    listening = true;
  } else if (stack.length === 0 && listening) {
    document.removeEventListener('keydown', handleKeyDown, true);
    listening = false;
  }
}

/** Only the top-most overlay consumes Escape. */
export function registerEscapeOverlay(onEscape: () => void) {
  const entry = { id: Symbol('overlay'), onEscape };
  stack.push(entry);
  syncListener();
  return () => {
    const index = stack.findIndex(({ id }) => id === entry.id);
    if (index >= 0) stack.splice(index, 1);
    syncListener();
  };
}

let modalEnvironmentCount = 0;
let previousBodyOverflow = '';
let pageObserver: MutationObserver | null = null;
const lockedPageRoots = new Map<HTMLElement, { inert: string | null; marker: string | null }>();

function lockPageRoots() {
  for (const element of Array.from(document.body.children)) {
    if (!(element instanceof HTMLElement)
      || element.matches('#full-app-overlay-root[data-overlay-host="true"], script, style, link')
      || lockedPageRoots.has(element)) continue;
    lockedPageRoots.set(element, {
      inert: element.getAttribute('inert'),
      marker: element.getAttribute('data-overlay-inert'),
    });
    element.setAttribute('inert', '');
    element.dataset.overlayInert = 'true';
  }
}

/** Locks background pages in every shell, leaving the shared modal host operable. */
export function acquireModalEnvironment() {
  if (modalEnvironmentCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lockPageRoots();
    // Entry pages and late-mounted page roots need the same modal boundary as
    // authenticated pages. Observe only body children, never the modal subtree.
    pageObserver = new MutationObserver(lockPageRoots);
    pageObserver.observe(document.body, { childList: true });
  }
  modalEnvironmentCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    modalEnvironmentCount = Math.max(0, modalEnvironmentCount - 1);
    if (modalEnvironmentCount > 0) return;
    pageObserver?.disconnect();
    pageObserver = null;
    document.body.style.overflow = previousBodyOverflow;
    for (const [element, previous] of lockedPageRoots) {
      if (previous.inert === null) element.removeAttribute('inert');
      else element.setAttribute('inert', previous.inert);
      if (previous.marker === null) delete element.dataset.overlayInert;
      else element.setAttribute('data-overlay-inert', previous.marker);
    }
    lockedPageRoots.clear();
  };
}
