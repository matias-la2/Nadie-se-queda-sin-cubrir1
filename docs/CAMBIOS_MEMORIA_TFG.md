# Cambios pendientes en la Memoria del TFG

Aplicar manualmente en `Memoria_borrador.docx` (o el documento final).

---

## 1. Seccion 16.1 "Entidades del sistema"

Anadir fila a la tabla:

| profesor_edificio | N:M entre profesor y edificio (ESO/Bachillerato). Permite asignar un profesor a uno o ambos edificios. | NUEVA (Claude Code) |

---

## 2. Conteo de tablas

Buscar y reemplazar en todo el documento:
- "17 tablas" -> "18 tablas"

Afecta como minimo:
- Seccion "Modelado de datos"
- Seccion "Documento de cierre"

---

## 3. Seccion 16.4 "Cardinalidades y relaciones"

Anadir fila:

| profesor | pertenece a (N:M) | edificio | N:M (via profesor_edificio) |

---

## 4. Seccion 16.3 "Problemas detectados"

Anadir al final:

> **Problema 9 (NUEVA FUNCIONALIDAD): Profesor sin vinculo a edificio.**
>
> En el modelo original no existia relacion entre profesor y edificio. Para filtrar guardias por edificio (ESO/Bachillerato) y validar que el sustituto pertenece al mismo edificio que la ausencia, se creo la tabla intermedia `profesor_edificio` (N:M) que permite asignar un profesor a uno o ambos edificios.

---

## 5. Seccion 27.3 "Mejoras futuras"

Actualizar para reflejar que estas funcionalidades YA estan implementadas (ya no son "futuras"):

- **Conteo justo de guardias**: `guardiasHoy` ordena los profesores disponibles por menor numero de guardias realizadas en el curso actual (ASC). Implementado en `guardias.controller.js`.
- **Notificaciones automaticas al asignar guardia**: Al crear una `guardia_asignada`, se inserta automaticamente una notificacion en BD (tipo `AUSENCIA_ASIGNADA`) y se envia email al profesor sustituto via `email.service.js` (best-effort).
- **Actualizacion automatica del estado de ausencia**: Al asignar guardia, la ausencia pasa automaticamente a estado `CUBIERTA`.

Si estas funcionalidades estaban listadas como mejoras futuras, moverlas a la seccion de funcionalidades implementadas o marcarlas como completadas.

---

## 6. Seccion "Documento de cierre"

Ademas del cambio "17 -> 18 tablas", mencionar:
- Se anadio la tabla `profesor_edificio` para vincular profesores con edificios (ESO/Bachillerato)
- Se implemento filtrado de guardias por edificio
- Se implemento conteo justo de guardias (priorizacion por menor carga)
- Se implementaron notificaciones automaticas + email al asignar guardia
