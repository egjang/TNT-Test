# Repository Guidelines

## Project Structure & Module Organization
- Monorepo layout:
  - `frontend/` React app: `src/`, `public/`.
  - `backend/` Spring Boot service: `src/main/java`, `src/main/resources`, `src/test/java`.
  - `db/` migrations (Flyway/Liquibase) and seed scripts (optional).
  - `.codex/`, `.specify/` agent prompts/templates (update only when changing agent workflows).
-. Examples:
  - `frontend/src/features/orders/OrderList.tsx`
  - `backend/src/main/java/com/tnt/alert1/orders/OrderController.java`

## Build, Test, and Development Commands
- Prereqs: Node 22+, Java 21 (JDK 21), Maven 3.9+, local MS SQL Server (no containers).
- Frontend:
  - `cd frontend && nvm use || true && npm i`
  - `npm run dev` (local dev), `npm test`, `npm run build`.
- Backend (Maven 3.9+):
  - `cd backend && mvn -v` (Maven/JDK 확인: JDK 21 표시되어야 함)
  - Run: `mvn spring-boot:run`
  - Test: `mvn test`
  - Build: `mvn clean package`
  Vite dev server proxies `/api` to Spring Boot on `:8080`.

## Coding Style & Naming Conventions
- Frontend: 2-space indent; Prettier + ESLint. Component files `PascalCase.tsx`; hooks `useX.ts`; modules `kebab-case.ts`.
- Backend: 4 spaces; packages `lowercase.dot.names`; classes `PascalCase`; methods/fields `camelCase`. Use Spotless/Checkstyle if configured.
- REST: base path `/api/v1/...`; DTOs in `.../dto`; services in `.../service`.

## Testing Guidelines
- Frontend: Jest + React Testing Library; name `*.test.tsx`. Avoid network; mock fetch/axios.
- Backend: JUnit 5 + Mockito; integration via `@SpringBootTest`. Prefer Testcontainers MSSQL for DB tests. Use `application-test.yml`.
- Target ≥80% coverage on changed lines.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- PRs: clear description, linked issues, screenshots for UI, and API examples for backend changes. CI green (lint, tests, type checks).

## Security & Configuration Tips
- Backend DB config (`backend/src/main/resources/application-local.yml`):
  - `spring.datasource.url: jdbc:sqlserver://localhost:1433;encrypt=false;databaseName=tnt_sales`
  - `spring.datasource.username: <user>` / `spring.datasource.password: <password>`
  - Run with `-Dspring.profiles.active=local`.
- Frontend env: `.env.local` if needed (e.g., `VITE_API_BASE_URL=http://localhost:8080/api`). Do not commit secrets.
- No Docker usage. Use a locally installed MS SQL Server or a shared dev instance.
- Use parameterized queries/JPA; validate inputs; scrub sensitive fields from logs.

## Agent-Specific Notes
- Keep `.codex/` and `.specify/` templates in sync with actual workflows and document changes in PRs.

