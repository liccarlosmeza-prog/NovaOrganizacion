'use strict';
/* ==========================================================================
   APP (navegación) + INICIO + PROYECTOS + ACTIVIDADES
   ========================================================================== */

/** Filtros y pestañas activas de cada pantalla (no se guardan). */
const UI = {
  proy: { f: 'activos', amb: '', tab: 'actividades' },
  act: { f: 'pendientes', proy: '', cat: '' },
  esc: { tab: 'lista', mat: '', est: '', rango: 'mes', mes: hoyISO().slice(0, 7) },
  ag: { mes: hoyISO().slice(0, 7), dia: hoyISO(), modo: 'mes' },
  notas: { f: 'todas', id: null, q: '' },
  acc: { f: 'todos', q: '', sel: new Set() },
  aj: { tab: 'apariencia' },
  fraseSalto: 0
};

const Vistas = {};   // cada pantalla registra aquí su función: () => html
const App = {
  vista: 'inicio', param: null,
  NAV: [['inicio', 'Inicio'], ['proyectos', 'Proyectos'], ['actividades', 'Actividades'], ['escuela', 'Escuela'], ['agenda', 'Agenda'],
        ['recordatorios', 'Recordatorios'], ['notas', 'Notas'], ['accesos', 'Accesos directos'], ['cumples', 'Cumpleaños'], ['frases', 'Frases del día'], null, ['ajustes', 'Ajustes']],
  ir(v, p) { const h = '#/' + v + (p ? '/' + p : ''); if (location.hash === h) this.ruta(); else location.hash = h; },
  ruta() {
    const [, v, p] = location.hash.split('/');
    this.vista = Vistas[v] ? v : 'inicio'; this.param = p || null; this.pintar(true);
  },
  contadores() {
    const hoy = hoyISO();
    return {
      actividades: S.actividades.filter(a => !estFinal(a.estatus)).length || '',
      recordatorios: S.recordatorios.filter(r => !r.hecho && r.fecha <= hoy).length || '',
      escuela: S.escolares.filter(e => e.tipo !== 'Vacaciones' && ['pendiente', 'proceso'].includes(e.estatus) && e.entrega >= hoy && difDias(hoy, e.entrega) <= 7).length || ''
    };
  },
  pintar(arriba) {
    const c = this.contadores(), base = this.vista === 'proyecto' ? 'proyectos' : this.vista;
    $('#lat').innerHTML = `<div class="marca">${esc(S.ajustes.nombre)}<small>${esc(may(fFechaLarga(hoyISO())))}</small></div>
      <nav>${this.NAV.map(n => n ? `<a href="#/${n[0]}" class="${n[0] === base ? 'on' : ''}">${esc(n[1])}${c[n[0]] ? `<span class="n">${c[n[0]]}</span>` : ''}</a>` : '<hr>').join('')}</nav>
      <div class="pie"><i></i><span>Guardado en este equipo</span></div>`;
    const banda = Img.url(S.ajustes.bandaImg);
    const pral = $('#pral'), y = pral.scrollTop;
    pral.innerHTML = (banda ? `<div class="banda" style="background-image:url('${banda}')"></div>` : '') + `<div class="cont">${Vistas[this.vista]()}</div>`;
    pral.scrollTop = arriba ? 0 : y;
    const tl = $('#tl'); if (tl && tl.dataset.hoy) tl.scrollLeft = Math.max(0, +tl.dataset.hoy - 260);
  }
};

