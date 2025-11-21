package com.tnt.sales.target.api;

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

@RestController
@RequestMapping("/api/v1/targets/assigned")
public class SalesTargetAssignedController {
    private static final Logger log = LoggerFactory.getLogger(SalesTargetAssignedController.class);
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    Environment env;

    static class UpsertReq {
        public String targetYear; // 'YYYY-01-01'
        public Long empSeq;       // optional
        public String empName;    // required for logical key
        public String companyName; // 'TNT' | 'DYS'
        public Double targetAmount; // numeric (same unit as UI)
        public String targetStage;  // '기안중' | '확정'
        public Integer versionNo;   // optional; 1=Best, 2=Moderate (default 1)
    }

    @PostMapping("/upsert")
    public ResponseEntity<?> upsert(@RequestBody List<UpsertReq> body,
                                    @RequestHeader(value = "X-EMP-SEQ", required = false) String empSeqHeader) {
        if (body == null || body.isEmpty()) return ResponseEntity.ok(Map.of("ok", true, "count", 0));
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of("ok", true, "count", body.size()));
            }
        }

        int total = 0;
        final String tbl = resolveTable();
        Long actor = null; try { if (empSeqHeader != null && !empSeqHeader.isBlank()) actor = Long.parseLong(empSeqHeader); } catch (Exception ignore) {}

        // target table resolved via resolveTable()

        for (UpsertReq r : body) {
            LocalDate parsedTy = null;
            try { parsedTy = LocalDate.parse(r.targetYear); } catch (Exception ignore) {}
            if (parsedTy == null) continue;
            final LocalDate ty = parsedTy;
            final String name = (r.empName == null ? "" : r.empName).trim();
            final String company = (r.companyName == null ? "" : r.companyName).trim().toUpperCase();
            if (name.isEmpty() || company.isEmpty()) {
                log.warn("assigned.upsert skip due to empty key: name='{}' company='{}'", name, company);
                continue;
            }
            final String bizGroup = "TNT".equalsIgnoreCase(company) ? "TNT" : "DYS";
            final String bizName = "TNT".equalsIgnoreCase(company) ? "복층" : "실란트";
            final double amt = (r.targetAmount == null ? 0d : r.targetAmount);
            final String stage = (r.targetStage == null || r.targetStage.isBlank()) ? null : r.targetStage.trim();

            // Normalize optional fields
            // emp_seq is not stored in sales_target_assigned; keep name/company only
            final Long empSeqVal = null;
            final Long actorVal = actor;

            // Debug log of attempted upsert values (may help diagnosing 500)
            try {
                boolean sqlLog = Boolean.parseBoolean(env.getProperty("app.debug.assigned.sqlLog", "false"));
                if (sqlLog && log.isDebugEnabled()) {
                    log.debug("assigned.upsert attempt ty={} name='{}' company={} amt={} stage={} empSeq={} actor={}",
                            ty, name, company, amt, stage, empSeqVal, actorVal);
                }
            } catch (Exception ignore) {}

            // Update by logical key (target_year, emp_name, company_name)
            final int verNo = (r.versionNo == null || r.versionNo <= 0) ? 1 : r.versionNo;

            int updated = jdbc.update(
                    "UPDATE " + tbl + " SET assigned_amount=?, target_stage=?, updated_at=now(), updated_by=?, biz_area_group=?, biz_area_name=? " +
                            "WHERE target_year=? AND emp_name=? AND company_name=? AND COALESCE(version_no,1)=?",
                    ps -> {
                        ps.setObject(1, amt);
                        if (stage == null) ps.setObject(2, null); else ps.setString(2, stage);
                        // Avoid null for audit columns if DB has NOT NULL constraint
                        if (actorVal == null) ps.setLong(3, 0L); else ps.setLong(3, actorVal);
                        ps.setString(4, bizGroup);
                        ps.setString(5, bizName);
                        ps.setDate(6, Date.valueOf(ty));
                        ps.setString(7, name);
                        ps.setString(8, company);
                        ps.setInt(9, verNo);
                    }
            );
            if (updated == 0) {
                long newId = Math.abs(java.util.UUID.randomUUID().getMostSignificantBits());
                // Log a fully inlined INSERT statement for debugging (Postgres syntax)
                try {
                    boolean sqlLog = Boolean.parseBoolean(env.getProperty("app.debug.assigned.sqlLog", "false"));
                    if (sqlLog && log.isDebugEnabled()) {
                    String insertLog = "INSERT INTO " + tbl + " " +
                            "(id, created_at, updated_at, target_year, emp_name, company_name, assigned_amount, target_stage, created_by, updated_by, biz_area_group, biz_area_name) VALUES (" +
                            sqlLiteral(newId) + ", now(), now(), " +
                                sqlLiteral(Date.valueOf(ty)) + ", " +
                                sqlLiteral(name) + ", " +
                                sqlLiteral(company) + ", " +
                                sqlLiteral(amt) + ", " +
                                sqlLiteral(stage) + ", " +
                                sqlLiteral(actorVal == null ? 0L : actorVal) + ", " +
                                sqlLiteral(actorVal == null ? 0L : actorVal) + ", " +
                                sqlLiteral(bizGroup) + ", " +
                                sqlLiteral(bizName) + ");";
                        log.debug("assigned.upsert INSERT SQL: {}", insertLog);
                    }
                } catch (Exception ignore) {}
                jdbc.update(
                        "INSERT INTO " + tbl + " (id, created_at, updated_at, target_year, emp_name, company_name, assigned_amount, target_stage, created_by, updated_by, biz_area_group, biz_area_name, version_no) " +
                                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        ps -> {
                            ps.setLong(1, newId);
                            ps.setTimestamp(2, new java.sql.Timestamp(System.currentTimeMillis()));
                            ps.setTimestamp(3, new java.sql.Timestamp(System.currentTimeMillis()));
                            ps.setDate(4, Date.valueOf(ty));
                            ps.setString(5, name);
                            ps.setString(6, company);
                            ps.setObject(7, amt);
                            if (stage == null) ps.setObject(8, null); else ps.setString(8, stage);
                            // Avoid null for audit columns if DB has NOT NULL constraint
                            if (actorVal == null) { ps.setLong(9, 0L); ps.setLong(10, 0L); }
                            else { ps.setLong(9, actorVal); ps.setLong(10, actorVal); }
                            ps.setString(11, bizGroup);
                            ps.setString(12, bizName);
                            ps.setInt(13, verNo);
                        }
                );
            }
            total++;
        }
        return ResponseEntity.ok(Map.of("ok", true, "count", total));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestParam("year") int year,
                                     @RequestHeader(value = "X-EMP-SEQ", required = false) String empSeqHeader) {
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of("ok", true));
            }
        }
        Long actor = null; try { if (empSeqHeader != null && !empSeqHeader.isBlank()) actor = Long.parseLong(empSeqHeader); } catch (Exception ignore) {}
        final Long actorVal2 = actor;
        final int yearVal = year;
        String tbl = resolveTable();
        boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
        String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";
        String sql = "UPDATE " + tbl + " SET target_stage='확정', updated_at=now(), updated_by=? WHERE " + yearExpr + "=?";
        int n = jdbc.update(sql, ps -> {
            if (actorVal2 == null) ps.setObject(1, null); else ps.setLong(1, actorVal2);
            ps.setInt(2, yearVal);
        });
        return ResponseEntity.ok(Map.of("ok", true, "count", n));
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam("year") int year,
                                  @RequestParam(value = "empSeqs", required = false) String empSeqsCsv,
                                  @RequestParam(value = "empNames", required = false) String empNamesCsv,
                                  @RequestParam(value = "versionNo", required = false) Integer versionNo) {
        String tbl = resolveTable();
        boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
        String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";
        // Return all rows for the selected year (company targets input scope)
        String sql = "SELECT t.target_year, COALESCE(t.emp_name, e.emp_name) AS emp_name, " +
                "COALESCE(e.emp_id, '') AS emp_id, COALESCE(e.dept_name, '') AS dept_name, " +
                "t.company_name, COALESCE(t.assigned_amount, 0) AS assigned_amount, t.target_stage " +
                "FROM " + tbl + " t " +
                "LEFT JOIN public.employee e ON e.assignee_id = t.assignee_id " +
                "WHERE " + yearExpr + "=?" +
                (versionNo != null ? " AND COALESCE(t.version_no,1)=?" : "") +
                " ORDER BY emp_name, company_name";
        List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
            ps.setInt(1, year);
            if (versionNo != null) ps.setInt(2, versionNo);
        }, (rs, i) -> {
            Map<String,Object> m = new LinkedHashMap<>();
            java.sql.Date ty = rs.getDate(1);
            m.put("target_year", ty != null ? ty.toLocalDate().toString() : null);
            m.put("emp_name", rs.getString(2));
            m.put("emp_id", rs.getString(3));
            m.put("dept_name", rs.getString(4));
            m.put("company_name", rs.getString(5));
            m.put("assigned_amount", rs.getObject(6));
            m.put("target_stage", rs.getString(7));
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    private String resolveTable() {
        String configured = env.getProperty("app.assigned.table", "");
        if (configured != null && !configured.isBlank()) return configured.trim();
        boolean mssql = false;
        try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
        return mssql ? "dbo.sales_target_assigned" : "public.sales_target_assigned";
    }

    private static String sqlLiteral(Object v) {
        if (v == null) return "NULL";
        if (v instanceof Number) return String.valueOf(v);
        if (v instanceof java.util.Date) {
            java.time.LocalDate d = (v instanceof java.sql.Date)
                    ? ((java.sql.Date) v).toLocalDate()
                    : new java.sql.Date(((java.util.Date) v).getTime()).toLocalDate();
            return "'" + d.toString() + "'";
        }
        if (v instanceof java.time.LocalDate) {
            return "'" + ((java.time.LocalDate) v).toString() + "'";
        }
        String s = String.valueOf(v);
        return "'" + s.replace("'", "''") + "'";
    }
}
