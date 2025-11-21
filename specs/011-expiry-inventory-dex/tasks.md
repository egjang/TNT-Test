# Tasks: Expiry Inventory (DEX)

**Input**: Design documents from `/specs/011-expiry-inventory-dex/`  
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
테스트 우선(TDD) 순서를 지키고, 서로 다른 파일 작업은 [P]로 병렬 표시한다.

## Tasks
- T001: 연구 확정 — `specs/011-expiry-inventory-dex/research.md`에 DEX 데이터 소스(`lg_expiry_stock`), API 경로, limit/offset 지원, 필터 목록, 임박/판매 금지 기준, 권한/feature flag 정책을 확정해 기록한다.
- T002 [P]: 백엔드 계약 테스트 — `backend/src/test/java/.../inventory/ExpiryInventoryApiContractTest.java`에 GET `/api/v1/inventory/dex`(query: limit/offset + 필터, 응답: items + paging/totalCount) 스키마 테스트를 추가하고 현재는 실패하도록 만든다(MockMvc/JSONAssert).
- T003: 데이터 모델 정의 — `specs/011-expiry-inventory-dex/data-model.md`와 `backend/src/main/java/.../inventory/dex/ExpiryInventoryItemDto.java`(신규), `frontend/src/features/inventory/types.ts`(신규)에 ExpiryInventoryItem/FilterCriteria 타입과 상태 코드(만료/임박/정상) 매핑을 정의한다.
- T004: 메뉴 노출 — `frontend/src/features/menu/items.ts`에 `inventory:dex` 키와 라벨 “유통기한재고(DEX)”를 feature flag 기본 ON으로 추가한다(기존 재고 메뉴와 구분).
- T005: 라우팅 연결 — `frontend/src/features/main/MainView.tsx`에 `inventory:dex` 선택 시 DEX 화면을 렌더하도록 분기 추가.
- T006: 백엔드 조회 계층 — `backend/src/main/java/.../inventory/dex/ExpiryInventoryRepository.java`(JPA/native)로 `lg_expiry_stock` 조회, 필터/정렬/limit-offset 적용; `ExpiryInventoryService`에 판매 금지/처분 기준(remain_day, exp_chk 등) 파생 상태 계산 포함.
- T007 [P]: 백엔드 API — `backend/src/main/java/.../inventory/dex/ExpiryInventoryController.java`에서 GET `/api/v1/inventory/dex` 구현, request DTO로 필터/페이지 파라미터 수용, response DTO에 paging(totalCount/hasMore) 포함; MockMvc 테스트를 통과시킨다.
- T008: 화면 컴포넌트 구현 — `frontend/src/features/inventory/ExpiryDexView.tsx`(신규)에서 필터(품목/창고/로트/유통기한/잔여일수/만료여부/분류 등), 기본 정렬(유통기한 오름차순), 상태 배지(만료/임박/정상), 에러/빈 상태, limit/offset 기반 로딩을 구현한다.
- T009 [P]: 무한스크롤/페이지네이션 — `ExpiryDexView.tsx` 또는 별도 훅에 list pagination 표준(limit 기본 100, offset 누적) 적용 및 “마지막 데이터입니다.” 표시/하단 로더 구현.
- T010: 프런트 UI/계약 테스트 — `frontend/src/features/inventory/__tests__/ExpiryDexView.test.tsx`에 메뉴→화면 진입, 필터 입력→API 호출 파라미터, 임박/만료 강조, 에러/빈 상태 표시 검증 테스트 작성(초기에는 실패).
- T011 [P]: 문서 정리 — `specs/011-expiry-inventory-dex/quickstart.md`에 메뉴 선택→조회→필터→임박/판매 금지 판단→에러/빈 상태 확인 절차 기록, `contracts/` README 업데이트.
- T012: 수동 검증 — 실제/모의 API로 화면을 실행해 임박/만료 강조, 페이징, 필터 조합을 확인하고 결과를 `specs/011-expiry-inventory-dex/tasks.md`에 체크/메모로 반영.

## Notes
- 테스트(T002, T008)를 해당 구현(T006, T007, T005)보다 먼저 작성/실패시킨 후 구현 단계에서 통과시킨다.
- Feature flag 기본값은 ON으로 두되, 권한/접근 제어 요구가 확정되면 메뉴 노출과 API 호출 모두에 반영한다.
