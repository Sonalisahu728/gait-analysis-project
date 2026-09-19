package com.gaitapp.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "gait_sessions")
public class GaitSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant recordedAt = Instant.now();

    private double cadenceStepsPerMinute;
    private double avgLeftKneeAngleDeg;
    private double avgRightKneeAngleDeg;
    private double strideSymmetryPercent;
    private double avgStrideLengthPx;
    private int stepsDetected;

    @Column(length = 2000)
    private String flagsJoined; // simple comma-joined string; swap for a child table if you need more structure

    public GaitSessionEntity() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }

    public double getCadenceStepsPerMinute() { return cadenceStepsPerMinute; }
    public void setCadenceStepsPerMinute(double v) { this.cadenceStepsPerMinute = v; }

    public double getAvgLeftKneeAngleDeg() { return avgLeftKneeAngleDeg; }
    public void setAvgLeftKneeAngleDeg(double v) { this.avgLeftKneeAngleDeg = v; }

    public double getAvgRightKneeAngleDeg() { return avgRightKneeAngleDeg; }
    public void setAvgRightKneeAngleDeg(double v) { this.avgRightKneeAngleDeg = v; }

    public double getStrideSymmetryPercent() { return strideSymmetryPercent; }
    public void setStrideSymmetryPercent(double v) { this.strideSymmetryPercent = v; }

    public double getAvgStrideLengthPx() { return avgStrideLengthPx; }
    public void setAvgStrideLengthPx(double v) { this.avgStrideLengthPx = v; }

    public int getStepsDetected() { return stepsDetected; }
    public void setStepsDetected(int v) { this.stepsDetected = v; }

    public String getFlagsJoined() { return flagsJoined; }
    public void setFlagsJoined(String flagsJoined) { this.flagsJoined = flagsJoined; }
}
