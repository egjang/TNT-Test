# Feature Specification: 수요관리 (Demand Management)

**Feature Branch**: `[001-demand-management]`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "수요관리 밑에 서브메뉴로 Excel Upload 메뉴 추가, 가운데 패널에서 로컬 PC의 엑셀 파일만 선택하는 버튼 제공"

## Overview
- Goal: 수요관리 기능의 초기 동작으로 엑셀 업로드 진입점을 제공
- Primary users: 수요 데이터 업로드/정제 담당자
- Success criteria: 사용자가 메뉴에서 Excel Upload를 선택하고, 중앙에서 엑셀 파일만 선택 가능함

## User Scenarios
- [ ] 좌측 메뉴에서 "수요관리 > Excel Upload"를 선택한다
- [ ] 중앙 패널에서 "엑셀 파일 선택" 버튼을 눌러 로컬 PC에서 엑셀 파일(.xlsx, .xls)만 고를 수 있다
- [ ] 선택된 파일명이 화면에 표시된다

## Functional Requirements
- [ ] FR-1: 좌측 "수요관리" 메뉴 하위에 "Excel Upload" 서브메뉴를 제공한다
- [ ] FR-2: 중앙 패널에 파일 선택 버튼을 제공하며 엑셀 파일만 선택 가능하도록 제한(`accept` 확장자/MIME)
- [ ] FR-3: 파일 선택 후 선택한 파일명을 화면에 표시한다
- [ ] FR-4: (범위 외) 업로드/파싱/검증/전송 로직은 추후 단계에서 구현한다

## Out of Scope
- 파일 실제 업로드/파싱, 서버 전송/저장, 템플릿 검증, 오류 처리 상세 UX, 권한/감사 로그

## Open Questions
- [NEEDS CLARIFICATION: 지원할 엑셀 템플릿 스펙(시트/헤더/필수 컬럼) 정의 필요]
- [NEEDS CLARIFICATION: 파일 용량 제한, 확장자 외 MIME 검증 수준]

## Risks & Constraints
- 브라우저별 파일 MIME 판별 신뢰도 차이 → 서버측 재검증 필요(후속)

## Acceptance Criteria
- [ ] AC-1: 메뉴에 "수요관리 > Excel Upload"가 보이고 선택 가능하다
- [ ] AC-2: 중앙에서 엑셀 파일만 선택 가능한 파일 다이얼로그가 열린다
- [ ] AC-3: 파일 선택 후 파일명이 화면에 표시된다

