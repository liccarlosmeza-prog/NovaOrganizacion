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

## 12. Revalidaciones posteriores

| Fecha | Cambio | Validación automática | Pasada adversarial | Observaciones |
|---|---|---|---|---|
| 2026-11-12 | v0.4 — carrusel de frases (campos nuevos `frases.vista` y `ajustes.fraseHoy`) | APTO | Sin ejecución de código ni conexiones externas | Los campos nuevos se registraron en el saneamiento (`vista` como fecha; `fraseHoy` se descarta si no es válido). El sorteo usa el generador aleatorio del navegador (`crypto.getRandomValues`). Sin conexiones externas nuevas. |
| 2026-11-12 | v0.5 — sincronización cifrada con repositorio privado de GitHub (`src/055-sincronizacion.js`) | APTO | Sin ejecución de código; con la sincronización apagada, 0 conexiones externas | Ver sección 13. |
| 2026-11-13 | v0.6 — «Cargar por foto» en Agenda (pegar el CSV que devuelve un asistente de IA) | APTO | El texto pegado con HTML, `<script>` y fechas inválidas no ejecuta código; filas inválidas y repetidas se omiten | Sin conexiones nuevas: la app **no** envía la foto a ningún servicio; el reconocimiento lo hace el usuario fuera de la plataforma. El texto pegado se trata como dato no confiable (límite de 300 000 caracteres, `parseCSV`, validación de fecha y hora, escapado al mostrar). |

## 13. Revisión de la sincronización con GitHub (v0.5)

### Cambio en las conexiones externas
A partir de la v0.5 existe **una** conexión externa, autorizada por el usuario el 2026-11-12:

| Dirección | Cuándo se usa | Qué viaja | Acción |
|---|---|---|---|
| `https://api.github.com` | Sólo si el usuario activa la sincronización en Ajustes | Datos e imágenes **cifrados** en el navegador, y el token en el encabezado de la petición (HTTPS) | Se mantiene como servicio en línea; no es código que se descargue, no hay nada que empaquetar |

Con la sincronización apagada la plataforma sigue sin hacer ninguna conexión (comprobado). La CSP permite únicamente ese origen; la validación automática rechaza cualquier otro y cualquier `fetch()` fuera del módulo.

### Controles aplicados
| Riesgo | Control |
|---|---|
| Que GitHub o un tercero lean los datos | Cifrado AES-GCM de 256 bits en el navegador; clave derivada con PBKDF2 (600 000 iteraciones); la contraseña no se guarda |
| Subir datos a un repositorio público por error | La plataforma consulta el repositorio y se niega si no es privado |
| Archivo alterado en el repositorio | El cifrado autenticado lo detecta: se rechaza y lo local no cambia (probado) |
| Datos recibidos con contenido malicioso | Lo recibido pasa por `fusionar()`/`sanear()`; imágenes sólo de tipos permitidos e identificadores validados |
| Respuesta que desvíe peticiones a otra ruta | Los identificadores de Git se validan como hexadecimales antes de usarse en una dirección |
| Fuga del token | Se guarda sólo en el registro `sync` de IndexedDB; no entra al estado, respaldos, exportaciones, pantalla ni consola (probado). Token de alcance mínimo: un repositorio, permiso Contents |
| Envío de credenciales del navegador | `credentials: 'omit'`, sin referente |
| Pérdida de datos por sobrescritura | Si hay cambios en ambos lados se declara conflicto y el usuario decide; nunca se sobrescribe en silencio |
| Borrar otros archivos del repositorio | Se conservan los archivos que no son de Nova |

### Hallazgos de esta revisión
| ID | Severidad | Confianza | Problema | Estado |
|---|---|---|---|---|
| S-13 | Medio | Plausible (depende de que existan otras páginas en la misma cuenta de GitHub Pages) | El token y la clave quedan en el almacenamiento del navegador, que en `*.github.io` se comparte entre todas las páginas de la cuenta | Mitigado: token de alcance mínimo, datos cifrados y aviso dentro de la app. **Requiere decisión del usuario** (R-1) |
| S-14 | Bajo | Confirmado | Al permitir `api.github.com`, la CSP ya no impide que un código inyectado envíe datos a esa dirección | Aceptado: la defensa principal sigue siendo el saneamiento y el escapado (0 de 9 vías en la pasada adversarial) |
| S-15 | Bajo | Confirmado en revisión | Los identificadores devueltos por GitHub se usaban en direcciones sin validar | **Corregido** |
| S-16 | Bajo | Confirmado en revisión | Sólo se conservaba el README; otros archivos del repositorio se habrían eliminado | **Corregido** |

