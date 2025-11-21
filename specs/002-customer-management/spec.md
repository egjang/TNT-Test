# Feature Specification: 고객관리 (Customer Management)

**Feature Branch**: `[002-customer-management]`
**Created**: 2025-10-12
**Status**: Draft
**Input**: User description: "수요관리와 같은 레벨로 고객관리 메뉴 추가. 수요관리의 하부 메뉴(Excel Upload)는 수요관리 클릭에 따라 접힘/펼침. 고객관리는 별도 요구사항으로 입력 관리."

## Overview
- Goal: 상위 메뉴에 "고객관리"를 추가하고, 고객관리 기능 도입을 위한 진입점을 마련한다
- Primary users: 내부 운영/업무 담당자 (고객 데이터 관리)
- Success criteria: 좌측 상위 메뉴에 "고객관리"가 노출되고 선택 시 중앙에 고객관리 플레이스홀더 화면이 표시된다

## User Scenarios
- [ ] 사용자는 좌측 상위 메뉴에서 "고객관리"를 볼 수 있다
- [ ] 사용자가 "고객관리"를 클릭하면 중앙에 고객관리 플레이스홀더 화면이 표시된다
- [ ] (참고) "수요관리 > Excel Upload"는 "수요관리" 상위 메뉴 클릭 시 접힘/펼침이 된다(메뉴 동작은 메인 화면 스펙에 기록)

## Functional Requirements
- [ ] FR-1: 좌측 상위 메뉴에 "고객관리"를 추가한다
- [ ] FR-2: "고객관리" 클릭 시 중앙 패널에 고객관리 플레이스홀더 화면을 표시한다
- [ ] FR-3: 기능 플래그 `VITE_FEATURE_CUSTOMER_MANAGEMENT`(기본값 true)로 노출을 제어한다
- [ ] FR-4: (초기) 고객관리 화면에는 소개 문구와 빈 상태(플레이스홀더)를 표시한다
- [ ] FR-5: "고객관리" 하위에 "거래처 조회" 메뉴를 추가한다
- [ ] FR-6: 거래처 조회 화면에서 거래처명을 입력받아 LIKE 검색을 수행한다(대소문자 무시, 부분 일치)
- [ ] FR-7: 백엔드 API `GET /api/v1/customers?name=<q>`를 통해 Postgres `public.customer`로부터 `customer_id`,`customer_name`을 조회한다 (최대 100건)

## Out of Scope
- 고객 데이터 CRUD, 검색/필터, 상세/이력, 권한/감사 로그, 백엔드 API

## Open Questions
- [NEEDS CLARIFICATION: 고객 데이터 모델(속성/식별키) 및 연동 범위]
- [NEEDS CLARIFICATION: 권한 정책 및 접근 제어]

## Acceptance Criteria
- [ ] AC-1: 좌측 상위 메뉴에 "고객관리"가 보인다(플래그 on 기준)
- [ ] AC-2: "고객관리" 클릭 시 중앙 패널에 고객관리 플레이스홀더가 표시된다
- [ ] AC-3: 플래그 off 시 "고객관리" 메뉴가 표시되지 않는다
- [ ] AC-4: "고객관리 > 거래처 조회"를 클릭하면 검색 입력과 결과 테이블이 표시된다
- [ ] AC-5: 거래처명을 입력하고 조회 시 해당 이름을 포함하는 결과(부분 일치)가 표시된다(없으면 빈 상태 표시)
