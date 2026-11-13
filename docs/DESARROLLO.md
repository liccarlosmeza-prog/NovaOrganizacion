# Nova Organización — Bitácora y detalle de desarrollo

> *Evolución sin límites.*
> Documento técnico del proyecto: qué se pidió, qué se decidió, cómo está construido, qué se probó y qué falta.
> Última actualización: 2026-11-12 · Versión de la aplicación: **0.9**

---

## 1. Resumen

**Nova Organización** es una plataforma personal para dar seguimiento a proyectos (trabajo, escuela y personales), actividades, agenda, recordatorios, notas, accesos directos, cumpleaños y frases del día.

| Dato | Valor |
|---|---|
| Entregable | `PlataformaGestion/PlataformaGestion.html` (un solo archivo, ~187 KB) |
| Tecnología | HTML + CSS + JavaScript puro, sin librerías ni servidor |
| Almacenamiento | IndexedDB del navegador (respaldo en `localStorage` si no está disponible) |
| Destino previsto | Uso local y publicación de prueba en Power Pages |
| Rama de trabajo | `ccr-b018fa24-6qjzss` |

---

## 2. Cronología del desarrollo

| Etapa | Solicitud | Resultado | Commit |
|---|---|---|---|
| 1 | Propuesta de una app para seguimiento de proyectos, notas, imágenes, agenda (incluida Teams), carga escolar, cumpleaños e importación/exportación | `docs/PROPUESTA.md`: análisis, diseño, modelo de datos, fases y costos | `65da2a6` |
| 2 | Imagen conceptual de cada pantalla | 11 maquetas en `docs/mockups/` (generadas desde `docs/mockups/src/mockups.html`) | `6b37e34` |
| 3 | Respuestas: uso en varios dispositivos, Teams en navegador, carga propia de actividades escolares | Propuesta revisada, `docs/GUIA_AGENDA_TEAMS.md` y plantillas en `docs/plantillas/` | `7b69578` |
| 4 | Lista de módulos, preferencia por **listas y estatus** (no tarjetas/Kanban), minimalismo, colores e imágenes personalizables, frases del día, integrar AcadTrack y LinkManager, prueba para Power Pages | **v0.1** de la plataforma en `PlataformaGestion/` | `aaef22d` |
| 5 | Identidad Nova, Inicio configurable, carga masiva por pantalla con plantillas, guardar sin desplazarse, historial de estatus, protagonismo de Actividades y Agenda, más filtros | **v0.2** | `0e8ba1c` |
| 6 | Documentar todo el desarrollo en el repositorio | Este documento | `a0464ab` |
| 7 | Publicación en GitHub Pages | Página de entrada `index.html` | `bc11293` |
| 8 | Revisión de seguridad recurrente y reporte de conexiones externas | **v0.3**: correcciones, CSP, saneamiento, `seguridad.js`, `pruebas/ataque.js`, `docs/SEGURIDAD.md`, `CLAUDE.md` | — |
| 9 | Carrusel de frases aleatorio, sin repetir, sólo de lunes a viernes | **v0.4** | `04e0636` |
| 10 | Guardar la información en GitHub para usarla en varios equipos | **v0.5**: sincronización cifrada con repositorio privado (`src/055-sincronizacion.js`), autorizando `api.github.com` como única conexión externa | — |
| 11 | Cargar la agenda de trabajo a partir de fotos del calendario | **v0.6**: «Cargar por foto» en Agenda (`Foto` en `05-ajustes-datos.js`): instrucciones para un asistente de IA + pegado y revisión del CSV. Sin conexiones nuevas | — |
| 12 | Reclasificar las sesiones de la agenda por proyecto | **v0.7**: vista «Eventos y proyectos» en Agenda (asignación individual, masiva y por título) y pestaña «Sesiones» en el detalle de proyecto | — |
| 13 | Leer las fotos dentro de la plataforma, sin herramientas externas; evaluar Python embebido; notas desde foto de cuaderno | **v0.7**: Tesseract.js incrustado (`src/057-lector-fotos.js`, `terceros/tesseract/`), interpretación de agenda en lista y en cuadrícula, «Nota desde foto», `pruebas/lector-fotos.js`. Python embebido (Pyodide) **descartado**: no incluye motores de reconocimiento de texto | — |
| 14 | Lo eliminado se conserva 7 días y después se borra; papelera de reciclaje | **v0.8**: `src/058-papelera.js`, pantalla «Papelera», purga automática, `pruebas/papelera.js` | — |
| 15 | Ajustar el lector con ejemplos reales (pizarrón, captura oscura, cuaderno, recado) | **v0.9**: `Ocr.leerMejor()` (varias preparaciones y orientación), diccionario de correcciones aprendidas, Ajustes → Lector de fotos. Medido: pizarrón 58 %→71 % tras aprender, captura oscura 0 %→77 %; manuscrita ligada sin mejora (límite del modelo) | — |

