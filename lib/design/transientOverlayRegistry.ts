type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Tracks transient, unpredictable overlays — toasts, tooltips, and menus —
 * so a route can tell whether "no transient UI" (§7.7) currently holds.
 * Dialogs and drawers are deliberate, addressed states rather than transient
 * noise, so they are not counted here.
 *
 * Returns a closer; callers must invoke it exactly once when the overlay
 * exits (open → exiting → removed), not merely when it starts exiting.
 */
export function markTransientOverlayOpen(): () => void {
  count += 1;
  notify();
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    count = Math.max(0, count - 1);
    notify();
  };
}

export function transientOverlayCount(): number {
  return count;
}

export function subscribeToTransientOverlays(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
