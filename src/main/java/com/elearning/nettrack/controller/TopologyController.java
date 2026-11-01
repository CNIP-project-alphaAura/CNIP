package com.elearning.nettrack.controller;

import com.elearning.nettrack.model.NetworkNode;
import com.elearning.nettrack.service.TopologyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/topology")
@CrossOrigin(origins = "*")
public class TopologyController {

    @Autowired
    private TopologyService topologyService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(@RequestParam(defaultValue = "10") int users) {
        return ResponseEntity.ok(topologyService.getTopologyStatus(users));
    }

    @GetMapping("/nodes")
    public ResponseEntity<List<NetworkNode>> getNodes() {
        return ResponseEntity.ok(topologyService.getAllNodes());
    }
}
