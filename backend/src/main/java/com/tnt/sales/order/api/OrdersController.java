package com.tnt.sales.order.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import com.tnt.sales.slack.service.SlackService;

@RestController
@RequestMapping("/api/v1/orders")
public class OrdersController {
    private static final Logger log = LoggerFactory.getLogger(OrdersController.class);
    @Autowired Environment env;
    @Autowired(required = false) JdbcTemplate jdbc; // primary (Postgres)
    @Autowired(required = false) SlackService slackService;

    @Autowired(required = false)
    @org.springframework.beans.factory.annotation.Qualifier("mssqlJdbcTemplate")
    JdbcTemplate mssqlJdbc; // TNT ERP DB

    @Autowired(required = false)
    @org.springframework.beans.factory.annotation.Qualifier("mssqlDysJdbcTemplate")
    JdbcTemplate mssqlDysJdbc; // DYS ERP DB

    public static class OrderItemReq {
        public String itemSeq;
        public String itemName;
        public String itemSpec;
        public BigDecimal qty;
        public String itemStdUnit;
        public String companyType;
    }

    public static class OrderReq {
        public String companyCode;     // e.g., TNT
        public String customerSeq;     // numeric as string
        public String customerName;    // label
        public String assigneeId;      // mapped sales emp id? (seq unknown)
        public String regionGroup;
        public String requests;        // free text
        public String deliveryDueDate; // YYYY-MM-DD
        public String createdBy;
        public List<OrderItemReq> items;

