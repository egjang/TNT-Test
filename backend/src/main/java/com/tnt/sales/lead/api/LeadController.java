package com.tnt.sales.lead.api;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path = "/api/v1/leads", produces = MediaType.APPLICATION_JSON_VALUE)
public class LeadController {

    private final JdbcTemplate jdbc;

    public LeadController(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @DeleteMapping(path = "/{id}")
    public ResponseEntity<Map<String, Object>> deleteLead(@PathVariable("id") long id) {
        String sql = "DELETE FROM public.lead WHERE id = ?";
        try {
            int count = jdbc.update(sql, id);
            return ResponseEntity.ok(Map.of("deleted", count));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(500).body(Map.of("error", "delete_failed", "message", ex.getMessage()));
        }
    }

    @GetMapping(path = "/{id}")
    public Map<String, Object> findOne(@PathVariable("id") long id) {
        String sql = "select l.id, l.lead_status, l.lead_source, l.contact_name, l.email, l.company_name, l.biz_type, l.office_phone, l.biz_no, " +
                "l.addr_province_name, l.address, l.fax_no, l.contact_phone, l.biz_longitude, l.biz_latitude, l.note, l.last_activity_at, l.owner_id, l.assignee_id, l.created_by, l.created_at, l.updated_by, l.updated_at, " +
                "EXISTS (SELECT 1 FROM public.sales_activity sa WHERE CAST(sa.sf_lead_id AS TEXT) = CAST(l.id AS TEXT) LIMIT 1) AS has_activity, " +
                "(select emp_name from public.employee e where cast(e.assignee_id as text)=cast(l.assignee_id as text) or cast(e.emp_id as text)=cast(l.owner_id as text) limit 1) as owner_name, " +
                "(select emp_name from public.employee e where cast(e.emp_id as text)=cast(l.created_by as text) or cast(e.assignee_id as text)=cast(l.created_by as text) limit 1) as created_by_name, " +
                "(select emp_name from public.employee e where cast(e.emp_id as text)=cast(l.updated_by as text) or cast(e.assignee_id as text)=cast(l.updated_by as text) limit 1) as updated_by_name " +
                "from public.lead l where l.id = ?";

        return jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            ps.setQueryTimeout(30);
            ps.setLong(1, id);
            return ps;
        }, rs -> {
            if (rs.next()) {
                ResultSetMetaData md = rs.getMetaData();
                int cols = md.getColumnCount();
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= cols; i++) {
                    row.put(md.getColumnLabel(i), rs.getObject(i));
                }
                return row;
            }
            return Map.of();
        });
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> createLead(@RequestBody Map<String, Object> body) {
        // Insert a new lead row; rely on defaults for created_at/updated_at
        String sql = "insert into public.lead (" +
                "lead_status, lead_source, contact_name, email, company_name, biz_type, office_phone, biz_no, " +
                "addr_province_name, address, fax_no, contact_phone, biz_longitude, biz_latitude, note, last_activity_at, owner_id, assignee_id, created_by, updated_by" +
                ") values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) returning id";

        Object lead_status = body.getOrDefault("lead_status", null);
        Object lead_source = body.getOrDefault("lead_source", null);
        Object contact_name = body.getOrDefault("contact_name", null);
        Object email = body.getOrDefault("email", null);
        Object company_name = body.getOrDefault("company_name", null);
        Object biz_type = body.getOrDefault("biz_type", null);
        Object office_phone = body.getOrDefault("office_phone", null);
        Object biz_no = body.getOrDefault("biz_no", null);
        Object addr_province_name = body.getOrDefault("addr_province_name", null);
        Object address = body.getOrDefault("address", null);
        Object fax_no = body.getOrDefault("fax_no", null);
        Object contact_phone = body.getOrDefault("contact_phone", null);
        Object biz_longitude = body.getOrDefault("biz_longitude", null);
        Object biz_latitude = body.getOrDefault("biz_latitude", null);
        Object note = body.getOrDefault("note", null);
        Object last_activity_at = body.getOrDefault("last_activity_at", null);
        Object owner_id = body.getOrDefault("owner_id", null);
        Object assignee_id = body.getOrDefault("assignee_id", null);
        Object created_by = body.getOrDefault("created_by", null);
        Object updated_by = body.getOrDefault("updated_by", null);

        Long id = jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            int i = 1;
            ps.setObject(i++, lead_status);
            ps.setObject(i++, lead_source);
            ps.setObject(i++, contact_name);
            ps.setObject(i++, email);
            ps.setObject(i++, company_name);
            ps.setObject(i++, biz_type);
            ps.setObject(i++, office_phone);
            ps.setObject(i++, biz_no);
            ps.setObject(i++, addr_province_name);
            ps.setObject(i++, address);
            ps.setObject(i++, fax_no);
            ps.setObject(i++, contact_phone);
            ps.setObject(i++, biz_longitude);
            ps.setObject(i++, biz_latitude);
            ps.setObject(i++, note);
            ps.setObject(i++, last_activity_at);
            ps.setObject(i++, owner_id);
            ps.setObject(i++, assignee_id);
            ps.setObject(i++, created_by);
            ps.setObject(i++, updated_by);
            ps.setQueryTimeout(30);
            return ps;
        }, rs -> {
            if (rs.next()) return rs.getLong(1);
            return null;
        });

        if (id == null) id = -1L;
        return Map.of("id", id);
    }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(value = "owner", required = false) String owner,
            @RequestParam(value = "assignee_id", required = false) String assigneeId,
            @RequestParam(value = "company_name", required = false) String companyName,
            @RequestParam(value = "contact_name", required = false) String contactName,
            @RequestParam(value = "lead_status", required = false) String leadStatus,
            @RequestParam(value = "region", required = false) String region,
            @RequestParam(value = "limit", required = false, defaultValue = "200") int limit
    ) {
        StringBuilder sql = new StringBuilder();
        sql.append("select l.id, l.lead_status, l.lead_source, l.contact_name, l.email, l.company_name, l.biz_type, l.office_phone, l.biz_no, l.addr_province_name, l.address, l.fax_no, l.contact_phone, l.biz_longitude, l.biz_latitude, l.note, l.last_activity_at, l.owner_id, l.assignee_id, l.created_by, l.created_at, l.updated_by, l.updated_at, ");
        // 활동 존재 여부 플래그 (exists)
        sql.append("  EXISTS (SELECT 1 FROM public.sales_activity sa WHERE CAST(sa.sf_lead_id AS TEXT) = CAST(l.id AS TEXT) LIMIT 1) AS has_activity, ");
        sql.append("  (select emp_name from public.employee e where cast(e.assignee_id as text)=cast(l.assignee_id as text) or cast(e.emp_id as text)=cast(l.owner_id as text) limit 1) as owner_name, ");
        sql.append("  (select emp_name from public.employee e where cast(e.emp_id as text)=cast(l.created_by as text) or cast(e.assignee_id as text)=cast(l.created_by as text) limit 1) as created_by_name, ");
        sql.append("  (select emp_name from public.employee e where cast(e.emp_id as text)=cast(l.updated_by as text) or cast(e.assignee_id as text)=cast(l.updated_by as text) limit 1) as updated_by_name ");
        sql.append("from public.lead l ");

        List<Object> params = new ArrayList<>();
        List<String> where = new ArrayList<>();

        if (StringUtils.hasText(companyName)) {
            where.add("company_name ilike ?");
            params.add("%" + companyName.trim() + "%");
        }
        if (StringUtils.hasText(contactName)) {
            where.add("contact_name ilike ?");
            params.add("%" + contactName.trim() + "%");
        }
        if (StringUtils.hasText(leadStatus)) {
            where.add("lead_status ilike ?");
            params.add("%" + leadStatus.trim() + "%");
        }
        if (StringUtils.hasText(region)) {
            where.add("addr_province_name ilike ?");
            params.add("%" + region.trim() + "%");
        }
        if (StringUtils.hasText(owner)) {
            // If numeric, treat as owner_id, else ignore (owner name mapping TBD)
            try {
                long ownerId = Long.parseLong(owner.trim());
                where.add("owner_id = ?");
                params.add(ownerId);
            } catch (NumberFormatException ignored) { /* owner name mapping is out of scope for now */ }
        }
        if (StringUtils.hasText(assigneeId)) {
            where.add("assignee_id = ?");
            params.add(assigneeId.trim());
        }

        if (!where.isEmpty()) {
            sql.append(" where ").append(String.join(" and ", where));
        }
        sql.append(" order by created_at desc, id desc limit ").append(Math.max(1, Math.min(limit, 1000)));

        return jdbc.query(con -> {
            var ps = con.prepareStatement(sql.toString());
            ps.setQueryTimeout(30);
            int idx = 1;
            for (Object p : params) {
                ps.setObject(idx++, p);
            }
            return ps;
        }, rs -> {
            List<Map<String, Object>> list = new ArrayList<>();
            ResultSetMetaData md = rs.getMetaData();
            int cols = md.getColumnCount();
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= cols; i++) {
                    row.put(md.getColumnLabel(i), rs.getObject(i));
                }
                list.add(row);
            }
            return list;
        });
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> updateLead(@PathVariable("id") long id, @RequestBody Map<String, Object> body) {
        // Build UPDATE setting known columns. updated_at is set to now().
        // Update the commonly edited fields (align with form). Avoid longitude/latitude/last_activity to reduce schema mismatch risks.
        String sql = "update public.lead set " +
                "lead_status=?, lead_source=?, contact_name=?, email=?, company_name=?, biz_type=?, office_phone=?, biz_no=?, " +
                "addr_province_name=?, address=?, fax_no=?, contact_phone=?, note=?, " +
                "owner_id=COALESCE(?, owner_id), assignee_id=COALESCE(?, assignee_id), updated_by=?, updated_at=now() " +
                "where id=?";

        Object lead_status = body.getOrDefault("lead_status", null);
        Object lead_source = body.getOrDefault("lead_source", null);
        Object contact_name = body.getOrDefault("contact_name", null);
        Object email = body.getOrDefault("email", null);
        Object company_name = body.getOrDefault("company_name", null);
        Object biz_type = body.getOrDefault("biz_type", null);
        Object office_phone = body.getOrDefault("office_phone", null);
        Object biz_no = body.getOrDefault("biz_no", null);
        Object addr_province_name = body.getOrDefault("addr_province_name", null);
        Object address = body.getOrDefault("address", null);
        Object fax_no = body.getOrDefault("fax_no", null);
        Object contact_phone = body.getOrDefault("contact_phone", null);
        Object note = body.getOrDefault("note", null);
        Object owner_id = body.getOrDefault("owner_id", null);
        Object assignee_id = body.getOrDefault("assignee_id", null);
        Object updated_by = body.getOrDefault("updated_by", null);

        int updated = jdbc.update(con -> {
            var ps = con.prepareStatement(sql);
            int i = 1;
            ps.setObject(i++, lead_status);
            ps.setObject(i++, lead_source);
            ps.setObject(i++, contact_name);
            ps.setObject(i++, email);
            ps.setObject(i++, company_name);
            ps.setObject(i++, biz_type);
            ps.setObject(i++, office_phone);
            ps.setObject(i++, biz_no);
            ps.setObject(i++, addr_province_name);
            ps.setObject(i++, address);
            ps.setObject(i++, fax_no);
            ps.setObject(i++, contact_phone);
            ps.setObject(i++, note);
            ps.setObject(i++, owner_id);
            ps.setObject(i++, assignee_id);
            ps.setObject(i++, updated_by);
            ps.setObject(i, id);
            ps.setQueryTimeout(30);
            return ps;
        });
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", updated > 0);
        out.put("updated", updated);
        return out;
    }
}
