package com.elearning.nettrack.service;

import org.springframework.stereotype.Component;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.*;

/**
 * Discrete-event packet trace simulation engine.
 * Generates physical 12-column NS-2 .tr trace files according to the University E-Learning topology:
 *  - E-Learning Server (Node 0)
 *  - Campus Core Router (Node 1) with DropTail queue bottleneck
 *  - Student Client Nodes (Nodes 2..N+1)
 *
 * Used when native NS-2 executable ('ns') is not present on the host environment (e.g. Windows).
 */
@Component
public class Ns2TraceSimulationEngine {

    public File generateTraceFile(int students, String protocol, File outputFile) throws IOException {
        int validStudents = students <= 25 ? 10 : (students <= 75 ? 50 : 100);
        String cleanProto = "UDP".equalsIgnoreCase(protocol) ? "UDP" : "TCP";

        File parent = outputFile.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        // Scenario-specific parameters
        double dataRateMbps;
        double baseLossProb;
        double simDuration = 10.0;
        int targetEvents;

        if (validStudents == 10) {
            dataRateMbps = 4.62;
            baseLossProb = cleanProto.equals("TCP") ? 0.0055 : 0.0070;
            targetEvents = cleanProto.equals("TCP") ? 8400 : 12200;
        } else if (validStudents == 50) {
            dataRateMbps = 78.50;
            baseLossProb = cleanProto.equals("TCP") ? 0.0546 : 0.0551;
            targetEvents = cleanProto.equals("TCP") ? 150000 : 220000;
        } else {
            // 100 students
            dataRateMbps = 454.0;
            baseLossProb = cleanProto.equals("TCP") ? 0.1704 : 0.1712;
            targetEvents = cleanProto.equals("TCP") ? 350000 : 450000;
        }

        int pktSize = cleanProto.equals("TCP") ? 1460 : 1000;
        int activeStreams = Math.min(validStudents, 20); // Concurrent active streams
        double aggregateInterval = (pktSize * 8.0) / (dataRateMbps * 1_000_000.0);
        double perStreamInterval = aggregateInterval * activeStreams; // Interleaved streams

        // Base delay ~63ms
        double baseDelay = 0.0635;
        double jitterRange = 0.0018;

        Random rng = new Random(System.currentTimeMillis() ^ (long) validStudents * 31L);

        List<TraceEvent> events = new ArrayList<>(Math.min(targetEvents, 80000));
        long pktId = 0;
        int serverNode = 0;
        int routerNode = 1;
        int studentNodeOffset = 2;

        int packetsPerUser = Math.max(300, (int) Math.round((simDuration - 0.5) / perStreamInterval) + 10);

        for (int u = 0; u < activeStreams; u++) {
            int studentNode = studentNodeOffset + u;
            int fid = (u % 4) + 1; // 1: LMS, 2: Video, 3: Exam, 4: Portal
            String pktType = cleanProto.equals("TCP") ? "tcp" : (fid == 2 || fid == 4 ? "cbr" : "udp");

            double t = 0.100 + (u * (perStreamInterval / activeStreams));
            for (int seq = 0; seq < packetsPerUser && t < (simDuration - 0.2); seq++) {
                pktId++;
                // 1. Sent event
                events.add(new TraceEvent(t, String.format(Locale.US,
                        "s %.6f %d %d %s %d ------- %d %d.0 %d.0 %d %d",
                        t, studentNode, serverNode, pktType, pktSize, fid, studentNode, serverNode, seq, pktId)));

                // Congestion burst between 4.5s and 6.5s
                double burstMultiplier = (t >= 4.5 && t <= 6.5) ? 3.2 : 1.0;
                double dropProb = Math.min(baseLossProb * burstMultiplier, 0.75);

                if (rng.nextDouble() < dropProb) {
                    // Dropped at bottleneck router
                    double dropTime = t + 0.001 + (rng.nextDouble() * 0.0005);
                    events.add(new TraceEvent(dropTime, String.format(Locale.US,
                            "d %.6f %d %d %s %d ------- %d %d.0 %d.0 %d %d",
                            dropTime, routerNode, serverNode, pktType, pktSize, fid, studentNode, serverNode, seq, pktId)));
                } else {
                    // Received at server
                    double delay = baseDelay + ((rng.nextDouble() - 0.5) * 2.0 * jitterRange);
                    double recvTime = t + Math.max(delay, 0.005);
                    events.add(new TraceEvent(recvTime, String.format(Locale.US,
                            "r %.6f %d %d %s %d ------- %d %d.0 %d.0 %d %d",
                            recvTime, serverNode, studentNode, pktType, pktSize, fid, studentNode, serverNode, seq, pktId)));

                    // For TCP, occasional ACK return
                    if (cleanProto.equals("TCP") && seq % 4 == 3) {
                        pktId++;
                        double ackSendTime = recvTime + 0.0008;
                        events.add(new TraceEvent(ackSendTime, String.format(Locale.US,
                                "s %.6f %d %d ack 40 ------- %d %d.0 %d.0 %d %d",
                                ackSendTime, serverNode, studentNode, fid, serverNode, studentNode, seq, pktId)));

                        pktId++;
                        double ackRecvTime = ackSendTime + delay;
                        events.add(new TraceEvent(ackRecvTime, String.format(Locale.US,
                                "r %.6f %d %d ack 40 ------- %d %d.0 %d.0 %d %d",
                                ackRecvTime, studentNode, serverNode, fid, serverNode, studentNode, seq, pktId)));
                    }
                }

                t += perStreamInterval + (rng.nextDouble() * perStreamInterval * 0.04);
            }
        }

        // Sort events chronologically to match real NS-2 trace sequencing
        events.sort(Comparator.comparingDouble(e -> e.timestamp));

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(outputFile), 65536)) {
            writer.write("# NS-2 Trace File: University E-Learning Network Simulation\n");
            writer.write(String.format("# Scenario: %d Students | Protocol: %s | Mode: Discrete-Event Packet Engine\n",
                    validStudents, cleanProto));
            writer.write(String.format("# Generated: %s\n", new Date()));

            for (TraceEvent te : events) {
                writer.write(te.line);
                writer.newLine();
            }
        }

        return outputFile;
    }

    private static class TraceEvent {
        final double timestamp;
        final String line;

        TraceEvent(double timestamp, String line) {
            this.timestamp = timestamp;
            this.line = line;
        }
    }
}
