package com.tnt.sales.inventory;

import com.tnt.sales.inventory.model.Promotion;
import com.tnt.sales.inventory.model.PromotionItem;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class PromotionService {

    private final JdbcTemplate pgJdbcTemplate;

    public PromotionService(@Qualifier("pgJdbcTemplate") JdbcTemplate pgJdbcTemplate) {
        this.pgJdbcTemplate = pgJdbcTemplate;
    }

    public List<Promotion> getAllPromotions() {
        String sql = "SELECT * FROM promotion ORDER BY created_at DESC";
        return pgJdbcTemplate.query(sql, new BeanPropertyRowMapper<>(Promotion.class));
    }

    public Promotion createPromotion(Promotion promotion) {
        String sql = "INSERT INTO promotion (name, discount_rate, start_date, end_date, description, status) " +
                "VALUES (?, ?, ?, ?, ?, 'ACTIVE') RETURNING id";
        Long id = pgJdbcTemplate.queryForObject(sql, Long.class,
                promotion.getName(),
                promotion.getDiscountRate(),
                promotion.getStartDate(),
                promotion.getEndDate(),
                promotion.getDescription());
        promotion.setId(id);
        return promotion;
    }

    public void addItemsToPromotion(Long promotionId, List<PromotionItem> items) {
        String sql = "INSERT INTO promotion_item (promotion_id, item_no, item_name, stock_qty, status) " +
                "VALUES (?, ?, ?, ?, 'PENDING')";

        for (PromotionItem item : items) {
            pgJdbcTemplate.update(sql,
                    promotionId,
                    item.getItemNo(),
                    item.getItemName(),
                    item.getStockQty());
        }
    }
}
