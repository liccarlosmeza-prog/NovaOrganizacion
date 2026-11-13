# Nova Organización — prueba v0.7

> *Evolución sin límites.*

Aplicación en **un solo archivo HTML**, sin instalación ni servidor. Integra y mejora tus dos herramientas anteriores (AcadTrack y LinkManager) junto con proyectos, actividades, agenda, recordatorios, notas, cumpleaños y frases del día.

## 1. Cómo guardarla en tu equipo

Esta sesión se ejecuta en la nube y no puede escribir en tu disco. Para dejarla en
`C:\Users\licca\Documents\Claude\PlataformaGestion` elige una opción:

**Opción A — descargar (más simple)**
1. Crea la carpeta `C:\Users\licca\Documents\Claude\PlataformaGestion`.
2. Descarga `PlataformaGestion.zip` (o sólo `PlataformaGestion.html`) y extráelo ahí.
3. Abre `PlataformaGestion.html` con doble clic (Edge o Chrome).

**Opción B — con Git (recomendada para seguir recibiendo versiones)**
```powershell
cd C:\Users\licca\Documents\Claude
git clone -b ccr-b018fa24-6qjzss https://github.com/liccarlosmeza-prog/NovaOrganizacion.git PlataformaGestion
start PlataformaGestion\PlataformaGestion\PlataformaGestion.html
```
Para actualizar después: `git pull` dentro de la carpeta.

## 2. Primeros pasos
1. **Ajustes → Datos → Cargar datos de ejemplo** para ver todo funcionando (se puede borrar después).
2. **Ajustes → Apariencia**: nombre, tu nombre, tema, colores, imagen de encabezado y de fondo.
3. Trae tu información anterior en **Ajustes → Datos → Importar**:
   - CSV exportado de **AcadTrack** → "Actividades escolares".
   - CSV exportado de **LinkManager** → "Accesos directos".
   - Si abres la plataforma en la misma carpeta/navegador donde usabas esos HTML, aparece el botón **"Traer AcadTrack / LinkManager"** que copia los datos directamente.

## 3. Qué incluye

| Módulo | Qué hace |
|---|---|
| **Inicio** | Frase del día (imagen/texto distinto cada día), agenda de hoy, actividades por atender, entregas escolares, proyectos activos, cumpleaños y accesos favoritos |
| **Proyectos** | Lista con ámbito, estatus, prioridad, avance, quién lo asignó y fechas. Detalle con actividades, **bitácora con imágenes** y notas |
| **Actividades** | De un proyecto **o del área** (sin proyecto), con clasificación, prioridad, fecha, horas y lista de verificación. Captura rápida con Enter |
| **Escuela** | Actividades por materia, **línea de tiempo** (AcadTrack mejorado, con entregas por día), **modelo de evaluación** (puntos obtenidos, rendimiento, proyección y cuánto falta para la meta) |
| **Agenda** | Mes con carga por día y lista de 30 días; reúne eventos, actividades, entregas, cumpleaños y recordatorios. Importa `.ics` de Outlook/Teams |
| **Recordatorios** | Con hora y repetición; aviso en pantalla y notificación del navegador |
| **Notas** | Generales sin clasificar → se asignan después a un proyecto. **Notas privadas cifradas con contraseña** |
| **Accesos directos** | Carpetas, etiquetas, favoritos y grupos que abren varios sitios a la vez (LinkManager mejorado) |
| **Cumpleaños** | Ordenados por cercanía, con edad y notas |
| **Frases del día** | Carga imágenes o textos; carrusel aleatorio sin repetir, de lunes a viernes |
| **Ajustes** | Colores y temas, imágenes de interfaz, catálogos de estatus y clasificaciones, exportar/importar, seguridad |

### Exportación e importación
- **Todo en CSV**: un ZIP con un CSV por tabla (Excel / Power BI).
- **Respaldo completo `.json`**: incluye imágenes y ajustes; sirve para pasar los datos a otro equipo.
- Importación de CSV (actividades escolares, accesos, actividades, cumpleaños) y de calendario `.ics`, con validación y aviso de filas omitidas.

