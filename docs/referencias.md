# Referencias

Formato: APA 7.ª edición. Las fuentes en línea se consultaron en octubre de 2026.

## Contenedores y Docker

1. Docker Inc. (s. f.). *What is a container?* Docker Docs. https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/
   → Usada para: definición de contenedor e imagen (sección 6).

2. Docker Inc. (s. f.). *Compose file reference*. Docker Docs. https://docs.docker.com/reference/compose-file/
   → Usada para: estructura de `docker-compose.yml`, `services`, `ports`, `environment`, `volumes`, `networks`.

3. Docker Inc. (s. f.). *Control startup and shutdown order in Compose*. Docker Docs. https://docs.docker.com/compose/how-tos/startup-order/
   → Usada para: diferencia entre `depends_on` y `condition: service_healthy` (riesgo R-01).

4. Docker Inc. (s. f.). *Networking overview*. Docker Docs. https://docs.docker.com/engine/network/
   → Usada para: red bridge y resolución de nombres entre contenedores (PI-2).

5. Docker Inc. (s. f.). *Volumes*. Docker Docs. https://docs.docker.com/engine/storage/volumes/
   → Usada para: persistencia de datos (PI-4, riesgo R-06).

6. Docker Inc. (s. f.). *Start containers automatically (restart policies)*. Docker Docs. https://docs.docker.com/engine/containers/start-containers-automatically/
   → Usada para: políticas de reinicio (riesgo R-04).

7. Docker Inc. (s. f.). *Dockerfile reference*. Docker Docs. https://docs.docker.com/reference/dockerfile/
   → Usada para: instrucciones `FROM`, `WORKDIR`, `COPY`, `RUN`, `EXPOSE`, `CMD` y el `HEALTHCHECK`.

8. Docker Inc. (s. f.). *MySQL — Docker Official Image*. Docker Hub. https://hub.docker.com/_/mysql
   → Usada para: variables `MYSQL_*` y la carpeta `/docker-entrypoint-initdb.d` (PI-5, riesgo R-07).

9. Docker Inc. (s. f.). *Node — Docker Official Image*. Docker Hub. https://hub.docker.com/_/node
   → Usada para: elección de la imagen `node:22-alpine`.

10. Merkel, D. (2014). Docker: Lightweight Linux containers for consistent development and deployment. *Linux Journal, 2014*(239), Artículo 2.
    → Usada para: fundamento del uso de contenedores para ambientes reproducibles.

11. Souppaya, M., Morello, J. y Scarfone, K. (2017). *Application container security guide* (NIST Special Publication 800-190). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-190
    → Usada para: riesgos de seguridad en contenedores (riesgo R-10).

12. Wiggins, A. (2017). *The Twelve-Factor App: III. Config*. https://12factor.net/config
    → Usada para: separar la configuración del código mediante variables de entorno (PI-3).

## Tecnologías del laboratorio

13. OpenJS Foundation. (s. f.). *Express — Fast, unopinionated, minimalist web framework for Node.js*. https://expressjs.com/
    → Usada para: rutas y manejo de peticiones de la API.

14. Sidorares, A. y colaboradores. (s. f.). *MySQL2 documentation*. https://sidorares.github.io/node-mysql2/docs
    → Usada para: pool de conexiones y consultas parametrizadas (`api/src/db.js`).

15. Oracle Corporation. (s. f.). *MySQL 8.4 Reference Manual*. https://dev.mysql.com/doc/refman/8.4/en/
    → Usada para: tipo `DECIMAL` y su representación (riesgo R-09).

## Pruebas de software

16. International Software Testing Qualifications Board. (s. f.). *ISTQB Glossary*. https://glossary.istqb.org/
    → Usada para: definiciones de prueba de integración y prueba de sistema.

17. Sommerville, I. (2016). *Software engineering* (10.ª ed.). Pearson.
    → Usada para: niveles de prueba (capítulo 8, *Software testing*).

18. Meta Platforms, Inc. (s. f.). *Jest — Getting started*. https://jestjs.io/docs/getting-started
    → Usada para: el framework de pruebas automatizadas del proyecto.

19. Ladjs. (s. f.). *SuperTest* [Repositorio de código]. GitHub. https://github.com/ladjs/supertest
    → Usada para: pruebas HTTP sobre la API.