### No verificado
- **Funcionamiento contra GitHub real** (creación de blobs, árboles y commits, límites de tamaño y de uso, mensajes de error reales). Las pruebas usaron un GitHub simulado.
- Comportamiento con cientos de imágenes o con datos de varios MB.
- Otras páginas publicadas en la misma cuenta de GitHub Pages (S-13).

### Recomendaciones adicionales
| # | Recomendación | Para qué |
|---|---|---|
| R-10 | Mantener la cuenta de GitHub Pages sólo para Nova, o mover la app a un dominio propio | Cierra S-13 |
| R-11 | Activar verificación en dos pasos en la cuenta de GitHub | Protege el repositorio de datos |
| R-12 | Poner vencimiento al token y renovarlo | Limita el daño si se filtra |
| R-13 | Pedir la contraseña de sincronización al abrir en lugar de recordar la clave en el equipo | Protege en equipos compartidos; a cambio, hay que escribirla cada vez |

## 14. Revisión del lector de fotos incrustado y de la clasificación de eventos (v0.7)

### Cambio en dependencias y conexiones externas
| Elemento | Antes | Ahora | Acción |
|---|---|---|---|
| Lector de imágenes (Tesseract.js 5.1.1 + núcleo WebAssembly + idioma español) | No existía | **Incrustado** en el HTML como bloques de texto (≈ 6.8 MB) | Se mantiene empaquetado; **no** se descarga de ningún CDN |
| Conexiones externas | Sólo `api.github.com` (sincronización opcional) | Sin cambios | El lector no se conecta a nada: su proceso arranca con un guardián que bloquea cualquier petición de red |
| Versión para Power Pages | — | Se genera **sin** el lector (las plantillas web tienen límite de tamaño); allí sólo queda el método de pegar texto | — |

Comprobado en ejecución: leyendo 4 fotos reales y 5 imágenes sintéticas, el navegador registró **0 conexiones externas**.

### Cambios en la política de seguridad (CSP) y su justificación
| Directiva | Valor nuevo | Por qué es necesario | Riesgo y mitigación |
|---|---|---|---|
| `script-src` | se agregan `'wasm-unsafe-eval'` y `blob:` | El motor de reconocimiento es WebAssembly (requiere compilarlo) y el código incrustado se arranca desde un *blob* local | `wasm-unsafe-eval` **no** permite `eval()` de JavaScript. `blob:` sólo carga contenido que la propia página genera; la validación automática sigue prohibiendo `eval`, `new Function` y `document.write` en el código propio |
| `worker-src` | `blob:` (antes `'none'`) | El reconocimiento corre en un proceso aparte para no congelar la página | Sólo procesos creados por la página; el guardián del proceso bloquea la red y `connect-src` sigue limitado |

### Controles nuevos
| Riesgo | Control |
|---|---|
| Librería de terceros alterada o reemplazada | Huella SHA-256 de cada archivo (`terceros/tesseract/HUELLAS.txt`); `seguridad.js` compara lo incrustado byte a byte y detiene la construcción si no coincide |
| Que la librería intente descargar modelos o código | Rutas del núcleo, del proceso y del idioma apuntan a lo incrustado; el guardián responde sólo al idioma local y rechaza cualquier otra petición |
| Texto reconocido con contenido malicioso (una foto con `<img onerror=…>` o comillas para romper campos) | Se trata como dato no confiable: se escapa al mostrarse en el borrador y pasa por `leer_eventos` (fecha, hora, repetidos). Probado: no ejecuta código |
| Archivos enormes o que no son imagen | Sólo `image/*`, máximo 25 MB por foto y 12 fotos por lectura; la imagen se redibuja en un lienzo antes de leerla |
| Fotos de notas privadas | En notas privadas sólo se guarda el texto cifrado; la foto no se conserva. Al convertir una nota con foto en privada, la foto se elimina |

### Hallazgos
| ID | Severidad | Confianza | Problema | Estado |
|---|---|---|---|---|
| S-17 | Bajo | Confirmado | `worker.min.js` (tercero) contiene `new Function`; con la CSP actual no se puede usar, y el lector funciona sin ello | Aceptado: código de tercero verificado por huella; no se habilita `unsafe-eval` |
| S-18 | Bajo | Confirmado | `script-src blob:` amplía lo que puede ejecutarse si existiera una inyección que cree *blobs* | Aceptado: la defensa principal sigue siendo el saneamiento y el escapado (pasada adversarial sin ejecución) |
| S-19 | Informativo | Confirmado | El archivo pasa de ~0.25 MB a ~7 MB | Aceptado: GitHub Pages lo admite; la primera lectura tarda unos segundos en preparar el lector |

