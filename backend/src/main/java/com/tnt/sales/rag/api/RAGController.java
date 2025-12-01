package com.tnt.sales.rag.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Chat;
import com.google.genai.Client;
import com.google.genai.ResponseStream;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.ThinkingConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/v1/rag")
public class RAGController {
    private static final Logger log = LoggerFactory.getLogger(RAGController.class);
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

    // In-memory document store (for demo - production should use persistent storage)
    private final Map<String, DocumentInfo> documents = new ConcurrentHashMap<>();

    // Chat session store for multi-turn conversations
    private final Map<String, Chat> chatSessions = new ConcurrentHashMap<>();

    // FileSearchStore name (persisted in memory for now)
    private volatile String currentFileSearchStoreName = null;

    // Executor for async streaming
    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();

    // HTTP client for Google API calls
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.gemini.apiKey:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    private Client genaiClient;

    @PostConstruct
    public void init() {
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
            try {
                // Create client with API key using builder
                genaiClient = Client.builder().apiKey(geminiApiKey).build();
                log.info("Google GenAI Client initialized with model: {}", geminiModel);
            } catch (Exception e) {
                log.error("Failed to initialize Google GenAI Client: {}", e.getMessage());
            }
        } else {
            log.warn("Gemini API key not configured. RAG functionality will be disabled.");
        }
    }

    /**
     * Upload a document for RAG (supports txt, csv, xlsx)
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다"));
        }

        try {
            String fileName = file.getOriginalFilename();
            String content;

            // Handle different file types
            if (fileName != null && (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"))) {
                content = parseExcelFile(file.getBytes());
            } else {
                content = new String(file.getBytes(), StandardCharsets.UTF_8);
            }

            String docId = UUID.randomUUID().toString();
            DocumentInfo doc = new DocumentInfo(docId, fileName, content, System.currentTimeMillis());
            documents.put(docId, doc);

            log.info("Document uploaded: {} ({}) - {} chars", fileName, docId, content.length());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "documentId", docId,
                "fileName", fileName,
                "contentLength", content.length(),
                "message", "문서가 성공적으로 업로드되었습니다"
            ));
        } catch (Exception e) {
            log.error("Failed to upload document", e);
            return ResponseEntity.ok(Map.of("error", "문서 업로드 실패: " + e.getMessage()));
        }
    }

    /**
     * Parse Excel file to text
     */
    private String parseExcelFile(byte[] fileBytes) throws IOException {
        StringBuilder content = new StringBuilder();
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(fileBytes))) {
            for (int sheetIdx = 0; sheetIdx < workbook.getNumberOfSheets(); sheetIdx++) {
                Sheet sheet = workbook.getSheetAt(sheetIdx);
                content.append("=== 시트: ").append(sheet.getSheetName()).append(" ===\n");

                for (Row row : sheet) {
                    List<String> cells = new ArrayList<>();
                    for (Cell cell : row) {
                        cells.add(getCellValueAsString(cell));
                    }
                    content.append(String.join("\t", cells)).append("\n");
                }
                content.append("\n");
            }
        }
        return content.toString();
    }

    /**
     * Get cell value as string
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toString();
                }
                double num = cell.getNumericCellValue();
                if (num == Math.floor(num)) {
                    return String.valueOf((long) num);
                }
                return String.valueOf(num);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return String.valueOf(cell.getNumericCellValue());
                } catch (Exception e) {
                    return cell.getStringCellValue();
                }
            default:
                return "";
        }
    }

    /**
     * List all uploaded documents
     */
    @GetMapping("/documents")
    public ResponseEntity<?> listDocuments() {
        List<Map<String, Object>> docList = new ArrayList<>();
        for (DocumentInfo doc : documents.values()) {
            Map<String, Object> docInfo = new LinkedHashMap<>();
            docInfo.put("id", doc.id);
            docInfo.put("fileName", doc.fileName);
            docInfo.put("contentLength", doc.content.length());
            docInfo.put("uploadedAt", doc.uploadedAt);
            docList.add(docInfo);
        }
        return ResponseEntity.ok(Map.of("documents", docList));
    }

    /**
     * Delete a document
     */
    @DeleteMapping("/documents/{docId}")
    public ResponseEntity<?> deleteDocument(@PathVariable String docId) {
        DocumentInfo removed = documents.remove(docId);
        if (removed != null) {
            return ResponseEntity.ok(Map.of("success", true, "message", "문서가 삭제되었습니다"));
        }
        return ResponseEntity.ok(Map.of("error", "문서를 찾을 수 없습니다"));
    }

    /**
     * Query documents using RAG with Google GenAI SDK
     */
    @PostMapping("/query")
    public ResponseEntity<?> queryDocuments(@RequestBody Map<String, String> request) {
        String question = request.get("question");

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "질문을 입력해주세요"));
        }

        if (genaiClient == null) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 클라이언트가 초기화되지 않았습니다"));
        }

        if (documents.isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "업로드된 문서가 없습니다. 먼저 문서를 업로드해주세요."));
        }

        try {
            // Build context from all documents
            StringBuilder context = new StringBuilder();
            List<Map<String, String>> sources = new ArrayList<>();

            for (DocumentInfo doc : documents.values()) {
                context.append("=== 문서: ").append(doc.fileName).append(" ===\n");
                // Limit content per document to avoid token limits
                String docContent = doc.content.length() > 10000
                    ? doc.content.substring(0, 10000) + "...(truncated)"
                    : doc.content;
                context.append(docContent).append("\n\n");

                Map<String, String> source = new LinkedHashMap<>();
                source.put("title", doc.fileName);
                source.put("snippet", doc.content.length() > 200
                    ? doc.content.substring(0, 200) + "..."
                    : doc.content);
                sources.add(source);
            }

            // Build prompt with context
            String prompt = String.format("""
                당신은 주어진 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다.

                다음 문서 내용을 참고하여 사용자의 질문에 답변해주세요.
                문서에 없는 내용은 답변하지 마시고, 문서를 기반으로만 답변해주세요.

                === 문서 내용 ===
                %s

                === 사용자 질문 ===
                %s

                === 답변 ===
                """, context.toString(), question);

            // Call Gemini API using SDK with config
            GenerateContentConfig config = GenerateContentConfig.builder()
                .thinkingConfig(ThinkingConfig.builder().thinkingBudget(0).build())
                .temperature(0.3f)
                .build();

            GenerateContentResponse response = genaiClient.models.generateContent(
                geminiModel,
                prompt,
                config
            );

            String answer = response.text();

            return ResponseEntity.ok(Map.of(
                "question", question,
                "answer", answer,
                "sources", sources
            ));

        } catch (Exception e) {
            log.error("RAG query failed", e);
            return ResponseEntity.ok(Map.of(
                "error", "RAG 쿼리 실패: " + e.getMessage(),
                "question", question
            ));
        }
    }

    /**
     * Streaming query endpoint using Server-Sent Events (SSE)
     * If FileSearchStore is selected, uses File Search API with gemini-2.5-flash
     * Otherwise, falls back to local documents or plain query
     */
    @GetMapping(value = "/query/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter queryDocumentsStream(@RequestParam String question) {
        SseEmitter emitter = new SseEmitter(120000L); // 120 second timeout for File Search

        if (question == null || question.trim().isEmpty()) {
            streamExecutor.execute(() -> {
                try {
                    emitter.send(SseEmitter.event().name("error").data("질문을 입력해주세요"));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            });
            return emitter;
        }

        // If FileSearchStore is selected, use File Search API
        if (currentFileSearchStoreName != null) {
            streamExecutor.execute(() -> {
                try {
                    streamWithFileSearch(emitter, question);
                } catch (Exception e) {
                    log.error("File Search streaming failed", e);
                    try {
                        emitter.send(SseEmitter.event().name("error").data("File Search 실패: " + e.getMessage()));
                        emitter.complete();
                    } catch (IOException ex) {
                        emitter.completeWithError(ex);
                    }
                }
            });
            return emitter;
        }

        // Fallback: use local documents or plain query
        if (genaiClient == null) {
            streamExecutor.execute(() -> {
                try {
                    emitter.send(SseEmitter.event().name("error").data("Gemini API 클라이언트가 초기화되지 않았습니다"));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            });
            return emitter;
        }

        streamExecutor.execute(() -> {
            try {
                // Build context from documents
                StringBuilder context = new StringBuilder();
                for (DocumentInfo doc : documents.values()) {
                    context.append("=== 문서: ").append(doc.fileName).append(" ===\n");
                    String docContent = doc.content.length() > 10000
                        ? doc.content.substring(0, 10000) + "...(truncated)"
                        : doc.content;
                    context.append(docContent).append("\n\n");
                }

                String prompt = documents.isEmpty()
                    ? question
                    : String.format("""
                        당신은 주어진 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다.
                        문서 내용을 참고하여 답변해주세요.

                        === 문서 내용 ===
                        %s

                        === 사용자 질문 ===
                        %s
                        """, context.toString(), question);

                // Use streaming API
                ResponseStream<GenerateContentResponse> responseStream =
                    genaiClient.models.generateContentStream(geminiModel, prompt, null);

                for (GenerateContentResponse res : responseStream) {
                    String text = res.text();
                    if (text != null && !text.isEmpty()) {
                        emitter.send(SseEmitter.event().name("content").data(text));
                    }
                }

                responseStream.close();
                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();

            } catch (Exception e) {
                log.error("Streaming query failed", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data("스트리밍 실패: " + e.getMessage()));
                    emitter.complete();
                } catch (IOException ex) {
                    emitter.completeWithError(ex);
                }
            }
        });

        return emitter;
    }

    /**
     * Stream response using File Search API (REST API with SSE simulation)
     * File Search requires gemini-2.5-flash or gemini-2.5-pro
     */
    private void streamWithFileSearch(SseEmitter emitter, String question) throws Exception {
        String fileSearchModel = "gemini-2.5-flash";
        String url = GEMINI_API_BASE + "/models/" + fileSearchModel + ":generateContent?key=" + geminiApiKey;

        // Get document list for system prompt
        List<String> documentNames = getStoreDocumentNames();
        String systemPrompt = buildSystemPromptWithDocuments(documentNames);

        // Build request with file_search tool
        Map<String, Object> requestBody = new LinkedHashMap<>();

        // System instruction with document metadata
        if (!documentNames.isEmpty()) {
            requestBody.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemPrompt))
            ));
        }

        // Contents
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> userContent = new LinkedHashMap<>();
        userContent.put("parts", List.of(Map.of("text", question)));
        contents.add(userContent);
        requestBody.put("contents", contents);

        // Tools with file_search
        List<Map<String, Object>> tools = new ArrayList<>();
        Map<String, Object> fileSearchTool = new LinkedHashMap<>();
        fileSearchTool.put("file_search", Map.of(
            "file_search_store_names", List.of(currentFileSearchStoreName)
        ));
        tools.add(fileSearchTool);
        requestBody.put("tools", tools);

        String jsonBody = objectMapper.writeValueAsString(requestBody);
        log.info("File Search streaming request to store: {}", currentFileSearchStoreName);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(90))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("File Search failed: {}", response.body());
            emitter.send(SseEmitter.event().name("error").data("File Search 실패 (HTTP " + response.statusCode() + ")"));
            emitter.complete();
            return;
        }

        JsonNode root = objectMapper.readTree(response.body());

        // Extract answer text
        String answer = "";
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode content = candidates.get(0).path("content");
            JsonNode parts = content.path("parts");
            if (parts.isArray() && parts.size() > 0) {
                answer = parts.get(0).path("text").asText();
            }
        }

        // Simulate streaming by sending chunks
        if (answer != null && !answer.isEmpty()) {
            // Send in chunks for streaming effect
            int chunkSize = 50;
            for (int i = 0; i < answer.length(); i += chunkSize) {
                int end = Math.min(i + chunkSize, answer.length());
                String chunk = answer.substring(i, end);
                emitter.send(SseEmitter.event().name("content").data(chunk));
                Thread.sleep(30); // Small delay for streaming effect
            }
        } else {
            emitter.send(SseEmitter.event().name("content").data("문서에서 관련 정보를 찾을 수 없습니다."));
        }

        // Extract and send grounding metadata (citations)
        List<Map<String, String>> citations = new ArrayList<>();
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode groundingMetadata = candidates.get(0).path("groundingMetadata");
            if (groundingMetadata.has("groundingChunks")) {
                for (JsonNode chunk : groundingMetadata.path("groundingChunks")) {
                    JsonNode retrievedContext = chunk.path("retrievedContext");
                    String title = retrievedContext.path("title").asText();
                    String uri = retrievedContext.path("uri").asText();
                    if (title != null && !title.isEmpty()) {
                        // Resolve fileId to displayName from Files API
                        String resolvedTitle = resolveFileDisplayName(title);
                        Map<String, String> citation = new LinkedHashMap<>();
                        citation.put("title", resolvedTitle);
                        citation.put("uri", uri);
                        // Avoid duplicates
                        String finalTitle = resolvedTitle;
                        if (!citations.stream().anyMatch(c -> c.get("title").equals(finalTitle))) {
                            citations.add(citation);
                        }
                    }
                }
            }
        }

        // Send citations as separate event
        if (!citations.isEmpty()) {
            String citationsJson = objectMapper.writeValueAsString(citations);
            emitter.send(SseEmitter.event().name("citations").data(citationsJson));
        }

        emitter.send(SseEmitter.event().name("done").data("[DONE]"));
        emitter.complete();
    }

    /**
     * Create a new chat session for multi-turn conversation with document context
     */
    @PostMapping("/chat/session")
    public ResponseEntity<?> createChatSession(@RequestBody(required = false) Map<String, String> request) {
        if (genaiClient == null) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 클라이언트가 초기화되지 않았습니다"));
        }

        try {
            String sessionId = UUID.randomUUID().toString();
            Chat chatSession = genaiClient.chats.create(geminiModel);
            chatSessions.put(sessionId, chatSession);

            // Build document context
            StringBuilder docContext = new StringBuilder();
            if (!documents.isEmpty()) {
                docContext.append("당신은 다음 문서들을 기반으로 질문에 답변하는 AI 어시스턴트입니다.\n");
                docContext.append("문서 내용을 참고하여 답변해주세요.\n\n");

                for (DocumentInfo doc : documents.values()) {
                    docContext.append("=== 문서: ").append(doc.fileName).append(" ===\n");
                    String content = doc.content.length() > 15000
                        ? doc.content.substring(0, 15000) + "...(truncated)"
                        : doc.content;
                    docContext.append(content).append("\n\n");
                }

                // Send document context as initial message
                chatSession.sendMessage(docContext.toString());
                log.info("Chat session created with {} documents: {}", documents.size(), sessionId);
            } else {
                log.info("Chat session created (no documents): {}", sessionId);
            }

            // If additional system context is provided
            String systemContext = request != null ? request.get("systemContext") : null;
            if (systemContext != null && !systemContext.isEmpty()) {
                chatSession.sendMessage(systemContext);
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "sessionId", sessionId,
                "documentsIncluded", documents.size(),
                "message", documents.isEmpty()
                    ? "채팅 세션이 생성되었습니다 (문서 없음)"
                    : "채팅 세션이 생성되었습니다 (" + documents.size() + "개 문서 포함)"
            ));
        } catch (Exception e) {
            log.error("Failed to create chat session", e);
            return ResponseEntity.ok(Map.of("error", "채팅 세션 생성 실패: " + e.getMessage()));
        }
    }

    /**
     * Send a message in an existing chat session
     */
    @PostMapping("/chat/{sessionId}/message")
    public ResponseEntity<?> sendChatMessage(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> request) {

        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "메시지를 입력해주세요"));
        }

        Chat chatSession = chatSessions.get(sessionId);
        if (chatSession == null) {
            return ResponseEntity.ok(Map.of("error", "채팅 세션을 찾을 수 없습니다. 새 세션을 생성해주세요."));
        }

        try {
            GenerateContentResponse response = chatSession.sendMessage(message);
            String reply = response.text();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "sessionId", sessionId,
                "message", message,
                "reply", reply
            ));
        } catch (Exception e) {
            log.error("Chat message failed", e);
            return ResponseEntity.ok(Map.of("error", "채팅 실패: " + e.getMessage()));
        }
    }

    /**
     * Stream a message in an existing chat session
     */
    @GetMapping(value = "/chat/{sessionId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChatMessage(
            @PathVariable String sessionId,
            @RequestParam String message) {

        SseEmitter emitter = new SseEmitter(60000L);

        Chat chatSession = chatSessions.get(sessionId);
        if (chatSession == null) {
            streamExecutor.execute(() -> {
                try {
                    emitter.send(SseEmitter.event().name("error").data("채팅 세션을 찾을 수 없습니다"));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            });
            return emitter;
        }

        streamExecutor.execute(() -> {
            try {
                ResponseStream<GenerateContentResponse> responseStream =
                    chatSession.sendMessageStream(message, null);

                for (GenerateContentResponse res : responseStream) {
                    String text = res.text();
                    if (text != null && !text.isEmpty()) {
                        emitter.send(SseEmitter.event().name("content").data(text));
                    }
                }

                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();

            } catch (Exception e) {
                log.error("Chat streaming failed", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data("스트리밍 실패: " + e.getMessage()));
                    emitter.complete();
                } catch (IOException ex) {
                    emitter.completeWithError(ex);
                }
            }
        });

        return emitter;
    }

    /**
     * Get chat session history
     */
    @GetMapping("/chat/{sessionId}/history")
    public ResponseEntity<?> getChatHistory(@PathVariable String sessionId) {
        Chat chatSession = chatSessions.get(sessionId);
        if (chatSession == null) {
            return ResponseEntity.ok(Map.of("error", "채팅 세션을 찾을 수 없습니다"));
        }

        try {
            List<Content> history = chatSession.getHistory(true);
            List<Map<String, Object>> historyList = new ArrayList<>();

            for (Content content : history) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("role", content.role().orElse("unknown"));
                // Extract text from parts
                StringBuilder text = new StringBuilder();
                if (content.parts().isPresent()) {
                    content.parts().get().forEach(part -> {
                        if (part.text().isPresent()) {
                            text.append(part.text().get());
                        }
                    });
                }
                entry.put("text", text.toString());
                historyList.add(entry);
            }

            return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "history", historyList
            ));
        } catch (Exception e) {
            log.error("Failed to get chat history", e);
            return ResponseEntity.ok(Map.of("error", "히스토리 조회 실패: " + e.getMessage()));
        }
    }

    /**
     * Delete a chat session
     */
    @DeleteMapping("/chat/{sessionId}")
    public ResponseEntity<?> deleteChatSession(@PathVariable String sessionId) {
        Chat removed = chatSessions.remove(sessionId);
        if (removed != null) {
            return ResponseEntity.ok(Map.of("success", true, "message", "채팅 세션이 삭제되었습니다"));
        }
        return ResponseEntity.ok(Map.of("error", "채팅 세션을 찾을 수 없습니다"));
    }

    /**
     * List all active chat sessions
     */
    @GetMapping("/chat/sessions")
    public ResponseEntity<?> listChatSessions() {
        List<String> sessionIds = new ArrayList<>(chatSessions.keySet());
        return ResponseEntity.ok(Map.of(
            "sessions", sessionIds,
            "count", sessionIds.size()
        ));
    }

    /**
     * Simple test endpoint to verify Gemini API connection
     */
    @GetMapping("/test")
    public ResponseEntity<?> testGemini() {
        if (genaiClient == null) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 클라이언트가 초기화되지 않았습니다"));
        }

        try {
            GenerateContentConfig testConfig = GenerateContentConfig.builder()
                .thinkingConfig(ThinkingConfig.builder().thinkingBudget(0).build())
                .build();

            GenerateContentResponse response = genaiClient.models.generateContent(
                geminiModel,
                "Say 'Hello, RAG is working!' in Korean",
                testConfig
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "model", geminiModel,
                "response", response.text()
            ));
        } catch (Exception e) {
            log.error("Gemini API test failed", e);
            return ResponseEntity.ok(Map.of("error", "Gemini API 테스트 실패: " + e.getMessage()));
        }
    }

    // ==================== Google File Search API ====================

    /**
     * Create a new FileSearchStore
     */
    @PostMapping("/store")
    public ResponseEntity<?> createFileSearchStore(@RequestBody(required = false) Map<String, String> request) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 키가 설정되지 않았습니다"));
        }

        try {
            String displayName = request != null && request.get("displayName") != null
                ? request.get("displayName")
                : "tnt-sales-rag-store-" + System.currentTimeMillis();

            String url = GEMINI_API_BASE + "/fileSearchStores?key=" + geminiApiKey;

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("displayName", displayName);

            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("FileSearchStore creation failed: {}", response.body());
                return ResponseEntity.ok(Map.of(
                    "error", "FileSearchStore 생성 실패",
                    "statusCode", response.statusCode(),
                    "details", response.body()
                ));
            }

            JsonNode root = objectMapper.readTree(response.body());
            String storeName = root.path("name").asText();
            currentFileSearchStoreName = storeName;

            log.info("FileSearchStore created: {}", storeName);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "storeName", storeName,
                "displayName", displayName,
                "message", "FileSearchStore가 성공적으로 생성되었습니다"
            ));

        } catch (Exception e) {
            log.error("Failed to create FileSearchStore", e);
            return ResponseEntity.ok(Map.of("error", "FileSearchStore 생성 실패: " + e.getMessage()));
        }
    }

    /**
     * Get current FileSearchStore info
     */
    @GetMapping("/store")
    public ResponseEntity<?> getFileSearchStore() {
        if (currentFileSearchStoreName == null) {
            return ResponseEntity.ok(Map.of(
                "exists", false,
                "message", "FileSearchStore가 아직 생성되지 않았습니다. POST /api/v1/rag/store로 생성하세요."
            ));
        }

        try {
            String url = GEMINI_API_BASE + "/" + currentFileSearchStoreName + "?key=" + geminiApiKey;

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return ResponseEntity.ok(Map.of(
                    "exists", false,
                    "error", "Store 조회 실패",
                    "details", response.body()
                ));
            }

            JsonNode root = objectMapper.readTree(response.body());

            return ResponseEntity.ok(Map.of(
                "exists", true,
                "storeName", currentFileSearchStoreName,
                "displayName", root.path("displayName").asText(),
                "createTime", root.path("createTime").asText()
            ));

        } catch (Exception e) {
            log.error("Failed to get FileSearchStore", e);
            return ResponseEntity.ok(Map.of("error", "Store 조회 실패: " + e.getMessage()));
        }
    }

    /**
     * List all FileSearchStores
     */
    @GetMapping("/stores")
    public ResponseEntity<?> listFileSearchStores() {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 키가 설정되지 않았습니다"));
        }

        try {
            String url = GEMINI_API_BASE + "/fileSearchStores?key=" + geminiApiKey;

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return ResponseEntity.ok(Map.of(
                    "error", "Store 목록 조회 실패",
                    "statusCode", response.statusCode(),
                    "details", response.body()
                ));
            }

            JsonNode root = objectMapper.readTree(response.body());
            List<Map<String, Object>> stores = new ArrayList<>();

            if (root.has("fileSearchStores")) {
                for (JsonNode store : root.path("fileSearchStores")) {
                    Map<String, Object> storeInfo = new LinkedHashMap<>();
                    storeInfo.put("name", store.path("name").asText());
                    storeInfo.put("displayName", store.path("displayName").asText());
                    storeInfo.put("createTime", store.path("createTime").asText());
                    stores.add(storeInfo);
                }
            }

            return ResponseEntity.ok(Map.of(
                "stores", stores,
                "count", stores.size(),
                "currentStore", currentFileSearchStoreName != null ? currentFileSearchStoreName : ""
            ));

        } catch (Exception e) {
            log.error("Failed to list FileSearchStores", e);
            return ResponseEntity.ok(Map.of("error", "Store 목록 조회 실패: " + e.getMessage()));
        }
    }

    /**
     * Upload file to FileSearchStore (using Google File Search API)
     */
    @PostMapping("/store/upload")
    public ResponseEntity<?> uploadToFileSearchStore(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다"));
        }

        if (currentFileSearchStoreName == null) {
            return ResponseEntity.ok(Map.of("error", "FileSearchStore가 먼저 생성되어야 합니다. POST /api/v1/rag/store를 호출하세요."));
        }

        try {
            String fileName = file.getOriginalFilename();
            byte[] fileBytes = file.getBytes();
            String contentType = file.getContentType();

            // Step 1: Upload file to Google Files API
            String uploadUrl = GEMINI_API_BASE + "/files?key=" + geminiApiKey;

            // Create multipart request for file upload
            String boundary = "----WebKitFormBoundary" + UUID.randomUUID().toString().replace("-", "");

            StringBuilder multipartBody = new StringBuilder();
            multipartBody.append("--").append(boundary).append("\r\n");
            multipartBody.append("Content-Disposition: form-data; name=\"metadata\"\r\n");
            multipartBody.append("Content-Type: application/json\r\n\r\n");
            multipartBody.append("{\"file\":{\"displayName\":\"").append(fileName).append("\"}}\r\n");
            multipartBody.append("--").append(boundary).append("\r\n");
            multipartBody.append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(fileName).append("\"\r\n");
            multipartBody.append("Content-Type: ").append(contentType != null ? contentType : "application/octet-stream").append("\r\n\r\n");

            // Combine text parts with binary file content
            byte[] textPart = multipartBody.toString().getBytes(StandardCharsets.UTF_8);
            byte[] endBoundary = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);

            byte[] fullBody = new byte[textPart.length + fileBytes.length + endBoundary.length];
            System.arraycopy(textPart, 0, fullBody, 0, textPart.length);
            System.arraycopy(fileBytes, 0, fullBody, textPart.length, fileBytes.length);
            System.arraycopy(endBoundary, 0, fullBody, textPart.length + fileBytes.length, endBoundary.length);

            HttpRequest uploadRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + geminiApiKey))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(fullBody))
                    .timeout(Duration.ofSeconds(120))
                    .build();

            HttpResponse<String> uploadResponse = httpClient.send(uploadRequest, HttpResponse.BodyHandlers.ofString());

            if (uploadResponse.statusCode() != 200) {
                log.error("File upload failed: {}", uploadResponse.body());
                return ResponseEntity.ok(Map.of(
                    "error", "파일 업로드 실패",
                    "statusCode", uploadResponse.statusCode(),
                    "details", uploadResponse.body()
                ));
            }

            JsonNode uploadResult = objectMapper.readTree(uploadResponse.body());
            String fileUri = uploadResult.path("file").path("uri").asText();
            String uploadedFileName = uploadResult.path("file").path("name").asText();

            log.info("File uploaded to Google: {} -> {}", fileName, uploadedFileName);

            // Step 2: Import file into FileSearchStore
            // API requires "file_name" field (snake_case), not "inlineFile"
            String importUrl = GEMINI_API_BASE + "/" + currentFileSearchStoreName + ":importFile?key=" + geminiApiKey;

            Map<String, Object> importBody = new LinkedHashMap<>();
            importBody.put("file_name", uploadedFileName);

            String importJson = objectMapper.writeValueAsString(importBody);

            HttpRequest importRequest = HttpRequest.newBuilder()
                    .uri(URI.create(importUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(importJson))
                    .timeout(Duration.ofSeconds(120))
                    .build();

            HttpResponse<String> importResponse = httpClient.send(importRequest, HttpResponse.BodyHandlers.ofString());

            if (importResponse.statusCode() != 200) {
                log.error("File import to store failed: {}", importResponse.body());
                return ResponseEntity.ok(Map.of(
                    "error", "FileSearchStore로 가져오기 실패",
                    "statusCode", importResponse.statusCode(),
                    "details", importResponse.body(),
                    "uploadedFile", uploadedFileName
                ));
            }

            JsonNode importResult = objectMapper.readTree(importResponse.body());

            log.info("File imported to FileSearchStore: {}", fileName);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "fileName", fileName,
                "googleFileName", uploadedFileName,
                "storeName", currentFileSearchStoreName,
                "message", "파일이 FileSearchStore에 성공적으로 업로드되었습니다"
            ));

        } catch (Exception e) {
            log.error("Failed to upload to FileSearchStore", e);
            return ResponseEntity.ok(Map.of("error", "FileSearchStore 업로드 실패: " + e.getMessage()));
        }
    }

    /**
     * Query using File Search (semantic search with grounding)
     * File Search requires gemini-2.5-flash or gemini-2.5-pro model
     */
    @PostMapping("/store/query")
    public ResponseEntity<?> queryWithFileSearch(@RequestBody Map<String, String> request) {
        String question = request.get("question");

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "질문을 입력해주세요"));
        }

        if (currentFileSearchStoreName == null) {
            return ResponseEntity.ok(Map.of("error", "FileSearchStore가 먼저 생성되어야 합니다"));
        }

        try {
            // File Search requires gemini-2.5-flash or gemini-2.5-pro
            String fileSearchModel = "gemini-2.5-flash";
            String url = GEMINI_API_BASE + "/models/" + fileSearchModel + ":generateContent?key=" + geminiApiKey;

            // Build request with file_search tool (REST API uses snake_case)
            Map<String, Object> requestBody = new LinkedHashMap<>();

            // Contents - simple format without role
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> userContent = new LinkedHashMap<>();
            userContent.put("parts", List.of(Map.of("text", question)));
            contents.add(userContent);
            requestBody.put("contents", contents);

            // Tools with file_search
            List<Map<String, Object>> tools = new ArrayList<>();
            Map<String, Object> fileSearchTool = new LinkedHashMap<>();
            fileSearchTool.put("file_search", Map.of(
                "file_search_store_names", List.of(currentFileSearchStoreName)
            ));
            tools.add(fileSearchTool);
            requestBody.put("tools", tools);

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.debug("File Search query request: {}", jsonBody);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            log.debug("File Search query response status: {}", response.statusCode());

            if (response.statusCode() != 200) {
                log.error("File Search query failed: {}", response.body());
                return ResponseEntity.ok(Map.of(
                    "error", "File Search 쿼리 실패",
                    "statusCode", response.statusCode(),
                    "details", response.body(),
                    "model", fileSearchModel
                ));
            }

            JsonNode root = objectMapper.readTree(response.body());

            // Extract answer
            String answer = "";
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode content = candidates.get(0).path("content");
                JsonNode parts = content.path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    answer = parts.get(0).path("text").asText();
                }
            }

            // Extract grounding metadata (citations)
            List<Map<String, Object>> citations = new ArrayList<>();
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode groundingMetadata = candidates.get(0).path("groundingMetadata");
                if (groundingMetadata.has("groundingChunks")) {
                    for (JsonNode chunk : groundingMetadata.path("groundingChunks")) {
                        Map<String, Object> citation = new LinkedHashMap<>();
                        JsonNode retrievedContext = chunk.path("retrievedContext");
                        citation.put("title", retrievedContext.path("title").asText());
                        citation.put("uri", retrievedContext.path("uri").asText());
                        citations.add(citation);
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                "question", question,
                "answer", answer,
                "citations", citations,
                "storeName", currentFileSearchStoreName,
                "model", fileSearchModel
            ));

        } catch (Exception e) {
            log.error("File Search query failed", e);
            return ResponseEntity.ok(Map.of("error", "File Search 쿼리 실패: " + e.getMessage()));
        }
    }

    /**
     * List documents in current FileSearchStore
     */
    @GetMapping("/store/documents")
    public ResponseEntity<?> listStoreDocuments() {
        if (currentFileSearchStoreName == null) {
            return ResponseEntity.ok(Map.of("error", "FileSearchStore가 먼저 선택되어야 합니다"));
        }

        try {
            // Extract store ID from full name (e.g., "fileSearchStores/abc123" -> "abc123")
            String storeId = currentFileSearchStoreName.replace("fileSearchStores/", "");
            String url = GEMINI_API_BASE + "/fileSearchStores/" + storeId + "/documents?key=" + geminiApiKey;

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return ResponseEntity.ok(Map.of(
                    "error", "문서 목록 조회 실패",
                    "statusCode", response.statusCode(),
                    "details", response.body()
                ));
            }

            JsonNode root = objectMapper.readTree(response.body());
            List<Map<String, Object>> documents = new ArrayList<>();

            if (root.has("documents")) {
                for (JsonNode doc : root.path("documents")) {
                    Map<String, Object> docInfo = new LinkedHashMap<>();
                    docInfo.put("name", doc.path("name").asText());

                    // Extract file ID from document name and get displayName from Files API
                    // Document name format: fileSearchStores/xxx/documents/fileId-randomSuffix
                    String docName = doc.path("name").asText();
                    String displayName = doc.path("displayName").asText();

                    // Extract file ID from document name (first part before dash in last segment)
                    String fileId = null;
                    if (docName.contains("/documents/")) {
                        String lastPart = docName.substring(docName.lastIndexOf("/documents/") + "/documents/".length());
                        if (lastPart.contains("-")) {
                            fileId = lastPart.substring(0, lastPart.indexOf("-"));
                        } else {
                            fileId = lastPart;
                        }
                    }

                    // If displayName looks like an ID (no extension), try to get real displayName from Files API
                    if (fileId != null && (displayName == null || displayName.isEmpty() || !displayName.contains("."))) {
                        try {
                            String fileUrl = GEMINI_API_BASE + "/files/" + fileId + "?key=" + geminiApiKey;
                            HttpRequest fileRequest = HttpRequest.newBuilder()
                                    .uri(URI.create(fileUrl))
                                    .GET()
                                    .timeout(Duration.ofSeconds(10))
                                    .build();
                            HttpResponse<String> fileResponse = httpClient.send(fileRequest, HttpResponse.BodyHandlers.ofString());
                            if (fileResponse.statusCode() == 200) {
                                JsonNode fileNode = objectMapper.readTree(fileResponse.body());
                                String realDisplayName = fileNode.path("displayName").asText();
                                if (realDisplayName != null && !realDisplayName.isEmpty()) {
                                    displayName = realDisplayName;
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Failed to get displayName for file: {}", fileId);
                        }
                    }

                    docInfo.put("displayName", displayName != null ? displayName : "");
                    docInfo.put("fileId", fileId);
                    docInfo.put("state", doc.path("state").asText());
                    docInfo.put("sizeBytes", doc.path("sizeBytes").asText());
                    docInfo.put("mimeType", doc.path("mimeType").asText());
                    docInfo.put("createTime", doc.path("createTime").asText());
                    documents.add(docInfo);
                }
            }

            return ResponseEntity.ok(Map.of(
                "documents", documents,
                "count", documents.size(),
                "storeName", currentFileSearchStoreName
            ));

        } catch (Exception e) {
            log.error("Failed to list store documents", e);
            return ResponseEntity.ok(Map.of("error", "문서 목록 조회 실패: " + e.getMessage()));
        }
    }

    /**
     * Set current FileSearchStore by name
     */
    @PostMapping("/store/select")
    public ResponseEntity<?> selectFileSearchStore(@RequestBody Map<String, String> request) {
        String storeName = request.get("storeName");
        if (storeName == null || storeName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "storeName이 필요합니다"));
        }

        currentFileSearchStoreName = storeName;
        log.info("Selected FileSearchStore: {}", storeName);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "storeName", storeName,
            "message", "FileSearchStore가 선택되었습니다"
        ));
    }

    /**
     * Delete a document from FileSearchStore
     * This also removes the document's vector embeddings from the index
     */
    @DeleteMapping("/store/document/{documentName}")
    public ResponseEntity<?> deleteStoreDocument(@PathVariable String documentName) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 키가 설정되지 않았습니다"));
        }

        if (currentFileSearchStoreName == null) {
            return ResponseEntity.ok(Map.of("error", "FileSearchStore가 먼저 선택되어야 합니다"));
        }

        try {
            // Extract store ID from full name
            String storeId = currentFileSearchStoreName.replace("fileSearchStores/", "");
            // Document API URL: DELETE /fileSearchStores/{storeId}/documents/{documentName}
            // force=true is required because Google API returns "Cannot delete non-empty Document" otherwise
            String url = GEMINI_API_BASE + "/fileSearchStores/" + storeId + "/documents/" + documentName + "?key=" + geminiApiKey + "&force=true";

            log.info("Deleting document: {} from store: {}", documentName, storeId);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .DELETE()
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Document delete failed: {}", response.body());
                return ResponseEntity.ok(Map.of(
                    "error", "문서 삭제 실패",
                    "statusCode", response.statusCode(),
                    "details", response.body()
                ));
            }

            log.info("Document deleted successfully: {}", documentName);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "문서가 삭제되었습니다 (벡터 임베딩 포함)",
                "documentName", documentName
            ));

        } catch (Exception e) {
            log.error("Failed to delete document", e);
            return ResponseEntity.ok(Map.of("error", "문서 삭제 실패: " + e.getMessage()));
        }
    }

    /**
     * Delete a FileSearchStore
     * First deletes all documents in the store, then deletes the store itself
     * (Google API requires store to be empty before deletion)
     */
    @DeleteMapping("/store/{storeName}")
    public ResponseEntity<?> deleteFileSearchStore(@PathVariable String storeName) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Gemini API 키가 설정되지 않았습니다"));
        }

        try {
            // Step 1: Get all documents in the store
            String listDocsUrl = GEMINI_API_BASE + "/fileSearchStores/" + storeName + "/documents?key=" + geminiApiKey;
            HttpRequest listRequest = HttpRequest.newBuilder()
                    .uri(URI.create(listDocsUrl))
                    .GET()
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> listResponse = httpClient.send(listRequest, HttpResponse.BodyHandlers.ofString());

            if (listResponse.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(listResponse.body());

                // Step 2: Delete each document
                if (root.has("documents")) {
                    int docCount = 0;
                    for (JsonNode doc : root.path("documents")) {
                        String docName = doc.path("name").asText();
                        // Extract document ID from full name (e.g., "fileSearchStores/xxx/documents/docId" -> "docId")
                        String docId = docName.substring(docName.lastIndexOf("/") + 1);

                        // Use force=true to delete documents even if they are still processing
                        String deleteDocUrl = GEMINI_API_BASE + "/fileSearchStores/" + storeName + "/documents/" + docId + "?key=" + geminiApiKey + "&force=true";
                        HttpRequest deleteDocRequest = HttpRequest.newBuilder()
                                .uri(URI.create(deleteDocUrl))
                                .DELETE()
                                .timeout(Duration.ofSeconds(30))
                                .build();

                        HttpResponse<String> deleteDocResponse = httpClient.send(deleteDocRequest, HttpResponse.BodyHandlers.ofString());
                        log.info("Deleted document {} from store {}: status {}", docId, storeName, deleteDocResponse.statusCode());
                        docCount++;
                    }
                    // Wait for documents to be fully deleted before deleting store
                    if (docCount > 0) {
                        log.info("Waiting for {} documents to be deleted from store {}", docCount, storeName);
                        Thread.sleep(2000); // Wait 2 seconds for deletion to propagate
                    }
                }
            }

            // Step 3: Delete the store itself (use force=true to delete even if not empty)
            String url = GEMINI_API_BASE + "/fileSearchStores/" + storeName + "?key=" + geminiApiKey + "&force=true";

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .DELETE()
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return ResponseEntity.ok(Map.of(
                    "error", "Store 삭제 실패",
                    "statusCode", response.statusCode(),
                    "details", response.body()
                ));
            }

            if (storeName.equals(currentFileSearchStoreName) ||
                (currentFileSearchStoreName != null && currentFileSearchStoreName.contains(storeName))) {
                currentFileSearchStoreName = null;
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "FileSearchStore와 모든 문서가 삭제되었습니다"
            ));

        } catch (Exception e) {
            log.error("Failed to delete FileSearchStore", e);
            return ResponseEntity.ok(Map.of("error", "Store 삭제 실패: " + e.getMessage()));
        }
    }

    /**
     * Resolve fileId to displayName from Google Files API
     */
    private String resolveFileDisplayName(String fileIdOrTitle) {
        // If the title already looks like a filename (contains extension), return as is
        if (fileIdOrTitle.contains(".")) {
            return fileIdOrTitle;
        }

        try {
            String fileUrl = GEMINI_API_BASE + "/files/" + fileIdOrTitle + "?key=" + geminiApiKey;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fileUrl))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode fileNode = objectMapper.readTree(response.body());
                String displayName = fileNode.path("displayName").asText();
                if (displayName != null && !displayName.isEmpty()) {
                    return displayName;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to resolve displayName for fileId: {}", fileIdOrTitle);
        }

        return fileIdOrTitle; // Return original if resolution fails
    }

    /**
     * Get list of document names (displayNames) from current FileSearchStore
     */
    private List<String> getStoreDocumentNames() {
        List<String> names = new ArrayList<>();
        if (currentFileSearchStoreName == null) {
            return names;
        }

        try {
            String storeId = currentFileSearchStoreName.replace("fileSearchStores/", "");
            String url = GEMINI_API_BASE + "/fileSearchStores/" + storeId + "/documents?key=" + geminiApiKey;

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.has("documents")) {
                    for (JsonNode doc : root.path("documents")) {
                        String docName = doc.path("name").asText();
                        String displayName = doc.path("displayName").asText();

                        // Extract file ID and get real displayName from Files API if needed
                        String fileId = null;
                        if (docName.contains("/documents/")) {
                            String lastPart = docName.substring(docName.lastIndexOf("/documents/") + "/documents/".length());
                            if (lastPart.contains("-")) {
                                fileId = lastPart.substring(0, lastPart.indexOf("-"));
                            } else {
                                fileId = lastPart;
                            }
                        }

                        // If displayName looks like an ID, try to resolve it
                        if (fileId != null && (displayName == null || displayName.isEmpty() || !displayName.contains("."))) {
                            String resolvedName = resolveFileDisplayName(fileId);
                            if (resolvedName != null && !resolvedName.equals(fileId)) {
                                displayName = resolvedName;
                            }
                        }

                        if (displayName != null && !displayName.isEmpty()) {
                            names.add(displayName);
                        } else if (fileId != null) {
                            names.add(fileId);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get store document names: {}", e.getMessage());
        }

        return names;
    }

    /**
     * Build system prompt including document metadata for File Search
     */
    private String buildSystemPromptWithDocuments(List<String> documentNames) {
        StringBuilder sb = new StringBuilder();
        sb.append("당신은 TNT 영업 시스템의 AI 어시스턴트입니다. ");
        sb.append("현재 RAG 스토어에는 다음과 같은 문서들이 있습니다:\n\n");

        if (documentNames.isEmpty()) {
            sb.append("(문서 없음)\n");
        } else {
            sb.append("총 ").append(documentNames.size()).append("개 문서:\n");
            for (int i = 0; i < documentNames.size(); i++) {
                sb.append(i + 1).append(". ").append(documentNames.get(i)).append("\n");
            }
        }

        sb.append("\n사용자의 질문에 대해 이 문서들의 내용을 검색하여 정확하게 답변하세요. ");
        sb.append("스토어에 어떤 파일이 있는지 물어보면 위 문서 목록을 정확하게 알려주세요.");

        return sb.toString();
    }

    // Inner class for document info
    private static class DocumentInfo {
        final String id;
        final String fileName;
        final String content;
        final long uploadedAt;

        DocumentInfo(String id, String fileName, String content, long uploadedAt) {
            this.id = id;
            this.fileName = fileName;
            this.content = content;
            this.uploadedAt = uploadedAt;
        }
    }
}
