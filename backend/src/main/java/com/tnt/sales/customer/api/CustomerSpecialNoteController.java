package com.tnt.sales.customer.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerSpecialNoteController {
    private static final String SELECT_NOTES_SQL = "SELECT n.id, n.note_title, n.note_content, n.note_type, n.importance_level, n.created_by, n.updated_by, n.created_at, n.updated_at, " +
            "ce.emp_name AS created_by_name, ue.emp_name AS updated_by_name " +
            "FROM public.customer_special_note n " +
            "LEFT JOIN public.employee ce ON ce.assignee_id = n.created_by " +
            "LEFT JOIN public.employee ue ON ue.assignee_id = n.updated_by " +
            "WHERE n.customer_id = ? AND n.is_deleted = FALSE " +
            "ORDER BY COALESCE(n.updated_at, n.created_at) DESC";
    private static final String INSERT_NOTE_SQL = "INSERT INTO public.customer_special_note (customer_id, note_title, note_content, note_type, importance_level, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id";
    private static final String UPDATE_NOTE_SQL = "UPDATE public.customer_special_note SET note_title = ?, note_content = ?, note_type = ?, importance_level = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND customer_id = ? AND is_deleted = FALSE RETURNING id";
    private static final String SOFT_DELETE_NOTE_SQL = "UPDATE public.customer_special_note SET is_deleted = TRUE, updated_by = ?, updated_at = NOW() WHERE id = ? AND customer_id = ? AND is_deleted = FALSE";
    private static final String SELECT_NOTE_BY_ID_SQL = "SELECT n.id, n.note_title, n.note_content, n.note_type, n.importance_level, n.created_by, n.updated_by, n.created_at, n.updated_at, " +
            "ce.emp_name AS created_by_name, ue.emp_name AS updated_by_name " +
            "FROM public.customer_special_note n " +
            "LEFT JOIN public.employee ce ON ce.assignee_id = n.created_by " +
            "LEFT JOIN public.employee ue ON ue.assignee_id = n.updated_by " +
            "WHERE n.customer_id = ? AND n.id = ? AND n.is_deleted = FALSE";

    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public CustomerSpecialNoteController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @GetMapping("/{customerId}/special-notes")
    public ResponseEntity<?> listNotes(@PathVariable("customerId") String customerIdText) {
        Long customerId = parseCustomerId(customerIdText);
        if (customerId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "customer_id_required"));
        }

        for (String profile : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(profile)) {
                List<Map<String, Object>> mocks = new ArrayList<>();
                mocks.add(Map.of(
                        "id", 1L,
                        "noteTitle", "신용 한도 재검토",
                        "noteContent", "내부 신용 점검 결과 한도가 1억으로 상향 추천",
                        "noteType", "Credit / Receivable",
                        "importanceLevel", 2,
                        "createdBy", "admin",
                        "createdAt", Instant.now().toString(),
                        "updatedAt", Instant.now().toString(),
                        "updatedBy", "admin"
                ));
                return ResponseEntity.ok(mocks);
            }
        }

        try {
            List<Map<String, Object>> rows = jdbc.query(SELECT_NOTES_SQL, new Object[]{customerId}, (rs, rowNum) -> mapRow(rs));
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "list_failed", "message", e.getMessage()));
        }
    }

    @PostMapping("/{customerId}/special-notes")
    public ResponseEntity<?> createNote(@PathVariable("customerId") String customerIdText, @RequestBody SpecialNoteRequest request) {
        Long customerId = parseCustomerId(customerIdText);
        if (customerId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "customer_id_required"));
        }
        if (request.noteContent == null || request.noteContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "note_content_required"));
        }

        String title = (request.noteTitle != null && !request.noteTitle.trim().isEmpty()) ? request.noteTitle.trim() : "특이사항";
        int importance = request.importanceLevel != null ? request.importanceLevel : 1;
        String creator = request.createdBy != null ? request.createdBy : "system";
        String noteType = (request.noteType != null && !request.noteType.isEmpty()) ? request.noteType : null;

        try {
            Long insertedId = jdbc.queryForObject(
                    INSERT_NOTE_SQL,
                    new Object[]{
                            customerId,
                            title,
                            request.noteContent.trim(),
                            noteType,
                            importance,
                            creator,
                            request.updatedBy != null ? request.updatedBy : creator
                    },
                    Long.class
            );
            if (insertedId == null) {
                throw new IllegalStateException("failed to insert note");
            }
            Map<String, Object> inserted = fetchNoteById(customerId, insertedId);
            return ResponseEntity.ok(inserted);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "create_failed", "message", e.getMessage()));
        }
    }

    @PutMapping("/{customerId}/special-notes/{noteId}")
    public ResponseEntity<?> updateNote(@PathVariable("customerId") String customerIdText,
                                        @PathVariable("noteId") String noteIdText,
                                        @RequestBody SpecialNoteRequest request) {
        Long customerId = parseCustomerId(customerIdText);
        Long noteId = parseNoteId(noteIdText);
        if (customerId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "customer_id_required"));
        }
        if (noteId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "note_id_required"));
        }
        if (request.noteContent == null || request.noteContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "note_content_required"));
        }

        String title = (request.noteTitle != null && !request.noteTitle.trim().isEmpty()) ? request.noteTitle.trim() : "특이사항";
        int importance = request.importanceLevel != null ? request.importanceLevel : 1;
        String editor = request.updatedBy != null ? request.updatedBy : "system";
        String noteType = (request.noteType != null && !request.noteType.isEmpty()) ? request.noteType : null;

        try {
            Long updatedId = jdbc.queryForObject(
                    UPDATE_NOTE_SQL,
                    new Object[]{
                            title,
                            request.noteContent.trim(),
                            noteType,
                            importance,
                            editor,
                            noteId,
                            customerId
                    },
                    Long.class
            );
            if (updatedId == null) {
                throw new IllegalStateException("failed to update note");
            }
            Map<String, Object> updated = fetchNoteById(customerId, updatedId);
            return ResponseEntity.ok(updated);
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.status(404).body(Map.of("error", "note_not_found"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "update_failed", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{customerId}/special-notes/{noteId}")
    public ResponseEntity<?> softDelete(@PathVariable("customerId") String customerIdText,
                                        @PathVariable("noteId") String noteIdText,
                                        @RequestBody DeleteNoteRequest request) {
        Long customerId = parseCustomerId(customerIdText);
        Long noteId = parseNoteId(noteIdText);
        if (customerId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "customer_id_required"));
        }
        if (noteId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "note_id_required"));
        }
        String updater = request != null && request.updatedBy != null ? request.updatedBy : "system";
        try {
            int affected = jdbc.update(SOFT_DELETE_NOTE_SQL, updater, noteId, customerId);
            if (affected == 0) {
                return ResponseEntity.status(404).body(Map.of("error", "note_not_found"));
            }
            return ResponseEntity.ok(Map.of("id", noteId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "delete_failed", "message", e.getMessage()));
        }
    }

    private Long parseCustomerId(String text) {
        if (text == null || text.isBlank()) return null;
        try {
            return Long.valueOf(text.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long parseNoteId(String text) {
        if (text == null || text.isBlank()) return null;
        try {
            return Long.valueOf(text.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, Object> fetchNoteById(Long customerId, Long noteId) {
        return jdbc.queryForObject(
                SELECT_NOTE_BY_ID_SQL,
                new Object[]{customerId, noteId},
                (rs, rowNum) -> {
                    try {
                        return mapRow(rs);
                    } catch (SQLException ex) {
                        throw new IllegalStateException(ex);
                    }
                }
        );
    }

    private Map<String, Object> mapRow(ResultSet rs) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", rs.getLong("id"));
        row.put("noteTitle", rs.getString("note_title"));
        row.put("noteContent", rs.getString("note_content"));
        row.put("noteType", rs.getString("note_type"));
        row.put("importanceLevel", rs.getObject("importance_level") != null ? rs.getInt("importance_level") : null);
        row.put("createdBy", rs.getString("created_by"));
        row.put("createdByName", rs.getString("created_by_name"));
        row.put("updatedBy", rs.getString("updated_by"));
        row.put("updatedByName", rs.getString("updated_by_name"));
        row.put("createdAt", toIsoString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toIsoString(rs.getTimestamp("updated_at")));
        return row;
    }

    private String toIsoString(Timestamp ts) {
        if (ts == null) return null;
        Instant instant = ts.toInstant();
        return instant.toString();
    }

    public static class SpecialNoteRequest {
        public String noteTitle;
        public String noteContent;
        public String noteType;
        public Integer importanceLevel;
        public String createdBy;
        public String updatedBy;
    }

    public static class DeleteNoteRequest {
        public String updatedBy;
    }
}
