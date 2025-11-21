# Feature Specification: Sales Assignment (할당·매출 기반)

**Feature Branch**: `[004-sales-assignment]`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "가운데 패널 목표배정에 '할당(매출 기반)' 버튼 만들고 해당 버튼 클릭시 각 영업사원의 전년 매출(우측패널 매출) 비율(전체 대비 각 영업사원 매출 비율)을 적용하여 회사별 목표합계를 나누어 각 영업사원의 TNT, DYS 매출에 값을 입력해줘."

## Overview
- Goal: 가운데 패널에 "할당(매출 기반)" 버튼을 추가하고, 클릭 시 전년 매출 비율(TNT/DYS 각각)을 이용해 회사별 목표합계를 영업사원별 입력값(TNT/DYS)으로 자동 배분한다.
- Primary users: 영업 관리자/담당자
- Success criteria: 버튼 클릭 시 직원별 목표가 전년 매출 비율대로 정확히 배분되고, 회사별 목표합계와 합산 일치(합계보존).

## User Scenarios
- [ ] Scenario 1: 관리자가 연도를 선택하고 회사별 목표(TNT/DYS)를 입력한 뒤, "할당(매출 기반)"을 눌러 자동 배분한다.
- [ ] Scenario 2: 특정 직원 목록(가운데 패널 필터 기준)으로 표시된 대상에게만 배분이 적용된다.

## Functional Requirements
- [ ] FR-1: 가운데 패널 타이틀 영역에 "할당(매출 기반)" 버튼을 노출한다.
- [ ] FR-2: 상단 회사별 목표(TNT/DYS) 합계를 가운데/우측 패널에서 참조할 수 있도록 브로드캐스트한다.
- [ ] FR-3: 버튼 클릭 시 현재 표시 중인 직원들에 대해 `/api/v1/sales/employee-yearly?year=<Y>&empNames=<csv>&joinKey=emp_name` 또는 `emp_id` 기반으로 전년 매출 분해값(`tnt_amount`, `dys_amount`)을 조회한다. 목표배정 기능에서는 employee 조회/표시에 `emp_seq`를 사용하지 않는다.
- [ ] FR-4: TNT와 DYS 각각 독립적으로 비율 기반 배분을 수행한다.
  - 배정TNT(emp) = 목표TNT합계 × (emp.tnt_amount / Σ tnt_amount)
  - 배정DYS(emp) = 목표DYS합계 × (emp.dys_amount / Σ dys_amount)
- [ ] FR-5: 합계보존을 위해 Largest Remainder 방식으로 반올림(내림 후 소수점 큰 순으로 +1 배분) 처리한다.
- [ ] FR-6: 배분 결과는 가운데 패널의 각 직원 TNT/DYS 입력 필드에 즉시 반영한다.
- [ ] FR-7: 회사별 합계(분모)가 0이면 해당 회사 배분값은 모두 0으로 입력하고 안내 메시지를 표시한다.

## Out of Scope
- 저장/확정 API 동작 변경은 제외(기존 상단 패널 저장/확정 그대로).
- 백엔드 API 추가는 제외(기존 `/api/v1/sales/employee-yearly` 활용).

## Open Questions
- [NEEDS CLARIFICATION] 입력 단위 고정(억원) 여부: 현재 상단 패널은 억원 표기이며, 가운데 패널 입력값도 동일 단위 정수로 유지.

## Risks & Constraints
- 전년 매출 분해 데이터가 없거나 0인 경우 배분은 0이 되며 UX 상 안내 필요.

## Acceptance Criteria
- [ ] AC-1: 배분 후 직원별 목표 합계(TNT, DYS 각각)가 회사별 목표 합계와 정확히 일치한다.
- [ ] AC-2: 배분 비율이 우측 패널의 전년 매출(TNT/DYS) 비율과 일치한다.
- [ ] AC-3: TNT와 DYS는 서로 독립적으로 비율 계산 및 배분한다.
- [ ] AC-4: Σ tnt_amount 또는 Σ dys_amount가 0인 경우 오류 없이 모두 0으로 채워지며 안내가 노출된다.

> Guidance: WHAT/WHY 중심. HOW는 plan.md에 기술.
