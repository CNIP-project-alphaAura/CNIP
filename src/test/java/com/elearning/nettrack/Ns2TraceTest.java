package com.elearning.nettrack;

import com.elearning.nettrack.service.Ns2TraceParser;
import com.elearning.nettrack.service.Ns2TraceSimulationEngine;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

public class Ns2TraceTest {

    @Test
    public void testTraceGenerationAndParsing() throws IOException {
        Ns2TraceSimulationEngine engine = new Ns2TraceSimulationEngine();
        File testDir = new File("outputs/traces/test");
        testDir.mkdirs();

        // 1. Test Low Load 10 Students TCP
        File trace10Tcp = new File(testDir, "test_10_tcp.tr");
        engine.generateTraceFile(10, "TCP", trace10Tcp);
        assertTrue(trace10Tcp.exists(), "Trace file must exist on disk");
        assertTrue(trace10Tcp.length() > 1000, "Trace file should contain packet lines");

        Ns2TraceParser.TraceMetrics m10 = Ns2TraceParser.parse(trace10Tcp);
        System.out.printf("Test 10 TCP: Throughput=%.2f Kbps, Delay=%.2f ms, Loss=%.2f%%, PDR=%.2f%%, Sent=%d, Recv=%d, Drop=%d%n",
                m10.getThroughputKbps(), m10.getDelayMs(), m10.getPacketLossRate(), m10.getDeliveryRatio(),
                m10.getPacketsSent(), m10.getPacketsReceived(), m10.getPacketsDropped());

        assertTrue(m10.getThroughputKbps() > 3000.0, "Throughput should be > 3000 Kbps");
        assertTrue(m10.getDelayMs() > 40.0 && m10.getDelayMs() < 100.0, "Delay should be realistic around 60ms");
        assertTrue(m10.getPacketLossRate() >= 0.0 && m10.getPacketLossRate() < 3.0, "Low load loss should be < 3%");
        assertTrue(m10.getDeliveryRatio() > 95.0, "PDR should be > 95%");
        assertEquals(m10.getPacketsSent(), m10.getPacketsReceived() + m10.getPacketsDropped(), "Sent should equal received + dropped");

        // 2. Test High Load 100 Students UDP
        File trace100Udp = new File(testDir, "test_100_udp.tr");
        engine.generateTraceFile(100, "UDP", trace100Udp);
        Ns2TraceParser.TraceMetrics m100 = Ns2TraceParser.parse(trace100Udp);
        System.out.printf("Test 100 UDP: Throughput=%.2f Kbps, Delay=%.2f ms, Loss=%.2f%%, PDR=%.2f%%, Sent=%d, Recv=%d, Drop=%d%n",
                m100.getThroughputKbps(), m100.getDelayMs(), m100.getPacketLossRate(), m100.getDeliveryRatio(),
                m100.getPacketsSent(), m100.getPacketsReceived(), m100.getPacketsDropped());

        assertTrue(m100.getThroughputKbps() > 100000.0, "High throughput should be high");
        assertTrue(m100.getPacketLossRate() > 10.0, "High load should produce realistic buffer congestion drop > 10%");

        // Clean up test files
        trace10Tcp.delete();
        trace100Udp.delete();
        testDir.delete();
    }

    @Test
    public void testExistingBenchmarkTraceParsing() throws IOException {
        File existingTrace = new File("outputs/traces/elearning_low_tcp.tr");
        if (existingTrace.exists()) {
            Ns2TraceParser.TraceMetrics metrics = Ns2TraceParser.parse(existingTrace);
            System.out.printf("Existing elearning_low_tcp.tr: Throughput=%.2f Kbps, Delay=%.2f ms, Loss=%.2f%%, PDR=%.2f%%%n",
                    metrics.getThroughputKbps(), metrics.getDelayMs(), metrics.getPacketLossRate(), metrics.getDeliveryRatio());
            assertTrue(metrics.getThroughputKbps() > 4000.0);
            assertTrue(metrics.getDeliveryRatio() > 98.0);
        }
    }
}
