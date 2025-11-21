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
    public ResponseEntity<?> salesSummary(@RequestParam(value = "date", required = false) String dateStr) {
        LocalDate d = null;
        try { d = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now(); } catch (Exception ignore) { d = LocalDate.now(); }
        int y = d.getYear();
        int m = d.getMonthValue();
        int day = d.getDayOfMonth();

        // Periods
        LocalDate prevYearStart = LocalDate.of(y - 1, 1, 1);
        LocalDate prevYearEndEx = LocalDate.of(y, 1, 1); // exclusive

        LocalDate prevYtdEnd = LocalDate.of(y - 1, Math.min(m, 12), Math.min(day, YearMonth.of(y - 1, m).lengthOfMonth()));
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
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String sql = "SELECT " +
                    " SUM( CASE WHEN "+dateExpr+" >= ? AND "+dateExpr+" < ? THEN COALESCE("+colAmt+",0) ELSE 0 END ) AS prev_year_total, " +
                    " SUM( CASE WHEN "+dateExpr+" >= ? AND "+dateExpr+" < ? THEN COALESCE("+colAmt+",0) ELSE 0 END ) AS prev_year_to_date, " +
                    " SUM( CASE WHEN "+dateExpr+" >= ? AND "+dateExpr+" < ? THEN COALESCE("+colAmt+",0) ELSE 0 END ) AS current_year_to_date, " +
                    " SUM( CASE WHEN "+dateExpr+" >= ? AND "+dateExpr+" < ? THEN COALESCE("+colAmt+",0) ELSE 0 END ) AS prev_year_month_total, " +
                    " SUM( CASE WHEN "+dateExpr+" >= ? AND "+dateExpr+" < ? THEN COALESCE("+colAmt+",0) ELSE 0 END ) AS prev_year_month_to_date, " +
                    " SUM( CASE WHEN "+dateExpr+" >= ? AND "+dateExpr+" < ? THEN COALESCE("+colAmt+",0) ELSE 0 END ) AS current_year_month_to_date " +
                    " FROM "+tbl;

            Object[] params = new Object[]{
                    java.sql.Date.valueOf(prevYearStart), java.sql.Date.valueOf(prevYearEndEx),
                    java.sql.Date.valueOf(prevYearStart), java.sql.Date.valueOf(prevYtdEndEx),
                    java.sql.Date.valueOf(curYearStart), java.sql.Date.valueOf(curYtdEndEx),
                    java.sql.Date.valueOf(prevMonStart), java.sql.Date.valueOf(prevMonEndEx),
                    java.sql.Date.valueOf(prevMonStart), java.sql.Date.valueOf(prevMonToDateEndEx),
                    java.sql.Date.valueOf(curMonStart), java.sql.Date.valueOf(curMonToDateEndEx)
            };

            Map<String, Object> out = jdbc.queryForObject(sql, params, (rs, i) -> {
                Map<String, Object> m2 = new LinkedHashMap<>();
                m2.put("prevYearTotal", rs.getBigDecimal(1) == null ? 0 : rs.getBigDecimal(1).doubleValue());
                m2.put("prevYearToDate", rs.getBigDecimal(2) == null ? 0 : rs.getBigDecimal(2).doubleValue());
                m2.put("currentYearToDate", rs.getBigDecimal(3) == null ? 0 : rs.getBigDecimal(3).doubleValue());
                m2.put("prevYearMonthTotal", rs.getBigDecimal(4) == null ? 0 : rs.getBigDecimal(4).doubleValue());
                m2.put("prevYearMonthToDate", rs.getBigDecimal(5) == null ? 0 : rs.getBigDecimal(5).doubleValue());
                m2.put("currentYearMonthToDate", rs.getBigDecimal(6) == null ? 0 : rs.getBigDecimal(6).doubleValue());
                return m2;
            });
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
                        "currentYearMonthToDate", 5678901
                ));
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
            if (name.isEmpty()) return ResponseEntity.ok(java.util.List.of());

            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colEmp = env.getProperty("app.invoice.columns.curr_emp_name", "curr_emp_name");
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");

            String sql = "SELECT coalesce(nullif(trim("+colUnit+"), ''), 'na') AS sales_mgmt_unit, " +
                    "SUM(COALESCE("+colAmt+",0))::double precision AS amount " +
                    "FROM "+tbl+" WHERE "+colEmp+" = ? GROUP BY 1 ORDER BY 2 DESC, 1 ASC";

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, new Object[]{ name }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("sales_mgmt_unit", rs.getString(1));
                m.put("amount", rs.getDouble(2));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] unit-amounts-by-emp failed: {}", ex.toString());
        }
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("sales_mgmt_unit", "UNIT-A", "amount", 1200000d),
                        java.util.Map.of("sales_mgmt_unit", "UNIT-B", "amount", 850000d)
                ));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","unit_amounts_by_emp_failed"));
    }

    /**
     * Average unit price by sales management unit for an employee's customers in a given year and company type.
     * Joins customer by assignee_id, filters invoice by year, groups by sales_mgmt_unit.
     * GET /api/v1/dashboard/avg-unit-price-by-emp?assigneeId=S01001&companyType=TNT&year=2025
     * Returns: [{ sales_mgmt_unit, avg_unit_price, total_amount, total_qty }]
     */
    @GetMapping("/avg-unit-price-by-emp")
    public ResponseEntity<?> avgUnitPriceByEmp(
            @RequestParam("assigneeId") String assigneeId,
            @RequestParam("companyType") String companyType,
            @RequestParam("year") int year
    ) {
        try {
            String aid = assigneeId == null ? "" : assigneeId.trim();
            String comp = companyType == null ? "" : companyType.trim();
            if (aid.isEmpty() || comp.isEmpty() || year <= 0) return ResponseEntity.ok(java.util.List.of());

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
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");

            String sql = "SELECT coalesce(nullif(trim(i."+colUnit+"), ''), 'na') AS sales_mgmt_unit, " +
                    "SUM(COALESCE(i."+colAmt+",0))::double precision AS total_amount, " +
                    "SUM(COALESCE(i."+colQty+",0))::double precision AS total_qty, " +
                    "CASE WHEN SUM(COALESCE(i."+colQty+",0)) > 0 THEN (SUM(COALESCE(i."+colAmt+",0)) / SUM(COALESCE(i."+colQty+",0))) ELSE 0 END AS avg_unit_price, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i."+colItemUnit+"), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i."+colItemUnit+"), ''), 'na')) AS item_unit, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i."+colItemStdUnit+"), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i."+colItemStdUnit+"), ''), 'na')) AS item_std_unit " +
                    "FROM "+invTbl+" i " +
                    "JOIN public.customer c ON CAST(i."+colCust+" AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                    "WHERE c.assignee_id = ? AND UPPER(c.company_type) = UPPER(?) AND EXTRACT(YEAR FROM "+dateExpr+") = ? " +
                    "GROUP BY 1 ORDER BY 1";

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setString(1, aid);
                ps.setString(2, comp);
                ps.setInt(3, year);
            }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
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
                        java.util.Map.of("sales_mgmt_unit", "UNIT-A", "total_amount", 1200000d, "total_qty", 300d, "avg_unit_price", 4000d),
                        java.util.Map.of("sales_mgmt_unit", "UNIT-B", "total_amount", 900000d, "total_qty", 450d, "avg_unit_price", 2000d)
                ));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","avg_unit_price_by_emp_failed"));
    }

    /**
     * Global average unit price by sales management unit (no assignee filter) for a year and company type.
     * GET /api/v1/dashboard/avg-unit-price?companyType=TNT&year=2025
     */
    @GetMapping("/avg-unit-price")
    public ResponseEntity<?> avgUnitPrice(
            @RequestParam("companyType") String companyType,
            @RequestParam("year") int year
    ) {
        try {
            String comp = companyType == null ? "" : companyType.trim();
            if (comp.isEmpty() || year <= 0) return ResponseEntity.ok(java.util.List.of());

            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colQty = env.getProperty("app.invoice.columns.std_qty",
                    env.getProperty("app.invoice.columns.qty", "std_qty"));
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String colItemUnit = env.getProperty("app.invoice.columns.item_unit", "item_unit");
            String colItemStdUnit = env.getProperty("app.invoice.columns.item_std_unit", "item_std_unit");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");

            String sql = "SELECT coalesce(nullif(trim(i."+colUnit+"), ''), 'na') AS sales_mgmt_unit, " +
                    "SUM(COALESCE(i."+colAmt+",0))::double precision AS total_amount, " +
                    "SUM(COALESCE(i."+colQty+",0))::double precision AS total_qty, " +
                    "CASE WHEN SUM(COALESCE(i."+colQty+",0)) > 0 THEN (SUM(COALESCE(i."+colAmt+",0)) / SUM(COALESCE(i."+colQty+",0))) ELSE 0 END AS avg_unit_price, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i."+colItemUnit+"), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i."+colItemUnit+"), ''), 'na')) AS item_unit, " +
                    "string_agg(DISTINCT coalesce(nullif(trim(i."+colItemStdUnit+"), ''), 'na'), ', ' ORDER BY coalesce(nullif(trim(i."+colItemStdUnit+"), ''), 'na')) AS item_std_unit " +
                    "FROM "+invTbl+" i " +
                    "JOIN public.customer c ON CAST(i."+colCust+" AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                    "WHERE UPPER(c.company_type) = UPPER(?) AND EXTRACT(YEAR FROM "+dateExpr+") = ? " +
                    "GROUP BY 1 ORDER BY 1";

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setString(1, comp);
                ps.setInt(2, year);
            }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
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
        return ResponseEntity.status(500).body(java.util.Map.of("error","avg_unit_price_failed"));
    }

    @GetMapping("/monthly")
    public ResponseEntity<?> monthly(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "until", required = false) String untilStr
    ) {
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
            } catch (Exception ignore) {}
        }
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String sql = "SELECT EXTRACT(MONTH FROM "+dateExpr+")::int AS m, " +
                    " SUM(COALESCE("+colAmt+",0))::double precision AS amount " +
                    " FROM "+tbl+" WHERE "+dateExpr+" >= ? AND "+dateExpr+" < ? GROUP BY 1 ORDER BY 1";
            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, new Object[]{ java.sql.Date.valueOf(start), java.sql.Date.valueOf(endExclusive) }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("month", rs.getInt(1));
                m.put("amount", rs.getDouble(2));
                return m;
            });
            // Fill missing months with 0
            double[] arr = new double[12];
            for (int i = 0; i < 12; i++) arr[i] = 0;
            for (var r : rows) {
                int m = ((Number) r.get("month")).intValue();
                double a = ((Number) r.get("amount")).doubleValue();
                if (m >= 1 && m <= 12) arr[m - 1] = a;
            }
            java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
            for (int i = 1; i <= 12; i++) {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("month", i);
                m.put("amount", arr[i-1]);
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("[Dashboard] monthly failed: {}", ex.toString());
        }
        // nodb sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
                for (int i=1;i<=12;i++) out.add(java.util.Map.of("month", i, "amount", (i*1000000)));
                return ResponseEntity.ok(out);
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","dashboard_monthly_failed"));
    }

    @GetMapping("/daily")
    public ResponseEntity<?> daily(
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam(value = "until", required = false) String untilStr
    ) {
        if (month < 1 || month > 12) month = 1;
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate endExclusive = start.plusMonths(1);
        if (untilStr != null && !untilStr.isBlank()) {
            try {
                LocalDate until = LocalDate.parse(untilStr);
                if (until.getYear() == year && until.getMonthValue() == month) {
                    endExclusive = until.plusDays(1);
                }
            } catch (Exception ignore) {}
        }
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String sql = "SELECT EXTRACT(DAY FROM "+dateExpr+")::int AS d, " +
                    " SUM(COALESCE("+colAmt+",0))::double precision AS amount " +
                    " FROM "+tbl+" WHERE "+dateExpr+" >= ? AND "+dateExpr+" < ? GROUP BY 1 ORDER BY 1";
            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, new Object[]{ java.sql.Date.valueOf(start), java.sql.Date.valueOf(endExclusive) }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("day", rs.getInt(1));
                m.put("amount", rs.getDouble(2));
                return m;
            });
            int days = java.time.YearMonth.of(year, month).lengthOfMonth();
            double[] arr = new double[days];
            for (int i=0;i<days;i++) arr[i] = 0;
            for (var r : rows) {
                int d = ((Number) r.get("day")).intValue();
                double a = ((Number) r.get("amount")).doubleValue();
                if (d>=1 && d<=days) arr[d-1] = a;
            }
            java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
            for (int i=1;i<=days;i++) {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("day", i);
                m.put("amount", arr[i-1]);
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("[Dashboard] daily failed: {}", ex.toString());
        }
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                int days = java.time.YearMonth.now().lengthOfMonth();
                java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
                for (int i=1;i<=days;i++) out.add(java.util.Map.of("day", i, "amount", (i*100000)));
                return ResponseEntity.ok(out);
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","dashboard_daily_failed"));
    }

    @GetMapping("/churn")
    public ResponseEntity<?> churn(@RequestParam(value = "date", required = false) String dateStr) {
        LocalDate d;
        try { d = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now(); } catch (Exception ex) { d = LocalDate.now(); }
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
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String custTbl = env.getProperty("app.customer.table", "public.customer");
            String custSeqCol = env.getProperty("app.customer.columns.customer_seq", "customer_seq");
            String custNameCol = env.getProperty("app.customer.columns.customer_name", "customer_name");

            String sql = "WITH prev AS (" +
                    "  SELECT "+colCust+", SUM(COALESCE("+colAmt+",0)) AS amt" +
                    "    FROM "+invTbl+" WHERE "+dateExpr+" >= ? AND "+dateExpr+" < ? GROUP BY "+colCust+"" +
                    "), cur AS (" +
                    "  SELECT "+colCust+", SUM(COALESCE("+colAmt+",0)) AS amt" +
                    "    FROM "+invTbl+" WHERE "+dateExpr+" >= ? AND "+dateExpr+" < ? GROUP BY "+colCust+"" +
                    ") SELECT p."+colCust+" AS customer_seq, c."+custNameCol+" AS customer_name, p.amt AS prev_amount" +
                    "  FROM prev p" +
                    "  LEFT JOIN cur ON cur."+colCust+" = p."+colCust+"" +
                    "  LEFT JOIN "+custTbl+" c ON c."+custSeqCol+" = p."+colCust+"" +
                    "  WHERE COALESCE(cur.amt,0) = 0" +
                    "  ORDER BY p.amt DESC NULLS LAST LIMIT 200";

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql,
                    new Object[]{ java.sql.Date.valueOf(prev5Start), java.sql.Date.valueOf(prev5EndEx),
                            java.sql.Date.valueOf(curYearStart), java.sql.Date.valueOf(curYtdEndEx)},
                    (rs, i) -> {
                        java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                        m.put("customerSeq", rs.getObject(1));
                        m.put("customerName", rs.getString(2));
                        m.put("prevAmount", rs.getBigDecimal(3) == null ? 0 : rs.getBigDecimal(3).doubleValue());
                        return m;
                    });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] churn failed: {}", ex.toString());
        }
        // nodb sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("customerSeq", 1001, "customerName", "한빛상사", "prevAmount", 123000000),
                        java.util.Map.of("customerSeq", 1002, "customerName", "강천상사", "prevAmount", 99000000)
                ));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","dashboard_churn_failed"));
    }

    @GetMapping("/newcustomers")
    public ResponseEntity<?> newCustomers(@RequestParam(value = "date", required = false) String dateStr) {
        LocalDate d;
        try { d = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now(); } catch (Exception ex) { d = LocalDate.now(); }
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
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String custTbl = env.getProperty("app.customer.table", "public.customer");
            String custSeqCol = env.getProperty("app.customer.columns.customer_seq", "customer_seq");
            String custNameCol = env.getProperty("app.customer.columns.customer_name", "customer_name");

            String sql = "WITH prev AS (" +
                    "  SELECT "+colCust+", SUM(COALESCE("+colAmt+",0)) AS amt" +
                    "    FROM "+invTbl+" WHERE "+dateExpr+" >= ? AND "+dateExpr+" < ? GROUP BY "+colCust+"" +
                    "), cur AS (" +
                    "  SELECT "+colCust+", SUM(COALESCE("+colAmt+",0)) AS amt" +
                    "    FROM "+invTbl+" WHERE "+dateExpr+" >= ? AND "+dateExpr+" < ? GROUP BY "+colCust+"" +
                    ") SELECT c."+custNameCol+" AS customer_name, cur.amt AS cur_amount, cur."+colCust+" AS customer_seq" +
                    "  FROM cur" +
                    "  LEFT JOIN prev ON prev."+colCust+" = cur."+colCust+"" +
                    "  LEFT JOIN "+custTbl+" c ON c."+custSeqCol+" = cur."+colCust+"" +
                    "  WHERE COALESCE(prev.amt,0) = 0 AND COALESCE(cur.amt,0) > 0" +
                    "  ORDER BY cur.amt DESC NULLS LAST LIMIT 200";

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql,
                    new Object[]{ java.sql.Date.valueOf(prev5Start), java.sql.Date.valueOf(prev5EndEx),
                            java.sql.Date.valueOf(curYearStart), java.sql.Date.valueOf(curYtdEndEx)},
                    (rs, i) -> {
                        java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                        m.put("customerName", rs.getString(1));
                        m.put("curAmount", rs.getBigDecimal(2) == null ? 0 : rs.getBigDecimal(2).doubleValue());
                        m.put("customerSeq", rs.getObject(3));
                        return m;
                    });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[Dashboard] newcustomers failed: {}", ex.toString());
        }
        // nodb sample
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("customerSeq", 2001, "customerName", "새싹상사", "curAmount", 150000000),
                        java.util.Map.of("customerSeq", 2002, "customerName", "신규트레이드", "curAmount", 88000000)
                ));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","dashboard_newcustomers_failed"));
    }
}
