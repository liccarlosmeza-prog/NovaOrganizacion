# NovaOrganización — Propuesta inicial (Etapas 1 a 3)

> Estado: **borrador para autorización**. No se ha iniciado el desarrollo.
> Fecha: 2026-11-11

---

## 1. Análisis

### 1.1 Objetivo
Un espacio personal único para dar seguimiento a **proyectos (personales, de trabajo y escolares)**, su bitácora de avances, notas, ideas, imágenes y checklists; consultar la **agenda del día** (incluida la de trabajo desde Microsoft Teams/Outlook), ver la **carga de trabajo escolar por día** y tener presentes los **cumpleaños**. Todo debe poder **importarse y exportarse**.

### 1.2 Problema actual
La información está dispersa (Teams/Outlook, plataforma escolar, notas sueltas, fotos en el teléfono). No hay una vista consolidada de "qué tengo hoy", "cómo va cada proyecto" ni "qué días voy a estar saturado".

### 1.3 Usuario
Un solo usuario (tú), en computadora y ocasionalmente en el celular; también desde una pestaña dentro de Teams.

### 1.4 Reglas de negocio
| # | Regla |
|---|-------|
| RN-01 | Todo proyecto pertenece a un **ámbito**: Personal, Trabajo o Escuela (catálogo editable). |
| RN-02 | Todo proyecto tiene un **estatus** de un catálogo editable (p. ej. Idea, Planeado, En curso, En revisión, Pausado, Terminado, Cancelado). |
| RN-03 | Las tareas pertenecen opcionalmente a un proyecto; pueden tener fecha límite, prioridad, esfuerzo estimado (horas) y subtareas tipo checklist. |
| RN-04 | La **bitácora** es cronológica y de solo agregar: cada entrada registra fecha/hora, texto, tipo (avance, nota, idea, decisión, revisión) y adjuntos. Se puede editar, pero queda marca de "editado". |
| RN-05 | Las **sesiones de revisión** son eventos ligados a un proyecto y aparecen en la agenda. |
| RN-06 | La **carga del día** = suma de horas estimadas de tareas con vencimiento ese día + duración de eventos. Se pinta como mapa de calor (verde → rojo) con umbrales configurables. |
| RN-07 | Los cumpleaños se repiten anualmente; se avisa con N días de anticipación (configurable) y se muestran en el panel "Hoy". |
| RN-08 | Los eventos importados de Teams/Outlook son de **solo lectura** dentro de la app (la fuente de verdad sigue siendo Outlook). |
| RN-09 | Ningún dato se borra sin confirmación; la eliminación de proyectos manda primero a "Archivados". |

### 1.5 Requerimientos funcionales
- **RF-01 Panel "Hoy"**: agenda del día (propia + Teams), tareas que vencen hoy y vencidas, revisiones próximas, cumpleaños cercanos, proyectos activos con su avance.
- **RF-02 Proyectos**: crear/editar/archivar; ámbito, estatus, fechas, color, etiquetas, porcentaje de avance (calculado por tareas o manual).
- **RF-03 Detalle de proyecto** con pestañas: Resumen · Tareas/Checklist · Bitácora · Notas e ideas · Galería de imágenes · Revisiones.
- **RF-04 Vista Kanban** de proyectos por estatus (arrastrar para cambiar estatus).
- **RF-05 Tareas**: lista con filtros (ámbito, proyecto, prioridad, fecha), checklist anidado, vista "Pendientes".
- **RF-06 Notas e ideas**: texto con formato básico (Markdown), etiquetas, búsqueda; una idea puede convertirse en proyecto o tarea.
- **RF-07 Imágenes**: adjuntar a bitácora/notas por arrastrar, pegar (Ctrl+V) o cámara del celular; compresión automática.
- **RF-08 Agenda**: vistas día, semana y mes; eventos propios y de Teams; colores por ámbito.
- **RF-09 Carga escolar**: mapa de calor mensual (tipo calendario de contribuciones) y gráfica semanal de horas por día, filtrable por ámbito.
- **RF-10 Cumpleaños**: alta de personas, fecha, relación, nota (ideas de regalo); próximos 30 días visibles.
- **RF-11 Integración Teams**: (a) la app se puede abrir como **pestaña en Teams**; (b) leer la agenda del día del calendario de Outlook/Teams.
- **RF-12 Importar/Exportar**: ver sección 2.6.
- **RF-13 Búsqueda global** (Ctrl+K) en proyectos, tareas, notas y bitácora.
- **RF-14 Personalización**: catálogos editables (estatus, ámbitos, etiquetas), tema claro/oscuro, widgets del panel "Hoy" activables y reordenables.

