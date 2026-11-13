'use strict';
/* ==========================================================================
   NOTAS (generales, por proyecto y privadas) + ACCESOS DIRECTOS + CUMPLEAÑOS + FRASES
   ========================================================================== */
const ahoraTxt = () => { const d = new Date(); return `${aISO(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
/** Repinta conservando el cursor en un campo de búsqueda. */
function buscar(obj, valor, idInput) { UI[obj].q = valor; App.pintar(); const i = $('#' + idInput); if (i) { i.focus(); i.setSelectionRange(valor.length, valor.length); } }

const Notas = {
  _t: null,
  priv: () => UI.notas.f === 'priv',
  visibles() {
    const f = UI.notas.f, q = UI.notas.q.toLowerCase();
    let l = this.priv() ? (Boveda.abierta() ? Boveda.notas.slice() : []) : S.notas.filter(n => f === 'todas' ? true : f === 'sin' ? !n.proyecto : n.proyecto === f);
    if (q) l = l.filter(n => ((n.titulo || '') + ' ' + (n.texto || '') + ' ' + (n.etiquetas || '')).toLowerCase().includes(q));
    return l.sort((a, b) => (!!b.fijada - !!a.fijada) || (b.actualizado || '').localeCompare(a.actualizado || ''));
  },
  actual() { return this.priv() ? Boveda.notas.find(n => n.id === UI.notas.id) : por('notas', UI.notas.id); },
  async nueva(proyecto) {
    const n = { id: uid(), titulo: '', texto: '', creado: ahoraTxt(), actualizado: ahoraTxt() };
    if (proyecto) UI.notas.f = proyecto;
    if (this.priv()) { if (!Boveda.abierta()) return toast('Primero desbloquea tus notas privadas', 'err'); await Boveda.guardarNota(n); }
    else poner('notas', { ...n, proyecto: proyecto || (['todas', 'sin'].includes(UI.notas.f) ? '' : UI.notas.f), etiquetas: '', fijada: false });
    UI.notas.id = n.id; UI.notas.q = '';
    if (App.vista !== 'notas') App.ir('notas'); else App.pintar();
    const t = $('#nTitulo'); if (t) t.focus();
  },
  /** Guarda mientras escribes, sin repintar toda la pantalla (para no perder el cursor). */
  cambio(campo, valor) {
    const n = this.actual(); if (!n) return;
    n[campo] = valor; n.actualizado = ahoraTxt();
    if (this.priv()) { clearTimeout(this._t); this._t = setTimeout(() => Boveda.guardarNota(n).catch(e => toast('No se pudo cifrar la nota: ' + e.message, 'err')), 400); }
    else guardar();
    const it = $('#ni_' + n.id);
    if (it) { it.querySelector('b').textContent = (n.fijada ? '★ ' : '') + (n.titulo || 'Sin título'); it.querySelector('span').textContent = (n.texto || '').slice(0, 60) || 'Sin contenido'; }
  },
  clasificar(valor) { const n = this.actual(); n.proyecto = valor; n.actualizado = ahoraTxt(); guardar(); App.pintar(); toast(valor ? 'Nota clasificada en el proyecto' : 'Nota sin clasificar'); },
  fijar() { const n = this.actual(); n.fijada = !n.fijada; guardar(); App.pintar(); },
  borrar() {
    confirmar('¿Eliminar esta nota? Irá a la papelera durante 7 días.', () => { if (this.priv()) Boveda.quitarNota(UI.notas.id); else quitar('notas', UI.notas.id); UI.notas.id = null; App.pintar(); toast('Nota enviada a la papelera'); });
  },
  /** Compara el texto leído de la foto con el texto corregido y guarda las correcciones. */
  aprender() {
    const n = this.actual(); if (!n || !n.ocr) return;
    const k = Correcciones.aprender(n.ocr, n.texto); n.ocr = n.texto;
    if (this.priv()) Boveda.guardarNota(n).catch(() => {}); else guardar();
    App.pintar(); toast(k ? `Aprendí ${k} corrección(es); las aplicaré en las próximas lecturas` : 'No encontré correcciones de palabras para aprender');
  },
  quitarFoto() { confirmar('¿Quitar la foto de esta nota? Irá a la papelera durante 7 días; el texto se conserva.', () => { Papelera.moverFoto(UI.notas.id); App.pintar(); toast('Foto enviada a la papelera'); }, 'Quitar foto'); },
  /* ---------- Nota desde foto (cuaderno, pizarrón, documento) ---------- */
  desdeFoto() {
    const priv = this.priv();
    Modal.abrir(`<div class="form"><h2>Nota desde foto</h2><div class="campos" style="display:block">
      <p class="d" style="margin-bottom:10px">La foto se lee en este equipo; no se envía a ningún lado. Funciona bien con texto impreso y con <b>letra de molde clara</b>. Con letra cursiva o muy junta el resultado puede ser pobre: revísalo siempre contra la foto.</p>
      <div class="barra"><input type="file" id="ntFoto" accept="image/*"><select id="ntGiro" aria-label="Orientación"><option value="auto">Orientación automática</option><option value="0">Sin girar</option><option value="90">Girar 90° a la derecha</option><option value="270">Girar 90° a la izquierda</option><option value="180">Girar 180°</option></select></div>
      ${priv ? '<p class="d">En notas privadas sólo se guarda el texto (cifrado); la foto no se conserva.</p>' : '<label class="chk" style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="ntGuardar" checked> Guardar la foto junto con la nota</label>'}
      <p class="d" id="ntProg" style="margin-top:8px"></p></div>
      <div class="acciones"><span class="esp"></span><button class="btn" type="button" onclick="Modal.cerrar()">Cancelar</button><button class="btn pri" type="button" id="ntLeer" onclick="Notas.leerFoto()">Leer y crear nota</button></div></div>`, 620);
  },
  async leerFoto() {
    const archivo = $('#ntFoto').files[0]; if (!archivo) return toast('Elige una foto', 'err');
    const priv = this.priv(), guardarFoto = !priv && $('#ntGuardar').checked, prog = t => { const p = $('#ntProg'); if (p) p.textContent = t; };
    $('#ntLeer').disabled = true; prog('Preparando el lector…');
    let datos, lectura;
    try { lectura = await Ocr.leerMejor(archivo, (txt, av) => prog(`${txt}… ${Math.round(av * 100)} %`), { giro: $('#ntGiro').value }); datos = lectura.data; }
    catch (e) { console.error(e); $('#ntLeer').disabled = false; prog(''); return toast('No se pudo leer la foto: ' + e.message, 'err'); }
    const texto = Correcciones.aplicar(Ocr.texto(datos)).slice(0, 100000), primera = (texto.split('\n').find(l => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(l)) || '').slice(0, 80);
    let img = '';
    if (guardarFoto) { try { img = await Img.agregar(archivo, 2000); } catch (e) { toast('La nota se creó, pero no se pudo guardar la foto: ' + e.message, 'err'); } }
    const n = { id: uid(), titulo: primera ? 'Foto: ' + primera : 'Nota desde foto', texto: texto || '(No se reconoció texto. Escríbelo a mano viendo la foto.)', ocr: texto, creado: ahoraTxt(), actualizado: ahoraTxt() };
    if (priv) await Boveda.guardarNota(n);
    else poner('notas', { ...n, img, proyecto: ['todas', 'sin'].includes(UI.notas.f) ? '' : UI.notas.f, etiquetas: 'foto', fijada: false });
    UI.notas.id = n.id; UI.notas.q = ''; Modal.cerrar(); App.pintar();
    const pocas = lectura.buenas < 5;
    toast(pocas ? 'Nota creada, pero se reconoció muy poco texto (la letra manuscrita ligada no se lee bien): corrígela viendo la foto' : 'Nota creada: revisa el texto y usa «Aprender de mis correcciones» al terminar', pocas ? 'err' : '');
  },
  async hacerPrivada() {
    if (!S.boveda) { UI.notas.f = 'priv'; App.pintar(); return toast('Primero crea la contraseña de tus notas privadas'); }
    if (!Boveda.abierta()) return toast('Desbloquea tus notas privadas (filtro “Privadas”) y vuelve a intentarlo', 'err');
    const n = this.actual();
    await Boveda.guardarNota({ id: n.id, titulo: n.titulo, texto: n.texto, creado: n.creado, actualizado: ahoraTxt() });
    if (n.img) { await Img.quitar(n.img); toast('La foto de la nota se eliminó: en notas privadas sólo se guarda el texto cifrado'); }
    retirar('notas', n.id); UI.notas.f = 'priv'; App.pintar(); toast('La nota ahora es privada y está cifrada');
  },
  quitarPrivacidad() {
    confirmar('La nota dejará de estar cifrada y quedará como nota general. ¿Continuar?', () => {
      const n = this.actual(); poner('notas', { ...n, proyecto: '', etiquetas: '', fijada: false }); Boveda.quitarNota(n.id, false); UI.notas.f = 'sin'; App.pintar();
    }, 'Quitar privacidad');
  },
  async crearBoveda() {
    const a = $('#bvA').value, b = $('#bvB').value;
    if (a.length < 8) return toast('La contraseña debe tener al menos 8 caracteres', 'err');
    if (a !== b) return toast('Las contraseñas no coinciden', 'err');
    await Boveda.crear(a); App.pintar(); toast('Notas privadas activadas');
  },
  async desbloquear() {
    const ok = await Boveda.abrir($('#bvP').value);
    if (!ok) { toast('Contraseña incorrecta', 'err'); $('#bvP').select(); return; }
    App.pintar();
  },
  bloquear() { Boveda.cerrar(); UI.notas.id = null; App.pintar(); }
};

Vistas.notas = () => {
  const priv = Notas.priv();
  const filtros = `<div class="barra">${filtro('notas', 'f', [['todas', 'Todas'], ['sin', 'Sin clasificar'], ['priv', 'Privadas']])}
    <select onchange="UI.notas.f=this.value||'todas';UI.notas.id=null;App.pintar()"><option value="">Por proyecto…</option>${S.proyectos.map(p => `<option value="${p.id}" ${UI.notas.f === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
    ${priv && Boveda.abierta() ? '<button class="btn" onclick="Notas.bloquear()">Bloquear ahora</button>' : ''}</div>`;
  const encabezado = cab('Notas', `${S.notas.length} notas · ${S.notas.filter(n => !n.proyecto).length} sin clasificar · ${S.notasPriv.length} privadas`, (priv ? '' : btnCarga('notas')) + ((!priv || Boveda.abierta()) ? (Ocr.disponible() ? '<button class="btn" onclick="Notas.desdeFoto()">Nota desde foto</button>' : '') + '<button class="btn pri" onclick="Notas.nueva()">+ Nota</button>' : ''));
  // --- Estados de la bóveda ---
  if (priv && !Boveda.disponible()) return encabezado + filtros + `<div class="panel">${vacio('Cifrado no disponible', 'Abre la plataforma con https:// o desde un archivo local en un navegador actualizado para usar notas privadas.')}</div>`;
  if (priv && !S.boveda) return encabezado + filtros + `<div class="panel" style="max-width:520px"><div class="cuerpo">
      <b>Crear contraseña para notas privadas</b>
      <p class="d" style="margin:6px 0 12px">Las notas privadas se cifran (AES-256) con esta contraseña. No se guarda en ningún lado: <b class="rojo">si la olvidas, las notas no se pueden recuperar.</b></p>
      <div class="reng"><label for="bvA">Contraseña (mín. 8)</label><input type="password" id="bvA" autocomplete="new-password"></div>
      <div class="reng"><label for="bvB">Repetir contraseña</label><input type="password" id="bvB" autocomplete="new-password" onkeydown="if(event.key==='Enter')Notas.crearBoveda()"></div>
      <button class="btn pri" onclick="Notas.crearBoveda()">Activar notas privadas</button></div></div>`;
  if (priv && !Boveda.abierta()) return encabezado + filtros + `<div class="panel" style="max-width:520px"><div class="cuerpo">
      <b>Notas privadas bloqueadas</b><p class="d" style="margin:6px 0 12px">Hay ${S.notasPriv.length} nota(s) cifrada(s). Se bloquean solas tras 5 minutos sin uso.</p>
      <div class="barra"><input type="password" id="bvP" placeholder="Contraseña" autocomplete="current-password" onkeydown="if(event.key==='Enter')Notas.desbloquear()"><button class="btn pri" onclick="Notas.desbloquear()">Desbloquear</button></div></div></div>`;
  // --- Lista + editor ---
  const l = Notas.visibles();
  if (!l.some(n => n.id === UI.notas.id)) UI.notas.id = l.length ? l[0].id : null;
  const n = Notas.actual();
  const editor = !n ? vacio('Sin notas aquí', 'Crea una con el botón “+ Nota”. Puedes escribirla sin clasificar y asignarla a un proyecto después.') : `
    <div class="hd">${priv ? '<span class="et ac">Privada · cifrada</span>' : `<select onchange="Notas.clasificar(this.value)" aria-label="Proyecto"><option value="">Sin clasificar</option>${S.proyectos.map(p => `<option value="${p.id}" ${n.proyecto === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
      <input type="text" value="${esc(n.etiquetas || '')}" placeholder="Etiquetas" style="width:150px" oninput="Notas.cambio('etiquetas',this.value)">`}
      <span class="esp"></span><span class="d">${esc(fFecha((n.actualizado || '').slice(0, 10)))} ${esc((n.actualizado || '').slice(11))}</span>
      ${priv ? '<button class="lnk gris" onclick="Notas.quitarPrivacidad()">Quitar privacidad</button>' : `<button class="lnk gris" onclick="Notas.fijar()">${n.fijada ? 'Quitar fijado' : 'Fijar'}</button><button class="lnk gris" onclick="Notas.hacerPrivada()">Hacer privada</button>`}
      ${n.ocr ? '<button class="lnk" onclick="Notas.aprender()" title="Guarda cómo corregiste el texto leído para mejorar las próximas lecturas">Aprender de mis correcciones</button>' : ''}
      <button class="lnk rojo" onclick="Notas.borrar()">Eliminar</button></div>
    <input class="tit" id="nTitulo" type="text" value="${esc(n.titulo || '')}" placeholder="Título" oninput="Notas.cambio('titulo',this.value)">
    ${!priv && n.img && Img.url(n.img) ? `<div style="display:flex;gap:10px;padding:4px 16px 0;align-items:flex-end"><img src="${Img.url(n.img)}" alt="Foto de la nota" style="max-height:150px;max-width:60%;border:1px solid var(--bd);border-radius:6px;cursor:zoom-in" onclick="verImagen(this.src)"><button class="lnk gris" onclick="Notas.quitarFoto()">Quitar foto</button></div>` : ''}
    <textarea placeholder="Escribe aquí…" oninput="Notas.cambio('texto',this.value)">${esc(n.texto || '')}</textarea>`;
  return `${encabezado}${filtros}<div class="nt"><div class="izq"><div class="bq"><input type="search" id="nBuscar" placeholder="Buscar en notas…" value="${esc(UI.notas.q)}" oninput="buscar('notas',this.value,'nBuscar')"></div>
    <div class="ls">${l.map(x => { const p = x.proyecto && por('proyectos', x.proyecto); return `<div class="it ${x.id === UI.notas.id ? 'on' : ''}" id="ni_${x.id}" onclick="UI.notas.id='${x.id}';App.pintar()"><b>${x.fijada ? '★ ' : ''}${esc(x.titulo || 'Sin título')}</b><span>${esc((x.texto || '').slice(0, 60) || 'Sin contenido')}</span>
      ${!priv ? `<span>${p ? esc(p.nombre) : 'Sin clasificar'}</span>` : ''}</div>`; }).join('') || '<div class="vacio">Sin resultados</div>'}</div></div>
    <div class="der">${editor}</div></div>`;
};

/* ==========================================================================
   ACCESOS DIRECTOS (versión integrada de LinkManager)
   ========================================================================== */
const Acc = {
  host(u) { try { return new URL(urlSegura(u)).hostname.replace(/^www\./, ''); } catch (e) { return ''; } },
  campos: () => [
    { k: 'nombre', label: 'Nombre', req: true }, { k: 'url', label: 'Dirección (URL)', req: true, ph: 'https://…' },
    { k: 'carpeta', label: 'Carpeta', tipo: 'select', opciones: [['', 'Sin carpeta'], ...S.carpetas.map(c => [c.id, c.nombre])], medio: true },
    { k: 'tags', label: 'Etiquetas', medio: true, ph: 'separadas por coma' }, { k: 'desc', label: 'Descripción' }, { k: 'fav', label: 'Favorito', tipo: 'check', texto: 'Mostrar en Inicio' }
  ],
  editar(id) {
    const l = id ? por('enlaces', id) : null;
    Form.abrir({ titulo: l ? 'Editar acceso directo' : 'Nuevo acceso directo', campos: this.campos(), valores: l || { carpeta: S.carpetas.some(c => c.id === UI.acc.f) ? UI.acc.f : '' },
      guardar: v => { const u = urlSegura(v.url); if (!u) return 'La dirección no es válida (sólo http, https o mailto)'; poner('enlaces', { id: l ? l.id : uid(), ...v, url: u }); },
      eliminar: l ? () => quitar('enlaces', l.id) : null });
  },
  carpeta(id) {
    const c = id ? por('carpetas', id) : null;
    Form.abrir({ titulo: c ? 'Editar carpeta' : 'Nueva carpeta', campos: [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'color', label: 'Color', tipo: 'color' }], valores: c || { color: PALETA[S.carpetas.length % PALETA.length] },
      guardar: v => { poner('carpetas', { id: c ? c.id : uid(), ...v }); },
      eliminar: c ? () => { Papelera.mover('carpetas', c.id, { des: [{ lista: 'enlaces', campo: 'carpeta' }] }); UI.acc.f = 'todos'; } : null });
  },
  fav(id) { const l = por('enlaces', id); l.fav = !l.fav; guardar(); App.pintar(); },
  sel(id, on) { if (on) UI.acc.sel.add(id); else UI.acc.sel.delete(id); App.pintar(); },
  abrir(ids) {
    const urls = ids.map(i => por('enlaces', i)).filter(Boolean).map(l => urlSegura(l.url)).filter(Boolean); let abiertas = 0;
    for (const u of urls) if (window.open(u, '_blank', 'noopener')) abiertas++;
    if (abiertas < urls.length) toast('El navegador bloqueó algunas pestañas. Permite las ventanas emergentes para este sitio.', 'err');
  },
  grupoNuevo() {
    Form.abrir({ titulo: 'Guardar selección como grupo', campos: [{ k: 'nombre', label: 'Nombre del grupo', req: true, ayuda: 'Un grupo abre todos sus accesos con un clic (p. ej. “Inicio de jornada”).' }],
      guardar: v => { poner('grupos', { id: uid(), nombre: v.nombre, ids: [...UI.acc.sel] }); UI.acc.sel.clear(); } });
  },
  grupoBorrar(id) { confirmar('¿Eliminar el grupo? Irá a la papelera; los accesos no se borran.', () => { quitar('grupos', id); App.pintar(); toast('Grupo enviado a la papelera'); }); }
};
Vistas.accesos = () => {
  const f = UI.acc.f, q = UI.acc.q.toLowerCase();
  let l = S.enlaces.filter(x => f === 'todos' ? true : f === 'fav' ? x.fav : f === 'sin' ? !x.carpeta : x.carpeta === f);
  if (q) l = l.filter(x => (x.nombre + ' ' + x.url + ' ' + (x.tags || '') + ' ' + (x.desc || '')).toLowerCase().includes(q));
  l.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const n = UI.acc.sel.size, carp = S.carpetas.find(c => c.id === f);
  return `${cab('Accesos directos', `${S.enlaces.length} accesos · ${S.enlaces.filter(x => x.fav).length} favoritos`, btnCarga('enlaces') + '<button class="btn" onclick="Acc.carpeta()">+ Carpeta</button><button class="btn pri" onclick="Acc.editar()">+ Acceso</button>')}
  <div class="barra"><input type="search" id="aBuscar" placeholder="Buscar por nombre, dirección o etiqueta…" style="width:300px" value="${esc(UI.acc.q)}" oninput="buscar('acc',this.value,'aBuscar')">
    <select onchange="UI.acc.f=this.value;App.pintar()"><option value="todos">Todas las carpetas</option><option value="fav" ${f === 'fav' ? 'selected' : ''}>★ Favoritos</option><option value="sin" ${f === 'sin' ? 'selected' : ''}>Sin carpeta</option>
      ${S.carpetas.map(c => `<option value="${c.id}" ${f === c.id ? 'selected' : ''}>${esc(c.nombre)} (${S.enlaces.filter(x => x.carpeta === c.id).length})</option>`).join('')}</select>
    ${carp ? `<button class="lnk gris" onclick="Acc.carpeta('${carp.id}')">Editar carpeta</button>` : ''}<span class="esp"></span>
    ${n ? `<span class="d">${n} seleccionado(s)</span><button class="btn" onclick="Acc.abrir([...UI.acc.sel])">Abrir en pestañas</button><button class="btn" onclick="Acc.grupoNuevo()">Guardar como grupo</button><button class="lnk gris" onclick="UI.acc.sel.clear();App.pintar()">Limpiar</button>` : ''}</div>
  ${S.grupos.length ? `<div class="barra"><span class="d">Grupos:</span>${S.grupos.map(g => `<span class="fil"><button onclick="Acc.abrir(${esc(JSON.stringify(g.ids))})" title="Abrir todos">${esc(g.nombre)} (${g.ids.length}) ↗</button><button onclick="Acc.grupoBorrar('${g.id}')" title="Eliminar grupo">×</button></span>`).join('')}</div>` : ''}
  <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th style="width:30px"></th><th style="width:30px"></th><th>Nombre</th><th>Sitio</th><th>Carpeta</th><th>Etiquetas</th><th></th></tr></thead><tbody>
    ${l.map(x => { const c = por('carpetas', x.carpeta); return `<tr><td><input type="checkbox" ${UI.acc.sel.has(x.id) ? 'checked' : ''} onchange="Acc.sel('${x.id}',this.checked)" aria-label="Seleccionar"></td>
      <td><button class="lnk ${x.fav ? '' : 'gris'}" onclick="Acc.fav('${x.id}')" title="Favorito" style="font-size:15px">${x.fav ? '★' : '☆'}</button></td>
      <td><a href="${esc(urlSegura(x.url))}" target="_blank" rel="noopener noreferrer" style="font-weight:500">${esc(x.nombre)}</a>${x.desc ? `<div class="d">${esc(x.desc)}</div>` : ''}</td>
      <td class="d">${esc(Acc.host(x.url))}</td><td class="nw">${c ? punto(c.color) + esc(c.nombre) : '<span class="mut">—</span>'}</td>
      <td>${String(x.tags || '').split(/[,;]/).map(t => t.trim()).filter(Boolean).map(t => `<span class="et">${esc(t)}</span>`).join(' ')}</td>
      <td class="num"><button class="lnk gris" onclick="Acc.editar('${x.id}')">Editar</button></td></tr>`; }).join('')}</tbody></table>`
    : vacio('Sin accesos directos', 'Agrega tus sitios frecuentes o importa tu CSV de LinkManager en Ajustes → Datos.')}</div>`;
};

/* ==========================================================================
   CUMPLEAÑOS
   ========================================================================== */
const Cumples = {
  proximos() {
    const hoy = hoyISO(), y = +hoy.slice(0, 4);
    return S.cumples.map(c => {
      let f = aISO(new Date(y, c.mes - 1, c.dia)); if (f < hoy) f = aISO(new Date(y + 1, c.mes - 1, c.dia));
      return { ...c, fecha: f, faltan: difDias(hoy, f), edad: c.anio ? +f.slice(0, 4) - c.anio : null };
    }).sort((a, b) => a.faltan - b.faltan);
  },
  editar(id) {
    const c = id ? por('cumples', id) : null;
    Form.abrir({ titulo: c ? 'Editar cumpleaños' : 'Nuevo cumpleaños', valores: c || { mes: new Date().getMonth() + 1 },
      campos: [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'dia', label: 'Día', tipo: 'number', min: 1, max: 31, req: true, medio: true },
               { k: 'mes', label: 'Mes', tipo: 'select', opciones: MESES.map((m, i) => [i + 1, m]), medio: true }, { k: 'anio', label: 'Año de nacimiento (opcional)', tipo: 'number', min: 1900, max: 2100, medio: true },
               { k: 'relacion', label: 'Relación', medio: true, ph: 'Familia, amigos, trabajo…' }, { k: 'nota', label: 'Notas / ideas de regalo', tipo: 'textarea', filas: 2 }],
      guardar: v => { v.mes = +v.mes; if (v.dia > new Date(2024, v.mes, 0).getDate()) return 'Ese día no existe en el mes elegido'; poner('cumples', { id: c ? c.id : uid(), ...v }); },
      eliminar: c ? () => quitar('cumples', c.id) : null });
  }
};
Vistas.cumples = () => {
  const todos = Cumples.proximos(), rels = [...new Set(S.cumples.map(c => c.relacion).filter(Boolean))].sort();
  const l = todos.filter(c => (!UI.cum.rel || c.relacion === UI.cum.rel) && coincide(UI.cum.q, c.nombre, c.nota, c.relacion));
  return `${cab('Cumpleaños', `${todos.length} personas · ${todos.filter(c => c.faltan <= 30).length} en los próximos 30 días`, btnCarga('cumples') + '<button class="btn pri" onclick="Cumples.editar()">+ Cumpleaños</button>')}
  <div class="barra">${campoBuscar('cum', 'cBuscar', 'Buscar persona…')}<select onchange="UI.cum.rel=this.value;App.pintar()"><option value="">Todas las relaciones</option>${rels.map(r => `<option ${UI.cum.rel === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
  <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th>Nombre</th><th>Fecha</th><th>Faltan</th><th>Cumple</th><th>Relación</th><th>Notas</th></tr></thead><tbody>
    ${l.map(c => `<tr><td><span class="t" onclick="Cumples.editar('${c.id}')">${esc(c.nombre)}</span></td><td class="nw">${c.dia} de ${MESES[c.mes - 1]}</td>
      <td class="nw ${c.faltan === 0 ? 'rojo' : c.faltan <= 7 ? 'ambar' : ''}">${c.faltan === 0 ? '<b>Hoy</b>' : c.faltan === 1 ? 'Mañana' : c.faltan + ' días'}</td>
      <td class="d">${c.edad ? c.edad + ' años' : '—'}</td><td class="d">${esc(c.relacion || '—')}</td><td class="d">${esc(c.nota || '')}</td></tr>`).join('')}</tbody></table>`
    : vacio('Sin cumpleaños registrados', 'Agrégalos uno por uno o impórtalos por CSV en Ajustes → Datos.')}</div>`;
};

/* ==========================================================================
   FRASES DEL DÍA (texto y/o imagen; cambia cada día)
   ========================================================================== */
const Frases = {
  editar(id) {
    const f = id ? por('frases', id) : null;
    Form.abrir({ titulo: f ? 'Editar frase' : 'Nueva frase del día', valores: f || {},
      campos: [{ k: 'texto', label: 'Frase', tipo: 'textarea', filas: 3, ayuda: 'Puedes dejarla vacía si la imagen ya contiene el texto.' }, { k: 'autor', label: 'Autor' },
               { k: 'archivo', label: f && f.img ? 'Cambiar imagen' : 'Imagen', tipo: 'imagen', actual: f ? Img.url(f.img) : '' }],
      guardar: async v => {
        if (!v.texto && !v.archivo && !(f && f.img)) return 'Escribe una frase o elige una imagen';
        let img = f ? f.img : null;
        if (v.archivo) { const nueva = await Img.agregar(v.archivo, 1800); if (img) await Img.quitar(img); img = nueva; }
        poner('frases', { id: f ? f.id : uid(), texto: v.texto, autor: v.autor, img, vista: f ? (f.vista || '') : '' });
      },
      eliminar: f ? () => quitar('frases', f.id) : null });
  },
  /** Marca la frase de hoy como vista y elige otra pendiente. */
  otra() { const a = S.ajustes.fraseHoy, f = a && por('frases', a.id); if (f) f.vista = hoyISO(); elegirFrase(f ? f.id : ''); App.pintar(); },
  /** Borra las marcas de "vista" para que todas vuelvan a entrar al sorteo. */
  reiniciar() { confirmar('Todas las frases volverán a estar pendientes de mostrarse. ¿Continuar?', () => { S.frases.forEach(f => { f.vista = ''; }); S.ajustes.fraseHoy = null; guardar(); App.pintar(); toast('Ciclo reiniciado'); }, 'Reiniciar'); },
  /** Carga varias imágenes de una vez: cada una se convierte en una frase. */
  async varias(input) {
    let n = 0;
    for (const a of input.files) { try { const img = await Img.agregar(a, 1800); S.frases.push({ id: uid(), texto: '', autor: '', img, vista: '' }); n++; } catch (e) { toast(e.message, 'err'); } }
    input.value = ''; if (n) { guardar(); App.pintar(); toast(`${n} imagen(es) agregada(s)`); }
  }
};
Vistas.frases = () => {
  const hoy = fraseDelDia(), finde = esFinDeSemana(hoyISO()), vistas = S.frases.filter(f => f.vista).length, pend = S.frases.length - vistas - (hoy && !hoy.vista ? 1 : 0);
  const estado = f => hoy && hoy.id === f.id ? '<span class="et ac">Hoy</span>' : f.vista ? `<span class="d">Vista el ${esc(fFecha(f.vista))}</span>` : '<span class="et">Pendiente</span>';
  return `${cab('Frases del día', `${S.frases.length} cargadas · ${vistas} vistas · ${Math.max(0, pend)} pendientes`,
    '<input type="file" id="fVarias" accept="image/*" multiple hidden onchange="Frases.varias(this)"><button class="btn" onclick="document.getElementById(\'fVarias\').click()">Subir varias imágenes</button>' + btnCarga('frases') + (vistas ? '<button class="btn" onclick="Frases.reiniciar()">Reiniciar ciclo</button>' : '') + '<button class="btn pri" onclick="Frases.editar()">+ Frase</button>')}
  <p class="d" style="margin-bottom:12px">De lunes a viernes aparece en Inicio una frase al azar que no se haya mostrado. Al día siguiente queda marcada como vista y entra otra; cuando se terminan, el ciclo vuelve a empezar.${finde ? ' <b>Hoy es fin de semana: el carrusel descansa y no avanza.</b>' : ''}</p>
  <div class="panel scrollx">${S.frases.length ? `<table class="lista"><thead><tr><th style="width:110px">Imagen</th><th>Frase</th><th>Autor</th><th>Estado</th></tr></thead><tbody>
    ${S.frases.map(f => `<tr><td>${f.img ? `<img src="${Img.url(f.img)}" alt="" style="height:48px;width:86px;object-fit:cover;border-radius:5px;display:block;cursor:zoom-in" onclick="verImagen(this.src)">` : '<span class="mut">—</span>'}</td>
      <td><span class="t" onclick="Frases.editar('${f.id}')">${esc(f.texto || '(sólo imagen)')}</span></td><td class="d">${esc(f.autor || '')}</td><td class="nw">${estado(f)}</td></tr>`).join('')}</tbody></table>`
    : vacio('Aún no hay frases', 'Sube imágenes o escribe frases; de lunes a viernes verás una diferente en la pantalla de Inicio.')}</div>`;
};
