package com.tnt.sales.quote.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface QuoteMapper {
        // 견적 목록 조회
        List<Map<String, Object>> selectQuotes(@Param("startDate") String startDate,
                        @Param("endDate") String endDate,
                        @Param("status") String status,
                        @Param("keyword") String keyword,
                        @Param("customer") String customer);

        // 견적 상세 조회
        Map<String, Object> selectQuoteById(@Param("id") String id);

        // 견적별 거래처 목록 조회
        List<Map<String, Object>> selectQuoteCustomers(@Param("quoteId") String quoteId);

        // 거래처별 품목 목록 조회
        List<Map<String, Object>> selectQuoteItems(@Param("quoteCustomerId") Long quoteCustomerId);

        // 견적 등록
        void insertQuote(Map<String, Object> quote);

        // 견적 거래처 등록
        void insertQuoteCustomer(Map<String, Object> customer);

        // 견적 품목 등록
        void insertQuoteItem(Map<String, Object> item);

        // 견적 수정
        void updateQuote(Map<String, Object> quote);

        // 견적 상태 변경
        void updateQuoteStatus(@Param("id") String id,
                        @Param("status") String status,
                        @Param("approvalRule") String approvalRule);

        // 견적 품목 삭제
        void deleteQuoteItems(@Param("id") String id);

        // 견적 거래처 삭제
        void deleteQuoteCustomers(@Param("id") String id);

        // 고객 목록 조회 (콤보박스용)
        List<Map<String, Object>> selectCustomers(@Param("companyType") String companyType,
                        @Param("keyword") String keyword);

        // 품목 목록 조회 (콤보박스용)
        List<Map<String, Object>> selectItems(@Param("companyType") String companyType,
                        @Param("keyword") String keyword);

        // 프로젝트 목록 조회 (콤보박스용)
        List<Map<String, Object>> selectProjects(@Param("companyType") String companyType,
                        @Param("keyword") String keyword);

        // 견적번호 생성을 위한 당일 최대 시퀀스 조회
        int selectMaxQuoteSeq(@Param("datePrefix") String datePrefix);
}
