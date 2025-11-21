# 구현 계획

1. DB 마이그레이션 작성 (MSSQL/Postgres)
- 테이블 `sales_strategy` 생성 (id, created/updated, target_year, strategy_type, title, summary, file_url, [옵션] file_name/file_size/drive_id/item_id)

2. SharePoint 업로드/링크 생성 모듈
- Microsoft Graph 클라이언트 구성(앱 권한)
- 업로드 경로 `/SalesStrategies/{year}` 자동 생성
- 공유 링크 생성(조직 내부)

3. 백엔드 API
- 목록: GET `/api/v1/strategy?year=YYYY&limit&offset`
- 생성: POST `/api/v1/strategy` (multipart/form-data)
- 단건: GET `/api/v1/strategy/{id}`
- 수정: PUT `/api/v1/strategy/{id}`
- 삭제: DELETE `/api/v1/strategy/{id}?deleteFile=false`

4. 프론트 우측 패널 UI
- 목표Dashboard에 "영업전략" 패널 추가(연도 선택, 리스트/등록 모달)
- 파일 업로드 → 백엔드 → 링크 저장/표시

5. 검증/하드닝
- 확장자/크기 제한, 에러 처리, 로깅/권한

