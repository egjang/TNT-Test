package com.tnt.sales.demand.service;

import com.tnt.sales.demand.model.DemandUpsertRow;
import com.tnt.sales.demand.model.DemandUploadItem;
import com.tnt.sales.demand.model.ProductInfo;
import com.tnt.sales.demand.model.DemandRawRow;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Arrays;
 

@Service
public class DemandService {
    private final JdbcTemplate jdbc;
    private final Environment env;

    public DemandService(JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    // Server-side Excel parsing removed: frontend handles parsing and sends JSON rows.

    @Transactional
    public void upsertDemand(List<DemandUploadItem> items) {
        // TODO: 실제 DB 저장 로직 구현 필요
        // 현재는 mock 처리 (아무 동작 안함)
    }

    @Transactional
    public void upsertDemandData(List<DemandUploadItem> items, ProductInfo productInfo) {
        // TODO: Implement the upsert logic for demand data with product info
    }

    public record UpsertResult(int updated, int inserted) { }

    @Transactional
    public UpsertResult upsertFlatBatch(List<DemandUpsertRow> items) {
        if (items == null || items.isEmpty()) return new UpsertResult(0, 0);
        // In no-db profile, bypass JDBC and simulate success (respect business rules)
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                int total = 0;
                for (DemandUpsertRow it : items) {
                    String salesRepName = trimToNull(it.getSalesRepName());
                    String customerName = trimToNull(it.getCustomerName());
                    String itemSubcategory = trimToNull(it.getItemSubcategory());
                    String supplierName = trimToNull(it.getSupplierName());
                    String salesMgmtUnit = trimToNull(it.getSalesMgmtUnit());
                    Double share = it.getShareRate();
                    if (share != null && share.doubleValue() == 0.0) share = null; // 0 treated as missing
                    if (salesRepName == null || customerName == null || itemSubcategory == null) continue;
                    if (isAllBlank(supplierName, salesMgmtUnit, share)) continue; // skip when all blank
                    total++;
                }
                return new UpsertResult(0, total);
            }
        }
        int updated = 0;
        int inserted = 0;
        for (DemandUpsertRow it : items) {
            String salesRepName = trimToNull(it.getSalesRepName());
            String customerName = trimToNull(it.getCustomerName());
            String itemSubcategory = trimToNull(it.getItemSubcategory());
            String supplierName = trimToNull(it.getSupplierName());
            String salesMgmtUnit = trimToNull(it.getSalesMgmtUnit());

            if (salesRepName == null || customerName == null || itemSubcategory == null) {
                continue;
            }
            Double share = it.getShareRate();
            boolean shareMissing = (share == null || share.doubleValue() == 0.0);
            // Create only when any of supplier/unit/share present (0 treated as missing)
            if (isAllBlank(supplierName, salesMgmtUnit, share)) {
                continue;
            }
            // Update first; if no row updated, then insert. Avoid exception-driven control flow.
            String updateSql = "UPDATE public.demand SET share_rate=?, updated_at=now(), updated_by=current_user " +
                    "WHERE sales_rep_name=? AND customer_name=? " +
                    "AND coalesce(item_subcategory,'') = coalesce(?, '') " +
                    "AND coalesce(supplier_name,'') = coalesce(?, '') " +
                    "AND coalesce(sales_mgmt_unit,'') = coalesce(?, '')";
            int u = runUpdate(updateSql,
                    (shareMissing ? null : share),
                    salesRepName,
                    customerName,
                    itemSubcategory,
                    supplierName,
                    salesMgmtUnit
            );
            if (u > 0) {
                updated += u;
            } else {
                String insertSql = "INSERT INTO public.demand (sales_rep_name, sales_rep_id, customer_id, customer_name, supplier_id, supplier_name, item_subcategory, sales_mgmt_unit, share_rate) " +
                        "VALUES (?,?,?,?,?,?,?,?,?)";
                int i = runUpdate(insertSql,
                        salesRepName,
                        11,
                        1,
                        customerName,
                        1,
                        supplierName,
                        itemSubcategory,
                        salesMgmtUnit,
                        (shareMissing ? null : share)
                );
                inserted += i;
            }
        }
        return new UpsertResult(updated, inserted);
    }

    @Transactional
    public UpsertResult ingestRawBatch(List<DemandRawRow> items) {
        if (items == null || items.isEmpty()) return new UpsertResult(0, 0);
        // nodb bypass
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                int total = 0;
                for (DemandRawRow r : items) {
                    if (anyNotBlank(r.getSupplier1(), r.getMgmtUnit1(), r.getShare1())) total++;
                    if (anyNotBlank(r.getSupplier2(), r.getMgmtUnit2(), r.getShare2())) total++;
                    if (anyNotBlank(r.getSupplier3(), r.getMgmtUnit3(), r.getShare3())) total++;
                    if (anyNotBlank(r.getSupplier4(), r.getMgmtUnit4(), r.getShare4())) total++;
                    if (anyNotBlank(r.getSupplier5(), r.getMgmtUnit5(), r.getShare5())) total++;
                }
                return new UpsertResult(0, total);
            }
        }
        int updated = 0;
        int inserted = 0;
        for (DemandRawRow r : items) {
            String salesRepName = trimToNull(r.getSalesOwner());
            String customerName = trimToNull(r.getCustomer());
            String itemSubcategory = trimToNull(r.getCategoryMid());
            // Require mandatory keys to avoid NOT NULL violations
            if (salesRepName == null || customerName == null || itemSubcategory == null) continue;

            for (int k = 1; k <= 5; k++) {
                String supplierName = trimToNull(switch (k) {
                    case 1 -> r.getSupplier1();
                    case 2 -> r.getSupplier2();
                    case 3 -> r.getSupplier3();
                    case 4 -> r.getSupplier4();
                    case 5 -> r.getSupplier5();
                    default -> null;
                });
                String salesMgmtUnit = trimToNull(switch (k) {
                    case 1 -> r.getMgmtUnit1();
                    case 2 -> r.getMgmtUnit2();
                    case 3 -> r.getMgmtUnit3();
                    case 4 -> r.getMgmtUnit4();
                    case 5 -> r.getMgmtUnit5();
                    default -> null;
                });
                Double rawShare = switch (k) {
                    case 1 -> r.getShare1();
                    case 2 -> r.getShare2();
                    case 3 -> r.getShare3();
                    case 4 -> r.getShare4();
                    case 5 -> r.getShare5();
                    default -> null;
                };
                // skip when supplier/mgmt/share are all blank; share=0 treated as blank
                if (isAllBlank(supplierName, salesMgmtUnit, rawShare)) continue;
                boolean shareMissing = (rawShare == null || rawShare.doubleValue() == 0.0);
                Double share = (shareMissing ? null : rawShare);

                String updateSql2 = "UPDATE public.demand SET share_rate=?, updated_at=now(), updated_by=current_user " +
                        "WHERE sales_rep_name=? AND customer_name=? " +
                        "AND coalesce(item_subcategory,'') = coalesce(?, '') " +
                        "AND coalesce(supplier_name,'') = coalesce(?, '') " +
                        "AND coalesce(sales_mgmt_unit,'') = coalesce(?, '')";
                int u = runUpdate(updateSql2,
                        (shareMissing ? null : share),
                        salesRepName,
                        customerName,
                        itemSubcategory,
                        supplierName,
                        salesMgmtUnit
                );
                if (u > 0) {
                    updated += u;
                } else {
                    String insertSql = "INSERT INTO public.demand (sales_rep_name, sales_rep_id, customer_id, customer_name, supplier_id, supplier_name, item_subcategory, sales_mgmt_unit, share_rate) " +
                            "VALUES (?,?,?,?,?,?,?,?,?)";
                    int i = runUpdate(insertSql,
                            salesRepName,
                            11,
                            1,
                            customerName,
                            1,
                            supplierName,
                            itemSubcategory,
                            salesMgmtUnit,
                            (shareMissing ? null : share)
                    );
                    inserted += i;
                }
            }
        }
        return new UpsertResult(updated, inserted);
    }

    // TEMP DEBUG: print and propagate SQL with parameters on failure (remove later)
    private int runUpdate(String sql, Object... params) {
        try {
            return jdbc.update(sql, params);
        } catch (org.springframework.dao.DataAccessException ex) {
            String msg = "SQL failed: " + sql + " | params=" + Arrays.toString(params) + " | cause=" + (ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage());
            System.err.println("[DEBUG-SQL] " + msg);
            throw new RuntimeException(msg, ex);
        }
    }

    private static boolean anyNotBlank(String a, String b, Double c) {
        boolean hasA = (a != null && !a.isBlank());
        boolean hasB = (b != null && !b.isBlank());
        boolean hasC = (c != null && c.doubleValue() != 0.0);
        return hasA || hasB || hasC;
    }
    private static boolean isAllBlank(String a, String b, Double c) {
        boolean blankA = (a == null || a.isBlank());
        boolean blankB = (b == null || b.isBlank());
        boolean blankC = (c == null || c.doubleValue() == 0.0);
        return blankA && blankB && blankC;
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
