# Nova Organización — reglas de trabajo para este repositorio

## Contexto
- Aplicación personal en un solo HTML (`PlataformaGestion/PlataformaGestion.html`), JavaScript puro, sin dependencias.
- Código fuente en `PlataformaGestion/src/`; se une con `node construir.js` (dentro de `PlataformaGestion/`).
- Se publica en GitHub Pages desde la rama de trabajo y está prevista para Power Pages.
- Documentación: `docs/DESARROLLO.md` (técnica), `docs/SEGURIDAD.md` (reporte de seguridad), `PlataformaGestion/LEEME.md` (uso).
- Responder al usuario en español de México. Interfaz basada en listas (no tarjetas ni Kanban), minimalista, identidad Nova.

## Regla obligatoria: validación de seguridad en cada versión
Antes de entregar o subir cualquier cambio al código de la aplicación:

1. **Construir**: `cd PlataformaGestion && node construir.js`. Ejecuta `seguridad.js`; si reporta "NO APTO", corregir antes de continuar. No desactivar ni relajar reglas para que pase.
2. **Pasada adversarial**: `node pruebas/ataque.js` (Playwright); si el cambio toca el lector de fotos, también `node pruebas/lector-fotos.js`; si toca Escuela o cronogramas, `node pruebas/cronogramas.js`; si toca Noticias o la sincronización, `node pruebas/noticias.js` y `node pruebas/sincronizacion.js`; si toca filtros o ámbitos, `node pruebas/ambitos.js`. Todos los resultados deben quedar vacíos o en `false`. Si se agregan campos, pantallas o formatos de importación, agregar su caso de ataque.
3. **Revisión manual** con la skill `web-security-review` sobre los archivos modificados (y `power-pages-security-review` cuando el cambio toque Power Pages).
4. **Reporte**: actualizar `docs/SEGURIDAD.md` con hallazgos, correcciones y recomendaciones. El reporte siempre incluye la sección de **conexiones externas** (qué direcciones aparecen, si se cargan solas y si deben descargarse/empaquetarse o mantenerse).
5. **Criterio**: hallazgos críticos y de riesgo (altos/medios) se corrigen en la misma entrega. Los opcionales se listan como recomendaciones para que el usuario decida.

## Controles que no deben retirarse
- `esc()` en todo texto del usuario que se inserta en la página; `urlSegura()` en toda dirección.
- `sanear()` sobre cualquier dato que venga de un archivo o del almacenamiento. Todo campo nuevo debe registrarse en `CAMPO` (`05-ajustes-datos.js`) según su tipo (id, número, color, fecha, hora, casilla).
- Identificadores generados con `uid()`; nunca tomar un identificador de un archivo sin validarlo.
- CSP de `src/plantilla.html`: la **única** conexión externa permitida es `https://api.github.com` (sincronización cifrada, autorizada por el usuario el 2026-11-12). No agregar ningún otro origen sin autorización expresa del usuario. Si alguna función necesita una librería, se incrusta en el archivo, no se carga de un CDN.
- Sincronización (`src/055-sincronizacion.js`): sólo repositorios privados; todo lo que se envía va cifrado (AES-GCM); el token y la clave viven únicamente en el registro `sync` de IndexedDB, nunca en `S`, respaldos, exportaciones ni registros de consola; lo recibido pasa siempre por `fusionar()`/`sanear()`; `fetch()` sólo en ese módulo.
- Lector de fotos (`src/057-lector-fotos.js`): las librerías de `terceros/tesseract/` se incrustan y se verifican por SHA-256 (`HUELLAS.txt`); nunca cargarlas de un CDN. Su proceso arranca con el guardián que bloquea la red. La CSP sólo admite `'wasm-unsafe-eval'` y `blob:` para el lector; nunca `'unsafe-eval'`. El texto reconocido es dato no confiable: escapado y validado con `leer_eventos`. El modo de página predeterminado es 6 (con él se calibró la lectura de agendas); las notas usan `Ocr.leerMejor()`. Las correcciones aprendidas (`Correcciones`) se aplican como texto literal escapado, nunca como expresión regular. Pruebas: `node pruebas/lector-fotos.js`.
- Cronogramas en PDF (`src/059-cronogramas.js`): pdf.js de `terceros/pdfjs/` se incrusta y se verifica por SHA-256 (`HUELLAS.txt`); nunca de un CDN. Abrir siempre con `isEvalSupported: false`, `enableXfa: false`, `disableFontFace: true`; validar firma `%PDF-`, tamaño, páginas y filas. El texto del PDF es dato no confiable: escapado y validado al guardar como la carga masiva. «Nuevo semestre» manda todo a la papelera.
- Noticias (`src/056-noticias.js`): sus peticiones pasan por `Sync._gh` (nunca `fetch` propio). Todo archivo de `noticias/` es dato no confiable: pasa por `Noticias.validar()`, se escapa y sólo se enlazan direcciones `https`. Sólo se borran rutas `noticias/<nombre>.json` con su identificador exacto. La sincronización compara `datos.json` y relee la rama antes de moverla para no perder archivos agregados por Claude. Formato: `docs/NOTICIAS_CLAUDE.md`.
- Sin `eval`, `new Function`, `document.write`, ni secretos en el código propio.
- Notas privadas: AES-GCM + PBKDF2; no guardar la contraseña ni la clave.

## Otras convenciones
- **Ámbitos** (macro categorías): todo registro nuevo con datos debe tener ámbito (`Amb.de()`), respetar el filtro global (`Amb.ok()`) y mostrar `Amb.barra()` en su pantalla. Trabajo por omisión. Los ámbitos nuevos sólo se crean en Ajustes → Catálogos (`S.ambitos`, máx. 12, formato `AMB_NOMBRE`); nunca desde formularios ni cargas.
- Todo acceso a datos pasa por el objeto `DB` (`01-nucleo.js`).
- Cada pantalla con datos tiene carga masiva (`LAYOUTS` + `Datos.leer_<clave>`) y plantilla de ejemplo.
- Los cambios de estatus se registran con `regEstatus()`.
- **Eliminar = enviar a la papelera** (`quitar()` o `Papelera.mover()` en `src/058-papelera.js`), donde dura 7 días. No borrar registros ni imágenes directamente. Un tipo de registro nuevo debe agregarse a `Papelera.TIPOS` (y sus vínculos a `Papelera.VINCULOS`); si se elimina con registros relacionados, pasarlos en `rel`/`des` para poder restaurarlos. Pruebas: `node pruebas/papelera.js`.
- No presentar como probado lo que no se ejecutó.
