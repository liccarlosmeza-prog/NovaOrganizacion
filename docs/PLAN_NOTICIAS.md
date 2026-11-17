# Plan — Noticias e investigación (propuesta para validar)

Estado: **implementado en la v0.11** (aprobado por el usuario: eliminar como en Notas; temas Seguridad, IA, Power Platform —actualizaciones de sus aplicaciones— y Desarrollo web; las leídas se conservan hasta eliminarlas). Formato e instrucción: `docs/NOTICIAS_CLAUDE.md`. Maquetas en `docs/mockups/noticias/` (datos de ejemplo).

## 1. Objetivo
Pedir a Claude búsquedas de noticias (seguridad, IA, Power Platform…) o investigaciones por palabras clave. Claude guarda cada resultado en el repositorio privado **nova-datos**; Nova Organización lo lee, lo muestra en una pantalla **Noticias** y en una tarjeta de **Inicio**, y al terminar de leerlo puedes eliminarlo (también del repositorio).

```
Tú → Claude (búsqueda) → nova-datos/noticias/*.json → Nova (Actualizar) → leer → marcar / guardar / eliminar
```

## 2. Benchmark de aplicaciones de noticias
Basado en el funcionamiento conocido de cada aplicación; no es una medición nueva.

| Aplicación | Patrón de visualización | Qué tomamos | Qué no |
|---|---|---|---|
| **Feedly** | Lista con 3 densidades (título, revista, tarjetas); «Leer después»; temas por palabras clave; IA que resume | Lista por título, temas y palabras clave, «Guardar» | Tarjetas e imágenes grandes |
| **Inoreader** | Tres paneles (fuentes · lista · lectura), contadores de no leídas, reglas y filtros | Lista + panel de lectura, contador de no leídas, filtros | Árbol de carpetas (sobra para un solo usuario) |
| **NetNewsWire** | Tres paneles muy limpios, punto azul de «no leída», agrupado por fecha | Punto de no leída, agrupado Hoy / Ayer / fecha, títulos en negrita si no se han leído | — |
| **Readwise Reader** | Bandeja tipo correo (Inbox / Later / Archive), resumen de IA, resaltados | Estados Sin leer · Todas · Guardadas; resumen arriba del contenido | Resaltados (fase posterior) |
| **Google News** | Titular con varias fuentes de la misma historia («cobertura completa») | Mostrar **número de fuentes** y lista de fuentes por noticia | Portadas por imagen |
| **Ground News** | Indicadores de quién reporta la historia | Medio de cada fuente visible | Gráficas de sesgo |
| **Perplexity (Discover)** | Respuesta resumida con puntos y fuentes numeradas | Formato de investigación: resumen → puntos clave → fuentes | — |
| **Hacker News** | Lista densa, sólo texto, muy rápida | Densidad alta, sin imágenes | — |

**Conclusión de diseño** (coherente con la regla de Nova: listas, no tarjetas):
1. **Dos paneles**: lista a la izquierda (agrupada por día, punto azul = sin leer, color = relevancia) y lectura a la derecha.
2. **Lectura en formato investigación**: título → metadatos (tema, tipo, búsqueda que la originó, fuentes, etiquetas) → resumen → puntos clave → fuentes (abren en pestaña nueva).
3. **Bandeja**: Sin leer · Todas · Guardadas; filtros por tema y tipo (noticia / investigación); búsqueda.
4. **Acciones**: Marcar leída, Guardar, Crear nota, Crear actividad, Eliminar.
5. **Sin imágenes externas**: más rápido, más seguro y la política de seguridad de la página ya las bloquea.
6. **Inicio**: tarjeta «Noticias sin leer» con relevancia, título, tema y hora.

## 3. Formato que Claude escribirá en nova-datos
Un archivo por noticia o investigación: `noticias/AAAA-MM-DD-hhmm-<tema>-<corto>.json`

