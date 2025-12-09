package com.tnt.sales.okr.mapper;

import com.tnt.sales.okr.model.OkrApproval;
import com.tnt.sales.okr.model.OkrCycle;
import com.tnt.sales.okr.model.OkrEvaluation;
import com.tnt.sales.okr.model.OkrItem;
import com.tnt.sales.okr.model.OkrMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface OkrMapper {
    // Cycle
    void insertCycle(OkrCycle cycle);

    void updateCycle(OkrCycle cycle);

    List<OkrCycle> findAllCycles(Map<String, Object> params);

    OkrCycle findCycleById(Long id);

    void deleteCycle(Long id);

    int countItemsByCycleId(Long cycleId);

    // Item
    void insertItem(OkrItem item);

    void updateItem(OkrItem item);

    List<OkrItem> findItemsByCycleId(Long cycleId);

    List<OkrItem> findItemsByOwnerId(Map<String, Object> params);

    OkrItem findItemById(Long id);

    void deleteItem(Long id);

    void updateItemStatus(@Param("id") Long id, @Param("statusCd") String statusCd);

    int countChildItems(Long parentItemId);

    List<OkrItem> findItemsByMemberAssigneeId(Map<String, Object> params);

    List<OkrItem> findPendingApprovalItems(Map<String, Object> params);

    // Member
    void insertMember(OkrMember member);

    List<OkrMember> findMembersByItemId(Long itemId);

    void deleteMembersByItemId(Long itemId);

    // Approval
    void insertApproval(OkrApproval approval);

    List<OkrApproval> findApprovalsByItemId(Long itemId);

    List<OkrApproval> findApprovalsByApproverId(String approverId);

    // Evaluation
    void insertEvaluation(OkrEvaluation evaluation);

    void updateEvaluation(OkrEvaluation evaluation);

    List<OkrEvaluation> findEvaluationsByItemId(Long itemId);

    OkrEvaluation findEvaluationByItemAndEvaluator(Map<String, Object> params);
}
