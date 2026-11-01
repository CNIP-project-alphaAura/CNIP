package com.elearning.nettrack.config;

import com.elearning.nettrack.model.AlgorithmMetric;
import com.elearning.nettrack.model.NetworkNode;
import com.elearning.nettrack.model.SimulationRun;
import com.elearning.nettrack.repository.AlgorithmMetricRepository;
import com.elearning.nettrack.repository.NetworkNodeRepository;
import com.elearning.nettrack.repository.SimulationRunRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Initializes the MySQL database with verified NS-2 simulation benchmark records,
 * flow control metrics, and network topology device data.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private SimulationRunRepository simulationRunRepository;

    @Autowired
    private AlgorithmMetricRepository algorithmMetricRepository;

    @Autowired
    private NetworkNodeRepository networkNodeRepository;

    @Override
    public void run(String... args) {
        // 1. Seed Simulation Runs if database table is empty
        if (simulationRunRepository.count() == 0) {
            simulationRunRepository.saveAll(Arrays.asList(
                // 10 Students
                new SimulationRun(10, "TCP", 4610.66, 4.61, 63.96, 0.55, 99.45, 4204, 4181, 23, "10 Students · TCP Reno · Light traffic"),
                new SimulationRun(10, "UDP", 4614.45, 4.61, 63.83, 0.70, 99.30, 6146, 6103, 43, "10 Students · UDP Video · Low delay streaming"),

                // 50 Students
                new SimulationRun(50, "TCP", 78240.50, 78.24, 65.20, 5.46, 94.54, 78920, 74610, 4310, "50 Students · TCP Reno · Peak concurrent classes"),
                new SimulationRun(50, "UDP", 78910.20, 78.91, 65.15, 5.51, 94.49, 115200, 108850, 6350, "50 Students · UDP Video · Moderate queue pressure"),

                // 100 Students
                new SimulationRun(100, "TCP", 453538.68, 453.54, 62.44, 17.04, 82.96, 497642, 412859, 84783, "100 Students · TCP Reno · Exam rush, bottleneck congestion"),
                new SimulationRun(100, "UDP", 454119.76, 454.12, 62.41, 17.12, 82.88, 726683, 602284, 124399, "100 Students · UDP Video · High loss broadcast")
            ));
        }

        // 2. Seed Algorithm Metrics if table is empty
        if (algorithmMetricRepository.count() == 0) {
            algorithmMetricRepository.saveAll(Arrays.asList(
                new AlgorithmMetric("SLIDING_WINDOW", "WINDOW_SIZE", 4, 3.8, 0.0, 0, 4, "Window Size 4: 38% link utilization"),
                new AlgorithmMetric("SLIDING_WINDOW", "WINDOW_SIZE", 16, 8.4, 0.0, 0, 16, "Window Size 16: 84% link utilization"),
                new AlgorithmMetric("SLIDING_WINDOW", "WINDOW_SIZE", 64, 9.8, 0.0, 0, 48, "Window Size 64: 98% line utilization"),

                new AlgorithmMetric("GO_BACK_N", "WINDOW_SIZE", 4, 3.5, 2.5, 4, 4, "Go-Back-N (W=4): Retransmits N packets upon single drop"),
                new AlgorithmMetric("GO_BACK_N", "WINDOW_SIZE", 8, 7.2, 5.0, 8, 8, "Go-Back-N (W=8): Pipeline recovery"),

                new AlgorithmMetric("LEAKY_BUCKET", "BURST_MODE", 0, 1.0, 0.0, 0, 0, "Leaky Bucket Shaped: 0% loss, steady 1.0 Mbps leak rate"),
                new AlgorithmMetric("LEAKY_BUCKET", "BURST_MODE", 1, 4.0, 57.7, 0, 100, "Unshaped Burst: 57.7% drop on 4 Mbps video surge")
            ));
        }

        // 3. Seed Network Nodes
        if (networkNodeRepository.count() == 0) {
            networkNodeRepository.saveAll(Arrays.asList(
                new NetworkNode("node0_server", "University LMS & Video Server", "SERVER", "1 Gbps", "1ms", 100, "ONLINE"),
                new NetworkNode("node1_router", "Campus Gateway Router", "ROUTER", "10 Mbps", "5ms", 50, "BOTTLENECK"),
                new NetworkNode("node2_switch", "Department Layer 2 Switch", "SWITCH", "100 Mbps", "1ms", 64, "ONLINE"),
                new NetworkNode("node3_ap", "Campus Wi-Fi 6 Access Point", "ACCESS_POINT", "54 Mbps", "2ms", 32, "ONLINE"),
                new NetworkNode("node4_students", "Student Computer Lab & Laptops", "STUDENT_DEVICE", "10-100 Mbps", "5ms", 16, "ONLINE")
            ));
        }
    }
}

