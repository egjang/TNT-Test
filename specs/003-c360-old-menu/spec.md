# 고객관리: C360 (Old) 메뉴 추가

원제목: C360 화면을 그대로 복사하여 "C360 (Old)" 메뉴로 분리

## 배경/목표
- 기존 C360 화면(Customer360)을 변경 없이 그대로 사용할 수 있도록, 고객관리 메뉴 하위에 "C360 (Old)" 항목을 추가한다.
- 신규 메뉴 선택 시, 기존 C360과 동일한 UI/동작을 가진 별도 화면(Customer360Old)을 렌더링한다.

## 범위
- 프론트엔드만 변경. 백엔드 API/스키마 변경 없음.
- 기능 플래그는 기존 고객관리 노출 플래그(`VITE_FEATURE_CUSTOMER_MANAGEMENT`)를 그대로 따른다.

## Functional Requirements (FR)
- FR-001: 고객관리 하위 메뉴에 항목 "C360 (Old)"를 추가한다. 메뉴 키는 `customer:c360-old`로 한다.
- FR-002: `Customer360.tsx`를 복제하여 `Customer360Old.tsx`를 추가한다. 화면 구성, 탭, 데이터 취득 로직은 동일하게 동작해야 한다.
- FR-003: 메인 뷰 라우팅에 `selectedKey === 'customer:c360-old'`일 때 `Customer360Old`를 렌더링하도록 분기한다.
- FR-004: 기존 C360(`customer:c360`) 동작에는 영향이 없어야 한다.

## Acceptance Criteria (AC)
- AC-001: 좌측 메뉴 고객관리 그룹을 펼치면 "C360 (Old)"가 라벨 그대로 노출된다.
- AC-002: "C360 (Old)" 클릭 시, 기존 C360과 동일한 폼/탭/표가 표시되고, 선택된 거래처 컨텍스트(`localStorage: tnt.sales.selectedCustomer`)를 동일하게 사용한다.
- AC-003: 기존 "C360" 메뉴는 그대로 유지되고 정상 동작한다.
- AC-004: 기능 플래그가 비활성화되면 기존과 동일하게 고객관리 메뉴 전체가 숨겨진다.

## Out of Scope
- 백엔드 API 추가/변경, 데이터 모델 변경, 신규 권한 체계.

## 참고
- Frontend 경로: `tnt_sales/frontend/src/features/customer/`
- 관련 파일: `Menu.tsx`, `MainView.tsx`, `Customer360.tsx`, `Customer360Old.tsx`

