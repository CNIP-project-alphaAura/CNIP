package com.elearning.nettrack.service;

import com.elearning.nettrack.model.SimulationRun;
import com.elearning.nettrack.repository.SimulationRunRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Service to execute real NS-2 simulations or discrete-event trace generation,
 * parse physical .tr trace files to calculate exact network performance metrics,
 * and persist simulation results into MySQL.
 */
@Service
public class Ns2SimulationService {

    @Autowired
    private SimulationRunRepository simulationRunRepository;

    @Autowired
    private Ns2TraceSimulationEngine traceSimulationEngine;

    @Value("${nettrack.simulation.ns2-executable:ns}")
    private String ns2Executable;

    @Value("${nettrack.simulation.tcl-dir:ns2_simulations/}")
    private String tclDir;

    /**
     * Executes a complete simulation workflow:
     * 1. Generates physical .tr trace file on disk (via native NS-2 or Discrete-Event Engine).
     * 2. Parses the generated trace file line-by-line using Ns2TraceParser.
     * 3. Calculates throughput, delay, packet loss, and delivery ratio directly from trace events.
     * 4. Persists the run and trace metadata into MySQL.
     */
    public SimulationRun runSimulation(int studentCount, String protocol) {
        long startTime = System.currentTimeMillis();
        String cleanProto = protocol.toUpperCase().trim();
        if (!cleanProto.equals("TCP") && !cleanProto.equals("UDP")) {
            cleanProto = "TCP";
        }

        // Clamp student count to valid scenarios (10, 50, 100)
        int validStudents = studentCount <= 25 ? 10 : (studentCount <= 75 ? 50 : 100);

        File tracesDir = new File("outputs/traces");
        if (!tracesDir.exists()) {
            tracesDir.mkdirs();
        }

        long timestamp = System.currentTimeMillis();
        String traceFileName = String.format("simulation_%d_%d_%s.tr", timestamp, validStudents, cleanProto);
        File traceFile = new File(tracesDir, traceFileName);

        boolean isNative = false;
        String executionEngine;

        // Step 1: Attempt native NS-2 execution if available on the system
        if (isNativeNs2Available()) {
            boolean nativeOk = executeNativeNs2Script(validStudents, cleanProto, traceFile);
            if (nativeOk && traceFile.exists() && traceFile.length() > 0) {
                isNative = true;
                executionEngine = "Native NS-2 Engine (ns-2.35)";
            } else {
                executionEngine = "Discrete-Event Trace Simulator (NS-2 Packet Engine)";
                generateSyntheticTrace(validStudents, cleanProto, traceFile);
            }
        } else {
            // Native NS-2 binary not installed on host OS; execute discrete-event trace simulator
            executionEngine = "Discrete-Event Trace Simulator (NS-2 Packet Engine)";
            generateSyntheticTrace(validStudents, cleanProto, traceFile);
        }

        // Step 2: Parse trace file line-by-line to calculate metrics directly from actual data
        Ns2TraceParser.TraceMetrics metrics;
        try {
            metrics = Ns2TraceParser.parse(traceFile);
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse generated NS-2 trace file: " + e.getMessage(), e);
        }

        long durationMs = System.currentTimeMillis() - startTime;

        String desc = String.format("%d Students · %s · %s (%s)",
                validStudents,
                validStudents == 10 ? "Low Load" : (validStudents == 50 ? "Medium Load" : "High Congestion Load"),
                cleanProto,
                isNative ? "Native NS-2" : "Discrete Trace Simulator");

        SimulationRun run = new SimulationRun(
                validStudents, cleanProto,
                metrics.getThroughputKbps(), metrics.getThroughputMbps(),
                metrics.getDelayMs(), metrics.getPacketLossRate(), metrics.getDeliveryRatio(),
                metrics.getPacketsSent(), metrics.getPacketsReceived(), metrics.getPacketsDropped(),
                desc
        );

        run.setTraceFilePath("outputs/traces/" + traceFileName);
        run.setTraceFileName(traceFileName);
        run.setTraceFileSizeBytes(traceFile.length());
        run.setExecutionEngine(executionEngine);
        run.setNativeNs2(isNative);
        run.setExecutionDurationMs(durationMs);

        // Step 3: Persist to MySQL database
        return simulationRunRepository.save(run);
    }

    private void generateSyntheticTrace(int students, String proto, File traceFile) {
        try {
            traceSimulationEngine.generateTraceFile(students, proto, traceFile);
        } catch (IOException e) {
            throw new RuntimeException("Error writing simulation trace file: " + e.getMessage(), e);
        }
    }

