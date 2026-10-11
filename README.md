# Laboratorio de pruebas de una arquitectura basada en contenedores

## 1. Información general

**Proyecto:** Pruebas de una arquitectura basada en contenedores  
**Tecnologías:** Node.js, Express, MySQL, Docker, Docker Compose y Jest.  
**Tipo de arquitectura:** Aplicación distribuida en contenedores con comunicación entre una API REST y una base de datos relacional.

### Objetivo general

Evaluar el funcionamiento, la integración, la tolerancia a fallos, la recuperación y la persistencia de datos de una arquitectura compuesta por una API REST y una base de datos MySQL ejecutadas en contenedores Docker.

### Objetivos específicos

- Verificar la creación y consulta de productos mediante la API.
- Comprobar la validación de datos y las respuestas HTTP ante solicitudes incorrectas.
- Evaluar el comportamiento de la aplicación cuando la base de datos deja de estar disponible.
- Verificar la recuperación de la conexión sin reiniciar el contenedor de la API.
- Comprobar la persistencia de los datos después de recrear los contenedores.
- Evaluar el efecto de una configuración incorrecta de las credenciales de conexión.

## 2. Arquitectura del sistema

La solución está conformada por dos componentes principales:

**API REST (Node.js y Express)**

Recibe las solicitudes HTTP, valida los datos, ejecuta las operaciones sobre los productos y devuelve las respuestas correspondientes. También dispone de un endpoint de salud para verificar la disponibilidad de la base de datos.

**Base de datos MySQL**

Almacena los productos registrados por medio de la API. Se ejecuta en un contenedor independiente y utiliza un volumen nombrado de Docker para conservar los datos.

### Diagrama de arquitectura

```text
                Cliente / Pruebas Jest
                         |
                         | HTTP
                         v
              API REST - Express
              Contenedor: laboratorio-api
              Puerto: 3000
                         |
                         | Red interna Docker
                         v
                  Base de datos
                 MySQL 8.4
              Contenedor: laboratorio-mysql
                   Puerto: 3306
                         |
                         v
                Volumen nombrado
               laboratorio-mysql-data
```

El puerto 3000 de la API está publicado en el equipo anfitrión. El puerto 3313 del equipo anfitrión permite acceder a MySQL por el puerto interno 3306 del contenedor.

La comunicación entre los servicios se realiza a través de la red de Docker Compose. La API depende de la condición de salud de MySQL para su inicio, pero las pruebas de recuperación también verifican el comportamiento cuando la base de datos falla durante la ejecución.

### Puntos de integración

- Cliente HTTP → API REST.
- API REST → MySQL mediante la configuración de conexión.
- Docker Compose → ciclo de vida, red y dependencias de los contenedores.
- MySQL → volumen nombrado para la persistencia de datos.

## 3. Herramientas utilizadas

| Herramienta | Propósito |
|---|---|
| Node.js | Entorno de ejecución de JavaScript. |
| Express | Implementación de la API REST. |
| MySQL 8.4 | Almacenamiento relacional. |
| Docker | Ejecución aislada de los componentes. |
| Docker Compose | Administración conjunta de los servicios. |
| Jest | Ejecución de pruebas automatizadas. |
| PowerShell | Ejecución de scripts y recopilación de evidencias. |
| Git | Control de versiones del proyecto. |

Las herramientas se ejecutan localmente. El laboratorio no requiere servicios de pago para su funcionamiento básico.

## 4. Preparación del entorno

### Requisitos previos

- Docker Desktop instalado y en ejecución.
- Node.js y npm instalados para ejecutar las pruebas de Jest.
- Git, si se necesita clonar o versionar el proyecto.
- Puertos 3000 y 3313 disponibles en el equipo anfitrión.

### Configuración

La configuración de la conexión a la base de datos se administra mediante las variables de entorno definidas en el archivo `.env` y en `docker-compose.yml`.

El archivo `.env` debe contener las variables necesarias para la conexión, de acuerdo con los nombres utilizados por el proyecto. No se deben publicar contraseñas reales ni incluirlas en el repositorio.

Antes de ejecutar las pruebas, se recomienda revisar la configuración y comprobar el estado de los servicios.

Desde la raíz del proyecto:

```powershell
docker compose config
docker compose up -d --build
docker compose ps
```

Para revisar los registros:

```powershell
docker compose logs --tail 100 api
docker compose logs --tail 100 mysql
```

La API debe responder en `http://localhost:3000/health` cuando la conexión con la base de datos está disponible.

