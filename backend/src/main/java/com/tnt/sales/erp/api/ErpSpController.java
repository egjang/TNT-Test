package com.tnt.sales.erp.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/erp/sp")
public class ErpSpController {

    private static final Logger log = LoggerFactory.getLogger(ErpSpController.class);

    private final JdbcTemplate tntJdbc;
    private final JdbcTemplate dysJdbc;

    public ErpSpController(
            @Qualifier("mssqlJdbcTemplate") JdbcTemplate tntJdbc,
            @Qualifier("mssqlDysJdbcTemplate") JdbcTemplate dysJdbc) {
        this.tntJdbc = tntJdbc;
        this.dysJdbc = dysJdbc;
    }

    /**
     * SP 목록 조회
     * GET /api/v1/erp/sp/list?company=TNT&keyword=xxx
     */
    @GetMapping("/list")
    public Map<String, Object> getSpList(
            @RequestParam(defaultValue = "TNT") String company,
            @RequestParam String keyword) {

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> items = new ArrayList<>();

        try {
            JdbcTemplate jdbc = "DYS".equalsIgnoreCase(company) ? dysJdbc : tntJdbc;

            // MSSQL 시스템 뷰에서 SP 목록 조회
            String sql = "SELECT " +
                    "  o.name AS sp_name, " +
                    "  o.type_desc AS sp_type, " +
                    "  o.create_date, " +
                    "  o.modify_date " +
                    "FROM sys.objects o " +
                    "WHERE o.type IN ('P', 'FN', 'TF', 'IF') " +  // P=Stored Procedure, FN/TF/IF=Functions
                    "  AND o.name LIKE ? " +
                    "ORDER BY o.name";

            List<Map<String, Object>> rows = jdbc.queryForList(sql, "%" + keyword + "%");

            for (Map<String, Object> row : rows) {
                Map<String, Object> item = new HashMap<>();
                item.put("name", row.get("sp_name"));
                item.put("type", row.get("sp_type"));
                item.put("createDate", row.get("create_date") != null ? row.get("create_date").toString() : null);
                item.put("modifyDate", row.get("modify_date") != null ? row.get("modify_date").toString() : null);
                items.add(item);
            }

            result.put("success", true);
            result.put("items", items);
            result.put("count", items.size());

            log.info("SP list query: company={}, keyword={}, count={}", company, keyword, items.size());

        } catch (Exception e) {
            log.error("SP list query failed", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("items", items);
        }

        return result;
    }

    /**
     * SP 내용 조회
     * GET /api/v1/erp/sp/content?company=TNT&spName=xxx
     */
    @GetMapping("/content")
    public Map<String, Object> getSpContent(
            @RequestParam(defaultValue = "TNT") String company,
            @RequestParam String spName) {

        Map<String, Object> result = new HashMap<>();

        try {
            JdbcTemplate jdbc = "DYS".equalsIgnoreCase(company) ? dysJdbc : tntJdbc;

            // SP 내용 조회 (sp_helptext 대신 sys.sql_modules 사용)
            String sql = "SELECT m.definition " +
                    "FROM sys.sql_modules m " +
                    "JOIN sys.objects o ON m.object_id = o.object_id " +
                    "WHERE o.name = ?";

            List<Map<String, Object>> rows = jdbc.queryForList(sql, spName);

            if (!rows.isEmpty() && rows.get(0).get("definition") != null) {
                result.put("success", true);
                result.put("content", rows.get(0).get("definition").toString());
            } else {
                // definition이 null인 경우 (암호화되어 있거나 권한 부족)
                result.put("success", false);
                result.put("content", "-- SP 내용을 조회할 수 없습니다.\n-- 암호화되어 있거나 권한이 부족할 수 있습니다.\n-- SP Name: " + spName);
            }

            log.info("SP content query: company={}, spName={}", company, spName);

        } catch (Exception e) {
            log.error("SP content query failed", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("content", "-- 오류 발생: " + e.getMessage());
        }

        return result;
    }
}
