# Implementation Plan: Main Screen Layout

## Tech & Modules
- Frontend: Vite + React + TypeScript
- Components: `ResizableColumns`, `Menu`, `MainView`
- Styles: CSS module (global index.css)

## High-Level Steps
1) 프로젝트 스캐폴드(Vite+TS) 및 개발 서버 설정(`/api` 프록시)
2) 3분할 레이아웃 컴포넌트(`ResizableColumns`) 구현: 좌/우 드래그, 최소폭, 로컬 저장
3) 좌측 메뉴(`Menu`) 구성: 첫 항목 "수요관리" + 활성 상태
4) 중앙 업무영역(`MainView`) 구성: 선택 메뉴 표시(초기 플레이스홀더)
5) 기본 스타일 정의: 다크 톤, 헤더, 경계선
6) README/문서화 및 레이아웃 파라미터(초기폭/최소폭) 노출

## Test Strategy
- 수동: 드래그로 폭 조절, 새로고침 후 폭 유지 확인
- 단위(후속): 리사이즈 로직 경계값 테스트, 메뉴 선택 상태

## Risks / Mitigations
- 과도한 축소 시 겹침 → 최소폭/여백 로직으로 방지
- 브라우저별 드래그 이벤트 차이 → 표준 mousemove/mouseup 사용