### Pruebas ejecutadas
- `pruebas/lector-fotos.js` (imágenes sintéticas, sin datos reales): agenda de celular 4/4 eventos con fecha, hora y duración correctas; vista semanal 6/6 sin eventos de más; segunda lectura no duplica; texto malicioso en la imagen sin ejecución; nota en letra de molde con similitud 0.99; letra cursiva 0.41; nota privada cifrada sin foto; 0 conexiones; 0 errores.
- Fotos reales del usuario (no se guardan en el repositorio): celular 9/9, computadora octubre 10/10, noviembre 9/9; los eventos dudosos quedan desmarcados.
- `pruebas/ataque.js` con el caso nuevo A5d (texto reconocido malicioso en el borrador): sin ejecución; fechas y horas inválidas no se guardan.
- Baterías funcional, de frases y de sincronización: sin errores.

### Recomendaciones
| # | Recomendación |
|---|---|
| R-14 | Para notas escritas en cursiva, usar la opción de asistente de IA (Claude) o capturar el texto a mano: el lector incrustado no la reconoce bien |
| R-15 | Revisar siempre el borrador contra la foto antes de guardar; las horas de la vista semanal son estimadas por posición |

## 15. Revisión de la papelera de reciclaje (v0.8)

**Conexiones externas:** sin cambios. La papelera vive en los mismos datos de la plataforma (y viaja cifrada si la sincronización está activa). No se agregaron dependencias ni orígenes.

### Diseño
- Eliminar cualquier elemento lo mueve a `S.papelera` con: el registro, los registros que se van con él (bitácora de un proyecto, actividades de una materia) y los vínculos que se quitaron (actividades, notas y eventos que quedaron sin proyecto; enlaces sin carpeta; grupos que contenían un acceso).
- A los 7 días se borra definitivamente, incluidas sus imágenes si nadie más las usa. Se revisa al abrir la plataforma y cada hora.
- Las notas privadas pasan a la papelera **cifradas**; al restaurarlas se descifran sólo si la bóveda está abierta.

### Riesgos y controles
| Riesgo | Control |
|---|---|
| Respaldo con entradas de papelera manipuladas (tipos inventados, claves del prototipo, HTML, campos arbitrarios) | `sanearPapelera()`: sólo tipos permitidos; cada registro pasa por `sanearObjeto`; identificadores inválidos se reemplazan; vínculos sólo a campos de la lista blanca (`Papelera.VINCULOS`); títulos escapados al mostrarse |
| Fecha futura para que algo no se borre nunca | La fecha se limita al momento actual al sanear |
| Restaurar dejando referencias rotas | Se bloquea restaurar bitácora o actividades escolares sin su proyecto o materia; los vínculos a elementos inexistentes se quitan; después de restaurar se aplican las mismas validaciones que al abrir la plataforma (`fusionar`) |
| Imágenes que quedan para siempre | Al borrar definitivamente se eliminan las imágenes que ya no usa ningún otro registro |
| Datos personales que el usuario cree borrados | Los elementos permanecen hasta 7 días (comportamiento solicitado). «Borrar ya» y «Vaciar papelera» los eliminan al momento. «Borrar todos los datos» (Ajustes) sigue borrando todo, papelera incluida |

### Excepciones (borrado inmediato, intencional)
- Reemplazar una imagen (frase, encabezado o fondo): no es eliminar un elemento.
- Convertir en privada una nota con foto: la foto se borra para que no quede sin cifrar.

### Pruebas
- `pruebas/papelera.js`: proyecto con bitácora, actividades, notas y eventos (se van y vuelven ligados); materia con actividades escolares (bloquea restaurar una actividad sin su materia); acceso en un grupo; carpeta; eliminación desde formulario y selección múltiple; imagen conservada en la papelera y borrada al vaciar; foto de nota; nota privada cifrada; respaldo; pantalla; plazo de 7 días con el reloj adelantado (al día 6 sigue, al pasar el día 7 se borra). **Correcto**, sin errores.
- `pruebas/ataque.js` caso A1b (papelera manipulada): sin ejecución de código, tipos no permitidos descartados, sin fechas futuras, sin campos arbitrarios, sin contaminación del prototipo.
- Baterías funcional, de frases, sincronización y lector de fotos: sin errores.

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-13 | v0.8 — papelera de reciclaje con borrado definitivo a los 7 días | APTO | Sin ejecución de código; 0 conexiones externas |

## 16. Ajuste del lector con ejemplos del usuario y correcciones aprendidas (v0.9)

**Conexiones externas:** sin cambios (0 en todas las pruebas). No se agregaron librerías: el modelo de Tesseract es el mismo y sus huellas no cambiaron.

