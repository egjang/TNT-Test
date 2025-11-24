# Tasks: VIBE Workspace Menu

**Input**: Design documents from `/specs/012-vibe-workspace/`

## Tasks
- T001: 스펙 동기화 — `specs/012-vibe-workspace/spec.md`와 `.baseline/spec.md`가 일치하는지 확인하고 필요한 경우 갱신한다.
- T002: 메뉴 추가 — `frontend/src/features/menu/items.ts`에서 Lab children에 `VIBE Workspace` 메뉴(key: `lab:vibe-workspace`, label: `VIBE Workspace`)를 추가한다.
- T003: 화면 컴포넌트 작성 — `frontend/src/features/lab/VibeWorkspace.tsx`를 신규 생성해 제목과 준비중 안내/설명을 렌더한다.
- T004: 라우팅 연결 — `frontend/src/features/main/MainView.tsx`에 `lab:vibe-workspace` 선택 시 `VibeWorkspace`를 표시하도록 분기한다.
- T005: 수동 확인 — 프런트엔드 실행 후 Lab > VIBE Workspace 클릭 시 화면 전환과 기존 Lab 메뉴 회귀 여부를 확인한다.

