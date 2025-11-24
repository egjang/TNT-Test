# Feature Specification: VIBE Workspace Menu

**Feature Branch**: `[012-vibe-workspace]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "Lab 메뉴 하위로 VIBE Workspace 메뉴 만들기"

## Overview
- Goal: Lab 메뉴 그룹 안에 `VIBE Workspace` 항목을 추가하고, Postgres `public` 스키마를 대상으로 자연어 입력 → Gemini를 통해 SQL 생성 → 결과를 실행/표시하는 워크스페이스를 제공한다.
- Primary users: 내부 운영/업무 담당자
- Success criteria: 사용자가 자연어 질의를 입력하면 (제약 없는) 조인 포함 SQL이 생성되어 실행되고, SQL과 결과 테이블이 UI에 표시된다.

## User Scenarios
- [ ] 사용자는 좌측 Lab 메뉴에서 `VIBE Workspace` 항목을 확인하고 선택한다.
- [ ] 사용자가 자연어로 질의를 입력하고 전송하면 Gemini를 호출해 SQL을 생성한다.
- [ ] 생성된 SQL이 UI에 표시되고, 동일 SQL을 Postgres `public` 스키마에 실행해 결과 테이블을 반환한다.
- [ ] 에러(LLM 실패, SQL 오류) 발생 시 오류 메시지가 표시된다.

## Functional Requirements
- [ ] **FR-001**: Lab 메뉴 그룹 하위에 `VIBE Workspace` 메뉴 항목을 추가한다.
- [ ] **FR-002**: `VIBE Workspace` 화면에 자연어 입력창과 실행 버튼을 제공한다.
- [ ] **FR-003**: 자연어 입력을 Gemini API로 전송해 SQL을 생성한다(스키마 힌트: Postgres `public` 전체, 조인 제한 없음).
- [ ] **FR-004**: 생성된 SQL을 그대로 실행해 결과 행을 조회하고, 결과 테이블과 SQL을 UI에 표시한다.
- [ ] **FR-005**: LLM 호출/SQL 실행 오류 시 사용자에게 오류 메시지를 보여준다.
- [ ] **FR-006**: 기존 Lab 하위 메뉴(`품목단위분석`, `판매단가 Sim` 등)의 위치와 동작은 변하지 않는다.

## Out of Scope
- 워크스페이스 상세 기능(프로젝트 목록, 편집, 권한 등)
- 별도 권한/Feature flag 제어
- SQL 안전 가드(현재 제한 없음), 쿼리 최적화/제한 정책

## Acceptance Criteria
- [ ] **AC-001**: 좌측 Lab 그룹 하위에 `VIBE Workspace` 메뉴가 표시된다.
- [ ] **AC-002**: 화면에 자연어 입력창과 실행 버튼이 보이고, 질의 입력 후 실행 시 생성된 SQL과 결과 테이블이 표시된다.
- [ ] **AC-003**: LLM 호출 실패 또는 SQL 실행 오류 시 오류 메시지가 표시된다.
- [ ] **AC-004**: Lab의 기존 하위 메뉴 동작(품목단위분석, 판매단가 Sim 등)이 이전과 동일하게 유지된다.