### Cambios
- `Ocr.leerMejor()`: prueba la foto tal cual (modo automático) y con limpieza en modo de texto disperso, y, si la foto parece de lado, girada; elige la lectura con más palabras legibles. Selector manual de orientación en «Nota desde foto».
- **Correcciones aprendidas** (`S.correcciones`, `Correcciones` en `src/058-papelera.js`): pares «el lector lee → debe decir» que se aprenden al corregir títulos en el borrador de agenda o con «Aprender de mis correcciones» en una nota, y se aplican en lecturas posteriores. Se administran en Ajustes → Lector de fotos (con carga masiva, exportación CSV y papelera).

### Riesgos y controles
| Riesgo | Control |
|---|---|
| Un texto de corrección usado como expresión regular (p. ej. `(a+)+$` o `.*`) | El texto se escapa antes de construir la búsqueda; sólo reemplaza palabras completas. Probado: sin bloqueo (< 200 ms con 5 000 caracteres) y `.*` se trata como texto literal |
| HTML en una corrección o en el texto corregido | Se guarda como texto y se escapa al mostrarse. Probado (caso A5e): sin ejecución |
| Diccionario manipulado en un respaldo | `sanear()`: sólo textos de 2 a 80 caracteres, máximo 5 000 registros, `usos` numérico |
| Comparaciones muy largas que congelen la página | El aprendizaje compara como máximo 4 000 palabras por lado y bloques de hasta 12 palabras |
| Aprender correcciones equivocadas | Sólo se aprenden pares con parecido suficiente (≥ 40 %, o ≥ 67 % en palabras de hasta 3 letras); el usuario puede editarlas o eliminarlas |

### Pruebas
- Ejemplos reales del usuario (no se guardan en el repositorio): pizarrón con marcador 58 % de palabras (71 % tras aprender las correcciones de la primera lectura); captura con fondo oscuro 0 % → 77 %; cuaderno con letra manuscrita y mensaje en pizarra: 0 % (límite del modelo, ver recomendación R-16).
- `pruebas/lector-fotos.js` (sintéticas): agenda celular 4/4, semanal 6/6, aprendizaje desde el borrador de agenda aplicado en la siguiente lectura, nota girada leída completa (orientación automática), nota con fondo oscuro completa, aprendizaje desde una nota, letra de molde 0.99, cursiva 0.61. **Correcto**.
- `pruebas/ataque.js` caso A5e: sin ejecución, sin bloqueo, comodines tratados como texto. Demás baterías sin errores.

### Recomendación
| # | Recomendación |
|---|---|
| R-16 | Para notas manuscritas en letra ligada, el lector incrustado no es suficiente. La alternativa en el navegador sería un modelo especializado (p. ej. TrOCR, decenas de MB, entrenado en inglés) que requeriría permitir su descarga o incrustarlo; no se evaluó porque el entorno de desarrollo no tiene acceso a su repositorio de modelos. Mientras tanto: escribir en letra de molde, o usar la app de Claude para transcribir la foto |

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-13 | v0.9 — lectura con varias preparaciones, orientación y correcciones aprendidas | APTO | Sin ejecución de código; 0 conexiones externas |

## 17. Revisión del lector de cronogramas en PDF y «Nuevo semestre» (v0.10)

Revisión manual con la skill `web-security-review` sobre `src/059-cronogramas.js` (nuevo, 322 líneas), `src/03-escuela-agenda.js`, `src/05-ajustes-datos.js`, `src/01-nucleo.js`, `src/plantilla.html`, `construir.js`, `seguridad.js` y `terceros/pdfjs/`.

### Conexiones externas y dependencias
| Elemento | Antes | Ahora | Acción |
|---|---|---|---|
| Lector de PDF (pdf.js / `pdfjs-dist` 5.4.624, Apache-2.0) | No existía | **Incrustado** en el HTML como bloques de texto `pdfLib` y `pdfWorker` (≈ 1.5 MB); `seguridad.js` verifica su SHA-256 contra `terceros/pdfjs/HUELLAS.txt` en cada construcción | Se mantiene empaquetado; **no** se descarga de ningún CDN |
| Conexiones externas | Sólo `api.github.com` (sincronización opcional) | **Sin cambios** | El lector de PDF no se conecta a nada; la CSP no cambió |
| Versión para Power Pages | Sin lector de fotos | También **sin** lector de PDF (límite de tamaño); el botón no aparece y queda la carga masiva por CSV | — |

Direcciones nuevas como texto: ninguna en el código propio. Dentro de pdf.js aparecen direcciones de su documentación y de mapas de caracteres que nunca se cargan (no se configuró `cMapUrl` ni `standardFontDataUrl`, y la CSP bloquearía cualquier carga). Comprobado en ejecución: leyendo los 3 cronogramas reales y 4 PDF sintéticos, **0 conexiones externas**.

