package com.tnt.sales.credit.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class CreditUnblockRequest {
    private Long id;
    private String customerCode;
    private String customerName;
    private String requestReason;
    private LocalDate expectedCollectionDate;
    private BigDecimal expectedAmount;
    private String collectionPlan;
    private String status; // "REQUESTED", "APPROVED_1", "APPROVED_FINAL", "REJECTED"
    private String requestedBy;
    private LocalDateTime requestedAt;
    private String approvedBy1;
    private LocalDateTime approvedAt1;
    private String approvedByFinal;
    private LocalDateTime approvedAtFinal;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCustomerCode() {
        return customerCode;
    }

    public void setCustomerCode(String customerCode) {
        this.customerCode = customerCode;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getRequestReason() {
        return requestReason;
    }

    public void setRequestReason(String requestReason) {
        this.requestReason = requestReason;
    }

    public LocalDate getExpectedCollectionDate() {
        return expectedCollectionDate;
    }

    public void setExpectedCollectionDate(LocalDate expectedCollectionDate) {
        this.expectedCollectionDate = expectedCollectionDate;
    }

    public BigDecimal getExpectedAmount() {
        return expectedAmount;
    }

    public void setExpectedAmount(BigDecimal expectedAmount) {
        this.expectedAmount = expectedAmount;
    }

    public String getCollectionPlan() {
        return collectionPlan;
    }

    public void setCollectionPlan(String collectionPlan) {
        this.collectionPlan = collectionPlan;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(LocalDateTime requestedAt) {
        this.requestedAt = requestedAt;
    }

    public String getApprovedBy1() {
        return approvedBy1;
    }

    public void setApprovedBy1(String approvedBy1) {
        this.approvedBy1 = approvedBy1;
    }

    public LocalDateTime getApprovedAt1() {
        return approvedAt1;
    }

    public void setApprovedAt1(LocalDateTime approvedAt1) {
        this.approvedAt1 = approvedAt1;
    }

    public String getApprovedByFinal() {
        return approvedByFinal;
    }

    public void setApprovedByFinal(String approvedByFinal) {
        this.approvedByFinal = approvedByFinal;
    }

    public LocalDateTime getApprovedAtFinal() {
        return approvedAtFinal;
    }

    public void setApprovedAtFinal(LocalDateTime approvedAtFinal) {
        this.approvedAtFinal = approvedAtFinal;
    }
}
