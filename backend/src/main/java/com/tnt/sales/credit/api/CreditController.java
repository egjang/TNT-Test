package com.tnt.sales.credit.api;

import com.tnt.sales.credit.service.CreditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/credit")
public class CreditController {
    private static final Logger log = LoggerFactory.getLogger(CreditController.class);

    @Autowired
    CreditService creditService;

    /**
     * GET /api/v1/credit/sales-reps
     * Get unique sales rep list
     */
    @GetMapping("/sales-reps")
    public ResponseEntity<Map<String, Object>> getSalesReps() {
        log.info("GET /api/v1/credit/sales-reps");

        Map<String, Object> response = new HashMap<>();

        try {
            List<String> salesReps = creditService.getSalesRepList();
            response.put("salesReps", salesReps);
            response.put("total", salesReps.size());
        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/sales-reps", e);
            response.put("error", "Failed to get sales reps: " + e.getMessage());
            response.put("salesReps", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/snapshot-options
     * Get distinct snapshot options (meeting + date) for AR aging data
     */
    @GetMapping("/snapshot-options")
    public ResponseEntity<Map<String, Object>> getSnapshotOptions() {
        log.info("GET /api/v1/credit/snapshot-options");

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> options = creditService.getSnapshotOptions();
            response.put("options", options);
            response.put("total", options.size());
        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/snapshot-options", e);
            response.put("error", "Failed to get snapshot options: " + e.getMessage());
            response.put("options", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/snapshot-dates
     * Get distinct snapshot dates for AR aging data
     */
    @GetMapping("/snapshot-dates")
    public ResponseEntity<Map<String, Object>> getSnapshotDates() {
        log.info("GET /api/v1/credit/snapshot-dates");

        Map<String, Object> response = new HashMap<>();

        try {
            List<LocalDate> dates = creditService.getSnapshotDates();
            response.put("dates", dates);
            response.put("total", dates.size());
        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/snapshot-dates", e);
            response.put("error", "Failed to get snapshot dates: " + e.getMessage());
            response.put("dates", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/ar-aging
     * Query AR Aging data with filters
     */
    @GetMapping("/ar-aging")
    public ResponseEntity<Map<String, Object>> getArAging(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String salesRep,
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String agingBucket,
            @RequestParam(required = false) Long meetingId,
            @RequestParam(required = false) String snapshotDate) {
        log.info(
                "GET /api/v1/credit/ar-aging - company: {}, salesRep: {}, customerName: {}, riskLevel: {}, agingBucket: {}, meetingId: {}, snapshotDate: {}",
                company, salesRep, customerName, riskLevel, agingBucket, meetingId, snapshotDate);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> items = creditService.queryArAging(
                    company, salesRep, customerName, riskLevel, agingBucket, meetingId, snapshotDate);

            // Calculate risk level for each item
            for (Map<String, Object> item : items) {
                BigDecimal totalAr = (BigDecimal) item.get("total_ar");
                BigDecimal overdue = BigDecimal.ZERO;

                // Calculate overdue (sum of all aging buckets except 0-30)
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

                // Determine risk level
                String riskLevelCalc = "low";
                if (totalAr != null && totalAr.compareTo(BigDecimal.ZERO) > 0) {
                    double overdueRatio = overdue.divide(totalAr, 4, RoundingMode.HALF_UP).doubleValue();
                    if (overdueRatio > 0.3) {
                        riskLevelCalc = "high";
                    } else if (overdueRatio > 0.1) {
                        riskLevelCalc = "medium";
                    }
                }
                item.put("riskLevel", riskLevelCalc);
            }

            // Filter by risk level if specified
            if (riskLevel != null && !riskLevel.isEmpty() && !"all".equals(riskLevel)) {
                items.removeIf(item -> !riskLevel.equals(item.get("riskLevel")));
            }

            response.put("items", items);
            response.put("total", items.size());

        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/ar-aging", e);
            response.put("error", "Failed to query AR aging data: " + e.getMessage());
            response.put("items", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/customers/{customerSeq}
     * Get customer credit detail
     */
    @GetMapping("/customers/{customerSeq}")
    public ResponseEntity<Map<String, Object>> getCustomerCredit(@PathVariable Long customerSeq) {
        log.info("GET /api/v1/credit/customers/{} - Get customer credit detail", customerSeq);

        Map<String, Object> response = new HashMap<>();

        try {
            Map<String, Object> customerData = creditService.getCustomerCreditDetail(customerSeq);

            if (customerData.isEmpty()) {
                response.put("error", "Customer not found");
                return ResponseEntity.status(404).body(response);
            }

            response.put("customer", customerData);

            // Get sales opinions
            List<Map<String, Object>> opinions = creditService.getSalesOpinions(customerSeq, null);
            response.put("opinions", opinions);

            // Get unblock requests
            List<Map<String, Object>> requests = creditService.getUnblockRequests(customerSeq, null);
            response.put("requests", requests);

        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/customers/" + customerSeq, e);
            response.put("error", "Failed to get customer credit detail: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/meetings
     * Get credit meeting list
     */
    @GetMapping("/meetings")
    public ResponseEntity<Map<String, Object>> getCreditMeetings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String keyword) {
        log.info("GET /api/v1/credit/meetings - status: {}, fromDate: {}, toDate: {}, keyword: {}", status, fromDate,
                toDate, keyword);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> meetings = creditService.getCreditMeetings(status, fromDate, toDate, keyword);
            response.put("meetings", meetings);
            response.put("total", meetings.size());

        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/meetings", e);
            response.put("error", "Failed to get credit meetings: " + e.getMessage());
            response.put("meetings", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/meetings/{meetingId}
     * Get credit meeting detail with customers
     */
    @GetMapping("/meetings/{meetingId}")
    public ResponseEntity<Map<String, Object>> getCreditMeetingDetail(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{} - Get meeting detail", meetingId);

        Map<String, Object> response = new HashMap<>();

        try {
            Map<String, Object> meetingData = creditService.getCreditMeetingDetail(meetingId);

            if (meetingData.isEmpty() || !meetingData.containsKey("meeting")) {
                response.put("error", "Meeting not found");
                return ResponseEntity.status(404).body(response);
            }

            response.putAll(meetingData);

        } catch (Exception e) {
            log.error("Error in GET /api/v1/credit/meetings/" + meetingId, e);
            response.put("error", "Failed to get meeting detail: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/meetings
     * Create a new credit meeting
     */
    @PostMapping("/meetings")
    public ResponseEntity<Map<String, Object>> createCreditMeeting(@RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/meetings - Create new meeting: {}", request);

        String meetingCode = (String) request.get("meetingCode");
        String meetingName = (String) request.get("meetingName");
        String meetingDateStr = (String) request.get("meetingDate");
        String remark = (String) request.get("remark");

        LocalDate meetingDate = LocalDate.parse(meetingDateStr);

        Map<String, Object> result = creditService.createCreditMeeting(meetingCode, meetingName, meetingDate, remark);

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/credit/meetings/latest-active
     * Get the latest active credit meeting
     */
    @GetMapping("/meetings/latest-active")
    public ResponseEntity<Map<String, Object>> getLatestActiveMeeting() {
        log.info("GET /api/v1/credit/meetings/latest-active");
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> meeting = creditService.getLatestActiveMeeting();
            if (meeting != null) {
                response.put("success", true);
                response.put("meeting", meeting);
            } else {
                response.put("success", false);
                response.put("error", "No active meeting found");
            }
        } catch (Exception e) {
            log.error("Error getting latest active meeting", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/meetings/{meetingId}/unblock-requests
     * Get unblock requests for a specific meeting
     */
    @GetMapping("/meetings/{meetingId}/unblock-requests")
    public ResponseEntity<Map<String, Object>> getUnblockRequestsForMeeting(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{}/unblock-requests", meetingId);
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> items = creditService.getUnblockRequestsForMeeting(meetingId);
            response.put("success", true);
            response.put("items", items);
            response.put("total", items.size());
        } catch (Exception e) {
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/requests/{requestId}/approve
     * Approve unblock request
     */
    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<Map<String, Object>> approveUnblockRequest(
            @PathVariable Long requestId,
            @RequestBody Map<String, String> requestBody) {
        log.info("POST /api/v1/credit/requests/{}/approve", requestId);
        Map<String, Object> response = new HashMap<>();
        try {
            String approverId = requestBody.get("approverId");
            String comment = requestBody.get("comment");
            if (approverId == null) {
                throw new IllegalArgumentException("approverId is required");
            }
            creditService.approveUnblockRequest(requestId, approverId, comment);
            response.put("success", true);
        } catch (Exception e) {
            log.error("Error approving unblock request " + requestId, e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/opinions
     * Create a sales opinion
     */
    @PostMapping("/opinions")
    public ResponseEntity<Map<String, Object>> createSalesOpinion(@RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/opinions - Create sales opinion: {}", request);

        Long customerSeq = Long.valueOf(request.get("customerSeq").toString());
        String assigneeId = (String) request.get("assigneeId");
        String opinionType = (String) request.get("opinionType");
        String opinionText = (String) request.get("opinionText");

        LocalDate promiseDate = null;
        if (request.get("promiseDate") != null) {
            promiseDate = LocalDate.parse((String) request.get("promiseDate"));
        }

        BigDecimal promiseAmount = null;
        if (request.get("promiseAmount") != null) {
            promiseAmount = new BigDecimal(request.get("promiseAmount").toString());
        }

        String riskLevel = (String) request.get("riskLevel");

        Long meetingCustomerId = null;
        if (request.get("meetingCustomerId") != null) {
            meetingCustomerId = Long.valueOf(request.get("meetingCustomerId").toString());
        }

        Map<String, Object> result = creditService.createSalesOpinion(
                customerSeq, assigneeId, opinionType, opinionText,
                promiseDate, promiseAmount, riskLevel, meetingCustomerId);

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/credit/unblock-requests
     * 매출통제 해제 품의 등록
     */
    @PostMapping("/unblock-requests")
    public ResponseEntity<Map<String, Object>> createUnblockRequest(@RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/unblock-requests - {}", request);
        Map<String, Object> result = creditService.createUnblockRequest(request);
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * PUT /api/v1/credit/unblock-requests/{id}
     * 매출통제 해제 품의 수정 (재상신)
     */
    @PutMapping("/unblock-requests/{id}")
    public ResponseEntity<Map<String, Object>> updateUnblockRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        log.info("PUT /api/v1/credit/unblock-requests/{} - {}", id, request);
        Map<String, Object> result = creditService.updateUnblockRequest(id, request);
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * DELETE /api/v1/credit/unblock-requests/{requestId}
     * 매출통제 해제 품의 삭제 (SUBMITTED 상태만 가능)
     */
    @DeleteMapping("/unblock-requests/{requestId}")
    public ResponseEntity<Map<String, Object>> deleteUnblockRequest(@PathVariable Long requestId) {
        log.info("DELETE /api/v1/credit/unblock-requests/{}", requestId);

        Map<String, Object> result = creditService.deleteUnblockRequest(requestId);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * GET /api/v1/credit/customers/{customerSeq}/opinions
     * Get meeting opinions for a customer from credit_sales_opinion table
     * (연체 의견: 각 회의에서 해당 고객에 대한 의견)
     */
    @GetMapping("/customers/{customerSeq}/opinions")
    public ResponseEntity<Map<String, Object>> getCustomerOpinions(
            @PathVariable Long customerSeq) {
        log.info("GET /api/v1/credit/customers/{}/opinions", customerSeq);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> opinions = creditService.getCustomerMeetingOpinions(customerSeq);
            response.put("opinions", opinions);
            response.put("total", opinions.size());

        } catch (Exception e) {
            log.error("Error getting customer opinions for customerSeq: " + customerSeq, e);
            response.put("error", "Failed to get opinions: " + e.getMessage());
            response.put("opinions", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/customers/{customerSeq}/unblock-requests
     * Get unblock requests for a customer
     */
    @GetMapping("/customers/{customerSeq}/unblock-requests")
    public ResponseEntity<Map<String, Object>> getCustomerUnblockRequests(
            @PathVariable Long customerSeq,
            @RequestParam(required = false) String status) {
        log.info("GET /api/v1/credit/customers/{}/unblock-requests", customerSeq);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> requests = creditService.getUnblockRequests(customerSeq, status);
            response.put("requests", requests);
            response.put("total", requests.size());

        } catch (Exception e) {
            log.error("Error getting unblock requests for customerSeq: " + customerSeq, e);
            response.put("error", "Failed to get unblock requests: " + e.getMessage());
            response.put("requests", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/meetings/{meetingId}/customers
     * Add a customer to credit meeting with decision details
     */
    @PostMapping("/meetings/{meetingId}/customers")
    public ResponseEntity<Map<String, Object>> addCustomerToMeeting(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/meetings/{}/customers - Add customer: {}", meetingId, request);

        // Support both snake_case (from new frontend) and camelCase (legacy)
        Long customerSeq = null;
        if (request.containsKey("customer_seq")) {
            customerSeq = Long.valueOf(request.get("customer_seq").toString());
        } else if (request.containsKey("customerSeq")) {
            customerSeq = Long.valueOf(request.get("customerSeq").toString());
        }

        String customerName = request.get("customer_name") != null ? request.get("customer_name").toString() : null;
        String assigneeId = request.get("assignee_id") != null ? request.get("assignee_id").toString() : null;
        String empName = request.get("emp_name") != null ? request.get("emp_name").toString() : null;
        String decisionComment = request.get("decision_comment") != null ? request.get("decision_comment").toString()
                : null;
        Boolean reviewFlag = request.get("review_flag") != null ? Boolean.valueOf(request.get("review_flag").toString())
                : true;
        String createdBy = request.get("created_by") != null ? request.get("created_by").toString() : null;

        Map<String, Object> result = creditService.addCustomerToMeeting(
                meetingId, customerSeq, customerName, assigneeId, empName,
                decisionComment, reviewFlag, createdBy);

        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/v1/credit/meetings/customers/{meetingCustomerId}
     * Remove a customer from credit meeting
     */
    @DeleteMapping("/meetings/customers/{meetingCustomerId}")
    public ResponseEntity<Map<String, Object>> removeCustomerFromMeeting(
            @PathVariable Long meetingCustomerId) {
        log.info("DELETE /api/v1/credit/meetings/customers/{} - Remove customer", meetingCustomerId);

        Map<String, Object> result = creditService.removeCustomerFromMeeting(meetingCustomerId);

        return ResponseEntity.ok(result);
    }

    /**
     * PUT /api/v1/credit/meeting-customers/{id}
     * Update sales opinion (연체 의견 수정)
     * 
     * @param id credit_sales_opinion.id
     */
    @PutMapping("/meeting-customers/{id}")
    public ResponseEntity<Map<String, Object>> updateMeetingCustomer(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        log.info("PUT /api/v1/credit/meeting-customers/{} - Update sales opinion: {}", id, request);

        Map<String, Object> response = new HashMap<>();

        try {
            String decisionComment = (String) request.get("decisionComment");
            String updatedBy = (String) request.get("updatedBy");

            Map<String, Object> result = creditService.updateMeetingCustomer(id, decisionComment, updatedBy);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error updating sales opinion: " + id, e);
            response.put("success", false);
            response.put("error", "Failed to update sales opinion: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * DELETE /api/v1/credit/meeting-customers/{id}
     * Delete sales opinion (연체 의견 삭제)
     * 
     * @param id credit_sales_opinion.id
     */
    @DeleteMapping("/meeting-customers/{id}")
    public ResponseEntity<Map<String, Object>> deleteMeetingCustomer(@PathVariable Long id) {
        log.info("DELETE /api/v1/credit/meeting-customers/{} - Delete sales opinion", id);

        Map<String, Object> response = new HashMap<>();

        try {
            boolean deleted = creditService.deleteMeetingCustomer(id);
            response.put("success", deleted);
            if (!deleted) {
                response.put("error", "Sales opinion not found or already deleted");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error deleting sales opinion: " + id, e);
            response.put("success", false);
            response.put("error", "Failed to delete sales opinion: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * POST /api/v1/credit/meetings/{meetingId}/auto-add-customers
     * Auto-add customers by risk level to credit meeting
     */
    @PostMapping("/meetings/{meetingId}/auto-add-customers")
    public ResponseEntity<Map<String, Object>> autoAddCustomersToMeeting(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/meetings/{}/auto-add-customers - Request: {}", meetingId, request);

        String riskLevel = (String) request.get("riskLevel");
        Map<String, Object> result = creditService.autoAddHighRiskCustomers(meetingId, riskLevel);

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/credit/ar-aging/summary
     * Get AR Aging summary for a specific meeting
     */
    @GetMapping("/ar-aging/summary")
    public ResponseEntity<Map<String, Object>> getArAgingSummary(
            @RequestParam(required = false) Long meetingId) {
        log.info("GET /api/v1/credit/ar-aging/summary - meetingId: {}", meetingId);

        Map<String, Object> result = creditService.getArAgingSummary(meetingId);

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/credit/meetings/{meetingId}/generate-data
     * Generate AR Aging data from ERP for a specific meeting
     */
    @PostMapping("/meetings/{meetingId}/generate-data")
    public ResponseEntity<Map<String, Object>> generateArAgingData(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/meetings/{}/generate-data - Request: {}", meetingId, request);

        Map<String, Object> response = new HashMap<>();

        try {
            // Get meeting date from request
            String meetingDateStr = (String) request.get("meetingDate");
            if (meetingDateStr == null || meetingDateStr.isEmpty()) {
                response.put("success", false);
                response.put("error", "Meeting date is required");
                return ResponseEntity.badRequest().body(response);
            }

            LocalDate meetingDate = LocalDate.parse(meetingDateStr);

            // Check overwrite flag
            Boolean overwrite = (Boolean) request.get("overwrite");
            if (overwrite == null) {
                overwrite = false;
            }

            // Check if data already exists for this meeting (회의 ID 기준으로 체크)
            if (creditService.hasArAgingDataByMeetingId(meetingId)) {
                if (overwrite) {
                    // Delete existing data for this meeting before generating new data
                    creditService.deleteArAgingDataByMeetingId(meetingId);
                    log.info("Deleted existing AR aging data for meetingId: {}", meetingId);
                } else {
                    response.put("success", false);
                    response.put("error", "해당 회의에 AR Aging 데이터가 이미 존재합니다. 새로 생성하시겠습니까?");
                    response.put("existsForMeeting", true);
                    return ResponseEntity.badRequest().body(response);
                }
            }

            // Generate data from ERP
            Map<String, Object> result = creditService.generateArAgingData(meetingId, meetingDate);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error generating AR aging data for meeting: " + meetingId, e);
            response.put("success", false);
            response.put("error", "Failed to generate AR aging data: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * GET /api/v1/credit/activities
     * Get activities for a customer with external_id = 'ar_meeting'
     */
    @GetMapping("/activities")
    public ResponseEntity<Map<String, Object>> getActivities(
            @RequestParam Long customerSeq,
            @RequestParam(required = false, defaultValue = "") String companyType,
            @RequestParam(defaultValue = "ar_meeting") String externalId) {
        log.info("GET /api/v1/credit/activities - customerSeq: {}, companyType: {}, externalId: {}",
                customerSeq, companyType, externalId);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> items = creditService.getActivitiesByCustomer(customerSeq, companyType,
                    externalId);
            response.put("items", items);
            response.put("total", items.size());
        } catch (Exception e) {
            log.error("Error fetching activities", e);
            response.put("error", "Failed to fetch activities: " + e.getMessage());
            response.put("items", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/activities
     * Create a new activity for a customer (ar_meeting activity)
     */
    @PostMapping("/activities")
    public ResponseEntity<Map<String, Object>> createActivity(@RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/activities - request: {}", request);

        Map<String, Object> response = new HashMap<>();

        try {
            Long customerSeq = Long.valueOf(request.get("customerSeq").toString());
            String companyType = (String) request.get("companyType");
            String subject = (String) request.get("subject");
            String description = (String) request.get("description");
            String activityType = (String) request.getOrDefault("activityType", "채권관리");
            String activityDate = (String) request.get("activityDate");
            String activityMethod = (String) request.getOrDefault("activityMethod", "방문");
            String assigneeId = (String) request.getOrDefault("assigneeId", "");
            Long meetingId = request.get("meetingId") != null ? Long.valueOf(request.get("meetingId").toString())
                    : null;
            String createdBy = (String) request.getOrDefault("createdBy", "");

            Map<String, Object> created = creditService.createActivity(customerSeq, companyType, subject, description,
                    activityType, activityDate, activityMethod, assigneeId, meetingId, createdBy);
            response.put("success", true);
            response.put("activity", created);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error creating activity", e);
            response.put("success", false);
            response.put("error", "Failed to create activity: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * DELETE /api/v1/credit/activities/{id}
     * Delete an activity by ID
     */
    @DeleteMapping("/activities/{id}")
    public ResponseEntity<Map<String, Object>> deleteActivity(@PathVariable Long id) {
        log.info("DELETE /api/v1/credit/activities/{}", id);

        Map<String, Object> response = new HashMap<>();

        try {
            boolean deleted = creditService.deleteActivity(id);
            response.put("success", deleted);
            if (!deleted) {
                response.put("error", "Activity not found or already deleted");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error deleting activity", e);
            response.put("success", false);
            response.put("error", "Failed to delete activity: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * GET /api/v1/credit/customer-details
     * Get customer details including collections, monthly collections, recent
     * transactions, avg sales
     */
    @GetMapping("/customer-details")
    public ResponseEntity<Map<String, Object>> getCustomerDetails(
            @RequestParam Long customerSeq,
            @RequestParam String companyType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate meetingDate,
            @RequestParam(required = false) Long meetingId) {
        log.info(
                "GET /api/v1/credit/customer-details - customerSeq: {}, companyType: {}, meetingDate: {}, meetingId: {}",
                customerSeq, companyType, meetingDate, meetingId);

        Map<String, Object> response = new HashMap<>();

        try {
            response = creditService.getCustomerDetails(customerSeq, companyType, meetingDate, meetingId);
        } catch (Exception e) {
            log.error("Error fetching customer details", e);
            response.put("error", "Failed to fetch customer details: " + e.getMessage());
            response.put("collections", new ArrayList<>());
            response.put("monthlyCollections", new ArrayList<>());
            response.put("recentTransactions", new ArrayList<>());
            response.put("monthlySales3Month", new ArrayList<>());
            response.put("avgSales3Month", 0);
            response.put("releaseOpinion", "");
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/unblock-request
     * 매출통제 해제 품의 조회 (고객별 최신 1건)
     */
    @GetMapping("/unblock-request")
    public ResponseEntity<Map<String, Object>> getUnblockRequest(
            @RequestParam Long customerSeq) {
        log.info("GET /api/v1/credit/unblock-request - customerSeq: {}", customerSeq);

        Map<String, Object> response = new HashMap<>();
        Map<String, Object> data = creditService.getUnblockRequest(customerSeq);

        if (data != null) {
            response.put("success", true);
            response.put("data", data);
        } else {
            response.put("success", true);
            response.put("data", null);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/unblock-request/list
     * 매출통제 해제 품의 목록 조회 (고객별)
     */
    @GetMapping("/unblock-request/list")
    public ResponseEntity<Map<String, Object>> getUnblockRequestList(
            @RequestParam Long customerSeq) {
        log.info("GET /api/v1/credit/unblock-request/list - customerSeq: {}", customerSeq);

        Map<String, Object> response = new HashMap<>();
        List<Map<String, Object>> items = creditService.getUnblockRequestList(customerSeq);

        response.put("success", true);
        response.put("items", items);
        response.put("total", items.size());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/unblock-requests/pending
     * 대기 중인 매출통제 해제 품의 목록 조회 (승인자용)
     */
    @GetMapping("/unblock-requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingUnblockRequests() {
        log.info("GET /api/v1/credit/unblock-requests/pending");
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> items = creditService.getPendingUnblockRequests();
            response.put("success", true);
            response.put("items", items);
            response.put("total", items.size());
        } catch (Exception e) {
            log.error("Error getting pending unblock requests", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/unblock-requests/{requestId}/decision
     * 매출통제 해제 품의 승인/반려 처리
     */
    @PostMapping("/unblock-requests/{requestId}/decision")
    public ResponseEntity<Map<String, Object>> processUnblockDecision(
            @PathVariable Long requestId,
            @RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/unblock-requests/{}/decision - {}", requestId, request);

        String decision = (String) request.get("decision");
        String comment = (String) request.get("comment");
        String approverId = (String) request.get("approverId"); // In real app, get from principal

        Map<String, Object> result = creditService.processUnblockDecision(requestId, decision, comment, approverId);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * GET /api/v1/credit/meetings/{meetingId}/stats
     * 매출통제 해제 요청 통계 조회
     */
    @GetMapping("/meetings/{meetingId}/stats")
    public ResponseEntity<Map<String, Object>> getUnblockStats(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{}/stats", meetingId);
        Map<String, Object> result = creditService.getUnblockRequestStats(meetingId);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/credit/meetings/{meetingId}/opinions
     * 회의별 연체 의견 조회 (credit_sales_opinion)
     */
    @GetMapping("/meetings/{meetingId}/opinions")
    public ResponseEntity<Map<String, Object>> getMeetingSalesOpinions(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{}/opinions", meetingId);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> opinions = creditService.getMeetingSalesOpinions(meetingId);
            response.put("success", true);
            response.put("opinions", opinions);
            response.put("total", opinions.size());
        } catch (Exception e) {
            log.error("Error getting sales opinions for meeting: " + meetingId, e);
            response.put("success", false);
            response.put("error", "Failed to get sales opinions: " + e.getMessage());
            response.put("opinions", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/meetings/{meetingId}/activities
     * 회의별 채권활동 조회 (sales_activity)
     */
    @GetMapping("/meetings/{meetingId}/activities")
    public ResponseEntity<Map<String, Object>> getMeetingSalesActivities(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{}/activities", meetingId);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> activities = creditService.getMeetingSalesActivities(meetingId);
            response.put("success", true);
            response.put("activities", activities);
            response.put("total", activities.size());
        } catch (Exception e) {
            log.error("Error getting sales activities for meeting: " + meetingId, e);
            response.put("success", false);
            response.put("error", "Failed to get sales activities: " + e.getMessage());
            response.put("activities", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    // ==================== 회의 의견(Remark) API ====================

    /**
     * GET /api/v1/credit/meetings/{meetingId}/remarks
     * 회의 의견 목록 조회
     */
    @GetMapping("/meetings/{meetingId}/remarks")
    public ResponseEntity<Map<String, Object>> getMeetingRemarks(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{}/remarks", meetingId);
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> remarks = creditService.getMeetingRemarks(meetingId);
            response.put("success", true);
            response.put("remarks", remarks);
            response.put("total", remarks.size());
        } catch (Exception e) {
            log.error("Error getting meeting remarks for meetingId: " + meetingId, e);
            response.put("success", false);
            response.put("error", "Failed to get meeting remarks: " + e.getMessage());
            response.put("remarks", new ArrayList<>());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/credit/meetings/{meetingId}/remarks
     * 회의 의견 등록
     */
    @PostMapping("/meetings/{meetingId}/remarks")
    public ResponseEntity<Map<String, Object>> createMeetingRemark(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/meetings/{}/remarks - {}", meetingId, request);
        Map<String, Object> response = new HashMap<>();
        try {
            String remarkType = (String) request.get("remarkType");
            String authorId = (String) request.get("authorId");
            String authorName = (String) request.get("authorName");
            String remarkText = (String) request.get("remarkText");

            if (remarkType == null || authorId == null || authorName == null || remarkText == null) {
                response.put("success", false);
                response.put("error", "remarkType, authorId, authorName, remarkText are required");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> result = creditService.createMeetingRemark(meetingId, remarkType, authorId, authorName,
                    remarkText);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creating meeting remark for meetingId: " + meetingId, e);
            response.put("success", false);
            response.put("error", "Failed to create meeting remark: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * PUT /api/v1/credit/meetings/{meetingId}/remarks/{remarkId}
     * 회의 의견 수정
     */
    @PutMapping("/meetings/{meetingId}/remarks/{remarkId}")
    public ResponseEntity<Map<String, Object>> updateMeetingRemark(
            @PathVariable Long meetingId,
            @PathVariable Long remarkId,
            @RequestBody Map<String, Object> request) {
        log.info("PUT /api/v1/credit/meetings/{}/remarks/{} - {}", meetingId, remarkId, request);
        Map<String, Object> response = new HashMap<>();
        try {
            String remarkType = (String) request.get("remarkType");
            String remarkText = (String) request.get("remarkText");

            if (remarkType == null || remarkText == null) {
                response.put("success", false);
                response.put("error", "remarkType and remarkText are required");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> result = creditService.updateMeetingRemark(remarkId, remarkType, remarkText);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error updating meeting remark: " + remarkId, e);
            response.put("success", false);
            response.put("error", "Failed to update meeting remark: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * DELETE /api/v1/credit/meetings/{meetingId}/remarks/{remarkId}
     * 회의 의견 삭제
     */
    @DeleteMapping("/meetings/{meetingId}/remarks/{remarkId}")
    public ResponseEntity<Map<String, Object>> deleteMeetingRemark(
            @PathVariable Long meetingId,
            @PathVariable Long remarkId) {
        log.info("DELETE /api/v1/credit/meetings/{}/remarks/{}", meetingId, remarkId);
        Map<String, Object> response = new HashMap<>();
        try {
            boolean deleted = creditService.deleteMeetingRemark(remarkId);
            response.put("success", deleted);
            if (!deleted) {
                response.put("error", "Remark not found or already deleted");
            }
        } catch (Exception e) {
            log.error("Error deleting meeting remark: " + remarkId, e);
            response.put("success", false);
            response.put("error", "Failed to delete meeting remark: " + e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    // ==================== 회의 상태(Status) API ====================

    /**
     * PUT /api/v1/credit/meetings/{meetingId}/status
     * 회의 상태 변경
     */
    @PutMapping("/meetings/{meetingId}/status")
    public ResponseEntity<Map<String, Object>> updateMeetingStatus(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request) {
        log.info("PUT /api/v1/credit/meetings/{}/status - {}", meetingId, request);
        Map<String, Object> response = new HashMap<>();
        try {
            String status = (String) request.get("status");
            String updatedBy = (String) request.get("updatedBy");

            if (status == null) {
                response.put("success", false);
                response.put("error", "status is required");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> result = creditService.updateMeetingStatus(meetingId, status, updatedBy);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error updating meeting status for meetingId: " + meetingId, e);
            response.put("success", false);
            response.put("error", "Failed to update meeting status: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * DELETE /api/v1/credit/meetings/{meetingId}
     * 회의 삭제 (PLANNED 상태인 경우만 가능)
     */
    @DeleteMapping("/meetings/{meetingId}")
    public ResponseEntity<Map<String, Object>> deleteMeeting(@PathVariable Long meetingId) {
        log.info("DELETE /api/v1/credit/meetings/{}", meetingId);

        Map<String, Object> result = creditService.deleteMeeting(meetingId);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * POST /api/v1/credit/meetings/{meetingId}/batch-approval
     * 배치 승인/반려 처리 (다수 요청 건을 일괄 처리)
     */
    @PostMapping("/meetings/{meetingId}/batch-approval")
    public ResponseEntity<Map<String, Object>> processBatchApproval(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/meetings/{}/batch-approval - {}", meetingId, request);

        Map<String, Object> response = new HashMap<>();

        try {
            @SuppressWarnings("unchecked")
            List<Integer> approveIdsRaw = (List<Integer>) request.get("approveRequestIds");
            @SuppressWarnings("unchecked")
            List<Integer> rejectIdsRaw = (List<Integer>) request.get("rejectRequestIds");

            List<Long> approveRequestIds = approveIdsRaw != null
                    ? approveIdsRaw.stream().map(Integer::longValue).toList()
                    : new ArrayList<>();
            List<Long> rejectRequestIds = rejectIdsRaw != null
                    ? rejectIdsRaw.stream().map(Integer::longValue).toList()
                    : new ArrayList<>();

            String approverLevel = (String) request.get("approverLevel"); // "1st" or "2nd"
            String approverId = (String) request.get("approverId");
            String comment = (String) request.get("comment");

            if (approverLevel == null || (!approverLevel.equals("1st") && !approverLevel.equals("2nd"))) {
                response.put("success", false);
                response.put("error", "approverLevel은 '1st' 또는 '2nd'이어야 합니다.");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> result = creditService.processBatchApproval(
                    meetingId, approveRequestIds, rejectRequestIds, approverLevel, approverId, comment);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error processing batch approval for meeting: " + meetingId, e);
            response.put("success", false);
            response.put("error", "배치 승인 처리 실패: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * GET /api/v1/credit/meetings/{meetingId}/approval-history
     * 결재 이력 조회
     */
    @GetMapping("/meetings/{meetingId}/approval-history")
    public ResponseEntity<Map<String, Object>> getApprovalHistory(@PathVariable Long meetingId) {
        log.info("GET /api/v1/credit/meetings/{}/approval-history", meetingId);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> history = creditService.getApprovalHistory(meetingId);
            response.put("success", true);
            response.put("history", history);
            response.put("total", history.size());
        } catch (Exception e) {
            log.error("Error getting approval history for meeting: " + meetingId, e);
            response.put("success", false);
            response.put("error", "결재 이력 조회 실패: " + e.getMessage());
            response.put("history", new ArrayList<>());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/credit/receivable-metrics
     * 미수 지표 조회 (고객별)
     */
    @GetMapping("/receivable-metrics")
    public ResponseEntity<Map<String, Object>> getReceivableMetrics(
            @RequestParam Long customerSeq,
            @RequestParam String companyType,
            @RequestParam(required = false) java.math.BigDecimal totalAr) {
        log.info("GET /api/v1/credit/receivable-metrics - customerSeq: {}, companyType: {}, totalAr: {}",
                customerSeq, companyType, totalAr);

        Map<String, Object> response = new HashMap<>();

        try {
            Map<String, Object> metrics = creditService.getReceivableMetrics(customerSeq, companyType, totalAr);
            response.put("success", true);
            response.putAll(metrics);
        } catch (Exception e) {
            log.error("Error getting receivable metrics for customer: " + customerSeq, e);
            response.put("success", false);
            response.put("error", "미수 지표 조회 실패: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }
}
