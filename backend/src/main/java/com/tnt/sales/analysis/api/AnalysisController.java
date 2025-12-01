package com.tnt.sales.analysis.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/v1/analysis")
public class AnalysisController {
    private static final Logger log = LoggerFactory.getLogger(AnalysisController.class);
    private final ObjectMapper om = new ObjectMapper();

    @Autowired(required = false)
    @Qualifier("mssqlJdbcTemplate")
    JdbcTemplate mssqlJdbc;

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

    @Autowired
    private Environment env;

    @Value("${app.n8n.url:}")
    private String n8nUrl;

    @Value("${app.n8n.authHeaderName:}")
    private String n8nAuthHeaderName;

    @Value("${app.n8n.authHeaderValue:}")
    private String n8nAuthHeaderValue;

    public static class AskRequest {
        public String question;
        public String empId;
        public Long empSeq;
        public Boolean mineOnly;
        public Map<String, Object> context;

        public String getQuestion() {
            return question;
        }

        public void setQuestion(String question) {
            this.question = question;
        }

        public String getEmpId() {
            return empId;
        }

        public void setEmpId(String empId) {
            this.empId = empId;
        }

        public Long getEmpSeq() {
            return empSeq;
        }

        public void setEmpSeq(Long empSeq) {
            this.empSeq = empSeq;
        }

        public Boolean getMineOnly() {
            return mineOnly;
        }

        public void setMineOnly(Boolean mineOnly) {
            this.mineOnly = mineOnly;
        }

        public Map<String, Object> getContext() {
            return context;
        }

        public void setContext(Map<String, Object> context) {
            this.context = context;
        }
    }

    @PostMapping("/ask")
    public ResponseEntity<?> ask(@RequestBody AskRequest req) {
        try {
            String q = req == null || req.question == null ? "" : req.question.trim();
            if (q.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "질문을 입력해 주세요"));
            }
            if (n8nUrl == null || n8nUrl.isBlank()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("error", "n8n 연동이 설정되지 않았습니다 (app.n8n.url)"));
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("question", q);
            Map<String, Object> ctx = new HashMap<>();
            if (req != null) {
                if (req.empId != null && !req.empId.trim().isEmpty())
                    ctx.put("empId", req.empId.trim());
                if (req.empSeq != null)
                    ctx.put("empSeq", req.empSeq);
                if (req.mineOnly != null)
                    ctx.put("mineOnly", req.mineOnly);
                if (req.context != null)
                    ctx.putAll(req.context);
            }
            payload.put("context", ctx);

            String body = om.writeValueAsString(payload);

            HttpRequest.Builder rb = HttpRequest.newBuilder()
                    .uri(URI.create(n8nUrl))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
            if (n8nAuthHeaderName != null && !n8nAuthHeaderName.isBlank() && n8nAuthHeaderValue != null
                    && !n8nAuthHeaderValue.isBlank()) {
                rb.header(n8nAuthHeaderName, n8nAuthHeaderValue);
            }
            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> resp = client.send(rb.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            int status = resp.statusCode();
            String respBody = resp.body() == null ? "" : resp.body();

            // Try to parse JSON, otherwise wrap as text
            Object out;
            try {
                JsonNode node = om.readTree(respBody);
                out = node;
            } catch (Exception ignore) {
                out = Map.of("text", respBody);
            }

            if (status >= 200 && status < 300) {
                return ResponseEntity.ok(out);
            } else {
                return ResponseEntity.status(status).body(Map.of(
                        "error", "n8n error: HTTP " + status,
                        "data", out));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", e.getClass().getSimpleName() + ": " + e.getMessage()));
        }
    }

