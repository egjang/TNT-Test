package com.tnt.sales.competitor.api;

import com.tnt.sales.competitor.model.Competitor;
import com.tnt.sales.competitor.service.CompetitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/competitors")
@RequiredArgsConstructor
public class CompetitorController {

    private final CompetitorService competitorService;

    @PostMapping
    public ResponseEntity<Competitor> register(@RequestBody Competitor competitor) {
        // TODO: Get current user from security context if needed
        competitor.setCreatedBy("system"); // Placeholder
        competitor.setUpdatedBy("system"); // Placeholder

        Competitor saved = competitorService.register(competitor);
        return ResponseEntity.ok(saved);
    }

    @org.springframework.web.bind.annotation.GetMapping
    public ResponseEntity<java.util.List<Competitor>> search(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String name,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String marketPosition,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String distributionModel) {
        return ResponseEntity.ok(competitorService.search(name, marketPosition, distributionModel));
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    public ResponseEntity<Competitor> update(@org.springframework.web.bind.annotation.PathVariable Long id,
            @RequestBody Competitor competitor) {
        competitor.setCompetitorId(id);
        competitor.setUpdatedBy("system"); // Placeholder
        return ResponseEntity.ok(competitorService.update(competitor));
    }

    @org.springframework.web.bind.annotation.GetMapping("/{id}/insights")
    public ResponseEntity<java.util.List<com.tnt.sales.competitor.model.CompetitorInsight>> getInsights(
            @org.springframework.web.bind.annotation.PathVariable Long id) {
        return ResponseEntity.ok(competitorService.getInsights(id));
    }

    @PostMapping("/{id}/insights")
    public ResponseEntity<com.tnt.sales.competitor.model.CompetitorInsight> addInsight(
            @org.springframework.web.bind.annotation.PathVariable Long id,
            @RequestBody com.tnt.sales.competitor.model.CompetitorInsight insight) {
        insight.setCompetitorId(id);
        insight.setCreatedBy("system"); // Placeholder
        insight.setUpdatedBy("system"); // Placeholder
        return ResponseEntity.ok(competitorService.addInsight(insight));
    }
}
