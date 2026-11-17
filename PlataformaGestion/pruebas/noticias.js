// Pruebas de Noticias e investigación contra un GitHub SIMULADO (no usa la red real).
// Requiere Node.js y Playwright con Chromium.   Uso:  node pruebas/noticias.js
const { chromium } = require('playwright'); const crypto = require('crypto'); const path = require('path');
const HTML = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
const TOKEN = 'github_pat_' + 'Z9y8X7w6V5u4T3s2R1q0P9o8', PASS = 'frase-larga-de-prueba';
const sha = t => crypto.createHash('sha1').update(String(t) + Math.random()).digest('hex');
// --- GitHub simulado: blobs, árboles, commits, una rama y la API de contenidos para borrar ---
const G = { private: true, blobs: {}, trees: {}, commits: {}, ref: '', peticiones: [], alSubir: null };
const commit = (tree, parents = [G.ref]) => { const t = sha('t'); G.trees[t] = tree; const c = sha('c'); G.commits[c] = { tree: t, parents }; G.ref = c; };
const arbol = () => G.trees[G.commits[G.ref].tree];
const ponArchivo = (p, contenido) => { const b = sha(p); G.blobs[b] = contenido; commit([...arbol().filter(e => e.path !== p), { path: p, mode: '100644', type: 'blob', sha: b, size: Buffer.byteLength(contenido) }]); };
(() => { const b = sha('readme'); G.blobs[b] = '# nova-datos'; const t = sha('t'); G.trees[t] = [{ path: 'README.md', mode: '100644', type: 'blob', sha: b }]; const c = sha('c'); G.commits[c] = { tree: t, parents: [] }; G.ref = c; })();
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
async function api(route) {
  const rq = route.request(), u = new URL(rq.url()), m = rq.method(); G.peticiones.push(m + ' ' + u.host + u.pathname);
  const ok = (o, s = 200) => route.fulfill({ status: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (u.host !== 'api.github.com') return route.abort();
  if (rq.headers()['authorization'] !== 'Bearer ' + TOKEN) return ok({ message: 'Bad credentials' }, 401);
  const r = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, ''), cuerpo = rq.postData() ? JSON.parse(rq.postData()) : null; let x;
  if (!u.pathname.startsWith('/repos/yo/nova-datos')) return ok({ message: 'Not Found' }, 404);
  if (m === 'GET' && r === '') return ok({ private: G.private, default_branch: 'main' });
  if (m === 'GET' && r === '/git/ref/heads/main') return ok({ object: { sha: G.ref } });
  if (m === 'GET' && (x = r.match(/^\/git\/commits\/(\w+)$/))) return ok({ tree: { sha: G.commits[x[1]].tree } });
  if (m === 'GET' && (x = r.match(/^\/git\/trees\/(\w+)$/))) return ok({ tree: G.trees[x[1]] });
  if (m === 'GET' && (x = r.match(/^\/git\/blobs\/(\w+)$/))) { const c = G.blobs[x[1]]; return ok({ encoding: 'base64', size: Buffer.byteLength(c), content: Buffer.from(c, 'utf8').toString('base64').replace(/(.{60})/g, '$1\n') }); }
  if (m === 'POST' && r === '/git/blobs') { const s = sha(cuerpo.content); G.blobs[s] = cuerpo.content; return ok({ sha: s }, 201); }
  if (m === 'POST' && r === '/git/trees') { const s = sha('t'); G.trees[s] = cuerpo.tree; return ok({ sha: s }, 201); }
  if (m === 'POST' && r === '/git/commits') { const s = sha('c'); G.commits[s] = { tree: cuerpo.tree, parents: cuerpo.parents }; G.commitsNova = (G.commitsNova || 0) + 1; if (G.alSubir) { const f = G.alSubir; G.alSubir = null; f(); } return ok({ sha: s }, 201); }   // la noticia llega cuando Nova ya armó su versión
  if (m === 'PATCH' && r === '/git/refs/heads/main') { G.ref = cuerpo.sha; return ok({ object: { sha: G.ref } }); }
  if (m === 'DELETE' && (x = r.match(/^\/contents\/(.+)$/))) {
    const p = decodeURIComponent(x[1]), e = arbol().find(y => y.path === p);
    if (!e) return ok({ message: 'Not Found' }, 404); if (e.sha !== cuerpo.sha) return ok({ message: 'sha no coincide' }, 409);
    commit(arbol().filter(y => y.path !== p)); return ok({ commit: { sha: G.ref } });
  }
  return ok({ message: 'Not Found' }, 404);
}
// Archivos que «escribe Claude»
const NOTICIA = (titulo, extra = {}) => JSON.stringify({ formato: 'nova-noticia', v: 1, tipo: 'noticia', tema: 'Seguridad', titulo, resumen: 'Resumen de prueba.\nSegundo párrafo.', puntos: ['Punto uno', 'Punto dos'],
  fuentes: [{ medio: 'Medio A', titulo: 'Artículo A', url: 'https://example.com/a', fecha: '2026-11-17' }], etiquetas: ['phishing', 'banca'], relevancia: 'alta', consulta: 'phishing bancos', fecha: '2026-11-17T08:10:00-06:00', ...extra });
const tieneArchivo = p => arbol().some(e => e.path === p);
(async () => {
  const b = await chromium.launch(), R = {}, errs = [];
  const c = await b.newContext({ viewport: { width: 1400, height: 900 } }); await c.route(u => !/^(file|blob|data):/.test(String(u)), api);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date(2026, 10, 17, 9, 0) });
  await p.goto(HTML); await p.waitForSelector('.cab');
  // 1. Sin conexión configurada: la pantalla lo explica y ofrece conectar
  await p.evaluate(() => { location.hash = '#/noticias'; App.ruta(); });
  R.sinConexion = await p.evaluate(() => /Conecta tu repositorio/.test(document.querySelector('#pral').textContent) && !!document.evaluate("//button[contains(.,'Conectar nova-datos')]", document, null, 9, null).singleNodeValue);
  // 2. Conectar la sincronización (sube los datos cifrados) y Claude agrega noticias
  await p.evaluate(() => { UI.aj.tab = 'sync'; location.hash = '#/ajustes'; App.ruta(); });
  await p.fill('#syRepo', 'yo/nova-datos'); await p.fill('#syToken', TOKEN); await p.fill('#syPass', PASS); await p.fill('#syPass2', PASS); await p.click('text=Conectar');
  await p.waitForFunction(() => Sync.activo() && Sync.estado === 'aldia', null, { timeout: 30000 });
  ponArchivo('noticias/2026-11-17-0810-seguridad-phishing.json', NOTICIA('Campaña de phishing suplanta paquetería'));
  ponArchivo('noticias/2026-11-17-0740-ia-agentes.json', NOTICIA('Agentes de IA en empresas', { tema: 'ia', relevancia: 'media', tipo: 'investigacion' }));
  ponArchivo('noticias/malo-formato.json', JSON.stringify({ titulo: 'sin formato' }));
  ponArchivo('noticias/no-json.json', 'esto no es json');
  ponArchivo('noticias/grande.json', NOTICIA('Grande', { resumen: 'x'.repeat(120 * 1024) }));
  ponArchivo('otra-carpeta/x.json', NOTICIA('Fuera de noticias'));
  // 3. Actualizar: sólo entran las válidas de noticias/
  await p.evaluate(() => { location.hash = '#/noticias'; App.ruta(); }); await p.evaluate(() => Noticias.actualizar()); await p.waitForTimeout(300);
  R.recibidas = await p.evaluate(() => S.noticias.map(n => `${n.titulo}|${n.tema}|${n.tipo}|${n.relevancia}`).sort());
  R.recibidasOk = R.recibidas.join(';') === 'Agentes de IA en empresas|IA|investigacion|media;Campaña de phishing suplanta paquetería|Seguridad|noticia|alta';
  R.lista = await p.evaluate(() => ({ items: document.querySelectorAll('.nw2 .it').length, grupo: document.querySelector('.nw2 .gr').textContent, contador: (document.querySelector('.lat a[href="#/noticias"] .n') || {}).textContent }));
  // 4. Volver a actualizar no duplica
  await p.evaluate(() => Noticias.actualizar()); await p.waitForTimeout(200); R.sinDuplicar = await p.evaluate(() => S.noticias.length === 2);
  // 5. Abrir = marcar leída; sigue visible en «Sin leer» mientras está abierta; acciones
  await p.click('.nw2 .it >> text=Campaña de phishing'); await p.waitForTimeout(100);
  R.lectura = await p.evaluate(() => { const n = S.noticias.find(x => /phishing/.test(x.titulo)), d = document.querySelector('.nw2 .der');
    return { leida: n.leida, visible: [...document.querySelectorAll('.nw2 .it b')].some(b => /phishing/.test(b.textContent)), fuente: (d.querySelector('.fu a') || {}).href, rel: (d.querySelector('.fu a') || {}).rel, puntos: d.querySelectorAll('ul.pt2 li').length, contador: (document.querySelector('.lat a[href="#/noticias"] .n') || {}).textContent }; });
  await p.click('.nw2 .acc >> text=Guardar'); await p.click('.nw2 .acc >> text=Crear nota');
  R.acciones = await p.evaluate(() => ({ guardada: S.noticias.find(x => /phishing/.test(x.titulo)).guardada, nota: S.notas.some(n => /phishing/.test(n.titulo) && /Punto uno/.test(n.texto) && /example\.com\/a/.test(n.texto)) }));
  // 6. Inicio: tarjeta «Noticias sin leer»
  await p.evaluate(() => { location.hash = '#/inicio'; App.ruta(); });
  R.inicio = await p.evaluate(() => { const s = [...document.querySelectorAll('.blq')].find(x => /Noticias sin leer/.test(x.textContent)); return s ? [...s.querySelectorAll('li .x')].map(x => x.textContent) : null; });
  // 7. Llega una noticia DURANTE una sincronización: no se pierde y no hay conflicto
  await p.evaluate(() => { poner('recordatorios', { id: uid(), texto: 'Cambio local', fecha: hoyISO(), hora: '', repetir: '', hecho: false }); });
  G.alSubir = () => ponArchivo('noticias/2026-11-17-0900-web-llega-durante.json', NOTICIA('Llega durante la sincronización', { tema: 'Desarrollo web' }));
  const antes = G.commitsNova || 0; await p.evaluate(() => Sync.sincronizar());
  R.duranteSync = { reintento: (G.commitsNova || 0) - antes === 2, estado: await p.evaluate(() => Sync.estado), archivoConservado: tieneArchivo('noticias/2026-11-17-0900-web-llega-durante.json'), datosSubidos: arbol().some(e => e.path === 'datos.json') };
  // 8. Otra noticia llega con cambios locales pendientes: la siguiente sincronización NO marca conflicto
  ponArchivo('noticias/2026-11-17-0910-pp.json', NOTICIA('Novedades de Power Apps', { tema: 'Power Platform' }));
  await p.evaluate(async () => { poner('recordatorios', { id: uid(), texto: 'Otro cambio', fecha: hoyISO(), hora: '', repetir: '', hecho: false }); await Sync.sincronizar(); });
  R.sinConflicto = await p.evaluate(() => Sync.estado);
  // 9. Eliminar como en Notas: confirma, va a la papelera, se borra del repositorio y se abre la siguiente
  await p.evaluate(() => { location.hash = '#/noticias'; App.ruta(); UI.not.f = 'todas'; }); await p.evaluate(() => Noticias.actualizar()); await p.waitForTimeout(200);
  await p.evaluate(() => { UI.not.f = 'todas'; Noticias.abrir(S.noticias.find(x => /phishing/.test(x.titulo)).id); });
  await p.click('.nw2 .acc >> text=Eliminar'); await p.click('#confirma .btn.peligro'); await p.waitForTimeout(400);
  R.eliminar = await p.evaluate(() => ({ fuera: !S.noticias.some(x => /phishing/.test(x.titulo)), papelera: S.papelera.some(e => e.lista === 'noticias' && /phishing/.test(e.titulo)), siguiente: !!UI.not.id && !!por('noticias', UI.not.id), pendientes: S.porBorrar.length }));
  R.eliminar.repositorio = !tieneArchivo('noticias/2026-11-17-0810-seguridad-phishing.json');
  // 10. No vuelve a aparecer al actualizar; restaurar desde la papelera la devuelve (copia local)
  await p.evaluate(() => Noticias.actualizar()); await p.waitForTimeout(200);
  R.noReaparece = await p.evaluate(() => !S.noticias.some(x => /phishing/.test(x.titulo)));
  R.restaurar = await p.evaluate(() => { const e = S.papelera.find(x => x.lista === 'noticias'); return Papelera.restaurar(e.id) === '' && S.noticias.some(x => /phishing/.test(x.titulo)); });
  // 11. Sin internet: el borrado queda pendiente y se completa después
  await p.evaluate(() => { const n = S.noticias.find(x => /Agentes/.test(x.titulo)); UI.not.id = n.id; });
  await c.setOffline(true); await p.evaluate(() => { const n = por('noticias', UI.not.id); S.porBorrar.push({ id: uid(), archivo: n.archivo, sha: n.sha }); quitar('noticias', n.id); });
  R.pendienteSinRed = await p.evaluate(() => S.porBorrar.length);
  await c.setOffline(false); await p.evaluate(() => Noticias.actualizar()); await p.waitForTimeout(300);
  R.pendienteCompletado = { pendientes: await p.evaluate(() => S.porBorrar.length), repositorio: !tieneArchivo('noticias/2026-11-17-0740-ia-agentes.json') };
  // 12. Carga masiva CSV y exportación
  R.csv = await p.evaluate(() => { const x = Datos.leer_noticias(parseCSV('Titulo,Tema,Tipo,Relevancia,Resumen,Puntos,Fuentes\nDesde CSV,IA,Investigacion,Baja,Res,a | b,https://example.com/c javascript:alert(1)\n')); x.aplicar(); const n = S.noticias.find(y => y.titulo === 'Desde CSV');
    return { n: x.n, tipo: n.tipo, rel: n.relevancia, puntos: n.puntos, fuentes: Noticias.fuentes(n).map(f => f.url).join(' '), exporta: Datos.tablas().some(t => t.nombre === 'noticias.csv' && t.filas.length === S.noticias.length) }; });
  // 13. Instrucción para Claude: lleva el repositorio conectado y los temas guardados (escapados)
  R.instruccion = await p.evaluate(() => { window.__pr = 0; Noticias.instruccion(); document.getElementById('ntClaves').value = 'Seguridad: <img src=x onerror=window.__pr=1> ransomware'; Noticias._guardarClaves(); Modal.cerrar(); Noticias.instruccion();
    const t = document.getElementById('ntPrompt').value, r = { repo: t.includes('yo/nova-datos'), clave: t.includes('ransomware'), noBorrar: /No modifiques ni borres/.test(t), img: document.querySelectorAll('#modal img').length, ejecuto: window.__pr }; Modal.cerrar(); return r; });
  R.peticionesExternas = G.peticiones.filter(x => !/api\.github\.com/.test(x));
  R.errores = errs;
  R.TODO_OK = R.sinConexion && R.recibidasOk && R.lista.items === 2 && R.lista.grupo === 'Hoy' && R.lista.contador === '2' && R.sinDuplicar
    && R.lectura.leida && R.lectura.visible && R.lectura.fuente === 'https://example.com/a' && /noopener/.test(R.lectura.rel) && R.lectura.puntos === 2 && R.lectura.contador === '1'
    && R.acciones.guardada && R.acciones.nota && R.inicio && R.inicio.length === 1 && R.duranteSync.estado === 'aldia' && R.duranteSync.archivoConservado && R.duranteSync.reintento && R.sinConflicto === 'aldia'
    && R.eliminar.fuera && R.eliminar.papelera && R.eliminar.siguiente && R.eliminar.pendientes === 0 && R.eliminar.repositorio && R.noReaparece && R.restaurar
    && R.pendienteSinRed === 1 && R.pendienteCompletado.pendientes === 0 && R.pendienteCompletado.repositorio
    && R.csv.n === 1 && R.csv.tipo === 'investigacion' && R.csv.rel === 'baja' && R.csv.fuentes === 'https://example.com/c' && R.csv.exporta && R.instruccion.repo && R.instruccion.clave && R.instruccion.noBorrar && !R.instruccion.img && !R.instruccion.ejecuto && !R.peticionesExternas.length && !errs.length;
  console.log(JSON.stringify(R, null, 1)); console.log(R.TODO_OK ? '\nRESULTADO: CORRECTO' : '\nRESULTADO: CON FALLAS'); await b.close(); process.exit(R.TODO_OK ? 0 : 1);
})();