        // Optional explicit fields for external API if available
        public String orderTextNo;     // OrderTextNo
        public String salesEmpSeq;     // SalesEmpSeq (if known)
        public String whSeq;           // WHSeq (if known)
        public String custEmpName;     // CustEmpName (if known)
        public String stdDate;         // StdDate (YYYYMMDD)
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody OrderReq req,
            @RequestHeader(value = "X-ASSIGNEE-ID", required = false) String assigneeHeader,
            @RequestHeader(value = "X-ERP-DEBUG", required = false) String debugHeader,
            @RequestParam(value = "debug", required = false) String debugParam
    ) {
        try {
            // Basic validation
            if (req == null || req.items == null || req.items.isEmpty())
                return ResponseEntity.badRequest().body(Map.of("error","empty_cart"));

            // Read config (fallbacks provided per spec message)
            // Default TNT endpoint (no explicit :8300 port)
            String apiUrl = env.getProperty(
                    "tnt.orders.api.url",
                    "http://220.73.213.73/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPIMESOrderTextSave"
            );
            String certId = env.getProperty("tnt.orders.api.certId", "TNT_CRM");
            String certKey = env.getProperty("tnt.orders.api.certKey", "9836164F-3601-4DBB-9D6D-54685CD89B95");
            String dsn = env.getProperty("tnt.orders.api.dsn", "tnt_bis");
            String dsnOper = env.getProperty("tnt.orders.api.dsnOper", "tnt_oper");
            String dsnBis = env.getProperty("tnt.orders.api.dsnBis", "tnt_bis");
            String companySeq = env.getProperty("tnt.orders.api.companySeq", "1");
            int languageSeq = Integer.parseInt(env.getProperty("tnt.orders.api.languageSeq", "1"));
            int securityType = Integer.parseInt(env.getProperty("tnt.orders.api.securityType", "0"));

            // Dates
            String todayYmd = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // yyyymmdd
            String stdDate = (req.stdDate != null && !req.stdDate.isBlank()) ? req.stdDate : todayYmd;
            String orderTextNo = (req.orderTextNo != null && !req.orderTextNo.isBlank()) ? req.orderTextNo : generateOrderTextNo(req);

            // Compose OrderText: items lines only; send requests separately via OrderRemark
            String orderText = buildOrderText(req.items);

            // Resolve SalesEmpSeq from assignee_id per company rule (TNT → tnt_emp_seq, DYS → dys_emp_seq)
            String companyCode = Optional.ofNullable(req.companyCode).orElse("TNT").trim().toUpperCase();
            // Select external API endpoint by company (TNT keeps existing URL; DYS uses :81 + dys_ proc)
            try {
                String apiUrlDys = env.getProperty(
                        "tnt.orders.api.url.dys",
                        "http://220.73.213.73:81/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPIMESOrderTextSave");
                if ("DYS".equals(companyCode)) {
                    apiUrl = apiUrlDys;
                    // Override certKey for DYS (configurable with default)
                    certKey = env.getProperty(
                            "tnt.orders.api.certKey.dys",
                            "A66C1236-0FFF-4F1D-96AC-27B5839548F9"
                    );
                    // Override certId/dsn for DYS as requested (configurable with defaults)
                    certId = env.getProperty("tnt.orders.api.certId.dys", "DYS_CRM");
                    dsn = env.getProperty("tnt.orders.api.dsn.dys", "dys_bis");
                    dsnOper = env.getProperty("tnt.orders.api.dsnOper.dys", "dys_oper");
                    dsnBis = env.getProperty("tnt.orders.api.dsnBis.dys", "dys_bis");
                }
            } catch (Exception ignore) {}
            String salesEmpSeqResolved = Optional.ofNullable(req.salesEmpSeq).orElse("");
            if ((salesEmpSeqResolved == null || salesEmpSeqResolved.isBlank()) && jdbc != null) {
                String assigneeId = Optional.ofNullable(req.assigneeId).orElse("").trim();
                if (assigneeId.isEmpty()) assigneeId = Optional.ofNullable(assigneeHeader).orElse("").trim();
                if (!assigneeId.isEmpty()) {
                    String col = companyCode.equals("DYS") ? "dys_emp_seq" : "tnt_emp_seq";
                    Long seq = null;
                    try {
                        seq = jdbc.queryForObject(
                                "SELECT " + col + " FROM public.employee WHERE assignee_id = ?",
                                Long.class,
                                assigneeId
                        );
                    } catch (Exception ignore) { seq = null; }
                    // No emp_seq fallback by policy; use tnt_/dys_emp_seq only
                    if (seq != null) salesEmpSeqResolved = String.valueOf(seq);
                }
            }
            if (salesEmpSeqResolved == null || salesEmpSeqResolved.isBlank()) {
                // Last resort (legacy debug behavior)
                salesEmpSeqResolved = "4";
            }
            boolean debugEnv = Boolean.parseBoolean(env.getProperty("tnt.orders.api.debug", "false"));
            boolean debugMode = debugEnv || "true".equalsIgnoreCase(debugHeader) || "true".equalsIgnoreCase(debugParam);

            // Map DataBlock1 row
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("WorkingTag", "A");
            row.put("IDX_NO", 0);
            row.put("Status", "0");
            row.put("DataSeq", 1);
            row.put("Selected", 1);
            row.put("TABLE_NAME", "");
            row.put("UserName", Optional.ofNullable(req.createdBy).orElse(""));
            row.put("OrderTextNo", orderTextNo);
            row.put("StdDate", stdDate);
            row.put("CustSeq", Optional.ofNullable(req.customerSeq).orElse(""));
            row.put("SalesEmpSeq", salesEmpSeqResolved);
            row.put("CustEmpName", Optional.ofNullable(req.custEmpName).orElse(""));
            row.put("WHSeq", Optional.ofNullable(req.whSeq).orElse(""));
            row.put("DelvDate", (req.deliveryDueDate != null) ? req.deliveryDueDate.replaceAll("-", "") : todayYmd);
            row.put("OrderText", orderText);
            String remarkRaw = Optional.ofNullable(req.requests).orElse("").trim();
            String remarkText = remarkRaw.isEmpty() ? "요청사항:" : "요청사항:\n" + remarkRaw;
            row.put("OrderRemark", remarkText);

            Map<String,Object> payload = new LinkedHashMap<>();
            Map<String,Object> root = new LinkedHashMap<>();
            payload.put("ROOT", root);
            root.put("certId", certId);
            root.put("certKey", certKey);
            root.put("dsn", dsn);
            root.put("dsnOper", dsnOper);
            root.put("dsnBis", dsnBis);
            root.put("companySeq", companySeq);
            root.put("languageSeq", languageSeq);
            root.put("securityType", securityType);
            root.put("userId", Optional.ofNullable(req.createdBy).orElse(""));
            Map<String,Object> data = new LinkedHashMap<>();
            root.put("data", data);
            Map<String,Object> dataRoot = new LinkedHashMap<>();
            data.put("ROOT", dataRoot);
            List<Map<String,Object>> dataBlock1 = new ArrayList<>();
            dataRoot.put("DataBlock1", dataBlock1);
            dataBlock1.add(row);
            Map<String,Object> slackPayload = new LinkedHashMap<>();
            slackPayload.put("orderNo", orderTextNo);
            slackPayload.put("companyCode", companyCode);
            slackPayload.put("customerName", Optional.ofNullable(req.customerName).orElse(""));
            slackPayload.put("createdBy", Optional.ofNullable(req.createdBy).orElse(""));
            slackPayload.put("regionGroup", Optional.ofNullable(req.regionGroup).orElse(""));
            slackPayload.put("orderText", orderText);
            slackPayload.put("orderRemark", remarkText);
            slackPayload.put("requestDate", Optional.ofNullable(req.deliveryDueDate).orElse(""));
            Map<String,Object> debugPayload = new LinkedHashMap<>();
            debugPayload.put("apiUrl", apiUrl);
            debugPayload.put("erpPayload", payload);
            debugPayload.put("orderTextNo", orderTextNo);
            debugPayload.put("orderText", orderText);
            debugPayload.put("orderRemark", remarkText);
            debugPayload.put("slackPayload", slackPayload);
            if (debugMode) {
                return ResponseEntity.ok(Map.of(
                        "debug", true,
                        "debugPayload", debugPayload,
                        "orderTextNo", orderTextNo
                ));
            }

            RestTemplate rt = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            HttpEntity<Map<String,Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> resp = rt.postForEntity(apiUrl, entity, Map.class);

            Map<?,?> body = resp.getBody();
            Map<String,Object> result = new LinkedHashMap<>();
            result.put("status", resp.getStatusCode().value());
            result.put("ok", resp.getStatusCode().is2xxSuccessful());
            result.put("url", apiUrl);
            result.put("sendPayload", payload);
            if (body != null) result.put("receivedPayload", body);
            // Try to extract ROOT.DataBlock1.Status/Results
            try {
                Object rRoot = ((Map<?,?>) body.get("ROOT")).get("DataBlock1");
                if (rRoot instanceof Map<?,?> rr) {
                    result.put("externalStatus", rr.get("Status"));
                    result.put("externalResults", rr.get("Results"));
                }
            } catch (Exception ignore) {}

            // Also send Slack notification using copy-format when API call succeeded (best effort)
            boolean slackOk = false;
            try {
                if (resp.getStatusCode().is2xxSuccessful() && slackService != null) {
                    String regionGroupVal = Optional.ofNullable(req.regionGroup).orElse("");
                    String createdByVal = Optional.ofNullable(req.createdBy).orElse("");
                    slackOk = slackService.sendOrderCopyFormat(
                            orderTextNo,
                            companyCode,
                            Optional.ofNullable(req.customerName).orElse(""),
                            createdByVal,
                            regionGroupVal,
                            orderText,
                            Optional.ofNullable(req.requests).orElse(""),
                            Optional.ofNullable(req.deliveryDueDate).orElse("")
                    );
                }
            } catch (Exception e) {
                log.warn("[Orders.create] Slack notify failed: {}", e.toString());
                slackOk = false;
            }
            result.put("slackOk", slackOk);
            return ResponseEntity.status(resp.getStatusCode()).body(result);
        } catch (Exception e) {
            log.error("[Orders.create] failed: {}", e.toString());
            return ResponseEntity.status(500).body(Map.of("error","order_create_failed","message", e.getMessage()));
        }
    }

