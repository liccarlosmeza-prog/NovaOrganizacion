# Noticias e investigación con Claude → nova-datos → Nova Organización

## Flujo
1. En Nova: **Noticias → Instrucción para Claude**. Ajusta los temas y palabras clave, pulsa **Copiar instrucción**.
2. Pega la instrucción en una conversación de Claude **con acceso de escritura a tu repositorio privado `nova-datos`** (por ejemplo, una sesión de Claude Code con ese repositorio). Para investigar algo puntual, agrega al final: «Investiga además: …».
3. Claude crea un archivo por noticia en `noticias/` de la rama principal.
4. En Nova: **Actualizar desde nova-datos** (en la pantalla Noticias o en la tarjeta de Inicio).
5. Lee, guarda, conviértela en nota o actividad, y **Elimínala** cuando termines: va a la papelera 7 días y se borra el archivo de `nova-datos`.

## Formato del archivo (`noticias/AAAA-MM-DD-hhmm-tema-palabra.json`)
```json
{
  "formato": "nova-noticia", "v": 1,
  "tipo": "noticia",
  "tema": "Seguridad",
  "titulo": "…",
  "resumen": "…",
  "puntos": ["…", "…"],
  "fuentes": [{ "medio": "…", "titulo": "…", "url": "https://…", "fecha": "2026-11-17" }],
  "etiquetas": ["…"],
  "relevancia": "alta",
  "consulta": "palabras clave usadas",
  "fecha": "2026-11-17T08:10:00-06:00"
}
```
| Campo | Reglas que aplica Nova al leerlo |
|---|---|
| `formato` | Obligatorio y exactamente `nova-noticia`; si no, el archivo se ignora |
| `titulo` | Obligatorio; máx. 300 caracteres |
| `tipo` | `noticia` o `investigacion` (cualquier otro valor = noticia) |
| `tema` | Seguridad, IA, Power Platform, Desarrollo web (otro texto se acepta tal cual, máx. 60) |
| `resumen` | Máx. 8 000 caracteres; respeta saltos de línea |
| `puntos` | Máx. 20, de 600 caracteres |
| `fuentes` | Máx. 20; sólo se enlazan direcciones `https://` (las demás se muestran sin enlace) |
| `etiquetas` | Máx. 10, de 40 caracteres |
| `relevancia` | `alta`, `media` o `baja` (otro valor = media) |
| `fecha` | ISO 8601; si no es válida se usa la hora de recepción |
| Tamaño | Máx. 100 KB por archivo y 300 archivos en `noticias/` |

## Importante
- Claude no debe tocar `datos.json` ni `img/`: son los datos cifrados de Nova.
- Las noticias **no van cifradas** (Claude no conoce tu contraseña de sincronización): es información pública dentro de un repositorio privado.
- Recomendado: que Claude use la herramienta de GitHub para crear archivos (no `git push`), porque Nova reemplaza el historial del repositorio en cada sincronización.
- Sin GitHub: **Importar .json** acepta los mismos archivos, y **Carga masiva** acepta CSV.
