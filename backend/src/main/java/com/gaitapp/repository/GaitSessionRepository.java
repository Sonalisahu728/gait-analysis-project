package com.gaitapp.repository;

import com.gaitapp.entity.GaitSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GaitSessionRepository extends JpaRepository<GaitSessionEntity, Long> {
    List<GaitSessionEntity> findAllByOrderByRecordedAtDesc();
}
