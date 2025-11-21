# Repository Guidelines

## Project Structure & Module Organization
- Monorepo layout:
  - `frontend/` React app: `src/`, `public/`.
  - `backend/` Spring Boot service: `src/main/java`, `src/main/resources`, `src/test/java`.
  - `db/` migrations (Flyway/Liquibase) and seed scripts (optional). For Flyway, place migrations under `backend/src/main/resources/db/migration/...`.
  - `.codex/`, `.specify/` agent prompts/templates (update only when changing agent workflows).
-. Examples:
  - `frontend/src/features/orders/OrderList.tsx`
  - `backend/src/main/java/com/tnt/alert1/orders/OrderController.java`

## Build, Test, and Development Commands
- Prereqs: Node 22+, Java 21 (JDK 21), Maven 3.9+, local MS SQL Server and/or PostgreSQL (no containers).
- Frontend:
  - `cd frontend && nvm use || true && npm i`
  - `npm run dev` (local dev), `npm test`, `npm run build`.
- Backend (Maven 3.9+):
  - `cd backend && mvn -v` (Maven/JDK 확인: JDK 21 표시되어야 함)
  - Run (MSSQL): `mvn spring-boot:run -Dspring-boot.run.profiles=mssql`
  - Run (Postgres): `mvn spring-boot:run -Dspring-boot.run.profiles=postgres`
  - Test: `mvn test`
  - Build: `mvn clean package`
  Vite dev server proxies `/api` to Spring Boot on `:8080`.

## Coding Style & Naming Conventions
- Frontend: 2-space indent; Prettier + ESLint. Component files `PascalCase.tsx`; hooks `useX.ts`; modules `kebab-case.ts`.
- Backend: 4 spaces; packages `lowercase.dot.names`; classes `PascalCase`; methods/fields `camelCase`. Use Spotless/Checkstyle if configured.
- REST: base path `/api/v1/...`; DTOs in `.../dto`; services in `.../service`.

### UI Button Standard (Dashboard CTA)
- Base: `btn` remains the common shape, padding, cursor, and gray-tone default.
- 3D press effect: use `btn-3d`. It adapts to color via CSS custom properties and provides soft pressed feedback.
  - Color variables (optional):
    - `--btn-3d-color`: base background color.
    - `--btn-3d-text`: text color.
- Dashboard-style neutral buttons: use `btn-card btn-3d` to match the summary cards’ tone (panel background, border, text) with diffused shadows.
  - This is now the default look for the dashboard action buttons (e.g., 이탈거래처, 신규 거래처).
- Accent buttons (optional, blue theme): `btn-accent btn-3d` uses theme `--accent` and `--on-accent`.
- Per-button color override example (React inline):
  - `<button className="btn btn-3d" style={{ ['--btn-3d-color' as any]: '#f59e0b', ['--btn-3d-text' as any]: '#0b1220' }}>Action</button>`

### Popup/Modal Standard
- Close control: `button.btn-plain` or `span.icon-button` with `<img class="icon" src={closeIcon} alt="닫기" />`.
- Accessibility: include `aria-label="닫기"` and optional `title="닫기"`.
- Cursor: must indicate clickability. `btn-plain` sets `cursor: pointer;` globally; `icon-button` already uses pointer.
- Behavior: close on X click and `Escape` key only (no backdrop click) unless UX explicitly states otherwise.
- Placement: typically `position: absolute; top: 8px; right: 8px` inside the modal/panel container.
- Draggable: all popups must be mouse-draggable using `useDraggableModal`. Add an invisible header drag zone: `{...drag.bindHeader}` with style `position:absolute; top:0; left:0; right:36; height:32; cursor:'move'`.
- ESC wiring: add `useEffect` that registers a `keydown` listener (capture phase) while open to close on `Escape`:
  - `window.addEventListener('keydown', onKey, true)` and remove with the same capture flag.

Reference implementation examples:
- `frontend/src/features/sales_plan/SalesPlanS.tsx` (various modals)
- `frontend/src/features/sales_dashboard/SalesStrategyPanel.tsx` (새 전략 모달)

Reference styles:
- `frontend/src/styles/index.css`: `.btn`, `.btn-3d`, `.btn-card`, `.btn-accent`.
- Dashboard usage: `frontend/src/features/dashboard/Dashboard.tsx`.

### Icons
- Unit price (단가) icon: use `frontend/src/assets/icons/price-tag.svg` (not `money.svg`) to avoid overlap with sales/revenue symbolism.

### List Pagination & Infinite Scroll (Project Standard)
- Backend list endpoints SHOULD accept `limit` and `offset` query params.
  - Default `limit` = 100; allow up to 1000 when needed.
  - Example (customers): `/api/v1/customers?limit=100&offset=200`.
- Frontend lists SHOULD implement infinite scroll on the scrollable container:
  - First load: `limit=PAGE_SIZE`, `offset=0`.
  - On near-bottom (scrollTop + clientHeight >= scrollHeight - 48), fetch next with `offset += PAGE_SIZE` and append.
  - Compute `hasMore` as `page.length >= PAGE_SIZE`.
  - Show bottom loader while fetching; when no more pages, render `마지막 데이터입니다.` centered and muted.