---

## 3. Decisiones técnicas y sus razones

### 3.1 De React + Azure a un HTML único
La propuesta inicial planteaba React + Vite con Azure Static Web Apps, Functions y Azure SQL. En la etapa 4 se cambió a **un solo HTML con JavaScript puro** porque:
- El objetivo inmediato era **probar** y después subir a **Power Pages**, donde un HTML autocontenido se publica directamente como plantilla web.
- Las herramientas previas del usuario (AcadTrack, LinkManager) ya eran HTML autónomos; mantener el mismo estilo facilita entender y modificar el código.
- No requiere instalar nada ni tener infraestructura.

**Costo de la decisión:** los datos viven en el navegador y no se sincronizan entre equipos. Se mitigó dejando todo el acceso a datos detrás del objeto `DB` (ver 4.2) para sustituirlo después por la Web API de Power Pages (Dataverse) sin reescribir la aplicación.

### 3.2 Código fuente modular, entrega en un archivo
El código se escribe en varios archivos dentro de `src/` y `construir.js` los une. Así el entregable sigue siendo un archivo, pero el código es mantenible.

### 3.3 IndexedDB en lugar de `localStorage`
`localStorage` admite ~5 MB y sólo texto; las imágenes (bitácora, frases, fondos) no caben. IndexedDB guarda imágenes como archivos binarios y admite cientos de MB.

### 3.4 Interfaz de listas
Por preferencia expresa del usuario se descartaron tarjetas y tableros Kanban. Todas las pantallas usan tablas/listas con estatus editable en línea. La navegación lateral es sólo texto.

### 3.5 Notas privadas con cifrado real
No es un simple candado visual: el contenido se cifra con **AES-GCM de 256 bits** y la clave se deriva de la contraseña con **PBKDF2 (SHA-256, 250 000 iteraciones)**. La contraseña no se almacena. Consecuencia asumida: **si se olvida, no hay recuperación**.

### 3.6 Otras decisiones
| Tema | Decisión | Motivo |
|---|---|---|
| Identificadores | UUID (`crypto.randomUUID`) | Evita choques al importar o sincronizar |
| Fechas | Se guardan como `AAAA-MM-DD`; se muestran y exportan como `dd/mm/aaaa` | Orden correcto y compatibilidad con Excel en México |
| Enlaces | Sólo `http`, `https` y `mailto` | Impide direcciones `javascript:` maliciosas |
| Texto del usuario | Siempre se escapa antes de insertarse en pantalla | Evita inyección de HTML |
| Imágenes | Se reducen a 1600–2200 px y JPEG 85 % | Ahorro de espacio |
| Tipografía | Aptos → Segoe UI → fuente del sistema | Identidad Nova sin depender de internet |
| Sin fuentes ni librerías externas | Todo va dentro del archivo | Funciona sin conexión y sin restricciones de Power Pages |

---

## 4. Arquitectura

