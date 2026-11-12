'use strict';
/* ==========================================================================
   SINCRONIZACIÓN CON UN REPOSITORIO PRIVADO DE GITHUB
   --------------------------------------------------------------------------
   - Única conexión externa de la plataforma: https://api.github.com
   - Los datos y las imágenes se CIFRAN en el navegador (AES-GCM) con una clave derivada
     de la contraseña de sincronización; GitHub sólo recibe contenido ilegible.
   - El token y la clave se guardan sólo en este navegador (IndexedDB, registro "sync");
     nunca entran al estado S, a los respaldos ni a las exportaciones.
   - Cada sincronización reemplaza el contenido del repositorio por una sola versión
     (un commit sin historial), para que el repositorio no crezca sin límite.
   ========================================================================== */
const Sync = {
  API: 'https://api.github.com',
  cfg: null,            // { owner, repo, token, clave, sal, iter, commit, sucio, ultima }
  estado: 'apagado',    // apagado | aldia | pendiente | trabajando | conflicto | error
  detalle: '', _t: null, _tCfg: null, _silencio: false, _ocupado: false, _previo: null,

  activo() { return !!(this.cfg && this.cfg.token && this.cfg.clave); },
  texto() {
    return { apagado: 'Guardado en este equipo', aldia: 'Sincronizado con GitHub', pendiente: 'Cambios por sincronizar', trabajando: 'Sincronizando…', conflicto: 'Conflicto de sincronización', error: 'Error de sincronización' }[this.estado];
  },
  _pinta() { const p = $('.lat .pie'); if (p) { p.classList.toggle('pend', !['apagado', 'aldia'].includes(this.estado)); p.lastChild.textContent = this.texto(); } },
  _pon(estado, detalle = '') { this.estado = estado; this.detalle = detalle; this._pinta(); if (App.vista === 'ajustes' && UI.aj.tab === 'sync' && !$('#modal').classList.contains('on') && !$('#syToken')) App.pintar(); },

  /* ---------- Configuración local ---------- */
  async cargar() {
    if (!DB.idb) return;
    try { this.cfg = (await DB._op('kv', 'readonly', s => s.get('sync'))) || null; } catch (e) { this.cfg = null; }
    if (this.activo()) this.estado = this.cfg.sucio ? 'pendiente' : 'aldia';
  },
  _guardarCfg() { return DB._op('kv', 'readwrite', s => this.cfg ? s.put(this.cfg, 'sync') : s.delete('sync')); },

  /* ---------- Llamadas a GitHub ---------- */
  async _gh(metodo, ruta, cuerpo) {
    const c = this.cfg;
    const r = await fetch(`${this.API}/repos/${c.owner}/${c.repo}${ruta}`, {
      method: metodo, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Authorization': 'Bearer ' + c.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    if (!r.ok) {
      const e = new Error({ 401: 'El token no es válido o ya venció.', 403: 'GitHub rechazó la operación: revisa los permisos del token (Contents: lectura y escritura) o espera unos minutos.', 404: 'No se encontró el repositorio, o el token no tiene acceso a él.', 409: 'El repositorio está vacío: créalo con un archivo README.', 422: 'GitHub rechazó los datos enviados.' }[r.status] || `GitHub respondió con el error ${r.status}.`);
      e.status = r.status; throw e;
    }
    return r.json();
  },
  /** Lee qué hay en el repositorio: rama, versión (commit), archivo de datos e imágenes. */
  async _remoto() {
    const repo = await this._gh('GET', '');
    if (repo.private !== true) throw new Error('El repositorio es público. Por seguridad, la sincronización sólo funciona con un repositorio privado.');
    const rama = String(repo.default_branch || 'main');
    const ref = await this._gh('GET', `/git/ref/heads/${encodeURIComponent(rama)}`);
    const cm = await this._gh('GET', `/git/commits/${ref.object.sha}`);
    const arbol = await this._gh('GET', `/git/trees/${cm.tree.sha}?recursive=1`);
    const m = { rama, commit: ref.object.sha, datos: null, imgs: {}, otros: [] };
    for (const e of arbol.tree || []) {
      if (e.type !== 'blob') continue;
      if (e.path === 'datos.json') m.datos = e.sha;
      else if (/^img\/[A-Za-z0-9_-]{1,64}$/.test(e.path)) m.imgs[e.path.slice(4)] = e.sha;
      else if (e.path === 'README.md') m.otros.push({ path: e.path, mode: '100644', type: 'blob', sha: e.sha });
    }
    return m;
  },
  async _leerBlob(sha) { const b = await this._gh('GET', `/git/blobs/${sha}`); return JSON.parse(new TextDecoder().decode(deB64(String(b.content).replace(/\s/g, '')))); },
  async _crearBlob(obj) { return (await this._gh('POST', '/git/blobs', { content: JSON.stringify(obj), encoding: 'utf-8' })).sha; },

  /* ---------- Cifrado ---------- */
  async _cifrar(bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.cfg.clave, bytes)) }; },
  async _descifrar(o, clave) {
    try { return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(o.iv) }, clave || this.cfg.clave, deB64(o.ct)); }
    catch (e) { throw new Error('No se pudo descifrar: la contraseña de sincronización no coincide o el archivo fue alterado.'); }
  },

  /* ---------- Subir (este equipo → GitHub) ---------- */
  async subir(forzar) {
    const m = await this._remoto();
    if (!forzar && m.commit !== this.cfg.commit && (m.datos || this.cfg.commit)) { const e = new Error('conflicto'); e.conflicto = true; throw e; }
    this.cfg.sucio = false;
    try {
      const datos = await this._crearBlob({ app: 'NovaSync', v: 1, sal: this.cfg.sal, iter: this.cfg.iter, fecha: ahoraTxt(), ...(await this._cifrar(new TextEncoder().encode(JSON.stringify(S)))) });
      const arbol = [...m.otros, { path: 'datos.json', mode: '100644', type: 'blob', sha: datos }];
      for (const [id, blob] of Img.blobs) {     // las imágenes que ya están en GitHub no se vuelven a subir
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) continue;
        const sha = m.imgs[id] || await this._crearBlob({ tipo: blob.type, ...(await this._cifrar(await blob.arrayBuffer())) });
        arbol.push({ path: 'img/' + id, mode: '100644', type: 'blob', sha });
      }
      const t = await this._gh('POST', '/git/trees', { tree: arbol });
      const c = await this._gh('POST', '/git/commits', { message: 'Nova Organización: sincronización', tree: t.sha, parents: [] });
      await this._gh('PATCH', `/git/refs/heads/${encodeURIComponent(m.rama)}`, { sha: c.sha, force: true });
      this.cfg.commit = c.sha; this.cfg.ultima = ahoraTxt();
    } catch (e) { this.cfg.sucio = true; throw e; }
    finally { await this._guardarCfg(); }
  },

  /* ---------- Traer (GitHub → este equipo) ---------- */
  async traer() {
    const m = await this._remoto();
    if (!m.datos) throw new Error('El repositorio todavía no tiene datos de Nova.');
    const f = await this._leerBlob(m.datos);
    if (!f || f.app !== 'NovaSync') throw new Error('El archivo del repositorio no es de Nova Organización.');
    if (f.sal !== this.cfg.sal) throw new Error('La contraseña de sincronización se cambió desde otro equipo. Desconecta y vuelve a conectar este equipo.');
    const estado = JSON.parse(new TextDecoder().decode(await this._descifrar(f)));
    for (const [id, sha] of Object.entries(m.imgs)) {
      if (Img.blobs.has(id)) continue;
      const j = await this._leerBlob(sha);
      if (!/^image\/(png|jpeg|gif|webp|bmp|avif|svg\+xml)$/.test(String(j.tipo))) continue;
      const blob = new Blob([await this._descifrar(j)], { type: j.tipo }); await DB.imgPoner(id, blob); Img._reg(id, blob);
    }
    for (const id of [...Img.blobs.keys()]) if (!m.imgs[id]) await Img.quitar(id);
    this._silencio = true;
    try { S = fusionar(estado); Boveda.cerrar(); await DB.escribirEstado(S); } finally { this._silencio = false; }   // fusionar() sanea lo recibido
    this.cfg.commit = m.commit; this.cfg.sucio = false; this.cfg.ultima = ahoraTxt(); await this._guardarCfg();
    aplicarTema(); if (!$('#modal').classList.contains('on')) App.pintar();
  },

  /* ---------- Ciclo automático ---------- */
  /** Se llama en cada guardar(): marca que hay cambios y programa la subida. */
  cambio() {
    if (!this.activo() || this._silencio) return;
    this.cfg.sucio = true; if (!['conflicto', 'trabajando'].includes(this.estado)) { this.estado = 'pendiente'; this._pinta(); }
    clearTimeout(this._tCfg); this._tCfg = setTimeout(() => this._guardarCfg().catch(() => {}), 1500);
    clearTimeout(this._t); this._t = setTimeout(() => this.sincronizar(), 90 * 1000);
  },
  async sincronizar(manual) {
    if (!this.activo() || this._ocupado) return;
    if (!navigator.onLine) { this._pon(this.cfg.sucio ? 'pendiente' : 'aldia', 'Sin conexión a internet.'); return; }
    this._ocupado = true; clearTimeout(this._t); this._pon('trabajando');
    try {
      const m = await this._remoto(), cambioRemoto = m.commit !== this.cfg.commit && !!m.datos;
      if (cambioRemoto && this.cfg.sucio) { this._pon('conflicto', 'Hay cambios en este equipo y también en GitHub.'); return; }
      if (cambioRemoto) await this.traer(); else if (this.cfg.sucio || !m.datos) await this.subir(false);
      this._pon(this.cfg.sucio ? 'pendiente' : 'aldia'); if (manual) toast('Sincronización completa');
    } catch (e) {
      if (e.conflicto) this._pon('conflicto', 'Hay cambios en este equipo y también en GitHub.');
      else { console.error(e); this._pon('error', e.message); if (manual) toast(e.message, 'err'); }
    } finally { this._ocupado = false; if (this.activo() && this.cfg.sucio && this.estado === 'pendiente') { clearTimeout(this._t); this._t = setTimeout(() => this.sincronizar(), 90 * 1000); } }
  },
  /** Resuelve un conflicto conservando un lado. */
  async resolver(lado) {
    if (this._ocupado) return; this._ocupado = true; this._pon('trabajando');
    try { if (lado === 'github') await this.traer(); else await this.subir(true); this._pon('aldia'); toast(lado === 'github' ? 'Se trajo la versión de GitHub' : 'Se subió la versión de este equipo'); }
    catch (e) { console.error(e); this._pon('error', e.message); toast(e.message, 'err'); }
    finally { this._ocupado = false; App.pintar(); }
  },

  /* ---------- Conectar / desconectar ---------- */
  hayDatos: () => ['proyectos', 'actividades', 'notas', 'notasPriv', 'eventos', 'recordatorios', 'cumples', 'materias', 'escolares', 'enlaces', 'frases'].some(k => S[k].length),
  async conectar(modo) {
    if (!Boveda.disponible() || !DB.idb) return toast('Este navegador no permite la sincronización (requiere HTTPS e IndexedDB).', 'err');
    const v = modo ? this._previo : { repo: $('#syRepo').value.trim(), token: $('#syToken').value.trim(), pass: $('#syPass').value, pass2: $('#syPass2').value };
    if (!v) return;
    const r = String(v.repo).replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '').match(/^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/);
    if (!r) return toast('Escribe el repositorio como usuario/nombre, por ejemplo: miusuario/nova-datos', 'err');
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,255}$/.test(v.token)) return toast('El token no tiene el formato de GitHub (empieza con github_pat_).', 'err');
    if (v.pass.length < 10) return toast('La contraseña de sincronización debe tener al menos 10 caracteres.', 'err');
    if (v.pass !== v.pass2) return toast('Las contraseñas no coinciden.', 'err');
    if (this._ocupado) return; this._ocupado = true; this._pon('trabajando');
    const anterior = this.cfg;
    try {
      this.cfg = { owner: r[1], repo: r[2], token: v.token, clave: null, sal: '', iter: Boveda.ITER, commit: '', sucio: false, ultima: '' };
      const m = await this._remoto();
      if (m.datos) {   // el repositorio ya tiene datos: la contraseña debe ser la misma con la que se cifraron
        const f = await this._leerBlob(m.datos);
        if (!f || f.app !== 'NovaSync' || typeof f.sal !== 'string') throw new Error('El archivo del repositorio no es de Nova Organización.');
        this.cfg.sal = f.sal; this.cfg.iter = Math.min(2000000, Math.max(100000, Number(f.iter) || 600000));
        this.cfg.clave = await Boveda._derivar(v.pass, deB64(f.sal), this.cfg.iter);
        try { await this._descifrar(f); } catch (e) { throw new Error('La contraseña de sincronización no es la que se usó en este repositorio.'); }
        if (this.hayDatos() && !modo) {   // hay información en ambos lados: el usuario decide
          this._previo = v; this.cfg = anterior; this._ocupado = false; this._pon(anterior ? this.estado : 'apagado'); this._elegir(); return;
        }
        if (modo === 'equipo') await this.subir(true); else await this.traer();
      } else {         // repositorio nuevo: se crea la clave y se sube lo de este equipo
        const sal = crypto.getRandomValues(new Uint8Array(16)); this.cfg.sal = b64(sal);
        this.cfg.clave = await Boveda._derivar(v.pass, sal, this.cfg.iter);
        await this.subir(true);
      }
      this._previo = null; await this._guardarCfg(); this._pon('aldia'); Modal.cerrar(); App.pintar(); toast('Sincronización activada');
    } catch (e) { console.error(e); this.cfg = anterior; this._pon(anterior ? 'error' : 'apagado', e.message); toast(e.message, 'err'); }
    finally { this._ocupado = false; }
  },
  _elegir() {
    Modal.abrir(`<div class="form"><h2>Hay información en los dos lados</h2><div class="campos" style="display:block">
      <p>Este equipo ya tiene datos y el repositorio de GitHub también. Elige cuál conservar; <b>el otro se reemplaza</b>.</p>
      <p class="d" style="margin-top:8px">Si dudas, cancela y descarga antes un respaldo en Ajustes → Datos.</p></div>
      <div class="acciones"><button class="btn" onclick="Sync._previo=null;Modal.cerrar()">Cancelar</button><span class="esp"></span>
      <button class="btn" onclick="Modal.cerrar();Sync.conectar('equipo')">Conservar lo de este equipo</button><button class="btn pri" onclick="Modal.cerrar();Sync.conectar('github')">Conservar lo de GitHub</button></div></div>`, 600);
  },
  desconectar() {
    confirmar('Este equipo dejará de sincronizarse y se borrarán de aquí el token y la clave. Tus datos locales y los de GitHub no se tocan. ¿Continuar?', async () => {
      clearTimeout(this._t); this.cfg = null; await this._guardarCfg(); this._pon('apagado'); App.pintar(); toast('Sincronización desactivada en este equipo');
    }, 'Desconectar');
  },

  /* ---------- Pantalla (Ajustes → Sincronización) ---------- */
  vista() {
    if (!this.activo()) return `
      <section class="blq"><h3>Sincronizar con un repositorio privado de GitHub</h3><div class="cu">
        <p class="d" style="margin-bottom:10px">Tus datos e imágenes se cifran en este navegador con tu contraseña antes de subirse; GitHub sólo guarda contenido ilegible. El token y la clave se quedan en este equipo.</p>
        <div class="reng"><label for="syRepo">Repositorio privado</label><input type="text" id="syRepo" placeholder="usuario/nova-datos" autocomplete="off" style="width:300px"></div>
        <div class="reng"><label for="syToken">Token de acceso</label><input type="password" id="syToken" placeholder="github_pat_…" autocomplete="off" style="width:300px"><span class="d">Sólo con permiso «Contents: Read and write» sobre ese repositorio.</span></div>
        <div class="reng"><label for="syPass">Contraseña de sincronización</label><input type="password" id="syPass" autocomplete="new-password" style="width:300px"><span class="d">Mínimo 10 caracteres. Es la misma en todos tus equipos.</span></div>
        <div class="reng"><label for="syPass2">Repetir contraseña</label><input type="password" id="syPass2" autocomplete="new-password" style="width:300px" onkeydown="if(event.key==='Enter')Sync.conectar()"></div>
        <button class="btn pri" onclick="Sync.conectar()">Conectar</button>${this.estado === 'error' ? `<span class="rojo" style="margin-left:10px">${esc(this.detalle)}</span>` : ''}</div></section>
      <section class="blq"><h3>Antes de conectar</h3><div class="cu d">
        <p>• <b>Si olvidas la contraseña de sincronización, los datos de GitHub no se pueden recuperar</b> (los de este equipo sí siguen aquí).</p>
        <p>• En el primer equipo se sube lo que tengas. En los siguientes, usa el mismo repositorio, un token y la misma contraseña.</p>
        <p>• Pasos para crear el repositorio y el token: <b>docs/SINCRONIZACION_GITHUB.md</b> en el repositorio del proyecto.</p></div></section>`;
    const c = this.cfg, color = { aldia: 'verde', pendiente: 'ambar', trabajando: 'ambar', conflicto: 'rojo', error: 'rojo' }[this.estado] || '';
    return `
      <section class="blq"><h3>Sincronización con GitHub</h3><div class="cu">
        <div class="reng"><label>Repositorio</label><b>${esc(c.owner)}/${esc(c.repo)}</b><span class="d">privado · contenido cifrado</span></div>
        <div class="reng"><label>Estado</label><b class="${color}">${esc(this.texto())}</b>${this.detalle ? `<span class="d">${esc(this.detalle)}</span>` : ''}</div>
        <div class="reng"><label>Última sincronización</label><span>${esc(c.ultima || 'Aún no')}</span></div>
        ${this.estado === 'conflicto' ? `<div class="reng"><label>Resolver conflicto</label><button class="btn" onclick="Sync.resolver('github')">Conservar lo de GitHub</button><button class="btn" onclick="Sync.resolver('equipo')">Conservar lo de este equipo</button><span class="d">El otro lado se reemplaza. Si dudas, descarga antes un respaldo.</span></div>` : ''}
        <div class="reng"><label>Acciones</label><button class="btn pri" onclick="Sync.sincronizar(true)" ${this.estado === 'trabajando' ? 'disabled' : ''}>Sincronizar ahora</button><button class="btn peligro" onclick="Sync.desconectar()">Desconectar este equipo</button></div></div></section>
      <section class="blq"><h3>Cómo funciona</h3><div class="cu d">
        <p>• Al abrir la plataforma se revisa si hay una versión más nueva en GitHub y se trae. Tus cambios se suben solos unos 90 segundos después de dejar de editar, y cada 5 minutos se vuelve a revisar.</p>
        <p>• Si editas en dos equipos sin sincronizar, aparece un <b>conflicto</b> y tú eliges qué versión conservar.</p>
        <p>• El repositorio guarda una sola versión (sin historial). Para conservar copias anteriores usa el respaldo .json.</p></div></section>`;
  }
};