- Merge per-row flag maps (e.g., recent invoice, demand) across pages rather than replacing state.
- Keep container with a fixed height via `maxHeight` and `overflow: auto` to ensure consistent scroll detection.

## Testing Guidelines
- Frontend: Jest + React Testing Library; name `*.test.tsx`. Avoid network; mock fetch/axios.
- Backend: JUnit 5 + Mockito; integration via `@SpringBootTest`. Prefer Testcontainers MSSQL for DB tests. Use `application-test.yml`.
- Target ≥80% coverage on changed lines.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- PRs: clear description, linked issues, screenshots for UI, and API examples for backend changes. CI green (lint, tests, type checks).
 - Branch strategy: one feature = one branch named `feat/<NNN-slug>`; merge via PR only. Reverts use `revert: ...` commits (prefer `git revert` over `reset`).

## Security & Configuration Tips
- Backend DB config (Spring profiles):
  - Shared defaults: `backend/src/main/resources/application.yml`
  - MSSQL profile `mssql`: `backend/src/main/resources/application-mssql.yml`
    - `spring.datasource.url: jdbc:sqlserver://localhost:14233;encrypt=false;databaseName=TNT`
    - `spring.datasource.username: <user>` / `spring.datasource.password: <password>`
  - Postgres profile `postgres`: `backend/src/main/resources/application-postgres.yml`
    - `spring.datasource.url: jdbc:postgresql://localhost:5432/postgres`
    - `spring.datasource.username: <user>` / `spring.datasource.password: <password>`
  - Activate via JVM/System property: `-Dspring.profiles.active=mssql` or `postgres`.
  - Add Postgres driver to `backend/pom.xml`:
    ```xml
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    ```
- Frontend env: `.env.local` if needed (e.g., `VITE_API_BASE_URL=http://localhost:8080/api`). Do not commit secrets.
- No Docker usage. Use a locally installed MS SQL Server or PostgreSQL, or a shared dev instance.
- Use parameterized queries/JPA; validate inputs; scrub sensitive fields from logs.

## Data Dictionary & DB Standards
- Dictionary source (Postgres): `tnt_db_dic/dictionary/postgres/<db>/<schema>.json` (Markdown: `tnt_db_dic/docs/datadict-postgres-<db>-<schema>.md`).
- Regenerate dictionary (uses saved PG env in `tnt_db_dic/tools/.env.local`):
  - `cd tnt_db_dic/tools && npm i`
  - `node generate-pg-dict.js --schema=public --outDir=../docs --includeIndexes=true`
- Check new/changed SQL against standards and dictionary before committing DB changes:
  - `node tnt_db_dic/tools/check-sql-standards.js --sql=<path.sql> --dict=tnt_db_dic/dictionary/postgres/<db>/<schema>.json`
- Preferred standard columns (examples): `customer_name`, `sales_rep_id`, `created_at/updated_at`, `created_by/updated_by`. Keep names/types consistent with the dictionary and `tnt_db_dic/dictionary/standards.json`.

## Agent-Specific Notes
- Keep `.codex/` and `.specify/` templates in sync with actual workflows and document changes in PRs.
 - Requirement intake (CLI) → auto‑spec policy:
   - On any new feature/request from the user, first ASK which specs feature to record it in:
     - Option A: existing feature folder (user picks one)
     - Option B: create a new feature (propose `NNN-<slug>` and wait for confirmation)
   - Once confirmed, scaffold (if new) or update the selected feature under `tnt_sales/specs/<NNN-feature-slug>/` with `spec.md`, `plan.md`, `tasks.md`, and `.baseline/spec.md` (seed baseline = current `spec.md`). Use the templates in `.specify/templates/` and include FR-/AC- numbered items.
   - On additional or changed requirements for an existing feature, run `tnt_sales/scripts/spec-diff --feature <path>` to compute deltas, generate a report, and propose updates to `spec.md`/`plan.md`/`tasks.md`.
   - Always present a concise summary of the detected changes, the target specs folder, and the exact files to update, then request user confirmation before applying spec changes and before implementing code.
   - Naming: use a 3‑digit prefix for ordering (e.g., `000-main-screen`, `001-...`). Preserve FR-/AC- identifiers across edits.
   - Slug policy: When the user supplies a Korean (or non‑ASCII) title, generate an English slug by translating common domain terms to concise English (lowercase `[a-z0-9-]`, hyphen‑separated). Maintain a small, extendable glossary in the tooling; when no mapping exists, fall back to a safe transliteration. Keep the original (Korean) title inside `spec.md`.
 - Feature flags:
   - Frontend: Vite env (e.g., `VITE_FEATURE_DEMAND_MANAGEMENT=true|false`) read via `src/config/flags.ts` and gate UI exposure.
   - Backend: Spring properties (e.g., `feature.demand.enabled=true|false`) read via `@ConfigurationProperties` and gate endpoints/services.
   - Default flags should be `true`; turning off hides/deactivates the feature without code removal.
 - Rollback workflow:
   - Use `tnt_sales/scripts/rollback-feature --feature tnt_sales/specs/<NNN-slug>` to:
     1) Compute deltas vs baseline and append cleanup tasks to `tasks.md`.
     2) Restore `spec.md` from `.baseline/spec.md`.
     3) Generate Flyway revert stubs for MSSQL/Postgres with next version numbers.
     4) Print suggested `git revert` commands for code rollback.
