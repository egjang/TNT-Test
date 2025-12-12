package com.tnt.sales.promotion.api;

import com.tnt.sales.promotion.service.PromotionPlanningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/promotion")
@RequiredArgsConstructor
public class PromotionPlanningController {

    private final PromotionPlanningService promotionService;

    /**
     * 창고 목록 조회
     */
    @GetMapping("/warehouses")
    public ResponseEntity<Map<String, Object>> getWarehouses(
            @RequestParam(defaultValue = "TNT") String companyType) {
        log.info("GET /api/v1/promotion/warehouses - companyType: {}", companyType);

        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> warehouses = promotionService.getWarehouses(companyType);
            response.put("success", true);
            response.put("warehouses", warehouses);
        } catch (Exception e) {
            log.error("창고 목록 조회 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 영업관리단위 목록 조회
     */
    @GetMapping("/sales-mgmt-units")
    public ResponseEntity<Map<String, Object>> getSalesMgmtUnits(
            @RequestParam(defaultValue = "TNT") String companyType) {
        log.info("GET /api/v1/promotion/sales-mgmt-units - companyType: {}", companyType);

        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> units = promotionService.getSalesMgmtUnits(companyType);
            response.put("success", true);
            response.put("units", units);
        } catch (Exception e) {
            log.error("영업관리단위 목록 조회 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 유통기한 재고 조회 (프로모션 대상)
     */
    @GetMapping("/expiry-stocks")
    public ResponseEntity<Map<String, Object>> getExpiryStocks(
            @RequestParam(defaultValue = "TNT") String companyType,
            @RequestParam(defaultValue = "60") int remainDays,
            @RequestParam(required = false) Long whSeq,
            @RequestParam(required = false) String salesMgmtUnit) {
        log.info("GET /api/v1/promotion/expiry-stocks - companyType: {}, remainDays: {}, whSeq: {}, salesMgmtUnit: {}",
                companyType, remainDays, whSeq, salesMgmtUnit);

        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> stocks = promotionService.getExpiryStocks(
                    companyType, remainDays, whSeq, salesMgmtUnit);
            response.put("success", true);
            response.put("stocks", stocks);
            response.put("total", stocks.size());
        } catch (Exception e) {
            log.error("유통기한 재고 조회 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 프로모션 저장 (임시저장)
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> savePromotion(@RequestBody Map<String, Object> payload) {
        log.info("POST /api/v1/promotion/save");

        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> result = promotionService.savePromotion(payload);
            response.put("success", true);
            response.putAll(result);
        } catch (Exception e) {
            log.error("프로모션 저장 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 프로모션 확정
     */
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmPromotion(@RequestBody Map<String, Object> payload) {
        log.info("POST /api/v1/promotion/confirm");

        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> result = promotionService.confirmPromotion(payload);
            response.put("success", true);
            response.putAll(result);
        } catch (Exception e) {
            log.error("프로모션 확정 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 프로모션 목록 조회
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getPromotionList(
            @RequestParam(defaultValue = "TNT") String companyType,
            @RequestParam(required = false) String status) {
        log.info("GET /api/v1/promotion/list - companyType: {}, status: {}", companyType, status);

        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> promotions = promotionService.getPromotionList(companyType, status);
            response.put("success", true);
            response.put("promotions", promotions);
            response.put("total", promotions.size());
        } catch (Exception e) {
            log.error("프로모션 목록 조회 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 프로모션 상세 조회
     */
    @GetMapping("/{promotionId}")
    public ResponseEntity<Map<String, Object>> getPromotionDetail(@PathVariable Long promotionId) {
        log.info("GET /api/v1/promotion/{}", promotionId);

        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> promotion = promotionService.getPromotionDetail(promotionId);
            response.put("success", true);
            response.put("promotion", promotion);
        } catch (Exception e) {
            log.error("프로모션 상세 조회 실패", e);
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }
}
