package com.tnt.sales.inventory.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

import com.tnt.sales.inventory.InventoryService;
import com.tnt.sales.inventory.LgExpiryStock;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private static final Logger log = LoggerFactory.getLogger(InventoryController.class);

    @Autowired
    Environment env;

    @Autowired(required = false)
    @Qualifier("mssqlJdbcTemplate")
    JdbcTemplate mssqlJdbc;

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

    @Autowired
    com.tnt.sales.inventory.InventoryService inventoryService;

    // DEX 임계값 기본값
    private static final int DEFAULT_NEAR_EXPIRE_DAYS = 14;
    private static final BigDecimal DEFAULT_NEAR_EXPIRE_RATE = new BigDecimal("0.15");
    private static final int DEFAULT_IDLE_DAYS = 30;

    /**
     * 재고 현황 조회 - 품목별 aging 분석
     * GET /api/v1/inventory/stock-aging
     *
     * Query Parameters:
     * - whSeq: 창고 코드 (선택)
     * - itemName: 품목명 검색 (선택)
     * - asOfDate: 기준일자 (YYYY-MM-DD, 기본값: 오늘)
     */
    @GetMapping("/stock-aging")
    public ResponseEntity<?> getStockAging(
            @RequestParam(value = "whSeq", required = false) String whSeq,
            @RequestParam(value = "itemName", required = false) String itemName,
            @RequestParam(value = "asOfDate", required = false) String asOfDate) {
        if (mssqlJdbc == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        try {
            // Parse as-of date (default: today)
            LocalDate baseDate = (asOfDate != null && !asOfDate.isBlank())
                    ? LocalDate.parse(asOfDate, DateTimeFormatter.ISO_DATE)
                    : LocalDate.now();

            // Build SQL query
            StringBuilder sql = new StringBuilder();
            sql.append("SELECT ");
            sql.append("  ls.ItemSeq, ");
            sql.append("  ls.LotNo, ");
            sql.append("  ls.WHSeq, ");
            sql.append("  ls.InOutDate, ");
            sql.append("  SUM(CASE WHEN ls.InOut = 1 THEN ls.StdQty ELSE -ls.StdQty END) AS StockQty, ");
            sql.append("  SUM(CASE WHEN ls.InOut = 1 THEN ls.Amt ELSE -ls.Amt END) AS StockAmt ");
            sql.append("FROM TNT.dbo._TLGInOutLotStock ls ");
            sql.append("WHERE 1=1 ");

            List<Object> params = new ArrayList<>();

            // Filter by warehouse if provided
            if (whSeq != null && !whSeq.isBlank()) {
                sql.append("AND ls.WHSeq = ? ");
                params.add(whSeq);
            }

            // Filter by date (up to base date)
            String baseDateStr = baseDate.format(DateTimeFormatter.BASIC_ISO_DATE);
            sql.append("AND ls.InOutDate <= ? ");
            params.add(baseDateStr);

            sql.append("GROUP BY ls.ItemSeq, ls.LotNo, ls.WHSeq, ls.InOutDate ");
            sql.append("HAVING SUM(CASE WHEN ls.InOut = 1 THEN ls.StdQty ELSE -ls.StdQty END) > 0");

            List<Map<String, Object>> stockData = mssqlJdbc.queryForList(sql.toString(), params.toArray());

            // Get item information
            Map<Long, Map<String, Object>> itemInfoMap = new HashMap<>();
            if (!stockData.isEmpty()) {
                Set<Long> itemSeqs = new HashSet<>();
                for (Map<String, Object> row : stockData) {
                    Object itemSeqObj = row.get("ItemSeq");
                    if (itemSeqObj != null) {
                        itemSeqs.add(Long.valueOf(itemSeqObj.toString()));
                    }
                }

                if (!itemSeqs.isEmpty()) {
                    String itemSeqList = String.join(",",
                            itemSeqs.stream().map(String::valueOf).toArray(String[]::new));
                    String itemSql = "SELECT ItemSeq, ItemName, ItemNo, Spec FROM TNT.dbo._TDAItem WHERE ItemSeq IN ("
                            + itemSeqList + ")";
                    List<Map<String, Object>> items = mssqlJdbc.queryForList(itemSql);

                    for (Map<String, Object> item : items) {
                        Long seq = Long.valueOf(item.get("ItemSeq").toString());
                        itemInfoMap.put(seq, item);
                    }
                }
            }

            // Calculate aging by item + LOT
            // Key: ItemSeq + "_" + LotNo
            Map<String, Map<String, Object>> agingMap = new HashMap<>();

            for (Map<String, Object> row : stockData) {
                Long itemSeq = Long.valueOf(row.get("ItemSeq").toString());
                String lotNo = String.valueOf(row.get("LotNo"));
                String inOutDateStr = String.valueOf(row.get("InOutDate"));
                BigDecimal qty = new BigDecimal(String.valueOf(row.get("StockQty")));
                BigDecimal amt = new BigDecimal(String.valueOf(row.get("StockAmt")));

                if (qty.compareTo(BigDecimal.ZERO) <= 0)
                    continue;

                // Parse InOutDate (YYYYMMDD format)
                LocalDate inOutDate;
                try {
                    inOutDate = LocalDate.parse(inOutDateStr, DateTimeFormatter.BASIC_ISO_DATE);
                } catch (Exception e) {
                    continue;
                }

                // Calculate days since stock-in
                long daysSince = ChronoUnit.DAYS.between(inOutDate, baseDate);

                // Create unique key for item + LOT
                String agingKey = itemSeq + "_" + (lotNo != null && !lotNo.equals("null") ? lotNo : "NO_LOT");

                // Get or create aging bucket for this item + LOT
                Map<String, Object> aging = agingMap.computeIfAbsent(agingKey, k -> {
                    Map<String, Object> a = new HashMap<>();
                    a.put("itemSeq", itemSeq);
                    a.put("lotNo", lotNo != null && !lotNo.equals("null") ? lotNo : "");

                    // Add item info
                    Map<String, Object> itemInfo = itemInfoMap.get(itemSeq);
                    if (itemInfo != null) {
                        a.put("itemName", itemInfo.get("ItemName"));
                        a.put("itemNo", itemInfo.get("ItemNo"));
                        a.put("spec", itemInfo.get("Spec"));
                    } else {
                        a.put("itemName", "");
                        a.put("itemNo", "");
                        a.put("spec", "");
                    }

                    a.put("totalQty", BigDecimal.ZERO);
                    a.put("totalAmt", BigDecimal.ZERO);
                    a.put("days0to30Qty", BigDecimal.ZERO);
                    a.put("days31to60Qty", BigDecimal.ZERO);
                    a.put("days61to90Qty", BigDecimal.ZERO);
                    a.put("days91to180Qty", BigDecimal.ZERO);
                    a.put("days180PlusQty", BigDecimal.ZERO);
                    return a;
                });

                // Accumulate totals
                aging.put("totalQty", ((BigDecimal) aging.get("totalQty")).add(qty));
                aging.put("totalAmt", ((BigDecimal) aging.get("totalAmt")).add(amt));

                // Categorize by aging bucket
                if (daysSince <= 30) {
                    aging.put("days0to30Qty", ((BigDecimal) aging.get("days0to30Qty")).add(qty));
                } else if (daysSince <= 60) {
                    aging.put("days31to60Qty", ((BigDecimal) aging.get("days31to60Qty")).add(qty));
                } else if (daysSince <= 90) {
                    aging.put("days61to90Qty", ((BigDecimal) aging.get("days61to90Qty")).add(qty));
                } else if (daysSince <= 180) {
                    aging.put("days91to180Qty", ((BigDecimal) aging.get("days91to180Qty")).add(qty));
                } else {
                    aging.put("days180PlusQty", ((BigDecimal) aging.get("days180PlusQty")).add(qty));
                }
            }

            // Filter by item name if provided
            List<Map<String, Object>> result = new ArrayList<>(agingMap.values());
            if (itemName != null && !itemName.isBlank()) {
                String searchTerm = itemName.toLowerCase();
                result.removeIf(item -> {
                    String name = String.valueOf(item.get("itemName")).toLowerCase();
                    return !name.contains(searchTerm);
                });
            }

            // Sort by total quantity descending
            result.sort((a, b) -> {
                BigDecimal qtyA = (BigDecimal) a.get("totalQty");
                BigDecimal qtyB = (BigDecimal) b.get("totalQty");
                return qtyB.compareTo(qtyA);
            });

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.warn("재고 aging 조회 실패: {}", e.getMessage());
            // Return empty list instead of error for better UX (DB connection issues are
            // common)
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * 창고 목록 조회
     * GET /api/v1/inventory/warehouses
     */
    @GetMapping("/warehouses")
    public ResponseEntity<?> getWarehouses() {
        if (mssqlJdbc == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        try {
            String sql = "SELECT WHSeq, WHName FROM TNT.dbo._TDAWH WHERE CompanySeq = 1 ORDER BY WHSeq";
            List<Map<String, Object>> warehouses = mssqlJdbc.queryForList(sql);
            return ResponseEntity.ok(warehouses);
        } catch (Exception e) {
            log.error("창고 목록 조회 실패", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * 유통기한재고 조회
     * GET /api/v1/inventory/expiry-stock
     *
     * Query Parameters:
     * - expChk: 상태 필터 (expired, warning, safe)
     * - remainDayThreshold: 잔여일수 기준 (기본값: 30)
     * - whSeq: 창고 번호
     * - itemName: 품목명 검색
     * - category: 카테고리 필터
     */
    @GetMapping("/expiry-stock")
    public ResponseEntity<?> getExpiryStock(
            @RequestParam(value = "expChk", required = false) String expChk,
            @RequestParam(value = "remainDayThreshold", required = false, defaultValue = "30") Integer remainDayThreshold,
            @RequestParam(value = "whSeq", required = false) String whSeq,
            @RequestParam(value = "itemName", required = false) String itemName,
            @RequestParam(value = "category", required = false) String category) {
        if (pgJdbc == null) {
            log.warn("pgJdbc is null - PostgreSQL datasource not configured");
            Map<String, Object> response = new HashMap<>();
            response.put("items", Collections.emptyList());
            response.put("error", "PostgreSQL datasource not configured");
            return ResponseEntity.ok(response);
        }

        try {
            // First check if table exists
            try {
                pgJdbc.queryForObject("SELECT COUNT(*) FROM lg_expiry_stock LIMIT 1", Integer.class);
            } catch (Exception e) {
                log.error("lg_expiry_stock 테이블이 존재하지 않거나 접근할 수 없습니다: {}", e.getMessage());
                Map<String, Object> response = new HashMap<>();
                response.put("items", Collections.emptyList());
                response.put("error", "테이블이 존재하지 않습니다: lg_expiry_stock");
                return ResponseEntity.ok(response);
            }

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT ");
            sql.append("  item_no AS \"itemNo\", ");
            sql.append("  item_name AS \"itemName\", ");
            sql.append("  spec, ");
            sql.append("  lot_no AS \"lotNo\", ");
            sql.append("  wh_name AS \"whName\", ");
            sql.append("  wh_seq AS \"whSeq\", ");
            sql.append("  stock_qty AS \"stockQty\", ");
            sql.append("  in_date AS \"inDate\", ");
            sql.append("  exp_date AS \"expDate\", ");
            sql.append("  exp_period AS \"expPeriod\", ");
            sql.append("  remain_day AS \"remainDay\", ");
            sql.append("  remain_rate AS \"remainRate\", ");
            sql.append("  exp_chk AS \"expChk\", ");
            sql.append("  last_out_date AS \"lastOutDate\", ");
            sql.append("  item_category AS \"itemCategory\", ");
            sql.append("  item_subcategory AS \"itemSubcategory\", ");
            sql.append("  item_small_category AS \"itemSmallCategory\", ");
            sql.append("  create_date AS \"createDate\", ");
            sql.append("  unit_name AS \"unitName\" ");
            sql.append("FROM lg_expiry_stock ");
            sql.append("WHERE 1=1 ");

            List<Object> params = new ArrayList<>();

            // Filter by expiry status
            if (expChk != null && !expChk.isBlank() && !expChk.equals("all")) {
                sql.append("AND exp_chk = ? ");
                params.add(expChk);
            }

            // Filter by remain day threshold
            if (remainDayThreshold != null && remainDayThreshold > 0) {
                sql.append("AND remain_day <= ? ");
                params.add(remainDayThreshold);
            }

            // Filter by warehouse
            if (whSeq != null && !whSeq.isBlank()) {
                sql.append("AND wh_seq = ? ");
                params.add(Integer.parseInt(whSeq));
            }

            // Filter by item name
            if (itemName != null && !itemName.isBlank()) {
                sql.append("AND item_name ILIKE ? ");
                params.add("%" + itemName + "%");
            }

            // Filter by category
            if (category != null && !category.isBlank()) {
                sql.append("AND item_category ILIKE ? ");
                params.add("%" + category + "%");
            }

            sql.append("ORDER BY remain_day ASC NULLS LAST, stock_qty DESC");

            log.info("유통기한재고 조회 SQL: {}", sql.toString());
            log.info("파라미터: {}", params);

            List<Map<String, Object>> items = pgJdbc.queryForList(sql.toString(), params.toArray());

            log.info("조회된 데이터 건수: {}", items.size());

            Map<String, Object> response = new HashMap<>();
            response.put("items", items);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("유통기한재고 조회 실패", e);
            Map<String, Object> response = new HashMap<>();
            response.put("items", Collections.emptyList());
            response.put("error", "조회 실패: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    /**
     * 유통기한재고(DEX) 조회 - Postgres lg_expiry_stock
     * 기본 정렬: 만료 우선 → 잔여일수 오름차순 → 최종출고이후미사용일수 내림차순 → 적재일시 내림차순
     * 모드:
     * - expired: exp_chk='expired' OR remain_day<=0
     * - near: remain_day<=DEFAULT_NEAR_EXPIRE_DAYS OR
     * remain_rate<=DEFAULT_NEAR_EXPIRE_RATE
     * - idle: out_not_use_date>=DEFAULT_IDLE_DAYS OR
     * in_not_use_date>=DEFAULT_IDLE_DAYS
     */
    @GetMapping("/dex")
    public ResponseEntity<?> getExpiryInventoryDex(
            @RequestParam(value = "limit", required = false, defaultValue = "100") Integer limit,
            @RequestParam(value = "offset", required = false, defaultValue = "0") Integer offset,
            @RequestParam(value = "itemNo", required = false) String itemNo,
            @RequestParam(value = "itemName", required = false) String itemName,
            @RequestParam(value = "lotNo", required = false) String lotNo,
            @RequestParam(value = "whSeq", required = false) Long whSeq,
            @RequestParam(value = "expChk", required = false) String expChk,
            @RequestParam(value = "expDateFrom", required = false) String expDateFrom,
            @RequestParam(value = "expDateTo", required = false) String expDateTo,
            @RequestParam(value = "remainDayMin", required = false) Integer remainDayMin,
            @RequestParam(value = "remainDayMax", required = false) Integer remainDayMax,
            @RequestParam(value = "remainRateMin", required = false) BigDecimal remainRateMin,
            @RequestParam(value = "remainRateMax", required = false) BigDecimal remainRateMax,
            @RequestParam(value = "outNotUseMin", required = false) Long outNotUseMin,
            @RequestParam(value = "outNotUseMax", required = false) Long outNotUseMax,
            @RequestParam(value = "inNotUseMin", required = false) Long inNotUseMin,
            @RequestParam(value = "inNotUseMax", required = false) Long inNotUseMax,
            @RequestParam(value = "categorySeq", required = false) Long categorySeq,
            @RequestParam(value = "subcategorySeq", required = false) Long subcategorySeq,
            @RequestParam(value = "smallCategorySeq", required = false) Long smallCategorySeq,
            @RequestParam(value = "mode", required = false) String mode // expired | near | idle
    ) {
        if (pgJdbc == null) {
            return ResponseEntity.ok(Map.of("totalCount", 0, "items", Collections.emptyList(), "hasMore", false));
        }

        try {
            List<Object> params = new ArrayList<>();
            StringBuilder where = new StringBuilder(" WHERE 1=1 ");

            if (itemNo != null && !itemNo.isBlank()) {
                where.append(" AND item_no ILIKE ? ");
                params.add("%" + itemNo + "%");
            }
            if (itemName != null && !itemName.isBlank()) {
                where.append(" AND item_name ILIKE ? ");
                params.add("%" + itemName + "%");
            }
            if (lotNo != null && !lotNo.isBlank()) {
                where.append(" AND lot_no ILIKE ? ");
                params.add("%" + lotNo + "%");
            }
            if (whSeq != null) {
                where.append(" AND wh_seq = ? ");
                params.add(whSeq);
            }
            if (expChk != null && !expChk.isBlank()) {
                where.append(" AND exp_chk = ? ");
                params.add(expChk);
            }
            if (expDateFrom != null && !expDateFrom.isBlank()) {
                where.append(" AND exp_date >= ? ");
                params.add(expDateFrom);
            }
            if (expDateTo != null && !expDateTo.isBlank()) {
                where.append(" AND exp_date <= ? ");
                params.add(expDateTo);
            }
            if (remainDayMin != null) {
                where.append(" AND remain_day >= ? ");
                params.add(remainDayMin);
            }
            if (remainDayMax != null) {
                where.append(" AND remain_day <= ? ");
                params.add(remainDayMax);
            }
            if (remainRateMin != null) {
                where.append(" AND remain_rate >= ? ");
                params.add(remainRateMin);
            }
            if (remainRateMax != null) {
                where.append(" AND remain_rate <= ? ");
                params.add(remainRateMax);
            }
            if (outNotUseMin != null) {
                where.append(" AND out_not_use_date >= ? ");
                params.add(outNotUseMin);
            }
            if (outNotUseMax != null) {
                where.append(" AND out_not_use_date <= ? ");
                params.add(outNotUseMax);
            }
            if (inNotUseMin != null) {
                where.append(" AND in_not_use_date >= ? ");
                params.add(inNotUseMin);
            }
            if (inNotUseMax != null) {
                where.append(" AND in_not_use_date <= ? ");
                params.add(inNotUseMax);
            }
            if (categorySeq != null) {
                where.append(" AND item_category_seq = ? ");
                params.add(categorySeq);
            }
            if (subcategorySeq != null) {
                where.append(" AND item_subcategory_seq = ? ");
                params.add(subcategorySeq);
            }
            if (smallCategorySeq != null) {
                where.append(" AND item_small_category_seq = ? ");
                params.add(smallCategorySeq);
            }

            // 모드별 추가 필터
            if ("expired".equalsIgnoreCase(mode)) {
                where.append(" AND (exp_chk = 'expired' OR remain_day <= 0) ");
            } else if ("near".equalsIgnoreCase(mode)) {
                where.append(" AND (remain_day <= ? OR remain_rate <= ?) ");
                params.add(DEFAULT_NEAR_EXPIRE_DAYS);
                params.add(DEFAULT_NEAR_EXPIRE_RATE);
            } else if ("idle".equalsIgnoreCase(mode)) {
                where.append(" AND (out_not_use_date >= ? OR in_not_use_date >= ?) ");
                params.add(DEFAULT_IDLE_DAYS);
                params.add(DEFAULT_IDLE_DAYS);
            }

            String orderBy = " ORDER BY (exp_chk = 'expired') DESC, remain_day ASC, out_not_use_date DESC NULLS LAST, loaded_at DESC NULLS LAST ";

            String baseSelect = "SELECT id, src_std_date, src_bizunit, item_name, item_no, spec, item_seq, unit_name, exp_period, remain_day, remain_rate, exp_chk, exp_date, create_date, in_date, last_out_date, lot_no, wh_name, wh_seq, stock_qty, out_not_use_date, in_not_use_date, asset_seq, asset_name, item_category_seq, item_category, item_subcategory_seq, item_subcategory, item_small_category_seq, item_small_category, loaded_at FROM lg_expiry_stock";

            String countSql = "SELECT COUNT(*) FROM lg_expiry_stock " + where;
            int totalCount = pgJdbc.queryForObject(countSql, Integer.class, params.toArray());

            String dataSql = baseSelect + where.toString() + orderBy + " LIMIT ? OFFSET ? ";
            List<Object> dataParams = new ArrayList<>(params);
            dataParams.add(limit);
            dataParams.add(offset);

            List<Map<String, Object>> items = pgJdbc.queryForList(dataSql, dataParams.toArray());
            boolean hasMore = offset + items.size() < totalCount;

            Map<String, Object> response = new HashMap<>();
            response.put("totalCount", totalCount);
            response.put("items", items);
            response.put("hasMore", hasMore);
            response.put("limit", limit);
            response.put("offset", offset);
            response.put("mode", mode);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("유통기한재고(DEX) 조회 실패", e);
            return ResponseEntity.status(500).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @GetMapping("/expiry-stock-ag")
    public ResponseEntity<?> getExpiryStockAG(
            @RequestParam(required = false) String itemName,
            @RequestParam(required = false) String whName,
            @RequestParam(required = false) String expChk,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer remainDayMax,
            @RequestParam(required = false) Integer minStockQty,
            @RequestParam(required = false) String sortOrder,
            @RequestParam(value = "daysOffset", required = false, defaultValue = "0") Integer daysOffset,
            @RequestParam(required = false) String bizUnit) {
        try {
            log.info("Requesting Expiry Stock AG with daysOffset: {}, bizUnit: {}", daysOffset, bizUnit);
            List<LgExpiryStock> stocks = inventoryService.getExpiryStockAG(itemName, whName, expChk, category,
                    remainDayMax, minStockQty, sortOrder, daysOffset, bizUnit);
            return ResponseEntity.ok(stocks);
        } catch (Exception e) {
            log.error("Error fetching Expiry Stock AG", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/warehouses-ag")
    public ResponseEntity<?> getWarehousesAG() {
        try {
            List<String> warehouses = inventoryService.getUniqueWarehouses();
            return ResponseEntity.ok(warehouses);
        } catch (Exception e) {
            log.error("Error fetching AG warehouses", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/items-popup")
    public ResponseEntity<?> searchItemsPopup(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String subcategory) {
        try {
            List<Map<String, Object>> items = inventoryService.searchItemsForPopup(keyword, subcategory);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            log.error("Error searching items for popup", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/subcategories-ag")
    public ResponseEntity<?> getSubcategoriesAG() {
        try {
            List<String> subcategories = inventoryService.getUniqueSubcategories();
            return ResponseEntity.ok(subcategories);
        } catch (Exception e) {
            log.error("Error fetching AG subcategories", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
