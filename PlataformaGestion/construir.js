// Une src/estilos.css y src/*.js en un solo archivo: PlataformaGestion.html
// Uso:  node construir.js
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, 'src');
const css = fs.readFileSync(path.join(src, 'estilos.css'), 'utf8');
const js = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort()
  .map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
if (/<\/script/i.test(js)) throw new Error('El código contiene "</script>": sepáralo como "<\\/script>"');
const html = fs.readFileSync(path.join(src, 'plantilla.html'), 'utf8').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.writeFileSync(path.join(__dirname, 'PlataformaGestion.html'), html);
// Versión para pegar en una Web Template de Power Pages: {% raw %} evita que Liquid interprete el código
if (/\{%\s*endraw/.test(html)) throw new Error('El código contiene "{% endraw %}"');
fs.writeFileSync(path.join(__dirname, 'PowerPages-WebTemplate.html'), '{% raw %}\n' + html + '\n{% endraw %}\n');
console.log('PlataformaGestion.html generado:', (html.length / 1024).toFixed(0), 'KB');
