package com.tnt.sales.credit.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public class CreditArAging {
    private Long id;
    private String companyType;
    private Long customerSeq;
    private String customerNo;
    private String customerName;
    private String channelName;
    private String bizNo;
    private String deptName;
    private Long deptSeq;
    private String assigneeId;
    private String empName;
    private String currencyName;
    private BigDecimal totalAr;
    private BigDecimal aging030;
    private BigDecimal aging3160;
    private BigDecimal aging6190;
    private BigDecimal aging91120;
    private BigDecimal aging121150;
    private BigDecimal aging151180;
    private BigDecimal aging181210;
    private BigDecimal aging211240;
    private BigDecimal aging241270;
    private BigDecimal aging271300;
    private BigDecimal aging301330;
    private BigDecimal aging331365;
    private BigDecimal agingOver365;
    private LocalDate snapshotDate;
    private String createdBy;
    private String updatedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCompanyType() {
        return companyType;
    }

    public void setCompanyType(String companyType) {
        this.companyType = companyType;
    }

    public Long getCustomerSeq() {
        return customerSeq;
    }

    public void setCustomerSeq(Long customerSeq) {
        this.customerSeq = customerSeq;
    }

    public String getCustomerNo() {
        return customerNo;
    }

    public void setCustomerNo(String customerNo) {
        this.customerNo = customerNo;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getChannelName() {
        return channelName;
    }

    public void setChannelName(String channelName) {
        this.channelName = channelName;
    }

    public String getBizNo() {
        return bizNo;
    }

    public void setBizNo(String bizNo) {
        this.bizNo = bizNo;
    }

    public String getDeptName() {
        return deptName;
    }

    public void setDeptName(String deptName) {
        this.deptName = deptName;
    }

    public Long getDeptSeq() {
        return deptSeq;
    }

    public void setDeptSeq(Long deptSeq) {
        this.deptSeq = deptSeq;
    }

    public String getAssigneeId() {
        return assigneeId;
    }

    public void setAssigneeId(String assigneeId) {
        this.assigneeId = assigneeId;
    }

    public String getEmpName() {
        return empName;
    }

    public void setEmpName(String empName) {
        this.empName = empName;
    }

    public String getCurrencyName() {
        return currencyName;
    }

    public void setCurrencyName(String currencyName) {
        this.currencyName = currencyName;
    }

    public BigDecimal getTotalAr() {
        return totalAr;
    }

    public void setTotalAr(BigDecimal totalAr) {
        this.totalAr = totalAr;
    }

    public BigDecimal getAging030() {
        return aging030;
    }

    public void setAging030(BigDecimal aging030) {
        this.aging030 = aging030;
    }

    public BigDecimal getAging3160() {
        return aging3160;
    }

    public void setAging3160(BigDecimal aging3160) {
        this.aging3160 = aging3160;
    }

    public BigDecimal getAging6190() {
        return aging6190;
    }

    public void setAging6190(BigDecimal aging6190) {
        this.aging6190 = aging6190;
    }

    public BigDecimal getAging91120() {
        return aging91120;
    }

    public void setAging91120(BigDecimal aging91120) {
        this.aging91120 = aging91120;
    }

    public BigDecimal getAging121150() {
        return aging121150;
    }

    public void setAging121150(BigDecimal aging121150) {
        this.aging121150 = aging121150;
    }

    public BigDecimal getAging151180() {
        return aging151180;
    }

    public void setAging151180(BigDecimal aging151180) {
        this.aging151180 = aging151180;
    }

    public BigDecimal getAging181210() {
        return aging181210;
    }

    public void setAging181210(BigDecimal aging181210) {
        this.aging181210 = aging181210;
    }

    public BigDecimal getAging211240() {
        return aging211240;
    }

    public void setAging211240(BigDecimal aging211240) {
        this.aging211240 = aging211240;
    }

    public BigDecimal getAging241270() {
        return aging241270;
    }

    public void setAging241270(BigDecimal aging241270) {
        this.aging241270 = aging241270;
    }

    public BigDecimal getAging271300() {
        return aging271300;
    }

    public void setAging271300(BigDecimal aging271300) {
        this.aging271300 = aging271300;
    }

    public BigDecimal getAging301330() {
        return aging301330;
    }

    public void setAging301330(BigDecimal aging301330) {
        this.aging301330 = aging301330;
    }

    public BigDecimal getAging331365() {
        return aging331365;
    }

    public void setAging331365(BigDecimal aging331365) {
        this.aging331365 = aging331365;
    }

    public BigDecimal getAgingOver365() {
        return agingOver365;
    }

    public void setAgingOver365(BigDecimal agingOver365) {
        this.agingOver365 = agingOver365;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDate snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
