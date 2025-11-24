package com.tnt.sales.lead.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/v1/lead-stats")
public class LeadStatsController {
    private static final Logger log = LoggerFactory.getLogger(LeadStatsController.class);

    @Autowired
    JdbcTemplate jdbc;

    /**
     * TM현황 - 잠재고객 등록현황 조회
     * GET /api/v1/lead-stats/registration
     *
     * Query Parameters:
     * - period: 조회기간 (daily, weekly, monthly)
     * - filterType: 필터타입 (owner, creator)
     * - empId: 사원ID
     * - baseDate: 기준일자 (YYYY-MM-DD)
     */
    @GetMapping("/registration")
    public ResponseEntity<?> getRegistrationStats(
            @RequestParam(value = "period", defaultValue = "weekly") String period,
            @RequestParam(value = "filterType", defaultValue = "owner") String filterType,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "baseDate", required = false) String baseDate
    ) {
        log.info("Registration stats request - period: {}, filterType: {}, empId: {}, baseDate: {}",
                period, filterType, empId, baseDate);
        try {
            LocalDate base = (baseDate != null && !baseDate.isBlank())
                    ? LocalDate.parse(baseDate, DateTimeFormatter.ISO_DATE)
                    : LocalDate.now();

            // Calculate date ranges based on period
            List<Map<String, Object>> ranges = calculateDateRanges(base, period);

            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> range : ranges) {
                String startDate = (String) range.get("startDate");
                String endDate = (String) range.get("endDate");
                String label = (String) range.get("label");

                // Query registration count: count unique leads that have activities
                String sql = "SELECT COUNT(DISTINCT l.id) as count FROM lead l " +
                        "LEFT JOIN sales_activity sa ON sa.sf_lead_id = CAST(l.id AS VARCHAR) " +
                        "WHERE 1=1 ";
                List<Object> params = new ArrayList<>();

                if ("owner".equals(filterType) && empId != null && !empId.isBlank()) {
                    sql += "AND CAST(l.assignee_id AS TEXT) = ? ";
                    params.add(empId);
                } else if ("creator".equals(filterType) && empId != null && !empId.isBlank()) {
                    sql += "AND CAST(l.created_by AS TEXT) = ? ";
                    params.add(empId);
                }

                sql += "AND l.updated_at >= ?::timestamp AND l.updated_at < (?::timestamp + interval '1 day')";
                params.add(startDate + " 00:00:00");
                params.add(endDate + " 00:00:00");

                log.info("Executing registration query - SQL: {}, Params: {}", sql, params);
                Integer count = jdbc.queryForObject(sql, Integer.class, params.toArray());
                log.info("Query result for {}: {}", label, count);

                Map<String, Object> item = new HashMap<>();
                item.put("label", label);
                item.put("startDate", startDate);
                item.put("endDate", endDate);
                item.put("count", count != null ? count : 0);
                result.add(item);
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("잠재고객 등록현황 조회 실패", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * TM현황 - 월별 담당자(assignee)별 잠재고객 등록 매트릭스
     * 일자(세로) x assignee_id(가로)
     */
    @GetMapping("/monthly/owner-matrix")
    public ResponseEntity<?> getMonthlyOwnerMatrix(
            @RequestParam(value = "baseDate", required = false) String baseDate
    ) {
        try {
            LocalDate base = (baseDate != null && !baseDate.isBlank())
                    ? LocalDate.parse(baseDate, DateTimeFormatter.ISO_DATE)
                    : LocalDate.now();

            LocalDate monthStart = base.withDayOfMonth(1);
            LocalDate monthEndExclusive = monthStart.plusMonths(1);
            LocalDate monthEnd = monthEndExclusive.minusDays(1);

            String startTimestamp = monthStart.format(DateTimeFormatter.ISO_DATE) + " 00:00:00";
            String endTimestamp = monthEndExclusive.format(DateTimeFormatter.ISO_DATE) + " 00:00:00";

            String ownerSql = "SELECT DISTINCT CAST(l.assignee_id AS TEXT) as assignee_id, COALESCE(e.emp_name, '') as assignee_name " +
                    "FROM lead l " +
                    "LEFT JOIN public.employee e ON CAST(e.assignee_id AS TEXT) = CAST(l.assignee_id AS TEXT) " +
                    "WHERE l.updated_at >= ?::timestamp AND l.updated_at < ?::timestamp " +
                    "ORDER BY assignee_name NULLS LAST, assignee_id";

            List<Map<String, Object>> ownerRows = jdbc.queryForList(ownerSql, startTimestamp, endTimestamp);
            LinkedHashMap<String, String> ownerMap = new LinkedHashMap<>();
            for (Map<String, Object> row : ownerRows) {
                String ownerId = row.get("assignee_id") != null ? String.valueOf(row.get("assignee_id")) : null;
                String ownerName = row.get("assignee_name") != null ? String.valueOf(row.get("assignee_name")) : "";
                String key = ownerId != null ? ownerId : "UNASSIGNED";
                if (ownerName.isBlank()) {
                    ownerName = ownerId != null ? ownerId : "미지정";
                }
                ownerMap.putIfAbsent(key, ownerName);
            }

            String dataSql = "SELECT DATE(l.updated_at) as work_date, CAST(l.assignee_id AS TEXT) as assignee_id, COUNT(*) as cnt " +
                    "FROM lead l " +
                    "WHERE l.updated_at >= ?::timestamp AND l.updated_at < ?::timestamp " +
                    "GROUP BY DATE(l.updated_at), CAST(l.assignee_id AS TEXT)";
            List<Map<String, Object>> dataRows = jdbc.queryForList(dataSql, startTimestamp, endTimestamp);

            Map<LocalDate, Map<String, Integer>> matrix = new HashMap<>();
            for (Map<String, Object> row : dataRows) {
                Object dateObj = row.get("work_date");
                LocalDate workDate;
                if (dateObj instanceof java.sql.Date) {
                    workDate = ((java.sql.Date) dateObj).toLocalDate();
                } else if (dateObj instanceof java.time.LocalDate) {
                    workDate = (LocalDate) dateObj;
                } else {
                    workDate = LocalDate.parse(String.valueOf(dateObj));
                }

                String ownerId = row.get("assignee_id") != null ? String.valueOf(row.get("assignee_id")) : null;
                String ownerKey = ownerId != null ? ownerId : "UNASSIGNED";
                Number cnt = (Number) row.get("cnt");
                int count = cnt != null ? cnt.intValue() : 0;

                matrix.computeIfAbsent(workDate, d -> new HashMap<>()).put(ownerKey, count);
                if (!ownerMap.containsKey(ownerKey)) {
                    ownerMap.put(ownerKey, ownerId != null ? ownerId : "미지정");
                }
            }

            List<Map<String, Object>> owners = new ArrayList<>();
            LinkedHashMap<String, Integer> totals = new LinkedHashMap<>();
            for (Map.Entry<String, String> entry : ownerMap.entrySet()) {
                Map<String, Object> info = new HashMap<>();
                info.put("assigneeId", entry.getKey());
                info.put("assigneeName", entry.getValue());
                owners.add(info);
                totals.put(entry.getKey(), 0);
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            LocalDate cursor = monthStart;
            while (!cursor.isAfter(monthEnd)) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("date", cursor.format(DateTimeFormatter.ISO_DATE));
                LinkedHashMap<String, Integer> counts = new LinkedHashMap<>();
                Map<String, Integer> daily = matrix.getOrDefault(cursor, Collections.emptyMap());
                int rowTotal = 0;
                for (String ownerKey : ownerMap.keySet()) {
                    int value = daily.getOrDefault(ownerKey, 0);
                    counts.put(ownerKey, value);
                    totals.put(ownerKey, totals.getOrDefault(ownerKey, 0) + value);
                    rowTotal += value;
                }
                row.put("counts", counts);
                row.put("total", rowTotal);
                rows.add(row);
                cursor = cursor.plusDays(1);
            }

            int totalCount = totals.values().stream().mapToInt(Integer::intValue).sum();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("month", monthStart.format(DateTimeFormatter.ofPattern("yyyy-MM")));
            response.put("startDate", monthStart.format(DateTimeFormatter.ISO_DATE));
            response.put("endDate", monthEnd.format(DateTimeFormatter.ISO_DATE));
            response.put("assignees", owners);
            response.put("rows", rows);
            response.put("totals", totals);
            response.put("totalCount", totalCount);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("월별 담당자 매트릭스 조회 실패", e);
            return ResponseEntity.ok(Collections.emptyMap());
        }
    }

    /**
     * TM현황 - 잠재고객 활동현황 조회
     * GET /api/v1/lead-stats/activity
     */
    @GetMapping("/activity")
    public ResponseEntity<?> getActivityStats(
            @RequestParam(value = "period", defaultValue = "weekly") String period,
            @RequestParam(value = "filterType", defaultValue = "owner") String filterType,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "baseDate", required = false) String baseDate
    ) {
        log.info("Activity stats request - period: {}, filterType: {}, empId: {}, baseDate: {}",
                period, filterType, empId, baseDate);
        try {
            LocalDate base = (baseDate != null && !baseDate.isBlank())
                    ? LocalDate.parse(baseDate, DateTimeFormatter.ISO_DATE)
                    : LocalDate.now();

            List<Map<String, Object>> ranges = calculateDateRanges(base, period);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> range : ranges) {
                String startDate = (String) range.get("startDate");
                String endDate = (String) range.get("endDate");
                String label = (String) range.get("label");

                // Query activity count: first find leads matching the filter, then count their activities
                String sql = "SELECT COUNT(*) as count FROM sales_activity sa " +
                        "WHERE sa.sf_lead_id IN (" +
                        "  SELECT CAST(l.id AS VARCHAR) FROM lead l WHERE 1=1 ";

                List<Object> params = new ArrayList<>();

                if ("owner".equals(filterType) && empId != null && !empId.isBlank()) {
                    sql += "AND CAST(l.assignee_id AS TEXT) = ? ";
                    params.add(empId);
                } else if ("creator".equals(filterType) && empId != null && !empId.isBlank()) {
                    sql += "AND CAST(l.created_by AS TEXT) = ? ";
                    params.add(empId);
                }

                sql += ") AND sa.updated_at >= ?::timestamp AND sa.updated_at < (?::timestamp + interval '1 day')";
                params.add(startDate + " 00:00:00");
                params.add(endDate + " 00:00:00");

                log.info("Executing activity query - SQL: {}, Params: {}", sql, params);
                Integer count = jdbc.queryForObject(sql, Integer.class, params.toArray());
                log.info("Query result for {}: {}", label, count);

                Map<String, Object> item = new HashMap<>();
                item.put("label", label);
                item.put("startDate", startDate);
                item.put("endDate", endDate);
                item.put("count", count != null ? count : 0);
                result.add(item);
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("잠재고객 활동현황 조회 실패", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * TM현황 - 등록 상세 목록 조회
     */
    @GetMapping("/registration/details")
    public ResponseEntity<?> getRegistrationDetails(
            @RequestParam(value = "filterType", defaultValue = "owner") String filterType,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate
    ) {
        try {
            // First, get unique leads
            String leadSql = "SELECT l.id, l.company_name, l.contact_name, l.lead_status, " +
                    "l.biz_type, l.addr_province_name, l.updated_at " +
                    "FROM lead l " +
                    "WHERE 1=1 ";
            List<Object> params = new ArrayList<>();

            if ("owner".equals(filterType) && empId != null && !empId.isBlank()) {
                leadSql += "AND CAST(l.assignee_id AS TEXT) = ? ";
                params.add(empId);
            } else if ("creator".equals(filterType) && empId != null && !empId.isBlank()) {
                leadSql += "AND CAST(l.created_by AS TEXT) = ? ";
                params.add(empId);
            }

            leadSql += "AND l.updated_at >= ?::timestamp AND l.updated_at < (?::timestamp + interval '1 day') ";
            leadSql += "ORDER BY l.updated_at DESC";
            params.add(startDate + " 00:00:00");
            params.add(endDate + " 00:00:00");

            log.info("Executing registration details query - SQL: {}, Params: {}", leadSql, params);
            List<Map<String, Object>> leads = jdbc.queryForList(leadSql, params.toArray());
            log.info("Registration details result count: {}", leads.size());

            // For each lead, get its activities
            for (Map<String, Object> lead : leads) {
                String leadId = String.valueOf(lead.get("id"));
                String actSql = "SELECT sa.id, sa.subject, sa.description, sa.activity_type, " +
                        "sa.activity_status, sa.planned_start_at, sa.actual_start_at, sa.updated_at " +
                        "FROM sales_activity sa " +
                        "WHERE sa.sf_lead_id = ? " +
                        "AND sa.updated_at >= ?::timestamp AND sa.updated_at < (?::timestamp + interval '1 day') " +
                        "ORDER BY sa.updated_at DESC";

                List<Object> actParams = new ArrayList<>();
                actParams.add(leadId);
                actParams.add(startDate + " 00:00:00");
                actParams.add(endDate + " 00:00:00");

                List<Map<String, Object>> activities = jdbc.queryForList(actSql, actParams.toArray());
                lead.put("activities", activities);
            }

            return ResponseEntity.ok(leads);

        } catch (Exception e) {
            log.error("등록 상세 목록 조회 실패", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * TM현황 - 활동 상세 목록 조회
     */
    @GetMapping("/activity/details")
    public ResponseEntity<?> getActivityDetails(
            @RequestParam(value = "filterType", defaultValue = "owner") String filterType,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate
    ) {
        try {
            // Query activities for leads matching the filter
            String sql = "SELECT sa.id, sa.subject, sa.description, sa.activity_type, " +
                    "sa.activity_status, sa.planned_start_at, sa.actual_start_at, sa.updated_at " +
                    "FROM sales_activity sa " +
                    "WHERE sa.sf_lead_id IN (" +
                    "  SELECT CAST(l.id AS VARCHAR) FROM lead l WHERE 1=1 ";
            List<Object> params = new ArrayList<>();

            if ("owner".equals(filterType) && empId != null && !empId.isBlank()) {
                sql += "AND CAST(l.assignee_id AS TEXT) = ? ";
                params.add(empId);
            } else if ("creator".equals(filterType) && empId != null && !empId.isBlank()) {
                sql += "AND CAST(l.created_by AS TEXT) = ? ";
                params.add(empId);
            }

            sql += ") AND sa.updated_at >= ?::timestamp AND sa.updated_at < (?::timestamp + interval '1 day') ";
            sql += "ORDER BY sa.updated_at DESC";
            params.add(startDate + " 00:00:00");
            params.add(endDate + " 00:00:00");

            log.info("Executing activity details query - SQL: {}, Params: {}", sql, params);
            List<Map<String, Object>> list = jdbc.queryForList(sql, params.toArray());
            log.info("Activity details result count: {}", list.size());
            return ResponseEntity.ok(list);

        } catch (Exception e) {
            log.error("활동 상세 목록 조회 실패", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }


    /**
     * Calculate date ranges based on period type
     */
    private List<Map<String, Object>> calculateDateRanges(LocalDate base, String period) {
        List<Map<String, Object>> ranges = new ArrayList<>();

        if ("daily".equals(period)) {
            // 전일, 금일, 익일
            ranges.add(createRange(base.minusDays(1), base.minusDays(1), "전일"));
            ranges.add(createRange(base, base, "금일"));
            ranges.add(createRange(base.plusDays(1), base.plusDays(1), "익일"));

        } else if ("weekly".equals(period)) {
            // 전주, 금주, 차주
            LocalDate currentWeekStart = base.with(java.time.DayOfWeek.MONDAY);
            LocalDate currentWeekEnd = currentWeekStart.plusDays(6);

            LocalDate prevWeekStart = currentWeekStart.minusWeeks(1);
            LocalDate prevWeekEnd = prevWeekStart.plusDays(6);

            LocalDate nextWeekStart = currentWeekStart.plusWeeks(1);
            LocalDate nextWeekEnd = nextWeekStart.plusDays(6);

            ranges.add(createRange(prevWeekStart, prevWeekEnd, "전주"));
            ranges.add(createRange(currentWeekStart, currentWeekEnd, "금주"));
            ranges.add(createRange(nextWeekStart, nextWeekEnd, "차주"));

        } else if ("monthly".equals(period)) {
            // 전월, 금월, 익월
            LocalDate currentMonthStart = base.withDayOfMonth(1);
            LocalDate currentMonthEnd = base.withDayOfMonth(base.lengthOfMonth());

            LocalDate prevMonthStart = currentMonthStart.minusMonths(1);
            LocalDate prevMonthEnd = prevMonthStart.withDayOfMonth(prevMonthStart.lengthOfMonth());

            LocalDate nextMonthStart = currentMonthStart.plusMonths(1);
            LocalDate nextMonthEnd = nextMonthStart.withDayOfMonth(nextMonthStart.lengthOfMonth());

            ranges.add(createRange(prevMonthStart, prevMonthEnd, "전월"));
            ranges.add(createRange(currentMonthStart, currentMonthEnd, "금월"));
            ranges.add(createRange(nextMonthStart, nextMonthEnd, "익월"));
        }

        return ranges;
    }

    private Map<String, Object> createRange(LocalDate start, LocalDate end, String label) {
        Map<String, Object> range = new HashMap<>();
        range.put("startDate", start.format(DateTimeFormatter.ISO_DATE));
        range.put("endDate", end.format(DateTimeFormatter.ISO_DATE));
        range.put("label", label);
        return range;
    }
}
