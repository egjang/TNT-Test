package com.tnt.sales.quote;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/quotes")
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getQuotes(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String customer) {
        return ResponseEntity.ok(quoteService.getQuotes(startDate, endDate, status, keyword, customer));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getQuote(@PathVariable String id) {
        return ResponseEntity.ok(quoteService.getQuote(id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createQuote(@RequestBody Map<String, Object> quoteData) {
        return ResponseEntity.ok(quoteService.createQuote(quoteData));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateQuote(@PathVariable String id,
            @RequestBody Map<String, Object> quoteData) {
        return ResponseEntity.ok(quoteService.updateQuote(id, quoteData));
    }

    @PostMapping("/{id}/approval")
    public ResponseEntity<Map<String, Object>> requestApproval(@PathVariable String id) {
        return ResponseEntity.ok(quoteService.requestApproval(id));
    }

    // 마스터 데이터 조회 API
    @GetMapping("/master/customers")
    public ResponseEntity<List<Map<String, Object>>> getCustomers(
            @RequestParam(defaultValue = "TNT") String companyType,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(quoteService.getCustomers(companyType, keyword));
    }

    @GetMapping("/master/items")
    public ResponseEntity<List<Map<String, Object>>> getItems(
            @RequestParam(defaultValue = "TNT") String companyType,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(quoteService.getItems(companyType, keyword));
    }

    @GetMapping("/master/projects")
    public ResponseEntity<List<Map<String, Object>>> getProjects(
            @RequestParam(defaultValue = "TNT") String companyType,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(quoteService.getProjects(companyType, keyword));
    }
}
