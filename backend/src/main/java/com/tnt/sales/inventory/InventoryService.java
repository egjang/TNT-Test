package com.tnt.sales.inventory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InventoryService {

    private final JdbcTemplate pgJdbcTemplate;

    public InventoryService(@Qualifier("pgJdbcTemplate") JdbcTemplate pgJdbcTemplate) {
        this.pgJdbcTemplate = pgJdbcTemplate;
    }

    public List<LgExpiryStock> getExpiryStockAG(String itemName, String whName, String expChk, String itemCategory,
            Integer remainDayMax, Integer minStockQty, String sortOrder, Integer daysOffset, String bizUnit) {
        StringBuilder sql = new StringBuilder("SELECT * FROM lg_expiry_stock WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (bizUnit != null && !bizUnit.isBlank() && !bizUnit.equalsIgnoreCase("ALL")) {
            sql.append("AND src_bizunit = ? ");
            params.add(bizUnit);
        }

        if (itemName != null && !itemName.isBlank()) {
            sql.append("AND item_name ILIKE ? ");
            params.add("%" + itemName + "%");
        }

        if (whName != null && !whName.isBlank()) {
            sql.append("AND wh_name ILIKE ? ");
            params.add("%" + whName + "%");
        }

        if (expChk != null && !expChk.isBlank() && !expChk.equals("all")) {
            sql.append("AND exp_chk = ? ");
            params.add(expChk);
        }

        if (itemCategory != null && !itemCategory.isBlank()) {
            sql.append("AND item_category ILIKE ? ");
            params.add("%" + itemCategory + "%");
        }

        if (remainDayMax != null) {
            // Adjust filter: (remain_day - offset) <= max => remain_day <= max + offset
            sql.append("AND remain_day <= ? ");
            params.add(remainDayMax + (daysOffset != null ? daysOffset : 0));
        }

        if (minStockQty != null) {
            sql.append("AND stock_qty >= ? ");
            params.add(minStockQty);
        }

        if (sortOrder != null && !sortOrder.isBlank()) {
            switch (sortOrder) {
                case "expiry_asc":
                    sql.append("ORDER BY remain_day ASC ");
                    break;
                case "expiry_desc":
                    sql.append("ORDER BY remain_day DESC ");
                    break;
                case "qty_desc":
                    sql.append("ORDER BY stock_qty DESC ");
                    break;
                case "qty_asc":
                    sql.append("ORDER BY stock_qty ASC ");
                    break;
                default:
                    sql.append("ORDER BY remain_day ASC ");
            }
        } else {
            sql.append("ORDER BY remain_day ASC ");
        }

        List<LgExpiryStock> results = pgJdbcTemplate.query(sql.toString(),
                new BeanPropertyRowMapper<>(LgExpiryStock.class), params.toArray());

        // Post-processing: Adjust remainDay based on offset
        if (daysOffset != null && daysOffset > 0) {
            System.out.println("Applying daysOffset: " + daysOffset + " to " + results.size() + " items.");
            for (LgExpiryStock item : results) {
                if (item.getRemainDay() != null) {
                    int original = item.getRemainDay();
                    item.setRemainDay(original - daysOffset);
                    // System.out.println("Item " + item.getItemName() + ": " + original + " -> " +
                    // item.getRemainDay());
                } else {
                    System.out.println("Item " + item.getItemName() + " has NULL remainDay");
                }
            }
        }

        return results;
    }

    public List<String> getUniqueWarehouses() {
        String sql = "SELECT DISTINCT wh_name FROM lg_expiry_stock WHERE wh_name IS NOT NULL ORDER BY wh_name ASC";
        return pgJdbcTemplate.queryForList(sql, String.class);
    }

    public List<Map<String, Object>> searchItemsForPopup(String keyword, String subcategory) {
        StringBuilder sql = new StringBuilder(
                "SELECT DISTINCT item_name as \"itemName\", item_no as \"itemNo\", item_subcategory as \"itemSubcategory\" FROM lg_expiry_stock WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (keyword != null && !keyword.isBlank()) {
            sql.append("AND (item_name ILIKE ? OR item_no ILIKE ?) ");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
        }

        if (subcategory != null && !subcategory.isBlank()) {
            sql.append("AND item_subcategory = ? ");
            params.add(subcategory);
        }

        sql.append("ORDER BY item_name ASC LIMIT 100");

        return pgJdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public List<String> getUniqueSubcategories() {
        String sql = "SELECT DISTINCT item_subcategory FROM lg_expiry_stock WHERE item_subcategory IS NOT NULL ORDER BY item_subcategory ASC";
        return pgJdbcTemplate.queryForList(sql, String.class);
    }
}
