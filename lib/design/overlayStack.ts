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

/** Locks document scroll and makes the application shell inert for modal UI. */
export function acquireModalEnvironment() {
  if (modalEnvironmentCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelectorAll<HTMLElement>('.ua-app:not(.ua-overlay-host)').forEach((element) => {
      element.inert = true;
      element.dataset.uaOverlayInert = 'true';
    });
  }
  modalEnvironmentCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    modalEnvironmentCount = Math.max(0, modalEnvironmentCount - 1);
    if (modalEnvironmentCount > 0) return;
    document.body.style.overflow = previousBodyOverflow;
    document.querySelectorAll<HTMLElement>('[data-ua-overlay-inert="true"]').forEach((element) => {
      element.inert = false;
      delete element.dataset.uaOverlayInert;
    });
  };
}
