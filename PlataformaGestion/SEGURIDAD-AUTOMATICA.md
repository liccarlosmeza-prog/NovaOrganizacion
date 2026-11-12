# Validación automática de seguridad

> Generado por `seguridad.js` en cada construcción. No editar a mano.
> Fecha: 2026-11-12 22:27 UTC · Resultado: **APTO**

## Comprobaciones
| Resultado | Comprobación | Detalle |
|---|---|---|
| ✅ Correcto | Sin recursos ni conexiones externas (scripts, estilos, fuentes, imágenes, peticiones) | `Sin coincidencias` |
| ✅ Correcto | CSP presente y sin orígenes externos | `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob: data:; connect-src data: blob:; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'` |
| ✅ Correcto | Sin eval, new Function, document.write ni temporizadores con texto | `Sin coincidencias` |
| ✅ Correcto | Sin claves, tokens ni contraseñas en el código | `Sin coincidencias` |
| ✅ Correcto | Todo enlace en pestaña nueva usa rel="noopener noreferrer" | `Sin coincidencias` |
| ✅ Correcto | Las direcciones del usuario pasan por urlSegura() | `Sin coincidencias` |
| ✅ Correcto | Controles de seguridad presentes | `saneamiento de respaldos y datos guardados · filtro de direcciones · validación de imágenes del respaldo · neutralización de fórmulas al exportar CSV · enrutador protegido · derivación de clave · cifrado de notas privadas` |
| ✅ Correcto | Textos del usuario escapados con esc() al mostrarse | `Sin coincidencias` |
| ✅ Correcto | Sin console.log de depuración | `Sin coincidencias` |
| ✅ Correcto | Tamaño del archivo razonable (< 1 MB) | `200 KB` |

## Inventario de direcciones externas que aparecen en el código
Ninguna se carga automáticamente; son texto (enlaces de ejemplo que sólo se abren si el usuario hace clic, o identificadores).

| Dirección | Uso |
|---|---|
| `https://outlook.office.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://app.powerbi.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://teams.microsoft.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://www.office.com/launch/sharepoint` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://make.powerautomate.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://github.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://portal.azure.com` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `https://www.udgvirtual.udg.mx` | Enlace de ejemplo o plantilla; sólo se abre con clic del usuario |
| `http://www.w3.org/2000/svg` | Identificador del formato SVG (no es una conexión) |

**Dependencias de terceros:** ninguna (sin librerías, fuentes ni CDN). No hay nada que descargar o empaquetar.
