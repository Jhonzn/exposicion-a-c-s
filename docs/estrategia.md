# Estrategia de pruebas

**Tema 9 — Pruebas de una arquitectura basada en contenedores**

Este documento sigue, en orden, los diez apartados de la sección 7 de la guía. La arquitectura, los puntos de integración y los riesgos se explican en detalle en [`arquitectura.md`](arquitectura.md). Los casos de prueba completos están en [`matriz-casos.md`](matriz-casos.md).

---

## 1. Objetivo de las pruebas

Validar que la API y MySQL, ejecutados en contenedores aislados:

1. **se comunican** correctamente;
2. **se configuran** a través de variables de entorno;
3. **conservan los datos** cuando se recrean los contenedores;
4. **se recuperan** de la caída de MySQL sin intervención manual.

Estas son las cuatro exigencias del tema 9 de la guía.

---

## 2. Componentes incluidos

| Componente | Descripción |
|---|---|
| `laboratorio-api` | Contenedor con Node.js 22 y Express. Expone la API REST de productos en el puerto `3000` |
| `laboratorio-mysql` | Contenedor con MySQL 8.4. Guarda la tabla `productos` |
| `laboratorio-network` | Red bridge de Docker Compose que conecta los dos contenedores |
| `mysql-data` | Volumen nombrado donde MySQL guarda sus datos |

El diagrama está en la sección 2 de [`arquitectura.md`](arquitectura.md).

---

## 3. Puntos de integración que serán validados

| ID | Punto de integración | Casos que lo validan |
|---|---|---|
| **PI-1** | Anfitrión → contenedor de la API, por el puerto publicado `3000` | CP-01, CP-02, CP-03 |
| **PI-2** | API → MySQL, por la red de Docker con el nombre de servicio `mysql:3306` | CP-01, CP-02, CP-03, CP-04, CP-05 |
| **PI-3** | `.env` → Compose → variables de entorno de cada contenedor | CP-07 |
| **PI-4** | MySQL → volumen `mysql-data` | CP-06 |

Qué viaja por cada punto y qué líneas del `docker-compose.yml` lo definen: sección 4 de [`arquitectura.md`](arquitectura.md).

---

## 4. Riesgos identificados

Un riesgo por punto de integración (detalle en la sección 5 de [`arquitectura.md`](arquitectura.md)):

| ID | Punto | Riesgo | Casos que lo cubren |
|---|---|---|---|
| **RG-1** | PI-1 | La API no es alcanzable, o responde con un contrato distinto al esperado | CP-01, CP-02, CP-03 |
| **RG-2** | PI-2 | MySQL cae o aún no está listo, y la API se cuelga o diagnostica mal | CP-01 a CP-05 |
| **RG-3** | PI-3 | Una variable errónea deja a la API sin acceso a la base de datos | CP-07 |
| **RG-4** | PI-4 | Los datos se pierden al recrear el contenedor | CP-06 |

---

## 5. Alcance y exclusiones

**Incluye:**

- Pruebas de **integración** entre la API y MySQL a través de los contenedores.
- Pruebas de **sistema** sobre flujos completos: caída y recuperación, persistencia y configuración.
- Ejecución sobre el laboratorio **local**, levantado con Docker Compose.

**Excluye:**

| Exclusión | Motivo |
|---|---|
| Pruebas de carga y rendimiento | Corresponden a otro tema de la guía (tema 15) |
| Pruebas de seguridad | Las credenciales son de prueba y el laboratorio es local |
| Pruebas unitarias | El tema trata la integración de componentes, no funciones aisladas |
| Interfaz gráfica | El laboratorio no tiene interfaz; se prueba por HTTP |
| Orquestación en varios nodos (Kubernetes, réplicas) | El laboratorio corre en un solo equipo con Docker Compose |

---

## 6. Ambiente necesario

| Elemento | Detalle |
|---|---|
| Equipo | Windows con **Docker Desktop** en ejecución |
| Node.js | Versión **22**, para ejecutar las pruebas automatizadas desde el anfitrión |
| Terminal | **PowerShell**, para los scripts de CP-06 y CP-07 |
| Configuración | Archivo `.env` creado a partir de `.env.example` |
| Puertos libres | `3000` (API) y `3313` (MySQL) |

**Precondición de toda la suite:** arranque limpio con `docker compose up -d --build`, los dos contenedores en ejecución y MySQL en estado `healthy` (se verifica con `docker compose ps`).

---

## 7. Datos de prueba

- **Todos los datos son ficticios.** No se usa información real ni personal.
- **Datos semilla:** los tres productos que crea `mysql/init.sql` (Teclado, Mouse y Monitor).
- **Datos propios de cada prueba:** cada caso crea su propio producto con un **nombre único** (`Prueba-<marca de tiempo>`) y lo verifica **por su id**, nunca por la cantidad total de productos. Así la suite se puede repetir sin reiniciar la base de datos.
- **Datos inválidos** (CP-02): nombre vacío, precio `0`, precio negativo y nombre de 101 caracteres (el límite de la columna es 100).
- **Id inexistente** (CP-03): `999999999`.
- **Configuración errónea** (CP-07): una `DB_PASSWORD` incorrecta definida solo en la terminal, sin modificar el `.env`.

