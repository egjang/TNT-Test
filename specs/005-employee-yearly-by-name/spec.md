# Feature Specification: Employee Yearly Sales by Name Join

**Feature Branch**: `[005-employee-yearly-by-name]`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "우측 패널의 영업사원별 매출액 조회시 emp_seq를 기준으로 조인한 것을 emp_name으로 바꿔서 조회해줘."

## Overview
- Goal: 우측 패널 조회에서 직원 조인을 emp_seq 대신 emp_name 기준으로 수행하여 이름 기준 집계/표시를 지원한다.
- Scope: Backend `/api/v1/sales/employee-yearly`에 선택적 파라미터 추가 및 우측 패널 호출 변경.

## Functional Requirements
- [ ] FR-1: API는 `joinKey=emp_name`과 `empNames=<csv>`를 지원한다.
- [ ] FR-2: `joinKey=emp_name`일 때, 동일한 emp_name을 갖는 다중 emp_seq의 매출을 합산하여 반환한다.
- [ ] FR-3: 회사 합계(companyTotals)도 이름 필터를 반영한다.
- [ ] FR-4: 기존 시퀀스 기반 동작은 기본값으로 유지(하위호환).

## Acceptance Criteria
- [ ] AC-1: 우측 패널이 이름 목록으로 조회 시 반환 데이터가 이름 기준으로 합산되어 표시된다.
- [ ] AC-2: `empSeqs` 기반 호출은 기존과 동일하게 동작한다.

