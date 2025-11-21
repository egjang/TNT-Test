# Feature Specification: 단가 아이콘 및 팝업 (Unit Price Popup)

- Title (KO): 목표수립 Simulation 패널에 단가 아이콘 추가 및 팝업
- Slug: 007-unit-price-popup
- Scope: Frontend(`SalesPlanNew`) + Backend(API aggregate by employee name)
- Owner: Sales

## Summary
목표수립(신규) 화면의 Simulation 패널 헤더에서 거래처 수 텍스트 왼쪽에 단가(가격) 아이콘을 추가한다. 아이콘 클릭 시 팝업을 띄워 invoice 테이블에서 로그인 사용자명(`curr_emp_name`)과 일치하는 레코드를 전수 조회하여, 영업관리단위(`sales_mgmt_unit`)별 `cur_amt` 합계를 보여준다. 팝업은 다른 팝업과 동일하게 X 버튼과 ESC 키로만 닫힌다.

## Functional Requirements (FR)
- FR-001: Simulation 헤더의 거래처 수 텍스트 왼쪽에 단가 아이콘이 노출되어야 한다.
- FR-002: 아이콘 클릭 시 모달 팝업이 열려야 한다.
- FR-003: 팝업은 invoice에서 `curr_emp_name == 로그인 사용자명` 조건으로 필터링된 모든 레코드를 `sales_mgmt_unit` 기준으로 그룹화하여 `SUM(cur_amt)` 합계를 표로 보여준다.
- FR-004: 로그인 사용자명은 `localStorage['tnt.sales.empName']`에서 읽는다. 값이 없으면 오류 메시지를 팝업에 표시한다.
- FR-005: 팝업은 X 버튼과 ESC 키로만 닫히고, 오버레이 클릭으로는 닫히지 않는다.

## Acceptance Criteria (AC)
- AC-001: 헤더에 아이콘이 보이고, 포커스 가능(접근성)하며 클릭 시 팝업이 열린다.
- AC-002: 팝업 표는 두 컬럼(영업관리단위, 합계)으로 표시되며, 합계는 천단위 구분으로 포맷되고 원(₩) 단위를 명시한다.
- AC-003: 로그인 사용자명이 없을 경우 "로그인이 필요합니다" 메시지가 팝업에 표시된다.
- AC-004: ESC 키를 누르면 팝업이 닫힌다. X 버튼 클릭 시에도 닫힌다.
- AC-005: API는 `GET /api/v1/dashboard/unit-amounts-by-emp?empName=...`를 제공하고, `[ { sales_mgmt_unit, amount } ]` 형태로 반환한다.

## Non‑Functional
- NFR-001: 쿼리는 Postgres 우선. 환경변수로 테이블/컬럼명을 치환 가능:
  - `app.invoice.table` (default `public.invoice`)
  - `app.invoice.columns.curr_emp_name` (default `curr_emp_name`)
  - `app.invoice.columns.sales_mgmt_unit` (default `sales_mgmt_unit`)
  - `app.invoice.columns.cur_amt` (default `cur_amt`)
- NFR-002: 기존 스타일 가이드를 준수하여 버튼/모달 UI 구성.

## Out of Scope
- 기간 필터, 회사(TNT/DYS) 필터, 통화 변환.

