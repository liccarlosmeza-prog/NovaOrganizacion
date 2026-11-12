'use strict';
/* ==========================================================================
   AJUSTES (apariencia, catálogos, seguridad) + DATOS (exportar, importar, respaldo)
   ========================================================================== */
const Aj = {
  texto(k, v) { S.ajustes[k] = v.trim() || (k === 'nombre' ? 'Plataforma de Gestión' : ''); guardar(); aplicarTema(); App.pintar(); },
  numero(k, v, min, max) { const n = Math.min(max, Math.max(min, Number(v) || min)); S.ajustes[k] = n; guardar(); aplicarTema(); },
  preset(id) { const { nombre, ...c } = TEMAS[id]; S.ajustes.temaId = id; S.ajustes.tema = { ...c }; guardar(); aplicarTema(); App.pintar(); },
  color(k, v) { S.ajustes.tema[k] = v; S.ajustes.temaId = 'personal'; guardar(); aplicarTema(); App.pintar(); },
  async imagen(campo, input) {
    const a = input.files[0]; if (!a) return;
    try { const id = await Img.agregar(a, 2200); await Img.quitar(S.ajustes[campo]); S.ajustes[campo] = id; guardar(); aplicarTema(); App.pintar(); }
    catch (e) { toast(e.message, 'err'); }
  },
  async quitarImagen(campo) { await Img.quitar(S.ajustes[campo]); S.ajustes[campo] = null; guardar(); aplicarTema(); App.pintar(); },
  estatus(id) {
    const e = id ? por('estatus', id) : null;
    Form.abrir({ titulo: e ? 'Editar estatus' : 'Nuevo estatus', valores: e || { color: '#64748b' },
      campos: [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'color', label: 'Color', tipo: 'color', medio: true }, { k: 'final', label: 'Tipo', tipo: 'check', texto: 'Es un estatus final (cuenta como terminado)', medio: true }],
      guardar: v => {
        if (!v.final && !S.estatus.some(x => x.final && x.id !== (e && e.id))) return 'Debe existir al menos un estatus final';
        if (v.final && !S.estatus.some(x => !x.final && x.id !== (e && e.id))) return 'Debe existir al menos un estatus no final';
        poner('estatus', { id: e ? e.id : uid(), ...v });
      },
      eliminar: e ? () => {
        const enUso = S.proyectos.some(p => p.estatus === e.id) || S.actividades.some(a => a.estatus === e.id);
        const resto = S.estatus.filter(x => x.id !== e.id);
        if (enUso) return toast('No se puede eliminar: hay proyectos o actividades con este estatus', 'err');
        if (!resto.some(x => x.final) || !resto.some(x => !x.final)) return toast('Debe quedar al menos un estatus final y uno no final', 'err');
        quitar('estatus', e.id);
      } : null });
  },
  categoria(id) {
    const c = id ? por('categorias', id) : null;
    Form.abrir({ titulo: c ? 'Editar clasificación' : 'Nueva clasificación', valores: c || { color: PALETA[S.categorias.length % PALETA.length] },
      campos: [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'color', label: 'Color', tipo: 'color' }],
      guardar: v => { poner('categorias', { id: c ? c.id : uid(), ...v }); },
      eliminar: c ? () => { S.actividades.forEach(a => { if (a.categoria === c.id) a.categoria = ''; }); quitar('categorias', c.id); } : null });
  },
  async cambiarClave() {
    if (!Boveda.abierta()) return toast('Desbloquea primero tus notas privadas (Notas → Privadas)', 'err');
    const a = $('#ncA').value, b = $('#ncB').value;
    if (a.length < 8) return toast('La contraseña debe tener al menos 8 caracteres', 'err');
    if (a !== b) return toast('Las contraseñas no coinciden', 'err');
    await Boveda.cambiarClave(a); App.pintar(); toast('Contraseña actualizada; las notas se volvieron a cifrar');
  }
};