### 4.1 Estructura de archivos
```
NovaOrganizacion/
├── README.md
├── docs/
│   ├── PROPUESTA.md              análisis, diseño y plan original
│   ├── GUIA_AGENDA_TEAMS.md      opciones para traer la agenda de Teams/Outlook
│   ├── DESARROLLO.md             este documento
│   ├── mockups/                  11 imágenes conceptuales + su código fuente
│   └── plantillas/               plantillas CSV de la etapa de propuesta
└── PlataformaGestion/
    ├── PlataformaGestion.html        ← aplicación final
    ├── PowerPages-WebTemplate.html   ← la misma, envuelta en {% raw %} para Power Pages
    ├── LEEME.md                      guía de uso e instalación
    ├── construir.js                  une src/ en un solo HTML (node construir.js)
    ├── capturas/                     capturas reales de la aplicación
    └── src/
        ├── plantilla.html            estructura HTML base
        ├── estilos.css               estilos y variables de color
        ├── 01-nucleo.js              utilidades, almacenamiento, estado, tema, formularios, CSV, ZIP, cifrado
        ├── 02-app-proyectos.js       navegación, Inicio, historial, Proyectos, Bitácora, Actividades
        ├── 03-escuela-agenda.js      Escuela, línea de tiempo, evaluación, Agenda, Recordatorios
        ├── 04-notas-accesos.js       Notas, Accesos directos, Cumpleaños, Frases
        ├── 05-ajustes-datos.js       Ajustes, exportar/importar, respaldo, carga masiva, saneamiento
        ├── 055-sincronizacion.js     Sincronización cifrada con un repositorio privado de GitHub
        ├── 057-lector-fotos.js       Lector de fotos (Tesseract.js incrustado) e interpretación de agendas
        ├── 058-papelera.js           Papelera de reciclaje (7 días)
        └── 06-inicio.js              datos de ejemplo y arranque
```

### 4.2 Capas
```
 Pantallas (Vistas.*)  →  Lógica por módulo (Proy, Act, Esc, Agenda, Rec, Notas, Acc, Cumples, Frases, Aj, Datos, Carga, Hist, Ini)
                                   │
                           Estado en memoria (S)  ──  guardar()  ──►  DB (IndexedDB)
                                   │                                   Img (imágenes)
                           Boveda (notas privadas cifradas)
```
- **`S`**: objeto único con todos los datos. `guardar()` lo escribe con una espera de 250 ms para agrupar cambios.
- **`DB`**: único punto de lectura/escritura. Métodos: `abrir`, `leerEstado`, `escribirEstado`, `imgTodas`, `imgPoner`, `imgQuitar`, `imgVaciar`. **Sustituir este objeto es lo único necesario para cambiar de motor de datos.**
- **`App`**: navegación por *hash* (`#/proyectos`, `#/proyecto/<id>`); `App.pintar()` redibuja la pantalla activa.
- **`Vistas`**: una función por pantalla que devuelve HTML.
- **`Form`**: formulario genérico a partir de una lista de campos (texto, fecha, hora, número, lista, color, casilla, imagen) con validación de obligatorios.
- **`UI`**: filtros y pestañas activas; se recuerdan en `localStorage` (clave `nova_ui`), excepto el texto de búsqueda.

### 4.3 Proceso de construcción
```bash
cd PlataformaGestion
node construir.js     # genera PlataformaGestion.html y PowerPages-WebTemplate.html
```
El script inserta `estilos.css` y todos los `src/*.js` (en orden alfabético) dentro de `plantilla.html`.

---

## 5. Modelo de datos

Todas las colecciones viven dentro de `S`. Las relaciones se hacen por `id`.

