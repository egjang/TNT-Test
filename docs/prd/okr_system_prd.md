# OKR 관리 시스템 PRD (Product Requirements Document)

**문서 버전:** 1.0  
**작성일:** 2025-12-02  
**작성자:** JANG  

---

## 1. 개요

### 1.1 배경
조직의 목표 정렬과 성과 관리를 체계화하기 위해 OKR(Objectives and Key Results) 관리 시스템을 구축한다. CEO부터 팀장까지 3단계 계층 구조로 목표를 연계하여 조직 전체의 방향성을 일치시킨다.

### 1.2 목적
- 상위 목표와 하위 목표의 연계성 확보
- 핵심 결과 지표(Key Results)를 통한 정량적 성과 측정
- 승인 프로세스를 통한 목표 품질 관리
- 대시보드를 통한 조직 전체 OKR 현황 가시화

### 1.3 범위
- 대상 사용자: CEO, 본부장, 팀장
- 계층 구조: 3단계 (CEO → 본부장 → 팀장)
- 담당자 할당: 1:N (한 상위관리자가 여러 담당자 지정 가능, 담당자는 한 상위관리자만)

---

## 2. 사용자 역할 및 권한

| 역할 | 설명 | 주요 권한 |
|------|------|-----------|
| CEO | 최상위 목표 설정자 | 조직 전체 목표 설정, 본부장 지정, 전체 대시보드 조회, 본부장 목표 승인/평가 |
| 본부장 | 중간 관리자 | CEO 목표 기반 본부 목표 설정, 팀장 지정, 본부 대시보드 조회, 팀장 목표 승인/평가 |
| 팀장 | 실행 목표 설정자 | 본부장 목표 기반 팀 목표 설정, 팀 진행 현황 관리 |

---

## 3. 핵심 기능

### 3.1 OKR 사이클 관리 (okr_cycle)

**설명:** OKR의 적용 기간을 정의하고 관리한다.

**기능 상세:**
- 사이클 생성: 사이클명, 시작일, 종료일 설정
- 사이클 유형: 분기(Quarter), 반기(Half), 연간(Year)
- 사이클 상태: 준비중, 진행중, 종료
- 활성 사이클은 동시에 1개만 운영

**데이터 항목:**
| 필드명 | 타입 | 설명 |
|--------|------|------|
| cycle_id | PK | 사이클 고유 ID |
| cycle_name | VARCHAR | 사이클명 (예: 2025 Q1) |
| cycle_type | ENUM | QUARTER, HALF, YEAR |
| start_date | DATE | 시작일 |
| end_date | DATE | 종료일 |
| status | ENUM | PREPARING, ACTIVE, CLOSED |
| created_at | TIMESTAMP | 생성일시 |

---

### 3.2 목표 관리 (okr_item)

**설명:** Objective(목표)를 생성하고 관리한다.

**기능 상세:**
- 목표 생성: 목표명, 설명, 상위목표 연결
- 상위목표 조회: 담당자로 지정된 경우 상위관리자의 목표 확인
- 목표 상태 관리: Draft → 시작전 → 진행중 → 완료
- 목표 수정/삭제: Draft 상태에서만 가능

**목표 상태 흐름:**
```
[Draft] → (제출) → [시작전] → (승인) → [진행중] → (완료처리) → [완료]
                        ↓
                    (반려) → [Draft]
```

**데이터 항목:**
| 필드명 | 타입 | 설명 |
|--------|------|------|
| okr_item_id | PK | 목표 고유 ID |
| cycle_id | FK | 소속 사이클 |
| parent_okr_id | FK | 상위 목표 ID (NULL이면 최상위) |
| owner_id | FK | 목표 소유자 (employee_id) |
| title | VARCHAR | 목표명 |
| description | TEXT | 목표 상세 설명 |
| status | ENUM | DRAFT, NOT_STARTED, IN_PROGRESS, COMPLETED |
| level | INT | 계층 레벨 (1: CEO, 2: 본부장, 3: 팀장) |
| created_at | TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | 수정일시 |

---

### 3.3 담당자 관리 (okr_member)

**설명:** 상위관리자가 하위 담당자를 지정하고 관리한다.

**기능 상세:**
- 담당자 지정: 상위관리자가 자신의 목표에 대해 하위 담당자 선택
- 담당자 조회: Employee 테이블에서 해당 계층의 직원 목록 조회
- 담당자 변경: 사이클 진행 중 담당자 변경 가능 (단, 해당 담당자의 OKR이 Draft일 때만)

