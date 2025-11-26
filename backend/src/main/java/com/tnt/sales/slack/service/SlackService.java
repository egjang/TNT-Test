package com.tnt.sales.slack.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SlackService {
    private static final Logger log = LoggerFactory.getLogger(SlackService.class);

    @Value("${slack.bot.token:}")
    private String botToken;

    @Value("${slack.channel.id:}")
    private String channelId;

    private final RestTemplate restTemplate;
    private static final String SLACK_API_URL = "https://slack.com/api/chat.postMessage";

    public SlackService() {
        this.restTemplate = new RestTemplate();
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        log.info("=== Slack Configuration ===");
        log.info("Bot Token: {}", botToken != null && !botToken.isEmpty() ?
            botToken.substring(0, Math.min(20, botToken.length())) + "..." : "NOT SET");
        log.info("Channel ID: {}", channelId != null && !channelId.isEmpty() ? channelId : "NOT SET");
        log.info("==========================");
    }

    /**
     * Slack 채널에 메시지 전송 (Bot Token 방식)
     * @param message 전송할 메시지
     * @return 성공 여부
     */
    public boolean sendMessage(String message) {
        if (botToken == null || botToken.isEmpty()) {
            log.warn("Slack bot token이 설정되지 않았습니다. application.properties에 slack.bot.token을 설정하세요.");
            return false;
        }
        if (channelId == null || channelId.isEmpty()) {
            log.warn("Slack channel ID가 설정되지 않았습니다. application.properties에 slack.channel.id를 설정하세요.");
            return false;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(botToken);

            Map<String, Object> payload = new HashMap<>();
            payload.put("channel", channelId);
            payload.put("text", message);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(SLACK_API_URL, request, String.class);

            log.info("Slack API Response Status: {}", response.getStatusCode());
            log.info("Slack API Response Body: {}", response.getBody());

            // Check if Slack API returned an error in the response body
            String responseBody = response.getBody();
            if (responseBody != null && responseBody.contains("\"ok\":false")) {
                log.error("Slack API returned error: {}", responseBody);
                return false;
            }

            log.info("Slack 메시지 전송 성공: {}", message);
            return true;
        } catch (Exception e) {
            log.error("Slack 메시지 전송 실패", e);
            return false;
        }
    }

    /**
     * 수주장 정보를 Block Kit 형식으로 포맷팅하여 Slack에 전송
     * Block Kit을 사용하면 더 보기 좋고, 스레드로 대화 가능
     * @param orderData 수주장 데이터
     * @return 성공 여부
     */
    public boolean sendOrderNotification(Map<String, Object> orderData) {
        if (botToken == null || botToken.isEmpty()) {
            log.warn("Slack bot token이 설정되지 않았습니다.");
            return false;
        }
        if (channelId == null || channelId.isEmpty()) {
            log.warn("Slack channel ID가 설정되지 않았습니다.");
            return false;
        }

        try {
            String orderNo = String.valueOf(orderData.getOrDefault("OrderTextNo", ""));
            String orderDate = String.valueOf(orderData.getOrDefault("OrderTextDate", ""));
            String customerName = String.valueOf(orderData.getOrDefault("CustSeq", ""));
            String salesEmp = String.valueOf(orderData.getOrDefault("SalesEmpSeq", ""));
            String orderText = String.valueOf(orderData.getOrDefault("OrderText", ""));
            String remark = String.valueOf(orderData.getOrDefault("Remark", ""));

            // Block Kit 형식으로 메시지 구성 (대화 가능한 형태)
            List<Map<String, Object>> blocks = new ArrayList<>();

            // Header
            Map<String, Object> headerBlock = new HashMap<>();
            headerBlock.put("type", "header");
            Map<String, Object> headerText = new HashMap<>();
            headerText.put("type", "plain_text");
            headerText.put("text", "📋 새 수주장 알림");
            headerBlock.put("text", headerText);
            blocks.add(headerBlock);

            // Divider
            Map<String, Object> divider = new HashMap<>();
            divider.put("type", "divider");
            blocks.add(divider);

            // Fields Section - Single line format
            Map<String, Object> fieldsSection = new HashMap<>();
            fieldsSection.put("type", "section");
            Map<String, Object> fieldsText = new HashMap<>();
            fieldsText.put("type", "mrkdwn");
            StringBuilder fieldsInfo = new StringBuilder();

            boolean hasField = false;
            if (!orderNo.isEmpty() && !orderNo.equals("null")) {
                fieldsInfo.append("*수주장번호:* ").append(orderNo);
                hasField = true;
            }
            if (!orderDate.isEmpty() && !orderDate.equals("null")) {
                if (hasField) fieldsInfo.append(" | ");
                fieldsInfo.append("*주문일자:* ").append(orderDate);
                hasField = true;
            }
            if (!customerName.isEmpty() && !customerName.equals("null")) {
                if (hasField) fieldsInfo.append(" | ");
                fieldsInfo.append("*거래처명:* ").append(customerName);
                hasField = true;
            }
            if (!salesEmp.isEmpty() && !salesEmp.equals("null")) {
                if (hasField) fieldsInfo.append(" | ");
                fieldsInfo.append("*영업담당:* ").append(salesEmp);
                hasField = true;
            }

            if (hasField) {
                fieldsText.put("text", fieldsInfo.toString());
                fieldsSection.put("text", fieldsText);
                blocks.add(fieldsSection);
            }

            // Order Text Section
            if (!orderText.isEmpty() && !orderText.equals("null")) {
                Map<String, Object> orderTextSection = new HashMap<>();
                orderTextSection.put("type", "section");
                Map<String, Object> text = new HashMap<>();
                text.put("type", "mrkdwn");
                // Render as normal text (no code block) to match surrounding font
                text.put("text", "*수주내역:*\n" + orderText);
                orderTextSection.put("text", text);
                blocks.add(orderTextSection);
            }

            // Remark Section
            if (!remark.isEmpty() && !remark.equals("null")) {
                Map<String, Object> remarkSection = new HashMap<>();
                remarkSection.put("type", "section");
                Map<String, Object> text = new HashMap<>();
                text.put("type", "mrkdwn");
                text.put("text", "*비고:* " + remark);
                remarkSection.put("text", text);
                blocks.add(remarkSection);
            }

            // Context (Footer)
            Map<String, Object> context = new HashMap<>();
            context.put("type", "context");
            List<Map<String, String>> contextElements = new ArrayList<>();
            Map<String, String> contextText = new HashMap<>();
            contextText.put("type", "mrkdwn");
            contextText.put("text", "💬 이 메시지에 스레드로 답변하여 대화할 수 있습니다");
            contextElements.add(contextText);
            context.put("elements", contextElements);
            blocks.add(context);

            // Add blue divider line at the bottom to separate orders
            Map<String, Object> bottomDivider = new HashMap<>();
            bottomDivider.put("type", "divider");
            blocks.add(bottomDivider);

            // HTTP Headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(botToken);

            // Payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("channel", channelId);
            payload.put("text", "새 수주장: " + customerName); // Fallback text
            payload.put("blocks", blocks);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(SLACK_API_URL, request, String.class);

            log.info("수주장 Slack 알림 전송 성공: {}", customerName);
            return true;
        } catch (Exception e) {
            log.error("수주장 Slack 알림 전송 실패", e);
            return false;
        }
    }

    /**
     * Copy-format Slack message: 회사코드/거래처/등록자/지역 그룹/주문내용/요청사항
     */
    public boolean sendOrderCopyFormat(String orderNo,
                                       String companyCode,
                                       String customerName,
                                       String createdBy,
                                       String regionGroup,
                                       String orderText,
                                       String orderRemark,
                                       String requestDate) {
        if (botToken == null || botToken.isEmpty()) {
            log.warn("Slack bot token이 설정되지 않았습니다.");
            return false;
        }
        if (channelId == null || channelId.isEmpty()) {
            log.warn("Slack channel ID가 설정되지 않았습니다.");
            return false;
        }
        try {
            List<Map<String, Object>> blocks = new ArrayList<>();

            Map<String, Object> header = new HashMap<>();
            header.put("type", "header");
            Map<String, Object> htext = new HashMap<>();
            htext.put("type", "plain_text");
            htext.put("text", "📋 수주장");
            header.put("text", htext);
            blocks.add(header);

            // Two lines: first line (company + customer), second line (creator + region)
            Map<String, Object> infoSection = new HashMap<>();
            infoSection.put("type", "section");
            Map<String, Object> infoText = new HashMap<>();
            infoText.put("type", "mrkdwn");
            String orderNoSafe = safe(orderNo).trim();
            StringBuilder info = new StringBuilder();
            if (!orderNoSafe.isEmpty()) {
                info.append("*수주장번호:* ").append(orderNoSafe).append("\n");
            }
            info.append("*회사코드:* ").append(safe(companyCode));
            info.append(" | *거래처:* ").append(safe(customerName));
            info.append("\n");
            info.append("*등록자:* ").append(safe(createdBy));
            info.append(" | *지역 그룹:* ").append(safe(regionGroup));
            infoText.put("text", info.toString());
            infoSection.put("text", infoText);
            blocks.add(infoSection);

            if (orderText != null && !orderText.isBlank()) {
                Map<String, Object> orderSection = new HashMap<>();
                orderSection.put("type", "section");
                Map<String, Object> text = new HashMap<>();
                text.put("type", "mrkdwn");
                // Render as normal text (no code block) to match surrounding font
                text.put("text", "*주문내용:*\n" + orderText);
                orderSection.put("text", text);
                blocks.add(orderSection);
            }

            String requestDateSafe = safe(requestDate).trim();
            if (!requestDateSafe.isEmpty()) {
                Map<String, Object> requestSection = new HashMap<>();
                requestSection.put("type", "section");
                Map<String, Object> text = new HashMap<>();
                text.put("type", "mrkdwn");
                text.put("text", "*요청일자:* " + requestDateSafe);
                requestSection.put("text", text);
                blocks.add(requestSection);
            }

            Map<String, Object> remarkSection = new HashMap<>();
            remarkSection.put("type", "section");
            Map<String, Object> text = new HashMap<>();
            text.put("type", "mrkdwn");
            String remarkSafe = safe(orderRemark).trim();
            text.put("text", "*요청사항:*\n" + (remarkSafe.isEmpty() ? "" : remarkSafe));
            remarkSection.put("text", text);
            blocks.add(remarkSection);

            // Add blue divider line at the bottom to separate orders
            Map<String, Object> bottomDivider = new HashMap<>();
            bottomDivider.put("type", "divider");
            blocks.add(bottomDivider);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(botToken);

            Map<String, Object> payload = new HashMap<>();
            payload.put("channel", channelId);
            payload.put("text", "수주장: " + safe(customerName));
            payload.put("blocks", blocks);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(SLACK_API_URL, request, String.class);
            return true;
        } catch (Exception e) {
            log.error("Slack 전송 실패", e);
            return false;
        }
    }

    private static String safe(String s) { return s == null ? "" : s; }

    /**
     * Slack Block Kit Field 생성 헬퍼 메서드
     */
    private Map<String, Object> createField(String text) {
        Map<String, Object> field = new HashMap<>();
        field.put("type", "mrkdwn");
        field.put("text", text);
        return field;
    }
}