    /**
     * 판매단가 시뮬레이션: 영업사원명/영업관리단위별 연도별 평균 단가 (2022년~현재)
     * GET /api/v1/analysis/price-sim
     *
     * Query Parameters:
     * - companyType: 회사 구분 (예: TNT, DYS). 빈값이면 필터 없음.
     * - empName: 영업사원명. 빈값/미입력/ALL이면 전체.
     * - fromYear: 조회 시작 연도 (기본 2022)
     *
     * Data Source: PostgreSQL invoice 테이블 (env 기반)
     */
    @GetMapping("/price-sim")
    public ResponseEntity<?> getPriceSim(@RequestParam(value = "companyType", required = false) String companyType,
            @RequestParam(value = "empName", required = false) String empName,
            @RequestParam(value = "fromYear", defaultValue = "2022") Integer fromYear) {

        if (pgJdbc == null) {
            log.warn("pgJdbc is null - PostgreSQL datasource not configured");
            return ResponseEntity.ok(Map.of(
                    "data", Collections.emptyList(),
                    "error", "PostgreSQL datasource not configured"));
        }

        // Use env-configured invoice metadata
        String tbl = env.getProperty("app.invoice.table", "public.invoice");
        String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        String colQty = env.getProperty("app.invoice.columns.qty", "qty");
        String colEmpName = env.getProperty("app.invoice.columns.curr_emp_name", "curr_emp_name");
        String colUnit = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
        String colInvoiceSeq = env.getProperty("app.invoice.columns.invoice_seq", "invoice_seq");
        String colCompanyType = env.getProperty("app.invoice.columns.company_type", "company_type");

        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
        String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");
        String yearExpr = "EXTRACT(YEAR FROM " + dateExpr + ")::int";
        int toYear = java.time.LocalDate.now().getYear();
        int startYear = fromYear == null ? 2022 : Math.max(1900, fromYear);

        String unitExpr = "coalesce(nullif(trim(" + colUnit + "), ''), '미지정')";
        String empNameExpr = "coalesce(nullif(trim(" + colEmpName + "), ''), '미지정')";

        try {
            String companyTypeTrimmed = companyType == null ? "" : companyType.trim();
            String empNameTrimmed = empName == null ? "" : empName.trim();

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT ").append(yearExpr).append(" AS salesYear, ")
                    .append(unitExpr).append(" AS salesUnit, ")
                    .append(empNameExpr).append(" AS empName, ")
                    .append("COUNT(DISTINCT ").append(colInvoiceSeq).append(") AS salesCount, ")
                    .append("SUM(").append(colQty).append(") AS totalQty, ")
                    .append("SUM(").append(colAmt).append(") AS totalAmt, ")
                    .append("CASE WHEN SUM(").append(colQty).append(") > 0 THEN SUM(").append(colAmt).append(") / SUM(")
                    .append(colQty).append(") ELSE NULL END AS avgPrice ")
                    .append("FROM ").append(tbl).append(" WHERE ")
                    .append(yearExpr).append(" BETWEEN ? AND ? ");
            List<Object> args = new ArrayList<>();
            args.add(startYear);
            args.add(toYear);

            if (!companyTypeTrimmed.isEmpty()) {
                sql.append(" AND upper(coalesce(nullif(trim(").append(colCompanyType).append("),''), '')) = upper(?) ");
                args.add(companyTypeTrimmed);
            }

            if (!empNameTrimmed.isEmpty() && !"all".equalsIgnoreCase(empNameTrimmed)) {
                sql.append(" AND upper(").append(empNameExpr).append(") = upper(?) ");
                args.add(empNameTrimmed);
            }

            sql.append(" GROUP BY ").append(yearExpr).append(", ").append(unitExpr).append(", ").append(empNameExpr)
                    .append(" ORDER BY salesYear DESC, salesUnit, empName");

            List<Map<String, Object>> data = pgJdbc.queryForList(sql.toString(), args.toArray());

            // 회사 전체 평균 (사원 구분 없이) 동기간 필터 사용
            StringBuilder companySql = new StringBuilder();
            companySql.append("SELECT ").append(unitExpr).append(" AS salesUnit, ")
                    .append("CASE WHEN SUM(").append(colQty).append(") > 0 THEN SUM(").append(colAmt).append(") / SUM(")
                    .append(colQty).append(") ELSE NULL END AS avgPrice ")
                    .append("FROM ").append(tbl).append(" WHERE ")
                    .append(yearExpr).append(" BETWEEN ? AND ? ");
            List<Object> companyArgs = new ArrayList<>();
            companyArgs.add(startYear);
            companyArgs.add(toYear);
            if (!companyTypeTrimmed.isEmpty()) {
                companySql.append(" AND upper(coalesce(nullif(trim(").append(colCompanyType)
                        .append("),''), '')) = upper(?) ");
                companyArgs.add(companyTypeTrimmed);
            }
            companySql.append(" GROUP BY ").append(unitExpr).append(" ORDER BY salesUnit");
            List<Map<String, Object>> companyAvg = pgJdbc.queryForList(companySql.toString(), companyArgs.toArray());

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("data", data);
            response.put("companyAvg", companyAvg);
            response.put("fromYear", startYear);
            response.put("toYear", toYear);
            response.put("companyType", companyTypeTrimmed);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("판매단가 Sim 조회 실패", e);
            return ResponseEntity.ok(Map.of(
                    "data", Collections.emptyList(),
                    "companyAvg", Collections.emptyList(),
                    "error", "조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/sales-status")
    public ResponseEntity<?> getSalesStatus(@RequestParam(value = "type", defaultValue = "MONTH") String type,
            @RequestParam(value = "year") Integer year,
            @RequestParam(value = "month", required = false) Integer month,
            @RequestParam(value = "week", required = false) Integer week,
            @RequestParam(value = "companyType", required = false) String companyType) {
        if (pgJdbc == null) {
            return ResponseEntity.ok(Map.of("error", "PostgreSQL datasource not configured"));
        }

        String tbl = env.getProperty("app.invoice.table", "public.invoice");
        String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        String colCompanyType = env.getProperty("app.invoice.columns.company_type", "company_type");
        // Assuming region is stored in sales_mgmt_unit or similar, or we might need to
        // use customer address.
        // For now let's use sales_mgmt_unit as a proxy for region/group, or
        // biz_area_name if available.
        // Checking previous code, sales_mgmt_unit is used. Let's try to find a region
        // column or default to sales_mgmt_unit.
        String colRegion = env.getProperty("app.invoice.columns.sales_mgmt_unit", "sales_mgmt_unit");
        String colItemName = env.getProperty("app.invoice.columns.item_name", "item_name");

        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
        String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

        StringBuilder whereClause = new StringBuilder();
        List<Object> args = new ArrayList<>();

        whereClause.append("EXTRACT(YEAR FROM ").append(dateExpr).append(") = ? ");
        args.add(year);

        if ("MONTH".equalsIgnoreCase(type)) {
            if (month != null) {
                whereClause.append(" AND EXTRACT(MONTH FROM ").append(dateExpr).append(") = ? ");
                args.add(month);
            }
        } else if ("WEEK".equalsIgnoreCase(type)) {
            if (week != null) {
                whereClause.append(" AND EXTRACT(WEEK FROM ").append(dateExpr).append(") = ? ");
                args.add(week);
            }
        }

        String companyTypeTrimmed = companyType == null ? "" : companyType.trim();
        if (!companyTypeTrimmed.isEmpty() && !"ALL".equalsIgnoreCase(companyTypeTrimmed)) {
            whereClause.append(" AND upper(coalesce(nullif(trim(").append(colCompanyType)
                    .append("),''), '')) = upper(?) ");
            args.add(companyTypeTrimmed);
        }

        try {
            // 1. By Region (Customer Address)
            // Join invoice with customer on customer_seq
            // Region = addr_province_name + ' ' + addr_city_name
            String sqlRegion = "SELECT " +
                    "concat(c.addr_province_name, ' ', c.addr_city_name) as region, " +
                    "SUM(i." + colAmt + ") as totalAmt " +
                    "FROM " + tbl + " i " +
                    "JOIN public.customer c ON c.customer_seq = i.customer_seq " +
                    "WHERE "
                    + whereClause.toString()
                            .replace(dateExpr,
                                    "EXTRACT(YEAR FROM " + dateExpr.replace(colDate, "i." + colDate) + ") = ? OR 1=1")
                            .replace(colCompanyType, "i." + colCompanyType)
                            .replace(dateExpr, dateExpr.replace(colDate, "i." + colDate))
                    +
                    " GROUP BY c.addr_province_name, c.addr_city_name " +
                    "ORDER BY totalAmt DESC";

            // Re-building whereClause with alias 'i' for invoice table columns to avoid
            // ambiguity if needed,
            // but simpler to just rebuild the where clause string with aliases.

            // Re-building whereClause with alias 'i' for invoice table columns
            StringBuilder whereBase = new StringBuilder();
            List<Object> argsBase = new ArrayList<>();

            whereBase.append("EXTRACT(YEAR FROM ").append(dateExpr.replace(colDate, "i." + colDate)).append(") = ? ");
            argsBase.add(year);

            if ("MONTH".equalsIgnoreCase(type)) {
                if (month != null) {
                    whereBase.append(" AND EXTRACT(MONTH FROM ").append(dateExpr.replace(colDate, "i." + colDate))
                            .append(") = ? ");
                    argsBase.add(month);
                }
            } else if ("WEEK".equalsIgnoreCase(type)) {
                if (week != null) {
                    whereBase.append(" AND EXTRACT(WEEK FROM ").append(dateExpr.replace(colDate, "i." + colDate))
                            .append(") = ? ");
                    argsBase.add(week);
                }
            }

            StringBuilder whereFilter = new StringBuilder();
            List<Object> argsFilter = new ArrayList<>();

            if (!companyTypeTrimmed.isEmpty() && !"ALL".equalsIgnoreCase(companyTypeTrimmed)) {
                whereFilter.append(" AND upper(coalesce(nullif(trim(i.").append(colCompanyType)
                        .append("),''), '')) = upper(?) ");
                argsFilter.add(companyTypeTrimmed);
            }

            // Combined WHERE for detailed queries
            String whereDetailed = whereBase.toString() + whereFilter.toString();
            List<Object> argsDetailed = new ArrayList<>(argsBase);
            argsDetailed.addAll(argsFilter);

            // Debug: Check raw count for the period
            String countSql = "SELECT COUNT(*) FROM " + tbl + " WHERE " + whereClause.toString();
            log.info("Debug Count SQL: {}", countSql);
            log.info("Debug Count Params: {}", args);
            Integer count = pgJdbc.queryForObject(countSql, Integer.class, args.toArray());
            log.info("Debug Count Result: {}", count);

            // 1. By Region (Customer Address)
            // Join invoice with customer on customer_seq
            // Region = addr_province_name + ' ' + addr_city_name
            sqlRegion = "SELECT " +
                    "concat(c.addr_province_name, ' ', c.addr_city_name) as \"region\", " +
                    "SUM(i." + colAmt + ") as \"totalAmt\" " +
                    "FROM " + tbl + " i " +
                    "JOIN public.customer c ON c.customer_seq = i.customer_seq " +
                    "WHERE " + whereDetailed +
                    " GROUP BY c.addr_province_name, c.addr_city_name " +
                    "ORDER BY \"totalAmt\" DESC";

            List<Map<String, Object>> byRegion = pgJdbc.queryForList(sqlRegion, argsDetailed.toArray());

            // 2. By Item
            // Join invoice with item on item_seq if item_name is missing in invoice or to
            // be safe
            String itemTbl = env.getProperty("app.item.table", "public.item");
            String itemColSeq = env.getProperty("app.item.columns.item_seq", "item_seq");
            String itemColName = env.getProperty("app.item.columns.item_name", "item_name");
            String itemColNo = env.getProperty("app.item.columns.item_no", "item_no");
            String itemColCompanyType = env.getProperty("app.item.columns.company_type", "company_type");
            String colItemSeq = env.getProperty("app.invoice.columns.item_seq", "item_seq");

            // Re-use whereI but replace i.col with just col for the single table query if
            // we were not joining
            // But here we are joining, so we need to use aliases.
            // Let's use the same whereI which uses 'i' alias.

            String sqlItem = "SELECT " +
                    "coalesce(it." + itemColName + ", i." + colItemName + ", it." + itemColNo + ", cast(i." + colItemSeq
                    + " as text), '미지정') as \"itemName\", " +
                    "SUM(i." + colAmt + ") as \"totalAmt\" " +
                    "FROM " + tbl + " i " +
                    "LEFT JOIN " + itemTbl + " it ON it." + itemColSeq + " = i." + colItemSeq +
                    " AND it." + itemColCompanyType + " = i." + colCompanyType + " " +
                    "WHERE " + whereDetailed +
                    " GROUP BY 1 ORDER BY \"totalAmt\" DESC";

            log.info("Sales Status Analysis SQL (Item): {}", sqlItem);
            log.info("Sales Status Analysis Params: {}", argsDetailed);

            List<Map<String, Object>> byItem = pgJdbc.queryForList(sqlItem, argsDetailed.toArray());

            // 3. By Salesperson
            // Use curr_emp_name from invoice table directly
            String sqlSalesperson = "SELECT " +
                    "coalesce(i.curr_emp_name, '미지정') as \"salesperson\", " +
                    "SUM(i." + colAmt + ") as \"totalAmt\" " +
                    "FROM " + tbl + " i " +
                    "WHERE " + whereDetailed +
                    " GROUP BY i.curr_emp_name " +
                    "ORDER BY \"totalAmt\" DESC";

            List<Map<String, Object>> bySalesperson = pgJdbc.queryForList(sqlSalesperson, argsDetailed.toArray());

            // 4. By Sales Management Unit (Higher level of Item)
            String itemColSalesMgmtUnit = env.getProperty("app.item.columns.sales_mgmt_unit", "sales_mgmt_unit");
            String sqlSalesMgmtUnit = "SELECT " +
                    "coalesce(it." + itemColSalesMgmtUnit + ", '미지정') as \"unitName\", " +
                    "SUM(i." + colAmt + ") as \"totalAmt\" " +
                    "FROM " + tbl + " i " +
                    "LEFT JOIN " + itemTbl + " it ON it." + itemColSeq + " = i." + colItemSeq +
                    " AND it." + itemColCompanyType + " = i." + colCompanyType + " " +
                    "WHERE " + whereDetailed +
                    " GROUP BY 1 ORDER BY \"totalAmt\" DESC";

            List<Map<String, Object>> bySalesMgmtUnit = pgJdbc.queryForList(sqlSalesMgmtUnit, argsDetailed.toArray());

            // 5. Summary (ALL, TNT, DYS) - Period based, ignoring companyType filter
            String sqlSummary = "SELECT " +
                    "SUM(CASE WHEN upper(coalesce(nullif(trim(i." + colCompanyType + "),''), '')) = 'TNT' THEN i."
                    + colAmt + " ELSE 0 END) as \"tntAmt\", " +
                    "SUM(CASE WHEN upper(coalesce(nullif(trim(i." + colCompanyType + "),''), '')) = 'DYS' THEN i."
                    + colAmt + " ELSE 0 END) as \"dysAmt\", " +
                    "SUM(i." + colAmt + ") as \"totalAmt\" " +
                    "FROM " + tbl + " i " +
                    "WHERE " + whereBase.toString();

            Map<String, Object> summary = pgJdbc.queryForMap(sqlSummary, argsBase.toArray());

            return ResponseEntity.ok(Map.of(
                    "byRegion", byRegion,
                    "byItem", byItem,
                    "bySalesperson", bySalesperson,
                    "bySalesMgmtUnit", bySalesMgmtUnit,
                    "summary", summary,
                    "debugCount", count, // Return debug count to frontend
                    "period", Map.of("type", type, "year", year, "month", month != null ? month : 0, "week",
                            week != null ? week : 0)));

        } catch (Exception e) {
            log.error("Sales Status Analysis Error", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/sales-trend")
    public ResponseEntity<?> getSalesTrend(@RequestParam(value = "startDate") String startDate,
            @RequestParam(value = "endDate") String endDate,
            @RequestParam(value = "companyType", required = false) String companyType,
            @RequestParam(value = "groupBy", defaultValue = "DAILY") String groupBy) {
        if (pgJdbc == null) {
            return ResponseEntity.ok(Map.of("error", "PostgreSQL datasource not configured"));
        }

        String tbl = env.getProperty("app.invoice.table", "public.invoice");
        String colDate = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        String colAmt = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        String colCompanyType = env.getProperty("app.invoice.columns.company_type", "company_type");

        boolean dateIsText = Boolean.parseBoolean(env.getProperty("app.invoice.columns.invoice_date_is_text", "false"));
        String dateFmt = env.getProperty("app.invoice.columns.invoice_date_format", "YYYY-MM-DD");
        String dateExpr = dateIsText ? ("to_date(" + colDate + ", '" + dateFmt + "')") : (colDate + "::date");

        try {
            StringBuilder sql = new StringBuilder();
            List<Object> args = new ArrayList<>();

            String selectDateExpr = dateExpr;
            if ("WEEKLY".equalsIgnoreCase(groupBy)) {
                selectDateExpr = "to_char(" + dateExpr + ", 'IYYY-IW')";
            } else if ("MONTHLY".equalsIgnoreCase(groupBy)) {
                selectDateExpr = "to_char(" + dateExpr + ", 'YYYY-MM')";
            }

            sql.append("SELECT ").append(selectDateExpr).append(" as \"date\", ")
                    .append("SUM(").append(colAmt).append(") as \"amount\" ")
                    .append("FROM ").append(tbl).append(" ")
                    .append("WHERE ").append(dateExpr).append(" BETWEEN ?::date AND ?::date ");
            args.add(startDate);
            args.add(endDate);

            String companyTypeTrimmed = companyType == null ? "" : companyType.trim();
            if (!companyTypeTrimmed.isEmpty() && !"ALL".equalsIgnoreCase(companyTypeTrimmed)) {
                sql.append(" AND upper(coalesce(nullif(trim(").append(colCompanyType)
                        .append("),''), '')) = upper(?) ");
                args.add(companyTypeTrimmed);
            }

            sql.append(" GROUP BY 1 ORDER BY 1");

            List<Map<String, Object>> data = pgJdbc.queryForList(sql.toString(), args.toArray());
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            log.error("Sales Trend Error", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

}
