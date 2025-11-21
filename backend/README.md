Backend — Multi-DB Profiles (MSSQL, Postgres)

Profiles
- `mssql`: MS SQL Server on localhost:14233 (DB: TNT)
- `postgres`: PostgreSQL on localhost:5432 (DB: postgres)

Run
- MSSQL: `mvn spring-boot:run -Dspring-boot.run.profiles=mssql`
- Postgres: `mvn spring-boot:run -Dspring-boot.run.profiles=postgres`
- Start without a DB (combine with target DB profile):
  - Postgres (no DB required): `mvn spring-boot:run -Dspring-boot.run.profiles=postgres,nodb`
  - MSSQL (no DB required): `mvn spring-boot:run -Dspring-boot.run.profiles=mssql,nodb`

Local Profiles (credentials on developer machine)
- Add your local overrides under `src/main/resources/application-<profile>-local.yml` (git-ignored).
- Example already provided: `application-postgres-local.yml`.
- Run with local overlay: `mvn spring-boot:run -Dspring-boot.run.profiles=postgres,postgres-local`

Postgres SSL (if remote requires SSL)
- Overlay SSL profile: `application-postgres-ssl.yml` sets `sslmode=require`.
- Run with SSL: `mvn spring-boot:run -Dspring-boot.run.profiles=postgres,postgres-local,postgres-ssl`
- If SSL not required and server doesn’t support it, omit `postgres-ssl`.

Config Files
- `src/main/resources/application.yml` — shared defaults
- `src/main/resources/application-mssql.yml` — MSSQL datasource, Flyway locations
- `src/main/resources/application-postgres.yml` — Postgres datasource, Flyway locations

Flyway
- Classpath migrations under `src/main/resources/db/migration/`
  - Common: `db/migration/common/`
  - MSSQL: `db/migration/mssql/`
  - Postgres: `db/migration/postgres/`

Dependencies
- Add Postgres driver in `pom.xml`:
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
  </dependency>

Notes
- Keep dialect auto-detection (Hibernate 6) or set explicit dialects if needed.
 - `nodb` profile disables Flyway and avoids failing-fast datasource so the app can start when DB is down.
