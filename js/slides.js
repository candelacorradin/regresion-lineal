// Comportamiento de cada diapositiva. Cada módulo puede definir:
//   init(slide)            una vez, al cargar
//   enter(slide, ctx)      al entrar (ctx.step, ctx.forward)
//   step(n)                al cambiar de paso dentro de la diapositiva
//   steps                  cantidad de pasos propios (si no usa .fragment)
window.SLIDES = (() => {
  const { el, frame, tooltip, drawPath, linePath, countUp, tween, ease, scale } = Chart;
  const D = DATA;
  const N = D.niveles;
  const M = D.mensual;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toSvg(svg, evt) {
    const p = svg.createSVGPoint();
    p.x = evt.clientX;
    p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  const X_NIV = { x: [100, 165], y: [100, 180] };
  const ticks = (a, b, s) => { const t = []; for (let v = a; v <= b + 1e-9; v += s) t.push(+v.toFixed(6)); return t; };

  // Diagrama de dispersión base con los 20 meses (niveles).
  function levelScatter(container, opts = {}) {
    const c = frame(container, { w: opts.w || 900, h: opts.h || 620, m: opts.m, x: opts.x || X_NIV.x, y: opts.y || X_NIV.y, label: 'Diagrama de dispersión: índice de salarios según índice de precios' });
    c.drawAxes({
      xTicks: opts.xTicks || ticks(110, 160, 10), yTicks: opts.yTicks || ticks(100, 180, 20),
      xLabel: 'Índice de precios (IPC) →', yLabel: '↑ Índice de salarios', xClass: 'x-label c-ipc-fill', yClass: 'y-label c-sal-fill'
    });
    const tip = tooltip(c);
    const dots = D.ipc.map((x, i) => {
      const dot = el('circle', { cx: c.sx(x), cy: c.sy(D.salarios[i]), r: opts.r || 10, class: 'dot ipc-dot', tabindex: -1 }, c.plot);
      dot.addEventListener('pointerenter', () => tip.show(c.sx(x), c.sy(D.salarios[i]), [D.meses[i], `IPC ${fmt(x)}`, `Salarios ${fmt(D.salarios[i])}`]));
      dot.addEventListener('pointerleave', tip.hide);
      return dot;
    });
    return { ...c, dots, tip };
  }

  /* ---------- 1 · Portada ---------- */
  const portada = {
    init(slide) {
      const box = $('#cover-chart', slide);
      const c = frame(box, { w: 980, h: 560, m: { t: 30, r: 120, b: 30, l: 10 }, x: [0, 20], y: [95, 180] });
      const xs = [0, ...D.ipc.map((_, i) => i + 1)];
      this.ipc = el('path', { d: linePath(xs, [100, ...D.ipc], c.sx, c.sy), class: 'line ipc-line cover-line' }, c.plot);
      this.sal = el('path', { d: linePath(xs, [100, ...D.salarios], c.sx, c.sy), class: 'line sal-line cover-line' }, c.plot);
      this.labels = [
        el('text', { x: c.sx(20) + 16, y: c.sy(D.salarios[19]), class: 'cover-end sal-text', 'dominant-baseline': 'middle', text: fmt(D.salarios[19], 1) }, c.top),
        el('text', { x: c.sx(20) + 16, y: c.sy(D.ipc[19]) + 6, class: 'cover-end ipc-text', 'dominant-baseline': 'middle', text: fmt(D.ipc[19], 1) }, c.top)
      ];
    },
    enter(slide, ctx) {
      if (!ctx.forward && ctx.visited) return;
      drawPath(this.ipc, 2200, 200);
      drawPath(this.sal, 2200, 350);
      this.labels.forEach((l) => { l.style.opacity = 0; setTimeout(() => (l.style.opacity = 1), 2500); });
    }
  };

  /* ---------- 3 · Evolución ---------- */
  const evolucion = {
    init(slide) {
      const c = frame($('#evolucion-chart', slide), { w: 920, h: 620, x: [0, 20], y: [100, 180], label: 'Evolución de los índices de precios y salarios' });
      const mesesEje = ['dic-24', 'abr-25', 'ago-25', 'dic-25', 'abr-26', 'ago-26'];
      c.drawAxes({ xTicks: [0, 4, 8, 12, 16, 20], yTicks: ticks(100, 180, 20), xFmt: (v) => mesesEje[v / 4], yLabel: '↑ Índice (diciembre 2024 = 100)' });
      const xs = [0, ...D.ipc.map((_, i) => i + 1)];
      const ipcV = [100, ...D.ipc];
      const salV = [100, ...D.salarios];
      const area = linePath(xs, salV, c.sx, c.sy) + xs.slice().reverse().map((v, i) => `L${c.sx(v)},${c.sy(ipcV[ipcV.length - 1 - i])}`).join('') + 'Z';
      this.gap = el('path', { d: area, class: 'gap-area' }, c.plot);
      this.ipc = el('path', { d: linePath(xs, ipcV, c.sx, c.sy), class: 'line ipc-line' }, c.plot);
      this.sal = el('path', { d: linePath(xs, salV, c.sx, c.sy), class: 'line sal-line' }, c.plot);
      // Interacción: línea vertical que sigue al mouse
      const guide = el('line', { y1: c.m.t, y2: c.m.t + c.ph, class: 'guide', opacity: 0 }, c.top);
      const dI = el('circle', { r: 7, class: 'dot ipc-dot', opacity: 0 }, c.top);
      const dS = el('circle', { r: 7, class: 'dot sal-dot', opacity: 0 }, c.top);
      const tip = tooltip(c);
      const hit = el('rect', { x: c.m.l, y: c.m.t, width: c.pw, height: c.ph, class: 'hit' }, c.svg);
      const mesesConBase = ['dic-24', ...D.meses];
      hit.addEventListener('pointermove', (e) => {
        const p = toSvg(c.svg, e);
        const i = Math.max(0, Math.min(20, Math.round(c.sx.invert(p.x))));
        const x = c.sx(i);
        guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.setAttribute('opacity', 1);
        dI.setAttribute('cx', x); dI.setAttribute('cy', c.sy(ipcV[i])); dI.setAttribute('opacity', 1);
        dS.setAttribute('cx', x); dS.setAttribute('cy', c.sy(salV[i])); dS.setAttribute('opacity', 1);
        tip.show(x, c.sy(salV[i]), [mesesConBase[i], `Salarios ${fmt(salV[i], 1)}`, `Precios ${fmt(ipcV[i], 1)}`]);
        $('#evo-sal').textContent = fmt(salV[i], 1);
        $('#evo-ipc').textContent = fmt(ipcV[i], 1);
      });
      hit.addEventListener('pointerleave', () => {
        [guide, dI, dS].forEach((n) => n.setAttribute('opacity', 0));
        tip.hide();
        $('#evo-sal').textContent = fmt(D.salarios[19], 1);
        $('#evo-ipc').textContent = fmt(D.ipc[19], 1);
      });
    },
    enter(slide, ctx) {
      if (ctx.forward && ctx.step === 0) {
        drawPath(this.ipc, 1600);
        drawPath(this.sal, 1600, 150);
        countUp($('#evo-sal'), 100, D.salarios[19], 1, 1700);
        countUp($('#evo-ipc'), 100, D.ipc[19], 1, 1600);
      }
    },
    step(n) { this.gap.classList.toggle('is-on', n >= 1); }
  };

  /* ---------- 4 · Datos ---------- */
  const datos = {
    init(slide) {
      const tbody = $('#data-table tbody', slide);
      D.meses.forEach((m, i) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.innerHTML = `<td>${m}</td><td class="num src">${fmt(D.inflacion[i], 1)} %</td><td class="num ipc-col">${fmt(D.ipc[i])}</td><td class="num src">${fmt(D.subaSalarios[i], 1)} %</td><td class="num sal-col">${fmt(D.salarios[i])}</td>`;
        const pick = () => this.select(i);
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
        tbody.appendChild(tr);
      });
      this.rows = $$('tr', tbody);
      this.select(0);
    },
    select(i) {
      this.rows.forEach((r, j) => r.classList.toggle('is-selected', j === i));
      const prevI = i ? D.ipc[i - 1] : 100;
      const prevS = i ? D.salarios[i - 1] : 100;
      const prevMes = i ? D.meses[i - 1] : 'dic-24';
      $('#chain-card').innerHTML = `
        <p class="chain-title">Cómo se calcula <b>${D.meses[i]}</b></p>
        <p class="mono"><span class="c-ipc-dark">IPC</span> = ${fmt(prevI)} × (1 + ${fmt(D.inflacion[i], 1)} ÷ 100) = <b>${fmt(D.ipc[i])}</b></p>
        <p class="mono"><span class="c-sal">Salarios</span> = ${fmt(prevS)} × (1 + ${fmt(D.subaSalarios[i], 1)} ÷ 100) = <b>${fmt(D.salarios[i])}</b></p>
        <p class="chain-foot">${fmt(prevI)} y ${fmt(prevS)} son los índices de ${prevMes}.</p>`;
    }
  };

  /* ---------- 5 · Conceptos: intercambiar X e Y ---------- */
  const conceptos = {
    steps: 1,
    init(slide) {
      const c = frame($('#swap-chart', slide), { w: 520, h: 420, m: { t: 30, r: 20, b: 56, l: 64 }, x: [95, 180], y: [95, 180] });
      this.c = c;
      this.xLab = el('text', { x: c.m.l + c.pw, y: c.m.t + c.ph + 48, class: 'axis-label', 'text-anchor': 'end' }, c.axes);
      this.yLab = el('text', { x: c.m.l + 8, y: c.m.t - 12, class: 'axis-label' }, c.axes);
      c.drawAxes({ xTicks: ticks(100, 180, 20), yTicks: ticks(100, 180, 20) });
      c.axes.append(this.xLab, this.yLab);
      this.line = el('line', { class: 'line sal-line thin' }, c.plot);
      this.dots = D.ipc.map(() => el('circle', { r: 7, class: 'dot ipc-dot' }, c.plot));
      this.swapped = 0; // 0 = Y sobre X, 1 = X sobre Y
      this.render(0);
      $('#swap-btn', slide).addEventListener('click', () => this.animateTo(this.target ? 0 : 1));
    },
    render(t) {
      const { c } = this;
      const lerp = (a, b) => a + (b - a) * t;
      D.ipc.forEach((x, i) => {
        const y = D.salarios[i];
        this.dots[i].setAttribute('cx', c.sx(lerp(x, y)));
        this.dots[i].setAttribute('cy', c.sy(lerp(y, x)));
      });
      // Recta de Y sobre X: y = a + b x. Recta de X sobre Y (en ejes intercambiados): ipc = a' + b' sal
      const b2 = N.bXsobreY, a2 = N.mx - b2 * N.my;
      const ends = [97, 178];
      const p1 = ends.map((h) => [h, N.a + N.b * h]);
      const p2 = ends.map((h) => [h, a2 + b2 * h]);
      const P = p1.map((p, k) => [lerp(p[0], p2[k][0]), lerp(p[1], p2[k][1])]);
      this.line.setAttribute('x1', c.sx(P[0][0])); this.line.setAttribute('y1', c.sy(P[0][1]));
      this.line.setAttribute('x2', c.sx(P[1][0])); this.line.setAttribute('y2', c.sy(P[1][1]));
      const swapped = t > 0.5;
      this.xLab.textContent = swapped ? 'X = salarios →' : 'X = precios →';
      this.yLab.textContent = swapped ? '↑ Y = precios' : '↑ Y = salarios';
      this.xLab.setAttribute('class', `axis-label ${swapped ? 'c-sal-fill' : 'c-ipc-fill'}`);
      this.yLab.setAttribute('class', `axis-label ${swapped ? 'c-ipc-fill' : 'c-sal-fill'}`);
      $('#swap-b').textContent = fmt(lerp(N.b, b2), 3);
    },
    animateTo(target) {
      if (target === this.target) return;
      this.target = target;
      const from = this.pos ?? 0;
      this.cancel?.();
      this.cancel = tween(1100, (t) => { this.pos = from + (target - from) * t; this.render(this.pos); });
      $('#swap-btn').textContent = target ? 'Volver a Y sobre X' : 'Intercambiar X e Y';
      $('#swap-b-note').textContent = target ? 'pendiente de X sobre Y: cambia' : 'pendiente de Y sobre X';
      $('#swap-r-note').textContent = target ? 'no cambió' : 'no cambia';
      $('#swap-b').parentElement.classList.toggle('flash', !!target);
      $('#swap-r').parentElement.classList.toggle('steady', !!target);
    },
    step(n) { this.animateTo(n >= 1 ? 1 : 0); }
  };

  /* ---------- 6 · Dispersión ---------- */
  const dispersion = {
    init(slide) {
      this.c = levelScatter($('#dispersion-chart', slide));
      const { c } = this;
      this.labA = el('text', { x: c.sx(D.ipc[0]) + 18, y: c.sy(D.salarios[0]) + 6, class: 'point-label', text: 'ene-25' }, c.top);
      this.labB = el('text', { x: c.sx(D.ipc[19]) - 18, y: c.sy(D.salarios[19]) + 6, class: 'point-label', 'text-anchor': 'end', text: 'ago-26' }, c.top);
      this.now = el('text', { class: 'point-label now', 'text-anchor': 'end' }, c.top);
      $('#replay-dispersion', slide).addEventListener('click', () => this.play());
    },
    play() {
      const { c } = this;
      this.timers?.forEach(clearTimeout);
      c.dots.forEach((d) => d.classList.add('hidden'));
      [this.labA, this.labB].forEach((l) => l.classList.add('hidden'));
      const gap = Chart.reduceMotion ? 0 : 110;
      this.timers = c.dots.map((d, i) => setTimeout(() => {
        d.classList.remove('hidden');
        this.now.textContent = D.meses[i];
        this.now.setAttribute('x', c.sx(D.ipc[i]) - 18);
        this.now.setAttribute('y', c.sy(D.salarios[i]) - 14);
        this.now.classList.toggle('hidden', i === 19);
        if (i === 19) [this.labA, this.labB].forEach((l) => l.classList.remove('hidden'));
      }, 300 + i * gap));
    },
    enter(slide, ctx) { if (ctx.forward && ctx.step === 0) this.play(); }
  };

  /* ---------- 7 · Pearson: explorador de r ---------- */
  const pearson = {
    init(slide) {
      // Nube fija con correlación muestral exacta igual a r.
      let s = 7;
      const rand = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
      const n = 60;
      const std = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const c = v.map((q) => q - m); const sd = Math.sqrt(c.reduce((a, b) => a + b * b, 0) / v.length); return c.map((q) => q / sd); };
      const x = std(Array.from({ length: n }, normal));
      let z = std(Array.from({ length: n }, normal));
      const proj = z.reduce((a, q, i) => a + q * x[i], 0) / n;
      z = std(z.map((q, i) => q - proj * x[i]));
      this.x = x; this.z = z;
      const xc = Array.from({ length: n }, (_, i) => -2.4 + (4.8 * i) / (n - 1));
      const yc = xc.map((v) => v * v);
      const myc = yc.reduce((a, b) => a + b, 0) / n;
      this.curve = { x: xc, y: yc.map((v) => (v - myc) * 1.15) };

      const c = frame($('#pearson-chart', slide), { w: 520, h: 460, m: { t: 20, r: 20, b: 40, l: 40 }, x: [-3.2, 3.2], y: [-3.4, 3.4] });
      c.drawAxes({ xTicks: [], yTicks: [], xLabel: 'X →', yLabel: '↑ Y' });
      this.c = c;
      this.dots = x.map(() => el('circle', { r: 7, class: 'dot ink-dot' }, c.plot));
      this.slider = $('#r-slider', slide);
      this.slider.addEventListener('input', () => { this.curveMode = false; this.pos = this.posOf(+this.slider.value); this.set(+this.slider.value); });
      $$('[data-r]', slide).forEach((b) => b.addEventListener('click', () => this.animateTo(+b.dataset.r)));
      $('#r-curve', slide).addEventListener('click', () => this.animateCurve());
      this.r = 0.8;
      this.set(0.8);
    },
    posOf(r) { return this.x.map((v, i) => [v, r * v + Math.sqrt(1 - r * r) * this.z[i]]); },
    draw(pos) {
      const { c } = this;
      pos.forEach(([px, py], i) => { this.dots[i].setAttribute('cx', c.sx(px)); this.dots[i].setAttribute('cy', c.sy(Math.max(-3.3, Math.min(3.3, py)))); });
      this.pos = pos;
    },
    set(r, pos) {
      this.r = r;
      this.draw(pos || this.posOf(r));
      this.showR(r);
    },
    showR(r) {
      $('#r-marker').style.left = `${((r + 1) / 2) * 100}%`;
      $('#r-marker-val').textContent = fmt(r, 2);
      const a = Math.abs(r);
      let txt;
      if (this.curveMode) txt = 'r = 0, pero hay una relación clarísima: es una curva, no una recta';
      else if (a < 0.05) txt = 'Sin relación lineal';
      else txt = `Relación ${r > 0 ? 'directa' : 'inversa'} ${a < 0.3 ? 'débil' : a < 0.7 ? 'moderada' : 'fuerte'}`;
      $('#r-strength').textContent = txt;
      $$('.r-case').forEach((k) => k.classList.toggle('is-on', (k.dataset.case === 'pos' && r >= 0.7) || (k.dataset.case === 'neg' && r <= -0.7) || (k.dataset.case === 'zero' && a < 0.3)));
    },
    animateTo(target) {
      const fromPos = this.pos, fromR = this.r;
      const toPos = this.posOf(target);
      this.curveMode = false;
      this.slider.value = target;
      this.cancel?.();
      this.cancel = tween(700, (t) => {
        this.set(fromR + (target - fromR) * t, fromPos.map((p, i) => [p[0] + (toPos[i][0] - p[0]) * t, p[1] + (toPos[i][1] - p[1]) * t]));
      });
    },
    animateCurve() {
      const fromPos = this.pos, fromR = this.r;
      const toPos = this.curve.x.map((v, i) => [v, this.curve.y[i]]);
      this.curveMode = true;
      this.slider.value = 0;
      this.cancel?.();
      this.cancel = tween(900, (t) => {
        this.r = fromR * (1 - t);
        this.draw(fromPos.map((p, i) => [p[0] + (toPos[i][0] - p[0]) * t, p[1] + (toPos[i][1] - p[1]) * t]));
        this.showR(this.r);
      });
    }
  };

  /* ---------- 8 · Resultado ---------- */
  const resultado = {
    init(slide) {
      $('#res-sxy', slide).textContent = fmt(N.sxy);
      $('#res-sxx', slide).textContent = fmt(N.sxx);
      $('#res-syy', slide).textContent = fmt(N.syy);
      $('#res-frac', slide).textContent = `${fmt(N.sxy)} ÷ √(${fmt(N.sxx)} × ${fmt(N.syy)}) = ${fmt(N.sxy)} ÷ ${fmt(Math.sqrt(N.sxx * N.syy))} ≈ ${fmt(N.r, 3)}`;
    },
    enter(slide, ctx) {
      const dot = $('#result-dot', slide);
      const final = `${((N.r + 1) / 2) * 100}%`;
      if (ctx.forward && ctx.step === 0 && !Chart.reduceMotion) {
        dot.style.transition = 'none';
        dot.style.left = '50%';
        requestAnimationFrame(() => requestAnimationFrame(() => { dot.style.transition = ''; dot.style.left = final; }));
        countUp($('#result-r', slide), 0, N.r, 3, 1500);
      } else {
        dot.style.left = final;
        $('#result-r', slide).textContent = fmt(N.r, 3);
      }
    }
  };

  /* ---------- 9 · La trampa: niveles vs variaciones ---------- */
  const trampa = {
    init(slide) {
      const box = $('#trampa-chart', slide);
      const c = frame(box, { w: 900, h: 620, x: [0, 1], y: [0, 1], label: 'Diagrama de dispersión que alterna entre niveles y variaciones mensuales' });
      this.c = c;
      this.modes = {
        niveles: {
          x: D.ipc, y: D.salarios, dom: X_NIV, xt: ticks(110, 160, 10), yt: ticks(100, 180, 20), fx: 0, fy: 0,
          xLabel: 'Índice de precios (IPC) →', yLabel: '↑ Índice de salarios', r: N.r, rTxt: fmt(N.r, 3), a: N.a, b: N.b,
          text: 'Comparando los niveles, la relación parece casi perfecta.',
          tip: (i) => [D.meses[i], `IPC ${fmt(D.ipc[i])}`, `Salarios ${fmt(D.salarios[i])}`]
        },
        mensual: {
          x: D.inflacion, y: D.subaSalarios, dom: { x: [1, 4], y: [1, 4] }, xt: ticks(1, 4, 0.5), yt: ticks(1, 4, 0.5), fx: 1, fy: 1,
          xLabel: 'Inflación mensual (%) →', yLabel: '↑ Suba mensual de salarios (%)', r: M.r, rTxt: fmt(M.r, 2), a: M.a, b: M.b,
          text: 'Si usamos la variación de cada mes, la relación casi desaparece: un mes de mucha inflación no trae, ese mismo mes, una suba grande de salarios.',
          tip: (i) => [D.meses[i], `Inflación ${fmt(D.inflacion[i], 1)} %`, `Salarios ${fmt(D.subaSalarios[i], 1)} %`]
        }
      };
      this.line = el('line', { class: 'line sal-line thin trampa-line' }, c.plot);
      this.tip = tooltip(c);
      this.dots = D.ipc.map((_, i) => {
        const d = el('circle', { r: 10, class: 'dot ipc-dot morph' }, c.plot);
        d.addEventListener('pointerenter', () => this.tip.show(+d.getAttribute('cx'), +d.getAttribute('cy'), this.modes[this.mode].tip(i)));
        d.addEventListener('pointerleave', () => this.tip.hide());
        return d;
      });
      $$('.seg-btn', slide).forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
      this.mode = null;
      this.setMode('niveles', true);
    },
    pixel(modeName) {
      const md = this.modes[modeName];
      const sx = scale(md.dom.x[0], md.dom.x[1], this.c.m.l, this.c.m.l + this.c.pw);
      const sy = scale(md.dom.y[0], md.dom.y[1], this.c.m.t + this.c.ph, this.c.m.t);
      const x0 = md.dom.x[0], x1 = md.dom.x[1];
      const clampY = (v) => Math.max(md.dom.y[0], Math.min(md.dom.y[1], v));
      return {
        sx, sy,
        pts: md.x.map((v, i) => [sx(v), sy(md.y[i])]),
        line: [[sx(x0), sy(clampY(md.a + md.b * x0))], [sx(x1), sy(clampY(md.a + md.b * x1))]]
      };
    },
    setMode(name, instant) {
      if (name === this.mode) return;
      const prev = this.mode;
      this.mode = name;
      const md = this.modes[name];
      const slide = this.c.svg.closest('.slide');
      $$('.seg-btn', slide).forEach((b) => b.classList.toggle('is-on', b.dataset.mode === name));
      $('#trampa-text').textContent = md.text;
      const target = this.pixel(name);
      // Ejes: se desvanecen y se redibujan con la nueva escala
      const redraw = () => {
        this.c.sx = target.sx; this.c.sy = target.sy;
        const isPct = name === 'mensual';
        this.c.drawAxes({
          xTicks: md.xt, yTicks: md.yt, xLabel: md.xLabel, yLabel: md.yLabel,
          xFmt: (v) => fmt(v, isPct ? 1 : 0), yFmt: (v) => fmt(v, isPct ? 1 : 0),
          xClass: 'x-label c-ipc-fill', yClass: 'y-label c-sal-fill'
        });
      };
      this.dots.forEach((d) => d.classList.toggle('as-change', name === 'mensual'));
      const from = prev ? this.pixel(prev) : target;
      const rFrom = prev ? this.modes[prev].r : md.r;
      if (instant || Chart.reduceMotion) {
        redraw();
        this.place(target.pts, target.line);
        $('#trampa-r').textContent = md.rTxt;
        return;
      }
      this.c.axes.classList.add('fading'); this.c.grid.classList.add('fading');
      setTimeout(() => { redraw(); this.c.axes.classList.remove('fading'); this.c.grid.classList.remove('fading'); }, 450);
      this.cancel?.();
      const rNode = $('#trampa-r');
      this.cancel = tween(1300, (t) => {
        const pts = from.pts.map((p, i) => [p[0] + (target.pts[i][0] - p[0]) * t, p[1] + (target.pts[i][1] - p[1]) * t]);
        const ln = from.line.map((p, k) => [p[0] + (target.line[k][0] - p[0]) * t, p[1] + (target.line[k][1] - p[1]) * t]);
        this.place(pts, ln);
        rNode.textContent = t < 1 ? fmt(rFrom + (md.r - rFrom) * t, 3) : md.rTxt;
      });
    },
    place(pts, ln) {
      pts.forEach(([x, y], i) => { this.dots[i].setAttribute('cx', x); this.dots[i].setAttribute('cy', y); });
      this.line.setAttribute('x1', ln[0][0]); this.line.setAttribute('y1', ln[0][1]);
      this.line.setAttribute('x2', ln[1][0]); this.line.setAttribute('y2', ln[1][1]);
    },
    step(n) { this.setMode(n >= 1 ? 'mensual' : 'niveles'); }
  };

  /* ---------- 10 · Mínimos cuadrados: ajustá la recta ---------- */
  const minimos = {
    init(slide) {
      const c = levelScatter($('#ls-chart', slide), { w: 880, h: 400, m: { t: 30, r: 24, b: 58, l: 64 }, r: 8, x: [100, 165], y: [95, 185], yTicks: ticks(100, 180, 20) });
      this.c = c;
      this.resid = D.ipc.map(() => el('line', { class: 'resid' }, c.plot));
      c.dots.forEach((d) => c.plot.appendChild(d));
      this.line = el('line', { class: 'line sal-line' }, c.plot);
      this.bIn = $('#ls-b', slide);
      this.aIn = $('#ls-a', slide);
      const onInput = () => this.set(+this.aIn.value, +this.bIn.value);
      this.bIn.addEventListener('input', onInput);
      this.aIn.addEventListener('input', onInput);
      $('#ls-fit', slide).addEventListener('click', () => this.fit());
      $('#ls-b-calc', slide).textContent = `${fmt(N.sxy)} ÷ ${fmt(N.sxx)} = ${fmt(N.b, 3)}`;
      $('#ls-a-calc', slide).textContent = `${fmt(N.my)} − ${fmt(N.b, 3)} · ${fmt(N.mx)} = ${fmt(N.a)}`;
      const minPct = (N.sse / this.maxSse) * 100;
      $('#ls-sse-min', slide).style.left = `${minPct}%`;
      this.reset();
    },
    maxSse: 6000,
    reset() { this.set(40, 0.75); },
    set(a, b) {
      this.a = a; this.b = b;
      this.aIn.value = a; this.bIn.value = b;
      const { c } = this;
      const x0 = 100, x1 = 165;
      this.line.setAttribute('x1', c.sx(x0)); this.line.setAttribute('y1', c.sy(a + b * x0));
      this.line.setAttribute('x2', c.sx(x1)); this.line.setAttribute('y2', c.sy(a + b * x1));
      let sse = 0;
      D.ipc.forEach((x, i) => {
        const yh = a + b * x;
        sse += (D.salarios[i] - yh) ** 2;
        const r = this.resid[i];
        r.setAttribute('x1', c.sx(x)); r.setAttribute('x2', c.sx(x));
        r.setAttribute('y1', c.sy(D.salarios[i])); r.setAttribute('y2', c.sy(Math.max(95, Math.min(185, yh))));
      });
      $('#ls-b-val').textContent = fmt(b, 3);
      $('#ls-a-val').textContent = fmt(a, 2);
      $('#ls-sse').textContent = fmt(sse);
      $('#ls-sse-bar').style.width = `${Math.min(100, (sse / this.maxSse) * 100)}%`;
      const ratio = sse / N.sse;
      const msg = ratio < 1.005 ? `Es el mínimo: ninguna recta da menos de ${fmt(N.sse)}.` : ratio < 1.6 ? 'Muy cerca del mínimo.' : ratio < 6 ? 'Vas bien, todavía se puede achicar.' : 'Probá acercar la recta a los puntos.';
      $('#ls-sse-msg').textContent = msg;
      $('#ls-sse').parentElement.parentElement.classList.toggle('is-min', ratio < 1.005);
    },
    fit() {
      const a0 = this.a, b0 = this.b;
      this.cancel?.();
      this.cancel = tween(1200, (t) => this.set(a0 + (N.a - a0) * t, b0 + (N.b - b0) * t));
    },
    enter(slide, ctx) { if (ctx.forward && ctx.step === 0) { this.cancel?.(); this.reset(); } },
    step(n) { if (n >= 1 && Math.abs(this.b - N.b) > 1e-6) this.fit(); }
  };

  /* ---------- 11 · Nuestra recta ---------- */
  const recta = {
    init(slide) {
      $('#recta-eq', slide).textContent = `ŷ = ${fmt(N.a)} + ${fmt(N.b, 3)} · x`;
      $('#recta-b', slide).textContent = fmt(N.b, 3);
      $('#recta-a', slide).textContent = fmt(N.a);
      const c = levelScatter($('#recta-chart', slide));
      this.c = c;
      this.line = el('path', { d: `M${c.sx(100)},${c.sy(N.a + N.b * 100)}L${c.sx(163)},${c.sy(N.a + N.b * 163)}`, class: 'line sal-line' }, c.plot);
      c.dots.forEach((d) => c.plot.appendChild(d));
      this.mean = el('circle', { cx: c.sx(N.mx), cy: c.sy(N.my), r: 13, class: 'mean-dot' }, c.plot);
      el('text', { x: c.sx(N.mx) + 22, y: c.sy(N.my) + 34, class: 'point-label', text: 'punto de medias' }, c.top);
      this.mean.addEventListener('pointerenter', () => c.tip.show(c.sx(N.mx), c.sy(N.my), ['Punto de medias', `Media de X: ${fmt(N.mx)}`, `Media de Y: ${fmt(N.my)}`]));
      this.mean.addEventListener('pointerleave', c.tip.hide);
      c.dots.forEach((d, i) => {
        d.addEventListener('pointerenter', () => c.tip.show(c.sx(D.ipc[i]), c.sy(D.salarios[i]), [D.meses[i], `Real ${fmt(D.salarios[i])}`, `Estimado ${fmt(N.estimados[i])}`]));
      });
    },
    enter(slide, ctx) {
      if (ctx.forward && ctx.step === 0) {
        drawPath(this.line, 1300, 200);
        this.mean.classList.remove('pulse');
        void this.mean.getBBox();
        setTimeout(() => this.mean.classList.add('pulse'), 1300);
      }
    }
  };

  /* ---------- 12 · Propiedades ---------- */
  const propiedades = {
    steps: 6,
    init(slide) {
      const sumRes = N.residuos.reduce((a, b) => a + b, 0);
      const checks = {
        1: `${fmt(N.a)} + ${fmt(N.b, 3)} × ${fmt(N.mx)} = ${fmt(N.a + N.b * N.mx)} = ȳ`,
        2: `Σ(y − ŷ)² = ${fmt(N.sse)}: el mínimo que encontramos moviendo la recta.`,
        3: `Suma de los 20 residuos = ${fmt(Math.abs(sumRes) < 0.005 ? 0 : sumRes)}`,
        4: `r = ${fmt(N.r, 3)} y b = ${fmt(N.b, 3)}: ${fmt(N.r, 3)} × ${fmt(N.sy)} ÷ ${fmt(N.sx)} = ${fmt(N.b, 3)}`,
        5: `Y sobre X: b = ${fmt(N.b, 3)} · X sobre Y: b = ${fmt(N.bXsobreY, 3)}`,
        6: `Observamos IPC entre ${fmt(D.rango[0], 1)} y ${fmt(D.rango[1], 1)}.`
      };
      this.cards = $$('.prop', slide);
      this.cards.forEach((card) => {
        $('.prop-check', card).textContent = checks[card.dataset.prop];
        card.addEventListener('click', () => card.classList.toggle('is-open'));
      });
    },
    step(n) { this.cards.forEach((card, i) => card.classList.toggle('is-open', i < n)); }
  };

  /* ---------- 13 · Estimar ---------- */
  const estimar = {
    init(slide) {
      const c = frame($('#estimar-chart', slide), { w: 900, h: 620, x: [90, 180], y: [80, 200], label: 'Estimación con la recta de regresión' });
      c.drawAxes({ xTicks: ticks(90, 180, 15), yTicks: ticks(80, 200, 20), xLabel: 'Índice de precios (IPC) →', yLabel: '↑ Índice de salarios estimado', xClass: 'x-label c-ipc-fill', yClass: 'y-label c-sal-fill' });
      this.c = c;
      const [lo, hi] = D.rango;
      el('rect', { x: c.sx(lo), y: c.m.t, width: c.sx(hi) - c.sx(lo), height: c.ph, class: 'range-band' }, c.grid);
      el('text', { x: (c.sx(lo) + c.sx(hi)) / 2, y: c.m.t + 28, class: 'band-label', 'text-anchor': 'middle', text: 'Rango observado' }, c.grid);
      D.ipc.forEach((x, i) => el('circle', { cx: c.sx(x), cy: c.sy(D.salarios[i]), r: 6, class: 'dot ipc-dot faint' }, c.plot));
      const f = (x) => N.a + N.b * x;
      const seg = (x0, x1, cls) => el('line', { x1: c.sx(x0), y1: c.sy(f(x0)), x2: c.sx(x1), y2: c.sy(f(x1)), class: cls }, c.plot);
      seg(90, lo, 'line sal-line dashed');
      seg(lo, hi, 'line sal-line');
      seg(hi, 180, 'line sal-line dashed');
      this.gx = el('line', { class: 'guide-dash' }, c.top);
      this.gy = el('line', { class: 'guide-dash' }, c.top);
      this.pt = el('circle', { r: 12, class: 'est-dot' }, c.top);
      this.slider = $('#est-slider', slide);
      this.slider.addEventListener('input', () => this.set(+this.slider.value));
      $$('[data-x]', slide).forEach((b) => b.addEventListener('click', () => this.animateTo(+b.dataset.x)));
      const hit = el('rect', { x: c.m.l, y: c.m.t, width: c.pw, height: c.ph, class: 'hit' }, c.svg);
      let dragging = false;
      const move = (e) => { const p = toSvg(c.svg, e); this.set(Math.round(Math.max(90, Math.min(180, c.sx.invert(p.x))) * 2) / 2); };
      hit.addEventListener('pointerdown', (e) => { dragging = true; hit.setPointerCapture(e.pointerId); move(e); });
      hit.addEventListener('pointermove', (e) => dragging && move(e));
      hit.addEventListener('pointerup', () => (dragging = false));
      this.set(140);
    },
    set(x) {
      this.x = x;
      this.slider.value = x;
      const { c } = this;
      const y = N.a + N.b * x;
      const px = c.sx(x), py = c.sy(y);
      this.pt.setAttribute('cx', px); this.pt.setAttribute('cy', py);
      this.gx.setAttribute('x1', px); this.gx.setAttribute('x2', px); this.gx.setAttribute('y1', py); this.gx.setAttribute('y2', c.m.t + c.ph);
      this.gy.setAttribute('x1', c.m.l); this.gy.setAttribute('x2', px); this.gy.setAttribute('y1', py); this.gy.setAttribute('y2', py);
      const inside = x >= D.rango[0] && x <= D.rango[1];
      const badge = $('#est-badge');
      badge.textContent = inside ? 'Interpolación · confiable' : 'Extrapolación · con cuidado';
      badge.classList.toggle('extra', !inside);
      this.pt.classList.toggle('extra', !inside);
      $('#est-x').textContent = fmt(x, 1);
      $('#est-calc').textContent = `ŷ = ${fmt(N.a)} + ${fmt(N.b, 3)} · ${fmt(x, 1)}`;
      $('#est-y').textContent = fmt(y, 1);
      $('#est-msg').textContent = inside
        ? `${fmt(x, 1)} está dentro del rango observado (${fmt(D.rango[0], 1)} a ${fmt(D.rango[1], 1)}).`
        : 'Fuera del rango: suponemos que la relación sigue igual, y no hay garantía de eso.';
      $('#est-excel').textContent = `=PRONOSTICO.LINEAL(${fmt(x, 1)}; rango Y; rango X) → ${fmt(y)}`;
    },
    animateTo(x) {
      const x0 = this.x;
      this.cancel?.();
      this.cancel = tween(700, (t) => this.set(Math.round((x0 + (x - x0) * t) * 10) / 10));
    }
  };

  /* ---------- 14 · Residuos ---------- */
  const residuos = {
    init(slide) {
      const c = frame($('#residuos-chart', slide), { w: 900, h: 600, m: { t: 36, r: 24, b: 70, l: 72 }, x: [0, 20], y: [-4, 4], label: 'Residuos de cada mes' });
      c.drawAxes({ xTicks: [], yTicks: ticks(-4, 4, 2), yFmt: (v) => fmtSigned(v, 0).replace('+0', '0'), yLabel: '↑ Residuo e = y − ŷ' });
      this.c = c;
      el('line', { x1: c.m.l, x2: c.m.l + c.pw, y1: c.sy(0), y2: c.sy(0), class: 'zero' }, c.axes);
      const bw = c.pw / 20;
      this.bars = N.residuos.map((e, i) => {
        const x = c.m.l + i * bw + bw * 0.15;
        const y0 = c.sy(0), y1 = c.sy(e);
        const bar = el('rect', { x, y: Math.min(y0, y1), width: bw * 0.7, height: Math.abs(y1 - y0), rx: 3, class: `bar ${e >= 0 ? 'pos' : 'neg'}`, tabindex: 0 }, c.plot);
        bar.addEventListener('click', () => this.select(i));
        bar.addEventListener('pointerenter', () => this.select(i));
        bar.addEventListener('keydown', (ev) => ev.key === 'Enter' && this.select(i));
        if (i % 2 === 0) el('text', { x: x + bw * 0.35, y: c.m.t + c.ph + 32, class: 'tick', 'text-anchor': 'middle', text: D.meses[i] }, c.axes);
        return bar;
      });
      // Curva suave que une los residuos (las "olas")
      const pts = N.residuos.map((e, i) => [c.m.l + i * bw + bw / 2, c.sy(e)]);
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
      }
      this.wave = el('path', { d, class: 'wave' }, c.top);
      const sum = N.residuos.reduce((a, b) => a + b, 0);
      $('#res-sum', slide).textContent = fmt(Math.abs(sum) < 0.005 ? 0 : sum);
      this.select(7);
    },
    select(i) {
      this.bars.forEach((b, j) => b.classList.toggle('is-selected', j === i));
      const e = N.residuos[i];
      $('#res-detail').innerHTML = `<p class="res-month">${D.mesesLargos[i]}</p>
        <p class="res-val ${e >= 0 ? 'pos' : 'neg'}">${fmtSigned(e, 1)}</p>
        <p class="mono">real ${fmt(D.salarios[i], 1)} − estimado ${fmt(N.estimados[i], 1)}</p>`;
    },
    step(n) {
      if (n >= 1 && !this.wave.classList.contains('is-on')) { this.wave.classList.add('is-on'); drawPath(this.wave, 1600); }
      if (n < 1) this.wave.classList.remove('is-on');
    }
  };

  /* ---------- 15 · R² ---------- */
  const r2 = {
    steps: 1,
    init(slide) {
      this.slide = slide;
      $$('.seg-btn', slide).forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
      this.mode = null;
      this.setMode('niveles', true);
    },
    setMode(name, instant) {
      if (name === this.mode) return;
      this.mode = name;
      const S = name === 'niveles' ? N : M;
      const pct = S.r2 * 100;
      $$('.seg-btn', this.slide).forEach((b) => b.classList.toggle('is-on', b.dataset.mode === name));
      const node = $('#r2-val');
      const from = parseFloat(node.textContent.replace(/\./g, '').replace(',', '.')) || 0;
      if (instant) node.textContent = `${fmt(pct, 1)} %`;
      else countUp(node, from, pct, 1, 1000, ' %');
      $('#r2-fill').style.width = `${pct}%`;
      $('#r2-sub').textContent = `R² = ${fmt(S.r2, 3)} = (${fmt(S.r, name === 'niveles' ? 3 : 2)})²`;
      $('#r2-lead').innerHTML = name === 'niveles'
        ? `El <b>${fmt(pct, 1)} %</b> de la variación del índice de salarios en estos 20 meses se explica por su relación lineal con el índice de precios.`
        : `Con la variación de cada mes, la inflación explica apenas el <b>${fmt(pct, 1)} %</b> de la suba de salarios. Un ajuste tan alto con los niveles era la tendencia común.`;
      $('#r2-ss').textContent = `Total Σ(y − ȳ)² = ${fmt(S.sst)} · No explicada Σ(y − ŷ)² = ${fmt(S.sse)} · Explicada = ${fmt(S.ssr)}`;
      $('#r2-leg-a').textContent = `Variación explicada por X · ${fmt(pct, 1)} %`;
      $('#r2-leg-b').textContent = `No explicada · ${fmt(100 - pct, 1)} %`;
    },
    enter(slide, ctx) {
      if (ctx.forward && ctx.step === 0 && this.mode === 'niveles') {
        const fill = $('#r2-fill');
        fill.style.transition = 'none'; fill.style.width = '0%';
        requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transition = ''; fill.style.width = `${N.r2 * 100}%`; }));
        countUp($('#r2-val'), 0, N.r2 * 100, 1, 1400, ' %');
      }
    },
    step(n) { this.setMode(n >= 1 ? 'mensual' : 'niveles'); }
  };

  /* ---------- 16 · Excel ---------- */
  const excel = {
    init(slide) {
      const X = '<span class="chip ipc">rango X</span>', Y = '<span class="chip sal">rango Y</span>';
      const rows = [
        ['Correlación r', `=PEARSON(${X}; ${Y})`, '=PEARSON(rango X; rango Y)', fmt(N.r, 3)],
        ['Pendiente b', `=PENDIENTE(${Y}; ${X})`, '=PENDIENTE(rango Y; rango X)', fmt(N.b, 3)],
        ['Ordenada a', `=INTERSECCION.EJE(${Y}; ${X})`, '=INTERSECCION.EJE(rango Y; rango X)', fmt(N.a)],
        ['Determinación R²', `=COEFICIENTE.R2(${Y}; ${X})`, '=COEFICIENTE.R2(rango Y; rango X)', fmt(N.r2, 3)],
        ['Estimación ŷ', `=PRONOSTICO.LINEAL(140; ${Y}; ${X})`, '=PRONOSTICO.LINEAL(140; rango Y; rango X)', fmt(N.a + N.b * 140)],
        ['r mes a mes', `=PEARSON(${X}; ${Y}) <small>con las variaciones</small>`, '=PEARSON(rango X; rango Y)', fmt(M.r, 2)]
      ];
      const tbody = $('#xl-table tbody', slide);
      rows.forEach(([label, html, plain, res]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${label}</td><td><button class="formula" type="button">${html}</button></td><td class="num">${res}</td>`;
        $('button', tr).addEventListener('click', () => this.copy(plain));
        tbody.appendChild(tr);
      });
      const s = N.sumas;
      $('#xl-sums', slide).textContent = `n = 20 · Σx = ${fmt(s.x)} · Σy = ${fmt(s.y)} · Σxy = ${fmt(s.xy)} · Σx² = ${fmt(s.x2)} · Σy² = ${fmt(s.y2)}`;
    },
    copy(text) {
      const toast = $('#toast');
      const done = (ok) => {
        toast.textContent = ok ? `Copiada: ${text}` : 'No se pudo copiar. Seleccioná la fórmula a mano.';
        toast.classList.add('is-on');
        clearTimeout(this.t);
        this.t = setTimeout(() => toast.classList.remove('is-on'), 2200);
      };
      (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => done(true), () => done(false));
    }
  };

  /* ---------- 18 · Repaso ---------- */
  const quiz = {
    init(slide) {
      const qs = [
        { q: 'Si intercambiamos X e Y, ¿qué pasa con r?', o: ['Cambia de signo', 'No cambia', 'Se vuelve la pendiente'], ok: 1, e: 'La correlación es simétrica: r sigue siendo 0,996. Lo que cambia es la recta de regresión.' },
        { q: '¿Qué significa b = 1,149?', o: ['El índice de salarios vale 1,149', 'Por cada punto que sube el IPC, los salarios suben en promedio 1,15 puntos', 'El 114,9 % de Y está explicado por X'], ok: 1, e: 'La pendiente se interpreta en las unidades del problema: puntos de salarios por cada punto de precios.' },
        { q: 'Con IPC = 165 la recta da 177,0. Esa estimación es…', o: ['Una interpolación confiable', 'Una extrapolación: hay que tomarla con cuidado', 'Imposible de calcular'], ok: 1, e: '165 está fuera del rango observado (102,2 a 159,5). Suponemos que la relación sigue igual.' },
        { q: '¿Por qué r da 0,996 con los niveles y 0,05 mes a mes?', o: ['Porque hay un error en los datos', 'Porque la inflación causa los salarios', 'Porque los dos índices crecen con el tiempo y esa tendencia infla r'], ok: 2, e: 'La tendencia común empuja r hacia 1. Correlación no implica causalidad.' }
      ];
      const box = $('#quiz', slide);
      qs.forEach((item, qi) => {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        card.innerHTML = `<p class="quiz-q"><span>${qi + 1}</span>${item.q}</p><div class="quiz-opts"></div><p class="quiz-exp" hidden></p>`;
        const opts = $('.quiz-opts', card);
        item.o.forEach((text, oi) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'quiz-opt';
          b.textContent = text;
          b.addEventListener('click', () => {
            $$('.quiz-opt', card).forEach((x) => x.classList.remove('is-ok', 'is-bad'));
            b.classList.add(oi === item.ok ? 'is-ok' : 'is-bad');
            if (oi !== item.ok) return;
            const exp = $('.quiz-exp', card);
            exp.textContent = item.e;
            exp.hidden = false;
          });
          opts.appendChild(b);
        });
        box.appendChild(card);
      });
    }
  };

  return { portada, evolucion, datos, conceptos, dispersion, pearson, resultado, trampa, minimos, recta, propiedades, estimar, residuos, r2, excel, quiz };
})();
