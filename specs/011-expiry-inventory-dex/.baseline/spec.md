# Feature Specification: Expiry Inventory (DEX)

Original title (Korean): 유통기한재고(DEX)  
Feature Branch: [011-expiry-inventory-dex]  
Status: Draft  
Created: 2025-11-21  

## Overview
- Purpose: 재고 메뉴에 유통기한 기반 재고(DEX) 뷰를 별도 서브메뉴로 제공해, 임박/만료 재고를 빠르게 파악하고 조치할 수 있게 한다.
- Scope: 재고 메뉴 내 신규 서브메뉴와 화면 추가. 기존 “유통기간재고”/“재고(OLD)”와 구분되는 DEX 전용 조회 UX를 제공한다.
- Result: 사용자가 재고 메뉴에서 “유통기한재고(DEX)”를 선택해 유통기한 기준 재고를 확인하고 필터링/정렬을 수행할 수 있는 상태.

## User Scenarios & Testing *(mandatory)*

### Primary User Story
- 재고 담당자는 재고 메뉴에서 “유통기한재고(DEX)”를 선택해 품목·로트별 유통기한을 확인하고, 임박/만료 재고를 우선 소진하기 위한 조치를 결정한다.

### Acceptance Scenarios
- AC-001: Given 재고 메뉴 접근, When “유통기한재고(DEX)” 서브메뉴를 클릭, Then DEX 전용 화면이 열리고 제목/탭 등에서 기존 재고 화면과 명확히 구분된다.
- AC-002: Given DEX 화면, When 기본 조회를 실행, Then 유통기한이 포함된 재고 행이 표로 노출되고 유통기한·수량·품목 식별 정보가 확인된다. [NEEDS CLARIFICATION: 기본 조회 조건(전체/금일 이후), 기본 정렬(유통기한 오름차순?), 기본 페이지 사이즈]
- AC-003: Given 목록이 로드됨, When 임박/만료 여부를 확인, Then 만료(<오늘)/임박(오늘 기준 X일 이내) 상태가 시각적으로 명확히 구분된다. [NEEDS CLARIFICATION: 임박 기준 일수, 시각적 규칙]
- AC-004: Given 사용자가 검색 조건 입력, When 품목/창고/로트/유통기한 범위 등으로 필터 후 조회, Then 결과가 해당 조건으로 재계산된다. [NEEDS CLARIFICATION: 확정 필터 목록, 필수 조건 여부]
- AC-005: Given 조회 결과가 없음, When 화면을 확인, Then “데이터가 없습니다” 등의 빈 상태 메시지와 검색 조건 확인 안내가 표시된다.

### Edge Cases
- 데이터 없음 또는 API 오류 시 사용자에게 원인과 재시도/문의 방법 안내.
- 유통기한이 없는 재고(비기한 품목) 처리 방식. [NEEDS CLARIFICATION: 표시/제외 규칙]
- 동일 품목·로트가 여러 창고/위치에 있을 경우 집계 vs 개별 행 노출. [NEEDS CLARIFICATION]
- 권한이 없는 사용자가 접근할 때 메뉴 노출/접근 거부 처리. [NEEDS CLARIFICATION]

## Requirements *(mandatory)*

### Functional Requirements
- FR-001: 재고 메뉴 하위에 “유통기한재고(DEX)” 서브메뉴를 추가하고 기존 “유통기간재고”/“재고(OLD)”와 시각적으로 구분해 노출한다.
- FR-002: “유통기한재고(DEX)” 선택 시 DEX 전용 화면으로 이동하며, 메뉴 키가 고유해야 한다(예: `inventory:dex`).
- FR-003: 화면에는 최소한 품목(코드/명), 로트/배치, 유통기한, 잔여수량, 창고/위치 정보가 표 형태로 제공된다. [NEEDS CLARIFICATION: 표준 필드/단위]
- FR-004: 목록은 기본적으로 유통기한 오름차순(임박 우선)으로 정렬되고 만료/임박 상태를 시각적으로 구분한다. [NEEDS CLARIFICATION: 임박 기준, 강조 방식]
- FR-005: 사용자 입력으로 품목, 창고, 로트, 유통기한 범위 등 주요 조건을 필터로 제공하고 조회를 트리거할 수 있어야 한다. [NEEDS CLARIFICATION: 필터 확정 목록, 필수 여부, 초기값]
- FR-006: 대용량 대비 리스트 페이지네이션/무한 스크롤 표준(limit/offset, 기본 limit=100)을 준수한다. [NEEDS CLARIFICATION: API가 offset/limit를 지원하는지 여부; 필요 시 백엔드 확장]
- FR-007: 데이터 취득 실패(네트워크/서버 오류) 시 오류 메시지와 재시도 기능을 제공한다.
- FR-008: 메뉴 노출 및 데이터 접근 권한을 Role/Feature flag로 제어하며 기본 활성 상태여야 한다. [NEEDS CLARIFICATION: 적용 권한 체계]
- FR-009: 화면 타이틀/탭/헤더에 “유통기한재고(DEX)” 명칭을 명시해 다른 재고 화면과 혼동되지 않도록 한다.

### Key Entities
- **ExpiryInventoryItem**: 품목 코드/명, 로트/배치, 유통기한, 창고/위치, 잔여수량, 단위, 상태(만료/임박/정상), 관련 분류/생성 정보. [NEEDS CLARIFICATION: 정확한 필드와 코드셋]
- **FilterCriteria**: 품목/코드, 창고/위치, 유통기한 범위, 임박 기준 일수, 로트/배치, 재고 구분(정상/검사 등). [NEEDS CLARIFICATION]
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
