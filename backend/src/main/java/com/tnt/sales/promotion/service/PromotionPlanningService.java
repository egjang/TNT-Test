package com.tnt.sales.promotion.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class PromotionPlanningService {

    private final JdbcTemplate pgJdbc;

    public PromotionPlanningService(@Qualifier("pgJdbcTemplate") JdbcTemplate pgJdbc) {
        this.pgJdbc = pgJdbc;
    }

    /**
     * 창고 목록 조회
     */
    public List<Map<String, Object>> getWarehouses(String companyType) {
        String sql = """
                SELECT DISTINCT wh_seq as "whSeq", wh_name as "whName"
                FROM lg_expiry_stock
                WHERE src_bizunit = ?
                  AND wh_seq IS NOT NULL
                ORDER BY wh_name
                """;
        return pgJdbc.queryForList(sql, companyType);
    }

    /**
     * 영업관리단위 목록 조회
     */
    public List<Map<String, Object>> getSalesMgmtUnits(String companyType) {
        String sql = """
                SELECT DISTINCT i.sales_mgmt_unit as "salesMgmtUnit"
                FROM item i
                WHERE i.company_type = ?
                  AND i.sales_mgmt_unit IS NOT NULL
                  AND i.sales_mgmt_unit != ''
                ORDER BY i.sales_mgmt_unit
                """;
        return pgJdbc.queryForList(sql, companyType);
    }

    /**
     * 유통기한 재고 조회 (프로모션 대상)
     */
    public List<Map<String, Object>> getExpiryStocks(
            String companyType, int remainDays, Long whSeq, String salesMgmtUnit) {

        StringBuilder sql = new StringBuilder("""
                SELECT
                    e.id,
                    e.item_seq as "itemSeq",
                    e.item_no as "itemNo",
                    e.item_name as "itemName",
                    e.lot_no as "lotNo",
                    e.wh_seq as "whSeq",
                    e.wh_name as "whName",
                    e.exp_date as "expDate",
                    e.remain_day as "remainDay",
                    e.stock_qty as "stockQty",
                    COALESCE(i.unit_price, 0) as "unitPrice",
                    COALESCE(i.sales_mgmt_unit, '') as "salesMgmtUnit",
                    COALESCE(e.item_subcategory, '') as "itemSubcategory"
                FROM lg_expiry_stock e
                LEFT JOIN item i ON e.item_no = i.item_no AND i.company_type = ?
                WHERE e.src_bizunit = ?
                  AND e.stock_qty > 0
                """);

        List<Object> params = new ArrayList<>();
        params.add(companyType);
        params.add(companyType);

        // 잔여일수 조건 (99999가 아닌 경우에만)
        if (remainDays < 99999) {
            sql.append(" AND e.remain_day <= ?");
            params.add(remainDays);
        }

        // 창고 조건
        if (whSeq != null) {
            sql.append(" AND e.wh_seq = ?");
            params.add(whSeq);
        }

        // 영업관리단위 조건
        if (salesMgmtUnit != null && !salesMgmtUnit.isEmpty()) {
            sql.append(" AND i.sales_mgmt_unit = ?");
            params.add(salesMgmtUnit);
        }

        sql.append(" ORDER BY e.remain_day ASC, e.item_name");

        return pgJdbc.queryForList(sql.toString(), params.toArray());
    }

    /**
     * 프로모션 코드 생성
     */
    private String generatePromoCode() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        // 오늘 생성된 프로모션 수 조회
        String sql = "SELECT COUNT(*) FROM promotion_v2 WHERE promo_code LIKE ?";
        int count = pgJdbc.queryForObject(sql, Integer.class, "PRO" + dateStr + "%");

        return String.format("PRO%s%03d", dateStr, count + 1);
    }

    /**
     * 프로모션 저장 (임시저장)
     */
    @Transactional
    public Map<String, Object> savePromotion(Map<String, Object> payload) {
        Long promotionId = payload.get("id") != null
                ? Long.valueOf(payload.get("id").toString())
                : null;

        String promoCode;
        if (promotionId == null) {
            // 신규 생성
            promoCode = generatePromoCode();
            String insertSql = """
                    INSERT INTO promotion_v2 (
                        promo_code, promo_name, company_type, discount_rate,
                        start_date, end_date, status, description,
                        total_stock_qty, total_original_amt, total_promo_amt, expected_loss,
                        search_remain_days, search_wh_seq, search_sales_mgmt_unit
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING id
                    """;

            promotionId = pgJdbc.queryForObject(insertSql, Long.class,
                    promoCode,
                    payload.get("promoName"),
                    payload.getOrDefault("companyType", "TNT"),
                    payload.get("discountRate") != null ? new BigDecimal(payload.get("discountRate").toString()) : null,
                    parseDate(payload.get("startDate")),
                    parseDate(payload.get("endDate")),
                    "DRAFT",
                    payload.get("description"),
                    payload.get("totalStockQty") != null ? new BigDecimal(payload.get("totalStockQty").toString()) : null,
                    payload.get("totalOriginalAmt") != null ? new BigDecimal(payload.get("totalOriginalAmt").toString()) : null,
                    payload.get("totalPromoAmt") != null ? new BigDecimal(payload.get("totalPromoAmt").toString()) : null,
                    payload.get("expectedLoss") != null ? new BigDecimal(payload.get("expectedLoss").toString()) : null,
                    payload.get("searchRemainDays"),
                    payload.get("searchWhSeq"),
                    payload.get("searchSalesMgmtUnit")
            );
        } else {
            // 업데이트
            promoCode = (String) payload.get("promoCode");
            String updateSql = """
                    UPDATE promotion_v2 SET
                        promo_name = ?, discount_rate = ?,
                        start_date = ?, end_date = ?, description = ?,
                        total_stock_qty = ?, total_original_amt = ?,
                        total_promo_amt = ?, expected_loss = ?,
                        search_remain_days = ?, search_wh_seq = ?, search_sales_mgmt_unit = ?,
                        updated_at = now()
                    WHERE id = ?
                    """;

            pgJdbc.update(updateSql,
                    payload.get("promoName"),
                    payload.get("discountRate") != null ? new BigDecimal(payload.get("discountRate").toString()) : null,
                    parseDate(payload.get("startDate")),
                    parseDate(payload.get("endDate")),
                    payload.get("description"),
                    payload.get("totalStockQty") != null ? new BigDecimal(payload.get("totalStockQty").toString()) : null,
                    payload.get("totalOriginalAmt") != null ? new BigDecimal(payload.get("totalOriginalAmt").toString()) : null,
                    payload.get("totalPromoAmt") != null ? new BigDecimal(payload.get("totalPromoAmt").toString()) : null,
                    payload.get("expectedLoss") != null ? new BigDecimal(payload.get("expectedLoss").toString()) : null,
                    payload.get("searchRemainDays"),
                    payload.get("searchWhSeq"),
                    payload.get("searchSalesMgmtUnit"),
                    promotionId
            );

            // 기존 아이템 삭제
            pgJdbc.update("DELETE FROM promotion_item_v2 WHERE promotion_id = ?", promotionId);
        }

        // 프로모션 아이템 저장
        savePromotionItems(promotionId, payload);

        Map<String, Object> result = new HashMap<>();
        result.put("promotionId", promotionId);
        result.put("promoCode", promoCode);
        return result;
    }

    /**
     * 프로모션 확정
     */
    @Transactional
    public Map<String, Object> confirmPromotion(Map<String, Object> payload) {
        // 먼저 저장
        Map<String, Object> saveResult = savePromotion(payload);
        Long promotionId = (Long) saveResult.get("promotionId");

        // 상태를 CONFIRMED로 변경
        pgJdbc.update("UPDATE promotion_v2 SET status = 'CONFIRMED', updated_at = now() WHERE id = ?", promotionId);

        return saveResult;
    }

    /**
     * 프로모션 아이템 저장
     */
    @SuppressWarnings("unchecked")
    private void savePromotionItems(Long promotionId, Map<String, Object> payload) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        if (items == null || items.isEmpty()) return;

        String insertSql = """
                INSERT INTO promotion_item_v2 (
                    promotion_id, expiry_stock_id, item_seq, item_no, item_name,
                    lot_no, wh_seq, wh_name, exp_date, remain_day, stock_qty,
                    unit_price, original_amt, promo_price, promo_amt, discount_rate,
                    sales_mgmt_unit, item_subcategory, selected
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        for (Map<String, Object> item : items) {
            boolean selected = item.get("selected") != null && (Boolean) item.get("selected");

            pgJdbc.update(insertSql,
                    promotionId,
                    item.get("id"),  // expiry_stock_id
                    item.get("itemSeq"),
                    item.get("itemNo"),
                    item.get("itemName"),
                    item.get("lotNo"),
                    item.get("whSeq"),
                    item.get("whName"),
                    item.get("expDate"),
                    item.get("remainDay"),
                    item.get("stockQty") != null ? new BigDecimal(item.get("stockQty").toString()) : null,
                    item.get("unitPrice") != null ? new BigDecimal(item.get("unitPrice").toString()) : null,
                    item.get("originalAmt") != null ? new BigDecimal(item.get("originalAmt").toString()) : null,
                    item.get("promoPrice") != null ? new BigDecimal(item.get("promoPrice").toString()) : null,
                    item.get("promoAmt") != null ? new BigDecimal(item.get("promoAmt").toString()) : null,
                    item.get("discountRate") != null ? new BigDecimal(item.get("discountRate").toString()) : null,
                    item.get("salesMgmtUnit"),
                    item.get("itemSubcategory"),
                    selected
            );
        }
    }

    /**
     * 프로모션 목록 조회
     */
    public List<Map<String, Object>> getPromotionList(String companyType, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    id, promo_code as "promoCode", promo_name as "promoName",
                    company_type as "companyType", discount_rate as "discountRate",
                    start_date as "startDate", end_date as "endDate",
                    status, description,
                    total_stock_qty as "totalStockQty",
                    total_original_amt as "totalOriginalAmt",
                    total_promo_amt as "totalPromoAmt",
                    expected_loss as "expectedLoss",
                    created_at as "createdAt"
                FROM promotion_v2
                WHERE company_type = ?
                """);

        List<Object> params = new ArrayList<>();
        params.add(companyType);

        if (status != null && !status.isEmpty()) {
            sql.append(" AND status = ?");
            params.add(status);
        }

        sql.append(" ORDER BY created_at DESC");

        return pgJdbc.queryForList(sql.toString(), params.toArray());
    }

    /**
     * 프로모션 상세 조회
     */
    public Map<String, Object> getPromotionDetail(Long promotionId) {
        String sql = """
                SELECT
                    id, promo_code as "promoCode", promo_name as "promoName",
                    company_type as "companyType", discount_rate as "discountRate",
                    start_date as "startDate", end_date as "endDate",
                    status, description,
                    total_stock_qty as "totalStockQty",
                    total_original_amt as "totalOriginalAmt",
                    total_promo_amt as "totalPromoAmt",
                    expected_loss as "expectedLoss",
                    search_remain_days as "searchRemainDays",
                    search_wh_seq as "searchWhSeq",
                    search_sales_mgmt_unit as "searchSalesMgmtUnit",
                    created_at as "createdAt"
                FROM promotion_v2
                WHERE id = ?
                """;

        Map<String, Object> promotion = pgJdbc.queryForMap(sql, promotionId);

        // 아이템 조회
        String itemSql = """
                SELECT
                    id, expiry_stock_id as "expiryStockId",
                    item_seq as "itemSeq", item_no as "itemNo", item_name as "itemName",
                    lot_no as "lotNo", wh_seq as "whSeq", wh_name as "whName",
                    exp_date as "expDate", remain_day as "remainDay", stock_qty as "stockQty",
                    unit_price as "unitPrice", original_amt as "originalAmt",
                    promo_price as "promoPrice", promo_amt as "promoAmt",
                    discount_rate as "discountRate",
                    sales_mgmt_unit as "salesMgmtUnit", item_subcategory as "itemSubcategory",
                    selected
                FROM promotion_item_v2
                WHERE promotion_id = ?
                ORDER BY id
                """;

        List<Map<String, Object>> items = pgJdbc.queryForList(itemSql, promotionId);
        promotion.put("items", items);

        return promotion;
    }

    /**
     * 날짜 파싱 헬퍼
     */
    private LocalDate parseDate(Object dateObj) {
        if (dateObj == null || dateObj.toString().isEmpty()) return null;
        try {
            return LocalDate.parse(dateObj.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
