-- ====================================================================
-- NetTrack Database Schema for MySQL 8.0+
-- Database: nettrack_db
-- ====================================================================

CREATE DATABASE IF NOT EXISTS nettrack_db;
USE nettrack_db;

-- 1. Table for NS-2 Simulation Runs
CREATE TABLE IF NOT EXISTS simulation_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_count INT NOT NULL,
    protocol VARCHAR(10) NOT NULL,
    throughput_kbps DOUBLE,
    throughput_mbps DOUBLE,
    delay_ms DOUBLE,
    packet_loss_rate DOUBLE,
    delivery_ratio DOUBLE,
    packets_sent BIGINT,
    packets_received BIGINT,
    packets_dropped BIGINT,
    scenario_desc VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for Algorithm Metrics (Sliding Window, Go-Back-N, Leaky Bucket)
CREATE TABLE IF NOT EXISTS algorithm_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    algorithm_type VARCHAR(30) NOT NULL,
    parameter_key VARCHAR(50),
    parameter_val INT,
    throughput_mbps DOUBLE,
    packet_loss_percent DOUBLE,
    retransmissions INT,
    queue_occupancy INT,
    summary VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table for University Network Topology Devices
CREATE TABLE IF NOT EXISTS network_nodes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    node_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50),
    link_capacity VARCHAR(50),
    propagation_delay VARCHAR(50),
    queue_buffer INT,
    status VARCHAR(30)
);
