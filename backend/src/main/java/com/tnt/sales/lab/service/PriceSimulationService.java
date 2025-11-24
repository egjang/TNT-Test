package com.tnt.sales.lab.service;

import com.tnt.sales.lab.model.SimulationData;
import com.tnt.sales.lab.model.CreditRating;
import com.tnt.sales.lab.model.SalesRepAssessment;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.core.env.Environment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PriceSimulationService {

    private final JdbcTemplate jdbc;
    private final Environment env;

    public PriceSimulationService(@Qualifier("pgJdbcTemplate") JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    public SimulationData getSimulationData(Long customerSeq, LocalDate startDate, LocalDate endDate) {
        SimulationData data = new SimulationData();
        data.setCustomerSeq(customerSeq);

        // 1. Fetch Customer Info
        fetchCustomerInfo(data, customerSeq);

        // 2. Fetch Transaction Volume (Invoice)
        fetchTransactionVolume(data, customerSeq);

        // 3. Fetch Credit Aging
        fetchCreditAging(data, customerSeq);

        // 4. Fetch Credit Rating
        fetchCreditRating(data, customerSeq);

        // 5. Fetch Rep Assessment
        fetchRepAssessment(data, customerSeq);

        // 6. Calculate Scores
        calculateScores(data);

        // 7. Fetch Items & Calculate Simulated Prices
        fetchItemsAndSimulate(data, customerSeq, startDate, endDate);

        return data;
    }

    public void saveAssessment(Long customerSeq, String assessorId, int score, String comment) {
        String sql = "INSERT INTO sales_rep_assessment (customer_seq, assessor_id, assessment_score, assessment_comment, assessment_date) "
                +
                "VALUES (?, ?, ?, ?, CURRENT_DATE)";
        jdbc.update(sql, customerSeq, assessorId, score, comment);
    }

    private void fetchCustomerInfo(SimulationData data, Long customerSeq) {
        String sql = "SELECT customer_name FROM customer WHERE customer_seq = ?";
        try {
            String name = jdbc.queryForObject(sql, String.class, customerSeq);
            data.setCustomerName(name);
        } catch (Exception e) {
            data.setCustomerName("Unknown Customer");
        }
    }

    private void fetchTransactionVolume(SimulationData data, Long customerSeq) {
        // Mocking logic for now as invoice table structure might vary.
        // In real impl, query invoice table for last 3 years.
        // Assuming current year is 2025 based on prompt context (though system time
        // says 2025)
        // Let's use current year from system time.
        int currentYear = LocalDate.now().getYear();

        String sql = "SELECT " +
                "SUM(CASE WHEN EXTRACT(YEAR FROM invoice_date) = ? THEN cur_amt ELSE 0 END) as vol_cur, " +
                "SUM(CASE WHEN EXTRACT(YEAR FROM invoice_date) = ? THEN cur_amt ELSE 0 END) as vol_y1, " +
                "SUM(CASE WHEN EXTRACT(YEAR FROM invoice_date) = ? THEN cur_amt ELSE 0 END) as vol_y2 " +
                "FROM invoice WHERE customer_seq = ?";

        try {
            Map<String, Object> result = jdbc.queryForMap(sql, currentYear, currentYear - 1, currentYear - 2,
                    customerSeq);
            data.setVolumeCurrent((BigDecimal) result.get("vol_cur"));
            data.setVolumeYear1((BigDecimal) result.get("vol_y1"));
            data.setVolumeYear2((BigDecimal) result.get("vol_y2"));
        } catch (Exception e) {
            // Fallback if query fails or table doesn't exist as expected
            data.setVolumeCurrent(BigDecimal.ZERO);
            data.setVolumeYear1(BigDecimal.ZERO);
            data.setVolumeYear2(BigDecimal.ZERO);
        }

        // Calculate Growth Rate (Current vs Last Year)
        if (data.getVolumeYear1() != null && data.getVolumeYear1().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal growth = data.getVolumeCurrent().subtract(data.getVolumeYear1())
                    .divide(data.getVolumeYear1(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            data.setVolumeGrowthRate(growth);
        } else {
            data.setVolumeGrowthRate(BigDecimal.ZERO);
        }
    }

    private void fetchCreditAging(SimulationData data, Long customerSeq) {
        // Fetch latest aging snapshot
        String sql = "SELECT total_ar, aging_0_30, aging_31_60, aging_61_90, aging_91_120, " +
                "aging_121_150, aging_151_180, aging_181_210, aging_211_240, aging_241_270, " +
                "aging_271_300, aging_301_330, aging_331_365, aging_over_365 " +
                "FROM credit_ar_aging WHERE customer_seq = ? ORDER BY snapshot_date DESC LIMIT 1";

        try {
            Map<String, Object> result = jdbc.queryForMap(sql, customerSeq);
            BigDecimal totalAr = (BigDecimal) result.get("total_ar");
            BigDecimal aging030 = (BigDecimal) result.get("aging_0_30");

            // Overdue is everything > 30 days
            BigDecimal overdue = totalAr.subtract(aging030);

            data.setTotalAr(totalAr);
            data.setOverdueAr(overdue);

            if (totalAr.compareTo(BigDecimal.ZERO) > 0) {
                data.setOverdueRatio(
                        overdue.divide(totalAr, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)));
            } else {
                data.setOverdueRatio(BigDecimal.ZERO);
            }
        } catch (Exception e) {
            data.setTotalAr(BigDecimal.ZERO);
            data.setOverdueAr(BigDecimal.ZERO);
            data.setOverdueRatio(BigDecimal.ZERO);
        }
    }

    private void fetchCreditRating(SimulationData data, Long customerSeq) {
        String sql = "SELECT rating_agency, rating_grade, rating_score FROM credit_rating " +
                "WHERE customer_seq = ? ORDER BY rating_date DESC LIMIT 1";
        try {
            Map<String, Object> result = jdbc.queryForMap(sql, customerSeq);
            data.setRatingAgency((String) result.get("rating_agency"));
            data.setRatingGrade((String) result.get("rating_grade"));
            data.setRatingScore((Integer) result.get("rating_score"));
        } catch (Exception e) {
            data.setRatingAgency("None");
            data.setRatingGrade("-");
            data.setRatingScore(50); // Default neutral score
        }
    }

    private void fetchRepAssessment(SimulationData data, Long customerSeq) {
        String sql = "SELECT assessment_score, assessment_comment FROM sales_rep_assessment " +
                "WHERE customer_seq = ? ORDER BY assessment_date DESC LIMIT 1";
        try {
            Map<String, Object> result = jdbc.queryForMap(sql, customerSeq);
            int score = (Integer) result.get("assessment_score");
            data.setAssessmentScore(score); // Assuming stored as 0-100
            data.setAssessmentComment((String) result.get("assessment_comment"));
        } catch (Exception e) {
            data.setAssessmentScore(50); // Default neutral
            data.setAssessmentComment("No assessment yet.");
        }
    }

    private void calculateScores(SimulationData data) {
        // 1. Volume Score: Growth > 10% = 100, < -10% = 0
        BigDecimal growth = data.getVolumeGrowthRate();
        int volScore = 50;
        if (growth.compareTo(BigDecimal.valueOf(10)) >= 0)
            volScore = 100;
        else if (growth.compareTo(BigDecimal.valueOf(-10)) <= 0)
            volScore = 0;
        else {
            // Linear interpolation between -10 and 10 -> 0 to 100
            // score = (growth + 10) * 5
            volScore = growth.add(BigDecimal.valueOf(10)).multiply(BigDecimal.valueOf(5)).intValue();
        }
        data.setVolumeScore(volScore);

        // 2. Aging Score: 0% overdue = 100, > 50% overdue = 0
        BigDecimal overdueRatio = data.getOverdueRatio();
        int agingScore = 100;
        if (overdueRatio.compareTo(BigDecimal.valueOf(50)) >= 0)
            agingScore = 0;
        else {
            // Linear: 100 - (ratio * 2)
            agingScore = BigDecimal.valueOf(100).subtract(overdueRatio.multiply(BigDecimal.valueOf(2))).intValue();
        }
        data.setAgingScore(agingScore);

        // 3. Rating Score & 4. Assessment Score are already set

        // Total Score (Weighted Average - equal weights for now)
        int totalScore = (data.getVolumeScore() + data.getAgingScore() + data.getRatingScore()
                + data.getAssessmentScore()) / 4;
        data.setTotalScore(totalScore);

        // Risk Premium Calculation
        // Max Increase = 10%
        // Increase = Max * (1 - TotalScore/100)
        BigDecimal maxIncrease = BigDecimal.valueOf(10);
        BigDecimal scoreFactor = BigDecimal.valueOf(totalScore).divide(BigDecimal.valueOf(100), 2,
                RoundingMode.HALF_UP);
        BigDecimal increase = maxIncrease.multiply(BigDecimal.ONE.subtract(scoreFactor));
        data.setSuggestedIncreaseRate(increase);
    }

    private void fetchItemsAndSimulate(SimulationData data, Long customerSeq, LocalDate startDate, LocalDate endDate) {
        // Fetch items sold to this customer in the period
        String sql = "SELECT i.item_seq, i.item_name, MAX(it.item_unit) as item_unit, " +
                "SUM(i.cur_amt) / NULLIF(SUM(i.qty), 0) as avg_price, " +
                "SUM(i.qty) as total_qty " +
                "FROM invoice i " +
                "LEFT JOIN item it ON i.item_seq = it.item_seq " +
                "WHERE i.customer_seq = ? AND i.invoice_date BETWEEN ? AND ? " +
                "GROUP BY i.item_seq, i.item_name";

        List<SimulationData.SimulationItem> items = new ArrayList<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(sql, customerSeq, startDate, endDate);
            for (Map<String, Object> row : rows) {
                SimulationData.SimulationItem item = new SimulationData.SimulationItem();
                item.setItemSeq((Long) row.get("item_seq"));
                item.setItemName((String) row.get("item_name"));
                item.setItemUnit((String) row.get("item_unit"));

                BigDecimal avgPrice = (BigDecimal) row.get("avg_price");
                if (avgPrice == null)
                    avgPrice = BigDecimal.ZERO;
                item.setRecentUnitPrice(avgPrice);

                BigDecimal qty = (BigDecimal) row.get("total_qty");
                item.setRecentQty(qty);

                // Simulate Price
                BigDecimal increaseRate = data.getSuggestedIncreaseRate().divide(BigDecimal.valueOf(100), 4,
                        RoundingMode.HALF_UP);
                BigDecimal simulatedPrice = avgPrice.multiply(BigDecimal.ONE.add(increaseRate));
                item.setSimulatedUnitPrice(simulatedPrice);

                items.add(item);
            }
        } catch (Exception e) {
            // Handle empty or error
        }
        data.setItems(items);
    }
}
