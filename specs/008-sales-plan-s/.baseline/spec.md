# Feature Specification: Sales Plan (S)

Original title (Korean): 목표수립(S)
Feature Branch: [008-sales-plan-s]
Status: Baseline
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

## Acceptance Criteria
- AC-001: The left menu shows "목표수립(S)" under 영업목표.
- AC-002: Selecting "목표수립(S)" renders a screen identical to the existing "목표수립" at initial state.
- AC-003: Removing or altering `SalesPlanS` does not change `SalesPlanNew` behavior (independent sources).
- AC-004: The layout merges the right pane for `sales-plan-s` selection, consistent with `sales-plan-new`.

