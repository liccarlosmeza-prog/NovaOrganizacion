'use strict';
/* ==========================================================================
   CRONOGRAMAS EN PDF (Escuela)
   --------------------------------------------------------------------------
   Lee los PDF de cronograma que se descargan de la plataforma de la universidad y
   arma las actividades escolares: nombre, tipo, valor, unidad y fecha de entrega.
   - Pdf: carga pdf.js (incrustado, ver terceros/pdfjs) y extrae cada texto con su posición.
          El motor corre en la misma página (sin proceso aparte) y la página no permite conexiones.
   - Crono.interpretar(): localiza la tabla de ponderación (Actividad · Tipo · Valor · Duración)
          y la de fechas (Sección · Actividad · Fecha de inicio · Fecha de entrega), une los nombres
          partidos en varios renglones y empareja ambas tablas por parecido de nombre y orden.
   El resultado es un borrador: el usuario lo revisa antes de guardar y se valida igual que la carga masiva.
   ========================================================================== */
const Pdf = {
  MAX_MB: 20, MAX_PAGINAS: 40,
  disponible() { const a = $('#pdfLib'), b = $('#pdfWorker'); return !!(a && b && a.textContent.length > 100000 && b.textContent.length > 100000); },
  _blob: (t, tipo = 'text/javascript') => URL.createObjectURL(new Blob([t], { type: tipo })),
  /** Carga un bloque incrustado como módulo y espera a que se registre en window. */
  _modulo(id, nombre) {
    return new Promise((ok, err) => {
      const url = this._blob($('#' + id).textContent), evento = 'nova-' + nombre;
      const s = document.createElement('script'); s.type = 'module';
      s.src = this._blob(`import * as M from ${JSON.stringify(url)}; window[${JSON.stringify(nombre)}] = M; window.dispatchEvent(new Event(${JSON.stringify(evento)}));`);
      const libera = () => { URL.revokeObjectURL(url); URL.revokeObjectURL(s.src); };
      window.addEventListener(evento, () => { libera(); ok(window[nombre]); }, { once: true }); s.onerror = () => { libera(); err(new Error('No se pudo iniciar el lector de PDF.')); };
      document.head.appendChild(s);
    });
  },
  async _lib() {
    if (window.__novaPdf) return window.__novaPdf;
    // El motor de pdf.js se registra como "pdfjsWorker": así pdf.js lo usa en esta misma página
    // (al abrir la plataforma como archivo local, el navegador no permite su proceso aparte).
    globalThis.pdfjsWorker = await this._modulo('pdfWorker', '__novaPdfMotor');
    window.__novaPdf = await this._modulo('pdfLib', '__novaPdfLib');
    return window.__novaPdf;
  },
  /** Devuelve [{ancho, alto, items:[{s, x, y, w, h}]}] con y medida desde arriba. */
  async paginas(archivo) {
    if (!archivo || !(/\.pdf$/i.test(archivo.name) || archivo.type === 'application/pdf')) throw new Error('El archivo no es un PDF.');
    if (archivo.size > this.MAX_MB * 1048576) throw new Error(`El PDF supera ${this.MAX_MB} MB.`);
    const datos = new Uint8Array(await archivo.arrayBuffer());
    if (String.fromCharCode(...datos.slice(0, 5)) !== '%PDF-') throw new Error('El archivo no tiene formato PDF.');
    const P = await this._lib();
    const doc = await P.getDocument({ data: datos, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, enableXfa: false, disableAutoFetch: true, stopAtErrors: false }).promise;
    try {
      if (doc.numPages > this.MAX_PAGINAS) throw new Error(`El PDF tiene ${doc.numPages} páginas; el máximo es ${this.MAX_PAGINAS}.`);
      const r = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
        r.push({ ancho: vp.width, alto: vp.height, items: tc.items.filter(x => x && typeof x.str === 'string' && x.str.trim()).slice(0, 20000)
          .map(x => ({ s: x.str.replace(/\s+/g, ' ').trim().slice(0, 500), x: x.transform[4], y: vp.height - x.transform[5], w: x.width, h: x.height || Math.abs(x.transform[3]) || 9 })) });
      }
      return r;
    } finally { await doc.destroy(); }
  }
};

