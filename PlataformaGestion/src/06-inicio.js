'use strict';
/* ==========================================================================
   DATOS DE EJEMPLO + ARRANQUE
   ========================================================================== */

/** Genera una imagen de degradado (para que las frases de ejemplo tengan imagen). */
async function imagenDegradado(c1, c2) {
  const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 420; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1400, 420); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, 1400, 420);
  x.globalAlpha = 0.12; x.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(200 + i * 190, 420, 120 + i * 26, 0, Math.PI * 2); x.fill(); }
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
  return Img.agregar(new File([blob], 'frase.jpg', { type: 'image/jpeg' }));
}

Datos.demo = function () {
  confirmar('Se agregarán datos de ejemplo (proyectos, actividades, materias, agenda, accesos, etc.) a lo que ya tengas. ¿Continuar?', async () => {
    const h = hoyISO(), d = n => sumaDias(h, n), E = Object.fromEntries(S.estatus.map(e => [e.id, e.id])), fin = idFinal(), ini = idInicial();
    const curso = E.curso || ini, rev = E.rev || ini, cat = i => (S.categorias[i] || {}).id || '';
    const P = (nombre, ambito, estatus, asignadoPor, i, o, descripcion, prioridad = '3') => { const p = { id: uid(), creado: h, nombre, ambito, estatus, asignadoPor, inicio: d(i), objetivo: d(o), descripcion, prioridad }; S.proyectos.push(p); return p.id; };
    const p1 = P('App Mi Comunidad Los Robles', 'Trabajo', rev, 'Comité de administración', -70, 33, 'Administración residencial: residentes, avisos, tesorería, caja chica y estados de cuenta.', '2');
    const p2 = P('Dashboard de indicadores Power BI', 'Trabajo', curso, 'Gerencia de operaciones', -30, 12, 'Tablero mensual con rotación de inventario y cumplimiento.', '2');
    const p3 = P('Flujo de aprobación de compras', 'Trabajo', fin, 'Jefatura de compras', -90, -8, 'Power Automate con aprobaciones por monto.');
    const p4 = P('Portafolio personal en Azure', 'Personal', ini, '', 5, 40, 'Publicar mis proyectos web.', '4');
    const A = (titulo, proyecto, categoria, estatus, limite, prioridad = '3', horas = null, checklist = '', hora = '') => S.actividades.push({ id: uid(), creado: h, titulo, proyecto, categoria, estatus, prioridad, inicio: '', limite: limite == null ? '' : d(limite), hora, horas, detalle: '', checklist, completada: estFinal(estatus) ? h : '' });
    A('Revisar consultas SQL de tesorería', p1, '', curso, 0, '1', 2, '[x] Índice en movimientos\n[ ] Probar con 500 residentes\n[ ] Validar saldos');
    A('Filtro por torre en residentes', p1, '', ini, 3, '2', 3); A('Exportar estado de cuenta a Excel', p1, '', ini, 6, '3', 2);
    A('Modelo de datos de tesorería', p1, '', fin, -12); A('Roles: admin, tesorero, residente', p1, '', fin, -6);
    A('Medidas DAX de rotación de inventario', p2, '', curso, 1, '2', 4); A('Validar cifras con contabilidad', p2, cat(3), ini, 4, '3', 1); A('Publicar en el área de trabajo', p2, '', ini, 10);
    A('Enviar minuta de la revisión semanal', '', cat(0), fin, 0); A('Reporte mensual de incidencias', '', cat(1), ini, 2, '2', 2, '', '12:00'); A('Atender solicitud de accesos de nuevo ingreso', '', cat(2), curso, -1, '1', 0.5);
    A('Actualizar inventario de equipos del área', '', cat(0), ini, 8, '4', 1.5); A('Preparar presentación para junta de área', '', cat(3), ini, 5, '2', 2);
    const B = (proyecto, dias, hora, tipo, texto) => S.bitacora.push({ id: uid(), proyecto, fecha: `${d(dias)} ${hora}`, tipo, texto, imgs: [] });
    B(p1, 0, '08:42', 'Avance', 'Se corrigió el cálculo del saldo en el estado de cuenta. La consulta de tesorería pasó de 4.2 s a 0.6 s al agregar un índice en movimiento(fecha, residente_id).');
    B(p1, -1, '18:15', 'Decisión', 'Se acordó separar caja chica de tesorería en tablas distintas, con catálogo de conceptos reutilizable.');
    B(p1, -3, '11:30', 'Revisión', 'Revisión con comité: pidieron filtro por torre y exportación a Excel del estado de cuenta. Se crearon 2 actividades.');
    B(p2, -2, '16:05', 'Avance', 'Modelo en estrella terminado; faltan medidas de rotación.');
    const N = (titulo, texto, proyecto = '', fijada = false, etiquetas = '') => S.notas.push({ id: uid(), titulo, texto, proyecto, fijada, etiquetas, creado: `${h} 09:00`, actualizado: `${h} 09:00` });
    N('Ideas para la junta de área', '- Proponer tablero único de pendientes\n- Revisar tiempos de respuesta de soporte\n- Pedir licencias de Power BI Pro', '', true, 'junta');
    N('Avisos por WhatsApp', 'Disparar un flujo de Power Automate cuando un aviso sea marcado como urgente. Evaluar costo de la API.', p1, false, 'idea');
    N('Pendiente de clasificar', 'Llamó proveedor de impresoras: enviar cotización antes del viernes.'); N('Paleta del portafolio', 'Azul #2563EB, gris pizarra y acentos teal.', p4);
    const Ev = (titulo, dias, a, b, tipo, proyecto = '', lugar = '') => S.eventos.push({ id: uid(), titulo, fecha: d(dias), horaIni: a, horaFin: b, tipo, proyecto, lugar, nota: '', origen: 'local' });
    Ev('Daily del equipo', 0, '08:30', '09:00', 'Reunión', '', 'Teams'); Ev('Revisión: App Mi Comunidad', 0, '10:00', '11:00', 'Revisión', p1, 'Teams'); Ev('1:1 con jefe directo', 0, '16:00', '16:30', 'Reunión', '', 'Teams');
    Ev('Daily del equipo', 1, '08:30', '09:00', 'Reunión', '', 'Teams'); Ev('Revisión: Dashboard Power BI', 2, '12:00', '13:00', 'Revisión', p2, 'Sala 2'); Ev('Junta de área', 5, '09:30', '11:00', 'Reunión'); Ev('Comida familiar', 4, '14:00', '16:00', 'Personal');
    S.recordatorios.push({ id: uid(), texto: 'Enviar reporte semanal', fecha: d(1), hora: '17:00', repetir: 'semanal', hecho: false, avisado: '' }, { id: uid(), texto: 'Respaldar la plataforma (.json)', fecha: d(3), hora: '09:00', repetir: 'mensual', hecho: false, avisado: '' }, { id: uid(), texto: 'Renovar licencia de software', fecha: d(-1), hora: '10:00', repetir: '', hecho: false, avisado: d(-1) });
    const f = n => deISO(d(n)); const C = (nombre, dias, anio, relacion, nota = '') => S.cumples.push({ id: uid(), nombre, dia: f(dias).getDate(), mes: f(dias).getMonth() + 1, anio, relacion, nota });
    C('Ana Ramírez', 0, 1996, 'Amigos', 'Libro de diseño UX'); C('Luis Mendoza', 4, 1992, 'Trabajo', 'Le gusta el café de especialidad'); C('Mamá', 21, null, 'Familia', 'Reservar comida'); C('Daniela Castro', 36, 2001, 'Escuela'); C('Ricardo Salas', 120, 1988, 'Trabajo');
    const M = (nombre, color, profesor) => { const m = { id: uid(), nombre, color, profesor, ciclo: '2026-B', meta: 80 }; S.materias.push(m); return m.id; };
    const m1 = M('Programación Web', '#0b84f3', 'Mtra. Laura Gómez'), m2 = M('Bases de Datos', '#7c3aed', 'Mtro. Jorge Pérez'), m3 = M('Diseño Gráfico para la Web', '#19c3c8', 'Mtra. Ana Torres');
    const X = (materia, titulo, tipo, valor, i, e, estatus = 'pendiente', calif = null) => S.escolares.push({ id: uid(), materia, titulo, tipo, valor, inicio: d(i), entrega: d(e), estatus, calif, comentario: '' });
    X(m1, 'Act. 1.1 El desarrollo web hoy', 'Buzón', 5, -40, -36, 'calificada', 5); X(m1, 'Act. 1.2 Elementos de una página', 'Buzón', 5, -35, -30, 'calificada', 4.5); X(m1, 'Integradora 1 Sitio HTML', 'Buzón', 15, -29, -20, 'calificada', 13);
    X(m1, 'Act. 2.1 Diseño con CSS', 'Foro', 5, -19, -14, 'calificada', 5); X(m1, 'Act. 2.2 Selectores CSS', 'Buzón', 5, -13, -7, 'enviada'); X(m1, 'Integradora 2 Maquetación', 'Buzón', 15, -6, 2, 'proceso');
    X(m1, 'Act. 3.1 JavaScript básico', 'Examen', 10, 3, 8); X(m1, 'Act. 3.2 Eventos y DOM', 'Buzón', 10, 9, 15); X(m1, 'Producto integrador', 'Proyecto', 30, 16, 30);
    X(m2, 'Act. 1 Modelo entidad-relación', 'Buzón', 10, -30, -22, 'calificada', 8); X(m2, 'Act. 2 Normalización', 'Buzón', 10, -21, -12, 'calificada', 6); X(m2, 'Foro: índices', 'Foro', 5, -11, -5, 'enviada');
    X(m2, 'Act. 3 Consultas SQL', 'Buzón', 15, -4, 2, 'guardada'); X(m2, 'Examen parcial', 'Examen', 25, 3, 9); X(m2, 'Act. 4 Procedimientos', 'Buzón', 10, 10, 16); X(m2, 'Proyecto final', 'Proyecto', 25, 17, 30);
    X(m3, 'Act. 1 Teoría del color', 'Buzón', 20, -25, -15, 'calificada', 19); X(m3, 'Act. 2 Tipografía web', 'Buzón', 20, -14, -3, 'enviada'); X(m3, 'Prototipo UI', 'Proyecto', 30, -2, 2, 'proceso'); X(m3, 'Periodo vacacional', 'Vacaciones', 0, 18, 24); X(m3, 'Portafolio final', 'Proyecto', 30, 6, 28);
    const K = (nombre, color) => { const c = { id: uid(), nombre, color }; S.carpetas.push(c); return c.id; };
    const k1 = K('Trabajo', '#2f5fd0'), k2 = K('Escuela', '#7c3aed'), k3 = K('Herramientas', '#0d9488'); const ids = [];
    const L = (nombre, url, carpeta, fav = false, tags = '', desc = '') => { const id = uid(); ids.push(id); S.enlaces.push({ id, nombre, url, carpeta, fav, tags, desc }); };
    L('Outlook', 'https://outlook.office.com', k1, true, 'correo'); L('Teams', 'https://teams.microsoft.com', k1, true, 'reuniones'); L('Power BI', 'https://app.powerbi.com', k1, true, 'reportes'); L('SharePoint', 'https://www.office.com/launch/sharepoint', k1, false, 'documentos');
    L('Power Automate', 'https://make.powerautomate.com', k3, false, 'flujos'); L('GitHub', 'https://github.com', k3, true, 'código'); L('Azure Portal', 'https://portal.azure.com', k3, false, 'nube'); L('UDG Virtual', 'https://www.udgvirtual.udg.mx', k2, true, 'clases', 'Plataforma de la licenciatura');
    S.grupos.push({ id: uid(), nombre: 'Inicio de jornada', ids: ids.slice(0, 3) });
    S.frases.push({ id: uid(), texto: 'Primero funcionalidad, después complejidad.', autor: '', img: null }, { id: uid(), texto: 'Lo que no se mide no se puede mejorar.', autor: 'Peter Drucker', img: null });
    try { S.frases.unshift({ id: uid(), texto: 'La disciplina es el puente entre las metas y los logros.', autor: 'Jim Rohn', img: await imagenDegradado('#073763', '#19c3c8') }); } catch (e) { /* sin imágenes */ }
    guardar(); App.pintar(); toast('Datos de ejemplo cargados');
  }, 'Cargar ejemplo');
};

