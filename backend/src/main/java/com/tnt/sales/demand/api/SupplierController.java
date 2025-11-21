package com.tnt.sales.demand.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/supplier")
public class SupplierController {
    private final JdbcTemplate jdbc;

    @Autowired
    public SupplierController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/subcategories")
    public ResponseEntity<?> subcategories() {
        List<String> rows = jdbc.query("SELECT DISTINCT item_subcategory FROM public.supplier WHERE item_subcategory IS NOT NULL ORDER BY 1", (rs, i) -> rs.getString(1));
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/names")
    public ResponseEntity<?> supplierNames(@RequestParam("subcategory") String subcategory) {
        String sub = subcategory == null ? "" : subcategory.trim();
        if (sub.isEmpty()) return ResponseEntity.badRequest().body(java.util.Map.of("error","subcategory is required"));
        List<String> rows = jdbc.query(
                "SELECT supplier_name FROM (" +
                        "  SELECT DISTINCT supplier_name FROM public.supplier " +
                        "  WHERE item_subcategory = ? AND supplier_name IS NOT NULL" +
                        ") s ORDER BY CASE WHEN supplier_name ILIKE 'TNT' THEN 0 ELSE 1 END, supplier_name ASC",
                new Object[]{sub},
                (rs, i) -> rs.getString(1)
        );
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/units")
    public ResponseEntity<?> salesMgmtUnits(@RequestParam("subcategory") String subcategory,
                                            @RequestParam("supplier") String supplier) {
        List<String> rows = jdbc.query(
                "SELECT DISTINCT sales_mgmt_unit FROM public.supplier WHERE item_subcategory = ? AND supplier_name = ? AND sales_mgmt_unit IS NOT NULL ORDER BY 1",
                new Object[]{subcategory, supplier},
                (rs, i) -> rs.getString(1)
        );
        return ResponseEntity.ok(rows);
    }
}