### Controles
| Riesgo | Control |
|---|---|
| PDF con código (JavaScript de PDF, formularios XFA, fuentes que compilan código — CVE-2024-4367) | pdf.js ≥ 4.2.67 (corrige el CVE) con `isEvalSupported: false`, `enableXfa: false`, `disableFontFace: true`; sólo se extrae texto, no se dibuja la página. La CSP sigue sin `'unsafe-eval'` |
| Archivo que no es PDF con extensión `.pdf` | Se revisan extensión/tipo **y** la firma `%PDF-`; si falla, aviso «No se pudo leer» sin abrirlo (probado con un HTML disfrazado) |
| Archivos enormes o PDF con miles de filas (bloqueo del navegador) | Máximo 20 MB, 40 páginas, 15 PDF por carga, 20 000 textos por página, 500 caracteres por texto, 300 filas por tabla (el emparejamiento crece n×m). Probado: 2 500 filas → recortado a 300 en 27 ms con aviso |
| Texto del PDF con HTML (nombre, unidad, tipo, aviso, nombre de archivo) | Dato no confiable: en el borrador va en atributos `value` escapados con `esc()`; al guardar se escapa en lista, agenda y línea de tiempo. Probado (A5f y `pruebas/cronogramas.js`): sin ejecución |
| Datos inválidos del borrador | Al guardar se aplican las mismas reglas que la carga masiva: fecha real, inicio ≤ entrega, valor 0–100, tipo de la lista `TIPOS_ESC`, textos recortados; sin repetidos (materia + actividad + entrega). Probado: inicio posterior a la entrega no se guarda |
| Identificadores | Materias y actividades nuevas con `uid()`; nunca se toma un identificador del PDF |
| Campos nuevos (`clave` de materia; `unidad` de actividad) | `sanear()` recorta `unidad` (60) y `clave`/`ciclo` (20), corrige `tipo` fuera de la lista e inicio > entrega en datos de archivo o almacenamiento |
| «Nuevo semestre» borra calificaciones por accidente | Confirmación con resumen y botones para descargar respaldo y CSV antes; todo va a la **papelera** con `Papelera.mover()` (materia + sus actividades en `rel`), restaurable 7 días. Probado |
| Direcciones `blob:` del lector | Se liberan (`revokeObjectURL`) en cuanto el módulo carga |

### Hallazgos de esta revisión
| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| H-17.1 | Bajo | Un PDF manipulado con miles de filas hacía crecer sin límite la tabla de emparejamiento (posible bloqueo de la pestaña; sólo afecta a quien carga el archivo) | **Corregido**: tope de 300 filas por tabla y aviso |
| H-17.2 | Informativo | Las direcciones `blob:` de los módulos de pdf.js no se liberaban | **Corregido** |

Sin hallazgos críticos, altos ni medios. Barrido de secretos y funciones peligrosas en el código propio: sin coincidencias (`seguridad.js`: APTO).

### Pruebas ejecutadas
- `node pruebas/cronogramas.js` (nueva, PDF sintéticos con encabezados centrados, celdas en varios renglones, secciones y dos páginas): lectura, estatus, reimportación sin duplicados, PDF malicioso, PDF sin tablas, archivo falso, inundación de filas, «Nuevo semestre» y restauración. **Correcto**, 0 conexiones.
- `node pruebas/ataque.js`: nuevo caso **A5f** (cronograma con HTML en todos los campos y fechas invertidas): sin ejecución; demás casos sin cambios.
- `pruebas/papelera.js`: **Correcto**. `pruebas/lector-fotos.js`: **Correcto**. `pruebas/sincronizacion.js`: mismos resultados que la v0.9.
- Cronogramas reales del usuario (no se guardan en el repositorio, el repositorio es público): 3 PDF → 35 actividades, cada materia suma 100 puntos, fechas correctas, 3 vencidas marcadas como «Enviada».

### No verificado
- Cronogramas de otras plataformas o con un formato de tabla distinto: el lector avisa si no encuentra las tablas, pero no se probó con más ejemplos.
- Firefox y Safari.

### Recomendaciones
| # | Recomendación |
|---|---|
| R-17 | Al actualizar pdf.js, revisar sus avisos de seguridad, actualizar `HUELLAS.txt` y repetir `pruebas/cronogramas.js` |
| R-18 | Antes de «Nuevo semestre», descargar el respaldo: tras 7 días la papelera borra definitivamente las calificaciones del semestre anterior |

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-15 | v0.10 — cronogramas en PDF (pdf.js incrustado), «Nuevo semestre», unidad de entrega | APTO | Sin ejecución de código; 0 conexiones externas |
| 2026-11-15 | v0.10.1 — nombre de materia obligatorio y editable en la lista de materias, calendario (línea de tiempo) con filtro por estado y marcado rápido, sin hora de entrega | APTO | Caso nuevo A5g (nombre de materia con HTML, filtro de estado manipulado): sin ejecución; 0 conexiones externas |

