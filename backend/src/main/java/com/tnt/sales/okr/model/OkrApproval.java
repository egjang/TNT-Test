package com.tnt.sales.okr.model;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class OkrApproval {
    private Long id;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;
    private Long okrItemId;
    private String approverId;
    private String actionCd; // SUBMITTED, APPROVED, REJECTED
    private String comment;

    // Join fields
    private String approverName;
    private String okrTitle;
    private String ownerName;
}
