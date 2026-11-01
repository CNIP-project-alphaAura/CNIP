package com.elearning.nettrack.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA Entity representing network flow control and traffic shaping algorithm metrics.
 */
@Entity
@Table(name = "algorithm_metrics")
public class AlgorithmMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "algorithm_type", nullable = false, length = 30)
    private String algorithmType; // "SLIDING_WINDOW", "GO_BACK_N", "LEAKY_BUCKET"

    @Column(name = "parameter_key", length = 50)
    private String parameterKey; // "WINDOW_SIZE", "BUCKET_CAPACITY", "LEAK_RATE"

    @Column(name = "parameter_val")
    private int parameterValue;

    @Column(name = "throughput_mbps")
    private double throughputMbps;

    @Column(name = "packet_loss_percent")
    private double packetLossPercent;

    @Column(name = "retransmissions")
    private int retransmissions;

    @Column(name = "queue_occupancy")
    private int queueOccupancy;

    @Column(name = "summary", length = 255)
    private String summary;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public AlgorithmMetric() {
        this.createdAt = LocalDateTime.now();
    }

    public AlgorithmMetric(String algorithmType, String parameterKey, int parameterValue,
                           double throughputMbps, double packetLossPercent, int retransmissions,
                           int queueOccupancy, String summary) {
        this.algorithmType = algorithmType;
        this.parameterKey = parameterKey;
        this.parameterValue = parameterValue;
        this.throughputMbps = throughputMbps;
        this.packetLossPercent = packetLossPercent;
        this.retransmissions = retransmissions;
        this.queueOccupancy = queueOccupancy;
        this.summary = summary;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAlgorithmType() { return algorithmType; }
    public void setAlgorithmType(String algorithmType) { this.algorithmType = algorithmType; }

    public String getParameterKey() { return parameterKey; }
    public void setParameterKey(String parameterKey) { this.parameterKey = parameterKey; }

    public int getParameterValue() { return parameterValue; }
    public void setParameterValue(int parameterValue) { this.parameterValue = parameterValue; }

    public double getThroughputMbps() { return throughputMbps; }
    public void setThroughputMbps(double throughputMbps) { this.throughputMbps = throughputMbps; }

    public double getPacketLossPercent() { return packetLossPercent; }
    public void setPacketLossPercent(double packetLossPercent) { this.packetLossPercent = packetLossPercent; }

    public int getRetransmissions() { return retransmissions; }
    public void setRetransmissions(int retransmissions) { this.retransmissions = retransmissions; }

    public int getQueueOccupancy() { return queueOccupancy; }
    public void setQueueOccupancy(int queueOccupancy) { this.queueOccupancy = queueOccupancy; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

