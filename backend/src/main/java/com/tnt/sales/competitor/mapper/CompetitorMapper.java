package com.tnt.sales.competitor.mapper;

import com.tnt.sales.competitor.model.Competitor;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CompetitorMapper {
    void insert(Competitor competitor);

    void update(Competitor competitor);

    java.util.List<Competitor> findAll(java.util.Map<String, Object> params);
}
