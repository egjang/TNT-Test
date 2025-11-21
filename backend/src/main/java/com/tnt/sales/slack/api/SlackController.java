package com.tnt.sales.slack.api;

import com.tnt.sales.slack.service.SlackService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/slack")
public class SlackController {
    private static final Logger log = LoggerFactory.getLogger(SlackController.class);

    private final SlackService slackService;

    public SlackController(SlackService slackService) {
        this.slackService = slackService;
    }

    /**
     * 수주장 정보를 Slack으로 전송
     * POST /api/v1/slack/send-order
     *
     * Request Body:
     * {
     *   "OrderTextNo": "TNT-250113-001",
     *   "OrderTextDate": "25-01-13",
     *   "CustSeq": "태광유리",
     *   "SalesEmpSeq": "홍길동",
     *   "OrderText": "수주 내역...",
     *   "Remark": "비고..."
     * }
     */
    @PostMapping("/send-order")
    public ResponseEntity<Map<String, Object>> sendOrderToSlack(@RequestBody Map<String, Object> orderData) {
        log.info("Slack 수주장 전송 요청: {}", orderData.get("CustSeq"));

        Map<String, Object> response = new HashMap<>();

        try {
            boolean success = slackService.sendOrderNotification(orderData);

            if (success) {
                response.put("success", true);
                response.put("message", "Slack 전송이 완료되었습니다.");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Slack Webhook URL이 설정되지 않았습니다.");
                return ResponseEntity.status(500).body(response);
            }
        } catch (Exception e) {
            log.error("Slack 전송 중 오류 발생", e);
            response.put("success", false);
            response.put("message", "Slack 전송 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 복사 포맷으로 Slack 전송 (회사코드/거래처/등록자/지역 그룹/주문내용/요청사항)
     * POST /api/v1/slack/send-order-copy
     */
    @PostMapping("/send-order-copy")
    public ResponseEntity<Map<String, Object>> sendOrderCopy(@RequestBody Map<String, Object> body) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String orderNo = firstNonBlank(body.get("orderNo"), body.get("OrderTextNo"));
            String companyCode = String.valueOf(body.getOrDefault("companyCode", ""));
            String customerName = String.valueOf(body.getOrDefault("customerName", ""));
            String createdBy = String.valueOf(body.getOrDefault("createdBy", ""));
            String regionGroup = String.valueOf(body.getOrDefault("regionGroup", ""));
            String orderText = String.valueOf(body.getOrDefault("orderText", ""));
            String orderRemark = String.valueOf(body.getOrDefault("orderRemark", ""));
            String requestDate = firstNonBlank(
                    body.get("requestDate"),
                    body.get("RequestDate"),
                    body.get("request_date"),
                    body.get("delvDate"),
                    body.get("DelvDate"),
                    body.get("OrderTextDate"),
                    body.get("orderTextDate")
            );
            boolean ok = slackService.sendOrderCopyFormat(orderNo, companyCode, customerName, createdBy, regionGroup, orderText, orderRemark, requestDate);
            resp.put("success", ok);
            resp.put("message", ok ? "Slack 전송이 완료되었습니다." : "Slack 전송 실패");
            return ok ? ResponseEntity.ok(resp) : ResponseEntity.status(500).body(resp);
        } catch (Exception e) {
            log.error("Slack 전송 중 오류", e);
            resp.put("success", false);
            resp.put("message", "Slack 전송 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * 간단한 메시지를 Slack으로 전송 (테스트용)
     * POST /api/v1/slack/send-message
     *
     * Request Body:
     * {
     *   "message": "테스트 메시지"
     * }
     */
    @PostMapping("/send-message")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        log.info("Slack 메시지 전송 요청: {}", message);

        Map<String, Object> response = new HashMap<>();

        try {
            boolean success = slackService.sendMessage(message);

            if (success) {
                response.put("success", true);
                response.put("message", "Slack 전송이 완료되었습니다.");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Slack Webhook URL이 설정되지 않았습니다.");
                return ResponseEntity.status(500).body(response);
            }
        } catch (Exception e) {
            log.error("Slack 전송 중 오류 발생", e);
            response.put("success", false);
            response.put("message", "Slack 전송 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    private static String firstNonBlank(Object... vals) {
        for (Object v : vals) {
            if (v == null) continue;
            String s = String.valueOf(v).trim();
            if (!s.isEmpty()) return s;
        }
        return "";
    }
}
