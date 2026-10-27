// Zoom/pan for the Marp preview. Uses CSS `zoom` on Marp's container so the
// layout grows and the document scrolls natively; slides themselves are untouched.
(() => {
  const MIN = 0.25;
  const MAX = 8;
  const STEP = 1.2;
  // Zoom factor relative to Marp's default fit-to-width rendering (1 = fit).
  let factor = 1;

  const container = () => document.getElementById('__marp-vscode');

  // Ratio of the rendered slide width (at fit) to its native size, so the label
  // can show "100%" = slide pixels 1:1 like a PDF viewer.
  const fitRatio = () => {
    const svg = container()?.querySelector('svg[data-marpit-svg]');
    const vb = svg?.viewBox?.baseVal;
    if (!svg || !vb || !vb.width) return 1;
    return svg.getBoundingClientRect().width / factor / vb.width;
  };

  const updateLabel = () => {
    const label = document.getElementById('mpz-level');
    if (label) label.textContent = `${Math.round(factor * fitRatio() * 100)}%`;
  };

  const apply = (next, clientX, clientY) => {
    const el = container();
    if (!el) return;
    next = Math.min(MAX, Math.max(MIN, next));
    const before = el.getBoundingClientRect();
    // Anchor point (default: viewport centre) in unzoomed container units.
    const cx = clientX ?? window.innerWidth / 2;
    const cy = clientY ?? window.innerHeight / 2;
    const px = (cx - before.left) / factor;
    const py = (cy - before.top) / factor;

    factor = next;
    el.style.zoom = factor === 1 ? '' : String(factor);
    document.body.classList.toggle('mpz-zoomed', factor !== 1);

    const after = el.getBoundingClientRect();
    window.scrollBy(after.left + px * factor - cx, after.top + py * factor - cy);
    updateLabel();
  };

  const button = (text, title, onClick) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  };

  const ensureToolbar = () => {
    if (document.getElementById('mpz-toolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'mpz-toolbar';
    const level = document.createElement('span');
    level.id = 'mpz-level';
    bar.append(
      button('−', 'Zoom out', () => apply(factor / STEP)),
      level,
      button('+', 'Zoom in', () => apply(factor * STEP)),
      button('100%', 'Actual size (slide pixels 1:1)', () => apply(1 / fitRatio())),
      button('Fit', 'Fit to width', () => apply(1)),
    );
    document.body.appendChild(bar);
    updateLabel();
  };

  // Ctrl/Cmd + wheel, and trackpad pinch (reported as ctrlKey wheel).
  window.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || !container()) return;
      e.preventDefault();
      e.stopPropagation();
      apply(factor * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    },
    { passive: false, capture: true },
  );

  // The preview re-renders on every edit; Marp's container may be replaced, so
  // re-apply the zoom and keep the scroll position.
  const restore = () => {
    ensureToolbar();
    const el = container();
    if (el && factor !== 1 && el.style.zoom !== String(factor)) {
      const { scrollX, scrollY } = window;
      el.style.zoom = String(factor);
      document.body.classList.add('mpz-zoomed');
      window.scrollTo(scrollX, scrollY);
    }
    updateLabel();
  };
  window.addEventListener('vscode.markdown.updateContent', restore);
  new MutationObserver(restore).observe(document.body, { childList: true });
  window.addEventListener('resize', updateLabel);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
})();
