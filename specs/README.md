Specs directory for feature requirements and implementation plans.

Structure
- specs/<###-feature-name>/
  - spec.md — business requirements/spec
  - plan.md — implementation plan
  - tasks.md — ordered task list
  - optional: data-model.md, research.md, contracts/

Conventions
- Use a 3‑digit prefix for ordering (e.g., 001-order-list).
- Keep business WHAT/WHY in spec.md; keep HOW in plan.md.
- Derive tasks.md from plan.md; keep tasks small and testable.

Workflow
1) Write spec.md from user needs
2) Draft plan.md (stack, structure, steps)
3) Generate tasks.md (T001, T002... with file paths)
4) Implement in frontend/backend; keep docs updated

References
- Templates in .specify/templates (spec/plan/tasks)
