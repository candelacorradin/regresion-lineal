// Utilidades mínimas para dibujar gráficos SVG sin librerías externas.
window.Chart = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function scale(d0, d1, r0, r1) {
    const f = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
    f.invert = (p) => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
    f.domain = [d0, d1];
    return f;
  }

  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  };

  // Interpola de 0 a 1 en `ms` milisegundos. Devuelve una función para cancelar.
  function tween(ms, fn, easing = ease.inOut) {
    if (reduceMotion || ms <= 0) { fn(1); return () => {}; }
    let raf, start;
    const frame = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / ms);
      fn(easing(t));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  // Crea un marco de gráfico: svg, área de trazado, escalas y ejes.
  function frame(container, opts) {
    const { w, h, x, y } = opts;
    const m = opts.m || { t: 36, r: 28, b: 64, l: 72 };
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart', role: 'img', 'aria-label': opts.label || '' });
    container.appendChild(svg);
    const pw = w - m.l - m.r;
    const ph = h - m.t - m.b;
    const sx = scale(x[0], x[1], m.l, m.l + pw);
    const sy = scale(y[0], y[1], m.t + ph, m.t);
    const grid = el('g', { class: 'grid' }, svg);
    const axes = el('g', { class: 'axes' }, svg);
    const plot = el('g', { class: 'plot' }, svg);
    const top = el('g', { class: 'top' }, svg);
    const api = { svg, grid, axes, plot, top, sx, sy, m, w, h, pw, ph };
    api.drawAxes = (o) => drawAxes(api, o);
    return api;
  }

  function drawAxes(c, { xTicks, yTicks, xFmt = (v) => fmt(v, 0), yFmt = (v) => fmt(v, 0), xLabel, yLabel, xClass = 'x-label', yClass = 'y-label' }) {
    c.grid.innerHTML = '';
    c.axes.innerHTML = '';
    const { sx, sy, m, pw, ph } = c;
    const yBase = m.t + ph;
    yTicks.forEach((v) => {
      el('line', { x1: m.l, x2: m.l + pw, y1: sy(v), y2: sy(v) }, c.grid);
      el('text', { x: m.l - 14, y: sy(v), class: 'tick', 'text-anchor': 'end', 'dominant-baseline': 'middle', text: yFmt(v) }, c.axes);
    });
    xTicks.forEach((v) => {
      el('line', { x1: sx(v), x2: sx(v), y1: m.t, y2: yBase }, c.grid);
      el('text', { x: sx(v), y: yBase + 30, class: 'tick', 'text-anchor': 'middle', text: xFmt(v) }, c.axes);
    });
    el('line', { x1: m.l, x2: m.l + pw, y1: yBase, y2: yBase, class: 'axis' }, c.axes);
    el('line', { x1: m.l, x2: m.l, y1: m.t, y2: yBase, class: 'axis' }, c.axes);
    if (xLabel) el('text', { x: m.l + pw, y: yBase + 58, class: `axis-label ${xClass}`, 'text-anchor': 'end', text: xLabel }, c.axes);
    if (yLabel) el('text', { x: m.l + 12, y: m.t - 14, class: `axis-label ${yClass}`, text: yLabel }, c.axes);
  }

  // Globo de información que sigue al punto señalado.
  function tooltip(c) {
    const g = el('g', { class: 'tip', opacity: 0 }, c.top);
    const box = el('rect', { rx: 8, ry: 8 }, g);
    const lines = [0, 1, 2].map((i) => el('text', { x: 14, y: 26 + i * 24, class: i === 0 ? 'tip-title' : 'tip-line' }, g));
    return {
      show(px, py, rows) {
        rows.forEach((r, i) => (lines[i].textContent = r));
        lines.forEach((l, i) => l.setAttribute('visibility', i < rows.length ? 'visible' : 'hidden'));
        const width = Math.max(...rows.map((r) => r.length)) * 11 + 30;
        const height = rows.length * 24 + 16;
        let tx = px + 16, ty = py - height - 12;
        if (tx + width > c.w - 8) tx = px - width - 16;
        if (ty < 4) ty = py + 16;
        box.setAttribute('width', width);
        box.setAttribute('height', height);
        g.setAttribute('transform', `translate(${tx},${ty})`);
        g.setAttribute('opacity', 1);
      },
      hide() { g.setAttribute('opacity', 0); }
    };
  }

  // Anima el trazo de un path de principio a fin.
  function drawPath(path, ms = 1400, delay = 0) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    setTimeout(() => tween(ms, (t) => (path.style.strokeDashoffset = len * (1 - t))), delay);
  }

  function linePath(xs, ys, sx, sy) {
    return xs.map((v, i) => `${i ? 'L' : 'M'}${sx(v).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join('');
  }

  // Cuenta un número de `from` a `to` dentro de un elemento.
  function countUp(node, from, to, d, ms = 1200, suffix = '') {
    return tween(ms, (t) => (node.textContent = fmt(from + (to - from) * t, d) + suffix), ease.out);
  }

  return { el, scale, tween, ease, frame, tooltip, drawPath, linePath, countUp, reduceMotion };
})();