## 5. Funcionalidades evaluadas

### Endpoints principales

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/health` | Verificar el estado de la API y la disponibilidad de MySQL. |
| POST | `/productos` | Crear un producto. |
| GET | `/productos/:id` | Consultar un producto por su identificador. |
| GET | `/productos` | Consultar los productos, cuando la base de datos está disponible. |

La creación de productos utiliza un nombre y un precio. Se verifica que el nombre sea válido y que el precio sea numérico, finito y mayor que cero, dentro de los límites definidos por la aplicación.

## 6. Plan de pruebas

Se definieron siete casos de prueba obligatorios: cinco automatizados mediante Jest y dos ejecutados mediante scripts de PowerShell.

| Caso | Descripción | Resultado esperado | Ejecución |
|---|---|---|---|
| CP-01 | Crear y consultar un producto. | El producto se crea con HTTP 201 y puede consultarse con sus datos. | Automatizada |
| CP-02 | Enviar datos inválidos. | La API responde HTTP 400 y no inserta los datos rechazados. | Automatizada |
| CP-03 | Consultar un producto inexistente. | La API responde HTTP 404 con el mensaje `Producto no encontrado`. | Automatizada |
| CP-04 | Detener MySQL durante la ejecución. | `/health` y `/productos` responden HTTP 503; el contenedor de la API continúa ejecutándose. | Automatizada |
| CP-05 | Recuperar MySQL sin reiniciar la API. | La API vuelve a responder correctamente y el producto de prueba sigue disponible. | Automatizada |
| CP-06 | Recrear los contenedores. | Los datos permanecen almacenados después de detener y recrear los servicios sin eliminar el volumen. | PowerShell |
| CP-07 | Configurar temporalmente una contraseña incorrecta. | La API responde HTTP 503, registra el error de autenticación y vuelve a funcionar al restaurar la configuración. | PowerShell |

### CP-01: creación y consulta

Se envía una solicitud POST con los datos de un producto. Después se consulta el producto mediante el identificador devuelto por la API. Se verifica el código HTTP y la información recuperada.

### CP-02: validación de datos

Se prueban diferentes entradas inválidas, como cuerpo vacío, nombre vacío, ausencia del precio, precio igual a cero, precio negativo, precio de tipo texto, precio excesivo y nombre que supera la longitud permitida.

El objetivo es verificar que la API rechace estas solicitudes y no almacene productos inválidos.

### CP-03: recurso inexistente

Se consulta un identificador que no corresponde a un producto existente. Se espera HTTP 404 y el mensaje `Producto no encontrado`.

### CP-04: fallo de la base de datos

Se detiene el servicio MySQL desde Docker Compose. Se comprueba que la API informe de la indisponibilidad mediante HTTP 503 y que su propio contenedor continúe en ejecución.

### CP-05: recuperación de la conexión

Se inicia nuevamente MySQL y se espera a que la API recupere la conectividad. Se comprueba que el identificador del contenedor de la API no haya cambiado y que el producto de prueba continúe disponible.

### CP-06: persistencia durante la recreación

Se crea un producto y se ejecuta `docker compose down`, seguido de `docker compose up -d`. No se utiliza la opción `-v`, ya que eliminaría el volumen nombrado. Después se consulta el producto para comprobar que sus datos sobrevivieron a la recreación de los contenedores.

### CP-07: configuración incorrecta

Se establece temporalmente una variable de entorno `DB_PASSWORD` con una contraseña incorrecta. Se recrea la API y se comprueba que la conexión falle, que los endpoints afectados respondan HTTP 503 y que los registros indiquen un error de autenticación.

Posteriormente se elimina la variable temporal para que se utilice la configuración habitual del proyecto, se recrea la API y se verifica la recuperación. El script restaura el estado previo de la variable de entorno al finalizar.

## 7. Instrucciones de ejecución de las pruebas

### 7.1. Preparar el entorno

Abrir PowerShell y ubicarse en la raíz del proyecto:

```powershell
cd "C:\Users\jhonf\OneDrive\Desktop\semestre 8\aseguramiento de la calidad del software\exp-arq-est-pr-int-sist\labor-arqu-contenedores"
```

Verificar que Docker Desktop esté iniciado y validar la configuración:

```powershell
docker --version
docker compose version
docker compose config
```

Si la configuración es correcta, construir e iniciar los servicios:

```powershell
docker compose up -d --build
```

Comprobar el estado de los contenedores:

```powershell
docker compose ps
```

La API debe estar disponible en el puerto 3000 y MySQL en el puerto 3313 del equipo anfitrión. El contenedor MySQL debe alcanzar el estado `healthy`.

### 7.2. Verificar la disponibilidad de la API

Ejecutar:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

La respuesta debe indicar que la API está disponible y que la base de datos puede utilizarse.

Para verificar el endpoint de productos:

```powershell
Invoke-RestMethod http://localhost:3000/productos
```

Si MySQL no está disponible, el resultado esperado para los endpoints afectados es HTTP 503.

### 7.3. Instalar las dependencias de las pruebas

Ingresar a la carpeta de la API:

```powershell
cd .\api
```

Instalar las dependencias:

```powershell
npm install
```

Consultar los scripts disponibles:

```powershell
npm run
```

### 7.4. Ejecutar CP-01, CP-02 y CP-03

Ejecutar las pruebas funcionales:

```powershell
npm run test:funcional
```

Estas pruebas verifican:

- **CP-01:** creación y consulta de un producto.
- **CP-02:** rechazo de datos inválidos sin insertar productos.
- **CP-03:** respuesta HTTP 404 al consultar un producto inexistente.

El resultado esperado es que Jest informe tres pruebas aprobadas.

Para guardar la salida de la ejecución en el archivo de evidencias, desde la carpeta `api` se puede utilizar:

```powershell
npm run test:funcional 2>&1 |
    Tee-Object -FilePath ..\evidencias\CP-01-03-funcional.txt
