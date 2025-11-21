package com.tnt.sales.strategy.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/strategy")
public class StrategyController {
    private static final Logger log = LoggerFactory.getLogger(StrategyController.class);
    @Autowired Environment env;
    @Autowired JdbcTemplate jdbc;

    /**
     * Upload a strategy file to SharePoint and return a sharable link.
     * Skeleton only: returns a stub response when Graph/SharePoint configuration is not present.
     *
     * Form fields:
     *  - year (int)
     *  - strategyType (string)
     *  - title (string)
     *  - summary (string)
     *  - file (multipart file)
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @RequestParam("year") int year,
            @RequestParam(value = "strategyType", required = false) String strategyType,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "summary", required = false) String summary,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        try {
            if (year <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args","message","year required"));
            if (file == null || file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","invalid_args","message","file required"));

            // Year to folder token (YYYY)
            final int y = year;
            final String folder = "/SalesStrategies/" + y;

            // nodb profile: return stubbed link (developer convenience)
            for (String p : env.getActiveProfiles()) {
                if ("nodb".equalsIgnoreCase(p)) {
                    Map<String,Object> stub = new LinkedHashMap<>();
                    stub.put("ok", true);
                    stub.put("stub", true);
                    stub.put("year", y);
                    stub.put("strategyType", strategyType);
                    stub.put("title", title);
                    stub.put("summary", summary);
                    stub.put("fileName", file.getOriginalFilename());
                    stub.put("fileSize", file.getSize());
                    stub.put("fileUrl", "https://example.invalid/sharepoint/stub/" + y + "/" + (file.getOriginalFilename() == null ? "file" : file.getOriginalFilename()));
                    return ResponseEntity.ok(stub);
                }
            }

            // Read configuration for Graph/SharePoint from environment
            String tenantId = env.getProperty("tnt.sharepoint.tenantId", "");
            String clientId = env.getProperty("tnt.sharepoint.clientId", "");
            String clientSecret = env.getProperty("tnt.sharepoint.clientSecret", "");
            String siteHostname = env.getProperty("tnt.sharepoint.siteHostname", "");
            String sitePath = env.getProperty("tnt.sharepoint.sitePath", "");
            String driveId = env.getProperty("tnt.sharepoint.driveId", "");

            boolean configured = !(tenantId.isBlank() || clientId.isBlank() || clientSecret.isBlank() || siteHostname.isBlank() || sitePath.isBlank());
            if (!configured) {
                Map<String,Object> stub = new LinkedHashMap<>();
                stub.put("ok", true);
                stub.put("stub", true);
                stub.put("reason", "missing_configuration");
                stub.put("required", new String[]{"tnt.sharepoint.tenantId","tnt.sharepoint.clientId","tnt.sharepoint.clientSecret","tnt.sharepoint.siteHostname","tnt.sharepoint.sitePath"});
                stub.put("fileName", file.getOriginalFilename());
                stub.put("fileSize", file.getSize());
                stub.put("fileUrl", "");
                return ResponseEntity.ok(stub);
            }

            // SKELETON: Outline of steps (not implemented)
            // 1) Acquire token: POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token (scope=.default)
            // 2) Resolve siteId: GET /v1.0/sites/{siteHostname}:/sites{sitePath}
            // 3) Resolve driveId (if not configured): GET /v1.0/sites/{siteId}/drives
            // 4) Ensure folder: /SalesStrategies and /SalesStrategies/{year}
            // 5) Upload file: PUT /v1.0/drives/{driveId}/root:/SalesStrategies/{year}/{filename}:/content
            // 6) Create org link: POST /v1.0/drives/{driveId}/items/{itemId}/createLink { type: 'view', scope: 'organization' }

            return ResponseEntity.status(501).body(Map.of(
                    "error", "not_implemented",
                    "message", "Graph upload/link is not implemented in skeleton.",
                    "folder", folder,
                    "configured", true
            ));
        } catch (Exception e) {
            log.error("[Strategy.upload] failed: {}", e.toString());
            return ResponseEntity.status(500).body(Map.of("error","strategy_upload_failed","message", e.getMessage()));
        }
    }

    static class CreateReq {
        public Integer year;
        public String strategyType;
        public String title;
        public String summary;
        public String fileUrl; // optional (placeholder before real upload)
    }

    /**
     * Create a sales_strategy row (JSON-based; fileUrl can be a placeholder until real upload is wired).
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> create(@RequestBody CreateReq body) {
        try {
            int year = body != null && body.year != null ? body.year : 0;
            String strategyType = body != null ? (body.strategyType == null ? "" : body.strategyType.trim()) : "";
            String title = body != null ? (body.title == null ? "" : body.title.trim()) : "";
            String summary = body != null ? (body.summary == null ? "" : body.summary.trim()) : "";
            String fileUrl = body != null ? (body.fileUrl == null ? "" : body.fileUrl.trim()) : "";
            if (year <= 0 || strategyType.isEmpty() || title.isEmpty())
                return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));

            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(Map.of(
                    "id", System.currentTimeMillis(),
                    "target_year", String.format("%04d-01-01", year),
                    "strategy_type", strategyType,
                    "title", title,
                    "summary", summary,
                    "file_url", (fileUrl.isBlank()?"https://example.invalid/sharepoint/test/"+year+"/stub.pdf":fileUrl),
                    "created_at", java.time.OffsetDateTime.now().toString()
            )); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tbl = env.getProperty("app.sales.strategy.table", mssql ? "dbo.sales_strategy" : "public.sales_strategy");
            java.sql.Date ty = java.sql.Date.valueOf(LocalDate.of(year, 1, 1));

            long id = System.currentTimeMillis();
            String sql = "INSERT INTO "+tbl+" (id, created_at, updated_at, target_year, strategy_type, title, summary, file_url) VALUES (now_microsec_id(), now(), now(), ?, ?, ?, ?, ?)";
            // For environments without now_microsec_id(), fallback to manual id setting
            boolean hasNowId = false;
            try {
                jdbc.queryForObject("SELECT now_microsec_id()", Long.class);
                hasNowId = true;
            } catch (Exception ignore) { hasNowId = false; }
            if (!hasNowId) {
                sql = "INSERT INTO "+tbl+" (id, created_at, updated_at, target_year, strategy_type, title, summary, file_url) VALUES (?,?,?,?,?,?,?,?)";
            }
            final String fileUrlFinal = fileUrl.isBlank()? ("https://example.invalid/sharepoint/test/"+year+"/"+title.replace(' ','_')+".pdf") : fileUrl;
            final long idFinal = id;
            final boolean hasNowIdFinal = hasNowId;
            jdbc.update(sql, ps -> {
                int idx=1;
                if (!hasNowIdFinal) ps.setLong(idx++, idFinal);
                java.sql.Timestamp nowTs = new java.sql.Timestamp(System.currentTimeMillis());
                if (!hasNowIdFinal) { ps.setTimestamp(idx++, nowTs); ps.setTimestamp(idx++, nowTs); }
                ps.setDate(idx++, ty);
                ps.setString(idx++, strategyType);
                ps.setString(idx++, title);
                ps.setString(idx++, summary);
                ps.setString(idx++, fileUrlFinal);
            });
            return ResponseEntity.ok(Map.of(
                    "id", idFinal,
                    "target_year", ty.toString(),
                    "strategy_type", strategyType,
                    "title", title,
                    "summary", summary,
                    "file_url", fileUrlFinal
            ));
        } catch (Exception e) {
            log.error("[Strategy.create] failed: {}", e.toString());
            return ResponseEntity.status(500).body(Map.of("error","strategy_create_failed","message", e.getMessage()));
        }
    }

    /**
     * List strategies for a given year.
     */
    @GetMapping
    public ResponseEntity<?> list(@RequestParam("year") int year,
                                  @RequestParam(value = "limit", required = false) Integer limit,
                                  @RequestParam(value = "offset", required = false) Integer offset) {
        try {
            if (year <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(java.util.List.of()); }
            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tbl = env.getProperty("app.sales.strategy.table", mssql ? "dbo.sales_strategy" : "public.sales_strategy");
            String yearExpr = mssql ? "YEAR(target_year)" : "EXTRACT(YEAR FROM target_year)";
            StringBuilder sb = new StringBuilder();
            sb.append("SELECT id, target_year, strategy_type, title, summary, file_url, created_at FROM ").append(tbl)
              .append(" WHERE ").append(yearExpr).append("=? ORDER BY created_at DESC");
            if (limit != null && limit > 0) sb.append(mssql?" OFFSET "+(offset==null?0:offset)+" ROWS FETCH NEXT "+limit+" ROWS ONLY":" LIMIT "+limit+(offset!=null?" OFFSET "+offset:""));
            final String sql = sb.toString();
            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, ps -> { ps.setInt(1, year); }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("id", rs.getLong(1));
                m.put("target_year", rs.getDate(2));
                m.put("strategy_type", rs.getString(3));
                m.put("title", rs.getString(4));
                m.put("summary", rs.getString(5));
                m.put("file_url", rs.getString(6));
                m.put("created_at", rs.getTimestamp(7));
                return m;
            });
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","strategy_list_failed","message", e.getMessage()));
        }
    }

    /**
     * Update strategy fields by id.
     */
    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> update(@PathVariable("id") long id, @RequestBody CreateReq body) {
        try {
            if (id <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args"));
            String strategyType = body != null ? (body.strategyType == null ? "" : body.strategyType.trim()) : "";
            String title = body != null ? (body.title == null ? "" : body.title.trim()) : "";
            String summary = body != null ? (body.summary == null ? "" : body.summary.trim()) : "";
            String fileUrl = body != null ? (body.fileUrl == null ? "" : body.fileUrl.trim()) : "";
            int year = body != null && body.year != null ? body.year : 0;

            // nodb stub
            for (String p : env.getActiveProfiles()) { if ("nodb".equalsIgnoreCase(p)) return ResponseEntity.ok(Map.of(
                    "id", id,
                    "strategy_type", strategyType,
                    "title", title,
                    "summary", summary,
                    "file_url", fileUrl
            )); }

            boolean mssql = false; try { for (String p : env.getActiveProfiles()) { if ("mssql".equalsIgnoreCase(p)) { mssql = true; break; } } } catch (Exception ignore) {}
            String tbl = env.getProperty("app.sales.strategy.table", mssql ? "dbo.sales_strategy" : "public.sales_strategy");
            String nowFn = mssql ? "SYSDATETIME()" : "now()";
            String sql = "UPDATE "+tbl+" SET updated_at="+nowFn+", strategy_type=?, title=?, summary=?, file_url=? WHERE id=?";
            final String st = strategyType; final String tt = title; final String sm = summary; final String fu = fileUrl; final long idFinal = id;
            int n = jdbc.update(sql, ps -> {
                int idx=1;
                ps.setString(idx++, st);
                ps.setString(idx++, tt);
                ps.setString(idx++, sm);
                ps.setString(idx++, fu);
                ps.setLong(idx++, idFinal);
            });
            if (n > 0) return ResponseEntity.ok(Map.of("ok", true, "id", idFinal));
            // Upsert path: insert when not found
            if (year <= 0) return ResponseEntity.badRequest().body(Map.of("error","invalid_args","message","year required for upsert"));
            java.sql.Date ty = java.sql.Date.valueOf(LocalDate.of(year, 1, 1));
            String ins;
            if (mssql) {
                ins = "INSERT INTO "+tbl+" (id, created_at, updated_at, target_year, strategy_type, title, summary, file_url) VALUES (?,?,?,?,?,?,?,?)";
            } else {
                ins = "INSERT INTO "+tbl+" (id, created_at, updated_at, target_year, strategy_type, title, summary, file_url) VALUES (?,?,?,?,?,?,?,?)";
            }
            final java.sql.Date tyFinal = ty;
            jdbc.update(ins, ps -> {
                int idx=1;
                ps.setLong(idx++, idFinal);
                java.sql.Timestamp nowTs = new java.sql.Timestamp(System.currentTimeMillis());
                ps.setTimestamp(idx++, nowTs);
                ps.setTimestamp(idx++, nowTs);
                ps.setDate(idx++, tyFinal);
                ps.setString(idx++, st);
                ps.setString(idx++, tt);
                ps.setString(idx++, sm);
                ps.setString(idx++, fu);
            });
            return ResponseEntity.ok(Map.of("ok", true, "id", idFinal));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","strategy_update_failed","message", e.getMessage()));
        }
    }
}