const Crono = {
  MES: { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 },
  TIPOS: { foro: 'Foro', buzon: 'Buzón', examen: 'Examen', quiz: 'Examen', presentacion: 'Presentación', glosario: 'Glosario', h5p: 'H5P', proyecto: 'Proyecto', tarea: 'Tarea', wiki: 'Otro', cuestionario: 'Examen', taller: 'Tarea' },
  _n: t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
  /** "jueves, 27 de agosto de 2026, 19:44" → { fecha: '2026-08-27', hora: '19:44' } */
  fecha(t) {
    const m = this._n(t).match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})(?:\D{1,4}(\d{1,2}):(\d{2}))?/);
    if (!m || !this.MES[m[2]]) return null;
    const iso = parseFecha(`${m[3]}-${m[2] in this.MES ? this.MES[m[2]] : 0}-${m[1]}`); if (!iso) return null;
    const h = m[4] != null && +m[4] < 24 && +m[5] < 60 ? `${p2(+m[4])}:${m[5]}` : '';
    return { fecha: iso, hora: h };
  },
  /** Código de materia y ciclo desde el nombre del archivo: "IH716_2026B__Cronograma…" → { clave: 'IH716', ciclo: '2026B' } */
  deArchivo(nombre) {
    const b = String(nombre || '').replace(/\.pdf$/i, '');
    const c = b.match(/\b([A-Z]{1,4}\d{2,5})(?=[_\s-]|$)/i), ci = b.match(/(?:^|[_\s-])(20\d{2}\s?[ABab])(?=[_\s-]|$)/);
    return { clave: c ? c[1].toUpperCase() : '', ciclo: ci ? ci[1].replace(/\s/g, '').toUpperCase() : '' };
  },
  /** Agrupa los textos en renglones (misma altura) ordenados de izquierda a derecha, en todas las páginas. */
  _renglones(paginas) {
    const r = []; let base = 0;
    for (const pg of paginas) {
      const its = pg.items.slice().sort((a, b) => a.y - b.y || a.x - b.x);
      for (const it of its) { const u = r[r.length - 1]; if (u && u.pg === pg && Math.abs(it.y - u.y0) <= Math.max(2.5, it.h * 0.45)) u.it.push(it); else r.push({ pg, y0: it.y, y: base + it.y, it: [it] }); }
      base += pg.alto + 1000;
    }
    for (const l of r) { l.it.sort((a, b) => a.x - b.x); l.t = l.it.map(i => i.s).join(' '); }
    return r;
  },
  /**
   * Asigna un texto a una columna por la posición de su centro. Los encabezados pueden estar centrados
   * o alineados a la izquierda: el límite entre dos columnas es el punto medio entre el final de un
   * encabezado y el inicio del siguiente (o, si el contenido de una columna empieza antes, ese inicio: ver _limites).
   */
  _col(cols, it) {
    const c = it.x + (it.w || 0) / 2;
    for (let i = 0; i < cols.length - 1; i++) if (c < (cols[i].lim ?? (cols[i].x + cols[i].w + cols[i + 1].x) / 2)) return cols[i].k;
    return cols.length ? cols[cols.length - 1].k : null;
  },
  /**
   * Ajusta los límites entre columnas con el contenido: si una columna alineada a la izquierda empieza antes que
   * su encabezado centrado (p. ej. un nombre corto), el límite se recorre a ese inicio. Sólo se usa un inicio que
   * se repite (≥2 textos) y queda entre el final del encabezado anterior y el punto medio.
   */
  _limites(L, desde, hasta, cols) {
    const ini = new Map();
    for (let i = desde; i < hasta; i++) for (const it of L[i].it) { const x = Math.round(it.x); ini.set(x, (ini.get(x) || 0) + 1); }
    for (let i = 0; i < cols.length - 1; i++) {
      const fin = cols[i].x + cols[i].w, medio = (fin + cols[i + 1].x) / 2;
      const s = [...ini].filter(([x, n]) => n >= 2 && x >= fin && x < medio).map(([x]) => x).sort((a, b) => a - b)[0];
      cols[i].lim = s != null ? s - 1 : medio;
    }
  },
  /** Lee una tabla: devuelve filas ancla con los textos de cada columna; los nombres partidos se unen al ancla más cercana.
   *  juntar: columnas cuyas celdas pueden ocupar varios renglones (p. ej. fechas largas); sus pedazos contiguos se unen. */
  _tabla(L, desde, hasta, cols, esAncla, colNombre, juntar = []) {
    this._limites(L, desde, hasta, cols);
    const R = [];
    for (let i = desde; i < hasta; i++) {
      const l = L[i], celdas = {}; let h = 0;
      for (const it of l.it) { h = Math.max(h, it.h || 0); const k = this._col(cols, it); if (k) celdas[k] = celdas[k] ? celdas[k] + ' ' + it.s : it.s; }
      R.push({ y: l.y, y1: l.y, h: h || 10, c: celdas });
    }
    // Celdas en varios renglones: el pedazo siguiente de la misma columna, a menos de 1.6 renglones, es continuación
    for (const k of juntar) {
      let ult = null;
      for (const r of R) {
        if (!r.c[k]) continue;
        if (ult && r.y - ult.fin <= 1.6 * r.h) { ult.r.c[k] += ' ' + r.c[k]; ult.fin = r.y; ult.r.y1 = Math.max(ult.r.y1, r.y); delete r.c[k]; }
        else ult = { r, fin: r.y };
      }
    }
    const anclas = [], sueltos = [];
    for (const r of R) {
      const y = (r.y + r.y1) / 2;   // una fila de varios renglones se ubica a la mitad
      if (esAncla(r.c)) anclas.push({ y, c: r.c, nombre: [], sec: [] });
      else for (const [k, v] of Object.entries(r.c)) if (k === colNombre || k === 'seccion') sueltos.push({ y: r.y, h: r.h, k, v });
    }
    for (const a of anclas) { if (a.c[colNombre]) a.nombre.push({ y: a.y, v: a.c[colNombre] }); if (a.c.seccion) a.sec.push({ y: a.y, v: a.c.seccion }); }
    for (const s of sueltos) {
      if (!anclas.length) break;
      let m = anclas[0]; for (const a of anclas) if (Math.abs(a.y - s.y) < Math.abs(m.y - s.y)) m = a;
      if (Math.abs(m.y - s.y) > 4 * s.h) continue;   // texto ajeno a la tabla (títulos, pies de página)
      (s.k === colNombre ? m.nombre : m.sec).push({ y: s.y, v: s.v });
    }
    const une = l => l.sort((p, q) => p.y - q.y).map(x => x.v).join(' ').replace(/\s+/g, ' ').trim();
    for (const a of anclas) { a.nombreTxt = une(a.nombre); if (a.sec.length) a.c.seccion = une(a.sec); }
    return anclas;
  },
  interpretar(paginas, nombreArchivo) {
    const L = this._renglones(paginas), avisos = [];
    const esEnc = (l, ...pal) => pal.every(p => l.it.some(it => this._n(it.s).includes(p)));
    const encP = [], encF = [];
    L.forEach((l, i) => { if (esEnc(l, 'actividad', 'tipo', 'valor')) encP.push(i); else if (esEnc(l, 'actividad', 'fecha de entrega')) encF.push(i); });
    const encabezados = [...encP.map(i => ({ i, t: 'p' })), ...encF.map(i => ({ i, t: 'f' }))].sort((a, b) => a.i - b.i);
    const fin = i => { const s = encabezados.find(e => e.i > i); return s ? s.i : L.length; };
    // --- Tabla de ponderación ---
    const pond = [];
    for (const i of encP) {
      const h = L[i], cols = [];
      for (const it of h.it) { const n = this._n(it.s), c = { x: it.x, w: it.w || 0 }; if (n.startsWith('actividad')) cols.push({ k: 'act', ...c }); else if (n.startsWith('tipo')) cols.push({ k: 'tipo', ...c }); else if (n.startsWith('valor')) cols.push({ k: 'valor', ...c }); else if (/dias|duracion/.test(n)) cols.push({ k: 'dur', ...c }); }
      cols.sort((a, b) => a.x - b.x);
      const filas = this._tabla(L, i + 1, fin(i), cols, c => !!(c.valor && /^\s*\d+(?:[.,]\d+)?\s*%?\s*$/.test(c.valor)) || !!(c.tipo && /^[a-zA-ZáéíóúÁÉÍÓÚ ]{3,20}$/.test(c.tipo) && c.valor), 'act');
      for (const f of filas) {
        if (/^total\b/i.test(f.nombreTxt) || /total/i.test(f.c.tipo || '') || !f.nombreTxt) continue;
        const v = (f.c.valor || '').match(/(\d+(?:[.,]\d+)?)/), d = (f.c.dur || '').match(/^\s*(\d{1,3})\b/);
        pond.push({ nombre: f.nombreTxt, tipoTxt: (f.c.tipo || '').trim(), valor: v ? Number(v[1].replace(',', '.')) : 0, dur: d ? +d[1] : null });
      }
    }
    // --- Tabla de fechas ---
    const fechas = [];
    for (const i of encF) {
      const h = L[i], cols = [];
      for (let j = 0; j < h.it.length; j++) {
        // un encabezado puede venir en un solo texto («Fecha de entrega») o partido («Fecha de» + «entrega»)
        const it = h.it[j], sig = h.it[j + 1], n = this._n(it.s), junto = sig && /^fecha( de)?$/.test(n) ? this._n(it.s + ' ' + sig.s) : n;
        const c = { x: it.x, w: (junto !== n ? sig.x + sig.w : it.x + it.w) - it.x }, k = n.startsWith('seccion') ? 'seccion' : n.startsWith('actividad') ? 'act'
          : /fecha de inicio/.test(junto) ? 'ini' : /fecha de entrega/.test(junto) ? 'ent' : /fecha de corte/.test(junto) ? 'corte' : /fecha de finalizacion/.test(junto) ? 'fin' : '';
        if (k && !cols.some(x => x.k === k)) cols.push({ k, ...c });
      }
      cols.sort((a, b) => a.x - b.x);
      const filas = this._tabla(L, i + 1, fin(i), cols, c => !!(c.ent && this.fecha(c.ent)), 'act', ['seccion', 'ini', 'ent', 'corte', 'fin']);
      for (const f of filas) { const e = this.fecha(f.c.ent), ini = f.c.ini && this.fecha(f.c.ini); fechas.push({ nombre: f.nombreTxt, seccion: (f.c.seccion || '').trim(), entrega: e.fecha, hora: e.hora, inicio: ini ? ini.fecha : '' }); }
    }
    // la sección se mantiene hasta que aparece otra
    let sec = ''; for (const f of fechas) { if (f.seccion) sec = f.seccion; else f.seccion = sec; }
    if (!pond.length && !fechas.length) return { filas: [], avisos: ['No se encontraron las tablas de ponderación ni de fechas. ¿Es un cronograma de la plataforma?'], ...this.deArchivo(nombreArchivo) };
    if (!pond.length) avisos.push('No se encontró la tabla de ponderación: los valores quedan en 0.');
    if (!fechas.length) avisos.push('No se encontró la tabla de fechas: las actividades quedan sin fecha de entrega.');
    // Un cronograma real tiene decenas de actividades; un PDF manipulado con miles de filas se recorta (el emparejamiento crece n×m)
    const MAX = 300; if (pond.length > MAX || fechas.length > MAX) { avisos.push(`El PDF trae demasiadas filas; sólo se leen las primeras ${MAX}.`); pond.length = Math.min(pond.length, MAX); fechas.length = Math.min(fechas.length, MAX); }
    // --- Emparejamiento por parecido de nombre y orden ---
    const pares = this._emparejar(pond, fechas), filas = [];
    for (const [ip, jf] of pares) {
      const p = ip != null ? pond[ip] : null, f = jf != null ? fechas[jf] : null;
      filas.push({ titulo: this._limpia(p ? p.nombre : f.nombre), tipo: this._tipo(p ? p.tipoTxt : ''), valor: p ? p.valor : 0, dur: p ? p.dur : null,
        unidad: f ? this._limpia(f.seccion) : '', entrega: f ? f.entrega : '', inicio: f ? f.inicio : '',
        nota: !f ? 'Sin fecha de entrega en el cronograma' : !p ? 'No aparece en la tabla de ponderación (valor 0)' : '', incluir: !!f });
    }
    // Fecha de inicio: la que traiga el PDF; si no, la entrega anterior + 1 día (como AcadTrack), sin rebasar la duración indicada
    let ant = '';
    for (const r of filas) {
      if (!r.entrega) continue;
      if (!r.inicio) { const porDur = r.dur ? sumaDias(r.entrega, -(Math.max(1, r.dur) - 1)) : ''; const trasAnterior = ant ? sumaDias(ant, 1) : ''; r.inicio = [porDur, trasAnterior].filter(Boolean).sort().pop() || r.entrega; if (r.inicio > r.entrega) r.inicio = r.entrega; }
      if (r.entrega > ant) ant = r.entrega;
    }
    const total = pond.reduce((s, p) => s + p.valor, 0);
    if (pond.length && Math.abs(total - 100) > 0.5) avisos.push(`Los valores suman ${Math.round(total * 10) / 10}, no 100.`);
    const sinFecha = filas.filter(r => !r.entrega).length; if (sinFecha) avisos.push(`${sinFecha} actividad(es) no tienen fecha de entrega; quedan desmarcadas (puedes ponerles fecha).`);
    return { filas, avisos, ...this.deArchivo(nombreArchivo) };
  },
  _limpia: t => String(t || '').replace(/\s+/g, ' ').replace(/\s+([:;,.])/g, '$1').replace(/^[\s\-–—:.]+|[\s\-–—:]+$/g, '').trim().slice(0, 200),
  _tipo(t) { const n = this._n(t).replace(/[^a-z0-9]/g, ''); for (const [k, v] of Object.entries(this.TIPOS)) if (n.startsWith(k)) return v; return t ? 'Otro' : 'Buzón'; },
  /** Palabras significativas de un nombre (sin numeración, "Actividad", artículos ni signos). */
  _pal(t) {
    const VACIAS = new Set(['actividad', 'act', 'de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'para', 'con', 'un', 'una', 'al', 'a', 'mi', 'tu', 'su', 'pi', 'ai']);
    return new Set(this._n(t).replace(/\d+(\.\d+)*/g, ' ').split(/[^a-z0-9ñ]+/).filter(w => w.length >= 2 && !VACIAS.has(w)));
  },
  _sim(a, b) { const A = this._pal(a), B = this._pal(b); if (!A.size || !B.size) return 0; let c = 0; for (const w of A) if (B.has(w)) c++; return c / Math.min(A.size, B.size) * 0.7 + c / new Set([...A, ...B]).size * 0.3; },
  /** Alineación en orden (como un diff) que maximiza el parecido; devuelve pares [índicePonderación|null, índiceFechas|null]. */
  _emparejar(P, F) {
    const n = P.length, m = F.length, S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1)), Q = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      const s = this._sim(P[i].nombre, F[j].nombre), u = s >= 0.34 ? S[i + 1][j + 1] + s : -1;
      if (u >= S[i + 1][j] && u >= S[i][j + 1]) { S[i][j] = u; Q[i][j] = 1; } else if (S[i + 1][j] >= S[i][j + 1]) { S[i][j] = S[i + 1][j]; Q[i][j] = 2; } else { S[i][j] = S[i][j + 1]; Q[i][j] = 3; }
    }
    const r = []; let i = 0, j = 0;
    while (i < n && j < m) { if (Q[i][j] === 1) r.push([i++, j++]); else if (Q[i][j] === 2) r.push([i++, null]); else r.push([null, j++]); }
    while (i < n) r.push([i++, null]); while (j < m) r.push([null, j++]);
    return r;
  }
};