**데이터 항목:**
| 필드명 | 타입 | 설명 |
|--------|------|------|
| okr_member_id | PK | 고유 ID |
| okr_item_id | FK | 상위 목표 ID |
| member_id | FK | 담당자 (employee_id) |
| assigned_at | TIMESTAMP | 지정일시 |
| assigned_by | FK | 지정자 (employee_id) |

---

### 3.4 핵심 결과 관리 (okr_key_result)

**설명:** 목표의 달성을 측정하는 핵심 결과 지표를 관리한다.

**기능 상세:**
- Key Result 생성: 지표명, 측정 단위, 목표값 설정
- 현재값 업데이트: 진행 상황에 따라 현재값 입력
- 달성률 자동 계산: (현재값 / 목표값) × 100
- 목표당 Key Result: 1~5개 권장

**측정 단위 (Metric Type):**
| 단위 | 설명 | 예시 |
|------|------|------|
| PERCENTAGE | 백분율 | 고객 만족도 90% |
| NUMBER | 숫자/건수 | 신규 고객 100명 |
| CURRENCY | 금액 | 매출 10억원 |
| BOOLEAN | 완료 여부 | 시스템 구축 완료 |

**데이터 항목:**
| 필드명 | 타입 | 설명 |
|--------|------|------|
| key_result_id | PK | 고유 ID |
| okr_item_id | FK | 소속 목표 ID |
| title | VARCHAR | 핵심 결과명 |
| metric_type | ENUM | PERCENTAGE, NUMBER, CURRENCY, BOOLEAN |
| target_value | DECIMAL | 목표값 |
| current_value | DECIMAL | 현재값 (기본값: 0) |
| unit | VARCHAR | 단위 표시 (%, 명, 원 등) |
| progress | DECIMAL | 달성률 (자동 계산) |
| created_at | TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | 수정일시 |

---

### 3.5 승인 프로세스 (okr_approval)

**설명:** 담당자가 작성한 목표를 상위관리자가 검토하고 승인/반려한다.

**승인 흐름:**
1. 담당자가 목표 작성 완료 후 "제출" → 상태: NOT_STARTED
2. 상위관리자가 목표 검토
3. 승인 시: 상태 → IN_PROGRESS
4. 반려 시: 상태 → DRAFT (수정 후 재제출)

**기능 상세:**
- 승인 요청: 담당자가 목표 제출
- 승인/반려: 상위관리자가 검토 후 결정
- 반려 사유: 반려 시 코멘트 필수
- 승인 이력: 모든 승인/반려 이력 저장

**데이터 항목:**
| 필드명 | 타입 | 설명 |
|--------|------|------|
| approval_id | PK | 고유 ID |
| okr_item_id | FK | 대상 목표 ID |
| approver_id | FK | 승인자 (employee_id) |
| action | ENUM | SUBMITTED, APPROVED, REJECTED |
| comment | TEXT | 코멘트 |
| created_at | TIMESTAMP | 처리일시 |

---

### 3.6 평가 및 피드백 (okr_evaluation)

**설명:** OKR 사이클 종료 시 목표 달성도를 평가하고 피드백을 제공한다.

**기능 상세:**
- 자기 평가: 담당자가 본인의 목표 달성도 평가 및 코멘트 작성
- 상위 평가: 상위관리자가 담당자의 목표 달성도 평가 및 코멘트 작성
- 평가 점수: 1~5점 척도 또는 달성률 기반
- 최종 코멘트: 개선점, 잘한 점 등 피드백

**평가 등급:**
| 점수 | 등급 | 달성률 기준 |
|------|------|-------------|
| 5 | Exceptional | 100% 이상 |
| 4 | Strong | 80~99% |
| 3 | On Track | 60~79% |
| 2 | Needs Improvement | 40~59% |
| 1 | Off Track | 40% 미만 |

**데이터 항목:**
| 필드명 | 타입 | 설명 |
|--------|------|------|
| evaluation_id | PK | 고유 ID |
| okr_item_id | FK | 대상 목표 ID |
| evaluator_id | FK | 평가자 (employee_id) |
| evaluation_type | ENUM | SELF, MANAGER |
| score | INT | 평가 점수 (1~5) |
| achievement_rate | DECIMAL | 달성률 |
| comment | TEXT | 평가 코멘트 |
| created_at | TIMESTAMP | 평가일시 |

---

### 3.7 대시보드

**설명:** 조직 전체 및 개인의 OKR 현황을 시각화하여 제공한다.

**대시보드 구성:**

#### 3.7.1 전체 대시보드 (CEO 전용)
- 조직 전체 목표 달성률 요약
- 본부별 OKR 진행 현황
- 상태별 목표 분포 (Draft, 진행중, 완료 등)
- 달성률 하위 목표 리스트