/* ---------- Piezas reutilizables ---------- */
const cab = (titulo, sub, botones = '') => `<div class="cab"><h1>${esc(titulo)}</h1><span class="sub">${esc(sub || '')}</span><span class="esp"></span>${botones}</div>`;
const vacio = (titulo, texto) => `<div class="vacio"><b>${esc(titulo)}</b>${esc(texto || '')}</div>`;
const punto = color => `<i class="pt" style="background:${esc(color || '#94a3b8')}"></i>`;
const filtro = (obj, clave, opciones) => `<div class="fil">${opciones.map(([v, t]) => `<button class="${UI[obj][clave] === v ? 'on' : ''}" onclick="UI.${obj}.${clave}='${v}';App.pintar()">${esc(t)}</button>`).join('')}</div>`;
const selEstatus = (lista, id, valor) => `<select onchange="cambiarEstatus('${lista}','${id}',this.value)" aria-label="Estatus">${S.estatus.map(e => `<option value="${e.id}" ${e.id === valor ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select>`;
const fechaLim = (iso, cerrada) => { if (!iso) return '<span class="mut">—</span>'; const n = difDias(hoyISO(), iso); return `<span class="${cerrada ? 'mut' : n < 0 ? 'rojo' : n <= 1 ? 'ambar' : ''}" title="${esc(fFecha(iso))}">${esc(fRel(iso))}</span>`; };
function cambiarEstatus(lista, id, valor) {
  const o = por(lista, id); if (!o) return; o.estatus = valor;
  if (lista === 'actividades') o.completada = estFinal(valor) ? (o.completada || hoyISO()) : '';
  guardar(); App.pintar();
}

/* ==========================================================================
   INICIO
   ========================================================================== */
function fraseDelDia() {
  if (!S.frases.length) return null;
  const dia = Math.floor(deISO(hoyISO()).getTime() / 864e5);   // cambia cada día, siempre igual durante el día
  return S.frases[(dia + UI.fraseSalto) % S.frases.length];
}
Vistas.inicio = () => {
  const hoy = hoyISO(), f = fraseDelDia(), u = f ? Img.url(f.img) : '';
  const hora = new Date().getHours(), saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const agenda = Agenda.items(hoy);
  const pend = S.actividades.filter(a => !estFinal(a.estatus) && a.limite && difDias(hoy, a.limite) <= 7).sort((a, b) => a.limite.localeCompare(b.limite)).slice(0, 8);
  const entregas = S.escolares.filter(e => e.tipo !== 'Vacaciones' && !['enviada', 'calificada'].includes(e.estatus) && e.entrega && difDias(hoy, e.entrega) <= 14).sort((a, b) => a.entrega.localeCompare(b.entrega)).slice(0, 8);
  const cumples = Cumples.proximos().filter(c => c.faltan <= 30).slice(0, 6);
  const favs = S.enlaces.filter(l => l.fav).slice(0, 12);
  const proys = S.proyectos.filter(p => !estFinal(p.estatus)).slice(0, 6);
  const li = (h, x, m, clic) => `<li><span class="h">${esc(h)}</span><span class="x ${clic ? 'clic' : ''}" ${clic ? `onclick="${clic}"` : ''}>${x}</span><span class="m">${m}</span></li>`;
  return `${cab(`${saludo}${S.ajustes.usuario ? ', ' + S.ajustes.usuario : ''}`, may(fFechaLarga(hoy)))}
  ${f ? `<section class="frase ${u ? 'img' : ''}" ${u ? `style="background-image:url('${u}')"` : ''}>
      <div class="ctl">${S.frases.length > 1 ? '<button class="lnk" onclick="UI.fraseSalto++;App.pintar()">Otra</button>' : ''}<a class="lnk" href="#/frases">Administrar</a></div>
      <div class="tx">${f.texto ? `<p>${esc(f.texto)}</p>` : ''}${f.autor ? `<span>— ${esc(f.autor)}</span>` : ''}</div></section>`
     : `<section class="frase"><div class="tx"><p>Agrega tus frases del día</p><span>Sube imágenes o textos y verás uno diferente cada día. <a href="#/frases">Agregar</a></span></div></section>`}
  <div class="cols">
    <section class="blq"><h3>Agenda de hoy <a class="lnk" href="#/agenda">Ver agenda</a></h3>
      ${agenda.length ? `<ul class="filas">${agenda.map(i => li(i.hora || '', punto(i.color) + esc(i.titulo), esc(i.tipo))).join('')}</ul>` : vacio('Sin eventos hoy', '')}</section>
    <section class="blq"><h3>Actividades por atender <a class="lnk" href="#/actividades">Ver todas</a></h3>
      ${pend.length ? `<ul class="filas">${pend.map(a => `<li><input type="checkbox" title="Marcar como terminada" onchange="cambiarEstatus('actividades','${a.id}','${idFinal()}')">
        <span class="x clic" onclick="Act.editar('${a.id}')">${esc(a.titulo)}</span><span class="m">${esc(Act.origen(a))}</span><span class="m">${fechaLim(a.limite)}</span></li>`).join('')}</ul>` : vacio('Nada urgente', 'No hay actividades que venzan en los próximos 7 días.')}</section>
    <section class="blq"><h3>Entregas escolares (14 días) <a class="lnk" href="#/escuela">Ver escuela</a></h3>
      ${entregas.length ? `<ul class="filas">${entregas.map(e => { const m = por('materias', e.materia) || {}; return `<li>${punto(m.color)}<span class="x clic" onclick="Esc.editar('${e.id}')">${esc(e.titulo)}</span><span class="m">${esc(m.nombre || '')}${e.valor ? ' · ' + e.valor + ' pts' : ''}</span><span class="m">${fechaLim(e.entrega)}</span></li>`; }).join('')}</ul>` : vacio('Sin entregas próximas', '')}</section>
    <section class="blq"><h3>Proyectos activos <a class="lnk" href="#/proyectos">Ver proyectos</a></h3>
      ${proys.length ? `<ul class="filas">${proys.map(p => { const e = por('estatus', p.estatus) || {}; return `<li><span class="x clic" onclick="App.ir('proyecto','${p.id}')">${esc(p.nombre)}</span><span class="m">${punto(e.color)}${esc(e.nombre || '')}</span><span class="m">${Proy.avance(p)}%</span></li>`; }).join('')}</ul>` : vacio('Sin proyectos activos', '')}</section>
    <section class="blq"><h3>Cumpleaños próximos <a class="lnk" href="#/cumples">Ver todos</a></h3>
      ${cumples.length ? `<ul class="filas">${cumples.map(c => li(fFecha(c.fecha), esc(c.nombre) + (c.edad ? ` <span class="mut">· cumple ${c.edad}</span>` : ''), c.faltan === 0 ? '<b class="rojo">Hoy</b>' : `en ${c.faltan} día${c.faltan === 1 ? '' : 's'}`)).join('')}</ul>` : vacio('Sin cumpleaños en 30 días', '')}</section>
    <section class="blq"><h3>Accesos favoritos <a class="lnk" href="#/accesos">Administrar</a></h3>
      ${favs.length ? `<ul class="filas">${favs.map(l => `<li><span class="x"><a href="${esc(urlSegura(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.nombre)}</a></span><span class="m">${esc(Acc.host(l.url))}</span></li>`).join('')}</ul>` : vacio('Sin favoritos', 'Marca con ★ tus accesos directos.')}</section>
  </div>`;
};

/* ==========================================================================
   PROYECTOS
   ========================================================================== */
const Proy = {
  acts: p => S.actividades.filter(a => a.proyecto === p.id),
  avance(p) { const a = this.acts(p); return a.length ? Math.round(a.filter(x => estFinal(x.estatus)).length * 100 / a.length) : (estFinal(p.estatus) ? 100 : (p.avanceManual || 0)); },
  campos: () => [
    { k: 'nombre', label: 'Nombre del proyecto', req: true },
    { k: 'ambito', label: 'Ámbito', tipo: 'select', opciones: AMBITOS, medio: true },
    { k: 'estatus', label: 'Estatus', tipo: 'select', opciones: S.estatus.map(e => [e.id, e.nombre]), medio: true },
    { k: 'asignadoPor', label: 'Asignado por', medio: true, ph: 'Quién te lo asignó' },
    { k: 'prioridad', label: 'Prioridad', tipo: 'select', opciones: PRIORIDADES, medio: true, def: '3' },
    { k: 'inicio', label: 'Fecha de inicio', tipo: 'date', medio: true },
    { k: 'objetivo', label: 'Fecha objetivo', tipo: 'date', medio: true },
    { k: 'avanceManual', label: 'Avance manual (%)', tipo: 'number', min: 0, max: 100, medio: true, ayuda: 'Sólo se usa si el proyecto no tiene actividades.' },
    { k: 'descripcion', label: 'Descripción', tipo: 'textarea', filas: 3 }
  ],
  nuevo() {
    Form.abrir({ titulo: 'Nuevo proyecto', campos: this.campos(), valores: { ambito: 'Trabajo', estatus: idInicial(), inicio: hoyISO() },
      guardar: v => { if (v.inicio && v.objetivo && v.objetivo < v.inicio) return 'La fecha objetivo no puede ser anterior al inicio'; poner('proyectos', { id: uid(), creado: hoyISO(), ...v }); toast('Proyecto creado'); } });
  },
  editar(id) {
    const p = por('proyectos', id);
    Form.abrir({ titulo: 'Editar proyecto', campos: this.campos(), valores: p,
      guardar: v => { if (v.inicio && v.objetivo && v.objetivo < v.inicio) return 'La fecha objetivo no puede ser anterior al inicio'; poner('proyectos', { ...p, ...v }); },
      eliminar: async () => {
        for (const b of S.bitacora.filter(b => b.proyecto === id)) for (const i of b.imgs || []) await Img.quitar(i);
        S.bitacora = S.bitacora.filter(b => b.proyecto !== id);
        S.actividades.forEach(a => { if (a.proyecto === id) a.proyecto = ''; });   // las actividades pasan a "del área"
        S.notas.forEach(n => { if (n.proyecto === id) n.proyecto = ''; });         // las notas quedan sin clasificar
        quitar('proyectos', id); toast('Proyecto eliminado; sus actividades y notas se conservaron sin clasificar'); App.ir('proyectos');
      } });
  }
};
Vistas.proyectos = () => {
  let l = S.proyectos.filter(p => UI.proy.f === 'todos' ? true : UI.proy.f === 'activos' ? !estFinal(p.estatus) : estFinal(p.estatus));
  if (UI.proy.amb) l = l.filter(p => p.ambito === UI.proy.amb);
  l.sort((a, b) => (a.prioridad || '3').localeCompare(b.prioridad || '3') || (a.objetivo || '9').localeCompare(b.objetivo || '9'));
  return `${cab('Proyectos', `${S.proyectos.filter(p => !estFinal(p.estatus)).length} activos de ${S.proyectos.length}`, '<button class="btn pri" onclick="Proy.nuevo()">+ Proyecto</button>')}
  <div class="barra">${filtro('proy', 'f', [['activos', 'Activos'], ['terminados', 'Terminados'], ['todos', 'Todos']])}
    <select onchange="UI.proy.amb=this.value;App.pintar()"><option value="">Todos los ámbitos</option>${AMBITOS.map(a => `<option ${UI.proy.amb === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
  <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th>Proyecto</th><th>Ámbito</th><th>Estatus</th><th>Avance</th><th class="num">Actividades</th><th>Fecha objetivo</th><th>Asignado por</th></tr></thead><tbody>
    ${l.map(p => { const a = Proy.acts(p), h = a.filter(x => estFinal(x.estatus)).length, av = Proy.avance(p), e = por('estatus', p.estatus) || {};
      return `<tr><td><div class="t" onclick="App.ir('proyecto','${p.id}')">${esc(p.nombre)}</div>${p.descripcion ? `<div class="d">${esc(p.descripcion.slice(0, 90))}</div>` : ''}</td>
      <td class="nw">${esc(p.ambito || '')}</td><td class="nw">${punto(e.color)}${selEstatus('proyectos', p.id, p.estatus)}</td>
      <td><div class="av"><div><i style="width:${av}%"></i></div><span>${av}%</span></div></td><td class="num">${h} / ${a.length}</td>
      <td class="nw">${fechaLim(p.objetivo, estFinal(p.estatus))}</td><td class="nw d">${esc(p.asignadoPor || '—')}</td></tr>`; }).join('')}
    </tbody></table>` : vacio('Sin proyectos en esta vista', 'Crea uno con el botón “+ Proyecto”.')}</div>`;
};

/* ---------- Detalle de proyecto ---------- */
Vistas.proyecto = () => {
  const p = por('proyectos', App.param); if (!p) return vacio('Proyecto no encontrado', '');
  const e = por('estatus', p.estatus) || {}, av = Proy.avance(p), acts = Proy.acts(p);
  const bit = S.bitacora.filter(b => b.proyecto === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const notas = S.notas.filter(n => n.proyecto === p.id);
  const tab = UI.proy.tab;
  let cuerpo;
  if (tab === 'actividades') cuerpo = `<div class="barra"><input type="text" id="rapida" placeholder="Nueva actividad del proyecto… (Enter para agregar)" style="flex:1;max-width:520px" onkeydown="if(event.key==='Enter')Act.rapida(this.value,'${p.id}')">
      <button class="btn" onclick="Act.nueva('${p.id}')">+ Con detalle</button></div><div class="panel scrollx">${Act.tabla(acts.slice().sort(Act.orden), false)}</div>`;
  else if (tab === 'bitacora') cuerpo = `<div class="panel"><div class="comp">
      <textarea id="bTexto" rows="3" placeholder="¿Qué avanzaste, qué se decidió o qué quedó pendiente?"></textarea>
      <div class="barra" style="margin:0"><select id="bTipo">${Bit.TIPOS.map(t => `<option>${t}</option>`).join('')}</select>
      <input type="file" id="bImgs" accept="image/*" multiple><span class="esp"></span><button class="btn pri" onclick="Bit.agregar('${p.id}')">Registrar</button></div></div>
      ${bit.length ? `<ul class="bit">${bit.map(b => `<li><div class="mt"><span class="et ac">${esc(b.tipo)}</span><span>${esc(fFecha(b.fecha.slice(0, 10)))} · ${esc(b.fecha.slice(11, 16))}</span><span class="esp"></span>
        <button class="lnk gris" onclick="Bit.editar('${b.id}')">Editar</button><button class="lnk gris" onclick="Bit.borrar('${b.id}')">Eliminar</button></div>
        <div class="tx">${esc(b.texto)}</div>${(b.imgs || []).length ? `<div class="minis">${b.imgs.map(i => `<img src="${Img.url(i)}" alt="Imagen de bitácora" onclick="verImagen(this.src)">`).join('')}</div>` : ''}</li>`).join('')}</ul>` : vacio('Bitácora vacía', 'Registra aquí tus avances, decisiones y acuerdos de revisión.')}</div>`;
  else cuerpo = `<div class="barra"><button class="btn" onclick="Notas.nueva('${p.id}')">+ Nota del proyecto</button></div>
      <div class="panel">${notas.length ? `<ul class="filas">${notas.map(n => `<li><span class="x clic" onclick="UI.notas.id='${n.id}';UI.notas.f='todas';App.ir('notas')">${esc(n.titulo || 'Sin título')}</span><span class="m">${esc((n.texto || '').slice(0, 70))}</span><span class="m">${esc(fFecha((n.actualizado || '').slice(0, 10)))}</span></li>`).join('')}</ul>` : vacio('Sin notas ligadas', 'Puedes crear una aquí o clasificar una nota general desde “Notas”.')}</div>`;
  return `<div class="miga"><a href="#/proyectos">Proyectos</a> / ${esc(p.ambito || '')}</div>
  ${cab(p.nombre, '', `<button class="btn" onclick="Proy.editar('${p.id}')">Editar</button>`)}
  <div class="panel" style="padding:12px 14px;margin-bottom:14px"><div class="barra" style="margin:0;gap:18px">
    <span>${punto(e.color)}${selEstatus('proyectos', p.id, p.estatus)}</span>
    <div class="av" style="width:200px"><div><i style="width:${av}%"></i></div><span>${av}%</span></div>
    <span class="d">Inicio: <b>${esc(fFecha(p.inicio) || '—')}</b></span><span class="d">Objetivo: <b>${p.objetivo ? esc(fFecha(p.objetivo)) : '—'}</b> ${p.objetivo && !estFinal(p.estatus) && fRel(p.objetivo) !== fFecha(p.objetivo) ? '(' + fechaLim(p.objetivo) + ')' : ''}</span>
    <span class="d">Asignado por: <b>${esc(p.asignadoPor || '—')}</b></span></div>
    ${p.descripcion ? `<div style="margin-top:8px;white-space:pre-wrap">${esc(p.descripcion)}</div>` : ''}</div>
  <div class="tabs">${[['actividades', `Actividades (${acts.length})`], ['bitacora', `Bitácora (${bit.length})`], ['notas', `Notas (${notas.length})`]].map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" onclick="UI.proy.tab='${k}';App.pintar()">${t}</button>`).join('')}</div>
  ${cuerpo}`;
};

/* ---------- Bitácora ---------- */
const Bit = {
  TIPOS: ['Avance', 'Nota', 'Decisión', 'Revisión', 'Pendiente', 'Idea'],
  async agregar(proyecto) {
    const texto = $('#bTexto').value.trim(), archivos = [...$('#bImgs').files];
    if (!texto && !archivos.length) { toast('Escribe algo o adjunta una imagen', 'err'); return; }
    const imgs = [];
    try { for (const a of archivos) imgs.push(await Img.agregar(a)); } catch (e) { toast(e.message, 'err'); }
    const d = new Date();
    poner('bitacora', { id: uid(), proyecto, fecha: `${aISO(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`, tipo: $('#bTipo').value, texto, imgs });
    App.pintar();
  },
  editar(id) {
    const b = por('bitacora', id);
    Form.abrir({ titulo: 'Editar entrada de bitácora', campos: [{ k: 'tipo', label: 'Tipo', tipo: 'select', opciones: this.TIPOS }, { k: 'texto', label: 'Texto', tipo: 'textarea', filas: 6 }], valores: b,
      guardar: v => { poner('bitacora', { ...b, ...v, editado: hoyISO() }); } });
  },
  borrar(id) { confirmar('¿Eliminar esta entrada de la bitácora y sus imágenes?', async () => { const b = por('bitacora', id); for (const i of b.imgs || []) await Img.quitar(i); quitar('bitacora', id); App.pintar(); }); }
};

/* ==========================================================================
   ACTIVIDADES (de proyecto o del área)
   ========================================================================== */
const Act = {
  orden: (a, b) => (estFinal(a.estatus) - estFinal(b.estatus)) || (a.limite || '9999').localeCompare(b.limite || '9999') || (a.prioridad || '3').localeCompare(b.prioridad || '3'),
  origen(a) { const p = a.proyecto && por('proyectos', a.proyecto); const c = a.categoria && por('categorias', a.categoria); return (p ? p.nombre : 'Área') + (c ? ' · ' + c.nombre : ''); },
  lista: txt => String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => ({ hecho: /^\[x\]/i.test(l), t: l.replace(/^\[[ x]?\]\s*/i, '') })),
  campos: () => [
    { k: 'titulo', label: 'Actividad', req: true },
    { k: 'proyecto', label: 'Pertenece a', tipo: 'select', opciones: [['', 'Actividad del área (sin proyecto)'], ...S.proyectos.map(p => [p.id, 'Proyecto: ' + p.nombre])], medio: true },
    { k: 'categoria', label: 'Clasificación', tipo: 'select', opciones: [['', 'Sin clasificar'], ...S.categorias.map(c => [c.id, c.nombre])], medio: true },
    { k: 'estatus', label: 'Estatus', tipo: 'select', opciones: S.estatus.map(e => [e.id, e.nombre]), medio: true },
    { k: 'prioridad', label: 'Prioridad', tipo: 'select', opciones: PRIORIDADES, medio: true, def: '3' },
    { k: 'inicio', label: 'Fecha de inicio', tipo: 'date', medio: true },
    { k: 'limite', label: 'Fecha límite', tipo: 'date', medio: true },
    { k: 'hora', label: 'Hora', tipo: 'time', medio: true },
    { k: 'horas', label: 'Horas estimadas', tipo: 'number', min: 0, paso: 0.25, medio: true },
    { k: 'detalle', label: 'Detalle', tipo: 'textarea', filas: 3 },
    { k: 'checklist', label: 'Lista de verificación', tipo: 'textarea', filas: 4, ayuda: 'Un elemento por línea. Escribe [x] al inicio para marcarlo como hecho.' }
  ],
  _validar: v => (v.inicio && v.limite && v.limite < v.inicio) ? 'La fecha límite no puede ser anterior al inicio' : null,
  nueva(proyecto = '') {
    Form.abrir({ titulo: 'Nueva actividad', campos: this.campos(), valores: { proyecto, estatus: idInicial(), prioridad: '3' },
      guardar: v => { const er = this._validar(v); if (er) return er; poner('actividades', { id: uid(), creado: hoyISO(), completada: estFinal(v.estatus) ? hoyISO() : '', ...v }); } });
  },
  editar(id) {
    const a = por('actividades', id);
    Form.abrir({ titulo: 'Editar actividad', campos: this.campos(), valores: a,
      guardar: v => { const er = this._validar(v); if (er) return er; poner('actividades', { ...a, ...v, completada: estFinal(v.estatus) ? (a.completada || hoyISO()) : '' }); },
      eliminar: () => quitar('actividades', id) });
  },
  rapida(titulo, proyecto = '') {
    titulo = titulo.trim(); if (!titulo) return;
    poner('actividades', { id: uid(), creado: hoyISO(), titulo, proyecto, categoria: UI.act.cat || '', estatus: idInicial(), prioridad: '3', inicio: '', limite: '', hora: '', horas: null, detalle: '', checklist: '', completada: '' });
    App.pintar(); const i = $('#rapida'); if (i) i.focus();
  },
  alternar(id, marcado) { cambiarEstatus('actividades', id, marcado ? idFinal() : idInicial()); },
  tabla(l, conOrigen = true) {
    if (!l.length) return vacio('Sin actividades', 'Agrega una con el campo de arriba.');
    return `<table class="lista"><thead><tr><th style="width:30px"></th><th>Actividad</th>${conOrigen ? '<th>Proyecto / clasificación</th>' : '<th>Clasificación</th>'}<th>Prioridad</th><th>Fecha límite</th><th>Estatus</th></tr></thead><tbody>
    ${l.map(a => { const fin = estFinal(a.estatus), ck = this.lista(a.checklist), e = por('estatus', a.estatus) || {}, c = por('categorias', a.categoria);
      return `<tr class="${fin ? 'hecho' : ''}"><td><input type="checkbox" ${fin ? 'checked' : ''} onchange="Act.alternar('${a.id}',this.checked)" aria-label="Terminada"></td>
      <td><span class="t" onclick="Act.editar('${a.id}')">${esc(a.titulo)}</span>${ck.length ? ` <span class="et">${ck.filter(x => x.hecho).length}/${ck.length}</span>` : ''}${a.horas ? ` <span class="d">· ${a.horas} h</span>` : ''}</td>
      <td class="d">${conOrigen ? esc(this.origen(a)) : esc(c ? c.nombre : '—')}</td>
      <td class="nw ${a.prioridad === '1' && !fin ? 'rojo' : a.prioridad === '2' && !fin ? 'ambar' : 'd'}">${esc((PRIORIDADES.find(p => p[0] === a.prioridad) || ['', 'Media'])[1])}</td>
      <td class="nw">${fechaLim(a.limite, fin)}${a.hora ? ` <span class="d">${esc(a.hora)}</span>` : ''}</td>
      <td class="nw">${punto(e.color)}${selEstatus('actividades', a.id, a.estatus)}</td></tr>`; }).join('')}</tbody></table>`;
  }
};
Vistas.actividades = () => {
  const hoy = hoyISO(), f = UI.act.f;
  let l = S.actividades.filter(a => {
    const fin = estFinal(a.estatus);
    if (f === 'pendientes') return !fin; if (f === 'terminadas') return fin; if (f === 'todas') return true;
    if (fin) return false;
    if (f === 'hoy') return a.limite === hoy; if (f === 'vencidas') return a.limite && a.limite < hoy;
    if (f === 'semana') return a.limite && difDias(hoy, a.limite) >= 0 && difDias(hoy, a.limite) <= 7;
  });
  if (UI.act.proy === '-') l = l.filter(a => !a.proyecto); else if (UI.act.proy) l = l.filter(a => a.proyecto === UI.act.proy);
  if (UI.act.cat === '-') l = l.filter(a => !a.categoria); else if (UI.act.cat) l = l.filter(a => a.categoria === UI.act.cat);
  l.sort(Act.orden);
  const proyRapida = UI.act.proy && UI.act.proy !== '-' ? UI.act.proy : '';
  return `${cab('Actividades', `${S.actividades.filter(a => !estFinal(a.estatus)).length} pendientes`, '<button class="btn pri" onclick="Act.nueva()">+ Actividad</button>')}
  <div class="barra">${filtro('act', 'f', [['pendientes', 'Pendientes'], ['hoy', 'Hoy'], ['semana', '7 días'], ['vencidas', 'Vencidas'], ['terminadas', 'Terminadas'], ['todas', 'Todas']])}
    <select onchange="UI.act.proy=this.value;App.pintar()"><option value="">Proyectos y área</option><option value="-" ${UI.act.proy === '-' ? 'selected' : ''}>Sólo actividades del área</option>${S.proyectos.map(p => `<option value="${p.id}" ${UI.act.proy === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
    <select onchange="UI.act.cat=this.value;App.pintar()"><option value="">Todas las clasificaciones</option><option value="-" ${UI.act.cat === '-' ? 'selected' : ''}>Sin clasificar</option>${S.categorias.map(c => `<option value="${c.id}" ${UI.act.cat === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
  <div class="barra"><input type="text" id="rapida" placeholder="Agregar actividad rápida… (Enter)" style="flex:1;max-width:560px" onkeydown="if(event.key==='Enter')Act.rapida(this.value,'${proyRapida}')"></div>
  <div class="panel scrollx">${Act.tabla(l)}</div>`;
};
