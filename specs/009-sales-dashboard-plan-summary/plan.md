# 구현 계획

1. Backend API 추가
- 엔드포인트: `GET /api/v1/sales/plan/customer-counts`
- 파라미터: `year`(필수), `assigneeIds`(CSV, 선택), `empIds`(CSV, 선택)
- 로직: `sales_plan`에서 `(assignee_id, customer_seq, company_type)`별로 `target_stage` 최대 등급을 구해 고객 단위 대표 상태 산출 후, 회사 구분별로 전체/확정/수립중 카운트 집계. 다중 사원 시 사원별 그룹 반환.

2. Frontend 연동
- `SalesDashboard.tsx`에서 연도/영업사원 선택 상태 변화 시 API 호출
- 결과를 사원별 섹션으로 그리드 카드 형태로 렌더링

3. 에러/로딩 처리 및 UI 정리
- 기존 카드 하단에 "고객수 요약" 섹션 추가, 빈 상태/에러 처리

4. 검토 및 마무리
- 기본 흐름 수동 점검, 스펙 기준 충족 확인