### Novedades de la v0.2
- **Identidad Nova**: logotipo, barra lateral azul marino, acento azul/turquesa y detalle dorado. Todos los colores siguen siendo editables (Ajustes → Apariencia), con 6 temas y **tamaño general** de la interfaz (85 % a 125 %).
- **Inicio configurable** (Ajustes → Inicio): orden de los bloques, visibilidad, tamaño (tercio, mitad, dos tercios, completo), número de filas y periodo. Agenda y Actividades van primero por defecto.
- **Filtros**: en Inicio por ámbito y clasificación; en cada pantalla búsqueda de texto y filtros propios (prioridad, tipo, relación, tipo de elemento en Agenda). Los filtros elegidos se recuerdan.
- **Carga masiva en cada pantalla**: botón *Carga masiva* con el layout de columnas, **plantilla CSV con ejemplos** y validación antes de guardar. En Ajustes → Datos se descargan todas las plantillas en un ZIP.
- **Historial de estatus**: cada cambio de estatus de proyectos, actividades y actividades escolares queda registrado con fecha y hora (botón *Historial*, pestaña en el proyecto, dentro del formulario del registro y en la exportación CSV).
- **Formularios sin desplazamiento**: los botones Guardar / Cancelar quedan siempre visibles; sólo se desplaza el contenido.

### Novedades de la v0.7 (lector de fotos y clasificación de eventos)
- **Agenda → Cargar por foto → Leer fotos**: la plataforma lee la foto de tu agenda (Teams en el celular o calendario semanal en la computadora) **dentro del navegador**, sin conexiones. Muestra un borrador editable; los eventos dudosos quedan desmarcados.
- **Notas → Nota desde foto**: convierte la foto de una hoja o cuaderno en una nota y guarda la foto con ella. Funciona bien con letra de molde clara; con letra cursiva el resultado es pobre.
- **Agenda → Eventos y proyectos**: asigna cada evento a un proyecto (uno por uno, varios a la vez o todos los que tengan el mismo título). En cada proyecto, la pestaña **Sesiones** muestra sus eventos.
- El archivo pesa ~7 MB porque incluye el lector. La versión para Power Pages se genera sin él.

### Novedades de la v0.6 (agenda por foto)
- **Agenda → Cargar por foto**: copia unas instrucciones, envíalas junto con la foto de tu calendario a un asistente de IA (por ejemplo, la app de Claude), pega la respuesta y revisa la lista antes de guardar.
- La plataforma no lee la imagen ni la envía a ningún lado; sólo recibe el texto que pegas, lo valida y omite repetidos.

### Novedades de la v0.5 (sincronización)
- **Ajustes → Sincronización**: guarda tus datos e imágenes, cifrados, en un repositorio **privado** de GitHub y los comparte entre tus equipos. Guía paso a paso: [`docs/SINCRONIZACION_GITHUB.md`](../docs/SINCRONIZACION_GITHUB.md).
- Es opcional. Apagada, la plataforma no hace ninguna conexión; encendida, la única conexión es `api.github.com`.
- Probada con un GitHub simulado; **falta la prueba contra GitHub real**. Descarga un respaldo antes de conectar por primera vez.

### Novedades de la v0.4 (carrusel de frases)
- **De lunes a viernes** aparece en Inicio una frase elegida **al azar** entre las que aún no se han mostrado.
- Al día siguiente la frase anterior queda **marcada como vista** (con su fecha) y entra otra. Cuando se terminan, el ciclo vuelve a empezar sin repetir la del último día.
- **Sábados y domingos** el carrusel no aparece ni avanza.
- En *Frases del día* se ve el estado de cada una (Hoy, Vista el…, Pendiente) y hay un botón **Reiniciar ciclo**. El enlace *Otra* de Inicio marca la actual como vista y muestra otra.

### Novedades de la v0.3 (seguridad)
- Revisión de seguridad completa: ver [`docs/SEGURIDAD.md`](../docs/SEGURIDAD.md). Se corrigió una falla crítica (un respaldo manipulado podía ejecutar código) y 7 hallazgos menores.
- **Sin conexiones externas**, ahora garantizado por una política de seguridad (CSP) dentro del archivo.
- Todo dato que entra por archivo se sanea antes de usarse; la exportación CSV neutraliza fórmulas.
- Notas privadas con 600 000 iteraciones (cambia tu contraseña una vez para actualizar una bóveda anterior).
- **Ajustes → Seguridad → Autodiagnóstico**: la app revisa en vivo CSP, conexiones externas, cifrado y respaldo.
- Cada construcción (`node construir.js`) ejecuta `seguridad.js` y se detiene si algo falla.

