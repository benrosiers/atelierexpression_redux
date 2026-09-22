// Paint-layer parallax: scroll-driven by default (no global mouse movement).
// Displacement is derived from each element's own position relative to the
// viewport, so layers keep drifting as the page scrolls past them instead of
// freezing after a fixed scroll range. Pointer drift is opt-in per element
// (data-parallax-pointer="true") for the logo patch / small accents only —
// desktop-only, capped small, never global.
// translate3d only, IntersectionObserver-gated, no-op under prefers-reduced-motion.

const PX_PER_DEPTH_UNIT = 120; // depth 0.15 -> ~18px total swing through the viewport
const POINTER_CAP_PX = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function initParallax(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!nodes.length) return;

  const isDesktop = () => window.matchMedia('(min-width: 861px)').matches;

  const layers = nodes.map((el) => ({
    el,
    depth: parseFloat(el.dataset.parallaxDepth || '0.1'),
    axis: el.dataset.parallaxAxis || 'y',
    usePointer: el.dataset.parallaxPointer === 'true',
    visible: false,
  }));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const layer = layers.find((item) => item.el === entry.target);
        if (layer) layer.visible = entry.isIntersecting;
      }
    },
    { rootMargin: '35% 0px 35% 0px' }
  );
  layers.forEach((layer) => observer.observe(layer.el));

  let pointerX = 0;
  let pointerY = 0;
  let queued = false;

  function requestUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  function update() {
    queued = false;
    const viewportCenter = window.innerHeight / 2;
    const desktop = isDesktop();

    for (const layer of layers) {
      if (!layer.visible) continue;

      const rect = layer.el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const range = viewportCenter + rect.height / 2;
      const progress = clamp((viewportCenter - elCenter) / range, -1, 1);
      const maxPx = layer.depth * PX_PER_DEPTH_UNIT;
      const scrollOffset = progress * maxPx;

      const pointerOffsetX = layer.usePointer && desktop ? pointerX * POINTER_CAP_PX : 0;
      const pointerOffsetY = layer.usePointer && desktop ? pointerY * POINTER_CAP_PX : 0;

      let x = pointerOffsetX;
      let y = pointerOffsetY;
      if (layer.axis === 'y' || layer.axis === 'both') y += scrollOffset;
      if (layer.axis === 'x' || layer.axis === 'both') x += scrollOffset;

      layer.el.style.setProperty('--parallax-x', `${x.toFixed(2)}px`);
      layer.el.style.setProperty('--parallax-y', `${y.toFixed(2)}px`);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  if (layers.some((l) => l.usePointer)) {
    window.addEventListener(
      'pointermove',
      (event) => {
        pointerX = (event.clientX / window.innerWidth) * 2 - 1;
        pointerY = (event.clientY / window.innerHeight) * 2 - 1;
        requestUpdate();
      },
      { passive: true }
    );
  }

  requestUpdate();
}
