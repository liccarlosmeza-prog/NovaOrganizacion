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
