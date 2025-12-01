# 제품 요구사항 정의서 (PRD): TNT CRM 견적 및 단가 관리 시스템

## 1. 개요 (Overview)

*   **목적:** Sales Cloud에서 견적을 작성하고, ERP의 실시간/배치 단가 데이터를 참조하며, 승인 프로세스(Slack 연동)를 거쳐 최종 확정된 단가를 ERP로 동기화하는 순환 시스템 구축.
*   **핵심 변경 사항:**
    *   **UX 개선:** 견적 품목 검색 시 TNT/DYS 레코드 유형에 따른 품목 자동 필터링.
    *   **데이터 고도화:** 영업사원 개인별 '본인 평균단가' 및 ERP 구간단가(A~E) 참조.
    *   **협업 강화:** 각 단계별(등록, 승인요청, 반려, 확정) Slack 알림 자동화.

## 2. 주요 프로세스 로직 (Business Logic)

### 2.1 견적 작성 및 품목 조회 (Quote Creation)

1.  **레코드 유형 선택 (Record Type):**
    *   `TNT 복층`, `TNT 건자재`, `동양 실란트` 중 하나를 선택하여 견적 생성.
2.  **품목 검색 필터링 (Search Logic):**
    *   **Logic:** 선택한 레코드 유형에 매핑된 **대분류(Category)**만 검색 팝업에 노출하여 오입력 방지.
        *   *TNT:* 유리산업, 실란트산업 등.
        *   *동양:* 반제품, 건축용, 원자재 등.
3.  **참조 단가 표시 (Reference Data):**
    *   품목 선택 시 ERP에서 수신된 다음 데이터를 화면에 표시:
        *   **구간단가:** A, B, C, D, E 구간별 가격.
        *   **영업원가:** ERP 기준 원가.
        *   **본인 평균단가:** 해당 영업사원(User)의 해당 품목 판매 평균가 (개인화 데이터).

### 2.2 승인 및 Slack 알림 (Approval & Notification)

1.  **자동 승인 판별 로직 (Auto-Determination):**
    *   견적 저장 시 `TB_QUOTE_ITEM`을 분석하여 승인 유형 결정.
    *   **전결 (Case 1):** 모든 품목이 **C/D/E 구간**이고, **이익률 > 0**인 경우 → **영업사원 전결** (즉시 고객협의 단계).
    *   **승인 필요 (Case 2):** **A/B 구간** 품목이 하나라도 포함된 경우 → **부서장 확인** 필요.
    *   **승인 필요 (Case 3):** **적자(이익률 < 0)** 품목이 포함된 경우 → **부서장 > 본부장 > 대표이사** 3단계 승인.
2.  **Slack 알림 트리거 (Trigger Points):**
    *   **견적 등록:** `(견적번호)(거래처) 견적서 등록` → CS팀/관리자 알림.
    *   **승인 요청:** `(견적번호)(거래처) 견적서 승인 요청` → 결재권자에게 "승인 바로가기" 링크 포함 발송.
    *   **승인/반려 완료:** 기안자에게 결과 알림.
    *   **견적 확정:** `(견적번호)(거래처) 견적서 확정` → 관련자 전원 알림.

### 2.3 데이터 동기화 (Interface)

1.  **ERP to Sales Cloud (Inbound):**
    *   주기: 일 배치 (Daily Batch).
    *   대상: 품목 마스터, 구간단가, 영업원가, **영업사원별 본인 평균단가**.
2.  **Sales Cloud to ERP (Outbound):**
    *   시점: 견적서 상태가 **'확정(Confirmed)'**으로 변경되는 순간.
    *   대상: 확정된 `거래처별 판매단가` 및 견적 상세 내역.

---

## 3. 데이터베이스 설계 (DDL)

요청하신 **개인별 평균단가** 구조와 **Slack 연동**, **품목 구분**을 반영한 스키마입니다.

