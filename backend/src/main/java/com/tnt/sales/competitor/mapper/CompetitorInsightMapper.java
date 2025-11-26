package com.tnt.sales.competitor.mapper;

import com.tnt.sales.competitor.model.CompetitorInsight;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CompetitorInsightMapper {
    void insert(CompetitorInsight insight);

    List<CompetitorInsight> findByCompetitorId(Long competitorId);
}
