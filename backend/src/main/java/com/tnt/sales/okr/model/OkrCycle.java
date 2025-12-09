package com.tnt.sales.okr.model;

import lombok.Data;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
public class OkrCycle {
    private Long id;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;
    private Long companySeq;
    private String cycleName;
    private String cycleTypeCd;
    private LocalDate startDate;
    private LocalDate endDate;
    private String statusCd;
}
