# Lector de imágenes incrustado (terceros)

Estos archivos se **incrustan** en `PlataformaGestion.html` al ejecutar `node construir.js`. No se descargan de ningún CDN en tiempo de uso.

| Archivo | Origen | Versión | Licencia |
|---|---|---|---|
| `tesseract.min.js` | [tesseract.js](https://github.com/naptha/tesseract.js) (`dist/`) | 5.1.1 | Apache-2.0 |
| `worker.min.js` | tesseract.js (`dist/`) | 5.1.1 | Apache-2.0 |
| `tesseract-core-lstm.wasm.js` | [tesseract.js-core](https://github.com/naptha/tesseract.js-core) (Tesseract OCR compilado a WebAssembly, sólo motor LSTM) | 5.1.1 | Apache-2.0 |
| `spa.traineddata.gz` | `@tesseract.js-data/spa` 1.0.0, modelo `4.0.0_best_int` (datos de [tessdata](https://github.com/tesseract-ocr/tessdata_best)) | 4.0.0 | Apache-2.0 |

- Licencias: `LICENSE-tesseract.js.md` y `LICENSE-tesseract.js-core.txt`.
- **Integridad:** `HUELLAS.txt` contiene el SHA-256 de cada archivo revisado. `seguridad.js` verifica en cada construcción que lo incrustado coincida byte a byte; si no, la construcción falla.
- **Actualizar una librería:** descargar la versión nueva, revisarla, reemplazar el archivo, actualizar `HUELLAS.txt` y volver a ejecutar todas las pruebas (`pruebas/lector-fotos.js`, `pruebas/ataque.js`).
- En la plataforma, el proceso del lector arranca con un "guardián" que le entrega el idioma español y **bloquea cualquier petición de red** que intente hacer.