### 1.6 Requerimientos no funcionales
- Interfaz moderna, limpia, tonos azul/gris; adaptable a escritorio y celular.
- Funciona **sin conexión** para los datos propios (la agenda de Teams sí requiere conexión).
- Respuesta < 200 ms en listas de hasta ~10,000 registros.
- Datos privados: no salen del dispositivo salvo que tú decidas sincronizar o exportar.
- Respaldo fácil (un clic) y restauración validada.
- Código mantenible: separación datos / lógica / presentación.

### 1.7 Restricciones y riesgos (importante)
| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Leer la agenda de Teams requiere Microsoft Graph** con registro de app en Microsoft Entra ID (Azure AD). En cuentas de trabajo el administrador puede bloquear el consentimiento de usuarios. | Alto: sin permiso no hay lectura automática. | Plan B sin permisos: importar el archivo **.ics** exportado de Outlook o el enlace ICS publicado. Verificar con TI antes de la Fase 3. |
| Una app que guarda datos **solo en el navegador** no se sincroniza entre PC, celular y Teams (la pestaña de Teams tiene su propio almacenamiento). | Alto para uso diario en varios dispositivos. | Fase 1 local + respaldo JSON; Fase 4 sincronización en la nube. La capa de datos se diseña desde el inicio para poder cambiar de motor sin reescribir la app. |
| Imágenes ocupan mucho espacio. `localStorage` solo admite ~5 MB. | Medio. | Usar **IndexedDB** (cientos de MB) y comprimir imágenes a WebP ~1600 px. |
| Mezclar información personal en el tenant de trabajo. | Medio (políticas de la empresa). | La app no guarda nada en servidores de la empresa; solo lee el calendario. Revisar política interna. |
| Para abrirla dentro de Teams se necesita una URL **HTTPS pública**. | Bajo. | Azure Static Web Apps (plan gratuito) o GitHub Pages. |

---

## 2. Diseño

### 2.1 Alternativas de arquitectura evaluadas
| Opción | Ventajas | Desventajas | Costo |
|---|---|---|---|
| A. Un solo archivo HTML local | Cero infraestructura | No se puede usar en Teams ni con Graph (requiere HTTPS y dominio registrado); sin sincronización | $0 |
| **B. Web app estática (PWA) + IndexedDB, publicada en Azure Static Web Apps** | Funciona offline, instalable en PC/celular, se agrega como pestaña de Teams, permite login Microsoft para Graph | Datos locales por dispositivo hasta la Fase 4 | $0 (plan Free) |
| C. App completa con backend y BD desde el día 1 (Azure Functions + Azure SQL) | Sincronización inmediata | Más tiempo antes de tener algo usable; más mantenimiento | $0–$5 USD/mes con niveles gratuitos |

**Recomendación: B, evolucionando a C (Fase 4).** Obtienes una herramienta usable rápido, sin costo, y la capa de datos se construye con un "repositorio" intercambiable (IndexedDB hoy → API + SQL mañana) para no reconstruir.

> Nota sobre "un solo HTML": para la Fase 1 se puede entregar además una versión empaquetada en un único archivo HTML para uso local, pero la integración con Teams/Graph exige que esté publicada.

