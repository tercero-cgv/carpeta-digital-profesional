# Digital Space Roll Book 🛰️

Carpeta profesional digital para Tercer Grado — Héctor Lozada Lacén, Escuela Celso González Vaillant (Loíza, PR).

Prototipo web con tema espacial. HTML/CSS/JS puro (sin build, sin npm) + Firebase (Auth + Firestore).
Se despliega directo a GitHub Pages subiendo los archivos tal cual.

## Cómo abrirlo

Producción: `https://tercero-cgv.github.io/carpeta-digital-profesional/`

Local (solo para pruebas — los módulos JS no cargan con doble clic por CORS de `file://`):
doble clic en `iniciar-servidor-local.bat` → abre `http://localhost:8000` (requiere Python instalado).

## Módulos (fases)

| Fase | Módulo | Qué hace |
|---|---|---|
| 1 | Autenticación y Navegación | Login con Firebase Auth (solo tu correo), shell del dashboard |
| 2 | Lista de Estudiantes | Roster central — fuente de verdad para todo lo demás |
| 3 | Perfil del Estudiante | Ficha de encargados; Modo Kiosco (tablet del salón) + `ficha-padres.html` (enlace/QR público, auth anónima) |
| 4 | Asistencia | Matriz mensual (L-V), códigos 1/0/T/J/IMP/GO/NC, totales automáticos, Bitácora Anual |
| 5 | Evaluaciones | Tabulación por partes, envío a BigDreamers (proyecto Firebase separado) |
| 6 | Citaciones e Intervenciones | Standalone, siempre atadas a un estudiante, exporta a PDF vía impresión |

## Colecciones de Firestore

`estudiantes` · `perfiles_estudiantes` · `asistencia` · `instrumentos` · `citaciones` · `intervenciones` · `configuracion` (docs `anoEscolar` y `escuela`)

## Seguridad

Todo bloqueado por defecto. Dos niveles de acceso en las reglas de Firestore:
- Tu cuenta autenticada (`de128954@miescuela.pr`): lectura/escritura total.
- Sesión anónima (usada solo por `ficha-padres.html`): lectura de nombres en `estudiantes`, y solo **crear** documentos en `perfiles_estudiantes` — nunca leer, editar ni borrar.

Las reglas completas están documentadas dentro de `js/firebase-config.js`.

## Conexiones externas

- **BigDreamers** (`bigdreamers-e7afb`, proyecto Firebase separado): Fase 5 envía notas ahí, replicando el mismo patrón que ya usa DreamQuiz (`sendToBD`). El emparejamiento de estudiantes por nombre se guarda como `bigdreamersId` en el documento del estudiante la primera vez, para no repetir la comparación de texto después.

## Pendiente / mejoras futuras

- "Enviar a BigDreamers" solo crea instrumento nuevo — falta la opción de "agregar a instrumento existente" que sí tiene DreamQuiz.
- Sin borrado permanente de estudiantes (solo baja lógica, `activo: false`) — a propósito, para no dejar huérfanos los registros de asistencia/evaluaciones.
