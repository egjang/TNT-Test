package com.tnt.sales.activity.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tnt.sales.activity.config.ActivityAITableConfig;
import com.tnt.sales.activity.config.ActivityAITableConfig.TableDefinition;
import com.tnt.sales.activity.config.ActivityAITableConfig.FieldDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/v1/activity-analysis-ai")
public class ActivityAnalysisAIController {
    private static final Logger log = LoggerFactory.getLogger(ActivityAnalysisAIController.class);
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

    @Autowired
    private ActivityAITableConfig tableConfig;

    @Value("${app.gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.0-flash-exp}")
    private String geminiModel;

    /**
     * Analyze activities using AI based on natural language question
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeActivities(@RequestBody Map<String, Object> request) {
        String question = (String) request.get("question");
        String assigneeId = (String) request.get("assigneeId");
        String empName = (String) request.get("empName");

        log.info("analyzeActivities called with question: {}, assigneeId: {}, empName: {}", question, assigneeId, empName);

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Question is required"));
        }

        if (pgJdbc == null) {
            return ResponseEntity.ok(Map.of("error", "PostgreSQL datasource not configured"));
        }

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Gemini API key not configured"));
        }

        try {
            // Step 1: Parse question to extract time period and determine if filtering by user
            Map<String, Object> parsedInfo = parseQuestionWithAI(question, assigneeId, empName);

            String startDate = (String) parsedInfo.getOrDefault("startDate", null);
            String endDate = (String) parsedInfo.getOrDefault("endDate", null);
            boolean filterByUser = (Boolean) parsedInfo.getOrDefault("filterByUser", false);
            String effectiveAssigneeId = filterByUser ? assigneeId : null;

            // Step 2: Fetch activity data from database using config-based dynamic queries
            String activityData = fetchActivityDataFromConfig(startDate, endDate, effectiveAssigneeId);

            if (activityData == null || activityData.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("error", "해당 기간에 활동 데이터가 없습니다."));
            }

            // Step 3: Call Gemini API for analysis
            String analysis = analyzeWithGemini(question, activityData);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", analysis,
                "question", question
            ));

        } catch (Exception e) {
            log.error("Activity analysis failed", e);
            return ResponseEntity.ok(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * 설정된 테이블 목록 조회 API
     */
    @GetMapping("/tables")
    public ResponseEntity<?> getTables() {
        List<Map<String, Object>> tables = new ArrayList<>();
        for (TableDefinition table : tableConfig.getEnabledTables()) {
            Map<String, Object> tableInfo = new LinkedHashMap<>();
            tableInfo.put("name", table.getName());
            tableInfo.put("displayName", table.getDisplayName());
            tableInfo.put("enabled", table.isEnabled());
            tableInfo.put("dateColumn", table.getDateColumn());
            tableInfo.put("limit", table.getLimit());
            tables.add(tableInfo);
        }
        return ResponseEntity.ok(Map.of("tables", tables));
    }