/* ---------- Pantalla: cargar cronogramas y nuevo semestre ---------- */
const CronoUI = {
  _d: [],   // un elemento por PDF: { archivo, clave, ciclo, filas, avisos }
  abrir() {
    if (!Pdf.disponible()) return toast('Esta versión no incluye el lector de PDF. Usa la carga masiva por CSV.', 'err');
    Modal.abrir(`<div class="form"><h2>Cargar cronogramas (PDF)</h2><div class="campos" style="display:block">
      <p class="d" style="margin-bottom:10px">Elige los PDF de cronograma que descargas de la plataforma de la universidad (uno por materia). Se leen en este equipo, sin conexión: verás un borrador para revisar antes de guardar.</p>
      <div class="barra"><input type="file" id="crArchivos" accept="application/pdf,.pdf" multiple><button class="btn pri" type="button" id="crLeer" onclick="CronoUI.leer()">Leer cronogramas</button></div>
      <p class="d" id="crProg"></p></div>
      <div class="acciones"><span class="esp"></span><button class="btn" type="button" onclick="Modal.cerrar()">Cerrar</button></div></div>`, 720);
  },
  async leer() {
    const archivos = [...$('#crArchivos').files];
    if (!archivos.length) return toast('Elige uno o varios PDF', 'err');
    if (archivos.length > 15) return toast('Máximo 15 PDF por vez', 'err');
    $('#crLeer').disabled = true; this._d = [];
    for (let i = 0; i < archivos.length; i++) {
      const p = $('#crProg'); if (p) p.textContent = `Leyendo ${i + 1} de ${archivos.length}: ${archivos[i].name}…`;
      try { const r = Crono.interpretar(await Pdf.paginas(archivos[i]), archivos[i].name); this._d.push({ archivo: archivos[i].name.slice(0, 120), ...r }); }
      catch (e) { console.error(e); this._d.push({ archivo: archivos[i].name.slice(0, 120), clave: '', ciclo: '', filas: [], avisos: ['No se pudo leer: ' + e.message] }); }
    }
    this.borrador();
  },
  contar() { const n = document.querySelectorAll('#modal input[id^="cr_ok_"]:checked').length, t = $('#crTotal'); if (t) t.textContent = `${n} actividad(es) por cargar`; },
  /** Nombre con que se crea una materia: la clave del cronograma (o el nombre del archivo si no la trae). */
  _nombreBase(d) { return (d.clave || String(d.archivo || '').replace(/\.pdf$/i, '').replace(/_+/g, ' ').trim() || 'Materia nueva').slice(0, 120); },
  /** Materia sugerida: la que ya tenga esa clave y ciclo; si no, una nueva con la clave como nombre. */
  _materia(d) { const m = S.materias.find(x => d.clave && x.clave === d.clave && (!d.ciclo || x.ciclo === d.ciclo)); return m ? m.id : ''; },
  borrador() {
    const camp = (i, j, k, tipo, v, ancho, extra = '') => `<input type="${tipo}" id="cr_${k}_${i}_${j}" value="${esc(v ?? '')}" style="width:${ancho};height:28px" aria-label="${k}" ${extra}>`;
    const html = this._d.map((d, i) => {
      const mat = this._materia(d), validas = d.filas.filter(f => f.incluir).length;
      return `<section class="blq" style="margin:0 0 14px"><h3 style="text-transform:none;letter-spacing:0;font-size:13.5px;color:var(--tx)">${esc(d.archivo)}<span class="ct">${validas} de ${d.filas.length} actividades</span></h3>
        <div class="cu"><div class="barra" style="margin:0 0 8px">
          <label class="d">Materia</label><select id="cr_mat_${i}" onchange="document.getElementById('cr_nom_${i}').style.display=this.value?'none':''">
            <option value="">Nueva materia…</option>${S.materias.map(m => `<option value="${m.id}" ${m.id === mat ? 'selected' : ''}>${esc(m.nombre)}${m.ciclo ? ' · ' + esc(m.ciclo) : ''}</option>`).join('')}</select>
          <input type="text" id="cr_nom_${i}" value="${esc(this._nombreBase(d))}" maxlength="120" placeholder="Nombre de la materia" style="width:200px;${mat ? 'display:none' : ''}" aria-label="Nombre de la materia" title="Se crea con la clave; después puedes cambiar el nombre en Escuela → Materias">
          <label class="d">Clave</label><input type="text" id="cr_cla_${i}" value="${esc(d.clave)}" style="width:90px" aria-label="Clave">
          <label class="d">Ciclo</label><input type="text" id="cr_cic_${i}" value="${esc(d.ciclo)}" style="width:80px" aria-label="Ciclo"></div>
          ${d.avisos.length ? `<div class="d ambar" style="margin-bottom:6px">${d.avisos.map(esc).join('<br>')}</div>` : ''}</div>
        ${d.filas.length ? `<div class="scrollx"><table class="lista"><thead><tr><th style="width:28px"></th><th>Actividad</th><th>Tipo</th><th class="num">Valor</th><th>Unidad</th><th>Inicio</th><th>Entrega</th></tr></thead><tbody>
          ${d.filas.map((f, j) => `<tr title="${esc(f.nota || '')}"><td><input type="checkbox" id="cr_ok_${i}_${j}" ${f.incluir ? 'checked' : ''} aria-label="Incluir" onchange="CronoUI.contar()"></td>
            <td>${camp(i, j, 'tit', 'text', f.titulo, '', 'class="crtit"')}${f.nota ? `<div class="d ambar" style="font-size:11.5px">${esc(f.nota)}</div>` : ''}</td>
            <td><select id="cr_tip_${i}_${j}" style="height:28px" aria-label="Tipo">${TIPOS_ESC.map(t => `<option ${t === f.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
            <td class="num">${camp(i, j, 'val', 'number', f.valor, '64px', 'min="0" max="100" step="0.5"')}</td><td>${camp(i, j, 'uni', 'text', f.unidad, '88px')}</td>
            <td>${camp(i, j, 'ini', 'date', f.inicio, '122px')}</td><td>${camp(i, j, 'ent', 'date', f.entrega, '122px')}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
    }).join('');
    const total = this._d.reduce((s, d) => s + d.filas.filter(f => f.incluir).length, 0);
    Modal.abrir(`<div class="form crono"><h2>Revisar cronogramas</h2><div class="campos" style="display:block">
      <p class="d" style="margin-bottom:10px">Cada materia nueva se crea con su clave (p. ej. IH716); después puedes cambiarle el nombre en Escuela → Materias y se actualiza en todas sus actividades. Revisa actividades, valores y fechas; las entregas son hasta el final del día indicado. Las actividades sin fecha de entrega quedan desmarcadas. Lo repetido (misma materia, actividad y entrega) se omite.</p>${html}</div>
      <div class="acciones"><label class="chk"><input type="checkbox" id="crVencidas"> Marcar como «Enviada» lo ya vencido</label><span class="esp"></span><span class="d" id="crTotal">${total} actividad(es) por cargar</span><button class="btn" type="button" onclick="Modal.cerrar()">Cancelar</button><button class="btn pri" type="button" onclick="CronoUI.aplicar()">Cargar actividades</button></div></div>`, 1180);
  },
  aplicar() {
    const hoy = hoyISO(), vencidas = $('#crVencidas').checked, nuevas = []; let omitidas = 0, materiasNuevas = 0;
    const plan = this._d.map((d, i) => {
      const cla = $(`#cr_cla_${i}`).value.trim().slice(0, 20), cic = $(`#cr_cic_${i}`).value.trim().slice(0, 20), sel = $(`#cr_mat_${i}`).value, nom = $(`#cr_nom_${i}`).value.trim().slice(0, 120);
      const filas = d.filas.map((f, j) => ({ ok: $(`#cr_ok_${i}_${j}`).checked, titulo: $(`#cr_tit_${i}_${j}`).value.trim().slice(0, 200), tipo: $(`#cr_tip_${i}_${j}`).value,
        valor: Number($(`#cr_val_${i}_${j}`).value), unidad: $(`#cr_uni_${i}_${j}`).value.trim().slice(0, 60), inicio: $(`#cr_ini_${i}_${j}`).value, entrega: $(`#cr_ent_${i}_${j}`).value })).filter(f => f.ok);
      return { i, cla, cic, sel, nom, filas };
    }).filter(p => p.filas.length);
    if (!plan.length) return toast('No hay actividades marcadas', 'err');
    for (const p of plan) if (!p.sel && !p.nom) p.nom = this._nombreBase({ clave: p.cla, archivo: this._d[p.i].archivo });   // sin nombre: la clave
    for (const p of plan) {
      let m = p.sel && por('materias', p.sel);
      if (!m) { m = S.materias.find(x => Crono._n(x.nombre) === Crono._n(p.nom) && (x.ciclo || '') === p.cic); }
      if (!m) { m = { id: uid(), nombre: p.nom, clave: p.cla, ciclo: p.cic, profesor: '', color: PALETA[S.materias.length % PALETA.length], meta: S.ajustes.metaEscolar }; S.materias.push(m); materiasNuevas++; }
      else { if (p.cla && !m.clave) m.clave = p.cla; if (p.cic && !m.ciclo) m.ciclo = p.cic; }
      for (const f of p.filas) {
        // Misma validación que la carga masiva: fechas reales, inicio ≤ entrega, valor 0–100, sin repetidos
        const ent = parseFecha(f.entrega), ini = parseFecha(f.inicio) || ent;
        const rep = x => x.materia === m.id && Crono._n(x.titulo) === Crono._n(f.titulo) && x.entrega === ent;
        if (!f.titulo || !ent || ini > ent || !Number.isFinite(f.valor) || f.valor < 0 || f.valor > 100 || S.escolares.some(rep) || nuevas.some(rep)) { omitidas++; continue; }
        nuevas.push({ id: uid(), materia: m.id, titulo: f.titulo, tipo: TIPOS_ESC.includes(f.tipo) ? f.tipo : 'Otro', valor: f.valor, inicio: ini, entrega: ent, unidad: f.unidad, estatus: vencidas && ent < hoy ? 'enviada' : 'pendiente', calif: null, comentario: '' });
      }
    }
    S.escolares.push(...nuevas); guardar(); Modal.cerrar(); UI.esc.tab = 'lista'; UI.esc.mat = ''; App.pintar();
    toast(`${nuevas.length} actividad(es) cargadas${materiasNuevas ? ` · ${materiasNuevas} materia(s) nueva(s)` : ''}${omitidas ? ` · ${omitidas} omitida(s) por repetidas o con datos inválidos` : ''}`);
  },
  /** Nuevo semestre: manda a la papelera todas las materias con sus actividades (se pueden restaurar 7 días). */
  nuevoSemestre() {
    const nm = S.materias.length, na = S.escolares.length;
    if (!nm && !na) return toast('No hay materias ni actividades escolares');
    Modal.abrir(`<div class="form"><h2>Nuevo semestre</h2><div class="campos" style="display:block">
      <p>Se enviarán a la <b>papelera</b> las <b>${nm}</b> materia(s) y sus <b>${na}</b> actividad(es) escolares. Podrás restaurarlas durante 7 días; después se borran definitivamente.</p>
      <p class="d" style="margin-top:8px">No se tocan proyectos, actividades de trabajo, agenda, notas ni lo demás. Las calificaciones se van con sus actividades: si quieres conservarlas, descarga antes un respaldo o el CSV.</p>
      <div class="barra" style="margin-top:10px"><button class="btn" type="button" onclick="Datos.respaldo()">Descargar respaldo (.json)</button><button class="btn" type="button" onclick="Datos.exportarUna('actividades_escolares.csv')">Descargar CSV de actividades</button></div></div>
      <div class="acciones"><span class="esp"></span><button class="btn" type="button" onclick="Modal.cerrar()">Cancelar</button><button class="btn peligro" type="button" onclick="CronoUI.confirmarSemestre()">Enviar a la papelera</button></div></div>`, 620);
  },
  confirmarSemestre() {
    const ids = S.materias.map(m => m.id);
    for (const id of ids) Papelera.mover('materias', id, { rel: [{ lista: 'escolares', filtro: e => e.materia === id }] });
    for (const e of S.escolares.slice()) Papelera.mover('escolares', e.id);   // actividades sin materia, si quedara alguna
    UI.esc.mat = ''; Modal.cerrar(); App.pintar(); toast(`Semestre cerrado: ${ids.length} materia(s) en la papelera. Ya puedes cargar los cronogramas nuevos.`);
  }
};
