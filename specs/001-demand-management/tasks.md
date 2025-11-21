# Tasks: 수요관리 (Demand Management)

## Rules
- Number sequentially (T001, T002...)
- Include exact file paths
- Prefer tests before implementation when feasible

## Tasks (implemented)
- T001: 메뉴 서브항목 추가 — `tnt_sales/frontend/src/features/menu/Menu.tsx`
- T002: 메인 뷰 라우팅 — `tnt_sales/frontend/src/features/main/MainView.tsx`
- T003: 업로드 UI 컴포넌트 — `tnt_sales/frontend/src/features/demand/ExcelUpload.tsx`
- T004: 스타일 보완 — `tnt_sales/frontend/src/styles/index.css`
- T005: xlsx 의존성 추가 — `tnt_sales/frontend/package.json`
- T006: 엑셀 미리보기(100x20) 및 시트 선택 — `tnt_sales/frontend/src/features/demand/ExcelUpload.tsx`, `tnt_sales/frontend/src/styles/index.css`

## Next (optional)
- T005: 업로드 파일 파싱/미리보기 — `frontend/src/features/demand/*`
- T006: 서버 업로드 API 계약/연동 — `specs/001-demand-management/contracts/`, `backend/*`
- T007: 유효성 검증/오류 처리 UX — `frontend/src/features/demand/*`