| Colección | Campos | Relaciones |
|---|---|---|
| `ajustes` | nombre, lema, usuario, temaId, tema{bg, sup, tx, mut, bd, ac, lat, oro}, escala, fondoImg, fondoOp, bandaImg, metaEscolar, inicio[], inicioFiltro{amb, cat} | imágenes |
| `estatus` | id, nombre, color, final | catálogo |
| `categorias` | id, nombre, color | catálogo (clasificación de actividades) |
| `proyectos` | id, nombre, ambito, estatus, prioridad, asignadoPor, inicio, objetivo, avanceManual, descripcion, creado | → estatus |
| `actividades` | id, titulo, proyecto (vacío = del área), categoria, estatus, prioridad, inicio, limite, hora, horas, detalle, checklist, completada, creado | → proyectos, categorias, estatus |
| `bitacora` | id, proyecto, fecha (con hora), tipo, texto, imgs[], editado | → proyectos, imágenes |
| `notas` | id, titulo, texto, proyecto (vacío = sin clasificar), etiquetas, fijada, creado, actualizado | → proyectos |
| `boveda` | sal, prueba{iv, ct} | parámetros del cifrado |
| `notasPriv` | id, iv, ct | contenido cifrado |
| `recordatorios` | id, texto, fecha, hora, repetir (diario/semanal/mensual/anual), hecho, avisado | — |
| `eventos` | id, titulo, fecha, horaIni, horaFin, tipo, proyecto, lugar, nota, origen (local/csv/ics), origenId | → proyectos |
| `cumples` | id, nombre, dia, mes, anio, relacion, nota | — |
| `materias` | id, nombre, profesor, ciclo, color, meta | — |
| `escolares` | id, materia, titulo, tipo, valor (puntos), inicio, entrega, estatus, calif, comentario | → materias |
| `carpetas` | id, nombre, color | — |
| `enlaces` | id, nombre, url, carpeta, desc, fav, tags | → carpetas |
| `grupos` | id, nombre, ids[] | → enlaces |
| `frases` | id, texto, autor, img, vista (fecha en que se mostró) | → imágenes |
| `historial` | id, lista, ref, titulo, proyecto, de, a, fecha | registro de cambios de estatus |
| `correcciones` | id, mal, bien, usos | diccionario del lector aprendido de las correcciones del usuario |
| `papelera` | id, lista, titulo, ms (fecha de eliminación), obj (registro), rel [{lista, objs}], des [{lista, campo, ids}] | elementos eliminados; se borran a los 7 días |

Las **imágenes** se guardan en un almacén aparte de IndexedDB (`img`), identificadas por UUID.

---

## 6. Módulos y reglas de negocio

### Inicio
- Bloques: Agenda, Actividades, Frase del día, Entregas escolares, Proyectos activos, Recordatorios, Cumpleaños y Accesos favoritos.
- Configurables en **Ajustes → Inicio**: orden, visibilidad, tamaño (rejilla de 6 columnas: tercio, mitad, dos tercios, completo), filas y periodo.
- Barra superior de filtros por **ámbito** y **clasificación** que afecta a todos los bloques.
- **Carrusel de frases** (lunes a viernes): se elige al azar una frase sin marca de vista; `ajustes.fraseHoy` guarda la del día para que no cambie al recargar. Al cambiar de día, la anterior recibe su fecha en `vista`. Sin pendientes, se limpian las marcas y empieza otro ciclo evitando repetir la última. Sábados y domingos no se muestra ni avanza.

### Proyectos
- Avance = actividades terminadas / total. Si no hay actividades se usa el avance manual.
- Al eliminar un proyecto, sus actividades pasan a "del área" y sus notas a "sin clasificar"; la bitácora y sus imágenes se eliminan.
- Detalle con pestañas: Actividades, Bitácora (con imágenes), Notas e Historial de estatus.

### Actividades
- Pueden pertenecer a un proyecto o ser **del área**, con clasificación opcional.
- Lista de verificación: un elemento por línea; `[x]` al inicio lo marca como hecho.
- Marcar la casilla la pasa al estatus final y registra la fecha de término.
- La fecha límite no puede ser anterior a la de inicio.

### Escuela
- **Lista** con cambio de estado y captura de calificación en línea.
- **Línea de tiempo** (evolución de AcadTrack): barras por materia, renglón de entregas por día (1 azul, 2 ámbar, 3 o más rojo), línea de hoy, vistas de mes, 3 meses o ciclo completo.
- **Modelo de evaluación** por materia:
  - `total` = suma de valores; `evaluado` = valor de las calificadas; `obtenido` = suma de calificaciones.
  - `rendimiento` = obtenido / evaluado.
  - `proyección` = obtenido + (total − evaluado) × rendimiento.
  - Mensaje: puntos que faltan para la meta, meta alcanzada o meta ya inalcanzable.
  - Aviso si los valores de la materia no suman 100.
- La calificación no puede exceder el valor; al capturarla el estado pasa a "Calificada".

### Agenda
- Reúne eventos, actividades con fecha límite, entregas escolares, cumpleaños y recordatorios.
- Vista de mes con **carga por día** (ámbar con 3–4 pendientes, rojo con 5 o más) y lista de 30 días.
- Casillas "Mostrar" para filtrar por tipo de elemento.
- Importa `.ics` (no expande eventos repetitivos: toma la primera fecha).

