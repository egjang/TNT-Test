package com.tnt.sales.competitor.model;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CompetitorInsight {
    private Long insightId;
    private Long competitorId;
    private Long productId;
    private String insightCategoryCd;
    private String insightTypeCd;
    private String title;
    private String description;
    private String impactLevelCd;
    private String impactAnalysis;
    private String region;
    private String reporterId;
    private String source;
    private String evidenceUrl;
    private String attachmentUrl;
    private LocalDate eventDate;
    private LocalDate detectedDate;
    private LocalDateTime reportedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
