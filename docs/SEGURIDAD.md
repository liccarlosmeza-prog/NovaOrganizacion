# Nova Organización — Reporte de seguridad

> Revisión del 2026-11-12 sobre la versión 0.2, hecha con la guía `web-security-review` (auditoría exhaustiva antes de publicar).
> Resultado tras las correcciones: versión **0.3**.

## 1. Veredicto

| Momento | Veredicto |
|---|---|
| Antes de corregir (v0.2) | **No apto para publicar**: 1 hallazgo crítico |
| Después de corregir (v0.3) | **Apto con observaciones**: sin hallazgos críticos, altos ni medios abiertos |

## 2. Resumen

- La aplicación **no tiene conexiones externas**: no carga librerías, fuentes ni imágenes de internet y no envía datos a ningún servidor.
- Se encontró una falla **crítica**: un archivo de respaldo manipulado podía ejecutar código al restaurarlo (9 vías confirmadas) y con ello leer todos los datos y capturar la contraseña de las notas privadas. **Corregida.**
- Se corrigieron además 6 hallazgos de menor severidad y se añadieron dos capas de defensa: una política de seguridad (CSP) que impide cualquier comunicación con otros servidores y un saneamiento de todo dato que entra desde un archivo.
- Quedan observaciones que no son fallas del código sino del modo de publicación (GitHub Pages público) y del almacenamiento local sin cifrar.

## 3. Conexiones externas

| Tipo | Resultado |
|---|---|
| Scripts, estilos, fuentes o imágenes cargados de internet | **Ninguno** |
| Peticiones a servidores (fetch, XHR, WebSocket, formularios) | **Ninguna** |
| Librerías o CDN de terceros | **Ninguna** |
| Rastreo o analítica | **Ninguno** |

**No hay nada que descargar ni empaquetar.** Todo el código está dentro del archivo.

Direcciones que aparecen como texto en el código (no se cargan solas):

| Dirección | Dónde | Qué es | Acción |
|---|---|---|---|
| outlook.office.com, teams.microsoft.com, app.powerbi.com, office.com, make.powerautomate.com, github.com, portal.azure.com, udgvirtual.udg.mx | Datos de ejemplo y plantilla de accesos | Enlaces de muestra; sólo se abren si el usuario hace clic | Se mantienen |
| `http://www.w3.org/2000/svg` | Ícono de la pestaña | Identificador del formato SVG, no es una conexión | Se mantiene |

Comprobación en ejecución: durante las pruebas se registraron todas las peticiones del navegador; no hubo ninguna fuera del propio archivo. La pantalla **Ajustes → Seguridad → Autodiagnóstico** muestra en vivo si el navegador hizo alguna conexión externa.

Nota: los HTML anteriores (AcadTrack y LinkManager) sí cargaban tipografías de Google Fonts. Esa dependencia **no** se trasladó a la plataforma.

## 4. Hallazgos

| ID | Severidad | Confianza | Dónde | Problema | Escenario de ataque | Estado |
|---|---|---|---|---|---|---|
| S-01 | **Crítico** | Confirmado (prueba ejecutada) | Restauración de respaldo; identificadores y campos numéricos insertados sin validar en la página (`02-app-proyectos.js`, `03-escuela-agenda.js`, `04-notas-accesos.js`, `05-ajustes-datos.js`) | Código ejecutable almacenado (XSS) mediante un respaldo `.json` manipulado | Alguien te envía un "respaldo"; al restaurarlo, su código se ejecuta en tu sesión, lee todos tus datos y captura la contraseña de las notas privadas cuando la escribes | **Corregido** |
| S-02 | Medio | Confirmado | `01-nucleo.js` (`Img.deDataURL`) | Un respaldo podía hacer que la app pidiera una "imagen" a un servidor externo | Sirve para confirmar que abriste el archivo y conocer tu dirección IP | **Corregido** |
| S-03 | Medio | Confirmado | `plantilla.html` | No había política de seguridad de contenido (CSP) | Sin CSP, cualquier falla de tipo S-01 podía enviar los datos fuera | **Corregido** |
| S-04 | Bajo | Confirmado | `01-nucleo.js` (`csvCelda`) | Inyección de fórmulas al exportar CSV | Un texto que empieza con `=`, `+`, `-` o `@` (por ejemplo, importado de un calendario) se ejecutaría como fórmula al abrir el CSV en Excel | **Corregido** |
| S-05 | Bajo | Confirmado | `02-app-proyectos.js` (enrutador) | Una dirección como `#/__proto__` dejaba la pantalla en blanco | Un enlace manipulado inutiliza la app hasta cambiar de dirección; no expone datos | **Corregido** |
| S-06 | Bajo | Confirmado | `06-inicio.js` (filtros recordados) | Los filtros guardados se copiaban sin validar su tipo | Un valor alterado en el almacenamiento rompía pantallas; requiere acceso previo al navegador | **Corregido** |
| S-07 | Bajo | Confirmado | `01-nucleo.js` (bóveda) | 250 000 iteraciones de PBKDF2, por debajo de la recomendación actual (600 000) | Facilita un poco adivinar la contraseña si alguien obtiene un respaldo | **Corregido** para contraseñas nuevas o cambiadas |
| S-08 | Bajo | Plausible | Carga de archivos | Sin límite de tamaño | Un archivo enorme congela la pestaña; no expone datos | **Corregido** (10 MB CSV/ICS, 400 MB respaldo, 25 MB por imagen) |
| S-09 | Informativo | Confirmado | Publicación en GitHub Pages | Todos tus sitios `liccarlosmeza-prog.github.io/...` comparten almacenamiento | Otra página tuya publicada en la misma cuenta podría leer los datos de Nova guardados en el navegador | Abierto — ver recomendación R-1 |
| S-10 | Informativo | Confirmado | GitHub Pages | No se pueden definir encabezados del servidor; la página puede incrustarse en otro sitio | Engaño visual para provocar clics; impacto bajo porque las acciones destructivas piden confirmación. Bloquearlo impediría usarla como pestaña de Teams | Aceptado — ver R-4 |
| S-11 | Informativo | Confirmado | Repositorio público | Código, documentación y capturas quedan visibles, y GitHub Pages sirve todo el repositorio | Exposición de nombres de proyectos y de la ruta local del usuario en la documentación | Abierto — ver R-2 |
| S-12 | Informativo | Confirmado | IndexedDB | Los datos (salvo notas privadas) se guardan sin cifrar | Quien use tu sesión del equipo puede leerlos | Aceptado; documentado en la app |

Hallazgos descartados tras verificarlos: los textos del usuario (títulos, notas, bitácora, etiquetas, datos de CSV e ICS) **sí se escapan** al mostrarse; los enlaces `javascript:` **se rechazan**; no hay secretos en el código ni en el historial de git; no se usa `eval`, `document.write` ni `postMessage`.

## 5. Correcciones aplicadas

| ID | Corrección |
|---|---|
| S-01 | Nueva función `sanear()`: todo dato que llega de un respaldo o del almacenamiento se normaliza antes de usarse. Los identificadores sólo admiten letras, números, guion y guion bajo; los números se convierten a número; los colores deben ser `#RRGGBB`; fechas y horas deben tener formato válido; se descartan claves como `__proto__`; los registros que no cumplen se corrigen o se eliminan. |
| S-02 | `Img.deDataURL` sólo acepta imágenes incrustadas (`data:image/...;base64`). |
| S-03 | CSP: `default-src 'none'`; sólo permite el código y estilos del propio archivo, imágenes locales (`blob:`/`data:`) y ninguna conexión de red. Además `referrer: no-referrer`. |
| S-04 | Al exportar, las celdas de texto que empiezan con `= + - @` se anteponen con `'`; al importar se retira. |
| S-05 | El enrutador sólo acepta pantallas registradas (`Object.hasOwn`). Además, si una pantalla falla por un dato dañado, se muestra un aviso en lugar de dejar la app en blanco. |
| S-06 | Sólo se restauran filtros conocidos, del mismo tipo y con caracteres simples. |
| S-07 | 600 000 iteraciones para bóvedas nuevas o al cambiar la contraseña; el número se guarda con la bóveda, así las existentes siguen abriendo. |
| S-08 | Límites de tamaño en imágenes, CSV, ICS y respaldos. |

Limitación de la CSP: la app usa manejadores en línea (`onclick="..."`), por lo que la política debe permitir `'unsafe-inline'` para scripts. La CSP impide que un posible código inyectado **envíe** datos por red, pero no impide que se ejecute; por eso la defensa principal es el saneamiento y el escapado.

## 6. Pasada adversarial (ejecutada)

Script: `PlataformaGestion/pruebas/ataque.js`. Resultado en v0.3:

| Ataque intentado | v0.2 | v0.3 |
|---|---|---|
| Respaldo con identificadores, tamaños, valores, colores y fechas que contienen código (9 vías) | 9 de 9 ejecutaron código | **0 de 9** |
| Respaldo con texto malicioso en todos los campos de texto | Bloqueado | Bloqueado |
| Enlace `javascript:` en accesos directos | Bloqueado | Bloqueado |
| "Imagen" del respaldo que apunta a un servidor externo | Se hizo la petición | **Bloqueado** |
| Direcciones `#/__proto__`, `#/constructor`, `#/toString` | Pantalla rota | **Redirige a Inicio** |
| Fórmulas en la exportación CSV | Sin neutralizar | **Neutralizadas** |
| CSV importado con HTML y `<script>` | Bloqueado | Bloqueado |
| Filtros guardados manipulados | Rompía la selección | **Ignorados** |
| Conexiones externas durante toda la sesión | 1 (por el respaldo) | **0** |

