package com.tnt.sales.okr.service;

import com.tnt.sales.okr.mapper.OkrMapper;
import com.tnt.sales.okr.model.OkrApproval;
import com.tnt.sales.okr.model.OkrCycle;
import com.tnt.sales.okr.model.OkrEvaluation;
import com.tnt.sales.okr.model.OkrItem;
import com.tnt.sales.okr.model.OkrMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OkrService {

    private final OkrMapper okrMapper;

    // Cycle
    @Transactional
    public OkrCycle createCycle(OkrCycle cycle) {
        okrMapper.insertCycle(cycle);
        return cycle;
    }

    public List<OkrCycle> getCycles(Long companySeq) {
        Map<String, Object> params = new HashMap<>();
        params.put("companySeq", companySeq);
        return okrMapper.findAllCycles(params);
    }

    @Transactional
    public OkrCycle updateCycle(OkrCycle cycle) {
        okrMapper.updateCycle(cycle);
        return cycle;
    }

    @Transactional
    public void deleteCycle(Long id) {
        int itemCount = okrMapper.countItemsByCycleId(id);
        if (itemCount > 0) {
            throw new IllegalStateException("해당 사이클에 등록된 OKR이 " + itemCount + "개 있습니다. 먼저 OKR을 삭제해주세요.");
        }
        okrMapper.deleteCycle(id);
    }

    // Item
    @Transactional
    public OkrItem createItem(OkrItem item, List<OkrMember> members) {
        okrMapper.insertItem(item);
        if (members != null && !members.isEmpty()) {
            for (OkrMember member : members) {
                member.setOkrItemId(item.getId());
                member.setCompanySeq(1L); // TODO: Get from context
                okrMapper.insertMember(member);
            }
        }
        return item;
    }

    @Transactional
    public OkrItem updateItem(OkrItem item, List<OkrMember> members) {
        okrMapper.updateItem(item);

        // Update members: delete all and re-insert (simple approach)
        okrMapper.deleteMembersByItemId(item.getId());
        if (members != null && !members.isEmpty()) {
            for (OkrMember member : members) {
                member.setOkrItemId(item.getId());
                member.setCompanySeq(1L); // TODO: Get from context
                okrMapper.insertMember(member);
            }
        }
        return item;
    }

    public List<OkrItem> getOkrTree(Long cycleId) {
        List<OkrItem> allItems = okrMapper.findItemsByCycleId(cycleId);
        return buildTree(allItems);
    }

    public List<OkrItem> getMyItems(Long cycleId, String ownerId) {
        Map<String, Object> params = new HashMap<>();
        params.put("cycleId", cycleId);
        params.put("ownerId", ownerId);
        return okrMapper.findItemsByOwnerId(params);
    }

    public List<OkrItem> getItemsByMember(Long cycleId, String assigneeId) {
        Map<String, Object> params = new HashMap<>();
        params.put("cycleId", cycleId);
        params.put("assigneeId", assigneeId);
        return okrMapper.findItemsByMemberAssigneeId(params);
    }

    private List<OkrItem> buildTree(List<OkrItem> items) {
        Map<Long, OkrItem> itemMap = new HashMap<>();
        List<OkrItem> roots = new ArrayList<>();

        for (OkrItem item : items) {
            item.setChildren(new ArrayList<>());
            itemMap.put(item.getId(), item);
        }

        for (OkrItem item : items) {
            if (item.getParentOkrItemId() == null) {
                roots.add(item);
            } else {
                OkrItem parent = itemMap.get(item.getParentOkrItemId());
                if (parent != null) {
                    parent.getChildren().add(item);
                } else {
                    // Orphaned item, treat as root or handle error
                    roots.add(item);
                }
            }
        }
        return roots;
    }

    public List<OkrMember> getMembers(Long itemId) {
        return okrMapper.findMembersByItemId(itemId);
    }

    @Transactional
    public void deleteItem(Long id) {
        int childCount = okrMapper.countChildItems(id);
        if (childCount > 0) {
            throw new IllegalStateException("하위 항목이 " + childCount + "개 있습니다. 먼저 하위 항목을 삭제해주세요.");
        }
        // Delete members first
        okrMapper.deleteMembersByItemId(id);
        // Delete the item
        okrMapper.deleteItem(id);
    }

    @Transactional
    public void updateItemStatus(Long id, String statusCd) {
        okrMapper.updateItemStatus(id, statusCd);
    }

    // Approval
    @Transactional
    public OkrApproval submitForApproval(Long itemId, String approverId, String comment) {
        // Update item status to SUBMITTED
        OkrItem item = okrMapper.findItemById(itemId);
        if (item != null) {
            item.setStatusCd("SUBMITTED");
            okrMapper.updateItem(item);
        }

        // Create approval record
        OkrApproval approval = new OkrApproval();
        approval.setOkrItemId(itemId);
        approval.setApproverId(approverId);
        approval.setActionCd("SUBMITTED");
        approval.setComment(comment);
        approval.setCreatedBy(0L);
        approval.setUpdatedBy(0L);
        okrMapper.insertApproval(approval);
        return approval;
    }

    @Transactional
    public OkrApproval approveItem(Long itemId, String approverId, String comment) {
        // Update item status to IN_PROGRESS (approved)
        OkrItem item = okrMapper.findItemById(itemId);
        if (item != null) {
            item.setStatusCd("IN_PROGRESS");
            okrMapper.updateItem(item);
        }

        // Create approval record
        OkrApproval approval = new OkrApproval();
        approval.setOkrItemId(itemId);
        approval.setApproverId(approverId);
        approval.setActionCd("APPROVED");
        approval.setComment(comment);
        approval.setCreatedBy(0L);
        approval.setUpdatedBy(0L);
        okrMapper.insertApproval(approval);
        return approval;
    }

    @Transactional
    public OkrApproval rejectItem(Long itemId, String approverId, String comment) {
        // Update item status back to DRAFT
        OkrItem item = okrMapper.findItemById(itemId);
        if (item != null) {
            item.setStatusCd("DRAFT");
            okrMapper.updateItem(item);
        }

        // Create approval record
        OkrApproval approval = new OkrApproval();
        approval.setOkrItemId(itemId);
        approval.setApproverId(approverId);
        approval.setActionCd("REJECTED");
        approval.setComment(comment);
        approval.setCreatedBy(0L);
        approval.setUpdatedBy(0L);
        okrMapper.insertApproval(approval);
        return approval;
    }

    public List<OkrApproval> getApprovalHistory(Long itemId) {
        return okrMapper.findApprovalsByItemId(itemId);
    }

    public List<OkrItem> getPendingApprovalItems(Long cycleId) {
        Map<String, Object> params = new HashMap<>();
        params.put("cycleId", cycleId);
        return okrMapper.findPendingApprovalItems(params);
    }

    // Evaluation
    @Transactional
    public OkrEvaluation saveEvaluation(OkrEvaluation evaluation) {
        Map<String, Object> params = new HashMap<>();
        params.put("itemId", evaluation.getOkrItemId());
        params.put("evaluatorId", evaluation.getEvaluatorId());
        params.put("evaluationTypeCd", evaluation.getEvaluationTypeCd());

        OkrEvaluation existing = okrMapper.findEvaluationByItemAndEvaluator(params);
        if (existing != null) {
            existing.setScore(evaluation.getScore());
            existing.setAchievementRate(evaluation.getAchievementRate());
            existing.setComment(evaluation.getComment());
            existing.setUpdatedBy(0L);
            okrMapper.updateEvaluation(existing);
            return existing;
        } else {
            evaluation.setCreatedBy(0L);
            evaluation.setUpdatedBy(0L);
            okrMapper.insertEvaluation(evaluation);
            return evaluation;
        }
    }

    public List<OkrEvaluation> getEvaluations(Long itemId) {
        return okrMapper.findEvaluationsByItemId(itemId);
    }
}
