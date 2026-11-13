'use strict';
/* ==========================================================================
   PAPELERA DE RECICLAJE
   --------------------------------------------------------------------------
   Todo lo que se elimina pasa aquí durante 7 días; después se borra definitivamente
   (incluidas sus imágenes). Cada entrada guarda lo necesario para restaurar el elemento
   como estaba: el registro, los registros que se fueron con él (p. ej. la bitácora de un
   proyecto) y los vínculos que se quitaron a otros registros (p. ej. actividades que
   quedaron sin proyecto).
   Entrada: { id, lista, titulo, ms, obj, rel: [{lista, objs}], des: [{lista, campo, ids}] }
   ========================================================================== */
const Papelera = {
  DIAS: 7,
  // Qué se puede eliminar, cómo se llama y qué campo lo describe
  TIPOS: {
    proyectos: ['Proyecto', 'nombre'], actividades: ['Actividad', 'titulo'], bitacora: ['Bitácora', 'texto'], notas: ['Nota', 'titulo'],
    notasPriv: ['Nota privada', ''], recordatorios: ['Recordatorio', 'texto'], eventos: ['Evento', 'titulo'], cumples: ['Cumpleaños', 'nombre'],
    materias: ['Materia', 'nombre'], escolares: ['Actividad escolar', 'titulo'], carpetas: ['Carpeta', 'nombre'], enlaces: ['Acceso directo', 'nombre'],
    grupos: ['Grupo de accesos', 'nombre'], frases: ['Frase', 'texto'], estatus: ['Estatus', 'nombre'], categorias: ['Clasificación', 'nombre'],
    fotoNota: ['Foto de nota', ''], correcciones: ['Corrección del lector', 'mal']
  },
  // Campos de vínculo que se pueden quitar y volver a poner al restaurar
  VINCULOS: { actividades: ['proyecto', 'categoria'], notas: ['proyecto'], eventos: ['proyecto'], enlaces: ['carpeta'] },
  vence: e => e.ms + Papelera.DIAS * 864e5,
  /** Días completos que faltan para el borrado definitivo (0 = menos de un día). */
  dias: e => Math.max(0, Math.floor((Papelera.vence(e) - Date.now()) / 864e5)),

  /**
   * Mueve un registro a la papelera.
   * rel: registros de otras listas que se eliminan junto con él, p. ej. [{ lista: 'bitacora', filtro: b => b.proyecto === id }]
   * des: vínculos que se quitan en otras listas, p. ej. [{ lista: 'actividades', campo: 'proyecto' }] (se quitan los que apuntan a id)
   */
  mover(lista, id, { rel = [], des = [], titulo } = {}) {
    const obj = S[lista].find(x => x.id === id); if (!obj) return false;
    S[lista] = S[lista].filter(x => x.id !== id);
    const e = { id: uid(), lista, ms: Date.now(), obj, rel: [], des: [], titulo: titulo || this._titulo(lista, obj) };
    for (const r of rel) { const objs = S[r.lista].filter(r.filtro); if (objs.length) { S[r.lista] = S[r.lista].filter(x => !objs.includes(x)); e.rel.push({ lista: r.lista, objs }); } }
    for (const d of des) { const ids = []; S[d.lista].forEach(x => { if (x[d.campo] === id) { x[d.campo] = ''; ids.push(x.id); } }); if (ids.length) e.des.push({ lista: d.lista, campo: d.campo, ids }); }
    if (lista === 'enlaces') {   // los grupos que lo incluían
      const gs = S.grupos.filter(g => (g.ids || []).includes(id)).map(g => g.id);
      S.grupos.forEach(g => { g.ids = (g.ids || []).filter(x => x !== id); }); if (gs.length) e.des.push({ lista: 'grupos', campo: 'ids', ids: gs });
    }
    S.papelera.push(e); guardar(); return true;
  },
  /** La foto de una nota es un elemento aparte: se guarda en la papelera y puede volver a su nota. */
  moverFoto(notaId) {
    const n = por('notas', notaId); if (!n || !n.img) return;
    S.papelera.push({ id: uid(), lista: 'fotoNota', ms: Date.now(), titulo: 'Foto de la nota «' + String(n.titulo || 'Sin título').slice(0, 80) + '»', obj: { id: uid(), img: n.img, nota: n.id }, rel: [], des: [] });
    n.img = ''; n.actualizado = ahoraTxt(); guardar();
  },
  _titulo(lista, o) {
    const [tipo, campo] = this.TIPOS[lista] || ['Elemento', ''];
    const t = campo ? String(o[campo] || '').replace(/\s+/g, ' ').trim() : '';
    if (lista === 'notasPriv') return 'Nota privada (contenido cifrado)';
    return (t || (lista === 'frases' && o.img ? '(frase de sólo imagen)' : 'Sin título')).slice(0, 120);
  },

  /** Restaura una entrada. Devuelve un mensaje de error si no se puede. */
  restaurar(eid) {
    const e = S.papelera.find(x => x.id === eid); if (!e) return 'La entrada ya no existe';
    // Requisitos: la bitácora necesita su proyecto y la actividad escolar su materia
    if (e.lista === 'bitacora' && !por('proyectos', e.obj.proyecto)) return 'Primero restaura el proyecto de esta entrada de bitácora';
    if (e.lista === 'escolares' && !por('materias', e.obj.materia)) return 'Primero restaura la materia de esta actividad';
    if (e.lista === 'fotoNota') {
      const n = por('notas', e.obj.nota);
      if (!n) return 'La nota de esta foto ya no existe: restaura primero la nota';
      if (n.img) return 'Esa nota ya tiene otra foto; quítala primero';
      n.img = e.obj.img; n.actualizado = ahoraTxt(); S.papelera = S.papelera.filter(x => x.id !== eid); guardar(); return '';
    }
    const pon = (lista, o) => { if (!S[lista].some(x => x.id === o.id)) S[lista].push(o); };
    pon(e.lista, e.obj);
    for (const r of e.rel) for (const o of r.objs) pon(r.lista, o);
    for (const d of e.des) {
      if (d.lista === 'grupos') S.grupos.forEach(g => { if (d.ids.includes(g.id) && !g.ids.includes(e.obj.id)) g.ids.push(e.obj.id); });
      else S[d.lista].forEach(x => { if (d.ids.includes(x.id) && !x[d.campo]) x[d.campo] = e.obj.id; });   // sólo si sigue sin vínculo
    }
    // Vínculos del propio registro a elementos que ya no existen: se quitan
    const existe = { proyecto: 'proyectos', categoria: 'categorias', carpeta: 'carpetas' };
    for (const o of [e.obj, ...e.rel.flatMap(r => r.objs)]) for (const [campo, lista] of Object.entries(existe)) if (o[campo] && !por(lista, o[campo])) o[campo] = '';
    if ((e.lista === 'actividades' || e.lista === 'proyectos') && !por('estatus', e.obj.estatus)) e.obj.estatus = idInicial();
    if (e.lista === 'notasPriv' && Boveda.abierta()) Boveda.abrirUna(e.obj).catch(() => {});
    S.papelera = S.papelera.filter(x => x.id !== eid);
    S = fusionar(JSON.parse(JSON.stringify(S)));   // aplica las mismas reglas de validación que al abrir la plataforma
    guardar(); return '';
  },
  /** Borra definitivamente una o varias entradas, con sus imágenes si ya nadie más las usa. */
  async borrar(ids) {
    const fuera = S.papelera.filter(e => ids.includes(e.id)); if (!fuera.length) return;
    S.papelera = S.papelera.filter(e => !ids.includes(e.id));
    const usadas = this._imagenes(S), libres = [...this._imagenes({ papelera: fuera })].filter(i => !usadas.has(i));
    for (const i of libres) await Img.quitar(i);
    guardar();
  },
  /** Identificadores de imagen a los que hace referencia un objeto (recorre todo). */
  _imagenes(raiz) {
    const r = new Set(), ver = v => { if (Array.isArray(v)) v.forEach(ver); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (['img', 'fondoImg', 'bandaImg'].includes(k) && typeof x === 'string' && x) r.add(x); else if (k === 'imgs' && Array.isArray(x)) x.forEach(i => r.add(i)); else ver(x); } };
    ver(raiz); return r;
  },
  /** Se ejecuta al abrir la plataforma y cada hora: borra lo que ya cumplió 7 días. */
  async purgar() { const v = S.papelera.filter(e => Date.now() >= this.vence(e)).map(e => e.id); if (v.length) { await this.borrar(v); if (App.vista === 'papelera') App.pintar(); } return v.length; },

  /* ---------- Pantalla ---------- */
  rest(eid) { const er = this.restaurar(eid); if (er) return toast(er, 'err'); App.pintar(); toast('Restaurado'); },
  borrarUna(eid) { confirmar('Se borrará definitivamente y no se podrá recuperar. ¿Continuar?', async () => { await this.borrar([eid]); App.pintar(); }, 'Borrar definitivamente'); },
  vaciar() { confirmar(`Se borrarán definitivamente los ${S.papelera.length} elementos de la papelera. ¿Continuar?`, async () => { await this.borrar(S.papelera.map(e => e.id)); App.pintar(); toast('Papelera vacía'); }, 'Vaciar papelera'); }
};