Vistas.ajustes = () => {
  const t = UI.aj.tab, a = S.ajustes;
  const img = (campo, etiqueta, ayuda) => `<div class="reng"><label>${etiqueta}</label><div class="prev" style="${Img.url(a[campo]) ? `background-image:url('${Img.url(a[campo])}')` : ''}"></div>
      <input type="file" accept="image/*" onchange="Aj.imagen('${campo}',this)" style="max-width:230px">${a[campo] ? `<button class="lnk rojo" onclick="Aj.quitarImagen('${campo}')">Quitar</button>` : ''}<span class="d" style="flex-basis:100%;margin-left:220px">${ayuda}</span></div>`;
  let cuerpo;
  if (t === 'apariencia') cuerpo = `
    <section class="blq"><h3>General</h3><div class="cu">
      <div class="reng"><label for="ajNombre">Nombre de la plataforma</label><input type="text" id="ajNombre" value="${esc(a.nombre)}" onchange="Aj.texto('nombre',this.value)" style="width:280px"></div>
      <div class="reng"><label for="ajUsuario">Tu nombre (para el saludo)</label><input type="text" id="ajUsuario" value="${esc(a.usuario)}" onchange="Aj.texto('usuario',this.value)" style="width:280px"></div></div></section>
    <section class="blq"><h3>Colores</h3><div class="cu">
      <div class="reng"><label>Tema</label><div class="pres">${Object.entries(TEMAS).map(([id, x]) => `<button class="${a.temaId === id ? 'on' : ''}" onclick="Aj.preset('${id}')"><i style="background:${x.bg}"></i><i style="background:${x.ac}"></i>${x.nombre}</button>`).join('')}
        ${a.temaId === 'personal' ? '<button class="on">Personalizado</button>' : ''}</div></div>
      ${[['ac', 'Color de acento'], ['bg', 'Fondo'], ['sup', 'Superficies (paneles)'], ['tx', 'Texto'], ['mut', 'Texto secundario'], ['bd', 'Bordes']].map(([k, n]) => `<div class="reng"><label for="c_${k}">${n}</label><input type="color" id="c_${k}" value="${esc(a.tema[k])}" onchange="Aj.color('${k}',this.value)"><span class="d">${esc(a.tema[k])}</span></div>`).join('')}</div></section>
    <section class="blq"><h3>Imágenes de la interfaz</h3><div class="cu">
      ${img('bandaImg', 'Imagen de encabezado', 'Franja superior en todas las pantallas.')}
      ${img('fondoImg', 'Imagen de fondo', 'Se muestra tenue detrás del contenido.')}
      <div class="reng"><label for="ajOp">Intensidad del fondo</label><input type="range" id="ajOp" min="4" max="45" value="${a.fondoOp}" oninput="Aj.numero('fondoOp',this.value,4,45)"></div>
      <div class="reng"><label>Frases del día</label><a href="#/frases">Administrar frases e imágenes</a></div></div></section>`;
  else if (t === 'catalogos') cuerpo = `
    <section class="blq"><h3>Estatus de proyectos y actividades <button class="lnk" onclick="Aj.estatus()">+ Agregar</button></h3>
      <ul class="filas">${S.estatus.map(e => `<li>${punto(e.color)}<span class="x clic" onclick="Aj.estatus('${e.id}')">${esc(e.nombre)}</span>${e.final ? '<span class="et">Final</span>' : ''}<span class="m">${S.proyectos.filter(p => p.estatus === e.id).length + S.actividades.filter(x => x.estatus === e.id).length} en uso</span></li>`).join('')}</ul></section>
    <section class="blq"><h3>Clasificaciones de actividades <button class="lnk" onclick="Aj.categoria()">+ Agregar</button></h3>
      ${S.categorias.length ? `<ul class="filas">${S.categorias.map(c => `<li>${punto(c.color)}<span class="x clic" onclick="Aj.categoria('${c.id}')">${esc(c.nombre)}</span><span class="m">${S.actividades.filter(x => x.categoria === c.id).length} actividades</span></li>`).join('')}</ul>` : vacio('Sin clasificaciones', '')}</section>
    <section class="blq"><h3>Escuela</h3><div class="cu"><div class="reng"><label for="ajMeta">Meta de calificación por defecto</label><input type="number" id="ajMeta" min="0" max="100" value="${a.metaEscolar}" onchange="Aj.numero('metaEscolar',this.value,0,100)" style="width:90px"><span class="d">Puntos; se puede cambiar por materia.</span></div></div></section>`;
  else if (t === 'datos') { const leg = Datos.legado(); cuerpo = `
    <section class="blq"><h3>Exportar</h3><div class="cu">
      <div class="reng"><label>Todo en CSV</label><button class="btn pri" onclick="Datos.exportarTodo()">Descargar ZIP con todos los CSV</button><span class="d">Un archivo CSV por tabla; se abre en Excel o Power BI.</span></div>
      <div class="reng"><label>Una tabla</label><select id="expTabla">${Datos.tablas().map(x => `<option value="${x.nombre}">${x.nombre} (${x.filas.length})</option>`).join('')}</select><button class="btn" onclick="Datos.exportarUna(document.getElementById('expTabla').value)">Descargar CSV</button></div>
      <div class="reng"><label>Respaldo completo</label><button class="btn" onclick="Datos.respaldo()">Descargar respaldo (.json)</button><span class="d">Incluye imágenes, ajustes y notas privadas (cifradas). Úsalo para pasar tus datos a otro equipo.</span></div></div></section>
    <section class="blq"><h3>Importar</h3><div class="cu">
      <div class="reng"><label>Respaldo completo</label><button class="btn" onclick="Datos.elegir('respaldo')">Restaurar respaldo (.json)</button><span class="d">Reemplaza todo el contenido actual.</span></div>
      <div class="reng"><label>Actividades escolares</label><button class="btn" onclick="Datos.elegir('escolares')">Importar CSV</button><span class="d">Materia, Actividad, Tipo, Valor, FechaInicio, FechaEntrega, Estado, Calificacion (formato AcadTrack).</span></div>
      <div class="reng"><label>Accesos directos</label><button class="btn" onclick="Datos.elegir('enlaces')">Importar CSV</button><span class="d">Nombre, URL, Carpeta, Descripcion, Favorito, Tags (formato LinkManager).</span></div>
      <div class="reng"><label>Actividades</label><button class="btn" onclick="Datos.elegir('actividades')">Importar CSV</button><span class="d">Titulo, Proyecto, Clasificacion, Estatus, Prioridad, FechaInicio, FechaLimite, Horas, Detalle.</span></div>
      <div class="reng"><label>Cumpleaños</label><button class="btn" onclick="Datos.elegir('cumples')">Importar CSV</button><span class="d">Nombre, Fecha (dd/mm/aaaa o dd/mm), Relacion, Nota.</span></div>
      <div class="reng"><label>Agenda</label><button class="btn" onclick="Datos.elegir('ics')">Importar calendario (.ics)</button><span class="d">Archivo exportado de Outlook, Teams o Google Calendar.</span></div>
      ${leg.acad || leg.links ? `<div class="reng"><label>Datos de tus HTML anteriores</label>${leg.acad ? `<button class="btn" onclick="Datos.importarLegado('acad')">Traer AcadTrack (${leg.acad} actividades)</button>` : ''}${leg.links ? `<button class="btn" onclick="Datos.importarLegado('links')">Traer LinkManager (${leg.links} enlaces)</button>` : ''}<span class="d">Detectados en este navegador.</span></div>` : ''}</div></section>
    <section class="blq"><h3>Mantenimiento</h3><div class="cu">
      <div class="reng"><label>Datos de ejemplo</label><button class="btn" onclick="Datos.demo()">Cargar datos de ejemplo</button><span class="d">Para probar la plataforma. Se agregan a lo que ya tengas.</span></div>
      <div class="reng"><label>Borrar todo</label><button class="btn peligro" onclick="Datos.borrarTodo()">Borrar todos los datos</button><span class="d">Descarga antes un respaldo.</span></div>
      <div class="reng"><label>Almacenamiento</label><span class="d">${DB.idb ? 'IndexedDB de este navegador' : 'localStorage (sin imágenes)'} · ${Img.blobs.size} imagen(es) · ${(([...Img.blobs.values()].reduce((s, b) => s + b.size, 0)) / 1048576).toFixed(1)} MB. Los datos viven sólo en este equipo y navegador.</span></div></div></section>`; }
  else cuerpo = `
    <section class="blq"><h3>Notas privadas</h3><div class="cu">
      <p class="d" style="margin-bottom:10px">Cifrado AES-256 con clave derivada de tu contraseña (PBKDF2, 250 000 iteraciones). La contraseña no se almacena y no existe forma de recuperarla.</p>
      <div class="reng"><label>Estado</label><span>${!S.boveda ? 'Sin configurar' : Boveda.abierta() ? '<span class="verde">Desbloqueadas</span>' : 'Bloqueadas'} · ${S.notasPriv.length} nota(s)</span>
        ${!S.boveda ? '<button class="btn" onclick="UI.notas.f=\'priv\';App.ir(\'notas\')">Configurar</button>' : Boveda.abierta() ? '<button class="btn" onclick="Boveda.cerrar();App.pintar()">Bloquear ahora</button>' : '<button class="btn" onclick="UI.notas.f=\'priv\';App.ir(\'notas\')">Desbloquear</button>'}</div>
      ${S.boveda && Boveda.abierta() ? `<div class="reng"><label for="ncA">Nueva contraseña</label><input type="password" id="ncA" autocomplete="new-password"></div>
        <div class="reng"><label for="ncB">Repetir nueva contraseña</label><input type="password" id="ncB" autocomplete="new-password"><button class="btn" onclick="Aj.cambiarClave()">Cambiar contraseña</button></div>` : ''}</div></section>
    <section class="blq"><h3>Alcance de la protección</h3><div class="cu d">
      <p>• Sólo las notas privadas están cifradas. El resto de la información se guarda sin cifrar en este navegador.</p>
      <p>• Cualquier persona con acceso a tu sesión del equipo puede ver lo que no sea privado: bloquea tu equipo al ausentarte.</p>
      <p>• Las notas privadas no se incluyen en la exportación CSV; en el respaldo .json viajan cifradas.</p></div></section>`;
  return `${cab('Ajustes', '')}<div class="tabs">${[['apariencia', 'Apariencia'], ['catalogos', 'Catálogos'], ['datos', 'Datos'], ['seguridad', 'Seguridad']].map(([k, n]) => `<button class="${t === k ? 'on' : ''}" onclick="UI.aj.tab='${k}';App.pintar()">${n}</button>`).join('')}</div><div class="aj">${cuerpo}</div>`;
};

