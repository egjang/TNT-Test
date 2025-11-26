package com.tnt.sales.competitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Competitor {
    private Long competitorId;
    private String competitorName;
    private String country;
    private String homepage;
    private Integer foundedYear;
    private String description;
    private String marketPositionCd;
    private String distributionModel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
