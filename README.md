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
| 3 | Perfil del Estudiante | Ficha de encargados (con consentimientos de fotos y divulgación de notas); Modo Kiosco (tablet del salón) + `ficha-padres.html` (enlace/QR público, auth anónima); vista de detalle, impresión a PDF, y exportación a Excel |
| 4 | Asistencia | Matriz mensual (L-V), códigos 1/0/T/J/IMP/GO/NC (GO y NC cascadean a todo el grupo), totales automáticos, Bitácora Anual |
| 5 | Evaluaciones | Tabulación por partes, envío a BigDreamers (nuevo instrumento o agregar a uno existente) |
| 6 | Citaciones e Intervenciones | Standalone, siempre atadas a un estudiante, exporta a PDF vía impresión |

## Colecciones de Firestore

`estudiantes` · `perfiles_estudiantes` · `asistencia` · `instrumentos` · `citaciones` · `intervenciones` · `configuracion` (docs `anoEscolar` y `escuela`)

## Seguridad

Todo bloqueado por defecto. Tres niveles de acceso en las reglas de Firestore:
- Tu cuenta autenticada (`de128954@miescuela.pr`): lectura/escritura total.
- Sesión anónima (usada solo por `ficha-padres.html`): lectura de nombres en `estudiantes`, y solo **crear** documentos en `perfiles_estudiantes` — nunca leer, editar ni borrar.
- Cualquier otra persona: bloqueado por completo.

Las reglas completas están documentadas dentro de `js/firebase-config.js`.

**Importante — colisión de sesión:** como `ficha-padres.html` usa el mismo proyecto de Firebase, abrirla en el mismo navegador donde ya tienes tu sesión de maestro iniciada puede reemplazar tu sesión real con la anónima (Firebase Auth persiste por navegador, no por pestaña). `js/auth.js` ya se protege de esto — solo trata como "sesión de maestro válida" un login que sea exactamente tu correo y no anónimo, y cierra activamente cualquier otra sesión que detecte. Aun así, prueba el enlace público en una ventana de incógnito o navegador distinto.

## Conexiones externas

- **BigDreamers** (`bigdreamers-e7afb`, proyecto Firebase separado): Fase 5 envía notas ahí, replicando el mismo patrón que ya usa DreamQuiz (`sendToBD`). El emparejamiento de estudiantes por nombre se guarda como `bigdreamersId` en el documento del estudiante la primera vez, para no repetir la comparación de texto después. Soporta crear instrumento nuevo o agregar a uno existente.

## Notas de mantenimiento

- Los `<select>` tienen una regla CSS explícita (`select option { color/background }`) porque el navegador ignora el tema oscuro de la página en el menú desplegable nativo — sin esa regla el texto queda invisible (blanco sobre blanco).
- `js/auth.js` valida el correo exacto del maestro, no solo "hay una sesión" — ver nota de seguridad arriba.