/* ==========================================================================
   DATOS
   ========================================================================== */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
/** Devuelve una función que busca columnas por nombre (sin importar acentos ni mayúsculas). */
function columnas(encabezado) { const h = encabezado.map(norm); return (...nombres) => { for (const n of nombres) { const i = h.indexOf(norm(n)); if (i >= 0) return i; } return -1; }; }
const celda = (f, i) => i >= 0 ? (f[i] || '').trim() : '';
function fusionar(e) {
  const b = estadoVacio(), r = { ...b, ...e };
  r.ajustes = { ...b.ajustes, ...(e.ajustes || {}), tema: { ...b.ajustes.tema, ...((e.ajustes || {}).tema || {}) } };
  for (const k of Object.keys(b)) if (Array.isArray(b[k]) && !Array.isArray(r[k])) r[k] = b[k];
  if (!r.estatus.length) r.estatus = b.estatus;
  return r;
}

const Datos = {
  /* ---------- Exportación ---------- */
  tablas() {
    const nom = (lista, id) => (por(lista, id) || {}).nombre || '';
    const pri = p => (PRIORIDADES.find(x => x[0] === p) || ['', ''])[1];
    return [
      { nombre: 'proyectos.csv', enc: ['Id', 'Nombre', 'Ambito', 'Estatus', 'Prioridad', 'AsignadoPor', 'FechaInicio', 'FechaObjetivo', 'AvancePct', 'Descripcion'],
        filas: S.proyectos.map(p => [p.id, p.nombre, p.ambito, nom('estatus', p.estatus), pri(p.prioridad), p.asignadoPor, aDMY(p.inicio), aDMY(p.objetivo), Proy.avance(p), p.descripcion]) },
      { nombre: 'actividades.csv', enc: ['Id', 'Titulo', 'Proyecto', 'Clasificacion', 'Estatus', 'Prioridad', 'FechaInicio', 'FechaLimite', 'Hora', 'Horas', 'Detalle', 'Checklist', 'FechaTerminada'],
        filas: S.actividades.map(a => [a.id, a.titulo, nom('proyectos', a.proyecto), nom('categorias', a.categoria), nom('estatus', a.estatus), pri(a.prioridad), aDMY(a.inicio), aDMY(a.limite), a.hora, a.horas, a.detalle, a.checklist, aDMY(a.completada)]) },
      { nombre: 'bitacora.csv', enc: ['Id', 'Proyecto', 'FechaHora', 'Tipo', 'Texto', 'Imagenes'], filas: S.bitacora.map(b => [b.id, nom('proyectos', b.proyecto), b.fecha, b.tipo, b.texto, (b.imgs || []).length]) },
      { nombre: 'notas.csv', enc: ['Id', 'Titulo', 'Proyecto', 'Etiquetas', 'Fijada', 'Creada', 'Actualizada', 'Texto'], filas: S.notas.map(n => [n.id, n.titulo, nom('proyectos', n.proyecto), n.etiquetas, n.fijada ? 'SI' : 'NO', n.creado, n.actualizado, n.texto]) },
      { nombre: 'recordatorios.csv', enc: ['Id', 'Texto', 'Fecha', 'Hora', 'Repeticion', 'Hecho'], filas: S.recordatorios.map(r => [r.id, r.texto, aDMY(r.fecha), r.hora, r.repetir, r.hecho ? 'SI' : 'NO']) },
      { nombre: 'agenda.csv', enc: ['Id', 'Evento', 'Fecha', 'HoraInicio', 'HoraFin', 'Tipo', 'Proyecto', 'Lugar', 'Notas', 'Origen'], filas: S.eventos.map(e => [e.id, e.titulo, aDMY(e.fecha), e.horaIni, e.horaFin, e.tipo, nom('proyectos', e.proyecto), e.lugar, e.nota, e.origen]) },
      { nombre: 'cumpleanos.csv', enc: ['Nombre', 'Fecha', 'Relacion', 'Nota'], filas: S.cumples.map(c => [c.nombre, `${p2(c.dia)}/${p2(c.mes)}${c.anio ? '/' + c.anio : ''}`, c.relacion, c.nota]) },
      { nombre: 'materias.csv', enc: ['Materia', 'Profesor', 'Ciclo', 'Color', 'Meta'], filas: S.materias.map(m => [m.nombre, m.profesor, m.ciclo, m.color, m.meta]) },
      { nombre: 'actividades_escolares.csv', enc: ['Materia', 'Actividad', 'Tipo', 'Valor', 'FechaInicio', 'FechaEntrega', 'Estado', 'Calificacion', 'Comentarios'],
        filas: S.escolares.map(e => [nom('materias', e.materia), e.titulo, e.tipo, e.valor, aDMY(e.inicio), aDMY(e.entrega), (EST_ESC.find(x => x[0] === e.estatus) || ['', ''])[1], e.calif, e.comentario]) },
      { nombre: 'accesos_directos.csv', enc: ['Nombre', 'URL', 'Carpeta', 'Descripcion', 'Favorito', 'Tags'], filas: S.enlaces.map(l => [l.nombre, l.url, nom('carpetas', l.carpeta), l.desc, l.fav ? 'SI' : 'NO', String(l.tags || '').replace(/,/g, ';')]) },
      { nombre: 'frases.csv', enc: ['Frase', 'Autor', 'TieneImagen'], filas: S.frases.map(f => [f.texto, f.autor, f.img ? 'SI' : 'NO']) }
    ];
  },
  exportarTodo() {
    const arch = this.tablas().map(t => ({ nombre: t.nombre, texto: csvTexto(t.enc, t.filas) }));
    arch.push({ nombre: 'LEEME.txt', texto: `Exportación de ${S.ajustes.nombre}\r\nFecha: ${ahoraTxt()}\r\n\r\nCada archivo CSV corresponde a una tabla (UTF-8, separado por comas, fechas dd/mm/aaaa).\r\nLas notas privadas (${S.notasPriv.length}) no se incluyen porque están cifradas.\r\nLas imágenes no se incluyen en CSV: usa "Respaldo completo (.json)" para conservarlas.\r\n` });
    descargar(`plataforma_csv_${hoyISO()}.zip`, crearZip(arch)); toast('Exportación lista');
  },
  exportarUna(nombre) { const t = this.tablas().find(x => x.nombre === nombre); descargar(nombre.replace('.csv', `_${hoyISO()}.csv`), new Blob([csvTexto(t.enc, t.filas)], { type: 'text/csv;charset=utf-8' })); },
  async respaldo() {
    const imagenes = {}; for (const [id, blob] of Img.blobs) imagenes[id] = await Img.aDataURL(blob);
    descargar(`plataforma_respaldo_${hoyISO()}.json`, new Blob([JSON.stringify({ app: 'PlataformaGestion', v: 1, fecha: ahoraTxt(), estado: S, imagenes })], { type: 'application/json' }));
    toast('Respaldo descargado');
  },

  /* ---------- Importación ---------- */
  _tipo: null,
  elegir(tipo) { this._tipo = tipo; const i = $('#archivo'); i.value = ''; i.accept = tipo === 'respaldo' ? '.json' : tipo === 'ics' ? '.ics' : '.csv,.txt'; i.click(); },
  async archivo(input) {
    const a = input.files[0]; if (!a) return;
    try {
      const texto = await a.text(), tipo = this._tipo;
      if (tipo === 'respaldo') return this.restaurar(texto);
      const r = tipo === 'ics' ? this.leerICS(texto) : this['leer_' + tipo](parseCSV(texto));
      if (!r.n) return toast(`No se encontraron filas válidas${r.omitidas ? ` (${r.omitidas} omitidas)` : ''}. Revisa el formato del archivo.`, 'err');
      confirmar(`Se importarán ${r.n} registro(s).${r.omitidas ? ` Se omitirán ${r.omitidas} fila(s) por datos inválidos o duplicados.` : ''}${r.nota ? ' ' + r.nota : ''} ¿Continuar?`, () => { r.aplicar(); guardar(); App.pintar(); toast(`${r.n} registro(s) importado(s)`); }, 'Importar');
    } catch (e) { console.error(e); toast('No se pudo leer el archivo: ' + e.message, 'err'); }
  },
  restaurar(texto) {
    let d; try { d = JSON.parse(texto); } catch (e) { return toast('El archivo no es un respaldo válido', 'err'); }
    if (!d || d.app !== 'PlataformaGestion' || !d.estado) return toast('El archivo no es un respaldo de esta plataforma', 'err');
    confirmar(`Se reemplazará TODO el contenido actual por el respaldo del ${d.fecha || '(sin fecha)'}. ¿Continuar?`, async () => {
      for (const id of [...Img.blobs.keys()]) await Img.quitar(id);
      for (const [id, url] of Object.entries(d.imagenes || {})) { try { await Img.deDataURL(id, url); } catch (e) { console.warn('Imagen omitida', id); } }
      S = fusionar(d.estado); Boveda.cerrar(); guardar(); aplicarTema(); App.ir('inicio'); toast('Respaldo restaurado');
    }, 'Reemplazar todo');
  },
  _materia(nombre) { let m = S.materias.find(x => norm(x.nombre) === norm(nombre)); if (!m) { m = { id: uid(), nombre, color: PALETA[S.materias.length % PALETA.length], meta: S.ajustes.metaEscolar }; S.materias.push(m); } return m; },
  leer_escolares(filas) {
    const col = columnas(filas[0] || []), conEnc = col('materia') >= 0;
    const ix = conEnc ? { m: col('materia'), t: col('actividad', 'titulo', 'nombre'), tp: col('tipo'), v: col('valor', 'puntos'), i: col('fechainicio', 'inicio'), e: col('fechaentrega', 'entrega'), s: col('estado', 'estatus'), c: col('calificacion') }
                      : { m: 0, t: 1, tp: 2, v: 3, i: 4, e: 5, s: 6, c: 7 };
    const EST = { pendiente: 'pendiente', enproceso: 'proceso', proceso: 'proceso', guardada: 'guardada', enviada: 'enviada', calificada: 'calificada' };
    const nuevos = []; let omitidas = 0;
    for (const f of filas.slice(conEnc ? 1 : 0)) {
      const materia = celda(f, ix.m), titulo = celda(f, ix.t), entrega = parseFecha(celda(f, ix.e)), inicio = parseFecha(celda(f, ix.i));
      if (!materia || !titulo || !entrega || (inicio && inicio > entrega)) { omitidas++; continue; }
      const valor = Number(celda(f, ix.v).replace(',', '.')) || 0, ct = celda(f, ix.c).replace(',', '.'), calif = ct === '' || isNaN(+ct) ? null : Math.min(+ct, valor);
      let tipo = celda(f, ix.tp) || 'Buzón'; if (norm(tipo) === 'examen') tipo = 'Examen'; if (!TIPOS_ESC.includes(tipo)) tipo = 'Otro';
      nuevos.push({ materia, titulo, tipo, valor, inicio: inicio || entrega, entrega, estatus: calif != null ? 'calificada' : (EST[norm(celda(f, ix.s))] || 'pendiente'), calif });
    }
    const existe = x => S.escolares.some(e => norm((por('materias', e.materia) || {}).nombre) === norm(x.materia) && norm(e.titulo) === norm(x.titulo) && e.entrega === x.entrega);
    const lista = nuevos.filter(x => !existe(x)); omitidas += nuevos.length - lista.length;
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.escolares.push({ id: uid(), ...x, materia: this._materia(x.materia).id, comentario: '' })) };
  },
  _carpeta(nombre) { if (!nombre) return ''; let c = S.carpetas.find(x => norm(x.nombre) === norm(nombre)); if (!c) { c = { id: uid(), nombre, color: PALETA[S.carpetas.length % PALETA.length] }; S.carpetas.push(c); } return c.id; },
  leer_enlaces(filas) {
    const col = columnas(filas[0] || []), iN = col('nombre', 'name'), iU = col('url', 'direccion'), iF = col('carpeta', 'folder'), iD = col('descripcion', 'desc'), iV = col('favorito', 'fav'), iT = col('tags', 'etiquetas');
    if (iN < 0 || iU < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0; const vistos = new Set(S.enlaces.map(l => l.url));
    for (const f of filas.slice(1)) {
      const nombre = celda(f, iN), url = urlSegura(celda(f, iU));
      if (!nombre || !url || vistos.has(url)) { omitidas++; continue; } vistos.add(url);
      lista.push({ nombre, url, carpeta: celda(f, iF), desc: celda(f, iD), fav: ['si', 'sí', 'x', '1', 'true'].includes(celda(f, iV).toLowerCase()), tags: celda(f, iT).replace(/;/g, ', ') });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.enlaces.push({ id: uid(), ...x, carpeta: this._carpeta(x.carpeta) })) };
  },
  leer_cumples(filas) {
    const col = columnas(filas[0] || []), iN = col('nombre'), iF = col('fecha', 'cumpleanos', 'fechanacimiento'), iR = col('relacion'), iO = col('nota', 'notas');
    if (iN < 0 || iF < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0;
    for (const f of filas.slice(1)) {
      const nombre = celda(f, iN), tf = celda(f, iF), corto = tf.match(/^(\d{1,2})[\/\-.](\d{1,2})$/), iso = corto ? '' : parseFecha(tf);
      const dia = corto ? +corto[1] : iso ? +iso.slice(8) : 0, mes = corto ? +corto[2] : iso ? +iso.slice(5, 7) : 0, anio = iso ? +iso.slice(0, 4) : null;
      if (!nombre || !dia || mes < 1 || mes > 12 || dia > new Date(2024, mes, 0).getDate() || S.cumples.some(c => norm(c.nombre) === norm(nombre))) { omitidas++; continue; }
      lista.push({ nombre, dia, mes, anio, relacion: celda(f, iR), nota: celda(f, iO) });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.cumples.push({ id: uid(), ...x })) };
  },
  leer_actividades(filas) {
    const col = columnas(filas[0] || []), iT = col('titulo', 'actividad'), iP = col('proyecto'), iC = col('clasificacion', 'categoria'), iE = col('estatus', 'estado'), iPr = col('prioridad'), iI = col('fechainicio', 'inicio'), iL = col('fechalimite', 'limite', 'fechaentrega'), iH = col('horas'), iD = col('detalle', 'descripcion');
    if (iT < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0;
    for (const f of filas.slice(1)) {
      const titulo = celda(f, iT), inicio = parseFecha(celda(f, iI)), limite = parseFecha(celda(f, iL));
      if (!titulo || (celda(f, iL) && !limite) || (inicio && limite && limite < inicio)) { omitidas++; continue; }
      lista.push({ titulo, proyecto: celda(f, iP), categoria: celda(f, iC), estatus: celda(f, iE), prioridad: celda(f, iPr), inicio, limite, horas: Number(celda(f, iH).replace(',', '.')) || null, detalle: celda(f, iD) });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => {
      let p = x.proyecto && S.proyectos.find(y => norm(y.nombre) === norm(x.proyecto));
      if (x.proyecto && !p) { p = { id: uid(), nombre: x.proyecto, ambito: 'Trabajo', estatus: idInicial(), prioridad: '3', creado: hoyISO(), inicio: '', objetivo: '', asignadoPor: '', descripcion: '' }; S.proyectos.push(p); }
      let c = x.categoria && S.categorias.find(y => norm(y.nombre) === norm(x.categoria));
      if (x.categoria && !c) { c = { id: uid(), nombre: x.categoria, color: PALETA[S.categorias.length % PALETA.length] }; S.categorias.push(c); }
      const e = S.estatus.find(y => norm(y.nombre) === norm(x.estatus)) || S.estatus[0], pr = (PRIORIDADES.find(y => norm(y[1]) === norm(x.prioridad)) || ['3'])[0];
      S.actividades.push({ id: uid(), creado: hoyISO(), titulo: x.titulo, proyecto: p ? p.id : '', categoria: c ? c.id : '', estatus: e.id, prioridad: pr, inicio: x.inicio, limite: x.limite, hora: '', horas: x.horas, detalle: x.detalle, checklist: '', completada: e.final ? hoyISO() : '' });
    }) };
  },
  /** Lee eventos de un archivo iCalendar (.ics). No expande eventos repetitivos. */
  leerICS(texto) {
    const lineas = texto.replace(/\r?\n[ \t]/g, '').split(/\r?\n/), lista = []; let ev = null, repetidos = 0, omitidas = 0;
    const fechaHora = v => {
      const r = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/); if (!r) return null;
      if (!r[4]) return { fecha: `${r[1]}-${r[2]}-${r[3]}`, hora: '' };
      const d = r[7] ? new Date(Date.UTC(+r[1], +r[2] - 1, +r[3], +r[4], +r[5])) : new Date(+r[1], +r[2] - 1, +r[3], +r[4], +r[5]);
      return { fecha: aISO(d), hora: `${p2(d.getHours())}:${p2(d.getMinutes())}` };
    };
    const limpio = s => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
    for (const l of lineas) {
      if (l === 'BEGIN:VEVENT') ev = {};
      else if (l === 'END:VEVENT' && ev) {
        const i = ev.DTSTART && fechaHora(ev.DTSTART), f = ev.DTEND && fechaHora(ev.DTEND);
        if (!i || !ev.SUMMARY || S.eventos.some(e => e.origenId && e.origenId === ev.UID && e.fecha === i.fecha)) omitidas++;
        else { if (ev.RRULE) repetidos++; lista.push({ titulo: limpio(ev.SUMMARY), fecha: i.fecha, horaIni: i.hora, horaFin: f && f.fecha === i.fecha ? f.hora : '', tipo: 'Reunión', proyecto: '', lugar: limpio(ev.LOCATION || ''), nota: '', origen: 'ics', origenId: ev.UID || '' }); }
        ev = null;
      } else if (ev) { const p = l.indexOf(':'); if (p > 0) { const k = l.slice(0, p).split(';')[0].toUpperCase(); if (!(k in ev)) ev[k] = l.slice(p + 1); } }
    }
    return { n: lista.length, omitidas, nota: repetidos ? `${repetidos} evento(s) repetitivo(s) se importan sólo en su primera fecha.` : '', aplicar: () => lista.forEach(x => S.eventos.push({ id: uid(), ...x })) };
  },

  /* ---------- Datos de AcadTrack / LinkManager guardados en este navegador ---------- */
  legado() {
    const leer = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    const t = leer('at4_tasks'), l = leer('lmpro_v3');
    return { acad: Array.isArray(t) ? t.length : 0, links: l && Array.isArray(l.links) ? l.links.length : 0 };
  },
  importarLegado(cual) {
    const leer = k => JSON.parse(localStorage.getItem(k) || 'null'); let n = 0;
    if (cual === 'acad') {
      const tareas = leer('at4_tasks') || [], est = leer('at4_statuses') || {}, mats = leer('at4_materias') || [];
      const M = { pending: 'pendiente', inprogress: 'proceso', saved: 'guardada', sent: 'enviada' };
      const filas = [['Materia', 'Actividad', 'Tipo', 'Valor', 'FechaInicio', 'FechaEntrega', 'Estado']];
      tareas.forEach((t, i) => { const m = mats.find(x => x.id === t.m) || { name: t.m }; filas.push([m.name, t.n, t.t, String(t.v || 0), t.i, t.e, M[est[i]] || 'pendiente']); });
      const r = this.leer_escolares(filas); r.aplicar(); n = r.n;
      mats.forEach(m => { const x = S.materias.find(y => norm(y.nombre) === norm(m.name)); if (x && m.color) x.color = m.color; });
    } else {
      const d = leer('lmpro_v3') || {}, mapa = {};
      (d.folders || []).forEach(f => { mapa[f.id] = this._carpeta(f.name); const c = por('carpetas', mapa[f.id]); if (c && f.color) c.color = f.color; });
      const ids = {};
      (d.links || []).forEach(l => { const url = urlSegura(l.url); if (!url || S.enlaces.some(x => x.url === url)) return; const id = uid(); ids[l.id] = id; S.enlaces.push({ id, nombre: l.name, url, carpeta: mapa[l.folderId] || '', desc: l.desc || '', fav: !!l.isFav, tags: (l.tags || []).join(', ') }); n++; });
      (d.groups || []).forEach(g => { const gi = (g.linkIds || []).map(x => ids[x]).filter(Boolean); if (gi.length) S.grupos.push({ id: uid(), nombre: g.name, ids: gi }); });
    }
    guardar(); App.pintar(); toast(`${n} registro(s) traído(s). Tus datos originales no se modificaron.`);
  },

  borrarTodo() {
    confirmar('Se borrarán TODOS los datos e imágenes de la plataforma en este navegador. Esta acción no se puede deshacer. ¿Continuar?', async () => {
      await DB.imgVaciar(); for (const u of Img.urls.values()) URL.revokeObjectURL(u); Img.urls.clear(); Img.blobs.clear();
      S = estadoVacio(); Boveda.cerrar(); guardar(); aplicarTema(); App.ir('inicio'); toast('Datos borrados');
    }, 'Borrar todo');
  }
};
