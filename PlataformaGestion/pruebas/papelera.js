// Pruebas de la papelera de reciclaje (7 días). Requiere Node.js y Playwright con Chromium.
// Uso:  node pruebas/papelera.js
const { chromium } = require('playwright'); const path = require('path');
const APP = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } }), p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  const inicio = new Date(2026, 10, 16, 9, 0); await p.clock.install({ time: inicio });
  await p.goto(APP); await p.waitForSelector('.cab');
  await p.evaluate(() => Datos.demo()); await p.click('#confirma .btn.peligro'); await p.waitForFunction(() => S.frases.length >= 3 && Img.blobs.size >= 1);
  const R = {};
  // 1. Proyecto con bitácora, actividades, notas y eventos ligados
  R.proyecto = await p.evaluate(() => {
    const pr = S.proyectos.find(x => S.bitacora.some(b => b.proyecto === x.id)), id = pr.id;
    S.eventos[0].proyecto = id; const antes = { bit: S.bitacora.filter(b => b.proyecto === id).length, act: S.actividades.filter(a => a.proyecto === id).length, notas: S.notas.filter(n => n.proyecto === id).length };
    Papelera.mover('proyectos', id, { rel: [{ lista: 'bitacora', filtro: b => b.proyecto === id }], des: [{ lista: 'actividades', campo: 'proyecto' }, { lista: 'notas', campo: 'proyecto' }, { lista: 'eventos', campo: 'proyecto' }] });
    const fuera = { existe: !!por('proyectos', id), bit: S.bitacora.filter(b => b.proyecto === id).length, act: S.actividades.filter(a => a.proyecto === id).length, enPapelera: S.papelera.length };
    const e = S.papelera[0], er = Papelera.restaurar(e.id);
    const vuelta = { error: er, existe: !!por('proyectos', id), bit: S.bitacora.filter(b => b.proyecto === id).length, act: S.actividades.filter(a => a.proyecto === id).length, notas: S.notas.filter(n => n.proyecto === id).length, evento: S.eventos[0].proyecto === id, enPapelera: S.papelera.length };
    return { antes, fuera, vuelta, ok: vuelta.existe && vuelta.bit === antes.bit && vuelta.act === antes.act && vuelta.notas === antes.notas && vuelta.evento && !fuera.existe && fuera.bit === 0 && fuera.act === 0 && vuelta.enPapelera === 0 };
  });
  // 2. Materia con actividades escolares; restaurar una actividad antes que su materia
  R.materia = await p.evaluate(() => {
    const m = S.materias[0], n = S.escolares.filter(e => e.materia === m.id).length, una = S.escolares.find(e => e.materia === m.id);
    Papelera.mover('escolares', una.id); Papelera.mover('materias', m.id, { rel: [{ lista: 'escolares', filtro: e => e.materia === m.id }] });
    const errAntes = Papelera.restaurar(S.papelera.find(e => e.lista === 'escolares').id);
    const er = Papelera.restaurar(S.papelera.find(e => e.lista === 'materias').id), er2 = Papelera.restaurar(S.papelera.find(e => e.lista === 'escolares').id);
    return { bloqueaSinMateria: /materia/.test(errAntes), errores: [er, er2], recuperadas: S.escolares.filter(e => e.materia === m.id).length === n };
  });
  // 3. Acceso directo dentro de un grupo
  R.enlace = await p.evaluate(() => { const g = S.grupos[0], id = g.ids[0]; Papelera.mover('enlaces', id); const fuera = !g.ids.includes(id); Papelera.restaurar(S.papelera.find(e => e.lista === 'enlaces').id); return fuera && S.grupos[0].ids.includes(id) && !!por('enlaces', id); });
  // 4. Carpeta y clasificación: se desligan y se vuelven a ligar
  R.carpeta = await p.evaluate(() => { const c = S.carpetas[0], n = S.enlaces.filter(l => l.carpeta === c.id).length; Papelera.mover('carpetas', c.id, { des: [{ lista: 'enlaces', campo: 'carpeta' }] }); const sin = S.enlaces.filter(l => l.carpeta === c.id).length; Papelera.restaurar(S.papelera.find(e => e.lista === 'carpetas').id); return n > 0 && sin === 0 && S.enlaces.filter(l => l.carpeta === c.id).length === n; });
  // 5. Eliminación desde la pantalla (formulario y selección múltiple de eventos)
  await p.evaluate(() => { location.hash = '#/actividades'; App.ruta(); Act.editar(S.actividades[0].id); }); const titulo = await p.inputValue('#f_titulo');
  await p.click('#modal .btn.peligro'); await p.click('#confirma .btn.peligro'); await p.waitForTimeout(200);
  R.desdeFormulario = await p.evaluate(t => S.papelera.some(e => e.lista === 'actividades' && e.titulo === t) && !S.actividades.some(a => a.titulo === t), titulo);
  R.eventosMultiples = await p.evaluate(() => { UI.ag.sel = new Set(S.eventos.slice(0, 3).map(e => e.id)); Agenda.borrarSel(); cerrarConfirma(true); return S.papelera.filter(e => e.lista === 'eventos').length === 3; });
  // 6. Imágenes: la frase con imagen se conserva en la papelera y se borra al vaciar
  R.imagenes = await p.evaluate(async () => {
    const f = S.frases.find(x => x.img), img = f.img; quitar('frases', f.id); const sigue = Img.blobs.has(img);
    const e = S.papelera.find(x => x.lista === 'frases'); await Papelera.borrar([e.id]); return { siguiaEnPapelera: sigue, borradaAlVaciar: !Img.blobs.has(img) };
  });
  // 7. Foto de una nota: se quita, se restaura a su nota
  R.fotoNota = await p.evaluate(async () => { const b = await new Promise(r => { const c = document.createElement('canvas'); c.width = c.height = 20; c.toBlob(r, 'image/png'); }); const img = await Img.agregar(new File([b], 'x.png', { type: 'image/png' })); const n = S.notas[0]; n.img = img; Papelera.moverFoto(n.id); const quitada = !n.img && Img.blobs.has(img); Papelera.restaurar(S.papelera.find(e => e.lista === 'fotoNota').id); return quitada && n.img === img; });
  // 8. Nota privada
  R.privada = await p.evaluate(async () => { await Boveda.crear('clave-prueba-123'); const id = uid(); await Boveda.guardarNota({ id, titulo: 'Secreta', texto: 'texto secreto', creado: '', actualizado: '' }); Boveda.quitarNota(id); const fuera = !S.notasPriv.some(x => x.id === id) && !Boveda.notas.some(x => x.id === id); const e = S.papelera.find(x => x.lista === 'notasPriv'); const cifrada = !JSON.stringify(e).includes('texto secreto'); Papelera.restaurar(e.id); await new Promise(r => setTimeout(r, 300)); return fuera && cifrada && S.notasPriv.some(x => x.id === id) && Boveda.notas.some(x => x.id === id && x.texto === 'texto secreto'); });
  // 9. Respaldo y restauración conservan la papelera
  R.respaldo = await p.evaluate(() => { const n = S.papelera.length, r = fusionar(JSON.parse(JSON.stringify(S))); return n > 0 && r.papelera.length === n; });
  // 10. Pantalla
  await p.evaluate(() => { location.hash = '#/papelera'; App.ruta(); }); await p.waitForTimeout(150);
  R.pantalla = await p.evaluate(() => ({ filas: document.querySelectorAll('.lista tbody tr').length, menu: document.querySelector('.lat nav a[href="#/papelera"] .n')?.textContent }));
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'nova-papelera.png') });
  // 11. Plazo de 7 días: a los 6 días sigue; pasado el día 7 se borra solo al abrir
  const enPapelera = await p.evaluate(() => S.papelera.length); await p.waitForTimeout(400);
  await p.clock.setFixedTime(new Date(inicio.getTime() + 6 * 864e5)); await p.reload(); await p.waitForSelector('.cab'); await p.waitForTimeout(400);
  R.dia6 = await p.evaluate(n => S.papelera.length === n && S.papelera.every(e => Papelera.dias(e) === 1), enPapelera);
  await p.clock.setFixedTime(new Date(inicio.getTime() + 7 * 864e5 + 60000)); await p.reload(); await p.waitForSelector('.cab'); await p.waitForTimeout(600);
  R.dia7 = await p.evaluate(() => S.papelera.length === 0);
  R.errores = errores;
  console.log(JSON.stringify(R, null, 1));
  const ok = R.proyecto.ok && R.materia.bloqueaSinMateria && !R.materia.errores.some(Boolean) && R.materia.recuperadas && R.enlace && R.carpeta && R.desdeFormulario && R.eventosMultiples && R.imagenes.siguiaEnPapelera && R.imagenes.borradaAlVaciar && R.fotoNota && R.privada && R.respaldo && R.pantalla.filas > 0 && R.dia6 && R.dia7 && !errores.length;
  console.log(ok ? '\nRESULTADO: CORRECTO' : '\nRESULTADO: FALLA'); await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
