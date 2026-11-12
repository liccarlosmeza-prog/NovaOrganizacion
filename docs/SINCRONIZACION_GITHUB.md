# Sincronización con un repositorio privado de GitHub

Permite usar Nova Organización con los mismos datos en varios equipos. Es opcional: si no la activas, la plataforma no hace ninguna conexión.

> **Estado de las pruebas:** verificada con un GitHub simulado (`PlataformaGestion/pruebas/sincronizacion.js`). **No se ha probado contra GitHub real**; la primera prueba real la haces tú con los pasos de abajo. Antes de conectar, descarga un respaldo en Ajustes → Datos.

## 1. Crear el repositorio privado (una sola vez)
1. Entra a <https://github.com/new>.
2. **Repository name:** `nova-datos`.
3. Elige **Private**.
4. Marca **Add a README file** (obligatorio: no funciona en un repositorio vacío).
5. **Create repository**.

Usa un repositorio dedicado. Los archivos que no son de Nova se conservan, pero el historial del repositorio se reemplaza en cada sincronización.

## 2. Crear el token de acceso (uno por equipo, o el mismo en todos)
1. Entra a <https://github.com/settings/personal-access-tokens/new>.
2. **Token name:** `Nova sincronización`.
3. **Expiration:** 90 días o un año. Al vencer se genera otro.
4. **Repository access:** *Only select repositories* → sólo `nova-datos`.
5. **Permissions → Repository permissions → Contents:** *Read and write*. Ningún otro permiso.
6. **Generate token** y cópialo (empieza con `github_pat_`; GitHub lo muestra una sola vez).

No compartas el token ni lo subas a ningún repositorio. Sólo se pega dentro de la plataforma.

## 3. Conectar el primer equipo
1. Abre la plataforma → **Ajustes → Sincronización**.
2. **Repositorio privado:** `tu-usuario/nova-datos` (también acepta la dirección completa).
3. **Token de acceso:** pega el token.
4. **Contraseña de sincronización:** mínimo 10 caracteres; es distinta de la de GitHub y de la de notas privadas. Con ella se cifran tus datos.
5. **Conectar.** Se sube lo que tengas en ese equipo.

## 4. Conectar los demás equipos
Mismos pasos, con el mismo repositorio y **la misma contraseña de sincronización**.
- Si el equipo está vacío, se traen los datos de GitHub.
- Si ya tiene datos, la plataforma pregunta cuál conservar; el otro lado se reemplaza.

## 5. Uso diario
| Situación | Qué pasa |
|---|---|
| Abres la plataforma | Revisa si hay una versión más nueva en GitHub y la trae |
| Haces cambios | Se suben solos unos 90 segundos después de dejar de editar |
| La dejas abierta | Revisa cada 5 minutos |
| Sin internet | Sigues trabajando; se sincroniza al volver la conexión |
| Editaste en dos equipos sin sincronizar | Aparece **Conflicto**: eliges conservar lo de GitHub o lo de ese equipo |

El estado se ve al pie de la barra lateral y en Ajustes → Sincronización, donde también está **Sincronizar ahora**.

## 6. Qué se guarda en GitHub
- `datos.json`: todos tus datos, **cifrados** (AES-256).
- `img/…`: cada imagen, cifrada.
- Una sola versión, sin historial. Para tener copias anteriores usa el respaldo `.json`.

GitHub no puede leer el contenido, y quien obtenga el repositorio tampoco sin la contraseña.

## 7. Problemas frecuentes
| Mensaje | Causa y solución |
|---|---|
| El token no es válido o ya venció | Genera un token nuevo, **Desconectar este equipo** y vuelve a conectar |
| No se encontró el repositorio… | El nombre está mal o el token no incluye ese repositorio |
| GitHub rechazó la operación | Al token le falta *Contents: Read and write* |
| El repositorio está vacío | Créalo con README, o agrega un archivo desde GitHub |
| El repositorio es público | Cámbialo a privado en Settings → General → Danger Zone |
| La contraseña de sincronización no es la que se usó… | Usa la misma contraseña con la que conectaste el primer equipo |
| No se pudo descifrar… | El archivo fue modificado fuera de la plataforma; sube de nuevo desde un equipo con los datos correctos |

## 8. Lo que debes saber
- **Si olvidas la contraseña de sincronización, los datos de GitHub no se pueden recuperar.** Los de cada equipo siguen ahí; puedes desconectar, vaciar el repositorio y volver a conectar con una contraseña nueva.
- El token y la clave se guardan en el navegador de cada equipo. En GitHub Pages, **otras páginas publicadas en la misma cuenta podrían leerlos**: no publiques otras páginas en esa cuenta mientras uses la sincronización.
- **Desconectar este equipo** borra de ahí el token y la clave; no borra datos.
- Para revocar el acceso de un equipo perdido: elimina el token en GitHub (Settings → Developer settings → Personal access tokens).
