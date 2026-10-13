# Matriz de casos de prueba

Cada caso usa los 12 campos de la sección 9 de la guía. Los puntos de integración (PI) y los riesgos (RG) están en [`arquitectura.md`](arquitectura.md); los criterios de aprobación, en la sección 10 de [`estrategia.md`](estrategia.md).

> Los campos **Resultado obtenido**, **Evidencia** y **Estado** se llenan con la ejecución real de las pruebas (entrega 2). Mientras tanto aparecen como *Pendiente*.

## Resumen

| ID | Nombre | Tipo | PI | Riesgo | Ejecución | Estado |
|---|---|---|---|---|---|---|
| [CP-01](#cp-01--crear-y-consultar-un-producto) | Crear y consultar un producto | Integración | PI-1, PI-2 | RG-1, RG-2 | Automatizada | Pendiente |
| [CP-02](#cp-02--rechazar-datos-inválidos) | Rechazar datos inválidos | Integración | PI-1, PI-2 | RG-1, RG-2 | Automatizada | Pendiente |
| [CP-03](#cp-03--consultar-un-producto-inexistente) | Consultar un producto inexistente | Integración | PI-1, PI-2 | RG-1, RG-2 | Automatizada | Pendiente |
| [CP-04](#cp-04--caída-de-mysql) | Caída de MySQL | Integración | PI-2 | RG-2 | Automatizada | Pendiente |
| [CP-05](#cp-05--recuperación-tras-la-caída) | Recuperación tras la caída | Sistema | PI-2 | RG-2 | Automatizada | Pendiente |
| [CP-06](#cp-06--persistencia-al-recrear-contenedores) | Persistencia al recrear contenedores | Sistema | PI-4 | RG-4 | Manual con script | Pendiente |
| [CP-07](#cp-07--configuración-por-entorno) | Configuración por entorno | Sistema | PI-3 | RG-3 | Manual con script | Pendiente |

Cada caso valida **una sola cosa**, para que su resultado se pueda interpretar sin ambigüedad.

---

## CP-01 — Crear y consultar un producto

| Campo | Contenido |
|---|---|
| **Identificador** | CP-01 |
| **Nombre** | Crear y consultar un producto |
| **Tipo de prueba** | Integración — valida que la API escriba en MySQL y lea lo escrito, es decir, el intercambio de datos entre dos componentes. |
| **Objetivo** | Validar que un producto creado por la API se guarda en MySQL y se puede consultar después con los mismos datos |
| **Componentes involucrados** | `laboratorio-api`, `laboratorio-mysql` y la red `laboratorio-network` (PI-1, PI-2) |
| **Precondiciones** | Los dos contenedores en ejecución y MySQL en estado `healthy` |
| **Datos de entrada** | `{ "nombre": "Prueba-<marca de tiempo>", "precio": 1500 }` |
| **Procedimiento** | 1) `POST /productos` con los datos de entrada. 2) Guardar el `id` de la respuesta. 3) `GET /productos/<id>`. 4) Comparar nombre y precio con los enviados. |
| **Resultado esperado** | El `POST` responde `201` con un `id` numérico. El `GET` responde `200` con el mismo nombre y el mismo precio. *(El precio se compara con `Number()`, porque MySQL lo devuelve como texto: `"1500.00"`.)* |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

---

## CP-02 — Rechazar datos inválidos

| Campo | Contenido |
|---|---|
| **Identificador** | CP-02 |
| **Nombre** | Rechazar datos inválidos |
| **Tipo de prueba** | Integración — valida que la API filtre los datos antes de enviarlos a MySQL y que nada inválido llegue a la base de datos. |
| **Objetivo** | Validar que la API rechaza los datos inválidos con un error controlado y que esos datos no se guardan |
| **Componentes involucrados** | `laboratorio-api`, `laboratorio-mysql` y la red `laboratorio-network` (PI-1, PI-2) |
| **Precondiciones** | Los dos contenedores en ejecución y MySQL en estado `healthy` |
| **Datos de entrada** | a) `{ "precio": 1500 }` (sin nombre) · b) `{ "nombre": "Prueba-<marca>", "precio": 0 }` · c) `{ "nombre": "Prueba-<marca>", "precio": -10 }` · d) un nombre de 101 caracteres con precio `1500` |
| **Procedimiento** | 1) `GET /productos` y contar los productos. 2) Enviar cada dato de entrada con `POST /productos`. 3) `GET /productos` y volver a contar. |
| **Resultado esperado** | Cada `POST` responde `400` con un JSON `{ "error": "..." }` que explica el problema. La cantidad de productos no cambia. |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

> En este caso se cuentan los productos solo para comparar el antes y el después dentro de la misma prueba, no para esperar un número fijo.

---

## CP-03 — Consultar un producto inexistente

| Campo | Contenido |
|---|---|
| **Identificador** | CP-03 |
| **Nombre** | Consultar un producto inexistente |
| **Tipo de prueba** | Integración — valida que la API interprete correctamente una respuesta vacía de MySQL y la traduzca al código HTTP adecuado. |
| **Objetivo** | Validar que la API distingue "el producto no existe" de "la base de datos falló" |
| **Componentes involucrados** | `laboratorio-api`, `laboratorio-mysql` y la red `laboratorio-network` (PI-1, PI-2) |
| **Precondiciones** | Los dos contenedores en ejecución y MySQL en estado `healthy` |
| **Datos de entrada** | Id `999999999` |
| **Procedimiento** | 1) `GET /productos/999999999`. |
| **Resultado esperado** | `404` con `{ "error": "Producto no encontrado" }` (no `503`, porque MySQL sí respondió) |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

