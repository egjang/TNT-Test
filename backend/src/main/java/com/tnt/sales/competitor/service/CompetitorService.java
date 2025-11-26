package com.tnt.sales.competitor.service;

import com.tnt.sales.competitor.mapper.CompetitorMapper;
import com.tnt.sales.competitor.model.Competitor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitorService {

    private final CompetitorMapper competitorMapper;
    private final com.tnt.sales.competitor.mapper.CompetitorInsightMapper competitorInsightMapper;

    @Transactional
    public Competitor register(Competitor competitor) {
        competitorMapper.insert(competitor);
        return competitor;
    }

    @Transactional
    public Competitor update(Competitor competitor) {
        competitorMapper.update(competitor);
        return competitor;
    }

    public java.util.List<Competitor> search(String name, String marketPosition, String distributionModel) {
        java.util.Map<String, Object> params = new java.util.HashMap<>();
        params.put("name", name);
        params.put("marketPosition", marketPosition);
        params.put("distributionModel", distributionModel);
        return competitorMapper.findAll(params);
    }

    @Transactional
    public com.tnt.sales.competitor.model.CompetitorInsight addInsight(
            com.tnt.sales.competitor.model.CompetitorInsight insight) {
        competitorInsightMapper.insert(insight);
        return insight;
    }

    public java.util.List<com.tnt.sales.competitor.model.CompetitorInsight> getInsights(Long competitorId) {
        return competitorInsightMapper.findByCompetitorId(competitorId);
    }
}
