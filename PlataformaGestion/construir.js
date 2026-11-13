// Une src/estilos.css y src/*.js en un solo archivo: PlataformaGestion.html
// Uso:  node construir.js
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, 'src');
const css = fs.readFileSync(path.join(src, 'estilos.css'), 'utf8');
const js = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort()
  .map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
if (/<\/script/i.test(js)) throw new Error('El código contiene "</script>": sepáralo como "<\\/script>"');
// Lector de imágenes (Tesseract.js): se incrusta como texto para que no haya que descargar nada
const ter = path.join(__dirname, 'terceros', 'tesseract'), leeT = f => fs.readFileSync(path.join(ter, f), 'utf8');
const ocr = { LIB: leeT('tesseract.min.js'), WORKER: leeT('worker.min.js'), CORE: leeT('tesseract-core-lstm.wasm.js'), LANG: fs.readFileSync(path.join(ter, 'spa.traineddata.gz')).toString('base64') };
for (const [k, v] of Object.entries(ocr)) if (/<\/script|<!--/i.test(v)) throw new Error(`El archivo de terceros ${k} contiene una secuencia que rompería el HTML`);
const base = fs.readFileSync(path.join(src, 'plantilla.html'), 'utf8').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
const conOcr = lleno => base.replace('/*__OCR_LIB__*/', () => lleno ? ocr.LIB : '').replace('/*__OCR_WORKER__*/', () => lleno ? ocr.WORKER : '').replace('/*__OCR_CORE__*/', () => lleno ? ocr.CORE : '').replace('/*__OCR_LANG__*/', () => lleno ? ocr.LANG : '');
const html = conOcr(true);
fs.writeFileSync(path.join(__dirname, 'PlataformaGestion.html'), html);
// Versión para pegar en una Web Template de Power Pages: {% raw %} evita que Liquid interprete el código
if (/\{%\s*endraw/.test(html)) throw new Error('El código contiene "{% endraw %}"');
// La versión para Power Pages va SIN el lector de imágenes (las plantillas web tienen límite de tamaño)
fs.writeFileSync(path.join(__dirname, 'PowerPages-WebTemplate.html'), '{% raw %}\n' + conOcr(false) + '\n{% endraw %}\n');
console.log('PlataformaGestion.html generado:', (html.length / 1024).toFixed(0), 'KB');
// Validación de seguridad obligatoria: si falla, la construcción termina con error
require('./seguridad.js');