### 2.2 Stack propuesto
- **Frontend**: React + Vite (TypeScript opcional; recomiendo JavaScript con JSDoc para empezar y migrar después).
- **Estilos**: CSS con variables (tokens de diseño) o Tailwind; íconos Lucide.
- **Datos locales**: IndexedDB mediante **Dexie.js** (ligero, consultas indexadas).
- **Calendario**: FullCalendar (vistas día/semana/mes) o componente propio ligero.
- **Gráficas**: Chart.js o mapa de calor propio en SVG.
- **Markdown**: marked + DOMPurify (evita inyección de código).
- **Microsoft**: MSAL.js (login) + Microsoft Graph `GET /me/calendarView` (permiso delegado `Calendars.Read`); Teams JS SDK para la pestaña.
- **Exportación**: JSON nativo, CSV (PapaParse), ICS (generación propia), ZIP con imágenes (JSZip), Excel opcional (SheetJS).
- **Publicación**: Azure Static Web Apps (Free) con despliegue automático desde GitHub.

### 2.3 Arquitectura lógica
```
┌──────────────────────────── Navegador / Pestaña Teams ────────────────────────────┐
│  UI (React)  →  Servicios de dominio  →  Repositorio de datos (interfaz común)     │
│  Hoy · Proyectos · Agenda · Carga · Notas · Cumpleaños · Ajustes                   │
│                                   │                         │                      │
│                          ImportExportService         ┌──────┴───────┐              │
│                          (JSON/CSV/ICS/ZIP)          │ IndexedDB    │ (Fase 1-3)   │
│                                                      │ API REST     │ (Fase 4)     │
│  CalendarProvider ── Local                           └──────────────┘              │
│                   ── ICS (archivo/URL)                                             │
│                   ── Microsoft Graph (MSAL) ──► Outlook/Teams                      │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Modelo de datos (relacional, preparado para SQL)
| Tabla | Campos principales | Relaciones |
|---|---|---|
| `ambito` | id, nombre, color, icono, orden | catálogo |
| `estatus` | id, nombre, color, orden, es_final | catálogo |
| `etiqueta` | id, nombre, color | catálogo |
| `proyecto` | id, nombre, descripcion, ambito_id, estatus_id, fecha_inicio, fecha_objetivo, avance_modo (auto/manual), avance, color, archivado, creado, actualizado | FK ámbito, estatus |
| `proyecto_etiqueta` | proyecto_id, etiqueta_id | N:M |
| `tarea` | id, proyecto_id?, padre_id?, titulo, detalle, prioridad (1-4), fecha_limite, hora, horas_estimadas, completada, completada_en, orden | FK proyecto; autorrelación para checklist |
| `bitacora` | id, proyecto_id, fecha_hora, tipo (avance/nota/idea/decision/revision), contenido_md, editado_en | FK proyecto |
| `nota` | id, proyecto_id?, titulo, contenido_md, es_idea, fijada, creado, actualizado | FK proyecto opcional |
| `nota_etiqueta` | nota_id, etiqueta_id | N:M |
| `adjunto` | id, entidad_tipo (bitacora/nota/proyecto), entidad_id, nombre, mime, tamano, blob/miniatura, creado | polimórfica |
| `evento` | id, proyecto_id?, titulo, inicio, fin, todo_el_dia, tipo (revision/clase/entrega/reunion/otro), ubicacion, origen (local/ics/graph), origen_id, solo_lectura | FK proyecto |
| `persona_cumple` | id, nombre, dia, mes, anio?, relacion, nota, avisar_dias | — |
| `ajuste` | clave, valor | configuración y widgets |

Todos los `id` son UUID para que la importación/sincronización no genere choques. Índices: `tarea(fecha_limite)`, `tarea(proyecto_id)`, `evento(inicio)`, `bitacora(proyecto_id, fecha_hora)`.

### 2.5 Pantallas y navegación
```
Barra lateral (colapsable en móvil → barra inferior)
├── Hoy (inicio)            widgets: Agenda del día · Pendientes hoy/vencidos · Revisiones
│                           próximas · Cumpleaños · Proyectos activos · Carga de la semana
├── Proyectos               Tabla | Tarjetas | Kanban  — filtros por ámbito/estatus/etiqueta
│   └── Detalle             Resumen · Tareas · Bitácora · Notas/Ideas · Imágenes · Revisiones
├── Tareas                  Lista agrupada (Hoy, Esta semana, Después, Sin fecha) + checklist
├── Agenda                  Día / Semana / Mes — capas: Local, Escuela, Teams, Cumpleaños
├── Carga de trabajo        Mapa de calor mensual + barras por día de la semana + detalle del día
├── Notas e ideas           Muro de tarjetas, búsqueda, convertir idea → proyecto/tarea
├── Cumpleaños              Próximos, lista completa, alta rápida
└── Ajustes                 Catálogos · Widgets · Tema · Conexión Microsoft · Importar/Exportar · Respaldo
```
Acciones globales: botón **"+ Nuevo"** (proyecto, tarea, nota, entrada de bitácora, evento, cumpleaños) y búsqueda **Ctrl+K**.

Wireframe del panel "Hoy" (escritorio):
```
┌─────────┬───────────────────────────────────────────────────────────────┐
│ ☰ Nova  │  Miércoles 11 nov            [Buscar Ctrl+K]   [+ Nuevo]      │
│         ├──────────────────────┬────────────────────┬───────────────────┤
│ Hoy     │ AGENDA DE HOY        │ PENDIENTES          │ CUMPLEAÑOS        │
│ Proyect │ 09:00 Daily (Teams)  │ ☐ Entregar act. 3   │ 🎂 Ana — hoy      │
│ Tareas  │ 11:00 Revisión App X │ ☐ Revisar SQL       │ 🎂 Luis — en 4 d  │
│ Agenda  │ 18:00 Clase BD       │ ⚠ 2 vencidas        │                   │
│ Carga   ├──────────────────────┴────────────────────┴───────────────────┤
│ Notas   │ PROYECTOS ACTIVOS  [Trabajo][Escuela][Personal]               │
│ Cumple  │ App Los Robles   ████████░░ 80%  En revisión  · rev. viernes  │
│ Ajustes │ Tarea BD         ███░░░░░░░ 30%  En curso     · vence lunes   │
│         ├───────────────────────────────────────────────────────────────┤
│         │ CARGA DE LA SEMANA  L▇ M▇▇▇ X▇▇ J▇▇▇▇▇ V▇ S░ D░                │
└─────────┴───────────────────────────────────────────────────────────────┘
```

### 2.6 Importación y exportación
| Formato | Exportar | Importar | Uso |
|---|---|---|---|
| **JSON completo** (con imágenes en Base64) o **ZIP** (JSON + carpeta de imágenes) | ✔ | ✔ | Respaldo total y migración entre dispositivos |
| **CSV** por entidad (proyectos, tareas, eventos, cumpleaños, notas) | ✔ | ✔ (con mapeo de columnas y vista previa) | Excel, Power BI, cargas masivas |
| **ICS** (iCalendar) | ✔ eventos, entregas y cumpleaños | ✔ desde Outlook/Google/plataforma escolar | Calendarios |
| **Markdown** | ✔ bitácora y notas de un proyecto | ✔ notas | Documentación |
| **Excel (.xlsx)** | ✔ (opcional, Fase 2) | ✔ plantilla | Cargas de actividades escolares |

Reglas de importación: vista previa antes de guardar, validación de campos obligatorios y fechas, modo **"combinar"** (por id) o **"reemplazar todo"** (con respaldo automático previo), reporte de filas rechazadas.

### 2.7 Integración con Microsoft Teams
1. **Abrir la app dentro de Teams** — dos niveles:
   - Rápido: en un chat o canal → "+" → **Sitio web** → pegar la URL publicada.
   - Formal: paquete de app de Teams (manifest + íconos) como **pestaña personal**, instalable desde "Aplicaciones → Cargar una app personalizada" (si tu organización lo permite).
2. **Leer la agenda del día**:
   - Opción recomendada: **Microsoft Graph** con inicio de sesión de tu cuenta de trabajo (permiso `Calendars.Read`, solo lectura). Requiere registrar la app en Entra ID (gratuito).
   - Opción sin permisos de TI: importar el **.ics** exportado de Outlook o suscribirse al calendario publicado.

### 2.8 Validaciones y seguridad
- Campos obligatorios, fechas coherentes (fin ≥ inicio), tamaños máximos de imagen, tipos de archivo permitidos.
- Sanitización del Markdown (DOMPurify) para evitar scripts maliciosos.
- Tokens de Microsoft solo en memoria/sessionStorage gestionados por MSAL; nunca se exportan.
- Confirmación en eliminaciones y en "reemplazar todo" al importar.

---

## 3. Planificación

| Fase | Contenido | Entregable | Criterios de aceptación |
|---|---|---|---|
| **0. Prototipo visual** | Maqueta navegable del panel "Hoy", Proyectos y Detalle con datos de ejemplo | HTML navegable | Apruebas estilo, distribución y navegación |
| **1. Núcleo local (MVP)** | Proyectos, estatus, tareas/checklist, bitácora, notas/ideas, imágenes, cumpleaños, panel "Hoy", búsqueda, respaldo JSON | PWA funcional offline | Crear proyecto → registrar avances con imágenes → exportar y restaurar sin pérdida |
| **2. Agenda y carga** | Agenda día/semana/mes, eventos y revisiones, mapa de calor de carga, importación/exportación CSV, ICS, Markdown, ZIP | Versión 1.1 | Ver el día más cargado del mes; importar un .ics de Outlook |
| **3. Publicación y Teams** | Publicar en Azure Static Web Apps, pestaña en Teams, login Microsoft + Graph para agenda del día | URL pública + paquete Teams | Ver en Teams la agenda real del día |
| **4. Sincronización (opcional)** | API (Azure Functions) + base de datos (Azure SQL gratuito) con autenticación; misma información en PC, celular y Teams | Versión 2.0 | Un cambio en el celular aparece en la PC |
| **5. Evolución** | Recordatorios/notificaciones, plantillas de proyecto, reportes, resumen semanal con IA, Power BI | Mejoras incrementales | Según prioridades |

Dependencias: Fase 3 depende de que la organización permita el registro de la app (verificar con TI en paralelo a la Fase 1). Fase 4 depende de la 3 (autenticación).

### Costos estimados
| Concepto | Costo |
|---|---|
| Azure Static Web Apps (Free) | $0 |
| Registro de app en Entra ID | $0 |
| Microsoft Graph (calendario) | $0 |
| Azure Functions (plan de consumo, uso personal) | $0 dentro del nivel gratuito |
| Azure SQL Database (oferta gratuita) | $0 dentro de límites; tras exceder, desde ~$5 USD/mes |
| Dominio propio (opcional) | ~$12 USD/año |

---

## 4. Decisiones pendientes
1. ¿Usarás la app en **varios dispositivos** desde el inicio? (define si adelantamos la Fase 4).
2. ¿Tu cuenta de trabajo permite **registrar aplicaciones / cargar apps personalizadas en Teams**? (define Graph vs. ICS).
3. ¿La escuela usa alguna plataforma (Moodle, Classroom, etc.) con exportación de calendario ICS?
4. ¿Prefieres comenzar con el **prototipo visual (Fase 0)** antes de programar el núcleo?
