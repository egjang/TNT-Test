# TNT Sales 프로젝트 규칙

## DB Schema DDL 작성 규칙

DDL(CREATE TABLE, ALTER TABLE 등) 작성 요청 시 아래 규칙을 자동으로 적용한다:

### 1. 표준 용어 및 데이터 타입 참조
- **반드시** `/home/egjang/vibe-lab/tnt_db_dic/docs/datadict-postgres-postgres-public.md` 파일을 읽어 기존 테이블들의 컬럼명, 데이터 타입, 코멘트를 참조한다.
- 동일하거나 유사한 의미의 컬럼은 기존 표준 용어와 데이터 타입을 따른다.
- 예시:
  - `customer_seq` → `bigint`
  - `customer_name` → `character varying(200)`
  - `created_at` → `timestamp with time zone DEFAULT now()`
  - `updated_at` → `timestamp with time zone DEFAULT now()`
  - `created_by` → `character varying(100) DEFAULT CURRENT_USER`
  - `updated_by` → `character varying(100) DEFAULT CURRENT_USER`

### 2. DDL 파일 저장 위치
- 생성된 DDL은 `/home/egjang/vibe-lab/tnt_db_dic/sql/postgres/public/{테이블명}.sql` 파일로 저장한다.
- 파일명은 테이블명과 동일하게 소문자 snake_case로 작성한다.
- 기존 파일이 있으면 덮어쓰기 전에 사용자에게 확인한다.

### 3. DDL 작성 표준
```sql
-- 테이블 코멘트
COMMENT ON TABLE public.{테이블명} IS '테이블 설명';

-- 컬럼 코멘트 (각 컬럼별로 작성)
COMMENT ON COLUMN public.{테이블명}.{컬럼명} IS '컬럼 설명';
```

### 4. 공통 컬럼 패턴
신규 테이블 생성 시 아래 컬럼을 포함한다:
```sql
-- PK (테이블명 기반 id)
id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

-- 감사(audit) 컬럼
created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
created_by      VARCHAR(100) NOT NULL DEFAULT CURRENT_USER,
updated_by      VARCHAR(100) NOT NULL DEFAULT CURRENT_USER
```

## 프로젝트 구조

- `backend/` - Spring Boot 백엔드 (Java)
- `frontend/` - PC용 프론트엔드 (React + TypeScript)
- `frontend_mb/` - 모바일용 프론트엔드 (React + TypeScript)
- `scripts/` - 배포 및 유틸리티 스크립트

## 데이터베이스 설정

### PostgreSQL 접속 정보
| 환경 | IP | Port | Database | Username | Password |
|------|-----|------|----------|----------|----------|
| **개발 (dev)** | 168.107.43.244 | 5432 | postgres | postgres | TNTdys1234 |
| **운영 (prod)** | 10.0.0.195 | 5432 | postgres | postgres | TNTdys1234 |

### 설정 파일 위치
- 개발: `backend/src/main/resources/application-postgres.yml`
- 운영: `backend/src/main/resources/application-prod.yml`
- `MultiDataSourceConfig.java`에서 `app.datasource.pg.*` 설정 사용

### psql 접속 명령어
```bash
# 개발 환경
PGPASSWORD=TNTdys1234 psql -h 168.107.43.244 -U postgres -d postgres

# 운영 환경
PGPASSWORD=TNTdys1234 psql -h 10.0.0.195 -U postgres -d postgres
```

### MSSQL 접속 정보 (ERP 연동)
- URL: `220.73.213.73:14233`
- Database: TNT
- 용도: 기간계 ERP 데이터 조회 (읽기 전용)

## 코드 아키텍처 규칙

### Service 클래스 분리 원칙

**중요**: 새로운 도메인 기능 추가 시 기존 Service 클래스에 메서드를 추가하지 않는다.

#### 규칙
1. **Service 클래스 크기 제한**: 단일 Service 클래스는 **300줄 이하** 유지
2. **도메인별 분리**: 새 도메인 기능은 별도 Service 클래스로 생성
3. **기존 대형 Service 참고**: `CreditService.java`(2,365줄)는 분리가 필요한 안티패턴 예시

#### 도메인별 Service 분리 예시
```
❌ 잘못된 예 (모든 기능을 CreditService에 추가)
CreditService.java (2,365줄)
  - AR Aging 조회
  - 회의 관리
  - 해제 요청
  - 활동 관리
  - ...

✅ 올바른 예 (도메인별 분리)
├── ArAgingService.java (~300줄)
├── CreditMeetingService.java (~400줄)
├── UnblockRequestService.java (~500줄)
├── MeetingRemarkService.java (~150줄)
└── CreditActivityService.java (~150줄)
```

#### 새 기능 추가 시 체크리스트
1. 기존 Service 파일 라인 수 확인 (`wc -l`)
2. 300줄 초과 시 → 새 Service 클래스 생성
3. Controller에서 새 Service 주입
4. 기존 API 엔드포인트 유지 (내부 구조만 개선)

### Frontend 컴포넌트 규칙
- 컴포넌트 파일은 **500줄 이하** 유지
- 공통 로직은 `hooks/` 또는 `utils/`로 분리
- 타입 정의는 `types/` 디렉토리에 별도 관리

## Git 저장소 설정

### 업로드 대상 저장소 (3개)
git 업로드 요청 시 아래 3개 저장소에 모두 push한다:

| Remote | Repository | 용도 |
|--------|------------|------|
| **origin** | `git@github.com:egjang/TNT-Test.git` | 개인 테스트 저장소 |
| **tnt-biz** | `git@github.com:TNT-Biz-admin/egjang.git` | TNT-Biz 개인 저장소 |
| **biz-platform** | `git@github.com:TNT-Biz-admin/biz-platform.git` | TNT-Biz 플랫폼 저장소 |

### 업로드 명령어
```bash
# tnt_sales 디렉토리에서 실행
git -C /home/egjang/vibe-lab/tnt_sales add .
git -C /home/egjang/vibe-lab/tnt_sales commit -m "커밋 메시지"
git -C /home/egjang/vibe-lab/tnt_sales push origin master
git -C /home/egjang/vibe-lab/tnt_sales push tnt-biz master
git -C /home/egjang/vibe-lab/tnt_sales push biz-platform master
```
