package com.tnt.sales.credit.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CreditService {
    private static final Logger log = LoggerFactory.getLogger(CreditService.class);

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

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
     * Get distinct snapshot dates for AR aging data
     */
    public List<LocalDate> getSnapshotDates() {
        String sql = "SELECT DISTINCT snapshot_date FROM public.credit_ar_aging " +
                    "WHERE snapshot_date IS NOT NULL " +
                    "ORDER BY snapshot_date DESC " +
                    "LIMIT 30";

        try {
            List<Map<String, Object>> results = pgJdbc.queryForList(sql);
            List<LocalDate> dates = new ArrayList<>();
            for (Map<String, Object> row : results) {
                Object dateObj = row.get("snapshot_date");
                if (dateObj instanceof java.sql.Date) {
                    dates.add(((java.sql.Date) dateObj).toLocalDate());
                } else if (dateObj instanceof LocalDate) {
                    dates.add((LocalDate) dateObj);
                }
            }
            return dates;
        } catch (Exception e) {
            log.error("Error getting snapshot dates", e);
            return new ArrayList<>();
        }
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
            LocalDate snapshotDate
    ) {
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
        sql.append("  snapshot_date ");
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
                    sql.append("AND (aging_31_60 + aging_61_90 + aging_91_120 + aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "31-60":
                    sql.append("AND aging_31_60 > 0 ");
                    sql.append("AND (aging_61_90 + aging_91_120 + aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "61-90":
                    sql.append("AND aging_61_90 > 0 ");
                    sql.append("AND (aging_91_120 + aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "91-120":
                    sql.append("AND aging_91_120 > 0 ");
                    sql.append("AND (aging_121_150 + aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "121-150":
                    sql.append("AND aging_121_150 > 0 ");
                    sql.append("AND (aging_151_180 + aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "151-180":
                    sql.append("AND aging_151_180 > 0 ");
                    sql.append("AND (aging_181_210 + aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "181-210":
                    sql.append("AND aging_181_210 > 0 ");
                    sql.append("AND (aging_211_240 + aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
                    break;
                case "211-240":
                    sql.append("AND aging_211_240 > 0 ");
                    sql.append("AND (aging_241_270 + aging_271_300 + aging_301_330 + aging_331_365 + aging_over_365) = 0 ");
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

        if (snapshotDate != null) {
            sql.append("AND snapshot_date = ? ");
            params.add(snapshotDate);
        } else {
            // Get latest snapshot date
            sql.append("AND snapshot_date = (SELECT MAX(snapshot_date) FROM public.credit_ar_aging) ");
        }

        sql.append("ORDER BY total_ar DESC ");
        sql.append("LIMIT 1000");

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
            String[] agingFields = {"aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                                   "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                                   "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365"};

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
    public List<Map<String, Object>> getCreditMeetings(String status, LocalDate fromDate, LocalDate toDate) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder();

        sql.append("SELECT ");
        sql.append("  m.id, m.meeting_code, m.meeting_name, m.meeting_date, ");
        sql.append("  m.meeting_status, m.remark, m.created_at, ");
        sql.append("  COUNT(mc.id) as customer_count, ");
        sql.append("  COUNT(CASE WHEN mc.decision_code = 'KEEP_BLOCK' THEN 1 END) as high_risk_count, ");
        sql.append("  COUNT(CASE WHEN mc.decision_code = 'REVIEW_UNBLOCK' THEN 1 END) as medium_risk_count, ");
        sql.append("  COUNT(CASE WHEN mc.decision_code = 'WATCH' THEN 1 END) as low_risk_count ");
        sql.append("FROM public.credit_meeting m ");
        sql.append("LEFT JOIN public.credit_meeting_customer mc ON m.id = mc.meeting_id ");
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

            // Get meeting customers
            String customersSql =
                "SELECT mc.*, aa.total_ar, aa.aging_0_30, aa.aging_31_60, aa.aging_61_90 " +
                "FROM public.credit_meeting_customer mc " +
                "LEFT JOIN public.credit_ar_aging aa ON mc.ar_aging_id = aa.id " +
                "WHERE mc.meeting_id = ? " +
                "ORDER BY mc.id";

            List<Map<String, Object>> customers = pgJdbc.queryForList(customersSql, meetingId);
            result.put("customers", customers);

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
     */
    public Map<String, Object> createCreditMeeting(String meetingCode, String meetingName,
                                                    LocalDate meetingDate, String remark) {
        Map<String, Object> result = new HashMap<>();

        try {
            String sql = "INSERT INTO public.credit_meeting " +
                        "(meeting_code, meeting_name, meeting_date, meeting_status, remark, created_at, updated_at) " +
                        "VALUES (?, ?, ?, 'PLANNED', ?, NOW(), NOW()) " +
                        "RETURNING id";

            Long id = pgJdbc.queryForObject(sql, Long.class, meetingCode, meetingName, meetingDate, remark);

            result.put("success", true);
            result.put("id", id);
            result.put("message", "Credit meeting created successfully");
        } catch (Exception e) {
            log.error("Error creating credit meeting", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
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
     * Create unblock request
     */
    public Map<String, Object> createUnblockRequest(
            Long customerSeq, String requestCode, LocalDate requestDate,
            String requestReason, String assigneeId) {

        Map<String, Object> result = new HashMap<>();

        try {
            String sql = "INSERT INTO public.credit_unblock_request " +
                        "(customer_seq, request_code, request_date, request_reason, " +
                        "assignee_id, request_status, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(), NOW()) " +
                        "RETURNING id";

            Long id = pgJdbc.queryForObject(sql, Long.class,
                customerSeq, requestCode, requestDate, requestReason, assigneeId);

            result.put("success", true);
            result.put("id", id);
            result.put("message", "Unblock request created successfully");
        } catch (Exception e) {
            log.error("Error creating unblock request", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Add customer to credit meeting
     */
    public Map<String, Object> addCustomerToMeeting(Long meetingId, Long customerSeq) {
        Map<String, Object> result = new HashMap<>();

        try {
            // First get the latest AR aging data for this customer
            String arSql = "SELECT id, snapshot_date FROM public.credit_ar_aging " +
                          "WHERE customer_seq = ? " +
                          "ORDER BY snapshot_date DESC LIMIT 1";

            List<Map<String, Object>> arData = pgJdbc.queryForList(arSql, customerSeq);

            if (arData.isEmpty()) {
                result.put("success", false);
                result.put("error", "No AR aging data found for customer");
                return result;
            }

            Long arAgingId = ((Number) arData.get(0).get("id")).longValue();
            LocalDate snapshotDate = ((java.sql.Date) arData.get(0).get("snapshot_date")).toLocalDate();

            // Check if customer already exists in this meeting
            String checkSql = "SELECT COUNT(*) FROM public.credit_meeting_customer " +
                             "WHERE meeting_id = ? AND customer_seq = ?";

            Integer count = pgJdbc.queryForObject(checkSql, Integer.class, meetingId, customerSeq);

            if (count != null && count > 0) {
                result.put("success", false);
                result.put("error", "Customer already exists in this meeting");
                return result;
            }

            // Insert customer into meeting
            String sql = "INSERT INTO public.credit_meeting_customer " +
                        "(meeting_id, customer_seq, ar_aging_id, snapshot_date, decision_code, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, 'WATCH', NOW(), NOW()) " +
                        "RETURNING id";

            Long id = pgJdbc.queryForObject(sql, Long.class, meetingId, customerSeq, arAgingId, snapshotDate);

            result.put("success", true);
            result.put("id", id);
            result.put("message", "Customer added to meeting successfully");
        } catch (Exception e) {
            log.error("Error adding customer to meeting", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Remove customer from credit meeting
     */
    public Map<String, Object> removeCustomerFromMeeting(Long meetingCustomerId) {
        Map<String, Object> result = new HashMap<>();

        try {
            String sql = "DELETE FROM public.credit_meeting_customer WHERE id = ?";
            int deleted = pgJdbc.update(sql, meetingCustomerId);

            if (deleted > 0) {
                result.put("success", true);
                result.put("message", "Customer removed from meeting successfully");
            } else {
                result.put("success", false);
                result.put("error", "Meeting customer not found");
            }
        } catch (Exception e) {
            log.error("Error removing customer from meeting", e);
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
                String[] agingFields = {"aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                                       "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                                       "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365"};

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

                // If matches requested risk level, add to meeting
                if (riskLevel.equals(calculatedRisk)) {
                    Long customerSeq = ((Number) ar.get("customer_seq")).longValue();
                    Long arAgingId = ((Number) ar.get("id")).longValue();

                    // Check if already in meeting
                    String checkSql = "SELECT COUNT(*) FROM public.credit_meeting_customer " +
                                     "WHERE meeting_id = ? AND customer_seq = ?";
                    Integer count = pgJdbc.queryForObject(checkSql, Integer.class, meetingId, customerSeq);

                    if (count == null || count == 0) {
                        // Add to meeting with appropriate decision code
                        String decisionCode = "WATCH";
                        if ("high".equals(calculatedRisk)) {
                            decisionCode = "KEEP_BLOCK";
                        } else if ("medium".equals(calculatedRisk)) {
                            decisionCode = "REVIEW_UNBLOCK";
                        }

                        String insertSql = "INSERT INTO public.credit_meeting_customer " +
                                          "(meeting_id, customer_seq, ar_aging_id, snapshot_date, decision_code, created_at, updated_at) " +
                                          "VALUES (?, ?, ?, ?, ?, NOW(), NOW())";

                        pgJdbc.update(insertSql, meetingId, customerSeq, arAgingId, latestDate, decisionCode);
                        addedCustomers.add(customerSeq);
                    }
                }
            }

            result.put("success", true);
            result.put("addedCount", addedCustomers.size());
            result.put("addedCustomers", addedCustomers);
            result.put("message", addedCustomers.size() + " customers added to meeting");
        } catch (Exception e) {
            log.error("Error auto-adding high-risk customers", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }
}