    @GetMapping("/next-order-text-no")
    public ResponseEntity<?> nextOrderTextNo(
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @RequestParam(name = "createdBy", required = false) String createdBy
    ) {
        try {
            OrderReq tmp = new OrderReq();
            tmp.companyCode = (companyCode != null && !companyCode.isBlank()) ? companyCode : "TNT";
            tmp.createdBy = (createdBy != null) ? createdBy : "";
            String no = generateOrderTextNo(tmp);
            return ResponseEntity.ok(Map.of("orderTextNo", no));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "order_text_no_failed", "message", e.getMessage()));
        }
    }

    private String buildOrderText(List<OrderItemReq> items) {
        try {
            StringBuilder sb = new StringBuilder();
            for (int i=0;i<items.size();i++) {
                OrderItemReq it = items.get(i);
                if (i>0) sb.append("\n"); // 항목별 개행
                // 품목 - 수량 단위 형식 (단위 포함, 소수점 2자리 고정)
                String name = Optional.ofNullable(it.itemName).orElse("");
                String unit = Optional.ofNullable(it.itemStdUnit).filter(s -> !s.isBlank()).orElse("");
                String qty = formatQty(it.qty);
                sb.append(name).append(" - ").append(qty);
                if (!unit.isEmpty()) sb.append(" ").append(unit);
            }
            return sb.toString();
        } catch (Exception ignore) { return ""; }
    }

    private String formatQty(Object qtyObj) {
        try {
            if (qtyObj == null) return "0.00";
            BigDecimal bd = null;
            if (qtyObj instanceof BigDecimal) bd = (BigDecimal) qtyObj;
            else if (qtyObj instanceof Number) bd = BigDecimal.valueOf(((Number) qtyObj).doubleValue());
            else bd = new BigDecimal(qtyObj.toString());
            bd = bd.setScale(2, RoundingMode.DOWN);
            return bd.toPlainString();
        } catch (Exception e) {
            return "0.00";
        }
    }

    private String generateOrderTextNo(OrderReq req) {
        // Daily reset policy using updated_at:
        // - Keep serl_type constant ('order_form') and company_type per company
        // - If date(updated_at) != target date (stdDate or today), reset last_serl to 0 before increment
        // - Format: PREFIX + YYYYMMDD + %03d(last_serl after increment)
        try {
            String company = Optional.ofNullable(req.companyCode).orElse("TNT").trim().toUpperCase();
            String prefix = switch (company) { case "DYS" -> "DO"; default -> "TO"; };
            String ymd = Optional.ofNullable(req.stdDate)
                    .map(String::trim)
                    .filter(s -> s.matches("^\\d{8}$"))
                    .orElse(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")));
            LocalDate targetDate = LocalDate.parse(ymd, DateTimeFormatter.ofPattern("yyyyMMdd"));
            String serlType = "order_form";

            long next = 0L;
            if (jdbc != null) {
                String tbl = env.getProperty("app.serial.table", "public.serial_counter");
                String colCompany = env.getProperty("app.serial.company_column", "company_type");

                Map<String, Object> row = null;
                try {
                    row = jdbc.queryForMap(
                            "SELECT last_serl, updated_at FROM " + tbl + " WHERE serl_type = ? AND " + colCompany + " = ? LIMIT 1",
                            serlType,
                            company
                    );
                } catch (Exception ignore) { row = null; }

                if (row == null) {
                    // Initialize row for this company/type
                    try {
                        jdbc.update(
                                "INSERT INTO " + tbl + "(serl_type, " + colCompany + ", last_serl, updated_at, updated_by) VALUES (?, ?, 0, now(), ?)",
                                serlType,
                                company,
                                Optional.ofNullable(req.createdBy).orElse("")
                        );
                    } catch (Exception ignore) {}
                } else {
                    try {
                        Object ts = row.get("updated_at");
                        LocalDate lastDate = null;
                        if (ts instanceof java.sql.Timestamp t) {
                            lastDate = t.toLocalDateTime().toLocalDate();
                        }
                        if (lastDate != null && !lastDate.equals(targetDate)) {
                            // Reset counter for new date
                            jdbc.update(
                                    "UPDATE " + tbl + " SET last_serl = 0, updated_at = now(), updated_by = ? WHERE serl_type = ? AND " + colCompany + " = ?",
                                    Optional.ofNullable(req.createdBy).orElse(""),
                                    serlType,
                                    company
                            );
                        }
                    } catch (Exception ignore) {}
                }

                // Increment and return
                Long val = null;
                try {
                    val = jdbc.queryForObject(
                            "UPDATE " + tbl + " SET last_serl = last_serl + 1, updated_at = now(), updated_by = ? WHERE serl_type = ? AND " + colCompany + " = ? RETURNING last_serl",
                            Long.class,
                            Optional.ofNullable(req.createdBy).orElse(""),
                            serlType,
                            company
                    );
                } catch (Exception ignore) { val = null; }
                if (val != null) next = val;
            }
            String ser = String.format("%03d", (int) next);
            return prefix + ymd + ser;
        } catch (Exception e) {
            // Fallback: timestamp-based unique key
            return "A" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        }
    }

    /**
     * GET /api/v1/orders/sales-control/check
     * 매출통제 여부 확인 API
     * 1. ERP API(tnt_SWAPISLSalesBondAnalRemainderInfo) 호출하여 Term 필드들 확인
     * 2. Term90~Over365 중 하나라도 값이 있으면 매출통제 대상
     * 3. ERP _TDACustUserDefine 테이블에서 mngserl=108720008 조회하여 해제 여부 확인
     *
     * @param customerSeq 거래처 시퀀스
     * @param companyType 회사 타입 (TNT or DYS)
     * @return 매출통제 상태 정보
     */
    @GetMapping("/sales-control/check")
    public ResponseEntity<Map<String, Object>> checkSalesControl(
            @RequestParam Long customerSeq,
            @RequestParam(defaultValue = "TNT") String companyType) {
        log.info("GET /api/v1/orders/sales-control/check - customerSeq: {}, companyType: {}", customerSeq, companyType);

        Map<String, Object> response = new HashMap<>();

        try {
            // 1. ERP API 호출하여 매출통제 여부 확인 (Term 필드들 체크)
            Map<String, Object> erpResult = callErpSalesControlApi(customerSeq, companyType);

            boolean isSalesControlled = false;
            String salesControlReason = null;
            List<String> termFieldsWithValue = new ArrayList<>();

            // Term 필드 목록
            String[] termFields = {"Term90", "Term120", "Term150", "Term180", "Term210",
                                   "Term240", "Term270", "Term300", "Term330", "Term365", "Over365"};

            if (erpResult != null && erpResult.containsKey("items")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = (List<Map<String, Object>>) erpResult.get("items");
                if (items != null && !items.isEmpty()) {
                    Map<String, Object> firstItem = items.get(0);

                    // Term 필드들 확인 - 하나라도 값이 있으면 매출통제
                    for (String termField : termFields) {
                        Object termValue = firstItem.get(termField);
                        if (termValue != null) {
                            String strValue = String.valueOf(termValue).trim();
                            // 숫자 값이 0이 아니면 매출통제
                            if (!strValue.isEmpty() && !"null".equals(strValue) && !"0".equals(strValue) && !"0.0".equals(strValue)) {
                                try {
                                    double numValue = Double.parseDouble(strValue);
                                    if (numValue != 0) {
                                        isSalesControlled = true;
                                        // 금액을 읽기 쉬운 형식으로 포맷팅 (예: 55,256,104원)
                                        String formattedAmount = formatCurrency(numValue);
                                        // Term 필드를 한국어로 변환 (예: Term300 → 10개월)
                                        String koreanTerm = convertTermFieldToKorean(termField);
                                        termFieldsWithValue.add(koreanTerm + "=" + formattedAmount);
                                    }
                                } catch (NumberFormatException e) {
                                    // 숫자가 아닌 문자열 값이 있는 경우도 매출통제
                                    isSalesControlled = true;
                                    String koreanTerm = convertTermFieldToKorean(termField);
                                    termFieldsWithValue.add(koreanTerm + "=" + strValue);
                                }
                            }
                        }
                    }

                    if (isSalesControlled) {
                        salesControlReason = "장기미수 존재 (" + String.join(", ", termFieldsWithValue) + ")";
                    }
                }
            }

            // 2. ERP _TDACustUserDefine 테이블에서 해제 여부 확인 (mngserl=108720008)
            String unblockUntilDate = null;
            boolean isUnblocked = false;
            String expiredUnblockInfo = null;  // 만료된 해제 정보

            if (isSalesControlled) {
                // 매출통제 대상인 경우에만 해제 여부 확인 (ERP DB 직접 조회)
                Map<String, Object> unblockResult = queryErpUnblockDate(customerSeq, companyType);
                if (unblockResult != null && unblockResult.containsKey("MngValText")) {
                    String mngValText = (String) unblockResult.get("MngValText");
                    if (mngValText != null && !mngValText.trim().isEmpty()) {
                        try {
                            // MngValText가 날짜 형식인지 확인하고 현재일과 비교
                            LocalDate unblockDate = parseUnblockDate(mngValText);
                            if (unblockDate != null) {
                                String formattedDate = unblockDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                                if (!unblockDate.isBefore(LocalDate.now())) {
                                    // 해제일이 오늘 이후면 해제 상태
                                    isUnblocked = true;
                                    unblockUntilDate = formattedDate;
                                } else {
                                    // 해제 기간이 만료됨
                                    expiredUnblockInfo = "통제해제 기간만료 (" + formattedDate + "까지였음)";
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Failed to parse MngValText as date: {}", mngValText);
                        }
                    }
                }
            }

            // salesControlReason에 만료된 해제 정보 추가
            if (salesControlReason != null && expiredUnblockInfo != null) {
                salesControlReason = salesControlReason + ", " + expiredUnblockInfo;
            }

            // 결과 조합
            response.put("success", true);
            response.put("customerSeq", customerSeq);
            response.put("companyType", companyType);
            response.put("isSalesControlled", isSalesControlled);
            response.put("salesControlReason", salesControlReason);
            response.put("isUnblocked", isUnblocked);
            response.put("unblockUntilDate", unblockUntilDate);

            // 최종 상태: 매출통제 중이지만 해제 기간이면 해제 상태
            boolean finalStatus = isSalesControlled && !isUnblocked;
            response.put("finalSalesControlStatus", finalStatus);
            response.put("statusMessage", getStatusMessage(isSalesControlled, isUnblocked, unblockUntilDate));

        } catch (Exception e) {
            log.error("Error checking sales control status", e);
            response.put("success", false);
            response.put("error", "매출통제 확인 실패: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * ERP API 호출하여 매출통제 정보 조회 (tnt_SWAPISLSalesBondAnalRemainderInfo)
     * 채권회의 workflow와 동일한 파라미터 구조 사용
     */
    private Map<String, Object> callErpSalesControlApi(Long customerSeq, String companyType) {
        try {
            // API URL 선택 (TNT vs DYS) - tnt_SWAPISLSalesBondAnalRemainderInfo 사용
            String apiUrl = "TNT".equalsIgnoreCase(companyType)
                    ? "http://220.73.213.73/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPISLSalesBondAnalRemainderInfo"
                    : "http://220.73.213.73:81/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPISLSalesBondAnalRemainderInfo";

            // Credentials
            String certId = "TNT".equalsIgnoreCase(companyType) ? "TNT_CRM" : "DYS_CRM";
            String certKey = "TNT".equalsIgnoreCase(companyType)
                    ? "9836164F-3601-4DBB-9D6D-54685CD89B95"
                    : "A66C1236-0FFF-4F1D-96AC-27B5839548F9";
            String dsn = "TNT".equalsIgnoreCase(companyType) ? "tnt_bis" : "dys_bis";
            String dsnOper = "TNT".equalsIgnoreCase(companyType) ? "tnt_oper" : "dys_oper";

            // 기준년월 (오늘 기준 YYYYMM)
            String stdYM = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));

            // Build request payload - 채권회의 workflow와 동일한 구조
            Map<String, Object> payload = new LinkedHashMap<>();
            Map<String, Object> root = new LinkedHashMap<>();
            payload.put("ROOT", root);

            root.put("certId", certId);
            root.put("certKey", certKey);
            root.put("dsnOper", dsnOper);
            root.put("dsnBis", dsn);
            root.put("dsn", dsn);
            root.put("companySeq", "1");
            root.put("languageSeq", 1);
            root.put("securityType", 0);
            root.put("userId", "");

            Map<String, Object> data = new LinkedHashMap<>();
            root.put("data", data);

            Map<String, Object> dataRoot = new LinkedHashMap<>();
            data.put("ROOT", dataRoot);

            // DataBlock1을 List로 구성 (채권회의 API와 동일)
            List<Map<String, Object>> dataBlock1List = new ArrayList<>();
            Map<String, Object> dataBlock1 = new LinkedHashMap<>();
            dataBlock1.put("StdYM", stdYM);
            dataBlock1.put("BizUnit", "");
            dataBlock1.put("CustSeq", String.valueOf(customerSeq));
            dataBlock1.put("EmpSeq", "");
            dataBlock1.put("SMQryType", "1078004");
            dataBlock1.put("IncludeMiNote", "1");
            dataBlock1.put("PAGE_NO", "1");
            dataBlock1.put("PAGE_SIZE", "10");
            dataBlock1List.add(dataBlock1);
            dataRoot.put("DataBlock1", dataBlock1List);

            // HTTP Call
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> responseEntity = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                Map<String, Object> result = new HashMap<>();
                Map<String, Object> responseBody = responseEntity.getBody();

                // Parse response - DataBlock1 직접 접근 (채권회의와 동일)
                Object dataBlock1Obj = responseBody.get("DataBlock1");
                if (dataBlock1Obj instanceof List) {
                    result.put("items", dataBlock1Obj);
                } else {
                    // ROOT 안에 있을 수도 있음
                    Object rootObj = responseBody.get("ROOT");
                    if (rootObj instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> rootMap = (Map<String, Object>) rootObj;
                        dataBlock1Obj = rootMap.get("DataBlock1");
                        if (dataBlock1Obj instanceof List) {
                            result.put("items", dataBlock1Obj);
                        }
                    }
                }

                return result;
            }
        } catch (Exception e) {
            log.error("Error calling ERP sales control API", e);
        }
        return null;
    }

    /**
     * ERP DB 직접 조회하여 매출통제 해제 여부 확인
     * select MngValText from _TDACustUserDefine where mngserl=108720008 and custseq=?
     */
    private Map<String, Object> queryErpUnblockDate(Long customerSeq, String companyType) {
        try {
            // TNT vs DYS DB 선택
            JdbcTemplate erpJdbc = "TNT".equalsIgnoreCase(companyType) ? mssqlJdbc : mssqlDysJdbc;
            if (erpJdbc == null) {
                log.warn("ERP JDBC is not available for companyType: {}", companyType);
                return null;
            }

            // ERP DB 직접 조회
            String sql = "SELECT MngValText FROM _TDACustUserDefine WHERE MngSerl = 108720008 AND CustSeq = ?";
            List<Map<String, Object>> results = erpJdbc.queryForList(sql, customerSeq);

            if (results != null && !results.isEmpty()) {
                Map<String, Object> row = results.get(0);
                Map<String, Object> result = new HashMap<>();
                result.put("MngValText", row.get("MngValText"));
                log.info("ERP unblock query result for customerSeq {}: MngValText={}", customerSeq, row.get("MngValText"));
                return result;
            } else {
                log.info("No unblock record found for customerSeq: {}", customerSeq);
            }
        } catch (Exception e) {
            log.error("Error querying ERP unblock date for customerSeq: {}", customerSeq, e);
        }
        return null;
    }

    /**
     * MngValText를 LocalDate로 파싱
     */
    private LocalDate parseUnblockDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        dateStr = dateStr.trim();

        // 다양한 날짜 형식 시도
        String[] patterns = {"yyyyMMdd", "yyyy-MM-dd", "yyyy/MM/dd", "yyyy.MM.dd"};
        for (String pattern : patterns) {
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(pattern));
            } catch (Exception e) {
                // 다음 패턴 시도
            }
        }
        return null;
    }

    /**
     * 상태 메시지 생성
     */
    private String getStatusMessage(boolean isSalesControlled, boolean isUnblocked, String unblockUntilDate) {
        if (!isSalesControlled) {
            return "정상 (매출통제 없음)";
        }
        if (isUnblocked && unblockUntilDate != null) {
            return "매출통제 해제됨 (" + unblockUntilDate + "까지)";
        }
        return "매출통제 중";
    }

    /**
     * 금액을 읽기 쉬운 형식으로 포맷팅 (예: 55256104.0 → 55,256,104원)
     */
    private String formatCurrency(double amount) {
        java.text.NumberFormat formatter = java.text.NumberFormat.getNumberInstance(java.util.Locale.KOREA);
        formatter.setMaximumFractionDigits(0);
        return formatter.format(Math.round(amount)) + "원";
    }

    /**
     * Term 필드명을 한국어 기간 표시로 변환
     * Before30 → 1개월미만, Term60 → 2개월미만, Term90 → 3개월, ...
     * Term365 → 12개월 미만, Over365 → 12개월 초과
     */
    private String convertTermFieldToKorean(String termField) {
        switch (termField) {
            case "Before30": return "1개월미만";
            case "Term60": return "2개월미만";
            case "Term90": return "3개월";
            case "Term120": return "4개월";
            case "Term150": return "5개월";
            case "Term180": return "6개월";
            case "Term210": return "7개월";
            case "Term240": return "8개월";
            case "Term270": return "9개월";
            case "Term300": return "10개월";
            case "Term330": return "11개월";
            case "Term365": return "12개월미만";
            case "Over365": return "12개월초과";
            default: return termField;
        }
    }
}
