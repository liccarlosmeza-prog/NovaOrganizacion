'use strict';
/* ==========================================================================
   NÚCLEO: utilidades, almacenamiento, estado, tema, modal/formularios,
   CSV, ZIP y bóveda de notas privadas.
   ========================================================================== */

/* ---------- Utilidades generales ---------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
const p2 = n => String(n).padStart(2, '0');

/* ---------- Fechas (se guardan como AAAA-MM-DD) ---------- */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_C = MESES.map(m => m.slice(0, 3));
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const aISO = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const deISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hoyISO = () => aISO(new Date());
const sumaDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return aISO(d); };
const difDias = (a, b) => Math.round((deISO(b) - deISO(a)) / 864e5);
const fFecha = iso => { if (!iso) return ''; const d = deISO(iso); return `${d.getDate()} ${MESES_C[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
const may = s => s.charAt(0).toUpperCase() + s.slice(1);
const fFechaLarga = iso => { const d = deISO(iso); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const aDMY = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
function fRel(iso) {
  if (!iso) return '';
  const n = difDias(hoyISO(), iso);
  if (n === 0) return 'Hoy'; if (n === 1) return 'Mañana'; if (n === -1) return 'Ayer';
  if (n > 1 && n <= 14) return `En ${n} días`;
  if (n < -1 && n >= -30) return `Hace ${-n} días`;
  return fFecha(iso);
}
/** Convierte dd/mm/aaaa, d-m-aaaa o aaaa-mm-dd a ISO. Devuelve '' si no es válida. */
function parseFecha(txt) {
  const t = String(txt || '').trim(); if (!t) return '';
  let y, m, d, r;
  if ((r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) [, y, m, d] = r;
  else if ((r = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/))) { [, d, m, y] = r; if (y.length === 2) y = '20' + y; }
  else return '';
  y = +y; m = +m; d = +d;
  const f = new Date(y, m - 1, d);
  return (f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d) ? aISO(f) : '';
}

/* ---------- Almacenamiento (IndexedDB; respaldo en localStorage) ----------
   Toda la app pasa por este objeto. Para conectar después Dataverse (Power Pages)
   u otra API, basta con sustituir estos métodos.                              */
const DB = {
  _db: null, idb: true,
  abrir() {
    return new Promise(ok => {
      try {
        const r = indexedDB.open('plataforma_gestion', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('img'); };
        r.onsuccess = () => { this._db = r.result; ok(); };
        r.onerror = () => { this.idb = false; ok(); };
      } catch (e) { this.idb = false; ok(); }
    });
  },
  _op(almacen, modo, fn) {
    return new Promise((ok, err) => {
      const t = this._db.transaction(almacen, modo); const rq = fn(t.objectStore(almacen));
      t.oncomplete = () => ok(rq ? rq.result : undefined); t.onerror = () => err(t.error); t.onabort = () => err(t.error);
    });
  },
  async leerEstado() {
    if (this.idb) return this._op('kv', 'readonly', s => s.get('estado'));
    try { return JSON.parse(localStorage.getItem('pg_estado') || 'null'); } catch (e) { return null; }
  },
  async escribirEstado(v) {
    if (this.idb) return this._op('kv', 'readwrite', s => s.put(v, 'estado'));
    localStorage.setItem('pg_estado', JSON.stringify(v));
  },
  async imgTodas() {
    if (!this.idb) return [];
    const claves = await this._op('img', 'readonly', s => s.getAllKeys());
    const vals = await this._op('img', 'readonly', s => s.getAll());
    return claves.map((id, i) => ({ id, blob: vals[i] }));
  },
  async imgPoner(id, blob) { if (this.idb) return this._op('img', 'readwrite', s => s.put(blob, id)); },
  async imgQuitar(id) { if (this.idb) return this._op('img', 'readwrite', s => s.delete(id)); },
  async imgVaciar() { if (this.idb) return this._op('img', 'readwrite', s => s.clear()); }
};

/* ---------- Imágenes (se comprimen y se guardan aparte del estado) ---------- */
const Img = {
  blobs: new Map(), urls: new Map(),
  async cargar() { for (const { id, blob } of await DB.imgTodas()) this._reg(id, blob); },
  _reg(id, blob) { this.blobs.set(id, blob); this.urls.set(id, URL.createObjectURL(blob)); },
  url(id) { return id ? (this.urls.get(id) || '') : ''; },
  /** Reduce la imagen a un lado máximo y la guarda. Devuelve su id. */
  async agregar(archivo, maxLado = 1600) {
    if (!archivo || !archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen');
    if (!DB.idb) throw new Error('Este navegador no permite guardar imágenes (modo privado)');
    if (archivo.size > 25 * 1048576) throw new Error('La imagen supera 25 MB');
    let blob = archivo;
    try {
      const bmp = await createImageBitmap(archivo);
      const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const b = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
      if (b && (k < 1 || b.size < archivo.size)) blob = b;
    } catch (e) { /* si no se puede procesar (p. ej. SVG) se guarda tal cual */ }
    const id = uid(); await DB.imgPoner(id, blob); this._reg(id, blob); return id;
  },
  async quitar(id) {
    if (!id || !this.blobs.has(id)) return;
    URL.revokeObjectURL(this.urls.get(id)); this.urls.delete(id); this.blobs.delete(id); await DB.imgQuitar(id);
  },
  aDataURL(blob) { return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }); },
  async deDataURL(id, dataUrl) {
    // Sólo se aceptan imágenes incrustadas: un respaldo no puede hacer que la app descargue algo de internet
    if (!/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(String(dataUrl)) || !/^[A-Za-z0-9_-]{1,64}$/.test(String(id))) throw new Error('Imagen no válida');
    const blob = await (await fetch(dataUrl)).blob(); await DB.imgPoner(id, blob); this._reg(id, blob); }
};

/* ---------- Estado ---------- */
const TEMAS = {
  nova:   { nombre: 'Nova',       bg: '#f4f7fa', sup: '#ffffff', tx: '#0b2a4a', mut: '#5d6f84', bd: '#dde5ee', ac: '#0b84f3', lat: '#073763', oro: '#e6a817' },
  claro:  { nombre: 'Claro',      bg: '#f6f7f9', sup: '#ffffff', tx: '#1a2230', mut: '#6b7686', bd: '#e3e7ee', ac: '#2f5fd0', lat: '#ffffff', oro: '#2f5fd0' },
  gris:   { nombre: 'Gris',       bg: '#eceef1', sup: '#f8f9fa', tx: '#22262c', mut: '#69717d', bd: '#d6dae0', ac: '#3d4f6b', lat: '#3d4f6b', oro: '#19c3c8' },
  arena:  { nombre: 'Arena',      bg: '#f6f3ee', sup: '#fffdfa', tx: '#2b2620', mut: '#7c7366', bd: '#e6dfd3', ac: '#9a5b2b', lat: '#fffdfa', oro: '#9a5b2b' },
  oscuro: { nombre: 'Oscuro',     bg: '#14171c', sup: '#1c2027', tx: '#e6e9ee', mut: '#8d96a5', bd: '#2c323c', ac: '#6a9bff', lat: '#1c2027', oro: '#e6a817' },
  noche:  { nombre: 'Nova noche', bg: '#061a30', sup: '#0b2a4a', tx: '#e8eef6', mut: '#8ea3bd', bd: '#17406b', ac: '#19c3c8', lat: '#073763', oro: '#e6a817' }
};
const COLORES_TEMA = [['ac', 'Color de acento'], ['lat', 'Barra lateral'], ['oro', 'Detalle (línea y marcas)'], ['bg', 'Fondo'], ['sup', 'Superficies (paneles)'], ['tx', 'Texto'], ['mut', 'Texto secundario'], ['bd', 'Bordes']];
/** Bloques de la pantalla de Inicio (el orden, tamaño y filas se editan en Ajustes → Inicio). */
const WIDGETS = { frase: 'Frase del día', agenda: 'Agenda', actividades: 'Actividades por atender', entregas: 'Entregas escolares', proyectos: 'Proyectos activos', recordatorios: 'Recordatorios', cumples: 'Cumpleaños próximos', accesos: 'Accesos favoritos' };
const inicioDefecto = () => [
  { id: 'agenda', on: true, ancho: 3, filas: 12, dias: 1 }, { id: 'actividades', on: true, ancho: 3, filas: 12, dias: 7 },
  { id: 'frase', on: true, ancho: 6, filas: 0 },
  { id: 'entregas', on: true, ancho: 3, filas: 6, dias: 14 }, { id: 'proyectos', on: true, ancho: 3, filas: 6 },
  { id: 'recordatorios', on: true, ancho: 2, filas: 5, dias: 7 }, { id: 'cumples', on: true, ancho: 2, filas: 5, dias: 30 }, { id: 'accesos', on: true, ancho: 2, filas: 8 }
];
const temaDe = id => { const { nombre, ...c } = TEMAS[id]; return c; };
const esOscuro = hex => { const n = parseInt(String(hex).slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140; };
/** Logotipo Nova: infinito con barras de crecimiento. */
const LOGO = `<svg viewBox="0 0 64 64" role="img" aria-label="Nova"><defs><linearGradient id="lgN" x1="0" x2="1"><stop offset="0" stop-color="#19C3C8"/><stop offset="1" stop-color="#0B84F3"/></linearGradient></defs>
<rect width="64" height="64" rx="14" fill="#073763"/><path d="M32 32C26.5 22.5 11 22.5 11 32s15.5 9.5 21 0c5.500-9.500 21-9.500 21 0s-15.500 9.500-21 0z" fill="none" stroke="url(#lgN)" stroke-width="5.200" stroke-linecap="round"/>
<rect x="38.600" y="32" width="2.600" height="4.500" rx=".6" fill="#0B84F3"/><rect x="42.300" y="29.500" width="2.600" height="7" rx=".6" fill="#0B84F3"/><rect x="46" y="27" width="2.600" height="9.500" rx=".6" fill="#0B84F3"/></svg>`;
const AMBITOS = ['Trabajo', 'Escuela', 'Personal'];
const PRIORIDADES = [['1', 'Urgente'], ['2', 'Alta'], ['3', 'Media'], ['4', 'Baja']];
const EST_ESC = [['pendiente', 'Pendiente'], ['proceso', 'En proceso'], ['guardada', 'Guardada'], ['enviada', 'Enviada'], ['calificada', 'Calificada']];
const TIPOS_ESC = ['Buzón', 'Foro', 'Examen', 'H5P', 'Proyecto', 'Tarea', 'Vacaciones', 'Otro'];
const PALETA = ['#2f5fd0', '#7c3aed', '#0d9488', '#c77700', '#d23b3b', '#0ea5e9', '#65a30d', '#db2777', '#64748b', '#9a5b2b'];

function estadoVacio() {
  return {
    v: 1,
    ajustes: { nombre: 'Nova Organización', lema: 'Evolución sin límites.', usuario: '', temaId: 'nova', tema: temaDe('nova'), escala: 100, fondoImg: null, fondoOp: 14, bandaImg: null, metaEscolar: 60, avisoCumple: 7,
               inicio: inicioDefecto(), inicioFiltro: { amb: '', cat: '' } },
    estatus: [
      { id: 'pend', nombre: 'Pendiente', color: '#64748b' }, { id: 'curso', nombre: 'En curso', color: '#2f5fd0' },
      { id: 'rev', nombre: 'En revisión', color: '#c77700' }, { id: 'pausa', nombre: 'En pausa', color: '#94a3b8' },
      { id: 'hecho', nombre: 'Terminado', color: '#1f9d55', final: true }
    ],
    categorias: [
      { id: uid(), nombre: 'Administrativo', color: '#64748b' }, { id: uid(), nombre: 'Reportes', color: '#2f5fd0' },
      { id: uid(), nombre: 'Soporte', color: '#0d9488' }, { id: uid(), nombre: 'Reuniones', color: '#7c3aed' }
    ],
    proyectos: [], actividades: [], bitacora: [], notas: [], boveda: null, notasPriv: [],
    recordatorios: [], eventos: [], cumples: [], materias: [], escolares: [],
    carpetas: [], enlaces: [], grupos: [], frases: [], historial: []
  };
}
let S = estadoVacio();

let _tGuardar = null;
/** Guarda el estado (con una pequeña espera para agrupar cambios seguidos). */
function guardar() {
  const pie = $('.lat .pie'); if (pie) { pie.classList.add('pend'); pie.lastChild.textContent = 'Guardando…'; }
  Sync.cambio();
  clearTimeout(_tGuardar);
  _tGuardar = setTimeout(async () => {
    try { await DB.escribirEstado(S); Sync._pinta(); }
    catch (e) { console.error(e); toast('No se pudo guardar: ' + e.message, 'err'); }
  }, 250);
}
const por = (lista, id) => S[lista].find(x => x.id === id);
function poner(lista, obj) { const i = S[lista].findIndex(x => x.id === obj.id); if (i >= 0) S[lista][i] = obj; else S[lista].push(obj); guardar(); }
function quitar(lista, id) { S[lista] = S[lista].filter(x => x.id !== id); guardar(); }
const estFinal = id => !!(por('estatus', id) || {}).final;
const idFinal = () => (S.estatus.find(e => e.final) || S.estatus[S.estatus.length - 1]).id;
const idInicial = () => S.estatus[0].id;
/** Bitácora automática de cambios de estatus (proyectos, actividades y actividades escolares). */
function regEstatus(lista, o, antes, despues) {
  if (antes === despues || !despues) return;
  const nom = v => !v ? '' : lista === 'escolares' ? (EST_ESC.find(x => x[0] === v) || ['', v])[1] : (por('estatus', v) || { nombre: v }).nombre;
  S.historial.push({ id: uid(), lista, ref: o.id, titulo: o.nombre || o.titulo || '', proyecto: lista === 'proyectos' ? o.id : (o.proyecto || ''), de: nom(antes), a: nom(despues), fecha: ahoraTxt() });
  if (S.historial.length > 5000) S.historial.splice(0, S.historial.length - 5000);
}

/* ---------- Tema ---------- */
function aplicarTema() {
  const t = S.ajustes.tema, r = document.documentElement.style;
  for (const [k] of COLORES_TEMA) r.setProperty('--' + k, t[k]);
  r.setProperty('color-scheme', esOscuro(t.sup) ? 'dark' : 'light');   // para que los controles nativos combinen
  r.setProperty('--lat-tx', esOscuro(t.lat) ? '#ffffff' : t.tx);
  const z = (S.ajustes.escala || 100) / 100; r.setProperty('--z', z); document.body.style.zoom = z;
  const f = $('#fondo'), u = Img.url(S.ajustes.fondoImg);
  f.style.backgroundImage = u ? `url("${u}")` : 'none'; f.style.opacity = (S.ajustes.fondoOp || 14) / 100;
  document.title = S.ajustes.nombre;
}

/* ---------- Avisos, confirmación, modal ---------- */
function toast(msg, tipo = '') {
  const d = document.createElement('div'); d.className = 'aviso ' + tipo; d.textContent = msg;
  const av = $('#avisos'); while (av.children.length >= 3) av.firstChild.remove(); av.appendChild(d); setTimeout(() => d.remove(), tipo === 'err' ? 5000 : 2600);
}
const Modal = {
  abrir(html, ancho) { const c = $('#modal .caja'); c.style.maxWidth = (ancho || 620) + 'px'; c.innerHTML = html; $('#modal').classList.add('on'); },
  cerrar() { $('#modal').classList.remove('on'); $('#modal .caja').innerHTML = ''; }
};
let _siConfirma = null;
function confirmar(msg, alAceptar, textoBoton = 'Eliminar') {
  _siConfirma = alAceptar;
  $('#confirma .caja').innerHTML = `<div class="cuerpo">${esc(msg)}</div><div class="acciones"><span class="esp"></span>
    <button class="btn" onclick="cerrarConfirma()">Cancelar</button><button class="btn peligro" onclick="cerrarConfirma(true)">${esc(textoBoton)}</button></div>`;
  $('#confirma').classList.add('on');
}
function cerrarConfirma(acepta) { $('#confirma').classList.remove('on'); const f = _siConfirma; _siConfirma = null; if (acepta && f) f(); }
function verImagen(url) { $('#visor img').src = url; $('#visor').classList.add('on'); }

/* ---------- Formulario genérico ----------
   campos: [{k, label, tipo, opciones, req, medio, ayuda, def, min, max, paso, filas}]
   tipo: text | textarea | date | time | number | select | color | check | url | password | imagen */
const Form = {
  _c: null,
  abrir({ titulo, campos, valores = {}, guardar, eliminar, ancho, nota = '' }) {
    this._c = { campos, guardar, eliminar };
    Modal.abrir(`<form class="form" onsubmit="Form.enviar(event)" novalidate>
      <h2>${esc(titulo)}</h2><div class="campos">${campos.map(c => this._campo(c, valores[c.k] ?? c.def ?? '')).join('')}${nota}</div>
      <div class="acciones">${eliminar ? '<button type="button" class="btn peligro" onclick="Form.borrar()">Eliminar</button>' : ''}<span class="esp"></span>
      <button type="button" class="btn" onclick="Modal.cerrar()">Cancelar</button><button class="btn pri">Guardar</button></div></form>`, ancho);
    const primero = $('#modal input:not([type=checkbox]):not([type=file]), #modal textarea'); if (primero) primero.focus();
  },
  _campo(c, v) {
    const id = 'f_' + c.k; let ctl;
    const at = `${c.req ? 'required' : ''} ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} ${c.paso ? `step="${c.paso}"` : ''} ${c.ph ? `placeholder="${esc(c.ph)}"` : ''}`;
    if (c.tipo === 'textarea') ctl = `<textarea id="${id}" rows="${c.filas || 4}" ${at}>${esc(v)}</textarea>`;
    else if (c.tipo === 'select') ctl = `<select id="${id}">${c.opciones.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select>`;
    else if (c.tipo === 'check') ctl = `<label class="chk"><input type="checkbox" id="${id}" ${v ? 'checked' : ''}> ${esc(c.texto || '')}</label>`;
    else if (c.tipo === 'imagen') ctl = `${c.actual ? `<img src="${c.actual}" style="height:70px;border-radius:6px;justify-self:start">` : ''}<input type="file" id="${id}" accept="image/*">`;
    else ctl = `<input type="${c.tipo || 'text'}" id="${id}" value="${esc(v)}" ${at}>`;
    return `<div class="campo ${c.medio ? 'medio' : ''}"><label for="${id}">${esc(c.label)}${c.req ? ' *' : ''}</label>${ctl}${c.ayuda ? `<small>${esc(c.ayuda)}</small>` : ''}</div>`;
  },
  async enviar(e) {
    e.preventDefault();
    const v = {};
    for (const c of this._c.campos) {
      const el = $('#f_' + c.k);
      v[c.k] = c.tipo === 'check' ? el.checked : c.tipo === 'imagen' ? (el.files[0] || null) : c.tipo === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
      if (c.req && (v[c.k] === '' || v[c.k] == null)) { toast(`Falta: ${c.label}`, 'err'); el.focus(); return; }
    }
    try { const error = await this._c.guardar(v); if (error) { toast(error, 'err'); return; } }
    catch (err) { console.error(err); toast(err.message || 'Ocurrió un error', 'err'); return; }
    Modal.cerrar(); App.pintar();
  },
  borrar() { confirmar('¿Eliminar este registro? Esta acción no se puede deshacer.', async () => { await this._c.eliminar(); Modal.cerrar(); App.pintar(); }); }
};

/* ---------- CSV ---------- */
/** Las celdas que empiezan con = + - @ se anteponen con ' para que Excel no las ejecute como fórmula. */
function csvCelda(v) { let s = String(v ?? ''); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function csvTexto(encabezados, filas) { return '﻿' + [encabezados, ...filas].map(f => f.map(csvCelda).join(',')).join('\r\n') + '\r\n'; }
/** Lee CSV con comillas y saltos de línea dentro de celdas. Detecta coma o punto y coma. */
function parseCSV(texto) {
  let t = String(texto || ''); if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  const pl = t.split(/\r?\n/)[0] || ''; const sep = (pl.split(';').length > pl.split(',').length) ? ';' : ',';
  const filas = []; let fila = [], celda = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { celda += '"'; i++; } else q = false; } else celda += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { fila.push(celda); celda = ''; }
    else if (ch === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else if (ch !== '\r') celda += ch;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.filter(f => f.some(c => c.trim() !== '')).map(f => f.map(c => c.trim().replace(/^'(?=[=+\-@])/, '')));
}
function descargar(nombre, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- ZIP sin compresión (para "Exportar todo") ---------- */
const _crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = _crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
/** archivos: [{nombre, texto}] → Blob .zip */
function crearZip(archivos) {
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  const ahora = new Date(), hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1), fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
  for (const a of archivos) {
    const nom = enc.encode(a.nombre), dat = enc.encode(a.texto), crc = crc32(dat);
    const cab = new DataView(new ArrayBuffer(30));
    cab.setUint32(0, 0x04034b50, true); cab.setUint16(4, 20, true); cab.setUint16(6, 0x0800, true); cab.setUint16(8, 0, true);
    cab.setUint16(10, hora, true); cab.setUint16(12, fecha, true); cab.setUint32(14, crc, true); cab.setUint32(18, dat.length, true); cab.setUint32(22, dat.length, true); cab.setUint16(26, nom.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(12, hora, true); cen.setUint16(14, fecha, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, dat.length, true); cen.setUint32(24, dat.length, true); cen.setUint16(28, nom.length, true); cen.setUint32(42, pos, true);
    partes.push(cab.buffer, nom, dat); central.push(cen.buffer, nom); pos += 30 + nom.length + dat.length;
  }
  const tamCentral = central.reduce((s, b) => s + (b.byteLength), 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamCentral, true); fin.setUint32(16, pos, true);
  return new Blob([...partes, ...central, fin.buffer], { type: 'application/zip' });
}

/* ---------- Bóveda: notas privadas cifradas con contraseña ----------
   Clave derivada con PBKDF2 (SHA-256, 600 000 iteraciones) y cifrado AES-GCM.
   La contraseña nunca se guarda; sin ella las notas no se pueden recuperar.   */
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const Boveda = {
  clave: null, notas: [], _tBloqueo: null,
  disponible: () => !!(window.crypto && crypto.subtle),
  abierta() { return !!this.clave; },
  ITER: 600000,   // recomendación OWASP para PBKDF2-SHA256; las bóvedas anteriores conservan sus 250 000
  async _derivar(pass, sal, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async _cifrar(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.clave, new TextEncoder().encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  },
  async _descifrar(r) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(r.iv) }, this.clave, deB64(r.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  },
  async crear(pass) {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    this.clave = await this._derivar(pass, sal, this.ITER);
    S.boveda = { sal: b64(sal), iter: this.ITER, prueba: await this._cifrar({ ok: true }) }; S.notasPriv = []; this.notas = []; guardar(); this._temporizador();
  },
  async abrir(pass) {
    const clave = await this._derivar(pass, deB64(S.boveda.sal), S.boveda.iter || 250000);
    const previa = this.clave; this.clave = clave;
    try { await this._descifrar(S.boveda.prueba); } catch (e) { this.clave = previa; return false; }
    this.notas = [];
    for (const r of S.notasPriv) { try { this.notas.push({ id: r.id, ...(await this._descifrar(r)) }); } catch (e) { console.warn('Nota privada ilegible', r.id); } }
    this._temporizador(); return true;
  },
  cerrar() { this.clave = null; this.notas = []; clearTimeout(this._tBloqueo); },
  /** Bloqueo automático tras 5 minutos sin actividad. */
  _temporizador() { clearTimeout(this._tBloqueo); this._tBloqueo = setTimeout(() => { if (this.abierta()) { this.cerrar(); toast('Notas privadas bloqueadas por inactividad'); if (App.vista === 'notas') App.pintar(); } }, 5 * 60 * 1000); },
  async guardarNota(n) {
    const { id, ...datos } = n; const c = await this._cifrar(datos);
    const i = S.notasPriv.findIndex(x => x.id === id); if (i >= 0) S.notasPriv[i] = { id, ...c }; else S.notasPriv.push({ id, ...c });
    const j = this.notas.findIndex(x => x.id === id); if (j >= 0) this.notas[j] = n; else this.notas.push(n);
    guardar(); this._temporizador();
  },
  quitarNota(id) { S.notasPriv = S.notasPriv.filter(x => x.id !== id); this.notas = this.notas.filter(x => x.id !== id); guardar(); },
  async cambiarClave(nueva) {
    const notas = this.notas.slice(); const sal = crypto.getRandomValues(new Uint8Array(16));
    this.clave = await this._derivar(nueva, sal, this.ITER);
    S.boveda = { sal: b64(sal), iter: this.ITER, prueba: await this._cifrar({ ok: true }) }; S.notasPriv = [];
    for (const n of notas) { const { id, ...d } = n; S.notasPriv.push({ id, ...(await this._cifrar(d)) }); }
    guardar();
  }
};

/* ---------- Seguridad de enlaces: sólo http(s) y mailto ---------- */
function urlSegura(u) {
  let t = String(u || '').trim(); if (!t) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = 'https://' + t;
  try { const x = new URL(t); return ['http:', 'https:', 'mailto:'].includes(x.protocol) ? x.href : ''; } catch (e) { return ''; }
}
