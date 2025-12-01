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

- 로컬 개발: `168.107.43.244:5432/postgres`
- 운영 환경: `10.0.0.195:5432/postgres`
- `MultiDataSourceConfig.java`에서 `app.datasource.pg.*` 설정 사용
