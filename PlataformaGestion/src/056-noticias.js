'use strict';
/* ==========================================================================
   NOTICIAS E INVESTIGACIÓN
   --------------------------------------------------------------------------
   Claude guarda cada búsqueda como un archivo JSON en la carpeta noticias/ del repositorio
   privado de sincronización (nova-datos). «Actualizar» los lee con el mismo token de la
   sincronización (todas las peticiones a GitHub pasan por Sync._gh, en el módulo 055) y
   los guarda en S.noticias. Eliminar manda la noticia a la papelera (7 días) y quita el
   archivo del repositorio; si no hay conexión, el borrado queda pendiente en S.porBorrar.
   Todo el contenido viene de internet: es dato NO confiable. Se valida al leerlo (formato,
   tamaños, sólo direcciones https) y se escapa al mostrarlo.
   Formato del archivo: docs/NOTICIAS_CLAUDE.md
   ========================================================================== */
const Noticias = {
  TEMAS: ['Seguridad', 'IA', 'Power Platform', 'Desarrollo web'],
  RUTA: /^noticias\/[A-Za-z0-9._-]{1,120}\.json$/,
  MAX_KB: 100, MAX_ARCHIVOS: 300,
  _ocupado: false,

  conectado: () => Sync.activo(),
  sinLeer: () => S.noticias.filter(n => !n.leida).length,

  /* ---------- Validación de un archivo (dato no confiable) ---------- */
  /** Convierte el JSON de un archivo en una noticia; devuelve null si no tiene el formato. */
  validar(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o) || o.formato !== 'nova-noticia') return null;
    const linea = (v, n) => typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, n) : '';
    const titulo = linea(o.titulo, 300); if (!titulo) return null;
    const temaTxt = linea(o.tema, 60), tema = this.TEMAS.find(t => norm(t) === norm(temaTxt)) || temaTxt || 'General';
    const lista = (v, max) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).slice(0, max);
    const puntos = lista(o.puntos, 20).map(p => linea(p, 600)).filter(Boolean).join('\n');
    const fuentes = lista(o.fuentes, 20).filter(f => f && typeof f === 'object' && !Array.isArray(f)).map(f => {
      const u = urlSegura(linea(f.url, 2000)), url = /^https:\/\//i.test(u) ? u : '';   // sólo https
      return [linea(f.medio, 120), linea(f.titulo, 300), url, linea(f.fecha, 30)].map(x => x.replace(/\t/g, ' ')).join('\t');
    }).filter(l => l.replace(/\t/g, '')).join('\n');
    const d = new Date(typeof o.fecha === 'string' ? o.fecha : ''), fecha = isNaN(d) ? ahoraTxt() : `${aISO(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    return {
      tipo: norm(o.tipo) === 'investigacion' ? 'investigacion' : 'noticia', tema, titulo,
      resumen: typeof o.resumen === 'string' ? o.resumen.replace(/\r/g, '').trim().slice(0, 8000) : '',
      puntos, fuentes, etiquetas: lista(o.etiquetas, 10).map(e => linea(e, 40)).filter(Boolean).join(', '),
      relevancia: ['alta', 'media', 'baja'].includes(norm(o.relevancia)) ? norm(o.relevancia) : 'media',
      consulta: linea(o.consulta, 300), fecha, leida: false, guardada: false
    };
  },
  /** Fuentes guardadas como renglones «medio⇥título⇥url⇥fecha». */
  fuentes: n => String(n.fuentes || '').split('\n').filter(Boolean).map(l => { const [medio = '', titulo = '', url = '', fecha = ''] = l.split('\t'); return { medio, titulo, url: /^https:\/\//i.test(url) ? urlSegura(url) : '', fecha }; }),

  /* ---------- GitHub (nova-datos/noticias) ---------- */
  async actualizar() {
    if (!this.conectado()) { toast('Conecta tu repositorio nova-datos en Ajustes → Sincronización para recibir noticias', 'err'); return; }
    if (this._ocupado) return;
    if (!navigator.onLine) { toast('Sin conexión a internet', 'err'); return; }
    this._ocupado = true; toast('Buscando noticias nuevas en nova-datos…');
    let nuevas = 0, cambiadas = 0, malas = 0;
    try {
      await this._pendientes();
      const m = await Sync._remoto();   // valida que el repositorio sea privado y devuelve sus archivos
      const archivos = m.otros.filter(e => this.RUTA.test(e.path)).slice(0, this.MAX_ARCHIVOS);
      const pendientes = new Set(S.porBorrar.map(x => x.archivo));
      for (const e of archivos) {
        if (pendientes.has(e.path)) continue;
        const ya = S.noticias.find(n => n.archivo === e.path) || S.papelera.find(p => p.lista === 'noticias' && p.obj.archivo === e.path && p.obj.sha === e.sha);
        if (ya && (ya.sha === e.sha || ya.obj)) continue;   // sin cambios, o eliminada y en la papelera
        if (!(m.tam[e.path] <= this.MAX_KB * 1024)) { malas++; continue; }   // sin descargar archivos grandes o sin tamaño
        try {
          const b = await Sync._gh('GET', `/git/blobs/${Sync._sha(e.sha)}`);
          if (!(Number(b.size) <= this.MAX_KB * 1024)) { malas++; continue; }
          const n = this.validar(JSON.parse(new TextDecoder().decode(deB64(String(b.content).replace(/\s/g, ''))))); if (!n) { malas++; continue; }
          if (ya) { Object.assign(ya, n, { leida: ya.leida, guardada: ya.guardada, sha: e.sha }); cambiadas++; }
          else { S.noticias.push({ id: uid(), archivo: e.path, sha: e.sha, recibida: ahoraTxt(), ...n }); nuevas++; }
        } catch (er) { malas++; }
      }
      S.ajustes.noticiasAct = ahoraTxt(); guardar(); App.pintar();
      toast(`${nuevas ? nuevas + ' noticia(s) nueva(s)' : 'Sin noticias nuevas'}${cambiadas ? ` · ${cambiadas} actualizada(s)` : ''}${malas ? ` · ${malas} archivo(s) ignorado(s) por formato o tamaño` : ''}`);
    } catch (e) { console.error(e); toast(e.message, 'err'); }
    finally { this._ocupado = false; }
  },
  /** Quita del repositorio los archivos de noticias eliminadas en Nova (reintenta los que quedaron pendientes). */
  async _pendientes() {
    if (!this.conectado() || !navigator.onLine || !S.porBorrar.length) return;
    for (const x of S.porBorrar.slice()) {
      const ok = () => { S.porBorrar = S.porBorrar.filter(y => y !== x); };
      if (!this.RUTA.test(String(x.archivo)) || !/^[0-9a-f]{40,64}$/.test(String(x.sha))) { ok(); continue; }
      try { await Sync._gh('DELETE', '/contents/' + x.archivo.split('/').map(encodeURIComponent).join('/'), { message: 'Nova Organización: noticia leída y eliminada', sha: x.sha }); ok(); }
      catch (e) { if (e.status === 404 || e.status === 409 || e.status === 422) ok(); else break; }   // ya no existe o cambió: se da por resuelto
    }
    guardar();
  },

  /* ---------- Acciones ---------- */
  abrir(id) { const n = por('noticias', id); if (!n) return; UI.not.id = id; if (!n.leida) { n.leida = true; guardar(); } App.pintar(); },
  leida(id) { const n = por('noticias', id); if (!n) return; n.leida = !n.leida; guardar(); App.pintar(); },
  guardada(id) { const n = por('noticias', id); if (!n) return; n.guardada = !n.guardada; guardar(); App.pintar(); toast(n.guardada ? 'Guardada para después' : 'Quitada de guardadas'); },
  /** Eliminar: como en Notas, confirma, va a la papelera 7 días y queda abierta la siguiente. */
  borrar(id) {
    const n = por('noticias', id); if (!n) return;
    const titulo = n.titulo;   // confirmar() escapa el mensaje completo antes de mostrarlo
    confirmar(`¿Eliminar «${titulo}»? Irá a la papelera durante 7 días${n.archivo ? ' y se quitará de nova-datos' : ''}.`, () => {
      const l = this.visibles(), i = l.findIndex(x => x.id === id), sig = l[i + 1] || l[i - 1];
      if (n.archivo && !S.porBorrar.some(x => x.archivo === n.archivo)) S.porBorrar.push({ id: uid(), archivo: n.archivo, sha: n.sha });
      quitar('noticias', id); UI.not.id = sig ? sig.id : null; App.pintar(); toast('Noticia enviada a la papelera');
      this._pendientes().catch(() => {});
    });
  },
  texto(n) {
    const f = this.fuentes(n).map(x => `- ${[x.medio, x.titulo].filter(Boolean).join(': ')}${x.url ? ' ' + x.url : ''}`).join('\n');
    return [n.resumen, n.puntos ? 'Puntos clave:\n' + n.puntos.split('\n').map(p => '- ' + p).join('\n') : '', f ? 'Fuentes:\n' + f : '', n.consulta ? 'Búsqueda: ' + n.consulta : ''].filter(Boolean).join('\n\n');
  },
  crearNota(id) {
    const n = por('noticias', id); if (!n) return;
    S.notas.push({ id: uid(), titulo: n.titulo, texto: this.texto(n), proyecto: '', etiquetas: [n.tema, n.etiquetas].filter(Boolean).join(', '), fijada: false, creado: ahoraTxt(), actualizado: ahoraTxt() });
    guardar(); toast('Nota creada en Notas');
  },
  crearActividad(id) {
    const n = por('noticias', id); if (!n) return;
    const a = { id: uid(), creado: hoyISO(), titulo: ('Revisar: ' + n.titulo).slice(0, 200), proyecto: '', categoria: '', estatus: idInicial(), prioridad: n.relevancia === 'alta' ? '2' : '3', inicio: '', limite: '', hora: '', horas: null, detalle: this.texto(n).slice(0, 4000), checklist: '', completada: '' };
    regEstatus('actividades', a, '', a.estatus); poner('actividades', a); Act.editar(a.id);
  },
  /** Importar archivos .json con el mismo formato (sin GitHub). */
  importar() {
    Modal.abrir(`<div class="form"><h2>Importar noticias (.json)</h2><div class="campos" style="display:block">
      <p class="d" style="margin-bottom:10px">Archivos con el formato de noticias de Nova (el mismo que Claude guarda en nova-datos). Máximo 50 archivos de ${this.MAX_KB} KB.</p>
      <input type="file" id="ntjArch" accept="application/json,.json" multiple></div>
      <div class="acciones"><span class="esp"></span><button class="btn" type="button" onclick="Modal.cerrar()">Cancelar</button><button class="btn pri" type="button" onclick="Noticias._importar()">Importar</button></div></div>`);
  },
  async _importar() {
    const fs = [...$('#ntjArch').files]; if (!fs.length) return toast('Elige uno o varios archivos .json', 'err');
    let ok = 0, malas = 0;
    for (const f of fs.slice(0, 50)) {
      if (f.size > this.MAX_KB * 1024) { malas++; continue; }
      try { const n = this.validar(JSON.parse(await f.text())); if (!n || S.noticias.some(x => x.titulo === n.titulo && x.fecha === n.fecha)) { malas++; continue; } S.noticias.push({ id: uid(), archivo: '', sha: '', recibida: ahoraTxt(), ...n }); ok++; }
      catch (e) { malas++; }
    }
    guardar(); Modal.cerrar(); App.pintar(); toast(`${ok} noticia(s) importada(s)${malas ? ` · ${malas} omitida(s)` : ''}`);
  },

  /* ---------- Instrucción para Claude ---------- */
  CLAVES: 'Seguridad: phishing, fraudes, vulnerabilidades, parches urgentes, filtraciones de datos en México\nIA: modelos nuevos, agentes, Claude, automatización con IA\nPower Platform: actualizaciones de Power Apps, Power Automate, Power BI, Power Pages, Copilot Studio y Dataverse\nDesarrollo web: JavaScript, React, HTML y CSS, Azure Static Web Apps, seguridad web',
  claves: () => (S.ajustes.noticiasClaves || Noticias.CLAVES).slice(0, 3000),
  prompt() {
    const repo = this.conectado() ? `${Sync.cfg.owner}/${Sync.cfg.repo}` : 'tu-usuario/nova-datos', ej = '{"formato":"nova-noticia","v":1,"tipo":"noticia","tema":"Seguridad","titulo":"…","resumen":"…","puntos":["…","…"],"fuentes":[{"medio":"…","titulo":"…","url":"https://…","fecha":"AAAA-MM-DD"}],"etiquetas":["…"],"relevancia":"alta","consulta":"…","fecha":"AAAA-MM-DDThh:mm:00-06:00"}';
    return `Busca noticias publicadas en los últimos 7 días sobre estos temas y palabras clave:
