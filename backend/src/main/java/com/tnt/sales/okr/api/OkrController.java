package com.tnt.sales.okr.api;

import com.tnt.sales.okr.model.OkrApproval;
import com.tnt.sales.okr.model.OkrCycle;
import com.tnt.sales.okr.model.OkrEvaluation;
import com.tnt.sales.okr.model.OkrItem;
import com.tnt.sales.okr.model.OkrMember;
import com.tnt.sales.okr.service.OkrService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/okr")
@RequiredArgsConstructor
public class OkrController {
    // Force reload

    private final OkrService okrService;

    // Cycle
    @PostMapping("/cycles")
    public ResponseEntity<OkrCycle> createCycle(@RequestBody OkrCycle cycle) {
        cycle.setCompanySeq(1L); // TODO: Get from context
        cycle.setCreatedBy(0L); // TODO: Get from context
        cycle.setUpdatedBy(0L);
        return ResponseEntity.ok(okrService.createCycle(cycle));
    }

    @GetMapping("/cycles")
    public ResponseEntity<List<OkrCycle>> getCycles() {
        return ResponseEntity.ok(okrService.getCycles(1L)); // TODO: Get companySeq
    }

    @PutMapping("/cycles/{id}")
    public ResponseEntity<OkrCycle> updateCycle(@PathVariable Long id, @RequestBody OkrCycle cycle) {
        cycle.setId(id);
        cycle.setUpdatedBy(0L); // TODO: Get from context
        return ResponseEntity.ok(okrService.updateCycle(cycle));
    }

    @DeleteMapping("/cycles/{id}")
    public ResponseEntity<Void> deleteCycle(@PathVariable Long id) {
        okrService.deleteCycle(id);
        return ResponseEntity.noContent().build();
    }

    // Item
    @PostMapping("/items")
    public ResponseEntity<OkrItem> createItem(@RequestBody ItemRequest request) {
        request.getItem().setCreatedBy(0L); // TODO
        request.getItem().setUpdatedBy(0L);
        return ResponseEntity.ok(okrService.createItem(request.getItem(), request.getMembers()));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<OkrItem> updateItem(@PathVariable Long id, @RequestBody ItemRequest request) {
        request.getItem().setId(id);
        request.getItem().setUpdatedBy(0L); // TODO
        return ResponseEntity.ok(okrService.updateItem(request.getItem(), request.getMembers()));
    }

    @GetMapping("/cycles/{cycleId}/tree")
    public ResponseEntity<List<OkrItem>> getOkrTree(@PathVariable Long cycleId) {
        return ResponseEntity.ok(okrService.getOkrTree(cycleId));
    }

    @GetMapping("/cycles/{cycleId}/my-items")
    public ResponseEntity<List<OkrItem>> getMyItems(@PathVariable Long cycleId, @RequestParam String ownerId) {
        return ResponseEntity.ok(okrService.getMyItems(cycleId, ownerId));
    }

    @GetMapping("/cycles/{cycleId}/member-items")
    public ResponseEntity<List<OkrItem>> getItemsByMember(@PathVariable Long cycleId, @RequestParam String assigneeId) {
        return ResponseEntity.ok(okrService.getItemsByMember(cycleId, assigneeId));
    }

    @GetMapping("/items/{itemId}/members")
    public ResponseEntity<List<OkrMember>> getMembers(@PathVariable Long itemId) {
        return ResponseEntity.ok(okrService.getMembers(itemId));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        okrService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/{id}/status")
    public ResponseEntity<Void> updateItemStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        okrService.updateItemStatus(id, request.getStatusCd());
        return ResponseEntity.ok().build();
    }

    // Approval endpoints
    @PostMapping("/items/{itemId}/submit")
    public ResponseEntity<OkrApproval> submitForApproval(
            @PathVariable Long itemId,
            @RequestBody ApprovalRequest request) {
        return ResponseEntity.ok(okrService.submitForApproval(itemId, request.getApproverId(), request.getComment()));
    }

    @PostMapping("/items/{itemId}/approve")
    public ResponseEntity<OkrApproval> approveItem(
            @PathVariable Long itemId,
            @RequestBody ApprovalRequest request) {
        return ResponseEntity.ok(okrService.approveItem(itemId, request.getApproverId(), request.getComment()));
    }

    @PostMapping("/items/{itemId}/reject")
    public ResponseEntity<OkrApproval> rejectItem(
            @PathVariable Long itemId,
            @RequestBody ApprovalRequest request) {
        return ResponseEntity.ok(okrService.rejectItem(itemId, request.getApproverId(), request.getComment()));
    }

    @GetMapping("/items/{itemId}/approvals")
    public ResponseEntity<List<OkrApproval>> getApprovalHistory(@PathVariable Long itemId) {
        return ResponseEntity.ok(okrService.getApprovalHistory(itemId));
    }

    @GetMapping("/cycles/{cycleId}/pending-approvals")
    public ResponseEntity<List<OkrItem>> getPendingApprovals(@PathVariable Long cycleId) {
        return ResponseEntity.ok(okrService.getPendingApprovalItems(cycleId));
    }

    // Evaluation endpoints
    @PostMapping("/items/{itemId}/evaluations")
    public ResponseEntity<OkrEvaluation> saveEvaluation(
            @PathVariable Long itemId,
            @RequestBody OkrEvaluation evaluation) {
        evaluation.setOkrItemId(itemId);
        return ResponseEntity.ok(okrService.saveEvaluation(evaluation));
    }

    @GetMapping("/items/{itemId}/evaluations")
    public ResponseEntity<List<OkrEvaluation>> getEvaluations(@PathVariable Long itemId) {
        return ResponseEntity.ok(okrService.getEvaluations(itemId));
    }

    @Data
    public static class ItemRequest {
        private OkrItem item;
        private List<OkrMember> members;
    }

    @Data
    public static class ApprovalRequest {
        private String approverId;
        private String comment;
    }

    @Data
    public static class StatusRequest {
        private String statusCd;
    }
}