```

### 7.5. Ejecutar CP-04 y CP-05

Sin salir de la carpeta `api`, ejecutar:

```powershell
npm run test:falla
```

Estas pruebas detienen temporalmente MySQL, verifican las respuestas HTTP 503 y comprueban la recuperación del servicio.

- **CP-04:** la API sigue ejecutándose cuando MySQL se detiene, pero informa que la base de datos no está disponible.
- **CP-05:** al iniciar MySQL nuevamente, la API recupera la conexión sin reiniciar su contenedor y conserva el producto de prueba.

El resultado esperado es que Jest informe dos pruebas aprobadas.

Para guardar la salida:

```powershell
npm run test:falla 2>&1 |
    Tee-Object -FilePath ..\evidencias\CP-04-05-falla.txt
```

**Importante:** estas pruebas modifican temporalmente el estado de MySQL. Esperar a que terminen y comprobar que ambos servicios estén disponibles antes de continuar.

### 7.6. Ejecutar CP-06: persistencia de datos

Volver a la raíz del proyecto:

```powershell
cd ..
```

Ejecutar el script de persistencia:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cp06-persistencia.ps1
```

El script crea un producto, detiene y recrea los contenedores sin eliminar el volumen nombrado, espera la disponibilidad de la API y consulta nuevamente el producto.

El resultado esperado es `RESULTADO: APROBADO` y la confirmación de que el producto continúa disponible después de recrear los contenedores.

No utilizar `docker compose down -v` durante esta prueba, porque la opción `-v` elimina los volúmenes nombrados y puede borrar los datos que se están verificando.

### 7.7. Ejecutar CP-07: configuración incorrecta

Desde la raíz del proyecto, ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cp07-configuracion.ps1
```

El script establece temporalmente una contraseña incorrecta mediante la variable de entorno `DB_PASSWORD`, recrea la API y comprueba que la conexión falle.

Después verifica los registros de la API, elimina la variable temporal, recrea el servicio y comprueba que la aplicación recupere su funcionamiento con la configuración habitual.

El resultado esperado es `RESULTADO: APROBADO`.

Ejecutar el script únicamente en el entorno de laboratorio. No utilizar esta técnica en ambientes de producción.

### 7.8. Revisar las evidencias

Desde la raíz del proyecto, ejecutar:

```powershell
Get-ChildItem .\evidencias -File |
    Select-Object Name, Length, LastWriteTime
