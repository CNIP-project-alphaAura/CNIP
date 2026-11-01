package com.elearning.nettrack.controller;

import com.elearning.nettrack.repository.AlgorithmMetricRepository;
import com.elearning.nettrack.repository.SimulationRunRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.*;

@RestController
@RequestMapping("/api/system")
@CrossOrigin(origins = "*")
public class SystemController {

    @Autowired
    private SimulationRunRepository simulationRunRepository;

    @Autowired
    private AlgorithmMetricRepository algorithmMetricRepository;

    @Autowired
    private DataSource dataSource;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("application", "NetTrack");
        status.put("version", "1.0.0");
        status.put("framework", "Java Spring Boot 3.3.5 (REST API)");
        status.put("status", "UP");

        // Database status check
        String dbProduct = "Unknown";
        boolean dbConnected = false;
        try (Connection conn = dataSource.getConnection()) {
            dbProduct = conn.getMetaData().getDatabaseProductName() + " " + conn.getMetaData().getDatabaseProductVersion();
            dbConnected = true;
        } catch (Exception e) {
            dbProduct = "Connecting: " + e.getMessage();
        }

        status.put("databaseConnected", dbConnected);
        status.put("database", dbProduct);
        status.put("totalSimulationRunsStored", simulationRunRepository.count());
        status.put("algorithmMetricsCount", algorithmMetricRepository.count());
        status.put("ns2Engine", "Integrated TCL Analytical Model");

        return ResponseEntity.ok(status);
    }
}

