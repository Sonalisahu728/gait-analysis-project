package com.gaitapp.controller;

import com.gaitapp.entity.GaitSessionEntity;
import com.gaitapp.model.GaitMetrics;
import com.gaitapp.model.GaitSessionRequest;
import com.gaitapp.service.GaitAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gait-sessions")
public class GaitSessionController {

    private final GaitAnalysisService analysisService;

    public GaitSessionController(GaitAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    /** Accepts a recorded session's keypoint frames and returns computed gait metrics. */
    @PostMapping
    public ResponseEntity<GaitMetrics> submitSession(@Valid @RequestBody GaitSessionRequest request) {
        GaitMetrics metrics = analysisService.analyze(request);
        return ResponseEntity.ok(metrics);
    }

    /** Returns past sessions, most recent first, for the trends dashboard. */
    @GetMapping
    public ResponseEntity<List<GaitSessionEntity>> history() {
        return ResponseEntity.ok(analysisService.history());
    }
}