#### 3.7.2 본부 대시보드 (본부장)
- 본부 목표 달성률
- 팀별 OKR 진행 현황
- 승인 대기 목표 리스트
- 팀장별 성과 비교

#### 3.7.3 개인 대시보드 (공통)
- 내 목표 및 Key Results 현황
- 상위 목표와의 연계 표시
- 담당자 목표 현황 (상위관리자인 경우)
- 진행률 타임라인

---

### 3.8 이력 조회

**설명:** 과거 OKR 사이클의 이력을 조회한다.

**기능 상세:**
- 사이클별 조회: 과거 사이클 선택하여 OKR 전체 조회
- 개인 이력: 특정 직원의 과거 OKR 이력 조회
- 비교 분석: 사이클 간 달성률 비교
- 데이터 보존: 종료된 사이클 데이터 영구 보존

---

## 4. 데이터베이스 ERD

```
┌─────────────────┐
│   okr_cycle     │
├─────────────────┤
│ cycle_id (PK)   │
│ cycle_name      │
│ cycle_type      │
│ start_date      │
│ end_date        │
│ status          │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│    okr_item     │       │    employee     │
├─────────────────┤       ├─────────────────┤
│ okr_item_id(PK) │       │ employee_id(PK) │
│ cycle_id (FK)   │◄──────│ name            │
│ parent_okr_id   │───┐   │ position        │
│ owner_id (FK)   │   │   │ level           │
│ title           │   │   │ department      │
│ description     │   │   └─────────────────┘
│ status          │   │
│ level           │   │ Self Reference
└────────┬────────┘◄──┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ okr_key_result  │
├─────────────────┤
│ key_result_id   │
│ okr_item_id(FK) │
│ title           │
│ metric_type     │
│ target_value    │
│ current_value   │
│ progress        │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   okr_member    │       │  okr_approval   │
├─────────────────┤       ├─────────────────┤
│ okr_member_id   │       │ approval_id     │
│ okr_item_id(FK) │       │ okr_item_id(FK) │
│ member_id (FK)  │       │ approver_id(FK) │
│ assigned_at     │       │ action          │
│ assigned_by(FK) │       │ comment         │
└─────────────────┘       └─────────────────┘

┌─────────────────┐
│ okr_evaluation  │
├─────────────────┤
│ evaluation_id   │
│ okr_item_id(FK) │
│ evaluator_id    │
│ evaluation_type │
│ score           │
│ comment         │
└─────────────────┘
```

---

## 5. 사용자 시나리오

### 5.1 시나리오 1: CEO가 조직 목표 설정

1. CEO가 새로운 OKR 사이클 생성 (2025 Q1)
2. CEO가 최상위 목표 입력 (예: "매출 20% 성장")
3. Key Results 추가 (예: "신규 고객 100명 확보", "기존 고객 재구매율 30%")
4. 본부장들을 담당자로 지정
5. 목표 제출

### 5.2 시나리오 2: 본부장이 목표 수립

1. 본부장이 로그인
2. 상위관리자(CEO)의 목표 확인
3. CEO 목표에 연계된 본부 목표 작성
4. Key Results 추가
5. 팀장들을 담당자로 지정
6. 목표 제출 → CEO 승인 대기

### 5.3 시나리오 3: 승인 프로세스

1. CEO가 승인 대기 목표 리스트 확인
2. 본부장의 목표 검토
3. 승인 또는 반려 (반려 시 코멘트 작성)
4. 승인 시 본부장 목표 상태 → "진행중"

### 5.4 시나리오 4: 진행 상황 업데이트

1. 팀장이 Key Results의 현재값 업데이트
2. 달성률 자동 계산
3. 대시보드에 실시간 반영

### 5.5 시나리오 5: 사이클 종료 및 평가

1. 사이클 종료일 도래
2. 담당자가 자기 평가 작성
3. 상위관리자가 평가 및 피드백 작성
4. 사이클 상태 → "종료"
5. 이력으로 보존

---

## 6. UI 화면 구성

| 화면명 | 설명 | 주요 기능 |
|--------|------|-----------|
| 로그인 | 사용자 인증 | 기존 직원 인증 시스템 연동 |
| 메인 대시보드 | OKR 현황 요약 | 달성률, 상태별 분포, 알림 |
| 사이클 관리 | 사이클 CRUD | 사이클 생성/수정/종료 (관리자) |
| 목표 목록 | 내 목표 리스트 | 목표 조회, 상태 필터, 검색 |
| 목표 상세 | 개별 목표 상세 | 목표 정보, KR 목록, 승인 이력 |
| 목표 작성 | 새 목표 입력 | 상위목표 연결, KR 추가 |
| 담당자 지정 | 하위 담당자 선택 | 직원 목록 조회, 담당자 지정 |
| 승인 관리 | 승인 대기 목록 | 승인/반려 처리, 코멘트 |
| 평가 작성 | 평가 및 피드백 | 점수, 달성률, 코멘트 입력 |
| 이력 조회 | 과거 사이클 조회 | 사이클 선택, 상세 조회 |

