'use strict';
/* ==========================================================================
   ESCUELA (lista, línea de tiempo, evaluación, materias) + AGENDA + RECORDATORIOS
   ========================================================================== */

const Esc = {
  campos: () => [
    { k: 'titulo', label: 'Actividad', req: true },
    { k: 'materia', label: 'Materia', tipo: 'select', opciones: S.materias.map(m => [m.id, m.nombre]), medio: true },
    { k: 'tipo', label: 'Tipo', tipo: 'select', opciones: TIPOS_ESC, medio: true },
    { k: 'inicio', label: 'Fecha de inicio', tipo: 'date', medio: true },
    { k: 'entrega', label: 'Fecha de entrega', tipo: 'date', medio: true, req: true },
    { k: 'valor', label: 'Valor (puntos)', tipo: 'number', min: 0, max: 100, paso: 0.5, medio: true },
    { k: 'calif', label: 'Calificación obtenida (puntos)', tipo: 'number', min: 0, paso: 0.1, medio: true, ayuda: 'Déjala vacía si aún no te califican.' },
    { k: 'estatus', label: 'Estado', tipo: 'select', opciones: EST_ESC },
    { k: 'comentario', label: 'Comentarios', tipo: 'textarea', filas: 2 }
  ],
  _validar(v) {
    if (v.inicio && v.entrega < v.inicio) return 'La fecha de entrega no puede ser anterior al inicio';
    if (v.calif != null && v.calif > (v.valor || 0)) return 'La calificación no puede ser mayor al valor de la actividad';
    if (v.calif != null) v.estatus = 'calificada';
    return null;
  },
  nueva() {
    if (!S.materias.length) { toast('Primero registra una materia'); UI.esc.tab = 'materias'; App.pintar(); return this.materia(); }
    Form.abrir({ titulo: 'Nueva actividad escolar', campos: this.campos(), valores: { materia: UI.esc.mat || S.materias[0].id, tipo: 'Buzón', estatus: 'pendiente', inicio: hoyISO(), valor: 0 },
      guardar: v => { const er = this._validar(v); if (er) return er; const e = { id: uid(), ...v }; regEstatus('escolares', e, '', e.estatus); poner('escolares', e); } });
  },
  editar(id) {
    const e = por('escolares', id);
    Form.abrir({ titulo: 'Editar actividad escolar', campos: this.campos(), valores: e, nota: Hist.de(id),
      guardar: v => { const er = this._validar(v); if (er) return er; regEstatus('escolares', e, e.estatus, v.estatus); poner('escolares', { ...e, ...v }); }, eliminar: () => quitar('escolares', id) });
  },
  estado(id, v) { const e = por('escolares', id); regEstatus('escolares', e, e.estatus, v); e.estatus = v; if (v !== 'calificada') e.calif = null; guardar(); App.pintar(); },
  calificar(id, txt) {
    const e = por('escolares', id), n = txt === '' ? null : Number(txt);
    if (n != null && (isNaN(n) || n < 0 || n > (e.valor || 0))) { toast(`La calificación debe estar entre 0 y ${e.valor || 0}`, 'err'); App.pintar(); return; }
    const antes = e.estatus; e.calif = n; if (n != null) e.estatus = 'calificada'; else if (e.estatus === 'calificada') e.estatus = 'enviada';
    regEstatus('escolares', e, antes, e.estatus);
    guardar(); App.pintar();
  },
  materia(id) {
    const m = id ? por('materias', id) : null;
    Form.abrir({ titulo: m ? 'Editar materia' : 'Nueva materia', valores: m || { color: PALETA[S.materias.length % PALETA.length], meta: S.ajustes.metaEscolar },
      campos: [{ k: 'nombre', label: 'Materia', req: true }, { k: 'profesor', label: 'Profesor(a)', medio: true }, { k: 'ciclo', label: 'Ciclo', medio: true, ph: '2026-B' },
               { k: 'color', label: 'Color', tipo: 'color', medio: true }, { k: 'meta', label: 'Meta de calificación', tipo: 'number', min: 0, max: 100, medio: true, ayuda: 'Puntos que quieres alcanzar al final.' }],
      guardar: v => { poner('materias', { id: m ? m.id : uid(), ...v }); },
      eliminar: m ? () => { S.escolares = S.escolares.filter(e => e.materia !== m.id); quitar('materias', m.id); toast('Materia y sus actividades eliminadas'); } : null });
  },
  /** Modelo de evaluación: puntos totales, evaluados, obtenidos y proyección. */
  resumen(m) {
    const a = S.escolares.filter(e => e.materia === m.id && e.tipo !== 'Vacaciones' && e.valor > 0);
    const total = a.reduce((s, e) => s + e.valor, 0), ev = a.filter(e => e.calif != null);
    const evaluado = ev.reduce((s, e) => s + e.valor, 0), obtenido = ev.reduce((s, e) => s + e.calif, 0);
    const rend = evaluado ? obtenido / evaluado : null, restante = total - evaluado, meta = m.meta ?? S.ajustes.metaEscolar;
    return { a, total, evaluado, obtenido, rend, restante, meta, perdido: evaluado - obtenido, proy: rend == null ? null : obtenido + restante * rend,
             entregadas: a.filter(e => ['enviada', 'calificada'].includes(e.estatus)).length };
  }
};
const r1 = n => Math.round(n * 10) / 10;

