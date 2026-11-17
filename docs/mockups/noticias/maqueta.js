// Maqueta de la pantalla Noticias / Investigación (sólo para validar el diseño; datos de ejemplo)
const { chromium } = require('playwright'); const path = require('path'), D = __dirname;
const MOCK = () => {
  const N = [
    { id: 'n1', tipo: 'Noticia', tema: 'Seguridad', rel: 'alta', fecha: '2026-11-17T08:10', leida: false, guardada: false, consulta: 'phishing México bancos',
      titulo: 'Campaña de phishing suplanta avisos de paquetería para robar datos bancarios', medio: 'Fuente de ejemplo A', fuentes: 3,
      resumen: 'Mensajes SMS y correos con enlaces a sitios falsos de rastreo de paquetes piden un pago pequeño para liberar un envío y capturan los datos de la tarjeta.',
      puntos: ['Usa dominios recién registrados que imitan a empresas de mensajería.', 'El pago solicitado es bajo (menos de 50 pesos) para no levantar sospechas.', 'Recomendación: no pagar desde enlaces; verificar el número de guía en el sitio oficial.'],
      etiquetas: ['phishing', 'fraude', 'banca'] },
    { id: 'n2', tipo: 'Noticia', tema: 'Seguridad', rel: 'alta', fecha: '2026-11-17T07:40', leida: false, guardada: true, consulta: 'vulnerabilidad navegador',
      titulo: 'Actualización urgente de navegadores corrige una falla explotada activamente', medio: 'Fuente de ejemplo B', fuentes: 2,
      resumen: 'Los principales navegadores publicaron una actualización que corrige una vulnerabilidad de ejecución de código.', puntos: ['Actualizar y reiniciar el navegador.'], etiquetas: ['navegador', 'parche'] },
    { id: 'n3', tipo: 'Investigación', tema: 'Power Platform', rel: 'media', fecha: '2026-11-16T19:05', leida: false, guardada: false, consulta: 'Power Pages permisos de tabla buenas prácticas',
      titulo: 'Buenas prácticas de permisos de tabla en Power Pages (resumen de investigación)', medio: 'Investigación con Claude', fuentes: 6,
      resumen: 'Síntesis de documentación y artículos sobre alcances mínimos, Web API y roles web.', puntos: ['Alcance Contacto/Cuenta antes que Global.', 'Lista explícita de campos en Web API.'], etiquetas: ['power pages', 'permisos'] },
    { id: 'n4', tipo: 'Noticia', tema: 'IA', rel: 'media', fecha: '2026-11-16T12:30', leida: true, guardada: false, consulta: 'agentes IA empresas',
      titulo: 'Empresas adoptan agentes de IA para tareas administrativas internas', medio: 'Fuente de ejemplo C', fuentes: 1, resumen: 'Resumen breve.', puntos: [], etiquetas: ['ia'] },
    { id: 'n5', tipo: 'Noticia', tema: 'Seguridad', rel: 'baja', fecha: '2026-11-15T09:00', leida: true, guardada: false, consulta: 'contraseñas',
      titulo: 'Guía: cómo activar llaves de acceso (passkeys) en tus cuentas principales', medio: 'Fuente de ejemplo D', fuentes: 2, resumen: 'Resumen breve.', puntos: [], etiquetas: ['contraseñas'] }
  ];
  const sel = 'n1', hoy = '2026-11-17';
  const grupo = f => f.slice(0, 10) === hoy ? 'Hoy' : f.slice(0, 10) === '2026-11-16' ? 'Ayer' : 'Sáb 15 nov';
  const relC = { alta: 'var(--bad)', media: 'var(--warn)', baja: 'var(--mut)' };
  App.NAV.splice(App.NAV.indexOf(null), 0, ['noticias', 'Noticias']);
  const cont0 = App.contadores.bind(App); App.contadores = () => ({ ...cont0(), noticias: 3 });
  const css = document.createElement('style'); css.textContent = `
    .nw2{display:grid;grid-template-columns:400px minmax(0,1fr);background:var(--sup);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;height:calc(100vh - 190px)}
    .nw2 .izq{border-right:1px solid var(--bd);overflow:auto}
    .nw2 .gr{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);padding:10px 14px 6px;background:var(--bg);border-bottom:1px solid var(--bd)}
    .nw2 .it{display:grid;grid-template-columns:8px minmax(0,1fr);gap:10px;padding:10px 14px;border-bottom:1px solid var(--bd);cursor:pointer}
    .nw2 .it.on{background:var(--ac-s)} .nw2 .it .pt{width:8px;height:8px;border-radius:50%;margin-top:6px}
    .nw2 .it b{display:block;font-weight:600;line-height:1.3} .nw2 .it.leida b{font-weight:400;color:var(--mut)}
    .nw2 .it span{display:block;font-size:12px;color:var(--mut);margin-top:3px}
    .nw2 .der{overflow:auto;padding:18px 26px} .nw2 h2{font-size:21px;line-height:1.3;margin:6px 0 8px}
    .nw2 .meta{font-size:12.5px;color:var(--mut);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .nw2 .res{font-size:15px;line-height:1.6;margin:14px 0} .nw2 ul.pt2{margin:0 0 14px 18px;line-height:1.6}
    .nw2 .fu{border-top:1px solid var(--bd);padding-top:10px;margin-top:6px} .nw2 .fu a{display:block;padding:5px 0;font-size:13.5px}
    .chip{display:inline-block;font-size:11.5px;padding:1px 8px;border-radius:10px;background:var(--hover);color:var(--mut)}`;
  document.head.appendChild(css);
  Vistas.noticias = () => {
    let ant = '', lista = '';
    for (const n of N) { const g = grupo(n.fecha); if (g !== ant) { ant = g; lista += `<div class="gr">${g}</div>`; }
      lista += `<div class="it ${n.id === sel ? 'on' : ''} ${n.leida ? 'leida' : ''}"><i class="pt" style="background:${n.leida ? 'transparent' : 'var(--ac)'}"></i><div><b>${n.titulo}</b><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${relC[n.rel]}"></i> ${n.tema} · ${n.tipo} · ${n.medio} · ${n.fecha.slice(11)}${n.guardada ? ' · ★' : ''}</span></div></div>`; }
    const n = N[0];
    return `${cab('Noticias e investigación', '5 elementos · 3 sin leer · última actualización hoy 08:12', '<button class="btn">Actualizar desde GitHub</button><button class="btn">Temas y palabras clave</button>')}
    <div class="barra">${'<div class="fil"><button class="on">Sin leer 3</button><button>Todas 5</button><button>Guardadas 1</button></div>'}
      <select><option>Todos los temas</option></select><select><option>Noticias e investigaciones</option></select><input type="text" placeholder="Buscar…" style="width:200px"></div>
    <div class="nw2"><div class="izq">${lista}</div><div class="der">
      <div class="meta"><span class="chip" style="background:color-mix(in srgb,var(--bad) 14%,transparent);color:var(--bad)">Relevancia alta</span><span>${n.tema} · ${n.tipo}</span><span>Hoy 08:10</span><span class="esp"></span>
        <button class="btn">✓ Marcar leída</button><button class="btn">☆ Guardar</button><button class="btn">Crear nota</button><button class="btn">Crear actividad</button><button class="btn peligro">Eliminar</button></div>
      <h2>${n.titulo}</h2>
      <div class="meta">Búsqueda: «${n.consulta}» · ${n.fuentes} fuentes · ${n.etiquetas.map(e => `<span class="chip">${e}</span>`).join(' ')}</div>
      <p class="res">${n.resumen}</p><b>Puntos clave</b><ul class="pt2">${n.puntos.map(p => `<li>${p}</li>`).join('')}</ul>
      <div class="fu"><b>Fuentes</b> <span class="d">(se abren en una pestaña nueva)</span>
        <a>Fuente de ejemplo A — Alerta sobre mensajes falsos de paquetería ↗</a><a>Fuente de ejemplo B — Cómo identificar sitios de rastreo falsos ↗</a><a>Fuente de ejemplo C — Reporte mensual de fraudes ↗</a></div>
      <p class="d" style="margin-top:16px">Texto generado por una búsqueda con Claude y guardado en tu repositorio privado <b>nova-datos</b>. Verifica en las fuentes antes de actuar.</p></div></div>`;
  };
  // Bloque de Inicio
  WIDGETS.noticias = 'Noticias sin leer';
  Ini.noticias = () => ({ t: 'Noticias sin leer', n: 3, ir: 'noticias', extra: '<button class="lnk">Actualizar</button>',
    h: `<ul class="filas">${N.filter(x => !x.leida).map(x => `<li><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${relC[x.rel]};margin-right:6px"></i><span class="x clic">${x.titulo}</span><span class="m">${x.tema}</span><span class="m">${x.fecha.slice(11)}</span></li>`).join('')}</ul>` });
  S.ajustes.inicio.splice(3, 0, { id: 'noticias', on: true, ancho: 3, filas: 5 });
  S.ajustes.inicio.find(w => w.id === 'frase').on = false;
};
(async () => {
  const b = await chromium.launch();
  for (const [nom, vp, ruta] of [['noticias', { width: 1440, height: 900 }, 'noticias'], ['inicio', { width: 1440, height: 900 }, 'inicio'], ['noticias-tableta', { width: 820, height: 1180 }, 'noticias']]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 }), p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
    await p.clock.install({ time: new Date(2026, 10, 17, 8, 30) });
    await p.goto('file:///home/user/NovaOrganizacion/PlataformaGestion/PlataformaGestion.html'); await p.waitForSelector('.cab');
    await p.evaluate(() => Datos.demo()); await p.click('#confirma .btn.peligro'); await p.waitForTimeout(500);
    await p.evaluate(MOCK); await p.evaluate(r => { location.hash = '#/' + r; App.ruta(); }, ruta); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D, `maqueta-${nom}.png`) }); console.log(nom, err); await ctx.close();
  }
  await b.close(); })();
