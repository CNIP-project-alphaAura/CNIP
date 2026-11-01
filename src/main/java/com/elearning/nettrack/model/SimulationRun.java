package com.elearning.nettrack.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA Entity representing an NS-2 Network Simulation Run stored in MySQL.
 */
@Entity
@Table(name = "simulation_runs")
public class SimulationRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_count", nullable = false)
    private int studentCount;

    @Column(name = "protocol", nullable = false, length = 10)
    private String protocol; // "TCP" or "UDP"

    @Column(name = "throughput_kbps")
    private double throughputKbps;

    @Column(name = "throughput_mbps")
    private double throughputMbps;

    @Column(name = "delay_ms")
    private double delayMs;

    @Column(name = "packet_loss_rate")
    private double packetLossRate;

    @Column(name = "delivery_ratio")
    private double deliveryRatio;

    @Column(name = "packets_sent")
    private long packetsSent;

    @Column(name = "packets_received")
    private long packetsReceived;

    @Column(name = "packets_dropped")
    private long packetsDropped;

    @Column(name = "scenario_desc", length = 255)
    private String scenarioDescription;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public SimulationRun() {
        this.createdAt = LocalDateTime.now();
    }

    public SimulationRun(int studentCount, String protocol, double throughputKbps, double throughputMbps,
                         double delayMs, double packetLossRate, double deliveryRatio,
                         long packetsSent, long packetsReceived, long packetsDropped,
                         String scenarioDescription) {
        this.studentCount = studentCount;
        this.protocol = protocol;
        this.throughputKbps = throughputKbps;
        this.throughputMbps = throughputMbps;
        this.delayMs = delayMs;
        this.packetLossRate = packetLossRate;
        this.deliveryRatio = deliveryRatio;
        this.packetsSent = packetsSent;
        this.packetsReceived = packetsReceived;
        this.packetsDropped = packetsDropped;
        this.scenarioDescription = scenarioDescription;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public int getStudentCount() { return studentCount; }
    public void setStudentCount(int studentCount) { this.studentCount = studentCount; }

    public String getProtocol() { return protocol; }
    public void setProtocol(String protocol) { this.protocol = protocol; }

    public double getThroughputKbps() { return throughputKbps; }
    public void setThroughputKbps(double throughputKbps) { this.throughputKbps = throughputKbps; }

    public double getThroughputMbps() { return throughputMbps; }
    public void setThroughputMbps(double throughputMbps) { this.throughputMbps = throughputMbps; }

    public double getDelayMs() { return delayMs; }
    public void setDelayMs(double delayMs) { this.delayMs = delayMs; }

    public double getPacketLossRate() { return packetLossRate; }
    public void setPacketLossRate(double packetLossRate) { this.packetLossRate = packetLossRate; }

    public double getDeliveryRatio() { return deliveryRatio; }
    public void setDeliveryRatio(double deliveryRatio) { this.deliveryRatio = deliveryRatio; }

    public long getPacketsSent() { return packetsSent; }
    public void setPacketsSent(long packetsSent) { this.packetsSent = packetsSent; }

    public long getPacketsReceived() { return packetsReceived; }
    public void setPacketsReceived(long packetsReceived) { this.packetsReceived = packetsReceived; }

    public long getPacketsDropped() { return packetsDropped; }
    public void setPacketsDropped(long packetsDropped) { this.packetsDropped = packetsDropped; }

    public String getScenarioDescription() { return scenarioDescription; }
    public void setScenarioDescription(String scenarioDescription) { this.scenarioDescription = scenarioDescription; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
