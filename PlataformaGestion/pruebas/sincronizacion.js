// Prueba de la sincronización contra un GitHub SIMULADO (no usa la red real).
// Requiere Node.js y Playwright con Chromium.   Uso:  node pruebas/sincronizacion.js
const { chromium } = require('playwright'); const crypto = require('crypto'); const path = require('path');
const HTML = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
const TOKEN = 'github_pat_' + 'A1b2C3d4E5f6G7h8I9j0K1l2', PASS = 'frase-larga-de-prueba';
const sha = t => crypto.createHash('sha1').update(String(t) + Math.random()).digest('hex');
// --- GitHub simulado: blobs, árboles, commits y una rama ---
const G = { private: true, blobs: {}, trees: {}, commits: {}, ref: '', peticiones: [], auth401: false };
(() => { const b = sha('readme'); G.blobs[b] = '# nova-datos'; const t = sha('t'); G.trees[t] = [{ path: 'README.md', mode: '100644', type: 'blob', sha: b }]; const c = sha('c'); G.commits[c] = { tree: t, parents: [] }; G.ref = c; })();
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
async function api(route) {
  const rq = route.request(), u = new URL(rq.url()), m = rq.method(); G.peticiones.push(m + ' ' + u.host + u.pathname);
  const ok = (o, s = 200) => route.fulfill({ status: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (u.host !== 'api.github.com') return route.abort();
  if (G.auth401 || rq.headers()['authorization'] !== 'Bearer ' + TOKEN) return ok({ message: 'Bad credentials' }, 401);
  const r = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, ''), cuerpo = rq.postData() ? JSON.parse(rq.postData()) : null; let x;
  if (!u.pathname.startsWith('/repos/yo/nova-datos')) return ok({ message: 'Not Found' }, 404);
  if (m === 'GET' && r === '') return ok({ private: G.private, default_branch: 'main' });
  if (m === 'GET' && r === '/git/ref/heads/main') return ok({ object: { sha: G.ref } });
  if (m === 'GET' && (x = r.match(/^\/git\/commits\/(\w+)$/))) return ok({ tree: { sha: G.commits[x[1]].tree } });
  if (m === 'GET' && (x = r.match(/^\/git\/trees\/(\w+)$/))) return ok({ tree: G.trees[x[1]] });
  if (m === 'GET' && (x = r.match(/^\/git\/blobs\/(\w+)$/))) return ok({ encoding: 'base64', content: Buffer.from(G.blobs[x[1]], 'utf8').toString('base64').replace(/(.{60})/g, '$1\n') });
  if (m === 'POST' && r === '/git/blobs') { const s = sha(cuerpo.content); G.blobs[s] = cuerpo.content; return ok({ sha: s }, 201); }
  if (m === 'POST' && r === '/git/trees') { const s = sha('t'); G.trees[s] = cuerpo.tree; return ok({ sha: s }, 201); }
  if (m === 'POST' && r === '/git/commits') { const s = sha('c'); G.commits[s] = { tree: cuerpo.tree, parents: cuerpo.parents }; return ok({ sha: s }, 201); }
  if (m === 'PATCH' && r === '/git/refs/heads/main') { G.ref = cuerpo.sha; return ok({ object: { sha: G.ref } }); }
  return ok({ message: 'Not Found' }, 404);
}
const datosBlob = () => { const e = G.trees[G.commits[G.ref].tree].find(x => x.path === 'datos.json'); return e ? G.blobs[e.sha] : ''; };
(async () => {
  const b = await chromium.launch(); const R = {}; const errs = [];
  const equipo = async () => { const c = await b.newContext({ viewport: { width: 1366, height: 800 } }); await c.route(u => !/^(file|blob|data):/.test(String(u)), api); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(HTML); await p.waitForSelector('.cab'); return p; };
  const conectarUI = async (p, pass = PASS) => { await p.evaluate(() => { UI.aj.tab = 'sync'; location.hash = '#/ajustes'; App.ruta(); }); await p.fill('#syRepo', 'https://github.com/yo/nova-datos'); await p.fill('#syToken', TOKEN); await p.fill('#syPass', pass); await p.fill('#syPass2', pass); await p.click('text=Conectar'); await p.waitForFunction(() => !Sync._ocupado); await p.waitForTimeout(300); };
  // --- Equipo A: datos de ejemplo + nota privada; conecta y sube ---
  const A = await equipo();
  await A.evaluate(() => Datos.demo()); await A.click('#confirma .btn.peligro'); await A.waitForFunction(() => S.frases.length >= 3 && Img.blobs.size >= 1);
  await A.evaluate(async () => { await Boveda.crear('clave-notas-1'); await Boveda.guardarNota({ id: uid(), titulo: 'Privada', texto: 'secreto de la nota', creado: '', actualizado: '' }); });
  await conectarUI(A);
  R.A_conecta = await A.evaluate(() => ({ estado: Sync.estado, repo: Sync.cfg && Sync.cfg.owner + '/' + Sync.cfg.repo }));
  const d1 = datosBlob();
  R.remoto_cifrado = { hayDatos: !!d1, sinTextoPlano: !/Robles|Power BI|secreto|Ana Ram/.test(d1 + Object.values(G.blobs).join('')), imagenes: G.trees[G.commits[G.ref].tree].filter(e => e.path.startsWith('img/')).length, unSoloCommit: G.commits[G.ref].parents.length === 0, conservaReadme: G.trees[G.commits[G.ref].tree].some(e => e.path === 'README.md') };
  R.token_fuera_del_estado = await A.evaluate(t => !JSON.stringify(S).includes(t) && !JSON.stringify(Datos.tablas()).includes(t) && !document.documentElement.innerHTML.includes(t) && !Object.keys(localStorage).some(k => localStorage.getItem(k).includes(t)), TOKEN);
  // --- Equipo B: contraseña incorrecta, luego correcta; debe recibir todo ---
  const B = await equipo();
  await conectarUI(B, 'otra-contrasena-mala');
  R.B_pass_mala = await B.evaluate(() => ({ activo: Sync.activo(), proyectos: S.proyectos.length }));
  await conectarUI(B);
  R.B_recibe = await B.evaluate(async () => ({ estado: Sync.estado, proyectos: S.proyectos.length, actividades: S.actividades.length, imgs: Img.blobs.size, frasesConImg: S.frases.filter(f => f.img && Img.url(f.img)).length, privadas: S.notasPriv.length, abreBoveda: await Boveda.abrir('clave-notas-1'), notaPrivada: Boveda.notas[0] && Boveda.notas[0].texto }));
  // --- B edita y sube; A lo recibe ---
  await B.evaluate(async () => { poner('actividades', { id: uid(), titulo: 'Hecha en el equipo B', proyecto: '', categoria: '', estatus: idInicial(), prioridad: '3', limite: '', checklist: '', detalle: '' }); await new Promise(r => setTimeout(r, 400)); await Sync.sincronizar(); });
  await A.evaluate(() => Sync.sincronizar());
  R.A_recibe_de_B = await A.evaluate(() => ({ estado: Sync.estado, tiene: S.actividades.some(a => a.titulo === 'Hecha en el equipo B') }));
  // --- Conflicto: ambos editan; A sube primero; B detecta y conserva GitHub ---
  await A.evaluate(async () => { poner('notas', { id: uid(), titulo: 'Nota de A', texto: '', proyecto: '', etiquetas: '', creado: '', actualizado: '' }); await new Promise(r => setTimeout(r, 400)); await Sync.sincronizar(); });
  await B.evaluate(async () => { poner('notas', { id: uid(), titulo: 'Nota de B', texto: '', proyecto: '', etiquetas: '', creado: '', actualizado: '' }); await new Promise(r => setTimeout(r, 400)); await Sync.sincronizar(); });
  R.conflicto = await B.evaluate(() => ({ estado: Sync.estado, localIntacto: S.notas.some(n => n.titulo === 'Nota de B') && !S.notas.some(n => n.titulo === 'Nota de A') }));
  await B.evaluate(() => Sync.resolver('github'));
  R.conflicto_resuelto = await B.evaluate(() => ({ estado: Sync.estado, deA: S.notas.some(n => n.titulo === 'Nota de A'), deB: S.notas.some(n => n.titulo === 'Nota de B') }));
  // --- A recarga: sigue conectado sin pedir contraseña ---
  await A.reload(); await A.waitForSelector('.cab'); await A.waitForFunction(() => !Sync._ocupado); await A.waitForTimeout(300);
  R.A_recarga = await A.evaluate(() => ({ activo: Sync.activo(), estado: Sync.estado, pie: document.querySelector('.lat .pie').textContent.trim(), claveNoExtraible: Sync.cfg.clave.extractable === false }));
  // --- Archivo alterado en GitHub: se rechaza y lo local no cambia ---
  const eD = G.trees[G.commits[G.ref].tree].find(x => x.path === 'datos.json'), bueno = G.blobs[eD.sha], j = JSON.parse(bueno);
  j.ct = j.ct.slice(0, 40) + (j.ct[40] === 'A' ? 'B' : 'A') + j.ct.slice(41); G.blobs[eD.sha] = JSON.stringify(j); const refBueno = G.ref; G.ref = (() => { const s = sha('c'); G.commits[s] = G.commits[refBueno]; return s; })();
  R.alterado = await A.evaluate(async () => { const n = S.proyectos.length; await Sync.sincronizar(); return { estado: Sync.estado, detalle: Sync.detalle.slice(0, 60), localIntacto: S.proyectos.length === n }; });
  G.blobs[eD.sha] = bueno; G.ref = refBueno;
  // --- Token inválido y repositorio público ---
  G.auth401 = true; R.token_invalido = await A.evaluate(async () => { await Sync.sincronizar(); return Sync.estado + ': ' + Sync.detalle; }); G.auth401 = false;
  G.private = false; R.repo_publico = await A.evaluate(async () => { S.ajustes.usuario = 'x'; guardar(); await new Promise(r => setTimeout(r, 400)); const antes = Sync.cfg.commit; await Sync.sincronizar(); return { estado: Sync.estado, detalle: Sync.detalle.slice(0, 44), noSubio: Sync.cfg.commit === antes }; }); G.private = true;
  // --- Equipo C con datos propios: debe preguntar qué conservar ---
  const C = await equipo(); await C.evaluate(() => { poner('proyectos', { id: uid(), nombre: 'Sólo en C', ambito: 'Trabajo', estatus: idInicial(), prioridad: '3' }); });
  await conectarUI(C); R.C_pregunta = await C.evaluate(() => document.querySelector('#modal').classList.contains('on') && /dos lados/.test(document.querySelector('#modal h2').textContent));
  await C.click('text=Conservar lo de GitHub'); await C.waitForFunction(() => Sync.activo() && !Sync._ocupado); await C.waitForTimeout(300);
  R.C_tras_elegir = await C.evaluate(() => ({ estado: Sync.estado, soloC: S.proyectos.some(p => p.nombre === 'Sólo en C'), proyectos: S.proyectos.length }));
  // --- Desconectar borra token y clave del equipo ---
  await C.evaluate(() => Sync.desconectar()); await C.click('#confirma .btn.peligro'); await C.waitForTimeout(300);
  R.desconecta = await C.evaluate(async () => ({ activo: Sync.activo(), guardado: await DB._op('kv', 'readonly', s => s.get('sync')) || null }));
  R.hosts = [...new Set(G.peticiones.map(x => x.split(' ')[1].split('/')[0]))]; R.errores = errs;
  console.log(JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.error('FALLO', e); process.exit(1); });
