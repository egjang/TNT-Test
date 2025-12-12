package com.tnt.sales.order.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/v1/orders/external")
public class OrdersQueryController {

    private final JdbcTemplate mssql;
    private final JdbcTemplate pg;

    @Autowired
    public OrdersQueryController(@Qualifier("mssqlJdbcTemplate") JdbcTemplate mssql,
                                 @Qualifier("pgJdbcTemplate") JdbcTemplate pg) {
        this.mssql = mssql;
        this.pg = pg;
    }

    /**
     * List rows from MSSQL TNT.dbo.tnt_TSLOrderText with all columns.
     * Example: GET /api/v1/orders/external/tnt-tsl-order-text?top=100
     */
    @GetMapping("/tnt-tsl-order-text")
    public ResponseEntity<?> listTslOrderText(
            @RequestParam(value = "top", required = false, defaultValue = "100") int top
    ) {
        try {
            if (top <= 0) top = 100;
            // Try multiple ORDER BY variants to accommodate schema differences
            String[] orderVariants = new String[] {
                    "ORDER BY LastDateTime DESC",
                    "ORDER BY OrderTextDate DESC, OrderTextNo DESC",
                    "ORDER BY OrderTextDat DESC, OrderTextNoe DESC",
                    "ORDER BY OrderTextNo DESC",
                    ""
            };
            List<Map<String, Object>> rows = null;
            Exception lastErr = null;
            for (String ord : orderVariants) {
                try {
                    String sql = ("SELECT TOP " + top + " * FROM TNT.dbo.tnt_TSLOrderText " + ord).trim();
                    rows = mssql.queryForList(sql);
                    lastErr = null;
                    break;
                } catch (Exception ex) { lastErr = ex; }
            }
            if (rows == null) throw lastErr != null ? lastErr : new RuntimeException("unknown_query_error");
            // Remove columns per request
            List<Map<String,Object>> out = filterColumns(rows);
            return ResponseEntity.ok(out);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "mssql_query_failed",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Generic: List rows from <company>.dbo.tnt_TSLOrderText with all columns.
     * Example: GET /api/v1/orders/external/tsl-order-text?company=TNT&top=100
     */
    @GetMapping("/tsl-order-text")
    public ResponseEntity<?> listCompanyTslOrderText(
            @RequestParam(value = "company", required = false, defaultValue = "TNT") String company,
            @RequestParam(value = "top", required = false, defaultValue = "100") int top,
            @RequestParam(value = "fromDate", required = false) String fromDate,
            @RequestParam(value = "toDate", required = false) String toDate,
            @RequestParam(value = "salesEmpSeq", required = false) Long salesEmpSeq,
            @RequestParam(value = "tntSalesEmpSeq", required = false) Long tntSalesEmpSeq,
            @RequestParam(value = "dysSalesEmpSeq", required = false) Long dysSalesEmpSeq,
            @RequestParam(value = "custName", required = false) String custName,
            @RequestParam(value = "offset", required = false, defaultValue = "0") int offset,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit
    ) {
        try {
            if (top <= 0) top = 100;
            if (offset < 0) offset = 0;
            if (limit <= 0) limit = 100; if (limit > 1000) limit = 1000;

            String companyUpper = (company != null) ? company.trim().toUpperCase() : "TNT";

            // Handle ALL: UNION TNT and DYS
            if ("ALL".equals(companyUpper)) {
                return handleUnionQuery(fromDate, toDate, tntSalesEmpSeq, dysSalesEmpSeq, custName, offset, limit);
            }

            String db = "TNT";
            if ("DYS".equals(companyUpper)) db = "DYS";
            // Parse input dates (YY-MM-DD) if provided
            LocalDate from = parseYyMmDd(fromDate);
            LocalDate to = parseYyMmDd(toDate);

            // custName이 제공된 경우, PostgreSQL에서 먼저 customer_seq 목록 조회 (해당 회사 타입만)
            Set<Long> custSeqFilter = null;
            if (custName != null && !custName.trim().isEmpty()) {
                custSeqFilter = findCustomerSeqsByName(custName.trim(), db);
                // 검색 결과가 없으면 빈 결과 반환
                if (custSeqFilter.isEmpty()) {
                    return ResponseEntity.ok(new ArrayList<>());
                }
            }

            String[] orderVariants = new String[] {
                    "ORDER BY LastDateTime DESC",
                    "ORDER BY OrderTextDate DESC, OrderTextNo DESC",
                    "ORDER BY OrderTextDat DESC, OrderTextNoe DESC",
                    "ORDER BY OrderTextNo DESC",
                    ""
            };
            List<Map<String, Object>> rows = null;
            Exception lastErr = null;
            for (String ord : orderVariants) {
                try {
                    // Attempt with matching column name (OrderTextDate / OrderTextDat)
                    String col = ord.contains("OrderTextDate") ? "OrderTextDate" : (ord.contains("OrderTextDat") ? "OrderTextDat" : null);
                    String where = ""; List<Object> args = new ArrayList<>();
                    if (col != null && (from != null || to != null)) {
                        if (from != null) { where += (where.isEmpty()?" WHERE ":" AND ") + "CAST("+col+" AS date) >= ?"; args.add(java.sql.Date.valueOf(from)); }
                        if (to != null) { where += (where.isEmpty()?" WHERE ":" AND ") + "CAST("+col+" AS date) <= ?"; args.add(java.sql.Date.valueOf(to)); }
                    }
                    if (salesEmpSeq != null) {
                        where += (where.isEmpty()?" WHERE ":" AND ") + "SalesEmpSeq = ?";
                        args.add(salesEmpSeq);
                    }
                    // 거래처 필터 적용 (custSeqFilter가 제공된 경우)
                    if (custSeqFilter != null && !custSeqFilter.isEmpty()) {
                        where += (where.isEmpty() ? " WHERE " : " AND ") + "CustSeq IN " + joinIds(custSeqFilter);
                    }
                    // Use OFFSET/FETCH for paging; ensure ORDER BY exists
                    String ordClause = (ord == null || ord.isBlank()) ? "ORDER BY 1" : ord;
                    String sql = ("SELECT * FROM " + db + ".dbo.tnt_TSLOrderText " + where + " " + ordClause + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY").trim();
                    args.add(offset);
                    args.add(limit);
                    rows = mssql.queryForList(sql, args.toArray());
                    lastErr = null;
                    break;
                } catch (Exception ex) { lastErr = ex; }
            }
            if (rows == null) throw lastErr != null ? lastErr : new RuntimeException("unknown_query_error");
            // Enrich with names from Postgres (customer and employee), then filter columns
            // enrichWithPg에서 각 행의 실제 company_type을 설정함
            List<Map<String,Object>> enriched = enrichWithPg(rows, db);
            List<Map<String,Object>> out = filterColumns(enriched);
            return ResponseEntity.ok(out);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "mssql_query_failed",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Handle ALL company query: UNION TNT and DYS databases
     * tntSalesEmpSeq/dysSalesEmpSeq가 전달되면 각 회사별 담당자 필터 적용
     * custName이 전달되면 거래처명으로 필터링 (PostgreSQL customer 테이블에서 customer_seq 조회 후 MSSQL 필터)
     */
    private ResponseEntity<?> handleUnionQuery(String fromDate, String toDate, Long tntSalesEmpSeq, Long dysSalesEmpSeq, String custName, int offset, int limit) {
        try {
            LocalDate from = parseYyMmDd(fromDate);
            LocalDate to = parseYyMmDd(toDate);

            // custName이 제공된 경우, PostgreSQL에서 먼저 customer_seq 목록 조회 (회사별 분리)
            Set<Long> tntCustSeqFilter = null;
            Set<Long> dysCustSeqFilter = null;
            if (custName != null && !custName.trim().isEmpty()) {
                Map<String, Set<Long>> custSeqByCompany = findCustomerSeqsByNameByCompany(custName.trim());
                tntCustSeqFilter = custSeqByCompany.get("TNT");
                dysCustSeqFilter = custSeqByCompany.get("DYS");
                // 검색 결과가 둘 다 없으면 빈 결과 반환
                if (tntCustSeqFilter.isEmpty() && dysCustSeqFilter.isEmpty()) {
                    return ResponseEntity.ok(new ArrayList<>());
                }
            }

            // Query both TNT and DYS with their respective emp_seq and custSeq filters
            List<Map<String, Object>> tntRows = (tntCustSeqFilter == null || !tntCustSeqFilter.isEmpty())
                    ? queryCompanyData("TNT", from, to, tntSalesEmpSeq, tntCustSeqFilter, 0, limit * 2)
                    : new ArrayList<>();
            List<Map<String, Object>> dysRows = (dysCustSeqFilter == null || !dysCustSeqFilter.isEmpty())
                    ? queryCompanyData("DYS", from, to, dysSalesEmpSeq, dysCustSeqFilter, 0, limit * 2)
                    : new ArrayList<>();

            // Add CompanyType field to distinguish rows
            for (Map<String, Object> row : tntRows) {
                row.put("CompanyType", "TNT");
            }
            for (Map<String, Object> row : dysRows) {
                row.put("CompanyType", "DYS");
            }

            // Combine and sort by LastDateTime DESC
            List<Map<String, Object>> combined = new ArrayList<>();
            combined.addAll(tntRows);
            combined.addAll(dysRows);

            // Sort by LastDateTime DESC (try to find the date field)
            combined.sort((a, b) -> {
                Object aDate = a.get("LastDateTime");
                Object bDate = b.get("LastDateTime");
                if (aDate == null && bDate == null) return 0;
                if (aDate == null) return 1;
                if (bDate == null) return -1;
                // Compare as strings (descending)
                return String.valueOf(bDate).compareTo(String.valueOf(aDate));
            });

            // Apply offset and limit
            int start = Math.min(offset, combined.size());
            int end = Math.min(start + limit, combined.size());
            List<Map<String, Object>> paged = combined.subList(start, end);

            // Enrich with PG data (we need to handle both TNT and DYS)
            List<Map<String, Object>> enriched = enrichWithPgUnion(paged);

            List<Map<String, Object>> out = filterColumns(enriched);

            return ResponseEntity.ok(out);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "union_query_failed",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Query single company database
     */
    private List<Map<String, Object>> queryCompanyData(String db, LocalDate from, LocalDate to, Long salesEmpSeq, Set<Long> custSeqFilter, int offset, int limit) {
        // 날짜 필터용 컬럼명 변형 시도
        String[] dateColVariants = new String[] { "OrderTextDate", "OrderTextDat", "LastDateTime" };
        String[] orderVariants = new String[] {
                "ORDER BY LastDateTime DESC",
                "ORDER BY OrderTextDate DESC, OrderTextNo DESC",
                "ORDER BY OrderTextDat DESC, OrderTextNoe DESC",
                "ORDER BY OrderTextNo DESC",
                ""
        };

        for (String dateCol : dateColVariants) {
            for (String ord : orderVariants) {
                try {
                    String where = "";
                    List<Object> args = new ArrayList<>();

                    // 날짜 필터 적용
                    if (from != null || to != null) {
                        if (from != null) {
                            where += (where.isEmpty() ? " WHERE " : " AND ") + "CAST(" + dateCol + " AS date) >= ?";
                            args.add(java.sql.Date.valueOf(from));
                        }
                        if (to != null) {
                            where += (where.isEmpty() ? " WHERE " : " AND ") + "CAST(" + dateCol + " AS date) <= ?";
                            args.add(java.sql.Date.valueOf(to));
                        }
                    }
                    if (salesEmpSeq != null) {
                        where += (where.isEmpty() ? " WHERE " : " AND ") + "SalesEmpSeq = ?";
                        args.add(salesEmpSeq);
                    }
                    // 거래처 필터 적용 (custSeqFilter가 제공된 경우)
                    if (custSeqFilter != null && !custSeqFilter.isEmpty()) {
                        where += (where.isEmpty() ? " WHERE " : " AND ") + "CustSeq IN " + joinIds(custSeqFilter);
                    }

                    String ordClause = (ord == null || ord.isBlank()) ? "ORDER BY 1" : ord;
                    String sql = ("SELECT * FROM " + db + ".dbo.tnt_TSLOrderText " + where + " " + ordClause + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY").trim();
                    args.add(offset);
                    args.add(limit);

                    return mssql.queryForList(sql, args.toArray());
                } catch (Exception ignored) {
                }
            }
        }
        return new ArrayList<>();
    }

    /**
     * PostgreSQL에서 거래처명으로 customer_seq 목록 조회 (company_type별로 분리)
     * 토큰 기반 AND 검색 (모든 토큰이 포함된 거래처만 반환)
     * @return Map with keys "TNT" and "DYS", each containing Set<Long> of customer_seq
     */
    private Map<String, Set<Long>> findCustomerSeqsByNameByCompany(String custName) {
        Map<String, Set<Long>> result = new HashMap<>();
        result.put("TNT", new HashSet<>());
        result.put("DYS", new HashSet<>());

        if (custName == null || custName.trim().isEmpty()) {
            return result;
        }

        try {
            // 토큰으로 분리하여 LIKE 조건 생성
            String[] tokens = custName.trim().toLowerCase().split("\\s+");
            StringBuilder whereClause = new StringBuilder();
            List<Object> args = new ArrayList<>();

            for (int i = 0; i < tokens.length; i++) {
                if (i > 0) whereClause.append(" AND ");
                whereClause.append("LOWER(customer_name) LIKE ?");
                args.add("%" + tokens[i] + "%");
            }

            String sql = "SELECT customer_seq, UPPER(company_type) AS company_type FROM public.customer WHERE " + whereClause.toString();
            List<Map<String, Object>> rows = pg.queryForList(sql, args.toArray());

            for (Map<String, Object> row : rows) {
                Object seq = row.get("customer_seq");
                String companyType = String.valueOf(row.get("company_type")).toUpperCase();
                if (seq != null) {
                    try {
                        Long seqVal = Long.parseLong(String.valueOf(seq));
                        if ("TNT".equals(companyType)) {
                            result.get("TNT").add(seqVal);
                        } else if ("DYS".equals(companyType)) {
                            result.get("DYS").add(seqVal);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        } catch (Exception e) {
            // 오류 발생 시 빈 맵 반환
        }

        return result;
    }

    /**
     * PostgreSQL에서 거래처명으로 customer_seq 목록 조회 (단일 회사용)
     */
    private Set<Long> findCustomerSeqsByName(String custName, String companyType) {
        if (custName == null || custName.trim().isEmpty()) {
            return new HashSet<>();
        }

        Map<String, Set<Long>> byCompany = findCustomerSeqsByNameByCompany(custName);

        if ("TNT".equalsIgnoreCase(companyType)) {
            return byCompany.get("TNT");
        } else if ("DYS".equalsIgnoreCase(companyType)) {
            return byCompany.get("DYS");
        } else {
            // ALL인 경우 모두 합침
            Set<Long> all = new HashSet<>();
            all.addAll(byCompany.get("TNT"));
            all.addAll(byCompany.get("DYS"));
            return all;
        }
    }

    /**
     * Enrich UNION results with PG data - handle both TNT and DYS employee sequences
     */
    private List<Map<String, Object>> enrichWithPgUnion(List<Map<String, Object>> rows) {
        // Collect keys
        Set<Long> custIds = new HashSet<>();
        Set<Long> tntEmpSeqs = new HashSet<>();
        Set<Long> dysEmpSeqs = new HashSet<>();

        for (Map<String, Object> r : rows) {
            Long c = readLong(r, "CustSeq");
            if (c != null) custIds.add(c);

            Long s = readLong(r, "SalesEmpSeq");
            String companyType = String.valueOf(r.get("CompanyType"));
            if (s != null) {
                if ("TNT".equals(companyType)) {
                    tntEmpSeqs.add(s);
                } else if ("DYS".equals(companyType)) {
                    dysEmpSeqs.add(s);
                }
            }
        }

        // Build customer map
        Map<Long, String> custMap = new HashMap<>();
        Map<Long, String> regionGroupMap = new HashMap<>();
        if (!custIds.isEmpty()) {
            String in = joinIds(custIds);
            try {
                String sql = "SELECT customer_seq, customer_name, addr_province_name, addr_city_name FROM public.customer WHERE customer_seq IN " + in;
                pg.query(sql, rs -> {
                    long id = rs.getLong("customer_seq");
                    String name = rs.getString("customer_name");
                    String province = rs.getString("addr_province_name");
                    String city = rs.getString("addr_city_name");
                    custMap.put(id, name);

                    List<String> parts = new ArrayList<>();
                    if (province != null && !province.trim().isEmpty()) parts.add(province.trim());
                    if (city != null && !city.trim().isEmpty()) parts.add(city.trim());
                    String regionGroup = String.join(" ", parts);
                    if (!regionGroup.isEmpty()) regionGroupMap.put(id, regionGroup);
                });
            } catch (Exception ignore) {
            }
        }

        // Build employee maps for both TNT and DYS
        Map<Long, String> tntEmpMap = new HashMap<>();
        if (!tntEmpSeqs.isEmpty()) {
            String in = joinIds(tntEmpSeqs);
            try {
                String sql = "SELECT emp_name, tnt_emp_seq FROM public.employee WHERE tnt_emp_seq IN " + in;
                pg.query(sql, rs -> {
                    long id = rs.getLong("tnt_emp_seq");
                    String name = rs.getString("emp_name");
                    tntEmpMap.put(id, name);
                });
            } catch (Exception ignore) {
            }
        }

        Map<Long, String> dysEmpMap = new HashMap<>();
        if (!dysEmpSeqs.isEmpty()) {
            String in = joinIds(dysEmpSeqs);
            try {
                String sql = "SELECT emp_name, dys_emp_seq FROM public.employee WHERE dys_emp_seq IN " + in;
                pg.query(sql, rs -> {
                    long id = rs.getLong("dys_emp_seq");
                    String name = rs.getString("emp_name");
                    dysEmpMap.put(id, name);
                });
            } catch (Exception ignore) {
            }
        }

        // Replace values in rows
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            String companyType = String.valueOf(r.get("CompanyType"));

            for (Map.Entry<String, Object> e : r.entrySet()) {
                String k = e.getKey();
                Object v = e.getValue();

                if ("CustSeq".equalsIgnoreCase(k)) {
                    Long id = readLong(r, k);
                    String name = (id != null) ? custMap.get(id) : null;
                    m.put(e.getKey(), name != null ? name : v);
                    if (id != null && regionGroupMap.containsKey(id)) {
                        m.put("RegionGroup", regionGroupMap.get(id));
                    }
                } else if ("SalesEmpSeq".equalsIgnoreCase(k)) {
                    Long id = readLong(r, k);
                    String name = null;
                    if (id != null) {
                        if ("TNT".equals(companyType)) {
                            name = tntEmpMap.get(id);
                        } else if ("DYS".equals(companyType)) {
                            name = dysEmpMap.get(id);
                        }
                    }
                    m.put(e.getKey(), name != null ? name : v);
                } else {
                    m.put(k, v);
                }
            }
            out.add(m);
        }
        return out;
    }

    private List<Map<String,Object>> filterColumns(List<Map<String,Object>> rows) {
        return rows.stream().map(r -> {
            Map<String,Object> m = new LinkedHashMap<>();
            for (Map.Entry<String,Object> e : r.entrySet()) {
                String k = e.getKey();
                if ("CompanySeq".equalsIgnoreCase(k)
                        || "OrderTextSe".equalsIgnoreCase(k)
                        || "OrderTextSeq".equalsIgnoreCase(k)
                        || "LastUserSeq".equalsIgnoreCase(k)
                        || "EmpSeq".equalsIgnoreCase(k)) continue;
                Object v = e.getValue();
                if (k != null && k.equalsIgnoreCase("LastDateTime")) {
                    v = toYyMmDdHm(v);
                }
                m.put(k, v);
            }
            return m;
        }).toList();
    }

    private List<Map<String,Object>> enrichWithPg(List<Map<String,Object>> rows, String db) {
        // Collect keys
        Set<Long> custIds = new HashSet<>();
        Set<Long> empSeqs = new HashSet<>();
        for (Map<String,Object> r : rows) {
            Long c = readLong(r, "CustSeq");
            if (c != null) custIds.add(c);
            Long s = readLong(r, "SalesEmpSeq");
            if (s != null) empSeqs.add(s);
        }
        // Build maps from PG (including company_type)
        Map<Long,String> custMap = new HashMap<>();
        Map<Long,String> regionGroupMap = new HashMap<>();
        Map<Long,String> custCompanyTypeMap = new HashMap<>();
        if (!custIds.isEmpty()) {
            String in = joinIds(custIds);
            try {
                String sql = "SELECT customer_seq, customer_name, addr_province_name, addr_city_name, UPPER(company_type) AS company_type FROM public.customer WHERE customer_seq IN " + in;
                pg.query(sql, rs -> {
                    long id = rs.getLong("customer_seq");
                    String name = rs.getString("customer_name");
                    String province = rs.getString("addr_province_name");
                    String city = rs.getString("addr_city_name");
                    String companyType = rs.getString("company_type");
                    custMap.put(id, name);
                    if (companyType != null && !companyType.trim().isEmpty()) {
                        custCompanyTypeMap.put(id, companyType.trim().toUpperCase());
                    }
                    // Build region group from province and city
                    List<String> parts = new ArrayList<>();
                    if (province != null && !province.trim().isEmpty()) parts.add(province.trim());
                    if (city != null && !city.trim().isEmpty()) parts.add(city.trim());
                    String regionGroup = String.join(" ", parts);
                    if (!regionGroup.isEmpty()) regionGroupMap.put(id, regionGroup);
                });
            } catch (Exception ignore) {}
        }
        Map<Long,String> empMap = new HashMap<>();
        if (!empSeqs.isEmpty()) {
            String in = joinIds(empSeqs);
            String col = "DYS".equalsIgnoreCase(db) ? "dys_emp_seq" : "tnt_emp_seq";
            try {
                String sql = "SELECT emp_name, " + col + " AS emp_seq FROM public.employee WHERE " + col + " IN " + in;
                pg.query(sql, rs -> {
                    long id = rs.getLong("emp_seq");
                    String name = rs.getString("emp_name");
                    empMap.put(id, name);
                });
            } catch (Exception ignore) {}
        }
        // Replace values in rows
        List<Map<String,Object>> out = new ArrayList<>(rows.size());
        for (Map<String,Object> r : rows) {
            Map<String,Object> m = new LinkedHashMap<>();
            Long custId = readLong(r, "CustSeq");
            for (Map.Entry<String,Object> e : r.entrySet()) {
                String k = e.getKey();
                Object v = e.getValue();
                if ("CustSeq".equalsIgnoreCase(k)) {
                    Long id = readLong(r, k);
                    String name = (id!=null) ? custMap.get(id) : null;
                    m.put(e.getKey(), name != null ? name : v); // replace with name
                    // Add RegionGroup right after CustSeq
                    if (id != null && regionGroupMap.containsKey(id)) {
                        m.put("RegionGroup", regionGroupMap.get(id));
                    }
                } else if ("SalesEmpSeq".equalsIgnoreCase(k)) {
                    Long id = readLong(r, k);
                    String name = (id!=null) ? empMap.get(id) : null;
                    m.put(e.getKey(), name != null ? name : v);
                } else {
                    m.put(k, v);
                }
            }
            // Add CompanyType from customer's actual company_type
            if (custId != null && custCompanyTypeMap.containsKey(custId)) {
                m.put("CompanyType", custCompanyTypeMap.get(custId));
            } else {
                // Fallback to db parameter if customer company_type not found
                m.put("CompanyType", db);
            }
            out.add(m);
        }
        return out;
    }

    private static Long readLong(Map<String,Object> r, String key) {
        for (Map.Entry<String,Object> e : r.entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase(key)) {
                Object v = e.getValue();
                if (v == null) return null;
                try { return Long.parseLong(String.valueOf(v)); } catch (Exception ignore) { return null; }
            }
        }
        return null;
    }

    private static String joinIds(Set<Long> ids) {
        StringBuilder sb = new StringBuilder("(");
        boolean first = true;
        for (Long v : ids) {
            if (!first) sb.append(','); else first = false;
            sb.append(v);
        }
        if (first) sb.append('0');
        sb.append(')');
        return sb.toString();
    }

    private static Object toYyyyMmDd(Object v) {
        if (v == null) return null;
        try {
            if (v instanceof java.time.LocalDate ld) {
                return ld.toString();
            }
            if (v instanceof java.time.LocalDateTime ldt) {
                return ldt.toLocalDate().toString();
            }
            if (v instanceof java.sql.Timestamp ts) {
                return ts.toLocalDateTime().toLocalDate().toString();
            }
            if (v instanceof java.util.Date d) {
                java.time.Instant ins = d.toInstant();
                java.time.LocalDate ld = ins.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                return ld.toString();
            }
            String s = String.valueOf(v).trim();
            if (s.isEmpty()) return s;
            s = s.replace('/', '-');
            if (s.length() >= 10) return s.substring(0, 10);
            // Fallback: return as-is
            return s;
        } catch (Exception ignore) {
            return String.valueOf(v);
        }
    }

    private static Object toYyMmDdHm(Object v) {
        if (v == null) return null;
        try {
            if (v instanceof java.time.LocalDateTime ldt) {
                return ldt.format(java.time.format.DateTimeFormatter.ofPattern("yy-MM-dd HH:mm"));
            }
            if (v instanceof java.time.LocalDate ld) {
                return ld.format(java.time.format.DateTimeFormatter.ofPattern("yy-MM-dd")) + " 00:00";
            }
            if (v instanceof java.sql.Timestamp ts) {
                return ts.toLocalDateTime().format(java.time.format.DateTimeFormatter.ofPattern("yy-MM-dd HH:mm"));
            }
            if (v instanceof java.util.Date d) {
                java.time.LocalDateTime ldt = d.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
                return ldt.format(java.time.format.DateTimeFormatter.ofPattern("yy-MM-dd HH:mm"));
            }
            String s = String.valueOf(v).trim().replace('T',' ').replace('/','-');
            // yyyy-MM-dd[ HH[:mm[:ss]]]
            if (s.matches("^\\d{4}-\\d{2}-\\d{2}.*")) {
                String yy = s.substring(2,4);
                String mm = s.substring(5,7);
                String dd = s.substring(8,10);
                String hh = "00", mi = "00";
                if (s.length() >= 16 && s.charAt(10) == ' ') {
                    hh = s.substring(11,13);
                    mi = s.substring(14,16);
                }
                return yy + "-" + mm + "-" + dd + " " + hh + ":" + mi;
            }
            // yy-MM-dd[ HH[:mm]]
            if (s.matches("^\\d{2}-\\d{2}-\\d{2}.*")) {
                String yy = s.substring(0,2);
                String mm = s.substring(3,5);
                String dd = s.substring(6,8);
                String hh = "00", mi = "00";
                if (s.length() >= 14 && (s.charAt(8) == ' ' || s.charAt(8) == 'T')) {
                    hh = s.substring(9,11);
                    mi = s.substring(12,14);
                }
                return yy + "-" + mm + "-" + dd + " " + hh + ":" + mi;
            }
            return s;
        } catch (Exception ignore) {
            return String.valueOf(v);
        }
    }

    private static LocalDate parseYyMmDd(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            DateTimeFormatter f = DateTimeFormatter.ofPattern("yy-MM-dd");
            return LocalDate.parse(s.trim(), f);
        } catch (DateTimeParseException ignore) { return null; }
    }

    /**
     * 수주진행목록 조회: 특정 거래처의 수주장 목록 조회
     * 조건: custSeq (필수), fromDate/toDate (선택), companyType (필수: TNT 또는 DYS)
     * Example: GET /api/v1/orders/external/order-progress-list?custSeq=32733&companyType=TNT&fromDate=25-01-01&toDate=25-12-31
     */
    @GetMapping("/order-progress-list")
    public ResponseEntity<?> getOrderProgressList(
            @RequestParam(value = "custSeq") Long custSeq,
            @RequestParam(value = "companyType") String companyType,
            @RequestParam(value = "fromDate", required = false) String fromDate,
            @RequestParam(value = "toDate", required = false) String toDate,
            @RequestParam(value = "offset", required = false, defaultValue = "0") int offset,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit
    ) {
        try {
            if (custSeq == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "missing_parameter",
                        "message", "custSeq is required"
                ));
            }

            String companyUpper = (companyType != null) ? companyType.trim().toUpperCase() : "TNT";
            String db = "DYS".equals(companyUpper) ? "DYS" : "TNT";

            LocalDate from = parseYyMmDd(fromDate);
            LocalDate to = parseYyMmDd(toDate);

            if (offset < 0) offset = 0;
            if (limit <= 0) limit = 100;
            if (limit > 500) limit = 500;

            // Query order sheets for the customer
            List<Map<String, Object>> orderSheets = queryOrderSheetsByCust(db, custSeq, from, to, offset, limit);

            // Enrich with customer name from PostgreSQL
            List<Map<String, Object>> enriched = enrichOrderProgressWithPg(orderSheets, db, custSeq);

            return ResponseEntity.ok(enriched);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "query_failed",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Query order sheets by customer seq
     */
    private List<Map<String, Object>> queryOrderSheetsByCust(String db, Long custSeq, LocalDate from, LocalDate to, int offset, int limit) {
        String[] dateColVariants = new String[] { "OrderTextDate", "OrderTextDat", "LastDateTime" };
        String[] orderVariants = new String[] {
                "ORDER BY LastDateTime DESC",
                "ORDER BY OrderTextDate DESC, OrderTextNo DESC",
                "ORDER BY OrderTextDat DESC, OrderTextNoe DESC",
                "ORDER BY OrderTextNo DESC",
                ""
        };

        for (String dateCol : dateColVariants) {
            for (String ord : orderVariants) {
                try {
                    StringBuilder where = new StringBuilder(" WHERE CustSeq = ?");
                    List<Object> args = new ArrayList<>();
                    args.add(custSeq);

                    // Date filters
                    if (from != null || to != null) {
                        if (from != null) {
                            where.append(" AND CAST(").append(dateCol).append(" AS date) >= ?");
                            args.add(java.sql.Date.valueOf(from));
                        }
                        if (to != null) {
                            where.append(" AND CAST(").append(dateCol).append(" AS date) <= ?");
                            args.add(java.sql.Date.valueOf(to));
                        }
                    }

                    String ordClause = (ord == null || ord.isBlank()) ? "ORDER BY 1" : ord;
                    String sql = "SELECT OrderTextNo, OrderTextDate, OrderText, IsCancel, CancelText, Remark, LastDateTime, SalesEmpSeq, DelvDate, CustEmpName, IsClaim, OrderRemark " +
                            "FROM " + db + ".dbo.tnt_TSLOrderText" + where + " " + ordClause + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
                    args.add(offset);
                    args.add(limit);

                    return mssql.queryForList(sql, args.toArray());
                } catch (Exception ignored) {
                }
            }
        }
        return new ArrayList<>();
    }

    /**
     * Enrich order progress list with PostgreSQL data
     */
    private List<Map<String, Object>> enrichOrderProgressWithPg(List<Map<String, Object>> rows, String db, Long custSeq) {
        // Get customer name
        String customerName = "";
        try {
            String sql = "SELECT customer_name FROM public.customer WHERE customer_seq = ?";
            List<Map<String, Object>> custRows = pg.queryForList(sql, custSeq);
            if (!custRows.isEmpty() && custRows.get(0).get("customer_name") != null) {
                customerName = String.valueOf(custRows.get(0).get("customer_name"));
            }
        } catch (Exception ignore) {}

        // Get employee names
        Set<Long> empSeqs = new HashSet<>();
        for (Map<String, Object> r : rows) {
            Long s = readLong(r, "SalesEmpSeq");
            if (s != null) empSeqs.add(s);
        }

        Map<Long, String> empMap = new HashMap<>();
        if (!empSeqs.isEmpty()) {
            String in = joinIds(empSeqs);
            String col = "DYS".equalsIgnoreCase(db) ? "dys_emp_seq" : "tnt_emp_seq";
            try {
                String sql = "SELECT emp_name, " + col + " AS emp_seq FROM public.employee WHERE " + col + " IN " + in;
                pg.query(sql, rs -> {
                    long id = rs.getLong("emp_seq");
                    String name = rs.getString("emp_name");
                    empMap.put(id, name);
                });
            } catch (Exception ignore) {}
        }

        // Get sales order numbers from sales_order_mapping (OrderTextNo = sales_ledger_no)
        Set<String> orderTextNos = new HashSet<>();
        for (Map<String, Object> r : rows) {
            Object orderTextNo = r.get("OrderTextNo");
            if (orderTextNo != null && !String.valueOf(orderTextNo).trim().isEmpty()) {
                orderTextNos.add(String.valueOf(orderTextNo).trim());
            }
        }

        Map<String, String> salesOrderMap = new HashMap<>(); // OrderTextNo -> sales_order_no
        if (!orderTextNos.isEmpty()) {
            try {
                String inClause = joinStrings(orderTextNos);
                String sql = "SELECT sales_ledger_no, sales_order_no FROM public.sales_order_mapping WHERE sales_ledger_no IN " + inClause;
                pg.query(sql, rs -> {
                    String ledgerNo = rs.getString("sales_ledger_no");
                    String orderNo = rs.getString("sales_order_no");
                    if (ledgerNo != null && orderNo != null) {
                        salesOrderMap.put(ledgerNo.trim(), orderNo.trim());
                    }
                });
            } catch (Exception ignore) {}
        }

        // Get order dates and OrderSeq from ERP _TSLOrder table using sales_order_no
        Map<String, String> orderDateMap = new HashMap<>(); // sales_order_no -> OrderDate
        Map<String, Long> orderSeqMap = new HashMap<>(); // sales_order_no -> OrderSeq
        Set<String> salesOrderNos = new HashSet<>(salesOrderMap.values());
        if (!salesOrderNos.isEmpty()) {
            try {
                String inClause = joinStrings(salesOrderNos);
                String sql = "SELECT OrderNo, OrderDate, OrderSeq FROM " + db + ".dbo._TSLOrder WHERE OrderNo IN " + inClause;
                mssql.query(sql, rs -> {
                    String orderNo = rs.getString("OrderNo");
                    Object orderDate = rs.getObject("OrderDate");
                    Long orderSeq = rs.getLong("OrderSeq");
                    if (orderNo != null) {
                        if (orderDate != null) {
                            orderDateMap.put(orderNo.trim(), formatOrderDate(orderDate));
                        }
                        if (orderSeq != null && orderSeq > 0) {
                            orderSeqMap.put(orderNo.trim(), orderSeq);
                        }
                    }
                });
            } catch (Exception ignore) {}
        }

        // Get DVReqSeq from _TSLDVReqItem using OrderSeq (ProgFromSeq)
        Map<Long, Long> orderSeqToDVReqSeqMap = new HashMap<>(); // OrderSeq -> DVReqSeq
        Set<Long> orderSeqs = new HashSet<>(orderSeqMap.values());
        if (!orderSeqs.isEmpty()) {
            try {
                String inClause = joinIds(orderSeqs);
                String sql = "SELECT DISTINCT ProgFromSeq, DVReqSeq FROM " + db + ".dbo._TSLDVReqItem WHERE ProgFromSeq IN " + inClause;
                mssql.query(sql, rs -> {
                    Long progFromSeq = rs.getLong("ProgFromSeq");
                    Long dvReqSeq = rs.getLong("DVReqSeq");
                    if (progFromSeq != null && dvReqSeq != null && dvReqSeq > 0) {
                        orderSeqToDVReqSeqMap.put(progFromSeq, dvReqSeq);
                    }
                });
            } catch (Exception ignore) {}
        }

        // Get DVReqNo and DVReqDate from _TSLDVReq
        Map<Long, String> dvReqNoMap = new HashMap<>(); // DVReqSeq -> DVReqNo
        Map<Long, String> dvReqDateMap = new HashMap<>(); // DVReqSeq -> DVReqDate
        Set<Long> dvReqSeqs = new HashSet<>(orderSeqToDVReqSeqMap.values());
        if (!dvReqSeqs.isEmpty()) {
            try {
                String inClause = joinIds(dvReqSeqs);
                String sql = "SELECT DVReqSeq, DVReqNo, DVReqDate FROM " + db + ".dbo._TSLDVReq WHERE DVReqSeq IN " + inClause;
                mssql.query(sql, rs -> {
                    Long dvReqSeq = rs.getLong("DVReqSeq");
                    String dvReqNo = rs.getString("DVReqNo");
                    Object dvReqDate = rs.getObject("DVReqDate");
                    if (dvReqSeq != null && dvReqSeq > 0) {
                        if (dvReqNo != null) dvReqNoMap.put(dvReqSeq, dvReqNo.trim());
                        if (dvReqDate != null) dvReqDateMap.put(dvReqSeq, formatOrderDate(dvReqDate));
                    }
                });
            } catch (Exception ignore) {}
        }

        // Build enriched results
        final String finalCustomerName = customerName;
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            String orderTextNo = r.get("OrderTextNo") != null ? String.valueOf(r.get("OrderTextNo")).trim() : "";

            m.put("OrderTextNo", r.get("OrderTextNo"));
            m.put("OrderTextDate", toYyMmDdHm(r.get("OrderTextDate")));
            m.put("CustomerName", finalCustomerName);
            m.put("OrderText", r.get("OrderText"));
            m.put("IsCancel", r.get("IsCancel"));
            m.put("LastDateTime", toYyMmDdHm(r.get("LastDateTime")));

            // Resolve employee name
            Long empSeq = readLong(r, "SalesEmpSeq");
            String empName = (empSeq != null) ? empMap.get(empSeq) : null;
            m.put("SalesEmpName", empName != null ? empName : "");

            m.put("DelvDate", r.get("DelvDate"));
            m.put("CustEmpName", r.get("CustEmpName"));
            m.put("OrderRemark", r.get("OrderRemark"));
            m.put("CompanyType", db);

            // Add sales order info (수주 정보)
            String salesOrderNo = salesOrderMap.get(orderTextNo);
            m.put("OrderNo", salesOrderNo != null ? salesOrderNo : "");
            String orderDate = (salesOrderNo != null) ? orderDateMap.get(salesOrderNo) : null;
            m.put("OrderDate", orderDate != null ? orderDate : "");

            // Add shipment request info (출하의뢰 정보)
            Long orderSeq = (salesOrderNo != null) ? orderSeqMap.get(salesOrderNo) : null;
            Long dvReqSeq = (orderSeq != null) ? orderSeqToDVReqSeqMap.get(orderSeq) : null;
            String dvReqNo = (dvReqSeq != null) ? dvReqNoMap.get(dvReqSeq) : null;
            String dvReqDate = (dvReqSeq != null) ? dvReqDateMap.get(dvReqSeq) : null;
            m.put("DVReqNo", dvReqNo != null ? dvReqNo : "");
            m.put("DVReqDate", dvReqDate != null ? dvReqDate : "");

            out.add(m);
        }
        return out;
    }

    /**
     * Join string values for SQL IN clause
     */
    private static String joinStrings(Set<String> values) {
        StringBuilder sb = new StringBuilder("(");
        boolean first = true;
        for (String v : values) {
            if (!first) sb.append(','); else first = false;
            sb.append("'").append(v.replace("'", "''")).append("'");
        }
        if (first) sb.append("''");
        sb.append(')');
        return sb.toString();
    }

    /**
     * Format order date to YYYYMMDD format
     */
    private static String formatOrderDate(Object v) {
        if (v == null) return "";
        try {
            if (v instanceof java.time.LocalDate ld) {
                return ld.format(DateTimeFormatter.BASIC_ISO_DATE); // YYYYMMDD
            }
            if (v instanceof java.time.LocalDateTime ldt) {
                return ldt.toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE);
            }
            if (v instanceof java.sql.Timestamp ts) {
                return ts.toLocalDateTime().toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE);
            }
            if (v instanceof java.sql.Date d) {
                return d.toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE);
            }
            if (v instanceof java.util.Date d) {
                java.time.LocalDate ld = d.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                return ld.format(DateTimeFormatter.BASIC_ISO_DATE);
            }
            String s = String.valueOf(v).trim();
            // If already YYYYMMDD format, return as is
            if (s.matches("^\\d{8}$")) return s;
            // If YYYY-MM-DD format, convert
            if (s.matches("^\\d{4}-\\d{2}-\\d{2}.*")) {
                return s.substring(0, 4) + s.substring(5, 7) + s.substring(8, 10);
            }
            return s;
        } catch (Exception ignore) {
            return String.valueOf(v);
        }
    }
}
