package com.elearning.nettrack.repository;

import com.elearning.nettrack.model.NetworkNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NetworkNodeRepository extends JpaRepository<NetworkNode, Long> {

    Optional<NetworkNode> findByNodeKey(String nodeKey);
}