### Recordatorios
- Revisión cada 30 segundos; avisa una sola vez por fecha (en pantalla y, si se autoriza, con notificación del navegador).
- Al marcar como hecho uno repetitivo, avanza a su siguiente fecha.

### Notas
- Guardado automático al escribir. Pueden quedar sin clasificar y asignarse después a un proyecto.
- **Privadas**: bloqueo automático a los 5 minutos sin actividad; una nota general puede convertirse en privada y viceversa.

### Accesos directos
- Evolución de LinkManager: carpetas, etiquetas, favoritos, búsqueda y **grupos** que abren varios sitios a la vez.

### Historial de estatus
- Registra automáticamente cada cambio de estatus de proyectos, actividades y actividades escolares, desde la lista, el formulario, la casilla de terminado, la calificación o una carga masiva.
- Guarda el **nombre** del estatus (no su id), así el registro sigue siendo legible aunque después se modifique el catálogo.
- Límite de 5 000 registros (se descartan los más antiguos).

### Carga masiva
Diez layouts definidos en `LAYOUTS` (`05-ajustes-datos.js`):

| Tabla | Columnas obligatorias | Regla de duplicados |
|---|---|---|
| Proyectos | Nombre | mismo nombre |
| Actividades | Titulo | mismo título + proyecto + fecha límite |
| Materias | Materia | mismo nombre |
| Actividades escolares | Materia, Actividad, FechaEntrega | misma materia + actividad + entrega |
| Agenda (eventos) | Evento, Fecha | mismo título + fecha + hora |
| Recordatorios | Recordatorio, Fecha | mismo texto + fecha |
| Notas | Titulo o Texto | mismo título + texto |
| Accesos directos | Nombre, URL | misma URL |
| Cumpleaños | Nombre, Fecha | mismo nombre |
| Frases | Frase | mismo texto |

- Las columnas se reconocen por nombre, sin importar orden, acentos ni mayúsculas. Se acepta coma o punto y coma como separador.
- Antes de guardar se informa cuántas filas son válidas y cuántas se omiten.
- Proyectos, clasificaciones, materias y carpetas inexistentes se crean al importar actividades, actividades escolares o accesos.
- Los formatos de Actividades escolares y Accesos directos son los mismos que exportan AcadTrack y LinkManager.

### Exportación y respaldo
- **ZIP de CSV**: 12 tablas más un `LEEME.txt`. El ZIP se genera en el navegador (sin compresión) con un escritor propio.
- **Respaldo `.json`**: estado completo + imágenes en Base64 + notas privadas cifradas.
- **Restauración**: reemplaza todo y aplica migración de versiones anteriores.

---

## 7. Identidad visual

| Elemento | Valor |
|---|---|
| Nombre / lema | Nova Organización · *Evolución sin límites.* |
| Corporate Navy | `#073763` (barra lateral) |
| Technology Blue | `#0B84F3` (acento) |
| Innovation Turquoise | `#19C3C8` |
| Dragon Gold | `#E6A817` (línea y marca de sección activa) |
| Fondo claro | `#F4F7FA` |
| Tipografía | Aptos (si no está instalada: Segoe UI) |
| Logotipo | Infinito con barras, dibujado en SVG dentro del código (`LOGO` en `01-nucleo.js`) |

Los colores se aplican como variables CSS (`--bg`, `--sup`, `--tx`, `--mut`, `--bd`, `--ac`, `--lat`, `--oro`) y son editables. El color del texto de la barra lateral se calcula según qué tan oscuro sea su fondo. Temas incluidos: Nova, Claro, Gris, Arena, Oscuro y Nova noche.

---

## 8. Pruebas realizadas

Automatizadas con Playwright sobre Chromium (los scripts no forman parte del repositorio). Resultado: **sin errores de consola en ambas baterías**.

