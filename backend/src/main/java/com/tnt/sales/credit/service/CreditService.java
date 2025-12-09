package com.tnt.sales.credit.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CreditService {
    private static final Logger log = LoggerFactory.getLogger(CreditService.class);

    // ERP API endpoints - using same pattern as OrdersController
    private static final String TNT_ERP_URL = "http://220.73.213.73/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPISLSalesBondAnalRemainderInfo";
    private static final String DYS_ERP_URL = "http://220.73.213.73:81/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPISLSalesBondAnalRemainderInfo";

    // TNT credentials
    private static final String TNT_CERT_ID = "TNT_CRM";
    private static final String TNT_CERT_KEY = "9836164F-3601-4DBB-9D6D-54685CD89B95";
    private static final String TNT_DSN = "tnt_bis";
    private static final String TNT_DSN_OPER = "tnt_oper";

    // DYS credentials
    private static final String DYS_CERT_ID = "DYS_CRM";
    private static final String DYS_CERT_KEY = "A66C1236-0FFF-4F1D-96AC-27B5839548F9";
    private static final String DYS_DSN = "dys_bis";
    private static final String DYS_DSN_OPER = "dys_oper";

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

    @Autowired(required = false)
    @Qualifier("mssqlJdbcTemplate")
    JdbcTemplate mssqlJdbc;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public CreditService() {
        log.info("CreditService constructor starting...");
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        log.info("CreditService constructor finished.");
    }

    /**
     * Get unique sales rep names
     */
    public List<String> getSalesRepList() {
        String sql = "SELECT DISTINCT emp_name FROM public.credit_ar_aging " +
                "WHERE emp_name IS NOT NULL AND emp_name != '' " +
                "ORDER BY emp_name";

        try {
            List<Map<String, Object>> results = pgJdbc.queryForList(sql);
            List<String> salesReps = new ArrayList<>();
            for (Map<String, Object> row : results) {
                salesReps.add((String) row.get("emp_name"));
            }
            return salesReps;
        } catch (Exception e) {
            log.error("Error getting sales rep list", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get snapshot options (meeting info + snapshot date)
     */
    public List<Map<String, Object>> getSnapshotOptions() {
        String sql = """
                SELECT DISTINCT
                    a.meeting_id,
                    m.meeting_name,
                    a.snapshot_date
                FROM public.credit_ar_aging a
                LEFT JOIN public.credit_meeting m ON a.meeting_id = m.id
                ORDER BY a.snapshot_date DESC, a.meeting_id DESC
                """;
        return pgJdbc.queryForList(sql);
    }

    /**
     * Legacy: Get distinct snapshot dates
     */
    /**
     * Legacy: Get distinct snapshot dates
     */
    public List<LocalDate> getSnapshotDates() {
        String sql = "SELECT DISTINCT snapshot_date FROM public.credit_ar_aging ORDER BY snapshot_date DESC";
        return pgJdbc.queryForList(sql, LocalDate.class);
    }

    /**
     * Query AR Aging data with filters
     */
    public List<Map<String, Object>> queryArAging(
            String company,
            String salesRep,
            String customerName,
            String riskLevel,
            String agingBucket,
            Long meetingId,
            String snapshotDate) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder();

        sql.append("SELECT ");
        sql.append("  customer_seq, customer_no, customer_name, ");
        sql.append("  company_type, ");
        sql.append("  dept_name, assignee_id, emp_name, ");
        sql.append("  total_ar, ");
        sql.append("  aging_0_30, aging_31_60, aging_61_90, ");
        sql.append("  aging_91_120, aging_121_150, aging_151_180, ");
        sql.append("  aging_181_210, aging_211_240, aging_241_270, ");
        sql.append("  aging_271_300, aging_301_330, aging_331_365, aging_over_365, ");
        sql.append("  snapshot_date, meeting_id ");
        sql.append("FROM public.credit_ar_aging ");
        sql.append("WHERE 1=1 ");

        if (company != null && !company.isEmpty() && !"all".equals(company)) {
            sql.append("AND company_type = ? ");
            params.add(company);
        }

        if (salesRep != null && !salesRep.isEmpty() && !"all".equals(salesRep)) {
            sql.append("AND emp_name = ? ");
            params.add(salesRep);
        }

        if (customerName != null && !customerName.isEmpty()) {
            sql.append("AND customer_name LIKE ? ");
            params.add("%" + customerName + "%");
        }

        if (agingBucket != null && !agingBucket.isEmpty() && !"all".equals(agingBucket)) {
            switch (agingBucket) {
                case "0-30":
                    sql.append("AND aging_0_30 > 0 ");
                    sql.append(
                            "AND (aging_31_60 + aging_61_90 + aging_91_120 + aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "31-60":
                    sql.append("AND aging_31_60 > 0 ");
                    sql.append(
                            "AND (aging_61_90 + aging_91_120 + aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "61-90":
                    sql.append("AND aging_61_90 > 0 ");
                    sql.append(
                            "AND (aging_91_120 + aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "91-120":
                    sql.append("AND aging_91_120 > 0 ");
                    sql.append(
                            "AND (aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "121-150":
                    sql.append("AND aging_121_150 > 0 ");
                    sql.append(
                            "AND (aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "151-180":
                    sql.append("AND aging_151_180 > 0 ");
                    sql.append(
                            "AND (aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "181-210":
                    sql.append("AND aging_181_210 > 0 ");
                    sql.append(
                            "AND (aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "211-240":
                    sql.append("AND aging_211_240 > 0 ");
                    sql.append(
                            "AND (aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "241-270":
                    sql.append("AND aging_241_270 > 0 ");
                    sql.append("AND (aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "271-300":
                    sql.append("AND aging_271_300 > 0 ");
                    sql.append("AND (aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "301-330":
                    sql.append("AND aging_301_330 > 0 ");
                    sql.append("AND (aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "331-365":
                    sql.append("AND aging_331_365 > 0 ");
                    sql.append("AND aging_over_365 = 0 ");
                    break;
                case "over-365":
                    sql.append("AND aging_over_365 > 0 ");
                    break;
            }
        }

        if (meetingId != null) {
            sql.append("AND meeting_id = ? ");
            params.add(meetingId);
        }

        if (snapshotDate != null && !snapshotDate.isEmpty() && !"latest".equals(snapshotDate)) {
            sql.append("AND snapshot_date = CAST(? AS DATE) ");
            params.add(snapshotDate);
        } else if (meetingId == null) {
            // Default to latest meeting if neither is specified
            sql.append("AND meeting_id = (SELECT MAX(meeting_id) FROM public.credit_ar_aging) ");
        }

        sql.append("ORDER BY total_ar DESC ");

        log.info("Query AR Aging SQL: {}", sql);
        log.info("Parameters: {}", params);

        try {
            return pgJdbc.queryForList(sql.toString(), params.toArray());
        } catch (Exception e) {
            log.error("Error querying AR aging data", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get customer credit detail
     */
    public Map<String, Object> getCustomerCreditDetail(Long customerSeq) {
        Map<String, Object> result = new HashMap<>();

        try {
            // Get latest AR aging data
            String arSql = "SELECT * FROM public.credit_ar_aging " +
                    "WHERE customer_seq = ? " +
                    "ORDER BY snapshot_date DESC LIMIT 1";

            List<Map<String, Object>> arData = pgJdbc.queryForList(arSql, customerSeq);
            if (!arData.isEmpty()) {
                result.putAll(arData.get(0));
            }

            // Calculate risk level based on aging
            BigDecimal totalAr = (BigDecimal) result.get("total_ar");
            BigDecimal overdue = BigDecimal.ZERO;

            // Sum aging buckets for overdue calculation
            String[] agingFields = { "aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                    "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                    "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365" };

            for (String field : agingFields) {
                BigDecimal value = (BigDecimal) result.get(field);
                if (value != null) {
                    overdue = overdue.add(value);
                }
            }

            result.put("overdue", overdue);

            // Determine risk level
            String riskLevel = "low";
            if (totalAr != null && totalAr.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal overdueRatio = overdue.divide(totalAr, 4, RoundingMode.HALF_UP);
                if (overdueRatio.compareTo(new BigDecimal("0.3")) > 0) {
                    riskLevel = "high";
                } else if (overdueRatio.compareTo(new BigDecimal("0.1")) > 0) {
                    riskLevel = "medium";
                }
            }
            result.put("risk_level", riskLevel);

        } catch (Exception e) {
            log.error("Error getting customer credit detail for customer_seq: " + customerSeq, e);
        }

        return result;
    }

    /**
     * Get credit meeting list
     */
    public List<Map<String, Object>> getCreditMeetings(String status, LocalDate fromDate, LocalDate toDate,
            String keyword) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder();

        sql.append("SELECT ");
        sql.append("  m.id, m.meeting_code, m.meeting_name, m.meeting_date, ");
        sql.append("  m.meeting_status, m.remark, m.created_at, ");
        sql.append("  COUNT(DISTINCT ar.customer_seq) as customer_count, ");
        sql.append("  SUM(CASE ");
        sql.append(
                "        WHEN COALESCE(ar.total_ar,0) > 0 ");
        sql.append(
                "         AND (COALESCE(ar.aging_31_60,0) + COALESCE(ar.aging_61_90,0) + COALESCE(ar.aging_91_120,0) + COALESCE(ar.aging_121_150,0) + COALESCE(ar.aging_151_180,0) + COALESCE(ar.aging_181_210,0) + COALESCE(ar.aging_211_240,0) + COALESCE(ar.aging_241_270,0) + COALESCE(ar.aging_271_300,0) + COALESCE(ar.aging_301_330,0) + COALESCE(ar.aging_331_365,0) + COALESCE(ar.aging_over_365,0)) / NULLIF(COALESCE(ar.total_ar,0),0) > 0.3 THEN 1 ");
        sql.append("        ELSE 0 END) AS high_risk_count, ");
        sql.append("  SUM(CASE ");
        sql.append(
                "        WHEN COALESCE(ar.total_ar,0) > 0 ");
        sql.append(
                "         AND (COALESCE(ar.aging_31_60,0) + COALESCE(ar.aging_61_90,0) + COALESCE(ar.aging_91_120,0) + COALESCE(ar.aging_121_150,0) + COALESCE(ar.aging_151_180,0) + COALESCE(ar.aging_181_210,0) + COALESCE(ar.aging_211_240,0) + COALESCE(ar.aging_241_270,0) + COALESCE(ar.aging_271_300,0) + COALESCE(ar.aging_301_330,0) + COALESCE(ar.aging_331_365,0) + COALESCE(ar.aging_over_365,0)) / NULLIF(COALESCE(ar.total_ar,0),0) > 0.1 ");
        sql.append(
                "         AND (COALESCE(ar.aging_31_60,0) + COALESCE(ar.aging_61_90,0) + COALESCE(ar.aging_91_120,0) + COALESCE(ar.aging_121_150,0) + COALESCE(ar.aging_151_180,0) + COALESCE(ar.aging_181_210,0) + COALESCE(ar.aging_211_240,0) + COALESCE(ar.aging_241_270,0) + COALESCE(ar.aging_271_300,0) + COALESCE(ar.aging_301_330,0) + COALESCE(ar.aging_331_365,0) + COALESCE(ar.aging_over_365,0)) / NULLIF(COALESCE(ar.total_ar,0),0) <= 0.3 THEN 1 ");
        sql.append("        ELSE 0 END) AS medium_risk_count, ");
        sql.append("  SUM(CASE ");
        sql.append(
                "        WHEN COALESCE(ar.total_ar,0) > 0 ");
        sql.append(
                "         AND (COALESCE(ar.aging_31_60,0) + COALESCE(ar.aging_61_90,0) + COALESCE(ar.aging_91_120,0) + COALESCE(ar.aging_121_150,0) + COALESCE(ar.aging_151_180,0) + COALESCE(ar.aging_181_210,0) + COALESCE(ar.aging_211_240,0) + COALESCE(ar.aging_241_270,0) + COALESCE(ar.aging_271_300,0) + COALESCE(ar.aging_301_330,0) + COALESCE(ar.aging_331_365,0) + COALESCE(ar.aging_over_365,0)) / NULLIF(COALESCE(ar.total_ar,0),0) <= 0.1 THEN 1 ");
        sql.append("        ELSE 0 END) AS low_risk_count ");
        sql.append("FROM public.credit_meeting m ");
        sql.append("LEFT JOIN public.credit_ar_aging ar ON m.id = ar.meeting_id ");
        sql.append("WHERE 1=1 ");

        if (status != null && !status.isEmpty() && !"all".equals(status)) {
            sql.append("AND m.meeting_status = ? ");
            params.add(status.toUpperCase());
        }

        if (fromDate != null) {
            sql.append("AND m.meeting_date >= ? ");
            params.add(fromDate);
        }

        if (toDate != null) {
            sql.append("AND m.meeting_date <= ? ");
            params.add(toDate);
        }

        if (keyword != null && !keyword.isEmpty()) {
            sql.append("AND (m.meeting_name ILIKE ? OR m.meeting_code ILIKE ?) ");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
        }

        sql.append("GROUP BY m.id, m.meeting_code, m.meeting_name, m.meeting_date, ");
        sql.append("m.meeting_status, m.remark, m.created_at ");
        sql.append("ORDER BY m.meeting_date DESC ");
        sql.append("LIMIT 100");

        try {
            return pgJdbc.queryForList(sql.toString(), params.toArray());
        } catch (Exception e) {
            log.error("Error querying credit meetings", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get credit meeting detail with customers
     */
    public Map<String, Object> getCreditMeetingDetail(Long meetingId) {
        Map<String, Object> result = new HashMap<>();

        try {
            // Get meeting info
            String meetingSql = "SELECT * FROM public.credit_meeting WHERE id = ?";
            List<Map<String, Object>> meetings = pgJdbc.queryForList(meetingSql, meetingId);

            if (!meetings.isEmpty()) {
                result.put("meeting", meetings.get(0));
            }

            // 연체 의견은 credit_sales_opinion에서 별도 조회 (getMeetingOpinions 사용)
            // customers 데이터는 더 이상 credit_meeting_customer에서 조회하지 않음

            // Get related activities (채권회의 활동)
            String activitiesSql = """
                    SELECT sa.id,
                           sa.subject,
                           sa.description,
                           sa.activity_type,
                           sa.activity_status,
                           sa.channel,
                           sa.planned_start_at,
                           sa.actual_start_at,
                           sa.sf_owner_id,
                           sa.created_at,
                           e.emp_name AS owner_name
                    FROM public.sales_activity sa
                    LEFT JOIN public.employee e ON (e.assignee_id = sa.sf_owner_id OR e.emp_id = sa.sf_owner_id)
                    WHERE sa.source_system = 'ar_meeting'
                      AND sa.sf_event_id = CAST(? AS TEXT)
                    ORDER BY COALESCE(sa.planned_start_at, sa.created_at) DESC, sa.created_at DESC
                    """;
            List<Map<String, Object>> activities = pgJdbc.queryForList(activitiesSql, meetingId.toString());
            result.put("activities", activities);

            // Get 매출통제해제 품의 진행현황
            String unlockSql = """
                    SELECT
                        r.id, r.meeting_id, r.company_type, r.customer_seq, r.customer_name,
                        r.request_status, r.request_date, r.target_unblock_date,
                        r.reason_text, r.collection_plan, r.created_at
                    FROM public.credit_unblock_request r
                    WHERE r.meeting_id = ?
                    ORDER BY r.created_at DESC
                    """;
            List<Map<String, Object>> unlocks = pgJdbc.queryForList(unlockSql, meetingId);
            result.put("unblockRequests", unlocks);

            // Get meeting remarks
            List<Map<String, Object>> remarks = getMeetingRemarks(meetingId);
            result.put("remarks", remarks);

        } catch (Exception e) {
            log.error("Error getting credit meeting detail for meeting_id: " + meetingId, e);
        }

        return result;
    }

    /**
     * Get sales opinions for a customer
     */
    public List<Map<String, Object>> getSalesOpinions(Long customerSeq, Long meetingCustomerId) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT * FROM public.credit_sales_opinion ");
        sql.append("WHERE customer_seq = ? ");

        List<Object> params = new ArrayList<>();
        params.add(customerSeq);

        if (meetingCustomerId != null) {
            sql.append("AND meeting_customer_id = ? ");
            params.add(meetingCustomerId);
        }

        sql.append("ORDER BY created_at DESC ");
        sql.append("LIMIT 50");

        try {
            return pgJdbc.queryForList(sql.toString(), params.toArray());
        } catch (Exception e) {
            log.error("Error getting sales opinions for customer_seq: " + customerSeq, e);
            return new ArrayList<>();
        }
    }

    /**
     * Get customer meeting opinions from credit_sales_opinion
     * (연체 의견: 각 회의에서 해당 고객에 대한 의견)
     */
    public List<Map<String, Object>> getCustomerMeetingOpinions(Long customerSeq) {
        String sql = """
                    SELECT
                        so.id,
                        so.meeting_id,
                        m.meeting_code,
                        m.meeting_name,
                        m.meeting_date,
                        so.opinion_text as decision_comment,
                        so.opinion_type,
                        so.promise_date,
                        so.promise_amount,
                        so.risk_level,
                        so.company_type,
                        so.created_at,
                        so.created_by
                    FROM public.credit_sales_opinion so
                    JOIN public.credit_meeting m ON so.meeting_id = m.id
                    WHERE so.customer_seq = ?
                    ORDER BY m.meeting_date DESC, so.created_at DESC
                    LIMIT 20
                """;

        try {
            return pgJdbc.queryForList(sql, customerSeq);
        } catch (Exception e) {
            log.error("Error getting customer meeting opinions for customer_seq: " + customerSeq, e);
            return new ArrayList<>();
        }
    }

    /**
     * Get sales opinions for a meeting
     * (회의별 연체 의견 조회)
     */
    public List<Map<String, Object>> getMeetingSalesOpinions(Long meetingId) {
        String sql = """
                    SELECT
                        so.id,
                        so.meeting_id,
                        so.customer_seq,
                        COALESCE(ar.customer_name, '고객정보없음') as customer_name,
                        so.assignee_id,
                        COALESCE(e.emp_name, so.assignee_id) as emp_name,
                        so.opinion_type,
                        so.opinion_text,
                        so.promise_date,
                        so.promise_amount,
                        so.risk_level,
                        so.company_type,
                        so.created_at,
                        so.created_by
                    FROM public.credit_sales_opinion so
                    LEFT JOIN (
                        SELECT DISTINCT ON (customer_seq) customer_seq, customer_name
                        FROM public.credit_ar_aging
                        ORDER BY customer_seq, snapshot_date DESC
                    ) ar ON so.customer_seq = ar.customer_seq
                    LEFT JOIN public.employee e ON so.assignee_id = e.assignee_id
                    WHERE so.meeting_id = ?
                    ORDER BY so.created_at DESC
                """;

        try {
            return pgJdbc.queryForList(sql, meetingId);
        } catch (Exception e) {
            log.error("Error getting sales opinions for meeting_id: " + meetingId, e);
            return new ArrayList<>();
        }
    }

    /**
     * Get sales activities for a meeting
     * (회의별 채권활동 조회)
     */
    public List<Map<String, Object>> getMeetingSalesActivities(Long meetingId) {
        String sql = """
                    SELECT
                        sa.id,
                        sa.sf_owner_id,
                        COALESCE(e.emp_name, sa.sf_owner_id) as emp_name,
                        sa.sf_account_id,
                        COALESCE(c.customer_name, '고객정보없음') as customer_name,
                        sa.subject,
                        sa.description,
                        sa.activity_type,
                        sa.activity_status,
                        sa.channel,
                        COALESCE(sa.planned_start_at, sa.created_at) as activity_date,
                        sa.created_at
                    FROM public.sales_activity sa
                    LEFT JOIN public.employee e ON (e.assignee_id = sa.sf_owner_id OR e.emp_id = sa.sf_owner_id)
                    LEFT JOIN public.customer c ON sa.sf_account_id = c.customer_id
                    WHERE sa.source_system = 'ar_meeting'
                      AND sa.sf_event_id = CAST(? AS TEXT)
                    ORDER BY COALESCE(sa.planned_start_at, sa.created_at) DESC
                """;

        try {
            return pgJdbc.queryForList(sql, meetingId.toString());
        } catch (Exception e) {
            log.error("Error getting sales activities for meeting_id: " + meetingId, e);
            return new ArrayList<>();
        }
    }

    /**
     * Get unblock requests for a customer
     */
    public List<Map<String, Object>> getUnblockRequests(Long customerSeq, String status) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder();

        sql.append("SELECT * FROM public.credit_unblock_request ");
        sql.append("WHERE customer_seq = ? ");
        params.add(customerSeq);

        if (status != null && !status.isEmpty() && !"all".equals(status)) {
            sql.append("AND request_status = ? ");
            params.add(status.toUpperCase());
        }

        sql.append("ORDER BY request_date DESC ");
        sql.append("LIMIT 50");

        try {
            return pgJdbc.queryForList(sql.toString(), params.toArray());
        } catch (Exception e) {
            log.error("Error getting unblock requests for customer_seq: " + customerSeq, e);
            return new ArrayList<>();
        }
    }

    /**
     * Create a new credit meeting
     * meeting_code는 같은 날짜에 여러 회의가 있을 수 있으므로 시퀀스 번호를 자동 부여
     */
    public Map<String, Object> createCreditMeeting(String meetingCode, String meetingName,
            LocalDate meetingDate, String remark) {
        Map<String, Object> result = new HashMap<>();

        try {
            // 같은 날짜에 존재하는 회의 수를 조회하여 고유한 meeting_code 생성
            String uniqueMeetingCode = generateUniqueMeetingCode(meetingDate);

            String sql = "INSERT INTO public.credit_meeting " +
                    "(meeting_code, meeting_name, meeting_date, meeting_status, remark, created_at, updated_at) " +
                    "VALUES (?, ?, ?, 'PLANNED', ?, NOW(), NOW()) " +
                    "RETURNING id";

            Long id = pgJdbc.queryForObject(sql, Long.class, uniqueMeetingCode, meetingName, meetingDate, remark);

            result.put("success", true);
            result.put("id", id);
            result.put("meetingCode", uniqueMeetingCode);
            result.put("message", "Credit meeting created successfully");
        } catch (Exception e) {
            log.error("Error creating credit meeting", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 고유한 meeting_code 생성
     * 형식: MTG-YYYYMMDD-NN (예: MTG-20251208-01, MTG-20251208-02)
     */
    private String generateUniqueMeetingCode(LocalDate meetingDate) {
        String dateStr = meetingDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String baseCode = "MTG-" + dateStr;

        // 같은 날짜로 시작하는 meeting_code 중 가장 큰 시퀀스 번호 조회
        String countSql = "SELECT COUNT(*) FROM public.credit_meeting WHERE meeting_code LIKE ?";
        Integer count = pgJdbc.queryForObject(countSql, Integer.class, baseCode + "%");

        int seq = (count == null ? 0 : count) + 1;
        return String.format("%s-%02d", baseCode, seq);
    }

    /**
     * Create sales opinion
     */
    public Map<String, Object> createSalesOpinion(
            Long customerSeq, String assigneeId, String opinionType,
            String opinionText, LocalDate promiseDate, BigDecimal promiseAmount,
            String riskLevel, Long meetingCustomerId) {

        Map<String, Object> result = new HashMap<>();

        try {
            String sql = "INSERT INTO public.credit_sales_opinion " +
                    "(customer_seq, assignee_id, opinion_type, opinion_text, " +
                    "promise_date, promise_amount, risk_level, meeting_customer_id, " +
                    "created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) " +
                    "RETURNING id";

            Long id = pgJdbc.queryForObject(sql, Long.class,
                    customerSeq, assigneeId, opinionType, opinionText,
                    promiseDate, promiseAmount, riskLevel, meetingCustomerId);

            result.put("success", true);
            result.put("id", id);
            result.put("message", "Sales opinion created successfully");
        } catch (Exception e) {
            log.error("Error creating sales opinion", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Add customer to credit meeting with decision details
     * - credit_sales_opinion 테이블에만 INSERT (연체 의견 등록)
     */
    public Map<String, Object> addCustomerToMeeting(Long meetingId, Long customerSeq,
            String customerName, String assigneeId, String empName,
            String decisionComment, Boolean reviewFlag, String createdBy) {
        Map<String, Object> result = new HashMap<>();

        try {
            // decisionComment가 없으면 등록 불가
            if (decisionComment == null || decisionComment.trim().isEmpty()) {
                result.put("success", false);
                result.put("error", "연체 의견을 입력해주세요.");
                return result;
            }

            // credit_sales_opinion 테이블에 INSERT
            String insertOpinionSql = "INSERT INTO public.credit_sales_opinion " +
                    "(meeting_id, customer_seq, assignee_id, opinion_type, opinion_text, " +
                    "promise_date, promise_amount, risk_level, company_type, " +
                    "created_by, updated_by, created_at, updated_at) " +
                    "VALUES (?, ?, ?, 'OVERDUE_OPINION', ?, " +
                    "CURRENT_DATE + INTERVAL '7 days', NULL, 'high', 'TNT', " +
                    "?, ?, NOW(), NOW()) " +
                    "RETURNING id";

            Long id = pgJdbc.queryForObject(insertOpinionSql, Long.class,
                    meetingId, customerSeq, assigneeId, decisionComment,
                    createdBy, createdBy);

            result.put("success", true);
            result.put("id", id);
            result.put("message", "연체 의견이 등록되었습니다.");
        } catch (Exception e) {
            log.error("Error adding sales opinion", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Remove sales opinion from credit meeting (연체 의견 삭제)
     * credit_sales_opinion 테이블에서 삭제
     */
    public Map<String, Object> removeCustomerFromMeeting(Long salesOpinionId) {
        Map<String, Object> result = new HashMap<>();

        try {
            String sql = "DELETE FROM public.credit_sales_opinion WHERE id = ?";
            int deleted = pgJdbc.update(sql, salesOpinionId);

            if (deleted > 0) {
                result.put("success", true);
                result.put("message", "Sales opinion removed successfully");
            } else {
                result.put("success", false);
                result.put("error", "Sales opinion not found");
            }
        } catch (Exception e) {
            log.error("Error removing sales opinion from meeting", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Update sales opinion (연체 의견 수정)
     * - credit_sales_opinion 테이블에서 UPDATE
     * 
     * @param id              credit_sales_opinion.id
     * @param decisionComment 수정할 의견 내용
     * @param updatedBy       수정자
     */
    @Transactional
    public Map<String, Object> updateMeetingCustomer(Long id, String decisionComment, String updatedBy) {
        Map<String, Object> result = new HashMap<>();

        try {
            // credit_sales_opinion 테이블에서 UPDATE
            String updateSql = "UPDATE public.credit_sales_opinion " +
                    "SET opinion_text = ?, updated_by = ?, updated_at = NOW() " +
                    "WHERE id = ?";

            int updated = pgJdbc.update(updateSql, decisionComment, updatedBy, id);

            if (updated > 0) {
                result.put("success", true);
                result.put("opinionId", id);
                result.put("message", "Sales opinion updated successfully");
            } else {
                result.put("success", false);
                result.put("error", "Sales opinion not found");
            }
        } catch (Exception e) {
            log.error("Error updating sales opinion", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Delete sales opinion (연체 의견 삭제)
     * credit_sales_opinion 테이블에서 삭제
     */
    @Transactional
    public boolean deleteMeetingCustomer(Long id) {
        try {
            String sql = "DELETE FROM public.credit_sales_opinion WHERE id = ?";
            int deleted = pgJdbc.update(sql, id);
            if (deleted > 0) {
                log.info("Deleted sales opinion id: {}", id);
                return true;
            }
            return false;
        } catch (Exception e) {
            log.error("Error deleting sales opinion", e);
            return false;
        }
    }

    /**
     * Get AR Aging summary for a specific meeting
     */
    public Map<String, Object> getArAgingSummary(Long meetingId) {
        Map<String, Object> result = new HashMap<>();

        try {
            // If no meeting_id provided, use latest
            if (meetingId == null) {
                String meetingSql = "SELECT MAX(meeting_id) FROM public.credit_ar_aging";
                meetingId = pgJdbc.queryForObject(meetingSql, Long.class);
            }

            if (meetingId == null) {
                return result; // No data available
            }

            // Check if data exists for this meeting
            String checkSql = "SELECT COUNT(*) FROM public.credit_ar_aging WHERE meeting_id = ?";
            Integer count = pgJdbc.queryForObject(checkSql, Integer.class, meetingId);

            if (count == null || count == 0) {
                return result; // No data for this meeting
            }

            // Get snapshot_date for this meeting
            String dateSql = "SELECT snapshot_date FROM public.credit_ar_aging WHERE meeting_id = ? LIMIT 1";
            LocalDate snapshotDate = pgJdbc.queryForObject(dateSql, LocalDate.class, meetingId);

            Map<String, Object> summary = new HashMap<>();
            summary.put("snapshotDate", snapshotDate != null ? snapshotDate.toString() : "");
            summary.put("meetingId", meetingId);

            // Get total customers count
            String countSql = "SELECT COUNT(DISTINCT customer_seq) FROM public.credit_ar_aging WHERE meeting_id = ?";
            Integer totalCustomers = pgJdbc.queryForObject(countSql, Integer.class, meetingId);
            summary.put("totalCustomers", totalCustomers != null ? totalCustomers : 0);

            // Get total AR amount
            String totalArSql = "SELECT COALESCE(SUM(total_ar), 0) FROM public.credit_ar_aging WHERE meeting_id = ?";
            BigDecimal totalAr = pgJdbc.queryForObject(totalArSql, BigDecimal.class, meetingId);
            summary.put("totalAr", totalAr != null ? totalAr : BigDecimal.ZERO);

            // Get overdue amounts by aging buckets
            String overdue30Sql = "SELECT COALESCE(SUM(aging_31_60), 0) FROM public.credit_ar_aging WHERE meeting_id = ?";
            BigDecimal overdue30 = pgJdbc.queryForObject(overdue30Sql, BigDecimal.class, meetingId);
            summary.put("overdue30", overdue30 != null ? overdue30 : BigDecimal.ZERO);

            String overdue60Sql = "SELECT COALESCE(SUM(aging_61_90), 0) FROM public.credit_ar_aging WHERE meeting_id = ?";
            BigDecimal overdue60 = pgJdbc.queryForObject(overdue60Sql, BigDecimal.class, meetingId);
            summary.put("overdue60", overdue60 != null ? overdue60 : BigDecimal.ZERO);

            String overdue90Sql = "SELECT COALESCE(SUM(aging_91_120), 0) FROM public.credit_ar_aging WHERE meeting_id = ?";
            BigDecimal overdue90 = pgJdbc.queryForObject(overdue90Sql, BigDecimal.class, meetingId);
            summary.put("overdue90", overdue90 != null ? overdue90 : BigDecimal.ZERO);

            // Over 90 days (sum of all buckets over 90)
            String overdueOver90Sql = "SELECT COALESCE(SUM(aging_91_120 + aging_121_150 + aging_151_180 + " +
                    "aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + " +
                    "aging_301_330 + aging_331_365 + aging_over_365), 0) " +
                    "FROM public.credit_ar_aging WHERE meeting_id = ?";
            BigDecimal overdueOver90 = pgJdbc.queryForObject(overdueOver90Sql, BigDecimal.class, meetingId);
            summary.put("overdueOver90", overdueOver90 != null ? overdueOver90 : BigDecimal.ZERO);

            // Get by channel summary
            String channelSql = "SELECT channel_name, COUNT(*) as count, COALESCE(SUM(total_ar), 0) as amount " +
                    "FROM public.credit_ar_aging WHERE meeting_id = ? " +
                    "GROUP BY channel_name ORDER BY amount DESC";
            List<Map<String, Object>> byChannel = pgJdbc.queryForList(channelSql, meetingId);

            List<Map<String, Object>> channelSummary = new ArrayList<>();
            for (Map<String, Object> ch : byChannel) {
                Map<String, Object> channelItem = new HashMap<>();
                channelItem.put("channelName", ch.get("channel_name") != null ? ch.get("channel_name") : "기타");
                channelItem.put("count", ((Number) ch.get("count")).intValue());
                channelItem.put("amount", ch.get("amount"));
                channelSummary.add(channelItem);
            }
            summary.put("byChannel", channelSummary);

            result.put("success", true);
            result.put("summary", summary);

        } catch (Exception e) {
            log.error("Error getting AR aging summary for meetingId: " + meetingId, e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Auto-add high-risk customers to meeting
     */
    public Map<String, Object> autoAddHighRiskCustomers(Long meetingId, String riskLevel) {
        Map<String, Object> result = new HashMap<>();
        List<Long> addedCustomers = new ArrayList<>();

        try {
            // Get latest snapshot date
            String dateSql = "SELECT MAX(snapshot_date) FROM public.credit_ar_aging";
            LocalDate latestDate = pgJdbc.queryForObject(dateSql, LocalDate.class);

            // Get all AR aging data for latest snapshot
            String arSql = "SELECT * FROM public.credit_ar_aging WHERE snapshot_date = ?";
            List<Map<String, Object>> arData = pgJdbc.queryForList(arSql, latestDate);

            // Calculate risk level for each and filter
            for (Map<String, Object> ar : arData) {
                BigDecimal totalAr = (BigDecimal) ar.get("total_ar");
                if (totalAr == null || totalAr.compareTo(BigDecimal.ZERO) == 0) {
                    continue;
                }

                // Calculate overdue
                BigDecimal overdue = BigDecimal.ZERO;
                String[] agingFields = { "aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                        "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                        "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365" };

                for (String field : agingFields) {
                    BigDecimal value = (BigDecimal) ar.get(field);
                    if (value != null) {
                        overdue = overdue.add(value);
                    }
                }

                // Calculate risk level
                BigDecimal overdueRatio = overdue.divide(totalAr, 4, RoundingMode.HALF_UP);
                String calculatedRisk = "low";

                if (overdueRatio.compareTo(new BigDecimal("0.3")) > 0) {
                    calculatedRisk = "high";
                } else if (overdueRatio.compareTo(new BigDecimal("0.1")) > 0) {
                    calculatedRisk = "medium";
                }

                // If matches requested risk level, add to list
                // Note: credit_meeting_customer 테이블은 더 이상 사용하지 않음
                // 연체 의견은 credit_sales_opinion 테이블에서 별도 관리
                if (riskLevel.equals(calculatedRisk)) {
                    Long customerSeq = ((Number) ar.get("customer_seq")).longValue();
                    addedCustomers.add(customerSeq);
                }
            }

            result.put("success", true);
            result.put("matchedCount", addedCustomers.size());
            result.put("matchedCustomers", addedCustomers);
            result.put("message", addedCustomers.size() + " customers match the risk level criteria");
        } catch (Exception e) {
            log.error("Error auto-adding high-risk customers", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Generate AR aging data from ERP for a specific meeting date
     * 
     * @param meetingId   The meeting ID
     * @param meetingDate The meeting date (used as snapshot_date and for StdYM)
     */
    public Map<String, Object> generateArAgingData(Long meetingId, LocalDate meetingDate) {
        Map<String, Object> result = new HashMap<>();
        int tntCount = 0;
        int dysCount = 0;

        try {
            // Format StdYM as yyyyMM
            String stdYM = meetingDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
            log.info("Generating AR Aging data for meetingId: {}, meetingDate: {}, StdYM: {}", meetingId, meetingDate,
                    stdYM);

            // Fetch and insert TNT data
            tntCount = fetchAndInsertErpData(TNT_ERP_URL, "TNT", stdYM, meetingDate, meetingId);
            log.info("TNT data inserted: {} records", tntCount);

            // Fetch and insert DYS data
            dysCount = fetchAndInsertErpData(DYS_ERP_URL, "DYS", stdYM, meetingDate, meetingId);
            log.info("DYS data inserted: {} records", dysCount);

            // Update meeting status to 'DATA_GENERATED'
            String updateMeetingSql = "UPDATE public.credit_meeting SET meeting_status = 'DATA_GENERATED', updated_at = NOW() WHERE id = ?";
            pgJdbc.update(updateMeetingSql, meetingId);

            result.put("success", true);
            result.put("tntCount", tntCount);
            result.put("dysCount", dysCount);
            result.put("totalCount", tntCount + dysCount);
            result.put("message", "AR Aging data generated successfully");

        } catch (Exception e) {
            log.error("Error generating AR aging data", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("tntCount", tntCount);
            result.put("dysCount", dysCount);
        }

        return result;
    }

    /**
     * Fetch data from ERP API and insert into credit_ar_aging table
     * Uses the same API pattern as OrdersController (Angkor.Ylw.Common.HttpExecute)
     * Handles pagination to fetch all pages
     */
    private int fetchAndInsertErpData(String erpUrl, String companyType, String stdYM, LocalDate snapshotDate,
            Long meetingId) {
        int insertedCount = 0;
        int pageNo = 1;
        int totalPages = 1;
        final int PAGE_SIZE = 10000;

        try {
            // Get credentials based on company type
            String certId = "TNT".equals(companyType) ? TNT_CERT_ID : DYS_CERT_ID;
            String certKey = "TNT".equals(companyType) ? TNT_CERT_KEY : DYS_CERT_KEY;
            String dsn = "TNT".equals(companyType) ? TNT_DSN : DYS_DSN;
            String dsnOper = "TNT".equals(companyType) ? TNT_DSN_OPER : DYS_DSN_OPER;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(java.util.Collections.singletonList(MediaType.APPLICATION_JSON));

            do {
                // Build request body for each page
                Map<String, Object> payload = new java.util.LinkedHashMap<>();
                Map<String, Object> root = new java.util.LinkedHashMap<>();
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

                // Build data block
                Map<String, Object> data = new java.util.LinkedHashMap<>();
                root.put("data", data);

                Map<String, Object> dataRoot = new java.util.LinkedHashMap<>();
                data.put("ROOT", dataRoot);

                List<Map<String, Object>> dataBlock1 = new ArrayList<>();
                dataRoot.put("DataBlock1", dataBlock1);

                Map<String, Object> row = new java.util.LinkedHashMap<>();
                row.put("StdYM", stdYM);
                row.put("BizUnit", "");
                row.put("CustSeq", "");
                row.put("EmpSeq", "");
                row.put("SMQryType", "");
                row.put("IncludeMiNote", "");
                row.put("PAGE_NO", String.valueOf(pageNo));
                row.put("PAGE_SIZE", String.valueOf(PAGE_SIZE));
                dataBlock1.add(row);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

                log.info("Calling ERP API: {} with StdYM: {} for company: {} (page {}/{})",
                        erpUrl, stdYM, companyType, pageNo, totalPages);
                ResponseEntity<String> response = restTemplate.exchange(erpUrl, HttpMethod.POST, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode rootNode = objectMapper.readTree(response.getBody());
                    JsonNode dataBlock1Node = rootNode.path("DataBlock1");

                    if (dataBlock1Node.isArray()) {
                        for (JsonNode item : dataBlock1Node) {
                            insertArAgingRecord(item, companyType, snapshotDate, meetingId);
                            insertedCount++;
                        }
                        log.info("Page {} fetched {} records from ERP for {}", pageNo, dataBlock1Node.size(),
                                companyType);
                    }

                    // Get pagination info
                    JsonNode dataBlock11 = rootNode.path("DataBlock11");
                    if (dataBlock11.isArray() && dataBlock11.size() > 0) {
                        JsonNode pageInfo = dataBlock11.get(0);
                        totalPages = pageInfo.path("TotalPage").asInt(1);
                        int totalData = pageInfo.path("TotalData").asInt(0);
                        log.info("ERP Pagination - TotalData: {}, TotalPage: {}, CurrentPage: {}",
                                totalData, totalPages, pageNo);
                    }
                } else {
                    log.warn("ERP API returned non-success status: {}", response.getStatusCode());
                    break;
                }

                pageNo++;
            } while (pageNo <= totalPages);

            log.info("Total {} records fetched from ERP for {}", insertedCount, companyType);

        } catch (Exception e) {
            log.error("Error fetching data from ERP API: " + erpUrl, e);
            throw new RuntimeException("Failed to fetch ERP data: " + e.getMessage(), e);
        }

        return insertedCount;
    }

    /**
     * Insert a single AR aging record with assignee_id resolved via employee table
     */
    private void insertArAgingRecord(JsonNode item, String companyType, LocalDate snapshotDate, Long meetingId) {
        // Extract values from JSON
        Long customerSeq = item.path("CustSeq").asLong();
        String customerNo = item.path("CustNo").asText(null);
        String customerName = item.path("CustName").asText(null);
        String channelName = item.path("ChannelName").asText(null);
        String bizNo = item.path("BizNo").asText(null);
        String deptName = item.path("DeptName").asText(null);
        Long deptSeq = item.path("DeptSeq").isNull() ? null : item.path("DeptSeq").asLong(0);
        Long empSeq = item.path("EmpSeq").asLong(0);
        String empName = item.path("EmpName").asText(null);
        String currencyName = item.path("CurrName").asText(null);

        // Amount fields
        BigDecimal totalAr = getBigDecimal(item, "Total");
        BigDecimal aging0_30 = getBigDecimal(item, "Before30");
        BigDecimal aging31_60 = getBigDecimal(item, "Term60");
        BigDecimal aging61_90 = getBigDecimal(item, "Term90");
        BigDecimal aging91_120 = getBigDecimal(item, "Term120");
        BigDecimal aging121_150 = getBigDecimal(item, "Term150");
        BigDecimal aging151_180 = getBigDecimal(item, "Term180");
        BigDecimal aging181_210 = getBigDecimal(item, "Term210");
        BigDecimal aging211_240 = getBigDecimal(item, "Term240");
        BigDecimal aging241_270 = getBigDecimal(item, "Term270");
        BigDecimal aging271_300 = getBigDecimal(item, "Term300");
        BigDecimal aging301_330 = getBigDecimal(item, "Term330");
        BigDecimal aging331_365 = getBigDecimal(item, "Term365");
        BigDecimal agingOver365 = getBigDecimal(item, "Over365");

        // Build emp_seq column name based on company type
        String empSeqColumn = "TNT".equals(companyType) ? "tnt_emp_seq" : "dys_emp_seq";

        // Insert with assignee_id resolved via subquery from employee table
        String sql = "INSERT INTO public.credit_ar_aging " +
                "(meeting_id, company_type, customer_seq, customer_no, customer_name, channel_name, biz_no, " +
                "dept_name, dept_seq, assignee_id, emp_name, currency_name, " +
                "total_ar, aging_0_30, aging_31_60, aging_61_90, aging_91_120, " +
                "aging_121_150, aging_151_180, aging_181_210, aging_211_240, aging_241_270, " +
                "aging_271_300, aging_301_330, aging_331_365, aging_over_365, " +
                "snapshot_date, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, " +
                "(SELECT assignee_id FROM public.employee WHERE " + empSeqColumn + " = ? LIMIT 1), " +
                "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, NOW(), NOW())";

        pgJdbc.update(sql,
                meetingId, companyType, customerSeq, customerNo, customerName, channelName, bizNo,
                deptName, deptSeq, empSeq, // empSeq for subquery
                empName, currencyName,
                totalAr, aging0_30, aging31_60, aging61_90, aging91_120,
                aging121_150, aging151_180, aging181_210, aging211_240, aging241_270,
                aging271_300, aging301_330, aging331_365, agingOver365);
    }

    /**
     * Helper method to extract BigDecimal from JsonNode
     */
    private BigDecimal getBigDecimal(JsonNode node, String fieldName) {
        JsonNode field = node.path(fieldName);
        if (field.isMissingNode() || field.isNull()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(field.asText("0"));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    /**
     * Check if AR aging data exists for a specific snapshot date
     */
    public boolean hasArAgingData(LocalDate snapshotDate) {
        String sql = "SELECT COUNT(*) FROM public.credit_ar_aging WHERE snapshot_date = ?";
        Integer count = pgJdbc.queryForObject(sql, Integer.class, snapshotDate);
        return count != null && count > 0;
    }

    /**
     * Delete AR aging data for a specific snapshot date
     */
    public int deleteArAgingData(LocalDate snapshotDate) {
        String sql = "DELETE FROM public.credit_ar_aging WHERE snapshot_date = ?";
        int deleted = pgJdbc.update(sql, snapshotDate);
        log.info("Deleted {} AR aging records for snapshot_date: {}", deleted, snapshotDate);
        return deleted;
    }

    /**
     * Check if AR aging data exists for a specific meeting
     */
    public boolean hasArAgingDataByMeetingId(Long meetingId) {
        String sql = "SELECT COUNT(*) FROM public.credit_ar_aging WHERE meeting_id = ?";
        Integer count = pgJdbc.queryForObject(sql, Integer.class, meetingId);
        return count != null && count > 0;
    }

    /**
     * Delete AR aging data for a specific meeting
     */
    public int deleteArAgingDataByMeetingId(Long meetingId) {
        String sql = "DELETE FROM public.credit_ar_aging WHERE meeting_id = ?";
        int deleted = pgJdbc.update(sql, meetingId);
        log.info("Deleted {} AR aging records for meeting_id: {}", deleted, meetingId);
        return deleted;
    }

    /**
     * Get activities for a customer by customerSeq, companyType, and externalId
     * Matches sales_activity.sf_account_id with customer.customer_id
     */
    public List<Map<String, Object>> getActivitiesByCustomer(Long customerSeq, String companyType, String externalId) {
        StringBuilder sql = new StringBuilder();
        List<Object> params = new java.util.ArrayList<>();

        sql.append("""
                SELECT sa.id, sa.subject, sa.description, sa.activity_type, sa.activity_status,
                       sa.planned_start_at, sa.created_at, sa.created_by, sa.sf_owner_id,
                       e.emp_name AS owner_name
                FROM public.sales_activity sa
                INNER JOIN public.customer c ON sa.sf_account_id = c.customer_id
                LEFT JOIN public.employee e ON (e.assignee_id = sa.sf_owner_id OR e.emp_id = sa.sf_owner_id)
                WHERE sa.external_id = ?
                  AND c.customer_seq = ?
                """);
        params.add(externalId);
        params.add(customerSeq);

        if (companyType != null && !companyType.isBlank()) {
            sql.append(" AND c.company_type = ? ");
            params.add(companyType);
        }

        sql.append(" ORDER BY sa.planned_start_at DESC, sa.created_at DESC ");

        return pgJdbc.queryForList(sql.toString(), params.toArray());
    }

    /**
     * Create a new activity for a customer (ar_meeting activity)
     */
    public Map<String, Object> createActivity(Long customerSeq, String companyType, String subject,
            String description, String activityType, String activityDate, String activityMethod,
            String assigneeId, Long meetingId, String createdBy) {
        // First, get the customer_id from customer table
        String customerIdQuery = "SELECT customer_id FROM public.customer WHERE customer_seq = ? AND company_type = ?";
        String customerId;
        try {
            customerId = pgJdbc.queryForObject(customerIdQuery, String.class, customerSeq, companyType);
        } catch (Exception e) {
            log.error("Customer not found: customerSeq={}, companyType={}", customerSeq, companyType);
            throw new RuntimeException("Customer not found");
        }

        // Convert activityDate to timestamp format
        String plannedStartAt = activityDate != null && !activityDate.isEmpty()
                ? activityDate + " 00:00:00"
                : null;

        String sql = """
                INSERT INTO public.sales_activity
                (source_system, external_id, sf_owner_id, sf_account_id, sf_event_id, subject, description,
                 activity_type, activity_status, channel, planned_start_at, actual_start_at, created_by, updated_by)
                VALUES ('ar_meeting', 'ar_meeting', ?, ?, ?, ?, ?, ?, '계획', ?,
                        COALESCE(?::timestamp, NOW()), COALESCE(?::timestamp, NOW()), ?, ?)
                RETURNING id, subject, description, activity_type, activity_status, channel, planned_start_at, actual_start_at, created_at, created_by
                """;

        return pgJdbc.queryForMap(sql, assigneeId, customerId, meetingId != null ? String.valueOf(meetingId) : null,
                subject, description, activityType, activityMethod, plannedStartAt, plannedStartAt, assigneeId,
                assigneeId);
    }

    /**
     * Delete an activity by ID
     */
    public boolean deleteActivity(Long activityId) {
        String sql = "DELETE FROM public.sales_activity WHERE id = ? AND source_system = 'ar_meeting'";
        int rowsAffected = pgJdbc.update(sql, activityId);
        return rowsAffected > 0;
    }

    /**
     * Get customer details including collections, monthly collections, recent
     * transactions, avg sales
     */
    public Map<String, Object> getCustomerDetails(Long customerSeq, String companyType, LocalDate meetingDate,
            Long meetingId) {
        Map<String, Object> result = new HashMap<>();

        // 1. 수금 현황 (최근 5건)
        List<Map<String, Object>> collections = getCollections(customerSeq, companyType);
        result.put("collections", collections);

        // 2. 월별 수금내역 (최근 6개월)
        List<Map<String, Object>> monthlyCollections = getMonthlyCollections(customerSeq, companyType);
        result.put("monthlyCollections", monthlyCollections);

        // 3. 최근거래내역 (최근 5건)
        List<Map<String, Object>> recentTransactions = getRecentTransactions(customerSeq, companyType);
        result.put("recentTransactions", recentTransactions);

        // 4. 3개월 평균매출 (미팅일자 기준 이전 3개월, invoice 테이블에서 월별 조회)
        List<Map<String, Object>> monthlySales3Month = getMonthlySales3Month(customerSeq, companyType, meetingDate);
        result.put("monthlySales3Month", monthlySales3Month);

        // 3개월 평균 계산
        BigDecimal avgSales3Month = BigDecimal.ZERO;
        if (!monthlySales3Month.isEmpty()) {
            BigDecimal total = monthlySales3Month.stream()
                    .map(m -> (BigDecimal) m.get("amount"))
                    .filter(a -> a != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            avgSales3Month = total.divide(BigDecimal.valueOf(monthlySales3Month.size()), 0,
                    java.math.RoundingMode.HALF_UP);
        }
        result.put("avgSales3Month", avgSales3Month);

        // 5. 매출통제 해제 품의 (현재 회의 + 거래처 + 회사구분 기준) - 여러 건 조회
        List<Map<String, Object>> unblockRequests = getUnblockRequestByMeeting(customerSeq, meetingId, companyType);
        result.put("unblockRequests", unblockRequests);
        // 최신 1건의 reason_text를 releaseOpinion으로 (하위 호환)
        result.put("releaseOpinion", !unblockRequests.isEmpty() ? unblockRequests.get(0).get("reason_text") : "");

        // 6. AR Aging (Monthly Summary)
        Map<String, Object> arAging = getArAgingForDetails(customerSeq, meetingId);
        result.put("arAging", arAging);

        return result;
    }

    private Map<String, Object> getArAgingForDetails(Long customerSeq, Long meetingId) {
        Map<String, Object> result = new HashMap<>();
        try {
            String arSql;
            List<Map<String, Object>> arList = new ArrayList<>();

            if (meetingId != null) {
                arSql = "SELECT * FROM public.credit_ar_aging WHERE customer_seq = ? AND meeting_id = ?";
                arList = pgJdbc.queryForList(arSql, customerSeq, meetingId);
            }

            // Fallback to latest if not found using meetingId
            if (arList.isEmpty()) {
                arSql = "SELECT * FROM public.credit_ar_aging WHERE customer_seq = ? ORDER BY snapshot_date DESC LIMIT 1";
                arList = pgJdbc.queryForList(arSql, customerSeq);
            }

            if (!arList.isEmpty()) {
                result.putAll(arList.get(0));

                // Calculate overdue and risk level
                BigDecimal totalAr = (BigDecimal) result.get("total_ar");
                BigDecimal overdue = BigDecimal.ZERO;

                String[] agingFields = { "aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                        "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                        "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365" };

                for (String field : agingFields) {
                    BigDecimal value = (BigDecimal) result.get(field);
                    if (value != null) {
                        overdue = overdue.add(value);
                    }
                }
                result.put("overdue", overdue);

                // Risk Level
                String riskLevel = "low";
                if (totalAr != null && totalAr.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal overdueRatio = overdue.divide(totalAr, 4, RoundingMode.HALF_UP);
                    if (overdueRatio.compareTo(new BigDecimal("0.3")) > 0) {
                        riskLevel = "high";
                    } else if (overdueRatio.compareTo(new BigDecimal("0.1")) > 0) {
                        riskLevel = "medium";
                    }
                }
                result.put("risk_level", riskLevel);
            }
        } catch (Exception e) {
            log.warn("Error fetching AR aging for details", e);
        }
        return result;
    }

    /**
     * 수금 현황 조회 (ERP에서 최근 5건)
     * TNT: tnt.dbo._TSLReceipt, DYS: DYS.dbo._TSLReceipt
     */
    private List<Map<String, Object>> getCollections(Long customerSeq, String companyType) {
        try {
            if (mssqlJdbc == null) {
                log.warn("mssqlJdbc is null, cannot query ERP");
                return new ArrayList<>();
            }

            // company_type에 따라 스키마 결정
            String schema = "TNT".equalsIgnoreCase(companyType) ? "tnt.dbo" : "DYS.dbo";

            // 날짜별로 GROUP BY하여 최근 5건 조회
            String sql = """
                    SELECT TOP 5
                        R.ReceiptDate as collection_date,
                        SUM(RB.CurAmt) as amount,
                        COUNT(*) as count,
                        STRING_AGG(ISNULL(R.Remark, ''), ', ') as method
                    FROM %s._TSLReceipt R
                    INNER JOIN %s._TSLReceiptBill RB ON R.ReceiptSeq = RB.ReceiptSeq
                    WHERE R.CustSeq = ?
                    GROUP BY R.ReceiptDate
                    ORDER BY R.ReceiptDate DESC
                    """.formatted(schema, schema);

            return mssqlJdbc.queryForList(sql, customerSeq);
        } catch (Exception e) {
            log.warn("수금 현황 조회 실패 (ERP): {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 월별 수금내역 조회 (ERP에서 이번 달부터 최근 12개월)
     * TNT: tnt.dbo._TSLReceipt, DYS: DYS.dbo._TSLReceipt
     */
    private List<Map<String, Object>> getMonthlyCollections(Long customerSeq, String companyType) {
        try {
            if (mssqlJdbc == null) {
                log.warn("mssqlJdbc is null, cannot query ERP");
                return new ArrayList<>();
            }

            // company_type에 따라 스키마 결정
            String schema = "TNT".equalsIgnoreCase(companyType) ? "tnt.dbo" : "DYS.dbo";

            // 이번 달 1일부터 12개월 전까지 데이터를 월별로 집계
            // ReceiptDate가 nchar 타입이므로 LEFT로 yyyy-MM 추출
            String sql = """
                    SELECT
                        LEFT(CONVERT(VARCHAR(10), CAST(R.ReceiptDate AS DATE), 120), 7) as month,
                        SUM(RB.CurAmt) as amount
                    FROM %s._TSLReceipt R
                    INNER JOIN %s._TSLReceiptBill RB ON R.ReceiptSeq = RB.ReceiptSeq
                    WHERE R.CustSeq = ?
                      AND CAST(R.ReceiptDate AS DATE) >= DATEADD(MONTH, -11, DATEADD(DAY, 1-DAY(GETDATE()), CAST(GETDATE() AS DATE)))
                    GROUP BY LEFT(CONVERT(VARCHAR(10), CAST(R.ReceiptDate AS DATE), 120), 7)
                    ORDER BY month DESC
                    """
                    .formatted(schema, schema);

            return mssqlJdbc.queryForList(sql, customerSeq);
        } catch (Exception e) {
            log.warn("월별 수금내역 조회 실패 (ERP): {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 최근 90일 거래내역 조회 (invoice 테이블에서 영업관리단위, 품목별 그룹화)
     */
    private List<Map<String, Object>> getRecentTransactions(Long customerSeq, String companyType) {
        try {
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(90);

            String sql = """
                    SELECT sales_mgmt_unit,
                           item_name,
                           SUM(qty) as quantity,
                           SUM(cur_amt) as amount
                    FROM public.invoice
                    WHERE customer_seq = ?
                      AND company_type = ?
                      AND invoice_date >= ?
                      AND invoice_date <= ?
                    GROUP BY sales_mgmt_unit, item_name
                    ORDER BY SUM(cur_amt) DESC
                    """;
            return pgJdbc.queryForList(sql, customerSeq, companyType, startDate, endDate);
        } catch (Exception e) {
            log.warn("최근90일 거래내역 조회 실패: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 3개월 월별매출 조회 (invoice 테이블, 미팅일자 이전 월부터 3개월)
     */
    private List<Map<String, Object>> getMonthlySales3Month(Long customerSeq, String companyType,
            LocalDate meetingDate) {
        try {
            // 미팅일자가 없으면 현재 날짜 사용
            LocalDate baseDate = meetingDate != null ? meetingDate : LocalDate.now();
            // 미팅일자 이전 월의 마지막 일자
            LocalDate endDate = baseDate.withDayOfMonth(1).minusDays(1);
            // 3개월 전 첫날
            LocalDate startDate = endDate.minusMonths(2).withDayOfMonth(1);

            String sql = """
                    SELECT TO_CHAR(invoice_date, 'YYYY-MM') as month,
                           SUM(cur_amt) as amount
                    FROM public.invoice
                    WHERE customer_seq = ?
                      AND company_type = ?
                      AND invoice_date >= ?
                      AND invoice_date <= ?
                    GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
                    ORDER BY month ASC
                    """;
            return pgJdbc.queryForList(sql, customerSeq, companyType, startDate, endDate);
        } catch (Exception e) {
            log.warn("3개월 월별매출 조회 실패: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Get the latest active credit meeting (Planned or In Progress)
     */
    public Map<String, Object> getLatestActiveMeeting() {
        try {
            String sql = """
                        SELECT id, meeting_code, meeting_name, meeting_date, meeting_status
                        FROM public.credit_meeting
                        WHERE meeting_status IN ('PLANNED', 'DATA_GENERATED', 'ON_GOING')
                        ORDER BY meeting_date DESC
                        LIMIT 1
                    """;
            List<Map<String, Object>> list = pgJdbc.queryForList(sql);
            if (list.isEmpty()) {
                // If no active meeting, try getting the latest completed one (fallback)
                String fallbackSql = """
                            SELECT id, meeting_code, meeting_name, meeting_date, meeting_status
                            FROM public.credit_meeting
                            ORDER BY meeting_date DESC
                            LIMIT 1
                        """;
                List<Map<String, Object>> fallbackList = pgJdbc.queryForList(fallbackSql);
                return fallbackList.isEmpty() ? null : fallbackList.get(0);
            }
            return list.get(0);
        } catch (Exception e) {
            log.error("Failed to get latest active meeting", e);
            return null;
        }
    }

    /**
     * Get unblock requests for a specific meeting (for Manager Approval View)
     */
    public List<Map<String, Object>> getUnblockRequestsForMeeting(Long meetingId) {
        try {
            String sql = """
                        SELECT r.id, r.company_type, r.meeting_id, r.customer_seq, r.customer_name, r.assignee_id,
                               e_req.emp_name as requester_name,
                               r.request_date, r.request_status, r.reason_text, r.collection_plan, r.target_unblock_date,
                               r.summary_total_aging, r.summary_last3_collect, r.summary_last3m_sales_avg,
                               r.created_by, r.created_at,
                               COALESCE(ca.total_ar, 0) as total_ar,
                               -- Fetch Aging Columns for Risk Calculation
                               ca.aging_31_60, ca.aging_61_90, ca.aging_91_120, ca.aging_121_150,
                               ca.aging_151_180, ca.aging_181_210, ca.aging_211_240, ca.aging_241_270,
                               ca.aging_271_300, ca.aging_301_330, ca.aging_331_365, ca.aging_over_365,
                               -- 1st Approval Info (Meeting Level)
                               (SELECT approver_assignee_id FROM public.credit_unblock_approval WHERE meeting_id = r.meeting_id AND approver_role IN ('SALES_MANAGER', 'SALES_HEAD') ORDER BY decided_at DESC LIMIT 1) as approver_1st_id,
                               (SELECT e.emp_name FROM public.credit_unblock_approval a JOIN public.employee e ON a.approver_assignee_id = e.emp_id WHERE a.meeting_id = r.meeting_id AND a.approver_role IN ('SALES_MANAGER', 'SALES_HEAD') ORDER BY a.decided_at DESC LIMIT 1) as approver_1st_name,
                               (SELECT decided_at FROM public.credit_unblock_approval WHERE meeting_id = r.meeting_id AND approver_role IN ('SALES_MANAGER', 'SALES_HEAD') ORDER BY decided_at DESC LIMIT 1) as approved_1st_at,
                               (SELECT decision_result FROM public.credit_unblock_approval WHERE meeting_id = r.meeting_id AND approver_role IN ('SALES_MANAGER', 'SALES_HEAD') ORDER BY decided_at DESC LIMIT 1) as decision_1st,
                               -- 2nd Approval Info (Meeting Level)
                               (SELECT approver_assignee_id FROM public.credit_unblock_approval WHERE meeting_id = r.meeting_id AND approver_role IN ('CEO', 'CFO', 'CREDIT_MANAGER') ORDER BY decided_at DESC LIMIT 1) as approver_2nd_id,
                               (SELECT e.emp_name FROM public.credit_unblock_approval a JOIN public.employee e ON a.approver_assignee_id = e.emp_id WHERE a.meeting_id = r.meeting_id AND a.approver_role IN ('CEO', 'CFO', 'CREDIT_MANAGER') ORDER BY a.decided_at DESC LIMIT 1) as approver_2nd_name,
                               (SELECT decided_at FROM public.credit_unblock_approval WHERE meeting_id = r.meeting_id AND approver_role IN ('CEO', 'CFO', 'CREDIT_MANAGER') ORDER BY decided_at DESC LIMIT 1) as approved_2nd_at,
                               (SELECT decision_result FROM public.credit_unblock_approval WHERE meeting_id = r.meeting_id AND approver_role IN ('CEO', 'CFO', 'CREDIT_MANAGER') ORDER BY decided_at DESC LIMIT 1) as decision_2nd
                        FROM public.credit_unblock_request r
                        LEFT JOIN public.credit_ar_aging ca ON r.customer_seq = ca.customer_seq
                             AND ca.meeting_id = r.meeting_id
                        LEFT JOIN public.employee e_req ON r.assignee_id = e_req.emp_id
                        WHERE r.meeting_id = ?
                        ORDER BY r.created_at DESC
                    """;
            List<Map<String, Object>> list = pgJdbc.queryForList(sql, meetingId);

            // Calculate Overdue & Risk Level
            for (Map<String, Object> item : list) {
                BigDecimal totalAr = (BigDecimal) item.get("total_ar");
                BigDecimal overdue = BigDecimal.ZERO;

                String[] overdueFields = { "aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                        "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                        "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365" };

                for (String field : overdueFields) {
                    BigDecimal value = (BigDecimal) item.get(field);
                    if (value != null) {
                        overdue = overdue.add(value);
                    }
                }
                item.put("overdue", overdue);

                String riskLevel = "low";
                if (totalAr != null && totalAr.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal overdueRatio = overdue.divide(totalAr, 4, RoundingMode.HALF_UP);
                    if (overdueRatio.compareTo(new BigDecimal("0.3")) > 0) {
                        riskLevel = "high";
                    } else if (overdueRatio.compareTo(new BigDecimal("0.1")) > 0) {
                        riskLevel = "medium";
                    }
                }
                item.put("current_risk_level", riskLevel);
            }

            return list;
        } catch (Exception e) {
            log.error("Failed to get unblock requests for meeting " + meetingId, e);
            return new ArrayList<>();
        }
    }

    /**
     * Process Unblock Request Approval
     */
    @Transactional
    public void approveUnblockRequest(Long requestId, String approverId, String comment) {
        // Deprecated: logic moved to processUnblockDecision, but keeping this as a
        // simple wrapper or just delegating
        processUnblockDecision(requestId, "APPROVE", comment, approverId);
    }

    private List<Map<String, Object>> getUnblockRequestByMeeting(Long customerSeq, Long meetingId, String companyType) {
        try {
            if (companyType == null) {
                return new ArrayList<>();
            }
            // 미팅ID 무관하게 해당 거래처의 모든 이력 조회
            String sql = """
                    SELECT id, company_type, meeting_id, customer_seq, customer_name, assignee_id,
                           request_date, request_status, reason_text, collection_plan, target_unblock_date,
                           summary_total_aging, summary_last3_collect, summary_last3m_sales_avg,
                           created_by, created_at
                    FROM public.credit_unblock_request
                    WHERE customer_seq = ? AND company_type = ?
                    ORDER BY created_at DESC
                    """;
            return pgJdbc.queryForList(sql, customerSeq, companyType);
        } catch (Exception e) {
            log.warn("매출통제 해제 품의 조회 실패 (meeting_id={}, customer_seq={}, company_type={}): {}", meetingId, customerSeq,
                    companyType, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 매출통제 해제 품의 등록
     */
    public Map<String, Object> createUnblockRequest(Map<String, Object> request) {
        Map<String, Object> result = new HashMap<>();
        try {
            String companyType = (String) request.get("companyType");
            Long customerSeq = Long.valueOf(request.get("customerSeq").toString());
            String customerName = (String) request.get("customerName");
            String assigneeId = (String) request.get("assigneeId");
            String reasonText = (String) request.get("reasonText");
            String collectionPlan = (String) request.get("collectionPlan");
            String targetUnblockDateStr = (String) request.get("targetUnblockDate");
            LocalDate targetUnblockDate = targetUnblockDateStr != null ? LocalDate.parse(targetUnblockDateStr) : null;
            Integer summaryTotalAging = request.get("summaryTotalAging") != null
                    ? Integer.valueOf(request.get("summaryTotalAging").toString())
                    : null;
            java.math.BigDecimal summaryLast3Collect = request.get("summaryLast3Collect") != null
                    ? new java.math.BigDecimal(request.get("summaryLast3Collect").toString())
                    : null;
            java.math.BigDecimal summaryLast3mSalesAvg = request.get("summaryLast3mSalesAvg") != null
                    ? new java.math.BigDecimal(request.get("summaryLast3mSalesAvg").toString())
                    : null;
            String createdBy = (String) request.get("createdBy");

            // 현재 선택된 회의 ID (없으면 자동 배정)
            Long meetingId = request.get("meetingId") != null ? Long.valueOf(request.get("meetingId").toString())
                    : null;

            if (meetingId == null) {
                Map<String, Object> latestMeeting = getLatestActiveMeeting();
                if (latestMeeting != null) {
                    meetingId = Long.valueOf(latestMeeting.get("id").toString());
                } else {
                    throw new RuntimeException("진행 중인 채권회의가 없어 해제 요청을 등록할 수 없습니다.");
                }
            }

            String sql = """
                    INSERT INTO public.credit_unblock_request
                    (company_type, meeting_id, customer_seq, customer_name, assignee_id, request_date, request_status,
                     reason_text, collection_plan, target_unblock_date,
                     summary_total_aging, summary_last3_collect, summary_last3m_sales_avg,
                     created_by, updated_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_DATE, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    RETURNING id
                    """;

            Long id = pgJdbc.queryForObject(sql, Long.class,
                    companyType, meetingId, customerSeq, customerName, assigneeId, reasonText, collectionPlan,
                    targetUnblockDate,
                    summaryTotalAging, summaryLast3Collect, summaryLast3mSalesAvg, createdBy, assigneeId);

            // Note: Approval records are now created at meeting level via batch-approval
            // API
            // No per-request approval records needed

            result.put("success", true);
            result.put("id", id);
            log.info("매출통제 해제 품의 등록 성공: id={}, customerSeq={}, meetingId={}", id, customerSeq, meetingId);
        } catch (Exception e) {
            log.error("매출통제 해제 품의 등록 실패: {}", e.getMessage());
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * 매출통제 해제 품의 삭제 (SUBMITTED 상태만 가능)
     */
    public Map<String, Object> deleteUnblockRequest(Long requestId) {
        Map<String, Object> result = new HashMap<>();
        try {
            // 먼저 상태 확인
            String checkSql = "SELECT request_status FROM public.credit_unblock_request WHERE id = ?";
            List<Map<String, Object>> existing = pgJdbc.queryForList(checkSql, requestId);

            if (existing.isEmpty()) {
                result.put("success", false);
                result.put("error", "해당 품의를 찾을 수 없습니다.");
                return result;
            }

            String status = (String) existing.get(0).get("request_status");
            if (!"SUBMITTED".equals(status)) {
                result.put("success", false);
                result.put("error", "제출 상태인 품의만 삭제할 수 있습니다. 현재 상태: " + status);
                return result;
            }

            // 삭제 실행
            String deleteSql = "DELETE FROM public.credit_unblock_request WHERE id = ?";
            int deleted = pgJdbc.update(deleteSql, requestId);

            if (deleted > 0) {
                result.put("success", true);
                log.info("매출통제 해제 품의 삭제 성공: id={}", requestId);
            } else {
                result.put("success", false);
                result.put("error", "삭제에 실패했습니다.");
            }
        } catch (Exception e) {
            log.error("매출통제 해제 품의 삭제 실패: {}", e.getMessage());
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * 매출통제 해제 품의 수정 (재상신)
     * - 기본 정보 수정
     * - 상태가 SUBMITTED로 변경됨 (재상신)
     * - 승인 이력의 상태를 PENDING으로 초기화
     */
    public Map<String, Object> updateUnblockRequest(Long requestId, Map<String, Object> requestData) {
        Map<String, Object> result = new HashMap<>();
        try {
            String reason = (String) requestData.get("reasonText");
            String plan = (String) requestData.get("collectionPlan");
            String targetDateStr = (String) requestData.get("targetUnblockDate");
            String updatedBy = (String) requestData.get("updatedBy");
            if (updatedBy == null) {
                updatedBy = (String) requestData.get("assigneeId"); // fallback
            }

            // Parse Date manually to ensure correctness
            // Assumes YYYY-MM-DD format from frontend
            java.sql.Date sqlTargetDate = null;
            try {
                if (targetDateStr != null && targetDateStr.length() >= 10) {
                    sqlTargetDate = java.sql.Date.valueOf(targetDateStr.substring(0, 10));
                }
            } catch (Exception e) {
                log.warn("Date parse error: " + targetDateStr);
            }

            String sql = """
                    UPDATE public.credit_unblock_request
                    SET reason_text = ?,
                        collection_plan = ?,
                        target_unblock_date = ?,
                        request_status = 'SUBMITTED',
                        updated_at = NOW(),
                        updated_by = ?
                    WHERE id = ?
                    """;

            int updated = pgJdbc.update(sql, reason, plan, sqlTargetDate, updatedBy, requestId);

            log.info("Update result for requestId {}: updatedRows={}", requestId, updated);

            if (updated > 0) {
                // Note: Approval is now managed at meeting level via batch-approval API
                // No per-request approval reset needed
                result.put("success", true);
            } else {
                result.put("success", false);
                result.put("error", "Request not found or not updated (id=" + requestId + ")");
            }

        } catch (Exception e) {
            log.error("Failed to update unblock request id=" + requestId, e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * 매출통제 해제 품의 조회 (고객별 최신 1건)
     */
    public Map<String, Object> getUnblockRequest(Long customerSeq) {
        try {
            String sql = """
                    SELECT id, company_type, customer_seq, customer_name, assignee_id, request_date, request_status,
                           reason_text, collection_plan, target_unblock_date,
                           summary_total_aging, summary_last3_collect, summary_last3m_sales_avg,
                           created_by, created_at
                    FROM public.credit_unblock_request
                    WHERE customer_seq = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                    """;
            List<Map<String, Object>> list = pgJdbc.queryForList(sql, customerSeq);
            if (list.isEmpty()) {
                return null;
            }
            return list.get(0);
        } catch (Exception e) {
            log.warn("매출통제 해제 품의 조회 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 매출통제 해제 품의 목록 조회 (고객별)
     */
    public List<Map<String, Object>> getUnblockRequestList(Long customerSeq) {
        try {
            String sql = """
                    SELECT id, company_type, customer_seq, customer_name, assignee_id, request_date, request_status,
                           reason_text, collection_plan, target_unblock_date,
                           summary_total_aging, summary_last3_collect, summary_last3m_sales_avg,
                           created_by, created_at
                    FROM public.credit_unblock_request
                    WHERE customer_seq = ?
                    ORDER BY created_at DESC
                    """;
            return pgJdbc.queryForList(sql, customerSeq);
        } catch (Exception e) {
            log.warn("매출통제 해제 품의 목록 조회 실패: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 대기 중인 매출통제 해제 품의 목록 조회 (승인자용)
     */
    public List<Map<String, Object>> getPendingUnblockRequests() {
        try {
            String sql = """
                    SELECT r.*,
                           aa.total_ar,
                           aa.aging_31_60, aa.aging_61_90, aa.aging_91_120,
                           aa.aging_121_150, aa.aging_151_180, aa.aging_181_210,
                           aa.aging_211_240, aa.aging_241_270, aa.aging_271_300,
                           aa.aging_301_330, aa.aging_331_365, aa.aging_over_365
                    FROM public.credit_unblock_request r
                    LEFT JOIN (
                        SELECT DISTINCT ON (customer_seq) *
                        FROM public.credit_ar_aging
                        ORDER BY customer_seq, snapshot_date DESC
                    ) aa ON r.customer_seq = aa.customer_seq
                    WHERE r.request_status = 'REQUESTED'
                    ORDER BY r.request_date ASC
                    """;

            List<Map<String, Object>> requests = pgJdbc.queryForList(sql);

            for (Map<String, Object> req : requests) {
                BigDecimal totalAr = (BigDecimal) req.get("total_ar");
                BigDecimal overdue = BigDecimal.ZERO;

                String[] agingFields = { "aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                        "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                        "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365" };

                for (String field : agingFields) {
                    BigDecimal value = (BigDecimal) req.get(field);
                    if (value != null) {
                        overdue = overdue.add(value);
                    }
                }
                req.put("overdue", overdue);

                String riskLevel = "low";
                if (totalAr != null && totalAr.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal overdueRatio = overdue.divide(totalAr, 4, RoundingMode.HALF_UP);
                    if (overdueRatio.compareTo(new BigDecimal("0.3")) > 0) {
                        riskLevel = "high";
                    } else if (overdueRatio.compareTo(new BigDecimal("0.1")) > 0) {
                        riskLevel = "medium";
                    }
                }
                req.put("current_risk_level", riskLevel);
            }
            return requests;
        } catch (Exception e) {
            log.error("Error getting pending unblock requests", e);
            return new ArrayList<>();
        }
    }

    /**
     * 매출통제 해제 품의 승인/반려 처리
     */

    @Transactional
    public Map<String, Object> processUnblockDecision(Long requestId, String decision, String comment,
            String approverId) {
        // Delegate to processBatchApproval for consistency
        Map<String, Object> request = pgJdbc.queryForMap(
                "SELECT meeting_id FROM public.credit_unblock_request WHERE id = ?", requestId);
        Long meetingId = ((Number) request.get("meeting_id")).longValue();

        List<Long> approveIds = new ArrayList<>();
        List<Long> rejectIds = new ArrayList<>();

        if ("APPROVE".equalsIgnoreCase(decision)) {
            approveIds.add(requestId);
        } else if ("REJECT".equalsIgnoreCase(decision)) {
            rejectIds.add(requestId);
        }

        // Determine level loosely based on approverId (fallback logic same as
        // processBatchApproval)
        String approverLevel = "2019052701".equals(approverId) ? "1st" : "2nd";
        // If unknown, default to 1st provided it's not the CEO ID
        if ("2015030601".equals(approverId)) {
            approverLevel = "2nd";
        }

        return processBatchApproval(meetingId, approveIds, rejectIds, approverLevel, approverId, comment);
    }

    /**
     * Get Statistics for Unblock Requests in a Meeting
     */
    public Map<String, Object> getUnblockRequestStats(Long meetingId) {
        Map<String, Object> stats = new HashMap<>();
        try {
            // 1. Total Count & Total Amount
            String summarySql = """
                    SELECT COUNT(*) as total_count,
                           SUM(COALESCE(ca.total_ar, 0)) as total_ar_amount
                    FROM public.credit_unblock_request r
                    LEFT JOIN public.credit_ar_aging ca ON r.customer_seq = ca.customer_seq
                         AND ca.meeting_id = r.meeting_id
                    WHERE r.meeting_id = ?
                    """;
            Map<String, Object> summary = pgJdbc.queryForMap(summarySql, meetingId);
            stats.put("totalCount", summary.get("total_count"));
            stats.put("totalAmount", summary.get("total_ar_amount"));

            // 2. Status Breakdown
            String statusSql = """
                    SELECT request_status, COUNT(*) as cnt
                    FROM public.credit_unblock_request
                    WHERE meeting_id = ?
                    GROUP BY request_status
                    """;
            List<Map<String, Object>> statusList = pgJdbc.queryForList(statusSql, meetingId);
            Map<String, Long> statusMap = new HashMap<>();
            for (Map<String, Object> row : statusList) {
                statusMap.put((String) row.get("request_status"), ((Number) row.get("cnt")).longValue());
            }
            stats.put("statusBreakdown", statusMap);

            // 3. Top Requesters
            String requesterSql = """
                    SELECT e.emp_name, COUNT(*) as cnt
                    FROM public.credit_unblock_request r
                    JOIN public.employee e ON r.assignee_id = e.emp_id
                    WHERE r.meeting_id = ?
                    GROUP BY e.emp_name
                    ORDER BY cnt DESC
                    LIMIT 5
                    """;
            List<Map<String, Object>> topRequesters = pgJdbc.queryForList(requesterSql, meetingId);
            stats.put("topRequesters", topRequesters);

            // 4. Approval Status (미팅당 1건의 레코드)
            String approvalSql = """
                    SELECT approver_role, decision_result
                    FROM public.credit_unblock_approval
                    WHERE meeting_id = ?
                    """;
            List<Map<String, Object>> approvalList = pgJdbc.queryForList(approvalSql, meetingId);

            // 새로운 구조: 단일 레코드의 approver_role과 decision_result로 상태 판단
            // - APPROVED_1ST + SALES_MANAGER: 1차 승인 완료
            // - APPROVED_FINAL + CEO: 최종 승인 완료
            // - SUBMITTED: 초기 상태 또는 2차 반려로 초기화됨
            // - REJECTED + SALES_MANAGER: 1차 반려
            Map<String, String> approvalStatus = new HashMap<>();
            String currentRole = null;
            String currentResult = null;
            if (!approvalList.isEmpty()) {
                Map<String, Object> approval = approvalList.get(0);
                currentRole = (String) approval.get("approver_role");
                currentResult = (String) approval.get("decision_result");
            }
            approvalStatus.put("currentRole", currentRole);
            approvalStatus.put("currentResult", currentResult);

            // 프론트엔드 호환성을 위해 기존 형식도 제공
            if (currentResult != null) {
                if ("APPROVED_1ST".equals(currentResult) && "SALES_MANAGER".equals(currentRole)) {
                    approvalStatus.put("SALES_MANAGER", "APPROVED_1ST");
                } else if ("APPROVED_FINAL".equals(currentResult) && "CEO".equals(currentRole)) {
                    approvalStatus.put("SALES_MANAGER", "APPROVED_1ST"); // 2차 승인 전에 1차 승인 완료
                    approvalStatus.put("CEO", "APPROVED_FINAL");
                } else if ("REJECTED".equals(currentResult)) {
                    approvalStatus.put(currentRole, "REJECTED");
                }
                // SUBMITTED 상태면 초기화된 것이므로 아무것도 설정 안함
            }
            stats.put("approvalStatus", approvalStatus);

            stats.put("success", true);

        } catch (Exception e) {
            log.error("Failed to get unblock stats for meeting " + meetingId, e);
            stats.put("success", false);
            stats.put("error", e.getMessage());
        }
        return stats;
    }

    // ==================== 회의 의견(Remark) 관련 메소드 ====================

    /**
     * 회의 의견 목록 조회
     */
    public List<Map<String, Object>> getMeetingRemarks(Long meetingId) {
        String sql = """
                SELECT id, meeting_id, remark_type, author_id, author_name, remark_text, created_at
                FROM public.credit_meeting_remark
                WHERE meeting_id = ?
                ORDER BY created_at DESC
                """;

        try {
            return pgJdbc.queryForList(sql, meetingId);
        } catch (Exception e) {
            log.error("Failed to get meeting remarks for meetingId: " + meetingId, e);
            return new ArrayList<>();
        }
    }

    /**
     * 회의 의견 등록
     */
    @Transactional
    public Map<String, Object> createMeetingRemark(Long meetingId, String remarkType, String authorId,
            String authorName, String remarkText) {
        Map<String, Object> result = new HashMap<>();

        String sql = """
                INSERT INTO public.credit_meeting_remark
                    (meeting_id, remark_type, author_id, author_name, remark_text, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id
                """;

        try {
            Long id = pgJdbc.queryForObject(sql, Long.class, meetingId, remarkType, authorId, authorName, remarkText,
                    authorId);
            result.put("success", true);
            result.put("id", id);
            log.info("Created meeting remark: meetingId={}, id={}", meetingId, id);
        } catch (Exception e) {
            log.error("Failed to create meeting remark for meetingId: " + meetingId, e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 회의 의견 수정
     */
    @Transactional
    public Map<String, Object> updateMeetingRemark(Long remarkId, String remarkType, String remarkText) {
        Map<String, Object> result = new HashMap<>();

        String sql = """
                UPDATE public.credit_meeting_remark
                SET remark_type = ?, remark_text = ?, updated_at = now()
                WHERE id = ?
                """;

        try {
            int updated = pgJdbc.update(sql, remarkType, remarkText, remarkId);
            if (updated > 0) {
                result.put("success", true);
                result.put("remarkId", remarkId);
                log.info("Updated meeting remark: id={}", remarkId);
            } else {
                result.put("success", false);
                result.put("error", "Remark not found");
            }
        } catch (Exception e) {
            log.error("Failed to update meeting remark: " + remarkId, e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 회의 의견 삭제
     */
    @Transactional
    public boolean deleteMeetingRemark(Long remarkId) {
        String sql = "DELETE FROM public.credit_meeting_remark WHERE id = ?";

        try {
            int deleted = pgJdbc.update(sql, remarkId);
            if (deleted > 0) {
                log.info("Deleted meeting remark: id={}", remarkId);
                return true;
            }
            return false;
        } catch (Exception e) {
            log.error("Failed to delete meeting remark: " + remarkId, e);
            return false;
        }
    }

    /**
     * 회의 상태 변경
     */
    @Transactional
    public Map<String, Object> updateMeetingStatus(Long meetingId, String status, String updatedBy) {
        Map<String, Object> result = new HashMap<>();

        // Validate status
        List<String> validStatuses = List.of("PLANNED", "DATA_GENERATED", "ON_GOING", "FINISHED", "POSTPONED");
        if (!validStatuses.contains(status)) {
            result.put("success", false);
            result.put("error", "Invalid status: " + status + ". Valid values are: " + validStatuses);
            return result;
        }

        String sql = "UPDATE public.credit_meeting SET meeting_status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?";

        try {
            int updated = pgJdbc.update(sql, status, updatedBy, meetingId);
            if (updated > 0) {
                log.info("Updated meeting status: meetingId={}, status={}, updatedBy={}", meetingId, status, updatedBy);
                result.put("success", true);
                result.put("meetingId", meetingId);
                result.put("status", status);
            } else {
                result.put("success", false);
                result.put("error", "Meeting not found: " + meetingId);
            }
        } catch (Exception e) {
            log.error("Failed to update meeting status: meetingId=" + meetingId, e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 회의 삭제 (PLANNED 상태인 경우만 가능)
     */
    @Transactional
    public Map<String, Object> deleteMeeting(Long meetingId) {
        Map<String, Object> result = new HashMap<>();

        try {
            // 먼저 회의 상태 확인
            String checkSql = "SELECT meeting_status FROM public.credit_meeting WHERE id = ?";
            List<Map<String, Object>> meetings = pgJdbc.queryForList(checkSql, meetingId);

            if (meetings.isEmpty()) {
                result.put("success", false);
                result.put("error", "회의를 찾을 수 없습니다: " + meetingId);
                return result;
            }

            String status = (String) meetings.get(0).get("meeting_status");
            if (!"PLANNED".equals(status)) {
                result.put("success", false);
                result.put("error", "PLANNED 상태의 회의만 삭제할 수 있습니다. 현재 상태: " + status);
                return result;
            }

            // 관련 데이터 삭제 (credit_ar_aging)
            String deleteAgingSql = "DELETE FROM public.credit_ar_aging WHERE meeting_id = ?";
            int deletedAging = pgJdbc.update(deleteAgingSql, meetingId);
            log.info("Deleted {} credit_ar_aging records for meeting: {}", deletedAging, meetingId);

            // 회의 삭제
            String deleteSql = "DELETE FROM public.credit_meeting WHERE id = ?";
            int deleted = pgJdbc.update(deleteSql, meetingId);

            if (deleted > 0) {
                log.info("Deleted meeting: id={}", meetingId);
                result.put("success", true);
                result.put("meetingId", meetingId);
            } else {
                result.put("success", false);
                result.put("error", "회의 삭제에 실패했습니다.");
            }
        } catch (Exception e) {
            log.error("Failed to delete meeting: " + meetingId, e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 배치 승인/반려 처리 (미팅 단위로 1건의 credit_unblock_approval 관리)
     * - 1차 승인자 승인 시: 레코드 생성 (APPROVED_1ST)
     * - 1차 승인자 반려 시: 레코드 생성/업데이트 (REJECTED)
     * - 2차 승인자 승인 시: 레코드 업데이트 (APPROVED_FINAL)
     * - 2차 승인자 반려 시: 레코드 업데이트 (SUBMITTED로 초기화)
     *
     * 프론트엔드에서 approver_role과 decision_result로 enable/disable 판단:
     * - APPROVED_1ST + SALES_MANAGER: 1차 승인 완료 → 1차 disable, 2차 enable
     * - APPROVED_FINAL + CEO: 최종 승인 완료 → 1차/2차 모두 disable
     * - SUBMITTED: 초기 상태 또는 2차 반려 → 1차 enable, 2차 disable
     */
    @Transactional
    public Map<String, Object> processBatchApproval(
            Long meetingId,
            List<Long> approveRequestIds,
            List<Long> rejectRequestIds,
            String approverLevel,
            String approverId,
            String comment) {

        Map<String, Object> result = new HashMap<>();
        int approvedCount = 0;
        int rejectedCount = 0;

        try {
            // Determine role and assignee based on approverLevel
            String role = "1st".equals(approverLevel) ? "SALES_MANAGER" : "CEO";
            String approverAssigneeId = "1st".equals(approverLevel) ? "2019052701" : "2015030601";

            // 승인/반려 여부 판단
            boolean isApprove = approveRequestIds != null && !approveRequestIds.isEmpty();
            boolean isReject = rejectRequestIds != null && !rejectRequestIds.isEmpty();
            boolean is2ndReject = "2nd".equals(approverLevel) && isReject;

            // decision_result 결정
            String decisionResult;
            if ("1st".equals(approverLevel)) {
                decisionResult = isApprove ? "APPROVED_1ST" : "REJECTED";
            } else {
                // 2차 승인자: 승인이면 APPROVED_FINAL, 반려면 REJECTED
                decisionResult = isApprove ? "APPROVED_FINAL" : "REJECTED";
            }

            // 1. credit_unblock_approval 레코드 처리 (미팅당 1건)
            String checkSql = "SELECT id FROM public.credit_unblock_approval WHERE meeting_id = ?";
            Long approvalId = null;
            try {
                approvalId = pgJdbc.queryForObject(checkSql, Long.class, meetingId);
            } catch (Exception e) {
                // 레코드 없음
            }

            if (approvalId != null) {
                // 기존 레코드 업데이트
                String updateSql = """
                        UPDATE public.credit_unblock_approval
                        SET approver_role = ?, approver_assignee_id = ?, decision_result = ?,
                            decision_comment = ?, decided_at = NOW()
                        WHERE id = ?
                        """;
                pgJdbc.update(updateSql, role, approverAssigneeId, decisionResult, comment, approvalId);
            } else {
                // 새 레코드 생성 (1차 승인자가 처음 승인할 때만)
                String insertSql = """
                        INSERT INTO public.credit_unblock_approval
                        (meeting_id, approver_role, approver_assignee_id, decision_result, decision_comment, decided_at, created_by, created_at)
                        VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW())
                        """;
                pgJdbc.update(insertSql, meetingId, role, approverAssigneeId, decisionResult, comment, approverAssigneeId);

                // ID 조회
                approvalId = pgJdbc.queryForObject(
                    "SELECT id FROM public.credit_unblock_approval WHERE meeting_id = ?",
                    Long.class, meetingId);
            }

            // 2. credit_unblock_request 상태 업데이트
            // - 1차 승인자: 레코드별 선택한 승인/반려 상태로 변경
            // - 2차 승인자 승인: APPROVED_1ST → APPROVED_FINAL로 변경
            // - 2차 승인자 반려: 변경 없음
            if ("1st".equals(approverLevel)) {
                // 1차 승인자: 승인 건 처리
                if (approveRequestIds != null && !approveRequestIds.isEmpty()) {
                    for (Long requestId : approveRequestIds) {
                        try {
                            String updateSql = "UPDATE public.credit_unblock_request SET request_status = 'APPROVED_1ST', updated_at = NOW(), updated_by = ? WHERE id = ?";
                            int updated = pgJdbc.update(updateSql, approverAssigneeId, requestId);
                            if (updated > 0) approvedCount++;
                        } catch (Exception e) {
                            log.warn("Failed to approve request {}: {}", requestId, e.getMessage());
                        }
                    }
                }

                // 1차 승인자: 반려 건 처리
                if (rejectRequestIds != null && !rejectRequestIds.isEmpty()) {
                    for (Long requestId : rejectRequestIds) {
                        try {
                            String updateSql = "UPDATE public.credit_unblock_request SET request_status = 'REJECTED', updated_at = NOW(), updated_by = ? WHERE id = ?";
                            int updated = pgJdbc.update(updateSql, approverAssigneeId, requestId);
                            if (updated > 0) rejectedCount++;
                        } catch (Exception e) {
                            log.warn("Failed to reject request {}: {}", requestId, e.getMessage());
                        }
                    }
                }
            } else if ("2nd".equals(approverLevel) && isApprove) {
                // 2차 승인자 승인: APPROVED_1ST인 건들을 APPROVED_FINAL로 변경
                String finalApprovalSql = """
                        UPDATE public.credit_unblock_request
                        SET request_status = 'APPROVED_FINAL', updated_at = NOW(), updated_by = ?
                        WHERE meeting_id = ? AND request_status = 'APPROVED_1ST'
                        """;
                approvedCount = pgJdbc.update(finalApprovalSql, approverAssigneeId, meetingId);
                log.info("2nd approver approved: {} requests changed to APPROVED_FINAL for meetingId={}", approvedCount, meetingId);
            }
            // 2차 승인자 반려: credit_unblock_request 변경 없음

            // 3. 이력 저장
            String histSql = """
                    INSERT INTO public.credit_unblock_approval_hist
                    (approval_id, meeting_id, approver_role, approver_assignee_id, decision_result, decision_comment, decided_at, hist_created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                    """;
            pgJdbc.update(histSql, approvalId, meetingId, role, approverAssigneeId, decisionResult, comment);

            // 4. 결과 반환
            result.put("success", true);
            result.put("approvalId", approvalId);
            result.put("approverRole", role);
            result.put("decisionResult", decisionResult);
            result.put("approvedCount", approvedCount);
            result.put("rejectedCount", rejectedCount);

            String message;
            if (is2ndReject) {
                message = String.format("반려 처리 완료 (총 %d건 초기화)", rejectedCount);
            } else if (approvedCount > 0 && rejectedCount > 0) {
                message = String.format("%d건 승인, %d건 반려 처리 완료", approvedCount, rejectedCount);
            } else if (approvedCount > 0) {
                message = String.format("%d건 승인 처리 완료", approvedCount);
            } else {
                message = String.format("%d건 반려 처리 완료", rejectedCount);
            }
            result.put("message", message);

            log.info("Batch approval processed: meetingId={}, role={}, result={}, approved={}, rejected={}",
                    meetingId, role, decisionResult, approvedCount, rejectedCount);

        } catch (Exception e) {
            log.error("Error processing batch approval", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 승인 이력 저장 Helper
     */
    private void logApprovalHistory(Map<String, Object> approval) {
        try {
            String sql = """
                    INSERT INTO public.credit_unblock_approval_hist
                    (approval_id, meeting_id, approver_role, approver_assignee_id, decision_result, decision_comment, decided_at, hist_created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    """;
            pgJdbc.update(sql,
                    approval.get("id"),
                    approval.get("meeting_id"),
                    approval.get("approver_role"),
                    approval.get("approver_assignee_id"),
                    approval.get("decision_result"),
                    approval.get("decision_comment"),
                    approval.get("decided_at"));
        } catch (Exception e) {
            log.error("Failed to log approval history: " + e.getMessage(), e);
            // Non-blocking failure
        }
    }

    /**
     * 결재 이력 조회 (회의별)
     */
    public List<Map<String, Object>> getApprovalHistory(Long meetingId) {
        String sql = """
                SELECT
                    h.hist_id,
                    h.approval_id,
                    h.meeting_id,
                    h.approver_role,
                    h.approver_assignee_id,
                    COALESCE(e.emp_name, h.approver_assignee_id) as approver_name,
                    h.decision_result,
                    h.decision_comment,
                    h.decided_at,
                    h.hist_created_at,
                    m.meeting_code,
                    m.meeting_name
                FROM public.credit_unblock_approval_hist h
                LEFT JOIN public.credit_meeting m ON h.meeting_id = m.id
                LEFT JOIN public.employee e ON h.approver_assignee_id = e.emp_id
                WHERE h.meeting_id = ?
                ORDER BY h.hist_created_at DESC
                """;
        return pgJdbc.queryForList(sql, meetingId);
    }

    /**
     * 미수 지표 조회 (고객별)
     * 1) 총미수/12개월 매출 비율: 이달 제외 직전 12개월 매출 대비 총미수 비율
     * 2) 최근 90일 수금/매출 비율: 오늘부터 90일 이전 기간의 수금액/매출액 비율
     */
    public Map<String, Object> getReceivableMetrics(Long customerSeq, String companyType, BigDecimal totalAr) {
        Map<String, Object> result = new HashMap<>();

        try {
            // 1. 직전 12개월 매출 합계 (이달 제외, invoice 테이블)
            BigDecimal sales12Month = getSales12Month(customerSeq, companyType);
            result.put("sales12Month", sales12Month);

            // 총미수/12개월 매출 비율
            BigDecimal arToSalesRatio = BigDecimal.ZERO;
            if (sales12Month != null && sales12Month.compareTo(BigDecimal.ZERO) > 0 && totalAr != null) {
                arToSalesRatio = totalAr.multiply(new BigDecimal("100"))
                        .divide(sales12Month, 1, RoundingMode.HALF_UP);
            }
            result.put("arToSalesRatio", arToSalesRatio);
            result.put("totalAr", totalAr);

            // 2. 최근 90일 수금/매출 비율 (ERP 수금, invoice 매출)
            BigDecimal collection90Days = getCollection90Days(customerSeq, companyType);
            BigDecimal sales90Days = getSales90Days(customerSeq, companyType);

            result.put("collection90Days", collection90Days);
            result.put("sales90Days", sales90Days);

            BigDecimal collectionToSalesRatio = BigDecimal.ZERO;
            if (sales90Days != null && sales90Days.compareTo(BigDecimal.ZERO) > 0 && collection90Days != null) {
                collectionToSalesRatio = collection90Days.multiply(new BigDecimal("100"))
                        .divide(sales90Days, 1, RoundingMode.HALF_UP);
            }
            result.put("collectionToSalesRatio", collectionToSalesRatio);

        } catch (Exception e) {
            log.error("미수 지표 조회 실패: {}", e.getMessage());
            result.put("sales12Month", BigDecimal.ZERO);
            result.put("arToSalesRatio", BigDecimal.ZERO);
            result.put("totalAr", totalAr);
            result.put("collection90Days", BigDecimal.ZERO);
            result.put("sales90Days", BigDecimal.ZERO);
            result.put("collectionToSalesRatio", BigDecimal.ZERO);
        }

        return result;
    }

    /**
     * 직전 12개월 매출 합계 (이달 제외)
     * invoice 테이블에서 조회
     */
    private BigDecimal getSales12Month(Long customerSeq, String companyType) {
        try {
            // 이달 1일
            LocalDate thisMonthStart = LocalDate.now().withDayOfMonth(1);
            // 12개월 전 1일
            LocalDate startDate = thisMonthStart.minusMonths(12);
            // 지난달 말일 (이달 제외)
            LocalDate endDate = thisMonthStart.minusDays(1);

            String sql = """
                    SELECT COALESCE(SUM(cur_amt), 0) as total
                    FROM public.invoice
                    WHERE customer_seq = ?
                      AND company_type = ?
                      AND invoice_date >= ?
                      AND invoice_date <= ?
                    """;
            Map<String, Object> row = pgJdbc.queryForMap(sql, customerSeq, companyType, startDate, endDate);
            return row.get("total") != null ? (BigDecimal) row.get("total") : BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("12개월 매출 조회 실패: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * 최근 90일 수금 합계 (ERP에서 조회)
     */
    private BigDecimal getCollection90Days(Long customerSeq, String companyType) {
        try {
            if (mssqlJdbc == null) {
                log.warn("mssqlJdbc is null, cannot query ERP for collection");
                return BigDecimal.ZERO;
            }

            String schema = "TNT".equalsIgnoreCase(companyType) ? "tnt.dbo" : "DYS.dbo";

            String sql = """
                    SELECT COALESCE(SUM(RB.CurAmt), 0) as total
                    FROM %s._TSLReceipt R
                    INNER JOIN %s._TSLReceiptBill RB ON R.ReceiptSeq = RB.ReceiptSeq
                    WHERE R.CustSeq = ?
                      AND CAST(R.ReceiptDate AS DATE) >= DATEADD(DAY, -90, CAST(GETDATE() AS DATE))
                    """.formatted(schema, schema);

            Map<String, Object> row = mssqlJdbc.queryForMap(sql, customerSeq);
            return row.get("total") != null ? (BigDecimal) row.get("total") : BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("90일 수금 조회 실패 (ERP): {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * 최근 90일 매출 합계 (invoice 테이블)
     */
    private BigDecimal getSales90Days(Long customerSeq, String companyType) {
        try {
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(90);

            String sql = """
                    SELECT COALESCE(SUM(cur_amt), 0) as total
                    FROM public.invoice
                    WHERE customer_seq = ?
                      AND company_type = ?
                      AND invoice_date >= ?
                      AND invoice_date <= ?
                    """;
            Map<String, Object> row = pgJdbc.queryForMap(sql, customerSeq, companyType, startDate, endDate);
            return row.get("total") != null ? (BigDecimal) row.get("total") : BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("90일 매출 조회 실패: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }
}
