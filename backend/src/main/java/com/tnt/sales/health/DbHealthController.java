package com.tnt.sales.health;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class DbHealthController {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final Environment env;

    @Autowired
    public DbHealthController(JdbcTemplate jdbcTemplate, DataSource dataSource, Environment env) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
        this.env = env;
    }

    @GetMapping("/db")
    public Map<String, Object> db() {
        Map<String, Object> res = new HashMap<>();
        res.put("timestamp", Instant.now().toString());
        res.put("profiles", env.getActiveProfiles());
        try {
            Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            res.put("query", one);
            try (Connection c = dataSource.getConnection()) {
                DatabaseMetaData md = c.getMetaData();
                res.put("databaseProduct", md.getDatabaseProductName());
                res.put("databaseVersion", md.getDatabaseProductVersion());
                res.put("driverName", md.getDriverName());
                res.put("driverVersion", md.getDriverVersion());
            }
            res.put("status", "UP");
        } catch (Exception e) {
            res.put("status", "DOWN");
            res.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
        }
        return res;
    }
}
