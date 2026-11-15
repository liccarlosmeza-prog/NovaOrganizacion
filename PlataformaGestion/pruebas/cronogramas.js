// Pruebas del lector de cronogramas en PDF (Escuela). Requiere Node.js y Playwright con Chromium.
// Uso:  node pruebas/cronogramas.js
// Los PDF de prueba son sintéticos (se generan aquí con el mismo formato de tabla que la plataforma de la
// universidad: encabezados centrados, nombres en varios renglones, secciones y dos páginas). No se usan datos reales.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), os = require('os');
const APP = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-crono-'));

const ACT = [   // [nombre, tipo, valor, duración, sección, entrega]
  ['Actividad preliminar: presentación personal y expectativas del curso', 'Foro', '0%', '3 días', 'Unidad 1', 'lunes, 7 de septiembre de 2026, 23:59'],
  ['Actividad 1.1 Investigación sobre arquitectura cliente servidor', 'Buzón', '10%', '5 días', '', 'domingo, 13 de septiembre de 2026, 23:59'],
  ['Quiz de la unidad 1', 'Cuestionario', '5%', '2 días', '', 'martes, 15 de septiembre de 2026, 20:00'],
  ['Actividad 2.1 Glosario de términos de bases de datos relacionales', 'Glosario', '10%', '4 días', 'Unidad 2', 'domingo, 20 de septiembre de 2026, 23:59'],
  ['Actividad 2.2 Diagrama entidad relación del caso práctico', 'Buzón', '15%', '7 días', '', 'domingo, 27 de septiembre de 2026, 23:59'],
  ['Actividad 3.1 Presentación del avance del proyecto', 'Presentación', '20%', '7 días', 'Unidad 3', 'domingo, 4 de octubre de 2026, 23:59'],
  ['Producto integrador: plataforma web con base de datos', 'Proyecto', '40%', '14 días', '', 'viernes, 16 de octubre de 2026, 19:30']
];
const MALO = '<img src=x onerror="window.__pdf=1">';
const ent = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');   // el texto malicioso va como texto dentro del PDF
const html = (filas, extra = '') => `<!doctype html><meta charset="utf-8"><style>
  body{font:11px Arial;margin:30px} table{border-collapse:collapse;width:100%;margin:12px 0} th{text-align:center;padding:6px;border-bottom:1px solid #999}
  td{padding:6px;vertical-align:middle;border-bottom:1px solid #ddd} td.n{width:46%} .salto{page-break-before:always}</style>
  <h1>XX123 2026B Cronograma y puntaje</h1>${extra}
  <h2>Ponderación</h2><table><tr><th>Actividad</th><th>Tipo</th><th>Valor</th><th>Duración</th></tr>
  ${filas.map(a => `<tr><td class="n">${ent(a[0])}</td><td>${ent(a[1])}</td><td>${a[2]}</td><td>${a[3]}</td></tr>`).join('')}
  <tr><td>Total</td><td></td><td>${filas.reduce((s, a) => s + parseFloat(a[2]), 0)}%</td><td></td></tr></table>
  <h2 class="salto">Fechas</h2><table><tr><th>Sección</th><th>Actividad</th><th>Fecha de inicio</th><th>Fecha de entrega</th><th>Fecha de corte</th></tr>
  ${filas.map(a => `<tr><td>${ent(a[4])}</td><td class="n">${ent(a[0])}</td><td></td><td>${a[5]}</td><td></td></tr>`).join('')}</table>`;

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  // 1. Generar los PDF sintéticos
  const gen = await ctx.newPage();
  const pdf = async (nombre, contenido) => { await gen.setContent(contenido); const f = path.join(TMP, nombre); fs.writeFileSync(f, await gen.pdf({ format: 'Letter' })); return f; };
  const fNormal = await pdf('XX123_2026B__Cronograma_y_puntaje.pdf', html(ACT));
  const fMalo = await pdf('YY456_2026B__Cronograma.pdf', html([[MALO + ' Actividad 1', 'Buzón', '50%', '3 días', MALO, 'lunes, 7 de septiembre de 2026, 23:59'], ['"><svg onload=window.__pdf=2> Actividad 2', '<b>Foro</b>', '50%', '3 días', '', 'martes, 8 de septiembre de 2026, 23:59']]));
  const fSinTablas = await pdf('ZZ789_2026B.pdf', '<h1>Documento sin tablas</h1><p>Hola</p>');
  const fFalso = path.join(TMP, 'falso.pdf'); fs.writeFileSync(fFalso, '<html><script>window.__pdf=3</script></html>');
  await gen.close();

  const p = await ctx.newPage(), errores = [], externas = [];
  p.on('pageerror', e => errores.push(e.message)); p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  ctx.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) externas.push(r.url()); });
  await p.clock.install({ time: new Date(2026, 8, 14, 10, 0) });
  await p.goto(APP); await p.waitForSelector('.cab'); await p.evaluate(() => { location.hash = '#/escuela'; App.ruta(); });
  const leer = async archivos => { await p.click('text=Cargar cronogramas (PDF)'); await p.setInputFiles('#crArchivos', archivos); await p.click('#crLeer'); await p.waitForSelector('text=Revisar cronogramas', { timeout: 120000 }); };
  const R = {};

  // 2. Lectura del cronograma normal: nombres, tipos, valores, sección, fechas y horas
  await leer([fNormal]);
  R.lectura = await p.evaluate(exp => {
    const d = CronoUI._d[0], f = d.filas;
    return { clave: d.clave, ciclo: d.ciclo, filas: f.length, avisos: d.avisos, suma: f.reduce((s, r) => s + r.valor, 0),
      nombresOk: exp.every((a, i) => f[i] && f[i].titulo === a[0]), tipos: f.map(r => r.tipo).join(','),
      unidades: f.map(r => r.unidad).join(','), entregas: f.map(r => r.entrega).join(' | '),
      iniciosOk: f.every(r => r.inicio && r.inicio <= r.entrega) };
  }, ACT);
  R.lecturaOk = R.lectura.clave === 'XX123' && R.lectura.ciclo === '2026B' && R.lectura.filas === 7 && !R.lectura.avisos.length && R.lectura.suma === 100 && R.lectura.nombresOk
    && R.lectura.tipos === 'Foro,Buzón,Examen,Glosario,Buzón,Presentación,Proyecto' && R.lectura.unidades === 'Unidad 1,Unidad 1,Unidad 1,Unidad 2,Unidad 2,Unidad 3,Unidad 3'
    && R.lectura.entregas === '2026-09-07 | 2026-09-13 | 2026-09-15 | 2026-09-20 | 2026-09-27 | 2026-10-04 | 2026-10-16' && R.lectura.iniciosOk;

  // 3. Guardar con estatus: lo vencido como «Enviada», lo demás «Pendiente»; materia nueva con clave y ciclo
  // 3a. La materia nueva se crea con la clave del cronograma como nombre
  R.nombrePorClave = await p.inputValue('#cr_nom_0') === 'XX123';
  await p.check('#crVencidas'); await p.click('text=Cargar actividades'); await p.waitForTimeout(300);
  R.guardado = await p.evaluate(() => { const m = S.materias.find(x => x.clave === 'XX123'); const l = S.escolares.filter(e => e.materia === m.id);
    const ren = { antes: document.querySelectorAll('#pral tbody tr').length }; Esc.renombrar(m.id, 'Bases de datos'); UI.esc.tab = 'lista'; App.pintar();
    const filasMat = [...document.querySelectorAll('#pral tbody tr')].filter(tr => tr.textContent.includes('Bases de datos')).length;
    return { renombradaEnTodas: filasMat === 7 && !S.escolares.some(e => e.materia !== m.id), materia: m.nombre + '|' + m.clave + '|' + m.ciclo, n: l.length, enviadas: l.filter(e => e.estatus === 'enviada').map(e => e.entrega).join(','), pendientes: l.filter(e => e.estatus === 'pendiente').length,
      enLista: document.querySelectorAll('#pral tbody tr').length >= 7, sinHora: !l.some(e => 'hora' in e), sinColumnaHora: !document.querySelector('#pral th') || ![...document.querySelectorAll('#pral th')].some(t => /hora/i.test(t.textContent)) }; });
  R.guardadoOk = R.guardado.materia === 'Bases de datos|XX123|2026B' && R.guardado.n === 7 && R.guardado.enviadas === '2026-09-07,2026-09-13' && R.guardado.pendientes === 5 && R.guardado.enLista && R.guardado.sinHora && R.guardado.sinColumnaHora && R.nombrePorClave && R.guardado.renombradaEnTodas;

  // 3b. Calendario (línea de tiempo): conteo de entregas por día y marcado rápido del estado
  await p.evaluate(() => { UI.esc.tab = 'tiempo'; UI.esc.rango = 'todo'; UI.esc.tst = ''; App.pintar(); });
  R.calendario = await p.evaluate(() => ({ conteos: [...document.querySelectorAll('.tl .ccel')].map(c => c.textContent).join(','), barras: document.querySelectorAll('.tl .bar').length, etiqueta: !!document.evaluate("//*[contains(text(),'Vencen ese día')]", document, null, 9, null).singleNodeValue }));
  await p.click('.tl .bar >> text=Quiz de la unidad 1'); await p.waitForSelector('#modal .btn >> text=Enviada');
  await p.click('#modal .btn >> text=Enviada'); await p.waitForTimeout(200);
  R.marcado = await p.evaluate(() => { const e = S.escolares.find(x => x.titulo === 'Quiz de la unidad 1'); return e.estatus === 'enviada' && S.historial.some(h => h.ref === e.id && h.a === 'Enviada'); });
  await p.evaluate(() => { UI.esc.tst = 'enviada'; App.pintar(); }); R.filtroEnviadas = await p.evaluate(() => document.querySelectorAll('.tl .bar').length);
  await p.evaluate(() => { UI.esc.tst = ''; UI.esc.tab = 'materias'; App.pintar(); });
  // 3c. Renombrar la materia desde la pestaña Materias
  await p.fill('#pral input[aria-label="Nombre de la materia"]', 'Bases de datos avanzadas'); await p.press('#pral input[aria-label="Nombre de la materia"]', 'Tab'); await p.waitForTimeout(200);
  R.renombrada = await p.evaluate(() => S.materias[0].nombre === 'Bases de datos avanzadas');
  await p.evaluate(() => { Esc.renombrar(S.materias[0].id, '   '); }); R.noVacia = await p.evaluate(() => S.materias[0].nombre === 'Bases de datos avanzadas');
  await p.evaluate(() => { Esc.renombrar(S.materias[0].id, 'Bases de datos'); UI.esc.tab = 'lista'; App.pintar(); });
  R.calendarioOk = R.calendario.conteos === '1,1,1,1,1,1,1' && R.calendario.barras === 7 && R.calendario.etiqueta && R.marcado && R.filtroEnviadas === 3 && R.renombrada && R.noVacia;
  // 3d. Tableta con barra del navegador: el pie con «Cargar actividades» queda dentro de la altura visible
  R.tableta = await (async () => { const t = await b.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true, isMobile: true }), q = await t.newPage();
    await q.goto(APP); await q.waitForSelector('.cab'); await q.evaluate(() => { location.hash = '#/escuela'; App.ruta(); CronoUI.abrir(); });
    await q.setInputFiles('#crArchivos', [fNormal]); await q.evaluate(() => CronoUI.leer()); await q.waitForSelector('text=Revisar cronogramas', { timeout: 120000 });
    await q.setViewportSize({ width: 810, height: 900 });   // la barra del navegador aparece y reduce la altura visible
    const r = await q.evaluate(() => { const bt = [...document.querySelectorAll('#modal button')].find(x => /Cargar actividades/.test(x.textContent)).getBoundingClientRect(); return { abajo: Math.round(bt.bottom), alto: innerHeight, ancho: document.documentElement.scrollWidth <= innerWidth }; });
    await t.close(); return r; })();
  R.tabletaOk = R.tableta.abajo <= R.tableta.alto && R.tableta.ancho;
  // 4. Volver a cargar el mismo PDF: sugiere la materia existente y no duplica
  await leer([fNormal]); R.reimporta = await p.evaluate(() => { const s = document.getElementById('cr_mat_0'); return s.options[s.selectedIndex].text; });
  await p.click('text=Cargar actividades'); await p.waitForTimeout(300);
  R.sinDuplicados = await p.evaluate(() => S.escolares.length === 7 && S.materias.length === 1);

  // 5. PDF con textos maliciosos, PDF sin tablas y archivo falso con extensión .pdf
  await leer([fMalo, fSinTablas, fFalso]);
  R.malicioso = await p.evaluate(() => ({ ejecuto: window.__pdf || 0, img: document.querySelectorAll('#modal img, #modal [onload], #modal [onerror]').length,
    filas: CronoUI._d[0].filas.length, tipos: CronoUI._d[0].filas.map(f => f.tipo).join(','), sinTablas: CronoUI._d[1].avisos[0] || '', falso: CronoUI._d[2].avisos[0] || '' }));
  await p.fill('#cr_nom_0', 'Materia <b>rara</b>'); await p.click('text=Cargar actividades'); await p.waitForTimeout(400);
  R.maliciosoGuardado = await p.evaluate(() => ({ ejecuto: window.__pdf || 0, img: document.querySelectorAll('#pral img[src="x"], #pral svg[onload]').length, n: S.escolares.length }));
  R.maliciosoOk = R.malicioso.ejecuto === 0 && R.malicioso.img === 0 && R.malicioso.filas === 2 && /tablas/.test(R.malicioso.sinTablas) && /No se pudo leer/.test(R.malicioso.falso)
    && R.maliciosoGuardado.ejecuto === 0 && R.maliciosoGuardado.img === 0 && R.maliciosoGuardado.n === 9;

  // 5b. PDF manipulado con miles de filas: se recorta y no congela la página
  R.inundacion = await p.evaluate(() => { const it = (s, x, y) => ({ s, x, y, w: 40, h: 9 }), items = [it('Actividad', 20, 10), it('Tipo', 300, 10), it('Valor', 400, 10), it('Actividad', 20, 30000), it('Fecha de entrega', 300, 30000)];
    for (let i = 0; i < 2500; i++) { items.push(it('Tarea ' + i, 20, 30 + i * 11), it('Buzón', 300, 30 + i * 11), it('1%', 400, 30 + i * 11), it('Tarea ' + i, 20, 30020 + i * 11), it('lunes, 7 de septiembre de 2026, 23:59', 300, 30020 + i * 11)); }
    const t0 = performance.now(), r = Crono.interpretar([{ ancho: 600, alto: 60000, items }], 'x.pdf'); return { ms: Math.round(performance.now() - t0), filas: r.filas.length, aviso: r.avisos.some(a => /demasiadas/.test(a)) }; });
  R.inundacionOk = R.inundacion.filas <= 600 && R.inundacion.aviso && R.inundacion.ms < 8000;
  // 6. Nuevo semestre: todo lo escolar a la papelera; se puede restaurar
  await p.click('text=Nuevo semestre'); await p.click('#modal .btn.peligro'); await p.waitForTimeout(300);
  R.semestre = await p.evaluate(() => ({ materias: S.materias.length, escolares: S.escolares.length, papelera: S.papelera.filter(e => e.lista === 'materias').length, otros: S.proyectos.length >= 0 }));
  R.restaura = await p.evaluate(() => { const e = S.papelera.find(x => x.lista === 'materias' && x.obj.clave === 'XX123'); Papelera.restaurar(e.id); return S.escolares.length === 7 && S.materias.length === 1; });
  R.semestreOk = R.semestre.materias === 0 && R.semestre.escolares === 0 && R.semestre.papelera === 2 && R.restaura;

  R.externas = externas; R.errores = errores.filter(e => !/No se pudo leer|Invalid PDF|PDF/.test(e));
  R.TODO_OK = R.lecturaOk && R.guardadoOk && R.reimporta.startsWith('Bases de datos') && R.sinDuplicados && R.calendarioOk && R.tabletaOk && R.maliciosoOk && R.inundacionOk && R.semestreOk && !externas.length && !R.errores.length;
  console.log(JSON.stringify(R, null, 1)); if (!process.env.CONSERVAR) fs.rmSync(TMP, { recursive: true, force: true }); else console.log(TMP); await b.close(); process.exit(R.TODO_OK ? 0 : 1);
})();
