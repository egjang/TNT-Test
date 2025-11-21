package com.tnt.sales.item.api;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/items")
    public class ItemsController {
    private final JdbcTemplate jdbc;
    private final Environment env;

    public ItemsController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @GetMapping("/dim")
    public ResponseEntity<?> distinctSubcategoryAndUnit() {
        // Prefer Postgres table and columns defined via env, fall back to defaults
        String tbl = env.getProperty("app.item.table", "public.item");
        String colSub = env.getProperty("app.item.columns.item_subcategory", "item_subcategory");
        String colUnit = env.getProperty("app.item.columns.sales_mgmt_unit", "sales_mgmt_unit");
        String colSubSeq = env.getProperty("app.item.columns.item_subcategory_seq", "item_subcategory_seq");
        String colUnitSeq = env.getProperty("app.item.columns.sales_mgmt_unit_seq", "sales_mgmt_unit_seq");
        try {
            // Try item table with seq columns first
            String sql1 = "SELECT DISTINCT " +
                    "COALESCE("+colSubSeq+", 0) AS item_subcategory_seq, " +
                    "COALESCE("+colUnitSeq+", 0) AS sales_mgmt_unit_seq, " +
                    "coalesce(nullif(trim("+colSub+"), ''), 'na') AS item_subcategory, " +
                    "coalesce(nullif(trim("+colUnit+"), ''), 'na') AS sales_mgmt_unit " +
                    "FROM "+tbl+" ORDER BY 3,4";
            List<Map<String, Object>> rows1 = jdbc.query(sql1, (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("itemSubcategorySeq", rs.getInt(1));
                m.put("salesMgmtUnitSeq", rs.getInt(2));
                m.put("itemSubcategory", rs.getString(3));
                m.put("salesMgmtUnit", rs.getString(4));
                return m;
            });
            if (!rows1.isEmpty()) return ResponseEntity.ok(rows1);
        } catch (Exception ignore) { /* fall through */ }
        try {
            // Fallback: item table without seq columns
            String sql2 = "SELECT DISTINCT " +
                    "coalesce(nullif(trim("+colSub+"), ''), 'na') AS item_subcategory, " +
                    "coalesce(nullif(trim("+colUnit+"), ''), 'na') AS sales_mgmt_unit " +
                    "FROM "+tbl+" ORDER BY 1,2";
            List<Map<String, Object>> rows2 = jdbc.query(sql2, (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("itemSubcategorySeq", 0);
                m.put("salesMgmtUnitSeq", 0);
                m.put("itemSubcategory", rs.getString(1));
                m.put("salesMgmtUnit", rs.getString(2));
                return m;
            });
            if (!rows2.isEmpty()) return ResponseEntity.ok(rows2);
        } catch (Exception ignore) { /* fall through */ }
        try {
            // Fallback: supplier table
            String supTbl = env.getProperty("app.supplier.table", "public.supplier");
            String supSub = env.getProperty("app.supplier.columns.item_subcategory", "item_subcategory");
            String supUnit = env.getProperty("app.supplier.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String sql3 = "SELECT DISTINCT " +
                    "coalesce(nullif(trim("+supSub+"), ''), 'na') AS item_subcategory, " +
                    "coalesce(nullif(trim("+supUnit+"), ''), 'na') AS sales_mgmt_unit " +
                    "FROM "+supTbl+" ORDER BY 1,2";
            List<Map<String, Object>> rows3 = jdbc.query(sql3, (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("itemSubcategorySeq", 0);
                m.put("salesMgmtUnitSeq", 0);
                m.put("itemSubcategory", rs.getString(1));
                m.put("salesMgmtUnit", rs.getString(2));
                return m;
            });
            return ResponseEntity.ok(rows3);
        } catch (Exception e2) {
            return ResponseEntity.status(500).body(Map.of("error", "item_dim_query_failed"));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchItems(
            @RequestParam("q") String q,
            @RequestParam(value = "customerSeq", required = false) Long customerSeq,
            @RequestParam(value = "limit", defaultValue = "100") int limit
    ) {
        // Build order-insensitive tokens: split by space or comma; each token must exist (AND of ILIKE %token%)
        String qt = q == null ? "" : q.trim();
        String[] tokens = qt.isEmpty() ? new String[0] : qt.split("[\\s,]+");

        String invTbl = env.getProperty("app.invoice.table", "public.invoice");
        String invColCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
        String invColItemName = env.getProperty("app.invoice.columns.item_name", "item_name");
        String invColItemSeq = env.getProperty("app.invoice.columns.item_seq", "item_seq");
        String invColDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String invColAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        String invColQty = env.getProperty("app.invoice.columns.qty", "qty");
        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");

        String itemTbl = env.getProperty("app.item.table", "public.item");
        String itemColName = env.getProperty("app.item.columns.item_name", "item_name");
        String itemColSeq = env.getProperty("app.item.columns.item_seq", "item_seq");
        String itemColCompanyType = env.getProperty("app.item.columns.company_type", "company_type");
        String itemColStdUnit = env.getProperty("app.item.columns.item_std_unit", "item_std_unit");
        String custTbl = env.getProperty("app.customer.table", "public.customer");
        String custColSeq = env.getProperty("app.customer.columns.customer_seq", "customer_seq");
        String custColCompanyType = env.getProperty("app.customer.columns.company_type", "company_type");

        boolean hasInvCompanyType = columnExists(invTbl, "company_type");
        boolean hasItemCompanyType = columnExists(itemTbl, itemColCompanyType);
        boolean hasItemStdUnit = columnExists(itemTbl, itemColStdUnit);
        // Fallback: some schemas keep 단위 in sales_mgmt_unit; use it when item_std_unit is missing
        String itemColSalesUnit = env.getProperty("app.item.columns.sales_mgmt_unit", "sales_mgmt_unit");
        boolean hasItemSalesUnit = !hasItemStdUnit && columnExists(itemTbl, itemColSalesUnit);

        String customerCompanyType = null;
        if (customerSeq != null) {
            try {
                customerCompanyType = jdbc.queryForObject(
                        "SELECT " + custColCompanyType + " FROM " + custTbl + " WHERE " + custColSeq + " = ?",
                        String.class,
                        customerSeq
                );
            } catch (Exception ignore) { customerCompanyType = null; }
        }
        boolean applyCompanyFilter = customerCompanyType != null && !customerCompanyType.isBlank();
        String customerCompanyTypeVal = applyCompanyFilter ? customerCompanyType.trim() : null;
        boolean useInvCompanyFilter = applyCompanyFilter && hasInvCompanyType;
        boolean useItemCompanyFilter = applyCompanyFilter && hasItemCompanyType;

        String invCompanyExpr = hasInvCompanyType ? "MAX(i.company_type)" : "NULL::text";
        String itemCompanyExpr = hasItemCompanyType ? ("it." + itemColCompanyType) : "NULL::text";
        String itemStdUnitExpr = hasItemStdUnit
                ? ("it." + itemColStdUnit)
                : (hasItemSalesUnit ? ("it." + itemColSalesUnit) : "NULL::text");

        StringBuilder sql = new StringBuilder();
        sql.append("WITH inv AS (\n");
        // invoice source aggregated to one row per item (recent date)
        String dateExpr = dateIsText
                ? ("to_timestamp(i."+invColDate+", '"+dateFmt+"')")
                : ("i."+invColDate);
        sql.append("  SELECT i.").append(invColItemSeq).append(" AS item_seq, i.").append(invColItemName)
           .append(" AS item_name, MAX(").append(dateExpr).append(") AS inv_date, ")
           .append("to_char(MAX(").append(dateExpr).append(") , 'YY-MM-DD') AS inv_date_text, ")
           .append(" SUM(i.").append(invColAmt).append(") AS cur_amt, SUM(i.").append(invColQty).append(") AS qty, ")
           .append(" ").append(invCompanyExpr).append(" AS company_type, NULL::text AS item_std_unit, ")
           .append(" MIN(i.").append(invColCust).append(") AS customer_seq\n")
           .append("  FROM ").append(invTbl).append(" i\n")
           .append("  WHERE 1=1\n");
        for (int ti = 0; ti < tokens.length; ti++) {
            sql.append("    AND i.").append(invColItemName).append(" ILIKE ?\n");
        }
        if (customerSeq != null) {
            sql.append("    AND i.").append(invColCust).append(" = ?\n");
        }
        if (useInvCompanyFilter) {
            sql.append("    AND (UPPER(coalesce(i.company_type,'')) = UPPER(?) OR UPPER(coalesce(i.company_type,'')) = 'ALL')\n");
        }
        sql.append("  GROUP BY i.").append(invColItemSeq).append(", i.").append(invColItemName).append("\n");
        sql.append("), itm AS (\n");
        // items master source
        sql.append("  SELECT DISTINCT it.").append(itemColSeq).append(" AS item_seq, it.").append(itemColName).append(" AS item_name, ").append(itemCompanyExpr).append(" AS company_type, ").append(itemStdUnitExpr).append(" AS item_std_unit\n")
           .append("  FROM ").append(itemTbl).append(" it\n")
           .append("  WHERE 1=1\n");
        for (int ti = 0; ti < tokens.length; ti++) {
            sql.append("    AND it.").append(itemColName).append(" ILIKE ?\n");
        }
        if (useItemCompanyFilter) {
            sql.append("    AND (UPPER(coalesce(it.").append(itemColCompanyType).append(",'')) = UPPER(?) OR UPPER(coalesce(it.").append(itemColCompanyType).append(",'')) = 'ALL')\n");
        }
        sql.append("), src AS (\n");
        sql.append("  SELECT item_seq, item_name, inv_date, inv_date_text, cur_amt, qty, 0 AS src_pri, company_type, item_std_unit, customer_seq FROM inv\n")
           .append("  UNION ALL\n")
           .append("  SELECT item_seq, item_name, NULL AS inv_date, NULL AS inv_date_text, NULL AS cur_amt, NULL AS qty, 1 AS src_pri, company_type, item_std_unit, NULL::bigint AS customer_seq FROM itm\n");
        // invoice source
        sql.append(")\n");
        // de-duplicate; prefer invoice (src_pri=0)
        sql.append("SELECT item_seq, item_name, inv_date_text AS recent_invoice_date, cur_amt, qty, src_pri, company_type, item_std_unit, customer_seq\n")
           .append("FROM (\n")
           .append("  SELECT item_seq, item_name, inv_date, inv_date_text, cur_amt, qty, src_pri, company_type, item_std_unit, customer_seq,\n")
           .append("         ROW_NUMBER() OVER (\n")
           .append("           PARTITION BY item_seq\n")
           .append("           ORDER BY src_pri ASC,\n")
           .append("                    (CASE WHEN company_type IS NULL THEN 1 ELSE 0 END),\n")
           .append("                    inv_date DESC NULLS LAST,\n")
           .append("                    item_name ASC\n")
           .append("         ) rn\n")
           .append("  FROM src\n")
           .append(") t\n")
           .append("WHERE rn = 1\n")
           .append("ORDER BY src_pri ASC, inv_date DESC NULLS LAST, item_name ASC\n")
           .append("LIMIT ").append(Math.max(1, Math.min(limit, 500)));

        return ResponseEntity.ok(jdbc.query(con -> {
            var ps = con.prepareStatement(sql.toString());
            ps.setQueryTimeout(30);
            int i = 1;
            // Bind tokens for invoice
            for (String t : tokens) ps.setString(i++, "%" + t + "%");
            // Bind optional customer filter
            if (customerSeq != null) ps.setObject(i++, customerSeq);
            if (useInvCompanyFilter && customerCompanyTypeVal != null) ps.setString(i++, customerCompanyTypeVal);
            // Bind tokens for item master
            for (String t : tokens) ps.setString(i++, "%" + t + "%");
            if (useItemCompanyFilter && customerCompanyTypeVal != null) ps.setString(i++, customerCompanyTypeVal);
            return ps;
        }, (rs, idx) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("itemSeq", rs.getObject(1));
            m.put("itemName", rs.getString(2));
            m.put("recentInvoiceDate", rs.getString(3));
            m.put("curAmt", rs.getObject(4));
            m.put("qty", rs.getObject(5));
            m.put("srcPri", rs.getInt(6));
            m.put("companyType", rs.getString(7));
            m.put("itemStdUnit", rs.getString(8));
            m.put("customerSeq", rs.getObject(9));
            return m;
        }));
    }

    /**
     * Minimal spec endpoint used by order sheet and other UIs.
     * Tries to read item name/spec by item_name; returns empty object on miss to avoid 500s during debugging.
     */
    @GetMapping("/spec")
    public ResponseEntity<?> itemSpec(@RequestParam(value = "itemName", required = false) String itemName,
                                       @RequestParam(value = "itemSeq", required = false) Long itemSeq) {
        String tbl = env.getProperty("app.item.table", "public.item");
        String colSeq = env.getProperty("app.item.columns.item_seq", "item_seq");
        String colName = env.getProperty("app.item.columns.item_name", "item_name");
        String colSpec = env.getProperty("app.item.columns.item_spec", "item_spec");
        String colStdUnit = env.getProperty("app.item.columns.item_std_unit", "item_std_unit");
        String colCompanyType = env.getProperty("app.item.columns.company_type", "company_type");
        boolean hasStd = columnExists(tbl, colStdUnit);
        boolean hasCompanyType = columnExists(tbl, colCompanyType);
        String stdExpr = hasStd ? colStdUnit : "NULL::text";
        String companyTypeExpr = hasCompanyType ? colCompanyType : "NULL::text";

        try {
            String sql;
            List<Map<String,Object>> rows;

            // Prefer itemName if provided, fallback to itemSeq
            if (itemName != null && !itemName.trim().isEmpty()) {
                sql = "SELECT "+colSeq+", "+colName+", "+colSpec+", "+stdExpr+", "+companyTypeExpr+" FROM "+tbl+" WHERE "+colName+"=?";
                rows = jdbc.query(sql, ps -> ps.setString(1, itemName), (rs, i) -> {
                    Map<String,Object> m = new LinkedHashMap<>();
                    m.put("itemSeq", rs.getObject(1));
                    m.put("itemName", rs.getString(2));
                    m.put("itemSpec", rs.getString(3));
                    m.put("itemStdUnit", rs.getString(4));
                    m.put("companyType", rs.getString(5));
                    return m;
                });
            } else if (itemSeq != null && itemSeq > 0) {
                sql = "SELECT "+colSeq+", "+colName+", "+colSpec+", "+stdExpr+", "+companyTypeExpr+" FROM "+tbl+" WHERE "+colSeq+"=?";
                rows = jdbc.query(sql, ps -> ps.setLong(1, itemSeq), (rs, i) -> {
                    Map<String,Object> m = new LinkedHashMap<>();
                    m.put("itemSeq", rs.getObject(1));
                    m.put("itemName", rs.getString(2));
                    m.put("itemSpec", rs.getString(3));
                    m.put("itemStdUnit", rs.getString(4));
                    m.put("companyType", rs.getString(5));
                    return m;
                });
            } else {
                return ResponseEntity.ok(Map.of());
            }

            if (rows.isEmpty()) return ResponseEntity.ok(Map.of());
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception e) {
            // Return empty object for stability during debugging per request
            return ResponseEntity.ok(Map.of());
        }
    }

    // ===== External available stock proxy =====
    static class AvailReq {
        public String bizUnit;     // optional
        public String stdDate;     // YYYYMMDD optional
        public String whSeq;       // optional
        public String itemName;    // optional
        public String itemNo;      // optional
        public String itemSeq;     // optional (string)
        public String pageNo;      // optional
        public String pageSize;    // optional
        public String userId;      // optional
    }

    @PostMapping("/avail-stock")
    public ResponseEntity<?> availStock(@RequestBody AvailReq req) {
        try {
            String apiUrl = env.getProperty("tnt.inventory.api.url",
                    "http://220.73.213.73/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPILGAvailStockListInfo");
            String certId = env.getProperty("tnt.orders.api.certId", "TNT_CRM");
            String certKey = env.getProperty("tnt.orders.api.certKey", "9836164F-3601-4DBB-9D6D-54685CD89B95");
            String dsn = env.getProperty("tnt.orders.api.dsn", "tnt_bis");
            String dsnOper = env.getProperty("tnt.orders.api.dsnOper", "tnt_oper");
            int securityType = Integer.parseInt(env.getProperty("tnt.orders.api.securityType", "0"));
            int companySeq = Integer.parseInt(env.getProperty("tnt.orders.api.companySeq", "1"));

            String pageNo = (req != null && req.pageNo != null && !req.pageNo.isBlank()) ? req.pageNo : "1";
            String pageSize = (req != null && req.pageSize != null && !req.pageSize.isBlank()) ? req.pageSize : "10000";

            java.util.Map<String,Object> row = new java.util.LinkedHashMap<>();
            row.put("BizUnit",   req != null && req.bizUnit != null ? req.bizUnit : "");
            row.put("StdDate",   req != null && req.stdDate != null ? req.stdDate : "");
            row.put("WHSeq",     req != null && req.whSeq != null ? req.whSeq : "");
            row.put("ItemName",  req != null && req.itemName != null ? req.itemName : "");
            row.put("ItemNo",    req != null && req.itemNo != null ? req.itemNo : "");
            row.put("ItemSeq",   req != null && req.itemSeq != null ? req.itemSeq : "");
            row.put("PAGE_NO",   pageNo);
            row.put("PAGE_SIZE", pageSize);

            java.util.Map<String,Object> payload = new java.util.LinkedHashMap<>();
            java.util.Map<String,Object> root = new java.util.LinkedHashMap<>();
            payload.put("ROOT", root);
            root.put("certId", certId);
            root.put("certKey", certKey);
            root.put("dsn", dsn);
            root.put("dsnOper", dsnOper);
            root.put("securityType", securityType);
            root.put("CompanySeq", companySeq);
            java.util.Map<String,Object> data = new java.util.LinkedHashMap<>();
            root.put("data", data);
            java.util.Map<String,Object> dataRoot = new java.util.LinkedHashMap<>();
            data.put("ROOT", dataRoot);
            dataRoot.put("DataBlock1", row);

            org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.setAccept(java.util.Collections.singletonList(org.springframework.http.MediaType.APPLICATION_JSON));
            org.springframework.http.HttpEntity<java.util.Map<String,Object>> entity = new org.springframework.http.HttpEntity<>(payload, headers);
            org.springframework.http.ResponseEntity<java.util.Map> resp = rt.postForEntity(apiUrl, entity, java.util.Map.class);

            java.util.Map<String,Object> out = new java.util.LinkedHashMap<>();
            out.put("status", resp.getStatusCodeValue());
            out.put("url", apiUrl);
            out.put("sendPayload", payload);
            if (resp.getBody() != null) out.put("receivedPayload", resp.getBody());
            return org.springframework.http.ResponseEntity.status(resp.getStatusCode()).body(out);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(500).body(java.util.Map.of("error","avail_stock_failed","message", e.getMessage()));
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        if (tableName == null || columnName == null) return false;
        String schema = "public";
        String table = tableName;
        // Handle schema-qualified names like public.item or "public"."item"
        if (tableName.contains(".")) {
            String[] parts = tableName.replace("\"","").split("\\.", 2);
            if (parts.length == 2) {
                schema = parts[0];
                table = parts[1];
            }
        }
        try {
            Integer cnt = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
                    Integer.class,
                    schema,
                    table,
                    columnName.replace("\"","")
            );
            return cnt != null && cnt > 0;
        } catch (Exception e) {
            return false;
        }
    }
}
