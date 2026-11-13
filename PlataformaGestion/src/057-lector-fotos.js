'use strict';
/* ==========================================================================
   LECTOR DE FOTOS (reconocimiento de texto dentro del navegador)
   --------------------------------------------------------------------------
   Usa Tesseract.js, incrustado en este mismo archivo (ver terceros/tesseract):
   la foto NO sale del equipo y no se hace ninguna conexión.
   - Ocr       : carga la librería bajo demanda y reconoce el texto de una imagen.
   - OcrAgenda : convierte el texto reconocido (con su posición) en eventos de agenda.
                 Entiende dos formatos: lista de agenda (Teams en el celular) y
                 cuadrícula semanal (calendario de Teams/Outlook en la computadora).
   El resultado es un BORRADOR: el reconocimiento se equivoca y el usuario debe revisarlo.
   ========================================================================== */
const Ocr = {
  _w: null, _tCierre: null,
  /** Sólo está disponible en las versiones que incluyen la librería (no en la de Power Pages). */
  disponible() { const e = $('#ocrCore'); return !!(e && e.textContent.length > 100000 && window.Worker && window.WebAssembly); },
  async _trabajador(progreso) {
    clearTimeout(this._tCierre);
    if (this._w) return this._w;
    if (!window.Tesseract) await new Promise((ok, err) => { const s = document.createElement('script'); s.src = URL.createObjectURL(new Blob([$('#ocrLib').textContent], { type: 'text/javascript' })); s.onload = ok; s.onerror = () => err(new Error('No se pudo iniciar el lector de imágenes.')); document.head.appendChild(s); });
    // Todo se entrega desde este mismo archivo, en un solo bloque para el proceso del lector:
    //  1) un guardián que entrega el idioma español y BLOQUEA cualquier otra petición de red del proceso,
    //  2) el núcleo de reconocimiento y 3) el proceso de Tesseract.js.
    // (Un solo bloque: al abrir la página como archivo local, el navegador impide que el proceso cargue otros.)
    const guardian = `(() => { const datos = ${JSON.stringify($('#ocrLang').textContent.trim())};
      self.fetch = async (u) => { if (/(^|\\/)nova-incrustado\\/spa\\.traineddata\\.gz$/.test(String(u))) return new Response(Uint8Array.from(atob(datos), c => c.charCodeAt(0)));
        throw new Error('Conexión bloqueada por Nova: ' + String(u).slice(0, 80)); }; })();`;
    const proceso = URL.createObjectURL(new Blob([guardian, '\n;\n', $('#ocrCore').textContent, '\n;\n', $('#ocrWorker').textContent], { type: 'text/javascript' }));
    this._w = await Tesseract.createWorker('spa', 1, {
      workerPath: proceso, workerBlobURL: false, corePath: 'incrustado.js', langPath: 'nova-incrustado', cacheMethod: 'none', gzip: true,
      logger: m => { if (progreso && m && m.status === 'recognizing text') progreso(m.progress); }
    });
    return this._w;
  },
  /** Convierte el archivo en un lienzo de tamaño adecuado (también descarta cualquier contenido que no sea imagen). */
  async _preparar(archivo) {
    if (!archivo || !/^image\//.test(archivo.type)) throw new Error('El archivo no es una imagen.');
    if (archivo.size > 25 * 1048576) throw new Error('La imagen supera 25 MB.');
    const bmp = await createImageBitmap(archivo), lado = Math.max(bmp.width, bmp.height);
    const k = lado > 2600 ? 2600 / lado : lado < 1500 ? Math.min(2, 1800 / lado) : 1;
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const x = cv.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, cv.width, cv.height);
    return cv;
  },
  /** Para fotos de cuaderno: escala de grises y blanco/negro por zonas (compensa sombras y renglones tenues). */
  _limpiarPapel(cv) {
    const x = cv.getContext('2d', { willReadFrequently: true }), W = cv.width, H = cv.height, img = x.getImageData(0, 0, W, H), d = img.data;
    const g = new Float32Array(W * H); for (let i = 0; i < W * H; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    // imagen integral para promediar la luz alrededor de cada punto (umbral adaptativo)
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 1; y <= H; y++) { let f = 0; for (let x0 = 1; x0 <= W; x0++) { f += g[(y - 1) * W + x0 - 1]; I[y * (W + 1) + x0] = I[(y - 1) * (W + 1) + x0] + f; } }
    const r = Math.max(8, Math.round(Math.min(W, H) / 40));
    for (let y = 0; y < H; y++) for (let x0 = 0; x0 < W; x0++) {
      const a = Math.max(0, x0 - r), b = Math.max(0, y - r), c = Math.min(W, x0 + r + 1), e = Math.min(H, y + r + 1);
      const m = (I[e * (W + 1) + c] - I[b * (W + 1) + c] - I[e * (W + 1) + a] + I[b * (W + 1) + a]) / ((c - a) * (e - b));
      const v = g[y * W + x0] < m * 0.86 ? 0 : 255, k = (y * W + x0) * 4; d[k] = d[k + 1] = d[k + 2] = v;
    }
    x.putImageData(img, 0, 0); return cv;
  },
  /** Gira el lienzo en múltiplos de 90° (sentido de las manecillas del reloj). */
  _rotar(cv, g) {
    g = ((Number(g) || 0) % 360 + 360) % 360; if (!g) return cv;
    const o = document.createElement('canvas'), lado = g % 180 !== 0; o.width = lado ? cv.height : cv.width; o.height = lado ? cv.width : cv.height;
    const x = o.getContext('2d', { willReadFrequently: true }); x.translate(o.width / 2, o.height / 2); x.rotate(g * Math.PI / 180); x.drawImage(cv, -cv.width / 2, -cv.height / 2); return o;
  },
  /**
   * opciones.giro: 0, 90, 180 o 270 · opciones.papel: limpieza de contraste ·
   * opciones.psm: modo de página del lector (6 = bloque, el predeterminado de Tesseract.js y con el que se calibró la lectura de agendas; 3 = automático; 11 = texto disperso)
   */
  async leer(archivo, progreso, opciones = {}) {
    let lienzo = this._rotar(await this._preparar(archivo), opciones.giro); if (opciones.papel) lienzo = this._limpiarPapel(lienzo);
    const w = await this._trabajador(progreso);
    await w.setParameters({ tessedit_pageseg_mode: String([3, 6, 11].includes(opciones.psm) ? opciones.psm : 6) });
    const { data } = await w.recognize(lienzo);
    this._tCierre = setTimeout(() => this.cerrar(), 3 * 60 * 1000);   // libera memoria si ya no se usa
    return data;
  },
  /** Palabras legibles: al menos 3 letras leídas con confianza alta. Es la mejor señal para elegir entre lecturas. */
  buenas: data => (data.words || []).filter(w => w.confidence >= 75 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(w.text)).length,
  /**
   * Para notas y fotos de texto libre: prueba la foto tal cual y con limpieza en modo de texto disperso
   * (medido con fotos reales: la captura de pantalla oscura pasó de 0 % a 77 % de palabras) y, si la foto
   * parece estar de lado, prueba girada. Se queda con la lectura que tiene más palabras legibles.
   */
  async leerMejor(archivo, progreso, { giro = 'auto' } = {}) {
    const intentos = [], prueba = async (op, txt) => { const d = await this.leer(archivo, av => progreso && progreso(txt, av), op); const r = { d, b: this.buenas(d), op }; intentos.push(r); return r; };
    const elegir = () => intentos.slice().sort((a, c) => c.b - a.b || (a.op.psm === 11) - (c.op.psm === 11))[0];
    const g0 = giro === 'auto' ? 0 : Number(giro) || 0;
    await prueba({ giro: g0, psm: 3 }, 'Leyendo'); await prueba({ giro: g0, papel: true, psm: 11 }, 'Probando con limpieza de la foto');
    if (giro === 'auto' && elegir().b < 3) {
      for (const g of [90, 270, 180]) { const r = await prueba({ giro: g, psm: 3 }, `Probando la foto girada ${g}°`); if (r.b >= 3 && elegir() === r) { await prueba({ giro: g, papel: true, psm: 11 }, `Girada ${g}° con limpieza`); break; } }
    }
    const m = elegir(); return { data: m.d, giro: m.op.giro || 0, buenas: m.b, intentos: intentos.length };
  },
  /** Texto reconocido como párrafos: une renglones y separa donde hay un espacio mayor entre líneas. */
  texto(data) {
    // quita rayas sueltas que deja el renglonado del cuaderno y descarta renglones sin palabras
    const limpia = t => String(t).replace(/(^|\s)[—–_\-=~|]{1,}(?=\s|$)/g, ' ').replace(/[—–_]{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const L = (data.lines || []).filter(l => l.confidence >= 30).map(l => ({ t: limpia(l.text), y0: l.bbox.y0, y1: l.bbox.y1 })).filter(l => /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]{2,}/.test(l.t));
    const alto = L.length ? L.map(l => l.y1 - l.y0).sort((a, b) => a - b)[Math.floor(L.length / 2)] : 0;
    return L.map((l, i) => (i && l.y0 - L[i - 1].y1 > alto * 0.9 ? '\n' : '') + l.t).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  },
  async cerrar() { const w = this._w; this._w = null; if (w) { try { await w.terminate(); } catch (e) { /* ya estaba cerrado */ } } }
};

const OcrAgenda = {
  MES: { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 },
  /** Confusiones típicas del lector al leer números (9→g, 0→O, 1→l, 5→S). */
  _num: t => String(t).replace(/[gq]/g, '9').replace(/[Oo]/g, '0').replace(/[lIi|]/g, '1').replace(/[Ss]/g, '5').replace(/[Zz]/g, '2').replace(/B/g, '8'),
  /** Año que deja la fecha más cerca de hoy (las fotos casi nunca muestran el año). */
  _fecha(mes, dia, anio) {
    const h = deISO(hoyISO()); let mejor = null;
    for (const y of anio ? [anio] : [h.getFullYear() - 1, h.getFullYear(), h.getFullYear() + 1]) { const d = new Date(y, mes - 1, dia); if (d.getMonth() !== mes - 1) continue; if (!mejor || Math.abs(d - h) < Math.abs(mejor - h)) mejor = d; }
    return mejor ? aISO(mejor) : '';
  },
  _hm: min => { const m = Math.max(0, Math.min(1439, Math.round(min))); return `${p2(Math.floor(m / 60))}:${p2(m % 60)}`; },
  _limpia: t => String(t).replace(/^[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ"¿¡]+/, '').replace(/[\s|_~—–\-.,;:]+$/, '').replace(/\s{2,}/g, ' ').trim().slice(0, 160),
  /** Una palabra "real": al menos 3 letras seguidas leídas con buena confianza. */
  _real: w => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(w.t) && w.c >= 70,
  _lineas(data) {
    return (data.lines || []).map(l => ({ t: String(l.text || '').trim(), y: l.bbox.y0, h: l.bbox.y1 - l.bbox.y0, c: l.confidence,
      w: (l.words || []).map(w => ({ t: String(w.text || ''), x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1, c: w.confidence })) })).sort((a, b) => a.y - b.y);
  },
  /** Devuelve { formato, eventos: [{titulo, fecha, horaIni, horaFin, lugar, nota, incluir}] } */
  interpretar(data) {
    const L = this._lineas(data), rejilla = this._rejilla(L, String(data.text || ''));
    const crudos = rejilla || this._lista(L);
    const eventos = crudos.filter(e => e.fecha && e.titulo.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').length >= 2).map(e => {
      const dudosa = e.conf < 78 || /[—|$€«»]/.test(e.titulo);
      return { titulo: e.titulo, fecha: e.fecha, horaIni: this._hm(e.ini), horaFin: this._hm(Math.min(e.ini + e.dur, 1439)), lugar: e.lugar || '',
        nota: [e.nota, dudosa ? 'Lectura dudosa: revisa' : ''].filter(Boolean).join('. '), incluir: !dudosa };
    });
    return { formato: rejilla ? 'cuadrícula semanal' : 'lista de agenda', eventos };
  },

  /* ---------- Formato 1: lista de agenda (Teams en el celular) ---------- */
  _lista(L) {
    const out = []; let fecha = '', ev = null;
    for (const l of L) {
      const t = l.t; if (!t || l.c < 35) continue;
      const f = t.match(/(?:^|\s)([0-9gqOoIlS]{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-zé]*\b/i);
      const dia = f ? +this._num(f[1]) : 0;
      if (f && dia >= 1 && dia <= 31 && t.length < 40 && !/\d{1,2}[:.]\d{2}/.test(t)) { fecha = this._fecha(this.MES[f[2].toLowerCase()], dia); ev = null; continue; }
      const h = t.match(/(?:^|\s)([01]?\d|2[0-3])[:.]([0-5]\d)\s+(.{2,})$/);
      if (h && fecha) {
        // confianza del título: promedio de sus palabras
        const pal = l.w.filter(w => !/^[\d:.]+$/.test(w.t) && w.x0 >= (l.w.find(x => /\d{1,2}[:.]\d{2}/.test(x.t)) || { x1: 0 }).x1);
        const conf = pal.length ? pal.reduce((s, w) => s + w.c, 0) / pal.length : l.c;
        ev = { titulo: this._limpia(h[3]), fecha, ini: +h[1] * 60 + +h[2], dur: 60, lugar: '', nota: '', conf }; out.push(ev); continue;
      }
      if (!ev) continue;
      const mi = t.match(/^\D{0,3}(\d{1,3})\s*min/i), d = t.match(/^\D{0,3}(\d{1,2})\s*h\b/i);
      if (mi) ev.dur = Math.min(+mi[1], 720); else if (d && +d[1] > 0) ev.dur = Math.min(+d[1], 12) * 60;
      if (/teams/i.test(t) && !ev.lugar) ev.lugar = 'Teams';
      const s = t.match(/sala\s*([0-9]{1,2})/i); if (s && !/Sala/.test(ev.lugar)) ev.lugar = (ev.lugar ? ev.lugar + '; ' : '') + 'Sala ' + s[1];
    }
    return out;
  },

  /* ---------- Formato 2: cuadrícula semanal (Teams/Outlook en la computadora) ---------- */
  _rejilla(L, texto) {
    const mediana = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
    const h24 = (n, ap) => (/pm/i.test(ap) ? (n % 12) + 12 : n % 12);
    // 1. Etiquetas de hora ("10 AM", "1 PM"): dan la escala vertical
    const et = [], usadas = new Set();
    for (const l of L) l.w.forEach((w, i) => {
      let m;
      if ((m = w.t.match(/^(\d{1,2})\s?(AM|PM)$/i)) && +m[1] >= 1 && +m[1] <= 12) { et.push({ h: h24(+m[1], m[2]), y: w.y0, x: w.x0 }); usadas.add(w); }
      else if (/^(AM|PM)$/i.test(w.t) && i > 0) { const a = l.w[i - 1]; usadas.add(w); usadas.add(a); if (/^\d{1,2}$/.test(a.t) && +a.t >= 1 && +a.t <= 12 && w.x0 - a.x1 < (w.y1 - w.y0) * 2.5) et.push({ h: h24(+a.t, w.t), y: a.y0, x: a.x0 }); }
    });
    if (et.length < 3) return null;
    const pend = []; for (let i = 0; i < et.length; i++) for (let j = i + 1; j < et.length; j++) if (et[i].h !== et[j].h) pend.push((et[j].y - et[i].y) / (et[j].h - et[i].h));
    const b = mediana(pend); if (!(b > 12)) return null;                      // píxeles por hora
    const a0 = mediana(et.map(e => e.y - b * e.h)), buenas = et.filter(e => Math.abs(e.y - b * e.h - a0) < b * 0.3);   // descarta horas mal leídas
    if (buenas.length < 2) return null;
    const a = buenas.reduce((s, e) => s + e.y - b * e.h, 0) / buenas.length, xHoras = mediana(buenas.map(e => e.x)), yPrimera = Math.min(...buenas.map(e => e.y));
    // límite inferior: una hora después de la última etiqueta (debajo suele estar la barra de tareas)
    const yFin = Math.max(...buenas.map(e => e.y)) + b * 0.9;
    // 2. Encabezado de días: la fila de números consecutivos a la derecha de las horas
    let cols = [];
    for (const l of L) {
      if (l.y > yPrimera) break;
      // une dígitos que el lector separó ("1" "1" → "11")
      const dig = l.w.filter(w => /^\d{1,2}$/.test(w.t) && w.x0 > xHoras).sort((p, q) => p.x0 - q.x0).reduce((r, w) => {
        const u = r[r.length - 1];
        if (u && u.t.length === 1 && w.t.length === 1 && w.x0 - u.x1 < (w.y1 - w.y0) * 0.5) r[r.length - 1] = { ...u, t: u.t + w.t, x1: w.x1 }; else r.push({ ...w });
        return r; }, []);
      const nums = dig.filter(w => +w.t >= 1 && +w.t <= 31);
      let racha = [];
      const cierra = () => { if (racha.length > cols.length) cols = racha.slice(); };
      for (const w of nums) { const ant = racha[racha.length - 1]; if (ant && (+w.t === +ant.t + 1 || (+ant.t >= 28 && +w.t === 1))) racha.push(w); else { cierra(); racha = [w]; } }
      cierra();
    }
    if (cols.length < 3) return null;
    const paso = mediana(cols.slice(1).map((w, i) => w.x0 - cols[i].x0)), yEnc = Math.max(...cols.map(w => w.y1)), alto = mediana(cols.map(w => w.y1 - w.y0));
    // 3. Mes y año: "19-24 de Octubre de 2026" o "Noviembre 2026"
    const hoy = deISO(hoyISO()); let mes = hoy.getMonth() + 1, anio = 0;
    const r = texto.match(/\d{1,2}\s*[-–—]\s*\d{1,2}\s+de\s+([A-Za-zé]{4,})\s+de\s+(\d{4})/) || texto.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s*(\d{4})/i);
    if (r && this.MES[r[1].slice(0, 3).toLowerCase()]) { mes = this.MES[r[1].slice(0, 3).toLowerCase()]; anio = +r[2]; }
    const cruza = +cols[0].t > +cols[cols.length - 1].t;   // la semana abarca dos meses: el texto nombra el mes final
    const fechaCol = w => { let m = mes, y = anio; if (cruza && +w.t >= +cols[0].t) { m = mes === 1 ? 12 : mes - 1; if (y && mes === 1) y--; } return this._fecha(m, +w.t, y); };
    // 4. Palabras del cuerpo, repartidas por columna (se descartan la fila de nombres de día y lo que queda bajo la cuadrícula)
    const yIni = yEnc + alto * 1.5, out = [];
    const esOrg = t => /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}[,.]\s*[A-ZÁÉÍÓÚÑ]/.test(t) || /^[A-Z][a-z]+[A-Z][a-z]+[A-Za-z]{4,}$/.test(t);
    cols.forEach(col => {
      const x0 = col.x0 - paso * 0.1, x1 = x0 + paso;
      const ws = L.flatMap(l => l.w).filter(w => !usadas.has(w) && w.c >= 45 && w.x0 >= x0 && w.x0 < x1 && w.y0 > yIni && w.y0 < yFin && /[0-9A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w.t) && (w.t.replace(/[^0-9A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').length >= 2 || w.c >= 85)).sort((p, q) => p.y0 - q.y0);
      // renglones (misma altura) y bloques (renglones seguidos)
      const reng = [];
      for (const w of ws) { const u = reng[reng.length - 1]; if (u && Math.abs(w.y0 - u.y) < (w.y1 - w.y0) * 0.6) u.w.push(w); else reng.push({ y: w.y0, h: w.y1 - w.y0, w: [w] }); }
      const hRen = mediana(reng.map(x => x.h)) || alto, bloques = [];
      for (const x of reng) { const u = bloques[bloques.length - 1]; if (u && x.y - u[u.length - 1].y < hRen * 2.1) u.push(x); else bloques.push([x]); }
      const evs = [];
      for (const bl of bloques) {
        const pal = bl.flatMap(x => x.w);
        const txt = bl.map(x => x.w.sort((p, q) => p.x0 - q.x0).map(w => w.t).join(' '));
        const hora = (bl[0].y - a) / b; if (hora < 0 || hora > 23.4) continue;
        const ant = evs[evs.length - 1], todo = txt.join(' ');
        // Continuación del evento anterior (texto pegado al bloque de arriba): organizador en varias líneas,
        // palabra cortada al final del renglón o una sola palabra suelta
        if (ant && bl[0].y - ant.yUlt < hRen * 3 && (esOrg(todo) || /^[a-záéíóúñ]/.test(todo) || (pal.length === 1 && !/^\d/.test(todo)))) {
          ant.org = this._limpia([ant.org, todo].filter(Boolean).join(/^[a-záéíóúñ]/.test(todo) ? '' : ' ')); ant.yUlt = bl[bl.length - 1].y; continue;
        }
        if (!pal.some(this._real)) continue;                                       // sin ninguna palabra legible: ruido
        let k = txt.findIndex(esOrg); if (k === 0) k = -1;
        let titulo = this._limpia((k > 0 ? txt.slice(0, k) : txt).join(' ')), org = k > 0 ? this._limpia(txt.slice(k).join(' ')) : '';
        // organizador pegado en la misma línea: "SUA Mezalopez, Jose"
        const m = !org && titulo.match(/^(.+?)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}[,.]\s*[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]*)$/);
        if (m) { titulo = this._limpia(m[1]); org = m[2]; }
        if (/^\d{1,2}[:\/]\d{2}/.test(titulo) || titulo.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').length < 3) continue;
        const tit = pal.filter(w => titulo.includes(w.t));
        evs.push({ titulo, org, yUlt: bl[bl.length - 1].y, fecha: fechaCol(col), ini: Math.round(hora * 2) / 2 * 60, dur: 60, lugar: '', conf: tit.length ? tit.reduce((s, w) => s + w.c, 0) / tit.length : 0 });
      }
      // duración: hasta el siguiente evento de la columna, máximo una hora
      evs.forEach((e, i) => { const sig = evs[i + 1]; if (sig && sig.ini > e.ini) e.dur = Math.min(60, sig.ini - e.ini); });
      for (const { yUlt, ...e } of evs) out.push({ ...e, nota: (e.org ? 'Organiza: ' + e.org.replace(/\s*\.\s*(?=[A-Z])/, ', ') + '. ' : '') + 'Hora y duración estimadas' });
    });
    return out.length ? out : null;
  }
};
