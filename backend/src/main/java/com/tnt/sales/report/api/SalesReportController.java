package com.tnt.sales.report.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesReportController {
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    Environment env;

    /**
     * Previous-year totals by employee (optionally filtering departments).
     * Returns: emp_seq, emp_id, emp_name, dept_name, amount
     */
    @GetMapping("/employee-yearly")
    public ResponseEntity<?> employeeYearly(@RequestParam("year") int year,
                                            @RequestParam(value = "depts", required = false) String deptsCsv,
                                            @RequestParam(value = "empSeqs", required = false) String empSeqsCsv,
                                            @RequestParam(value = "empNames", required = false) String empNamesCsv,
                                            @RequestParam(value = "assigneeIds", required = false) String assigneeIdsCsv,
                                            @RequestParam(value = "joinKey", required = false) String joinKey,
                                            @RequestParam(value = "exact", required = false) Boolean exact,
                                            @RequestParam(value = "years", required = false) String yearsCsv,
                                            @RequestParam(value = "fromYear", required = false) Integer fromYear,
                                            @RequestParam(value = "toYear", required = false) Integer toYear) {
        // previous year by default; exact/year-range when requested
        final int y = year;
        final int prev = y - 1;
        boolean useExact = (exact != null && exact.booleanValue()) || (yearsCsv != null && !yearsCsv.isBlank()) || (fromYear != null && toYear != null);
        List<Integer> targetYears = new ArrayList<>();
        if (useExact) {
            if (yearsCsv != null && !yearsCsv.isBlank()) {
                for (String p : yearsCsv.split(",")) { try { targetYears.add(Integer.parseInt(p.trim())); } catch (Exception ignore) {} }
            } else if (fromYear != null && toYear != null) {
                int a = Math.min(fromYear, toYear), b = Math.max(fromYear, toYear);
                for (int i=a;i<=b;i++) targetYears.add(i);
            } else { targetYears.add(y); }
            if (targetYears.isEmpty()) targetYears.add(y);
        }

        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(List.of(
                        Map.of("emp_seq", 1001, "emp_id", "S01001", "emp_name", "홍길동", "dept_name", "영업1본부", "amount", 120000000d),
                        Map.of("emp_seq", 1002, "emp_id", "S01002", "emp_name", "김민수", "dept_name", "영업1팀", "amount", 90000000d),
                        Map.of("emp_seq", 1003, "emp_id", "S02001", "emp_name", "이서준", "dept_name", "영업2본부", "amount", 65000000d)
                ));
            }
        }

        String tbl = env.getProperty("app.invoice.table", "public.invoice");
        String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        // Employee columns (seq and name)
        String colEmp = env.getProperty("app.invoice.columns.curr_emp_seq", "curr_emp_seq");
        String colEmpName = env.getProperty("app.invoice.columns.curr_emp_name", "curr_emp_name");

        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
        String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");
        String yearExpr = "EXTRACT(YEAR FROM "+dateExpr+")";
        String yearClause;
        if (useExact) {
            StringBuilder sb = new StringBuilder();
            sb.append(yearExpr).append(" IN (");
            for (int i=0;i<targetYears.size();i++) { if (i>0) sb.append(","); sb.append("?"); }
            sb.append(")");
            yearClause = sb.toString();
        } else {
            yearClause = yearExpr + " = ?";
        }

        // Optional filter by employee list (by seq) coming from center panel
        List<Long> filterEmpSeqs = new ArrayList<>();
        if (empSeqsCsv != null && !empSeqsCsv.isBlank()) {
            for (String p : empSeqsCsv.split(",")) {
                try { filterEmpSeqs.add(Long.parseLong(p.trim())); } catch (Exception ignore) {}
            }
        }
        // Optional: filter by assignee IDs (resolve to emp_seq)
        if (assigneeIdsCsv != null && !assigneeIdsCsv.isBlank()) {
            for (String p : assigneeIdsCsv.split(",")) {
                String v = p == null ? "" : p.trim();
                if (v.isEmpty()) continue;
                try {
                    Long seq = jdbc.queryForObject("SELECT emp_seq FROM public.employee WHERE assignee_id = ?", Long.class, v);
                    if (seq != null) filterEmpSeqs.add(seq);
                } catch (Exception ignore) {}
            }
        }
        // Optional filter by employee names (when grouping by name)
        List<String> filterEmpNames = new ArrayList<>();
        if (empNamesCsv != null && !empNamesCsv.isBlank()) {
            for (String p : empNamesCsv.split(",")) {
                String n = p == null ? "" : p.trim();
                if (!n.isEmpty()) filterEmpNames.add(n);
            }
        }
        boolean groupByName = (joinKey != null && ("emp_name".equalsIgnoreCase(joinKey) || "name".equalsIgnoreCase(joinKey)))
                || (!filterEmpNames.isEmpty());

        String colCompany = env.getProperty("app.invoice.columns.company_type", "company_type");
        Map<String,Object> resp = new LinkedHashMap<>();
        List<Map<String,Object>> out = new ArrayList<>();

        if (groupByName) {
            // Name-based aggregation directly from invoice.curr_emp_name
            String sqlName = "SELECT COALESCE(i."+colEmpName+", '') AS emp_name, COALESCE(i."+colCompany+", 'UNKNOWN') AS company_type, " +
                    "COALESCE(SUM(COALESCE(i."+colAmt+",0)),0)::double precision AS amount " +
                    "FROM "+tbl+" i WHERE " + yearClause + " " +
                    (filterEmpNames.isEmpty() ? "" : " AND i."+colEmpName+" = ANY(?) ") +
                    "GROUP BY 1,2";
            List<Map<String,Object>> rowsName = jdbc.query(sqlName, ps -> {
                int idx = 1;
                if (useExact) { for (Integer yy : targetYears) ps.setInt(idx++, yy); } else { ps.setInt(idx++, prev); }
                if (!filterEmpNames.isEmpty()) ps.setArray(idx++, ps.getConnection().createArrayOf("text", filterEmpNames.toArray()));
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("emp_name", rs.getString(1));
                m.put("company_type", rs.getString(2));
                m.put("amount", rs.getDouble(3));
                return m;
            });

            // Aggregate into per-name company map
            Map<String, Map<String, Double>> nameCompany = new LinkedHashMap<>();
            for (Map<String,Object> r : rowsName) {
                String name = String.valueOf(r.get("emp_name"));
                String ctype = String.valueOf(r.get("company_type"));
                double amt = 0; Object av = r.get("amount"); if (av instanceof Number) amt = ((Number)av).doubleValue(); else try { amt = Double.parseDouble(String.valueOf(av)); } catch (Exception ignore) {}
                nameCompany.computeIfAbsent(name, k -> new LinkedHashMap<>()).put(ctype, amt);
            }
            if (nameCompany.isEmpty()) {
                resp.put("employees", List.of());
                resp.put("companyTotals", List.of());
                return ResponseEntity.ok(resp);
            }
            // Join employee by name to fetch representative data
            Set<String> names = new HashSet<>(nameCompany.keySet());
            // Some environments may not have emp_seq in employee; select 0 as placeholder
            String empByNameSql = "SELECT 0 AS emp_seq, emp_id, emp_name, dept_name FROM public.employee WHERE emp_name = ANY(?)";
            Map<String, Map<String,Object>> nameInfo = new HashMap<>();
            jdbc.query(empByNameSql, ps -> ps.setArray(1, ps.getConnection().createArrayOf("text", names.toArray())), (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("emp_seq", rs.getLong(1));
                m.put("emp_id", rs.getString(2));
                m.put("emp_name", rs.getString(3));
                m.put("dept_name", rs.getString(4));
                nameInfo.putIfAbsent(rs.getString(3), m); // first occurrence as representative
                return null;
            });

            for (Map.Entry<String, Map<String, Double>> en : nameCompany.entrySet()) {
                String name = en.getKey();
                Map<String, Double> byComp = en.getValue();
                Map<String,Object> base = new LinkedHashMap<>(nameInfo.getOrDefault(name, Map.of("emp_name", name)));
                double tntAmt = byComp.entrySet().stream().filter(x -> "TNT".equalsIgnoreCase(String.valueOf(x.getKey()))).mapToDouble(Map.Entry::getValue).sum();
                double dysAmt = byComp.entrySet().stream().filter(x -> "DYS".equalsIgnoreCase(String.valueOf(x.getKey()))).mapToDouble(Map.Entry::getValue).sum();
                double totalAmt = byComp.values().stream().mapToDouble(Double::doubleValue).sum();
                Map<String,Object> m = new LinkedHashMap<>();
                m.putAll(base);
                m.put("tnt_amount", tntAmt);
                m.put("dys_amount", dysAmt);
                m.put("amount", totalAmt);
                out.add(m);
            }

            // sort: dept_name, emp_name
            out.sort((a,b)-> {
                int c = String.valueOf(a.get("dept_name")).compareTo(String.valueOf(b.get("dept_name")));
                if (c != 0) return c;
                return String.valueOf(a.get("emp_name")).compareTo(String.valueOf(b.get("emp_name")));
            });

            // Company-type totals filtered by name directly on invoice
            String colCompany2 = env.getProperty("app.invoice.columns.company_type", "company_type");
            String sqlCompByName = "SELECT COALESCE(i."+colCompany2+", 'UNKNOWN') AS company_type, " +
                    "COALESCE(SUM(COALESCE(i."+colAmt+",0)),0)::double precision AS amount " +
                    "FROM "+tbl+" i WHERE " + yearClause + " " +
                    (filterEmpNames.isEmpty() ? "" : " AND i."+colEmpName+" = ANY(?) ") +
                    "GROUP BY 1 ORDER BY 1";
            List<Map<String,Object>> companyTotals = jdbc.query(sqlCompByName, ps -> {
                int idx = 1;
                if (useExact) { for (Integer yy : targetYears) ps.setInt(idx++, yy); } else { ps.setInt(idx++, prev); }
                if (!filterEmpNames.isEmpty()) ps.setArray(idx++, ps.getConnection().createArrayOf("text", filterEmpNames.toArray()));
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("amount", rs.getDouble(2));
                return m;
            });

            resp.put("employees", out);
            resp.put("companyTotals", companyTotals);
            return ResponseEntity.ok(resp);
        }

        // === Default seq-based path (existing behavior) ===
        String sqlEmp = "SELECT i."+colEmp+"::bigint AS emp_seq, COALESCE(i."+colCompany+", 'UNKNOWN') AS company_type, " +
                "COALESCE(SUM(COALESCE(i."+colAmt+",0)),0)::double precision AS amount " +
                "FROM "+tbl+" i WHERE " + yearClause + " " +
                (filterEmpSeqs.isEmpty() ? "" : " AND i."+colEmp+" = ANY(?) ") +
                "GROUP BY 1,2";

        List<Map<String,Object>> rowsEmp = jdbc.query(sqlEmp, ps -> {
            int idx = 1;
            if (useExact) { for (Integer yy : targetYears) ps.setInt(idx++, yy); } else { ps.setInt(idx++, prev); }
            if (!filterEmpSeqs.isEmpty()) {
                ps.setArray(idx++, ps.getConnection().createArrayOf("bigint", filterEmpSeqs.toArray()));
            }
        }, (rs, i) -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("emp_seq", rs.getLong(1));
            m.put("company_type", rs.getString(2));
            m.put("amount", rs.getDouble(3));
            return m;
        });
        // Aggregate into per-employee(company map) keyed by emp_seq
        Map<Long, Map<String, Double>> empCompany = new LinkedHashMap<>();
        for (Map<String,Object> r : rowsEmp) {
            Long seq = null; Object v = r.get("emp_seq");
            if (v instanceof Number) seq = ((Number)v).longValue(); else try { seq = Long.parseLong(String.valueOf(v)); } catch (Exception ignore) {}
            if (seq == null) continue;
            String ctype = String.valueOf(r.get("company_type"));
            double amt = 0; Object av = r.get("amount"); if (av instanceof Number) amt = ((Number)av).doubleValue(); else try { amt = Double.parseDouble(String.valueOf(av)); } catch (Exception ignore) {}
            empCompany.computeIfAbsent(seq, k -> new LinkedHashMap<>()).put(ctype, amt);
        }
        if (empCompany.isEmpty() && (filterEmpSeqs.isEmpty())) {
            return ResponseEntity.ok(Map.of("employees", List.of(), "companyTotals", List.of()));
        }
        // join with employee for id/name/dept and optional dept filter
        Set<Long> seqSet = new HashSet<>(empCompany.keySet());
        if (!filterEmpSeqs.isEmpty()) seqSet.addAll(filterEmpSeqs);
        if (seqSet.isEmpty()) return ResponseEntity.ok(List.of());

        // Avoid ANY/ARRAY to reduce driver issues; use IN list
        List<Long> ids = new ArrayList<>(seqSet);
        if (ids.isEmpty()) return ResponseEntity.ok(List.of());
        StringBuilder in = new StringBuilder("(");
        for (int i=0;i<ids.size();i++){ if(i>0) in.append(","); in.append("?"); }
        in.append(")");
        String empSql = "SELECT emp_seq, emp_id, emp_name, dept_name FROM public.employee WHERE emp_seq IN " + in;
        Map<Long, Map<String,Object>> empMap = new HashMap<>();
        jdbc.query(empSql, ps -> {
            int idx = 1; for (Long v : ids) ps.setLong(idx++, v);
        }, (rs, i) -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("emp_seq", rs.getLong(1));
            m.put("emp_id", rs.getString(2));
            m.put("emp_name", rs.getString(3));
            m.put("dept_name", rs.getString(4));
            empMap.put(rs.getLong(1), m);
            return null;
        });

        Set<String> deptFilter = null;
        if (deptsCsv != null && !deptsCsv.isBlank()) {
            deptFilter = new HashSet<>();
            for (String p : deptsCsv.split(",")) {
                String s = p == null ? "" : p.trim();
                if (!s.isEmpty()) deptFilter.add(s);
            }
        }

        if (!groupByName) {
            // Default: by emp_seq
            for (Long seq : seqSet) {
                Map<String,Object> info = empMap.get(seq);
                if (info == null) continue;
                if (deptFilter != null) {
                    String dn = String.valueOf(info.get("dept_name"));
                    if (!deptFilter.contains(dn)) continue;
                }
                Map<String, Double> byComp = empCompany.getOrDefault(seq, Collections.emptyMap());
                double tntAmt = byComp.entrySet().stream().filter(e -> "TNT".equalsIgnoreCase(String.valueOf(e.getKey()))).mapToDouble(Map.Entry::getValue).sum();
                double dysAmt = byComp.entrySet().stream().filter(e -> "DYS".equalsIgnoreCase(String.valueOf(e.getKey()))).mapToDouble(Map.Entry::getValue).sum();
                double totalAmt = byComp.values().stream().mapToDouble(Double::doubleValue).sum();
                Map<String,Object> m = new LinkedHashMap<>();
                m.putAll(info);
                m.put("tnt_amount", tntAmt);
                m.put("dys_amount", dysAmt);
                m.put("amount", totalAmt);
                out.add(m);
            }
        }

        // sort: dept_name, emp_name
        out.sort((a,b)-> {
            int c = String.valueOf(a.get("dept_name")).compareTo(String.valueOf(b.get("dept_name")));
            if (c != 0) return c;
            return String.valueOf(a.get("emp_name")).compareTo(String.valueOf(b.get("emp_name")));
        });

        // Company-type totals (restricted to the same emp filter)
        String colCompany2 = env.getProperty("app.invoice.columns.company_type", "company_type");
        List<Map<String,Object>> companyTotals;
        if (!groupByName) {
            String sqlComp = "SELECT COALESCE(i."+colCompany2+", 'UNKNOWN') AS company_type, COALESCE(SUM(COALESCE(i."+colAmt+",0)),0)::double precision AS amount FROM "+tbl+" i " +
                    "WHERE " + yearClause + " " +
                    (filterEmpSeqs.isEmpty() ? "" : " AND i."+colEmp+" = ANY(?) ") +
                    "GROUP BY 1 ORDER BY 1";
            companyTotals = jdbc.query(sqlComp, ps -> {
                int idx = 1;
                if (useExact) { for (Integer yy : targetYears) ps.setInt(idx++, yy); } else { ps.setInt(idx++, prev); }
                if (!filterEmpSeqs.isEmpty()) ps.setArray(idx++, ps.getConnection().createArrayOf("bigint", filterEmpSeqs.toArray()));
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("amount", rs.getDouble(2));
                return m;
            });
        } else {
            String sqlCompByName = "SELECT COALESCE(i."+colCompany2+", 'UNKNOWN') AS company_type, " +
                    "COALESCE(SUM(COALESCE(i."+colAmt+",0)),0)::double precision AS amount " +
                    "FROM "+tbl+" i WHERE EXTRACT(YEAR FROM "+dateExpr+") = ? " +
                    (filterEmpNames.isEmpty() ? "" : " AND i."+colEmpName+" = ANY(?) ") +
                    "GROUP BY 1 ORDER BY 1";
            companyTotals = jdbc.query(sqlCompByName, ps -> {
                ps.setInt(1, prev);
                if (!filterEmpNames.isEmpty()) ps.setArray(2, ps.getConnection().createArrayOf("text", filterEmpNames.toArray()));
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("amount", rs.getDouble(2));
                return m;
            });
        }
        resp.put("employees", out);
        resp.put("companyTotals", companyTotals);
        return ResponseEntity.ok(resp);
    }
}
