// Variaciones mensuales publicadas por el INDEC (%), enero 2025 a agosto 2026.
// Los índices con base diciembre 2024 = 100 se calculan encadenando las variaciones,
// igual que en la hoja "Datos" del Excel.
window.DATA = (() => {
  const meses = [
    'ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25', 'jun-25', 'jul-25', 'ago-25', 'sep-25', 'oct-25',
    'nov-25', 'dic-25', 'ene-26', 'feb-26', 'mar-26', 'abr-26', 'may-26', 'jun-26', 'jul-26', 'ago-26'
  ];
  const mesesLargos = [
    'enero de 2025', 'febrero de 2025', 'marzo de 2025', 'abril de 2025', 'mayo de 2025', 'junio de 2025',
    'julio de 2025', 'agosto de 2025', 'septiembre de 2025', 'octubre de 2025', 'noviembre de 2025',
    'diciembre de 2025', 'enero de 2026', 'febrero de 2026', 'marzo de 2026', 'abril de 2026',
    'mayo de 2026', 'junio de 2026', 'julio de 2026', 'agosto de 2026'
  ];
  const inflacion = [2.2, 2.4, 3.7, 2.8, 1.5, 1.6, 1.9, 1.9, 2.1, 2.3, 2.5, 2.8, 2.9, 2.9, 3.4, 2.6, 2.1, 1.9, 2.1, 1.7];
  const subaSalarios = [2.9, 3.8, 3.0, 3.4, 3.0, 3.0, 2.5, 3.2, 2.2, 2.5, 1.8, 1.6, 2.5, 2.4, 3.4, 3.7, 2.2, 2.9, 2.8, 2.7];

  const encadenar = (variaciones) => {
    let indice = 100;
    return variaciones.map((v) => (indice = indice * (1 + v / 100)));
  };
  const ipc = encadenar(inflacion);
  const salarios = encadenar(subaSalarios);

  const sum = (arr) => arr.reduce((s, v) => s + v, 0);

  function regresion(x, y) {
    const n = x.length;
    const mx = sum(x) / n;
    const my = sum(y) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sxx += (x[i] - mx) ** 2;
      syy += (y[i] - my) ** 2;
    }
    const b = sxy / sxx;
    const a = my - b * mx;
    const r = sxy / Math.sqrt(sxx * syy);
    const estimados = x.map((v) => a + b * v);
    const residuos = y.map((v, i) => v - estimados[i]);
    const sse = sum(residuos.map((e) => e * e));
    return {
      n, mx, my, sxy, sxx, syy, a, b, r, r2: r * r,
      bXsobreY: sxy / syy,
      sx: Math.sqrt(sxx / (n - 1)), sy: Math.sqrt(syy / (n - 1)),
      estimados, residuos, sse, sst: syy, ssr: syy - sse,
      sumas: {
        x: sum(x), y: sum(y),
        xy: sum(x.map((v, i) => v * y[i])),
        x2: sum(x.map((v) => v * v)),
        y2: sum(y.map((v) => v * v))
      }
    };
  }

  return {
    meses, mesesLargos, inflacion, subaSalarios, ipc, salarios,
    niveles: regresion(ipc, salarios),
    mensual: regresion(inflacion, subaSalarios),
    rango: [Math.min(...ipc), Math.max(...ipc)]
  };
})();

// Formato argentino: punto para miles, coma para decimales.
window.fmt = (v, d = 2) => {
  const s = Math.abs(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  return (v < 0 && Number(s.replace(/\./g, '').replace(',', '.')) !== 0 ? '−' : '') + s;
};
window.fmtSigned = (v, d = 2) => (v >= 0 ? '+' : '') + fmt(v, d);
