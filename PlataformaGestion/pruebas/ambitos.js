// Pruebas de los ámbitos: filtro global en todas las pantallas, Trabajo por omisión y ámbitos creados sólo en Ajustes.
// Requiere Node.js y Playwright con Chromium.   Uso:  node pruebas/ambitos.js
const { chromium } = require('playwright'); const path = require('path');
const APP = 'file://' + path.resolve(__dirname, '..', 'PlataformaGestion.html');
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date(2026, 10, 17, 9, 0) });
  await p.goto(APP); await p.waitForSelector('.cab');
  // Un registro de cada ámbito en cada lista (hoy), creado como lo haría el usuario
  await p.evaluate(() => {
    const hoy = hoyISO(), P = { id: uid(), nombre: 'Proyecto personal', ambito: 'Personal', estatus: idInicial(), prioridad: '3' }; S.proyectos.push(P);
    const W = { id: uid(), nombre: 'Proyecto de trabajo', ambito: 'Trabajo', estatus: idInicial(), prioridad: '3' }; S.proyectos.push(W);
    const act = (titulo, extra) => S.actividades.push({ id: uid(), titulo, estatus: idInicial(), prioridad: '3', limite: hoy, proyecto: '', categoria: '', ambito: '', ...extra });
    act('Act área', {}); act('Act del proyecto personal', { proyecto: P.id }); act('Act escuela', { ambito: 'Escuela' }); act('Act otro', { ambito: 'Otro' });
    const ev = (titulo, extra) => S.eventos.push({ id: uid(), titulo, fecha: hoy, horaIni: '10:00', horaFin: '11:00', tipo: 'Reunión', proyecto: '', ambito: '', ...extra });
    ev('Ev reunión', {}); ev('Ev clase', { tipo: 'Clase' }); ev('Ev personal', { ambito: 'Personal' }); ev('Ev otro', { ambito: 'Otro' });
    const rec = (texto, ambito) => S.recordatorios.push({ id: uid(), texto, fecha: hoy, hora: '12:00', repetir: '', hecho: false, ambito });
    rec('Rec trabajo', 'Trabajo'); rec('Rec sin ámbito', '');
    S.notas.push({ id: uid(), titulo: 'Nota personal', texto: '', proyecto: P.id, ambito: '', creado: ahoraTxt(), actualizado: ahoraTxt() }, { id: uid(), titulo: 'Nota escuela', texto: '', proyecto: '', ambito: 'Escuela', creado: ahoraTxt(), actualizado: ahoraTxt() });
    S.enlaces.push({ id: uid(), nombre: 'Acceso trabajo', url: 'https://example.com/t', ambito: 'Trabajo', fav: true, carpeta: '' }, { id: uid(), nombre: 'Acceso sin ámbito', url: 'https://example.com/o', ambito: '', fav: true, carpeta: '' });
    S.noticias.push({ id: uid(), titulo: 'Noticia trabajo', tema: 'Power Platform', tipo: 'noticia', relevancia: 'alta', fecha: ahoraTxt(), ambito: 'Trabajo', leida: false, puntos: '', fuentes: '', resumen: '' }, { id: uid(), titulo: 'Noticia otro', tema: 'IA', tipo: 'noticia', relevancia: 'media', fecha: ahoraTxt(), ambito: '', leida: false, puntos: '', fuentes: '', resumen: '' });
    guardar();
  });
  const textos = () => p.evaluate(() => document.querySelector('#pral').innerText);
  const ver = async (vista, amb) => { await p.evaluate(([v, a]) => { Amb.set(a); location.hash = '#/' + v; App.ruta(); }, [vista, amb]); await p.waitForTimeout(80); return textos(); };
  const tiene = (t, ...xs) => xs.every(x => t.includes(x)), notiene = (t, ...xs) => xs.every(x => !t.includes(x));
  const R = {};
  let t = await ver('agenda', 'Escuela'); R.agendaEscuela = tiene(t, 'Ev clase', 'Act escuela') && notiene(t, 'Ev reunión', 'Ev personal', 'Rec trabajo', 'Act área');
  t = await ver('agenda', 'Personal'); R.agendaPersonal = tiene(t, 'Ev personal', 'Act del proyecto personal') && notiene(t, 'Ev clase', 'Ev reunión', 'Act área');
  t = await ver('agenda', 'Otro'); R.agendaOtro = tiene(t, 'Ev otro', 'Act otro') && notiene(t, 'Ev clase', 'Rec trabajo', 'Rec sin ámbito');
  t = await ver('agenda', 'Trabajo'); R.sinAmbitoEsTrabajo = tiene(t, 'Ev reunión', 'Act área', 'Rec trabajo', 'Rec sin ámbito') && notiene(t, 'Ev clase', 'Ev otro');
  t = await ver('agenda', ''); R.agendaTodo = tiene(t, 'Ev reunión', 'Ev clase', 'Ev personal', 'Ev otro');
  await p.evaluate(() => { UI.ag.modo = 'eventos'; }); t = await ver('agenda', 'Trabajo'); R.agendaEventosTrabajo = tiene(t, 'Ev reunión') && notiene(t, 'Ev clase', 'Ev personal', 'Ev otro'); await p.evaluate(() => { UI.ag.modo = 'mes'; });
  t = await ver('actividades', 'Trabajo'); R.actividades = tiene(t, 'Act área') && notiene(t, 'Act escuela', 'Act otro', 'Act del proyecto personal');
  t = await ver('proyectos', 'Personal'); R.proyectos = tiene(t, 'Proyecto personal') && notiene(t, 'Proyecto de trabajo');
  t = await ver('recordatorios', 'Trabajo'); R.recordatorios = tiene(t, 'Rec trabajo', 'Rec sin ámbito');
  t = await ver('notas', 'Escuela'); R.notas = tiene(t, 'Nota escuela') && notiene(t, 'Nota personal');
  t = await ver('accesos', 'Personal'); R.accesos = notiene(t, 'Acceso trabajo', 'Acceso sin ámbito'); t = await ver('accesos', 'Trabajo'); R.accesos = R.accesos && tiene(t, 'Acceso trabajo', 'Acceso sin ámbito');
  await p.evaluate(() => { UI.not.f = 'todas'; }); t = await ver('noticias', 'Escuela'); R.noticias = notiene(t, 'Noticia trabajo', 'Noticia otro'); t = await ver('noticias', 'Trabajo'); R.noticias = R.noticias && tiene(t, 'Noticia trabajo', 'Noticia otro');
  t = await ver('inicio', 'Escuela'); R.inicio = tiene(t, 'Act escuela', 'Ev clase') && notiene(t, 'Noticia trabajo', 'Acceso trabajo', 'Act área', 'Rec trabajo');
  // El filtro es global y se recuerda al recargar
  await p.evaluate(() => Amb.set('Personal')); await p.waitForTimeout(1500); await p.reload(); await p.waitForSelector('.cab');
  R.recuerda = await p.evaluate(() => Amb.f() === 'Personal' && document.querySelector('.fil.amb button.on').textContent === 'Personal');
  // Formularios: campo Ámbito con Trabajo por omisión (aunque el filtro esté en otro ámbito) y sin texto libre para crear
  R.formulario = await p.evaluate(() => { Amb.set('Escuela'); const r = [];
    for (const abrir of [() => Rec.editar(), () => Act.nueva(), () => Agenda.evento(), () => Acc.editar(), () => Proy.nuevo()]) { abrir(); const c = document.querySelector('#f_ambito'); r.push(c && c.tagName === 'SELECT' ? c.value : 'X'); Modal.cerrar(); }
    Amb.set(''); return r.every(v => v === 'Trabajo'); });
  R.altaRapida = await p.evaluate(() => { Act.rapida('Rápida sin proyecto'); return S.actividades.find(a => a.titulo === 'Rápida sin proyecto').ambito === 'Trabajo'; });
  // Ámbito nuevo: sólo desde Ajustes → Catálogos; aparece en la barra y en los formularios; renombrar y eliminar
  await p.evaluate(() => { UI.aj.tab = 'catalogos'; location.hash = '#/ajustes'; App.ruta(); });
  await p.click('.blq h3:has-text("Ámbitos") >> text=+ Agregar'); await p.fill('#f_nombre', 'Familia'); await p.click('#modal .btn.pri');
  R.creado = await p.evaluate(() => { const a = ambitos().includes('Familia'); location.hash = '#/agenda'; App.ruta(); const enBarra = [...document.querySelectorAll('.fil.amb button')].some(b => b.textContent === 'Familia');
    Rec.editar(); const enForm = [...document.querySelectorAll('#f_ambito option')].some(o => o.value === 'Familia'); Modal.cerrar(); return a && enBarra && enForm; });
  R.validaNombre = await p.evaluate(() => { Aj.ambito(); document.querySelector('#f_nombre').value = '<b>x</b>'; document.querySelector('#modal .btn.pri').click(); const malo = !ambitos().includes('<b>x</b>') && document.querySelector('#modal.on');
    document.querySelector('#f_nombre').value = 'trabajo'; document.querySelector('#modal .btn.pri').click(); const dup = ambitos().filter(a => norm(a) === 'trabajo').length === 1; Modal.cerrar(); return !!malo && dup; });
  R.renombrar = await p.evaluate(() => { const r = S.recordatorios.find(x => x.texto === 'Rec trabajo'); r.ambito = 'Familia'; Amb.set('Familia'); const a = S.ambitos.find(x => x.nombre === 'Familia');
    Aj.ambito(a.id); document.querySelector('#f_nombre').value = 'Hogar'; document.querySelector('#modal .btn.pri').click(); return r.ambito === 'Hogar' && Amb.f() === 'Hogar' && ambitos().includes('Hogar') && !ambitos().includes('Familia'); });
  R.eliminar = await p.evaluate(() => { const a = S.ambitos.find(x => x.nombre === 'Hogar'), r = S.recordatorios.find(x => x.texto === 'Rec trabajo'); Aj.ambito(a.id); document.querySelector('#modal .btn.peligro').click();
    const c = document.querySelector('#confirma.on .btn.peligro'); if (c) c.click();
    const fuera = !ambitos().includes('Hogar') && Amb.de('recordatorios', r) === 'Trabajo' && Amb.f() === '' && S.papelera.some(e => e.lista === 'ambitos');
    Papelera.restaurar(S.papelera.find(e => e.lista === 'ambitos').id); return fuera && Amb.de('recordatorios', r) === 'Hogar'; });
  R.cargaNoCrea = await p.evaluate(() => { const n = S.ambitos.length; const x = Datos.leer_notas(parseCSV('Titulo,Texto,Ambito\nNota CSV inventado,t,Inventado\nNota CSV sin,t,\n')); x.aplicar();
    return S.ambitos.length === n && S.notas.find(y => y.titulo === 'Nota CSV inventado').ambito === '' && Amb.de('notas', S.notas.find(y => y.titulo === 'Nota CSV sin')) === 'Trabajo'; });
  R.maximo12 = await p.evaluate(() => { for (let i = 0; S.ambitos.length < 12; i++) S.ambitos.push({ id: uid(), nombre: 'Extra ' + i }); Aj.ambito(); const abierto = !!document.querySelector('#modal.on #f_nombre'); Modal.cerrar(); return !abierto && sanear({ ambitos: Array.from({ length: 20 }, (_, i) => ({ id: 'a' + i, nombre: 'A' + i })) }).ambitos.length === 12; });
  // Carga masiva y exportación con columna Ambito; valores inválidos se descartan
  R.carga = await p.evaluate(() => { const x = Datos.leer_recordatorios(parseCSV('Recordatorio,Fecha,Ambito\nDesde CSV,17/11/2026,Personal\nCon ámbito malo,17/11/2026,<b>x</b>\n')); x.aplicar();
    const a = S.recordatorios.find(r => r.texto === 'Desde CSV'), b = S.recordatorios.find(r => r.texto === 'Con ámbito malo'); const t = Datos.tablas().find(y => y.nombre === 'recordatorios.csv');
    return a.ambito === 'Personal' && b.ambito === '' && t.enc.includes('Ambito') && t.filas.every(f => ambitos().includes(f[f.length - 1])); });
  R.saneo = await p.evaluate(() => { const r = sanear({ notas: [{ id: 'n1', titulo: 'x', ambito: '"><img src=x onerror=alert(1)>' }], proyectos: [{ id: 'p1', nombre: 'y', ambito: 'Otro' }] }); return r.notas[0].ambito === '' && r.proyectos[0].ambito === 'Otro' && sanear({ ambitos: [{ id: 'x', nombre: 'Trabajo' }, { id: 'y', nombre: '"><img src=x>' }, { id: 'z', nombre: 'Familia' }, { id: 'w', nombre: 'familia' }] }).ambitos.map(a => a.nombre).join() === 'Familia'; });
  R.errores = errs;
  R.TODO_OK = Object.entries(R).every(([k, v]) => k === 'errores' ? !v.length : v === true);
  console.log(JSON.stringify(R, null, 1)); console.log(R.TODO_OK ? '\nRESULTADO: CORRECTO' : '\nRESULTADO: CON FALLAS'); await b.close(); process.exit(R.TODO_OK ? 0 : 1);
})();