${this.claves()}

Por cada noticia relevante (máximo 10 en total, sin repetir la misma historia) crea UN archivo JSON en el repositorio privado de GitHub ${repo}, rama principal (main), carpeta noticias/, con el nombre AAAA-MM-DD-hhmm-tema-palabra.json (sólo letras sin acentos, números y guiones). Usa la herramienta de GitHub para crear archivos (no clones ni hagas push con git: el historial de ese repositorio se reemplaza seguido).

Formato exacto de cada archivo:
${ej}

Reglas:
- tipo: "noticia" o "investigacion" (si te pido investigar un tema, una sola investigación con más puntos y fuentes).
- tema: uno de Seguridad, IA, Power Platform, Desarrollo web.
- Resumen en español de México, 2 a 4 oraciones; 2 a 5 puntos clave accionables.
- Fuentes reales que consultaste, sólo con dirección https. No inventes datos, cifras ni fuentes.
- relevancia "alta" sólo si requiere que yo haga algo (actualizar, cambiar una contraseña, revisar una configuración); "media" si es útil; "baja" si es informativa.
- No modifiques ni borres ningún otro archivo del repositorio (datos.json, img/ y los demás son de Nova Organización).
Al terminar dime cuántos archivos creaste.`;
  },
  instruccion() {
    Modal.abrir(`<div class="form"><h2>Instrucción para Claude</h2><div class="campos" style="display:block">
      <p class="d" style="margin-bottom:8px">Copia la instrucción y pégala en una conversación de Claude que tenga acceso a tu repositorio privado (por ejemplo, Claude Code con el repositorio de sincronización). Cuando termine, pulsa «Actualizar desde nova-datos».</p>
      <label class="d" for="ntClaves"><b>Temas y palabras clave</b> (uno por renglón)</label>
      <textarea id="ntClaves" rows="5" style="width:100%;margin:4px 0 10px">${esc(this.claves())}</textarea>
      <div class="barra" style="margin-bottom:6px"><button class="btn" type="button" onclick="Noticias._guardarClaves()">Guardar temas</button><button class="lnk gris" type="button" onclick="document.getElementById('ntClaves').value=Noticias.CLAVES">Restablecer</button></div>
      <label class="d" for="ntPrompt"><b>Instrucción</b></label><textarea id="ntPrompt" rows="12" readonly style="width:100%;margin-top:4px;font-size:12.5px">${esc(this.prompt())}</textarea></div>
      <div class="acciones"><span class="esp"></span><button class="btn" type="button" onclick="Modal.cerrar()">Cerrar</button><button class="btn pri" type="button" onclick="Noticias._copiar()">Copiar instrucción</button></div></div>`, 760);
  },
  _guardarClaves() { const v = $('#ntClaves').value.replace(/\r/g, '').trim().slice(0, 3000); S.ajustes.noticiasClaves = v === this.CLAVES ? '' : v; guardar(); $('#ntPrompt').value = this.prompt(); toast('Temas guardados'); },
  async _copiar() {
    const t = $('#ntPrompt'); try { await navigator.clipboard.writeText(t.value); toast('Instrucción copiada'); }
    catch (e) { t.focus(); t.select(); toast('Selecciona el texto y cópialo (Ctrl+C)'); }
  },

  /* ---------- Lista ---------- */
  visibles() {
    const u = UI.not, l = S.noticias.filter(n => (u.f === 'todas' || (u.f === 'guardadas' ? n.guardada : (!n.leida || n.id === u.id)))
      && (!u.tema || n.tema === u.tema) && (!u.tipo || n.tipo === u.tipo) && coincide(u.q, n.titulo, n.resumen, n.etiquetas, n.consulta, n.tema));
    return l.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
};

const REL_COLOR = { alta: 'var(--bad)', media: 'var(--warn)', baja: 'var(--mut)' };
const punRel = r => `<i class="prel" style="background:${REL_COLOR[r] || 'var(--mut)'}" title="Relevancia ${esc(r || '')}"></i>`;
const grupoDia = f => { const d = (f || '').slice(0, 10), n = difDias(d || hoyISO(), hoyISO()); return n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : may(deISO(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')); };

Vistas.noticias = () => {
  const u = UI.not, total = S.noticias.length, sinLeer = Noticias.sinLeer(), guard = S.noticias.filter(n => n.guardada).length;
  const temas = [...new Set([...Noticias.TEMAS, ...S.noticias.map(n => n.tema)])];
  const enc = cab('Noticias e investigación', `${total} elemento(s) · ${sinLeer} sin leer${S.ajustes.noticiasAct ? ' · actualizado ' + esc(fFecha(S.ajustes.noticiasAct.slice(0, 10)) + ' ' + S.ajustes.noticiasAct.slice(11)) : ''}`,
    btnCarga('noticias') + '<button class="btn" onclick="Noticias.importar()">Importar .json</button><button class="btn" onclick="Noticias.instruccion()">Instrucción para Claude</button>' + (Noticias.conectado() ? '<button class="btn pri" onclick="Noticias.actualizar()">Actualizar desde nova-datos</button>' : '<button class="btn pri" onclick="UI.aj.tab=\'sync\';App.ir(\'ajustes\')">Conectar nova-datos</button>'));
  const barra = `<div class="barra"><div class="fil">${[['sinleer', 'Sin leer', sinLeer], ['todas', 'Todas', total], ['guardadas', 'Guardadas', guard]].map(([k, t, n]) => `<button class="${u.f === k ? 'on' : ''}" onclick="UI.not.f='${k}';App.pintar()">${t} <span class="d">${n}</span></button>`).join('')}</div>
    <select onchange="UI.not.tema=this.value;App.pintar()" aria-label="Tema"><option value="">Todos los temas</option>${temas.map(t => `<option value="${esc(t)}" ${u.tema === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <select onchange="UI.not.tipo=this.value;App.pintar()" aria-label="Tipo"><option value="">Noticias e investigaciones</option><option value="noticia" ${u.tipo === 'noticia' ? 'selected' : ''}>Noticias</option><option value="investigacion" ${u.tipo === 'investigacion' ? 'selected' : ''}>Investigaciones</option></select>
    ${campoBuscar('not', 'nBuscar', 'Buscar…')}</div>`;
  if (!total) return enc + `<div class="panel">${vacio('Sin noticias todavía', Noticias.conectado()
    ? 'Pide a Claude una búsqueda (instrucciones en docs/NOTICIAS_CLAUDE.md) y pulsa «Actualizar desde nova-datos».'
    : 'Conecta tu repositorio privado nova-datos en Ajustes → Sincronización; ahí Claude guardará las noticias que le pidas. También puedes importar archivos .json.')}</div>`;
  const l = Noticias.visibles();
  if (!l.some(n => n.id === u.id)) u.id = l.length ? l[0].id : null;
  let ant = '', lista = '';
  for (const n of l) {
    const g = grupoDia(n.fecha); if (g !== ant) { ant = g; lista += `<div class="gr">${esc(g)}</div>`; }
    lista += `<div class="it ${n.id === u.id ? 'on' : ''} ${n.leida ? 'leida' : ''}" onclick="Noticias.abrir('${n.id}')"><i class="pt" style="background:${n.leida ? 'transparent' : 'var(--ac)'}"></i><div><b>${esc(n.titulo)}</b>
      <span>${punRel(n.relevancia)} ${esc(n.tema)} · ${n.tipo === 'investigacion' ? 'Investigación' : 'Noticia'}${Noticias.fuentes(n)[0] ? ' · ' + esc(Noticias.fuentes(n)[0].medio) : ''} · ${esc(n.fecha.slice(11))}${n.guardada ? ' · ★' : ''}</span></div></div>`;
  }
  const n = por('noticias', u.id), fu = n ? Noticias.fuentes(n) : [];
  const lectura = !n ? vacio('Nada que mostrar', u.f === 'sinleer' ? 'Ya leíste todo. Revisa «Todas» o «Guardadas».' : 'No hay noticias con estos filtros.') : `
    <div class="meta"><span class="chip rel-${esc(n.relevancia)}">Relevancia ${esc(n.relevancia)}</span><span>${esc(n.tema)} · ${n.tipo === 'investigacion' ? 'Investigación' : 'Noticia'}</span><span>${esc(fFecha(n.fecha.slice(0, 10)))} ${esc(n.fecha.slice(11))}</span></div>
    <div class="acc"><button class="btn" onclick="Noticias.leida('${n.id}')">${n.leida ? 'Marcar no leída' : '✓ Marcar leída'}</button><button class="btn" onclick="Noticias.guardada('${n.id}')">${n.guardada ? '★ Guardada' : '☆ Guardar'}</button>
      <button class="btn" onclick="Noticias.crearNota('${n.id}')">Crear nota</button><button class="btn" onclick="Noticias.crearActividad('${n.id}')">Crear actividad</button><button class="btn peligro" onclick="Noticias.borrar('${n.id}')">Eliminar</button></div>
    <h2>${esc(n.titulo)}</h2>
    <div class="meta">${n.consulta ? `Búsqueda: «${esc(n.consulta)}» · ` : ''}${fu.length} fuente(s)${n.etiquetas ? ' · ' + n.etiquetas.split(',').map(e => `<span class="chip">${esc(e.trim())}</span>`).join(' ') : ''}</div>
    ${n.resumen ? `<p class="res">${esc(n.resumen)}</p>` : ''}
    ${n.puntos ? `<b>Puntos clave</b><ul class="pt2">${n.puntos.split('\n').map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${fu.length ? `<div class="fu"><b>Fuentes</b> <span class="d">(se abren en una pestaña nueva)</span>${fu.map(f => f.url ? `<a href="${esc(urlSegura(f.url))}" target="_blank" rel="noopener noreferrer">${esc([f.medio, f.titulo].filter(Boolean).join(' — ') || f.url)} ↗</a>` : `<span class="d" style="display:block;padding:5px 0">${esc([f.medio, f.titulo].filter(Boolean).join(' — '))}</span>`).join('')}</div>` : ''}
    <p class="d" style="margin-top:16px">${n.archivo ? 'Guardada por Claude en tu repositorio privado nova-datos.' : 'Importada desde archivo.'} Verifica en las fuentes antes de actuar.</p>`;
  return enc + barra + `<div class="nw2"><div class="izq">${lista || `<div style="padding:16px">${vacio('Sin resultados', 'Cambia los filtros.')}</div>`}</div><div class="der">${lectura}</div></div>`;
};
