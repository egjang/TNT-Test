package com.tnt.sales.activity.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.web.bind.annotation.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales-activities")
public class SalesActivityController {
    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public SalesActivityController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @GetMapping("/statuses")
    public ResponseEntity<?> statuses() {
        // nodb profile: return a standard set
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of("scheduled","completed","canceled","postponed","no_show"));
            }
        }
        try {
            java.util.List<String> rows = jdbc.query(
                    "SELECT DISTINCT activity_status FROM public.sales_activity WHERE activity_status IS NOT NULL ORDER BY activity_status",
                    (rs, i) -> rs.getString(1)
            );
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","statuses_query_failed"));
        }
    }

    /**
     * Weekly summary by employee (owner = assignee_id) for this week and next week.
     * - Filters employees by dept_name in (영업1본부, 영업1팀, 영업2본부, 영업2팀) unless `depts` is provided.
     * - plan = count(status='scheduled'), actual = count(status='completed')
     * - Week range based on planned_start_at in [Mon..Sun] (ISO week)
     */
    @GetMapping("/summary/weekly")
    public ResponseEntity<?> weeklySummary(
            @RequestParam(value = "depts", required = false) String deptsCsv,
            @RequestParam(value = "offsetWeeks", required = false, defaultValue = "0") Integer offsetWeeks
    ) {
        // Resolve departments
        java.util.List<String> target = new java.util.ArrayList<>(java.util.List.of("영업1본부","영업1팀","영업2본부","영업2팀"));
        if (deptsCsv != null && !deptsCsv.isBlank()) {
            if (!"all".equalsIgnoreCase(deptsCsv.trim())) {
                target.clear();
                for (String t : deptsCsv.split(",")) {
                    String s = t == null ? "" : t.trim();
                    if (!s.isEmpty()) target.add(s);
                }
                if (target.isEmpty()) target.addAll(java.util.List.of("영업1본부","영업1팀","영업2본부","영업2팀"));
            }
        }

        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of(
                                "emp_id","S01001","assignee_id","S01001","emp_name","홍길동","dept_name","영업1본부",
                                "thisWeek", java.util.Map.of("plan", 5, "actual", 3),
                                "nextWeek", java.util.Map.of("plan", 7, "actual", 0)
                        ),
                        java.util.Map.of(
                                "emp_id","S01002","assignee_id","S01002","emp_name","김민수","dept_name","영업1팀",
                                "thisWeek", java.util.Map.of("plan", 4, "actual", 4),
                                "nextWeek", java.util.Map.of("plan", 6, "actual", 1)
                        )
                ));
            }
        }

        try {
            // Resolve timezone; allow override via app.timezone (e.g., Asia/Seoul). Fallback to Asia/Seoul.
            String tz = env.getProperty("app.timezone", "Asia/Seoul");
            // Very light validation to avoid SQL injection in identifier
            if (tz == null || !tz.matches("[A-Za-z_\\-/+0-9]+")) tz = "Asia/Seoul";
            // Build IN clause for departments
            String in;
            if (deptsCsv != null && "all".equalsIgnoreCase(deptsCsv.trim())) {
                in = null; // no dept filter
            } else {
                StringBuilder sb = new StringBuilder("(");
                for (int i = 0; i < target.size(); i++) { if (i>0) sb.append(","); sb.append("?"); }
                sb.append(")");
                in = sb.toString();
            }

            String sql = "WITH params AS (\n" +
                    "  SELECT date_trunc('week', (now() AT TIME ZONE '" + tz + "')) + (?::int) * interval '7 day' AS this_start_local\n" +
                    "), bounds AS (\n" +
                    "  SELECT (this_start_local AT TIME ZONE '" + tz + "') AS this_start,\n" +
                    "         ((this_start_local + interval '7 day') AT TIME ZONE '" + tz + "') AS next_start,\n" +
                    "         ((this_start_local + interval '14 day') AT TIME ZONE '" + tz + "') AS next2_start\n" +
                    "    FROM params\n" +
                    "), tw AS (\n" +
                    "  SELECT sa.sf_owner_id AS owner,\n" +
                    "         SUM(1) AS plan,\n" +
                    "         SUM(CASE WHEN (lower(btrim(sa.activity_status)) IN ('completed') OR btrim(sa.activity_status) IN ('완료')) THEN 1 ELSE 0 END) AS actual\n" +
                    "    FROM public.sales_activity sa, bounds b\n" +
                    "   WHERE sa.planned_start_at >= b.this_start\n" +
                    "     AND sa.planned_start_at < b.next_start\n" +
                    "     AND sa.parent_activity_seq IS NULL\n" +
                    "   GROUP BY sa.sf_owner_id\n" +
                    "), nw AS (\n" +
                    "  SELECT sa.sf_owner_id AS owner,\n" +
                    "         SUM(1) AS plan,\n" +
                    "         SUM(CASE WHEN (lower(btrim(sa.activity_status)) IN ('completed') OR btrim(sa.activity_status) IN ('완료')) THEN 1 ELSE 0 END) AS actual\n" +
                    "    FROM public.sales_activity sa, bounds b\n" +
                    "   WHERE sa.planned_start_at >= b.next_start\n" +
                    "     AND sa.planned_start_at < b.next2_start\n" +
                    "     AND sa.parent_activity_seq IS NULL\n" +
                    "   GROUP BY sa.sf_owner_id\n" +
                    ")\n" +
                    "SELECT e.emp_id, e.assignee_id, e.emp_name, e.dept_name,\n" +
                    "       COALESCE(tw.plan,0) AS tw_plan, COALESCE(tw.actual,0) AS tw_actual,\n" +
                    "       COALESCE(nw.plan,0) AS nw_plan, COALESCE(nw.actual,0) AS nw_actual\n" +
                    "  FROM public.employee e\n" +
                    "  LEFT JOIN tw ON CAST(tw.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                    "  LEFT JOIN nw ON CAST(nw.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                    (in == null ? "" : " WHERE e.dept_name IN " + in) +
                    "  ORDER BY e.emp_name ASC";

            java.util.List<Object> args = new java.util.ArrayList<>();
            args.add(offsetWeeks == null ? 0 : offsetWeeks.intValue());
            if (in != null) args.addAll(target);

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, args.toArray(), (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("emp_id", rs.getString(1));
                m.put("assignee_id", rs.getString(2));
                m.put("emp_name", rs.getString(3));
                m.put("dept_name", rs.getString(4));
                m.put("thisWeek", java.util.Map.of("plan", rs.getInt(5), "actual", rs.getInt(6)));
                m.put("nextWeek", java.util.Map.of("plan", rs.getInt(7), "actual", rs.getInt(8)));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            // Fallback: timezone tables missing or other error — try simpler server-timezone-based calculation
            try {
                String in;
                java.util.List<String> deptList = new java.util.ArrayList<>(java.util.List.of("영업1본부","영업1팀","영업2본부","영업2팀"));
                if (deptsCsv != null && !deptsCsv.isBlank() && !"all".equalsIgnoreCase(deptsCsv.trim())) {
                    deptList.clear();
                    for (String t : deptsCsv.split(",")) { String s = t==null?"":t.trim(); if (!s.isEmpty()) deptList.add(s); }
                    if (deptList.isEmpty()) deptList.addAll(java.util.List.of("영업1본부","영업1팀","영업2본부","영업2팀"));
                }
                if (deptsCsv != null && "all".equalsIgnoreCase(deptsCsv.trim())) {
                    in = null;
                } else {
                    StringBuilder sb = new StringBuilder("(");
                    for (int i = 0; i < deptList.size(); i++) { if (i>0) sb.append(","); sb.append("?"); }
                    sb.append(")");
                    in = sb.toString();
                }
                String sql2 = "WITH params AS (\n" +
                        "  SELECT date_trunc('week', now()) AS this_start\n" +
                        "), tw AS (\n" +
                        "  SELECT sa.sf_owner_id AS owner,\n" +
                        "         SUM(1) AS plan,\n" +
                        "         SUM(CASE WHEN lower(sa.activity_status) IN ('completed','완료') THEN 1 ELSE 0 END) AS actual\n" +
                        "    FROM public.sales_activity sa, params p\n" +
                        "   WHERE sa.planned_start_at >= p.this_start\n" +
                        "     AND sa.planned_start_at < (p.this_start + interval '7 day')\n" +
                        "     AND sa.parent_activity_seq IS NULL\n" +
                        "   GROUP BY sa.sf_owner_id\n" +
                        "), nw AS (\n" +
                        "  SELECT sa.sf_owner_id AS owner,\n" +
                        "         SUM(1) AS plan,\n" +
                        "         SUM(CASE WHEN lower(sa.activity_status) IN ('completed','완료') THEN 1 ELSE 0 END) AS actual\n" +
                        "    FROM public.sales_activity sa, params p\n" +
                        "   WHERE sa.planned_start_at >= (p.this_start + interval '7 day')\n" +
                        "     AND sa.planned_start_at < (p.this_start + interval '14 day')\n" +
                        "     AND sa.parent_activity_seq IS NULL\n" +
                        "   GROUP BY sa.sf_owner_id\n" +
                        ")\n" +
                        "SELECT e.emp_id, e.assignee_id, e.emp_name, e.dept_name,\n" +
                        "       COALESCE(tw.plan,0) AS tw_plan, COALESCE(tw.actual,0) AS tw_actual,\n" +
                        "       COALESCE(nw.plan,0) AS nw_plan, COALESCE(nw.actual,0) AS nw_actual\n" +
                        "  FROM public.employee e\n" +
                        "  LEFT JOIN tw ON CAST(tw.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                        "  LEFT JOIN nw ON CAST(nw.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                        (in == null ? "" : " WHERE e.dept_name IN " + in) +
                        "  ORDER BY e.emp_name ASC";
                java.util.List<Object> args = new java.util.ArrayList<>();
                if (in != null) args.addAll(deptList);
                java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql2, args.toArray(), (rs, i) -> {
                    java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                    m.put("emp_id", rs.getString(1));
                    m.put("assignee_id", rs.getString(2));
                    m.put("emp_name", rs.getString(3));
                    m.put("dept_name", rs.getString(4));
                    m.put("thisWeek", java.util.Map.of("plan", rs.getInt(5), "actual", rs.getInt(6)));
                    m.put("nextWeek", java.util.Map.of("plan", rs.getInt(7), "actual", rs.getInt(8)));
                    return m;
                });
                return ResponseEntity.ok(rows);
            } catch (Exception ex2) {
                return ResponseEntity.status(500).body(java.util.Map.of("error","weekly_summary_failed","message", ex2.getMessage()));
            }
        }
    }

    public static class CreateRequest {
        public String sfOwnerId;
        public String subject;
        public String description;
        public Boolean isAllDay;
        public Boolean isPrivate;
        public String visibility;   // public|team|private
        public String channel;      // in_person|phone|video|email|chat|sms|other
        public String activityType; // meeting|call|email|demo|site_visit|task|other|opportunity|AR_mgmt
        public String activityStatus; // scheduled|completed|canceled|no_show|postponed
        public String nextStep;
        public String nextStepDueAt;     // ISO8601
        public String plannedStartAt;     // ISO8601
        public String plannedEndAt;       // ISO8601
        public String actualStartAt;      // ISO8601 (종료일시 -> actual_start_at)
        public Long parentActivitySeq;    // parent_activity_seq
        public String sfAccountId;
        public String sfContactId;
        public String sfLeadId;
        public String sfOpportunityId;
        public String createdBy; // app user id (e.g., empId)
        public String updatedBy; // app user id (e.g., empId)
    }

    public static class UpdateRequest {
        public String subject;
        public String description;      // 활동설명 -> description
        public String activityStatus;
        public String activityType;      // 활동유형 -> activity_type
        public String channel;
        public Boolean isAllDay;         // 종일여부 -> is_all_day
        public Boolean isPrivate;        // 비공개여부 -> is_private
        public String visibility;        // 가시성 -> visibility (public|team|private)
        public Long parentActivitySeq;    // parent_activity_seq
        public String plannedStartAt;
        public String plannedEndAt;
        public String actualStartAt;     // 종료일시 -> actual_start_at
    }

    private static Timestamp toTs(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return Timestamp.from(Instant.parse(iso));
        } catch (Exception e) {
            return null;
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateRequest req) {
        if (req == null || req.sfOwnerId == null || req.sfOwnerId.isBlank()
                || req.activityType == null || req.activityType.isBlank()
                || req.activityStatus == null || req.activityStatus.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "필수 항목 누락: sfOwnerId, activityType, activityStatus"));
        }

        // nodb profile: return stub id
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of("id", 1L));
            }
        }

        // Normalize owner to assignee_id string for consistent storage and querying
        String owner = normalizeOwnerToAssigneeId(req.sfOwnerId);

        String sql = "INSERT INTO public.sales_activity " +
                "(sf_owner_id, subject, description, is_all_day, is_private, visibility, channel, activity_type, activity_status, " +
                "next_step, next_step_due_at, planned_start_at, planned_end_at, actual_start_at, parent_activity_seq, sf_account_id, sf_contact_id, sf_lead_id, sf_opportunity_id, created_by, updated_by) " +
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id";

        Boolean isAllDay = req.isAllDay != null ? req.isAllDay : Boolean.FALSE;
        Boolean isPrivate = req.isPrivate != null ? req.isPrivate : null;

        Long id = jdbc.queryForObject(sql, Long.class,
                owner,
                req.subject,
                req.description,
                isAllDay,
                isPrivate,
                req.visibility,
                req.channel,
                req.activityType,
                req.activityStatus,
                req.nextStep,
                toTs(req.nextStepDueAt),
                toTs(req.plannedStartAt),
                toTs(req.plannedEndAt),
                toTs(req.actualStartAt),
                req.parentActivitySeq,
                req.sfAccountId,
                req.sfContactId,
                req.sfLeadId,
                req.sfOpportunityId,
                req.createdBy,
                req.updatedBy
        );

        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable("id") long id, @RequestBody UpdateRequest req) {
        // nodb: accept and echo id
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of("id", id));
            }
        }

        StringBuilder sql = new StringBuilder("UPDATE public.sales_activity SET ");
        boolean first = true;
        List<Object> params = new ArrayList<>();
        if (req.subject != null) { sql.append(first?"":" ,").append("subject=?"); params.add(req.subject); first=false; }
        if (req.description != null) { sql.append(first?"":" ,").append("description=?"); params.add(req.description); first=false; }
        if (req.activityStatus != null) { sql.append(first?"":" ,").append("activity_status=?"); params.add(req.activityStatus); first=false; }
        if (req.activityType != null) { sql.append(first?"":" ,").append("activity_type=?"); params.add(req.activityType); first=false; }
        if (req.channel != null) { sql.append(first?"":" ,").append("channel=?"); params.add(req.channel); first=false; }
        if (req.isAllDay != null) { sql.append(first?"":" ,").append("is_all_day=?"); params.add(req.isAllDay); first=false; }
        if (req.isPrivate != null) { sql.append(first?"":" ,").append("is_private=?"); params.add(req.isPrivate); first=false; }
        if (req.visibility != null) { sql.append(first?"":" ,").append("visibility=?"); params.add(req.visibility); first=false; }
        if (req.parentActivitySeq != null) { sql.append(first?"":" ,").append("parent_activity_seq=?"); params.add(req.parentActivitySeq); first=false; }
        if (req.plannedStartAt != null) { sql.append(first?"":" ,").append("planned_start_at=?"); params.add(toTs(req.plannedStartAt)); first=false; }
        if (req.plannedEndAt != null) { sql.append(first?"":" ,").append("planned_end_at=?"); params.add(toTs(req.plannedEndAt)); first=false; }
        if (req.actualStartAt != null) { sql.append(first?"":" ,").append("actual_start_at=?"); params.add(toTs(req.actualStartAt)); first=false; }
        if (first) return ResponseEntity.badRequest().body(Map.of("error","No fields to update"));
        sql.append(" WHERE id=?"); params.add(id);
        int updated = jdbc.update(sql.toString(), params.toArray());
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "assigneeId", required = false) String assigneeId,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "mineOnly", required = false, defaultValue = "true") boolean mineOnly,
            @RequestParam(value = "sfAccountId", required = false) String sfAccountId,
            @RequestParam(value = "sfLeadId", required = false) String sfLeadId,
            @RequestParam(value = "customerName", required = false) String customerName,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "end", required = false) String end,
            @RequestParam(value = "onlyRoot", required = false, defaultValue = "false") boolean onlyRoot,
            @RequestParam(value = "parentSeq", required = false) Long parentSeq,
            @RequestParam(value = "includeParent", required = false, defaultValue = "false") boolean includeParent,
            @RequestParam(value = "status", required = false) java.util.List<String> statuses
    ) {
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(List.of(
                        Map.ofEntries(
                                Map.entry("id", 101),
                                Map.entry("subject", "고객사 미팅"),
                                Map.entry("activityType", "meeting"),
                                Map.entry("activityStatus", "scheduled"),
                                Map.entry("channel", "in_person"),
                                Map.entry("plannedStartAt", "2025-01-01T09:00:00Z"),
                                Map.entry("plannedEndAt", "2025-01-01T10:00:00Z"),
                                Map.entry("createdAt", "2025-01-01T00:00:00Z"),
                                Map.entry("sfAccountId", "1001"),
                                Map.entry("customerId", "C0001"),
                                Map.entry("customerName", "강천상사"),
                                Map.entry("companyType", "TNT")
                        ),
                        Map.ofEntries(
                                Map.entry("id", 102),
                                Map.entry("subject", "전화 상담"),
                                Map.entry("activityType", "call"),
                                Map.entry("activityStatus", "completed"),
                                Map.entry("channel", "phone"),
                                Map.entry("plannedStartAt", "2025-01-02T09:00:00Z"),
                                Map.entry("plannedEndAt", "2025-01-02T09:30:00Z"),
                                Map.entry("createdAt", "2025-01-02T00:00:00Z"),
                                Map.entry("sfAccountId", "1002"),
                                Map.entry("customerId", "C0002"),
                                Map.entry("customerName", "한빛상사"),
                                Map.entry("companyType", "DYS")
                        )
                ));
            }
        }

        StringBuilder sql = new StringBuilder(
                "SELECT sa.id, sa.subject, sa.description, sa.activity_type, sa.activity_status, sa.channel, sa.planned_start_at, sa.planned_end_at, sa.actual_start_at, sa.created_at, " +
                        "COALESCE(sa.updated_at, sa.created_at) AS last_update_at, " +
                        "sa.sf_account_id, sa.sf_lead_id, c.customer_id, COALESCE(c.customer_name, l.company_name, l.contact_name) AS customer_name, c.company_type, p.subject AS parent_subject, sa.parent_activity_seq, " +
                        "e.emp_name AS owner_name, e.assignee_id AS owner_assignee_id " +
                        "FROM public.sales_activity sa " +
                        // Join customer by either customer_id or customer_seq matched to sf_account_id
                        "LEFT JOIN public.customer c ON (CAST(c.customer_id AS TEXT) = CAST(sa.sf_account_id AS TEXT) OR CAST(c.customer_seq AS TEXT) = CAST(sa.sf_account_id AS TEXT)) " +
                        "LEFT JOIN public.lead l ON CAST(l.id AS TEXT) = CAST(sa.sf_lead_id AS TEXT) " +
                        "LEFT JOIN public.sales_activity p ON p.id = sa.parent_activity_seq " +
                        "LEFT JOIN public.employee e ON CAST(e.assignee_id AS TEXT) = CAST(sa.sf_owner_id AS TEXT) " +
                        "WHERE 1=1"
        );
        List<Object> params = new ArrayList<>();

        if (mineOnly) {
            String ownerAssignee = null;
            if (assigneeId != null && !assigneeId.trim().isEmpty()) {
                ownerAssignee = assigneeId.trim();
            } else if (empId != null && !empId.trim().isEmpty()) {
                try {
                    ownerAssignee = jdbc.queryForObject(
                            "SELECT assignee_id FROM public.employee WHERE emp_id = ?",
                            String.class, empId.trim());
                } catch (EmptyResultDataAccessException ignore) { ownerAssignee = null; }
            }
            if (ownerAssignee == null || ownerAssignee.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            sql.append(" AND CAST(sa.sf_owner_id AS TEXT) = ?");
            params.add(ownerAssignee);
        }

        if (sfAccountId != null && !sfAccountId.isBlank()) {
            sql.append(" AND sa.sf_account_id = ?");
            params.add(sfAccountId.trim());
        }
        if (sfLeadId != null && !sfLeadId.isBlank()) {
            sql.append(" AND sa.sf_lead_id = ?");
            params.add(sfLeadId.trim());
        }

        if (customerName != null && !customerName.isBlank()) {
            String[] toks = customerName.trim().split("[\\s,]+");
            for (String t : toks) {
                if (t == null || t.isBlank()) continue;
                sql.append(" AND c.customer_name ILIKE ?");
                params.add("%" + t + "%");
            }
        }

        if (statuses != null && !statuses.isEmpty()) {
            // Filter by multiple activity statuses
            java.util.List<String> norms = new java.util.ArrayList<>();
            for (String s : statuses) {
                if (s != null && !s.isBlank()) norms.add(s.trim().toLowerCase());
            }
            if (!norms.isEmpty()) {
                sql.append(" AND LOWER(sa.activity_status) IN (");
                for (int i = 0; i < norms.size(); i++) { if (i>0) sql.append(','); sql.append('?'); }
                sql.append(')');
                params.addAll(norms);
            }
        }

        if (onlyRoot) {
            // Only activities without a parent (root activities)
            sql.append(" AND sa.parent_activity_seq IS NULL");
        }

        if (parentSeq != null) {
            if (includeParent) {
                sql.append(" AND (sa.parent_activity_seq = ? OR sa.id = ?)");
                params.add(parentSeq);
                params.add(parentSeq);
            } else {
                sql.append(" AND sa.parent_activity_seq = ?");
                params.add(parentSeq);
            }
        }

        // Optional period overlap filter: (start<=endAt AND end>=startAt)
        Timestamp tsStart = null, tsEnd = null;
        if (start != null && !start.isBlank()) tsStart = toTs(start);
        if (end != null && !end.isBlank()) tsEnd = toTs(end);
        if (tsStart != null && tsEnd != null) {
            // Filter by planned_start_at being inside the window (inclusive)
            sql.append(" AND (sa.planned_start_at >= ? AND sa.planned_start_at <= ?)");
            params.add(tsStart);
            params.add(tsEnd);
        }

        sql.append(" ORDER BY COALESCE(sa.updated_at, sa.created_at) DESC, sa.id DESC LIMIT 200");

        List<Map<String, Object>> rows = jdbc.query(sql.toString(), params.toArray(), (rs, i) -> {
            try {
                return mapRow(rs);
            } catch (SQLException ex) {
                throw new IllegalStateException(ex);
            }
        });
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getActivity(@PathVariable("id") long id) {
        try {
            Map<String, Object> detail = jdbc.queryForObject(
                    "SELECT sa.id, sa.subject, sa.description, sa.activity_type, sa.activity_status, sa.channel, sa.planned_start_at, sa.planned_end_at, " +
                            "sa.actual_start_at, sa.created_at, COALESCE(sa.updated_at, sa.created_at) AS last_update_at, sa.sf_account_id, sa.sf_lead_id, " +
                            "c.customer_id, COALESCE(c.customer_name, l.company_name, l.contact_name) AS customer_name, c.company_type, p.subject AS parent_subject, sa.parent_activity_seq, " +
                            "e.emp_name AS owner_name, e.assignee_id AS owner_assignee_id " +
                            "FROM public.sales_activity sa " +
                            "LEFT JOIN public.customer c ON (CAST(c.customer_id AS TEXT) = CAST(sa.sf_account_id AS TEXT) OR CAST(c.customer_seq AS TEXT) = CAST(sa.sf_account_id AS TEXT)) " +
                            "LEFT JOIN public.lead l ON CAST(l.id AS TEXT) = CAST(sa.sf_lead_id AS TEXT) " +
                            "LEFT JOIN public.sales_activity p ON p.id = sa.parent_activity_seq " +
                            "LEFT JOIN public.employee e ON CAST(e.assignee_id AS TEXT) = CAST(sa.sf_owner_id AS TEXT) " +
                            "WHERE sa.id = ?",
                    new Object[]{id},
                    (rs, rowNum) -> {
                        try {
                            return mapRow(rs);
                        } catch (SQLException ex) {
                            throw new IllegalStateException(ex);
                        }
                    }
            );
            return ResponseEntity.ok(detail);
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Activity not found"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable("id") long id) {
        // nodb profile: return success
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of("deleted", true));
            }
        }

        try {
            // First, get the sf_lead_id of the activity to delete
            String leadIdSql = "SELECT sf_lead_id FROM public.sales_activity WHERE id = ?";
            String leadId;
            try {
                leadId = jdbc.queryForObject(leadIdSql, String.class, id);
            } catch (EmptyResultDataAccessException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Activity not found"));
            }

            // Delete all activities with the same sf_lead_id
            String deleteSql;
            int deleted;
            if (leadId != null && !leadId.trim().isEmpty()) {
                deleteSql = "DELETE FROM public.sales_activity WHERE sf_lead_id = ?";
                deleted = jdbc.update(deleteSql, leadId);
            } else {
                // If no sf_lead_id, just delete by id
                deleteSql = "DELETE FROM public.sales_activity WHERE id = ?";
                deleted = jdbc.update(deleteSql, id);
            }

            if (deleted == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Activity not found"));
            }
            return ResponseEntity.ok(Map.of("deleted", true, "count", deleted));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete activity", "message", e.getMessage()));
        }
    }

    // Normalize input owner identifier to assignee_id string.
    // Accepts: assignee_id directly, or resolves from emp_id/emp_seq.
    private String normalizeOwnerToAssigneeId(String raw) {
        if (raw == null) return null;
        String v = raw.trim();
        if (v.isEmpty()) return v;
        try {
            // If numeric: treat as emp_seq and resolve assignee_id
            if (v.matches("\\d+")) {
                String a = jdbc.queryForObject(
                        "SELECT assignee_id FROM public.employee WHERE emp_seq = ?",
                        String.class,
                        Long.parseLong(v)
                );
                return (a == null || a.isBlank()) ? v : a;
            }
            // Try as emp_id first
            try {
                String a = jdbc.queryForObject(
                        "SELECT assignee_id FROM public.employee WHERE emp_id = ?",
                        String.class, v);
                if (a != null && !a.isBlank()) return a;
            } catch (EmptyResultDataAccessException ignore) {}
            // Otherwise assume already assignee_id
            return v;
        } catch (Exception e) {
            return v;
        }
    }

    private Map<String, Object> mapRow(ResultSet rs) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getLong(1));
        m.put("subject", rs.getString(2));
        m.put("description", rs.getString(3));
        m.put("activityType", rs.getString(4));
        m.put("activityStatus", rs.getString(5));
        m.put("channel", rs.getString(6));
        Timestamp plannedStart = rs.getTimestamp(7);
        m.put("plannedStartAt", plannedStart != null ? plannedStart.toInstant().toString() : null);
        Timestamp plannedEnd = rs.getTimestamp(8);
        m.put("plannedEndAt", plannedEnd != null ? plannedEnd.toInstant().toString() : null);
        Timestamp actualStart = rs.getTimestamp(9);
        m.put("actualStartAt", actualStart != null ? actualStart.toInstant().toString() : null);
        Timestamp created = rs.getTimestamp(10);
        m.put("createdAt", created != null ? created.toInstant().toString() : null);
        Timestamp lastUpdate = rs.getTimestamp(11);
        m.put("lastUpdateAt", lastUpdate != null ? lastUpdate.toInstant().toString() : null);
        m.put("sfAccountId", rs.getString(12));
        m.put("sfLeadId", rs.getString(13));
        m.put("customerId", rs.getString(14));
        m.put("customerName", rs.getString(15));
        m.put("companyType", rs.getString(16));
        m.put("parentSubject", rs.getString(17));
        m.put("parentSeq", rs.getObject(18));
        try { m.put("ownerName", rs.getString(19)); } catch (Exception ignore) {}
        try { m.put("ownerAssigneeId", rs.getString(20)); } catch (Exception ignore) {}
        return m;
    }
}
