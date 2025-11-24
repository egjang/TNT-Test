# Implementation Plan: VIBE Workspace Menu

## Context
- Frontend-only change in existing menu system.
- Lab 메뉴 그룹(`frontend/src/features/menu/items.ts`)은 children 배열로 구성되며, `frontend/src/features/main/MainView.tsx`에서 key별로 화면을 매핑한다.
- Lab 관련 화면은 `frontend/src/features/lab/`에 위치.

## Scope & Target Files
- `frontend/src/features/menu/items.ts`: Lab 그룹 하위에 `VIBE Workspace` 메뉴 key/label 추가.
- `frontend/src/features/main/MainView.tsx`: 새 key 선택 시 워크스페이스 화면을 렌더하도록 분기 추가.
- `frontend/src/features/lab/VibeWorkspace.tsx`(신규): 제목+플레이스홀더를 가진 화면 컴포넌트.
- Specs: `specs/012-vibe-workspace/spec.md`, `.baseline/spec.md`, `tasks.md` 관리.

## Implementation Steps
1) 메뉴 정의 확장: Lab children에 `VIBE Workspace` 항목 추가(고유 key 사용, 기존 순서 유지).
2) 화면 추가: `VibeWorkspace.tsx`를 작성해 제목, 설명/준비중 안내 표시.
3) 라우팅 매핑: `MainView.tsx`에 새 key → `VibeWorkspace` 렌더 분기 추가.
4) 간단 점검: 빌드 타입체크 및 메뉴/화면 전환 수동 확인.

## Risks / Notes
- 기존 Lab 메뉴 동작 회귀 없도록 key 충돌/순서 변경 주의.
- Feature flag는 사용하지 않음(요구 범위 밖).

