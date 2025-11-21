# 009 — Sales Dashboard Plan Summary (목표Dashboard 고객수 요약)

한글 제목: 목표Dashboard에서 영업사원 선택 시, 선택년도 sales_plan 기준으로 회사 구분별 고객수 요약 표시

## 목적
목표Dashboard 화면에서 영업사원과 목표년도를 선택하면, sales_plan 데이터를 조회하여 회사 구분별(TNT/DYS)로 다음 항목을 카드 형태로 요약 표시한다.
- 전체 고객수 (distinct customer_seq)
- 목표 확정 고객수 (target_stage = 'C')
- 계획 수립중인 고객수 (target_stage in ['P','I'])

다중 영업사원 선택 시, 각 영업사원별로 별도 집계를 표시한다.

## 범위
- Frontend (Vite/React): SalesDashboard 화면(`frontend/src/features/sales_dashboard/SalesDashboard.tsx`)에 기존 카드 섹션 아래 신규 요약 카드 섹션 추가
- Backend (Spring Boot): sales_plan 기반 집계 API 추가(`/api/v1/sales/plan/customer-counts`)

## 용어 정의
- company_type: 'TNT' | 'DYS' (대문자 기준 비교)
- target_stage: 'B'(기초), 'I'(조사), 'P'(계획), 'C'(확정) 등 상태 코드. 본 요약에서는 'C'를 확정, 'P' 또는 'I'를 수립중으로 간주한다.

## 기능 요구사항 (FR)
- FR-1: 연도(year)와 영업사원(단일/다중) 선택을 입력으로, 회사 구분별 고객수 요약을 표시한다.
- FR-2: 다중 영업사원 선택 시, 영업사원별 섹션을 만들고 각 섹션 내부에서 회사 구분별 요약(전체/확정/수립중)을 표기한다.
- FR-3: 백엔드는 연도/영업사원/회사 구분 조건으로 sales_plan을 조회하고, (assignee_id, customer_seq, company_type) 단위로 target_stage의 최댓값을 산출하여 고객 단위의 대표 상태로 분류한다.
- FR-4: 회사 구분은 기본적으로 TNT/DYS를 모두 포함하되, 데이터가 없는 경우 0으로 표기하거나 항목을 생략할 수 있다.
- FR-5: 프론트엔드는 기존 목표 카드 섹션 하단에 "고객수 요약" 섹션을 추가한다.

## 수용 기준 (AC)
- AC-1: 단일 영업사원 선택 시, 화면에 해당 영업사원의 TNT/DYS별 전체/확정/수립중 고객수가 표시된다.
- AC-2: 2명 이상 선택 시, 각 영업사원별 블록이 생성되어 회사 구분별 동일 항목이 각각 표시된다.
- AC-3: 선택년도 변경 시, 데이터가 재조회되어 즉시 반영된다.
- AC-4: target_stage가 'C'인 고객은 확정 고객수에, 'P' 또는 'I'인 고객은 수립중 고객수에 포함된다. 그 외/NULL은 수립중/확정에 포함되지 않는다.
- AC-5: 오류 발생 시 사용자에게 에러 메시지 또는 빈 상태가 안전하게 표시된다.

## 비기능 요구사항
- NFR-1: API는 연도/사원 식별자 수에 따라 IN 조건을 동적으로 구성하여도 500ms 이내로 응답한다(개발 환경 기준).
- NFR-2: 프론트엔드 렌더링은 선택 변화에 따라 불필요한 리렌더를 최소화한다.

