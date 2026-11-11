// Genera las imágenes conceptuales (PNG) a partir de mockups.html
// Uso: node render.js <ruta a lucide-static/icons>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const iconsDir = process.argv[2];
const src = fs.readFileSync(path.join(__dirname, 'mockups.html'), 'utf8');
const names = [...new Set([...src.matchAll(/ic\('([a-z0-9-]+)'/g)].map(m => m[1])
  .concat(['circle', 'sun','folder-kanban','list-checks','calendar-days','flame','lightbulb','cake','settings',
    'sliders-horizontal','layout-dashboard','tags','palette','video','arrow-down-up','shield-check',
    'file-json','file-spreadsheet','calendar','file-text','bell','message-square','users','phone','sparkles','plus']))];
const icons = {};
const missing = [];
for (const n of names) {
  const f = path.join(iconsDir, n + '.svg');
  if (fs.existsSync(f)) icons[n] = fs.readFileSync(f, 'utf8').replace(/<!--.*?-->/gs, '').replace(/\s+/g, ' ').trim();
  else missing.push(n);
}
if (missing.length) console.warn('Íconos faltantes:', missing.join(', '));
const out = path.join(__dirname, 'mockups.built.html');
fs.writeFileSync(out, src.replace('/*ICONS*/{}', JSON.stringify(icons)));

const screens = [
  ['01-hoy', 'hoy'], ['02-proyectos-kanban', 'proyectos'], ['03-detalle-proyecto-bitacora', 'detalle'],
  ['04-tareas', 'tareas'], ['05-agenda-semana', 'agenda'], ['06-carga-de-trabajo', 'carga'],
  ['07-notas-e-ideas', 'notas'], ['08-cumpleanos', 'cumple'], ['09-ajustes-importar-exportar', 'ajustes'],
  ['10-pestana-teams', 'teams'], ['11-movil', 'movil'],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const dest = path.join(__dirname, '..');
  for (const [file, hash] of screens) {
    await page.goto('file://' + out + '#' + hash);
    await page.reload();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(dest, file + '.png') });
    console.log('✓', file);
  }
  await browser.close();
})();
