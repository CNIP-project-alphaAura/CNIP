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
     * GET /api/simulation/status
     * Returns whether native NS-2 executable is available on the host system.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getEngineStatus() {
        boolean nativeNs2 = ns2SimulationService.isNativeNs2Available();
        Map<String, Object> resp = new HashMap<>();
        resp.put("nativeNs2Available", nativeNs2);
        resp.put("activeEngine", nativeNs2 ? "Native NS-2 Engine (ns-2.35)" : "Discrete-Event Trace Simulator (NS-2 Packet Engine)");
        resp.put("traceGenerationSupported", true);
        return ResponseEntity.ok(resp);
    }

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

        return ResponseEntity.ok(formatSimulationResponse(run));
    }

    /**
     * POST /api/simulation/run
     * Executes an actual simulation (native NS-2 or discrete-event trace generator),
     * creates physical .tr trace file on disk, parses it event-by-event, persists to MySQL,
     * and returns the exact calculated results to the frontend.
     */
    @PostMapping("/run")
    public ResponseEntity<Map<String, Object>> triggerSimulation(@RequestBody Map<String, Object> payload) {
        int users = payload.containsKey("studentCount") ? ((Number) payload.get("studentCount")).intValue() : 10;
        String protocol = payload.containsKey("protocol") ? (String) payload.get("protocol") : "TCP";

        SimulationRun run = ns2SimulationService.runSimulation(users, protocol);
        return ResponseEntity.ok(formatSimulationResponse(run));
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
                Optional<SimulationRun> existing = ns2SimulationService.getLatestRun(u, p);
                SimulationRun run = existing.orElseGet(() -> ns2SimulationService.computeDeterministicNs2Run(u, p));
                protoMap.put(p, formatSimulationResponse(run));
            }
            data.put(String.valueOf(u), protoMap);
        }

        return ResponseEntity.ok(data);
    }

    private Map<String, Object> formatSimulationResponse(SimulationRun run) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("databaseId", run.getId());
        map.put("users", run.getStudentCount());
        map.put("protocol", run.getProtocol());
        map.put("tput", String.format("%,.2f Kbps", run.getThroughputKbps()));
        map.put("tputMbps", String.format("%.2f Mbps", run.getThroughputMbps()));
        map.put("throughputKbps", run.getThroughputKbps());
        map.put("throughputMbps", run.getThroughputMbps());
        map.put("delay", String.format("%.2f ms", run.getDelayMs()));
        map.put("delayMs", run.getDelayMs());
        map.put("plr", String.format("%.2f%%", run.getPacketLossRate()));
        map.put("packetLossRate", run.getPacketLossRate());
        map.put("pdr", String.format("%.2f%%", run.getDeliveryRatio()));
        map.put("deliveryRatio", run.getDeliveryRatio());
        map.put("sent", run.getPacketsSent());
        map.put("recv", run.getPacketsReceived());
        map.put("dropped", run.getPacketsDropped());
        map.put("description", run.getScenarioDescription());
        map.put("traceFilePath", run.getTraceFilePath());
        map.put("traceFileName", run.getTraceFileName());
        map.put("traceFileSizeBytes", run.getTraceFileSizeBytes());
        map.put("executionEngine", run.getExecutionEngine() != null ? run.getExecutionEngine() : "Discrete-Event Trace Simulator (NS-2 Packet Engine)");
        map.put("isNativeNs2", run.isNativeNs2());
        map.put("executionDurationMs", run.getExecutionDurationMs());
        map.put("createdAt", run.getCreatedAt());
        return map;
    }
}