---

## 7. 비기능 요구사항

### 7.1 성능
- 대시보드 로딩 시간: 3초 이내
- 동시 사용자: 최대 500명

### 7.2 보안
- 역할 기반 접근 제어 (RBAC)
- 본인 및 하위 담당자 데이터만 접근 가능
- 기존 Employee 인증 시스템 연동

### 7.3 데이터
- 과거 사이클 데이터 영구 보존
- 일별 백업

---

## 8. 향후 확장 고려사항

- 4단계 이상 계층 지원 (팀원 레벨 추가)
- 알림 기능 (이메일, 슬랙 연동)
- OKR 템플릿 기능
- AI 기반 목표 추천
- 모바일 앱 지원

---

## 9. 용어 정의

| 용어 | 정의 |
|------|------|
| OKR | Objectives and Key Results, 목표와 핵심 결과 |
| Objective | 달성하고자 하는 정성적 목표 |
| Key Result | 목표 달성을 측정하는 정량적 지표 |
| Cycle | OKR 적용 기간 (분기/반기/연간) |
| Owner | 목표의 소유자/책임자 |
| Member | 상위 목표를 수행하는 담당자 |

---

## 부록: DDL 스크립트

```sql
-- OKR Cycle
CREATE TABLE okr_cycle (
    cycle_id SERIAL PRIMARY KEY,
    cycle_name VARCHAR(100) NOT NULL,
    cycle_type VARCHAR(20) NOT NULL CHECK (cycle_type IN ('QUARTER', 'HALF', 'YEAR')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PREPARING' CHECK (status IN ('PREPARING', 'ACTIVE', 'CLOSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OKR Item (Objective)
CREATE TABLE okr_item (
    okr_item_id SERIAL PRIMARY KEY,
    cycle_id INT NOT NULL REFERENCES okr_cycle(cycle_id),
    parent_okr_id INT REFERENCES okr_item(okr_item_id),
    owner_id INT NOT NULL REFERENCES employee(employee_id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    level INT NOT NULL CHECK (level IN (1, 2, 3)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OKR Member
CREATE TABLE okr_member (
    okr_member_id SERIAL PRIMARY KEY,
    okr_item_id INT NOT NULL REFERENCES okr_item(okr_item_id),
    member_id INT NOT NULL REFERENCES employee(employee_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NOT NULL REFERENCES employee(employee_id),
    UNIQUE(okr_item_id, member_id)
);

-- OKR Key Result
CREATE TABLE okr_key_result (
    key_result_id SERIAL PRIMARY KEY,
    okr_item_id INT NOT NULL REFERENCES okr_item(okr_item_id),
    title VARCHAR(500) NOT NULL,
    metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('PERCENTAGE', 'NUMBER', 'CURRENCY', 'BOOLEAN')),
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(20),
    progress DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN target_value = 0 THEN 0 
             ELSE LEAST((current_value / target_value) * 100, 100) 
        END
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OKR Approval
CREATE TABLE okr_approval (
    approval_id SERIAL PRIMARY KEY,
    okr_item_id INT NOT NULL REFERENCES okr_item(okr_item_id),
    approver_id INT NOT NULL REFERENCES employee(employee_id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OKR Evaluation
CREATE TABLE okr_evaluation (
    evaluation_id SERIAL PRIMARY KEY,
    okr_item_id INT NOT NULL REFERENCES okr_item(okr_item_id),
    evaluator_id INT NOT NULL REFERENCES employee(employee_id),
    evaluation_type VARCHAR(20) NOT NULL CHECK (evaluation_type IN ('SELF', 'MANAGER')),
    score INT CHECK (score BETWEEN 1 AND 5),
    achievement_rate DECIMAL(5,2),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(okr_item_id, evaluator_id, evaluation_type)
);

-- Indexes
CREATE INDEX idx_okr_item_cycle ON okr_item(cycle_id);
CREATE INDEX idx_okr_item_owner ON okr_item(owner_id);
CREATE INDEX idx_okr_item_parent ON okr_item(parent_okr_id);
CREATE INDEX idx_okr_member_item ON okr_member(okr_item_id);
CREATE INDEX idx_okr_member_member ON okr_member(member_id);
CREATE INDEX idx_okr_kr_item ON okr_key_result(okr_item_id);
```

---

*문서 끝*
