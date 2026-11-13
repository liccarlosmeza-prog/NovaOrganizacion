// Validación de seguridad automática. Se ejecuta en cada construcción (node construir.js)
// y también por separado:  node seguridad.js
// Revisa el HTML final y el código fuente. Si encuentra un problema BLOQUEANTE, termina con error.
const fs = require('fs'), path = require('path');
const dir = __dirname, src = path.join(dir, 'src');
const htmlCompleto = fs.readFileSync(path.join(dir, 'PlataformaGestion.html'), 'utf8');
// Librerías de terceros incrustadas como bloques de texto (lector de imágenes). Se validan aparte, por huella digital:
// el resto de las reglas revisa sólo el código propio de la aplicación.
const BLOQUES = ['ocrLib', 'ocrWorker', 'ocrCore', 'ocrLang'];
const html = BLOQUES.reduce((h, id) => h.replace(new RegExp(`(<script type="text/plain" id="${id}">)[\\s\\S]*?(</script>)`), '$1$2'), htmlCompleto);
const fuentes = fs.readdirSync(src).map(f => ({ f, t: fs.readFileSync(path.join(src, f), 'utf8') }));
const lineas = (t, re, filtro = () => true) => t.split('\n').map((l, i) => re.test(l) && filtro(l) ? `${i + 1}: ${l.trim().slice(0, 110)}` : null).filter(Boolean);
const buscar = (re, filtro) => fuentes.flatMap(({ f, t }) => lineas(t, re, filtro).map(l => `src/${f}:${l}`));
// Única conexión externa permitida. Autorizada por el usuario el 2026-11-12 para la sincronización cifrada.
const PERMITIDO = 'https://api.github.com';
const R = [];   // {ok, bloquea, t, d}
const regla = (t, hallazgos, bloquea = true, okTxt = 'Sin coincidencias') => R.push({ ok: hallazgos.length === 0, bloquea, t, d: hallazgos.length ? hallazgos : [okTxt] });

