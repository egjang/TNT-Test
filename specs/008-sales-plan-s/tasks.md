# Tasks: Sales Plan (S)

## Rules
- Number sequentially (T001, T002...)
- Include exact file paths
- Prefer tests before implementation

## Tasks
- T001: Copy component — `tnt_sales/frontend/src/features/sales_plan/SalesPlanNew.tsx` → `tnt_sales/frontend/src/features/sales_plan/SalesPlanS.tsx` (export renamed to `SalesPlanS`).
- T002: Add menu item — `tnt_sales/frontend/src/features/menu/items.ts` (key=`sales-plan-s`, label=`목표수립(S)`).
- T003: Route to component — `tnt_sales/frontend/src/features/main/MainView.tsx` (when selectedKey=`sales-plan-s`, render `SalesPlanS`).
- T004: Merge-right layout — `tnt_sales/frontend/src/App.tsx` (include `sales-plan-s` in mergeRight condition).
- T005: Manual smoke test — Navigate to both 목표수립 and 목표수립(S); verify identical behavior.
- T006: Add bottom status panel in bulk popups — `tnt_sales/frontend/src/features/sales_plan/SalesPlanS.tsx` (일괄입력/일괄비율 팝업 하단에 `target_stage`와 `plan_type` 요약 표시; `P`는 붉은 글씨).
