# Laboratorio - Arquitectura de Contenedores

Proyecto práctico para implementar una arquitectura basada en contenedores utilizando **Node.js, MySQL y Docker Compose**.

## Tecnologías

* Node.js 22
* Express
* MySQL 8.4
* Docker
* Docker Compose

## Arquitectura

El proyecto está compuesto por dos servicios principales:

```text
                    Docker Compose
┌─────────────────────────────────────────────┐
│                                             │
│   ┌─────────────────┐    ┌───────────────┐ │
│   │   API Node.js   │───►│     MySQL     │ │
│   │                 │    │               │ │
│   │     :3000       │    │     :3306     │ │
│   └────────┬────────┘    └───────┬───────┘ │
│            │                      │         │
└────────────┼──────────────────────┼─────────┘
             │                      │
          Puerto 3000          Puerto 3313
             │                      │
             ▼                      ▼
          Windows                Windows
```

La API se ejecuta en el puerto `3000`.

MySQL utiliza el puerto `3306` internamente dentro del contenedor y se publica en el puerto `3313` de Windows.

## Estructura del proyecto

```text
labor-arqu-contenedores/
│
├── api/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
│
├── mysql/
│   └── init.sql
│
├── .env
├── .dockerignore
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Configuración

Crear un archivo `.env` en la raíz del proyecto:

```env
API_PORT=3000

DB_HOST=mysql
DB_PORT=3306
DB_NAME=laboratorio
DB_USER=laboratorio_user
DB_PASSWORD=laboratorio_password

MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=laboratorio
MYSQL_USER=laboratorio_user
MYSQL_PASSWORD=laboratorio_password
```

### Importante

Dentro de Docker, la API debe conectarse a MySQL utilizando:

```text
DB_HOST=mysql
DB_PORT=3306
```

No se debe utilizar:

```text
DB_HOST=localhost
DB_PORT=3313
```

`localhost:3313` se utiliza para acceder a MySQL desde Windows.

## Docker Compose

El archivo `docker-compose.yml` define los servicios `api` y `mysql`.

```yaml
services:

  api:
    build: ./api
    container_name: laboratorio-api

    ports:
      - "${API_PORT}:3000"

    environment:
      PORT: 3000
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}

    depends_on:
      - mysql

    networks:
      - laboratorio-network

  mysql:
    image: mysql:8.4
    container_name: laboratorio-mysql

    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}

    ports:
      - "3313:3306"

    volumes:
      - mysql-data:/var/lib/mysql
      - ./mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro

    networks:
      - laboratorio-network

volumes:
  mysql-data:

networks:
  laboratorio-network:
    driver: bridge
```

## Construir y ejecutar

Desde la carpeta raíz del proyecto:

```powershell
docker compose up -d --build
```

Verificar los contenedores:

```powershell
docker compose ps
```

Se espera que aparezcan:

```text
laboratorio-api
laboratorio-mysql
```

con estado `Up`.

## Ver los logs

### API

```powershell
docker compose logs api
```

### MySQL

```powershell
docker compose logs mysql
```

### Seguir los logs en tiempo real

```powershell
docker compose logs -f
```

## Detener el proyecto

Para detener y eliminar los contenedores:

```powershell
docker compose down
```

### Persistencia de datos

El proyecto utiliza un volumen Docker:

```yaml
volumes:
  - mysql-data:/var/lib/mysql
