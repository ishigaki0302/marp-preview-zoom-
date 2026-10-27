// Zoom/pan for the Marp preview. Uses CSS `zoom` on Marp's container so the
// layout grows and the document scrolls natively; slides themselves are untouched.
(() => {
  const MIN = 0.25;
  const MAX = 8;
  const STEP = 1.2;
  // Zoom factor relative to Marp's default fit-to-width rendering (1 = fit).
  let factor = 1;

  const container = () => document.getElementById('__marp-vscode');

  // Marp disables preview stylesheets/<style> it does not own, so all styling
  // is applied inline.
  const css = (el, styles) => Object.assign(el.style, styles);

  // Slides may live inside shadow roots of Marp's custom elements.
  const findSlide = (root) => {
    const hit = root.querySelector('svg[data-marpit-svg]');
    if (hit) return hit;
    for (const el of root.querySelectorAll('*')) {
      const found = el.shadowRoot && findSlide(el.shadowRoot);
      if (found) return found;
    }
    return null;
  };

  // Ratio of the rendered slide width (at fit) to its native size, so the label
  // can show "100%" = slide pixels 1:1 like a PDF viewer.
  const fitRatio = () => {
    const el = container();
    const svg = el && findSlide(el);
    const vb = svg?.viewBox?.baseVal;
    if (!svg || !vb || !vb.width) return 1;
    return svg.getBoundingClientRect().width / factor / vb.width;
  };

  const updateLabel = () => {
    const label = document.getElementById('mpz-level');
    if (label) label.textContent = `${Math.round(factor * fitRatio() * 100)}%`;
  };

  // Scale with a transform rather than CSS `zoom`: Marp refits slides to the
  // container width, which cancels `zoom`. The layout width stays fixed, and
  // margins give the scaled content room to scroll.
  const layout = (el) => {
    if (factor === 1) {
      css(el, { transform: '', transformOrigin: '', width: '', marginRight: '', marginBottom: '' });
      document.body.style.overflow = '';
      return;
    }
    if (!el.style.width) el.style.width = `${el.offsetWidth}px`;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    css(el, {
      transform: `scale(${factor})`,
      transformOrigin: '0 0',
      marginRight: `${w * (factor - 1)}px`,
      marginBottom: `${h * (factor - 1)}px`,
    });
    document.body.style.overflow = 'auto';
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
    layout(el);

    const after = el.getBoundingClientRect();
    window.scrollBy(after.left + px * factor - cx, after.top + py * factor - cy);
    updateLabel();
  };

  const button = (text, title, onClick) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.title = title;
    css(b, {
      minWidth: '24px', height: '22px', padding: '0 6px', border: '0', borderRadius: '3px',
      background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer',
    });
    b.addEventListener('mouseenter', () => (b.style.background = 'var(--vscode-toolbar-hoverBackground, #ffffff1a)'));
    b.addEventListener('mouseleave', () => (b.style.background = 'transparent'));
    b.addEventListener('click', onClick);
    return b;
  };

  const ensureToolbar = () => {
    if (document.getElementById('mpz-toolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'mpz-toolbar';
    const level = document.createElement('span');
    level.id = 'mpz-level';
    css(level, { minWidth: '44px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' });
    css(bar, {
      position: 'fixed', top: '8px', right: '16px', zIndex: '10000', display: 'flex', gap: '2px',
      alignItems: 'center', padding: '2px', borderRadius: '4px', userSelect: 'none',
      font: '12px/1 var(--vscode-font-family, sans-serif)',
      background: 'var(--vscode-editorWidget-background, #252526)',
      color: 'var(--vscode-editorWidget-foreground, #ccc)',
      border: '1px solid var(--vscode-editorWidget-border, #454545)',
    });
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
    const bar = document.getElementById('mpz-toolbar');
    if (bar) bar.style.display = container() ? 'flex' : 'none';
    const el = container();
    if (el && factor !== 1 && el.style.transform !== `scale(${factor})`) {
      const { scrollX, scrollY } = window;
      layout(el);
      window.scrollTo(scrollX, scrollY);
    }
    updateLabel();
  };

  // Drag to pan while zoomed, like an image viewer.
  let drag = null;
  window.addEventListener('mousedown', (e) => {
    if (factor === 1 || e.button !== 0 || !container()?.contains(e.target)) return;
    drag = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!drag) return;
    window.scrollBy(drag.x - e.clientX, drag.y - e.clientY);
    drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => {
    drag = null;
    document.body.style.cursor = '';
  });
  // Re-measure the fit width when the pane is resized.
  window.addEventListener('resize', () => {
    const el = container();
    if (el && factor !== 1) {
      css(el, { transform: '', width: '' });
      layout(el);
    }
  });
  window.addEventListener('vscode.markdown.updateContent', restore);
  new MutationObserver(restore).observe(document.body, { childList: true });
  window.addEventListener('resize', updateLabel);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
})();