---

## 8. Dependencias reales y simuladas

| Dependencia | ¿Real o simulada? | Motivo |
|---|---|---|
| API (Node.js + Express) | **Real**, en su contenedor | Es el componente bajo prueba |
| MySQL 8.4 | **Real**, en su contenedor | El tema exige probar componentes reales aislados |
| Red de Docker | **Real** | Es el canal de PI-2 |
| Volumen `mysql-data` | **Real** | Es lo que valida CP-06 |

**Ninguna dependencia es simulada.** El tema trata precisamente de probar componentes reales que corren en contenedores aislados; simular MySQL dejaría sin probar la red, la configuración y el volumen. Las fallas se provocan con comandos reales de Docker (`docker stop`, `docker compose down`), no con simulaciones.

---

## 9. Herramientas seleccionadas

| Herramienta | Uso | Casos |
|---|---|---|
| **Docker Compose** | Levantar el ambiente y provocar fallas (`stop`, `start`, `down`, `up`) | Todos |
| **Jest** | Ejecutar las pruebas automatizadas y verificar los resultados (aserciones) | CP-01 a CP-05 |
| **Supertest** | Enviar peticiones HTTP a `http://localhost:3000` | CP-01 a CP-05 |
| **PowerShell** | Scripts de los casos manuales | CP-06, CP-07 |

Las pruebas automatizadas se lanzan **desde el anfitrión** contra `http://localhost:3000`. Así cada petición recorre el camino real: anfitrión → contenedor de la API → red → contenedor de MySQL.

| Comando | Casos |
|---|---|
| `npm run test:funcional` | CP-01, CP-02, CP-03 |
| `npm run test:falla` | CP-04, CP-05 |
| `scripts/cp06-persistencia.ps1` | CP-06 |
| `scripts/cp07-configuracion.ps1` | CP-07 |

---

## 10. Criterios de aprobación

**Un caso se aprueba** si se cumplen las tres condiciones:

1. El **código HTTP** coincide con el resultado esperado.
2. El **cuerpo de la respuesta** coincide con el esperado (campos y mensaje de error).
3. Donde aplica, el **estado de la base de datos** también coincide: por ejemplo, que un dato inválido no se haya guardado o que el producto siga existiendo.

**Un caso falla** en cualquier otro caso, **incluido el agotamiento del tiempo de espera**: una respuesta que no llega se considera fallida.

**Criterio de entrada:** se cumple la precondición del apartado 6.

**Criterio de salida:** los 7 casos se ejecutaron, cada uno tiene su evidencia en `evidencias/` y su estado registrado en la matriz.

---

## Resumen de los casos de prueba

La guía (sección 4) pide indicar qué casos son de **integración** y cuáles de **sistema**:

- **Integración:** valida que dos componentes se comuniquen e intercambien información correctamente.
- **Sistema:** valida el comportamiento del sistema completo en un flujo de principio a fin.

| ID | Nombre | Tipo | Punto de integración | Riesgo | Ejecución |
|---|---|---|---|---|---|
| CP-01 | Crear y consultar un producto | Integración | PI-1, PI-2 | RG-1, RG-2 | Automatizada |
| CP-02 | Rechazar datos inválidos | Integración | PI-1, PI-2 | RG-1, RG-2 | Automatizada |
| CP-03 | Consultar un producto inexistente | Integración | PI-1, PI-2 | RG-1, RG-2 | Automatizada |
| CP-04 | Caída de MySQL | Integración | PI-2 | RG-2 | Automatizada |
| CP-05 | Recuperación tras la caída | Sistema | PI-2 | RG-2 | Automatizada |
| CP-06 | Persistencia al recrear contenedores | Sistema | PI-4 | RG-4 | Manual con script |
| CP-07 | Configuración por entorno | Sistema | PI-3 | RG-3 | Manual con script |

**Total:** 7 casos, 4 de integración y 3 de sistema; 5 automatizados y 2 manuales con script.

La guía pide como mínimo tres casos automatizados, de tres clases; esta estrategia los cubre así:

| Exige la guía (sección 8) | Casos |
|---|---|
| Un escenario exitoso | CP-01 |
| Un escenario de validación o error funcional | CP-02, CP-03 |
| Un escenario de falla técnica o de integración | CP-04, CP-05 |

### Cobertura de las exigencias del tema

| Exigencia del tema 9 | Casos |
|---|---|
| Comunicación | CP-01, CP-02, CP-03 |
| Recuperación ante la caída de un componente | CP-04, CP-05 |
| Persistencia | CP-06 |
| Configuración | CP-07 |
