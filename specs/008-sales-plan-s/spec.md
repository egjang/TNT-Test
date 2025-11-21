# Feature Specification: Sales Plan (S)

Original title (Korean): 목표수립(S)
Feature Branch: [008-sales-plan-s]
Status: Draft
Created: 2025-11-07

## Overview
- Purpose: Create a new Sales Plan screen "목표수립(S)" by forking the existing "목표수립" (SalesPlanNew) UI/logic to enable independent development without impacting the original.
- Scope: Frontend only (menu + route + component). No backend behavior changes.
- Result: A new menu item renders a copied component (`SalesPlanS`) with identical behavior to `SalesPlanNew` as the initial baseline.

## Functional Requirements
- FR-001: Add a new menu entry under 영업목표 labeled "목표수립(S)" with key `sales-plan-s`.
- FR-002: Route `sales-plan-s` to a new component `SalesPlanS` that is a copy of `SalesPlanNew`.
- FR-003: Ensure `SalesPlanS` and `SalesPlanNew` operate independently (separate source files; no shared state coupling beyond shared utilities).
- FR-004: Preserve the merged two-pane layout behavior for `sales-plan-s` (same as `sales-plan-new`).
- FR-005: 초기설정 버튼 실행 시, 선택년도의 전년도(선택년도-1)의 영업관리단위별 로그인 영업사원 평균단가를 가져와 초기 분배된 월별 STD 수량에 곱하여 월별 금액(`amount_01`..`amount_12`)을 함께 저장한다. 평균단가는 `/api/v1/dashboard/avg-unit-price-by-emp` 로직과 동일 기준(assigneeId, companyType, year-1)으로 계산한다.
 - FR-006: 일괄비율/일괄입력 팝업의 행(UI)에서 영업관리단위 옆에 `target_stage`를 함께 표시한다. 또한 해당 행의 `plan_type`이 `P`인 경우 그 행의 수량/금액 표시를 붉은 색으로 강조한다.

## Non-Functional Requirements
- NFR-001: No regressions to existing "목표수립" and related screens.
- NFR-002: Code style and file layout must match existing conventions.

## Acceptance Criteria
- AC-001: The left menu shows "목표수립(S)" under 영업목표.
- AC-002: Selecting "목표수립(S)" renders a screen identical to the existing "목표수립" at initial state.
- AC-003: Removing or altering `SalesPlanS` does not change `SalesPlanNew` behavior (independent sources).
- AC-004: The layout merges the right pane for `sales-plan-s` selection, consistent with `sales-plan-new`.
- AC-005: 초기설정 실행 후, 생성/갱신된 `sales_plan` 레코드의 `amount_01`..`amount_12`가 전년도 평균단가×월별 수량으로 반영되어 저장된다(반올림 정수원화).
 - AC-006: `SalesPlanS`의 일괄입력/일괄비율 팝업에서 각 행의 영업관리단위 오른쪽에 해당 행의 `target_stage`가 배지 형태로 나타난다. 해당 행의 `plan_type`이 `P`면 그 행의 월별 수량/금액(현재/적용 미리보기 포함)이 붉은 색으로 표시된다. 하단 요약 패널은 존재하지 않는다.

## Risks & Notes
- Risk: Future divergence must be documented to avoid confusion with the original screen.
- Note: `SalesPlanS` intentionally starts as a verbatim copy to serve as a safe sandbox for new functionality.