## 7. Cobertura

Archivos revisados completos:

| Archivo | Líneas (v0.2) |
|---|---|
| `src/01-nucleo.js` | 365 |
| `src/02-app-proyectos.js` | 353 |
| `src/03-escuela-agenda.js` | 281 |
| `src/04-notas-accesos.js` | 226 |
| `src/05-ajustes-datos.js` | 426 |
| `src/06-inicio.js` | 89 |
| `src/estilos.css` | 260 |
| `src/plantilla.html` | 26 |
| `construir.js` | 14 |
| `index.html` (raíz) | 14 |

Herramientas ejecutadas: búsqueda de secretos en código e historial de git (sin resultados); búsqueda de direcciones y funciones de red; conteo de sumideros (`innerHTML` 5, `eval` 0, `document.write` 0, `postMessage` 0, `window.open` 1); pruebas en Chromium con registro de peticiones de red; batería funcional completa repetida después de las correcciones (sin errores).

## 8. No verificado

- **Publicación real**: no se pudo abrir `liccarlosmeza-prog.github.io` desde el entorno de revisión; no se comprobaron sus encabezados.
- **Power Pages**: no hay sitio todavía. Al publicarla habrá que revisar permisos de página, y si Power Pages inyecta sus propios scripts, ajustar la CSP. Existe una guía específica (`power-pages-security-review`) para ese momento.
- **Otros navegadores** (Firefox, Safari).
- **Otras páginas publicadas en la misma cuenta de GitHub** (relevante para S-09).

## 9. Recomendaciones

Ninguna es crítica; están ordenadas por beneficio.

| # | Recomendación | Para qué | Esfuerzo |
|---|---|---|---|
| R-1 | No publicar otras páginas en la misma cuenta `liccarlosmeza-prog.github.io`, o usar un dominio propio sólo para Nova | Aísla el almacenamiento de la app (S-09) | Bajo |
| R-2 | Publicar sólo la carpeta de la app (mediante GitHub Actions) en lugar de todo el repositorio, y retirar de la documentación la ruta local `C:\Users\...` | Reduce lo que queda expuesto (S-11) | Bajo |
| R-3 | Usar una contraseña de 12 caracteres o más para las notas privadas y cambiarla una vez para pasar a 600 000 iteraciones | Resiste intentos de adivinarla si se filtra un respaldo | Mínimo |
| R-4 | Cuando exista sincronización, mover la app a un hospedaje que permita encabezados (Azure Static Web Apps o Power Pages) y definir `frame-ancestors` sólo para Teams | Cierra S-10 sin perder la pestaña de Teams | Medio |
| R-5 | Guardar los respaldos `.json` en una ubicación protegida (OneDrive personal con bloqueo, no en carpetas compartidas) | El respaldo contiene todo sin cifrar, salvo notas privadas | Mínimo |
| R-6 | Opción "cifrar todo el respaldo con contraseña" | Protege el archivo de respaldo completo | Medio |
| R-7 | Sustituir los manejadores en línea por eventos registrados desde el código | Permitiría una CSP sin `'unsafe-inline'` (defensa adicional) | Alto |
| R-8 | Bloqueo de toda la app con contraseña al abrirla | Protege en equipos compartidos (S-12) | Medio |
| R-9 | Aviso dentro de la app cuando pasen más de 7 días sin respaldo | Evita pérdida de información | Bajo |

## 10. Proceso recurrente

Desde esta versión, **cada construcción ejecuta la validación de seguridad** y se detiene si algo falla:

1. `node construir.js` genera el HTML y ejecuta `seguridad.js`, que revisa: conexiones externas, CSP, funciones peligrosas, secretos, enlaces, escapado de textos y presencia de los controles de seguridad. Escribe el resultado en `PlataformaGestion/SEGURIDAD-AUTOMATICA.md`.
2. `node pruebas/ataque.js` repite la pasada adversarial en un navegador real.
3. La regla está registrada en `CLAUDE.md` para que toda versión futura pase por estos dos pasos y por la revisión manual antes de entregarse.
4. Dentro de la app: **Ajustes → Seguridad → Autodiagnóstico**.

## 11. Lista de publicación

- [x] Sin secretos en código ni en historial
- [x] Sin conexiones ni dependencias externas
- [x] Textos del usuario escapados
- [x] Datos de archivos saneados antes de usarse
- [x] Enlaces limitados a http, https y mailto
- [x] CSP definida
- [x] Notas privadas con cifrado autenticado
- [x] Validación automática integrada a la construcción
- [ ] Encabezados del servidor (no disponibles en GitHub Pages)
- [ ] Aislamiento del origen de publicación (R-1)
- [ ] Revisión específica de Power Pages (cuando exista el sitio)