Vistas.escuela = () => {
  const t = UI.esc.tab;
  const selMat = `<select onchange="UI.esc.mat=this.value;App.pintar()"><option value="">Todas las materias</option>${S.materias.map(m => `<option value="${m.id}" ${UI.esc.mat === m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select>`;
  const cuerpo = t === 'lista' ? escLista(selMat) : t === 'tiempo' ? escTiempo(selMat) : t === 'eval' ? escEval(selMat) : escMaterias();
  return `${cab('Escuela', `${S.materias.length} materias · ${S.escolares.filter(e => e.tipo !== 'Vacaciones').length} actividades`, btnHist('escolares') + btnCarga(t === 'materias' ? 'materias' : 'escolares') + '<button class="btn" onclick="Esc.materia()">+ Materia</button><button class="btn pri" onclick="Esc.nueva()">+ Actividad</button>')}
  <div class="tabs">${[['lista', 'Actividades'], ['tiempo', 'Línea de tiempo'], ['eval', 'Evaluación'], ['materias', 'Materias']].map(([k, n]) => `<button class="${t === k ? 'on' : ''}" onclick="UI.esc.tab='${k}';App.pintar()">${n}</button>`).join('')}</div>${cuerpo}`;
};

function escLista(selMat) {
  let l = S.escolares.filter(e => (!UI.esc.mat || e.materia === UI.esc.mat));
  const f = UI.esc.est;
  if (f === 'abiertas') l = l.filter(e => ['pendiente', 'proceso', 'guardada'].includes(e.estatus) && e.tipo !== 'Vacaciones'); else if (f) l = l.filter(e => e.estatus === f);
  if (UI.esc.tipo) l = l.filter(e => e.tipo === UI.esc.tipo);
  l = l.filter(e => coincide(UI.esc.q, e.titulo, e.comentario, (por('materias', e.materia) || {}).nombre));
  l.sort((a, b) => (a.entrega || '').localeCompare(b.entrega || ''));
  return `<div class="barra">${selMat}<select onchange="UI.esc.est=this.value;App.pintar()"><option value="">Todos los estados</option><option value="abiertas" ${f === 'abiertas' ? 'selected' : ''}>Por entregar</option>${EST_ESC.map(([k, n]) => `<option value="${k}" ${f === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <select onchange="UI.esc.tipo=this.value;App.pintar()"><option value="">Todos los tipos</option>${TIPOS_ESC.map(x => `<option ${UI.esc.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
    ${campoBuscar('esc', 'eBuscar', 'Buscar actividad…')}<span class="d">${l.length} resultado(s) · ${r1(l.reduce((s, e) => s + (e.valor || 0), 0))} pts</span></div>
  <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th>Actividad</th><th>Materia</th><th>Tipo</th><th class="num">Valor</th><th>Inicio</th><th>Entrega</th><th>Estado</th><th class="num">Calificación</th></tr></thead><tbody>
    ${l.map(e => { const m = por('materias', e.materia) || {}, cerr = ['enviada', 'calificada'].includes(e.estatus) || e.tipo === 'Vacaciones';
      return `<tr class="${cerr && e.tipo !== 'Vacaciones' ? 'hecho' : ''}"><td><span class="t" onclick="Esc.editar('${e.id}')">${esc(e.titulo)}</span></td><td class="nw">${punto(m.color)}${esc(m.nombre || '')}</td><td class="d nw">${esc(e.tipo || '')}</td>
      <td class="num">${e.valor ? e.valor + ' pts' : '—'}</td><td class="d nw">${esc(fFecha(e.inicio))}</td><td class="nw">${fechaLim(e.entrega, cerr)}</td>
      <td>${e.tipo === 'Vacaciones' ? '<span class="d">—</span>' : `<select onchange="Esc.estado('${e.id}',this.value)">${EST_ESC.map(([k, n]) => `<option value="${k}" ${e.estatus === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`}</td>
      <td class="num">${e.valor ? `<input type="number" min="0" max="${e.valor}" step="0.1" value="${e.calif ?? ''}" onchange="Esc.calificar('${e.id}',this.value)" aria-label="Calificación">` : ''}</td></tr>`; }).join('')}
    </tbody></table>` : vacio('Sin actividades escolares', 'Agrégalas una por una o impórtalas por CSV en Ajustes → Datos.')}</div>`;
}

/* ---------- Línea de tiempo (versión mejorada de AcadTrack) ---------- */
function escTiempo(selMat) {
  const W = 26, hoy = hoyISO(), [y, mm] = UI.esc.mes.split('-').map(Number);
  const fechas = S.escolares.flatMap(e => [e.inicio, e.entrega]).filter(Boolean).sort();
  let ini, fin;
  if (UI.esc.rango === 'mes') { ini = `${UI.esc.mes}-01`; fin = aISO(new Date(y, mm, 0)); }
  else if (UI.esc.rango === 'tri') { ini = `${UI.esc.mes}-01`; fin = aISO(new Date(y, mm + 2, 0)); }
  else { ini = sumaDias(fechas[0] || hoy, -2); fin = sumaDias(fechas[fechas.length - 1] || hoy, 2); }
  const n = difDias(ini, fin) + 1, ancho = n * W;
  const mats = S.materias.filter(m => !UI.esc.mat || m.id === UI.esc.mat);
  const visibles = S.escolares.filter(e => mats.some(m => m.id === e.materia) && e.entrega && (e.inicio || e.entrega) <= fin && e.entrega >= ini);
  // Encabezado: meses, días y conteo de entregas por día
  let meses = '', dias = '', carga = '', mesAnt = '';
  for (let i = 0; i < n; i++) {
    const iso = sumaDias(ini, i), d = deISO(iso), ds = d.getDay();
    if (iso.slice(0, 7) !== mesAnt) { mesAnt = iso.slice(0, 7); meses += `<div class="mescel" style="left:${i * W}px">${MESES_C[d.getMonth()]} ${d.getFullYear()}</div>`; }
    dias += `<div class="dcel ${ds === 0 || ds === 6 ? 'fs' : ''} ${iso === hoy ? 'hoy' : ''}" style="left:${i * W}px;width:${W}px"><b>${d.getDate()}</b>${'DLMMJVS'[ds]}</div>`;
    const c = visibles.filter(e => e.entrega === iso && e.tipo !== 'Vacaciones').length;
    if (c) carga += `<div class="ccel" title="${c} entrega(s) el ${esc(fFecha(iso))}" style="left:${i * W + 2}px;width:${W - 4}px;background:${c >= 3 ? 'var(--bad)' : c === 2 ? 'var(--warn)' : 'var(--ac-s)'};color:${c >= 2 ? '#fff' : 'var(--ac)'}">${c}</div>`;
  }
  const filas = mats.map(m => {
    const its = visibles.filter(e => e.materia === m.id).sort((a, b) => (a.inicio || a.entrega).localeCompare(b.inicio || b.entrega));
    const carriles = []; let barras = '';
    for (const e of its) {
      const a = Math.max(0, difDias(ini, e.inicio || e.entrega)), b = Math.min(n - 1, difDias(ini, e.entrega));
      let c = carriles.findIndex(f => f < a); if (c < 0) { c = carriles.length; carriles.push(-1); } carriles[c] = b;
      barras += `<div class="bar ${e.tipo === 'Vacaciones' ? 'vac' : esc(e.estatus)}" onclick="Esc.editar('${e.id}')" title="${esc(e.titulo)} · ${esc(fFecha(e.inicio))} → ${esc(fFecha(e.entrega))}${e.valor ? ' · ' + e.valor + ' pts' : ''}"
        style="left:${a * W + 1}px;width:${(b - a + 1) * W - 2}px;top:${c * 24 + 5}px;background:${esc(m.color)}">${['enviada', 'calificada'].includes(e.estatus) ? '✓ ' : ''}${esc(e.titulo)}</div>`;
    }
    return `<div class="fila"><div class="rot">${punto(m.color)}<span title="${esc(m.nombre)}">${esc(m.nombre)}</span></div><div class="pista" style="width:${ancho}px;height:${Math.max(1, carriles.length) * 24 + 8}px;background-size:${W}px 100%">${barras}</div></div>`;
  }).join('');
  const posHoy = hoy >= ini && hoy <= fin ? 170 + difDias(ini, hoy) * W + W / 2 : '';
  const etMes = `${MESES[mm - 1]} ${y}`;
  const mover = k => { const d = new Date(y, mm - 1 + k, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
  return `<div class="barra">${selMat}${filtro('esc', 'rango', [['mes', 'Mes'], ['tri', '3 meses'], ['todo', 'Todo el ciclo']])}
    ${UI.esc.rango !== 'todo' ? `<button class="btn ch" onclick="UI.esc.mes='${mover(-1)}';App.pintar()">‹</button><b style="min-width:120px;text-align:center">${may(etMes)}</b><button class="btn ch" onclick="UI.esc.mes='${mover(1)}';App.pintar()">›</button>
    <button class="btn ch" onclick="UI.esc.mes='${hoy.slice(0, 7)}';App.pintar()">Hoy</button>` : ''}</div>
  ${mats.length ? `<div class="tl" id="tl" data-hoy="${posHoy}"><div class="in" style="width:${ancho + 170}px">
    <div class="fila cabz"><div class="rot mut">Materia</div><div class="pista" style="width:${ancho}px;height:52px;background-image:none">${meses}${dias}</div></div>
    <div class="fila"><div class="rot mut">Entregas por día</div><div class="pista" style="width:${ancho}px;height:26px;background-size:${W}px 100%">${carga}</div></div>
    ${filas}${posHoy ? `<div class="hoyl" style="left:${posHoy}px"></div>` : ''}</div></div>
    <div class="ley"><span><i></i>Pendiente</span><span><i style="background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.5) 0 4px,transparent 4px 8px)"></i>En proceso</span><span><i style="opacity:.7"></i>Guardada</span><span><i style="opacity:.38"></i>Enviada / calificada</span>
    <span>Entregas por día: <b style="color:var(--ac)">1</b> · <b class="ambar">2</b> · <b class="rojo">3 o más</b></span></div>` : `<div class="panel">${vacio('Sin materias', 'Registra tus materias para ver la línea de tiempo.')}</div>`}`;
}

/* ---------- Modelo de evaluación ---------- */
function escEval(selMat) {
  const mats = S.materias.filter(m => !UI.esc.mat || m.id === UI.esc.mat);
  if (!mats.length) return `<div class="panel">${vacio('Sin materias', 'Registra tus materias y actividades con su valor en puntos.')}</div>`;
  return `<div class="barra">${selMat}<span class="d">La calificación se captura en puntos (0 al valor de cada actividad). La proyección supone que mantienes tu rendimiento actual.</span></div>
  <div class="panel">${mats.map(m => {
    const r = Esc.resumen(m), T = r.total || 1;
    const falta = r.meta - r.obtenido;
    const msg = !r.total ? '<span class="mut">Sin actividades con valor.</span>'
      : falta <= 0 ? `<span class="verde">Meta de ${r.meta} alcanzada.</span>`
      : falta > r.restante ? `<span class="rojo">La meta de ${r.meta} ya no es alcanzable: máximo posible ${r1(r.obtenido + r.restante)}.</span>`
      : `Para llegar a ${r.meta} necesitas <b>${r1(falta)}</b> de los <b>${r1(r.restante)}</b> puntos por evaluar (${Math.round(falta * 100 / r.restante)} %).`;
    return `<div class="eval"><div class="ln">${punto(m.color)}<span class="nm">${esc(m.nombre)}</span>${m.profesor ? `<span class="d">${esc(m.profesor)}</span>` : ''}<span class="esp"></span>
      ${r.total && Math.abs(r.total - 100) > 0.01 ? `<span class="et" title="Normalmente los valores de una materia suman 100">Los valores suman ${r1(r.total)}</span>` : ''}<button class="lnk gris" onclick="Esc.materia('${m.id}')">Editar materia</button></div>
      <div class="kp"><div><b>${r1(r.obtenido)}</b>puntos obtenidos</div><div><b>${r1(r.evaluado)}</b>puntos evaluados</div><div><b>${r.rend == null ? '—' : Math.round(r.rend * 100) + ' %'}</b>rendimiento</div>
        <div><b>${r.proy == null ? '—' : r1(r.proy)}</b>proyección final</div><div><b>${r.entregadas} / ${r.a.length}</b>actividades entregadas</div></div>
      <div class="pila" title="Obtenido / perdido / por evaluar"><i style="width:${r.obtenido * 100 / T}%;background:var(--ok)"></i><i style="width:${r.perdido * 100 / T}%;background:var(--bad);opacity:.55"></i>
        ${r.total ? `<span class="meta" data-t="Meta ${r.meta}" style="left:${Math.min(100, r.meta * 100 / T)}%"></span>` : ''}</div>
      <div style="margin-top:10px;font-size:13px">${msg}</div>
      ${r.a.length ? `<div class="scrollx" style="margin-top:10px"><table class="lista"><thead><tr><th>Actividad</th><th>Tipo</th><th>Entrega</th><th>Estado</th><th class="num">Valor</th><th class="num">Calificación</th><th class="num">%</th></tr></thead><tbody>
        ${r.a.slice().sort((a, b) => a.entrega.localeCompare(b.entrega)).map(e => `<tr><td><span class="t" onclick="Esc.editar('${e.id}')">${esc(e.titulo)}</span></td><td class="d">${esc(e.tipo)}</td><td class="d nw">${esc(fFecha(e.entrega))}</td>
          <td class="d">${esc((EST_ESC.find(x => x[0] === e.estatus) || ['', ''])[1])}</td><td class="num">${e.valor}</td>
          <td class="num"><input type="number" min="0" max="${e.valor}" step="0.1" value="${e.calif ?? ''}" onchange="Esc.calificar('${e.id}',this.value)" aria-label="Calificación"></td>
          <td class="num ${e.calif != null && e.calif / e.valor < 0.6 ? 'rojo' : ''}">${e.calif != null ? Math.round(e.calif * 100 / e.valor) + ' %' : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`; }).join('')}</div>`;
}

function escMaterias() {
  return `<div class="panel scrollx">${S.materias.length ? `<table class="lista"><thead><tr><th>Materia</th><th>Profesor(a)</th><th>Ciclo</th><th class="num">Actividades</th><th class="num">Puntos</th><th class="num">Meta</th><th></th></tr></thead><tbody>
    ${S.materias.map(m => { const r = Esc.resumen(m); return `<tr><td>${punto(m.color)}<span class="t" onclick="Esc.materia('${m.id}')">${esc(m.nombre)}</span></td><td class="d">${esc(m.profesor || '—')}</td><td class="d">${esc(m.ciclo || '—')}</td>
      <td class="num">${r.a.length}</td><td class="num">${r1(r.obtenido)} / ${r1(r.total)}</td><td class="num">${r.meta}</td><td class="num"><button class="lnk" onclick="UI.esc.mat='${m.id}';UI.esc.tab='eval';App.pintar()">Ver evaluación</button></td></tr>`; }).join('')}</tbody></table>`
    : vacio('Sin materias', 'Agrega tus materias con el botón “+ Materia”.')}</div>`;
}

/* ==========================================================================
   AGENDA
   ========================================================================== */
const Agenda = {
  TIPOS: ['Reunión', 'Revisión', 'Clase', 'Personal', 'Otro'],
  /** Todo lo que ocurre en un día: eventos, actividades, entregas, cumpleaños y recordatorios. */
  items(iso, todo) {
    const [, m, d] = iso.split('-').map(Number), r = [], ambP = id => (por('proyectos', id) || {}).ambito;
    for (const e of S.eventos) if (e.fecha === iso) r.push({ clase: 'evento', amb: e.tipo === 'Personal' ? 'Personal' : e.tipo === 'Clase' ? 'Escuela' : (ambP(e.proyecto) || 'Trabajo'), hora: e.horaIni || '', titulo: e.titulo + (e.lugar ? ' · ' + e.lugar : ''), tipo: e.tipo || 'Evento', color: 'var(--ac)', clic: `Agenda.evento('${e.id}')`, peso: 1 });
    for (const a of S.actividades) if (a.limite === iso && !estFinal(a.estatus)) r.push({ clase: 'actividad', amb: ambAct(a), cat: a.categoria || '', hora: a.hora || '', titulo: a.titulo, tipo: 'Actividad', color: (por('estatus', a.estatus) || {}).color, clic: `Act.editar('${a.id}')`, peso: 1 });
    for (const e of S.escolares) if (e.entrega === iso && e.tipo !== 'Vacaciones') r.push({ clase: 'entrega', amb: 'Escuela', hora: '', titulo: e.titulo, tipo: 'Entrega', color: (por('materias', e.materia) || {}).color, clic: `Esc.editar('${e.id}')`, peso: ['enviada', 'calificada'].includes(e.estatus) ? 0 : 1 });
    for (const c of S.cumples) if (c.dia === d && c.mes === m) r.push({ clase: 'cumple', amb: 'Personal', hora: '', titulo: 'Cumpleaños de ' + c.nombre, tipo: 'Cumpleaños', color: '#db2777', clic: `Cumples.editar('${c.id}')`, peso: 0 });
    for (const x of S.recordatorios) if (!x.hecho && Rec.ocurre(x, iso)) r.push({ clase: 'recordatorio', amb: '', hora: x.hora || '', titulo: x.texto, tipo: 'Recordatorio', color: 'var(--oro)', clic: `Rec.editar('${x.id}')`, peso: 0 });
    return r.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
  },
  /** Igual que items(), pero respetando las casillas "Mostrar" de la pantalla Agenda. */
  visibles(iso) { return this.items(iso).filter(x => UI.ag.ver[x.clase] !== false); },
  campos: () => [
    { k: 'titulo', label: 'Evento', req: true }, { k: 'fecha', label: 'Fecha', tipo: 'date', req: true, medio: true }, { k: 'tipo', label: 'Tipo', tipo: 'select', opciones: Agenda.TIPOS, medio: true },
    { k: 'horaIni', label: 'Hora de inicio', tipo: 'time', medio: true }, { k: 'horaFin', label: 'Hora de fin', tipo: 'time', medio: true },
    { k: 'proyecto', label: 'Proyecto relacionado', tipo: 'select', opciones: [['', 'Ninguno'], ...S.proyectos.map(p => [p.id, p.nombre])] }, { k: 'lugar', label: 'Lugar o enlace' }, { k: 'nota', label: 'Notas', tipo: 'textarea', filas: 2 }
  ],
  _validar: v => (v.horaIni && v.horaFin && v.horaFin < v.horaIni) ? 'La hora de fin no puede ser anterior al inicio' : null,
  /** Asigna un evento a un proyecto. Si hay más eventos con el mismo título sin proyecto, ofrece asignarlos también. */
  clasificar(id, proyecto) {
    const e = por('eventos', id); if (!e) return; e.proyecto = proyecto; guardar();
    const iguales = proyecto ? S.eventos.filter(x => x.id !== id && !x.proyecto && norm(x.titulo) === norm(e.titulo)) : [];
    const titulo = e.titulo, destino = (por('proyectos', proyecto) || {}).nombre;   // confirmar() escapa el mensaje completo antes de mostrarlo
    App.pintar();
    if (iguales.length) confirmar(`Hay ${iguales.length} evento(s) más llamados «${titulo}» sin proyecto. ¿Asignarlos también a «${destino}»?`, () => { iguales.forEach(x => { x.proyecto = proyecto; }); guardar(); App.pintar(); toast(`${iguales.length + 1} eventos clasificados`); }, 'Asignar todos');
    else toast(proyecto ? 'Evento clasificado' : 'Evento sin proyecto');
  },
  selec(id, on) { if (on) UI.ag.sel.add(id); else UI.ag.sel.delete(id); App.pintar(); },
  selecTodos(ids, on) { ids.forEach(i => on ? UI.ag.sel.add(i) : UI.ag.sel.delete(i)); App.pintar(); },
  /** Asigna (o quita) el proyecto a todos los eventos seleccionados. */
  clasificarSel(proyecto) {
    if (proyecto === '*') return;
    const n = UI.ag.sel.size; S.eventos.forEach(e => { if (UI.ag.sel.has(e.id)) e.proyecto = proyecto; });
    UI.ag.sel.clear(); guardar(); App.pintar(); toast(`${n} evento(s) ${proyecto ? 'clasificados' : 'sin proyecto'}`);
  },
  borrarSel() { confirmar(`¿Eliminar ${UI.ag.sel.size} evento(s) seleccionados?`, () => { S.eventos = S.eventos.filter(e => !UI.ag.sel.has(e.id)); UI.ag.sel.clear(); guardar(); App.pintar(); }); },
  evento(id, proyecto) {
    const e = id ? por('eventos', id) : null;
    Form.abrir({ titulo: e ? 'Editar evento' : 'Nuevo evento', campos: this.campos(), valores: e || { fecha: UI.ag.dia, tipo: 'Reunión', proyecto: proyecto || '' },
      guardar: v => { const er = this._validar(v); if (er) return er; poner('eventos', { id: e ? e.id : uid(), origen: e ? e.origen : 'local', ...v }); UI.ag.dia = v.fecha; UI.ag.mes = v.fecha.slice(0, 7); },
      eliminar: e ? () => quitar('eventos', e.id) : null });
  }
};
Vistas.agenda = () => {
  const hoy = hoyISO(), [y, m] = UI.ag.mes.split('-').map(Number);
  const mover = k => { const d = new Date(y, m - 1 + k, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
  const fila = i => `<li><span class="h">${esc(i.hora)}</span><span class="x clic" onclick="${i.clic}">${punto(i.color)}${esc(i.titulo)}</span><span class="m">${esc(i.tipo)}</span></li>`;
  let cuerpo;
  if (UI.ag.modo === 'mes') {
    const primero = new Date(y, m - 1, 1), desfase = (primero.getDay() + 6) % 7, ini = sumaDias(aISO(primero), -desfase);
    const semanas = Math.ceil((desfase + new Date(y, m, 0).getDate()) / 7);
    let celdas = '';
    for (let i = 0; i < semanas * 7; i++) {
      const iso = sumaDias(ini, i), its = Agenda.visibles(iso), peso = its.reduce((s, x) => s + x.peso, 0);
      const tinte = peso >= 5 ? 'color-mix(in srgb,var(--bad) 16%,transparent)' : peso >= 3 ? 'color-mix(in srgb,var(--warn) 15%,transparent)' : '';
      celdas += `<div class="c ${iso.slice(0, 7) !== UI.ag.mes ? 'fuera' : ''} ${iso === hoy ? 'hoy' : ''} ${iso === UI.ag.dia ? 'sel' : ''}" style="${tinte ? 'background:' + tinte : ''}" onclick="UI.ag.dia='${iso}';App.pintar()">
        <span class="nd">${deISO(iso).getDate()}</span>${its.slice(0, 3).map(x => `<div class="it">${punto(x.color)}${esc((x.hora ? x.hora + ' ' : '') + x.titulo)}</div>`).join('')}${its.length > 3 ? `<div class="mas">+${its.length - 3} más</div>` : ''}</div>`;
    }
    const sel = Agenda.visibles(UI.ag.dia);
    cuerpo = `<div class="ag"><div><div class="mes">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="dn">${d}</div>`).join('')}${celdas}</div>
      <div class="ley"><span>Carga del día:</span><span><i style="background:color-mix(in srgb,var(--warn) 30%,transparent)"></i>3–4 pendientes</span><span><i style="background:color-mix(in srgb,var(--bad) 30%,transparent)"></i>5 o más</span></div></div>
      <section class="blq"><h3 style="text-transform:none;letter-spacing:0;font-size:13.5px;color:var(--tx)"><span>${esc(may(fFechaLarga(UI.ag.dia)))}</span></h3>
        ${sel.length ? `<ul class="filas">${sel.map(fila).join('')}</ul>` : vacio('Día libre', '')}
        <div class="barra" style="padding:10px 14px;margin:0;border-top:1px solid var(--bd)"><button class="btn ch" onclick="Agenda.evento()">+ Evento</button><button class="btn ch" onclick="Rec.editar(null,'${UI.ag.dia}')">+ Recordatorio</button></div></section></div>`;
  } else if (UI.ag.modo === 'eventos') {
    const selP = (valor, alCambiar, extra = '') => `<select onchange="${alCambiar}" aria-label="Proyecto" style="max-width:230px">${extra}<option value="">Sin proyecto</option>${S.proyectos.map(p => `<option value="${p.id}" ${valor === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>`;
    let l = S.eventos.filter(e => (UI.ag.per === 'todos' || (UI.ag.per === 'prox' ? e.fecha >= hoy : e.fecha < hoy)) && (UI.ag.proy === '' || (UI.ag.proy === '-' ? !e.proyecto : e.proyecto === UI.ag.proy)) && coincide(UI.ag.q, e.titulo, e.lugar, e.nota));
    l.sort((a, b) => (b.fecha + (b.horaIni || '')).localeCompare(a.fecha + (a.horaIni || '')));
    for (const id of [...UI.ag.sel]) if (!l.some(e => e.id === id)) UI.ag.sel.delete(id);
    const ids = l.map(e => e.id), n = UI.ag.sel.size, sinP = S.eventos.filter(e => !e.proyecto).length;
    cuerpo = `<div class="barra">${filtro('ag', 'per', [['todos', 'Todos'], ['prox', 'Próximos'], ['pas', 'Pasados']])}
        <select onchange="UI.ag.proy=this.value;App.pintar()"><option value="">Todos los proyectos</option><option value="-" ${UI.ag.proy === '-' ? 'selected' : ''}>Sin proyecto (${sinP})</option>${S.proyectos.map(p => `<option value="${p.id}" ${UI.ag.proy === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
        ${campoBuscar('ag', 'agBuscar', 'Buscar evento…')}<span class="d">${l.length} evento(s)</span><span class="esp"></span>
        ${n ? `<span class="d">${n} seleccionado(s):</span>${selP('*', 'Agenda.clasificarSel(this.value)', '<option value="*" selected>Asignar a proyecto…</option>')}<button class="btn peligro" onclick="Agenda.borrarSel()">Eliminar</button>` : ''}</div>
      <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th style="width:30px"><input type="checkbox" ${n && n === ids.length ? 'checked' : ''} onchange="Agenda.selecTodos(${esc(JSON.stringify(ids))},this.checked)" aria-label="Seleccionar todos"></th><th>Fecha</th><th>Horario</th><th>Evento</th><th>Lugar</th><th>Proyecto</th></tr></thead><tbody>
        ${l.map(e => `<tr><td><input type="checkbox" ${UI.ag.sel.has(e.id) ? 'checked' : ''} onchange="Agenda.selec('${e.id}',this.checked)" aria-label="Seleccionar"></td><td class="nw">${esc(fFecha(e.fecha))}</td><td class="nw d">${esc(e.horaIni || 'Todo el día')}${e.horaFin ? '–' + esc(e.horaFin) : ''}</td>
          <td><span class="t" onclick="Agenda.evento('${e.id}')">${esc(e.titulo)}</span>${e.nota ? `<div class="d">${esc(e.nota)}</div>` : ''}</td><td class="d">${esc(e.lugar || '')}</td>
          <td>${selP(e.proyecto, `Agenda.clasificar('${e.id}',this.value)`)}</td></tr>`).join('')}</tbody></table>` : vacio('Sin eventos en esta vista', 'Cambia los filtros o carga tu agenda.')}</div>`;
  } else {
    let filas = '';
    for (let i = 0; i < 30; i++) { const iso = sumaDias(hoy, i), its = Agenda.visibles(iso); if (its.length) filas += `<tr class="grupo"><td colspan="3">${esc(may(fFechaLarga(iso)))}${i === 0 ? ' · hoy' : ''}</td></tr>` + its.map(x => `<tr><td class="d nw" style="width:70px">${esc(x.hora || '—')}</td><td>${punto(x.color)}<span class="t" onclick="${x.clic}">${esc(x.titulo)}</span></td><td class="d nw">${esc(x.tipo)}</td></tr>`).join(''); }
    cuerpo = `<div class="panel scrollx">${filas ? `<table class="lista"><tbody>${filas}</tbody></table>` : vacio('Sin eventos en los próximos 30 días', '')}</div>`;
  }
  return `${cab('Agenda', '', '<button class="btn" onclick="Foto.abrir()">Cargar por foto</button>' + btnCarga('eventos') + '<button class="btn pri" onclick="Agenda.evento()">+ Evento</button>')}
  <div class="barra">${filtro('ag', 'modo', [['mes', 'Mes'], ['lista', 'Próximos 30 días'], ['eventos', 'Eventos y proyectos']])}
    ${UI.ag.modo === 'mes' ? `<button class="btn ch" onclick="UI.ag.mes='${mover(-1)}';App.pintar()">‹</button><b style="min-width:130px;text-align:center">${may(MESES[m - 1])} ${y}</b><button class="btn ch" onclick="UI.ag.mes='${mover(1)}';App.pintar()">›</button>
    <button class="btn ch" onclick="UI.ag.mes='${hoy.slice(0, 7)}';UI.ag.dia='${hoy}';App.pintar()">Hoy</button>` : ''}
    ${UI.ag.modo === 'eventos' ? '' : `<span class="esp"></span><span class="d">Mostrar:</span>${[['evento', 'Eventos'], ['actividad', 'Actividades'], ['entrega', 'Entregas'], ['cumple', 'Cumpleaños'], ['recordatorio', 'Recordatorios']].map(([k, n]) => `<label class="d" style="display:inline-flex;gap:5px;align-items:center;cursor:pointer"><input type="checkbox" ${UI.ag.ver[k] !== false ? 'checked' : ''} onchange="UI.ag.ver.${k}=this.checked;App.pintar()">${n}</label>`).join('')}`}</div>${cuerpo}`;
};

/* ==========================================================================
   RECORDATORIOS
   ========================================================================== */
const Rec = {
  REP: [['', 'No se repite'], ['diario', 'Cada día'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes'], ['anual', 'Cada año']],
  ocurre(r, iso) {
    if (iso < r.fecha) return false; if (iso === r.fecha) return true; if (!r.repetir) return false;
    const a = deISO(r.fecha), b = deISO(iso);
    return r.repetir === 'diario' || (r.repetir === 'semanal' && a.getDay() === b.getDay()) || (r.repetir === 'mensual' && a.getDate() === b.getDate()) || (r.repetir === 'anual' && a.getDate() === b.getDate() && a.getMonth() === b.getMonth());
  },
  /** Siguiente fecha (posterior a hoy) de un recordatorio que se repite. */
  siguiente(r) { let f = r.fecha; const hoy = hoyISO(); for (let i = 0; i < 800; i++) { f = sumaDias(f, 1); if (f > hoy && this.ocurre(r, f)) return f; } return f; },
  editar(id, fecha) {
    const r = id ? por('recordatorios', id) : null;
    Form.abrir({ titulo: r ? 'Editar recordatorio' : 'Nuevo recordatorio', valores: r || { fecha: fecha || hoyISO(), hora: '09:00', repetir: '' },
      campos: [{ k: 'texto', label: 'Recordarme', req: true }, { k: 'fecha', label: 'Fecha', tipo: 'date', req: true, medio: true }, { k: 'hora', label: 'Hora', tipo: 'time', medio: true }, { k: 'repetir', label: 'Repetición', tipo: 'select', opciones: this.REP }],
      guardar: v => { poner('recordatorios', { id: r ? r.id : uid(), hecho: r ? r.hecho : false, ...v, avisado: '' }); }, eliminar: r ? () => quitar('recordatorios', r.id) : null });
  },
  hecho(id) {
    const r = por('recordatorios', id);
    if (r.repetir && !r.hecho) { r.fecha = this.siguiente(r); r.avisado = ''; toast('Listo. Próximo aviso: ' + fFecha(r.fecha)); } else r.hecho = !r.hecho;
    guardar(); App.pintar();
  },
  /** Revisa cada 30 s si algún recordatorio ya llegó a su hora y avisa una sola vez. */
  revisar() {
    const d = new Date(), ahora = `${aISO(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`; let cambio = false;
    for (const r of S.recordatorios) {
      if (r.hecho || r.avisado === r.fecha) continue;
      if (`${r.fecha} ${r.hora || '00:00'}` <= ahora) {
        r.avisado = r.fecha; cambio = true; toast('Recordatorio: ' + r.texto);
        if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(S.ajustes.nombre, { body: r.texto }); } catch (e) { /* sin soporte */ } }
      }
    }
    if (cambio) { guardar(); if (['inicio', 'recordatorios'].includes(App.vista) && !$('#modal').classList.contains('on')) App.pintar(); }
  },
  async permiso() {
    if (!('Notification' in window)) return toast('Este navegador no admite notificaciones', 'err');
    const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Notificaciones activadas' : 'No se concedió el permiso', p === 'granted' ? '' : 'err'); App.pintar();
  }
};
Vistas.recordatorios = () => {
  const hoy = hoyISO(), ord = (a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''));
  const R = S.recordatorios.filter(r => coincide(UI.rec.q, r.texto));
  const grupos = [['Vencidos y de hoy', R.filter(r => !r.hecho && r.fecha <= hoy).sort(ord)], ['Próximos', R.filter(r => !r.hecho && r.fecha > hoy).sort(ord)], ['Hechos', R.filter(r => r.hecho).sort(ord).reverse().slice(0, 30)]];
  const filas = grupos.filter(g => g[1].length).map(([t, l]) => `<tr class="grupo"><td colspan="5">${t} (${l.length})</td></tr>` + l.map(r => `<tr class="${r.hecho ? 'hecho' : ''}">
    <td style="width:30px"><input type="checkbox" ${r.hecho ? 'checked' : ''} onchange="Rec.hecho('${r.id}')" aria-label="Hecho"></td><td><span class="t" onclick="Rec.editar('${r.id}')">${esc(r.texto)}</span></td>
    <td class="nw">${fechaLim(r.fecha, r.hecho)}</td><td class="d nw">${esc(r.hora || '')}</td><td class="d nw">${esc((Rec.REP.find(x => x[0] === (r.repetir || '')) || ['', ''])[1])}</td></tr>`).join('')).join('');
  const sinPermiso = 'Notification' in window && Notification.permission !== 'granted';
  return `${cab('Recordatorios', '', `${sinPermiso ? '<button class="btn" onclick="Rec.permiso()">Activar notificaciones</button>' : ''}${btnCarga('recordatorios')}<button class="btn pri" onclick="Rec.editar()">+ Recordatorio</button>`)}
  <div class="barra">${campoBuscar('rec', 'rBuscar', 'Buscar recordatorio…')}<span class="d">Los avisos aparecen mientras la plataforma esté abierta en el navegador.</span></div>
  <div class="panel scrollx">${filas ? `<table class="lista"><thead><tr><th></th><th>Recordatorio</th><th>Fecha</th><th>Hora</th><th>Repetición</th></tr></thead><tbody>${filas}</tbody></table>` : vacio('Sin recordatorios', 'Crea uno con el botón “+ Recordatorio”.')}</div>`;
};
