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
            @RequestParam(value = "offset", required = false, defaultValue = "0") int offset,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit
    ) {
        try {
            if (top <= 0) top = 100;
            if (offset < 0) offset = 0;
            if (limit <= 0) limit = 100; if (limit > 1000) limit = 1000;
            String db = "TNT";
            if (company != null) {
                String c = company.trim().toUpperCase();
                if ("DYS".equals(c)) db = "DYS"; else db = "TNT";
            }
            // Parse input dates (YY-MM-DD) if provided
            LocalDate from = parseYyMmDd(fromDate);
            LocalDate to = parseYyMmDd(toDate);
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
        // Build maps from PG
        Map<Long,String> custMap = new HashMap<>();
        Map<Long,String> regionGroupMap = new HashMap<>();
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
}
