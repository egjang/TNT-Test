package com.tnt.sales.emp.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class EmployeeController {
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    Environment env;

    @GetMapping("/employees")
    public ResponseEntity<?> listEmployees(
            @RequestParam(value = "depts", required = false) String deptsCsv
    ) {
        // Default target departments
        List<String> target = new ArrayList<>(List.of("영업1본부","영업1팀","영업2본부","영업2팀"));
        if (deptsCsv != null && !deptsCsv.isBlank()) {
            // Special: depts=all -> return all employees (no dept filter)
            if ("all".equalsIgnoreCase(deptsCsv.trim())) {
                try {
                    String sql = "SELECT emp_id, emp_name, dept_name, assignee_id FROM public.employee ORDER BY emp_name ASC";
                    java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, (rs, i) -> {
                        java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                        m.put("emp_id", rs.getString(1));
                        m.put("emp_name", rs.getString(2));
                        m.put("dept_name", rs.getString(3));
                        m.put("assignee_id", rs.getString(4));
                        return m;
                    });
                    return ResponseEntity.ok(rows);
                } catch (Exception ex) {
                    return ResponseEntity.status(500).body(java.util.Map.of("error","employee_query_failed","message",ex.getMessage()));
                }
            }
            target.clear();
            for (String p : deptsCsv.split(",")) {
                String t = p == null ? "" : p.trim();
                if (!t.isEmpty()) target.add(t);
            }
            if (target.isEmpty()) target.addAll(List.of("영업1본부","영업1팀","영업2본부","영업2팀"));
        }

        // nodb profile: return stub list
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(List.of(
                        Map.of("emp_id", "S01001", "assignee_id", "S01001", "emp_name", "홍길동", "dept_name", "영업1본부"),
                        Map.of("emp_id", "S01002", "assignee_id", "S01002", "emp_name", "김민수", "dept_name", "영업1팀"),
                        Map.of("emp_id", "S02001", "assignee_id", "S02001", "emp_name", "이서준", "dept_name", "영업2본부"),
                        Map.of("emp_id", "S02002", "assignee_id", "S02002", "emp_name", "박서연", "dept_name", "영업2팀")
                ));
            }
        }

        try {
            // Build deterministic IN list to avoid driver-specific ANY/ARRAY issues
            StringBuilder in = new StringBuilder();
            in.append("(");
            for (int i = 0; i < target.size(); i++) { if (i>0) in.append(","); in.append("?"); }
            in.append(")");
            String sql = "SELECT emp_id, emp_name, dept_name, assignee_id FROM public.employee WHERE dept_name IN " + in + " ORDER BY emp_name ASC";
            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                int idx = 1;
                for (String d : target) ps.setString(idx++, d);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("emp_id", rs.getString(1));
                m.put("emp_name", rs.getString(2));
                m.put("dept_name", rs.getString(3));
                m.put("assignee_id", rs.getString(4));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error","employee_query_failed","message",ex.getMessage()));
        }
    }

    @GetMapping("/employee/by-assignee")
    public ResponseEntity<?> getByAssignee(
            @RequestParam(value = "assigneeId", required = false) String assigneeId,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "companyCode", required = false) String companyCode
    ) {
        String aid = assigneeId == null ? "" : assigneeId.trim();
        String eid = empId == null ? "" : empId.trim();
        if (aid.isEmpty() && eid.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","assigneeId_or_empId_required"));
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("assignee_id", aid);
                m.put("emp_id", aid);
                m.put("emp_name", aid);
                m.put("tnt_emp_seq", 4);
                m.put("dys_emp_seq", 4);
                String cc = companyCode == null ? "TNT" : companyCode.trim().toUpperCase();
                Long resolved = "DYS".equals(cc) ? 4L : 4L;
                m.put("resolvedSalesEmpSeq", resolved);
                return ResponseEntity.ok(m);
            }
        }
        Map<String,Object> row = null;
        try {
            if (!aid.isEmpty()) {
                String sql = "SELECT emp_id, emp_name, assignee_id, tnt_emp_seq, dys_emp_seq FROM public.employee WHERE assignee_id = ? LIMIT 1";
                row = jdbc.queryForMap(sql, aid);
            }
        } catch (Exception ignore) { row = null; }
        if (row == null && !eid.isEmpty()) {
            try {
                String sqlByEmp = "SELECT emp_id, emp_name, assignee_id, tnt_emp_seq, dys_emp_seq FROM public.employee WHERE emp_id = ? LIMIT 1";
                row = jdbc.queryForMap(sqlByEmp, eid);
            } catch (Exception ignore2) { row = null; }
        }
        if (row == null) {
            return ResponseEntity.status(404).body(Map.of("error","employee_not_found"));
        }
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("emp_id", row.get("emp_id"));
        out.put("emp_name", row.get("emp_name"));
        out.put("assignee_id", row.get("assignee_id"));
        out.put("tnt_emp_seq", row.get("tnt_emp_seq"));
        out.put("dys_emp_seq", row.get("dys_emp_seq"));
        String cc = (companyCode == null || companyCode.isBlank()) ? "TNT" : companyCode.trim().toUpperCase();
        Object v = "DYS".equals(cc) ? row.get("dys_emp_seq") : row.get("tnt_emp_seq");
        if (v == null) v = 4; // last-resort fallback
        out.put("resolvedSalesEmpSeq", v);
        return ResponseEntity.ok(out);
    }
}
