package com.tnt.sales.activity.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

        log.info("analyzeActivities called with question: {}", question);

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
            // Step 1: Parse question to extract time period and employee info using AI
            Map<String, String> parsedInfo = parseQuestionWithAI(question);

            String employeeId = parsedInfo.getOrDefault("employeeId", null);
            String startDate = parsedInfo.getOrDefault("startDate", null);
            String endDate = parsedInfo.getOrDefault("endDate", null);

            // Step 2: Fetch activity data from database
            String activityData = fetchActivityData(employeeId, startDate, endDate);

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
     * Parse natural language question to extract employee ID and date range using AI
     */
    private Map<String, String> parseQuestionWithAI(String question) throws Exception {
        Map<String, String> result = new HashMap<>();
        java.time.LocalDate today = java.time.LocalDate.now();

        // Use AI to parse the date range from natural language
        String dateParsePrompt = String.format("""
            오늘 날짜: %s (%s)

            사용자 질문: "%s"

            위 질문에서 날짜 범위를 추출하세요. 한 주는 월요일부터 일요일까지입니다.

            날짜 표현 예시:
            - "금주", "이번 주", "이번주", "this week" → 이번 주 월요일~일요일
            - "차주", "다음 주", "다음주", "next week" → 다음 주 월요일~일요일
            - "익주" → 다다음 주 월요일~일요일
            - "지난주", "전주", "last week" → 지난 주 월요일~일요일
            - "이번 달", "this month" → 이번 달 1일~오늘
            - "지난달", "last month" → 지난 달 1일~마지막 날
            - 날짜 표현이 없으면 → 최근 30일

            다음 JSON 형식으로만 답변하세요:
            {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}

            JSON만 출력하고 다른 설명은 하지 마세요.
            """,
            today.toString(),
            today.getDayOfWeek().toString(),
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

                        Map<String, String> dateRange = om.readValue(jsonStr, Map.class);
                        result.put("startDate", dateRange.get("startDate"));
                        result.put("endDate", dateRange.get("endDate"));
                        result.put("employeeId", null);

                        log.info("AI parsed date range: {} to {}", dateRange.get("startDate"), dateRange.get("endDate"));
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
        result.put("employeeId", null);

        log.info("Using default date range: {} to {}", thirtyDaysAgo, today);
        return result;
    }

    private String fetchActivityData(String employeeId, String startDate, String endDate) {
        StringBuilder data = new StringBuilder();

        log.info("fetchActivityData called - employeeId: {}, startDate: {}, endDate: {}", employeeId, startDate, endDate);

        try {
            // Validate date format
            java.sql.Timestamp startTimestamp;
            java.sql.Timestamp endTimestamp;

            try {
                startTimestamp = java.sql.Timestamp.valueOf(startDate + " 00:00:00");
                endTimestamp = java.sql.Timestamp.valueOf(endDate + " 23:59:59");
            } catch (IllegalArgumentException e) {
                log.error("Invalid date format - startDate: {}, endDate: {}", startDate, endDate, e);
                throw new Exception("날짜 형식이 올바르지 않습니다: " + e.getMessage());
            }

            // 1. sales_activity 데이터
            String salesActivitySql;
            List<Map<String, Object>> salesActivities;

            if (employeeId != null && !employeeId.trim().isEmpty()) {
                salesActivitySql = """
                    SELECT
                        sa.id,
                        sa.sf_owner_id as emp_id,
                        e.emp_name as emp_name,
                        sa.subject,
                        sa.description,
                        sa.activity_type,
                        sa.activity_status,
                        sa.planned_start_at,
                        sa.planned_end_at,
                        sa.actual_start_at,
                        sa.actual_end_at,
                        sa.sf_account_id,
                        sa.sf_contact_id,
                        c.customer_name as customer_name
                    FROM public.sales_activity sa
                    LEFT JOIN public.employee e ON CAST(e.assignee_id AS TEXT) = CAST(sa.sf_owner_id AS TEXT)
                    LEFT JOIN public.customer c ON (CAST(c.customer_id AS TEXT) = CAST(sa.sf_account_id AS TEXT)
                                                    OR CAST(c.customer_seq AS TEXT) = CAST(sa.sf_account_id AS TEXT))
                    WHERE sa.sf_owner_id = ?
                        AND sa.planned_start_at >= ?
                        AND sa.planned_start_at <= ?
                    ORDER BY sa.planned_start_at
                    LIMIT 100
                """;
                salesActivities = pgJdbc.queryForList(
                    salesActivitySql,
                    employeeId,
                    startTimestamp,
                    endTimestamp
                );
            } else {
                salesActivitySql = """
                    SELECT
                        sa.id,
                        sa.sf_owner_id as emp_id,
                        e.emp_name as emp_name,
                        sa.subject,
                        sa.description,
                        sa.activity_type,
                        sa.activity_status,
                        sa.planned_start_at,
                        sa.planned_end_at,
                        sa.actual_start_at,
                        sa.actual_end_at,
                        sa.sf_account_id,
                        sa.sf_contact_id,
                        c.customer_name as customer_name
                    FROM public.sales_activity sa
                    LEFT JOIN public.employee e ON CAST(e.assignee_id AS TEXT) = CAST(sa.sf_owner_id AS TEXT)
                    LEFT JOIN public.customer c ON (CAST(c.customer_id AS TEXT) = CAST(sa.sf_account_id AS TEXT)
                                                    OR CAST(c.customer_seq AS TEXT) = CAST(sa.sf_account_id AS TEXT))
                    WHERE sa.planned_start_at >= ?
                        AND sa.planned_start_at <= ?
                    ORDER BY sa.planned_start_at
                    LIMIT 100
                """;
                salesActivities = pgJdbc.queryForList(
                    salesActivitySql,
                    startTimestamp,
                    endTimestamp
                );
            }

            log.info("sales_activity query returned {} rows", salesActivities.size());

            if (!salesActivities.isEmpty()) {
                data.append("=== 영업 활동 (Sales Activities) ===\n\n");
                for (Map<String, Object> activity : salesActivities) {
                    // 담당자 정보 - 이름 우선, 없으면 ID
                    String empName = (String) activity.get("emp_name");
                    String empId = String.valueOf(activity.get("emp_id"));
                    if (empName != null && !empName.trim().isEmpty()) {
                        data.append(String.format("담당자: %s\n", empName));
                    } else {
                        data.append(String.format("담당자 ID: %s\n", empId));
                    }

                    data.append(String.format("제목: %s\n", activity.get("subject")));
                    data.append(String.format("유형: %s\n", activity.get("activity_type")));
                    data.append(String.format("상태: %s\n", activity.get("activity_status")));
                    data.append(String.format("계획 시작: %s\n", activity.get("planned_start_at")));

                    // 고객 정보 - 이름 우선, 없으면 ID
                    String customerName = (String) activity.get("customer_name");
                    if (customerName != null && !customerName.trim().isEmpty()) {
                        data.append(String.format("고객: %s\n", customerName));
                    } else if (activity.get("sf_account_id") != null) {
                        data.append(String.format("고객 ID: %s\n", activity.get("sf_account_id")));
                    }

                    String description = (String) activity.get("description");
                    if (description != null && !description.trim().isEmpty()) {
                        data.append(String.format("상세 내용: %s\n", description));
                    }

                    data.append("\n");
                }
            }

            // 2. region_activity_plan 데이터
            String regionPlanSql;
            List<Map<String, Object>> regionPlans;

            if (employeeId != null && !employeeId.trim().isEmpty()) {
                regionPlanSql = """
                    SELECT
                        rap.id,
                        rap.assignee_id,
                        e.emp_name as emp_name,
                        rap.subject,
                        rap.description,
                        rap.addr_province_name,
                        rap.addr_district_name,
                        rap.planned_start_at,
                        rap.planned_end_at,
                        rap.actual_start_at,
                        rap.actual_end_at
                    FROM public.region_activity_plan rap
                    LEFT JOIN public.employee e ON e.assignee_id = rap.assignee_id
                    WHERE rap.assignee_id = ?
                        AND rap.planned_start_at >= ?
                        AND rap.planned_start_at <= ?
                    ORDER BY rap.planned_start_at
                    LIMIT 100
                """;
                regionPlans = pgJdbc.queryForList(regionPlanSql,
                    employeeId,
                    startTimestamp,
                    endTimestamp);
            } else {
                regionPlanSql = """
                    SELECT
                        rap.id,
                        rap.assignee_id,
                        e.emp_name as emp_name,
                        rap.subject,
                        rap.description,
                        rap.addr_province_name,
                        rap.addr_district_name,
                        rap.planned_start_at,
                        rap.planned_end_at,
                        rap.actual_start_at,
                        rap.actual_end_at
                    FROM public.region_activity_plan rap
                    LEFT JOIN public.employee e ON e.assignee_id = rap.assignee_id
                    WHERE rap.planned_start_at >= ?
                        AND rap.planned_start_at <= ?
                    ORDER BY rap.planned_start_at
                    LIMIT 100
                """;
                regionPlans = pgJdbc.queryForList(regionPlanSql,
                    startTimestamp,
                    endTimestamp);
            }

            log.info("region_activity_plan query returned {} rows", regionPlans.size());

            if (!regionPlans.isEmpty()) {
                data.append("\n=== 지역 활동 계획 (Region Activity Plans) ===\n\n");
                for (Map<String, Object> plan : regionPlans) {
                    // 담당자 정보 - 이름 우선, 없으면 ID
                    String empName = (String) plan.get("emp_name");
                    String assigneeId = String.valueOf(plan.get("assignee_id"));
                    if (empName != null && !empName.trim().isEmpty()) {
                        data.append(String.format("담당자: %s\n", empName));
                    } else {
                        data.append(String.format("담당자 ID: %s\n", assigneeId));
                    }

                    data.append(String.format("제목: %s\n", plan.get("subject")));
                    data.append(String.format("지역: %s %s\n",
                        plan.get("addr_province_name"),
                        plan.get("addr_district_name")));
                    data.append(String.format("계획 시작: %s\n", plan.get("planned_start_at")));

                    String description = (String) plan.get("description");
                    if (description != null && !description.trim().isEmpty()) {
                        data.append(String.format("상세 내용: %s\n", description));
                    }

                    data.append("\n");
                }
            }

            // 3. region_activity_plan_target 데이터
            String regionTargetSql;
            List<Map<String, Object>> regionTargets;

            if (employeeId != null && !employeeId.trim().isEmpty()) {
                regionTargetSql = """
                    SELECT
                        rapt.id,
                        rapt.region_activity_plan_id,
                        rapt.assignee_id,
                        e.emp_name as emp_name,
                        rapt.activity_plan_content,
                        rapt.activity_result_content,
                        rapt.opinion_remark,
                        rapt.is_completed,
                        rapt.created_at
                    FROM public.region_activity_plan_target rapt
                    LEFT JOIN public.employee e ON e.assignee_id = rapt.assignee_id
                    WHERE rapt.assignee_id = ?
                        AND rapt.created_at >= ?
                        AND rapt.created_at <= ?
                    ORDER BY rapt.created_at
                    LIMIT 100
                """;
                regionTargets = pgJdbc.queryForList(regionTargetSql,
                    employeeId,
                    startTimestamp,
                    endTimestamp);
            } else {
                regionTargetSql = """
                    SELECT
                        rapt.id,
                        rapt.region_activity_plan_id,
                        rapt.assignee_id,
                        e.emp_name as emp_name,
                        rapt.activity_plan_content,
                        rapt.activity_result_content,
                        rapt.opinion_remark,
                        rapt.is_completed,
                        rapt.created_at
                    FROM public.region_activity_plan_target rapt
                    LEFT JOIN public.employee e ON e.assignee_id = rapt.assignee_id
                    WHERE rapt.created_at >= ?
                        AND rapt.created_at <= ?
                    ORDER BY rapt.created_at
                    LIMIT 100
                """;
                regionTargets = pgJdbc.queryForList(regionTargetSql,
                    startTimestamp,
                    endTimestamp);
            }

            log.info("region_activity_plan_target query returned {} rows", regionTargets.size());

            if (!regionTargets.isEmpty()) {
                data.append("\n=== 지역 활동 목표 (Region Activity Targets) ===\n\n");
                for (Map<String, Object> target : regionTargets) {
                    // 담당자 정보 - 이름 우선, 없으면 ID
                    String empName = (String) target.get("emp_name");
                    String assigneeId = String.valueOf(target.get("assignee_id"));
                    if (empName != null && !empName.trim().isEmpty()) {
                        data.append(String.format("담당자: %s\n", empName));
                    } else {
                        data.append(String.format("담당자 ID: %s\n", assigneeId));
                    }

                    data.append(String.format("완료 여부: %s\n", target.get("is_completed")));

                    String planContent = (String) target.get("activity_plan_content");
                    if (planContent != null && !planContent.trim().isEmpty()) {
                        data.append(String.format("활동 계획: %s\n", planContent));
                    }

                    String resultContent = (String) target.get("activity_result_content");
                    if (resultContent != null && !resultContent.trim().isEmpty()) {
                        data.append(String.format("활동 결과: %s\n", resultContent));
                    }

                    String opinion = (String) target.get("opinion_remark");
                    if (opinion != null && !opinion.trim().isEmpty()) {
                        data.append(String.format("의견: %s\n", opinion));
                    }

                    data.append("\n");
                }
            }

        } catch (Exception e) {
            log.error("Failed to fetch activity data", e);
            return null;
        }

        String result = data.toString();
        log.info("fetchActivityData returning {} characters of data", result.length());
        return result;
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
            - 필요시 표(table) 형식 사용
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
