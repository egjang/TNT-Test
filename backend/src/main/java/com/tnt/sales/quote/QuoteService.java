package com.tnt.sales.quote;

import com.tnt.sales.quote.mapper.QuoteMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class QuoteService {

    private final QuoteMapper quoteMapper;

    public QuoteService(QuoteMapper quoteMapper) {
        this.quoteMapper = quoteMapper;
    }

    // 견적 목록 조회
    public List<Map<String, Object>> getQuotes(String startDate, String endDate, String status, String keyword,
            String customer) {
        return quoteMapper.selectQuotes(startDate, endDate, status, keyword, customer);
    }

    // 견적 상세 조회 (거래처 및 품목 포함)
    @SuppressWarnings("unchecked")
    public Map<String, Object> getQuote(String id) {
        Map<String, Object> quote = quoteMapper.selectQuoteById(id);
        if (quote == null) {
            return null;
        }

        String quoteId = (String) quote.get("quoteId");

        // 거래처 목록 조회
        List<Map<String, Object>> customers = quoteMapper.selectQuoteCustomers(quoteId);

        // 각 거래처별 품목 조회
        for (Map<String, Object> customer : customers) {
            Long quoteCustomerId = ((Number) customer.get("id")).longValue();
            List<Map<String, Object>> items = quoteMapper.selectQuoteItems(quoteCustomerId);
            customer.put("items", items);
        }

        quote.put("customers", customers);
        return quote;
    }

    // 견적 신규 등록
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> createQuote(Map<String, Object> quoteData) {
        // 견적번호 생성 (YYYYMMDD + 3자리 시퀀스)
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int maxSeq = quoteMapper.selectMaxQuoteSeq(datePrefix);
        String quoteId = datePrefix + String.format("%03d", maxSeq + 1);
        quoteData.put("quoteId", quoteId);

        // 금액 계산
        calculateTotals(quoteData);

        // 승인 규칙 결정
        determineApprovalRule(quoteData);

        // 견적 마스터 저장
        quoteMapper.insertQuote(quoteData);
        Long generatedId = ((Number) quoteData.get("id")).longValue();

        // 거래처별 품목 저장
        List<Map<String, Object>> customers = (List<Map<String, Object>>) quoteData.get("customers");
        if (customers != null) {
            for (Map<String, Object> customer : customers) {
                customer.put("quoteId", quoteId);
                customer.put("createdBy", quoteData.get("assigneeId"));

                // 거래처별 금액 계산
                calculateCustomerTotals(customer);
                quoteMapper.insertQuoteCustomer(customer);

                Long quoteCustomerId = ((Number) customer.get("id")).longValue();

                List<Map<String, Object>> items = (List<Map<String, Object>>) customer.get("items");
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        item.put("quoteCustomerId", quoteCustomerId);
                        item.put("itemId", UUID.randomUUID().toString());
                        item.put("createdBy", quoteData.get("assigneeId"));

                        // 행 이익률 계산
                        calculateItemProfitRate(item);
                        quoteMapper.insertQuoteItem(item);
                    }
                }
            }
        }

        quoteData.put("id", generatedId);
        return quoteData;
    }

    // 견적 수정
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> updateQuote(String id, Map<String, Object> quoteData) {
        quoteData.put("id", id);

        // 기존 데이터 조회
        Map<String, Object> existingQuote = quoteMapper.selectQuoteById(id);
        if (existingQuote == null) {
            throw new RuntimeException("Quote not found: " + id);
        }

        String quoteId = (String) existingQuote.get("quoteId");
        quoteData.put("quoteId", quoteId);

        // 금액 계산
        calculateTotals(quoteData);

        // 승인 규칙 결정
        determineApprovalRule(quoteData);

        // 견적 마스터 수정
        quoteMapper.updateQuote(quoteData);

        // 기존 품목/거래처 삭제
        quoteMapper.deleteQuoteItems(id);
        quoteMapper.deleteQuoteCustomers(id);

        // 거래처별 품목 재등록
        List<Map<String, Object>> customers = (List<Map<String, Object>>) quoteData.get("customers");
        if (customers != null) {
            for (Map<String, Object> customer : customers) {
                customer.put("quoteId", quoteId);
                customer.put("createdBy", quoteData.get("assigneeId"));

                calculateCustomerTotals(customer);
                quoteMapper.insertQuoteCustomer(customer);

                Long quoteCustomerId = ((Number) customer.get("id")).longValue();

                List<Map<String, Object>> items = (List<Map<String, Object>>) customer.get("items");
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        item.put("quoteCustomerId", quoteCustomerId);
                        item.put("itemId", UUID.randomUUID().toString());
                        item.put("createdBy", quoteData.get("assigneeId"));

                        calculateItemProfitRate(item);
                        quoteMapper.insertQuoteItem(item);
                    }
                }
            }
        }

        return quoteData;
    }

    // 승인 요청
    @Transactional
    public Map<String, Object> requestApproval(String id) {
        Map<String, Object> quote = quoteMapper.selectQuoteById(id);
        if (quote == null) {
            throw new RuntimeException("Quote not found: " + id);
        }

        Number profitRateNum = (Number) quote.get("expectedProfitRate");
        double profitRate = profitRateNum != null ? profitRateNum.doubleValue() : 0;

        String approvalRule = "AUTO";
        String nextStatus = "APPROVED";

        // 승인 규칙 기준: 이익률에 따라 결정
        if (profitRate < 0) {
            approvalRule = "LOSS";
            nextStatus = "REQ_APPROVAL";
        } else if (profitRate < 10) {
            approvalRule = "TIER_AB";
            nextStatus = "REQ_APPROVAL";
        }

        quoteMapper.updateQuoteStatus(id, nextStatus, approvalRule);

        quote.put("approvalRule", approvalRule);
        quote.put("quoteStatus", nextStatus);

        return quote;
    }

    // 마스터 데이터 조회
    public List<Map<String, Object>> getCustomers(String companyType, String keyword) {
        return quoteMapper.selectCustomers(companyType, keyword);
    }

    public List<Map<String, Object>> getItems(String companyType, String keyword) {
        return quoteMapper.selectItems(companyType, keyword);
    }

    public List<Map<String, Object>> getProjects(String companyType, String keyword) {
        return quoteMapper.selectProjects(companyType, keyword);
    }

    // 총액 및 이익률 계산
    @SuppressWarnings("unchecked")
    private void calculateTotals(Map<String, Object> quoteData) {
        List<Map<String, Object>> customers = (List<Map<String, Object>>) quoteData.get("customers");
        double totalAmount = 0;
        double totalCost = 0;

        if (customers != null) {
            for (Map<String, Object> customer : customers) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) customer.get("items");
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        double quantity = toDouble(item.get("quantity"));
                        double unitPrice = toDouble(item.get("unitPrice"));
                        double refCost = toDouble(item.get("refCost"));

                        totalAmount += quantity * unitPrice;
                        totalCost += quantity * refCost;
                    }
                }
            }
        }

        double profitRate = totalAmount > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0;

        quoteData.put("totalAmount", Math.round(totalAmount));
        quoteData.put("totalCost", Math.round(totalCost));
        quoteData.put("expectedProfitRate", Math.round(profitRate * 100.0) / 100.0);
    }

    // 거래처별 합계 계산
    @SuppressWarnings("unchecked")
    private void calculateCustomerTotals(Map<String, Object> customer) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) customer.get("items");
        double subtotalAmount = 0;
        double subtotalCost = 0;

        if (items != null) {
            for (Map<String, Object> item : items) {
                double quantity = toDouble(item.get("quantity"));
                double unitPrice = toDouble(item.get("unitPrice"));
                double refCost = toDouble(item.get("refCost"));

                subtotalAmount += quantity * unitPrice;
                subtotalCost += quantity * refCost;
            }
        }

        double profitRate = subtotalAmount > 0 ? ((subtotalAmount - subtotalCost) / subtotalAmount) * 100 : 0;

        customer.put("subtotalAmount", Math.round(subtotalAmount));
        customer.put("subtotalCost", Math.round(subtotalCost));
        customer.put("subtotalProfitRate", Math.round(profitRate * 100.0) / 100.0);
    }

    // 품목별 이익률 계산
    private void calculateItemProfitRate(Map<String, Object> item) {
        double unitPrice = toDouble(item.get("unitPrice"));
        double refCost = toDouble(item.get("refCost"));

        double profitRate = unitPrice > 0 ? ((unitPrice - refCost) / unitPrice) * 100 : 0;
        item.put("rowProfitRate", Math.round(profitRate * 100.0) / 100.0);
    }

    // 승인 규칙 결정
    private void determineApprovalRule(Map<String, Object> quoteData) {
        Number profitRateNum = (Number) quoteData.get("expectedProfitRate");
        double profitRate = profitRateNum != null ? profitRateNum.doubleValue() : 0;

        String approvalRule = "AUTO";
        if (profitRate < 0) {
            approvalRule = "LOSS";
        } else if (profitRate < 10) {
            approvalRule = "TIER_AB";
        }
        quoteData.put("approvalRule", approvalRule);
    }

    // Object를 double로 변환
    private double toDouble(Object value) {
        if (value == null)
            return 0;
        if (value instanceof Number)
            return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
