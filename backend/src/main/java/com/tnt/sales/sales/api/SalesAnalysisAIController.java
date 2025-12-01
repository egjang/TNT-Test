package com.tnt.sales.sales.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tnt.sales.sales.config.SalesAITableConfig;
import com.tnt.sales.sales.config.SalesAITableConfig.TableDefinition;
import com.tnt.sales.sales.config.SalesAITableConfig.FieldDefinition;
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
@RequestMapping("/api/v1/sales-analysis-ai")
public class SalesAnalysisAIController {
    private static final Logger log = LoggerFactory.getLogger(SalesAnalysisAIController.class);
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

    @Autowired
    private SalesAITableConfig tableConfig;

    @Value("${app.gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.0-flash-exp}")
    private String geminiModel;

    /**
     * Analyze sales using AI based on natural language question
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeSales(@RequestBody Map<String, Object> request) {
        String question = (String) request.get("question");
        String assigneeId = (String) request.get("assigneeId");
        String empName = (String) request.get("empName");

        log.info("analyzeSales called with question: {}, assigneeId: {}, empName: {}", question, assigneeId, empName);

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
            // Step 1: Parse question to extract time period and search keyword
            Map<String, Object> parsedInfo = parseQuestionWithAI(question, assigneeId, empName);

            String startDate = (String) parsedInfo.getOrDefault("startDate", null);
            String endDate = (String) parsedInfo.getOrDefault("endDate", null);
            boolean filterByUser = (Boolean) parsedInfo.getOrDefault("filterByUser", false);
            String effectiveAssigneeId = filterByUser ? assigneeId : null;
            String searchKeyword = (String) parsedInfo.getOrDefault("searchKeyword", null);

            // Step 2: Fetch sales data from database using config-based dynamic queries
            String salesData = fetchSalesDataFromConfig(startDate, endDate, effectiveAssigneeId, searchKeyword);

            if (salesData == null || salesData.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("error", "해당 기간에 매출 데이터가 없습니다."));
            }

            // Step 3: Call Gemini API for analysis
            String analysis = analyzeWithGemini(question, salesData, empName);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", analysis,
                "question", question
            ));

        } catch (Exception e) {
            log.error("Sales analysis failed", e);
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

        String dateParsePrompt = String.format("""
            오늘 날짜: %s (%s)
            로그인 사용자: %s

            사용자 질문: "%s"

            위 질문을 분석하여 다음 정보를 추출하세요:

            1. 날짜 범위:
               - "이번 달", "이달", "this month" → 이번 달 1일~오늘
               - "지난달", "last month" → 지난 달 1일~마지막 날
               - "지난주", "저번주", "전주", "last week" → 지난 주 월요일~일요일
               - "이번주", "금주", "this week" → 이번 주 월요일~오늘
               - "이번 분기" → 이번 분기 시작~오늘
               - "올해", "금년" → 올해 1월 1일~오늘
               - "작년", "지난해" → 작년 1월 1일~12월 31일
               - "최근 3개월" → 3개월 전~오늘
               - "최근 6개월" → 6개월 전~오늘
               - "어제" → 어제 날짜~어제 날짜
               - 특정 품목명이 언급되고 날짜 범위가 없는 경우 → 최근 3개월 (품목 검색은 넓은 범위 필요)
               - 날짜 표현이 없으면 → 이번 달 1일~오늘

            2. 본인 매출 필터링 여부:
               - "내 매출", "나의 매출", "내가 담당한", "내 고객" 등 명시적으로 본인 매출을 요청하는 경우 → filterByUser: true
               - 그 외 모든 경우 (일반적인 매출 현황, 품목별 분석, 고객별 분석 등) → filterByUser: false (기본값)

            3. 품목명 검색 키워드 (매우 중요):
               - 질문에 특정 품목명이 언급된 경우, 핵심 키워드만 추출
               - 공백, 특수문자 등을 제거하고 핵심 단어만 사용
               - 예: "TT AL 간봉 매출" → searchKeyword: "%%간봉%%"  (핵심 키워드만)
               - 예: "TT AL간봉" → searchKeyword: "%%간봉%%"
               - 예: "간봉 관련 매출" → searchKeyword: "%%간봉%%"
               - 예: "파이프 판매 현황" → searchKeyword: "%%파이프%%"
               - 예: "단열재 매출" → searchKeyword: "%%단열%%"
               - 품목명이 없으면 → searchKeyword: null
               - 검색 키워드는 반드시 앞뒤에 %%를 붙여주세요 (LIKE 검색용)
               - 가능한 짧고 핵심적인 키워드 사용 (검색 범위 확장)

            다음 JSON 형식으로만 답변하세요:
            {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "filterByUser": true/false, "searchKeyword": "%%키워드%%" 또는 null}

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
            generationConfig.put("temperature", 0.1);
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

                        String jsonStr = aiResponse.trim();
                        if (jsonStr.startsWith("```")) {
                            jsonStr = jsonStr.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                        }

                        Map<String, Object> parsedResult = om.readValue(jsonStr, Map.class);
                        result.put("startDate", (String) parsedResult.get("startDate"));
                        result.put("endDate", (String) parsedResult.get("endDate"));

                        Object filterByUserObj = parsedResult.get("filterByUser");
                        boolean filterByUser = false;
                        if (filterByUserObj instanceof Boolean) {
                            filterByUser = (Boolean) filterByUserObj;
                        } else if (filterByUserObj instanceof String) {
                            filterByUser = "true".equalsIgnoreCase((String) filterByUserObj);
                        }
                        result.put("filterByUser", filterByUser);

                        // 검색 키워드 추출
                        Object searchKeywordObj = parsedResult.get("searchKeyword");
                        if (searchKeywordObj != null && !"null".equals(String.valueOf(searchKeywordObj))) {
                            String searchKeyword = String.valueOf(searchKeywordObj);
                            // %% 를 실제 % 로 변환
                            searchKeyword = searchKeyword.replace("%%", "%");
                            result.put("searchKeyword", searchKeyword);
                            log.info("AI parsed searchKeyword: {}", searchKeyword);
                        }

                        log.info("AI parsed - date range: {} to {}, filterByUser: {}, searchKeyword: {}",
                            parsedResult.get("startDate"), parsedResult.get("endDate"), filterByUser, result.get("searchKeyword"));
                        return result;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("AI date parsing failed, using default: {}", e.getMessage());
        }

        // Fallback: 이번 달
        java.time.LocalDate firstDayOfMonth = today.withDayOfMonth(1);
        result.put("startDate", firstDayOfMonth.toString());
        result.put("endDate", today.toString());
        // 매출 분석은 기본적으로 전체 데이터 조회 (내 매출 명시 시에만 필터링)
        boolean fallbackFilterByUser = question.contains("내 매출") || question.contains("나의 매출") ||
            question.contains("내가 담당") || question.contains("내 고객");
        result.put("filterByUser", fallbackFilterByUser);

        log.info("Using default date range: {} to {}, filterByUser: {}", firstDayOfMonth, today, fallbackFilterByUser);
        return result;
    }

    /**
     * 설정 파일 기반으로 동적 쿼리 실행
     * @param searchKeyword 품목명 등 검색 키워드 (LIKE 패턴, 예: %간봉%)
     */
    private String fetchSalesDataFromConfig(String startDate, String endDate, String assigneeId, String searchKeyword) {
        StringBuilder data = new StringBuilder();

        log.info("fetchSalesDataFromConfig called - startDate: {}, endDate: {}, assigneeId: {}, searchKeyword: {}",
            startDate, endDate, assigneeId, searchKeyword);

        try {
            java.sql.Date startSqlDate;
            java.sql.Date endSqlDate;

            try {
                startSqlDate = java.sql.Date.valueOf(startDate);
                endSqlDate = java.sql.Date.valueOf(endDate);
            } catch (IllegalArgumentException e) {
                log.error("Invalid date format - startDate: {}, endDate: {}", startDate, endDate, e);
                return null;
            }

            boolean hasSearchKeyword = searchKeyword != null && !searchKeyword.trim().isEmpty();

            for (TableDefinition table : tableConfig.getEnabledTables()) {
                try {
                    // 검색 키워드가 있고 테이블이 searchable인 경우
                    boolean isSearchQuery = table.isSearchable() && hasSearchKeyword;

                    // 검색 키워드가 없으면 searchable 테이블은 스킵 (검색용 테이블은 키워드 필요)
                    if (!hasSearchKeyword && table.isSearchable()) {
                        continue;
                    }

                    String sql = table.getSql()
                            .replace(":startDate", "?")
                            .replace(":endDate", "?")
                            .replace(":limit", String.valueOf(table.getLimit()));

                    List<Map<String, Object>> results;

                    // 검색 키워드 처리 (searchable 테이블에만 적용)
                    if (isSearchQuery && sql.contains(":searchKeyword")) {
                        sql = sql.replace(":searchKeyword", "?");

                        if (assigneeId != null && !assigneeId.trim().isEmpty() && sql.contains(":assigneeId")) {
                            sql = sql.replace(":assigneeId", "?");
                            results = pgJdbc.queryForList(sql, startSqlDate, endSqlDate, searchKeyword, assigneeId);
                        } else {
                            results = pgJdbc.queryForList(sql, startSqlDate, endSqlDate, searchKeyword);
                        }
                    } else if (assigneeId != null && !assigneeId.trim().isEmpty()) {
                        if (sql.contains(":assigneeId")) {
                            sql = sql.replace(":assigneeId", "?");
                            results = pgJdbc.queryForList(sql, startSqlDate, endSqlDate, assigneeId);
                        } else {
                            results = pgJdbc.queryForList(sql, startSqlDate, endSqlDate);
                            final String filterAssigneeId = assigneeId;
                            results = results.stream()
                                .filter(row -> {
                                    Object aid = row.get("assignee_id");
                                    Object empId = row.get("emp_id");
                                    String rowAssigneeId = aid != null ? String.valueOf(aid) : null;
                                    String rowEmpId = empId != null ? String.valueOf(empId) : null;
                                    return filterAssigneeId.equals(rowAssigneeId) || filterAssigneeId.equals(rowEmpId);
                                })
                                .toList();
                        }
                    } else {
                        results = pgJdbc.queryForList(sql, startSqlDate, endSqlDate);
                    }

                    log.info("{} query returned {} rows", table.getName(), results.size());

                    if (!results.isEmpty()) {
                        data.append("\n=== ").append(table.getDisplayName()).append(" ===\n\n");

                        for (Map<String, Object> row : results) {
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
            log.error("Failed to fetch sales data from config", e);
            return null;
        }

        String result = data.toString();
        log.info("fetchSalesDataFromConfig returning {} characters of data", result.length());
        return result;
    }

    private String getFieldValue(Map<String, Object> row, FieldDefinition field) {
        Object value = row.get(field.getColumn());

        if (value == null || value.toString().trim().isEmpty() || "null".equals(value.toString())) {
            if (field.getFallback() != null) {
                Object fallbackValue = row.get(field.getFallback());
                if (fallbackValue != null && !fallbackValue.toString().trim().isEmpty()) {
                    return fallbackValue.toString();
                }
            }
            if (field.isOptional()) {
                return null;
            }
            return null;
        }

        return value.toString();
    }

    private String analyzeWithGemini(String question, String salesData, String empName) throws Exception {
        String prompt = String.format("""
            당신은 매출 분석 전문가입니다. 사용자의 질문에 답하기 위해 다음 매출 데이터를 분석해주세요.
            현재 로그인 사용자: %s

            **사용자 질문**
            %s

            **매출 데이터**
            %s

            **분석 지침**
            1. 사용자의 질문에 직접적으로 답변하세요
            2. **품목 검색 결과** 또는 **품목별 매출 요약 (검색)** 섹션이 있으면, 이것이 사용자가 찾는 품목의 실제 매출 데이터입니다. 반드시 이 데이터를 기반으로 분석하세요.
            3. 금액은 읽기 쉽게 포맷팅하세요 (예: 1,234,567원)
            4. 매출 추이, 품목별 분석, 고객별 분석 등 인사이트를 제공하세요
            5. 데이터가 있으면 총 매출, 거래건수, 주요 고객 등을 정리해주세요
            6. **중요**: ID를 표시하지 말고, 이름으로 표시하세요
               - 품목명, 고객명, 담당자명을 우선 사용하세요
               - 시스템 내부 ID는 표시하지 마세요
            7. 품목 검색 결과가 있으면 해당 품목의 매출 현황을 표로 정리해주세요

            **출력 형식**
            - 마크다운 형식으로 작성
            - 간결하고 명확하게 답변
            - 핵심 내용을 bullet point로 정리
            - 구체적인 수치와 예시를 포함
            - 품목 검색 시 표(table) 형식으로 거래 내역 정리

            답변:
            """, empName != null ? empName : "알 수 없음", question, salesData);

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
