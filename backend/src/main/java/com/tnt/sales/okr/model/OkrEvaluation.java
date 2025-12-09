package com.tnt.sales.okr.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class OkrEvaluation {
    private Long id;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;
    private Long okrItemId;
    private String evaluatorId;
    private String evaluationTypeCd; // SELF, MANAGER
    private Integer score; // 1-5
    private BigDecimal achievementRate;
    private String comment;

    // Join fields
    private String evaluatorName;
    private String okrTitle;
}
