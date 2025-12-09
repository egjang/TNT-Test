package com.tnt.sales.customer.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.beans.factory.annotation.Qualifier;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.sql.Connection;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
    private final JdbcTemplate jdbc;
    private final JdbcTemplate mssqlJdbc;
    private final Environment env;

    @Autowired
    public CustomerController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc,
                              @Qualifier("mssqlJdbcTemplate") JdbcTemplate mssqlJdbc,
                              Environment env) {
        this.jdbc = jdbc;
        this.mssqlJdbc = mssqlJdbc;
        this.env = env;
    }

    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "provinceName", required = false) String provinceName,
            @RequestParam(value = "cityName", required = false) String cityName,
            @RequestParam(value = "assigneeId", required = false) String assigneeId,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "companyType", required = false) String companyType,
            @RequestParam(value = "mineOnly", required = false, defaultValue = "true") boolean mineOnly,
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "offset", required = false) Integer offset
    ) {
        // nodb profile: honor mineOnly (if true and empId missing => 401), else return samples
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                if (mineOnly && (empId == null || empId.trim().isEmpty())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "로그인이 필요합니다"));
                }
                return ResponseEntity.ok(List.of(
                        Map.ofEntries(
                                Map.entry("id", 1L),
                                Map.entry("companySeq", 10L),
                                Map.entry("customerSeq", 1001L),
                                Map.entry("customerId", "C0001"),
                                Map.entry("customerName", "강천상사"),
                                Map.entry("customerFullName", "강천상사 주식회사"),
                                Map.entry("customerStatusSeq", 1L),
                                Map.entry("bizNo", "123-45-67890"),
                                Map.entry("ownerName", "홍길동"),
                                Map.entry("bizKind", "도소매"),
                                Map.entry("bizType", "도매"),
                                Map.entry("telNo", "02-123-4567"),
                                Map.entry("empSeq", 501L),
                                Map.entry("wkDeptSeq", 7001L),
                                Map.entry("deptSeq", 7000L),
                                Map.entry("addrProvinceSeq", 11L),
                                Map.entry("addrProvinceName", "서울"),
                                Map.entry("addrCitySeq", 1101L),
                                Map.entry("addrCityName", "강남구"),
                                Map.entry("customerTypeSeq", 21L),
                                Map.entry("customerTypeName", "대리점"),
                                Map.entry("customerRemark", ""),
                                Map.entry("createdBy", 1L),
                                Map.entry("updatedBy", 1L),
                                Map.entry("createdAt", "2024-01-01T00:00:00Z"),
                                Map.entry("updatedAt", "2024-01-02T00:00:00Z"),
                                Map.entry("empName", "김영업"),
                                Map.entry("deptName", "영업1팀")
                        ),
                        Map.ofEntries(
                                Map.entry("id", 2L),
                                Map.entry("companySeq", 10L),
                                Map.entry("customerSeq", 1002L),
                                Map.entry("customerId", "C0002"),
                                Map.entry("customerName", "한빛상사"),
                                Map.entry("customerFullName", "한빛상사"),
                                Map.entry("customerStatusSeq", 1L),
                                Map.entry("bizNo", "987-65-43210"),
                                Map.entry("ownerName", "이몽룡"),
                                Map.entry("bizKind", "제조"),
                                Map.entry("bizType", "소매"),
                                Map.entry("telNo", "031-555-7777"),
                                Map.entry("empSeq", 502L),
                                Map.entry("wkDeptSeq", 7002L),
                                Map.entry("deptSeq", 7000L),
                                Map.entry("addrProvinceSeq", 41L),
                                Map.entry("addrProvinceName", "경기"),
                                Map.entry("addrCitySeq", 4113L),
                                Map.entry("addrCityName", "성남시"),
                                Map.entry("customerTypeSeq", 22L),
                                Map.entry("customerTypeName", "소매상"),
                                Map.entry("customerRemark", ""),
                                Map.entry("createdBy", 1L),
                                Map.entry("updatedBy", 1L),
                                Map.entry("createdAt", "2024-01-01T00:00:00Z"),
                                Map.entry("updatedAt", "2024-01-02T00:00:00Z"),
                                Map.entry("empName", "이영업"),
                                Map.entry("deptName", "영업2팀")
                        )
                ));
            }
        }
        // Build query after resolving assigneeFilter so we can optionally join sales_plan
        List<Object> params = new ArrayList<>();

        String assigneeFilter = null;
        if (mineOnly) {
            String candidate = (assigneeId != null && !assigneeId.trim().isEmpty()) ? assigneeId.trim() : null;
            if (candidate == null && empId != null && !empId.trim().isEmpty()) {
                try {
                    candidate = jdbc.queryForObject(
                            "SELECT assignee_id FROM public.employee WHERE emp_id = ?",
                            String.class,
                            empId.trim()
                    );
                } catch (EmptyResultDataAccessException ignore) {
                    candidate = null;
                }
            }
            if (candidate == null || candidate.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "로그인이 필요합니다"));
            }
            assigneeFilter = candidate;
        }

        // Compose base SELECT with optional sales_plan join for has_plan and filtering
        boolean hasPlanYear = (year != null && year > 0);
        boolean hasName = (name != null && !name.trim().isEmpty());
        String tblPlan = env.getProperty("app.sales.plan.table", "public.sales_plan");
        String yearExprPlan = "EXTRACT(YEAR FROM target_year)";

        StringBuilder sql = new StringBuilder(
                "SELECT c.id, c.company_seq, c.customer_seq, c.customer_id, c.customer_name, c.customer_full_name, c.customer_status_seq, " +
                        "c.biz_no, c.owner_name, c.biz_kind, c.biz_type, c.tel_no, c.emp_seq, c.wk_dept_seq, c.dept_seq, " +
                        "c.addr_province_seq, c.addr_province_name, c.addr_city_seq, c.addr_city_name, c.customer_type_seq, c.customer_type_name, " +
                        "c.customer_remark, c.created_by, c.updated_by, c.created_at, c.updated_at, " +
                        "e.emp_name, e.dept_name, c.company_type, " +
                        "CASE WHEN p.customer_seq IS NULL THEN 0 ELSE 1 END AS has_plan " +
                        "FROM public.customer c " +
                        "LEFT JOIN public.employee e ON e.emp_id = c.assignee_id "
        );
        List<Object> joinParams = new ArrayList<>();
        if (hasPlanYear && assigneeFilter != null) {
            sql.append("LEFT JOIN (SELECT DISTINCT customer_seq FROM ").append(tblPlan)
               .append(" WHERE ").append(yearExprPlan).append("=? AND assignee_id=?");
            joinParams.add(year);
            joinParams.add(assigneeFilter);
            if (companyType != null && !companyType.trim().isEmpty()) {
                sql.append(" AND UPPER(company_type)=UPPER(?)");
                joinParams.add(companyType.trim());
            }
            sql.append(") p ON p.customer_seq = c.customer_seq ");
        } else {
            sql.append("LEFT JOIN (SELECT NULL::bigint AS customer_seq) p ON false ");
        }
        sql.append("WHERE 1=1");

        if (hasName) {
            String[] toks = name.trim().split("[\\s,]+");
            for (String t : toks) {
                if (t == null || t.isBlank()) continue;
                sql.append(" AND c.customer_name ILIKE ?");
                params.add("%" + t + "%");
            }
        }
        if (provinceName != null && !provinceName.trim().isEmpty()) {
            sql.append(" AND c.addr_province_name ILIKE ?");
            params.add("%" + provinceName.trim() + "%");
        }
        if (cityName != null && !cityName.trim().isEmpty()) {
            sql.append(" AND c.addr_city_name ILIKE ?");
            params.add("%" + cityName.trim() + "%");
        }
        if (companyType != null && !companyType.trim().isEmpty()) {
            sql.append(" AND UPPER(c.company_type) = UPPER(?)");
            params.add(companyType.trim());
        }
        if (assigneeFilter != null) {
            sql.append(" AND c.assignee_id = ?");
            params.add(assigneeFilter);
        }

        // When searching by name and year provided, restrict to customers that exist in sales_plan for that year
        if (hasPlanYear && hasName) {
            sql.append(" AND p.customer_seq IS NOT NULL");
        }

        int lim = (limit != null && limit > 0 && limit <= 1000) ? limit : 100;
        int off = (offset != null && offset >= 0) ? offset : 0;
        sql.append(" ORDER BY CASE WHEN p.customer_seq IS NULL THEN 0 ELSE 1 END DESC, c.customer_name ASC LIMIT ").append(lim).append(" OFFSET ").append(off);

        // Merge params in the order of placeholders: joinParams first, then WHERE params
        List<Object> allParams = new ArrayList<>(joinParams.size() + params.size());
        allParams.addAll(joinParams);
        allParams.addAll(params);

        List<Map<String, Object>> rows = jdbc.query(sql.toString(), ps -> {
            for (int idx = 0; idx < allParams.size(); idx++) {
                ps.setObject(idx + 1, allParams.get(idx));
            }
        }, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getLong(1));
            m.put("companySeq", rs.getLong(2));
            m.put("customerSeq", rs.getLong(3));
            m.put("customerId", rs.getString(4));
            m.put("customerName", rs.getString(5));
            m.put("customerFullName", rs.getString(6));
            m.put("customerStatusSeq", rs.getLong(7));
            m.put("bizNo", rs.getString(8));
            m.put("ownerName", rs.getString(9));
            m.put("bizKind", rs.getString(10));
            m.put("bizType", rs.getString(11));
            m.put("telNo", rs.getString(12));
            m.put("empSeq", rs.getLong(13));
            m.put("wkDeptSeq", rs.getLong(14));
            m.put("deptSeq", rs.getLong(15));
            m.put("addrProvinceSeq", rs.getLong(16));
            m.put("addrProvinceName", rs.getString(17));
            m.put("addrCitySeq", rs.getLong(18));
            m.put("addrCityName", rs.getString(19));
            m.put("customerTypeSeq", rs.getLong(20));
            m.put("customerTypeName", rs.getString(21));
            m.put("customerRemark", rs.getString(22));
            m.put("createdBy", rs.getLong(23));
            m.put("updatedBy", rs.getLong(24));
            m.put("createdAt", rs.getTimestamp(25));
            m.put("updatedAt", rs.getTimestamp(26));
            m.put("empName", rs.getString(27));
            m.put("deptName", rs.getString(28));
            m.put("companyType", rs.getString(29));
            m.put("hasPlan", rs.getInt(30) > 0);
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/count")
    public ResponseEntity<?> count(
            @RequestParam(value = "assigneeId", required = false) String assigneeId,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "mineOnly", required = false, defaultValue = "true") boolean mineOnly
    ) {
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                // return a static sample for demo
                return ResponseEntity.ok(Map.of("total", 42));
            }
        }

        String assigneeFilter = null;
        if (mineOnly) {
            String candidate = (assigneeId != null && !assigneeId.trim().isEmpty()) ? assigneeId.trim() : null;
            if (candidate == null && empId != null && !empId.trim().isEmpty()) {
                try {
                    candidate = jdbc.queryForObject(
                            "SELECT assignee_id FROM public.employee WHERE emp_id = ?",
                            String.class,
                            empId.trim()
                    );
                } catch (EmptyResultDataAccessException ignore) {
                    candidate = null;
                }
            }
            if (candidate == null || candidate.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "로그인이 필요합니다"));
            }
            assigneeFilter = candidate;
        }

        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM public.customer c WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (assigneeFilter != null) { sql.append(" AND c.assignee_id = ?"); params.add(assigneeFilter); }
        // Note: queryForObject with Class uses PreparedStatementCreator for dynamic params
        Long total = params.isEmpty()
            ? jdbc.queryForObject(sql.toString(), Long.class)
            : jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return ResponseEntity.ok(Map.of("total", (total == null ? 0 : total)));
    }

    @GetMapping("/missing-demand")
    public ResponseEntity<?> missingDemand(
            @RequestParam(value = "assigneeId", required = false) String assigneeId,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "mineOnly", required = false, defaultValue = "true") boolean mineOnly,
            @RequestParam(value = "limit", required = false, defaultValue = "200") int limit,
            @RequestParam(value = "name", required = false) String name
    ) {
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of());
            }
        }

        String assigneeFilter = null;
        if (mineOnly) {
            String candidate = (assigneeId != null && !assigneeId.trim().isEmpty()) ? assigneeId.trim() : null;
            if (candidate == null && empId != null && !empId.trim().isEmpty()) {
                try {
                    candidate = jdbc.queryForObject(
                            "SELECT assignee_id FROM public.employee WHERE emp_id = ?",
                            String.class,
                            empId.trim()
                    );
                } catch (EmptyResultDataAccessException ignore) {
                    candidate = null;
                }
            }
            if (candidate == null || candidate.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "로그인이 필요합니다"));
            }
            assigneeFilter = candidate;
        }

        // Build invoice join for recent 2 years (by EXTRACT(YEAR from invoice_date))
        int y1 = java.time.LocalDate.now().getYear();
        int y2 = y1 - 1;
        String tblInv = env.getProperty("app.invoice.table", "public.invoice");
        String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
        String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
        String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

        StringBuilder sql = new StringBuilder(
                "SELECT c.company_type, c.customer_name, c.customer_seq, " +
                "COALESCE(y1.amt,0) AS amt_y1, COALESCE(y2.amt,0) AS amt_y2 " +
                "FROM public.customer c " +
                "LEFT JOIN public.demand d ON d.customer_name = c.customer_name " +
                "LEFT JOIN (SELECT "+colCust+" AS customer_seq, SUM(COALESCE("+colAmt+",0)) AS amt FROM "+tblInv+" " +
                "           WHERE EXTRACT(YEAR FROM "+dateExpr+") = "+y1+" GROUP BY "+colCust+
                ") y1 ON y1.customer_seq = c.customer_seq " +
                "LEFT JOIN (SELECT "+colCust+" AS customer_seq, SUM(COALESCE("+colAmt+",0)) AS amt FROM "+tblInv+" " +
                "           WHERE EXTRACT(YEAR FROM "+dateExpr+") = "+y2+" GROUP BY "+colCust+
                ") y2 ON y2.customer_seq = c.customer_seq " +
                "WHERE 1=1"
        );
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (assigneeFilter != null) { sql.append(" AND c.assignee_id = ?"); params.add(assigneeFilter); }
        if (name != null && !name.trim().isEmpty()) {
            String[] toks = name.trim().split("[\\s,]+");
            for (String t : toks) {
                if (t == null || t.isBlank()) continue;
                sql.append(" AND c.customer_name ILIKE ?");
                params.add("%" + t + "%");
            }
        }
        sql.append(" AND d.customer_name IS NULL ");
        sql.append(" ORDER BY c.customer_name LIMIT ").append(Math.max(1, Math.min(1000, limit)));

        java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql.toString(), ps -> {
            for (int idx = 0; idx < params.size(); idx++) {
                ps.setObject(idx + 1, params.get(idx));
            }
        }, (rs, i) -> {
            java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
            m.put("companyType", rs.getString(1));
            m.put("customerName", rs.getString(2));
            long custSeq = rs.getLong(3);
            m.put("customerSeq", custSeq);
            double amtY1 = rs.getDouble(4);
            double amtY2 = rs.getDouble(5);
            m.put("hasSalesY1", amtY1 > 0);
            m.put("hasSalesY2", amtY2 > 0);
            m.put("year1", y1);
            m.put("year2", y2);
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{custSeq}/transactions")
    public ResponseEntity<?> transactions(@PathVariable("custSeq") long custSeq) {
        log.info("[C360] Fetching transactions from Postgres for custSeq={}", custSeq);
        // nodb profile: return stub data
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(List.of(
                        Map.ofEntries(
                                Map.entry("invoiceNo", "INV-0001"),
                                Map.entry("invoiceDate", "2025-01-01"),
                                Map.entry("minorName", "분류A"),
                                Map.entry("itemName", "제품A"),
                                Map.entry("curAmt", 120000),
                                Map.entry("qty", 3)
                        )
                ));
            }
        }

        // Resolve table/column names from env (defaults under public.invoice)
        String tbl = env.getProperty("app.invoice.table", "public.invoice");
        String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
        String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String colMinor = env.getProperty("app.invoice.columns.item_subcategory", "item_subcategory");
        String colItem = env.getProperty("app.invoice.columns.item_name", "item_name");
        String colItemSeq = env.getProperty("app.invoice.columns.item_seq", "item_seq");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        String colQty = env.getProperty("app.invoice.columns.qty", "qty");
        String colInv = env.getProperty("app.invoice.columns.invoice_no", "invoice_no");
        String colCompany = env.getProperty("app.invoice.columns.company_type", "company_type");
        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
        String dateExpr = dateIsText
                ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                : (colDate + "::timestamp");
        String itemTbl = env.getProperty("app.item.table", "public.item");
        String itemColSeq = env.getProperty("app.item.columns.item_seq", "item_seq");
        String itemColStdUnit = env.getProperty("app.item.columns.item_std_unit", "item_std_unit");
        boolean hasItemTable = columnExists(itemTbl, itemColSeq);
        boolean hasItemStdUnit = hasItemTable && columnExists(itemTbl, itemColStdUnit);

        // 고객 company_type과 invoice company_type을 매칭 (컬럼이 있고 값이 있는 경우에만)
        String customerCompanyType = null;
        try {
            customerCompanyType = jdbc.queryForObject(
                    "SELECT company_type FROM public.customer WHERE customer_seq = ?",
                    String.class,
                    custSeq
            );
        } catch (Exception ignore) {
            customerCompanyType = null;
        }
        boolean hasInvoiceCompanyType = columnExists(tbl, colCompany);
        boolean hasInvoiceItemSeq = columnExists(tbl, colItemSeq);
        boolean applyCompanyFilter = hasInvoiceCompanyType && customerCompanyType != null && !customerCompanyType.isBlank();
        String companySelectExpr = hasInvoiceCompanyType ? ("i." + colCompany) : "NULL::text";
        String itemSeqSelectExpr = hasInvoiceItemSeq ? ("i." + colItemSeq) : "NULL::bigint";
        String itemStdUnitExpr = (hasInvoiceItemSeq && hasItemStdUnit) ? ("coalesce(it." + itemColStdUnit + ", '')") : "NULL::text";
        // item JOIN에 company_type 조건 추가 (동일 item_seq가 TNT/DYS에 각각 존재할 수 있음)
        String itemJoinClause = (hasInvoiceItemSeq && hasItemTable && hasInvoiceCompanyType)
            ? ("LEFT JOIN " + itemTbl + " it ON it." + itemColSeq + " = i." + colItemSeq + " AND UPPER(coalesce(it.company_type,'')) = UPPER(coalesce(i." + colCompany + ",''))")
            : (hasInvoiceItemSeq && hasItemTable)
                ? ("LEFT JOIN " + itemTbl + " it ON it." + itemColSeq + " = i." + colItemSeq)
                : "";

        // Primary query expects qty column; fallback handles schema without qty
        String sqlPrimary = "SELECT " +
                "i." + colInv + " AS invoice_no, " +
                "to_char("+dateExpr+", 'YYYY-MM-DD\"T\"HH24:MI:SS') AS invoice_date, " +
                "coalesce(nullif(trim(i."+colMinor+"), ''), 'na') AS minor_name, " +
                "i." + colItem + " AS item_name, " +
                "i." + colAmt + " AS cur_amt, " +
                "i." + colQty + " AS qty, " +
                companySelectExpr + " AS company_type, " +
                itemSeqSelectExpr + " AS item_seq, " +
                itemStdUnitExpr + " AS item_std_unit " +
                "FROM " + tbl + " i " +
                itemJoinClause +
                " WHERE i." + colCust + " = ? " +
                (applyCompanyFilter ? (" AND UPPER(i." + colCompany + ") = UPPER(?) ") : "") +
                "ORDER BY "+dateExpr+" DESC, " + colInv + " DESC, minor_name ASC";
        String sqlFallback = "SELECT " +
                "i." + colInv + " AS invoice_no, " +
                "to_char("+dateExpr+", 'YYYY-MM-DD\"T\"HH24:MI:SS') AS invoice_date, " +
                "coalesce(nullif(trim(i."+colMinor+"), ''), 'na') AS minor_name, " +
                "i." + colItem + " AS item_name, " +
                "i." + colAmt + " AS cur_amt, " +
                "CAST(0 AS double precision) AS qty, " +
                companySelectExpr + " AS company_type, " +
                itemSeqSelectExpr + " AS item_seq, " +
                itemStdUnitExpr + " AS item_std_unit " +
                "FROM " + tbl + " i " +
                itemJoinClause +
                " WHERE i." + colCust + " = ? " +
                (applyCompanyFilter ? (" AND UPPER(i." + colCompany + ") = UPPER(?) ") : "") +
                "ORDER BY "+dateExpr+" DESC, " + colInv + " DESC, minor_name ASC";
        try {
            List<Map<String,Object>> rows = applyCompanyFilter
                ? jdbc.query(sqlPrimary, (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("invoiceNo", rs.getString(1));
                    m.put("invoiceDate", rs.getString(2));
                    m.put("minorName", rs.getString(3));
                    m.put("itemName", rs.getString(4));
                    m.put("curAmt", rs.getObject(5));
                    m.put("qty", rs.getObject(6));
                    m.put("companyType", rs.getString(7));
                    m.put("itemSeq", rs.getObject(8));
                    m.put("itemStdUnit", rs.getString(9));
                    return m;
                }, custSeq, customerCompanyType)
                : jdbc.query(sqlPrimary, (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("invoiceNo", rs.getString(1));
                    m.put("invoiceDate", rs.getString(2));
                    m.put("minorName", rs.getString(3));
                    m.put("itemName", rs.getString(4));
                    m.put("curAmt", rs.getObject(5));
                    m.put("qty", rs.getObject(6));
                    m.put("companyType", rs.getString(7));
                    m.put("itemSeq", rs.getObject(8));
                    m.put("itemStdUnit", rs.getString(9));
                    return m;
                }, custSeq);
            log.info("[C360] PG transactions fetched: {} rows for custSeq={}", rows.size(), custSeq);
            return ResponseEntity.ok(rows);
        } catch (Exception primaryEx) {
            log.warn("[C360] transactions primary query failed (will fallback without qty): {}", primaryEx.getMessage());
            try {
                List<Map<String,Object>> rows = applyCompanyFilter
                    ? jdbc.query(sqlFallback, (rs, i) -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("invoiceNo", rs.getString(1));
                        m.put("invoiceDate", rs.getString(2));
                        m.put("minorName", rs.getString(3));
                        m.put("itemName", rs.getString(4));
                        m.put("curAmt", rs.getObject(5));
                        m.put("qty", rs.getObject(6));
                        m.put("companyType", rs.getString(7));
                        m.put("itemSeq", rs.getObject(8));
                        m.put("itemStdUnit", rs.getString(9));
                        return m;
                    }, custSeq, customerCompanyType)
                    : jdbc.query(sqlFallback, (rs, i) -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("invoiceNo", rs.getString(1));
                        m.put("invoiceDate", rs.getString(2));
                        m.put("minorName", rs.getString(3));
                        m.put("itemName", rs.getString(4));
                        m.put("curAmt", rs.getObject(5));
                        m.put("qty", rs.getObject(6));
                        m.put("companyType", rs.getString(7));
                        m.put("itemSeq", rs.getObject(8));
                        m.put("itemStdUnit", rs.getString(9));
                        return m;
                    }, custSeq);
                log.info("[C360] PG transactions fetched (fallback): {} rows for custSeq={}", rows.size(), custSeq);
                return ResponseEntity.ok(rows);
            } catch (Exception fallbackEx) {
                log.error("[C360] PG transactions query failed (fallback too): {}", fallbackEx.toString());
                return ResponseEntity.status(500).body(Map.of("error", "transactions_query_failed"));
            }
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        if (tableName == null || columnName == null) return false;
        String schema = "public";
        String table = tableName;
        // Handle schema-qualified names like public.invoice or "public"."invoice"
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

    private String renderSqlWithParams(String sql, java.util.List<Object> params) {
        if (sql == null || sql.isBlank() || params == null || params.isEmpty()) {
            return sql;
        }
        StringBuilder out = new StringBuilder();
        int paramIndex = 0;
        for (int i = 0; i < sql.length(); i++) {
            char c = sql.charAt(i);
            if (c == '?' && paramIndex < params.size()) {
                out.append(formatSqlParam(params.get(paramIndex++)));
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    private String formatSqlParam(Object param) {
        if (param == null) {
            return "NULL";
        }
        if (param instanceof Number || param instanceof Boolean) {
            return param.toString();
        }
        String text = param.toString().replace("'", "''");
        return "'" + text + "'";
    }

    @GetMapping("/{custSeq}/transactions/summary")
    public ResponseEntity<?> transactionSummary(@PathVariable("custSeq") long custSeq) {
        log.info("[C360] Fetching PG transaction summary by minor for custSeq={}", custSeq);
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(List.of(
                        Map.ofEntries(
                                Map.entry("minorName", "분류A"),
                                Map.entry("qty", 12),
                                Map.entry("amt", 340000)
                        ),
                        Map.ofEntries(
                                Map.entry("minorName", "분류B"),
                                Map.entry("qty", 7),
                                Map.entry("amt", 210000)
                        )
                ));
            }
        }
        String tbl = env.getProperty("app.invoice.table", "public.invoice");
        String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
        String colMinor = env.getProperty("app.invoice.columns.item_subcategory", "item_subcategory");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        String colQty = env.getProperty("app.invoice.columns.qty", "qty");

        String sqlWithQty = "SELECT coalesce(nullif(trim(i."+colMinor+"), ''), 'na') AS minor_name, " +
                "SUM(COALESCE(i."+colQty+",0))::double precision AS qty, " +
                "SUM(COALESCE(i."+colAmt+",0))::double precision AS amt " +
                "FROM "+tbl+" i WHERE i."+colCust+" = ? " +
                "GROUP BY minor_name " +
                "ORDER BY 2 DESC, 3 DESC";
        String sqlNoQty = "SELECT coalesce(nullif(trim(i."+colMinor+"), ''), 'na') AS minor_name, " +
                "CAST(0 AS double precision) AS qty, " +
                "SUM(COALESCE(i."+colAmt+",0))::double precision AS amt " +
                "FROM "+tbl+" i WHERE i."+colCust+" = ? " +
                "GROUP BY minor_name " +
                "ORDER BY 2 DESC, 3 DESC";
        try {
            List<Map<String,Object>> rows = jdbc.query(sqlWithQty, (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("minorName", rs.getString(1));
                m.put("qty", rs.getObject(2));
                m.put("amt", rs.getObject(3));
                return m;
            }, custSeq);
            return ResponseEntity.ok(rows);
        } catch (Exception primaryEx) {
            log.warn("[C360] summary primary query failed (will fallback without qty): {}", primaryEx.getMessage());
            try {
                List<Map<String,Object>> rows = jdbc.query(sqlNoQty, (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("minorName", rs.getString(1));
                    m.put("qty", rs.getObject(2));
                    m.put("amt", rs.getObject(3));
                    return m;
                }, custSeq);
                return ResponseEntity.ok(rows);
            } catch (Exception fallbackEx) {
                log.error("[C360] PG summary query failed (fallback too): {}", fallbackEx.toString());
                return ResponseEntity.status(500).body(Map.of("error", "summary_query_failed"));
            }
        }
    }

    @GetMapping("/{custSeq}/invoice-monthly")
    public ResponseEntity<?> invoiceMonthly(
            @PathVariable("custSeq") long custSeq,
            @RequestParam(value = "year", required = false) Integer year
    ) {
        int y = (year != null && year > 0) ? year : java.time.LocalDate.now().getYear();
        java.time.LocalDate start = java.time.LocalDate.of(y, 1, 1);
        java.time.LocalDate end = start.plusYears(1);
        // Aggregate strictly by month and amount (no item dim grouping)
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");
            String sql =
                    "SELECT " +
                    "  EXTRACT(MONTH FROM "+dateExpr+")::int AS month, " +
                    "  SUM(COALESCE("+colAmt+",0))::double precision AS amount " +
                    "FROM "+tbl+" " +
                    "WHERE "+colCust+" = ? AND "+dateExpr+" >= ? AND "+dateExpr+" < ? " +
                    "GROUP BY 1 " +
                    "ORDER BY 1";
            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("month", rs.getInt(1));
                m.put("amount", rs.getDouble(2));
                return m;
            }, custSeq, java.sql.Date.valueOf(start), java.sql.Date.valueOf(end));
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[C360] invoice-monthly simple aggregation failed: {}", ex.toString());
        }
        // nodb: return simple stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("month",1,"amount", 100000),
                        java.util.Map.of("month",2,"amount", 150000),
                        java.util.Map.of("month",3,"amount", 80000)
                ));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","invoice_monthly_query_failed"));
    }

    /**
     * Monthly invoice amounts grouped by item_subcategory and sales_mgmt_unit for a customer and year.
     * Returns rows: { item_subcategory, sales_mgmt_unit, month, amount }
     */
    @GetMapping("/{custSeq}/invoice-monthly-by-dim")
    public ResponseEntity<?> invoiceMonthlyByDim(
            @PathVariable("custSeq") long custSeq,
            @RequestParam(value = "year", required = false) Integer year
    ) {
        int y = (year != null && year > 0) ? year : java.time.LocalDate.now().getYear();
        java.time.LocalDate start = java.time.LocalDate.of(y, 1, 1);
        java.time.LocalDate end = start.plusYears(1);
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
            String colSub = env.getProperty("app.invoice.columns.item_subcategory", "item_subcategory");
            String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");
            String sql =
                    "SELECT " +
                    "  coalesce(nullif(trim("+colSub+"), ''), 'na') AS item_subcategory, " +
                    "  coalesce(nullif(trim("+colUnit+"), ''), 'na') AS sales_mgmt_unit, " +
                    "  EXTRACT(MONTH FROM "+dateExpr+")::int AS month, " +
                    "  SUM(COALESCE("+colAmt+",0))::double precision AS amount " +
                    "FROM "+tbl+" " +
                    "WHERE "+colCust+" = ? AND "+dateExpr+" >= ? AND "+dateExpr+" < ? " +
                    "GROUP BY 1,2,3 " +
                    "ORDER BY 1,2,3";
            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(sql, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("item_subcategory", rs.getString(1));
                m.put("sales_mgmt_unit", rs.getString(2));
                m.put("month", rs.getInt(3));
                m.put("amount", rs.getDouble(4));
                return m;
            }, custSeq, java.sql.Date.valueOf(start), java.sql.Date.valueOf(end));
            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            log.error("[C360] invoice-monthly-by-dim query failed: {}", ex.toString());
        }
        // nodb stub
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(java.util.List.of(
                        java.util.Map.of("item_subcategory","catA","sales_mgmt_unit","U1","month",1,"amount",100000),
                        java.util.Map.of("item_subcategory","catA","sales_mgmt_unit","U1","month",2,"amount",120000),
                        java.util.Map.of("item_subcategory","catB","sales_mgmt_unit","U2","month",1,"amount",80000)
                ));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error","invoice_monthly_by_dim_query_failed"));
    }

    @GetMapping("/{custSeq}/invoice-years")
    public ResponseEntity<?> invoiceYears(@PathVariable("custSeq") long custSeq) {
        try {
            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");
            String pgSql = "SELECT DISTINCT EXTRACT(YEAR FROM "+dateExpr+")::int AS y FROM "+tbl+" WHERE "+colCust+" = ? ORDER BY y DESC";
            java.util.List<Integer> years = jdbc.query(pgSql, (rs, i) -> rs.getInt(1), custSeq);
            return ResponseEntity.ok(years);
        } catch (Exception ignorePg) {
            log.error("[C360] PG invoice-years query failed: {}", ignorePg.toString());
        }
        // nodb: return recent years
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                int cur = java.time.LocalDate.now().getYear();
                return ResponseEntity.ok(java.util.List.of(cur - 1, cur - 2, cur - 3));
            }
        }
        return ResponseEntity.status(500).body(java.util.Map.of("error", "invoice_years_query_failed"));
    }

    @GetMapping("/recent-invoice-flags")
    public ResponseEntity<?> recentInvoiceFlags(
            @RequestParam(value = "custSeq") String custSeqCsv,
            @RequestParam(value = "years", required = false, defaultValue = "2") int years
    ) {
        java.util.List<Object> queryParams = new java.util.ArrayList<>();
        String querySql = null;
        try {
            if (custSeqCsv == null || custSeqCsv.isBlank()) {
                return ResponseEntity.ok(java.util.List.of());
            }
            String[] parts = custSeqCsv.split(",");
            java.util.List<Long> ids = new java.util.ArrayList<>();
            for (String p : parts) {
                try { ids.add(Long.parseLong(p.trim())); } catch (Exception ignore) {}
            }
            if (ids.isEmpty()) return ResponseEntity.ok(java.util.List.of());

            String tbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText
                    ? ("to_date(" + colDate + ", '" + dateFmt + "')")
                    : (colDate + "::date");

            java.time.LocalDate since = java.time.LocalDate.now().minusYears(Math.max(1, years));

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT CAST(").append(colCust).append(" AS TEXT) AS cust_id, TRUE AS has_recent FROM ")
                    .append(tbl)
                    .append(" WHERE ").append(dateExpr).append(" >= ? AND CAST(")
                    .append(colCust).append(" AS TEXT) IN (");
            for (int i = 0; i < ids.size(); i++) {
                if (i > 0) sql.append(",");
                sql.append("?");
            }
            sql.append(") GROUP BY ").append(colCust);

            queryParams.clear();
            queryParams.add(java.sql.Date.valueOf(since));
            for (Long id : ids) {
                queryParams.add(String.valueOf(id));
            }
            querySql = sql.toString();
            log.debug("[C360] recent-invoice-flags query: {} params: {}", querySql, queryParams);

            java.util.List<java.util.Map<String,Object>> rows = jdbc.query(querySql, ps -> {
                for (int idx = 0; idx < queryParams.size(); idx++) {
                    ps.setObject(idx + 1, queryParams.get(idx));
                }
            }, (rs, i) -> {
                java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("customerSeqText", rs.getString(1));
                m.put("hasRecent", true);
                return m;
            });

            java.util.Map<Long, Boolean> map = new java.util.HashMap<>();
            for (Long id : ids) map.put(id, false);
            for (java.util.Map<String,Object> r : rows) {
                Object v = r.get("customerSeqText");
                if (v != null) {
                    try { map.put(Long.parseLong(String.valueOf(v)), true); } catch (Exception ignore) {}
                }
            }
            java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
            for (Long id : ids) {
                out.add(java.util.Map.of("customerSeq", id, "hasRecent", map.getOrDefault(id, false)));
            }
            return ResponseEntity.ok(out);
        } catch (Exception e) {
            String renderedSql = renderSqlWithParams(querySql != null ? querySql : "", queryParams);
            log.error("[C360] recent-invoice-flags failed: sql={} params={} err={}", renderedSql, queryParams, e.toString());
            return ResponseEntity.status(500).body(java.util.Map.of("error","recent_invoice_flags_failed"));
        }
    }

    /**
     * Count my customers (by assignee_id) that have any invoice rows in the previous year of the selected year,
     * grouped by company_type (e.g., TNT/DYS).
     * Example: year=2026 -> counts invoices during 2025-01-01..2025-12-31.
     */
    @GetMapping("/with-invoice-count")
    public ResponseEntity<?> withInvoiceCount(
            @RequestParam("assigneeId") String assigneeId,
            @RequestParam("year") int year
    ) {
        try {
            if (assigneeId == null || assigneeId.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "로그인이 필요합니다"));
            }
            int prev = Math.max(1, year - 1);

            // Resolve invoice table/columns
            String invTbl = env.getProperty("app.invoice.table", "public.invoice");
            String colCust = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
            String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
            boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
            String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
            String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

            String sql = "SELECT UPPER(c.company_type) AS company_type, COUNT(DISTINCT c.customer_seq) AS cnt " +
                    "FROM public.customer c " +
                    "JOIN " + invTbl + " i ON CAST(i." + colCust + " AS TEXT) = CAST(c.customer_seq AS TEXT) " +
                    "WHERE c.assignee_id = ? AND EXTRACT(YEAR FROM " + dateExpr + ") = ? " +
                    "GROUP BY UPPER(c.company_type)";

            List<Map<String,Object>> rows = jdbc.query(sql, ps -> {
                ps.setString(1, assigneeId.trim());
                ps.setInt(2, prev);
            }, (rs, i) -> {
                Map<String,Object> m = new LinkedHashMap<>();
                m.put("company_type", rs.getString(1));
                m.put("count", rs.getLong(2));
                return m;
            });
            long tnt = 0, dys = 0;
            for (Map<String,Object> r : rows) {
                String ct = String.valueOf(r.get("company_type")).toUpperCase();
                long n = 0; try { n = Long.parseLong(String.valueOf(r.get("count"))); } catch (Exception ignore) {}
                if ("TNT".equals(ct)) tnt = n; else if ("DYS".equals(ct)) dys = n;
            }
            return ResponseEntity.ok(Map.of(
                    "counts", rows,
                    "tnt", tnt,
                    "dys", dys,
                    "year", year,
                    "prevYear", prev
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","with_invoice_count_failed"));
        }
    }

    @GetMapping("/demand-flags")
    public ResponseEntity<?> demandFlags(
            @RequestParam(value = "custSeq") String custSeqCsv
    ) {
        try {
            if (custSeqCsv == null || custSeqCsv.isBlank()) {
                return ResponseEntity.ok(java.util.List.of());
            }
            String[] parts = custSeqCsv.split(",");
            java.util.List<String> seqs = new java.util.ArrayList<>();
            for (String p : parts) {
                String v = p != null ? p.trim() : null;
                if (v != null && !v.isEmpty()) seqs.add(v);
            }
            if (seqs.isEmpty()) return ResponseEntity.ok(java.util.List.of());

            String tbl = env.getProperty("app.demand.table", "public.demand");
            String colCustId = env.getProperty("app.demand.columns.customer_id", "customer_id");

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT DISTINCT CAST(").append(colCustId).append(" AS TEXT) AS cid FROM ")
                    .append(tbl)
                    .append(" WHERE CAST(")
                    .append(colCustId)
                    .append(" AS TEXT) IN (");
            for (int i = 0; i < seqs.size(); i++) {
                if (i > 0) sql.append(",");
                sql.append("?");
            }
            sql.append(")");

            java.util.List<String> rows = jdbc.query(sql.toString(), ps -> {
                int idx = 1;
                for (String s : seqs) ps.setString(idx++, s);
            }, (rs, i) -> rs.getString(1));

            java.util.Set<String> set = new java.util.HashSet<>(rows);
            java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
            for (String s : seqs) {
                out.add(java.util.Map.of("customerSeq", Long.parseLong(s), "hasDemand", set.contains(s)));
            }
            return ResponseEntity.ok(out);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","demand_flags_failed"));
        }
    }
}
