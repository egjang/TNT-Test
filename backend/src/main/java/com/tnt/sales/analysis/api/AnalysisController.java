package com.tnt.sales.analysis.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analysis")
public class AnalysisController {
    private final ObjectMapper om = new ObjectMapper();

    @Value("${app.n8n.url:}")
    private String n8nUrl;

    @Value("${app.n8n.authHeaderName:}")
    private String n8nAuthHeaderName;

    @Value("${app.n8n.authHeaderValue:}")
    private String n8nAuthHeaderValue;

    public static class AskRequest {
        public String question;
        public String empId;
        public Long empSeq;
        public Boolean mineOnly;
        public Map<String, Object> context;
        public String getQuestion() { return question; }
        public void setQuestion(String question) { this.question = question; }
        public String getEmpId() { return empId; }
        public void setEmpId(String empId) { this.empId = empId; }
        public Long getEmpSeq() { return empSeq; }
        public void setEmpSeq(Long empSeq) { this.empSeq = empSeq; }
        public Boolean getMineOnly() { return mineOnly; }
        public void setMineOnly(Boolean mineOnly) { this.mineOnly = mineOnly; }
        public Map<String, Object> getContext() { return context; }
        public void setContext(Map<String, Object> context) { this.context = context; }
    }

    @PostMapping("/ask")
    public ResponseEntity<?> ask(@RequestBody AskRequest req) {
        try {
            String q = req == null || req.question == null ? "" : req.question.trim();
            if (q.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "질문을 입력해 주세요"));
            }
            if (n8nUrl == null || n8nUrl.isBlank()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("error", "n8n 연동이 설정되지 않았습니다 (app.n8n.url)"));
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("question", q);
            Map<String, Object> ctx = new HashMap<>();
            if (req != null) {
                if (req.empId != null && !req.empId.trim().isEmpty()) ctx.put("empId", req.empId.trim());
                if (req.empSeq != null) ctx.put("empSeq", req.empSeq);
                if (req.mineOnly != null) ctx.put("mineOnly", req.mineOnly);
                if (req.context != null) ctx.putAll(req.context);
            }
            payload.put("context", ctx);

            String body = om.writeValueAsString(payload);

            HttpRequest.Builder rb = HttpRequest.newBuilder()
                    .uri(URI.create(n8nUrl))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
            if (n8nAuthHeaderName != null && !n8nAuthHeaderName.isBlank() && n8nAuthHeaderValue != null && !n8nAuthHeaderValue.isBlank()) {
                rb.header(n8nAuthHeaderName, n8nAuthHeaderValue);
            }
            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> resp = client.send(rb.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            int status = resp.statusCode();
            String respBody = resp.body() == null ? "" : resp.body();

            // Try to parse JSON, otherwise wrap as text
            Object out;
            try {
                JsonNode node = om.readTree(respBody);
                out = node;
            } catch (Exception ignore) {
                out = Map.of("text", respBody);
            }

            if (status >= 200 && status < 300) {
                return ResponseEntity.ok(out);
            } else {
                return ResponseEntity.status(status).body(Map.of(
                        "error", "n8n error: HTTP " + status,
                        "data", out
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getClass().getSimpleName() + ": " + e.getMessage()));
        }
    }
}