```

Por esta razón:

```powershell
docker compose down
```

**no elimina los registros almacenados en MySQL.**

Al volver a ejecutar:

```powershell
docker compose up -d
```

el contenedor de MySQL vuelve a utilizar el mismo volumen.

### ⚠️ Eliminar completamente la base de datos

No utilizar este comando si se quieren conservar los registros:

```powershell
docker compose down -v
```

La opción `-v` elimina el volumen:

```text
labor-arqu-contenedores_mysql-data
```

y, por tanto, elimina los datos almacenados en ese volumen.

## Reconstruir la API

Si se realizan cambios en el código de Node.js:

```powershell
docker compose up -d --build
```

También se puede reconstruir solamente la API:

```powershell
docker compose build api
docker compose up -d api
```

## Acceder al contenedor de la API

```powershell
docker exec -it laboratorio-api sh
```

## Acceder a MySQL

Para entrar directamente al cliente MySQL dentro del contenedor:

```powershell
docker exec -it laboratorio-mysql mysql -u root -p
```

La contraseña corresponde a:

```env
MYSQL_ROOT_PASSWORD
```

## Conexión desde Windows

Como MySQL está publicado mediante:

```yaml
ports:
  - "3313:3306"
```

desde Windows se puede utilizar:

```text
Host: localhost
Port: 3313
```

Por ejemplo, desde MySQL Workbench:

```text
Hostname: localhost
Port: 3313
Username: root
```

## Comunicación entre contenedores

Los servicios pertenecen a la misma red:

```text
laboratorio-network
```

Por lo tanto, Docker permite que la API encuentre a MySQL utilizando el nombre del servicio:

```text
mysql
```

La comunicación interna es:

```text
API → mysql:3306
```

Mientras que la comunicación desde Windows es:

```text
Windows → localhost:3313 → MySQL:3306
```

## Inicialización de la base de datos

El archivo:

```text
mysql/init.sql
```

se monta en:

```text
/docker-entrypoint-initdb.d/init.sql
```

MySQL ejecuta este script durante la inicialización de una base de datos nueva.

Es importante tener en cuenta que los scripts de inicialización no se ejecutan nuevamente cada vez que se inicia el contenedor si el volumen de datos ya existe.

## Solución de problemas

### Puerto 3306 ocupado

Si aparece:

```text
ports are not available
0.0.0.0:3306
```

significa que el puerto `3306` de Windows ya está siendo utilizado.

Se puede utilizar otro puerto externo:

```yaml
ports:
  - "3313:3306"
```

El `3306` corresponde al puerto interno de MySQL y normalmente no es necesario modificarlo.

### Puerto 3313 ocupado

Comprobar qué proceso utiliza el puerto:

```powershell
netstat -ano | findstr :3313
```

Después identificar el proceso:

```powershell
tasklist /FI "PID eq NUMERO_PID"
```

### Error `MYSQL_USER="root"`

No se debe configurar:

```env
MYSQL_USER=root
```

si también se utiliza `MYSQL_PASSWORD`.

Para `root` se utiliza:

```env
MYSQL_ROOT_PASSWORD=root
```

Para la aplicación se recomienda un usuario independiente:

```env
MYSQL_USER=laboratorio_user
MYSQL_PASSWORD=laboratorio_password
```

## Comandos principales

### Iniciar

```powershell
docker compose up -d
```

### Iniciar y reconstruir

```powershell
docker compose up -d --build
```

### Ver estado

```powershell
docker compose ps
```

### Ver logs

```powershell
docker compose logs
```

### Detener

```powershell
docker compose down
```

### Detener y eliminar volúmenes

```powershell
docker compose down -v
```

> ⚠️ Este último comando elimina los datos almacenados en los volúmenes.

### Ver volúmenes

```powershell
docker volume ls
```

### Ver imágenes

```powershell
docker images
```

### Ver contenedores

```powershell
docker ps
```

### Ver todos los contenedores

```powershell
docker ps -a
```

## Persistencia

La persistencia de MySQL se consigue mediante el volumen:

```text
mysql-data
```

La relación es:

```text
MySQL container
      │
      ▼
/var/lib/mysql
      │
      ▼
mysql-data
      │
      ▼
Datos persistentes
```

Eliminar el contenedor con:

```powershell
docker compose down
```

no elimina el volumen.

Eliminarlo con:

```powershell
docker compose down -v
```

sí elimina el volumen y los datos almacenados.