```sql
-- 1. 사용자/영업사원 마스터 (Salesforce User Mirror)
CREATE TABLE TB_USER (
    user_id VARCHAR(20) PRIMARY KEY, -- Salesforce User ID
    user_name VARCHAR(50) NOT NULL,
    slack_id VARCHAR(50), -- Slack 알림 발송용 ID
    department VARCHAR(50), -- 부서 (TNT영업/동양실란트 등)
    role_code VARCHAR(20) -- 직책 (사원, 팀장, 부서장, 대표)
);

-- 2. 품목 마스터 (Product)
CREATE TABLE TB_PRODUCT (
    product_code VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    record_type_group VARCHAR(20) NOT NULL, -- 'TNT', 'DYS' (레코드 유형 매핑용)
    category_large VARCHAR(50), -- 대분류 (검색 필터링용)
    category_medium VARCHAR(50),
    standard_unit VARCHAR(10), -- 판매단위
    is_active CHAR(1) DEFAULT 'Y'
);

-- 3. ERP 참조 단가 마스터 (Daily Batch)
-- 핵심: 영업사원(Sales Rep)별로 단가가 다를 수 있으므로 복합키 사용
CREATE TABLE TB_ERP_REF_PRICE (
    ref_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    base_date DATE NOT NULL, -- 기준 일자
    product_code VARCHAR(50) NOT NULL,
    sales_rep_id VARCHAR(20) NOT NULL, -- 영업사원 ID (개인화된 단가)
    
    -- 개인별 데이터
    individual_avg_price DECIMAL(18, 0), -- 본인 평균 단가 [피드백 반영]
    
    -- 공통 데이터 (필요 시 별도 테이블 분리 가능하나, 조회 성능 위해 통합 권장)
    sales_cost DECIMAL(18, 0), -- 영업 원가
    tier_a_price DECIMAL(18, 0),
    tier_b_price DECIMAL(18, 0),
    tier_c_price DECIMAL(18, 0),
    tier_d_price DECIMAL(18, 0),
    tier_e_price DECIMAL(18, 0),
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_code) REFERENCES TB_PRODUCT(product_code),
    FOREIGN KEY (sales_rep_id) REFERENCES TB_USER(user_id)
);

-- 4. 견적 마스터 (Quote Header)
CREATE TABLE TB_QUOTE (
    quote_id VARCHAR(20) PRIMARY KEY, -- 견적번호 (예: 20241011001)
    quote_name VARCHAR(200),
    account_id VARCHAR(20) NOT NULL,
    sales_rep_id VARCHAR(20) NOT NULL, -- 견적 작성자
    record_type VARCHAR(20) NOT NULL, -- TNT_DOUBLE, TNT_MAT, DYS_SEALANT
    
    status VARCHAR(20) DEFAULT 'DRAFT', 
    -- 상태: DRAFT(작성), REQ_APPROVAL(승인요청), APPROVED(승인), 
    -- NEGOTIATION(고객협의), CONFIRMED(확정), REJECTED(반려)
    
    approval_rule_type VARCHAR(20), -- 'AUTO'(전결), 'TIER_AB'(부서장), 'LOSS'(대표)
    total_amount DECIMAL(18, 0),
    total_cost DECIMAL(18, 0),
    expected_profit_rate DECIMAL(5, 2), -- 예상 이익률
    
    erp_sync_yn CHAR(1) DEFAULT 'N', -- ERP 전송 여부
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 견적 상세 (Quote Line Item)
CREATE TABLE TB_QUOTE_ITEM (
    item_id VARCHAR(36) PRIMARY KEY,
    quote_id VARCHAR(20) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(18, 0) NOT NULL, -- 최종 입력 견적가
    
    -- 승인 로직 판단용 스냅샷 (당시의 기준 데이터 저장)
    ref_tier CHAR(1), -- 적용된 구간 (A, B, C, D, E)
    ref_cost DECIMAL(18, 0), -- 당시 영업원가
    ref_individual_avg DECIMAL(18, 0), -- 당시 본인 평균단가
    
    row_profit_rate DECIMAL(5, 2), -- 품목별 이익률
    remarks VARCHAR(200), -- 비고/견적사유
    
    FOREIGN KEY (quote_id) REFERENCES TB_QUOTE(quote_id)
);

-- 6. 승인 이력 (Approval History)
CREATE TABLE TB_APPROVAL_HISTORY (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(20) NOT NULL,
    approver_id VARCHAR(20) NOT NULL,
    step_name VARCHAR(20), -- 'TEAM_LEADER', 'DEPT_HEAD', 'CEO'
    action_type VARCHAR(10), -- 'APPROVE', 'REJECT'
    comment VARCHAR(500), -- 승인/반려 의견
    action_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Slack 알림 로그 (Slack Integration Log)
CREATE TABLE TB_SLACK_LOG (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(20),
    target_user_id VARCHAR(20), -- 수신자
    message_type VARCHAR(50), -- 'APPROVAL_REQ', 'CONFIRMED', 'REJECTED'
    slack_payload TEXT, -- 실제 전송된 메시지 내용
    sent_result CHAR(1), -- Y/N
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 개발 핵심 포인트 (Implementation Guide)

1.  **ERP 데이터 조회 쿼리 (본인 평균단가 적용):**
    *   견적 작성 화면에서 품목 리스트를 불러올 때, 현재 로그인한 사용자 ID(`sales_rep_id`)를 조건으로 `TB_ERP_REF_PRICE` 테이블을 조인하여 **나만의 평균단가**를 가져와야 합니다.
    *   *SQL 예시:*
        ```sql
        SELECT P.product_name, R.individual_avg_price, R.tier_a_price, ...
        FROM TB_PRODUCT P
        LEFT JOIN TB_ERP_REF_PRICE R 
          ON P.product_code = R.product_code 
          AND R.sales_rep_id = :currentUserId -- 현재 로그인한 영업사원 ID
          AND R.base_date = CURRENT_DATE;
        ```

2.  **Slack 메시지 템플릿 구현:**
    *   Slack API Block Kit을 사용하여 단순 텍스트가 아닌 **버튼(승인 바로가기)**이 포함된 메시지를 구성해야 합니다.
    *   *메시지 포맷:* `[견적번호] {고객명} 견적서 승인 요청` + `[승인 페이지 링크 버튼]`

3.  **승인 매트릭스 로직 (Backend Service):**
    *   `saveQuote()` 호출 시:
        1.  모든 `TB_QUOTE_ITEM` Loop.
        2.  `IF (item.ref_tier IN ('A', 'B'))` -> Flag `TierReview` = True.
        3.  `IF (item.row_profit_rate < 0)` -> Flag `LossReview` = True.
        4.  `IF (LossReview)` -> 승인경로 = `CEO_PATH`.
        5.  `ELSE IF (TierReview)` -> 승인경로 = `DEPT_HEAD_PATH`.
        6.  `ELSE` -> 승인경로 = `AUTO` (전결).

4.  **복제(Clone) 기능:**
    *   반려(`REJECTED`)된 견적은 수정 불가(Read-only) 처리합니다.
    *   '복제' 버튼 클릭 시, `TB_QUOTE`와 `TB_QUOTE_ITEM` 데이터를 `SELECT ... INSERT` 하여 새로운 `quote_id`를 생성하고 상태를 `DRAFT`로 초기화합니다.
