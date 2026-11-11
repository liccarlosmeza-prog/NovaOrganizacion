# Plantillas de carga masiva

Ábrelas con Excel, llénalas y guárdalas como **CSV UTF-8 (delimitado por comas)**.

## materias.csv
| Columna | Obligatoria | Formato |
|---|---|---|
| ciclo | Sí | Texto, p. ej. `2026-B` |
| clave | Sí | Única por ciclo; se usa para ligar actividades |
| materia | Sí | Texto |
| profesor, horario | No | Texto |
| color | No | Hexadecimal `#RRGGBB` |
| creditos | No | Número |

## actividades_escolares.csv
| Columna | Obligatoria | Formato |
|---|---|---|
| clave_materia | Sí | Debe existir en materias |
| titulo | Sí | Texto |
| tipo | No | tarea, foro, examen, proyecto, lectura, exposicion |
| fecha_inicio | No | `AAAA-MM-DD` o `DD/MM/AAAA` (si falta, se usa la fecha de entrega) |
| fecha_entrega | Sí | `AAAA-MM-DD` o `DD/MM/AAAA`; debe ser ≥ fecha_inicio |
| hora_entrega | No | `HH:MM` (24 h); por defecto 23:59 |
| valor_porcentaje | No | 0–100 (porcentaje de la calificación final) |
| horas_estimadas | No | Número decimal; por defecto 1 |
| estatus | No | pendiente, en curso, entregada, calificada |
| calificacion | No | 0–100 |
| comentarios | No | Texto |

Al importar, la app muestra una vista previa, marca filas con error (p. ej. fecha inválida o materia inexistente) y sólo guarda las válidas.
