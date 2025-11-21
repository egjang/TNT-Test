# Feature Specification: Expiry Inventory (DEX)

Original title (Korean): 유통기한재고(DEX)  
Feature Branch: [011-expiry-inventory-dex]  
Status: Draft  
Created: 2025-11-21  

## Overview
- Purpose: 재고 메뉴에 유통기한 기반 재고(DEX) 뷰를 별도 서브메뉴로 제공해, 임박/만료·장기 재고를 빠르게 파악하고 조치할 수 있게 한다.
- Scope: 재고 메뉴 내 신규 서브메뉴와 화면, 백엔드 조회 API(데이터 소스: `lg_expiry_stock` 테이블) 추가. 기존 “유통기간재고”/“재고(OLD)”와 구분되는 DEX 전용 조회 UX를 제공한다.
- Result: 사용자가 재고 메뉴에서 “유통기한재고(DEX)”를 선택해 유통기한 기준 재고를 확인하고 필터링/정렬을 수행할 수 있는 상태.

## User Scenarios & Testing *(mandatory)*

### Primary User Story
- 재고 담당자는 재고 메뉴에서 “유통기한재고(DEX)”를 선택해 품목·로트별 유통기한을 확인하고, 임박/만료 재고를 우선 소진하기 위한 조치를 결정한다.

### Acceptance Scenarios
- AC-001: Given 재고 메뉴 접근, When “유통기한재고(DEX)” 서브메뉴를 클릭, Then DEX 전용 화면이 열리고 제목/탭 등에서 기존 재고 화면과 명확히 구분된다.
- AC-002: Given DEX 화면, When 기본 조회를 실행, Then 유통기한이 포함된 재고 행이 표로 노출되고 유통기한·수량·품목 식별 정보가 확인된다.
- AC-003: Given 목록이 로드됨, When 임박/만료 여부를 확인, Then 만료(<오늘)/임박(오늘 기준 14일 이내 또는 잔여율 ≤ 15%) 상태가 시각적으로 명확히 구분된다.
- AC-004: Given 사용자가 검색 조건 입력, When 품목/창고/로트/유통기한 범위 등으로 필터 후 조회, Then 결과가 해당 조건으로 재계산된다.
- AC-005: Given 조회 결과가 없음, When 화면을 확인, Then “데이터가 없습니다” 등의 빈 상태 메시지와 검색 조건 확인 안내가 표시된다.
- AC-006: Given 판매 제한/폐기 대상 분석, When exp_chk·remain_day·remain_rate 조건으로 필터/정렬, Then “판매 금지/신속 처분” 우선순위 판단이 가능하도록 결과가 노출된다. [NEEDS CLARIFICATION: 판매 금지 기준 정의, remain_day 임계값]
- AC-007: Given 데이터 소스, When API가 `lg_expiry_stock`에서 조회, Then 응답 필드가 테이블 컬럼(품목/로트/유통기한/창고/분류/수량/사용일수 등)과 매핑되어 반환된다. [NEEDS CLARIFICATION: 노출 제외/추가 필드]
- AC-008: Given 정렬 기본값, When 화면을 조회, Then “장기 재고 우선” 정렬(만료 우선 → 잔여일수 오름차순 → 최종출고이후미사용일수 내림차순 → 적재일시 내림차순)이 적용된다.
- AC-009: Given 페이징, When 목록 상단/하단 정보 확인, Then totalCount가 표시되고 추가 로드/무한스크롤로 이어서 볼 수 있다.

### Edge Cases
- 데이터 없음 또는 API 오류 시 사용자에게 원인과 재시도/문의 방법 안내.
- 유통기한이 없는 재고(비기한 품목) 처리 방식. [NEEDS CLARIFICATION: 표시/제외 규칙]
- 동일 품목·로트가 여러 창고/위치에 있을 경우 집계 vs 개별 행 노출. [NEEDS CLARIFICATION]
- 권한이 없는 사용자가 접근할 때 메뉴 노출/접근 거부 처리. [NEEDS CLARIFICATION]

## Requirements *(mandatory)*