### Ajustes v0.10.3 (tarjeta «Entregas escolares» de Inicio)
- **Falla corregida**: la tarjeta incluía las entregas vencidas sin marcar y las ordenaba primero; con cronogramas cargados a mitad del semestre, las de agosto–octubre ocupaban todos los renglones y las próximas no aparecían. Ahora muestra sólo de hoy a N días (7 por omisión; 7, 15 o 30 desde la tarjeta o en Ajustes → Inicio) y resume las vencidas en un aviso con «Revisar» y «Marcar todas como enviadas» (con confirmación; cada cambio pasa por `regEstatus()`).
- Casilla por renglón para marcar como enviada y clic en el título para la ventana de estado.
- Seguridad: títulos, materias y fechas se escapan con `esc()`; los identificadores de los botones vienen de `uid()`; el número de días se acepta sólo de la lista 7/15/30. Sin conexiones nuevas. Prueba nueva en `pruebas/cronogramas.js` (próximos 7 y 15 días, aviso de vencidas y marcado masivo); A5g ahora también dibuja Inicio con un nombre de materia con HTML: sin ejecución.

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-15 | v0.10.3 — tarjeta de entregas escolares de los próximos días en Inicio | APTO | Sin ejecución de código; 0 conexiones externas |

### Ajustes v0.10.2
- Las materias nuevas se crean con la **clave** del cronograma como nombre (o el nombre del archivo si no trae clave); el nombre se cambia después en Escuela → Materias y, como las actividades se ligan por identificador, se actualiza en todas. Probado.
- Ventana de carga en tableta: la altura usa `100dvh` (altura visible real; antes `100vh` incluía la zona tapada por la barra del navegador y el botón quedaba oculto). La casilla «Enviada» y el contador pasaron al pie fijo junto a «Cargar actividades». Probado en Chromium con viewports de tableta (810×1080, 1080×810, 712×1138) y reduciendo la altura visible: el botón siempre queda visible. **No verificado** en Safari/Chrome de una tableta física.
- Sin cambios de seguridad: los textos siguen escapados y el nombre se recorta a 120 caracteres.

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-15 | v0.10.2 — materia nombrada por clave y ventana de carga adaptada a tableta | APTO | Sin ejecución de código; 0 conexiones externas |

### Ajustes v0.10.1
- **Hora de entrega eliminada**: todas las entregas son hasta el final del día. `sanear()` borra el campo `hora` de las actividades escolares guardadas antes; la exportación y la carga masiva ya no la usan.
- **Nombre de materia**: obligatorio al cargar un cronograma (el PDF sólo trae la clave) y editable directamente en Escuela → Materias (`Esc.renombrar()`: texto recortado a 120 caracteres, no admite vacío, se escapa al mostrarse).
- **Marcado rápido** (`Esc.marcar()`): ventana con los estados y la calificación; usa `Esc.estado()`/`Esc.calificar()`, por lo que registra el historial (`regEstatus()`) y valida la calificación igual que la lista.
- **Filtro por estado del calendario** (`UI.esc.tst`): se recuerda entre sesiones; si el valor guardado no es un estado válido se ignora (probado con HTML en el valor).
- Pruebas: `pruebas/cronogramas.js` agrega exigencia de nombre, conteo de entregas por día, marcado desde el calendario con registro en el historial, filtro por estado y renombrado; `pruebas/ataque.js` agrega A5g. Todo **correcto**, 0 conexiones.

## 18. Revisión de Noticias e investigación (v0.11)

Revisión manual con `web-security-review` sobre `src/056-noticias.js` (nuevo, 218 líneas), `src/055-sincronizacion.js`, `src/01-nucleo.js`, `src/02-app-proyectos.js`, `src/05-ajustes-datos.js`, `src/058-papelera.js` y `src/estilos.css`.

### Conexiones externas
| Dirección | Cambio | Se carga sola | Acción |
|---|---|---|---|
| `https://api.github.com` | Ya autorizada (sincronización). Ahora también se lee la carpeta `noticias/` de nova-datos y se borran sus archivos (`DELETE /contents/noticias/…`) | No: sólo con la sincronización configurada y al pulsar «Actualizar» o «Eliminar» | Se mantiene; la CSP **no cambió** |
| Direcciones de las fuentes de cada noticia | Nuevas, como enlaces | No: sólo se abren si haces clic (pestaña nueva, `noopener noreferrer`) | Sólo `https://`; `javascript:`, `data:` y `http:` no se enlazan |

Todas las peticiones siguen en el módulo de sincronización (`Sync._gh`); `056-noticias.js` no hace peticiones propias. Comprobado: 0 peticiones fuera de `api.github.com` en las pruebas.

### Controles
| Riesgo | Control |
|---|---|
| Contenido de internet con HTML o código (escrito por Claude o por quien tenga acceso al repositorio) | `Noticias.validar()`: exige `formato: "nova-noticia"`, recorta cada campo, listas y tipos cerrados; todo se escapa con `esc()` al mostrarse. Probado (A8): sin ejecución |
| Enlaces peligrosos en fuentes | Sólo `https://`, validadas con `urlSegura()` al leer y al pintar |
| Archivos enormes o demasiados | Se usa el tamaño informado por GitHub antes de descargar (máx. 100 KB) y máx. 300 archivos |
| Borrar algo que no sea una noticia | Sólo rutas `noticias/<nombre>.json` (sin `/` ni rutas relativas) y el identificador exacto del archivo; un respaldo alterado con `datos.json` o `img/` en la lista de borrado se descarta en `sanear()`. Probado (A8) |
| Contaminación del prototipo o campos inesperados | Las noticias se construyen con campos fijos; `sanear()` acota longitudes, tipo, relevancia, ruta e identificador |
| La sincronización podía perder noticias que Claude agregara durante una subida, o marcar un conflicto falso | Ahora compara `datos.json` (no el commit) y vuelve a leer la rama justo antes de moverla: si cambió, rehace la subida con lo nuevo (máx. 3 intentos). Probado con una noticia que llega a mitad de la subida |
| Instrucciones dentro del texto de una noticia («prompt injection») | Nova sólo muestra el texto; ninguna acción se ejecuta sin un clic tuyo |
| Eliminar | Como en Notas: confirmación, papelera 7 días; el archivo se borra del repositorio y, sin conexión, queda pendiente (`S.porBorrar`) y se completa al actualizar |

### Hallazgos
| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| H-18.1 | Medio | La sincronización forzaba la rama con una versión armada antes; una noticia agregada en ese intervalo se perdía, y cualquier archivo nuevo provocaba un «conflicto» falso con cambios locales | **Corregido** (comparación por `datos.json` y relectura antes de mover la rama) |
| H-18.2 | Bajo | El límite de 100 KB se comprobaba después de descargar el archivo | **Corregido** (se filtra con el tamaño del árbol de GitHub) |
| H-18.3 | Informativo | Las noticias se guardan sin cifrar en nova-datos | Aceptado: son información pública; repositorio privado. Tus datos siguen cifrados |

### Pruebas
- `node pruebas/noticias.js` (nueva, GitHub simulado): sin conexión, recepción (sólo archivos válidos de `noticias/`), sin duplicados, lectura (marca leída, fuentes https con `noopener`), guardar, crear nota, tarjeta de Inicio, noticia que llega durante la sincronización (reintento, sin pérdida), sin conflicto falso, eliminar (papelera + repositorio + abre la siguiente), no reaparece, restaurar, borrado pendiente sin red, carga CSV y exportación, instrucción para Claude. **Correcto**.
- `pruebas/ataque.js` caso **A8**: sin ejecución, sólo enlaces https, rutas de borrado alteradas descartadas. Demás casos sin cambios.
- `pruebas/sincronizacion.js`: mismos resultados que antes (el conflicto real entre equipos se sigue detectando). `pruebas/papelera.js` y `pruebas/cronogramas.js`: correctas.

### No verificado
- GitHub real (las pruebas usan un GitHub simulado con las mismas respuestas).
- Que tu sesión de Claude pueda escribir en la rama principal de nova-datos: depende de cómo le des acceso.

### Recomendaciones
| # | Recomendación |
|---|---|
| R-19 | Da a Claude acceso sólo a nova-datos y pídele usar la herramienta de GitHub para crear archivos, no `git push` |
| R-20 | Revisa las fuentes antes de actuar sobre una noticia de relevancia alta |

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-17 | v0.11 — Noticias e investigación desde nova-datos, tarjeta de Inicio, sincronización que respeta archivos nuevos | APTO | Sin ejecución de código; 0 conexiones fuera de api.github.com |

## 19. Revisión de ámbitos (macro categorías) en todas las pantallas (v0.12)

Revisión manual (criterios de `web-security-review`) sobre `src/01-nucleo.js`, `src/02-app-proyectos.js`, `src/03-escuela-agenda.js`, `src/04-notas-accesos.js`, `src/05-ajustes-datos.js`, `src/056-noticias.js` y `src/058-papelera.js`.

**Conexiones externas:** sin cambios. No aparece ninguna dirección nueva; la CSP no cambió; 0 peticiones externas en las pruebas.

