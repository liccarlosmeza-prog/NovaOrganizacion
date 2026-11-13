// Pruebas del lector de fotos incrustado (agenda y notas). Requiere Node.js y Playwright con Chromium.
// Uso:  node pruebas/lector-fotos.js
// Usa imágenes SINTÉTICAS (sin datos reales): se dibujan en el navegador, se fotografían y se le pasan a la plataforma.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const APP = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-ocr-'));
const fuente = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'fuentes', f)).toString('base64');
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Fechas cercanas a hoy (el lector asigna el año más cercano a hoy)
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
const dia = n => { const d = new Date(lunes); d.setDate(lunes.getDate() + n); return d; };
/** Similitud de texto (1 = idéntico), por distancia de edición sobre letras y números. */
function similitud(a, b) {
  const n = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();
  a = n(a); b = n(b); if (!a.length && !b.length) return 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

// ---------- Imágenes sintéticas ----------
const AGENDA_CEL = [   // [día, inicio, duración, título, lugar]
  [0, '10:00', '1 h', 'Revisión de presupuesto', 'Reunión de Microsoft Teams; Sala 3'],
  [0, '12:30', '30 min', 'Llamada con proveedor', 'Reunión de Microsoft Teams'],
  [1, '09:00', '2 h', 'Taller de indicadores', 'Microsoft Teams Meeting'],
  [2, '16:00', '1 h', 'Seguimiento semanal', 'Reunión de Microsoft Teams; Sala 5']
];
function htmlCelular() {
  let h = '';
  for (const d of [0, 1, 2]) {
    const f = dia(d); h += `<div class="f">${f.getDate()} ${MES[f.getMonth()].slice(0, 3)} <span>${DIAS[f.getDay()]}</span></div>`;
    for (const e of AGENDA_CEL.filter(x => x[0] === d)) h += `<div class="e"><div class="h">${e[1]}<br><small>${e[2]}</small></div><div class="b"></div><div><b>${e[3]}</b><br><small>${e[4]}</small></div></div>`;
  }
  return `<html><body style="margin:0;background:#f3f3f3;font-family:'DejaVu Sans',sans-serif;width:720px;padding:30px 40px">
    <style>.f{font-size:30px;margin:34px 0 18px}.f span{font-size:22px;color:#666;margin-left:10px}.e{display:flex;gap:26px;margin:26px 0;font-size:28px;align-items:flex-start}
    .h{width:110px;color:#444}.h small,.e small{font-size:22px;color:#555}.b{width:7px;height:70px;background:#888;border-radius:3px}</style>
    <div style="font-size:34px;margin-bottom:10px">${MES[dia(0).getMonth()]}</div>${h}</body></html>`;
}
const AGENDA_PC = [   // [columna (0 = lunes), hora inicio decimal, título, organizador]
  [0, 10, 'Comité de calidad', 'Pérez, Ana'], [1, 11, 'Revisión de tablero', 'Gómez, Luis'], [1, 14, 'Capacitación interna', 'Ruiz, Marta'],
  [2, 9, 'Planeación mensual', 'Pérez, Ana'], [3, 12, 'Sesión de mejora', 'Torres, Raúl'], [4, 10, 'Cierre semanal', 'Gómez, Luis']
];
function htmlComputadora() {
  const H0 = 8, H1 = 16, alto = 110, ancho = 230, ini = dia(0), fin = dia(5);
  const etiq = Array.from({ length: H1 - H0 + 1 }, (_, i) => { const h = H0 + i; return `<div style="position:absolute;left:20px;top:${150 + i * alto}px;font-size:22px;color:#555">${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}</div>`; }).join('');
  const cols = Array.from({ length: 6 }, (_, i) => { const d = dia(i); return `<div style="position:absolute;left:${120 + i * ancho}px;top:50px;font-size:34px">${d.getDate()}</div><div style="position:absolute;left:${120 + i * ancho}px;top:95px;font-size:20px;color:#555">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][i]}</div>`; }).join('');
  const lineas = Array.from({ length: H1 - H0 + 1 }, (_, i) => `<div style="position:absolute;left:110px;right:0;top:${150 + i * alto}px;border-top:1px solid #ddd"></div>`).join('');
  const ev = AGENDA_PC.map(([c, h, t, o]) => `<div style="position:absolute;left:${120 + c * ancho}px;top:${150 + (h - H0) * alto + 6}px;width:${ancho - 20}px;height:${alto - 14}px;background:#dfe3f0;border-left:5px solid #6b74b8;padding:8px;box-sizing:border-box;font-size:21px"><b>${t}</b><br><span style="color:#444">${o}</span></div>`).join('');
  return `<html><body style="margin:0;background:#fff;font-family:'DejaVu Sans',sans-serif;width:1520px;height:1180px;position:relative">
    <div style="position:absolute;left:520px;top:8px;font-size:24px">${ini.getDate()}–${fin.getDate()} de ${MES[fin.getMonth()][0].toUpperCase() + MES[fin.getMonth()].slice(1)} de ${fin.getFullYear()}</div>${cols}${etiq}${lineas}${ev}</body></html>`;
}
const CUADERNO = 'Junta con el equipo de soporte\nRevisar tiempos de respuesta del mes\nPedir dos licencias de Power BI\nEnviar minuta antes del viernes';
const htmlCuaderno = (fuenteUrl, tam, giro) => `<html><body style="margin:0;background:#ebe7dc;width:1100px;height:760px;overflow:hidden">
  <style>@font-face{font-family:Mano;src:url(${fuenteUrl})}</style>
  <div style="position:absolute;inset:30px;background:repeating-linear-gradient(#fbfaf5 0 51px,#a9c4e8 51px 53px);transform:rotate(${giro}deg);box-shadow:inset 0 -120px 160px rgba(0,0,0,.18);
    font-family:Mano;font-size:${tam}px;line-height:53px;color:#1f2f6b;padding:60px 70px;white-space:pre-line">${CUADERNO}</div></body></html>`;
const ATAQUE = `<html><body style="margin:0;background:#fff;font-family:'DejaVu Sans';font-size:30px;width:900px;padding:40px">
  <div style="font-size:34px;margin-bottom:20px">${dia(0).getDate()} ${MES[dia(0).getMonth()].slice(0, 3)} lunes</div>
  <div>10:00 &lt;img src=x onerror=window.__ocr=1&gt;</div><div style="font-size:24px">1 h Reunión de Microsoft Teams</div>
  <div style="margin-top:30px">11:00 &lt;script&gt;window.__ocr=2&lt;/script&gt; prueba</div></body></html>`;

const IMPRESO = 'Pendientes de la semana\nConciliar cuentas por pagar\nActualizar matriz de proveedores\nRevisar presupuesto del trimestre';
const htmlGirado = () => `<html><body style="margin:0;background:#fff;width:760px;height:1100px;position:relative;overflow:hidden">
  <div style="position:absolute;left:50%;top:50%;width:1000px;transform:translate(-50%,-50%) rotate(90deg);font-family:'DejaVu Sans';font-size:40px;line-height:70px;white-space:pre-line;color:#111">${IMPRESO}</div></body></html>`;
const htmlOscuro = () => `<html><body style="margin:0;background:#1d1f24;width:900px;height:620px;font-family:'DejaVu Sans';color:#e6e6e6;padding:40px;box-sizing:border-box">
  <div style="font-size:34px;margin-bottom:24px">Herramientas del equipo</div>${['Planeación: tablero mensual de avance', 'Reportes: indicadores de inversión', 'Compras: órdenes asociadas a proyectos', 'Finanzas: matriz de erogaciones'].map(t => `<div style="font-size:27px;padding:14px 0;border-bottom:1px solid #444">${t}</div>`).join('')}</body></html>`;

(async () => {
  const b = await chromium.launch(); const R = {}; const t0 = Date.now();
  const foto = async (nombre, html, ancho, alto) => { const p = await b.newPage({ viewport: { width: ancho, height: alto } }); await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150); const f = path.join(tmp, nombre); await p.screenshot({ path: f }); await p.close(); return f; };
  const fCel = await foto('celular.png', htmlCelular(), 800, 1300), fPc = await foto('computadora.png', htmlComputadora(), 1520, 1180);
  const fMolde = await foto('cuaderno-molde.png', htmlCuaderno(fuente('caveat-latin-400-normal.woff2'), 46, -1.2), 1100, 760);
  const fCursiva = await foto('cuaderno-cursiva.png', htmlCuaderno(fuente('homemade-apple-latin-400-normal.woff2'), 30, 0.8), 1100, 760);
  const fAtaque = await foto('ataque.png', ATAQUE, 900, 400);
  const fGirado = await foto('girado.png', htmlGirado(), 760, 1100), fOscuro = await foto('oscuro.png', htmlOscuro(), 900, 620);

  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage();
  const externas = [], errores = []; p.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) externas.push(r.url()); }); p.on('pageerror', e => errores.push(e.message));
  await p.goto(APP); await p.waitForSelector('.cab');
  R.disponible = await p.evaluate(() => Ocr.disponible());

  // --- 1. Agenda por foto: celular y computadora ---
  const leerAgenda = async archivos => {
    await p.evaluate(() => { Modal.cerrar(); location.hash = '#/agenda'; App.ruta(); Foto.abrir(); });
    await p.setInputFiles('#ftFotos', archivos); await p.click('#ftLeer');
    await p.waitForFunction(() => /Revisar y corregir/.test((document.querySelector('#modal h2') || {}).textContent || '') || /No se reconocieron/.test((document.querySelector('#ftProg') || {}).textContent || '') || document.querySelector('.aviso.err'), null, { timeout: 180000 });
    return p.evaluate(() => { const v = (k, i) => (document.querySelector(`#fb_${k}_${i}`) || {}).value, r = []; for (let i = 0; i < Foto._n; i++) r.push({ fecha: v('fecha', i), ini: v('ini', i), fin: v('fin', i), titulo: v('titulo', i), lugar: v('lugar', i), ok: document.querySelector('#fb_ok_' + i).checked }); return r; });
  };
  const comparar = (leidos, esperados) => esperados.map(e => { const m = leidos.filter(x => x.fecha === e.fecha && x.ini === e.ini).sort((a, b) => similitud(b.titulo, e.titulo) - similitud(a.titulo, e.titulo))[0]; return { esperado: `${e.fecha} ${e.ini} ${e.titulo}`, leido: m ? `${m.titulo}${m.fin ? ' (fin ' + m.fin + ')' : ''}` : '— no encontrado —', ok: !!m && similitud(m.titulo, e.titulo) >= 0.8 && (!e.fin || m.fin === e.fin) }; });
  let s = Date.now(); const cel = await leerAgenda([fCel]); R.celular_seg = (Date.now() - s) / 1000;
  const durMin = t => /min/.test(t) ? +t.match(/\d+/)[0] : +t.match(/\d+/)[0] * 60, fin = (h, d) => { const m = +h.slice(0, 2) * 60 + +h.slice(3) + durMin(d); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  R.celular = comparar(cel, AGENDA_CEL.map(([d, h, du, t]) => ({ fecha: iso(dia(d)), ini: h, fin: fin(h, du), titulo: t })));
  R.celular_lugar_sala = cel.some(x => /Sala 3/.test(x.lugar) && /Teams/.test(x.lugar));
  s = Date.now(); const pc = await leerAgenda([fPc]); R.computadora_seg = (Date.now() - s) / 1000;
  R.computadora = comparar(pc, AGENDA_PC.map(([c, h, t]) => ({ fecha: iso(dia(c)), ini: `${String(h).padStart(2, '0')}:00`, titulo: t })));
  R.computadora_extra = pc.filter(x => x.ok && !AGENDA_PC.some(([c, h, t]) => x.fecha === iso(dia(c)) && similitud(x.titulo, t) >= 0.8)).map(x => x.titulo);
  // guardar el borrador del celular corrigiendo un título (la plataforma aprende la corrección) y comprobar que no se duplica al leerla otra vez
  await leerAgenda([fCel]);
  await p.evaluate(() => { for (let i = 0; i < Foto._n; i++) { const c = document.querySelector('#fb_titulo_' + i); if (/Llamada con proveedor/.test(c.value)) c.value = c.value.replace('proveedor', 'proveedores'); } });
  await p.click('#modal .btn.pri'); await p.waitForTimeout(200);
  R.aprendio_de_agenda = await p.evaluate(() => S.correcciones.some(c => /proveedor$/i.test(c.mal) && c.bien === 'proveedores'));
  R.guardados = await p.evaluate(() => S.eventos.filter(e => e.origen === 'foto').length);
  const otraVez = await leerAgenda([fCel]); R.segunda_lectura_marcados = otraVez.filter(x => x.ok).length;
  R.correccion_aplicada_en_agenda = otraVez.some(x => x.titulo === 'Llamada con proveedores');

  // --- 2. Seguridad: texto malicioso dentro de la imagen ---
  await p.evaluate(() => { window.__ocr = 0; }); const at = await leerAgenda([fAtaque]);
  if (at.length) { await p.evaluate(() => document.querySelectorAll('[id^=fb_ok_]').forEach(c => { c.checked = true; })); await p.click('#modal .btn.pri'); await p.waitForTimeout(200); await p.evaluate(() => { location.hash = '#/agenda'; UI.ag.modo = 'eventos'; App.ruta(); }); await p.waitForTimeout(200); }
  R.ataque = { eventosLeidos: at.length, ejecutoCodigo: await p.evaluate(() => window.__ocr) };

  // --- 3. Notas desde foto de cuaderno ---
  const nota = async archivo => {
    await p.evaluate(() => { Modal.cerrar(); UI.notas.f = 'todas'; location.hash = '#/notas'; App.ruta(); Notas.desdeFoto(); });
    await p.setInputFiles('#ntFoto', archivo);
    const s0 = Date.now(); await p.click('#ntLeer'); await p.waitForFunction(() => !document.querySelector('#modal').classList.contains('on'), null, { timeout: 180000 });
    return p.evaluate(s0 => { const n = Notas.actual(); return { seg: (Date.now() - s0) / 1000, titulo: n.titulo, texto: n.texto, foto: !!(n.img && Img.url(n.img)) }; }, s0);
  };
  const molde = await nota(fMolde), cursiva = await nota(fCursiva), girada = await nota(fGirado), oscura = await nota(fOscuro);
  R.nota_molde = { seg: molde.seg, similitud: +similitud(molde.texto, CUADERNO).toFixed(2), fotoGuardada: molde.foto, texto: molde.texto };
  R.nota_girada_auto = { similitud: +similitud(girada.texto, IMPRESO).toFixed(2), seg: girada.seg };
  R.nota_fondo_oscuro = { similitud: +similitud(oscura.texto, 'Herramientas del equipo Planeación: tablero mensual de avance Reportes: indicadores de inversión Compras: órdenes asociadas a proyectos Finanzas: matriz de erogaciones').toFixed(2) };
  // aprender de las correcciones de una nota
  R.aprender_nota = await p.evaluate(() => { const n = Notas.actual(); n.texto = n.texto.replace(/inversión/i, 'inversiones'); Notas.aprender(); return S.correcciones.some(c => /inversi[oó]n/i.test(c.mal) && c.bien === 'inversiones'); });
  R.nota_cursiva = { similitud: +similitud(cursiva.texto, CUADERNO).toFixed(2), texto: cursiva.texto.slice(0, 160) };
  // privada: sólo texto
  R.nota_privada = await p.evaluate(async () => { await Boveda.crear('clave-prueba-123'); UI.notas.f = 'priv'; App.pintar(); return true; });
  await p.evaluate(() => Notas.desdeFoto()); R.nota_privada_sin_casilla_foto = await p.evaluate(() => !document.querySelector('#ntGuardar'));
  await p.setInputFiles('#ntFoto', fMolde); await p.click('#ntLeer'); await p.waitForFunction(() => !document.querySelector('#modal').classList.contains('on'), null, { timeout: 180000 });
  R.nota_privada_cifrada = await p.evaluate(() => S.notasPriv.length === 1 && !JSON.stringify(S.notasPriv).includes('licencias') && /licencias/i.test(Boveda.notas[0].texto) && !Boveda.notas[0].img);
  R.externas = externas; R.errores = errores; R.total_seg = (Date.now() - t0) / 1000;
  console.log(JSON.stringify(R, null, 1));
  const fallas = [!R.disponible && 'lector no disponible', ...R.celular.filter(x => !x.ok).map(x => 'celular: ' + x.esperado), ...R.computadora.filter(x => !x.ok).map(x => 'computadora: ' + x.esperado),
    R.segunda_lectura_marcados && 'la segunda lectura volvió a marcar eventos ya guardados',
    !R.aprendio_de_agenda && 'no aprendió la corrección hecha en el borrador de agenda', !R.correccion_aplicada_en_agenda && 'no aplicó la corrección aprendida en la siguiente lectura',
    R.nota_girada_auto.similitud < 0.9 && 'nota girada: la orientación automática falló', R.nota_fondo_oscuro.similitud < 0.85 && 'nota con fondo oscuro por debajo de 0.85', !R.aprender_nota && 'no aprendió la corrección de la nota', R.ataque.ejecutoCodigo && 'el texto de la imagen ejecutó código', R.nota_molde.similitud < 0.8 && 'nota de letra de molde por debajo de 0.8', !R.nota_molde.fotoGuardada && 'la foto no se guardó con la nota',
    !R.nota_privada_cifrada && 'la nota privada no quedó cifrada', externas.length && 'hubo conexiones externas', errores.length && 'errores en la página'].filter(Boolean);
  console.log(fallas.length ? '\nRESULTADO: FALLA\n - ' + fallas.join('\n - ') : '\nRESULTADO: CORRECTO');
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(fallas.length ? 1 : 0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
