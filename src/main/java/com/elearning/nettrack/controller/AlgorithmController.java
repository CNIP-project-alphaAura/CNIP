package com.elearning.nettrack.controller;

import com.elearning.nettrack.model.AlgorithmMetric;
import com.elearning.nettrack.service.AlgorithmService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/algorithms")
@CrossOrigin(origins = "*")
public class AlgorithmController {

    @Autowired
    private AlgorithmService algorithmService;

    @GetMapping("/sliding-window")
    public ResponseEntity<Map<String, Object>> getSlidingWindow(
            @RequestParam(defaultValue = "4") int windowSize) {
        return ResponseEntity.ok(algorithmService.simulateSlidingWindow(windowSize));
    }

    @GetMapping("/go-back-n")
    public ResponseEntity<Map<String, Object>> getGoBackN(
            @RequestParam(defaultValue = "4") int windowSize,
            @RequestParam(defaultValue = "false") boolean drop) {
        return ResponseEntity.ok(algorithmService.simulateGoBackN(windowSize, drop));
    }

    @GetMapping("/leaky-bucket")
    public ResponseEntity<Map<String, Object>> getLeakyBucket(
            @RequestParam(defaultValue = "false") boolean burst,
            @RequestParam(defaultValue = "100") int capacity,
            @RequestParam(defaultValue = "1000") int leakRate) {
        return ResponseEntity.ok(algorithmService.simulateLeakyBucket(burst, capacity, leakRate));
    }

    @GetMapping("/benchmarks")
    public ResponseEntity<List<AlgorithmMetric>> getBenchmarks() {
        return ResponseEntity.ok(algorithmService.getBenchmarks());
    }
}