| Área | Verificación |
|---|---|
| Pantallas | Recorrido de las 11 pantallas y todas sus pestañas con datos de ejemplo |
| Formularios | Alta rápida y con formulario; validación de fechas; botones visibles en ventana de 700 px, también al 125 % |
| Estatus | Cambio desde lista, formulario y casilla; registro correcto en el historial; sin registros duplicados si el estatus no cambia |
| Escuela | Calificación válida e inválida; cálculo de totales y proyección |
| Notas privadas | Creación, contraseña incorrecta, desbloqueo, y comprobación de que el texto no queda legible en el almacenamiento |
| Persistencia | Datos, imágenes y filtros se conservan al recargar |
| Carga masiva | Las 10 plantillas se importan tal cual se descargan; una segunda carga no duplica; rechazo de filas inválidas |
| Importación | CSV de AcadTrack y LinkManager, `.ics`, rechazo de direcciones `javascript:` |
| Exportación | Integridad del ZIP; respaldo y restauración completa con imágenes y notas privadas |
| Migración | Un estado de la v0.1 conserva sus datos y adopta la identidad Nova |
| Inicio | Orden, tamaños, bloques ocultos y filtros por ámbito |
| Presentación | Temas claro y oscuro; vista móvil sin desbordes |

**No probado:** Firefox y Safari, publicación real en Power Pages, notificaciones del sistema operativo, volúmenes de miles de registros, uso prolongado en varios días.

---

## 9. Limitaciones conocidas

1. **Sincronización opcional y sin prueba real**: la v0.5 sincroniza con un repositorio privado de GitHub (cifrado en el navegador, una sola versión sin historial, conflictos resueltos por el usuario). Sólo se probó con un GitHub simulado.
2. **Riesgo de pérdida**: borrar los datos de navegación elimina la información. Se recomienda respaldo semanal.
3. **Sólo las notas privadas están cifradas**; el resto es legible para quien tenga acceso a la sesión del equipo.
4. **Recordatorios**: avisan sólo con la plataforma abierta.
5. **Agenda de Teams en vivo**: no implementada; por ahora entra por archivo `.ics` o CSV.
6. **`.ics`**: no se expanden eventos repetitivos.
7. **Historial**: existe desde la v0.2; no hay registro de cambios previos.
8. **Logotipo**: es una aproximación dibujada a partir de la imagen de marca, no el archivo original.
9. **Orden de bloques de Inicio**: con flechas, no arrastrando.
10. **Rendimiento**: cada cambio redibuja la pantalla completa y guarda todo el estado; adecuado para uso personal, no medido con volúmenes grandes.

---

## 10. Pendientes y siguientes pasos

| Prioridad | Tarea | Depende de |
|---|---|---|
| Alta | Probar con datos reales y recoger ajustes | Usuario |
| Alta | Publicar la prueba en Power Pages (pasos en `PlataformaGestion/LEEME.md`, aún sin ejecutar en un sitio real) | Licencia / ambiente de Power Pages |
| Alta | Sincronización: crear tablas en Dataverse y reemplazar el objeto `DB` por la Web API de Power Pages | Publicación en Power Pages |
| Media | Agenda de Teams/Outlook en vivo | Resultado de las pruebas P1–P3 de `docs/GUIA_AGENDA_TEAMS.md` |
| Media | Sustituir el logotipo por el archivo oficial | Archivo SVG o PNG |
| Media | Recordatorios ligados a una actividad o entrega | — |
| Baja | Arrastrar para reordenar bloques de Inicio | — |
| Baja | Expandir eventos repetitivos de `.ics` | — |
| Baja | Pruebas en Firefox/Safari y con volúmenes grandes | — |

Por confirmar con el usuario: disponibilidad de licencia de Power Pages y si "valor" de las actividades escolares seguirá manejándose en puntos (así lo usa AcadTrack y así está implementado).

---

## 11. Cómo continuar el desarrollo

1. Editar los archivos de `PlataformaGestion/src/`.
2. Ejecutar `node construir.js` dentro de `PlataformaGestion/`.
3. Abrir `PlataformaGestion.html` y probar; **Ajustes → Datos → Cargar datos de ejemplo** llena la plataforma para revisar.
4. Para agregar una pantalla: registrar su función en `Vistas`, añadirla a `App.NAV` y, si maneja datos nuevos, agregar su colección en `estadoVacio()` (la función `fusionar()` completa automáticamente los estados guardados de versiones anteriores).
5. Para agregar una carga masiva: añadir su entrada en `LAYOUTS` y su lector `Datos.leer_<clave>`.
6. Hacer commit y subir a la rama de trabajo.

---

## 12. Lector de fotos (v0.7)