## 4. Lo que debes saber (límites de esta prueba)
- **Los datos viven en el navegador y equipo donde la abras** (IndexedDB). Para compartirlos entre equipos activa la sincronización (v0.5) o usa el respaldo `.json`. Si borras los datos de navegación del sitio, se pierden → **descarga un respaldo cada semana**.
- **Notas privadas**: cifrado AES-256; la contraseña no se guarda. **Si la olvidas no hay recuperación.** Sólo las notas privadas van cifradas; el resto no.
- Los recordatorios avisan sólo con la plataforma abierta.
- La importación `.ics` no expande eventos repetitivos (toma la primera fecha).
- El historial de estatus empieza a registrarse desde esta versión; los cambios anteriores no existen.
- La agenda de Teams en vivo no está incluida todavía (ver `docs/GUIA_AGENDA_TEAMS.md`).

## 5. Publicarla en Power Pages (siguiente paso)
> Pasos generales; no los he ejecutado en tu ambiente. Los validamos juntos cuando llegues a esta etapa.

1. En **Power Pages → tu sitio → Editar → `…` → Administración del portal** (Portal Management).
2. **Plantillas web → Nueva**: nombre `PlataformaGestion`; en *Origen* pega el contenido completo de **`PowerPages-WebTemplate.html`** (es el mismo HTML envuelto en `{% raw %}` para que Liquid no interprete el código).
3. **Plantillas de página → Nueva**: tipo *Plantilla web*, selecciona `PlataformaGestion` y **desmarca "Usar encabezado y pie de página del sitio web"**.
4. **Páginas web → Nueva**: nombre y URL parcial (p. ej. `gestion`), plantilla de página la del paso 3, estado *Publicado*.
5. En **Permisos de página**, restringe el acceso a tu usuario (rol web autenticado).
6. **Sincronizar** el sitio y abrir `https://tusitio.powerappsportals.com/gestion`.

Consideraciones:
- Publicada así, la app sigue guardando **en el navegador**; todavía no usa Dataverse. Para que los datos sean los mismos en todos tus equipos hay que crear las tablas en Dataverse y cambiar el objeto `DB` (archivo `src/01-nucleo.js`) para que use la **Web API de Power Pages**. La app ya está preparada: todo el acceso a datos pasa por ese objeto.
- Power Pages requiere licencia (hay prueba de 30 días y entornos de desarrollador). Confirma qué tienes disponible antes de depender de él.

## 6. Estructura del código
```
PlataformaGestion/
├── PlataformaGestion.html        ← archivo final (ábrelo o publícalo)
├── PowerPages-WebTemplate.html   ← mismo contenido, listo para pegar en Power Pages
├── construir.js                  ← une los archivos de src/ y ejecuta la validación de seguridad
├── seguridad.js                  ← validación automática de seguridad
├── SEGURIDAD-AUTOMATICA.md       ← resultado de la última validación
├── pruebas/ataque.js             ← pasada adversarial en navegador (Playwright)
└── src/
    ├── plantilla.html            estructura HTML
    ├── estilos.css               estilos y variables de color
    ├── 01-nucleo.js              utilidades, almacenamiento, formularios, CSV, ZIP, cifrado
    ├── 02-app-proyectos.js       navegación, Inicio, Proyectos, Bitácora, Actividades
    ├── 03-escuela-agenda.js      Escuela, línea de tiempo, evaluación, Agenda, Recordatorios
    ├── 04-notas-accesos.js       Notas, Accesos directos, Cumpleaños, Frases
    ├── 05-ajustes-datos.js       Ajustes, exportar/importar, respaldo
    └── 06-inicio.js              datos de ejemplo y arranque
```
Para modificar: edita los archivos de `src/` y ejecuta `node construir.js` (requiere Node.js). Si no tienes Node, puedes editar directamente `PlataformaGestion.html`.

## 7. Pruebas realizadas (navegador Chromium automatizado)
Carga de datos de ejemplo y recorrido de todas las pantallas sin errores de consola; alta rápida y con formulario; validación de fechas; cambio de estatus; calificaciones válidas e inválidas; cálculo de evaluación; notas privadas (creación, contraseña incorrecta, desbloqueo, verificación de que el texto no queda legible en el almacenamiento); persistencia tras recargar; exportación ZIP (integridad verificada); respaldo y restauración completa con imágenes; importación CSV formato AcadTrack y LinkManager (incluye rechazo de filas inválidas y de direcciones `javascript:`); importación `.ics`; tema oscuro; vista móvil sin desbordes.

**No probado:** Firefox/Safari, publicación real en Power Pages, notificaciones del sistema, volúmenes grandes (miles de registros).
