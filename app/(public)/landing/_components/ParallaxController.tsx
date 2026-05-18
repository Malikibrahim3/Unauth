const script = `
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;

  let elements = [];
  let frame = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const update = () => {
    frame = 0;
    const viewportHeight = window.innerHeight || 1;
    const viewportMid = viewportHeight / 2;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const elementMid = rect.top + rect.height / 2;
      const progress = clamp((viewportMid - elementMid) / viewportHeight, -1.25, 1.25);
      const depth = Number(element.dataset.uaParallaxDepth || 0);
      const xDepth = Number(element.dataset.uaParallaxX || 0);
      const y = progress * depth;
      const x = progress * xDepth;

      element.style.setProperty('--ua-parallax-y', y.toFixed(2) + 'px');
      element.style.setProperty('--ua-parallax-x', x.toFixed(2) + 'px');
      element.style.setProperty('--ua-parallax-bg-y', (y * 0.45).toFixed(2) + 'px');
      element.style.setProperty('--ua-parallax-bg-y-inverse', (-y * 0.28).toFixed(2) + 'px');
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  const boot = () => {
    elements = Array.from(document.querySelectorAll('[data-ua-parallax-depth]'));
    if (!elements.length) return;
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
`;

export default function ParallaxController() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
