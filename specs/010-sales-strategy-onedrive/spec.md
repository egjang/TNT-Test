# 010 — Sales Strategy (OneDrive/SharePoint)

한글 제목: 목표Dashboard 우측 패널(영업전략)에서 연도별 전략 문서를 조직 SharePoint에 저장하고 링크를 관리한다.

## 배경/목표
- 목표Dashboard 화면의 우측 패널 명칭은 "영업전략".
- 연도 단위로 영업 전략을 등록/조회/관리한다.
- 파일은 조직 SharePoint 문서 라이브러리의 `/SalesStrategies/{year}` 경로에 업로드하고, 공유 가능한 링크를 저장하여 UI에서 열람 가능하게 한다.

## 데이터 모델(초안)
- 테이블명: `sales_strategy`
  - `id` BIGINT PK
  - `created_at` TIMESTAMP
  - `updated_at` TIMESTAMP
  - `created_by` VARCHAR(50)
  - `updated_by` VARCHAR(50)
  - `target_year` DATE (연도만 사용; 1월 1일로 저장)
  - `strategy_type` VARCHAR(50) (전략유형)
  - `title` VARCHAR(200) (제목)
  - `summary` TEXT (내용요약)
  - `file_url` TEXT (SharePoint/OneDrive 공유 링크)
  - (선택) `file_name` VARCHAR(255), `file_size` BIGINT, `drive_id` VARCHAR(128), `item_id` VARCHAR(128)

주의: 사용자 요구사항 상 관리 범위는 "년도만"이며, 담당자/회사구분으로는 분리하지 않는다.

## 기능 요구사항 (FR)
- FR-1: 목표Dashboard 우측 패널(영업전략)에 연도 선택 UI와 전략 목록(카드/리스트)을 표시한다.
- FR-2: 전략 등록 시 전략유형/제목/내용요약을 입력하고, 파일을 업로드하여 SharePoint `/SalesStrategies/{year}`에 저장한다.
- FR-3: 업로드 완료 후 백엔드는 파일 공유 링크를 생성해 `sales_strategy.file_url`로 저장한다.
- FR-4: 목록 조회는 연도별로 페이징/정렬(최신순) 지원.
- FR-5: 상세 보기에서 링크 클릭 시 새 탭에서 SharePoint 파일을 연다.
- FR-6: 항목 수정(전략유형/제목/요약 교체) 및 파일 재업로드(링크 갱신) 지원.
- FR-7: 항목 삭제(소프트 삭제 없이 물리 삭제) — 파일 삭제 여부는 옵션(기본: 파일 유지, 메타만 삭제)으로 처리.

## 수용 기준 (AC)
- AC-1: 연도 선택 후 해당 연도의 전략 목록이 1초 이내로 표시된다(로컬 개발 기준).
- AC-2: 파일 업로드 시 SharePoint `/SalesStrategies/{year}` 하위에 파일이 생성되고, UI에 공유 링크가 노출된다.
- AC-3: 제목/요약/전략유형 수정이 저장되면 목록과 상세에 즉시 반영된다.
- AC-4: 삭제 시 목록에서 사라지고, 파일 삭제 옵션이 Off일 때 기존 링크는 더는 목록에서 접근되지 않는다.
- AC-5: 잘못된 링크/권한 문제 발생 시 에러 메시지와 재시도/연결 재설정 안내를 제공한다.

## OneDrive/SharePoint 연동
- 대상: 조직 SharePoint 문서 라이브러리(테넌트 공용 저장소)
- 폴더 구조: `/SalesStrategies/{year}`
- 권장 방식: Microsoft Graph 어플리케이션 권한(서버 측) 사용
  - 클라이언트 자격증명 흐름(Confidential client): 백엔드에서 토큰 획득, 업로드/링크 생성 처리
  - 필요 권한 예시: `Files.ReadWrite.All`, `Sites.ReadWrite.All`
- 파일 링크 정책: 조직 내부 사용자에게만 링크 허용(기본). 외부 공유 비활성화.

## API (초안)
- POST `/api/v1/strategy` — 생성(메타 + 파일 업로드)
- GET `/api/v1/strategy?year=YYYY&limit=..&offset=..` — 목록
- GET `/api/v1/strategy/{id}` — 단건 조회
- PUT `/api/v1/strategy/{id}` — 수정(메타/파일 교체)
- DELETE `/api/v1/strategy/{id}?deleteFile=false` — 삭제(옵션으로 파일 삭제)

요청/응답 스키마는 구현 시 상세화. 업로드는 multipart/form-data 또는 사전 업로드(클라이언트 직업로드 → 백엔드로 링크 전달) 중 선택.

## 보안/구성
- Graph 자격증명은 서버 측 환경변수/시크릿에 저장. 프론트에 노출 금지.
- 업로드 크기 제한(예: 50MB)과 허용 확장자(예: pdf, pptx, docx) 설정.
- 에러 로깅 시 민감정보(토큰/링크)는 마스킹.

## UI 개요 (우측 패널)
- 패널 타이틀: 영업전략
- 컨트롤: 연도 선택, 새 전략 추가 버튼
- 리스트: 카드(전략유형, 제목, 요약 일부, 파일 아이콘/링크)
- 새로 만들기/수정 모달: 필드 입력 + 파일 선택 + 저장

## 기록/이력
- 생성/수정 사용자, 일시 기록. 버전필드는 기본 1로 시작(선택).

