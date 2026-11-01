package com.elearning.nettrack.service;

import com.elearning.nettrack.model.AlgorithmMetric;
import com.elearning.nettrack.repository.AlgorithmMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AlgorithmService {

    @Autowired
    private AlgorithmMetricRepository algorithmMetricRepository;

    /**
     * Simulates Sliding Window flow control dynamics for a specific window size.
     */
    public Map<String, Object> simulateSlidingWindow(int windowSize) {
        int w = (windowSize == 16 || windowSize == 64) ? windowSize : 4;
        double throughputMbps = (w == 4) ? 3.8 : ((w == 16) ? 8.4 : 9.8);
        double lineUtilization = (w == 4) ? 38.0 : ((w == 16) ? 84.0 : 98.0);
        int roundTripTimeMs = 64;

        Map<String, Object> res = new HashMap<>();
        res.put("algorithm", "SLIDING_WINDOW");
        res.put("windowSize", w);
        res.put("throughputMbps", throughputMbps);
        res.put("lineUtilizationPercent", lineUtilization);
        res.put("roundTripTimeMs", roundTripTimeMs);
        res.put("status", "Active Pipeline");
        res.put("explanation", "Sender transmits " + w + " frames concurrently before waiting for Cumulative ACK.");

        return res;
    }

    /**
     * Simulates Go-Back-N ARQ packet drop and retransmission recovery.
     */
    public Map<String, Object> simulateGoBackN(int windowSize, boolean dropPacket) {
        int w = (windowSize <= 4) ? 4 : 8;
        int droppedFrameIndex = dropPacket ? 3 : -1;
        int retransmittedCount = dropPacket ? (w - droppedFrameIndex) : 0;
        double recoveryDelayMs = dropPacket ? 120.0 : 0.0;

        Map<String, Object> res = new HashMap<>();
        res.put("algorithm", "GO_BACK_N");
        res.put("windowSize", w);
        res.put("droppedPacketIndex", droppedFrameIndex);
        res.put("retransmittedFrames", retransmittedCount);
        res.put("recoveryDelayMs", recoveryDelayMs);
        res.put("status", dropPacket ? "Packet Lost -> Go-Back-N Retransmission Triggered" : "Normal In-Order Transmission");
        res.put("rule", "Receiver discards out-of-order packets. Sender retransmits all packets from #" + (droppedFrameIndex >= 0 ? droppedFrameIndex : "none"));

        return res;
    }

    /**
     * Simulates Leaky Bucket traffic shaping queue dynamics.
     */
    public Map<String, Object> simulateLeakyBucket(boolean burst, int capacity, int leakRateKbps) {
        int cap = capacity > 0 ? capacity : 100;
        int rate = leakRateKbps > 0 ? leakRateKbps : 1000;

        int incomingBurstKbps = burst ? 4000 : 800;
        int droppedPackets = burst ? Math.max(0, (incomingBurstKbps - rate) / 100) : 0;
        double lossPercent = burst ? (droppedPackets * 100.0 / 40.0) : 0.0;

        Map<String, Object> res = new HashMap<>();
        res.put("algorithm", "LEAKY_BUCKET");
        res.put("burstActive", burst);
        res.put("incomingRateKbps", incomingBurstKbps);
        res.put("leakRateKbps", rate);
        res.put("bucketCapacity", cap);
        res.put("queueFillLevel", burst ? cap : 25);
        res.put("lossPercent", Math.min(lossPercent, 25.0));
        res.put("trafficShape", "Constant Bit Rate (CBR) Output");

        return res;
    }

    public List<AlgorithmMetric> getBenchmarks() {
        return algorithmMetricRepository.findAll();
    }
}

