'use strict';
/* ==========================================================================
   APP (navegación) + INICIO + PROYECTOS + ACTIVIDADES
   ========================================================================== */

/** Filtros y pestañas activas de cada pantalla (no se guardan). */
const UI = {
  proy: { f: 'activos', amb: '', pri: '', q: '', tab: 'actividades' },
  act: { f: 'pendientes', proy: '', cat: '', pri: '', q: '' },
  esc: { tab: 'lista', mat: '', est: '', tipo: '', q: '', rango: 'mes', mes: hoyISO().slice(0, 7) },
  ag: { mes: hoyISO().slice(0, 7), dia: hoyISO(), modo: 'mes', ver: { evento: true, actividad: true, entrega: true, cumple: true, recordatorio: true } },
  rec: { q: '' }, cum: { q: '', rel: '' },
  notas: { f: 'todas', id: null, q: '' },
  acc: { f: 'todos', q: '', sel: new Set() },
  aj: { tab: 'apariencia' }
};

const Vistas = {};   // cada pantalla registra aquí su función: () => html
const App = {
  vista: 'inicio', param: null,
  NAV: [['inicio', 'Inicio'], ['proyectos', 'Proyectos'], ['actividades', 'Actividades'], ['escuela', 'Escuela'], ['agenda', 'Agenda'],
        ['recordatorios', 'Recordatorios'], ['notas', 'Notas'], ['accesos', 'Accesos directos'], ['cumples', 'Cumpleaños'], ['frases', 'Frases del día'], null, ['ajustes', 'Ajustes']],
  ir(v, p) { const h = '#/' + v + (p ? '/' + p : ''); if (location.hash === h) this.ruta(); else location.hash = h; },
  ruta() {
    const [, v, p] = location.hash.split('/');
    this.vista = Object.hasOwn(Vistas, v) ? v : 'inicio'; this.param = p || null; this.pintar(true);
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
    $('#lat').innerHTML = `<div class="marca">${LOGO}<div><b>${esc(S.ajustes.nombre)}</b><small>${esc(S.ajustes.lema || '')}</small></div></div><div class="regla"></div>
      <nav>${this.NAV.map(n => n ? `<a href="#/${n[0]}" class="${n[0] === base ? 'on' : ''}">${esc(n[1])}${c[n[0]] ? `<span class="n">${c[n[0]]}</span>` : ''}</a>` : '<hr>').join('')}</nav>
      <div class="pie"><i></i><span>Guardado en este equipo</span></div>`;
    const banda = Img.url(S.ajustes.bandaImg);
    const pral = $('#pral'), y = pral.scrollTop;
    let cuerpo;
    try { cuerpo = Vistas[this.vista](); }
    catch (e) {   // un dato dañado no debe dejar la plataforma inservible
      console.error(e);
      cuerpo = `<div class="panel">${vacio('No se pudo mostrar esta pantalla', 'Algún dato guardado está dañado. Descarga un respaldo desde Ajustes → Datos y avisa del error: ' + e.message)}</div>`;
    }
    pral.innerHTML = (banda ? `<div class="banda" style="background-image:url('${banda}')"></div>` : '') + `<div class="cont">${cuerpo}</div>`;
    pral.scrollTop = arriba ? 0 : y;
    const tl = $('#tl'); if (tl && tl.dataset.hoy) tl.scrollLeft = Math.max(0, +tl.dataset.hoy - 260);
    // Recuerda los filtros elegidos (no el texto de búsqueda) para la próxima vez
    try { localStorage.setItem('nova_ui', JSON.stringify(UI, (k, v) => (v instanceof Set || k === 'q' || k === 'id' || k === 'dia' || k === 'mes') ? undefined : v)); } catch (e) { /* sin almacenamiento */ }
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
  const o = por(lista, id); if (!o) return; regEstatus(lista, o, o.estatus, valor); o.estatus = valor;
  if (lista === 'actividades') o.completada = estFinal(valor) ? (o.completada || hoyISO()) : '';
  guardar(); App.pintar();
}

/* ==========================================================================
   INICIO
   ========================================================================== */
/* ---------- Carrusel de frases ----------
   De lunes a viernes se elige al azar una frase que aún no se haya mostrado. Al llegar otro día,
   la anterior queda marcada como vista (con su fecha) y se elige la siguiente. Cuando ya se vieron
   todas, el ciclo vuelve a empezar. Sábados y domingos el carrusel descansa y no avanza. */
const esFinDeSemana = iso => [0, 6].includes(deISO(iso).getDay());
const azar = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
function fraseDelDia() {
  const hoy = hoyISO(), a = S.ajustes;
  if (!S.frases.length || esFinDeSemana(hoy)) return null;
  const actual = a.fraseHoy && S.frases.find(f => f.id === a.fraseHoy.id);
  if (actual && a.fraseHoy.fecha === hoy) return actual;
  if (actual) actual.vista = a.fraseHoy.fecha;                       // la del día anterior ya se visualizó
  return elegirFrase(actual ? actual.id : '');
}
function elegirFrase(evitar) {
  let pend = S.frases.filter(f => !f.vista);
  if (!pend.length) { S.frases.forEach(f => { f.vista = ''; }); pend = S.frases.slice(); }   // nuevo ciclo
  if (pend.length > 1) pend = pend.filter(f => f.id !== evitar);     // no repetir la de ayer al reiniciar
  const f = pend[azar(pend.length)];
  S.ajustes.fraseHoy = { fecha: hoyISO(), id: f.id }; guardar();
  return f;
}
Vistas.inicio = () => {
  const hoy = hoyISO(), f = S.ajustes.inicioFiltro, hora = new Date().getHours(), saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const bloques = S.ajustes.inicio.filter(w => w.on && WIDGETS[w.id]).map(w => {
    if (w.id === 'frase') { const h = Ini.frase(); return h ? `<div style="grid-column:span ${w.ancho}">${h}</div>` : ''; }
    const r = Ini[w.id](w);
    return `<section class="blq" style="grid-column:span ${w.ancho}"><h3>${esc(r.t)}${r.n != null ? `<span class="ct">${r.n}</span>` : ''}${r.extra || ''}<a class="lnk" href="#/${r.ir}">Ver todo</a></h3>${r.h}${r.pie || ''}</section>`;
  }).join('');
  return `${cab(`${saludo}${S.ajustes.usuario ? ', ' + S.ajustes.usuario : ''}`, may(fFechaLarga(hoy)))}
  <div class="barra"><div class="fil">${[['', 'Todo'], ...AMBITOS.map(a => [a, a])].map(([v, t]) => `<button class="${f.amb === v ? 'on' : ''}" onclick="Ini.set('amb','${v}')">${t}</button>`).join('')}</div>
    <select onchange="Ini.set('cat',this.value)" aria-label="Clasificación"><option value="">Todas las clasificaciones</option>${S.categorias.map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
    ${f.amb || f.cat ? '<button class="lnk gris" onclick="Ini.limpiar()">Quitar filtros</button>' : ''}<span class="esp"></span>
    <button class="lnk" onclick="UI.aj.tab='inicio';App.ir('ajustes')">Personalizar inicio</button></div>
  <div class="tab6">${bloques || vacio('Inicio sin bloques', 'Activa bloques en Ajustes → Inicio.')}</div>`;
};

/** Bloques de Inicio. Cada uno recibe su configuración (filas, días) y respeta los filtros de la barra superior. */
const ambAct = a => { const p = a.proyecto && por('proyectos', a.proyecto); return p ? (p.ambito || 'Trabajo') : 'Trabajo'; };
const Ini = {
  set(k, v) { S.ajustes.inicioFiltro[k] = v; guardar(); App.pintar(); },
  limpiar() { S.ajustes.inicioFiltro = { amb: '', cat: '' }; guardar(); App.pintar(); },
  amb(a) { const f = S.ajustes.inicioFiltro.amb; return !f || !a || a === f; },
  cat(c) { const f = S.ajustes.inicioFiltro.cat; return !f || c === f; },
  lista: (filas, tv, dv) => filas ? `<ul class="filas">${filas}</ul>` : vacio(tv, dv || ''),
  frase() {
    if (esFinDeSemana(hoyISO())) return '';   // el carrusel sólo aparece de lunes a viernes
    const f = fraseDelDia(), u = f ? Img.url(f.img) : '';
    return f ? `<section class="frase ${u ? 'img' : ''}" style="margin:0;${u ? `background-image:url('${u}')` : ''}">
      <div class="ctl">${S.frases.length > 1 ? '<button class="lnk" onclick="Frases.otra()" title="Marca esta como vista y muestra otra">Otra</button>' : ''}<a class="lnk" href="#/frases">Administrar</a></div>
      <div class="tx">${f.texto ? `<p>${esc(f.texto)}</p>` : ''}${f.autor ? `<span>— ${esc(f.autor)}</span>` : ''}</div></section>`
      : `<section class="frase" style="margin:0;min-height:90px"><div class="tx"><p>Agrega tus frases del día</p><span>Sube imágenes o textos y verás uno diferente cada día. <a href="#/frases">Agregar</a></span></div></section>`;
  },
  agenda(c) {
    const dias = c.dias || 1, hoy = hoyISO(); let filas = '', n = 0, total = 0;
    for (let i = 0; i < dias; i++) {
      const iso = sumaDias(hoy, i);
      for (const x of Agenda.items(iso).filter(x => this.amb(x.amb) && (x.clase !== 'actividad' || this.cat(x.cat)))) {
        total++; if (n >= c.filas) continue; n++;
        filas += `<li><span class="h" style="width:${dias > 1 ? 104 : 46}px">${esc(dias > 1 ? (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fFecha(iso)) + (x.hora ? ' · ' + x.hora : '') : x.hora)}</span><span class="x clic" onclick="${x.clic}">${punto(x.color)}${esc(x.titulo)}</span><span class="m">${esc(x.tipo)}</span></li>`;
      }
    }
    return { t: dias > 1 ? `Agenda · ${dias} días` : 'Agenda de hoy', n: total, ir: 'agenda', h: this.lista(filas, 'Sin eventos', dias > 1 ? '' : 'No hay nada programado para hoy.'), extra: '<button class="lnk" onclick="UI.ag.dia=hoyISO();Agenda.evento()">+ Evento</button>' };
  },
  actividades(c) {
    const hoy = hoyISO();
    const l = S.actividades.filter(a => !estFinal(a.estatus) && this.amb(ambAct(a)) && this.cat(a.categoria) && (!c.dias || (a.limite && difDias(hoy, a.limite) <= c.dias))).sort(Act.orden);
    const filas = l.slice(0, c.filas).map(a => `<li><input type="checkbox" title="Marcar como terminada" onchange="cambiarEstatus('actividades','${a.id}','${idFinal()}')">
      <span class="x clic" onclick="Act.editar('${a.id}')">${esc(a.titulo)}</span><span class="m">${esc(Act.origen(a))}</span><span class="m">${fechaLim(a.limite)}</span></li>`).join('');
    return { t: c.dias ? `Actividades · vencen en ${c.dias} días` : 'Actividades pendientes', n: l.length, ir: 'actividades', h: this.lista(filas, 'Nada por atender', c.dias ? `Sin actividades que venzan en ${c.dias} días.` : ''),
      pie: `<div class="rap"><input type="text" id="rapida" placeholder="Agregar actividad… (Enter)" onkeydown="if(event.key==='Enter')Act.rapida(this.value,'')"></div>` };
  },
  entregas(c) {
    const hoy = hoyISO(), ok = this.amb('Escuela');
    const l = !ok ? [] : S.escolares.filter(e => e.tipo !== 'Vacaciones' && !['enviada', 'calificada'].includes(e.estatus) && e.entrega && difDias(hoy, e.entrega) <= (c.dias || 14)).sort((a, b) => a.entrega.localeCompare(b.entrega));
    const filas = l.slice(0, c.filas).map(e => { const m = por('materias', e.materia) || {}; return `<li>${punto(m.color)}<span class="x clic" onclick="Esc.editar('${e.id}')">${esc(e.titulo)}</span><span class="m">${esc(m.nombre || '')}${e.valor ? ' · ' + e.valor + ' pts' : ''}</span><span class="m">${fechaLim(e.entrega)}</span></li>`; }).join('');
    return { t: `Entregas escolares · ${c.dias || 14} días`, n: l.length, ir: 'escuela', h: this.lista(filas, ok ? 'Sin entregas próximas' : 'Oculto por el filtro de ámbito') };
  },
  proyectos(c) {
    const l = S.proyectos.filter(p => !estFinal(p.estatus) && this.amb(p.ambito)).sort((a, b) => (a.prioridad || '3').localeCompare(b.prioridad || '3'));
    const filas = l.slice(0, c.filas).map(p => { const e = por('estatus', p.estatus) || {}; return `<li><span class="x clic" onclick="App.ir('proyecto','${p.id}')">${esc(p.nombre)}</span><span class="m">${punto(e.color)}${esc(e.nombre || '')}</span><span class="m">${Proy.avance(p)}%</span><span class="m">${fechaLim(p.objetivo)}</span></li>`; }).join('');
    return { t: 'Proyectos activos', n: l.length, ir: 'proyectos', h: this.lista(filas, 'Sin proyectos activos') };
  },
  recordatorios(c) {
    const lim = sumaDias(hoyISO(), c.dias || 7);
    const l = S.recordatorios.filter(r => !r.hecho && r.fecha <= lim).sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
    const filas = l.slice(0, c.filas).map(r => `<li><input type="checkbox" title="Hecho" onchange="Rec.hecho('${r.id}')"><span class="x clic" onclick="Rec.editar('${r.id}')">${esc(r.texto)}</span><span class="m">${fechaLim(r.fecha)} ${esc(r.hora || '')}</span></li>`).join('');
    return { t: 'Recordatorios', n: l.length, ir: 'recordatorios', h: this.lista(filas, 'Sin recordatorios próximos'), extra: '<button class="lnk" onclick="Rec.editar()">+ Nuevo</button>' };
  },
  cumples(c) {
    const l = this.amb('Personal') ? Cumples.proximos().filter(x => x.faltan <= (c.dias || 30)) : [];
    const filas = l.slice(0, c.filas).map(x => `<li><span class="h" style="width:52px">${esc(fFecha(x.fecha))}</span><span class="x clic" onclick="Cumples.editar('${x.id}')">${esc(x.nombre)}${x.edad ? ` <span class="mut">· cumple ${x.edad}</span>` : ''}</span><span class="m">${x.faltan === 0 ? '<b class="rojo">Hoy</b>' : `en ${x.faltan} día${x.faltan === 1 ? '' : 's'}`}</span></li>`).join('');
    return { t: 'Cumpleaños próximos', n: l.length, ir: 'cumples', h: this.lista(filas, 'Sin cumpleaños próximos') };
  },
  accesos(c) {
    const filas = S.enlaces.filter(l => l.fav).slice(0, c.filas).map(l => `<li><span class="x"><a href="${esc(urlSegura(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.nombre)}</a></span><span class="m">${esc(Acc.host(l.url))}</span></li>`).join('');
    return { t: 'Accesos favoritos', ir: 'accesos', h: this.lista(filas, 'Sin favoritos', 'Marca con ★ tus accesos directos.') };
  }
};

/** Historial de cambios de estatus. */
const Hist = {
  tabla(l) {
    return l.length ? `<table class="lista"><thead><tr><th>Fecha y hora</th><th>Registro</th><th>Tipo</th><th>Cambio</th></tr></thead><tbody>${l.map(h => `<tr><td class="d nw">${esc(h.fecha)}</td><td>${esc(h.titulo)}</td>
      <td class="d nw">${{ proyectos: 'Proyecto', actividades: 'Actividad', escolares: 'Escolar' }[h.lista] || ''}</td><td class="nw"><span class="mut">${esc(h.de || 'Nuevo')}</span> → <b>${esc(h.a)}</b></td></tr>`).join('')}</tbody></table>`
      : vacio('Sin cambios registrados', 'Aquí aparecerá cada cambio de estatus con su fecha y hora.');
  },
  ver(lista) {
    const l = S.historial.filter(h => !lista || h.lista === lista).reverse().slice(0, 400);
    Modal.abrir(`<div class="form"><h2>Historial de cambios de estatus</h2><div class="campos" style="display:block;padding:0">${this.tabla(l)}</div>
      <div class="acciones"><span class="d">${l.length} cambio(s)</span><span class="esp"></span><button class="btn" onclick="Datos.exportarUna('historial_estatus.csv')">Descargar CSV</button><button class="btn pri" onclick="Modal.cerrar()">Cerrar</button></div></div>`, 760);
  },
  /** Resumen para mostrar dentro del formulario de un registro. */
  de(ref) {
    const l = S.historial.filter(h => h.ref === ref).reverse();
    return l.length ? `<div class="campo"><label>Historial de estatus</label><div class="d">${l.slice(0, 12).map(h => `${esc(h.fecha)} · ${esc(h.de || 'Nuevo')} → <b>${esc(h.a)}</b>`).join('<br>')}</div></div>` : '';
  }
};
const btnCarga = tipo => `<button class="btn" onclick="Carga.abrir('${tipo}')">Carga masiva</button>`;
const btnHist = lista => `<button class="btn" onclick="Hist.ver('${lista}')">Historial</button>`;
const campoBuscar = (obj, id, ph) => `<input type="search" id="${id}" placeholder="${ph}" value="${esc(UI[obj].q)}" oninput="buscar('${obj}',this.value,'${id}')" style="width:220px">`;
const coincide = (q, ...textos) => !q || textos.join(' ').toLowerCase().includes(q.toLowerCase());

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
      guardar: v => { if (v.inicio && v.objetivo && v.objetivo < v.inicio) return 'La fecha objetivo no puede ser anterior al inicio'; const p = { id: uid(), creado: hoyISO(), ...v }; regEstatus('proyectos', p, '', p.estatus); poner('proyectos', p); toast('Proyecto creado'); } });
  },
  editar(id) {
    const p = por('proyectos', id);
    Form.abrir({ titulo: 'Editar proyecto', campos: this.campos(), valores: p, nota: Hist.de(id),
      guardar: v => { if (v.inicio && v.objetivo && v.objetivo < v.inicio) return 'La fecha objetivo no puede ser anterior al inicio'; regEstatus('proyectos', p, p.estatus, v.estatus); poner('proyectos', { ...p, ...v }); },
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
  if (UI.proy.pri) l = l.filter(p => (p.prioridad || '3') === UI.proy.pri);
  l = l.filter(p => coincide(UI.proy.q, p.nombre, p.descripcion, p.asignadoPor));
  l.sort((a, b) => (a.prioridad || '3').localeCompare(b.prioridad || '3') || (a.objetivo || '9').localeCompare(b.objetivo || '9'));
  return `${cab('Proyectos', `${S.proyectos.filter(p => !estFinal(p.estatus)).length} activos de ${S.proyectos.length}`, btnHist('proyectos') + btnCarga('proyectos') + '<button class="btn pri" onclick="Proy.nuevo()">+ Proyecto</button>')}
  <div class="barra">${filtro('proy', 'f', [['activos', 'Activos'], ['terminados', 'Terminados'], ['todos', 'Todos']])}
    <select onchange="UI.proy.amb=this.value;App.pintar()"><option value="">Todos los ámbitos</option>${AMBITOS.map(a => `<option ${UI.proy.amb === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <select onchange="UI.proy.pri=this.value;App.pintar()"><option value="">Todas las prioridades</option>${PRIORIDADES.map(([v, t]) => `<option value="${v}" ${UI.proy.pri === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    ${campoBuscar('proy', 'pBuscar', 'Buscar proyecto…')}<span class="d">${l.length} resultado(s)</span></div>
  <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th>Proyecto</th><th>Ámbito</th><th>Prioridad</th><th>Estatus</th><th>Avance</th><th class="num">Actividades</th><th>Fecha objetivo</th><th>Asignado por</th></tr></thead><tbody>
    ${l.map(p => { const a = Proy.acts(p), h = a.filter(x => estFinal(x.estatus)).length, av = Proy.avance(p), e = por('estatus', p.estatus) || {};
      return `<tr><td><div class="t" onclick="App.ir('proyecto','${p.id}')">${esc(p.nombre)}</div>${p.descripcion ? `<div class="d">${esc(p.descripcion.slice(0, 90))}</div>` : ''}</td>
      <td class="nw">${esc(p.ambito || '')}</td><td class="nw d">${esc((PRIORIDADES.find(x => x[0] === (p.prioridad || '3')) || ['', ''])[1])}</td><td class="nw">${punto(e.color)}${selEstatus('proyectos', p.id, p.estatus)}</td>
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
  else if (tab === 'historial') cuerpo = `<div class="panel scrollx">${Hist.tabla(S.historial.filter(h => h.proyecto === p.id).reverse())}</div>`;
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
  <div class="tabs">${[['actividades', `Actividades (${acts.length})`], ['bitacora', `Bitácora (${bit.length})`], ['notas', `Notas (${notas.length})`], ['historial', 'Historial de estatus']].map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" onclick="UI.proy.tab='${k}';App.pintar()">${t}</button>`).join('')}</div>
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
      guardar: v => { const er = this._validar(v); if (er) return er; const a = { id: uid(), creado: hoyISO(), completada: estFinal(v.estatus) ? hoyISO() : '', ...v }; regEstatus('actividades', a, '', a.estatus); poner('actividades', a); } });
  },
  editar(id) {
    const a = por('actividades', id);
    Form.abrir({ titulo: 'Editar actividad', campos: this.campos(), valores: a, nota: Hist.de(id),
      guardar: v => { const er = this._validar(v); if (er) return er; regEstatus('actividades', { ...a, ...v }, a.estatus, v.estatus); poner('actividades', { ...a, ...v, completada: estFinal(v.estatus) ? (a.completada || hoyISO()) : '' }); },
      eliminar: () => quitar('actividades', id) });
  },
  rapida(titulo, proyecto = '') {
    titulo = titulo.trim(); if (!titulo) return;
    const cat = (App.vista === 'inicio' ? S.ajustes.inicioFiltro.cat : UI.act.cat) || '';
    const nueva = { id: uid(), creado: hoyISO(), titulo, proyecto, categoria: cat === '-' ? '' : cat, estatus: idInicial(), prioridad: '3', inicio: '', limite: '', hora: '', horas: null, detalle: '', checklist: '', completada: '' };
    regEstatus('actividades', nueva, '', nueva.estatus); poner('actividades', nueva);
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
  if (UI.act.pri) l = l.filter(a => (a.prioridad || '3') === UI.act.pri);
  l = l.filter(a => coincide(UI.act.q, a.titulo, a.detalle, Act.origen(a)));
  l.sort(Act.orden);
  const proyRapida = UI.act.proy && UI.act.proy !== '-' ? UI.act.proy : '';
  return `${cab('Actividades', `${S.actividades.filter(a => !estFinal(a.estatus)).length} pendientes`, btnHist('actividades') + btnCarga('actividades') + '<button class="btn pri" onclick="Act.nueva()">+ Actividad</button>')}
  <div class="barra">${filtro('act', 'f', [['pendientes', 'Pendientes'], ['hoy', 'Hoy'], ['semana', '7 días'], ['vencidas', 'Vencidas'], ['terminadas', 'Terminadas'], ['todas', 'Todas']])}
    <select onchange="UI.act.proy=this.value;App.pintar()"><option value="">Proyectos y área</option><option value="-" ${UI.act.proy === '-' ? 'selected' : ''}>Sólo actividades del área</option>${S.proyectos.map(p => `<option value="${p.id}" ${UI.act.proy === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
    <select onchange="UI.act.cat=this.value;App.pintar()"><option value="">Todas las clasificaciones</option><option value="-" ${UI.act.cat === '-' ? 'selected' : ''}>Sin clasificar</option>${S.categorias.map(c => `<option value="${c.id}" ${UI.act.cat === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
    <select onchange="UI.act.pri=this.value;App.pintar()"><option value="">Todas las prioridades</option>${PRIORIDADES.map(([v, t]) => `<option value="${v}" ${UI.act.pri === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  <div class="barra"><input type="text" id="rapida" placeholder="Agregar actividad rápida… (Enter)" style="flex:1;max-width:460px" onkeydown="if(event.key==='Enter')Act.rapida(this.value,'${proyRapida}')">
    ${campoBuscar('act', 'acBuscar', 'Buscar actividad…')}<span class="d">${l.length} resultado(s)</span></div>
  <div class="panel scrollx">${Act.tabla(l)}</div>`;
};
