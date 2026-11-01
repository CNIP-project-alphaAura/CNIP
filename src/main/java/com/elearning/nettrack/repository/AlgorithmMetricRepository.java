package com.elearning.nettrack.repository;

import com.elearning.nettrack.model.AlgorithmMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlgorithmMetricRepository extends JpaRepository<AlgorithmMetric, Long> {

    List<AlgorithmMetric> findByAlgorithmType(String algorithmType);

    List<AlgorithmMetric> findByAlgorithmTypeOrderByParameterValueAsc(String algorithmType);
}

