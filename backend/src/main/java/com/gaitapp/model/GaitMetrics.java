package com.gaitapp.model;

import java.util.List;

/**
 * The computed, human-readable output of analyzing one recorded walking session.
 */
public class GaitMetrics {

    private double cadenceStepsPerMinute;
    private double avgLeftKneeAngleDeg;
    private double avgRightKneeAngleDeg;
    private double strideSymmetryPercent; // 100 = perfectly symmetric, lower = more asymmetric
    private double avgStrideLengthPx;     // pixel units; not real-world distance without calibration
    private int stepsDetected;
    private List<String> flags;           // human-readable anomaly warnings

    public GaitMetrics() {}

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

    public List<String> getFlags() { return flags; }
    public void setFlags(List<String> flags) { this.flags = flags; }
}