async function iniciar() {
  await DB.abrir();
  try { await Img.cargar(); const e = await DB.leerEstado(); if (e) S = fusionar(e); await Sync.cargar(); }
  catch (err) { console.error(err); toast('No se pudieron leer los datos guardados: ' + err.message, 'err'); }
  // Filtros recordados de la sesión anterior
  try {   // sólo se aceptan claves conocidas y del mismo tipo (texto o casilla)
    const u = JSON.parse(localStorage.getItem('nova_ui') || 'null') || {};
    const copiar = (dest, org) => { for (const k of Object.keys(dest)) if (Object.hasOwn(org, k) && ['string', 'boolean'].includes(typeof dest[k]) && typeof org[k] === typeof dest[k] && String(org[k]).length <= 64 && /^[\w-]*$/.test(String(org[k]))) dest[k] = org[k]; };
    for (const k of Object.keys(UI)) if (UI[k] && typeof UI[k] === 'object' && u[k] && typeof u[k] === 'object') copiar(UI[k], u[k]);
    if (u.ag && u.ag.ver && typeof u.ag.ver === 'object') copiar(UI.ag.ver, u.ag.ver);
  } catch (e) { /* se ignora */ }
  if (UI.notas.f !== 'todas' && UI.notas.f !== 'sin' && !por('proyectos', UI.notas.f)) UI.notas.f = 'todas';
  const ico = document.createElement('link'); ico.rel = 'icon'; ico.href = 'data:image/svg+xml,' + encodeURIComponent(LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); document.head.appendChild(ico);
  aplicarTema();
  window.addEventListener('hashchange', () => App.ruta());
  $('#archivo').addEventListener('change', e => Datos.archivo(e.target));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#visor').classList.contains('on')) $('#visor').classList.remove('on'); else if ($('#confirma').classList.contains('on')) cerrarConfirma(); else Modal.cerrar(); }
    if (Boveda.abierta()) Boveda._temporizador();
  });
  document.addEventListener('click', () => { if (Boveda.abierta()) Boveda._temporizador(); });
  App.ruta();
  Rec.revisar(); setInterval(() => Rec.revisar(), 30000);
  // Sincronización: al abrir, cada 5 minutos y al ocultar la pestaña con cambios pendientes
  if (Sync.activo()) Sync.sincronizar();
  setInterval(() => { if (Sync.activo() && !document.hidden) Sync.sincronizar(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && Sync.activo() && Sync.cfg.sucio) Sync.sincronizar(); });
  // Si la plataforma queda abierta de un día a otro, se actualiza sola
  let dia = hoyISO(); setInterval(() => { if (hoyISO() !== dia) { dia = hoyISO(); if (!$('#modal').classList.contains('on') && App.vista !== 'notas') App.pintar(); } }, 60000);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});   // pide al navegador no borrar los datos
}
iniciar();
