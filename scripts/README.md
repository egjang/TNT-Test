spec-diff — Diff spec.md changes and generate tasks/impact report

Usage
- Compare current spec to baseline and write report:
  - python tnt_sales/scripts/spec-diff.py --feature tnt_sales/specs/001-order-list
- Update tasks.md with delta tasks (appends) and refresh baseline:
  - python tnt_sales/scripts/spec-diff.py --feature tnt_sales/specs/001-order-list --update-tasks --update-baseline
- Custom baseline path (defaults to ".baseline/spec.md" under the feature directory):
  - python tnt_sales/scripts/spec-diff.py --feature tnt_sales/specs/001-order-list --baseline prev/spec.md

Behavior
- Parses Functional Requirements (FR-*) and Acceptance Criteria (AC-*) from spec.md.
- Computes added/removed/modified across keys; unkeyed bullets compared by content.
- Writes markdown report to <feature>/spec-diff-report.md and prints a summary.
- With --update-tasks, appends a "Delta Tasks" section to tasks.md.
- With --update-baseline, copies current spec.md to the baseline path.

Conventions
- Prefer stable IDs like FR-1, AC-1 to track changes reliably.
- Keep revision notes in spec.md for human context.

Notes
- If no baseline exists, tool treats all items as added.

new-feature — Scaffold a specs feature folder with translated slug

Usage
- Create from a Korean title (auto translate to slug):
  - tnt_sales/scripts/new-feature --title "영업"   # → 001-sales
  - tnt_sales/scripts/new-feature --title "수요관리" # → 00x-demand-management
- Override slug or NNN:
  - tnt_sales/scripts/new-feature --title "메인 화면" --slug main-screen --nnn 005

- Behavior
- Translates common Korean business terms to concise English slugs via a small built-in glossary; normalizes to `[a-z0-9-]`.
- Picks next available 3-digit prefix by scanning `tnt_sales/specs` unless `--nnn` is given.
- Creates: `spec.md`, `plan.md`, `tasks.md`, `.baseline/spec.md` with the title and date prefilled.
 - If no translation is found, falls back to a safe ASCII transliteration.

rollback-feature — Generate cleanup plan and restore spec baseline

Usage
- tnt_sales/scripts/rollback-feature --feature tnt_sales/specs/001-sales

Behavior
- Runs spec-diff against baseline to append cleanup delta tasks into `tasks.md`.
- Restores `spec.md` from `.baseline/spec.md`.
- Creates Flyway revert stubs under:
  - `backend/src/main/resources/db/migration/mssql/V{n+1}__revert_<slug>.sql`
  - `backend/src/main/resources/db/migration/postgres/V{n+1}__revert_<slug>.sql`
- Prints suggested `git revert` commands to undo code changes safely.
