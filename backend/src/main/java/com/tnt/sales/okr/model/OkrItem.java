package com.tnt.sales.okr.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
public class OkrItem {
    private Long id;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;
    private Long okrCycleId;
    private String ownerId;
    private Long parentOkrItemId;
    private String okrTypeCd;
    private String okrTitle;
    private String okrDescription;
    private BigDecimal targetValue;
    private BigDecimal currentValue;
    private String unit;
    private String targetDirection;
    private BigDecimal progressRate;
    private BigDecimal weightRate;
    private String statusCd;
    private Integer sortOrder;

    // For tree view
    private List<OkrItem> children;
    private String ownerName; // To be populated from employee table
}