    /**
     * 설정 파일 리로드 API
     */
    @PostMapping("/reload-config")
    public ResponseEntity<?> reloadConfig() {
        try {
            tableConfig.loadConfig();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "설정이 리로드되었습니다.",
                "tableCount", tableConfig.getEnabledTables().size()
            ));
        } catch (Exception e) {
            log.error("Failed to reload config", e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Parse natural language question to extract date range and determine if filtering by user
     */
    private Map<String, Object> parseQuestionWithAI(String question, String assigneeId, String empName) throws Exception {
        Map<String, Object> result = new HashMap<>();
        java.time.LocalDate today = java.time.LocalDate.now();

        // Use AI to parse the date range and detect if user wants their own activities
        String dateParsePrompt = String.format("""
            오늘 날짜: %s (%s)
            로그인 사용자: %s

            사용자 질문: "%s"

            위 질문을 분석하여 다음 정보를 추출하세요:

            1. 날짜 범위 (한 주는 월요일부터 일요일까지):
               - "금주", "이번 주", "이번주", "this week" → 이번 주 월요일~일요일
               - "차주", "다음 주", "다음주", "next week" → 다음 주 월요일~일요일
               - "익주" → 다다음 주 월요일~일요일
               - "지난주", "전주", "last week" → 지난 주 월요일~일요일
               - "이번 달", "this month" → 이번 달 1일~오늘
               - "지난달", "last month" → 지난 달 1일~마지막 날
               - 날짜 표현이 없으면 → 최근 30일

            2. 본인 활동 필터링 여부:
               - "우리 팀", "전체", "모든", "팀원들의", "전체 활동", "팀 활동", 특정 다른 사람 이름 언급 → filterByUser: false
               - 그 외 (명확하지 않거나 "내 활동", "나의 활동", "활동 요약" 등) → filterByUser: true (기본값)

            다음 JSON 형식으로만 답변하세요:
            {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "filterByUser": true/false}

            JSON만 출력하고 다른 설명은 하지 마세요.
            """,
            today.toString(),
            today.getDayOfWeek().toString(),
            empName != null ? empName : "알 수 없음",
            question
        );

        try {
            String url = String.format(
                "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel,
                geminiApiKey
            );

            Map<String, Object> requestBody = new LinkedHashMap<>();
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> content = new LinkedHashMap<>();
            List<Map<String, String>> parts = new ArrayList<>();
            parts.add(Map.of("text", dateParsePrompt));
            content.put("parts", parts);
            contents.add(content);
            requestBody.put("contents", contents);

            Map<String, Object> generationConfig = new LinkedHashMap<>();
            generationConfig.put("temperature", 0.1); // Low temperature for consistency
            generationConfig.put("maxOutputTokens", 100);
            requestBody.put("generationConfig", generationConfig);

            String jsonBody = om.writeValueAsString(requestBody);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            org.springframework.http.ResponseEntity<String> response =
                new org.springframework.web.client.RestTemplate().postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseMap = om.readValue(response.getBody(), Map.class);
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");

                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    Map<String, Object> contentMap = (Map<String, Object>) candidate.get("content");
                    List<Map<String, Object>> partsList = (List<Map<String, Object>>) contentMap.get("parts");

                    if (partsList != null && !partsList.isEmpty()) {
                        String aiResponse = (String) partsList.get(0).get("text");
                        log.info("AI date parsing response: {}", aiResponse);

                        // Extract JSON from response (remove markdown code blocks if present)
                        String jsonStr = aiResponse.trim();
                        if (jsonStr.startsWith("```")) {
                            jsonStr = jsonStr.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                        }

                        Map<String, Object> parsedResult = om.readValue(jsonStr, Map.class);
                        result.put("startDate", (String) parsedResult.get("startDate"));
                        result.put("endDate", (String) parsedResult.get("endDate"));
                        // Parse filterByUser - can be Boolean or String
                        Object filterByUserObj = parsedResult.get("filterByUser");
                        boolean filterByUser = false;
                        if (filterByUserObj instanceof Boolean) {
                            filterByUser = (Boolean) filterByUserObj;
                        } else if (filterByUserObj instanceof String) {
                            filterByUser = "true".equalsIgnoreCase((String) filterByUserObj);
                        }
                        result.put("filterByUser", filterByUser);

                        log.info("AI parsed - date range: {} to {}, filterByUser: {}",
                            parsedResult.get("startDate"), parsedResult.get("endDate"), filterByUser);
                        return result;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("AI date parsing failed, using default: {}", e.getMessage());
        }

        // Fallback to default 30 days
        java.time.LocalDate thirtyDaysAgo = today.minusDays(30);
        result.put("startDate", thirtyDaysAgo.toString());
        result.put("endDate", today.toString());
        // Fallback: 기본값은 본인 활동 (true), 전체/팀 언급 시만 false
        boolean fallbackFilterByUser = !(question.contains("전체") || question.contains("모든") ||
            question.contains("팀") || question.contains("우리"));
        result.put("filterByUser", fallbackFilterByUser);

        log.info("Using default date range: {} to {}, filterByUser: {}", thirtyDaysAgo, today, fallbackFilterByUser);
        return result;
    }

    /**
     * 설정 파일 기반으로 동적 쿼리 실행
     * @param assigneeId 사용자 필터링용 assigneeId (null이면 전체 조회)
     */
    private String fetchActivityDataFromConfig(String startDate, String endDate, String assigneeId) {
        StringBuilder data = new StringBuilder();

        log.info("fetchActivityDataFromConfig called - startDate: {}, endDate: {}, assigneeId: {}", startDate, endDate, assigneeId);

        try {
            // Validate date format
            java.sql.Timestamp startTimestamp;
            java.sql.Timestamp endTimestamp;

            try {
                startTimestamp = java.sql.Timestamp.valueOf(startDate + " 00:00:00");
                endTimestamp = java.sql.Timestamp.valueOf(endDate + " 23:59:59");
            } catch (IllegalArgumentException e) {
                log.error("Invalid date format - startDate: {}, endDate: {}", startDate, endDate, e);
                return null;
            }

            // 설정된 각 테이블에 대해 쿼리 실행
            for (TableDefinition table : tableConfig.getEnabledTables()) {
                try {
                    String sql = table.getSql()
                            .replace(":startDate", "?")
                            .replace(":endDate", "?")
                            .replace(":limit", String.valueOf(table.getLimit()));

                    List<Map<String, Object>> results;

                    // assigneeId가 있으면 해당 사용자 필터링 적용
                    if (assigneeId != null && !assigneeId.trim().isEmpty()) {
                        // SQL에 :assigneeId 플레이스홀더가 있으면 사용, 아니면 직접 WHERE 조건 추가
                        if (sql.contains(":assigneeId")) {
                            sql = sql.replace(":assigneeId", "?");
                            results = pgJdbc.queryForList(sql, startTimestamp, endTimestamp, assigneeId);
                        } else {
                            // SQL에 assigneeId 필터가 없는 경우 - 결과에서 필터링
                            results = pgJdbc.queryForList(sql, startTimestamp, endTimestamp);
                            // assignee_id 또는 sf_owner_id 컬럼으로 필터링
                            final String filterAssigneeId = assigneeId;
                            results = results.stream()
                                .filter(row -> {
                                    Object aid = row.get("assignee_id");
                                    Object sfOwnerId = row.get("sf_owner_id");
                                    String rowAssigneeId = aid != null ? String.valueOf(aid) : null;
                                    String rowSfOwnerId = sfOwnerId != null ? String.valueOf(sfOwnerId) : null;
                                    return filterAssigneeId.equals(rowAssigneeId) || filterAssigneeId.equals(rowSfOwnerId);
                                })
                                .toList();
                        }
                    } else {
                        results = pgJdbc.queryForList(sql, startTimestamp, endTimestamp);
                    }

                    log.info("{} query returned {} rows", table.getName(), results.size());

                    if (!results.isEmpty()) {
                        data.append("\n=== ").append(table.getDisplayName()).append(" ===\n\n");

                        for (Map<String, Object> row : results) {
                            // 설정된 필드 정의에 따라 데이터 포맷팅
                            for (FieldDefinition field : table.getFields()) {
                                String value = getFieldValue(row, field);
                                if (value != null && !value.isEmpty()) {
                                    data.append(String.format("%s: %s\n", field.getLabel(), value));
                                }
                            }
                            data.append("\n");
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to query table {}: {}", table.getName(), e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Failed to fetch activity data from config", e);
            return null;
        }

        String result = data.toString();
        log.info("fetchActivityDataFromConfig returning {} characters of data", result.length());
        return result;
    }

    /**
     * 필드 값 추출 (fallback 지원)
     */
    private String getFieldValue(Map<String, Object> row, FieldDefinition field) {
        Object value = row.get(field.getColumn());

        // 값이 null이거나 비어있으면 fallback 컬럼 확인
        if (value == null || value.toString().trim().isEmpty() || "null".equals(value.toString())) {
            if (field.getFallback() != null) {
                Object fallbackValue = row.get(field.getFallback());
                if (fallbackValue != null && !fallbackValue.toString().trim().isEmpty()) {
                    return fallbackValue.toString();
                }
            }
            // optional 필드이면 null 반환 (출력 안 함)
            if (field.isOptional()) {
                return null;
            }
            return null;
        }

        return value.toString();
    }

    private String analyzeWithGemini(String question, String activityData) throws Exception {
        String prompt = String.format("""
            당신은 영업 활동 분석 전문가입니다. 사용자의 질문에 답하기 위해 다음 활동 데이터를 분석해주세요.

            **사용자 질문**
            %s

            **활동 데이터**
            %s

            **분석 지침**
            1. 사용자의 질문에 직접적으로 답변하세요
            2. 데이터에서 관련된 정보를 찾아 구체적으로 설명하세요
            3. description 필드의 내용을 중심으로 활동 내용을 파악하세요
            4. 계획 대비 실적, 달성률 등 숫자 정보가 있다면 포함하세요
            5. 데이터가 부족하거나 질문에 답할 수 없다면 솔직하게 말하세요
            6. **중요**: ID를 표시하지 말고, 이름/성명으로 표시하세요
               - "담당자 ID: 0001234567" → "담당자: 홍길동" (이름을 알 수 없으면 ID 표시)
               - "고객 Account ID: ACC123" → "고객: 삼성전자" (이름을 알 수 없으면 ID 표시)
               - 활동 ID, 계획 ID, 목표 ID 등 시스템 내부 ID는 표시하지 마세요
            7. 사람과 관련된 정보는 항상 이름/성명을 우선적으로 표시하세요

            **출력 형식**
            - 마크다운 형식으로 작성
            - 간결하고 명확하게 답변
            - 핵심 내용을 bullet point로 정리
            - 구체적인 수치와 예시를 포함
            - **중요**: 영업사원별 활동을 요약할 때는 반드시 마크다운 테이블로 작성하고, 테이블 본문에 실제 데이터를 채워야 합니다
            - 테이블 예시:
              | 영업사원 | 활동 유형 | 건수 | 주요 내용 |
              |:---------|:----------|-----:|:----------|
              | 홍길동 | 정기방문 | 5 | 고객사 미팅, 제품 설명 |
              | 김철수 | 영업기회 | 3 | 견적 제출, 계약 협의 |
            - 테이블 헤더만 있고 데이터 행이 없는 빈 테이블은 절대 만들지 마세요
            - ID 대신 이름/성명 사용 (사람, 고객, 조직 등)

            답변:
            """, question, activityData);

        // Call Gemini API
        String url = String.format(
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
            geminiModel,
            geminiApiKey
        );

        Map<String, Object> requestBody = new LinkedHashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> content = new LinkedHashMap<>();
        List<Map<String, String>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));
        content.put("parts", parts);
        contents.add(content);
        requestBody.put("contents", contents);

        // Add generation config
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("maxOutputTokens", 4096);
        requestBody.put("generationConfig", generationConfig);

        String jsonBody = om.writeValueAsString(requestBody);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(60))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("Gemini API error: {}", response.body());
            throw new RuntimeException("Gemini API returned status " + response.statusCode());
        }

        JsonNode root = om.readTree(response.body());
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode firstCandidate = candidates.get(0);
            JsonNode contentNode = firstCandidate.path("content");
            JsonNode partsNode = contentNode.path("parts");
            if (partsNode.isArray() && partsNode.size() > 0) {
                return partsNode.get(0).path("text").asText();
            }
        }

        throw new RuntimeException("No valid response from Gemini API");
    }
}