### Functional Requirements
- FR-001: 재고 메뉴 하위에 “유통기한재고(DEX)” 서브메뉴를 추가하고 기존 “유통기간재고”/“재고(OLD)”와 시각적으로 구분해 노출한다.
- FR-002: “유통기한재고(DEX)” 선택 시 DEX 전용 화면으로 이동하며, 메뉴 키가 고유해야 한다(예: `inventory:dex`).
- FR-003: 화면에는 최소한 품목(코드/명), 로트/배치, 유통기한, 잔여수량, 창고/위치, 분류(대/중/소), 단위, 만료/임박 상태(exp_chk, remain_day, remain_rate) 정보가 표 형태로 제공된다.
- FR-004: 목록 기본 정렬은 “장기 재고 우선”으로 적용한다: 만료(expired) 우선 → 잔여일수(remain_day) 오름차순 → 최종출고이후미사용일수(out_not_use_date) 내림차순 → 적재일시(loaded_at) 내림차순.
- FR-005: 사용자 입력으로 품목코드/명, 창고(wh_seq/wh_name), 로트(lot_no), 유통기한 범위(exp_date), 잔여일수(remain_day 범위), 만료 여부(exp_chk), 분류(대/중/소), 잔여율(remain_rate 범위), 미사용일수(out_not_use_date/in_not_use_date 범위)를 필터로 제공하고 조회를 트리거할 수 있어야 한다.
- FR-006: 대용량 대비 리스트 페이지네이션/무한 스크롤 표준(limit/offset, 기본 limit=100)을 준수하며 totalCount를 응답/표시한다.
- FR-007: 판매 제한/우선 처분 판단을 돕기 위해 3가지 조합 모드 (1) 만료/판매금지: exp_chk=expired 또는 remain_day<=0, (2) 임박/신속처분: remain_day<=14 또는 remain_rate<=0.15, (3) 장기미사용: out_not_use_date>=30 또는 in_not_use_date>=30)을 제공하고, 각 모드로 필터/정렬이 가능하다.
- FR-008: 데이터 취득 실패(네트워크/서버 오류) 시 오류 메시지와 재시도 기능을 제공한다.
- FR-009: 메뉴 노출 및 데이터 접근 권한을 Role/Feature flag로 제어하며 기본 활성 상태여야 한다.
- FR-010: 화면 타이틀/탭/헤더에 “유통기한재고(DEX)” 명칭을 명시해 다른 재고 화면과 혼동되지 않도록 한다.
- FR-011: 백엔드 API는 `lg_expiry_stock` 테이블을 조회하며, 필드 매핑은 컬럼명 그대로 또는 정의된 DTO로 반환한다.
- FR-012: API는 limit/offset 파라미터와 필터 파라미터(품목/창고/유통기한/만료여부 등)를 수용하고 totalCount/hasMore 여부를 응답한다.

### Key Entities
- **ExpiryInventoryItem**: `lg_expiry_stock` 컬럼 기반(품목코드/명, 규격, 로트, 유통기한, 잔여일수/율, 만료여부, 수량, 창고, 분류 대/중/소, 단위, 제조/입고/최종출고일, 미사용일수, 자산 정보, 적재일시).
- **FilterCriteria**: 품목코드/명, 창고, 로트, 유통기한 범위, 잔여일수 범위, 만료 여부(exp_chk), 분류(대/중/소), 미사용일수 조건.
- **User/Role**: 메뉴 접근 권한, 조회 가능 데이터 범위.

## Review & Acceptance Checklist

### Content Quality
- [ ] 구현 세부사항 배제(기술 스택/코드 언급 없음)
- [ ] 사용자 가치와 비즈니스 기대에 집중
- [ ] 비기술 이해관계자도 명확히 이해 가능
- [ ] 필수 섹션 모두 채움

### Requirement Completeness
- [ ] [NEEDS CLARIFICATION] 항목 해소
- [ ] 요구사항이 검증 가능하고 모호하지 않음
- [ ] 성공 기준이 측정 가능
- [ ] 범위가 명확히 한정됨
- [ ] 의존성과 가정 정리

## Execution Status
- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed
