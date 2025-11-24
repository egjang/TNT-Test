package com.tnt.sales.demand.api;

import com.tnt.sales.demand.model.DemandUpsertRow;
import com.tnt.sales.demand.model.DemandRawRow;
import com.tnt.sales.demand.service.DemandService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/demand")
public class DemandUploadController {
    private final DemandService demandService;
    @Autowired(required = false)
    private JdbcTemplate jdbc;

    @Autowired
    public DemandUploadController(DemandService demandService) {
        this.demandService = demandService;
    }

    // JSON upload endpoint used by frontend
    public static class UploadRequest {
        public List<DemandUpsertRow> items;
        public List<DemandUpsertRow> getItems() { return items; }
        public void setItems(List<DemandUpsertRow> items) { this.items = items; }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadJson(@RequestBody UploadRequest req) {
        try {
            if (req == null || req.items == null || req.items.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No items provided"));
            }
            var res = demandService.upsertFlatBatch(req.items);
            return ResponseEntity.ok(Map.of(
                    "updated", res.updated(),
                    "inserted", res.inserted(),
                    "total", res.updated() + res.inserted()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getClass().getSimpleName()+": "+e.getMessage()));
        }
    }

    // Raw row upload: each item corresponds to one Excel row with 5 repeating groups
    public static class UploadRawRequest {
        public java.util.List<DemandRawRow> items;
        public java.util.List<DemandRawRow> getItems() { return items; }
        public void setItems(java.util.List<DemandRawRow> items) { this.items = items; }
    }

    @PostMapping("/upload-raw")
    public ResponseEntity<?> uploadRaw(@RequestBody UploadRawRequest req) {
        try {
            if (req == null || req.items == null || req.items.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No items provided"));
            }
            var res = demandService.ingestRawBatch(req.items);
            return ResponseEntity.ok(Map.of(
                    "updated", res.updated(),
                    "inserted", res.inserted(),
                    "total", res.updated() + res.inserted()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getClass().getSimpleName()+": "+e.getMessage()));
        }
    }

    // Note: file upload is not supported; frontend parses Excel and posts JSON.

