package com.tnt.sales.target.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/targets/year")
public class SalesTargetYearController {
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    Environment env;

    static class UpsertReq {
        public String targetYear; // 'YYYY-01-01' 권장
        public Integer versionNo;
        public String companyName;
        public String bizAreaGroup;
        public String bizAreaName;
        public Double targetAmountMin;
        public Double targetAmountMax;
        public String targetStage;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam("year") int year,
                                  @RequestParam(value = "company", required = false) String company,
                                  @RequestParam(value = "mode", required = false) String mode,
                                  @RequestParam(value = "versionNo", required = false) Integer versionNo) {
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                List<Map<String,Object>> stub = new ArrayList<>();
                if (company == null || company.equalsIgnoreCase("TNT")) {
                    stub.add(Map.of("target_year", LocalDate.of(year,1,1).toString(), "version_no", 1, "company_name", "TNT",
                            "biz_area_group", "TNT", "biz_area_name", "복층유리", "target_amount_min", 0, "target_amount_max", 0, "target_stage", null));
                    stub.add(Map.of("target_year", LocalDate.of(year,1,1).toString(), "version_no", 1, "company_name", "TNT",
                            "biz_area_group", "TNT", "biz_area_name", "건자재", "target_amount_min", 0, "target_amount_max", 0, "target_stage", null));
                }
                if (company == null || company.equalsIgnoreCase("DYS")) {
                    stub.add(Map.of("target_year", LocalDate.of(year,1,1).toString(), "version_no", 1, "company_name", "DYS",
                            "biz_area_group", "DYS", "biz_area_name", "실란트", "target_amount_min", 0, "target_amount_max", 0, "target_stage", null));
                }
                return ResponseEntity.ok(stub);
            }
        }

        Integer ver = null;
        try {
            if (versionNo != null) ver = versionNo;
            else if (mode != null) {
                String m = mode.trim().toLowerCase();
                if ("best".equals(m)) ver = 1; else if ("moderate".equals(m)) ver = 2;
            }
        } catch (Exception ignore) {}

        String sql = "SELECT target_year, version_no, company_name, biz_area_group, biz_area_name, " +
                "target_amount_min, target_amount_max, target_stage " +
                "FROM public.sales_target_year WHERE EXTRACT(YEAR FROM target_year)=?" +
                (company != null && !company.isBlank() ? " AND company_name = ?" : "") +
                (ver != null ? " AND version_no = ?" : "") +
                " ORDER BY company_name, biz_area_group, biz_area_name";
        List<Object> params = new ArrayList<>();
        params.add(year);
        if (company != null && !company.isBlank()) params.add(company);
        if (ver != null) params.add(ver);
        List<Map<String,Object>> rows = jdbc.query(sql, params.toArray(), (rs, i) -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("target_year", rs.getDate(1).toLocalDate().toString());
            m.put("version_no", rs.getInt(2));
            m.put("company_name", rs.getString(3));
            m.put("biz_area_group", rs.getString(4));
            m.put("biz_area_name", rs.getString(5));
            m.put("target_amount_min", rs.getObject(6));
            m.put("target_amount_max", rs.getObject(7));
            m.put("target_stage", rs.getString(8));
            return m;
        });
        return ResponseEntity.ok(rows);
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
        for (UpsertReq r : body) {
            LocalDate parsedTy = null;
            try { parsedTy = LocalDate.parse(r.targetYear); } catch (Exception ignore) {}
            if (parsedTy == null) continue;
            final LocalDate ty = parsedTy;
            final int ver = (r.versionNo != null ? r.versionNo : 1);
            final double min = (r.targetAmountMin != null ? r.targetAmountMin : (r.targetAmountMax != null ? r.targetAmountMax : 0));
            final double max = (r.targetAmountMax != null ? r.targetAmountMax : min);
            final String company = r.companyName;
            final String group = r.bizAreaGroup;
            final String name = r.bizAreaName;
            final String stage = (r.targetStage == null || r.targetStage.isBlank()) ? null : r.targetStage;
            // UPDATE first
            int updated = jdbc.update(
                    "UPDATE public.sales_target_year SET target_amount_min=?, target_amount_max=?, target_stage=?, updated_at=now(), updated_by=? " +
                            "WHERE target_year=? AND version_no=? AND company_name=? AND biz_area_group=? AND biz_area_name=?",
                    ps -> {
                        ps.setObject(1, min);
                        ps.setObject(2, max);
                        if (stage == null) ps.setObject(3, null); else ps.setString(3, stage);
                        if (empSeqHeader != null && !empSeqHeader.isBlank()) try { ps.setLong(4, Long.parseLong(empSeqHeader)); } catch (Exception e) { ps.setObject(4, null); } else ps.setObject(4, null);
                        ps.setDate(5, Date.valueOf(ty));
                        ps.setInt(6, ver);
                        ps.setString(7, company);
                        ps.setString(8, group);
                        ps.setString(9, name);
                    }
            );
            if (updated == 0) {
                long newId = Math.abs(java.util.UUID.randomUUID().getMostSignificantBits()); // robust positive unique id
                int ins = jdbc.update(
                        "INSERT INTO public.sales_target_year (id, created_at, updated_at, target_year, version_no, company_name, biz_area_group, biz_area_name, target_amount_min, target_amount_max, target_stage, created_by, updated_by) " +
                                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        ps -> {
                            ps.setLong(1, newId);
                            ps.setTimestamp(2, new java.sql.Timestamp(System.currentTimeMillis()));
                            ps.setTimestamp(3, new java.sql.Timestamp(System.currentTimeMillis()));
                            ps.setDate(4, Date.valueOf(ty));
                            ps.setInt(5, ver);
                            ps.setString(6, company);
                            ps.setString(7, group);
                            ps.setString(8, name);
                            ps.setObject(9, min);
                            ps.setObject(10, max);
                            if (stage == null) ps.setObject(11, null); else ps.setString(11, stage);
                            if (empSeqHeader != null && !empSeqHeader.isBlank()) try { ps.setLong(12, Long.parseLong(empSeqHeader)); } catch (Exception e) { ps.setObject(12, null); } else ps.setObject(12, null);
                            if (empSeqHeader != null && !empSeqHeader.isBlank()) try { ps.setLong(13, Long.parseLong(empSeqHeader)); } catch (Exception e) { ps.setObject(13, null); } else ps.setObject(13, null);
                        }
                );
            }
            total++;
        }
        return ResponseEntity.ok(Map.of("ok", true, "count", total));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestParam("year") int year,
                                     @RequestParam(value = "company", required = false) String company,
                                     @RequestHeader(value = "X-EMP-SEQ", required = false) String empSeqHeader) {
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(Map.of("ok", true));
            }
        }
        String sql = "UPDATE public.sales_target_year SET target_stage='확정', updated_at=now(), updated_by=? WHERE EXTRACT(YEAR FROM target_year)=?" +
                (company != null && !company.isBlank() ? " AND company_name=?" : "");
        List<Object> params = new ArrayList<>();
        Long actor = null; try { if (empSeqHeader != null && !empSeqHeader.isBlank()) actor = Long.parseLong(empSeqHeader); } catch (Exception ignore) {}
        params.add(actor);
        params.add(year);
        if (company != null && !company.isBlank()) params.add(company);
        int n = jdbc.update(sql, params.toArray());
        return ResponseEntity.ok(Map.of("ok", true, "count", n));
    }
}
