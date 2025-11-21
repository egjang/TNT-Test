package com.tnt.sales.demand.api;

import com.tnt.sales.demand.model.DemandUpsertRow;
import com.tnt.sales.demand.service.DemandService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Backward-compatible endpoint for clients calling /api/demand/upload
@RestController
@RequestMapping("/api/demand")
public class DemandUploadLegacyController {
    private final DemandService service;

    public DemandUploadLegacyController(DemandService service) {
        this.service = service;
    }

    public static class UploadRequest {
        public List<DemandUpsertRow> items;
        public List<DemandUpsertRow> getItems() { return items; }
        public void setItems(List<DemandUpsertRow> items) { this.items = items; }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestBody UploadRequest req) {
        try {
            if (req == null || req.items == null || req.items.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No items provided"));
            }
            var res = service.upsertFlatBatch(req.items);
            return ResponseEntity.ok(Map.of(
                    "updated", res.updated(),
                    "inserted", res.inserted(),
                    "total", res.updated() + res.inserted()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getClass().getSimpleName()+": "+e.getMessage()));
        }
    }
}