### Cambios
- Filtro global por ámbito (Todo · Trabajo · Escuela · Personal · Otro · los creados en Ajustes) en Inicio, Proyectos, Actividades, Agenda (mes, 30 días y eventos), Recordatorios, Notas, Accesos y Noticias. Se recuerda entre pantallas y sesiones.
- Campo Ámbito en actividades, eventos, recordatorios, notas, accesos y noticias. **Trabajo por omisión** en lo nuevo y en lo anterior sin ámbito. Excepciones: Escuela (materias y entregas), Personal (cumpleaños), y lo ligado a un proyecto hereda su ámbito.
- Ámbitos nuevos **sólo** en Ajustes → Catálogos (máx. 12). Los formularios y la carga masiva sólo eligen; una carga con un ámbito desconocido no lo crea (queda Trabajo o el del proyecto). Eliminar manda el ámbito a la papelera; sus registros cuentan como Trabajo hasta reclasificarlos o restaurarlo.
- Columna opcional `Ambito` en la carga masiva y en la exportación.

### Riesgos y controles
| Riesgo | Control |
|---|---|
| Nombre de ámbito con HTML o comillas (se usa en botones y listas) | Formato cerrado `AMB_NOMBRE` (letras, números, espacio, `.`, `-`, `&`; 2–30) al crear, al renombrar y en `sanear()`; además se escapa con `esc()`. Probado: `<b>x</b>` rechazado; A9 sin ejecución |
| Catálogo inflado o duplicado (respaldo o sincronización alterados) | `sanear()`: máx. 12, sin repetir (ni con los base, sin importar mayúsculas) |
| Filtro guardado con un valor manipulado | `Amb.f()` sólo acepta un ámbito existente; si no, «Todo». Probado (A9) |
| Ámbito de un registro con un valor arbitrario | Se acepta sólo con el formato válido; si su ámbito no existe, cuenta como Trabajo |

### Hallazgos
Sin hallazgos críticos, altos ni medios.

### Pruebas
- `node pruebas/ambitos.js` (nueva): filtro en todas las pantallas, Trabajo por omisión (formularios y alta rápida), filtro recordado al recargar, crear/validar/renombrar/eliminar/restaurar ámbitos, máximo 12, carga masiva sin crear ámbitos, exportación y saneamiento. **Correcto**.
- `pruebas/ataque.js` caso **A9**: sin ejecución. `noticias.js`, `papelera.js`, `cronogramas.js`: correctas; `sincronizacion.js`: mismos resultados.

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-17 | v0.12 — ámbitos en todas las pantallas, Trabajo por omisión, ámbitos sólo desde Ajustes | APTO | Sin ejecución de código; 0 conexiones externas |

## 20. Sincronización: imagen de fondo y cambios automáticos (v0.12.1)

**Falla reportada:** al cambiar la imagen de fondo en la computadora y abrir después la tableta o el celular, aparecía «Conflicto de sincronización» y el fondo nuevo no llegaba.

**Causa (reproducida con `pruebas/fondo-sync.js`):** al abrir, la plataforma guarda cambios automáticos antes de sincronizar (frase del día, aviso de recordatorios vencidos, purga de la papelera). Eso marcaba el equipo como «con cambios locales» y, como GitHub sí había cambiado (el fondo nuevo), se declaraba conflicto. La frase del día lo provocaba además cada mañana.

**Corrección:** `guardar(true)` marca un cambio como automático (`Sync.cambio(auto)` → `cfg.auto`). Si GitHub cambió, se trae primero lo de GitHub y el cambio automático se recalcula; si no cambió, se sube como siempre. Un cambio hecho por el usuario en ambos equipos **sigue** siendo conflicto (no se pierde nada sin preguntar). La imagen sigue viajando cifrada (`img/<id>`), igual que antes.

**Conexiones externas:** sin cambios (sólo `api.github.com`, ya autorizada).

**Riesgos:** ninguno nuevo; no hay entradas nuevas. Un cambio automático puede descartarse si llega una versión más nueva de GitHub, lo cual es intencional (se vuelve a calcular).

**Pruebas:** `node pruebas/fondo-sync.js` (nueva, GitHub simulado: computadora cambia el fondo → tableta abre al día siguiente en Inicio → recibe el fondo sin conflicto y se ve; celular nuevo lo recibe; un cambio real en ambos lados sigue en conflicto). **Correcto**. Regresión: ataque, noticias, papelera, ámbitos y sincronización.

| Fecha | Cambio | Validación automática | Pasada adversarial |
|---|---|---|---|
| 2026-11-17 | v0.12.1 — fondo sincronizado sin conflictos falsos | APTO | Sin ejecución de código; 0 conexiones externas |
