# Resultados, hallazgos y conclusiones

**Tema 9 — Pruebas de una arquitectura basada en contenedores**

Este documento resume la ejecución de los 7 casos de prueba, la interpreta y deja constancia de sus límites. Los casos completos están en [`matriz-casos.md`](matriz-casos.md), los criterios de aprobación en la sección 10 de [`estrategia.md`](estrategia.md) y la arquitectura en [`arquitectura.md`](arquitectura.md).

**Origen de los datos:** la corrida del 10 de octubre de 2026, guardada en [`evidencias/`](../evidencias/). Los tiempos son los que muestran esos archivos, medidos en un solo equipo con Docker Desktop sobre Windows.

---

## 1. Resumen por caso

Los 7 casos se ejecutaron y los 7 resultaron **aprobados**.

| Caso | Nombre | Tipo | Ejecución | Resultado observado | Tiempo observado | Estado |
|---|---|---|---|---|---|---|
| [CP-01](matriz-casos.md#cp-01--crear-y-consultar-un-producto) | Crear y consultar un producto | Integración | Jest | `POST` → `201` con `id`; `GET` → `200` con el mismo nombre y precio `12500.57` | 112 ms | Aprobado |
| [CP-02](matriz-casos.md#cp-02--rechazar-datos-inválidos) | Rechazar datos inválidos | Integración | Jest | Las 8 entradas inválidas → `400`; la cantidad de productos no cambió | 64 ms | Aprobado |
| [CP-03](matriz-casos.md#cp-03--consultar-un-producto-inexistente) | Consultar un producto inexistente | Integración | Jest | `404` con `Producto no encontrado` | 9 ms | Aprobado |
| [CP-04](matriz-casos.md#cp-04--caída-de-mysql) | Caída de MySQL | Integración | Jest | `/health` y `/productos` → `503`; `laboratorio-api` siguió en ejecución | 14 174 ms | Aprobado |
| [CP-05](matriz-casos.md#cp-05--recuperación-tras-la-caída) | Recuperación tras la caída | Sistema | Jest | `/health` volvió a `200`; mismo contenedor de la API; el producto previo respondió `200` | 14 833 ms | Aprobado |
| [CP-06](matriz-casos.md#cp-06--persistencia-al-recrear-contenedores) | Persistencia al recrear contenedores | Sistema | PowerShell | El producto `ID=20` siguió consultable con el mismo nombre y precio (`35000`) | 12 s (script completo) | Aprobado |
| [CP-07](matriz-casos.md#cp-07--configuración-por-entorno) | Configuración por entorno | Sistema | PowerShell | Con la contraseña errónea: `503` y `Access denied` en el log. Al restaurarla: `200` | 10 s (script completo) | Aprobado |

**Cómo leer los tiempos.** Los de CP-01 a CP-03 son lo que tardó cada prueba. Los de CP-04 y CP-05 incluyen detener o iniciar MySQL con Docker y esperar el estado esperado, así que **no** miden cuánto tarda la API en detectar o recuperarse por sí sola. Los de CP-06 y CP-07 son la duración total de cada script, que se calcula con la hora de inicio y de fin de su transcripción.

**Evidencia por caso:**

| Casos | Archivo |
|---|---|
| CP-01, CP-02, CP-03 | [`CP-01-03-funcional.txt`](../evidencias/CP-01-03-funcional.txt) |
| CP-04, CP-05 | [`CP-04-05-falla.txt`](../evidencias/CP-04-05-falla.txt) |
| CP-06 | [`CP-06-persistencia.txt`](../evidencias/CP-06-persistencia.txt) |
| CP-07 | [`CP-07-configuracion.txt`](../evidencias/CP-07-configuracion.txt) |

### Lectura de la evidencia: código HTTP, mensaje y tiempo por caso

Resultado de leer los cuatro archivos de `evidencias/`. La columna "Fuente" indica si el dato aparece **literal** en el archivo o si se **deduce** de que la prueba pasó, porque los archivos de Jest solo imprimen el nombre de cada prueba y su duración, no las respuestas HTTP.

| Caso | Código HTTP | Mensaje | Tiempo | Fuente |
|---|---|---|---|---|
| CP-01 | `201` (`POST`) y `200` (`GET`) | No aplica: no hay error | 112 ms | Tiempo literal. Códigos deducidos: la prueba afirma `201` y `200` y Jest la marcó como aprobada |
| CP-02 | `400` en las 8 entradas | No aparece. La prueba no afirma el texto de `error` | 64 ms | Tiempo literal. Código deducido de las aserciones |
| CP-03 | `404` | `Producto no encontrado` | 9 ms | Tiempo literal. Código y mensaje deducidos: la prueba afirma ambos y fue aprobada |
| CP-04 | `503` en `/health` y `/productos` | No aparece. La prueba solo afirma el código | 14 174 ms | Tiempo literal. El título de la prueba dice "responder 503"; el código se deduce de la aserción |
| CP-05 | `200` en `/health` y en `GET /productos/<id>` | No aplica: no hay error | 14 833 ms | Tiempo literal. Código deducido de las aserciones. El log de Docker muestra que MySQL se detuvo e inició de nuevo |
| CP-06 | No se imprime ningún código | `RESULTADO: APROBADO` y `El producto ID=20 sobrevivió a la recreación de los contenedores.` | 12 s (22:06:07 a 22:06:19) | Mensaje y horas literales. El script espera `/health` en `200` y compara nombre y precio antes de aprobar |
| CP-07 | `503` en `/health` y en `/productos` con la contraseña errónea; `200` tras restaurarla | `/health`: `{"estado":"ERROR","baseDatos":"no disponible"}`. `/productos`: `{"error":"Base de datos no disponible"}`. Log: `Access denied for user 'laboratorio_user'@'172.18.0.3' (using password: YES)` | 10 s (22:06:29 a 22:06:39) | `503` y mensajes literales (la transcripción dice "la configuración incorrecta produce HTTP 503"). El `200` final no se imprime: el script lo exige y termina con `RESULTADO: APROBADO` |

Observaciones de la lectura:

- **Tiempos de Jest.** En `CP-01-03-funcional.txt`, Jest reporta 9.803 s para la suite y 19.651 s de tiempo total. Las tres pruebas suman 185 ms, así que casi todo ese tiempo no corresponde a las pruebas en sí (la evidencia no dice a qué se debe). En `CP-04-05-falla.txt` la suite tarda 29.62 s y el total es 29.939 s.
- **Conexión cortada en CP-06 y CP-07.** Ambas transcripciones registran `Se ha terminado la conexión: La conexión ha terminado de forma inesperada.` Ocurre mientras la API se recrea y es una espera normal, no un fallo: ambos scripts siguieron esperando hasta obtener el código buscado.
- **Orden de los mensajes de CP-07.** Después de ese primer corte aparecen, en este orden, el cuerpo de `/health` y el de `/productos`, ambos con `503`.
- **Qué falta para tener el código HTTP literal.** Con Jest solo se verá en la evidencia si las pruebas imprimen la respuesta (`console.log` del estado y del cuerpo) o si se ejecutan con un reporte detallado. Como están ahora, el código se confirma por la aserción y no por una línea de texto.

---

## 2. Interpretación

Las respuestas siguen las preguntas que el análisis debe contestar, agrupadas por exigencia del tema.

### Comunicación (CP-01 a CP-03)

**¿La API y MySQL se entienden por el nombre de servicio?** Sí. La API usa `DB_HOST=mysql`, el nombre del servicio en la red `laboratorio-network`, y las operaciones de escritura y lectura de CP-01 funcionaron sin usar una IP ni `localhost`. CP-07 lo confirma por otro lado: el log muestra `Access denied for user 'laboratorio_user'@'172.18.0.3'`. Ese mensaje solo lo puede producir MySQL, así que la API llegó hasta él por la red y falló después, en la autenticación.

**¿Un dato inválido llega a la base de datos?** No. Las 8 entradas inválidas de CP-02 se rechazaron con `400` en la API, y la cantidad de productos fue la misma antes y después. La validación ocurre antes del `INSERT`.

**¿La API distingue "no existe" de "la base falló"?** Sí. CP-03 devolvió `404` porque MySQL respondió sin filas. Los casos CP-04 y CP-07 devolvieron `503` porque la base no estaba disponible. Son dos errores distintos con dos códigos distintos.

### Recuperación (CP-04 y CP-05)

**¿Cuánto tardó la API en detectar la caída y en recuperarse?** Con estos datos no se puede dar una cifra exacta. Las pruebas esperan el estado correcto consultando cada 2 s, y esa espera queda dentro de los 14 s medidos. Lo que sí se observó es que la API respondió `503` mientras MySQL estaba detenido y `200` después de volver a iniciarlo. Medir la detección y la recuperación por separado quedaría como mejora.

**¿Hubo que reiniciar algo a mano?** No. En CP-05 el id del contenedor `laboratorio-api` fue el mismo antes y después de la caída: el pool de conexiones de la API se reconectó por sí solo cuando MySQL volvió. Solo se inició MySQL.

### Persistencia (CP-06)

**¿Qué se destruyó con `down` y qué sobrevivió?** `docker compose down` destruye los contenedores y la red, pero no el volumen `laboratorio-mysql-data`. Al ejecutar `up -d`, el nuevo contenedor de MySQL volvió a montar ese volumen, y el producto `ID=20` seguía ahí con sus datos. Por eso CP-06 es distinto de CP-05: `stop` conserva el contenedor, mientras que `down` lo destruye y demuestra que el dato vive en el volumen.

### Configuración (CP-07)

**¿Qué cambió entre la corrida que falla y la que pasa, si la imagen es la misma?** Una sola cosa: el valor de `DB_PASSWORD` que recibe el contenedor. La imagen de la API, el código y el `.env` no cambiaron. Con la contraseña errónea, la API arrancó, pero `/health` y `/productos` respondieron `503`; al quitar la variable y recrear la API, volvieron a `200`. Esto confirma que el comportamiento del sistema depende de su configuración externa y que el error es diagnosticable desde el log.

---

## 3. Limitaciones

### Lo que la estrategia excluye

La sección 5 de [`estrategia.md`](estrategia.md) deja fuera cinco áreas. Por eso los resultados aprobados **no** permiten afirmar lo que aparece en la última columna.

| Exclusión | Motivo según la estrategia | Qué no se puede concluir |
|---|---|---|
| Pruebas de carga y rendimiento | Corresponden a otro tema de la guía (tema 15) | Cuántas peticiones soporta la API ni cómo se degrada bajo carga |
| Pruebas de seguridad | Las credenciales son de prueba y el laboratorio es local | Que la configuración sea segura: las contraseñas están en texto plano en `.env`, `root` es accesible por el puerto `3313` y no hay TLS |
| Pruebas unitarias | El tema trata la integración de componentes, no funciones aisladas | Que cada función de validación sea correcta por separado: solo se probó a través de la API |
| Interfaz gráfica | El laboratorio no tiene interfaz | Nada sobre experiencia de usuario: todo se prueba por HTTP |
| Orquestación en varios nodos (Kubernetes, réplicas) | El laboratorio corre en un solo equipo con Docker Compose | Alta disponibilidad, balanceo ni tolerancia a fallos entre equipos |

El repositorio contiene tres scripts de carga en `api/test/` (`carga.js`, `degradacion.js` y `recuperacion-carga.js`). Son complementarios, no forman parte de los 7 casos, y `evidencias/` no guarda ninguna ejecución de ellos, así que no se usan en este análisis.

### Los dos casos manuales: CP-06 y CP-07

CP-06 (persistencia) y CP-07 (configuración) se ejecutan con scripts de PowerShell y no con Jest. El primero recrea todo el entorno con `docker compose down` y `up -d`; el segundo deja a la API sin conexión a propósito. El plan los agrupó como un script por caso para evitar errores de tecleo al ejecutarlos en vivo. Eso tiene estas consecuencias:

- **No están en `npm test`.** Quien ejecute solo la suite de Jest no los corre, y los 5 casos automatizados pueden pasar mientras estos dos no se han verificado.
- **Dependen de Windows y PowerShell** además de Docker Desktop. En otro sistema habría que reescribirlos.
- **Su resultado es la transcripción del propio script.** La línea `RESULTADO: APROBADO` la escribe el script, y la evidencia es una transcripción con ruido y no un reporte estructurado como el de Jest.
- **CP-07 modifica una variable de entorno de la terminal** y recrea la API, por eso debe ejecutarse al final de la demostración. El script restaura la variable al terminar, incluso si falla.

### Otros límites de esta corrida

- Los resultados salen de **una sola corrida** en un único equipo. No se repitió la secuencia completa para confirmar que sea repetible.
- Los tiempos dependen de ese equipo y de Docker Desktop, y no son un valor de referencia. Los de CP-04 y CP-05 no separan la detección de la caída de la recuperación.
- CP-02 y CP-04 comprueban el código HTTP y no el texto del campo `error`. CP-06 no comprueba directamente que `init.sql` no se volvió a ejecutar. CP-07 solo prueba una configuración errónea, la contraseña.
- Los archivos de `evidencias/` conservan ruido de PowerShell (`NativeCommandError`) y problemas de codificación. El de CP-01 a CP-03 está en UTF-16.

---

## 4. Conclusiones

1. **La API se recupera sola cuando MySQL vuelve.** En CP-05, después de detener e iniciar MySQL, `/health` volvió a `200` sin reiniciar la API: el id del contenedor `laboratorio-api` fue el mismo antes y después, y el producto creado antes de la caída siguió disponible.

2. **Los datos dependen del volumen y no del contenedor.** En CP-06, `docker compose down` destruyó los contenedores y la red, pero el producto `ID=20` siguió consultable con el mismo nombre y precio después de `up -d`, porque el volumen `laboratorio-mysql-data` no se eliminó.

3. **La configuración externa decide si la API funciona, con la misma imagen.** En CP-07, cambiar solo `DB_PASSWORD` hizo que `/health` y `/productos` respondieran `503` y que el log mostrara `Access denied`. Ese mensaje solo lo emite MySQL, así que la API sí lo alcanzó por el nombre de servicio y falló en la autenticación. Al quitar la variable y recrear la API volvió a `200`, sin tocar el código ni el `.env`.
