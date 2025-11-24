package com.tnt.sales.credit.model;

import java.time.LocalDateTime;

public class CreditMeeting {
    private Long id;
    private String meetingName;
    private LocalDateTime meetingDate;
    private String meetingStatus; // "IN_PROGRESS", "CLOSED"
    private Integer customerCount;
    private Integer highRiskCount;
    private Integer mediumRiskCount;
    private Integer lowRiskCount;
    private LocalDateTime createdAt;
    private String createdBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMeetingName() {
        return meetingName;
    }

    public void setMeetingName(String meetingName) {
        this.meetingName = meetingName;
    }

    public LocalDateTime getMeetingDate() {
        return meetingDate;
    }

    public void setMeetingDate(LocalDateTime meetingDate) {
        this.meetingDate = meetingDate;
    }

    public String getMeetingStatus() {
        return meetingStatus;
    }

    public void setMeetingStatus(String meetingStatus) {
        this.meetingStatus = meetingStatus;
    }

    public Integer getCustomerCount() {
        return customerCount;
    }

    public void setCustomerCount(Integer customerCount) {
        this.customerCount = customerCount;
    }

    public Integer getHighRiskCount() {
        return highRiskCount;
    }

    public void setHighRiskCount(Integer highRiskCount) {
        this.highRiskCount = highRiskCount;
    }

    public Integer getMediumRiskCount() {
        return mediumRiskCount;
    }

    public void setMediumRiskCount(Integer mediumRiskCount) {
        this.mediumRiskCount = mediumRiskCount;
    }

    public Integer getLowRiskCount() {
        return lowRiskCount;
    }

    public void setLowRiskCount(Integer lowRiskCount) {
        this.lowRiskCount = lowRiskCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
