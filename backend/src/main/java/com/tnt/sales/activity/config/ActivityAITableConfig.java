package com.tnt.sales.activity.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI Agent 활동 분석 테이블 설정을 로드하는 컴포넌트
 * activity-ai-tables.yml 파일에서 테이블 정의를 읽어옵니다.
 */
@Component
public class ActivityAITableConfig {
    private static final Logger log = LoggerFactory.getLogger(ActivityAITableConfig.class);

    private List<TableDefinition> tables = new ArrayList<>();

    @PostConstruct
    public void init() {
        loadConfig();
    }

    public void loadConfig() {
        try {
            ClassPathResource resource = new ClassPathResource("activity-ai-tables.yml");
            Yaml yaml = new Yaml();

            try (InputStream inputStream = resource.getInputStream()) {
                Map<String, Object> config = yaml.load(inputStream);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> tableConfigs = (List<Map<String, Object>>) config.get("tables");

                tables.clear();

                if (tableConfigs != null) {
                    for (Map<String, Object> tableConfig : tableConfigs) {
                        TableDefinition table = parseTableDefinition(tableConfig);
                        if (table.isEnabled()) {
                            tables.add(table);
                            log.info("Loaded AI table config: {}", table.getName());
                        }
                    }
                }

                log.info("Total {} AI analysis tables loaded", tables.size());
            }
        } catch (Exception e) {
            log.error("Failed to load activity-ai-tables.yml", e);
        }
    }

    @SuppressWarnings("unchecked")
    private TableDefinition parseTableDefinition(Map<String, Object> config) {
        TableDefinition table = new TableDefinition();
        table.setName((String) config.get("name"));
        table.setDisplayName((String) config.get("displayName"));
        table.setEnabled(config.get("enabled") != null ? (Boolean) config.get("enabled") : true);
        table.setDateColumn((String) config.get("dateColumn"));
        table.setLimit(config.get("limit") != null ? (Integer) config.get("limit") : 100);
        table.setSql((String) config.get("sql"));

        List<Map<String, Object>> fieldConfigs = (List<Map<String, Object>>) config.get("fields");
        if (fieldConfigs != null) {
            List<FieldDefinition> fields = new ArrayList<>();
            for (Map<String, Object> fieldConfig : fieldConfigs) {
                FieldDefinition field = new FieldDefinition();
                field.setColumn((String) fieldConfig.get("column"));
                field.setLabel((String) fieldConfig.get("label"));
                field.setFallback((String) fieldConfig.get("fallback"));
                field.setOptional(fieldConfig.get("optional") != null ? (Boolean) fieldConfig.get("optional") : false);
                fields.add(field);
            }
            table.setFields(fields);
        }

        return table;
    }

    public List<TableDefinition> getTables() {
        return tables;
    }

    public List<TableDefinition> getEnabledTables() {
        return tables.stream()
                .filter(TableDefinition::isEnabled)
                .toList();
    }

    /**
     * 테이블 정의 클래스
     */
    public static class TableDefinition {
        private String name;
        private String displayName;
        private boolean enabled = true;
        private String dateColumn;
        private int limit = 100;
        private String sql;
        private List<FieldDefinition> fields = new ArrayList<>();

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public String getDateColumn() { return dateColumn; }
        public void setDateColumn(String dateColumn) { this.dateColumn = dateColumn; }

        public int getLimit() { return limit; }
        public void setLimit(int limit) { this.limit = limit; }

        public String getSql() { return sql; }
        public void setSql(String sql) { this.sql = sql; }

        public List<FieldDefinition> getFields() { return fields; }
        public void setFields(List<FieldDefinition> fields) { this.fields = fields; }
    }

    /**
     * 필드 정의 클래스
     */
    public static class FieldDefinition {
        private String column;
        private String label;
        private String fallback;
        private boolean optional = false;

        // Getters and Setters
        public String getColumn() { return column; }
        public void setColumn(String column) { this.column = column; }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public String getFallback() { return fallback; }
        public void setFallback(String fallback) { this.fallback = fallback; }

        public boolean isOptional() { return optional; }
        public void setOptional(boolean optional) { this.optional = optional; }
    }
}
