# Lector de PDF incrustado (terceros)

Se **incrustan** en `PlataformaGestion.html` al ejecutar `node construir.js`; no se descargan de ningún CDN.

| Archivo | Origen | Versión | Licencia |
|---|---|---|---|
| `pdf.min.mjs` | [pdf.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist/build`) | 5.4.624 | Apache-2.0 |
| `pdf.worker.min.mjs` | pdf.js (`pdfjs-dist/build`) | 5.4.624 | Apache-2.0 |

- Licencia: `LICENSE-pdfjs.txt`. Integridad: `HUELLAS.txt` (SHA-256), verificada por `seguridad.js` en cada construcción.
- Uso en la plataforma: sólo extracción de texto. Se abre con `isEvalSupported: false`, sin fuentes del sistema ni descargas; el motor corre en la misma página porque, al abrir la plataforma como archivo local, el navegador no permite su proceso aparte. La política de seguridad de la página impide cualquier conexión.
- Actualizar: descargar la versión nueva, revisarla, reemplazar, actualizar `HUELLAS.txt` y ejecutar `node pruebas/cronogramas.js` y `node pruebas/ataque.js`.
