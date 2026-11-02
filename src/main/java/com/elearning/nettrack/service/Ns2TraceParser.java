package com.elearning.nettrack.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * High-performance NS-2 trace file parser.
 * Reads physical .tr files and computes Throughput, Delay, Packet Loss, and PDR
 * using the exact mathematical formulas as the AWK analysis scripts.
 */
public class Ns2TraceParser {

    public static class TraceMetrics {
        private final long packetsSent;
        private final long packetsReceived;
        private final long packetsDropped;
        private final double throughputKbps;
        private final double throughputMbps;
        private final double delayMs;
        private final double packetLossRate;
        private final double deliveryRatio;
        private final long totalEvents;
        private final long fileSizeBytes;
        private final String fileName;
        private final String filePath;

        public TraceMetrics(long packetsSent, long packetsReceived, long packetsDropped,
                            double throughputKbps, double throughputMbps, double delayMs,
                            double packetLossRate, double deliveryRatio, long totalEvents,
                            long fileSizeBytes, String fileName, String filePath) {
            this.packetsSent = packetsSent;
            this.packetsReceived = packetsReceived;
            this.packetsDropped = packetsDropped;
            this.throughputKbps = throughputKbps;
            this.throughputMbps = throughputMbps;
            this.delayMs = delayMs;
            this.packetLossRate = packetLossRate;
            this.deliveryRatio = deliveryRatio;
            this.totalEvents = totalEvents;
            this.fileSizeBytes = fileSizeBytes;
            this.fileName = fileName;
            this.filePath = filePath;
        }

        public long getPacketsSent() { return packetsSent; }
        public long getPacketsReceived() { return packetsReceived; }
        public long getPacketsDropped() { return packetsDropped; }
        public double getThroughputKbps() { return throughputKbps; }
        public double getThroughputMbps() { return throughputMbps; }
        public double getDelayMs() { return delayMs; }
        public double getPacketLossRate() { return packetLossRate; }
        public double getDeliveryRatio() { return deliveryRatio; }
        public long getTotalEvents() { return totalEvents; }
        public long getFileSizeBytes() { return fileSizeBytes; }
        public String getFileName() { return fileName; }
        public String getFilePath() { return filePath; }
    }

    public static TraceMetrics parse(File traceFile) throws IOException {
        if (!traceFile.exists()) {
            throw new IOException("Trace file does not exist: " + traceFile.getAbsolutePath());
        }

        long sent = 0;
        long received = 0;
        long dropped = 0;
        long totalBytes = 0;
        double firstTime = Double.MAX_VALUE;
        double lastTime = 0.0;

        double totalDelay = 0.0;
        long delayCount = 0;

        // Map of pkt_id -> send_time (matching delay.awk)
        Map<Long, Double> sendTimes = new HashMap<>(32768);

        long totalEvents = 0;

        try (BufferedReader reader = new BufferedReader(new FileReader(traceFile), 65536)) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                totalEvents++;
                char event = line.charAt(0);
                if (event != 's' && event != 'r' && event != 'd' && event != '+' && event != '-') {
                    continue;
                }

                String[] tokens = line.split("\\s+");
                if (tokens.length < 12) {
                    continue;
                }

                try {
                    double time = Double.parseDouble(tokens[1]);
                    int pktSize = Integer.parseInt(tokens[5]);
                    long pktId = Long.parseLong(tokens[11]);

                    if (event == 's') {
                        sent++;
                        if (!sendTimes.containsKey(pktId)) {
                            sendTimes.put(pktId, time);
                        }
                    } else if (event == 'r') {
                        received++;
                        totalBytes += pktSize;
                        if (time < firstTime) firstTime = time;
                        if (time > lastTime) lastTime = time;

                        if (sendTimes.containsKey(pktId)) {
                            double delay = time - sendTimes.get(pktId);
                            if (delay >= 0) {
                                totalDelay += delay;
                                delayCount++;
                            }
                            sendTimes.remove(pktId);
                        }
                    } else if (event == 'd') {
                        dropped++;
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }

        double duration = (lastTime > firstTime) ? (lastTime - firstTime) : 0.0;
        double throughputKbps = (duration > 0 && totalBytes > 0)
                ? (totalBytes * 8.0) / (duration * 1000.0)
                : 0.0;
        double throughputMbps = throughputKbps / 1000.0;

        double avgDelayMs = (delayCount > 0)
                ? (totalDelay / delayCount) * 1000.0
                : 0.0;

        double plr = (sent > 0) ? ((double) dropped / sent) * 100.0 : 0.0;
        double pdr = (sent > 0) ? ((double) received / sent) * 100.0 : 0.0;

        return new TraceMetrics(
                sent, received, dropped,
                Math.round(throughputKbps * 100.0) / 100.0,
                Math.round(throughputMbps * 100.0) / 100.0,
                Math.round(avgDelayMs * 100.0) / 100.0,
                Math.round(plr * 100.0) / 100.0,
                Math.round(pdr * 100.0) / 100.0,
                totalEvents,
                traceFile.length(),
                traceFile.getName(),
                traceFile.getPath()
        );
    }
}
