# Implementation Plan: Sales Plan (S)

## Summary
- Clone the existing SalesPlanNew screen into SalesPlanS and wire a new menu route `sales-plan-s` that uses the copied component. Keep the UI and behavior identical initially.

## Steps
- Step 1 — Create component copy
  - Copy `frontend/src/features/sales_plan/SalesPlanNew.tsx` to `SalesPlanS.tsx` and rename export to `SalesPlanS`.
- Step 2 — Wire menu and route
  - Add menu item `sales-plan-s` labeled `목표수립(S)` under 영업목표 in `features/menu/items.ts`.
  - Route `sales-plan-s` to `SalesPlanS` in `features/main/MainView.tsx`.
  - Include `sales-plan-s` in merged-right layout check in `App.tsx`.
- Step 3 — Verify
  - Build and navigate to ensure both screens work independently.
 - Step 4 — Bulk popups bottom panel
  - In `SalesPlanS.tsx`, update bulk input/ratio popups to render a bottom panel summarizing current `target_stage` and `plan_type` from the loaded customer monthly rows. Render `P` in red, `B` in default color.

## Out of Scope
- No changes to backend endpoints.
- No business logic differences at this time — this is a pure fork.

## Rollback
- Remove menu item and route lines; delete `SalesPlanS.tsx`.
