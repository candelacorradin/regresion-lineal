// Navegación de la presentación: pasos, teclado, notas, índice y modo presentador.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const embed = params.has('embed');
  if (embed) document.body.classList.add('embed');

  const stage = $('#stage');
  const slides = $$('.slide', stage);
  const modules = window.SLIDES || {};
  const visited = new Set();
  let index = 0;
  let step = 0;
  let presenter = null;

  // Completar nombres y datos del grupo
  const C = window.CONFIG;
  $$('[data-integrante]').forEach((n) => (n.textContent = C.integrantes[+n.dataset.integrante - 1]));
  $$('[data-config]').forEach((n) => (n.textContent = C[n.dataset.config]));

  // La x con barra (media) se dibuja con una línea encima para que se vea en cualquier fuente
  slides.forEach((s) => (s.innerHTML = s.innerHTML.replaceAll('x̄', '<span class="xbar">x</span>')));

  const mod = (i) => modules[slides[i].dataset.id] || {};
  const maxStep = (i) => {
    const frag = $$('.fragment', slides[i]).map((f) => +f.dataset.step);
    return Math.max(0, mod(i).steps || 0, ...frag);
  };

  slides.forEach((s, i) => {
    s.setAttribute('aria-roledescription', 'diapositiva');
    s.setAttribute('aria-label', `${i + 1} de ${slides.length}: ${s.dataset.title}`);
    try { mod(i).init?.(s); } catch (e) { console.error(`Error en la diapositiva ${s.dataset.id}`, e); }
  });

  // Escala el escenario 1600×900 para que entre en cualquier pantalla
  function fit() {
    const reserve = embed ? 0 : 0;
    const k = Math.min(innerWidth / 1600, (innerHeight - reserve) / 900);
    stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  addEventListener('resize', fit);
  fit();

  // Barra de progreso: un segmento por diapositiva, agrupados por integrante
  const progress = $('#progress');
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pseg part-${s.dataset.part}`;
    b.title = `${i + 1}. ${s.dataset.title}`;
    b.setAttribute('aria-label', b.title);
    b.addEventListener('click', () => go(i, 0));
    progress.appendChild(b);
  });
  const segs = $$('.pseg', progress);

  function applyStep(i, n) {
    $$('.fragment', slides[i]).forEach((f) => f.classList.toggle('is-visible', +f.dataset.step <= n));
    try { mod(i).step?.(n); } catch (e) { console.error(e); }
  }

  function go(i, n = 0, opts = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    n = Math.max(0, Math.min(maxStep(i), n));
    const changed = i !== index || !slides[i].classList.contains('is-active');
    const forward = i > index || (i === index && !visited.has(i));
    if (changed) {
      slides.forEach((s, j) => {
        s.classList.toggle('is-active', j === i);
        s.classList.toggle('is-past', j < i);
        s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
        s.inert = j !== i;
      });
      index = i;
      applyStep(i, n);
      try { mod(i).enter?.(slides[i], { step: n, forward: forward && !opts.instant, visited: visited.has(i) }); } catch (e) { console.error(e); }
      visited.add(i);
    } else {
      applyStep(i, n);
    }
    step = n;
    update();
  }

  function next() {
    if (step < maxStep(index)) go(index, step + 1);
    else if (index < slides.length - 1) go(index + 1, 0);
  }
  function prev() {
    if (step > 0) go(index, step - 1);
    else if (index > 0) go(index - 1, maxStep(index - 1));
  }

  function update() {
    const s = slides[index];
    $('#counter').textContent = `${index + 1} / ${slides.length}`;
    segs.forEach((b, j) => { b.classList.toggle('is-done', j < index); b.classList.toggle('is-now', j === index); });
    if (!embed) history.replaceState(null, '', `#/${index + 1}${step ? `/${step}` : ''}`);
    document.title = `${s.dataset.title} · Regresión y correlación`;
    renderNotes();
    sendState();
  }

  function whoFor(i) {
    const part = +slides[i].dataset.part;
    return part ? `Parte ${part} · ${C.integrantes[part - 1]}` : 'Respaldo';
  }

  // Notas en la misma pantalla
  const notesPanel = $('#notes-panel');
  function renderNotes() {
    if (notesPanel.hidden) return;
    $('#notes-who').textContent = `${index + 1}. ${slides[index].dataset.title} · ${whoFor(index)}`;
    $('#notes-body').innerHTML = $('.notes', slides[index])?.innerHTML || '';
  }
  function toggleNotes(force) {
    notesPanel.hidden = force !== undefined ? !force : !notesPanel.hidden;
    document.body.classList.toggle('with-notes', !notesPanel.hidden);
    renderNotes();
  }

  // Índice de diapositivas
  const overview = $('#overview');
  const grid = $('#overview-grid');
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ov-item part-${s.dataset.part}`;
    b.innerHTML = `<span class="ov-n">${i + 1}</span><span class="ov-t">${s.dataset.title}</span><span class="ov-p">${whoFor(i)}</span>`;
    b.addEventListener('click', () => { closeOverlays(); go(i, 0); });
    grid.appendChild(b);
  });
  function openOverlay(o) {
    closeOverlays();
    o.hidden = false;
    if (o === overview) $$('.ov-item', grid).forEach((b, i) => b.classList.toggle('is-now', i === index));
    $('[data-close]', o).focus();
  }
  function closeOverlays() { [overview, $('#help')].forEach((o) => (o.hidden = true)); }
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeOverlays));
  $$('.overlay').forEach((o) => o.addEventListener('click', (e) => e.target === o && closeOverlays()));

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // Modo presentador: otra ventana con notas, reloj y la diapositiva siguiente
  function openPresenter() {
    presenter = window.open(`presenter.html#${index}`, 'presentador', 'width=1280,height=800');
    setTimeout(sendState, 600);
  }
  function sendState() {
    const payload = {
      type: 'deck-state', index, step, total: slides.length, maxStep: maxStep(index),
      title: slides[index].dataset.title, who: whoFor(index), part: +slides[index].dataset.part,
      notes: $('.notes', slides[index])?.innerHTML || '',
      nextTitle: slides[index + 1]?.dataset.title || 'Fin',
      nextWho: slides[index + 1] ? whoFor(index + 1) : ''
    };
    try { presenter && !presenter.closed && presenter.postMessage(payload, '*'); } catch (e) { /* ventana cerrada */ }
    try { window.opener && embed === false && window.opener.postMessage(payload, '*'); } catch (e) { /* sin ventana principal */ }
  }
  addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'deck-go') go(d.index, d.step, { instant: !!d.instant });
    else if (d.type === 'deck-next') next();
    else if (d.type === 'deck-prev') prev();
    else if (d.type === 'deck-hello') { presenter = e.source; sendState(); }
  });

  // Teclado
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Escape') { closeOverlays(); toggleNotes(false); return; }
    if (!overview.hidden || !$('#help').hidden) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) {
      if (k === ' ' && e.target.matches('button')) return;
      e.preventDefault(); next();
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0, 0);
    else if (k === 'End') go(slides.length - 1, 0);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'o' || k === 'O') openOverlay(overview);
    else if (k === 'p' || k === 'P') openPresenter();
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === '?') openOverlay($('#help'));
  });

  // Gestos en pantallas táctiles
  let touch = null;
  stage.addEventListener('touchstart', (e) => { if (!e.target.closest('input, button, .chart')) touch = e.touches[0]; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.clientX;
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
    touch = null;
  });

  $('#next').addEventListener('click', next);
  $('#prev').addEventListener('click', prev);
  $('#btn-notes').addEventListener('click', () => toggleNotes());
  $('#notes-close').addEventListener('click', () => toggleNotes(false));
  $('#btn-overview').addEventListener('click', () => openOverlay(overview));
  $('#btn-presenter').addEventListener('click', openPresenter);
  $('#btn-full').addEventListener('click', fullscreen);

  // Ocultar los controles cuando el mouse no se mueve
  let idle;
  const wake = () => { document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add('idle'), 2500); };
  addEventListener('pointermove', wake);
  wake();

  // Posición inicial desde la URL: #/6 o #/6/2
  const m = location.hash.match(/#\/(\d+)(?:\/(\d+))?/);
  const startI = m ? +m[1] - 1 : +(params.get('slide') || 0);
  const startS = m && m[2] ? +m[2] : 0;
  index = -1;
  go(startI, startS, { instant: embed });
})();
