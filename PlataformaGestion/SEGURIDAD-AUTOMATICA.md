# Validación automática de seguridad

> Generado por `seguridad.js` en cada construcción. No editar a mano.
> Fecha: 2026-11-13 04:35 UTC · Resultado: **APTO**

## Comprobaciones
| Resultado | Comprobación | Detalle |
|---|---|---|
| ✅ Correcto | Sin recursos ni conexiones externas (scripts, estilos, fuentes, imágenes, peticiones) | `Sin coincidencias` |
| ✅ Correcto | CSP presente y sin orígenes externos | `default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'unsafe-inline'; img-src blob: data:; connect-src data: blob: https://api.github.com; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src blob:; base-uri 'none'; form-action 'none'` |
| ✅ Correcto | fetch() sólo en el módulo de sincronización, hacia api.github.com | `Sin coincidencias` |
| ✅ Correcto | Sincronización: repositorio privado obligatorio, cifrado, token fuera del estado y sin credenciales del navegador | `Sin coincidencias` |
| ✅ Correcto | Librerías de terceros sin alterar (huella SHA-256) | `tesseract.min.js · worker.min.js · tesseract-core-lstm.wasm.js · spa.traineddata.gz` |
| ✅ Correcto | Sin eval, new Function, document.write ni temporizadores con texto | `Sin coincidencias` |
| ✅ Correcto | Sin claves, tokens ni contraseñas en el código | `Sin coincidencias` |
| ✅ Correcto | Todo enlace en pestaña nueva usa rel="noopener noreferrer" | `Sin coincidencias` |
| ✅ Correcto | Las direcciones del usuario pasan por urlSegura() | `Sin coincidencias` |
| ✅ Correcto | Controles de seguridad presentes | `saneamiento de respaldos y datos guardados · filtro de direcciones · validación de imágenes del respaldo · neutralización de fórmulas al exportar CSV · enrutador protegido · derivación de clave · cifrado de notas privadas` |
| ✅ Correcto | Textos del usuario escapados con esc() al mostrarse | `Sin coincidencias` |
| ✅ Correcto | Sin console.log de depuración | `Sin coincidencias` |
| ✅ Correcto | Tamaño razonable: código propio < 1 MB y archivo total < 15 MB | `código propio 269 KB · total 6.9 MB (incluye el lector de imágenes)` |

## Inventario de direcciones externas que aparecen en el código
Sólo https://api.github.com se usa para conexiones, y únicamente si el usuario activa la sincronización. Las demás son texto: enlaces de ejemplo que sólo se abren con clic, o identificadores.

| Dirección | Uso |
|---|---|
| `https://api.github.com;` | **Conexión real**: sincronización cifrada con el repositorio privado del usuario (opcional) |
| `https://outlook.office.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://app.powerbi.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://api.github.com` | **Conexión real**: sincronización cifrada con el repositorio privado del usuario (opcional) |
| `https://teams.microsoft.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://www.office.com/launch/sharepoint` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://make.powerautomate.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://github.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://portal.azure.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://www.udgvirtual.udg.mx` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `http://www.w3.org/2000/svg` | Identificador del formato SVG (no es una conexión) |

**Dependencias de terceros:** Tesseract.js 5.1.1 (Apache-2.0) y el modelo de idioma español, **incrustados** en el archivo y verificados por huella SHA-256. No se descargan de ningún CDN; no hay nada más que empaquetar. La sincronización usa la API de GitHub como servicio, no como código.
