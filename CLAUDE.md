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
2. **Pasada adversarial**: `node pruebas/ataque.js` (Playwright). Todos los resultados deben quedar vacíos o en `false`. Si se agregan campos, pantallas o formatos de importación, agregar su caso de ataque.
3. **Revisión manual** con la skill `web-security-review` sobre los archivos modificados (y `power-pages-security-review` cuando el cambio toque Power Pages).
4. **Reporte**: actualizar `docs/SEGURIDAD.md` con hallazgos, correcciones y recomendaciones. El reporte siempre incluye la sección de **conexiones externas** (qué direcciones aparecen, si se cargan solas y si deben descargarse/empaquetarse o mantenerse).
5. **Criterio**: hallazgos críticos y de riesgo (altos/medios) se corrigen en la misma entrega. Los opcionales se listan como recomendaciones para que el usuario decida.

## Controles que no deben retirarse
- `esc()` en todo texto del usuario que se inserta en la página; `urlSegura()` en toda dirección.
- `sanear()` sobre cualquier dato que venga de un archivo o del almacenamiento. Todo campo nuevo debe registrarse en `CAMPO` (`05-ajustes-datos.js`) según su tipo (id, número, color, fecha, hora, casilla).
- Identificadores generados con `uid()`; nunca tomar un identificador de un archivo sin validarlo.
- CSP de `src/plantilla.html`: la **única** conexión externa permitida es `https://api.github.com` (sincronización cifrada, autorizada por el usuario el 2026-11-12). No agregar ningún otro origen sin autorización expresa del usuario. Si alguna función necesita una librería, se incrusta en el archivo, no se carga de un CDN.
- Sincronización (`src/055-sincronizacion.js`): sólo repositorios privados; todo lo que se envía va cifrado (AES-GCM); el token y la clave viven únicamente en el registro `sync` de IndexedDB, nunca en `S`, respaldos, exportaciones ni registros de consola; lo recibido pasa siempre por `fusionar()`/`sanear()`; `fetch()` sólo en ese módulo.
- Sin `eval`, `new Function`, `document.write`, ni secretos en el código.
- Notas privadas: AES-GCM + PBKDF2; no guardar la contraseña ni la clave.

## Otras convenciones
- Todo acceso a datos pasa por el objeto `DB` (`01-nucleo.js`).
- Cada pantalla con datos tiene carga masiva (`LAYOUTS` + `Datos.leer_<clave>`) y plantilla de ejemplo.
- Los cambios de estatus se registran con `regEstatus()`.
- No presentar como probado lo que no se ejecutó.
