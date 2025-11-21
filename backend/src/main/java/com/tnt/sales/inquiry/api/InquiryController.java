package com.tnt.sales.inquiry.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inquiries")
public class InquiryController {
    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public InquiryController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                List<Map<String, Object>> samples = new ArrayList<>();
                samples.add(Map.ofEntries(
                        Map.entry("id", 1L),
                        Map.entry("caseNo", "00001053"),
                        Map.entry("title", "성적서 발송요청"),
                        Map.entry("inquiryContent", "제품 A 성적서 요청"),
                        Map.entry("answerContent", "메일로 발송 완료"),
                        Map.entry("inquiryStatus", "처리 완료"),
                        Map.entry("severity", "중"),
                        Map.entry("inquiryCategory", "기타 문의"),
                        Map.entry("channel", "전화"),
                        Map.entry("ownerSeq", 8001L),
                        Map.entry("assigneeSeq", 9001L),
                        Map.entry("customerSeq", 1001L),
                        Map.entry("contactSeq", 5001L),
                        Map.entry("leadId", "L-123"),
                        Map.entry("openedAt", "2025-01-10T09:00:00Z"),
                        Map.entry("closedAt", "2025-01-10T10:00:00Z"),
                        Map.entry("createdBy", 1L),
                        Map.entry("createdAt", "2025-01-10T09:00:00Z"),
                        Map.entry("updatedBy", 1L),
                        Map.entry("updatedAt", "2025-01-10T10:00:00Z")
                ));
                return ResponseEntity.ok(samples);
            }
        }

        String sql = "SELECT i.id, i.case_no, i.title, i.inquiry_content, i.answer_content, i.inquiry_status, i.severity, i.inquiry_category, i.channel, " +
                "i.owner_seq, i.owner_id, i.assignee_seq, i.assignee_id, i.customer_seq, i.contact_seq, i.contact_name, i.lead_id, i.opened_at, i.closed_at, i.created_by, i.created_at, i.updated_by, i.updated_at, " +
                // Derived display fields
                "(SELECT emp_name FROM public.employee e WHERE CAST(e.assignee_id AS TEXT)=CAST(i.owner_id AS TEXT) OR CAST(e.emp_id AS TEXT)=CAST(i.owner_id AS TEXT) LIMIT 1) AS owner_name, " +
                "(SELECT emp_name FROM public.employee e WHERE CAST(e.assignee_id AS TEXT)=CAST(i.assignee_id AS TEXT) OR CAST(e.emp_id AS TEXT)=CAST(i.assignee_id AS TEXT) LIMIT 1) AS assignee_name, " +
                "(SELECT customer_name FROM public.customer c WHERE CAST(c.customer_seq AS TEXT)=CAST(i.customer_seq AS TEXT) OR CAST(c.customer_id AS TEXT)=CAST(i.customer_seq AS TEXT) LIMIT 1) AS customer_name " +
                "FROM public.inquiry i ORDER BY i.updated_at DESC NULLS LAST, i.id DESC";

        List<Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong(1));
            m.put("caseNo", rs.getString(2));
            m.put("title", rs.getString(3));
            m.put("inquiryContent", rs.getString(4));
            m.put("answerContent", rs.getString(5));
            m.put("inquiryStatus", rs.getString(6));
            m.put("severity", rs.getString(7));
            m.put("inquiryCategory", rs.getString(8));
            m.put("channel", rs.getString(9));
            m.put("ownerSeq", rs.getObject(10));
            m.put("ownerId", rs.getString(11));
            m.put("assigneeSeq", rs.getObject(12));
            m.put("assigneeId", rs.getString(13));
            m.put("customerSeq", rs.getObject(14));
            m.put("contactSeq", rs.getObject(15));
            m.put("contactName", rs.getString(16));
            m.put("leadId", rs.getString(17));
            m.put("openedAt", rs.getTimestamp(18));
            m.put("closedAt", rs.getTimestamp(19));
            m.put("createdBy", rs.getObject(20));
            m.put("createdAt", rs.getTimestamp(21));
            m.put("updatedBy", rs.getObject(22));
            m.put("updatedAt", rs.getTimestamp(23));
            m.put("ownerName", rs.getString(24));
            m.put("assigneeName", rs.getString(25));
            m.put("customerName", rs.getString(26));
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/delayed")
    public ResponseEntity<?> delayed() {
        // nodb profile: return empty list
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of());
            }
        }

        String sql = "SELECT i.id, i.title, i.inquiry_status, i.opened_at, " +
                "COALESCE(e.emp_name, '') AS assignee_name " +
                "FROM public.inquiry i " +
                "LEFT JOIN public.employee e ON (CAST(e.assignee_id AS TEXT) = CAST(i.assignee_id AS TEXT) OR CAST(e.emp_id AS TEXT) = CAST(i.assignee_id AS TEXT)) " +
                "WHERE COALESCE(TRIM(i.inquiry_status), '') <> '완료' " +
                "AND i.opened_at IS NOT NULL " +
                "AND i.opened_at <= now() - INTERVAL '1 day' " +
                "ORDER BY i.opened_at DESC, i.id DESC";

        java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", rs.getLong(1));
            m.put("title", rs.getString(2));
            m.put("inquiry_status", rs.getString(3));
            m.put("opened_at", rs.getTimestamp(4));
            m.put("assignee_name", rs.getString(5));
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/stats-by-assignee")
    public ResponseEntity<?> statsByAssignee() {
        // nodb: empty list
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of());
            }
        }

        String sql = "SELECT COALESCE(e.emp_name,'') AS assignee_name, i.assignee_id, i.inquiry_status, COUNT(*) AS cnt " +
                "FROM public.inquiry i " +
                "LEFT JOIN public.employee e ON (CAST(e.assignee_id AS TEXT)=CAST(i.assignee_id AS TEXT) OR CAST(e.emp_id AS TEXT)=CAST(i.assignee_id AS TEXT)) " +
                "GROUP BY assignee_name, i.assignee_id, i.inquiry_status " +
                "ORDER BY assignee_name, i.inquiry_status";

        java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("assignee_name", rs.getString(1));
            m.put("assignee_id", rs.getString(2));
            m.put("inquiry_status", rs.getString(3));
            m.put("cnt", rs.getLong(4));
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body,
                                    @RequestHeader(value = "X-Assignee-Id", required = false) String headerAssigneeId) {
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                Map<String, Object> echo = new LinkedHashMap<>(body);
                echo.putIfAbsent("id", 0);
                echo.putIfAbsent("updatedAt", java.time.Instant.now().toString());
                return ResponseEntity.ok(echo);
            }
        }

        String title = asString(body.get("title"));
        String inquiryStatus = asString(body.get("inquiryStatus"));
        if (title == null || title.isBlank() || inquiryStatus == null || inquiryStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title, inquiryStatus는 필수입니다"));
        }
        String caseNo = generateCaseNo();
        String severity = asString(body.get("severity"));
        String inquiryCategory = asString(body.get("inquiryCategory"));
        String channel = asString(body.get("channel"));
        Long ownerSeq = asLong(body.get("ownerSeq"));
        String ownerId = asString(body.get("ownerId"));
        Long assigneeSeq = asLong(body.get("assigneeSeq"));
        String assigneeId = asString(body.get("assigneeId"));
        Long customerSeq = asLong(body.get("customerSeq"));
        Long contactSeq = asLong(body.get("contactSeq"));
        String contactName = asString(body.get("contactName"));
        String leadId = asString(body.get("leadId"));
        Timestamp openedAt = toTimestamp(asString(body.get("openedAt")));
        Timestamp closedAt = toTimestamp(asString(body.get("closedAt")));
        String inquiryContent = asString(body.get("inquiryContent"));
        String answerContent = asString(body.get("answerContent"));

        String createdBy = asString(body.get("createdBy"));
        String updatedBy = asString(body.get("updatedBy"));
        if (createdBy == null || createdBy.isBlank()) createdBy = (ownerId != null && !ownerId.isBlank()) ? ownerId : (headerAssigneeId != null ? headerAssigneeId : null);
        if (updatedBy == null || updatedBy.isBlank()) updatedBy = createdBy;

        String sql = "INSERT INTO public.inquiry(" +
                "case_no, title, inquiry_content, answer_content, inquiry_status, severity, inquiry_category, channel, " +
                "owner_seq, owner_id, assignee_seq, assignee_id, customer_seq, contact_seq, contact_name, lead_id, opened_at, closed_at, created_by, updated_by) " +
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id, created_at, updated_at";

        Map<String, Object> created = jdbc.queryForObject(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong(1));
            m.put("createdAt", rs.getTimestamp(2));
            m.put("updatedAt", rs.getTimestamp(3));
            return m;
        }, caseNo, title, inquiryContent, answerContent, inquiryStatus, severity, inquiryCategory, channel,
                ownerSeq, ownerId, assigneeSeq, assigneeId, customerSeq, contactSeq, contactName, leadId, openedAt, closedAt, createdBy, updatedBy);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", created.get("id"));
        resp.put("caseNo", caseNo);
        resp.put("title", title);
        resp.put("inquiryStatus", inquiryStatus);
        resp.put("severity", severity);
        resp.put("inquiryCategory", inquiryCategory);
        resp.put("channel", channel);
        resp.put("ownerSeq", ownerSeq);
        resp.put("assigneeSeq", assigneeSeq);
        resp.put("ownerId", ownerId);
        resp.put("assigneeId", assigneeId);
        resp.put("customerSeq", customerSeq);
        resp.put("contactSeq", contactSeq);
        resp.put("contactName", contactName);
        resp.put("leadId", leadId);
        resp.put("openedAt", openedAt);
        resp.put("closedAt", closedAt);
        resp.put("createdAt", created.get("createdAt"));
        resp.put("updatedAt", created.get("updatedAt"));
        resp.put("createdBy", createdBy);
        resp.put("updatedBy", updatedBy);
        return ResponseEntity.ok(resp);
    }

    private static String asString(Object v) { return v == null ? null : String.valueOf(v); }
    private static Long asLong(Object v) {
        if (v == null) return null;
        try { return Long.valueOf(String.valueOf(v)); } catch (Exception e) { return null; }
    }
    private static Timestamp toTimestamp(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            // Accept ISO-like local datetime (yyyy-MM-ddTHH:mm)
            LocalDateTime ldt = LocalDateTime.parse(s, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm[[:ss]]"));
            return Timestamp.valueOf(ldt);
        } catch (Exception ignore) {}
        try {
            // Fallback to java.sql.Timestamp.parse
            return Timestamp.valueOf(s.replace('T', ' ').concat(":00").substring(0, 19));
        } catch (Exception ignore) {}
        return null;
    }
    private static String generateCaseNo() {
        String ts = java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(java.time.LocalDateTime.now());
        int rnd = (int)(Math.random() * 9000) + 1000;
        return "INQ-" + ts + "-" + rnd;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable("id") Long id,
                                    @RequestBody Map<String, Object> body,
                                    @RequestHeader(value = "X-Assignee-Id", required = false) String headerAssigneeId) {
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                Map<String, Object> echo = new LinkedHashMap<>(body);
                echo.put("id", id);
                echo.put("updatedAt", java.time.Instant.now().toString());
                return ResponseEntity.ok(echo);
            }
        }
        if (id == null) return ResponseEntity.badRequest().body(Map.of("error", "id required"));

        String title = asString(body.get("title"));
        String inquiryStatus = asString(body.get("inquiryStatus"));
        String severity = asString(body.get("severity"));
        String inquiryCategory = asString(body.get("inquiryCategory"));
        String channel = asString(body.get("channel"));
        Long ownerSeq = asLong(body.get("ownerSeq"));
        String ownerId = asString(body.get("ownerId"));
        Long assigneeSeq = asLong(body.get("assigneeSeq"));
        String assigneeId = asString(body.get("assigneeId"));
        Long customerSeq = asLong(body.get("customerSeq"));
        Long contactSeq = asLong(body.get("contactSeq"));
        String contactName = asString(body.get("contactName"));
        String leadId = asString(body.get("leadId"));
        Timestamp openedAt = toTimestamp(asString(body.get("openedAt")));
        Timestamp closedAt = toTimestamp(asString(body.get("closedAt")));
        String inquiryContent = asString(body.get("inquiryContent"));
        String answerContent = asString(body.get("answerContent"));
        String updatedBy = asString(body.get("updatedBy"));
        if (updatedBy == null || updatedBy.isBlank()) updatedBy = (ownerId != null && !ownerId.isBlank()) ? ownerId : (headerAssigneeId != null ? headerAssigneeId : null);

        String sql = "UPDATE public.inquiry SET " +
                "title=?, inquiry_content=?, answer_content=?, inquiry_status=?, severity=?, inquiry_category=?, channel=?, " +
                "owner_seq=?, owner_id=?, assignee_seq=?, assignee_id=?, customer_seq=?, contact_seq=?, contact_name=?, lead_id=?, opened_at=?, closed_at=?, updated_by=?, updated_at=now() " +
                "WHERE id=? RETURNING updated_at";
        Timestamp updatedAt = jdbc.queryForObject(sql, Timestamp.class,
                title, inquiryContent, answerContent, inquiryStatus, severity, inquiryCategory, channel,
                ownerSeq, ownerId, assigneeSeq, assigneeId, customerSeq, contactSeq, contactName, leadId, openedAt, closedAt, updatedBy, id);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", id);
        resp.put("updatedAt", updatedAt);
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable("id") Long id) {
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.Map.of("deleted", id));
            }
        }
        if (id == null) return ResponseEntity.badRequest().body(java.util.Map.of("error", "id required"));
        int n = 0;
        try {
            n = jdbc.update("DELETE FROM public.inquiry WHERE id=?", id);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","delete_failed","message", ex.getMessage()));
        }
        if (n == 0) return ResponseEntity.status(404).body(java.util.Map.of("error","not_found"));
        return ResponseEntity.ok(java.util.Map.of("deleted", id));
    }
}
