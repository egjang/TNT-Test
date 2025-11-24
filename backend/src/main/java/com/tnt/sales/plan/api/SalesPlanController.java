package com.tnt.sales.plan.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/sales/plan")
public class SalesPlanController {
    private static final Logger log = LoggerFactory.getLogger(SalesPlanController.class);
    @Autowired JdbcTemplate jdbc;
    @Autowired Environment env;

    static class InitReq {
        public Integer year; // target year (e.g., 2026)
        public String companyType; // TNT | DYS
        public Double upliftPercent; // e.g., 10.0
        public Integer versionNo; // default 1
        public String assigneeId; // optional (can come from header)
    }

    /**
     * Totals of sales_plan amounts by company for a given year, preferring 'P' rows over 'B' when duplicated
     * for the same (customer_seq, assignee_id, sales_mgmt_unit).
     * GET /api/v1/sales/plan/totals?year=2026
     * Returns: [{ company: 'TNT', total: <double> }, { company: 'DYS', total: <double> }]
     */
    @GetMapping("/totals")
    public ResponseEntity<?> planTotals(@RequestParam("year") int year) {
        try {
            if (year <= 0) return ResponseEntity.badRequest().body(java.util.Map.of("error","invalid_args"));
            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            String sql;
            if (mssql) {
                sql = "WITH ranked AS (" +
                        " SELECT company_type, customer_seq, assignee_id, sales_mgmt_unit, " +
                        "        amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, " +
                        "        ROW_NUMBER() OVER (PARTITION BY customer_seq, assignee_id, sales_mgmt_unit ORDER BY CASE WHEN plan_type='P' THEN 2 ELSE 1 END DESC) AS rn " +
                        "   FROM "+tblPlan+" WHERE "+yearExpr+"=?" +
                        ") SELECT company_type, " +
                        " SUM(COALESCE(amount_01,0)+COALESCE(amount_02,0)+COALESCE(amount_03,0)+COALESCE(amount_04,0)+COALESCE(amount_05,0)+COALESCE(amount_06,0)+" +
                        "     COALESCE(amount_07,0)+COALESCE(amount_08,0)+COALESCE(amount_09,0)+COALESCE(amount_10,0)+COALESCE(amount_11,0)+COALESCE(amount_12,0)) AS total_amount " +
                        " FROM ranked WHERE rn=1 GROUP BY company_type ORDER BY company_type";
            } else {
                sql = "WITH ranked AS (" +
                        " SELECT company_type, customer_seq, assignee_id, sales_mgmt_unit, " +
                        "        amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, " +
                        "        ROW_NUMBER() OVER (PARTITION BY customer_seq, assignee_id, sales_mgmt_unit ORDER BY CASE WHEN plan_type='P' THEN 2 ELSE 1 END DESC) AS rn " +
                        "   FROM "+tblPlan+" WHERE "+yearExpr+"=?" +
                        ") SELECT company_type, " +
                        " SUM(COALESCE(amount_01,0)+COALESCE(amount_02,0)+COALESCE(amount_03,0)+COALESCE(amount_04,0)+COALESCE(amount_05,0)+COALESCE(amount_06,0)+" +
                        "     COALESCE(amount_07,0)+COALESCE(amount_08,0)+COALESCE(amount_09,0)+COALESCE(amount_10,0)+COALESCE(amount_11,0)+COALESCE(amount_12,0)) AS total_amount " +
                        " FROM ranked WHERE rn=1 GROUP BY company_type ORDER BY company_type";
            }

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setInt(1, year);
            }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("company", rs.getString(1));
                m.put("total", rs.getBigDecimal(2) == null ? 0 : rs.getBigDecimal(2).doubleValue());
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","plan_totals_failed","message", e.getMessage()));
        }
    }

    /**
     * Customer counts per employee by company type with stage breakdown.
     * GET /api/v1/sales/plan/customer-counts?year=2026&assigneeIds=S1,S2&empIds=E1,E2&companyTypes=TNT,DYS
     * - year: required
     * - assigneeIds: optional CSV of assignee_id
     * - empIds: optional CSV of emp_id (resolved to assignee_id via employee table; falls back to emp_id when mapping missing)
     * - companyTypes: optional CSV filter (e.g., TNT,DYS)
     * Returns rows: { assignee_id, emp_id, company, total_customers, confirmed_customers, planning_customers }
     */
    @GetMapping("/customer-counts")
    public ResponseEntity<?> customerCounts(@RequestParam("year") int year,
                                            @RequestParam(value = "assigneeIds", required = false) String assigneeIdsCsv,
                                            @RequestParam(value = "empIds", required = false) String empIdsCsv,
                                            @RequestParam(value = "companyTypes", required = false) String companyTypesCsv) {
        try {
            if (year <= 0) return ResponseEntity.badRequest().body(java.util.Map.of("error","invalid_args"));

            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(java.util.List.of()); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String tblEmp = env.getProperty("app.employee.table", mssql ? "dbo.employee" : "public.employee");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            // Parse CSVs
            java.util.Set<String> assigneeIds = new java.util.LinkedHashSet<>();
            if (assigneeIdsCsv != null && !assigneeIdsCsv.trim().isEmpty()) {
                for (String s : assigneeIdsCsv.split(",")) { if (s != null && !s.trim().isEmpty()) assigneeIds.add(s.trim()); }
            }
            java.util.Set<String> empIds = new java.util.LinkedHashSet<>();
            if (empIdsCsv != null && !empIdsCsv.trim().isEmpty()) {
                for (String s : empIdsCsv.split(",")) { if (s != null && !s.trim().isEmpty()) empIds.add(s.trim()); }
            }
            java.util.Set<String> companyTypes = new java.util.LinkedHashSet<>();
            if (companyTypesCsv != null && !companyTypesCsv.trim().isEmpty()) {
                for (String s : companyTypesCsv.split(",")) { if (s != null && !s.trim().isEmpty()) companyTypes.add(s.trim().toUpperCase()); }
            }

            // Resolve empId -> assigneeId mappings
            java.util.Map<String,String> empToAssignee = new java.util.LinkedHashMap<>();
            if (!empIds.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                sb.append("SELECT emp_id, assignee_id FROM ").append(tblEmp).append(" WHERE emp_id IN (");
                int i=0; for (int k=0;k<empIds.size();k++) { if (k>0) sb.append(','); sb.append('?'); }
                sb.append(')');
                java.util.List<Object> params = new java.util.ArrayList<>();
                for (String id : empIds) params.add(id);
                try {
                    jdbc.query(sb.toString(), ps -> {
                        for (int idx = 0; idx < params.size(); idx++) {
                            ps.setObject(idx + 1, params.get(idx));
                        }
                    }, (rs, idx) -> {
                        String emp = rs.getString(1);
                        String asg = rs.getString(2);
                        if (emp != null && !emp.isBlank()) empToAssignee.put(emp.trim(), (asg == null ? "" : asg.trim()));
                        return null;
                    });
                } catch (Exception ignore) {}
                // Fallback: when no mapping, assume empId == assigneeId
                for (String e : empIds) { if (!empToAssignee.containsKey(e)) empToAssignee.put(e, e); }
            }
            assigneeIds.addAll(empToAssignee.values());

            if (assigneeIds.isEmpty()) {
                // Without assignee filter, return empty to avoid heavy full-scan
                return ResponseEntity.ok(java.util.List.of());
            }

            // Build SQL with dynamic IN clauses
            StringBuilder base = new StringBuilder();
            base.append("WITH base AS (\n")
                .append(" SELECT assignee_id, customer_seq, UPPER(company_type) AS comp, \n")
                .append("   MIN(CASE COALESCE(target_stage,'') WHEN 'C' THEN 4 WHEN 'P' THEN 3 WHEN 'I' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) AS min_rank, \n")
                .append("   MAX(CASE COALESCE(target_stage,'') WHEN 'C' THEN 4 WHEN 'P' THEN 3 WHEN 'I' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) AS max_rank \n")
                .append(" FROM ").append(tblPlan)
                .append(" WHERE ").append(yearExpr).append("=? ")
                .append("   AND assignee_id IN (");
            int nAsg = assigneeIds.size();
            for (int k=0;k<nAsg;k++) { if (k>0) base.append(','); base.append('?'); }
            base.append(") ");
            if (!companyTypes.isEmpty()) {
                base.append(" AND UPPER(company_type) IN (");
                int nComp = companyTypes.size();
                for (int k=0;k<nComp;k++) { if (k>0) base.append(','); base.append('?'); }
                base.append(") ");
            }
            base.append(" GROUP BY assignee_id, customer_seq, UPPER(company_type)\n")
                .append(") SELECT b.assignee_id, e.emp_id, b.comp AS company, \n")
                .append(" COUNT(*) AS total_customers, \n")
                .append(" SUM(CASE WHEN b.min_rank=4 THEN 1 ELSE 0 END) AS confirmed_customers, \n")
                .append(" SUM(CASE WHEN b.min_rank=4 THEN 0 ELSE 1 END) AS planning_customers \n")
                .append(" FROM base b LEFT JOIN ").append(tblEmp).append(" e ON e.assignee_id = b.assignee_id \n")
                .append(" GROUP BY b.assignee_id, e.emp_id, b.comp \n")
                .append(" ORDER BY b.assignee_id, b.comp");

            java.util.List<Object> ps = new java.util.ArrayList<>();
            ps.add(year);
            for (String a : assigneeIds) ps.add(a);
            if (!companyTypes.isEmpty()) for (String c : companyTypes) ps.add(c);

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(base.toString(), pss -> {
                for (int idx = 0; idx < ps.size(); idx++) {
                    pss.setObject(idx + 1, ps.get(idx));
                }
            }, (rs, idx) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("assignee_id", rs.getString(1));
                m.put("emp_id", rs.getString(2));
                m.put("company", rs.getString(3));
                m.put("total_customers", rs.getInt(4));
                m.put("confirmed_customers", rs.getInt(5));
                m.put("planning_customers", rs.getInt(6));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","customer_counts_failed","message", e.getMessage()));
        }
    }

    /**
     * Overall customer counts (distinct customers across all company types) for a single assignee/year.
     * GET /api/v1/sales/plan/customer-counts-overall?year=2026&assigneeId=S01001&empId=E001
     * Returns: { total_customers, confirmed_customers, inprogress_customers }
     * - confirmed: all plan rows for the customer have stage C (min_rank=4)
     * - in-progress: not confirmed (total - confirmed)
     */
    @GetMapping("/customer-counts-overall")
    public ResponseEntity<?> customerCountsOverall(@RequestParam("year") int year,
                                                   @RequestParam(value = "assigneeId", required = false) String assigneeId,
                                                   @RequestParam(value = "empId", required = false) String empId) {
        try {
            if (year <= 0) return ResponseEntity.badRequest().body(java.util.Map.of("error","invalid_args"));
            // Resolve assigneeId from empId if missing
            String aid = assigneeId == null ? "" : assigneeId.trim();
            String eid = empId == null ? "" : empId.trim();
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid;
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty()) return ResponseEntity.ok(java.util.Map.of("total_customers", 0, "confirmed_customers", 0, "inprogress_customers", 0));

            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(java.util.Map.of("total_customers", 0, "confirmed_customers", 0, "inprogress_customers", 0)); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String tblEmp = env.getProperty("app.employee.table", mssql ? "dbo.employee" : "public.employee");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            final String aidFinal = aid;

            String sql = "WITH base AS (" +
                    " SELECT assignee_id, customer_seq, " +
                    "   MIN(CASE COALESCE(target_stage,'') WHEN 'C' THEN 4 WHEN 'P' THEN 3 WHEN 'I' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) AS min_rank " +
                    " FROM " + tblPlan + " WHERE " + yearExpr + "=? AND assignee_id=? " +
                    " GROUP BY assignee_id, customer_seq" +
                    ") SELECT COUNT(*) AS total_customers, " +
                    " SUM(CASE WHEN min_rank=4 THEN 1 ELSE 0 END) AS confirmed_customers, " +
                    " SUM(CASE WHEN min_rank=4 THEN 0 ELSE 1 END) AS inprogress_customers " +
                    " FROM base";

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setInt(1, year);
                ps.setString(2, aidFinal);
            }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("total_customers", rs.getInt(1));
                m.put("confirmed_customers", rs.getInt(2));
                m.put("inprogress_customers", rs.getInt(3));
                return m;
            });
            java.util.Map<String,Object> ret = (rows == null || rows.isEmpty())
                    ? java.util.Map.of("total_customers", 0, "confirmed_customers", 0, "inprogress_customers", 0)
                    : rows.get(0);
            return ResponseEntity.ok(ret);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","customer_counts_overall_failed","message", e.getMessage()));
        }
    }

    static class UpsertRowReq {
        public Integer year;
        public String companyType;
        public String assigneeId;
        public Long customerSeq;
        public String itemSubcategory;
        public String salesMgmtUnit;
        public Double[] qty; // length 12, allow 2-decimals
        public Double[] amount; // optional client-provided amounts (length 12)
        public Integer versionNo; // optional, default 1
    }

    static class ConfirmCustomerReq {
        public Integer year;
        public String companyType; // optional filter (TNT|DYS)
        public String assigneeId;  // or resolve via empId
        public String empId;       // optional
        public Long customerSeq;
    }

    /**
     * Monthly quantities for a single customer in sales_plan.
     * Filters by year + assigneeId (or empId-resolved) + customerSeq, optional companyType.
     * Sums qty_01..qty_12 across matching rows (plan_type='B'). Also returns a representative target_stage (C>P>I>B).
     * Response: { qty: [q1..q12], target_stage: 'C'|'P'|'I'|'B'|null }
     */
    @GetMapping("/customer-monthly")
    public ResponseEntity<?> customerMonthly(@RequestParam("year") int year,
                                             @RequestParam("customerSeq") long customerSeq,
                                             @RequestParam(value = "companyType", required = false) String companyType,
                                             @RequestParam(value = "assigneeId", required = false) String assigneeId,
                                             @RequestParam(value = "empId", required = false) String empId) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim() : "";
            String eid = (empId != null && !empId.isBlank()) ? empId.trim() : "";
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback empId==assigneeId
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty() || year <= 0 || customerSeq <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(Map.of("qty", new int[12], "target_stage", null)); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT ")
               .append("COALESCE(SUM(qty_01),0), COALESCE(SUM(qty_02),0), COALESCE(SUM(qty_03),0), COALESCE(SUM(qty_04),0), ")
               .append("COALESCE(SUM(qty_05),0), COALESCE(SUM(qty_06),0), COALESCE(SUM(qty_07),0), COALESCE(SUM(qty_08),0), ")
               .append("COALESCE(SUM(qty_09),0), COALESCE(SUM(qty_10),0), COALESCE(SUM(qty_11),0), COALESCE(SUM(qty_12),0), ")
               .append("CASE MAX(CASE COALESCE(target_stage,'') WHEN 'C' THEN 4 WHEN 'P' THEN 3 WHEN 'I' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) ")
               .append(" WHEN 4 THEN 'C' WHEN 3 THEN 'P' WHEN 2 THEN 'I' WHEN 1 THEN 'B' ELSE NULL END AS stage ")
               .append("FROM ").append(tblPlan)
               .append(" WHERE ").append(yearExpr).append("=? AND assignee_id=? AND customer_seq=?");
            if (companyType != null && !companyType.isBlank()) {
                sql.append(" AND UPPER(company_type)=UPPER(?)");
            }

            final String comp = (companyType == null ? null : companyType.trim());
            final String aidFinal = aid;
            final long customerSeqFinal = customerSeq;
            List<Map<String,Object>> rows = jdbc.query(sql.toString(), ps -> {
                ps.setInt(1, year);
                ps.setString(2, aidFinal);
                ps.setLong(3, customerSeqFinal);
                if (comp != null && !comp.isEmpty()) ps.setString(4, comp);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                int[] q = new int[12];
                for (int k=0;k<12;k++) q[k] = rs.getInt(1+k);
                m.put("qty", q);
                m.put("target_stage", rs.getString(13));
                return m;
            });
            if (rows.isEmpty()) return ResponseEntity.ok(Map.of("qty", new int[12], "target_stage", null));
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","customer_monthly_failed","message", e.getMessage()));
        }
    }

    /**
     * Monthly quantities by subcategory/unit for a single customer in sales_plan.
     * Filters by year + assigneeId (or empId-resolved) + customerSeq + companyType, plan_type='B'.
     * Returns rows: { item_subcategory, sales_mgmt_unit, qty_01..qty_12 }
     */
    @GetMapping("/customer-monthly-rows")
    public ResponseEntity<?> customerMonthlyRows(@RequestParam("year") int year,
                                                 @RequestParam("customerSeq") long customerSeq,
                                                 @RequestParam("companyType") String companyType,
                                                 @RequestParam(value = "assigneeId", required = false) String assigneeId,
                                                 @RequestParam(value = "empId", required = false) String empId) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim() : "";
            String eid = (empId != null && !empId.isBlank()) ? empId.trim() : "";
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback empId==assigneeId
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty() || year <= 0 || customerSeq <= 0 || companyType == null || companyType.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(List.of()); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            // Prefer plan_type='P'; if none exist for (sub,unit), use 'B'.
            String cond = yearExpr + "=? AND assignee_id=? AND customer_seq=? AND UPPER(company_type)=UPPER(?)";
            String sql = "WITH p AS (" +
                    " SELECT coalesce(item_subcategory,'') AS sub, coalesce(sales_mgmt_unit,'') AS unit, 1 AS src, " +
                    " qty_01, qty_02, qty_03, qty_04, qty_05, qty_06, qty_07, qty_08, qty_09, qty_10, qty_11, qty_12, " +
                    " amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, " +
                    " target_stage " +
                    " FROM " + tblPlan + " WHERE " + cond + " AND plan_type='P'" +
                    "), b AS (" +
                    " SELECT coalesce(item_subcategory,'') AS sub, coalesce(sales_mgmt_unit,'') AS unit, 0 AS src, " +
                    " qty_01, qty_02, qty_03, qty_04, qty_05, qty_06, qty_07, qty_08, qty_09, qty_10, qty_11, qty_12, " +
                    " amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, " +
                    " target_stage " +
                    " FROM " + tblPlan + " t WHERE " + cond + " AND plan_type='B' AND NOT EXISTS (" +
                    "   SELECT 1 FROM " + tblPlan + " p2 WHERE " + cond + " AND plan_type='P' " +
                    "     AND coalesce(p2.item_subcategory,'') = coalesce(t.item_subcategory,'') " +
                    "     AND coalesce(p2.sales_mgmt_unit,'') = coalesce(t.sales_mgmt_unit,'')" +
                    ") ) " +
                    "SELECT sub, unit, MAX(src) AS src, " +
                    "COALESCE(SUM(qty_01),0), COALESCE(SUM(qty_02),0), COALESCE(SUM(qty_03),0), COALESCE(SUM(qty_04),0), " +
                    "COALESCE(SUM(qty_05),0), COALESCE(SUM(qty_06),0), COALESCE(SUM(qty_07),0), COALESCE(SUM(qty_08),0), " +
                    "COALESCE(SUM(qty_09),0), COALESCE(SUM(qty_10),0), COALESCE(SUM(qty_11),0), COALESCE(SUM(qty_12),0), " +
                    "COALESCE(SUM(amount_01),0), COALESCE(SUM(amount_02),0), COALESCE(SUM(amount_03),0), COALESCE(SUM(amount_04),0), " +
                    "COALESCE(SUM(amount_05),0), COALESCE(SUM(amount_06),0), COALESCE(SUM(amount_07),0), COALESCE(SUM(amount_08),0), " +
                    "COALESCE(SUM(amount_09),0), COALESCE(SUM(amount_10),0), COALESCE(SUM(amount_11),0), COALESCE(SUM(amount_12),0), " +
                    "CASE MAX(CASE COALESCE(target_stage,'') WHEN 'C' THEN 4 WHEN 'P' THEN 3 WHEN 'I' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) " +
                    " WHEN 4 THEN 'C' WHEN 3 THEN 'P' WHEN 2 THEN 'I' WHEN 1 THEN 'B' ELSE NULL END AS target_stage " +
                    "FROM (SELECT * FROM p UNION ALL SELECT * FROM b) u GROUP BY sub, unit ORDER BY sub, unit";
            final String aidFinal = aid;
            final long customerSeqFinal = customerSeq;
            final String compFinal = companyType.trim();
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                int idx=1;
                // p
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal); ps.setLong(idx++, customerSeqFinal); ps.setString(idx++, compFinal);
                // b main
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal); ps.setLong(idx++, customerSeqFinal); ps.setString(idx++, compFinal);
                // NOT EXISTS p2
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal); ps.setLong(idx++, customerSeqFinal); ps.setString(idx++, compFinal);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("item_subcategory", rs.getString(1));
                m.put("sales_mgmt_unit", rs.getString(2));
                int src = rs.getInt(3);
                m.put("plan_type", src >= 1 ? "P" : "B");
                for (int k=0;k<12;k++) m.put("qty_"+String.format("%02d", k+1), rs.getBigDecimal(4+k));
                for (int k=0;k<12;k++) m.put("amount_"+String.format("%02d", k+1), rs.getBigDecimal(16+k));
                m.put("target_stage", rs.getString(28));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","customer_monthly_rows_failed","message", e.getMessage()));
        }
    }
    @PostMapping("/init")
    public ResponseEntity<?> init(@RequestBody InitReq body,
                                  @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
                                  @RequestHeader(value = "X-EMP-SEQ", required = false) String empSeqHeader,
                                  @RequestHeader(value = "X-EMP-ID", required = false) String empIdHeader,
                                  @RequestHeader(value = "X-Debug", required = false) String debugHeader) {
        try {
            boolean debug = debugHeader != null && "true".equalsIgnoreCase(debugHeader.trim());
            int year = body != null && body.year != null ? body.year : 0;
            String companyType = body != null ? (body.companyType == null ? "" : body.companyType.trim()) : "";
            double uplift = body != null && body.upliftPercent != null ? body.upliftPercent : 10.0;
            int versionNo = body != null && body.versionNo != null && body.versionNo > 0 ? body.versionNo : 1;
            String assigneeId = (body != null && body.assigneeId != null && !body.assigneeId.trim().isEmpty())
                    ? body.assigneeId.trim() : (assigneeHeader == null ? "" : assigneeHeader.trim());
            String assigneeSource = (body != null && body.assigneeId != null && !body.assigneeId.trim().isEmpty()) ? "body.assigneeId"
                    : ((assigneeHeader != null && !assigneeHeader.trim().isEmpty()) ? "X-ASSIGNEE-ID" : "");
            // Defaults for missing args (to be tolerant for GET calls without params)
            if (year <= 0) year = java.time.LocalDate.now().getYear();
            if (companyType.isEmpty()) companyType = "TNT";
            // Resolve assignee_id via employee when not provided (emp_id only; emp_seq path excluded per requirement)
            if (assigneeId.isEmpty()) {
                try {
                    if (assigneeId.isEmpty() && empIdHeader != null && !empIdHeader.isBlank()) {
                        String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, empIdHeader.trim());
                        if (resolved != null && !resolved.isBlank()) { assigneeId = resolved.trim(); assigneeSource = "X-EMP-ID→lookup"; }
                    }
                } catch (Exception ignore) {}
                // Fallback: some environments use emp_id == assignee_id
                if (assigneeId.isEmpty() && empIdHeader != null && !empIdHeader.isBlank()) {
                    assigneeId = empIdHeader.trim();
                    if (assigneeSource.isEmpty()) assigneeSource = "X-EMP-ID(fallback)";
                }
            }
            if (assigneeId.isEmpty()) {
                Map<String,Object> dbg = Map.of(
                        "year", year,
                        "companyType", companyType,
                        "assigneeId", assigneeId,
                        "assigneeSource", assigneeSource,
                        "empIdHeader", empIdHeader,
                        "assigneeHeader", assigneeHeader
                );
                return ResponseEntity.badRequest().body(Map.of("error","invalid_args","message","assigneeId required","debug", dbg));
            }
            // nodb stub
            for (String p : env.getActiveProfiles()) {
                if ("nodb".equalsIgnoreCase(p)) {
                    return ResponseEntity.ok(Map.of("ok", true, "count", 0));
                }
            }

            int prev = Math.max(1, year - 1);

            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colQty = env.getProperty("app.invoice.columns.std_qty",
                    env.getProperty("app.invoice.columns.qty", "std_qty"));
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String colSub = env.getProperty("app.invoice.columns.item_subcategory", "item_subcategory");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String unitExpr;
            String subMinExpr;
            String qtySumExpr = "SUM(COALESCE(i."+colQty+",0))";
            String yearExpr;
            if (mssql) {
                unitExpr = "COALESCE(NULLIF(LTRIM(RTRIM(i."+colUnit+")), ''), 'na')";
                subMinExpr = "COALESCE(MIN(NULLIF(LTRIM(RTRIM(i."+colSub+")), '')), 'na')";
                if (dateIsText) {
                    yearExpr = "CAST(LEFT(i."+colDate+",4) AS INT)";
                } else {
                    yearExpr = "YEAR(i."+colDate+")";
                }
            } else {
                unitExpr = "coalesce(nullif(trim(i."+colUnit+"), ''), 'na')";
                subMinExpr = "coalesce(MIN(NULLIF(trim(i."+colSub+"), '')), 'na')";
                if (dateIsText) {
                    yearExpr = "CAST(substring(i."+colDate+" from 1 for 4) AS int)";
                } else {
                    yearExpr = "EXTRACT(YEAR FROM i."+colDate+")";
                }
            }

            // Determine company types to process: always include any existing for this assignee (TNT/DYS), plus requested companyType if present
            Set<String> companies = new LinkedHashSet<>();
            try {
                final String assigneeIdForCompanies = assigneeId;
                List<String> found = jdbc.query("SELECT UPPER(COALESCE(company_type,'')) FROM public.customer WHERE assignee_id=? GROUP BY 1",
                        ps -> ps.setString(1, assigneeIdForCompanies), (rs, i) -> rs.getString(1));
                for (String s : found) {
                    if ("TNT".equalsIgnoreCase(s) || "DYS".equalsIgnoreCase(s)) companies.add(s.toUpperCase());
                }
            } catch (Exception ignore) {}
            if (companyType != null && !companyType.isBlank()) companies.add(companyType.toUpperCase());
            if (companies.isEmpty()) companies.add("TNT"); // fallback

            int totalUpserts = 0;
            for (String comp : companies) {
                final String assigneeIdFinalForQuery = assigneeId;
                final String companyTypeFinalForQuery = comp;
                StringBuilder sql = new StringBuilder();
                sql.append("SELECT c.customer_seq, MIN(c.customer_name) AS customer_name, ")
                   .append(unitExpr).append(" AS sales_mgmt_unit, ")
                   .append(subMinExpr).append(" AS item_subcategory, ")
                   .append(qtySumExpr).append(" AS qty_sum ")
                   .append("FROM public.customer c ")
                   .append("JOIN ").append(invTbl).append(" i ON CAST(i.").append(colCust).append(" AS TEXT) = CAST(c.customer_seq AS TEXT) ")
                   .append("WHERE c.assignee_id = ? AND UPPER(c.company_type) = UPPER(?) AND ")
                   .append(yearExpr).append(" = ? ")
                   .append("GROUP BY c.customer_seq, ").append(unitExpr).append(" ")
                   .append("ORDER BY c.customer_seq, 2");

                List<Map<String,Object>> rows = jdbc.query(sql.toString(), ps -> {
                    ps.setString(1, assigneeIdFinalForQuery);
                    ps.setString(2, companyTypeFinalForQuery);
                    ps.setInt(3, prev);
                }, (rs, i) -> {
                    Map<String,Object> m = new LinkedHashMap<>();
                    m.put("customer_seq", rs.getLong(1));
                    m.put("customer_name", rs.getString(2));
                    m.put("sales_mgmt_unit", rs.getString(3));
                    m.put("item_subcategory", rs.getString(4));
                    m.put("qty_sum", rs.getDouble(5));
                    return m;
                });

                // Average unit price map for previous year by sales_mgmt_unit
                Map<String, Double> avgUnitPriceMap = new LinkedHashMap<>();
                try {
                    String invTbl2 = env.getProperty("app.invoice.table", "public.invoice");
                    String colCust2 = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
                    String colDate2 = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
                    String colAmt2 = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
                    String colQty2 = env.getProperty("app.invoice.columns.std_qty",
                            env.getProperty("app.invoice.columns.qty", "std_qty"));
                    String colUnit2 = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
                    boolean dateIsText2 = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
                    String dateFmt2 = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
                    String dateExpr2 = dateIsText2 ? ("to_date(" + colDate2 + ", '" + dateFmt2 + "')") : (colDate2 + "::date");

                    String sqlAvg = "SELECT coalesce(nullif(trim(i."+colUnit2+"), ''), 'na') AS sales_mgmt_unit, " +
                            "CASE WHEN SUM(COALESCE(i."+colQty2+",0)) > 0 THEN (SUM(COALESCE(i."+colAmt2+",0)) / SUM(COALESCE(i."+colQty2+",0))) ELSE 0 END AS avg_unit_price " +
                            "FROM "+invTbl2+" i " +
                            "JOIN public.customer c ON CAST(i."+colCust2+" AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                            "WHERE c.assignee_id = ? AND UPPER(c.company_type) = UPPER(?) AND EXTRACT(YEAR FROM "+dateExpr2+") = ? " +
                            "GROUP BY 1";
                    List<Map<String,Object>> avgRows = jdbc.query(sqlAvg, ps -> {
                        ps.setString(1, assigneeIdFinalForQuery);
                        ps.setString(2, companyTypeFinalForQuery);
                        ps.setInt(3, prev);
                    }, (rs, i) -> {
                        Map<String,Object> m = new LinkedHashMap<>();
                        m.put("sales_mgmt_unit", rs.getString(1));
                        m.put("avg_unit_price", rs.getDouble(2));
                        return m;
                    });
                    for (Map<String,Object> r2 : avgRows) {
                        String k = String.valueOf(r2.get("sales_mgmt_unit"));
                        double v = 0d; try { v = Double.parseDouble(String.valueOf(r2.get("avg_unit_price"))); } catch (Exception ignore) {}
                        avgUnitPriceMap.put(k, v);
                    }
                } catch (Exception ignore) {}

            // Upsert into sales_plan
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            // Resolve metadata for auditing
            // created_by / updated_by: numeric(15,0) from assignee_id (digits only)
            BigDecimal assigneeNumeric = null;
            try {
                String digits = assigneeId == null ? "" : assigneeId.replaceAll("\\D+", "");
                if (!digits.isEmpty()) assigneeNumeric = new BigDecimal(digits);
            } catch (Exception ignore) { assigneeNumeric = null; }
            // emp_name: login user name — prefer lookup via empId, fallback via assigneeId
            String empNameVal = null;
            try {
                if (empIdHeader != null && !empIdHeader.isBlank()) {
                    empNameVal = jdbc.queryForObject("SELECT emp_name FROM public.employee WHERE emp_id = ? LIMIT 1", String.class, empIdHeader.trim());
                }
            } catch (Exception ignore) {}
            if (empNameVal == null || empNameVal.isBlank()) {
                try {
                    if (assigneeId != null && !assigneeId.isBlank()) {
                        empNameVal = jdbc.queryForObject("SELECT emp_name FROM public.employee WHERE assignee_id = ? LIMIT 1", String.class, assigneeId.trim());
                    }
                } catch (Exception ignore) {}
            }
            // Freeze values for lambda usage
            final BigDecimal assigneeNumericFinal = assigneeNumeric;
            final String empNameValFinal = (empNameVal != null && !empNameVal.isBlank()) ? empNameVal : null;
            Date ty = Date.valueOf(LocalDate.of(year, 1, 1));
            for (Map<String,Object> r : rows) {
                long custSeq = ((Number)r.get("customer_seq")).longValue();
                String custName = String.valueOf(r.get("customer_name"));
                String unit = String.valueOf(r.get("sales_mgmt_unit"));
                String sub = String.valueOf(r.get("item_subcategory"));
                double qtySum = 0d; try { qtySum = Double.parseDouble(String.valueOf(r.get("qty_sum"))); } catch (Exception ignore) {}
                if (qtySum <= 0d) continue;

                // Compute total with 2-decimal precision
                java.math.BigDecimal totalQty = java.math.BigDecimal.valueOf(qtySum)
                        .multiply(java.math.BigDecimal.valueOf(1.0 + (uplift/100.0)))
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                java.math.BigDecimal[] monthsDec = distributeDecimal(totalQty, 12);

                final java.math.BigDecimal[] monthsArr = monthsDec;
                final long custSeqFinal = custSeq;
                final String unitFinal = unit;
                final String subFinal = sub;
                final String custNameFinal = custName;
                final Date tyFinal = ty;
                final String companyTypeFinal = comp;
                final String assigneeIdFinal = assigneeId;
                final int versionNoFinal = versionNo;

                // compute monthly amounts using prev year's avg unit price
                double unitPrice = 0d; try { unitPrice = avgUnitPriceMap.getOrDefault(unit, 0d); } catch (Exception ignore) {}
                java.math.BigDecimal unitPriceBD = java.math.BigDecimal.valueOf(unitPrice).setScale(2, java.math.RoundingMode.HALF_UP);
                java.math.BigDecimal[] amounts = new java.math.BigDecimal[12];
                for (int i=0;i<12;i++) {
                    amounts[i] = monthsArr[i].multiply(unitPriceBD).setScale(2, java.math.RoundingMode.HALF_UP);
                }

                int updated = jdbc.update(
                        "UPDATE "+tblPlan+" SET updated_at=now(), updated_by=?, " +
                                "plan_type='B', target_stage='I', assignee_id=?, item_subcategory=?, sales_mgmt_unit=?, "+
                                "qty_01=?, qty_02=?, qty_03=?, qty_04=?, qty_05=?, qty_06=?, qty_07=?, qty_08=?, qty_09=?, qty_10=?, qty_11=?, qty_12=?, "+
                                "amount_01=?, amount_02=?, amount_03=?, amount_04=?, amount_05=?, amount_06=?, amount_07=?, amount_08=?, amount_09=?, amount_10=?, amount_11=?, amount_12=? " +
                                "WHERE target_year=? AND company_type=? AND plan_type='B' AND customer_seq=? AND item_subcategory=? AND sales_mgmt_unit=? AND COALESCE(version_no,1)=?",
                        ps -> {
                            // updated_by is VARCHAR(20) on sales_plan
                            ps.setString(1, assigneeIdFinal);
                            ps.setString(2, assigneeIdFinal);
                            ps.setString(3, subFinal);
                            ps.setString(4, unitFinal);
                            for (int i=0;i<12;i++) ps.setBigDecimal(5+i, monthsArr[i]);
                            for (int i=0;i<12;i++) ps.setBigDecimal(17+i, amounts[i]);
                            ps.setDate(29, tyFinal);
                            ps.setString(30, companyTypeFinal);
                            ps.setLong(31, custSeqFinal);
                            ps.setString(32, subFinal);
                            ps.setString(33, unitFinal);
                            ps.setInt(34, versionNoFinal);
                        }
                );
                if (updated == 0) {
                    jdbc.update(
                            "INSERT INTO "+tblPlan+" (created_at, updated_at, target_year, company_type, plan_type, customer_seq, customer_name, assignee_id, emp_name, item_subcategory_seq, sales_mgmt_unit_seq, item_subcategory, sales_mgmt_unit, target_stage, "+
                                    "qty_01, qty_02, qty_03, qty_04, qty_05, qty_06, qty_07, qty_08, qty_09, qty_10, qty_11, qty_12, "+
                                    "amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, version_no, created_by, updated_by) "+
                                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            ps -> {
                                ps.setTimestamp(1, new java.sql.Timestamp(System.currentTimeMillis()));
                                ps.setTimestamp(2, new java.sql.Timestamp(System.currentTimeMillis()));
                                ps.setDate(3, tyFinal);
                                ps.setString(4, companyTypeFinal);
                                ps.setString(5, "B");
                                ps.setLong(6, custSeqFinal);
                                ps.setString(7, custNameFinal);
                                ps.setString(8, assigneeIdFinal);
                                if (empNameValFinal == null) ps.setObject(9, null); else ps.setString(9, empNameValFinal);
                                ps.setObject(10, null); // item_subcategory_seq unknown
                                ps.setObject(11, null); // sales_mgmt_unit_seq unknown
                                ps.setString(12, subFinal);
                                ps.setString(13, unitFinal);
                                ps.setString(14, "I");
                                for (int i=0;i<12;i++) ps.setBigDecimal(15+i, monthsArr[i]);
                                for (int i=0;i<12;i++) ps.setBigDecimal(27+i, amounts[i]);
                                ps.setInt(39, versionNoFinal);
                                ps.setString(40, assigneeIdFinal);
                                ps.setString(41, assigneeIdFinal);
                            }
                    );
                }
                totalUpserts++;
            } // end for comp types
            }
            Map<String,Object> resp = new LinkedHashMap<>();
            resp.put("ok", true);
            resp.put("count", totalUpserts);
            if (debug) {
                resp.put("debug", Map.of(
                        "year", year,
                        "prevYear", prev,
                        "companyType", companyType,
                        "assigneeId", assigneeId,
                        "assigneeSource", assigneeSource,
                        "versionNo", versionNo,
                        "upliftPercent", uplift
                ));
            }
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("[Plan.Init] failed: {}", e.toString());
            return ResponseEntity.status(500).body(Map.of("error","plan_init_failed","message",e.getMessage()));
        }
    }

    /**
     * Set target_stage='C' for all sales_plan rows of the assignee/year/customer (optionally filtered by company_type).
     */
    @PostMapping("/confirm-customer")
    public ResponseEntity<?> confirmCustomer(@RequestBody ConfirmCustomerReq body,
                                             @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
                                             @RequestHeader(value = "X-EMP-ID", required = false) String empIdHeader) {
        try {
            int year = body != null && body.year != null ? body.year : 0;
            String companyType = body != null ? (body.companyType == null ? "" : body.companyType.trim()) : "";
            String assigneeId = (body != null && body.assigneeId != null && !body.assigneeId.trim().isEmpty())
                    ? body.assigneeId.trim() : (assigneeHeader == null ? "" : assigneeHeader.trim());
            String empId = (body != null && body.empId != null) ? body.empId.trim() : (empIdHeader == null ? "" : empIdHeader.trim());
            long customerSeq = body != null && body.customerSeq != null ? body.customerSeq : 0L;
            if (assigneeId.isEmpty() && !empId.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, empId);
                    if (resolved != null && !resolved.isBlank()) assigneeId = resolved.trim(); else assigneeId = empId; // fallback
                } catch (Exception ignore) { assigneeId = empId; }
            }
            if (year <= 0 || assigneeId.isEmpty() || customerSeq <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(Map.of("ok", true, "updated", 0)); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";
            String nowFn = mssql ? "GETDATE()" : "now()";

            StringBuilder sb = new StringBuilder();
            sb.append("UPDATE ").append(tblPlan).append(" SET target_stage='C', updated_at=").append(nowFn).append(", updated_by=? ")
              .append(" WHERE ").append(yearExpr).append("=? AND assignee_id=? AND customer_seq=?");
            if (!companyType.isBlank()) sb.append(" AND UPPER(company_type)=UPPER(?)");

            final String sql = sb.toString();
            final String assigneeIdFinal = assigneeId;
            final String updatedBy = assigneeIdFinal;
            final String comp = companyType;
            int updated = jdbc.update(sql, ps -> {
                int idx=1;
                ps.setString(idx++, updatedBy);
                ps.setInt(idx++, year);
                ps.setString(idx++, assigneeIdFinal);
                ps.setLong(idx++, customerSeq);
                if (!comp.isBlank()) ps.setString(idx++, comp);
            });
            return ResponseEntity.ok(Map.of("ok", true, "updated", updated));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","confirm_failed","message", e.getMessage()));
        }
    }

    /**
     * Plan remark (목표수립의견) for a customer/year by assignee.
     * Reads/updates plan_remark on the oldest (smallest id) sales_plan row matching (year, assignee_id, customer_seq).
     */
    @GetMapping("/plan-remark")
    public ResponseEntity<?> getPlanRemark(@RequestParam("year") int year,
                                           @RequestParam("customerSeq") long customerSeq,
                                           @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
                                           @RequestParam(value = "assigneeId", required = false) String assigneeParam) {
        try {
            String assigneeId = (assigneeParam != null && !assigneeParam.isBlank()) ? assigneeParam.trim() : (assigneeHeader == null ? "" : assigneeHeader.trim());
            if (year <= 0 || customerSeq <= 0 || assigneeId.isBlank()) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            String sql;
            if (mssql) {
                sql = "SELECT TOP 1 plan_remark FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=? AND customer_seq=? ORDER BY id ASC";
            } else {
                sql = "SELECT plan_remark FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=? AND customer_seq=? ORDER BY id ASC LIMIT 1";
            }
            String remark = null;
            try { remark = jdbc.queryForObject(sql, String.class, year, assigneeId, customerSeq); } catch (Exception ignore) { remark = null; }
            return ResponseEntity.ok(Map.of("remark", remark == null ? "" : remark));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","plan_remark_read_failed","message", e.getMessage()));
        }
    }

    static class PlanRemarkReq {
        public Integer year;
        public Long customerSeq;
        public String remark;
        public String assigneeId; // optional (header fallback)
    }

    @PostMapping("/plan-remark")
    public ResponseEntity<?> upsertPlanRemark(@RequestBody PlanRemarkReq body,
                                              @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader) {
        try {
            int year = body != null && body.year != null ? body.year : 0;
            long customerSeq = body != null && body.customerSeq != null ? body.customerSeq : 0L;
            String remark = body != null && body.remark != null ? body.remark : "";
            String assigneeId = (body != null && body.assigneeId != null && !body.assigneeId.isBlank()) ? body.assigneeId.trim() : (assigneeHeader == null ? "" : assigneeHeader.trim());
            if (year <= 0 || customerSeq <= 0 || assigneeId.isBlank()) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            // find oldest id
            String sqlId;
            if (mssql) {
                sqlId = "SELECT TOP 1 id FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=? AND customer_seq=? ORDER BY id ASC";
            } else {
                sqlId = "SELECT id FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=? AND customer_seq=? ORDER BY id ASC LIMIT 1";
            }
            Long id;
            try { id = jdbc.queryForObject(sqlId, Long.class, year, assigneeId, customerSeq); } catch (Exception ex) { id = null; }
            if (id == null) return ResponseEntity.badRequest().body(Map.of("error","plan_not_found"));

            final long idFinal = id.longValue();
            int n = jdbc.update("UPDATE "+tblPlan+" SET updated_at=now(), updated_by=?, plan_remark=? WHERE id=?",
                    ps -> { ps.setString(1, assigneeId); ps.setString(2, remark); ps.setLong(3, idFinal); });
            return ResponseEntity.ok(Map.of("ok", n > 0));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","plan_remark_write_failed","message", e.getMessage()));
        }
    }

    /**
     * Total planned amounts by company type (TNT/DYS) for an assignee and year with P-precedence over B.
     * Logic: For each (customer_seq, sales_mgmt_unit), if any P exists, sum only P rows; otherwise sum B rows.
     * Returns: [{ company_type: 'TNT'|'DYS', amount: number }]
     */
    @GetMapping("/totals-by-assignee")
    public ResponseEntity<?> totalsByAssignee(@RequestParam("year") int year,
                                              @RequestParam(value="assigneeId", required=false) String assigneeId,
                                              @RequestParam(value="empId", required=false) String empId) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim() : "";
            String eid = (empId != null && !empId.isBlank()) ? empId.trim() : "";
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty() || year <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(List.of()); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            String colAmtSum = "(COALESCE(amount_01,0)+COALESCE(amount_02,0)+COALESCE(amount_03,0)+COALESCE(amount_04,0)+"+
                    "COALESCE(amount_05,0)+COALESCE(amount_06,0)+COALESCE(amount_07,0)+COALESCE(amount_08,0)+"+
                    "COALESCE(amount_09,0)+COALESCE(amount_10,0)+COALESCE(amount_11,0)+COALESCE(amount_12,0))";

            String sql = "SELECT UPPER(company_type) AS company_type, SUM(total_amount) AS amount FROM ("+
                    // Prefer P
                    " SELECT company_type, "+colAmtSum+" AS total_amount, customer_seq, sales_mgmt_unit FROM "+tblPlan+
                    " WHERE "+yearExpr+"=? AND assignee_id=? AND UPPER(plan_type)='P'"+
                    " UNION ALL "+
                    // B only when no P exists for same customer/unit
                    " SELECT b.company_type, "+colAmtSum+" AS total_amount, b.customer_seq, b.sales_mgmt_unit FROM "+tblPlan+" b"+
                    " WHERE "+yearExpr+"=? AND b.assignee_id=? AND UPPER(b.plan_type)='B'"+
                    " AND NOT EXISTS (SELECT 1 FROM "+tblPlan+" p WHERE "+yearExpr+"=? AND p.assignee_id=? AND p.customer_seq=b.customer_seq AND p.sales_mgmt_unit=b.sales_mgmt_unit AND UPPER(p.plan_type)='P')"+
                    ") u GROUP BY UPPER(company_type)";

            final String aidFinal = aid;
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setInt(1, year); ps.setString(2, aidFinal);
                ps.setInt(3, year); ps.setString(4, aidFinal);
                ps.setInt(5, year); ps.setString(6, aidFinal);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("amount", rs.getBigDecimal(2) == null ? 0d : rs.getBigDecimal(2).doubleValue());
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","totals_failed","message", e.getMessage()));
        }
    }

    /**
     * Confirmed totals by company type (only customers whose all rows are C) for an assignee and year.
     * P precedence over B when summing amounts.
     * Returns: [{ company_type: 'TNT'|'DYS', amount: number }]
     */
    @GetMapping("/totals-confirmed-by-assignee")
    public ResponseEntity<?> totalsConfirmedByAssignee(@RequestParam("year") int year,
                                                       @RequestParam(value="assigneeId", required=false) String assigneeId,
                                                       @RequestParam(value="empId", required=false) String empId) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim() : "";
            String eid = (empId != null && !empId.isBlank()) ? empId.trim() : "";
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty() || year <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(List.of()); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";
            String colAmtSum = "(COALESCE(amount_01,0)+COALESCE(amount_02,0)+COALESCE(amount_03,0)+COALESCE(amount_04,0)+"+
                    "COALESCE(amount_05,0)+COALESCE(amount_06,0)+COALESCE(amount_07,0)+COALESCE(amount_08,0)+"+
                    "COALESCE(amount_09,0)+COALESCE(amount_10,0)+COALESCE(amount_11,0)+COALESCE(amount_12,0))";

            String sql = "WITH stage_base AS ("+
                    " SELECT customer_seq, UPPER(company_type) AS comp, "+
                    " MIN(CASE COALESCE(target_stage,'') WHEN 'C' THEN 4 WHEN 'P' THEN 3 WHEN 'I' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) AS min_rank "+
                    " FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=? GROUP BY customer_seq, UPPER(company_type)"+
                    "), confirmed AS (SELECT customer_seq, comp FROM stage_base WHERE min_rank=4) "+
                    " SELECT UPPER(company_type) AS company_type, SUM(total_amount) AS amount FROM ("+
                    // Prefer P within confirmed customers and company type
                    " SELECT company_type, "+colAmtSum+" AS total_amount, customer_seq, sales_mgmt_unit FROM "+tblPlan+
                    " WHERE "+yearExpr+"=? AND assignee_id=? AND UPPER(plan_type)='P' AND (customer_seq, UPPER(company_type)) IN (SELECT customer_seq, comp FROM confirmed)"+
                    " UNION ALL " +
                    // B only when no P exists for same customer/unit, still only confirmed customers
                    " SELECT b.company_type, "+colAmtSum+" AS total_amount, b.customer_seq, b.sales_mgmt_unit FROM "+tblPlan+" b"+
                    " WHERE "+yearExpr+"=? AND b.assignee_id=? AND UPPER(b.plan_type)='B' AND (b.customer_seq, UPPER(b.company_type)) IN (SELECT customer_seq, comp FROM confirmed)"+
                    " AND NOT EXISTS (SELECT 1 FROM "+tblPlan+" p WHERE "+yearExpr+"=? AND p.assignee_id=? AND p.customer_seq=b.customer_seq AND p.sales_mgmt_unit=b.sales_mgmt_unit AND UPPER(p.plan_type)='P')"+
                    ") u GROUP BY UPPER(company_type)";

            final String aidFinal = aid;
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                int idx=1;
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal);
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal);
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal);
                ps.setInt(idx++, year); ps.setString(idx++, aidFinal);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("amount", rs.getBigDecimal(2) == null ? 0d : rs.getBigDecimal(2).doubleValue());
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","totals_confirmed_failed","message", e.getMessage()));
        }
    }

    /**
     * Breakdown totals for an assignee by customer or unit with P precedence over B.
     * Params: year, assigneeId/empId, companyType (TNT|DYS), groupBy ('customer'|'unit').
     * Returns: [{ key: <customer_seq or sales_mgmt_unit>, amount: number }]
     */
    @GetMapping("/totals-breakdown")
    public ResponseEntity<?> totalsBreakdown(@RequestParam("year") int year,
                                             @RequestParam(value="assigneeId", required=false) String assigneeId,
                                             @RequestParam(value="empId", required=false) String empId,
                                             @RequestParam("companyType") String companyType,
                                             @RequestParam("groupBy") String groupBy) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim() : "";
            String eid = (empId != null && !empId.isBlank()) ? empId.trim() : "";
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty() || year <= 0 || companyType == null || companyType.isBlank()) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(List.of()); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            String colAmtSum = "(COALESCE(amount_01,0)+COALESCE(amount_02,0)+COALESCE(amount_03,0)+COALESCE(amount_04,0)+"+
                    "COALESCE(amount_05,0)+COALESCE(amount_06,0)+COALESCE(amount_07,0)+COALESCE(amount_08,0)+"+
                    "COALESCE(amount_09,0)+COALESCE(amount_10,0)+COALESCE(amount_11,0)+COALESCE(amount_12,0))";

            String keyExpr = groupBy.equalsIgnoreCase("customer") ? "s.customer_seq" : "s.sales_mgmt_unit";
            String labelExpr = groupBy.equalsIgnoreCase("customer") ? "MIN(s.customer_name)" : "NULL";
            String sql =
                    "WITH s AS ("+
                    "  SELECT customer_seq, sales_mgmt_unit, UPPER(company_type) AS company_type, UPPER(plan_type) AS plan_type, "+
                    colAmtSum+" AS total_amount, target_year, customer_name "+
                    "  FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=?"+
                    "), w AS ("+
                    "  SELECT customer_seq, sales_mgmt_unit, company_type, "+
                    "         CASE WHEN SUM(CASE WHEN plan_type='P' THEN 1 ELSE 0 END) > 0 THEN 'P' ELSE 'B' END AS chosen "+
                    "  FROM s GROUP BY customer_seq, sales_mgmt_unit, company_type"+
                    ") "+
                    "SELECT "+keyExpr+" AS k, "+labelExpr+" AS label, SUM(s.total_amount) AS amount "+
                    "FROM s JOIN w ON s.customer_seq=w.customer_seq AND s.sales_mgmt_unit=w.sales_mgmt_unit AND s.company_type=w.company_type "+
                    "WHERE s.company_type=UPPER(?) AND ((w.chosen='P' AND s.plan_type='P') OR (w.chosen='B' AND s.plan_type='B')) "+
                    "GROUP BY "+keyExpr+" ORDER BY amount DESC";

            final String aidFinal = aid;
            final String compFinal = companyType.trim();
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setInt(1, year); ps.setString(2, aidFinal); ps.setString(3, compFinal);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("key", rs.getObject(1));
                m.put("label", rs.getString(2));
                m.put("amount", rs.getBigDecimal(3) == null ? 0d : rs.getBigDecimal(3).doubleValue());
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","breakdown_failed","message", e.getMessage()));
        }
    }

    @GetMapping("/init")
    public ResponseEntity<?> initGet(@RequestParam(value = "year", required = false) Integer year,
                                     @RequestParam(value = "companyType", required = false) String companyType,
                                     @RequestParam(value = "upliftPercent", required = false) Double upliftPercent,
                                     @RequestParam(value = "versionNo", required = false) Integer versionNo,
                                     @RequestParam(value = "assigneeId", required = false) String assigneeId,
                                     @RequestParam(value = "empId", required = false) String empId,
                                     @RequestParam(value = "debug", required = false) String debugQuery,
                                     @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
                                     @RequestHeader(value = "X-EMP-SEQ", required = false) String empSeqHeader,
                                     @RequestHeader(value = "X-EMP-ID", required = false) String empIdHeader,
                                     @RequestHeader(value = "X-Debug", required = false) String debugHeader) {
        InitReq b = new InitReq();
        b.year = year;
        b.companyType = companyType;
        b.upliftPercent = upliftPercent;
        b.versionNo = versionNo;
        b.assigneeId = assigneeId;
        // Prefer query param empId as fallback header
        String empIdHdr = (empId != null && !empId.isBlank()) ? empId : empIdHeader;
        String dbgHdr = (debugQuery != null && !debugQuery.isBlank()) ? debugQuery : debugHeader;
        return init(b, assigneeHeader, empSeqHeader, empIdHdr, dbgHdr);
    }

    /**
     * Status summary for plan initialization by assignee and year.
     * Returns TNT/DYS counts (distinct customers) for plan_type 'B' and stage flags (any P/C).
     */
    @GetMapping("/status")
    public ResponseEntity<?> status(@RequestParam("year") int year,
                                    @RequestParam(value = "assigneeId", required = false) String assigneeId,
                                    @RequestParam(value = "empId", required = false) String empId,
                                    @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
                                    @RequestHeader(value = "X-EMP-ID", required = false) String empIdHeader) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim()
                    : (assigneeHeader != null ? assigneeHeader.trim() : "");
            String eid = (empId != null && !empId.isBlank()) ? empId.trim()
                    : (empIdHeader != null ? empIdHeader.trim() : "");
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback empId==assigneeId
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","invalid_args","message","assigneeId required"));

            // Postgres: target_year is DATE. Use EXTRACT(YEAR FROM target_year) explicitly.
            String tblPlan = env.getProperty("app.sales.plan.table", "public.sales_plan");
            String yearExpr = "EXTRACT(YEAR FROM target_year)";
            String sql = "SELECT UPPER(company_type) AS company_type, " +
                    "COUNT(DISTINCT customer_seq) AS cnt, " +
                    "MAX(CASE WHEN target_stage='P' THEN 1 ELSE 0 END) AS has_p, " +
                    "MAX(CASE WHEN target_stage='C' THEN 1 ELSE 0 END) AS has_c, " +
                    "MAX(CASE WHEN target_stage='I' OR target_stage='B' OR target_stage IS NULL THEN 1 ELSE 0 END) AS has_i " +
                    "FROM "+tblPlan+" WHERE "+yearExpr+"=? AND assignee_id=? " +
                    "GROUP BY UPPER(company_type)";
            final String aidFinal = aid;
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> { ps.setInt(1, year); ps.setString(2, aidFinal); }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("cnt", rs.getLong(2));
                m.put("has_p", rs.getInt(3));
                m.put("has_c", rs.getInt(4));
                m.put("has_i", rs.getInt(5));
                return m;
            });
            long tnt = 0, dys = 0; boolean anyP=false, anyC=false, anyI=false;
            for (Map<String,Object> r : rows) {
                String ct = String.valueOf(r.get("company_type")).toUpperCase();
                long n = 0; try { n = Long.parseLong(String.valueOf(r.get("cnt"))); } catch (Exception ignore) {}
                int hp = 0; int hc = 0; int hi = 0; try { hp = Integer.parseInt(String.valueOf(r.get("has_p"))); hc = Integer.parseInt(String.valueOf(r.get("has_c"))); hi = Integer.parseInt(String.valueOf(r.get("has_i"))); } catch(Exception ignore) {}
                if ("TNT".equals(ct)) tnt = n; else if ("DYS".equals(ct)) dys = n;
                anyP = anyP || (hp > 0);
                anyC = anyC || (hc > 0);
                anyI = anyI || (hi > 0);
            }
            return ResponseEntity.ok(Map.of("tnt", tnt, "dys", dys, "hasP", anyP, "hasC", anyC, "hasI", anyI));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","plan_status_failed","message",e.getMessage()));
        }
    }

    /**
     * Return target_stage per customer for given year/companyType/assignee and a list of customerSeqs.
     * Response: [{ customer_seq: <long>, target_stage: <string> }, ...]
     */
    @GetMapping("/stages")
    public ResponseEntity<?> stages(@RequestParam("year") int year,
                                    @RequestParam(value = "companyType", required = false) String companyType,
                                    @RequestParam(value = "assigneeId", required = false) String assigneeId,
                                    @RequestParam(value = "empId", required = false) String empId,
                                    @RequestParam(value = "customerSeqs", required = false) String customerSeqs) {
        try {
            String aid = (assigneeId != null && !assigneeId.isBlank()) ? assigneeId.trim() : "";
            String eid = (empId != null && !empId.isBlank()) ? empId.trim() : "";
            if (aid.isEmpty() && !eid.isEmpty()) {
                try {
                    String resolved = jdbc.queryForObject("SELECT assignee_id FROM public.employee WHERE emp_id = ?", String.class, eid);
                    if (resolved != null && !resolved.isBlank()) aid = resolved.trim(); else aid = eid; // fallback empId==assigneeId
                } catch (Exception ignore) { aid = eid; }
            }
            if (aid.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","invalid_args","message","assigneeId required"));

            // nodb stub
            for (String p : env.getActiveProfiles()) {
                if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(List.of());
            }

            String tblPlan = env.getProperty("app.sales.plan.table", "public.sales_plan");
            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";

            // Optional IN filter of customerSeqs
            List<Long> seqs = new ArrayList<>();
            boolean useIn = (customerSeqs != null && !customerSeqs.isBlank());
            String inClause = "";
            if (useIn) {
                for (String tok : customerSeqs.split(",")) {
                    try { long v = Long.parseLong(tok.trim()); if (v > 0) seqs.add(v); } catch (Exception ignore) {}
                }
                if (!seqs.isEmpty()) {
                    StringBuilder in = new StringBuilder();
                    in.append("(");
                    for (int i=0;i<seqs.size();i++) { if (i>0) in.append(","); in.append("?"); }
                    in.append(")");
                    inClause = " AND customer_seq IN " + in;
                } else {
                    return ResponseEntity.ok(List.of());
                }
            }

            String sql = "SELECT customer_seq, " +
                    " SUM(CASE WHEN UPPER(COALESCE(target_stage,''))='C' THEN 1 ELSE 0 END) AS cnt_c, " +
                    " SUM(CASE WHEN UPPER(COALESCE(target_stage,''))='P' THEN 1 ELSE 0 END) AS cnt_p, " +
                    " SUM(CASE WHEN UPPER(COALESCE(target_stage,''))='I' THEN 1 ELSE 0 END) AS cnt_i, " +
                    " COUNT(*) AS cnt_all " +
                    "FROM " + tblPlan + " WHERE " + yearExpr + "=? AND assignee_id=?" +
                    (companyType != null && !companyType.isBlank() ? " AND UPPER(company_type)=UPPER(?)" : "") +
                    inClause + " GROUP BY customer_seq";
            final String aidFinal = aid;
            final boolean hasComp = (companyType != null && !companyType.isBlank());
            final String compFinal = hasComp ? companyType.trim() : null;
            final boolean useInFinal = useIn;
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                int idx = 1;
                ps.setInt(idx++, year);
                ps.setString(idx++, aidFinal);
                if (hasComp) ps.setString(idx++, compFinal);
                if (useInFinal) for (int i=0;i<seqs.size();i++) ps.setLong(idx++, seqs.get(i));
            }, (rs, i) -> {
                long cust = rs.getLong(1);
                long c = rs.getLong(2);
                long p = rs.getLong(3);
                long ii = rs.getLong(4);
                long all = rs.getLong(5);
                String stage;
                if (all > 0 && c == all) stage = "C"; // 모든 C일 때만 C
                else if (p > 0) stage = "P"; // 하나라도 P가 있으면 P
                else if (all > 0 && ii == all) stage = "I"; // 모두 I일 때만 I
                else stage = "B"; // 그 외는 B

                Map<String,Object> m = new LinkedHashMap<>();
                m.put("customer_seq", cust);
                m.put("target_stage", stage);
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","stages_failed","message", e.getMessage()));
        }
    }

    private static int[] distribute(long total, int parts) {
        int[] out = new int[parts];
        if (total <= 0 || parts <= 0) return out;
        long base = total / parts;
        int rem = (int)(total % parts);
        for (int i=0;i<parts;i++) out[i] = (int)base;
        for (int i=0;i<rem;i++) out[i] += 1; // legacy helper (not used for decimals)
        return out;
    }

    // Distribute a 2-decimal BigDecimal total into 'parts' buckets such that sums match exactly (cent-wise)
    private static java.math.BigDecimal[] distributeDecimal(java.math.BigDecimal total, int parts) {
        java.math.BigDecimal[] out = new java.math.BigDecimal[parts];
        for (int i=0;i<parts;i++) out[i] = java.math.BigDecimal.ZERO.setScale(2, java.math.RoundingMode.HALF_UP);
        if (total == null || parts <= 0 || total.signum() <= 0) return out;
        // work in cents
        java.math.BigDecimal hundred = java.math.BigDecimal.valueOf(100);
        long cents = total.multiply(hundred).setScale(0, java.math.RoundingMode.HALF_UP).longValue();
        long base = cents / parts;
        int rem = (int)(cents % parts);
        for (int i=0;i<parts;i++) out[i] = java.math.BigDecimal.valueOf(base).divide(hundred, 2, java.math.RoundingMode.HALF_UP);
        for (int i=0;i<rem;i++) out[i] = out[i].add(java.math.BigDecimal.valueOf(0.01));
        return out;
    }

    /**
     * Upsert a single sales_plan row (plan_type='P', target_stage='P') for given customer/sub/unit with provided monthly qty.
     * Amounts are computed from previous year's avg unit price by sales_mgmt_unit (same assignee/companyType criteria).
     */
    @PostMapping("/upsert-row")
    public ResponseEntity<?> upsertRow(@RequestBody UpsertRowReq body,
                                       @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
                                       @RequestHeader(value = "X-EMP-ID", required = false) String empIdHeader) {
        try {
            int year = body != null && body.year != null ? body.year : 0;
            String companyType = body != null && body.companyType != null ? body.companyType.trim() : "";
            String assigneeId = (body != null && body.assigneeId != null && !body.assigneeId.isBlank()) ? body.assigneeId.trim()
                    : (assigneeHeader != null ? assigneeHeader.trim() : "");
            long customerSeq = body != null && body.customerSeq != null ? body.customerSeq : 0L;
            String sub = body != null && body.itemSubcategory != null ? body.itemSubcategory.trim() : "";
            String unit = body != null && body.salesMgmtUnit != null ? body.salesMgmtUnit.trim() : "";
            Double[] qty = (body != null && body.qty != null && body.qty.length == 12) ? body.qty : new Double[12];
            int versionNo = (body != null && body.versionNo != null && body.versionNo > 0) ? body.versionNo : 1;

            if (year <= 0 || assigneeId.isEmpty() || customerSeq <= 0 || sub.isEmpty() || unit.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));
            }
            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(Map.of("ok", true)); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tblPlan = env.getProperty("app.sales.plan.table", mssql ? "dbo.sales_plan" : "public.sales_plan");

            // Resolve emp_name from assignee/empId for auditing
            String empNameVal = null;
            try { if (empIdHeader != null && !empIdHeader.isBlank()) empNameVal = jdbc.queryForObject("SELECT emp_name FROM public.employee WHERE emp_id=? LIMIT 1", String.class, empIdHeader.trim()); } catch (Exception ignore) {}
            if (empNameVal == null) { try { empNameVal = jdbc.queryForObject("SELECT emp_name FROM public.employee WHERE assignee_id=? LIMIT 1", String.class, assigneeId); } catch (Exception ignore) {} }

            // Compute amounts from previous year's avg unit price
            int prev = Math.max(1, year - 1);
            String invTbl2 = env.getProperty("app.invoice.table", "public.invoice");
            String colCust2 = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate2 = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt2 = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colQty2 = env.getProperty("app.invoice.columns.std_qty", env.getProperty("app.invoice.columns.qty", "std_qty"));
            String colUnit2 = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            boolean dateIsText2 = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt2 = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr2 = dateIsText2 ? ("to_date(" + colDate2 + ", '" + dateFmt2 + "')") : (colDate2 + "::date");

            String sqlAvg = "SELECT CASE WHEN SUM(COALESCE(i."+colQty2+",0)) > 0 THEN (SUM(COALESCE(i."+colAmt2+",0)) / SUM(COALESCE(i."+colQty2+",0))) ELSE 0 END AS avg_unit_price " +
                    "FROM "+invTbl2+" i JOIN public.customer c ON CAST(i."+colCust2+" AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                    "WHERE c.assignee_id=? AND UPPER(c.company_type)=UPPER(?) AND EXTRACT(YEAR FROM "+dateExpr2+")=? AND coalesce(nullif(trim(i."+colUnit2+"), ''), 'na') = ?";
            Double upObj; try { upObj = jdbc.queryForObject(sqlAvg, Double.class, assigneeId, companyType, prev, unit); } catch (Exception ex) { upObj = 0d; }
            double unitPrice = upObj == null ? 0d : upObj.doubleValue();
            // Fallback: if no employee-specific average, use company-wide average for the unit
            if (unitPrice <= 0d) {
                String sqlAvgGlobal = "SELECT CASE WHEN SUM(COALESCE(i."+colQty2+",0)) > 0 THEN (SUM(COALESCE(i."+colAmt2+",0)) / SUM(COALESCE(i."+colQty2+",0))) ELSE 0 END AS avg_unit_price " +
                        "FROM "+invTbl2+" i JOIN public.customer c ON CAST(i."+colCust2+" AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                        "WHERE UPPER(c.company_type)=UPPER(?) AND EXTRACT(YEAR FROM "+dateExpr2+")=? AND coalesce(nullif(trim(i."+colUnit2+"), ''), 'na') = ?";
                try {
                    Double upG = jdbc.queryForObject(sqlAvgGlobal, Double.class, companyType, prev, unit);
                    if (upG != null && upG.doubleValue() > 0d) unitPrice = upG.doubleValue();
                } catch (Exception ignore) {}
            }
            java.math.BigDecimal[] amounts = new java.math.BigDecimal[12];
            boolean useProvidedAmounts = (body.amount != null && body.amount.length == 12);
            if (useProvidedAmounts) {
                for (int i=0;i<12;i++) {
                    double av = body.amount[i] == null ? 0d : Math.max(0d, body.amount[i]);
                    amounts[i] = java.math.BigDecimal.valueOf(av).setScale(2, java.math.RoundingMode.HALF_UP);
                }
            } else {
                java.math.BigDecimal unitPriceBD2 = java.math.BigDecimal.valueOf(unitPrice).setScale(2, java.math.RoundingMode.HALF_UP);
                for (int i=0;i<12;i++) {
                    double qv = qty[i] == null ? 0d : Math.max(0d, qty[i]);
                    java.math.BigDecimal v = java.math.BigDecimal.valueOf(qv).setScale(2, java.math.RoundingMode.HALF_UP);
                    amounts[i] = v.multiply(unitPriceBD2).setScale(2, java.math.RoundingMode.HALF_UP);
                }
            }

            java.sql.Date ty = java.sql.Date.valueOf(java.time.LocalDate.of(year, 1, 1));

            // Column presence and resolved customer_name (used for UPDATE/INSERT)
            boolean hasCustNameCol = false;
            try {
                Integer cnt = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?",
                        Integer.class,
                        "public",
                        (tblPlan.contains(".") ? tblPlan.substring(tblPlan.indexOf('.')+1) : tblPlan),
                        "customer_name");
                hasCustNameCol = (cnt != null && cnt > 0);
            } catch (Exception ignore) {}
            String custName = null;
            if (hasCustNameCol) {
                try { custName = jdbc.queryForObject("SELECT customer_name FROM public.customer WHERE customer_seq=?", String.class, customerSeq); } catch (Exception ignore) {}
            }

            final String empNameForSql = empNameVal; // effectively final for lambdas
            final String custNameForSql = custName;   // effectively final for lambdas
            int updated;
            if (hasCustNameCol) {
                updated = jdbc.update(
                        "UPDATE "+tblPlan+" SET updated_at=now(), updated_by=?, plan_type='P', target_stage='P', assignee_id=?, emp_name=?, item_subcategory=?, sales_mgmt_unit=?, customer_name=?, " +
                                "qty_01=?, qty_02=?, qty_03=?, qty_04=?, qty_05=?, qty_06=?, qty_07=?, qty_08=?, qty_09=?, qty_10=?, qty_11=?, qty_12=?, " +
                                "amount_01=?, amount_02=?, amount_03=?, amount_04=?, amount_05=?, amount_06=?, amount_07=?, amount_08=?, amount_09=?, amount_10=?, amount_11=?, amount_12=? " +
                                "WHERE target_year=? AND company_type=? AND plan_type='P' AND customer_seq=? AND item_subcategory=? AND sales_mgmt_unit=? AND COALESCE(version_no,1)=? " +
                                "AND COALESCE(customer_name,'') = COALESCE(?, '')",
                        ps -> {
                            ps.setString(1, assigneeId);
                            ps.setString(2, assigneeId);
                            if (empNameForSql == null) ps.setObject(3, null); else ps.setString(3, empNameForSql);
                            ps.setString(4, sub);
                            ps.setString(5, unit);
                            ps.setString(6, custNameForSql);
                            for (int i=0;i<12;i++) ps.setBigDecimal(7+i, java.math.BigDecimal.valueOf(qty[i]).setScale(2, java.math.RoundingMode.HALF_UP));
                            for (int i=0;i<12;i++) ps.setBigDecimal(19+i, amounts[i]);
                            ps.setDate(31, ty);
                            ps.setString(32, companyType);
                            ps.setLong(33, customerSeq);
                            ps.setString(34, sub);
                            ps.setString(35, unit);
                            ps.setInt(36, versionNo);
                            ps.setString(37, custNameForSql);
                        }
                );
            } else {
                updated = jdbc.update(
                        "UPDATE "+tblPlan+" SET updated_at=now(), updated_by=?, plan_type='P', target_stage='P', assignee_id=?, emp_name=?, item_subcategory=?, sales_mgmt_unit=?, " +
                                "qty_01=?, qty_02=?, qty_03=?, qty_04=?, qty_05=?, qty_06=?, qty_07=?, qty_08=?, qty_09=?, qty_10=?, qty_11=?, qty_12=?, " +
                                "amount_01=?, amount_02=?, amount_03=?, amount_04=?, amount_05=?, amount_06=?, amount_07=?, amount_08=?, amount_09=?, amount_10=?, amount_11=?, amount_12=? " +
                                "WHERE target_year=? AND company_type=? AND plan_type='P' AND customer_seq=? AND item_subcategory=? AND sales_mgmt_unit=? AND COALESCE(version_no,1)=?",
                        ps -> {
                            ps.setString(1, assigneeId);
                            ps.setString(2, assigneeId);
                            if (empNameForSql == null) ps.setObject(3, null); else ps.setString(3, empNameForSql);
                            ps.setString(4, sub);
                            ps.setString(5, unit);
                            for (int i=0;i<12;i++) ps.setBigDecimal(6+i, java.math.BigDecimal.valueOf(qty[i]).setScale(2, java.math.RoundingMode.HALF_UP));
                            for (int i=0;i<12;i++) ps.setBigDecimal(18+i, amounts[i]);
                            ps.setDate(30, ty);
                            ps.setString(31, companyType);
                            ps.setLong(32, customerSeq);
                            ps.setString(33, sub);
                            ps.setString(34, unit);
                            ps.setInt(35, versionNo);
                        }
                );
            }
            if (updated == 0) {
                if (hasCustNameCol) {
                    jdbc.update(
                            "INSERT INTO "+tblPlan+" (created_at, updated_at, target_year, company_type, plan_type, customer_seq, customer_name, assignee_id, emp_name, item_subcategory_seq, sales_mgmt_unit_seq, item_subcategory, sales_mgmt_unit, target_stage, " +
                                    "qty_01, qty_02, qty_03, qty_04, qty_05, qty_06, qty_07, qty_08, qty_09, qty_10, qty_11, qty_12, " +
                                    "amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, version_no, created_by, updated_by) " +
                                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            ps -> {
                                ps.setTimestamp(1, new java.sql.Timestamp(System.currentTimeMillis()));
                                ps.setTimestamp(2, new java.sql.Timestamp(System.currentTimeMillis()));
                                ps.setDate(3, ty);
                                ps.setString(4, companyType);
                                ps.setString(5, "P");
                                ps.setLong(6, customerSeq);
                                ps.setString(7, custNameForSql);
                                ps.setString(8, assigneeId);
                                if (empNameForSql == null) ps.setObject(9, null); else ps.setString(9, empNameForSql);
                                ps.setObject(10, null);
                                ps.setObject(11, null);
                                ps.setString(12, sub);
                                ps.setString(13, unit);
                                ps.setString(14, "P");
                                for (int i=0;i<12;i++) {
                                    double qv = qty[i] == null ? 0d : Math.max(0d, qty[i]);
                                    ps.setBigDecimal(15+i, java.math.BigDecimal.valueOf(qv).setScale(2, java.math.RoundingMode.HALF_UP));
                                }
                                for (int i=0;i<12;i++) ps.setBigDecimal(27+i, amounts[i]);
                                ps.setInt(39, versionNo);
                                ps.setString(40, assigneeId);
                                ps.setString(41, assigneeId);
                            }
                    );
                } else {
                    jdbc.update(
                            "INSERT INTO "+tblPlan+" (created_at, updated_at, target_year, company_type, plan_type, customer_seq, assignee_id, emp_name, item_subcategory_seq, sales_mgmt_unit_seq, item_subcategory, sales_mgmt_unit, target_stage, " +
                                    "qty_01, qty_02, qty_03, qty_04, qty_05, qty_06, qty_07, qty_08, qty_09, qty_10, qty_11, qty_12, " +
                                    "amount_01, amount_02, amount_03, amount_04, amount_05, amount_06, amount_07, amount_08, amount_09, amount_10, amount_11, amount_12, version_no, created_by, updated_by) " +
                                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            ps -> {
                                ps.setTimestamp(1, new java.sql.Timestamp(System.currentTimeMillis()));
                                ps.setTimestamp(2, new java.sql.Timestamp(System.currentTimeMillis()));
                                ps.setDate(3, ty);
                                ps.setString(4, companyType);
                                ps.setString(5, "P");
                                ps.setLong(6, customerSeq);
                                ps.setString(7, assigneeId);
                                if (empNameForSql == null) ps.setObject(8, null); else ps.setString(8, empNameForSql);
                                ps.setObject(9, null);
                                ps.setObject(10, null);
                                ps.setString(11, sub);
                                ps.setString(12, unit);
                                ps.setString(13, "P");
                                for (int i=0;i<12;i++) {
                                    double qv = qty[i] == null ? 0d : Math.max(0d, qty[i]);
                                    ps.setBigDecimal(14+i, java.math.BigDecimal.valueOf(qv).setScale(2, java.math.RoundingMode.HALF_UP));
                                }
                                for (int i=0;i<12;i++) ps.setBigDecimal(26+i, amounts[i]);
                                ps.setInt(38, versionNo);
                                ps.setString(39, assigneeId);
                                ps.setString(40, assigneeId);
                            }
                    );
                }
            }
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","upsert_row_failed","message", e.getMessage()));
        }
    }
}
