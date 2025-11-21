# Feature Specification: Assignment Save/Confirm (sales_target_assigned)

**Feature Branch**: `[006-assignment-save-confirm]`
**Created**: 2025-11-04
**Status**: Draft
**Input**: "중간 패널에 저장과 확정 버튼을 각각 만들고, 저장은 target_stage=기안중, 확정은 target_stage=확정으로 sales_target_assigned에 입력"

## Overview
- Goal: 중앙(목표배정) 패널에서 현재 직원별 TNT/DYS 배정값을 저장/확정 버튼으로 DB 테이블 `sales_target_assigned`에 기록한다.

## Functional Requirements
- [ ] FR-1: 중앙 패널에 버튼 2개 노출 — "저장", "확정".
- [ ] FR-2: 저장 → `target_stage='기안중'`으로 upsert.
- [ ] FR-3: 확정 → upsert 후 해당 연도 레코드 `target_stage='확정'`으로 일괄 업데이트.
- [ ] FR-4: 단위/라운딩 — UI 단위(억원) 기준 정수 저장(내부 일관성 위해 `Math.round`).

## Acceptance Criteria
- [ ] AC-1: 저장 클릭 시 해당 연도/직원/회사(TNT,DYS)의 배정값이 테이블에 입력되며 `기안중` 상태다.
- [ ] AC-2: 확정 클릭 시 동일 데이터가 입력되고 `확정` 상태로 전환된다.
- [ ] AC-3: 동일 키(target_year, emp_name, company_name) 중복 저장 시 업데이트로 처리된다.

