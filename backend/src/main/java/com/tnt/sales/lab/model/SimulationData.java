package com.tnt.sales.lab.model;

import java.math.BigDecimal;
import java.util.List;

public class SimulationData {
    private Long customerSeq;
    private String customerName;

    // Factor 1: Transaction Volume
    private BigDecimal volumeYear2; // 2 years ago
    private BigDecimal volumeYear1; // Last year
    private BigDecimal volumeCurrent; // This year
    private BigDecimal volumeGrowthRate; // YoY Growth
    private int volumeScore; // 0-100

    // Factor 2: Credit Aging
    private BigDecimal totalAr;
    private BigDecimal overdueAr; // > 1 month (or configurable)
    private BigDecimal overdueRatio; // overdue / total
    private int agingScore; // 0-100

    // Factor 3: Credit Rating
    private String ratingAgency;
    private String ratingGrade;
    private int ratingScore; // 0-100

    // Factor 4: Rep Assessment
    private int assessmentScore; // 0-100 (converted from 1-5)
    private String assessmentComment;

    // Result
    private int totalScore; // Weighted average
    private BigDecimal suggestedIncreaseRate; // %

    // Items
    private List<SimulationItem> items;

    public static class SimulationItem {
        private Long itemSeq;
        private String itemName;
        private String itemUnit;
        private BigDecimal recentUnitPrice;
        private BigDecimal recentQty;
        private BigDecimal simulatedUnitPrice;

        // Getters and Setters
        public Long getItemSeq() {
            return itemSeq;
        }

        public void setItemSeq(Long itemSeq) {
            this.itemSeq = itemSeq;
        }

        public String getItemName() {
            return itemName;
        }

        public void setItemName(String itemName) {
            this.itemName = itemName;
        }

        public String getItemUnit() {
            return itemUnit;
        }

        public void setItemUnit(String itemUnit) {
            this.itemUnit = itemUnit;
        }

        public BigDecimal getRecentUnitPrice() {
            return recentUnitPrice;
        }

        public void setRecentUnitPrice(BigDecimal recentUnitPrice) {
            this.recentUnitPrice = recentUnitPrice;
        }

        public BigDecimal getRecentQty() {
            return recentQty;
        }

        public void setRecentQty(BigDecimal recentQty) {
            this.recentQty = recentQty;
        }

        public BigDecimal getSimulatedUnitPrice() {
            return simulatedUnitPrice;
        }

        public void setSimulatedUnitPrice(BigDecimal simulatedUnitPrice) {
            this.simulatedUnitPrice = simulatedUnitPrice;
        }
    }

    // Getters and Setters
    public Long getCustomerSeq() {
        return customerSeq;
    }

    public void setCustomerSeq(Long customerSeq) {
        this.customerSeq = customerSeq;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public BigDecimal getVolumeYear2() {
        return volumeYear2;
    }

    public void setVolumeYear2(BigDecimal volumeYear2) {
        this.volumeYear2 = volumeYear2;
    }

    public BigDecimal getVolumeYear1() {
        return volumeYear1;
    }

    public void setVolumeYear1(BigDecimal volumeYear1) {
        this.volumeYear1 = volumeYear1;
    }

    public BigDecimal getVolumeCurrent() {
        return volumeCurrent;
    }

    public void setVolumeCurrent(BigDecimal volumeCurrent) {
        this.volumeCurrent = volumeCurrent;
    }

    public BigDecimal getVolumeGrowthRate() {
        return volumeGrowthRate;
    }

    public void setVolumeGrowthRate(BigDecimal volumeGrowthRate) {
        this.volumeGrowthRate = volumeGrowthRate;
    }

    public int getVolumeScore() {
        return volumeScore;
    }

    public void setVolumeScore(int volumeScore) {
        this.volumeScore = volumeScore;
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

    public BigDecimal getOverdueRatio() {
        return overdueRatio;
    }

    public void setOverdueRatio(BigDecimal overdueRatio) {
        this.overdueRatio = overdueRatio;
    }

    public int getAgingScore() {
        return agingScore;
    }

    public void setAgingScore(int agingScore) {
        this.agingScore = agingScore;
    }

    public String getRatingAgency() {
        return ratingAgency;
    }

    public void setRatingAgency(String ratingAgency) {
        this.ratingAgency = ratingAgency;
    }

    public String getRatingGrade() {
        return ratingGrade;
    }

    public void setRatingGrade(String ratingGrade) {
        this.ratingGrade = ratingGrade;
    }

    public int getRatingScore() {
        return ratingScore;
    }

    public void setRatingScore(int ratingScore) {
        this.ratingScore = ratingScore;
    }

    public int getAssessmentScore() {
        return assessmentScore;
    }

    public void setAssessmentScore(int assessmentScore) {
        this.assessmentScore = assessmentScore;
    }

    public String getAssessmentComment() {
        return assessmentComment;
    }

    public void setAssessmentComment(String assessmentComment) {
        this.assessmentComment = assessmentComment;
    }

    public int getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(int totalScore) {
        this.totalScore = totalScore;
    }

    public BigDecimal getSuggestedIncreaseRate() {
        return suggestedIncreaseRate;
    }

    public void setSuggestedIncreaseRate(BigDecimal suggestedIncreaseRate) {
        this.suggestedIncreaseRate = suggestedIncreaseRate;
    }

    public List<SimulationItem> getItems() {
        return items;
    }

    public void setItems(List<SimulationItem> items) {
        this.items = items;
    }
}
