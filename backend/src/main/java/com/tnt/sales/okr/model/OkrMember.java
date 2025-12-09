package com.tnt.sales.okr.model;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class OkrMember {
    private Long id;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;
    private Long companySeq;
    private String assigneeId;
    private String empName;
    private Long deptSeq;
    private String deptName;
    private String okrRoleCd;
    private Long okrItemId;
}