```json
{
  "formato": "nova-noticia", "v": 1,
  "tipo": "noticia",                     // noticia | investigacion
  "tema": "Seguridad",
  "titulo": "…", "resumen": "…",
  "puntos": ["…", "…"],
  "fuentes": [{ "medio": "…", "titulo": "…", "url": "https://…", "fecha": "2026-11-17" }],
  "etiquetas": ["phishing", "banca"],
  "relevancia": "alta",                  // alta | media | baja
  "consulta": "phishing México bancos",
  "fecha": "2026-11-17T08:10:00-06:00"
}
```
Se entrega también una **instrucción reutilizable para Claude** (prompt) con este formato, para pedir: «busca noticias de seguridad de esta semana y guárdalas en nova-datos».

## 4. Arquitectura
| Pieza | Cambio |
|---|---|
| `src/056-noticias.js` (nuevo) | Lee `noticias/` de nova-datos con el **mismo token** de la sincronización, valida cada archivo, guarda las noticias en `S.noticias`, elimina en GitHub al borrar |
| Pantalla `Vistas.noticias` | Dos paneles, filtros, acciones (maqueta 01 y 03) |
| Inicio | Bloque nuevo `noticias` en `WIDGETS` (maqueta 02), configurable en Ajustes → Inicio |
| Navegación | «Noticias» con contador de sin leer |
| Papelera | Tipo nuevo `noticias`: al eliminar se quita del repositorio y queda 7 días en la papelera local para restaurarla |
| Carga masiva | Importar/exportar noticias en JSON/CSV (regla de Nova: cada pantalla con datos tiene carga masiva) |
| Sincronización | Ajuste necesario: hoy la sincronización reemplaza el repositorio con un commit sin historial. Si Claude agrega una noticia mientras Nova sincroniza, podría perderse. Antes de mover la rama se vuelve a leer: si cambió (llegó una noticia), se rehace el commit incluyendo los archivos nuevos y se reintenta. Se mantiene «una sola versión sin historial» |

**Conexiones externas:** ninguna nueva. Sólo `https://api.github.com`, ya autorizada.

## 5. Seguridad (lo que se validará)
- El contenido viene de búsquedas en internet: **dato no confiable**. Todo el texto se escapa con `esc()`; las direcciones pasan por `urlSegura()` (sólo `https`), con `rel="noopener noreferrer"`.
- Validación de cada archivo: ruta `noticias/*.json`, máximo 100 KB por archivo, 300 archivos, campos y longitudes fijas; los que no cumplen se ignoran con aviso.
- Identificadores con `uid()`; nunca se usa un identificador del archivo.
- Las noticias **no van cifradas** en el repositorio (Claude no tiene tu contraseña de sincronización). Son información pública, en un repositorio privado. Tus datos personales siguen cifrados como hoy.
- Eliminar en GitHub sólo dentro de `noticias/` y sólo el archivo exacto (por su identificador de Git).
- Pruebas: `pruebas/noticias.js` con un GitHub simulado (lectura, validación, eliminación, conflicto con la sincronización) y caso de ataque nuevo en `pruebas/ataque.js` (HTML, `javascript:` en fuentes, archivos gigantes, rutas fuera de `noticias/`).

## 6. Fases y criterios de aceptación
| Fase | Entregable | Criterio |
|---|---|---|
| 1 | Formato JSON + prompt para Claude + guía | Claude crea un archivo válido en nova-datos |
| 2 | Lectura desde nova-datos y pantalla Noticias | Al pulsar «Actualizar» aparecen las noticias nuevas; sin leer con punto azul |
| 3 | Acciones y eliminación | Eliminar la quita del repositorio y la deja 7 días en la papelera |
| 4 | Tarjeta de Inicio y contador en el menú | Muestra las sin leer, configurable |
| 5 | Sincronización que respeta noticias nuevas | Una noticia agregada durante una sincronización no se pierde |
| 6 | Seguridad y documentación | `seguridad.js` APTO, ataque sin ejecución, reporte en `SEGURIDAD.md` |

## 7. Decisiones pendientes del usuario
1. ¿Aprobar el diseño de las maquetas?
2. ¿Al **marcar leída** se conserva (hasta que la elimines) o se elimina sola tras N días?
3. ¿Temas iniciales? (propuesta: Seguridad, IA, Power Platform, Desarrollo web, Escuela).
