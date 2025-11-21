package com.tnt.sales.auth.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final Environment env;

    @Autowired
    public AuthController(JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    public static class ChangePasswordRequest {
        public String empId;
        public String currentPassword;
        public String newPassword;
        public String getEmpId() { return empId; }
        public void setEmpId(String empId) { this.empId = empId; }
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    public static class LoginRequest {
        public String empId;
        public String password;
        public String getEmpId() { return empId; }
        public void setEmpId(String empId) { this.empId = empId; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String empId = req == null || req.empId == null ? "" : req.empId.trim();
        String password = req == null || req.password == null ? "" : req.password;
        if (empId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "사번을 입력해 주세요"));
        }
        if (password.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "비밀번호를 입력해 주세요"));
        }
        for (String p : env.getActiveProfiles()) {
            if ("nodb".equalsIgnoreCase(p)) {
                // In nodb profile, accept any non-empty empId as existing
                // Return empId as a stand-in for assigneeId for demo
                return ResponseEntity.ok(Map.of(
                        "ok", true,
                        "empId", empId,
                        "empName", empId,
                        "assigneeId", empId
                ));
            }
        }
        try {
            // 0) Verify against users table: username=empId, active=true, password matches (plain)
            try {
                var u = jdbc.queryForMap("SELECT password, active FROM public.users WHERE username = ? LIMIT 1", empId);
                Object ap = u.get("active");
                boolean active = false;
                if (ap instanceof Boolean) active = (Boolean) ap;
                else if (ap != null) active = "1".equals(String.valueOf(ap)) || "true".equalsIgnoreCase(String.valueOf(ap));
                if (!active) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("ok", false, "error", "비활성 사용자입니다"));
                }
                String pw = u.get("password") == null ? "" : String.valueOf(u.get("password"));
                if (!pw.equals(password)) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("ok", false, "error", "사번 또는 비밀번호가 올바르지 않습니다"));
                }
            } catch (EmptyResultDataAccessException e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("ok", false, "error", "사번 또는 비밀번호가 올바르지 않습니다"));
            }
            // Fetch employee info; 404 if not found
            var row = jdbc.queryForMap(
                    "SELECT emp_name, assignee_id FROM public.employee WHERE emp_id = ? LIMIT 1",
                    empId
            );
            String empName = row.get("emp_name") == null ? null : String.valueOf(row.get("emp_name"));
            String assigneeId = row.get("assignee_id") == null ? null : String.valueOf(row.get("assignee_id"));
            if (empName != null && !empName.isBlank()) {
                return ResponseEntity.ok(Map.of(
                        "ok", true,
                        "empId", empId,
                        "empName", empName,
                        "assigneeId", assigneeId
                ));
            }
        } catch (EmptyResultDataAccessException e) {
            // fall-through to 404
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("ok", false, "error", "사용자가 존재하지 않습니다"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {
        String empId = req == null || req.empId == null ? "" : req.empId.trim();
        String current = req == null || req.currentPassword == null ? "" : req.currentPassword;
        String next = req == null || req.newPassword == null ? "" : req.newPassword;
        if (empId.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","사번을 입력해 주세요"));
        if (current.isEmpty() || next.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","현재/새 비밀번호를 입력해 주세요"));
        try {
            var u = jdbc.queryForMap("SELECT password, active FROM public.users WHERE username = ? LIMIT 1", empId);
            boolean active = false; Object ap = u.get("active");
            if (ap instanceof Boolean) active = (Boolean) ap; else if (ap != null) active = "1".equals(String.valueOf(ap)) || "true".equalsIgnoreCase(String.valueOf(ap));
            if (!active) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","비활성 사용자입니다"));
            String pw = u.get("password") == null ? "" : String.valueOf(u.get("password"));
            if (!pw.equals(current)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","현재 비밀번호가 올바르지 않습니다"));
            int updated = jdbc.update("UPDATE public.users SET password = ? WHERE username = ?", next, empId);
            if (updated > 0) return ResponseEntity.ok(Map.of("ok", true));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","비밀번호 변경 실패"));
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error","사용자가 존재하지 않습니다"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","비밀번호 변경 중 오류"));
        }
    }
}
