# Implementation Plan: Expiry Inventory (DEX)

Branch: [011-expiry-inventory-dex] | Date: 2025-11-21 | Spec: specs/011-expiry-inventory-dex/spec.md  
Input: Feature specification from `/specs/011-expiry-inventory-dex/spec.md`

## Summary
- 신규 재고 서브메뉴 “유통기한재고(DEX)”를 추가해 유통기한 기준 재고를 별도 화면에서 조회/필터/정렬하도록 한다.
- 데이터 소스는 Postgres `lg_expiry_stock` 테이블(유통기한 재고 스냅샷)이며, 만료/임박/장기미사용 3가지 조합 모드와 “장기 재고 우선” 정렬(만료→잔여일수↑→미사용일수↓→적재일시↓), totalCount 응답을 포함한다.
- 미정 사항: 백엔드 API 경로/계층, 임박 기준 일수/율, 장기미사용 임계값, 필터 필수값, 권한 정책, 성능 목표·인덱스·파티셔닝.

## Technical Context
**Language/Version**: Frontend TypeScript (React 18 + Vite), Backend Java 21 (Spring Boot)  
**Primary Dependencies**: React, React Query/fetch 기반 API 호출, Jest/RTL, Spring Boot MVC/JPA (기존 백엔드)  
**Storage**: Postgres RDB(테이블 `lg_expiry_stock`) via Spring Data JPA. [NEEDS CLARIFICATION: 인덱스/파티셔닝, 조회 시점(스냅샷 vs 실시간), MSSQL 지원/대체 테이블 여부]  
**Testing**: Frontend Jest + React Testing Library; Backend JUnit 5 (mock MVC)  
**Target Platform**: Web (Vite frontend + Spring Boot API on :8080)  
**Project Type**: web (frontend + backend)  
**Performance Goals**: [NEEDS CLARIFICATION: 조회 응답 시간/동시 사용자 목표, 페이지당 건수]  
**Constraints**: Frontend 리스트 표준(limit/offset, 무한스크롤), 메뉴 Feature flag 기본 ON, UI 버튼/모달 표준 준수, 백엔드 프로필(mssql/postgres) 호환 유지, 판매 제한/처분 기준 노출  
**Scale/Scope**: [NEEDS CLARIFICATION: 예상 데이터 건수, 임박 기준 정책, 사용자 수, 테이블 적재 주기]

## Constitution Check
- Constitution 문서가 저장소에 노출되지 않아 AGENTS.md 기준으로 해석: 메뉴 표준, Feature flag 기본 ON, 리스트 페이지네이션/무한스크롤, 버튼/모달 표준 준수.
- Violations: 없음 (향후 데이터 소스/권한 정책 확정 시 재검토 필요).
- Progress: Initial Constitution Check 계획 수립 완료 (실제 적용은 디자인 이후 재확인).

## Project Structure

### Documentation (this feature)
```
specs/011-expiry-inventory-dex/
├── plan.md              # 이 문서
├── research.md          # Phase 0 산출물 (/plan 후 작성)
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/           # Phase 1 API/타입 계약
└── tasks.md             # Phase 2 산출물 (/tasks에서 생성)
```

### Source Code (repository root)
```
backend/
├── src/main/java/...    # Spring Boot API (DEX 엔드포인트 확장 시)
└── src/test/java/...    # 백엔드 테스트

frontend/
├── src/features/menu/   # 메뉴 정의 (새 key/label)
├── src/features/inventory/ # DEX 화면/컴포넌트/훅
├── src/features/main/   # 메뉴 key → 화면 라우팅
├── src/config/          # feature flags
└── src/tests/           # Contract/UI 테스트 추가 예정
```

**Structure Decision**: Web 애플리케이션 구조 선택 (frontend + backend). 기존 Vite+Spring Boot 모노레포 구조를 유지하며, 재고 관련 프런트엔드 파일과 필요한 경우 백엔드 API를 동일 경로에 확장.

## Phase 0: Outline & Research
1. 미확정 사항 수집: DEX API 경로/응답 필드, 임박 기준 일수/율, 장기미사용 임계값, 판매 금지/처분 기준, 필터 필수값, 권한/Feature flag 범위, pagination+totalCount 규격.
2. 테이블 `lg_expiry_stock` 스키마 확인(인덱스/파티셔닝/적재 주기) 및 MSSQL 대안 필요 여부 조사.
3. 기존 `ExpiryStockView`/재고 API 구조 확인해 재사용 가능성, 공용 훅 여부 조사.
4. 연구 결과를 `research.md`에 정리: 결정 사항, 대안, 근거.

## Phase 1: Design & Contracts
1. `data-model.md`에 ExpiryInventoryItem/FilterCriteria 스키마와 상태(만료/임박/정상) 정의, 판매 제한/처분 판단 로직용 기준 필드(remain_day, remain_rate, exp_chk, out_not_use_date, in_not_use_date) 명시.
2. `contracts/`에 DEX 리스트 API 계약 추가 (쿼리: limit/offset, 필터; 응답: items + paging/totalCount; 기본 정렬 = 장기 재고 우선). [NEEDS CLARIFICATION: 기존 엔드포인트 재활용 vs 신설]
3. Contract 테스트 생성 계획(프런트 mock API 또는 백엔드 MockMvc) 정의.
4. `quickstart.md`에 메뉴 선택 → 조회 → 필터 변경 → 판매 금지/처분 대상 정렬/필터 → 에러/빈 상태 확인 흐름 정리.
5. Constitution 재검토: 리스트 표준, Feature flag, 메뉴 라벨/키 충돌 여부, DB 프로파일 호환성 확인.

## Phase 2: Task Planning Approach
- /tasks 명령으로 생성 예정: 설계 산출물 기반으로 테스트 우선(TDD), 파일 경로 명시, 병렬 가능한 작업에 [P] 표기.
- 계약별 테스트 → 모델 → 서비스/훅 → UI → 권한/feature flag → 에러/빈 상태 순으로 정렬.
- 리스트는 limit/offset 기준 무한 스크롤 또는 페이지네이션을 포함하고, 필터/정렬/상태 강조를 테스트에 먼저 정의.

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (none) | | |

## Progress Tracking
**Phase Status**:
- [ ] Phase 0: Research complete
- [ ] Phase 1: Design complete
- [ ] Phase 2: Task planning complete
- [ ] Phase 3: Tasks generated
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented
