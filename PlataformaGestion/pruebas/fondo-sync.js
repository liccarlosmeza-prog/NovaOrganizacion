// Prueba: la imagen de fondo cambiada en un equipo llega a los demás SIN conflicto, aunque el otro equipo
// haga cambios automáticos al abrir (frase del día, avisos de recordatorios, purga de la papelera).
// GitHub SIMULADO (no usa la red).   Uso:  node pruebas/fondo-sync.js
const { chromium } = require('playwright'); const crypto = require('crypto'); const path = require('path'), fs = require('fs'), os = require('os');
const HTML = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
const TOKEN = 'github_pat_' + 'F0n4o5y6N7c8R9o0Q1w2E3r4', PASS = 'frase-larga-de-prueba';
const sha = t => crypto.createHash('sha1').update(String(t) + Math.random()).digest('hex');
const G = { blobs: {}, trees: {}, commits: {}, ref: '' };
(() => { const b = sha('r'); G.blobs[b] = '# nova-datos'; const t = sha('t'); G.trees[t] = [{ path: 'README.md', mode: '100644', type: 'blob', sha: b, size: 12 }]; const c = sha('c'); G.commits[c] = { tree: t, parents: [] }; G.ref = c; })();
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
async function api(route) {
  const rq = route.request(), u = new URL(rq.url()), m = rq.method();
  const ok = (o, s = 200) => route.fulfill({ status: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (u.host !== 'api.github.com') return route.abort();
  if (rq.headers()['authorization'] !== 'Bearer ' + TOKEN) return ok({ message: 'Bad credentials' }, 401);
  const r = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, ''), cuerpo = rq.postData() ? JSON.parse(rq.postData()) : null; let x;
  if (m === 'GET' && r === '') return ok({ private: true, default_branch: 'main' });
  if (m === 'GET' && r === '/git/ref/heads/main') return ok({ object: { sha: G.ref } });
  if (m === 'GET' && (x = r.match(/^\/git\/commits\/(\w+)$/))) return ok({ tree: { sha: G.commits[x[1]].tree } });
  if (m === 'GET' && (x = r.match(/^\/git\/trees\/(\w+)$/))) return ok({ tree: G.trees[x[1]] });
  if (m === 'GET' && (x = r.match(/^\/git\/blobs\/(\w+)$/))) { const c = G.blobs[x[1]]; return ok({ encoding: 'base64', size: Buffer.byteLength(c), content: Buffer.from(c, 'utf8').toString('base64') }); }
  if (m === 'POST' && r === '/git/blobs') { const s = sha(cuerpo.content); G.blobs[s] = cuerpo.content; return ok({ sha: s }, 201); }
  if (m === 'POST' && r === '/git/trees') { const s = sha('t'); G.trees[s] = cuerpo.tree.map(e => ({ ...e, size: Buffer.byteLength(G.blobs[e.sha] || '') })); return ok({ sha: s }, 201); }
  if (m === 'POST' && r === '/git/commits') { const s = sha('c'); G.commits[s] = { tree: cuerpo.tree, parents: cuerpo.parents }; return ok({ sha: s }, 201); }
  if (m === 'PATCH' && r === '/git/refs/heads/main') { G.ref = cuerpo.sha; return ok({ object: { sha: G.ref } }); }
  return ok({ message: 'Not Found' }, 404);
}
(async () => {
  const b = await chromium.launch(), R = {}, errs = [];
  // Imagen de prueba (PNG pequeño generado aquí)
  const png = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nova-fondo-')), 'fondo.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64'));
  const equipo = async (dia) => { const c = await b.newContext({ viewport: { width: 1300, height: 850 } }); await c.route(u => !/^(file|blob|data):/.test(String(u)), api);
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.clock.install({ time: dia }); await p.goto(HTML); await p.waitForSelector('.cab'); return p; };
  const conectar = async p => { await p.evaluate(() => { UI.aj.tab = 'sync'; location.hash = '#/ajustes'; App.ruta(); }); await p.fill('#syRepo', 'yo/nova-datos'); await p.fill('#syToken', TOKEN); await p.fill('#syPass', PASS); await p.fill('#syPass2', PASS); await p.click('text=Conectar'); await p.waitForFunction(() => !Sync._ocupado && Sync.activo(), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  const lunes = new Date(2026, 10, 16, 8, 0), martes = new Date(2026, 10, 17, 8, 0);
  // Computadora (A): datos de ejemplo con frases y recordatorios; conecta y sube
  const A = await equipo(lunes); await A.evaluate(() => Datos.demo()); await A.click('#confirma .btn.peligro'); await A.waitForFunction(() => S.frases.length >= 3);
  await conectar(A);
  // Tableta (B): se conecta y recibe todo el lunes
  const B = await equipo(lunes); await conectar(B);
  R.B_inicial = await B.evaluate(() => ({ estado: Sync.estado, frases: S.frases.length }));
  // Martes: en la computadora se cambia la imagen de fondo y se sincroniza
  await A.clock.setSystemTime(martes);
  await A.evaluate(() => { UI.aj.tab = 'apariencia'; location.hash = '#/ajustes'; App.ruta(); });
  await A.setInputFiles('input[type=file][onchange*="fondoImg"]', png); await A.waitForFunction(() => !!S.ajustes.fondoImg);
  await A.evaluate(() => Sync.sincronizar()); await A.waitForFunction(() => !Sync._ocupado);
  R.A_subio = await A.evaluate(() => ({ estado: Sync.estado, fondo: S.ajustes.fondoImg }));
  // Martes: se abre la tableta (recarga). Al abrir hace cambios automáticos (frase del día, avisos) y sincroniza
  await B.evaluate(() => { location.hash = '#/inicio'; }); await B.clock.setSystemTime(martes); await B.reload(); await B.waitForSelector('.cab');
  await B.waitForFunction(() => !Sync._ocupado && ['aldia', 'conflicto', 'error'].includes(Sync.estado), null, { timeout: 30000 }); await B.waitForTimeout(500);
  R.B_martes = await B.evaluate(() => ({ estado: Sync.estado, fondoIgual: S.ajustes.fondoImg, seVe: !!Img.url(S.ajustes.fondoImg) && /blob:/.test(getComputedStyle(document.querySelector('#fondo')).backgroundImage) }));
  R.B_martes.fondoIgual = R.B_martes.fondoIgual === R.A_subio.fondo;
  // Celular (C): equipo nuevo el martes
  const C = await equipo(martes); await conectar(C);
  R.C = await C.evaluate(() => ({ estado: Sync.estado, seVe: !!Img.url(S.ajustes.fondoImg) && /blob:/.test(getComputedStyle(document.querySelector('#fondo')).backgroundImage) }));
  // Un cambio REAL en ambos lados sigue siendo conflicto (no se pierde nada sin preguntar)
  await A.evaluate(async () => { poner('notas', { id: uid(), titulo: 'Nota real de A', texto: '', proyecto: '', creado: '', actualizado: '' }); await new Promise(r => setTimeout(r, 400)); await Sync.sincronizar(); });
  await B.evaluate(async () => { poner('notas', { id: uid(), titulo: 'Nota real de B', texto: '', proyecto: '', creado: '', actualizado: '' }); await new Promise(r => setTimeout(r, 400)); await Sync.sincronizar(); });
  R.conflictoReal = await B.evaluate(() => Sync.estado);
  R.errores = errs;
  R.TODO_OK = R.B_inicial.estado === 'aldia' && R.A_subio.estado === 'aldia' && !!R.A_subio.fondo && R.B_martes.estado === 'aldia' && R.B_martes.fondoIgual && R.B_martes.seVe && R.C.estado === 'aldia' && R.C.seVe && R.conflictoReal === 'conflicto' && !errs.length;
  console.log(JSON.stringify(R, null, 1)); console.log(R.TODO_OK ? '\nRESULTADO: CORRECTO' : '\nRESULTADO: CON FALLAS'); await b.close(); process.exit(R.TODO_OK ? 0 : 1);
})();