// 1. Conexiones externas: nada debe cargarse ni enviarse a otro servidor
const URLS = [...new Set((html.match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`<)]*/gi) || []))];
const carga = /(<script[^>]+src=|<link[^>]+href=|<img[^>]+src=["']https?:|<iframe|@import|url\(\s*["']?https?:|fetch\(\s*["'`]https?:|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|import\s*\()/i;
regla('Sin recursos ni conexiones externas (scripts, estilos, fuentes, imágenes, peticiones)', buscar(carga).concat(lineas(html.split(/<script(?: type="text\/plain")?/)[0], carga).map(l => 'plantilla:' + l)));
// 2. Política de seguridad de contenido
const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
regla('CSP presente y sin orígenes externos', !csp ? ['No hay meta Content-Security-Policy'] : [/default-src 'none'/.test(csp) ? null : "falta default-src 'none'", (csp.match(/https?:\/\/[^\s;]+|\*/g) || []).some(o => o !== PERMITIDO) ? 'la CSP permite un origen externo no autorizado' : null, /'unsafe-eval'/.test(csp) ? 'la CSP permite unsafe-eval (sólo se admite wasm-unsafe-eval para el lector de imágenes)' : null, /worker-src (?!blob:;)/.test(csp) ? 'worker-src sólo puede ser blob:' : null, /connect-src data: blob: https:\/\/api\.github\.com;/.test(csp) ? null : 'connect-src sólo puede ser data: blob: y api.github.com'].filter(Boolean), true, csp);
// 2b. Peticiones de red: sólo en el módulo de sincronización (más la lectura de imágenes incrustadas del respaldo)
const MOD = '055-sincronizacion.js', sy = (fuentes.find(x => x.f === MOD) || { t: '' }).t, todo = fuentes.map(x => x.t).join('\n');
regla('fetch() sólo en el módulo de sincronización, hacia api.github.com', buscar(/\bfetch\(/, l => !/fetch\(dataUrl\)/.test(l)).filter(l => !l.startsWith('src/' + MOD))
  .concat(fuentes.filter(x => x.f !== MOD && x.f !== 'plantilla.html' && /https?:\/\/api\.github\.com/.test(x.t)).map(x => `src/${x.f}: usa la dirección de la API fuera del módulo de sincronización`))
  .concat((sy.match(/https?:\/\/[a-z0-9.-]+/gi) || []).filter(u => u !== PERMITIDO && !/github\\?\.com/.test(u)).map(u => 'origen no autorizado en sincronización: ' + u)));
regla('Sincronización: repositorio privado obligatorio, cifrado, token fuera del estado y sin credenciales del navegador', [
  /repo\.private !== true/.test(sy) ? null : 'falta exigir repositorio privado', /AES-GCM/.test(sy) && /_cifrar\(/.test(sy) ? null : 'falta cifrado de lo enviado',
  /\bS\.[A-Za-z.]*(token|clave)\b|S\.ajustes\.sync/.test(todo) ? 'el token o la clave no deben guardarse en el estado S' : null,
  /console\.[a-z]+\([^)]*(token|pass)/.test(sy) ? 'no registrar el token ni la contraseña' : null, /credentials: 'omit'/.test(sy) ? null : "falta credentials: 'omit'",
  /fusionar\(estado\)/.test(sy) ? null : 'lo recibido debe pasar por fusionar()/sanear()'].filter(Boolean));
// 2c. Librerías de terceros: deben coincidir byte a byte con las versiones revisadas (terceros/tesseract/HUELLAS.txt)
const crypto = require('crypto'), ter = path.join(dir, 'terceros', 'tesseract');
const huellas = fs.existsSync(path.join(ter, 'HUELLAS.txt')) ? Object.fromEntries(fs.readFileSync(path.join(ter, 'HUELLAS.txt'), 'utf8').split('\n').filter(l => /^[0-9a-f]{64}\s/.test(l)).map(l => l.trim().split(/\s+/).reverse())) : {};
const mapa = { ocrLib: 'tesseract.min.js', ocrWorker: 'worker.min.js', ocrCore: 'tesseract-core-lstm.wasm.js', ocrLang: 'spa.traineddata.gz' };
const terc = [];
for (const [id, f] of Object.entries(mapa)) {
  const bloque = (htmlCompleto.match(new RegExp(`<script type="text/plain" id="${id}">([\\s\\S]*?)</script>`)) || [])[1];
  if (bloque === undefined) { terc.push(`falta el bloque ${id}`); continue; }
  const bytes = id === 'ocrLang' ? Buffer.from(bloque.trim(), 'base64') : Buffer.from(bloque, 'utf8');
  const h = crypto.createHash('sha256').update(bytes).digest('hex');
  if (!huellas[f]) terc.push(`${f}: no tiene huella registrada`); else if (h !== huellas[f]) terc.push(`${f}: la huella no coincide con la versión revisada`);
}
regla('Librerías de terceros sin alterar (huella SHA-256)', terc, true, Object.values(mapa).join(' · '));
// 3. Funciones peligrosas
regla('Sin eval, new Function, document.write ni temporizadores con texto', buscar(/\beval\(|new Function\(|document\.write|set(Timeout|Interval)\(\s*["'`]|\.outerHTML\s*=|insertAdjacentHTML|srcdoc/));
// 4. Secretos
regla('Sin claves, tokens ni contraseñas en el código', buscar(/api[_-]?key|client_secret|Bearer\s+[A-Za-z0-9]|sk-[A-Za-z0-9]{8}|AIza[0-9A-Za-z_-]{10}|AKIA[0-9A-Z]{8}|ghp_[A-Za-z0-9]{10}|xox[bp]-|AccountKey=|-----BEGIN|eyJ[A-Za-z0-9_-]{20}/i));
// 5. Enlaces
regla('Todo enlace en pestaña nueva usa rel="noopener noreferrer"', buscar(/target="_blank"/, l => (l.match(/target="_blank"/g) || []).length !== (l.match(/rel="noopener noreferrer"/g) || []).length));
regla('Las direcciones del usuario pasan por urlSegura()', buscar(/href="\$\{(?!esc\(urlSegura\()[^}]*\b(url|href)\b/));
// 6. Controles que deben seguir existiendo (evita que una edición los quite sin querer)
const debe = [['sanear(', 'saneamiento de respaldos y datos guardados'], ['urlSegura(', 'filtro de direcciones'], ["/^data:image\\/", 'validación de imágenes del respaldo'], ["\"'\" + s", 'neutralización de fórmulas al exportar CSV'], ['Object.hasOwn(Vistas', 'enrutador protegido'], ['PBKDF2', 'derivación de clave'], ['AES-GCM', 'cifrado de notas privadas']];
regla('Controles de seguridad presentes', debe.filter(([c]) => !html.includes(c)).map(([c, n]) => `Falta: ${n} (${c})`), true, debe.map(d => d[1]).join(' · '));
// 7. Informativos
const sinEsc = buscar(/\$\{[a-z]\.(titulo|nombre|texto|nota|desc|detalle|descripcion|lugar|autor|relacion|profesor|comentario|tags|etiquetas|asignadoPor|usuario|lema)\}/);
regla('Textos del usuario escapados con esc() al mostrarse', sinEsc, true);
regla('Sin console.log de depuración', buscar(/console\.log\(/), false);
regla('Tamaño razonable: código propio < 1 MB y archivo total < 15 MB', [html.length > 1048576 ? `código propio ${(html.length / 1024).toFixed(0)} KB` : null, htmlCompleto.length > 15 * 1048576 ? `archivo total ${(htmlCompleto.length / 1048576).toFixed(1)} MB` : null].filter(Boolean), false, `código propio ${(html.length / 1024).toFixed(0)} KB · total ${(htmlCompleto.length / 1048576).toFixed(1)} MB (incluye el lector de imágenes)`);

// Reporte
const fallos = R.filter(r => !r.ok && r.bloquea), avisos = R.filter(r => !r.ok && !r.bloquea);
const md = `# Validación automática de seguridad

> Generado por \`seguridad.js\` en cada construcción. No editar a mano.
> Fecha: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · Resultado: **${fallos.length ? 'NO APTO — ' + fallos.length + ' problema(s) bloqueante(s)' : 'APTO'}**${avisos.length ? ` · ${avisos.length} aviso(s)` : ''}

## Comprobaciones
| Resultado | Comprobación | Detalle |
|---|---|---|
${R.map(r => `| ${r.ok ? '✅ Correcto' : r.bloquea ? '⛔ Bloqueante' : '⚠️ Aviso'} | ${r.t} | ${r.d.map(x => '`' + String(x).replace(/\|/g, '\\|').replace(/`/g, "'") + '`').join('<br>')} |`).join('\n')}

## Inventario de direcciones externas que aparecen en el código
Sólo https://api.github.com se usa para conexiones, y únicamente si el usuario activa la sincronización. Las demás son texto: enlaces de ejemplo que sólo se abren con clic, o identificadores.

| Dirección | Uso |
|---|---|
${URLS.map(u => `| \`${u}\` | ${/w3\.org/.test(u) ? 'Identificador del formato SVG (no es una conexión)' : /api\.github\.com/.test(u) ? '**Conexión real**: sincronización cifrada con el repositorio privado del usuario (opcional)' : 'Enlace de ejemplo o plantilla; sólo se abre con clic del usuario'} |`).join('\n') || '| — | — |'}

**Dependencias de terceros:** Tesseract.js 5.1.1 (Apache-2.0) y el modelo de idioma español, **incrustados** en el archivo y verificados por huella SHA-256. No se descargan de ningún CDN; no hay nada más que empaquetar. La sincronización usa la API de GitHub como servicio, no como código.
`;
fs.writeFileSync(path.join(dir, 'SEGURIDAD-AUTOMATICA.md'), md);
for (const r of R) console.log(`${r.ok ? '  ok ' : r.bloquea ? ' FALLA' : ' aviso'}  ${r.t}${r.ok ? '' : '\n        ' + r.d.join('\n        ')}`);
console.log(fallos.length ? `\nSEGURIDAD: NO APTO (${fallos.length} bloqueante/s)` : '\nSEGURIDAD: APTO');
if (fallos.length) process.exit(1);
