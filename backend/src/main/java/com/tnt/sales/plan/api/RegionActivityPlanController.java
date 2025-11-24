package com.tnt.sales.plan.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/region-activity-plans")
public class RegionActivityPlanController {

    private static final Logger log = LoggerFactory.getLogger(RegionActivityPlanController.class);

    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public RegionActivityPlanController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    static class CreateRequest {
        public String subject;
        public String description;
        public String addrProvinceName;
        public String addrDistrictName;
        public String addrDistrictCode;
        public String plannedStartAt;
        public String plannedEndAt;
        public String actualStartAt;
        public String actualEndAt;
        public String assigneeId;
        public Long createdBy;
        public Long updatedBy;
        public List<TargetRequest> targets;
    }

    static class UpdateRequest {
        public String subject;
        public String description;
        public String addrProvinceName;
        public String addrDistrictName;
        public String addrDistrictCode;
        public String plannedStartAt;
        public String plannedEndAt;
        public String actualStartAt;
        public String actualEndAt;
        public String assigneeId;
        public Long updatedBy;
        public List<TargetRequest> targets;
    }

    static class TargetRequest {
        public String customerId;
        public String leadId;
    }

    @GetMapping
    public ResponseEntity<?> findPlans(
            @RequestParam("assigneeId") String assigneeId,
            @RequestParam("start") String start,
            @RequestParam("end") String end
    ) {
        if (!StringUtils.hasText(assigneeId) || !StringUtils.hasText(start) || !StringUtils.hasText(end)) {
            return ResponseEntity.badRequest().body(Map.of("error", "missing_params"));
        }

        if (isNoDb()) {
            return ResponseEntity.ok(List.of(
                    Map.of("id", 1, "subject", "샘플 지역활동", "planned_start_at", start, "planned_end_at", end)
            ));
        }

        Timestamp startTs = parseTimestamp(start);
        Timestamp endTs = parseTimestamp(end);
        if (startTs == null || endTs == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid_date_range"));
        }

        String sql = "SELECT rap.id, rap.subject, rap.addr_province_name, rap.addr_district_name, rap.planned_start_at, rap.planned_end_at, rap.actual_start_at, rap.actual_end_at, " +
                "       COUNT(t.id) AS target_count, " +
                "       STRING_AGG(\n" +
                "         CASE\n" +
                "           WHEN t.customer_id IS NOT NULL THEN (\n" +
                "             (CASE\n" +
                "                WHEN c.company_type ILIKE '%TNT%' THEN 'T'\n" +
                "                WHEN c.company_type ILIKE '%DYS%' THEN 'D'\n" +
                "                ELSE '거'\n" +
                "              END) || ' ' || COALESCE(c.customer_name, t.customer_id, '')\n" +
                "           )\n" +
                "           WHEN t.lead_id IS NOT NULL THEN '잠 ' || COALESCE(l.company_name, l.contact_name, t.lead_id, '')\n" +
                "           ELSE NULL\n" +
                "         END,\n" +
                "         E'\\n'\n" +
                "       ) FILTER (WHERE t.id IS NOT NULL) AS target_labels " +
                "FROM public.region_activity_plan rap " +
                "LEFT JOIN public.region_activity_plan_target t ON t.region_activity_plan_id = rap.id " +
                "LEFT JOIN public.customer c ON c.customer_id = t.customer_id " +
                "LEFT JOIN public.lead l ON CAST(l.id AS TEXT) = t.lead_id " +
                "WHERE rap.assignee_id = ? " +
                "AND rap.planned_start_at >= ? AND rap.planned_start_at < ? " +
                "GROUP BY rap.id, rap.subject, rap.addr_province_name, rap.addr_district_name, rap.planned_start_at, rap.planned_end_at, rap.actual_start_at, rap.actual_end_at " +
                "ORDER BY rap.planned_start_at";
        List<Map<String, Object>> rows = jdbc.query(sql,
                ps -> {
                    ps.setString(1, assigneeId.trim());
                    ps.setTimestamp(2, startTs);
                    ps.setTimestamp(3, endTs);
                },
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    String province = rs.getString("addr_province_name");
                    String district = rs.getString("addr_district_name");
                    row.put("subject", combineSubject(rs.getString("subject"), district));
                    row.put("addr_province_name", province);
                    row.put("addr_district_name", district);
                    String plannedStart = toIsoString(rs.getTimestamp("planned_start_at"));
                    String plannedEnd = toIsoString(rs.getTimestamp("planned_end_at"));
                    String actualStart = toIsoString(rs.getTimestamp("actual_start_at"));
                    String actualEnd = toIsoString(rs.getTimestamp("actual_end_at"));
                    row.put("planned_start_at", plannedStart);
                    row.put("planned_end_at", plannedEnd);
                    row.put("actual_start_at", actualStart);
                    row.put("actual_end_at", actualEnd);
                    row.put("plannedStartAt", plannedStart);
                    row.put("plannedEndAt", plannedEnd);
                    row.put("actualStartAt", actualStart);
                    row.put("actualEndAt", actualEnd);
                    row.put("addrProvinceName", province);
                    row.put("addrDistrictName", district);
                    row.put("target_count", rs.getLong("target_count"));
                    row.put("target_labels", rs.getString("target_labels"));
                    return row;
                }
        );
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/summary/weekly")
    public ResponseEntity<?> getWeeklySummary(
            @RequestParam(value = "offsetWeeks", required = false) Integer offsetWeeks,
            @RequestParam(value = "depts", required = false) String deptsCsv
    ) {
        if (isNoDb()) {
            return ResponseEntity.ok(List.of());
        }

        try {
            // Resolve timezone
            String tz = env.getProperty("app.timezone", "Asia/Seoul");
            if (tz == null || !tz.matches("[A-Za-z_\\-/+0-9]+")) tz = "Asia/Seoul";

            // Build IN clause for departments
            List<String> target = new java.util.ArrayList<>();
            String in = null;
            if (deptsCsv != null && !"all".equalsIgnoreCase(deptsCsv.trim())) {
                for (String d : deptsCsv.split(",")) {
                    String trimmed = d.trim();
                    if (!trimmed.isEmpty()) target.add(trimmed);
                }
                if (!target.isEmpty()) {
                    StringBuilder sb = new StringBuilder("(");
                    for (int i = 0; i < target.size(); i++) {
                        if (i > 0) sb.append(",");
                        sb.append("?");
                    }
                    sb.append(")");
                    in = sb.toString();
                }
            }

            // Similar to sales_activity weekly summary, count plan vs actual
            // plan = activities with planned_start_at but null actual_start_at (scheduled)
            // actual = activities with non-null actual_start_at (completed)
            String sql = "WITH params AS (\n" +
                    "  SELECT date_trunc('week', (now() AT TIME ZONE '" + tz + "')) + (?::int) * interval '7 day' AS this_start_local\n" +
                    "), bounds AS (\n" +
                    "  SELECT (this_start_local AT TIME ZONE '" + tz + "') AS this_start,\n" +
                    "         ((this_start_local + interval '7 day') AT TIME ZONE '" + tz + "') AS next_start,\n" +
                    "         ((this_start_local + interval '14 day') AT TIME ZONE '" + tz + "') AS next2_start\n" +
                    "    FROM params\n" +
                    "), tw AS (\n" +
                    "  SELECT rap.assignee_id AS owner,\n" +
                    "         COUNT(*) AS plan,\n" +
                    "         SUM(CASE WHEN rap.actual_start_at IS NOT NULL THEN 1 ELSE 0 END) AS actual\n" +
                    "    FROM public.region_activity_plan rap, bounds b\n" +
                    "   WHERE rap.planned_start_at >= b.this_start\n" +
                    "     AND rap.planned_start_at < b.next_start\n" +
                    "   GROUP BY rap.assignee_id\n" +
                    "), nw AS (\n" +
                    "  SELECT rap.assignee_id AS owner,\n" +
                    "         COUNT(*) AS plan,\n" +
                    "         SUM(CASE WHEN rap.actual_start_at IS NOT NULL THEN 1 ELSE 0 END) AS actual\n" +
                    "    FROM public.region_activity_plan rap, bounds b\n" +
                    "   WHERE rap.planned_start_at >= b.next_start\n" +
                    "     AND rap.planned_start_at < b.next2_start\n" +
                    "   GROUP BY rap.assignee_id\n" +
                    "), owners AS (\n" +
                    "  SELECT DISTINCT owner FROM tw\n" +
                    "  UNION\n" +
                    "  SELECT DISTINCT owner FROM nw\n" +
                    ")\n" +
                    "SELECT e.emp_id, e.assignee_id, e.emp_name, e.dept_name,\n" +
                    "       COALESCE(tw.plan,0) AS tw_plan, COALESCE(tw.actual,0) AS tw_actual,\n" +
                    "       COALESCE(nw.plan,0) AS nw_plan, COALESCE(nw.actual,0) AS nw_actual\n" +
                    "  FROM owners o\n" +
                    "  JOIN public.employee e ON CAST(o.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                    "  LEFT JOIN tw ON CAST(tw.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                    "  LEFT JOIN nw ON CAST(nw.owner AS TEXT) = CAST(e.assignee_id AS TEXT)\n" +
                    (in == null ? "" : " WHERE e.dept_name IN " + in) +
                    "  ORDER BY e.emp_name ASC";

            List<Object> args = new java.util.ArrayList<>();
            args.add(offsetWeeks == null ? 0 : offsetWeeks.intValue());
            if (in != null) args.addAll(target);

            List<Map<String, Object>> rows = jdbc.query(sql, ps -> {
                for (int idx = 0; idx < args.size(); idx++) {
                    ps.setObject(idx + 1, args.get(idx));
                }
            }, (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("emp_id", rs.getString(1));
                m.put("assignee_id", rs.getString(2));
                m.put("emp_name", rs.getString(3));
                m.put("dept_name", rs.getString(4));
                m.put("thisWeek", Map.of("plan", rs.getInt(5), "actual", rs.getInt(6)));
                m.put("nextWeek", Map.of("plan", rs.getInt(7), "actual", rs.getInt(8)));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("Failed to get weekly region activity summary", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "failed_to_get_summary", "message", ex.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> findOne(@PathVariable("id") long id) {
        if (isNoDb()) {
            return ResponseEntity.ok(Map.of(
                    "id", id,
                    "subject", "샘플 지역활동",
                    "description", "샘플 설명",
                    "addrProvinceName", "서울",
                    "addrDistrictName", "강남구",
                    "addrDistrictCode", "11680",
                    "planned_start_at", Instant.now().toString()
            ));
        }
        try {
            Map<String, Object> row = jdbc.queryForObject(
                    "SELECT id, subject, description, addr_province_name, addr_district_name, addr_district_code, planned_start_at, planned_end_at, actual_start_at, actual_end_at " +
                            "FROM public.region_activity_plan WHERE id=?",
                    (rs, i) -> {
                        Map<String, Object> data = new LinkedHashMap<>();
                        data.put("id", rs.getLong("id"));
                        data.put("subject", rs.getString("subject"));
                        data.put("description", rs.getString("description"));
                        data.put("addrProvinceName", rs.getString("addr_province_name"));
                        data.put("addrDistrictName", rs.getString("addr_district_name"));
                        data.put("addrDistrictCode", rs.getString("addr_district_code"));
                        data.put("planned_start_at", toIsoString(rs.getTimestamp("planned_start_at")));
                        data.put("planned_end_at", toIsoString(rs.getTimestamp("planned_end_at")));
                        data.put("actual_start_at", toIsoString(rs.getTimestamp("actual_start_at")));
                        data.put("actual_end_at", toIsoString(rs.getTimestamp("actual_end_at")));
                        return data;
                    },
                    id
            );
            if (row != null) {
                row.put("targets", loadTargets(id));
            }
            return ResponseEntity.ok(row);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found"));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateRequest req) {
        if (req == null
                || !StringUtils.hasText(req.subject)
                || !StringUtils.hasText(req.addrProvinceName)
                || !StringUtils.hasText(req.addrDistrictName)
                || !StringUtils.hasText(req.assigneeId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "missing_fields"));
        }

        if (isNoDb()) {
            return ResponseEntity.ok(Map.of("id", 1L));
        }

        String districtCode = resolveDistrictCode(req.addrProvinceName, req.addrDistrictName, req.addrDistrictCode);

        String sql = "INSERT INTO public.region_activity_plan " +
                "(subject, description, addr_province_name, addr_district_name, addr_district_code, assignee_id, " +
                " planned_start_at, planned_end_at, actual_start_at, actual_end_at, created_by, updated_by) " +
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id";

        Timestamp plannedStart = parseTimestamp(req.plannedStartAt);
        Timestamp plannedEnd = parseTimestamp(req.plannedEndAt);
        Timestamp actualStart = parseTimestamp(req.actualStartAt);
        Timestamp actualEnd = parseTimestamp(req.actualEndAt);
        if (plannedStart != null && plannedEnd != null && plannedEnd.before(plannedStart)) {
            return ResponseEntity.badRequest().body(Map.of("error","invalid_plan_range","message","계획 종료일시는 시작일시 이후여야 합니다."));
        }
        if (actualStart != null && actualEnd != null && actualEnd.before(actualStart)) {
            return ResponseEntity.badRequest().body(Map.of("error","invalid_actual_range","message","완료 종료일시는 시작일시 이후여야 합니다."));
        }
        Long createdBy = resolveAuditUser(req.createdBy, req.assigneeId);
        Long updatedBy = resolveAuditUser(req.updatedBy, req.assigneeId);

        Long id = jdbc.queryForObject(sql, Long.class,
                req.subject != null ? req.subject.trim() : null,
                StringUtils.hasText(req.description) ? req.description.trim() : null,
                req.addrProvinceName.trim(),
                req.addrDistrictName.trim(),
                districtCode,
                req.assigneeId.trim(),
                plannedStart,
                plannedEnd,
                actualStart,
                actualEnd,
                createdBy,
                updatedBy
        );

        upsertTargets(id, req.subject, req.targets, req.assigneeId, false);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable("id") long id, @RequestBody UpdateRequest req) {
        if (req == null
                || !StringUtils.hasText(req.subject)
                || !StringUtils.hasText(req.addrProvinceName)
                || !StringUtils.hasText(req.addrDistrictName)
                || !StringUtils.hasText(req.assigneeId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "missing_fields"));
        }

        if (isNoDb()) {
            return ResponseEntity.ok(Map.of("id", id));
        }

        String districtCode = resolveDistrictCode(req.addrProvinceName, req.addrDistrictName, req.addrDistrictCode);
        Timestamp plannedStart = parseTimestamp(req.plannedStartAt);
        Timestamp plannedEnd = parseTimestamp(req.plannedEndAt);
        Timestamp actualStart = parseTimestamp(req.actualStartAt);
        Timestamp actualEnd = parseTimestamp(req.actualEndAt);
        if (plannedStart != null && plannedEnd != null && plannedEnd.before(plannedStart)) {
            return ResponseEntity.badRequest().body(Map.of("error","invalid_plan_range","message","계획 종료일시는 시작일시 이후여야 합니다."));
        }
        if (actualStart != null && actualEnd != null && actualEnd.before(actualStart)) {
            return ResponseEntity.badRequest().body(Map.of("error","invalid_actual_range","message","완료 종료일시는 시작일시 이후여야 합니다."));
        }
        Long updatedBy = resolveAuditUser(req.updatedBy, req.assigneeId);

        String sql = "UPDATE public.region_activity_plan SET " +
                "subject=?, description=?, addr_province_name=?, addr_district_name=?, addr_district_code=?, assignee_id=?, " +
                "planned_start_at=?, planned_end_at=?, actual_start_at=?, actual_end_at=?, updated_by=?, updated_at=now() " +
                "WHERE id=?";
        int updated = jdbc.update(sql,
                req.subject.trim(),
                StringUtils.hasText(req.description) ? req.description.trim() : null,
                req.addrProvinceName.trim(),
                req.addrDistrictName.trim(),
                districtCode,
                req.assigneeId.trim(),
                plannedStart,
                plannedEnd,
                actualStart,
                actualEnd,
                updatedBy,
                id
        );
        upsertTargets(id, req.subject, req.targets, req.assigneeId, true);
        return ResponseEntity.ok(Map.of("id", id, "updated", updated > 0));
    }

    private boolean isNoDb() {
        try {
            for (String profile : env.getActiveProfiles()) {
                if ("nodb".equalsIgnoreCase(profile)) {
                    return true;
                }
            }
        } catch (Exception ignore) {}
        return false;
    }

    private static Timestamp parseTimestamp(String input) {
        if (!StringUtils.hasText(input)) return null;
        String trimmed = input.trim();
        try {
            return Timestamp.from(Instant.parse(trimmed));
        } catch (Exception ignore) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(trimmed);
                return Timestamp.valueOf(ldt);
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private String resolveDistrictCode(String province, String district, String fallback) {
        if (StringUtils.hasText(fallback)) return fallback.trim();
        if (!StringUtils.hasText(province) || !StringUtils.hasText(district)) return null;
        if (isNoDb()) return null;
        try {
            return jdbc.queryForObject(
                    "SELECT addr_district_code FROM public.address_area WHERE addr_province_name ILIKE ? AND addr_district_name ILIKE ? ORDER BY addr_district_code LIMIT 1",
                    String.class,
                    province.trim(),
                    district.trim()
            );
        } catch (EmptyResultDataAccessException ignore) {
            return null;
        } catch (Exception e) {
            log.warn("Failed to resolve district code for province {} district {}", province, district, e);
            return null;
        }
    }

    private Long resolveAuditUser(Long provided, String assigneeId) {
        if (provided != null) return provided;
        if (!StringUtils.hasText(assigneeId)) return null;
        try {
            return Long.parseLong(assigneeId.trim());
        } catch (NumberFormatException ignore) {
            return null;
        }
    }

    private String toIsoString(Timestamp ts) {
        if (ts == null) return null;
        try {
            return ts.toInstant().toString();
        } catch (Exception e) {
            return ts.toString();
        }
    }

    private List<Map<String, Object>> loadTargets(long planId) {
        return jdbc.query(
                "SELECT t.customer_id, t.lead_id, c.company_type, COALESCE(c.customer_name, l.company_name, l.contact_name, '') AS display_name " +
                        "FROM public.region_activity_plan_target t " +
                        "LEFT JOIN public.customer c ON c.customer_id = t.customer_id " +
                        "LEFT JOIN public.lead l ON CAST(l.id AS TEXT) = t.lead_id " +
                        "WHERE t.region_activity_plan_id = ?",
                ps -> ps.setLong(1, planId),
                (rs, i) -> {
                    Map<String, Object> target = new LinkedHashMap<>();
                    target.put("customerId", rs.getString("customer_id"));
                    target.put("leadId", rs.getString("lead_id"));
                    target.put("companyType", rs.getString("company_type"));
                    target.put("displayName", rs.getString("display_name"));
                    return target;
                }
        );
    }

    private void upsertTargets(Long planId, String subject, List<TargetRequest> targets, String assigneeId, boolean replaceExisting) {
        if (planId == null) return;
        if (replaceExisting) {
            jdbc.update("DELETE FROM public.region_activity_plan_target WHERE region_activity_plan_id=?", planId);
        }
        if (targets == null || targets.isEmpty()) return;
        Long auditUser = resolveAuditUser(null, assigneeId);
        String content = StringUtils.hasText(subject) ? subject.trim() : "지역활동 계획";
        for (TargetRequest target : targets) {
            if (target == null) continue;
            String customerId = StringUtils.hasText(target.customerId) ? target.customerId.trim() : null;
            String leadId = StringUtils.hasText(target.leadId) ? target.leadId.trim() : null;
            if (customerId == null && leadId == null) continue;
            if (replaceExisting) {
                if (customerId != null) {
                    jdbc.update(
                            "INSERT INTO public.region_activity_plan_target(region_activity_plan_id, customer_id, assignee_id, activity_plan_content, is_completed, created_by, updated_by) VALUES (?,?,?,?,?,?,?)",
                            planId, customerId, assigneeId, content, Boolean.FALSE, auditUser, auditUser
                    );
                } else if (leadId != null) {
                    jdbc.update(
                            "INSERT INTO public.region_activity_plan_target(region_activity_plan_id, lead_id, assignee_id, activity_plan_content, is_completed, created_by, updated_by) VALUES (?,?,?,?,?,?,?)",
                            planId, leadId, assigneeId, content, Boolean.FALSE, auditUser, auditUser
                    );
                }
                continue;
            }
            if (customerId != null) {
                int updated = jdbc.update(
                        "UPDATE public.region_activity_plan_target SET updated_at=now(), updated_by=?, activity_plan_content=?, assignee_id=? WHERE region_activity_plan_id=? AND customer_id=?",
                        auditUser, content, assigneeId, planId, customerId
                );
                if (updated == 0) {
                    jdbc.update(
                            "INSERT INTO public.region_activity_plan_target(region_activity_plan_id, customer_id, assignee_id, activity_plan_content, is_completed, created_by, updated_by) VALUES (?,?,?,?,?,?,?)",
                            planId, customerId, assigneeId, content, Boolean.FALSE, auditUser, auditUser
                    );
                }
            } else if (leadId != null) {
                int updated = jdbc.update(
                        "UPDATE public.region_activity_plan_target SET updated_at=now(), updated_by=?, activity_plan_content=?, assignee_id=? WHERE region_activity_plan_id=? AND lead_id=?",
                        auditUser, content, assigneeId, planId, leadId
                );
                if (updated == 0) {
                    jdbc.update(
                            "INSERT INTO public.region_activity_plan_target(region_activity_plan_id, lead_id, assignee_id, activity_plan_content, is_completed, created_by, updated_by) VALUES (?,?,?,?,?,?,?)",
                            planId, leadId, assigneeId, content, Boolean.FALSE, auditUser, auditUser
                    );
                }
            }
        }
    }

    private String combineSubject(String subject, String districtName) {
        String trimmedSubject = StringUtils.hasText(subject) ? subject.trim() : "";
        String trimmedDistrict = StringUtils.hasText(districtName) ? districtName.trim() : "";
        if (!trimmedSubject.isEmpty() && !trimmedDistrict.isEmpty()) {
            return "(" + trimmedDistrict + ") " + trimmedSubject;
        }
        return trimmedSubject.isEmpty() ? trimmedDistrict : trimmedSubject;
    }
}