```

Consultar los resultados de cada grupo:

```powershell
Get-Content .\evidencias\CP-01-03-funcional.txt
Get-Content .\evidencias\CP-04-05-falla.txt
Get-Content .\evidencias\CP-06-persistencia.txt
Get-Content .\evidencias\CP-07-configuracion.txt
```

Los cuatro archivos deben reflejar las ejecuciones de los siete casos obligatorios. Si se vuelve a ejecutar una prueba utilizando `Tee-Object` sin el parámetro `-Append`, el archivo correspondiente se reemplazará con la nueva salida.

### 7.9. Verificación final

Comprobar el estado de los servicios:

```powershell
docker compose ps
```

Consultar los últimos registros:

```powershell
docker compose logs --tail 50 api
docker compose logs --tail 50 mysql
```

Volver a la raíz si todavía se está dentro de `api` y comprobar los cambios del repositorio:

```powershell
git status --short
```

Antes de entregar, verificar que el README, los scripts y las evidencias estén incluidos, y que el archivo `.env` con credenciales no se publique.

### 7.10. Detener el laboratorio

Cuando todas las pruebas hayan finalizado, ejecutar desde la raíz:

```powershell
docker compose down
```

Este comando detiene y elimina los contenedores y la red del proyecto, pero conserva el volumen nombrado para futuras ejecuciones.

Para volver a iniciar el laboratorio posteriormente:

```powershell
docker compose up -d
```

No utilizar `docker compose down -v` si se desea conservar la información almacenada en MySQL.


## 8. Evidencias de ejecución

Las evidencias de los casos obligatorios se encuentran en la carpeta `evidencias`.

| Archivo | Contenido |
|---|---|
| `CP-01-03-funcional.txt` | Resultados de CP-01, CP-02 y CP-03. |
| `CP-04-05-falla.txt` | Resultados de CP-04 y CP-05. |
| `CP-06-persistencia.txt` | Transcripción de la prueba de persistencia. |
| `CP-07-configuracion.txt` | Transcripción de la prueba de configuración incorrecta y recuperación. |

Los archivos de evidencia contienen registros de ejecución, mensajes de validación y resultados de los casos. Para la entrega final, deben revisarse y acompañarse de capturas de pantalla si el docente las solicita.

## 9. Criterios de aceptación

Un caso se considera aprobado cuando se cumplen las condiciones establecidas en su resultado esperado.

Los criterios generales son:

- Respuestas HTTP correctas para las operaciones válidas e inválidas.
- Ausencia de inserciones correspondientes a solicitudes rechazadas.
- Identificación de la indisponibilidad de MySQL mediante HTTP 503.
- Continuidad del contenedor de la API durante la caída de MySQL.
- Recuperación de la conectividad sin recrear la API en CP-05.
- Conservación de los datos durante la recreación de los contenedores en CP-06.
- Detección de credenciales incorrectas y recuperación posterior en CP-07.

El resultado global se determina revisando las salidas de Jest y las transcripciones de los scripts. No se debe declarar aprobado un caso cuya evidencia no confirme el resultado esperado.

## 10. Alcance y limitaciones

El laboratorio se concentra en la integración, el manejo de errores, la recuperación y la persistencia de una arquitectura local de dos componentes principales.

No pretende demostrar alta disponibilidad distribuida, recuperación ante pérdida física del equipo, escalamiento automático, seguridad integral de producción ni tolerancia a fallos entre múltiples nodos.

Las pruebas de carga, degradación y recuperación adicionales que se hayan ejecutado pueden presentarse como complementarias, separadas de los siete casos obligatorios.

## 11. Estructura del proyecto

```text
labor-arqu-contenedores/
├── api/
│   ├── src/
│   │   ├── app.js
│   │   └── routes/
│   │       └── productos.js
│   ├── test/
│   │   ├── funcional.test.js
│   │   ├── falla.test.js
│   │   ├── carga.js
│   │   ├── degradacion.js
│   │   └── recuperacion-carga.js
│   └── package.json
├── evidencias/
│   ├── CP-01-03-funcional.txt
│   ├── CP-04-05-falla.txt
│   ├── CP-06-persistencia.txt
│   └── CP-07-configuracion.txt
├── scripts/
│   ├── cp06-persistencia.ps1
│   └── cp07-configuracion.ps1
├── docker-compose.yml
├── .env
└── README.md
```

La estructura representa los componentes principales del proyecto. El archivo `.env` debe mantenerse fuera del control de versiones si contiene credenciales.

## 12. Conclusiones

El laboratorio permite comprobar cómo se comporta una aplicación basada en contenedores frente a solicitudes válidas e inválidas, fallos de conectividad y cambios en la configuración. La separación de la API y la base de datos facilita el aislamiento de los componentes y la simulación de fallos.

Las pruebas de recuperación y persistencia permiten evaluar dos aspectos importantes de este tipo de arquitectura: que la aplicación pueda recuperar su funcionamiento después de una interrupción y que los datos no dependan exclusivamente del ciclo de vida de un contenedor.

Finalmente, las pruebas automatizadas y los scripts reproducibles proporcionan evidencias verificables del comportamiento del sistema y permiten repetir la evaluación en condiciones similares.
