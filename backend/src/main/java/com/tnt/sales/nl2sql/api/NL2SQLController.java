package com.tnt.sales.nl2sql.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/nl2sql")
public class NL2SQLController {
    private static final Logger log = LoggerFactory.getLogger(NL2SQLController.class);
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    @Autowired(required = false)
    @Qualifier("pgJdbcTemplate")
    JdbcTemplate pgJdbc;

    @Value("${app.gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.0-flash-exp}")
    private String geminiModel;

    @Value("${app.claude.apiKey:}")
    private String claudeApiKey;

    @Value("${app.claude.model:claude-3-5-sonnet-20241022}")
    private String claudeModel;

    @Value("${app.claude.maxTokens:4096}")
    private int claudeMaxTokens;

    /**
     * Get PostgreSQL database schema information
     */
    @GetMapping("/schema")
    public ResponseEntity<?> getSchema() {
        if (pgJdbc == null) {
            return ResponseEntity.ok(Map.of("error", "PostgreSQL datasource not configured"));
        }

        try {
            // Get all tables and their columns with descriptions (Korean names)
            String schemaSql = """
                SELECT
                    t.table_schema,
                    t.table_name,
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    c.column_default,
                    col_description((t.table_schema || '.' || t.table_name)::regclass::oid, c.ordinal_position) as column_description
                FROM information_schema.tables t
                JOIN information_schema.columns c
                    ON t.table_schema = c.table_schema
                    AND t.table_name = c.table_name
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                    AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema, t.table_name, c.ordinal_position
            """;

            List<Map<String, Object>> schemaData = pgJdbc.queryForList(schemaSql);

            // Get foreign key relationships
            String fkSql = """
                SELECT
                    tc.table_schema,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_schema AS foreign_table_schema,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
            """;

            List<Map<String, Object>> foreignKeys = pgJdbc.queryForList(fkSql);

            // Group by table
            Map<String, List<Map<String, Object>>> tableGroups = schemaData.stream()
                    .collect(Collectors.groupingBy(row ->
                        row.get("table_schema") + "." + row.get("table_name")
                    ));

            List<Map<String, Object>> tables = new ArrayList<>();
            for (Map.Entry<String, List<Map<String, Object>>> entry : tableGroups.entrySet()) {
                Map<String, Object> table = new LinkedHashMap<>();
                List<Map<String, Object>> rows = entry.getValue();
                if (!rows.isEmpty()) {
                    table.put("schema", rows.get(0).get("table_schema"));
                    table.put("name", rows.get(0).get("table_name"));

                    List<Map<String, Object>> columns = rows.stream().map(row -> {
                        Map<String, Object> col = new LinkedHashMap<>();
                        col.put("name", row.get("column_name"));
                        col.put("type", row.get("data_type"));
                        col.put("nullable", row.get("is_nullable"));
                        col.put("default", row.get("column_default"));
                        col.put("description", row.get("column_description"));
                        return col;
                    }).collect(Collectors.toList());

                    table.put("columns", columns);
                    tables.add(table);
                }
            }

            return ResponseEntity.ok(Map.of(
                "tables", tables,
                "foreignKeys", foreignKeys
            ));
        } catch (Exception e) {
            log.error("Failed to retrieve schema", e);
            return ResponseEntity.ok(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Convert natural language to SQL and execute
     */
    @PostMapping("/query")
    public ResponseEntity<?> executeNaturalLanguageQuery(@RequestBody Map<String, String> request) {
        String question = request.get("question");

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));
        }

        if (pgJdbc == null) {
            return ResponseEntity.ok(Map.of("error", "PostgreSQL datasource not configured"));
        }

        // Prefer Gemini API if configured, fallback to Claude
        boolean useGemini = geminiApiKey != null && !geminiApiKey.trim().isEmpty();
        boolean useClaude = claudeApiKey != null && !claudeApiKey.trim().isEmpty();

        if (!useGemini && !useClaude) {
            return ResponseEntity.ok(Map.of("error", "No LLM API key configured (Gemini or Claude required)"));
        }

        try {
            // Step 1: Get database schema
            String schemaInfo = buildSchemaContext();

            // Step 2: Call LLM API to convert NL to SQL
            String sql = useGemini ? convertToSQL(question, schemaInfo) : convertToSQLWithClaude(question, schemaInfo);

            if (sql == null || sql.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("error", "Failed to generate SQL from question"));
            }

            // Step 3: Validate SQL (only allow SELECT)
            String sqlLower = sql.trim().toLowerCase();
            if (!sqlLower.startsWith("select")) {
                return ResponseEntity.ok(Map.of(
                    "error", "Only SELECT queries are allowed for security reasons",
                    "generatedSQL", sql
                ));
            }

            // Step 4: Execute SQL
            List<Map<String, Object>> results = pgJdbc.queryForList(sql);

            return ResponseEntity.ok(Map.of(
                "question", question,
                "sql", sql,
                "results", results,
                "rowCount", results.size()
            ));

        } catch (Exception e) {
            log.error("NL2SQL query failed", e);
            return ResponseEntity.ok(Map.of(
                "error", e.getMessage(),
                "question", question
            ));
        }
    }

    private String buildSchemaContext() {
        try {
            String schemaSql = """
                SELECT
                    t.table_schema,
                    t.table_name,
                    string_agg(c.column_name || ' (' || c.data_type || ')', ', ' ORDER BY c.ordinal_position) as columns
                FROM information_schema.tables t
                JOIN information_schema.columns c
                    ON t.table_schema = c.table_schema
                    AND t.table_name = c.table_name
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                    AND t.table_type = 'BASE TABLE'
                GROUP BY t.table_schema, t.table_name
                ORDER BY t.table_schema, t.table_name
            """;

            List<Map<String, Object>> tables = pgJdbc.queryForList(schemaSql);

            StringBuilder context = new StringBuilder("Database Schema:\n\n");
            for (Map<String, Object> table : tables) {
                context.append(String.format("Table: %s.%s\n",
                    table.get("table_schema"),
                    table.get("table_name")));
                context.append(String.format("Columns: %s\n\n", table.get("columns")));
            }

            // Add foreign keys info
            String fkSql = """
                SELECT
                    tc.table_schema || '.' || tc.table_name as from_table,
                    kcu.column_name as from_column,
                    ccu.table_schema || '.' || ccu.table_name as to_table,
                    ccu.column_name as to_column
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
            """;

            List<Map<String, Object>> fks = pgJdbc.queryForList(fkSql);
            if (!fks.isEmpty()) {
                context.append("Foreign Key Relationships:\n");
                for (Map<String, Object> fk : fks) {
                    context.append(String.format("- %s.%s -> %s.%s\n",
                        fk.get("from_table"), fk.get("from_column"),
                        fk.get("to_table"), fk.get("to_column")));
                }
            }

            return context.toString();
        } catch (Exception e) {
            log.error("Failed to build schema context", e);
            return "Error building schema context";
        }
    }

    private String convertToSQL(String question, String schemaInfo) throws Exception {
        String prompt = String.format("""
            You are a PostgreSQL SQL expert. Convert the following natural language question into a valid PostgreSQL SELECT query.

            %s

            User Question: %s

            Rules:
            1. Generate ONLY the SQL query, no explanations or markdown formatting
            2. Use proper PostgreSQL syntax
            3. Include appropriate JOINs when needed
            4. Use table aliases for readability
            5. Return ONLY SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
            6. Limit results to 1000 rows unless specifically asked for more
            7. Use proper column names and table names from the schema above

            SQL Query:
            """, schemaInfo, question);

        // Call Gemini API
        String url = String.format(
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
            geminiModel,
            geminiApiKey
        );

        Map<String, Object> requestBody = new LinkedHashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> content = new LinkedHashMap<>();
        List<Map<String, String>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));
        content.put("parts", parts);
        contents.add(content);
        requestBody.put("contents", contents);

        // Add generation config for better SQL generation
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.1);
        generationConfig.put("maxOutputTokens", 2048);
        requestBody.put("generationConfig", generationConfig);

        String jsonBody = om.writeValueAsString(requestBody);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("Gemini API error: {}", response.body());
            throw new RuntimeException("Gemini API returned status " + response.statusCode());
        }

        JsonNode root = om.readTree(response.body());
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode firstCandidate = candidates.get(0);
            JsonNode contentNode = firstCandidate.path("content");
            JsonNode partsNode = contentNode.path("parts");
            if (partsNode.isArray() && partsNode.size() > 0) {
                String sqlText = partsNode.get(0).path("text").asText();
                // Clean up the SQL (remove markdown code blocks if present)
                sqlText = sqlText.trim();
                if (sqlText.startsWith("```sql")) {
                    sqlText = sqlText.substring(6);
                }
                if (sqlText.startsWith("```")) {
                    sqlText = sqlText.substring(3);
                }
                if (sqlText.endsWith("```")) {
                    sqlText = sqlText.substring(0, sqlText.length() - 3);
                }
                return sqlText.trim();
            }
        }

        throw new RuntimeException("No valid response from Gemini API");
    }

    private String convertToSQLWithClaude(String question, String schemaInfo) throws Exception {
        String prompt = String.format("""
            You are a PostgreSQL SQL expert. Convert the following natural language question into a valid PostgreSQL SELECT query.

            %s

            User Question: %s

            Rules:
            1. Generate ONLY the SQL query, no explanations or markdown formatting
            2. Use proper PostgreSQL syntax
            3. Include appropriate JOINs when needed
            4. Use table aliases for readability
            5. Return ONLY SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
            6. Limit results to 1000 rows unless specifically asked for more
            7. Use proper column names and table names from the schema above

            SQL Query:
            """, schemaInfo, question);

        // Call Claude API
        String url = "https://api.anthropic.com/v1/messages";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", claudeModel);
        requestBody.put("max_tokens", claudeMaxTokens);

        List<Map<String, Object>> messages = new ArrayList<>();
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", prompt);
        messages.add(message);
        requestBody.put("messages", messages);

        String jsonBody = om.writeValueAsString(requestBody);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("x-api-key", claudeApiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(60))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("Claude API error: {}", response.body());
            throw new RuntimeException("Claude API returned status " + response.statusCode());
        }

        JsonNode root = om.readTree(response.body());
        JsonNode content = root.path("content");
        if (content.isArray() && content.size() > 0) {
            String sqlText = content.get(0).path("text").asText();
            // Clean up the SQL (remove markdown code blocks if present)
            sqlText = sqlText.trim();
            if (sqlText.startsWith("```sql")) {
                sqlText = sqlText.substring(6);
            }
            if (sqlText.startsWith("```")) {
                sqlText = sqlText.substring(3);
            }
            if (sqlText.endsWith("```")) {
                sqlText = sqlText.substring(0, sqlText.length() - 3);
            }
            return sqlText.trim();
        }

        throw new RuntimeException("No valid response from Claude API");
    }
}
