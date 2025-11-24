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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate snapshotDate
    ) {
        log.info("GET /api/v1/credit/ar-aging - company: {}, salesRep: {}, customerName: {}, riskLevel: {}, agingBucket: {}, snapshotDate: {}",
                company, salesRep, customerName, riskLevel, agingBucket, snapshotDate);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> items = creditService.queryArAging(
                    company, salesRep, customerName, riskLevel, agingBucket, snapshotDate
            );

            // Calculate risk level for each item
            for (Map<String, Object> item : items) {
                BigDecimal totalAr = (BigDecimal) item.get("total_ar");
                BigDecimal overdue = BigDecimal.ZERO;

                // Calculate overdue (sum of all aging buckets except 0-30)
                String[] overdueFields = {"aging_31_60", "aging_61_90", "aging_91_120", "aging_121_150",
                                         "aging_151_180", "aging_181_210", "aging_211_240", "aging_241_270",
                                         "aging_271_300", "aging_301_330", "aging_331_365", "aging_over_365"};

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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        log.info("GET /api/v1/credit/meetings - status: {}, fromDate: {}, toDate: {}", status, fromDate, toDate);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> meetings = creditService.getCreditMeetings(status, fromDate, toDate);
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
                promiseDate, promiseAmount, riskLevel, meetingCustomerId
        );

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/credit/unblock-requests
     * Create an unblock request
     */
    @PostMapping("/unblock-requests")
    public ResponseEntity<Map<String, Object>> createUnblockRequest(@RequestBody Map<String, Object> request) {
        log.info("POST /api/v1/credit/unblock-requests - Create unblock request: {}", request);

        Long customerSeq = Long.valueOf(request.get("customerSeq").toString());
        String requestCode = (String) request.get("requestCode");
        String requestDateStr = (String) request.get("requestDate");
        String requestReason = (String) request.get("requestReason");
        String assigneeId = (String) request.get("assigneeId");

        LocalDate requestDate = LocalDate.parse(requestDateStr);

        Map<String, Object> result = creditService.createUnblockRequest(
                customerSeq, requestCode, requestDate, requestReason, assigneeId
        );

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/credit/customers/{customerSeq}/opinions
     * Get sales opinions for a customer
     */
    @GetMapping("/customers/{customerSeq}/opinions")
    public ResponseEntity<Map<String, Object>> getCustomerOpinions(
            @PathVariable Long customerSeq,
            @RequestParam(required = false) Long meetingCustomerId
    ) {
        log.info("GET /api/v1/credit/customers/{}/opinions", customerSeq);

        Map<String, Object> response = new HashMap<>();

        try {
            List<Map<String, Object>> opinions = creditService.getSalesOpinions(customerSeq, meetingCustomerId);
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
            @RequestParam(required = false) String status
    ) {
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
     * Add a customer to credit meeting
     */
    @PostMapping("/meetings/{meetingId}/customers")
    public ResponseEntity<Map<String, Object>> addCustomerToMeeting(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request
    ) {
        log.info("POST /api/v1/credit/meetings/{}/customers - Add customer: {}", meetingId, request);

        Long customerSeq = Long.valueOf(request.get("customerSeq").toString());
        Map<String, Object> result = creditService.addCustomerToMeeting(meetingId, customerSeq);

        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/v1/credit/meetings/customers/{meetingCustomerId}
     * Remove a customer from credit meeting
     */
    @DeleteMapping("/meetings/customers/{meetingCustomerId}")
    public ResponseEntity<Map<String, Object>> removeCustomerFromMeeting(
            @PathVariable Long meetingCustomerId
    ) {
        log.info("DELETE /api/v1/credit/meetings/customers/{} - Remove customer", meetingCustomerId);

        Map<String, Object> result = creditService.removeCustomerFromMeeting(meetingCustomerId);

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/credit/meetings/{meetingId}/auto-add-customers
     * Auto-add customers by risk level to credit meeting
     */
    @PostMapping("/meetings/{meetingId}/auto-add-customers")
    public ResponseEntity<Map<String, Object>> autoAddCustomersToMeeting(
            @PathVariable Long meetingId,
            @RequestBody Map<String, Object> request
    ) {
        log.info("POST /api/v1/credit/meetings/{}/auto-add-customers - Request: {}", meetingId, request);

        String riskLevel = (String) request.get("riskLevel");
        Map<String, Object> result = creditService.autoAddHighRiskCustomers(meetingId, riskLevel);

        return ResponseEntity.ok(result);
    }
}
