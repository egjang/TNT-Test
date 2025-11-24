package com.tnt.sales.lab.api;

import com.tnt.sales.lab.model.SimulationData;
import com.tnt.sales.lab.service.PriceSimulationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/lab/price-simulation")
public class PriceSimulationController {

    private final PriceSimulationService service;

    public PriceSimulationController(PriceSimulationService service) {
        this.service = service;
    }

    @GetMapping("/data")
    public ResponseEntity<SimulationData> getSimulationData(
            @RequestParam Long customerSeq,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        SimulationData data = service.getSimulationData(customerSeq, startDate, endDate);
        return ResponseEntity.ok(data);
    }

    @PostMapping("/assessment")
    public ResponseEntity<?> saveAssessment(@RequestBody Map<String, Object> payload) {
        Long customerSeq = Long.valueOf(payload.get("customerSeq").toString());
        String assessorId = (String) payload.get("assessorId");
        int score = Integer.parseInt(payload.get("score").toString());
        String comment = (String) payload.get("comment");

        service.saveAssessment(customerSeq, assessorId, score, comment);
        return ResponseEntity.ok(Map.of("success", true));
    }

}
