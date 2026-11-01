package com.elearning.nettrack.service;

import com.elearning.nettrack.model.NetworkNode;
import com.elearning.nettrack.repository.NetworkNodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TopologyService {

    @Autowired
    private NetworkNodeRepository networkNodeRepository;

    public Map<String, Object> getTopologyStatus(int studentCount) {
        int count = studentCount <= 25 ? 10 : (studentCount <= 75 ? 50 : 100);

        String queueStatus;
        String linkStatus;
        String linkClass;
        int queueCurrent;

        if (count == 10) {
            queueCurrent = 12;
            queueStatus = "12 / 50 pkts";
            linkStatus = "🟢 Normal Flow";
            linkClass = "normal";
        } else if (count == 50) {
            queueCurrent = 36;
            queueStatus = "36 / 50 pkts";
            linkStatus = "🟡 Moderate Queue Delay";
            linkClass = "moderate";
        } else {
            queueCurrent = 50;
            queueStatus = "50 / 50 pkts (FULL)";
            linkStatus = "🔴 Buffer Overflow & Loss";
            linkClass = "congested";
        }

        Map<String, Object> res = new HashMap<>();
        res.put("studentCount", count);
        res.put("connectedDevicesText", count + " Devices");
        res.put("bottleneckLink", "10 Mbps · 5ms");
        res.put("queueStatus", queueStatus);
        res.put("queueOccupancy", queueCurrent);
        res.put("queueCapacity", 50);
        res.put("linkStatus", linkStatus);
        res.put("linkClass", linkClass);

        return res;
    }

    public List<NetworkNode> getAllNodes() {
        return networkNodeRepository.findAll();
    }
}

