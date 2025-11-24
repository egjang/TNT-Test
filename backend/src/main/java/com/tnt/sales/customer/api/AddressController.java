package com.tnt.sales.customer.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/address")
public class AddressController {
    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public AddressController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @GetMapping("/provinces")
    public ResponseEntity<?> provinces() {
        // nodb fallback
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                return ResponseEntity.ok(List.of("서울", "경기", "인천", "부산"));
            }
        }
        try {
            List<String> rows = jdbc.query(
                    "SELECT DISTINCT addr_province_name FROM public.address_area WHERE addr_province_name IS NOT NULL AND addr_province_name <> '' ORDER BY addr_province_name",
                    (rs, i) -> rs.getString(1)
            );
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "query_failed", "message", e.getMessage()));
        }
    }

    @GetMapping("/districts")
    public ResponseEntity<?> districts(@RequestParam("province") String province) {
        if (province == null || province.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "province_required"));
        }
        // nodb fallback
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                if ("서울".equals(province)) return ResponseEntity.ok(List.of("강남구","송파구","마포구"));
                if ("경기".equals(province)) return ResponseEntity.ok(List.of("성남시","수원시","용인시"));
                return ResponseEntity.ok(List.of());
            }
        }
        try {
            List<String> rows = jdbc.query(
                    "SELECT DISTINCT addr_district_name FROM public.address_area WHERE addr_province_name ILIKE ? AND addr_district_name IS NOT NULL AND addr_district_name <> '' ORDER BY addr_district_name",
                    (rs, i) -> rs.getString(1),
                    "%" + province.trim() + "%"
            );
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "query_failed", "message", e.getMessage()));
        }
    }
}