Vistas.papelera = () => {
  const l = S.papelera.filter(e => (!UI.pap.tipo || e.lista === UI.pap.tipo) && coincide(UI.pap.q, e.titulo)).sort((a, b) => b.ms - a.ms);
  const tipos = [...new Set(S.papelera.map(e => e.lista))];
  const resumen = e => { const n = e.rel.reduce((s, r) => s + r.objs.length, 0), d = e.des.reduce((s, x) => s + x.ids.length, 0); return [n ? `${n} registro(s) relacionados` : '', d ? `${d} vínculo(s)` : ''].filter(Boolean).join(' · '); };
  return `${cab('Papelera', `${S.papelera.length} elemento(s) · se borran definitivamente a los ${Papelera.DIAS} días`, S.papelera.length ? '<button class="btn peligro" onclick="Papelera.vaciar()">Vaciar papelera</button>' : '')}
  <div class="barra"><select onchange="UI.pap.tipo=this.value;App.pintar()"><option value="">Todos los tipos</option>${tipos.map(t => `<option value="${t}" ${UI.pap.tipo === t ? 'selected' : ''}>${esc(Papelera.TIPOS[t][0])}</option>`).join('')}</select>
    ${campoBuscar('pap', 'papBuscar', 'Buscar en la papelera…')}<span class="d">${l.length} resultado(s)</span></div>
  <div class="panel scrollx">${l.length ? `<table class="lista"><thead><tr><th>Elemento</th><th>Tipo</th><th>Eliminado</th><th>Se borra en</th><th></th></tr></thead><tbody>
    ${l.map(e => { const d = Papelera.dias(e), f = new Date(e.ms); return `<tr><td><span class="t" style="cursor:default">${esc(e.titulo)}</span>${resumen(e) ? `<div class="d">Incluye ${esc(resumen(e))}</div>` : ''}</td>
      <td class="d nw">${esc((Papelera.TIPOS[e.lista] || ['Elemento'])[0])}</td><td class="d nw">${esc(fFecha(aISO(f)))} ${p2(f.getHours())}:${p2(f.getMinutes())}</td>
      <td class="nw ${d < 1 ? 'rojo' : d <= 2 ? 'ambar' : ''}" title="${esc(new Date(Papelera.vence(e)).toLocaleString('es-MX'))}">${d < 1 ? 'Menos de 1 día' : d === 1 ? '1 día' : d + ' días'}</td>
      <td class="num nw"><button class="btn ch" onclick="Papelera.rest('${e.id}')">Restaurar</button> <button class="lnk rojo" onclick="Papelera.borrarUna('${e.id}')">Borrar ya</button></td></tr>`; }).join('')}</tbody></table>`
    : vacio('La papelera está vacía', `Lo que elimines aparecerá aquí durante ${Papelera.DIAS} días por si necesitas recuperarlo.`)}</div>`;
};