### Decisión: JavaScript con Tesseract.js, no Python embebido
| Opción evaluada | Resultado |
|---|---|
| **Tesseract.js 5.1.1** (motor Tesseract compilado a WebAssembly) | **Elegida.** Corre en el navegador, sin servidor; ≈ 6.8 MB incrustados; lee español con el modelo `best_int` |
| Python embebido (Pyodide 0.26, ≈ 10 MB base) | **Descartada.** De sus 310 paquetes, ninguno es un motor de reconocimiento de texto (sólo OpenCV, Pillow y scikit-image, que preparan imágenes pero no leen texto). EasyOCR y PaddleOCR necesitan PyTorch o Paddle, que no existen para Pyodide. Agregaría peso sin mejorar la lectura |
| Modelos de escritura a mano en el navegador (TrOCR vía ONNX) | No incorporados: decenas o cientos de MB, entrenados en inglés y sólo leen una línea a la vez |

### Cómo funciona
1. `Ocr.leer()` redibuja la foto en un lienzo (máx. 2600 px) y la pasa al proceso del lector.
2. El proceso arranca desde un único bloque: guardián (entrega el idioma y bloquea la red) + núcleo + proceso de Tesseract.js. Se usa un solo bloque porque, al abrir la página como archivo local, el navegador impide que un proceso cargue otros recursos internos.
3. `OcrAgenda.interpretar()` usa el texto **y la posición** de cada palabra:
   - **Lista de agenda** (celular): encabezados de fecha («9 nov lunes», corrigiendo confusiones como `g`→`9`), renglones «hh:mm Título», duración («1 h», «30 min») y lugar (Teams, sala).
   - **Cuadrícula semanal** (computadora): calcula la escala vertical con las etiquetas de hora («10 AM»), las columnas con los números de día, el mes y año del encabezado, y agrupa el texto de cada bloque; separa el organizador («Apellido, Nombre»), une organizadores partidos en varias líneas y descarta ruido (barra de tareas, fragmentos ilegibles).
   - Cada evento lleva una confianza; los dudosos (< 78 % o con símbolos raros, como el texto tachado) quedan **desmarcados** en el borrador.
4. El borrador es editable y se valida con `leer_eventos` antes de guardar.
5. **Notas**: `Ocr.texto()` arma párrafos y quita las rayas del renglonado. Si la primera lectura sale con baja confianza, se repite con limpieza de contraste (umbral adaptativo) y se conserva la mejor.

### Calidad medida
| Caso | Resultado |
|---|---|
| Agenda Teams celular (fotos reales) | 9/9 eventos; 2 dudosos desmarcados |
| Calendario semanal (fotos reales, octubre / noviembre) | 10/10 y 9/9; horas estimadas por posición; títulos recortados si la foto los recorta |
| Imágenes sintéticas (celular / semanal) | 4/4 y 6/6, sin eventos de más |
| Hoja de cuaderno, letra de molde | Similitud 0.99 |
| Hoja de cuaderno, letra cursiva | Similitud 0.41 (no útil) |
| Tiempo | 2 a 7 s por foto; la primera lectura incluye la preparación del lector |

### Ajuste con ejemplos reales (v0.9)
Reentrenar Tesseract no es viable con pocas fotos (requiere miles de renglones etiquetados y herramientas de entrenamiento fuera del navegador). En su lugar se midieron, con 4 fotos del usuario, distintas preparaciones de imagen y modos del lector:

| Preparación | Pizarrón (marcador) | Captura oscura | Cuaderno (manuscrita) | Recado en pizarra |
|---|---|---|---|---|
| Sin preparar, modo bloque (anterior) | 54 % | 0 % | 0 % | 0 % |
| Sin preparar, modo automático | **58 %** | 0 % | 0 % | 0 % |
| Limpieza adaptativa + texto disperso | 46 % | **77 %** | 0 % | 0 % |
| Canal de tinta + umbral global | 46 % | 0 % | 0 % | 0 % |

Se adoptó probar las dos mejores y elegir por **número de palabras legibles** (≥ 3 letras con confianza ≥ 75), que resultó mejor selector que la confianza promedio. Encima se agregó el diccionario de correcciones aprendidas (pizarrón: 58 % → 71 % al releer).
