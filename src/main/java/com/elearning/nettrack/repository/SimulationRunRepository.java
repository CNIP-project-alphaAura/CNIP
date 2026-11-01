package com.elearning.nettrack.repository;

import com.elearning.nettrack.model.SimulationRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {

    List<SimulationRun> findByStudentCountAndProtocol(int studentCount, String protocol);

    Optional<SimulationRun> findFirstByStudentCountAndProtocolOrderByCreatedAtDesc(int studentCount, String protocol);

    List<SimulationRun> findAllByOrderByCreatedAtDesc();

    List<SimulationRun> findTop10ByOrderByCreatedAtDesc();
}