/* ==========================================================================
   CORRECCIONES APRENDIDAS DEL LECTOR
   No se reentrena el modelo (requeriría miles de muestras etiquetadas): la plataforma
   recuerda cómo corriges lo que el lector lee mal y lo aplica en las lecturas siguientes.
   Registro: { id, mal, bien, usos }
   ========================================================================== */
const Correcciones = {
  _norm: t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
  _escRe: t => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  /** Aplica el diccionario a un texto reconocido (sólo palabras completas; respeta el texto alrededor). */
  aplicar(texto) {
    let t = String(texto || '');
    if (!S.correcciones.length || !t) return t;
    const lista = S.correcciones.slice().sort((a, b) => b.mal.length - a.mal.length);
    for (const c of lista) {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${this._escRe(c.mal)}(?=$|[^\\p{L}\\p{N}])`, 'giu');
      let hubo = false; t = t.replace(re, (m, pre) => { hubo = true; return pre + c.bien; });
      if (hubo) c.usos = (c.usos || 0) + 1;
    }
    return t;
  },
  /** Parecido entre dos textos (1 = iguales), sólo letras y números. */
  _sim(a, b) {
    a = this._norm(a).replace(/[^a-z0-9ñ]/g, ''); b = this._norm(b).replace(/[^a-z0-9ñ]/g, ''); if (!a || !b) return 0;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
  },
  /** Alinea dos bloques cortos de palabras (máx. 12) y devuelve pares [leído, correcto] suficientemente parecidos. */
  _alinear(da, db) {
    if (da.length > 12 || db.length > 12) return [];
    const n = da.length, m = db.length, INF = 1e9, C = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF)), P = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
    C[0][0] = 0;
    const paso = (i, j, a, b, costo, par) => { if (i + a <= n && j + b <= m && C[i][j] + costo < C[i + a][j + b]) { C[i + a][j + b] = C[i][j] + costo; P[i + a][j + b] = [i, j, par]; } };
    for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
      if (C[i][j] === INF) continue;
      paso(i, j, 1, 0, 0.6, null); paso(i, j, 0, 1, 0.6, null);
      if (i < n && j < m) paso(i, j, 1, 1, 1 - this._sim(da[i], db[j]), [da[i], db[j]]);
      if (i + 1 < n && j < m) paso(i, j, 2, 1, 1 - this._sim(da[i] + da[i + 1], db[j]), [da[i] + ' ' + da[i + 1], db[j]]);
      if (i < n && j + 1 < m) paso(i, j, 1, 2, 1 - this._sim(da[i], db[j] + db[j + 1]), [da[i], db[j] + ' ' + db[j + 1]]);
    }
    const r = []; let i = n, j = m;
    while (i || j) { const [pi, pj, par] = P[i][j]; if (par) { const s = this._sim(par[0], par[1]), corto = this._norm(par[0]).length <= 3; if (s >= (corto ? 0.67 : 0.4) && s < 1) r.push(par); } i = pi; j = pj; }
    return r.reverse();
  },
  /** Compara lo leído con lo corregido y guarda los cambios de 1 a 3 palabras. Devuelve cuántos aprendió. */
  aprender(original, corregido) {
    const A = String(original || '').split(/\s+/).filter(Boolean).slice(0, 4000), B = String(corregido || '').split(/\s+/).filter(Boolean).slice(0, 4000);
    if (!A.length || !B.length) return 0;
    const na = A.map(this._norm), nb = B.map(this._norm), n = A.length, m = B.length;
    if (n * m > 4e6) return 0;   // textos demasiado largos para comparar con seguridad
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = na[i] === nb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    // Bloques que no coinciden: se alinean palabra por palabra por parecido de letras
    // (admite que el lector parta una palabra en dos o junte dos en una)
    const pares = []; let i = 0, j = 0, da = [], db = [];
    const cierra = () => { if (da.length && db.length) pares.push(...this._alinear(da, db)); da = []; db = []; };
    while (i < n && j < m) { if (na[i] === nb[j]) { cierra(); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) da.push(A[i++]); else db.push(B[j++]); }
    while (i < n) da.push(A[i++]); while (j < m) db.push(B[j++]); cierra();
    let k = 0;
    for (let [mal, bien] of pares) {
      mal = mal.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); bien = bien.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (mal.length < 2 || !bien || this._norm(mal) === this._norm(bien) || mal.length > 80 || bien.length > 80) continue;
      const ya = S.correcciones.find(c => this._norm(c.mal) === this._norm(mal));
      if (ya) { if (ya.bien !== bien) { ya.bien = bien; k++; } } else { S.correcciones.push({ id: uid(), mal, bien, usos: 0 }); k++; }
    }
    if (k) guardar();
    return k;
  },
  editar(id) {
    const c = id ? por('correcciones', id) : null;
    Form.abrir({ titulo: c ? 'Editar corrección' : 'Nueva corrección', valores: c || {},
      campos: [{ k: 'mal', label: 'Lo que lee el lector', req: true, medio: true, ayuda: 'Palabra o frase corta tal como sale mal.' }, { k: 'bien', label: 'Debe decir', req: true, medio: true }],
      guardar: v => { if (v.mal.length > 80 || v.bien.length > 80) return 'Máximo 80 caracteres'; if (S.correcciones.some(x => x.id !== (c && c.id) && Correcciones._norm(x.mal) === Correcciones._norm(v.mal))) return 'Ya existe una corrección para ese texto'; poner('correcciones', { id: c ? c.id : uid(), usos: c ? c.usos : 0, ...v }); },
      eliminar: c ? () => quitar('correcciones', c.id) : null });
  },
  vista() {
    const l = S.correcciones.slice().sort((a, b) => (b.usos || 0) - (a.usos || 0) || a.mal.localeCompare(b.mal, 'es'));
    return `<section class="blq"><h3>Correcciones aprendidas del lector de fotos <button class="lnk" onclick="Carga.abrir('correcciones')">Carga masiva</button><button class="lnk" onclick="Correcciones.editar()">+ Agregar</button></h3>
      <div class="cu d" style="padding-bottom:0">Cada vez que corriges un texto leído de una foto (títulos en el borrador de agenda, o «Aprender de mis correcciones» en una nota), la plataforma lo recuerda y lo aplica en las siguientes lecturas.</div>
      ${l.length ? `<div class="scrollx"><table class="lista"><thead><tr><th>El lector lee</th><th>Se corrige a</th><th class="num">Veces aplicada</th></tr></thead><tbody>
        ${l.map(c => `<tr><td><span class="t" onclick="Correcciones.editar('${c.id}')">${esc(c.mal)}</span></td><td>${esc(c.bien)}</td><td class="num">${c.usos || 0}</td></tr>`).join('')}</tbody></table></div>` : vacio('Aún no hay correcciones', 'Se agregan solas cuando corriges lo que lee el lector.')}</section>`;
  }
};
