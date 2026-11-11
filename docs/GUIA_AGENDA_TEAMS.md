# Guía: traer tu agenda de Teams/Outlook a NovaOrganización

> El calendario de Teams es el mismo calendario de Outlook. Todo lo que sigue funciona con tu cuenta de trabajo.

## 1. Prueba rápida (2 minutos) — dime el resultado

| Prueba | Cómo | Resultado que necesito |
|---|---|---|
| **P1. Publicar calendario** | Abre <https://outlook.office.com/calendar> → ⚙ Configuración → **Calendario** → **Calendarios compartidos** → sección **Publicar un calendario**. | ¿Aparece la sección y te deja elegir "Calendario" + "Puede ver todos los detalles" → **Publicar**? |
| **P2. Registro de apps** | Abre <https://entra.microsoft.com> con tu cuenta de trabajo → **Aplicaciones** → **Registros de aplicaciones** → **Nuevo registro**. | ¿Te deja crear el registro o muestra "No tiene permisos"? (No guardes nada todavía.) |
| **P3. Power Automate** | Abre <https://make.powerautomate.com> → **Crear** → **Flujo de nube programado**. Busca la acción **"Obtener vista de calendario de eventos (V3)"** (Office 365 Outlook). | ¿Aparece la acción y puedes seleccionar tu calendario? |

Con esas tres respuestas decido la opción definitiva:
- P2 = sí → **Opción A** (en vivo, la mejor).
- P2 = no, P1 = sí → **Opción B** (automática con enlace).
- P1 y P2 = no, P3 = sí → **Opción C** (Power Automate).
- Todo = no → **Opción D** (archivo manual).

---

## Opción A — Conexión directa con Microsoft Graph
Lo que haré yo: registrar la app y agregar el botón **"Conectar Outlook"** en Ajustes.
Lo que harás tú: iniciar sesión una vez con tu cuenta de trabajo y aceptar el permiso **"Leer tus calendarios"** (solo lectura).
Si aparece "Se necesita aprobación del administrador", pide a TI aprobar el permiso delegado `Calendars.Read` para la app *NovaOrganización*.

## Opción B — Enlace ICS publicado
1. En Outlook web → Configuración → Calendario → Calendarios compartidos → **Publicar un calendario**.
2. Elige *Calendario* y *Puede ver todos los detalles* (o *Solo disponibilidad* si prefieres privacidad) → **Publicar**.
3. Copia el **vínculo ICS** (no el HTML).
4. En NovaOrganización → Ajustes → Microsoft Teams → **Suscribirse a calendario ICS** → pega el vínculo.

⚠ Cualquiera con el vínculo puede ver tu calendario. No lo compartas; si se filtra, usa **Restablecer vínculos** en la misma pantalla.

## Opción C — Flujo de Power Automate
Flujo de nube programado (cada día a las 6:00 y cada hora en horario laboral):
1. **Desencadenador**: Periodicidad → 1 hora.
2. **Office 365 Outlook → Obtener vista de calendario de eventos (V3)**
   - Calendario: *Calendario*
   - Hora de inicio: `utcNow()`
   - Hora de finalización: `addDays(utcNow(), 14)`
3. **Seleccionar** (Data Operation) con estas columnas:
   - `titulo` → `item()?['subject']`
   - `inicio` → `item()?['start']`
   - `fin` → `item()?['end']`
   - `ubicacion` → `item()?['location']`
   - `todo_el_dia` → `item()?['isAllDay']`
   - `origen_id` → `item()?['id']`
4. **Crear tabla CSV** con la salida de *Seleccionar*.
5. **OneDrive para la Empresa → Crear archivo**: `/NovaOrganizacion/agenda_trabajo.csv` (activa "sobrescribir" o usa *Actualizar archivo*).

Después, en NovaOrganización → Ajustes → Importar → arrastras `agenda_trabajo.csv` (o el botón **"Importar agenda de trabajo"**, que recuerda el mapeo de columnas).
Todos los conectores usados son **estándar** (incluidos en Microsoft 365, sin licencia Premium).
Más adelante, si se habilita la Opción A, este flujo deja de ser necesario.

## Opción D — Archivo manual
- **Outlook de escritorio (clásico)**: Archivo → Guardar calendario → Más opciones → intervalo "Próximos 30 días", detalle "Todos los detalles" → guarda como `.ics` → impórtalo en NovaOrganización.
- Un evento suelto: ábrelo en Outlook web → `···` → **Descargar** (.ics).

## Lo que **no** recomiendo
- Extensiones o *bookmarklets* que lean la página de Teams: son frágiles (Microsoft cambia la interfaz seguido) y pueden violar políticas de seguridad de tu empresa.
- Reenviar tu calendario a una cuenta personal: puede incumplir políticas de manejo de información.
