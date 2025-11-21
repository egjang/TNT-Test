# Implementation Plan: 수요관리 (Demand Management)

## Scope (this step)
- 메뉴에 "수요관리 > Excel Upload" 서브메뉴 추가
- 중앙 패널에 엑셀 파일만 선택 가능한 버튼 및 파일명 표시

## Tech & Modules
- Frontend: React components under `src/features/menu`, `src/features/demand`
- No backend/APIs yet (후속 단계에서 업로드/검증/전송 구현)

## Steps
1) 메뉴 트리 업데이트: `Menu.tsx`에 `demand:excel-upload` 항목 추가
2) 메인 뷰 라우팅: `MainView.tsx`에서 선택키에 따라 `ExcelUpload` 표시
3) 업로드 UI: `ExcelUpload.tsx` 컴포넌트에서 file input `accept` 제한 및 파일명 표기
4) 미리보기: `xlsx` 라이브러리로 첫 시트 파싱 → 표로 렌더(100행×20열 제한), 시트 선택 드롭다운
5) 스타일 보완: 서브메뉴 스타일/공용 버튼/테이블 스타일

## Tests (later)
- 파일 선택 제한(확장자 필터) 동작 확인
- 선택 파일명 표시 확인
- 첫 시트 미리보기 표 렌더 확인(행/열 제한 적용)
- 다중 시트 전환 시 미리보기 갱신 확인

## Risks / Mitigations
- MIME만으로는 완전 검증 불가 → 서버 측 재검증/스키마 체크는 후속 단계에서 추가