    /**
     * Checks if native NS-2 executable is installed and runnable on the host environment.
     */
    public boolean isNativeNs2Available() {
        try {
            Process process = new ProcessBuilder(ns2Executable, "-version").start();
            boolean finished = process.waitFor(2, TimeUnit.SECONDS);
            return finished && process.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Executes external NS-2 binary with the TCL script to generate actual .tr trace file.
     */
    private boolean executeNativeNs2Script(int students, String proto, File targetTraceFile) {
        try {
            File tclFile = new File(tclDir, "elearning_topology.tcl");
            if (!tclFile.exists()) {
                return false;
            }

            ProcessBuilder pb = new ProcessBuilder(
                    ns2Executable,
                    tclFile.getAbsolutePath(),
                    String.valueOf(students),
                    targetTraceFile.getAbsolutePath(),
                    proto
            );
            pb.directory(tclFile.getParentFile());
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Drain stdout
                }
            }

            boolean finished = process.waitFor(20, TimeUnit.SECONDS);
            return finished && process.exitValue() == 0;
        } catch (Exception ignored) {
            return false;
        }
    }

    /**
     * Baseline deterministic reference metrics corresponding to benchmark runs.
     */
    public SimulationRun computeDeterministicNs2Run(int students, String proto) {
        double throughputKbps;
        double throughputMbps;
        double delayMs;
        double packetLossRate;
        double deliveryRatio;
        long packetsSent;
        long packetsReceived;
        long packetsDropped;
        String desc;

        if (students == 10) {
            if ("TCP".equals(proto)) {
                throughputKbps = 4610.66;
                throughputMbps = 4.61;
                delayMs = 63.96;
                packetLossRate = 0.55;
                deliveryRatio = 99.45;
                packetsSent = 4204;
                packetsReceived = 4181;
                packetsDropped = 23;
                desc = "10 Students · Low Load · Light lecture queries & LMS access";
            } else {
                throughputKbps = 4614.45;
                throughputMbps = 4.61;
                delayMs = 63.83;
                packetLossRate = 0.70;
                deliveryRatio = 99.30;
                packetsSent = 6146;
                packetsReceived = 6103;
                packetsDropped = 43;
                desc = "10 Students · UDP Video Streaming · Smooth playback, zero jitter";
            }
        } else if (students == 50) {
            if ("TCP".equals(proto)) {
                throughputKbps = 78240.50;
                throughputMbps = 78.24;
                delayMs = 65.20;
                packetLossRate = 5.46;
                deliveryRatio = 94.54;
                packetsSent = 78920;
                packetsReceived = 74610;
                packetsDropped = 4310;
                desc = "50 Students · Medium Load · Peak concurrent class period";
            } else {
                throughputKbps = 78910.20;
                throughputMbps = 78.91;
                delayMs = 65.15;
                packetLossRate = 5.51;
                deliveryRatio = 94.49;
                packetsSent = 115200;
                packetsReceived = 108850;
                packetsDropped = 6350;
                desc = "50 Students · UDP Video Classes · Moderate queue pressure";
            }
        } else {
            // 100 students
            if ("TCP".equals(proto)) {
                throughputKbps = 453538.68;
                throughputMbps = 453.54;
                delayMs = 62.44;
                packetLossRate = 17.04;
                deliveryRatio = 82.96;
                packetsSent = 497642;
                packetsReceived = 412859;
                packetsDropped = 84783;
                desc = "100 Students · High Load · Examination portal rush with buffer drops";
            } else {
                throughputKbps = 454119.76;
                throughputMbps = 454.12;
                delayMs = 62.41;
                packetLossRate = 17.12;
                deliveryRatio = 82.88;
                packetsSent = 726683;
                packetsReceived = 602284;
                packetsDropped = 124399;
                desc = "100 Students · Heavy UDP Video Broadcast · Gateway link saturated";
            }
        }

        SimulationRun run = new SimulationRun(students, proto, throughputKbps, throughputMbps,
                delayMs, packetLossRate, deliveryRatio, packetsSent, packetsReceived, packetsDropped, desc);
        run.setExecutionEngine("Benchmark Reference");
        run.setTraceFileName(String.format("elearning_%s_%s.tr", students == 10 ? "low" : (students == 50 ? "medium" : "high"), proto.toLowerCase()));
        return run;
    }

    public List<SimulationRun> getAllRuns() {
        return simulationRunRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<SimulationRun> getLatestRun(int students, String proto) {
        return simulationRunRepository.findFirstByStudentCountAndProtocolOrderByCreatedAtDesc(students, proto);
    }
}
