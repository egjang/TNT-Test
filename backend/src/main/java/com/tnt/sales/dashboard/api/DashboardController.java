package com.tnt.sales.dashboard.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private static final Logger log = LoggerFactory.getLogger(DashboardController.class);
    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public DashboardController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @GetMapping("/sales-summary")
    public ResponseEntity<?> salesSummary(
            @RequestParam(value = "date", required = false) String dateStr,
            @RequestParam(value = "companyType", required = false) String companyType) {
        LocalDate d = null;
        try {
            d = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();
        } catch (Exception ignore) {
            d = LocalDate.now();
        }
        int y = d.getYear();
        int m = d.getMonthValue();
        int day = d.getDayOfMonth();

        // Periods
        LocalDate prevYearStart = LocalDate.of(y - 1, 1, 1);
        LocalDate prevYearEndEx = LocalDate.of(y, 1, 1); // exclusive

        LocalDate prevYtdEnd = LocalDate.of(y - 1, Math.min(m, 12),
                Math.min(day, YearMonth.of(y - 1, m).lengthOfMonth()));
        LocalDate prevYtdEndEx = prevYtdEnd.plusDays(1);

        LocalDate curYearStart = LocalDate.of(y, 1, 1);
        LocalDate curYtdEndEx = d.plusDays(1);

        LocalDate prevMonStart = LocalDate.of(y - 1, m, 1);
        LocalDate prevMonEndEx = YearMonth.of(y - 1, m).atEndOfMonth().plusDays(1);
        LocalDate prevMonToDateEnd = LocalDate.of(y - 1, m, Math.min(day, YearMonth.of(y - 1, m).lengthOfMonth()));
        LocalDate prevMonToDateEndEx = prevMonToDateEnd.plusDays(1);

        LocalDate curMonStart = LocalDate.of(y, m, 1);
        LocalDate curMonToDateEndEx = d.plusDays(1);

        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(i." + colDate + ", '" + dateFmt + "')")
                    : ("i." + colDate + "::date");

            // Use invoice.company_type for filtering (consistent with AnalysisController)
            String colCompanyType = env.getProperty("app.invoice.columns.company_type", "company_type");
            String whereClause = "";
            if (companyType != null && !companyType.trim().isEmpty()) {
                whereClause = " WHERE UPPER(COALESCE(NULLIF(TRIM(i." + colCompanyType + "), ''), '')) = UPPER('"
                        + companyType.trim().replace("'", "''") + "') ";
            }

            String sql = "SELECT " +
                    " SUM( CASE WHEN " + dateExpr + " >= ? AND " + dateExpr + " < ? THEN COALESCE(i." + colAmt
                    + ",0) ELSE 0 END ) AS prev_year_total, " +
                    " SUM( CASE WHEN " + dateExpr + " >= ? AND " + dateExpr + " < ? THEN COALESCE(i." + colAmt
                    + ",0) ELSE 0 END ) AS prev_year_to_date, " +
                    " SUM( CASE WHEN " + dateExpr + " >= ? AND " + dateExpr + " < ? THEN COALESCE(i." + colAmt
                    + ",0) ELSE 0 END ) AS current_year_to_date, " +
                    " SUM( CASE WHEN " + dateExpr + " >= ? AND " + dateExpr + " < ? THEN COALESCE(i." + colAmt
                    + ",0) ELSE 0 END ) AS prev_year_month_total, " +
                    " SUM( CASE WHEN " + dateExpr + " >= ? AND " + dateExpr + " < ? THEN COALESCE(i." + colAmt
                    + ",0) ELSE 0 END ) AS prev_year_month_to_date, " +
                    " SUM( CASE WHEN " + dateExpr + " >= ? AND " + dateExpr + " < ? THEN COALESCE(i." + colAmt
                    + ",0) ELSE 0 END ) AS current_year_month_to_date " +
                    " FROM " + tbl + " i " +
                    whereClause;

            Map<String, Object> out = jdbc.queryForObject(sql, (rs, i) -> {
                Map<String, Object> m2 = new LinkedHashMap<>();
                m2.put("prevYearTotal", rs.getBigDecimal(1) == null ? 0 : rs.getBigDecimal(1).doubleValue());
                m2.put("prevYearToDate", rs.getBigDecimal(2) == null ? 0 : rs.getBigDecimal(2).doubleValue());
                m2.put("currentYearToDate", rs.getBigDecimal(3) == null ? 0 : rs.getBigDecimal(3).doubleValue());
                m2.put("prevYearMonthTotal", rs.getBigDecimal(4) == null ? 0 : rs.getBigDecimal(4).doubleValue());
                m2.put("prevYearMonthToDate", rs.getBigDecimal(5) == null ? 0 : rs.getBigDecimal(5).doubleValue());
                m2.put("currentYearMonthToDate", rs.getBigDecimal(6) == null ? 0 : rs.getBigDecimal(6).doubleValue());
                return m2;
            },
                    java.sql.Date.valueOf(prevYearStart), java.sql.Date.valueOf(prevYearEndEx),
                    java.sql.Date.valueOf(prevYearStart), java.sql.Date.valueOf(prevYtdEndEx),
                    java.sql.Date.valueOf(curYearStart), java.sql.Date.valueOf(curYtdEndEx),
                    java.sql.Date.valueOf(prevMonStart), java.sql.Date.valueOf(prevMonEndEx),
                    java.sql.Date.valueOf(prevMonStart), java.sql.Date.valueOf(prevMonToDateEndEx),
                    java.sql.Date.valueOf(curMonStart), java.sql.Date.valueOf(curMonToDateEndEx));
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("[Dashboard] sales-summary failed: {}", ex.toString());
        }
        // nodb: sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of(
                        "prevYearTotal", 123456789,
                        "prevYearToDate", 67890123,
                        "currentYearToDate", 78901234,
                        "prevYearMonthTotal", 4567890,
                        "prevYearMonthToDate", 3456789,
                        "currentYearMonthToDate", 5678901));
            }
        }
        return ResponseEntity.status(500).body(Map.of("error", "dashboard_summary_failed"));
    }

    /**
     * Aggregate invoice amounts by sales management unit for a given employee name.
     * GET /api/v1/dashboard/unit-amounts-by-emp?empName=홍길동
     * Returns: [{ sales_mgmt_unit, amount }]
     */
    @GetMapping("/unit-amounts-by-emp")
    public ResponseEntity<?> unitAmountsByEmp(@RequestParam("empName") String empName) {
        try {
            String name = empName == null ? "" : empName.trim();
            if (name.isEmpty())
                return ResponseEntity.ok(java.util.List.of());

            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colEmp = env.getProperty("app.invoice.columns.curr_emp_name", "curr_emp_name");
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");

            String sql = "SELECT coalesce(nullif(trim(" + colUnit + "), ''), 'na') AS sales_mgmt_unit, " +
                    "SUM(COALESCE(" + colAmt + ",0))::double precision AS amount " +
                    "FROM " + tbl + " WHERE " + colEmp + " = ? GROUP BY 1 ORDER BY 2 DESC, 1 ASC";

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("sales_mgmt_unit", rs.getString(1));
                m.put("amount", rs.getDouble(2));
                return m;
            }, name);
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] unit-amounts-by-emp failed: {}", ex.toString());
        }
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("sales_mgmt_unit", "UNIT-A", "amount", 1200000d),
                        java.util.Map.of("sales_mgmt_unit", "UNIT-B", "amount", 850000d)));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "unit_amounts_by_emp_failed"));
    }

    /**
     * Average unit price by sales management unit for an employee's customers in a
     * given year and company type.
     * Joins customer by assignee_id, filters invoice by year, groups by
     * sales_mgmt_unit.
     * GET
     * /api/v1/dashboard/avg-unit-price-by-emp?assigneeId=S01001&companyType=TNT&year=2025
     * Returns: [{ sales_mgmt_unit, avg_unit_price, total_amount, total_qty }]
     */
    @GetMapping("/avg-unit-price-by-emp")
    public ResponseEntity<?> avgUnitPriceByEmp(
            @RequestParam("assigneeId") String assigneeId,
            @RequestParam("companyType") String companyType,
            @RequestParam("year") int year) {
        try {
            String aid = assigneeId == null ? "" : assigneeId.trim();
            String comp = companyType == null ? "" : companyType.trim();
            if (aid.isEmpty() || comp.isEmpty() || year <= 0)
                return ResponseEntity.ok(java.util.List.of());

            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            // Prefer std_qty if configured; fallback to qty
            String colQty = env.getProperty("app.invoice.columns.std_qty",
                    env.getProperty("app.invoice.columns.qty", "std_qty"));
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String colItemUnit = env.getProperty("app.invoice.columns.item_unit", "item_unit");
            String colItemStdUnit = env.getProperty("app.invoice.columns.item_std_unit", "item_std_unit");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");

            String sql = "SELECT coalesce(nullif(trim(i." + colUnit + "), ''), 'na') AS sales_mgmt_unit, " +
                    "SUM(COALESCE(i." + colAmt + ",0))::double precision AS total_amount, " +
                    "SUM(COALESCE(i." + colQty + ",0))::double precision AS total_qty, " +
                    "CASE WHEN SUM(COALESCE(i." + colQty + ",0)) > 0 THEN (SUM(COALESCE(i." + colAmt
                    + ",0)) / SUM(COALESCE(i." + colQty + ",0))) ELSE 0 END AS avg_unit_price, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i." + colItemUnit
                    + "), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i." + colItemUnit
                    + "), ''), 'na')) AS item_unit, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i." + colItemStdUnit
                    + "), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i." + colItemStdUnit
                    + "), ''), 'na')) AS item_std_unit " +
                    "FROM " + invTbl + " i " +
                    "JOIN public.customer c ON CAST(i." + colCust + " AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                    "WHERE c.assignee_id = ? AND UPPER(c.company_type) = UPPER(?) AND EXTRACT(YEAR FROM " + dateExpr
                    + ") = ? " +
                    "GROUP BY 1 ORDER BY 1";

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, ps -> {
                ps.setString(1, aid);
                ps.setString(2, comp);
                ps.setInt(3, year);
            }, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("sales_mgmt_unit", rs.getString(1));
                m.put("total_amount", rs.getDouble(2));
                m.put("total_qty", rs.getDouble(3));
                m.put("avg_unit_price", rs.getDouble(4));
                m.put("item_unit", rs.getString(5));
                m.put("item_std_unit", rs.getString(6));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] avg-unit-price-by-emp failed: {}", ex.toString());
        }
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("sales_mgmt_unit", "UNIT-A", "total_amount", 1200000d, "total_qty", 300d,
                                "avg_unit_price", 4000d),
                        java.util.Map.of("sales_mgmt_unit", "UNIT-B", "total_amount", 900000d, "total_qty", 450d,
                                "avg_unit_price", 2000d)));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "avg_unit_price_by_emp_failed"));
    }

    /**
     * Global average unit price by sales management unit (no assignee filter) for a
     * year and company type.
     * GET /api/v1/dashboard/avg-unit-price?companyType=TNT&year=2025
     */
    @GetMapping("/avg-unit-price")
    public ResponseEntity<?> avgUnitPrice(
            @RequestParam("companyType") String companyType,
            @RequestParam("year") int year) {
        try {
            String comp = companyType == null ? "" : companyType.trim();
            if (comp.isEmpty() || year <= 0)
                return ResponseEntity.ok(java.util.List.of());

            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colQty = env.getProperty("app.invoice.columns.std_qty",
                    env.getProperty("app.invoice.columns.qty", "std_qty"));
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String colItemUnit = env.getProperty("app.invoice.columns.item_unit", "item_unit");
            String colItemStdUnit = env.getProperty("app.invoice.columns.item_std_unit", "item_std_unit");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");

            String sql = "SELECT coalesce(nullif(trim(i." + colUnit + "), ''), 'na') AS sales_mgmt_unit, " +
                    "SUM(COALESCE(i." + colAmt + ",0))::double precision AS total_amount, " +
                    "SUM(COALESCE(i." + colQty + ",0))::double precision AS total_qty, " +
                    "CASE WHEN SUM(COALESCE(i." + colQty + ",0)) > 0 THEN (SUM(COALESCE(i." + colAmt
                    + ",0)) / SUM(COALESCE(i." + colQty + ",0))) ELSE 0 END AS avg_unit_price, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i." + colItemUnit
                    + "), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i." + colItemUnit
                    + "), ''), 'na')) AS item_unit, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i." + colItemStdUnit
                    + "), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i." + colItemStdUnit
                    + "), ''), 'na')) AS item_std_unit " +
                    "FROM " + invTbl + " i " +
                    "JOIN public.customer c ON CAST(i." + colCust + " AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                    "WHERE UPPER(c.company_type) = UPPER(?) AND EXTRACT(YEAR FROM " + dateExpr + ") = ? " +
                    "GROUP BY 1 ORDER BY 1";

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, ps -> {
                ps.setString(1, comp);
                ps.setInt(2, year);
            }, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("sales_mgmt_unit", rs.getString(1));
                m.put("total_amount", rs.getDouble(2));
                m.put("total_qty", rs.getDouble(3));
                m.put("avg_unit_price", rs.getDouble(4));
                m.put("item_unit", rs.getString(5));
                m.put("item_std_unit", rs.getString(6));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] avg-unit-price failed: {}", ex.toString());
        }
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of());
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "avg_unit_price_failed"));
    }

    @GetMapping("/monthly")
    public ResponseEntity<?> monthly(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "until", required = false) String untilStr,
            @RequestParam(value = "companyType", required = false) String companyType) {
        LocalDate base = LocalDate.now();
        int y = (year != null && year > 0) ? year : base.getYear();
        LocalDate start = LocalDate.of(y, 1, 1);
        LocalDate endExclusive = LocalDate.of(y + 1, 1, 1);
        if (untilStr != null && !untilStr.isBlank()) {
            try {
                LocalDate until = LocalDate.parse(untilStr);
                if (until.getYear() == y) {
                    endExclusive = until.plusDays(1);
                }
            } catch (Exception ignore) {
            }
        }
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colCompanyType = env.getProperty("app.invoice.columns.company_type", "company_type");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(i." + colDate + ", '" + dateFmt + "')")
                    : ("i." + colDate + "::date");

            String whereClause = dateExpr + " >= ? AND " + dateExpr + " < ?";
            // Use invoice.company_type for filtering (consistent with AnalysisController)
            if (companyType != null && !companyType.trim().isEmpty()) {
                whereClause += " AND UPPER(COALESCE(NULLIF(TRIM(i." + colCompanyType + "), ''), '')) = UPPER('"
                        + companyType.trim().replace("'", "''") + "')";
            }

            String sql = "SELECT EXTRACT(MONTH FROM " + dateExpr + ")::int AS m, " +
                    " SUM(COALESCE(i." + colAmt + ",0))::double precision AS amount " +
                    " FROM " + tbl + " i WHERE " + whereClause + " GROUP BY 1 ORDER BY 1";
            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("month", rs.getInt(1));
                m.put("amount", rs.getDouble(2));
                return m;
            }, java.sql.Date.valueOf(start), java.sql.Date.valueOf(endExclusive));
            // Fill missing months with 0
            double[] arr = new double[12];
            for (int i = 0; i < 12; i++)
                arr[i] = 0;
            for (var r : rows) {
                int m = ((Number) r.get("month")).intValue();
                double a = ((Number) r.get("amount")).doubleValue();
                if (m >= 1 && m <= 12)
                    arr[m - 1] = a;
            }
            java.util.List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
            for (int i = 1; i <= 12; i++) {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("month", i);
                m.put("amount", arr[i - 1]);
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("[Dashboard] monthly failed: {}", ex.toString());
        }
        // nodb sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                java.util.List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
                for (int i = 1; i <= 12; i++)
                    out.add(java.util.Map.of("month", i, "amount", (i * 1000000)));
                return ResponseEntity.ok(out);
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "dashboard_monthly_failed"));
    }

    @GetMapping("/daily")
    public ResponseEntity<?> daily(
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam(value = "until", required = false) String untilStr,
            @RequestParam(value = "companyType", required = false) String companyType) {
        if (month < 1 || month > 12)
            month = 1;
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate endExclusive = start.plusMonths(1);
        if (untilStr != null && !untilStr.isBlank()) {
            try {
                LocalDate until = LocalDate.parse(untilStr);
                if (until.getYear() == year && until.getMonthValue() == month) {
                    endExclusive = until.plusDays(1);
                }
            } catch (Exception ignore) {
            }
        }
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colCompanyType = env.getProperty("app.invoice.columns.company_type", "company_type");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(i." + colDate + ", '" + dateFmt + "')")
                    : ("i." + colDate + "::date");

            String whereClause = dateExpr + " >= ? AND " + dateExpr + " < ?";
            // Use invoice.company_type for filtering (consistent with AnalysisController)
            if (companyType != null && !companyType.trim().isEmpty()) {
                whereClause += " AND UPPER(COALESCE(NULLIF(TRIM(i." + colCompanyType + "), ''), '')) = UPPER('"
                        + companyType.trim().replace("'", "''") + "')";
            }

            String sql = "SELECT EXTRACT(DAY FROM " + dateExpr + ")::int AS d, " +
                    " SUM(COALESCE(i." + colAmt + ",0))::double precision AS amount " +
                    " FROM " + tbl + " i WHERE " + whereClause + " GROUP BY 1 ORDER BY 1";
            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("day", rs.getInt(1));
                m.put("amount", rs.getDouble(2));
                return m;
            }, java.sql.Date.valueOf(start), java.sql.Date.valueOf(endExclusive));
            int days = java.time.YearMonth.of(year, month).lengthOfMonth();
            double[] arr = new double[days];
            for (int i = 0; i < days; i++)
                arr[i] = 0;
            for (var r : rows) {
                int d = ((Number) r.get("day")).intValue();
                double a = ((Number) r.get("amount")).doubleValue();
                if (d >= 1 && d <= days)
                    arr[d - 1] = a;
            }
            java.util.List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
            for (int i = 1; i <= days; i++) {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("day", i);
                m.put("amount", arr[i - 1]);
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("[Dashboard] daily failed: {}", ex.toString());
        }
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                int days = java.time.YearMonth.now().lengthOfMonth();
                java.util.List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
                for (int i = 1; i <= days; i++)
                    out.add(java.util.Map.of("day", i, "amount", (i * 100000)));
                return ResponseEntity.ok(out);
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "dashboard_daily_failed"));
    }

    @GetMapping("/churn")
    public ResponseEntity<?> churn(@RequestParam(value = "date", required = false) String dateStr) {
        LocalDate d;
        try {
            d = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();
        } catch (Exception ex) {
            d = LocalDate.now();
        }
        int y = d.getYear();
        // From 5 years ago (inclusive) up to end of last year (exclusive)
        LocalDate prev5Start = LocalDate.of(y - 5, 1, 1);
        LocalDate prev5EndEx = LocalDate.of(y, 1, 1);
        LocalDate curYearStart = LocalDate.of(y, 1, 1);
        LocalDate curYtdEndEx = d.plusDays(1);
        try {
            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String custTbl = env.getProperty("app.customer.table", "public.customer");
            String custSeqCol = env.getProperty("app.customer.columns.customer_seq", "customer_seq");
            String custNameCol = env.getProperty("app.customer.columns.customer_name", "customer_name");

            String sql = "WITH prev AS (" +
                    "  SELECT " + colCust + ", MAX(customer_name) AS inv_customer_name, SUM(COALESCE(" + colAmt
                    + ",0)) AS amt" +
                    "    FROM " + invTbl + " WHERE " + dateExpr + " >= ? AND " + dateExpr + " < ? GROUP BY " + colCust
                    + "" +
                    "), cur AS (" +
                    "  SELECT " + colCust + ", SUM(COALESCE(" + colAmt + ",0)) AS amt" +
                    "    FROM " + invTbl + " WHERE " + dateExpr + " >= ? AND " + dateExpr + " < ? GROUP BY " + colCust
                    + "" +
                    ") SELECT p." + colCust + " AS customer_seq, COALESCE(c." + custNameCol
                    + ", p.inv_customer_name) AS customer_name, p.amt AS prev_amount" +
                    "  FROM prev p" +
                    "  LEFT JOIN cur ON cur." + colCust + " = p." + colCust + "" +
                    "  LEFT JOIN " + custTbl + " c ON c." + custSeqCol + " = p." + colCust + "" +
                    "  WHERE COALESCE(cur.amt,0) = 0" +
                    "  ORDER BY p.amt DESC NULLS LAST LIMIT 200";

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql,
                    (rs, i) -> {
                        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                        m.put("customerSeq", rs.getObject(1));
                        m.put("customerName", rs.getString(2));
                        m.put("prevAmount", rs.getBigDecimal(3) == null ? 0 : rs.getBigDecimal(3).doubleValue());
                        return m;
                    },
                    java.sql.Date.valueOf(prev5Start), java.sql.Date.valueOf(prev5EndEx),
                    java.sql.Date.valueOf(curYearStart), java.sql.Date.valueOf(curYtdEndEx));
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] churn failed: {}", ex.toString());
        }
        // nodb sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("customerSeq", 1001, "customerName", "한빛상사", "prevAmount", 123000000),
                        java.util.Map.of("customerSeq", 1002, "customerName", "강천상사", "prevAmount", 99000000)));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "dashboard_churn_failed"));
    }

    @GetMapping("/newcustomers")
    public ResponseEntity<?> newCustomers(@RequestParam(value = "date", required = false) String dateStr) {
        LocalDate d;
        try {
            d = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();
        } catch (Exception ex) {
            d = LocalDate.now();
        }
        int y = d.getYear();
        LocalDate prev5Start = LocalDate.of(y - 5, 1, 1);
        LocalDate prev5EndEx = LocalDate.of(y, 1, 1);
        LocalDate curYearStart = LocalDate.of(y, 1, 1);
        LocalDate curYtdEndEx = d.plusDays(1);
        try {
            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            boolean dateIsText = Boolean
                    .parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String custTbl = env.getProperty("app.customer.table", "public.customer");
            String custSeqCol = env.getProperty("app.customer.columns.customer_seq", "customer_seq");
            String custNameCol = env.getProperty("app.customer.columns.customer_name", "customer_name");

            String sql = "WITH prev AS (" +
                    "  SELECT " + colCust + ", SUM(COALESCE(" + colAmt + ",0)) AS amt" +
                    "    FROM " + invTbl + " WHERE " + dateExpr + " >= ? AND " + dateExpr + " < ? GROUP BY " + colCust
                    + "" +
                    "), cur AS (" +
                    "  SELECT " + colCust + ", SUM(COALESCE(" + colAmt + ",0)) AS amt" +
                    "    FROM " + invTbl + " WHERE " + dateExpr + " >= ? AND " + dateExpr + " < ? GROUP BY " + colCust
                    + "" +
                    ") SELECT c." + custNameCol + " AS customer_name, cur.amt AS cur_amount, cur." + colCust
                    + " AS customer_seq" +
                    "  FROM cur" +
                    "  LEFT JOIN prev ON prev." + colCust + " = cur." + colCust + "" +
                    "  LEFT JOIN " + custTbl + " c ON c." + custSeqCol + " = cur." + colCust + "" +
                    "  WHERE COALESCE(prev.amt,0) = 0 AND COALESCE(cur.amt,0) > 0" +
                    "  ORDER BY cur.amt DESC NULLS LAST LIMIT 200";

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql,
                    (rs, i) -> {
                        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                        m.put("customerName", rs.getString(1));
                        m.put("curAmount", rs.getBigDecimal(2) == null ? 0 : rs.getBigDecimal(2).doubleValue());
                        m.put("customerSeq", rs.getObject(3));
                        return m;
                    },
                    java.sql.Date.valueOf(prev5Start), java.sql.Date.valueOf(prev5EndEx),
                    java.sql.Date.valueOf(curYearStart), java.sql.Date.valueOf(curYtdEndEx));
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] newcustomers failed: {}", ex.toString());
        }
        // nodb sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("customerSeq", 2001, "customerName", "새싹상사", "curAmount", 150000000),
                        java.util.Map.of("customerSeq", 2002, "customerName", "신규트레이드", "curAmount", 88000000)));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "dashboard_newcustomers_failed"));
    }

    /**
     * Monthly activity analysis by salesperson for the current year
     * Returns monthly activity counts (planned and completed) for each employee
     */
    /**
     * Monthly activity analysis by salesperson for the current year
     * Returns monthly activity counts (planned and completed) for each employee
     */
    @GetMapping("/activity-analysis")
    public ResponseEntity<?> activityAnalysis(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "depts", required = false) String deptsCsv,
            @RequestParam(value = "activityType", required = false, defaultValue = "ALL") String activityType) {
        // nodb profile: return stub data
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of(
                                "empId", "S01001",
                                "empName", "홍길동",
                                "deptName", "영업1본부",
                                "months", java.util.List.of(
                                        java.util.Map.of("month", 1, "planned", 10, "completed", 8),
                                        java.util.Map.of("month", 2, "planned", 12, "completed", 10)))));
            }
        }

        try {
            int targetYear = (year != null) ? year : LocalDate.now().getYear();

            // Resolve departments
            java.util.List<String> target = new java.util.ArrayList<>(
                    java.util.List.of("영업1본부", "영업1팀", "영업2본부", "영업2팀"));
            if (deptsCsv != null && !deptsCsv.isBlank()) {
                if (!"all".equalsIgnoreCase(deptsCsv.trim())) {
                    target.clear();
                    for (String t : deptsCsv.split(",")) {
                        String s = t == null ? "" : t.trim();
                        if (!s.isEmpty())
                            target.add(s);
                    }
                    if (target.isEmpty())
                        target.addAll(java.util.List.of("영업1본부", "영업1팀", "영업2본부", "영업2팀"));
                }
            }

            String in;
            if (deptsCsv != null && "all".equalsIgnoreCase(deptsCsv.trim())) {
                in = null; // no dept filter
            } else {
                StringBuilder sb = new StringBuilder("(");
                for (int i = 0; i < target.size(); i++) {
                    if (i > 0)
                        sb.append(",");
                    sb.append("?");
                }
                sb.append(")");
                in = sb.toString();
            }

            String type = activityType == null ? "ALL" : activityType.toUpperCase().trim();
            boolean includeSales = "ALL".equals(type) || "SALES".equals(type);
            boolean includeRegion = "ALL".equals(type) || "REGION".equals(type);

            StringBuilder sql = new StringBuilder();
            sql.append("WITH monthly_activities AS ( ");

            if (includeSales) {
                sql.append("  SELECT sa.sf_owner_id AS owner_id, ");
                sql.append("         EXTRACT(MONTH FROM sa.planned_start_at)::int AS month, ");
                sql.append("         COUNT(*) AS planned, ");
                sql.append(
                        "         SUM(CASE WHEN (LOWER(BTRIM(sa.activity_status)) IN ('completed') OR BTRIM(sa.activity_status) IN ('완료')) THEN 1 ELSE 0 END) AS completed ");
                sql.append("    FROM public.sales_activity sa ");
                sql.append("   WHERE EXTRACT(YEAR FROM sa.planned_start_at) = ? ");
                sql.append("   GROUP BY sa.sf_owner_id, EXTRACT(MONTH FROM sa.planned_start_at) ");
            }

            if (includeSales && includeRegion) {
                sql.append("  UNION ALL ");
            }

            if (includeRegion) {
                sql.append("  SELECT rap.assignee_id AS owner_id, ");
                sql.append("         EXTRACT(MONTH FROM rap.planned_start_at)::int AS month, ");
                sql.append("         COUNT(*) AS planned, ");
                sql.append("         SUM(CASE WHEN rap.actual_start_at IS NOT NULL THEN 1 ELSE 0 END) AS completed ");
                sql.append("    FROM public.region_activity_plan rap ");
                sql.append("   WHERE EXTRACT(YEAR FROM rap.planned_start_at) = ? ");
                sql.append("   GROUP BY rap.assignee_id, EXTRACT(MONTH FROM rap.planned_start_at) ");
            }

            sql.append("), aggregated_activities AS ( ");
            sql.append("  SELECT owner_id, month, SUM(planned) AS planned, SUM(completed) AS completed ");
            sql.append("    FROM monthly_activities ");
            sql.append("   GROUP BY owner_id, month ");
            sql.append(") ");

            sql.append("SELECT e.emp_id, e.assignee_id, e.emp_name, e.dept_name, ");
            sql.append("       ma.month, COALESCE(ma.planned, 0) AS planned, COALESCE(ma.completed, 0) AS completed ");
            sql.append("  FROM public.employee e ");
            sql.append(
                    "  LEFT JOIN aggregated_activities ma ON CAST(ma.owner_id AS TEXT) = CAST(e.assignee_id AS TEXT) ");
            sql.append(in == null ? "" : " WHERE e.dept_name IN " + in);
            sql.append("  ORDER BY e.emp_name, ma.month");

            java.util.List<Object> params = new java.util.ArrayList<>();
            if (includeSales)
                params.add(targetYear);
            if (includeRegion)
                params.add(targetYear);
            if (in != null)
                params.addAll(target);

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql.toString(), ps -> {
                for (int idx = 0; idx < params.size(); idx++) {
                    ps.setObject(idx + 1, params.get(idx));
                }
            }, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("empId", rs.getString(1));
                m.put("assigneeId", rs.getString(2));
                m.put("empName", rs.getString(3));
                m.put("deptName", rs.getString(4));
                Object monthObj = rs.getObject(5);
                m.put("month", monthObj != null ? ((Number) monthObj).intValue() : null);
                m.put("planned", rs.getInt(6));
                m.put("completed", rs.getInt(7));
                return m;
            });

            // Group by employee
            java.util.Map<String, java.util.Map<String, Object>> empMap = new java.util.LinkedHashMap<>();
            for (java.util.Map<String, Object> row : rows) {
                String empId = (String) row.get("empId");
                Integer month = (Integer) row.get("month");

                if (!empMap.containsKey(empId)) {
                    java.util.Map<String, Object> emp = new java.util.LinkedHashMap<>();
                    emp.put("empId", row.get("empId"));
                    emp.put("assigneeId", row.get("assigneeId"));
                    emp.put("empName", row.get("empName"));
                    emp.put("deptName", row.get("deptName"));
                    emp.put("months", new java.util.ArrayList<java.util.Map<String, Object>>());
                    empMap.put(empId, emp);
                }

                if (month != null) {
                    java.util.Map<String, Object> monthData = new java.util.LinkedHashMap<>();
                    monthData.put("month", month);
                    monthData.put("planned", row.get("planned"));
                    monthData.put("completed", row.get("completed"));

                    @SuppressWarnings("unchecked")
                    java.util.List<java.util.Map<String, Object>> months = (java.util.List<java.util.Map<String, Object>>) empMap
                            .get(empId).get("months");
                    months.add(monthData);
                }
            }

            return ResponseEntity.ok(new java.util.ArrayList<>(empMap.values()));
        } catch (Exception e) {
            log.error("Activity analysis failed", e);
            return ResponseEntity.status(500)
                    .body(java.util.Map.of("error", "activity_analysis_failed", "message", e.getMessage()));
        }
    }

    /**
     * Daily activity stats per employee for a date range.
     * GET /api/v1/dashboard/daily-activity?from=2025-01-01&to=2025-01-31
     */
    @GetMapping("/daily-activity")
    public ResponseEntity<?> dailyActivity(
            @RequestParam("from") String fromStr,
            @RequestParam("to") String toStr,
            @RequestParam(value = "depts", required = false) String deptsCsv,
            @RequestParam(value = "activityType", required = false, defaultValue = "ALL") String activityType) {
        try {
            LocalDate from = LocalDate.parse(fromStr);
            LocalDate to = LocalDate.parse(toStr); // inclusive

            // Resolve departments
            java.util.List<String> target = new java.util.ArrayList<>(
                    java.util.List.of("영업1본부", "영업1팀", "영업2본부", "영업2팀"));
            if (deptsCsv != null && !deptsCsv.isBlank()) {
                if (!"all".equalsIgnoreCase(deptsCsv.trim())) {
                    target.clear();
                    for (String t : deptsCsv.split(",")) {
                        String s = t == null ? "" : t.trim();
                        if (!s.isEmpty())
                            target.add(s);
                    }
                    if (target.isEmpty())
                        target.addAll(java.util.List.of("영업1본부", "영업1팀", "영업2본부", "영업2팀"));
                }
            }

            String in;
            if (deptsCsv != null && "all".equalsIgnoreCase(deptsCsv.trim())) {
                in = null;
            } else {
                StringBuilder sb = new StringBuilder("(");
                for (int i = 0; i < target.size(); i++) {
                    if (i > 0)
                        sb.append(",");
                    sb.append("?");
                }
                sb.append(")");
                in = sb.toString();
            }

            String type = activityType == null ? "ALL" : activityType.toUpperCase().trim();
            boolean includeSales = "ALL".equals(type) || "SALES".equals(type);
            boolean includeRegion = "ALL".equals(type) || "REGION".equals(type);

            StringBuilder sql = new StringBuilder();
            sql.append("WITH daily_activities AS ( ");

            if (includeSales) {
                sql.append("  SELECT sa.sf_owner_id AS owner_id, ");
                sql.append("         sa.planned_start_at::date AS d, ");
                sql.append("         1 AS planned, ");
                sql.append(
                        "         CASE WHEN (LOWER(BTRIM(sa.activity_status)) IN ('completed') OR BTRIM(sa.activity_status) IN ('완료')) THEN 1 ELSE 0 END AS completed ");
                sql.append("    FROM public.sales_activity sa ");
                sql.append("   WHERE sa.planned_start_at >= ? AND sa.planned_start_at < ? ");
            }

            if (includeSales && includeRegion) {
                sql.append("  UNION ALL ");
            }

            if (includeRegion) {
                sql.append("  SELECT rap.assignee_id AS owner_id, ");
                sql.append("         rap.planned_start_at::date AS d, ");
                sql.append("         1 AS planned, ");
                sql.append("         CASE WHEN rap.actual_start_at IS NOT NULL THEN 1 ELSE 0 END AS completed ");
                sql.append("    FROM public.region_activity_plan rap ");
                sql.append("   WHERE rap.planned_start_at >= ? AND rap.planned_start_at < ? ");
            }

            sql.append("), aggregated_daily AS ( ");
            sql.append("  SELECT owner_id, d, SUM(planned) AS planned, SUM(completed) AS completed ");
            sql.append("    FROM daily_activities ");
            sql.append("   GROUP BY owner_id, d ");
            sql.append(") ");

            sql.append("SELECT e.emp_id, e.assignee_id, e.emp_name, e.dept_name, ");
            sql.append("       ad.d, COALESCE(ad.planned, 0) AS planned, COALESCE(ad.completed, 0) AS completed ");
            sql.append("  FROM public.employee e ");
            sql.append(
                    "  JOIN aggregated_daily ad ON CAST(ad.owner_id AS TEXT) = CAST(e.assignee_id AS TEXT) ");
            sql.append(in == null ? "" : " WHERE e.dept_name IN " + in);
            sql.append(" ORDER BY e.emp_name, ad.d");

            java.util.List<Object> params = new java.util.ArrayList<>();
            if (includeSales) {
                params.add(java.sql.Date.valueOf(from));
                params.add(java.sql.Date.valueOf(to.plusDays(1)));
            }
            if (includeRegion) {
                params.add(java.sql.Date.valueOf(from));
                params.add(java.sql.Date.valueOf(to.plusDays(1)));
            }
            if (in != null)
                params.addAll(target);

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql.toString(), ps -> {
                for (int idx = 0; idx < params.size(); idx++) {
                    ps.setObject(idx + 1, params.get(idx));
                }
            }, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("empId", rs.getString(1));
                m.put("assigneeId", rs.getString(2));
                m.put("empName", rs.getString(3));
                m.put("deptName", rs.getString(4));
                m.put("date", rs.getString(5));
                m.put("planned", rs.getInt(6));
                m.put("completed", rs.getInt(7));
                return m;
            });

            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            log.error("Daily activity failed", e);
            return ResponseEntity.status(500)
                    .body(java.util.Map.of("error", "daily_activity_failed", "message", e.getMessage()));
        }
    }

    /**
     * AR Aging Analysis
     * GET /api/v1/dashboard/arrears?companyType=TNT
     */
    /**
     * Region-based Activity Analysis (for Map Display)
     * Returns activity counts grouped by addr_city_name (시/도)
     * GET /api/v1/dashboard/activity-by-region?year=2025&activityType=ALL
     */
    @GetMapping("/activity-by-region")
    public ResponseEntity<?> activityByRegion(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "month", required = false) Integer month,
            @RequestParam(value = "week", required = false) Integer week,
            @RequestParam(value = "activityType", required = false, defaultValue = "ALL") String activityType) {
        try {
            int targetYear = (year != null) ? year : LocalDate.now().getYear();

            String type = activityType == null ? "ALL" : activityType.toUpperCase().trim();
            boolean includeSales = "ALL".equals(type) || "SALES".equals(type);
            boolean includeRegion = "ALL".equals(type) || "REGION".equals(type);

            StringBuilder sql = new StringBuilder();
            // Join sales_activity.sf_account_id with customer.customer_id to get
            // addr_city_name
            // For region_activity_plan, join customer_seq with customer.customer_seq
            sql.append("WITH sales_activities AS ( ");

            if (includeSales) {
                sql.append("  SELECT c.addr_province_name AS city_name, ");
                sql.append("         c.addr_city_name AS province_name, ");
                sql.append("         1 AS planned, ");
                sql.append(
                        "         CASE WHEN (LOWER(TRIM(sa.activity_status)) IN ('completed') OR TRIM(sa.activity_status) IN ('완료')) THEN 1 ELSE 0 END AS completed ");
                sql.append("    FROM public.sales_activity sa ");
                sql.append("    LEFT JOIN public.customer c ON TRIM(sa.sf_account_id) = TRIM(c.customer_id) ");
                sql.append("   WHERE EXTRACT(YEAR FROM sa.planned_start_at) = ? ");
                if (month != null) {
                    sql.append("     AND EXTRACT(MONTH FROM sa.planned_start_at) = ").append(month).append(" ");
                }
                if (week != null) {
                    sql.append("     AND EXTRACT(WEEK FROM sa.planned_start_at) = ").append(week).append(" ");
                }
            }

            if (includeSales && includeRegion) {
                sql.append("  UNION ALL ");
            }

            if (includeRegion) {
                sql.append("  SELECT rap.addr_province_name AS city_name, ");
                sql.append("         rap.addr_district_name AS province_name, ");
                sql.append("         1 AS planned, ");
                sql.append("         CASE WHEN rap.actual_start_at IS NOT NULL THEN 1 ELSE 0 END AS completed ");
                sql.append("    FROM public.region_activity_plan rap ");
                sql.append("   WHERE EXTRACT(YEAR FROM rap.planned_start_at) = ? ");
                if (month != null) {
                    sql.append("     AND EXTRACT(MONTH FROM rap.planned_start_at) = ").append(month).append(" ");
                }
                if (week != null) {
                    sql.append("     AND EXTRACT(WEEK FROM rap.planned_start_at) = ").append(week).append(" ");
                }
            }

            sql.append(") ");
            sql.append("SELECT COALESCE(NULLIF(city_name, ''), NULLIF(province_name, '')) AS region, ");
            sql.append("       SUM(planned) AS total_count, ");
            sql.append("       SUM(completed) AS completed_count ");
            sql.append("  FROM sales_activities ");
            sql.append(
                    " WHERE COALESCE(NULLIF(city_name, ''), NULLIF(province_name, '')) IS NOT NULL ");
            sql.append(" GROUP BY COALESCE(NULLIF(city_name, ''), NULLIF(province_name, '')) ");
            sql.append(" ORDER BY SUM(completed) DESC ");

            java.util.List<Object> params = new java.util.ArrayList<>();
            if (includeSales)
                params.add(targetYear);
            if (includeRegion)
                params.add(targetYear);

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql.toString(), ps -> {
                for (int idx = 0; idx < params.size(); idx++) {
                    ps.setObject(idx + 1, params.get(idx));
                }
            }, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("region", rs.getString("region"));
                m.put("totalCount", rs.getInt("total_count"));
                m.put("completedCount", rs.getInt("completed_count"));
                return m;
            });

            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            log.error("Activity by region failed", e);
            return ResponseEntity.status(500)
                    .body(java.util.Map.of("error", "activity_by_region_failed", "message", e.getMessage()));
        }
    }

    @GetMapping("/arrears")
    public ResponseEntity<?> arrears(@RequestParam(value = "companyType", required = false) String companyType) {
        try {
            String tbl = "public.credit_ar_aging";
            String whereClause = " WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM " + tbl + ") ";

            if (companyType != null && !companyType.trim().isEmpty() && !"ALL".equalsIgnoreCase(companyType)) {
                whereClause += " AND company_type = '" + companyType.trim() + "' ";
            }

            String sql = "SELECT customer_name, dept_name, emp_name, total_ar, " +
                    "aging_0_30, aging_31_60, aging_61_90, aging_91_120, " +
                    "aging_121_150, aging_151_180, aging_181_210, aging_211_240, " +
                    "aging_241_270, aging_271_300, aging_301_330, aging_331_365, aging_over_365 " +
                    "FROM " + tbl + whereClause + " ORDER BY total_ar DESC";

            java.util.List<java.util.Map<String, Object>> rows = jdbc.query(sql, (rs, i) -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("customerName", rs.getString("customer_name"));
                m.put("deptName", rs.getString("dept_name"));
                m.put("empName", rs.getString("emp_name"));
                m.put("totalAr", rs.getBigDecimal("total_ar"));
                m.put("m1", rs.getBigDecimal("aging_0_30"));
                m.put("m2", rs.getBigDecimal("aging_31_60"));
                m.put("m3", rs.getBigDecimal("aging_61_90"));
                m.put("m4", rs.getBigDecimal("aging_91_120"));
                m.put("m5", rs.getBigDecimal("aging_121_150"));
                m.put("m6", rs.getBigDecimal("aging_151_180"));
                m.put("m7", rs.getBigDecimal("aging_181_210"));
                m.put("m8", rs.getBigDecimal("aging_211_240"));
                m.put("m9", rs.getBigDecimal("aging_241_270"));
                m.put("m10", rs.getBigDecimal("aging_271_300"));
                m.put("m11", rs.getBigDecimal("aging_301_330"));
                m.put("m12", rs.getBigDecimal("aging_331_365"));
                m.put("over12", rs.getBigDecimal("aging_over_365"));
                return m;
            });

            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] arrears failed: {}", ex.toString());
            return ResponseEntity.status(500).body(java.util.Map.of("error", "dashboard_arrears_failed"));
        }
    }
}
