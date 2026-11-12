'use strict';
/* ==========================================================================
   AJUSTES (apariencia, catálogos, seguridad) + DATOS (exportar, importar, respaldo)
   ========================================================================== */
const Aj = {
  texto(k, v) { S.ajustes[k] = v.trim() || (k === 'nombre' ? 'Nova Organización' : ''); guardar(); aplicarTema(); App.pintar(); },
  numero(k, v, min, max) { const n = Math.min(max, Math.max(min, Number(v) || min)); S.ajustes[k] = n; guardar(); aplicarTema(); },
  preset(id) { S.ajustes.temaId = id; S.ajustes.tema = temaDe(id); guardar(); aplicarTema(); App.pintar(); },
  escala(v) { S.ajustes.escala = Number(v); guardar(); aplicarTema(); App.pintar(); },
  /* --- Bloques de Inicio: orden, tamaño, filas y periodo --- */
  wMover(i, d) { const l = S.ajustes.inicio, j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; guardar(); App.pintar(); },
  wSet(i, k, v) { S.ajustes.inicio[i][k] = k === 'on' ? v : Number(v); guardar(); App.pintar(); },
  wRestablecer() { S.ajustes.inicio = inicioDefecto(); guardar(); App.pintar(); toast('Inicio restablecido'); },
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
      <div class="reng"><label for="ajLema">Lema</label><input type="text" id="ajLema" value="${esc(a.lema || '')}" onchange="Aj.texto('lema',this.value)" style="width:280px"></div>
      <div class="reng"><label for="ajUsuario">Tu nombre (para el saludo)</label><input type="text" id="ajUsuario" value="${esc(a.usuario)}" onchange="Aj.texto('usuario',this.value)" style="width:280px"></div>
      <div class="reng"><label for="ajEscala">Tamaño general</label><select id="ajEscala" onchange="Aj.escala(this.value)">${[[85, 'Compacto (85 %)'], [92, 'Reducido (92 %)'], [100, 'Normal (100 %)'], [110, 'Grande (110 %)'], [125, 'Muy grande (125 %)']].map(([v, t]) => `<option value="${v}" ${(a.escala || 100) === v ? 'selected' : ''}>${t}</option>`).join('')}</select><span class="d">Cambia el tamaño de textos, filas y controles de toda la plataforma.</span></div></div></section>
    <section class="blq"><h3>Colores</h3><div class="cu">
      <div class="reng"><label>Tema</label><div class="pres">${Object.entries(TEMAS).map(([id, x]) => `<button class="${a.temaId === id ? 'on' : ''}" onclick="Aj.preset('${id}')"><i style="background:${x.lat}"></i><i style="background:${x.ac}"></i><i style="background:${x.oro}"></i>${esc(x.nombre)}</button>`).join('')}
        ${a.temaId === 'personal' ? '<button class="on">Personalizado</button>' : ''}</div></div>
      ${COLORES_TEMA.map(([k, n]) => `<div class="reng"><label for="c_${k}">${n}</label><input type="color" id="c_${k}" value="${esc(a.tema[k])}" onchange="Aj.color('${k}',this.value)"><span class="d">${esc(a.tema[k])}</span></div>`).join('')}</div></section>
    <section class="blq"><h3>Imágenes de la interfaz</h3><div class="cu">
      ${img('bandaImg', 'Imagen de encabezado', 'Franja superior en todas las pantallas.')}
      ${img('fondoImg', 'Imagen de fondo', 'Se muestra tenue detrás del contenido.')}
      <div class="reng"><label for="ajOp">Intensidad del fondo</label><input type="range" id="ajOp" min="4" max="45" value="${a.fondoOp}" oninput="Aj.numero('fondoOp',this.value,4,45)"></div>
      <div class="reng"><label>Frases del día</label><a href="#/frases">Administrar frases e imágenes</a></div></div></section>`;
  else if (t === 'inicio') cuerpo = `
    <section class="blq"><h3>Bloques de la pantalla de Inicio <button class="lnk" onclick="Aj.wRestablecer()">Restablecer</button></h3>
      <div class="scrollx"><table class="lista"><thead><tr><th style="width:84px">Orden</th><th style="width:60px">Visible</th><th>Bloque</th><th>Tamaño</th><th>Filas</th><th>Periodo</th></tr></thead><tbody>
      ${a.inicio.map((w, i) => `<tr><td class="nw"><button class="btn ch" title="Subir" ${i === 0 ? 'disabled' : ''} onclick="Aj.wMover(${i},-1)">↑</button> <button class="btn ch" title="Bajar" ${i === a.inicio.length - 1 ? 'disabled' : ''} onclick="Aj.wMover(${i},1)">↓</button></td>
        <td><input type="checkbox" ${w.on ? 'checked' : ''} onchange="Aj.wSet(${i},'on',this.checked)" aria-label="Visible"></td><td><b>${esc(WIDGETS[w.id] || w.id)}</b></td>
        <td><select onchange="Aj.wSet(${i},'ancho',this.value)" style="border-color:var(--bd)">${[[2, 'Un tercio'], [3, 'Mitad'], [4, 'Dos tercios'], [6, 'Ancho completo']].map(([v, n]) => `<option value="${v}" ${w.ancho === v ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
        <td>${w.id === 'frase' ? '<span class="mut">—</span>' : `<select onchange="Aj.wSet(${i},'filas',this.value)" style="border-color:var(--bd)">${[3, 5, 6, 8, 10, 12, 15, 20, 30].map(v => `<option ${w.filas === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`}</td>
        <td>${'dias' in w ? `<select onchange="Aj.wSet(${i},'dias',this.value)" style="border-color:var(--bd)">${(w.id === 'agenda' ? [[1, 'Sólo hoy'], [2, 'Hoy y mañana'], [3, '3 días'], [7, '7 días'], [14, '14 días']] : w.id === 'actividades' ? [[0, 'Todas las pendientes'], [1, 'Vencen hoy o mañana'], [7, 'Vencen en 7 días'], [14, 'Vencen en 14 días'], [30, 'Vencen en 30 días']] : [[7, '7 días'], [14, '14 días'], [30, '30 días'], [60, '60 días']]).map(([v, n]) => `<option value="${v}" ${w.dias === v ? 'selected' : ''}>${n}</option>`).join('')}</select>` : '<span class="mut">—</span>'}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="blq"><h3>Cómo funciona</h3><div class="cu d"><p>• El orden de la lista es el orden en pantalla (de izquierda a derecha y de arriba abajo). Los tamaños se acomodan en una rejilla: dos mitades, tres tercios o un tercio + dos tercios por renglón.</p>
      <p>• En Inicio, la barra superior filtra todos los bloques por <b>ámbito</b> (Trabajo, Escuela, Personal) y por <b>clasificación</b>.</p><p>• <a href="#/inicio">Ver Inicio</a></p></div></section>`;
  else if (t === 'catalogos') cuerpo = `
    <section class="blq"><h3>Estatus de proyectos y actividades <button class="lnk" onclick="Aj.estatus()">+ Agregar</button></h3>
      <ul class="filas">${S.estatus.map(e => `<li>${punto(e.color)}<span class="x clic" onclick="Aj.estatus('${e.id}')">${esc(e.nombre)}</span>${e.final ? '<span class="et">Final</span>' : ''}<span class="m">${S.proyectos.filter(p => p.estatus === e.id).length + S.actividades.filter(x => x.estatus === e.id).length} en uso</span></li>`).join('')}</ul></section>
    <section class="blq"><h3>Clasificaciones de actividades <button class="lnk" onclick="Aj.categoria()">+ Agregar</button></h3>
      ${S.categorias.length ? `<ul class="filas">${S.categorias.map(c => `<li>${punto(c.color)}<span class="x clic" onclick="Aj.categoria('${c.id}')">${esc(c.nombre)}</span><span class="m">${S.actividades.filter(x => x.categoria === c.id).length} actividades</span></li>`).join('')}</ul>` : vacio('Sin clasificaciones', '')}</section>
    <section class="blq"><h3>Escuela</h3><div class="cu"><div class="reng"><label for="ajMeta">Meta de calificación por defecto</label><input type="number" id="ajMeta" min="0" max="100" value="${a.metaEscolar}" onchange="Aj.numero('metaEscolar',this.value,0,100)" style="width:90px"><span class="d">Puntos; se puede cambiar por materia.</span></div></div></section>`;
  else if (t === 'datos') { const leg = Datos.legado(); cuerpo = `
    <section class="blq"><h3>Exportar</h3><div class="cu">
      <div class="reng"><label>Todo en CSV</label><button class="btn pri" onclick="Datos.exportarTodo()">Descargar ZIP con todos los CSV</button><span class="d">Un archivo CSV por tabla; se abre en Excel o Power BI.</span></div>
      <div class="reng"><label>Una tabla</label><select id="expTabla">${Datos.tablas().map(x => `<option value="${esc(x.nombre)}">${esc(x.nombre)} (${x.filas.length})</option>`).join('')}</select><button class="btn" onclick="Datos.exportarUna(document.getElementById('expTabla').value)">Descargar CSV</button></div>
      <div class="reng"><label>Respaldo completo</label><button class="btn" onclick="Datos.respaldo()">Descargar respaldo (.json)</button><span class="d">Incluye imágenes, ajustes y notas privadas (cifradas). Úsalo para pasar tus datos a otro equipo.</span></div></div></section>
    <section class="blq"><h3>Importar</h3><div class="cu">
      <div class="reng"><label>Respaldo completo</label><button class="btn" onclick="Datos.elegir('respaldo')">Restaurar respaldo (.json)</button><span class="d">Reemplaza todo el contenido actual.</span></div>
      ${Object.entries(LAYOUTS).map(([k, L]) => `<div class="reng"><label>${esc(L.t)}</label><button class="btn" onclick="Carga.abrir('${k}')">Carga masiva</button><button class="lnk" onclick="Carga.plantilla('${k}')">Plantilla</button><span class="d">${L.cols.map(c => c[0]).join(', ')}</span></div>`).join('')}
      <div class="reng"><label>Calendario</label><button class="btn" onclick="Datos.elegir('ics')">Importar .ics</button><span class="d">Archivo exportado de Outlook, Teams o Google Calendar.</span></div>
      <div class="reng"><label>Todas las plantillas</label><button class="btn" onclick="Carga.todas()">Descargar ZIP de plantillas</button><span class="d">Un CSV de ejemplo por tabla, con la descripción de cada columna.</span></div>
      ${leg.acad || leg.links ? `<div class="reng"><label>Datos de tus HTML anteriores</label>${leg.acad ? `<button class="btn" onclick="Datos.importarLegado('acad')">Traer AcadTrack (${leg.acad} actividades)</button>` : ''}${leg.links ? `<button class="btn" onclick="Datos.importarLegado('links')">Traer LinkManager (${leg.links} enlaces)</button>` : ''}<span class="d">Detectados en este navegador.</span></div>` : ''}</div></section>
    <section class="blq"><h3>Mantenimiento</h3><div class="cu">
      <div class="reng"><label>Datos de ejemplo</label><button class="btn" onclick="Datos.demo()">Cargar datos de ejemplo</button><span class="d">Para probar la plataforma. Se agregan a lo que ya tengas.</span></div>
      <div class="reng"><label>Borrar todo</label><button class="btn peligro" onclick="Datos.borrarTodo()">Borrar todos los datos</button><span class="d">Descarga antes un respaldo.</span></div>
      <div class="reng"><label>Almacenamiento</label><span class="d">${DB.idb ? 'IndexedDB de este navegador' : 'localStorage (sin imágenes)'} · ${Img.blobs.size} imagen(es) · ${(([...Img.blobs.values()].reduce((s, b) => s + b.size, 0)) / 1048576).toFixed(1)} MB. Los datos viven sólo en este equipo y navegador.</span></div></div></section>`; }
  else cuerpo = `
    <section class="blq"><h3>Notas privadas</h3><div class="cu">
      <p class="d" style="margin-bottom:10px">Cifrado AES-256 con clave derivada de tu contraseña (PBKDF2, 600 000 iteraciones). La contraseña no se almacena y no existe forma de recuperarla.</p>
      <div class="reng"><label>Estado</label><span>${!S.boveda ? 'Sin configurar' : Boveda.abierta() ? '<span class="verde">Desbloqueadas</span>' : 'Bloqueadas'} · ${S.notasPriv.length} nota(s)</span>
        ${!S.boveda ? '<button class="btn" onclick="UI.notas.f=\'priv\';App.ir(\'notas\')">Configurar</button>' : Boveda.abierta() ? '<button class="btn" onclick="Boveda.cerrar();App.pintar()">Bloquear ahora</button>' : '<button class="btn" onclick="UI.notas.f=\'priv\';App.ir(\'notas\')">Desbloquear</button>'}</div>
      ${S.boveda && Boveda.abierta() ? `<div class="reng"><label for="ncA">Nueva contraseña</label><input type="password" id="ncA" autocomplete="new-password"></div>
        <div class="reng"><label for="ncB">Repetir nueva contraseña</label><input type="password" id="ncB" autocomplete="new-password"><button class="btn" onclick="Aj.cambiarClave()">Cambiar contraseña</button></div>` : ''}</div></section>
    <section class="blq"><h3>Autodiagnóstico de seguridad <button class="lnk" onclick="App.pintar()">Volver a revisar</button></h3>
      <ul class="filas">${Seg.revisar().map(x => `<li><span class="et ${x.ok ? 'ac' : ''}" style="${x.ok ? '' : 'background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)'}">${x.ok ? 'Correcto' : 'Atención'}</span><span class="x" style="white-space:normal"><b>${esc(x.t)}</b> <span class="d">${esc(x.d)}</span></span></li>`).join('')}</ul></section>
    <section class="blq"><h3>Alcance de la protección</h3><div class="cu d">
      <p>• Sólo las notas privadas están cifradas. El resto de la información se guarda sin cifrar en este navegador.</p>
      <p>• Cualquier persona con acceso a tu sesión del equipo puede ver lo que no sea privado: bloquea tu equipo al ausentarte.</p>
      <p>• Las notas privadas no se incluyen en la exportación CSV; en el respaldo .json viajan cifradas.</p></div></section>`;
  return `${cab('Ajustes', '')}<div class="tabs">${[['apariencia', 'Apariencia'], ['inicio', 'Inicio'], ['catalogos', 'Catálogos'], ['datos', 'Datos'], ['seguridad', 'Seguridad']].map(([k, n]) => `<button class="${t === k ? 'on' : ''}" onclick="UI.aj.tab='${k}';App.pintar()">${n}</button>`).join('')}</div><div class="aj">${cuerpo}</div>`;
};

/* ==========================================================================
   DATOS
   ========================================================================== */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
/** Devuelve una función que busca columnas por nombre (sin importar acentos ni mayúsculas). */
function columnas(encabezado) { const h = encabezado.map(norm); return (...nombres) => { for (const n of nombres) { const i = h.indexOf(norm(n)); if (i >= 0) return i; } return -1; }; }
const celda = (f, i) => i >= 0 ? (f[i] || '').trim() : '';
/* ---------- Saneamiento de datos que vienen de fuera (respaldo, almacenamiento) ----------
   Un respaldo es un archivo y puede venir manipulado. Antes de usarlo se normaliza cada campo:
   identificadores sólo con letras/números, números como números, colores como #RRGGBB,
   fechas y horas con formato válido. Así ningún dato puede colarse como código en la pantalla. */
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/, HEX_OK = /^#[0-9a-fA-F]{6}$/, FECHA_OK = /^\d{4}-\d{2}-\d{2}$/, HORA_OK = /^\d{2}:\d{2}$/;
const CAMPO = {
  id: ['id', 'proyecto', 'categoria', 'estatus', 'materia', 'carpeta', 'img', 'ref', 'fondoImg', 'bandaImg', 'cat', 'temaId', 'origenId'],
  num: ['valor', 'calif', 'horas', 'avanceManual', 'dia', 'mes', 'anio', 'meta', 'ancho', 'filas', 'dias', 'fondoOp', 'metaEscolar', 'escala', 'avisoCumple', 'iter', 'v'],
  color: ['color', 'bg', 'sup', 'tx', 'mut', 'bd', 'ac', 'lat', 'oro'],
  listaId: ['ids', 'imgs'], fecha: ['inicio', 'objetivo', 'limite', 'entrega', 'completada'], fechaHora: ['fecha', 'creado', 'actualizado', 'avisado', 'editado'], hora: ['hora', 'horaIni', 'horaFin'],
  bool: ['on', 'final', 'fav', 'fijada', 'hecho']
};
function sanearValor(k, v) {
  if (CAMPO.id.includes(k)) return v == null || v === '' ? '' : (ID_OK.test(String(v)) ? String(v) : (k === 'id' ? uid() : ''));
  if (CAMPO.num.includes(k)) return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
  if (CAMPO.color.includes(k)) return HEX_OK.test(String(v)) ? String(v) : '#64748b';
  if (CAMPO.listaId.includes(k)) return Array.isArray(v) ? v.map(String).filter(x => ID_OK.test(x)).slice(0, 500) : [];
  if (CAMPO.fecha.includes(k)) return FECHA_OK.test(String(v)) && parseFecha(String(v)) ? String(v) : '';
  if (CAMPO.fechaHora.includes(k)) return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(String(v)) && parseFecha(String(v).slice(0, 10)) ? String(v) : '';
  if (CAMPO.hora.includes(k)) return HORA_OK.test(String(v)) ? String(v) : '';
  if (CAMPO.bool.includes(k)) return v === true;
  if (v == null) return '';
  return typeof v === 'object' ? '' : (typeof v === 'boolean' ? v : String(v).slice(0, 200000));   // textos: se escapan al mostrarse
}
const sanearObjeto = (o, anidado) => {
  const r = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return r;
  for (const [k, v] of Object.entries(o)) {
    if (['__proto__', 'constructor', 'prototype'].includes(k)) continue;
    r[k] = (anidado && v && typeof v === 'object' && !Array.isArray(v) && !CAMPO.listaId.includes(k)) ? sanearObjeto(v, true) : (anidado && Array.isArray(v) && !CAMPO.listaId.includes(k)) ? v.map(x => sanearObjeto(x, false)) : sanearValor(k, v);
  }
  return r;
};
function sanear(e) {
  const b = estadoVacio(), r = {};
  for (const k of Object.keys(b)) {
    if (Array.isArray(b[k])) r[k] = Array.isArray(e[k]) ? e[k].slice(0, 100000).filter(x => x && typeof x === 'object').map(x => sanearObjeto(x, false)) : b[k];
    else if (k === 'ajustes' || k === 'boveda') r[k] = e[k] && typeof e[k] === 'object' ? sanearObjeto(e[k], true) : b[k];
    else r[k] = b[k];
  }
  // Reglas por tabla: lo que no cumple se corrige o se descarta
  if (!r.estatus.some(x => x.final) || !r.estatus.some(x => !x.final)) r.estatus = b.estatus;
  const est = new Set(r.estatus.map(x => x.id)), e0 = r.estatus[0].id, pri = v => ['1', '2', '3', '4'].includes(String(v)) ? String(v) : '3';
  r.proyectos.forEach(p => { if (!est.has(p.estatus)) p.estatus = e0; p.prioridad = pri(p.prioridad); if (!AMBITOS.includes(p.ambito)) p.ambito = 'Trabajo'; p.avanceManual = Math.min(100, Math.max(0, p.avanceManual || 0)); });
  r.actividades.forEach(a => { if (!est.has(a.estatus)) a.estatus = e0; a.prioridad = pri(a.prioridad); });
  r.escolares = r.escolares.filter(x => x.entrega && x.materia); r.escolares.forEach(x => { if (!EST_ESC.some(y => y[0] === x.estatus)) x.estatus = 'pendiente'; x.valor = Math.max(0, x.valor || 0); if (!x.inicio) x.inicio = x.entrega; });
  r.eventos = r.eventos.filter(x => FECHA_OK.test(x.fecha)); r.recordatorios = r.recordatorios.filter(x => FECHA_OK.test(x.fecha));
  r.recordatorios.forEach(x => { if (!['', 'diario', 'semanal', 'mensual', 'anual'].includes(x.repetir)) x.repetir = ''; });
  r.cumples = r.cumples.filter(c => c.dia >= 1 && c.dia <= 31 && c.mes >= 1 && c.mes <= 12);
  r.bitacora = r.bitacora.filter(x => x.fecha && x.proyecto); r.notasPriv = r.notasPriv.filter(x => x.id && typeof x.iv === 'string' && typeof x.ct === 'string');
  r.enlaces.forEach(l => { l.url = urlSegura(l.url); }); r.enlaces = r.enlaces.filter(l => l.url);
  if (r.boveda && (typeof r.boveda.sal !== 'string' || !r.boveda.prueba)) r.boveda = null;
  if (r.boveda) r.boveda.iter = Math.min(2000000, Math.max(100000, r.boveda.iter || 250000));
  const a = r.ajustes; a.escala = [85, 92, 100, 110, 125].includes(a.escala) ? a.escala : 100; a.fondoOp = Math.min(45, Math.max(4, a.fondoOp || 14)); a.metaEscolar = Math.min(100, Math.max(0, a.metaEscolar ?? 60));
  if (Array.isArray(a.inicio)) a.inicio = a.inicio.filter(w => Object.hasOwn(WIDGETS, w.id)).map(w => { const d = inicioDefecto().find(x => x.id === w.id); return { id: w.id, on: w.on === true, ancho: [2, 3, 4, 6].includes(w.ancho) ? w.ancho : d.ancho, filas: w.id === 'frase' ? 0 : Math.min(50, Math.max(1, w.filas || d.filas)), ...('dias' in d ? { dias: Math.min(366, Math.max(0, w.dias ?? d.dias)) } : {}) }; });
  if (a.tema && !Object.hasOwn(TEMAS, a.temaId) && a.temaId !== 'personal') a.temaId = 'personal';
  return r;
}

function fusionar(original) {
  const e = sanear(original && typeof original === 'object' ? original : {});
  const b = estadoVacio(), r = { ...b, ...e }, ae = (original && original.ajustes && typeof original.ajustes === 'object') ? e.ajustes : {};
  r.ajustes = { ...b.ajustes, ...ae, tema: { ...b.ajustes.tema, ...(ae.tema || {}) }, inicioFiltro: { ...b.ajustes.inicioFiltro, ...(ae.inicioFiltro || {}) } };
  // Versiones anteriores (sin barra lateral de color): adoptan la identidad Nova
  if (!ae.tema || !ae.tema.lat) { r.ajustes.temaId = 'nova'; r.ajustes.tema = temaDe('nova'); if (!ae.nombre || ae.nombre === 'Plataforma de Gestión') r.ajustes.nombre = b.ajustes.nombre; }
  // Bloques de Inicio: se conservan los guardados y se agregan los que falten
  const ini = Array.isArray(ae.inicio) ? ae.inicio.filter(w => WIDGETS[w.id]) : [];
  for (const w of inicioDefecto()) if (!ini.some(x => x.id === w.id)) ini.push(w);
  r.ajustes.inicio = ini;
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
      { nombre: 'frases.csv', enc: ['Frase', 'Autor', 'TieneImagen'], filas: S.frases.map(f => [f.texto, f.autor, f.img ? 'SI' : 'NO']) },
      { nombre: 'historial_estatus.csv', enc: ['FechaHora', 'Tipo', 'Registro', 'Proyecto', 'EstatusAnterior', 'EstatusNuevo'], filas: S.historial.map(h => [h.fecha, h.lista, h.titulo, nom('proyectos', h.proyecto), h.de, h.a]) }
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
    S.ajustes.ultimoRespaldo = ahoraTxt(); guardar(); toast('Respaldo descargado'); if (App.vista === 'ajustes') App.pintar();
  },

  /* ---------- Importación ---------- */
  _tipo: null,
  elegir(tipo) { this._tipo = tipo; const i = $('#archivo'); i.value = ''; i.accept = tipo === 'respaldo' ? '.json' : tipo === 'ics' ? '.ics' : '.csv,.txt'; i.click(); },
  async archivo(input) {
    const a = input.files[0]; if (!a) return;
    if (a.size > (this._tipo === 'respaldo' ? 400 : 10) * 1048576) return toast(`El archivo es demasiado grande (máximo ${this._tipo === 'respaldo' ? 400 : 10} MB)`, 'err');
    try {
      const texto = await a.text(), tipo = this._tipo;
      if (tipo === 'respaldo') return this.restaurar(texto);
      const r = tipo === 'ics' ? this.leerICS(texto) : this['leer_' + tipo](parseCSV(texto));
      if (!r.n) return toast(`No se encontraron filas válidas${r.omitidas ? ` (${r.omitidas} omitidas)` : ''}. Revisa el formato del archivo.`, 'err');
      confirmar(`Se importarán ${r.n} registro(s).${r.omitidas ? ` Se omitirán ${r.omitidas} fila(s) por datos inválidos o duplicados.` : ''}${r.nota ? ' ' + r.nota : ''} ¿Continuar?`, () => { r.aplicar(); guardar(); Modal.cerrar(); App.pintar(); toast(`${r.n} registro(s) importado(s)`); }, 'Importar');
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
    const col = columnas(filas[0] || []), iT = col('titulo', 'actividad'), iP = col('proyecto'), iC = col('clasificacion', 'categoria'), iE = col('estatus', 'estado'), iPr = col('prioridad'), iI = col('fechainicio', 'inicio'), iL = col('fechalimite', 'limite', 'fechaentrega'), iH = col('horas'), iD = col('detalle', 'descripcion'), iHo = col('hora'), iCk = col('checklist');
    if (iT < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0;
    for (const f of filas.slice(1)) {
      const titulo = celda(f, iT), inicio = parseFecha(celda(f, iI)), limite = parseFecha(celda(f, iL));
      const repetida = S.actividades.some(x => norm(x.titulo) === norm(titulo) && (x.limite || '') === limite && norm((por('proyectos', x.proyecto) || {}).nombre) === norm(celda(f, iP)));
      if (!titulo || repetida || (celda(f, iL) && !limite) || (inicio && limite && limite < inicio)) { omitidas++; continue; }
      lista.push({ titulo, proyecto: celda(f, iP), categoria: celda(f, iC), estatus: celda(f, iE), prioridad: celda(f, iPr), inicio, limite, horas: Number(celda(f, iH).replace(',', '.')) || null, detalle: celda(f, iD), hora: parseHora(celda(f, iHo)), checklist: celda(f, iCk).split('|').map(x => x.trim()).filter(Boolean).join('\n') });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => {
      let p = x.proyecto && S.proyectos.find(y => norm(y.nombre) === norm(x.proyecto));
      if (x.proyecto && !p) { p = { id: uid(), nombre: x.proyecto, ambito: 'Trabajo', estatus: idInicial(), prioridad: '3', creado: hoyISO(), inicio: '', objetivo: '', asignadoPor: '', descripcion: '' }; S.proyectos.push(p); }
      let c = x.categoria && S.categorias.find(y => norm(y.nombre) === norm(x.categoria));
      if (x.categoria && !c) { c = { id: uid(), nombre: x.categoria, color: PALETA[S.categorias.length % PALETA.length] }; S.categorias.push(c); }
      const e = S.estatus.find(y => norm(y.nombre) === norm(x.estatus)) || S.estatus[0], pr = (PRIORIDADES.find(y => norm(y[1]) === norm(x.prioridad)) || ['3'])[0];
      const a = { id: uid(), creado: hoyISO(), titulo: x.titulo, proyecto: p ? p.id : '', categoria: c ? c.id : '', estatus: e.id, prioridad: pr, inicio: x.inicio, limite: x.limite, hora: x.hora, horas: x.horas, detalle: x.detalle, checklist: x.checklist, completada: e.final ? hoyISO() : '' };
      regEstatus('actividades', a, '', a.estatus); S.actividades.push(a);
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

/* ==========================================================================
   CARGA MASIVA: layout (columnas) de cada tabla, plantillas con ejemplos y lectura
   ========================================================================== */
const parseHora = t => { const r = String(t || '').trim().match(/^(\d{1,2})[:.](\d{2})/); return r && +r[1] < 24 && +r[2] < 60 ? `${p2(+r[1])}:${r[2]}` : ''; };
const LAYOUTS = {
  proyectos: { t: 'Proyectos', cols: [['Nombre', 1, 'Texto. No se repite.'], ['Ambito', 0, 'Trabajo, Escuela o Personal'], ['Estatus', 0, 'Nombre de un estatus del catálogo'], ['Prioridad', 0, 'Urgente, Alta, Media o Baja'], ['AsignadoPor', 0, 'Texto'], ['FechaInicio', 0, 'dd/mm/aaaa'], ['FechaObjetivo', 0, 'dd/mm/aaaa; no anterior al inicio'], ['Descripcion', 0, 'Texto']],
    ej: d => [['Migración de reportes a Power BI', 'Trabajo', 'En curso', 'Alta', 'Gerencia de operaciones', d(0), d(45), 'Sustituir reportes de Excel por tableros'], ['Curso de SQL avanzado', 'Personal', 'Pendiente', 'Media', '', d(7), d(60), '']] },
  actividades: { t: 'Actividades', cols: [['Titulo', 1, 'Texto'], ['Proyecto', 0, 'Nombre del proyecto; vacío = actividad del área. Si no existe, se crea.'], ['Clasificacion', 0, 'Nombre de la clasificación; si no existe, se crea'], ['Estatus', 0, 'Nombre de un estatus del catálogo'], ['Prioridad', 0, 'Urgente, Alta, Media o Baja'], ['FechaInicio', 0, 'dd/mm/aaaa'], ['FechaLimite', 0, 'dd/mm/aaaa'], ['Hora', 0, 'hh:mm (24 h)'], ['Horas', 0, 'Horas estimadas, número'], ['Detalle', 0, 'Texto'], ['Checklist', 0, 'Elementos separados por | ']],
    ej: d => [['Preparar reporte mensual', '', 'Reportes', 'Pendiente', 'Alta', d(0), d(3), '12:00', '2', 'Incluir comparativo', 'Extraer datos | Validar cifras | Enviar'], ['Diseñar modelo de datos', 'Migración de reportes a Power BI', '', 'En curso', 'Media', d(1), d(10), '', '6', '', '']] },
  materias: { t: 'Materias', cols: [['Materia', 1, 'Texto. No se repite.'], ['Profesor', 0, 'Texto'], ['Ciclo', 0, 'Texto, p. ej. 2026-B'], ['Color', 0, 'Hexadecimal #RRGGBB'], ['Meta', 0, 'Puntos que quieres alcanzar (0–100)']],
    ej: () => [['Programación Web', 'Mtra. Laura Gómez', '2026-B', '#0B84F3', '85'], ['Bases de Datos', 'Mtro. Jorge Pérez', '2026-B', '#19C3C8', '80']] },
  escolares: { t: 'Actividades escolares', cols: [['Materia', 1, 'Nombre de la materia; si no existe, se crea'], ['Actividad', 1, 'Texto'], ['Tipo', 0, TIPOS_ESC.join(', ')], ['Valor', 0, 'Puntos (número)'], ['FechaInicio', 0, 'dd/mm/aaaa'], ['FechaEntrega', 1, 'dd/mm/aaaa; no anterior al inicio'], ['Estado', 0, 'Pendiente, En proceso, Guardada, Enviada o Calificada'], ['Calificacion', 0, 'Puntos obtenidos; vacío si no está calificada']],
    nota: 'Es el mismo formato que exporta AcadTrack.',
    ej: d => [['Programación Web', 'Act. 1.1 El desarrollo web hoy', 'Buzón', '5', d(-10), d(-5), 'Calificada', '5'], ['Programación Web', 'Integradora 1', 'Buzón', '15', d(0), d(8), 'Pendiente', ''], ['Bases de Datos', 'Examen parcial', 'Examen', '25', d(5), d(12), 'Pendiente', '']] },
  eventos: { t: 'Agenda (eventos)', cols: [['Evento', 1, 'Texto'], ['Fecha', 1, 'dd/mm/aaaa'], ['HoraInicio', 0, 'hh:mm (24 h)'], ['HoraFin', 0, 'hh:mm; no anterior al inicio'], ['Tipo', 0, 'Reunión, Revisión, Clase, Personal u Otro'], ['Proyecto', 0, 'Nombre de un proyecto existente'], ['Lugar', 0, 'Texto o enlace'], ['Notas', 0, 'Texto']],
    nota: 'También puedes importar un calendario .ics exportado de Outlook, Teams o Google Calendar.',
    ej: d => [['Revisión de avance', d(1), '10:00', '11:00', 'Revisión', '', 'Teams', ''], ['Junta de área', d(4), '09:30', '11:00', 'Reunión', '', 'Sala 2', 'Llevar indicadores']] },
  recordatorios: { t: 'Recordatorios', cols: [['Recordatorio', 1, 'Texto'], ['Fecha', 1, 'dd/mm/aaaa'], ['Hora', 0, 'hh:mm (24 h)'], ['Repeticion', 0, 'Vacío, Diario, Semanal, Mensual o Anual']],
    ej: d => [['Enviar reporte semanal', d(2), '17:00', 'Semanal'], ['Renovar licencia de software', d(20), '10:00', '']] },
  notas: { t: 'Notas', cols: [['Titulo', 0, 'Texto (título o texto es obligatorio)'], ['Texto', 0, 'Contenido de la nota'], ['Proyecto', 0, 'Nombre de un proyecto existente; vacío = sin clasificar'], ['Etiquetas', 0, 'Separadas por coma']],
    ej: () => [['Ideas para la junta', 'Proponer tablero único de pendientes', '', 'junta, ideas'], ['Pendiente con proveedor', 'Enviar cotización antes del viernes', '', '']] },
  enlaces: { t: 'Accesos directos', cols: [['Nombre', 1, 'Texto'], ['URL', 1, 'Dirección http(s). No se repite.'], ['Carpeta', 0, 'Nombre de carpeta; si no existe, se crea'], ['Descripcion', 0, 'Texto'], ['Favorito', 0, 'SI o NO'], ['Tags', 0, 'Etiquetas separadas por ;']],
    nota: 'Es el mismo formato que exporta LinkManager.',
    ej: () => [['Outlook', 'https://outlook.office.com', 'Trabajo', 'Correo', 'SI', 'correo;diario'], ['Power BI', 'https://app.powerbi.com', 'Trabajo', '', 'NO', 'reportes']] },
  cumples: { t: 'Cumpleaños', cols: [['Nombre', 1, 'Texto. No se repite.'], ['Fecha', 1, 'dd/mm/aaaa, o dd/mm si no sabes el año'], ['Relacion', 0, 'Familia, Amigos, Trabajo…'], ['Nota', 0, 'Texto']],
    ej: () => [['Ana Ramírez', '11/11/1996', 'Amigos', 'Le gustan los libros'], ['Luis Mendoza', '15/11', 'Trabajo', '']] },
  frases: { t: 'Frases del día', cols: [['Frase', 1, 'Texto. No se repite.'], ['Autor', 0, 'Texto']],
    nota: 'Las imágenes se cargan con el botón “Subir varias imágenes”.',
    ej: () => [['Primero funcionalidad, después complejidad.', ''], ['Lo que no se mide no se puede mejorar.', 'Peter Drucker']] }
};
const Carga = {
  csv(tipo) { const L = LAYOUTS[tipo], d = n => aDMY(sumaDias(hoyISO(), n)); return csvTexto(L.cols.map(c => c[0]), L.ej(d)); },
  abrir(tipo) {
    const L = LAYOUTS[tipo];
    Modal.abrir(`<div class="form"><h2>Carga masiva · ${esc(L.t)}</h2><div class="campos" style="display:block">
      <p class="d" style="margin-bottom:10px"><b>1.</b> Descarga la plantilla con ejemplos. <b>2.</b> Llénala en Excel y guárdala como <b>CSV UTF-8 (delimitado por comas)</b>. <b>3.</b> Elige el archivo: antes de guardar verás cuántas filas son válidas y cuántas se omiten.</p>
      <div class="panel scrollx"><table class="lista"><thead><tr><th>Columna</th><th>Obligatoria</th><th>Formato / regla</th></tr></thead><tbody>
        ${L.cols.map(([n, req, f]) => `<tr><td><b>${esc(n)}</b></td><td>${req ? '<span class="et ac">Sí</span>' : '<span class="mut">No</span>'}</td><td class="d">${esc(f)}</td></tr>`).join('')}</tbody></table></div>
      <p class="d" style="margin-top:10px">El orden de las columnas no importa; se reconocen por su nombre (sin distinguir acentos ni mayúsculas). Los registros repetidos se omiten.${L.nota ? ' ' + esc(L.nota) : ''}</p></div>
      <div class="acciones"><button class="btn" onclick="Carga.plantilla('${tipo}')">Descargar plantilla con ejemplos</button>${tipo === 'eventos' ? '<button class="btn" onclick="Datos.elegir(\'ics\')">Importar .ics</button>' : ''}
        <span class="esp"></span><button class="btn" onclick="Modal.cerrar()">Cerrar</button><button class="btn pri" onclick="Datos.elegir('${tipo}')">Elegir archivo CSV…</button></div></div>`, 720);
  },
  plantilla(tipo) { descargar(`plantilla_${tipo}.csv`, new Blob([this.csv(tipo)], { type: 'text/csv;charset=utf-8' })); toast('Plantilla descargada'); },
  todas() {
    const arch = Object.keys(LAYOUTS).map(t => ({ nombre: `plantilla_${t}.csv`, texto: this.csv(t) }));
    arch.push({ nombre: 'LEEME.txt', texto: 'Plantillas de carga masiva de ' + S.ajustes.nombre + '\r\n\r\n' + Object.entries(LAYOUTS).map(([k, L]) => `plantilla_${k}.csv — ${L.t}\r\n` + L.cols.map(([n, r, f]) => `   ${n}${r ? ' (obligatoria)' : ''}: ${f}`).join('\r\n')).join('\r\n\r\n') + '\r\n\r\nGuarda cada archivo como CSV UTF-8 (delimitado por comas). Fechas en dd/mm/aaaa.\r\n' });
    descargar('plantillas_carga_masiva.zip', crearZip(arch)); toast('Plantillas descargadas');
  }
};
Object.assign(Datos, {
  leer_proyectos(filas) {
    const col = columnas(filas[0] || []), iN = col('nombre', 'proyecto'); if (iN < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0; const vistos = new Set(S.proyectos.map(p => norm(p.nombre)));
    for (const f of filas.slice(1)) {
      const nombre = celda(f, iN), ti = celda(f, col('fechainicio', 'inicio')), to = celda(f, col('fechaobjetivo', 'objetivo')), inicio = parseFecha(ti), objetivo = parseFecha(to);
      if (!nombre || vistos.has(norm(nombre)) || (ti && !inicio) || (to && !objetivo) || (inicio && objetivo && objetivo < inicio)) { omitidas++; continue; } vistos.add(norm(nombre));
      const amb = AMBITOS.find(a => norm(a) === norm(celda(f, col('ambito')))) || 'Trabajo';
      lista.push({ nombre, ambito: amb, est: celda(f, col('estatus', 'estado')), pri: celda(f, col('prioridad')), asignadoPor: celda(f, col('asignadopor')), inicio, objetivo, descripcion: celda(f, col('descripcion')) });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(({ est, pri, ...x }) => {
      const p = { id: uid(), creado: hoyISO(), ...x, estatus: (S.estatus.find(e => norm(e.nombre) === norm(est)) || S.estatus[0]).id, prioridad: (PRIORIDADES.find(y => norm(y[1]) === norm(pri)) || ['3'])[0] };
      regEstatus('proyectos', p, '', p.estatus); S.proyectos.push(p); }) };
  },
  leer_materias(filas) {
    const col = columnas(filas[0] || []), iN = col('materia', 'nombre'); if (iN < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0; const vistos = new Set(S.materias.map(m => norm(m.nombre)));
    for (const f of filas.slice(1)) {
      const nombre = celda(f, iN); if (!nombre || vistos.has(norm(nombre))) { omitidas++; continue; } vistos.add(norm(nombre));
      const color = celda(f, col('color')), meta = Number(celda(f, col('meta')));
      lista.push({ nombre, profesor: celda(f, col('profesor')), ciclo: celda(f, col('ciclo')), color: /^#[0-9a-f]{6}$/i.test(color) ? color : '', meta: meta > 0 && meta <= 100 ? meta : S.ajustes.metaEscolar });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.materias.push({ id: uid(), ...x, color: x.color || PALETA[S.materias.length % PALETA.length] })) };
  },
  leer_eventos(filas) {
    const col = columnas(filas[0] || []), iT = col('evento', 'titulo'), iF = col('fecha'); if (iT < 0 || iF < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0;
    for (const f of filas.slice(1)) {
      const titulo = celda(f, iT), fecha = parseFecha(celda(f, iF)), horaIni = parseHora(celda(f, col('horainicio', 'hora'))), horaFin = parseHora(celda(f, col('horafin')));
      if (!titulo || !fecha || (horaIni && horaFin && horaFin < horaIni) || S.eventos.some(e => e.fecha === fecha && norm(e.titulo) === norm(titulo) && (e.horaIni || '') === horaIni)) { omitidas++; continue; }
      const p = S.proyectos.find(y => norm(y.nombre) === norm(celda(f, col('proyecto'))));
      lista.push({ titulo, fecha, horaIni, horaFin, tipo: Agenda.TIPOS.find(t => norm(t) === norm(celda(f, col('tipo')))) || 'Reunión', proyecto: p ? p.id : '', lugar: celda(f, col('lugar')), nota: celda(f, col('notas', 'nota')), origen: 'csv' });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.eventos.push({ id: uid(), ...x })) };
  },
  leer_recordatorios(filas) {
    const col = columnas(filas[0] || []), iT = col('recordatorio', 'texto'), iF = col('fecha'); if (iT < 0 || iF < 0) return { n: 0, omitidas: filas.length };
    const REP = { diario: 'diario', cadadia: 'diario', semanal: 'semanal', cadasemana: 'semanal', mensual: 'mensual', cadames: 'mensual', anual: 'anual', cadaano: 'anual' };
    const lista = []; let omitidas = 0;
    for (const f of filas.slice(1)) {
      const texto = celda(f, iT), fecha = parseFecha(celda(f, iF));
      if (!texto || !fecha || S.recordatorios.some(r => r.fecha === fecha && norm(r.texto) === norm(texto))) { omitidas++; continue; }
      lista.push({ texto, fecha, hora: parseHora(celda(f, col('hora'))), repetir: REP[norm(celda(f, col('repeticion', 'repetir')))] || '', hecho: false, avisado: '' });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.recordatorios.push({ id: uid(), ...x })) };
  },
  leer_notas(filas) {
    const col = columnas(filas[0] || []), iT = col('titulo'), iX = col('texto', 'contenido', 'nota'); if (iT < 0 && iX < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0;
    for (const f of filas.slice(1)) {
      const titulo = celda(f, iT), texto = celda(f, iX);
      if ((!titulo && !texto) || S.notas.some(n => norm(n.titulo) === norm(titulo) && norm(n.texto) === norm(texto))) { omitidas++; continue; }
      const p = S.proyectos.find(y => norm(y.nombre) === norm(celda(f, col('proyecto'))));
      lista.push({ titulo, texto, proyecto: p ? p.id : '', etiquetas: celda(f, col('etiquetas', 'tags')), fijada: false, creado: ahoraTxt(), actualizado: ahoraTxt() });
    }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.notas.push({ id: uid(), ...x })) };
  },
  leer_frases(filas) {
    const col = columnas(filas[0] || []), iT = col('frase', 'texto'); if (iT < 0) return { n: 0, omitidas: filas.length };
    const lista = []; let omitidas = 0; const vistos = new Set(S.frases.map(x => norm(x.texto)));
    for (const f of filas.slice(1)) { const texto = celda(f, iT); if (!texto || vistos.has(norm(texto))) { omitidas++; continue; } vistos.add(norm(texto)); lista.push({ texto, autor: celda(f, col('autor')), img: null }); }
    return { n: lista.length, omitidas, aplicar: () => lista.forEach(x => S.frases.push({ id: uid(), ...x })) };
  }
});


/* ==========================================================================
   AUTODIAGNÓSTICO: comprobaciones que la propia página hace en el navegador
   ========================================================================== */
const Seg = {
  revisar() {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    // Recursos que el navegador realmente pidió a otros servidores durante esta sesión
    const externos = [...new Set(performance.getEntriesByType('resource').map(r => r.name).filter(u => /^https?:/i.test(u) && !u.startsWith(location.origin + '/')))];
    const ur = S.ajustes.ultimoRespaldo, dias = ur ? difDias(String(ur).slice(0, 10), hoyISO()) : null;
    return [
      { ok: !!csp, t: 'Política de seguridad de contenido (CSP)', d: csp ? 'Activa: la página no puede cargar ni enviar información a otros servidores.' : 'No se encontró. Vuelve a generar el HTML con construir.js.' },
      { ok: externos.length === 0, t: 'Conexiones externas en esta sesión', d: externos.length ? 'Se detectaron: ' + externos.join(', ') : 'Ninguna. Todo se ejecuta dentro de este archivo.' },
      { ok: window.isSecureContext, t: 'Contexto seguro (HTTPS o archivo local)', d: window.isSecureContext ? location.protocol.replace(':', '').toUpperCase() : 'La página se abrió por HTTP sin cifrar; el cifrado de notas privadas no está disponible.' },
      { ok: Boveda.disponible(), t: 'Cifrado disponible para notas privadas', d: Boveda.disponible() ? (S.boveda ? `Configurado · ${(S.boveda.iter || 250000).toLocaleString('es-MX')} iteraciones${(S.boveda.iter || 250000) < Boveda.ITER ? ' (cambia tu contraseña para subir a ' + Boveda.ITER.toLocaleString('es-MX') + ')' : ''}` : 'Disponible; aún no has creado tu contraseña.') : 'No disponible en este navegador.' },
      { ok: window.top === window.self, t: 'Página no incrustada en otro sitio', d: window.top === window.self ? 'Se muestra en su propia pestaña.' : 'Está dentro de un marco (normal si la abres como pestaña de Teams). Verifica que la dirección sea la tuya.' },
      { ok: DB.idb, t: 'Almacenamiento', d: DB.idb ? 'IndexedDB de este navegador (sin cifrar, salvo las notas privadas).' : 'Modo limitado (localStorage): no se pueden guardar imágenes.' },
      { ok: dias != null && dias <= 7, t: 'Respaldo reciente', d: ur ? `Último respaldo: ${ur} (hace ${dias} día${dias === 1 ? '' : 's'}).` : 'Aún no has descargado un respaldo desde este navegador.' }
    ];
  }
};