    @GetMapping("/owner-stats")
    public ResponseEntity<?> ownerStats(
            @RequestParam(value = "limit", required = false, defaultValue = "50") int limit
    ) {
        if (jdbc == null) return ResponseEntity.status(500).body(Map.of("error","DB not available"));
        try {
            int capped = Math.max(1, Math.min(200, limit));
            java.util.List<java.util.Map<String,Object>> rows;
            try {
                // Primary query: join by assignee_id (employee.assignee_id ↔ customer.assignee_id / demand.assignee_id)
                String sql =
                        "WITH e AS (\n" +
                        "  SELECT COALESCE(NULLIF(TRIM(emp_name), ''), '(미지정)') AS name, CAST(assignee_id AS TEXT) AS aid\n" +
                        "  FROM public.employee\n" +
                        "  WHERE dept_name IN ('영업2팀','영업1팀','영업1본부','영업2본부')\n" +
                        "), dem AS (\n" +
                        "  SELECT CAST(assignee_id AS TEXT) AS aid, COUNT(DISTINCT customer_id) AS demand_count\n" +
                        "  FROM public.demand\n" +
                        "  GROUP BY 1\n" +
                        "), cust AS (\n" +
                        "  SELECT CAST(assignee_id AS TEXT) AS aid, COUNT(*) AS total_count\n" +
                        "  FROM public.customer\n" +
                        "  GROUP BY 1\n" +
                        ")\n" +
                        "SELECT e.name, e.aid AS rep_id, COALESCE(dem.demand_count,0) AS demand_count, COALESCE(cust.total_count,0) AS total_count\n" +
                        "FROM e\n" +
                        "LEFT JOIN dem USING (aid)\n" +
                        "LEFT JOIN cust USING (aid)\n" +
                        "ORDER BY demand_count DESC, e.name ASC\n" +
                        "LIMIT " + capped;
                rows = jdbc.query(sql, (rs, i) -> {
                    java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                    m.put("salesRepName", rs.getString(1));
                    m.put("salesRepId", rs.getString(2));
                    m.put("customerCount", rs.getLong(3)); // demand distinct customers
                    m.put("managedCount", rs.getLong(4));  // total customers from customer table
                    return m;
                });
            } catch (Exception primaryEx) {
                // Fallback: if related tables are not available, compute totals based only on demand without joining employee/customer
                String fallback =
                        "WITH dem AS (\n" +
                        "  SELECT COALESCE(NULLIF(CAST(d.assignee_id AS TEXT), ''), '(미지정)') AS name,\n" +
                        "         CAST(d.assignee_id AS TEXT) AS rep_id,\n" +
                        "         COUNT(DISTINCT d.customer_id) AS demand_count\n" +
                        "  FROM public.demand d\n" +
                        "  GROUP BY 1,2\n" +
                        ")\n" +
                        "SELECT dem.name, dem.rep_id, dem.demand_count, dem.demand_count AS total_count\n" +
                        "FROM dem\n" +
                        "ORDER BY dem.demand_count DESC, dem.name ASC\n" +
                        "LIMIT " + capped;
                rows = jdbc.query(fallback, (rs, i) -> {
                    java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
                    m.put("salesRepName", rs.getString(1));
                    m.put("salesRepId", rs.getString(2));
                    m.put("customerCount", rs.getLong(3));
                    m.put("managedCount", rs.getLong(4));
                    return m;
                });
            }
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getClass().getSimpleName()+": "+e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "customer", required = false) String customer,
            @RequestParam(value = "customerId", required = false) String customerId,
            @RequestParam(value = "salesOwner", required = false) String salesOwner,
            @RequestParam(value = "empId", required = false) String empId,
            @RequestParam(value = "empSeq", required = false) Long empSeq,
            @RequestParam(value = "assigneeId", required = false) String assigneeId,
            @RequestParam(value = "subcategory", required = false) String subcategory,
            @RequestParam(value = "limit", required = false, defaultValue = "200") int limit,
            @RequestParam(value = "offset", required = false, defaultValue = "0") int offset
    ) {
        if (jdbc == null) return ResponseEntity.status(500).body(Map.of("error","DB not available"));
        StringBuilder sql = new StringBuilder(
                "SELECT sales_rep_name, customer_id, customer_name, supplier_name, item_subcategory, sales_mgmt_unit, share_rate, created_at, updated_at FROM public.demand WHERE 1=1"
        );
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (customer != null && !customer.isBlank()) {
            String[] toks = customer.trim().split("[\\s,]+");
            for (String t : toks) {
                if (t == null || t.isBlank()) continue;
                sql.append(" AND customer_name ILIKE ?");
                params.add("%" + t + "%");
            }
        }
        // customerId filter intentionally ignored to avoid exposing IDs in list view
        if (salesOwner != null && !salesOwner.isBlank()) { sql.append(" AND sales_rep_name ILIKE ?"); params.add("%"+salesOwner.trim()+"%"); }
        if (empSeq != null) {
            // sales_rep_id is stored as text/varchar in some schemas; compare as text to avoid type mismatch
            sql.append(" AND CAST(sales_rep_id AS TEXT) = ?");
            params.add(String.valueOf(empSeq));
        } else if (empId != null && !empId.isBlank()) {
            // Map emp_id -> emp_seq, then filter by sales_rep_id
            Long seq = null;
            try {
                seq = jdbc.queryForObject("SELECT emp_seq FROM public.employee WHERE emp_id = ?", Long.class, empId.trim());
            } catch (Exception ignore) {}
            if (seq == null) {
                return ResponseEntity.ok(java.util.List.of());
            }
            sql.append(" AND CAST(sales_rep_id AS TEXT) = ?");
            params.add(String.valueOf(seq));
        }
        if (assigneeId != null && !assigneeId.isBlank()) { sql.append(" AND CAST(assignee_id AS TEXT) = ?"); params.add(assigneeId.trim()); }
        if (subcategory != null && !subcategory.isBlank()) { sql.append(" AND item_subcategory ILIKE ?"); params.add("%"+subcategory.trim()+"%"); }
        int lim = Math.max(1, Math.min(1000, limit));
        int off = Math.max(0, offset);
        sql.append(" ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT ").append(lim).append(" OFFSET ").append(off);
        var rows = jdbc.query(sql.toString(), ps -> {
            for (int idx = 0; idx < params.size(); idx++) {
                ps.setObject(idx + 1, params.get(idx));
            }
        }, (rs, i) -> {
            java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
            m.put("salesRepName", rs.getString(1));
            m.put("customerId", rs.getString(2));
            m.put("customerName", rs.getString(3));
            m.put("supplierName", rs.getString(4));
            m.put("itemSubcategory", rs.getString(5));
            m.put("salesMgmtUnit", rs.getString(6));
            m.put("shareRate", rs.getObject(7));
            m.put("createdAt", rs.getTimestamp(8));
            m.put("updatedAt", rs.getTimestamp(9));
            return m;
        });
        return ResponseEntity.ok(rows);
    }

