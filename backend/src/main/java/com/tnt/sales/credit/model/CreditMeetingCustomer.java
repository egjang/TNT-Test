package com.tnt.sales.credit.model;

import java.math.BigDecimal;

public class CreditMeetingCustomer {
    private Long id;
    private Long meetingId;
    private String customerCode;
    private String customerName;
    private String riskLevel; // "high", "medium", "low"
    private BigDecimal totalAr;
    private BigDecimal overdueAr;
    private String salesRepName;
    private String salesOpinion; // 영업사원 의견
    private String reviewStatus; // "REVIEW_NEEDED", "UNBLOCK_REQ", "NORMAL"

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMeetingId() {
        return meetingId;
    }

    public void setMeetingId(Long meetingId) {
        this.meetingId = meetingId;
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

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public BigDecimal getTotalAr() {
        return totalAr;
    }

    public void setTotalAr(BigDecimal totalAr) {
        this.totalAr = totalAr;
    }

    public BigDecimal getOverdueAr() {
        return overdueAr;
    }

    public void setOverdueAr(BigDecimal overdueAr) {
        this.overdueAr = overdueAr;
    }

    public String getSalesRepName() {
        return salesRepName;
    }

    public void setSalesRepName(String salesRepName) {
        this.salesRepName = salesRepName;
    }

    public String getSalesOpinion() {
        return salesOpinion;
    }

    public void setSalesOpinion(String salesOpinion) {
        this.salesOpinion = salesOpinion;
    }

    public String getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }
}
