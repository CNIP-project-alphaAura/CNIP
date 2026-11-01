package com.elearning.nettrack.model;

import jakarta.persistence.*;

/**
 * JPA Entity representing a network device in the university topology.
 */
@Entity
@Table(name = "network_nodes")
public class NetworkNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "node_key", unique = true, nullable = false, length = 50)
    private String nodeKey; // e.g. "server", "router", "switch", "ap", "students"

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "device_type", length = 50)
    private String deviceType; // "SERVER", "ROUTER", "SWITCH", "ACCESS_POINT", "STUDENT_DEVICE"

    @Column(name = "link_capacity", length = 50)
    private String linkCapacity; // "10 Mbps", "100 Mbps", "1 Gbps"

    @Column(name = "propagation_delay", length = 50)
    private String propagationDelay; // "5ms", "2ms", "10ms"

    @Column(name = "queue_buffer")
    private int queueBuffer; // DropTail queue limit, e.g. 50 packets

    @Column(name = "status", length = 30)
    private String status; // "ONLINE", "CONGESTED", "BOTTLENECK"

    public NetworkNode() {}

    public NetworkNode(String nodeKey, String name, String deviceType, String linkCapacity,
                       String propagationDelay, int queueBuffer, String status) {
        this.nodeKey = nodeKey;
        this.name = name;
        this.deviceType = deviceType;
        this.linkCapacity = linkCapacity;
        this.propagationDelay = propagationDelay;
        this.queueBuffer = queueBuffer;
        this.status = status;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNodeKey() { return nodeKey; }
    public void setNodeKey(String nodeKey) { this.nodeKey = nodeKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getLinkCapacity() { return linkCapacity; }
    public void setLinkCapacity(String linkCapacity) { this.linkCapacity = linkCapacity; }

    public String getPropagationDelay() { return propagationDelay; }
    public void setPropagationDelay(String propagationDelay) { this.propagationDelay = propagationDelay; }

    public int getQueueBuffer() { return queueBuffer; }
    public void setQueueBuffer(int queueBuffer) { this.queueBuffer = queueBuffer; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
