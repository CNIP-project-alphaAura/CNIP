package com.elearning.nettrack.controller;

import com.elearning.nettrack.model.SimulationRun;
import com.elearning.nettrack.service.Ns2SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*")
public class SimulationController {

    @Autowired
    private Ns2SimulationService ns2SimulationService;

    /**
     * GET /api/simulation/metrics?users=10&protocol=TCP
     * Returns KPI metrics for the specified student load and protocol.
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics(
            @RequestParam(defaultValue = "10") int users,
            @RequestParam(defaultValue = "TCP") String protocol) {

        Optional<SimulationRun> existing = ns2SimulationService.getLatestRun(users, protocol);
        SimulationRun run = existing.orElseGet(() -> ns2SimulationService.runSimulation(users, protocol));

        Map<String, Object> response = new HashMap<>();
        response.put("users", run.getStudentCount());
        response.put("protocol", run.getProtocol());
        response.put("tput", String.format("%,.2f Kbps", run.getThroughputKbps()));
        response.put("tputMbps", String.format("%.2f Mbps", run.getThroughputMbps()));
        response.put("delay", String.format("%.2f ms", run.getDelayMs()));
        response.put("plr", String.format("%.2f%%", run.getPacketLossRate()));
        response.put("pdr", String.format("%.2f%%", run.getDeliveryRatio()));
        response.put("sent", run.getPacketsSent());
        response.put("recv", run.getPacketsReceived());
        response.put("dropped", run.getPacketsDropped());
        response.put("description", run.getScenarioDescription());
        response.put("databaseId", run.getId());

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/simulation/run
     * Triggers a fresh NS-2 simulation execution and persists the result in MySQL.
     */
    @PostMapping("/run")
    public ResponseEntity<SimulationRun> triggerSimulation(@RequestBody Map<String, Object> payload) {
        int users = payload.containsKey("studentCount") ? ((Number) payload.get("studentCount")).intValue() : 10;
        String protocol = payload.containsKey("protocol") ? (String) payload.get("protocol") : "TCP";

        SimulationRun run = ns2SimulationService.runSimulation(users, protocol);
        return ResponseEntity.ok(run);
    }

    /**
     * GET /api/simulation/history
     * Returns historical simulation runs stored in the MySQL database.
     */
    @GetMapping("/history")
    public ResponseEntity<List<SimulationRun>> getHistory() {
        return ResponseEntity.ok(ns2SimulationService.getAllRuns());
    }

    /**
     * GET /api/simulation/all
     * Returns all primary scenarios (10, 50, 100 students for TCP and UDP).
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllScenarios() {
        int[] userCounts = {10, 50, 100};
        String[] protocols = {"TCP", "UDP"};
        Map<String, Object> data = new LinkedHashMap<>();

        for (int u : userCounts) {
            Map<String, Object> protoMap = new HashMap<>();
            for (String p : protocols) {
                SimulationRun run = ns2SimulationService.computeDeterministicNs2Run(u, p);
                Map<String, Object> item = new HashMap<>();
                item.put("tput", String.format("%,.2f Kbps", run.getThroughputKbps()));
                item.put("tputMbps", String.format("%.2f Mbps", run.getThroughputMbps()));
                item.put("delay", String.format("%.2f ms", run.getDelayMs()));
                item.put("plr", String.format("%.2f%%", run.getPacketLossRate()));
                item.put("pdr", String.format("%.2f%%", run.getDeliveryRatio()));
                item.put("sent", run.getPacketsSent());
                item.put("recv", run.getPacketsReceived());
                item.put("dropped", run.getPacketsDropped());
                protoMap.put(p, item);
            }
            data.put(String.valueOf(u), protoMap);
        }

        return ResponseEntity.ok(data);
    }
}

