package com.tnt.sales.inventory.api;

import com.tnt.sales.inventory.PromotionService;
import com.tnt.sales.inventory.model.Promotion;
import com.tnt.sales.inventory.model.PromotionItem;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/promotions")
public class PromotionController {

    private final PromotionService promotionService;

    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    public ResponseEntity<List<Promotion>> getPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    @PostMapping
    public ResponseEntity<Promotion> createPromotion(@RequestBody Promotion promotion) {
        return ResponseEntity.ok(promotionService.createPromotion(promotion));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<Void> addItemsToPromotion(@PathVariable Long id, @RequestBody List<PromotionItem> items) {
        promotionService.addItemsToPromotion(id, items);
        return ResponseEntity.ok().build();
    }
}