    public static class RegisterRequest {
        public Long customerSeq; // customer_id target
        public String customerName;
        public Long empSeq; // sales_rep_id target
        public String empName; // sales_rep_name target
        public String itemSubcategory;
        public String supplierName;
        public String salesMgmtUnit;
        public Double share; // input: 10 -> 0.1, 100 -> 1
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (jdbc == null) return ResponseEntity.status(500).body(Map.of("error","DB not available"));
        try {
            if (req == null) return ResponseEntity.badRequest().body(Map.of("error","empty body"));
            if (req.customerSeq == null || req.empSeq == null) return ResponseEntity.badRequest().body(Map.of("error","customerSeq and empSeq are required"));
            String salesRepName = req.empName != null ? req.empName.trim() : null;
            String customerName = req.customerName != null ? req.customerName.trim() : null;
            String itemSub = req.itemSubcategory != null ? req.itemSubcategory.trim() : null;
            String supplier = req.supplierName != null ? req.supplierName.trim() : null;
            String unit = req.salesMgmtUnit != null ? req.salesMgmtUnit.trim() : null;
            // Fill missing names from DB if possible
            if ((salesRepName == null || salesRepName.isEmpty()) && req.empSeq != null) {
                try {
                    salesRepName = jdbc.queryForObject("SELECT emp_name FROM public.employee WHERE emp_seq = ?", String.class, req.empSeq);
                } catch (Exception ignore) {}
            }
            if ((customerName == null || customerName.isEmpty()) && req.customerSeq != null) {
                try {
                    customerName = jdbc.queryForObject("SELECT customer_name FROM public.customer WHERE customer_seq = ?", String.class, req.customerSeq);
                } catch (Exception ignore) {}
            }
            // Fallback: resolve emp name via customer → employee join
            if ((salesRepName == null || salesRepName.isEmpty()) && req.customerSeq != null) {
                try {
                    salesRepName = jdbc.queryForObject(
                            "SELECT e.emp_name FROM public.customer c LEFT JOIN public.employee e ON e.company_seq=c.company_seq AND e.emp_seq=c.emp_seq WHERE c.customer_seq=?",
                            String.class, req.customerSeq);
                } catch (Exception ignore) {}
            }
            // Last resort: set to empSeq string to satisfy NOT NULL (schema requires non-null)
            if (salesRepName == null || salesRepName.isEmpty()) {
                salesRepName = String.valueOf(req.empSeq);
            }
            // Customer name last resort: set to customerSeq string to satisfy NOT NULL
            if (customerName == null || customerName.isEmpty()) {
                customerName = String.valueOf(req.customerSeq);
            }
            if (itemSub == null || itemSub.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error","itemSubcategory is required"));
            }
            double shareNorm = 0.0;
            if (req.share != null) {
                double v = req.share.doubleValue();
                if (!Double.isFinite(v)) v = 0.0;
                shareNorm = v > 1.0 ? v / 100.0 : v;
                if (shareNorm == 0.0) {
                    // Treat 0 as NULL to support delete-like behavior as per existing logic
                    // but here we'll just set to NULL
                }
            }
            boolean shareMissing = (req.share == null || shareNorm == 0.0);

            String empIdStr = String.valueOf(req.empSeq);
            String custIdStr = String.valueOf(req.customerSeq);
            String supplierIdStr = "1";
            String updateSql = "UPDATE public.demand SET share_rate=?, sales_rep_id=?, customer_id=?, supplier_id=?, " +
                    "sales_rep_name=COALESCE(?, sales_rep_name), customer_name=COALESCE(?, customer_name), " +
                    "updated_at=now(), updated_by=current_user " +
                    "WHERE CAST(sales_rep_id AS TEXT)=? AND CAST(customer_id AS TEXT)=? " +
                    "AND coalesce(item_subcategory,'')=coalesce(?, '') AND coalesce(supplier_name,'')=coalesce(?, '') AND coalesce(sales_mgmt_unit,'')=coalesce(?, '')";
            int u = jdbc.update(updateSql,
                    (shareMissing ? null : shareNorm),
                    empIdStr,
                    custIdStr,
                    supplierIdStr,
                    salesRepName,
                    customerName,
                    empIdStr,
                    custIdStr,
                    itemSub,
                    supplier,
                    unit
            );
            if (u == 0) {
                String insertSql = "INSERT INTO public.demand (sales_rep_name, sales_rep_id, customer_id, customer_name, supplier_id, supplier_name, item_subcategory, sales_mgmt_unit, share_rate) VALUES (?,?,?,?,?,?,?,?,?)";
                int i = jdbc.update(insertSql,
                        salesRepName,
                        empIdStr,
                        custIdStr,
                        customerName,
                        supplierIdStr,
                        supplier,
                        itemSub,
                        unit,
                        (shareMissing ? null : shareNorm)
                );
                return ResponseEntity.ok(Map.of("inserted", i, "updated", 0, "total", i));
            } else {
                return ResponseEntity.ok(Map.of("inserted", 0, "updated", u, "total", u));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getClass().getSimpleName()+": "+e.getMessage()));
        }
    }
}
