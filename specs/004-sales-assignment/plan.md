# Implementation Plan: Sales Assignment (할당·매출 기반)

## Tech & Modules
- Frontend
  - Company totals broadcast: `frontend/src/features/sales_assign/SalesAssignCompany.tsx`
  - Allocation UI + logic: `frontend/src/features/sales_assign/SalesAssign.tsx`
- Backend: 기존 `/api/v1/sales/employee-yearly` 활용(변경 없음). 목표배정 컨텍스트의 직원 목록 API(`/api/v1/employees`)는 `emp_seq`를 반환하지 않음.

## High-Level Steps
1) 회사별 목표 합계(TNT/DYS) 브로드캐스트 (localStorage + event)
2) 가운데 패널에 "할당(매출 기반)" 버튼 추가
3) 버튼 클릭 시 전년 매출(TNT/DYS) 기준 비율 배분 + 합계보존 반올림
4) 결과를 입력 필드에 반영하고 안내 메시지 처리
5) 가벼운 타입/빌드 점검

## API Contract
- GET `/api/v1/sales/employee-yearly?year=<Y>&empNames=<csv>&joinKey=emp_name`
  - Response shape (현재 구현 호환):
    - `{ employees: [{ emp_seq, emp_id, emp_name, dept_name, amount, tnt_amount, dys_amount }], companyTotals: [...] }`
    - 또는 단순 배열 `[ { emp_seq, ... } ]` (호환 처리)

## Allocation Logic
- For TNT:
  - total = 목표TNT합계, list = 직원별 `tnt_amount`
  - exact[i] = total × (list[i] / Σ list)
  - floor[i] = ⌊exact[i]⌋, remain = total - Σ floor
  - 소수점 큰 순으로 remain 회수만큼 +1 배분
- DYS 동일 적용
- Σ list == 0 이면 전체 0

## Test Strategy
- 수기 케이스: (TNT 합계 100, 직원 60/40) → 60/40
- 0합계 케이스: Σ list == 0 → 전원 0
- 합계보존: floor+largest remainder 후 총합 == total

## Risks / Mitigations
- API가 느릴 경우: 클릭 시 로딩 상태/중복 클릭 방지(간단 alert 안내)