---

## CP-04 — Caída de MySQL

| Campo | Contenido |
|---|---|
| **Identificador** | CP-04 |
| **Nombre** | Caída de MySQL |
| **Tipo de prueba** | Integración — valida cómo responde la API cuando falla su conexión con MySQL (PI-2). |
| **Objetivo** | Validar que la API detecta la caída de MySQL y responde con un error controlado sin detenerse |
| **Componentes involucrados** | `laboratorio-api`, `laboratorio-mysql` y la red `laboratorio-network` (PI-2) |
| **Precondiciones** | Los dos contenedores en ejecución y MySQL en estado `healthy`. Se crea un producto antes de la caída (lo usa CP-05). |
| **Datos de entrada** | Ninguno: la petición es `GET /productos` |
| **Procedimiento** | 1) Detener MySQL con `docker stop laboratorio-mysql`. 2) `GET /productos`. 3) `GET /health`. 4) Confirmar con `docker compose ps` que la API sigue en ejecución. |
| **Resultado esperado** | `503` con `{ "error": "Base de datos no disponible" }`, `/health` en `503` y la API en ejecución |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

---

## CP-05 — Recuperación tras la caída

| Campo | Contenido |
|---|---|
| **Identificador** | CP-05 |
| **Nombre** | Recuperación tras la caída |
| **Tipo de prueba** | Sistema — valida el flujo completo de caída y recuperación: el sistema vuelve a funcionar por sí solo y conserva los datos. |
| **Objetivo** | Validar que, cuando MySQL vuelve, la API se recupera sin reiniciarla y los datos anteriores siguen disponibles |
| **Componentes involucrados** | `laboratorio-api`, `laboratorio-mysql`, la red `laboratorio-network` y el volumen `mysql-data` (PI-2) |
| **Precondiciones** | CP-04 ejecutado: MySQL detenido, la API en ejecución y el id del producto creado antes de la caída |
| **Datos de entrada** | El id del producto creado antes de la caída |
| **Procedimiento** | 1) Iniciar MySQL con `docker start laboratorio-mysql`. 2) Consultar `/health` hasta que responda `200`, con un tiempo máximo de espera. 3) `GET /productos/<id>`. 4) Confirmar que la API no se reinició (su hora de inicio en `docker inspect` no cambió). |
| **Resultado esperado** | Sin reiniciar la API, `/health` vuelve a `200` y el producto creado antes de la caída responde `200` con sus datos |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

> Al final de la prueba MySQL siempre se vuelve a iniciar, aunque la prueba falle, para no dejar el sistema caído para los casos siguientes.

---

## CP-06 — Persistencia al recrear contenedores

| Campo | Contenido |
|---|---|
| **Identificador** | CP-06 |
| **Nombre** | Persistencia al recrear contenedores |
| **Tipo de prueba** | Sistema — valida el ciclo completo de vida del sistema: destruir todos los contenedores, recrearlos y comprobar que el dato sobrevive. |
| **Objetivo** | Validar que los datos se guardan en el volumen y no en el contenedor |
| **Componentes involucrados** | `laboratorio-api`, `laboratorio-mysql` y el volumen `mysql-data` (PI-4) |
| **Precondiciones** | Los dos contenedores en ejecución y MySQL en estado `healthy` |
| **Datos de entrada** | `{ "nombre": "Prueba-<marca de tiempo>", "precio": 1500 }` |
| **Procedimiento** | Ejecutar `scripts/cp06-persistencia.ps1`, que: 1) crea el producto y guarda su id; 2) ejecuta `docker compose down` (destruye los contenedores, no el volumen); 3) ejecuta `docker compose up -d`; 4) espera a que `/health` responda `200`; 5) consulta `GET /productos/<id>`. |
| **Resultado esperado** | El producto sigue consultable por su id con los mismos datos, y `init.sql` no se vuelve a ejecutar |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

> CP-05 no reemplaza a CP-06: `docker stop` conserva el contenedor, y solo `docker compose down` lo destruye. Por eso CP-06 es el que prueba que el dato vive en el volumen.

---

## CP-07 — Configuración por entorno

| Campo | Contenido |
|---|---|
| **Identificador** | CP-07 |
| **Nombre** | Configuración por entorno |
| **Tipo de prueba** | Sistema — valida que el comportamiento del sistema completo depende de su configuración externa, con la misma imagen. |
| **Objetivo** | Validar que la API toma la configuración de las variables de entorno y que una variable errónea produce un error controlado y diagnosticable |
| **Componentes involucrados** | `.env`, Docker Compose, `laboratorio-api` y `laboratorio-mysql` (PI-3) |
| **Precondiciones** | Los dos contenedores en ejecución y MySQL en estado `healthy` |
| **Datos de entrada** | `DB_PASSWORD` con un valor incorrecto, definida solo en la terminal |
| **Procedimiento** | Ejecutar `scripts/cp07-configuracion.ps1`, que: 1) define una `DB_PASSWORD` errónea en la terminal (tiene prioridad sobre el `.env`); 2) recrea solo la API con `docker compose up -d api`; 3) consulta `GET /productos`; 4) muestra el log de la API; 5) quita la variable y recrea la API; 6) vuelve a consultar `GET /productos`. |
| **Resultado esperado** | Con la variable errónea: `503` y `Access denied` en el log de la API. Al quitarla y recrear la API: `200`. El archivo `.env` no se modifica. |
| **Resultado obtenido** | *Pendiente* |
| **Evidencia** | *Pendiente* |
| **Estado** | *Pendiente* |

> Este caso se ejecuta al final de la demostración, porque es el único que puede dejar a la API sin conexión.
