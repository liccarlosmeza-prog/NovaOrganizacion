// Pasada adversarial automatizada (requiere Node.js y Playwright con Chromium).
// Uso:  node pruebas/ataque.js   → todos los resultados deben quedar vacíos / false.
// Pasada adversarial: cada prueba devuelve true si el ataque FUNCIONÓ (malo)
const { chromium } = require('playwright'); const fs = require('fs');
const HTML = 'file://' + require('path').resolve(__dirname, '..', 'PlataformaGestion.html'); const out = require('os').tmpdir();
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } }); const p = await ctx.newPage();
  const ext = []; p.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) ext.push(r.url()); });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(HTML); await p.waitForSelector('.cab'); const R = {};
  const restaurar = async (estado, imagenes = {}) => { fs.writeFileSync(out + '/malo.json', JSON.stringify({ app: 'PlataformaGestion', v: 1, fecha: 'x', estado, imagenes })); await p.evaluate(() => Datos.elegir('respaldo')); await p.setInputFiles('#archivo', out + '/malo.json'); await p.waitForSelector('#confirma.on'); await p.click('#confirma .btn.peligro'); await p.waitForTimeout(700); };
  const X = "<img src=x onerror=window.__xss=(window.__xss||0)+1>";
  // A1: respaldo con id malicioso en manejadores, y campos numéricos/estilo con inyección de atributos
  await restaurar({
    ajustes: { nombre: X, lema: X, usuario: X, fondoOp: '14" onfocus="window.__attr=1" autofocus x="', metaEscolar: '60"><img src=x onerror=window.__meta=1>', inicio: [{ id: 'actividades', on: true, ancho: '3" onmouseover="window.__ancho=1', filas: 10, dias: 0 }, { id: 'proyectos', on: true, ancho: 3, filas: 5 }, { id: 'cumples', on: true, ancho: 3, filas: 5, dias: 400 }] },
    proyectos: [{ id: "p1');window.__idxss=1;//", nombre: X, ambito: 'Trabajo', estatus: 'pend', descripcion: X, asignadoPor: X, avanceManual: '5%"><img src=x onerror=window.__av=1>' }],
    actividades: [{ id: "a1'+(window.__idxss2=1)+'", titulo: X, proyecto: '', categoria: '', estatus: 'pend', prioridad: '3', limite: new Date().toISOString().slice(0, 10), horas: '<img src=x onerror=window.__horas=1>', checklist: X, detalle: X }],
    cumples: [{ id: 'c1', nombre: X, dia: '<img src=x onerror=window.__dia=1>', mes: 1, relacion: X, nota: X }],
    materias: [{ id: 'm1', nombre: X, color: 'red" onmouseover="window.__color=1', meta: 80 }],
    escolares: [{ id: 'e1', materia: 'm1', titulo: X, tipo: 'Buzón', valor: '5"><img src=x onerror=window.__valor=1>', entrega: new Date().toISOString().slice(0, 10), inicio: new Date().toISOString().slice(0, 10), estatus: 'pendiente"><img src=x onerror=window.__est=1>', calif: null }],
    enlaces: [{ id: 'l1', nombre: X, url: 'javascript:window.__js=1', fav: true, tags: X, desc: X }],
    notas: [{ id: 'n1', titulo: X, texto: X + '</textarea>' + X, proyecto: '', etiquetas: '"><img src=x onerror=window.__tag=1>' }],
    frases: [{ id: 'f1', texto: X, autor: X, img: 'x" onerror="window.__img=1' }],
    estatus: [{ id: 'pend', nombre: X, color: '#000"><img src=x onerror=window.__ecolor=1>' }, { id: 'hecho', nombre: 'Fin', color: '#0a0', final: true }],
    categorias: [{ id: 'k1', nombre: X, color: '#111' }], recordatorios: [{ id: 'r1', texto: X, fecha: '2020-01-01', hora: X }],
    eventos: [{ id: 'v1', titulo: X, fecha: new Date().toISOString().slice(0, 10), horaIni: X, tipo: X, lugar: X }], historial: [{ id: 'h', lista: X, ref: 'a', titulo: X, de: X, a: X, fecha: X }], carpetas: [{ id: 'k', nombre: X, color: X }], grupos: [{ id: 'g', nombre: X, ids: ["x');window.__grupo=1;//"] }], bitacora: [{ id: 'b', proyecto: "p1');window.__idxss=1;//", fecha: '2026-01-01 10:00', tipo: X, texto: X, imgs: ['z" onerror="window.__bimg=1'] }]
  });
  const ir = async v => { await p.evaluate(v => { location.hash = '#/' + v; App.ruta(); }, v); await p.waitForTimeout(250); };
  for (const v of ['inicio', 'proyectos', 'actividades', 'escuela', 'agenda', 'recordatorios', 'notas', 'accesos', 'cumples', 'frases', 'ajustes']) await ir(v);
  for (const t of ['tiempo', 'eval', 'materias', 'lista']) { await p.evaluate(t => { UI.esc.tab = t; App.pintar(); }, t); await p.waitForTimeout(150); }
  for (const t of ['inicio', 'catalogos', 'datos', 'seguridad', 'apariencia']) { await p.evaluate(t => { UI.aj.tab = t; location.hash = '#/ajustes'; App.ruta(); }, t); await p.waitForTimeout(150); }
  await p.evaluate(() => Hist.ver('')); await p.waitForTimeout(150); await p.evaluate(() => Modal.cerrar());
  // clics en elementos con id malicioso
  await ir('actividades'); await p.evaluate(() => { UI.act.f = 'todas'; App.pintar(); }); await p.click('.lista .t').catch(() => {}); await p.waitForTimeout(200); await p.evaluate(() => Modal.cerrar());
  await ir('proyectos'); await p.evaluate(() => { UI.proy.f = 'todos'; App.pintar(); }); await p.click('.lista .t').catch(() => {}); await p.waitForTimeout(300);
  for (const t of ['bitacora', 'notas', 'historial', 'actividades']) { await p.evaluate(t => { UI.proy.tab = t; App.pintar(); }, t).catch(() => {}); await p.waitForTimeout(120); }
  await ir('accesos'); await p.hover('.lista tbody tr').catch(() => {}); await p.click('.fil button').catch(() => {});
  await ir('inicio'); await p.hover('.tab6 section').catch(() => {}); await p.waitForTimeout(200);
  R.A1_respaldo = await p.evaluate(() => Object.fromEntries(Object.keys(window).filter(k => k.startsWith('__')).map(k => [k, window[k]])));
  R.A1_enlaceJS = await p.evaluate(() => [...document.querySelectorAll('a')].some(a => /^javascript:/i.test(a.getAttribute('href') || '')));
  // A2: respaldo con "imagen" que apunta a un servidor externo
  ext.length = 0; await restaurar({ proyectos: [] }, { img1: 'https://example.com/rastreo.png?victima=1' }); R.A2_peticionExterna = ext.slice();
  // A3: enrutador con claves del prototipo
  R.A3_ruta = await p.evaluate(() => { const r = []; for (const h of ['__proto__', 'constructor', 'toString']) { try { location.hash = '#/' + h; App.ruta(); r.push(h + ':' + App.vista); } catch (e) { r.push(h + ':ERROR ' + e.message.slice(0, 40)); } } location.hash = '#/inicio'; App.ruta(); return r; });
  // A4: CSV con fórmulas -> exportación
  R.A4_formulaCSV = await p.evaluate(() => { S.notas.push({ id: uid(), titulo: '=HYPERLINK("http://malo","clic")', texto: '@SUM(1+1)', proyecto: '', etiquetas: '+cmd', creado: '', actualizado: '' }); const t = Datos.tablas().find(x => x.nombre === 'notas.csv'); return csvTexto(t.enc, t.filas).split('\r\n').slice(-2)[0]; });
  // A5: CSV importado con HTML/handlers
  R.A5_csv = await p.evaluate(() => { window.__csv = 0; const x = Datos.leer_proyectos(parseCSV('Nombre,Ambito,Descripcion\n"<img src=x onerror=window.__csv=1>",Trabajo,"<script>window.__csv=2<\/script>"\n')); x.aplicar(); location.hash = '#/proyectos'; App.ruta(); return new Promise(r => setTimeout(() => r(window.__csv), 300)); });
  // A5b: agenda por foto: texto pegado con HTML, fechas inválidas y repetidos
  R.A5b_foto = await p.evaluate(() => { window.__foto = 0; location.hash = '#/agenda'; App.ruta(); Foto.abrir(); document.querySelector('#ftTexto').value = 'Claro, aquí está:\n```csv\nEvento,Fecha,HoraInicio,HoraFin,Tipo,Proyecto,Lugar,Notas\n"<img src=x onerror=window.__foto=1>",20/11/2026,10:00,11:00,"<b>x</b>",,"<svg onload=window.__foto=2>","<script>window.__foto=3<\/script>"\nMala,31/02/2026,10:00,11:00,,,,\nAlRevés,20/11/2026,12:00,11:00,,,,\nDoble,21/11/2026,09:00,10:00,,,,\nDoble,21/11/2026,09:00,10:00,,,,\n```'; Foto.revisar(); const n = Foto._r ? Foto._r.n : -1; Foto.aplicar(); return new Promise(r => setTimeout(() => r({ ejecuto: window.__foto, validos: n, tipo: S.eventos.filter(e => e.origen === 'foto').map(e => e.tipo).join() }), 300)); });
  // A6: nova_ui manipulado
  R.A6_ui = await p.evaluate(() => { localStorage.setItem('nova_ui', JSON.stringify({ acc: { sel: { a: 1 }, f: 5 }, ag: { ver: 'x' }, act: { f: "x';window.__ui=1;'" }, __proto__: { x: 1 } })); return true; });
  await p.reload(); await p.waitForTimeout(800); R.A6_tras = await p.evaluate(() => ({ cab: !!document.querySelector('.cab'), ui: window.__ui, selEsSet: UI.acc.sel instanceof Set })); 
  await ir('accesos'); await ir('agenda'); await ir('actividades'); R.A6_errores = errs.slice(-3);
  // A7: CSP y contexto
  R.A7 = await p.evaluate(() => ({ csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), marco: window.top === window.self }));
  R.externas = ext; console.log(JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.error('FALLO', e); process.exit(1); });
