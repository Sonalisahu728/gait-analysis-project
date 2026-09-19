package com.gaitapp.service;

import com.gaitapp.entity.GaitSessionEntity;
import com.gaitapp.model.*;
import com.gaitapp.repository.GaitSessionRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Turns a sequence of MoveNet keypoint frames into human-readable gait metrics:
 * cadence, knee angles, stride length, and left/right symmetry — then flags
 * anything that falls outside typical healthy ranges.
 *
 * This is the heart of the project: real geometry and signal-processing logic
 * on real coordinate data, not a call to an external AI API.
 */
@Service
public class GaitAnalysisService {

    private final GaitSessionRepository repository;

    // Reference ranges used for flagging. These are simplified, illustrative
    // thresholds loosely based on published gait-analysis literature — good
    // enough for a portfolio project, NOT a medical device. Say so in your README.
    private static final double SYMMETRY_WARNING_THRESHOLD = 85.0; // below this % = flag
    private static final double MIN_HEALTHY_KNEE_ANGLE = 160.0;    // degrees, near full extension
    private static final double MAX_HEALTHY_KNEE_ANGLE = 180.0;

    public GaitAnalysisService(GaitSessionRepository repository) {
        this.repository = repository;
    }

    public GaitMetrics analyze(GaitSessionRequest request) {
        List<FrameDto> frames = request.getFrames();

        List<Double> leftAnkleY = new ArrayList<>();
        List<Double> rightAnkleY = new ArrayList<>();
        List<Double> leftAnkleX = new ArrayList<>();
        List<Double> rightAnkleX = new ArrayList<>();
        List<Double> leftKneeAngles = new ArrayList<>();
        List<Double> rightKneeAngles = new ArrayList<>();
        List<Double> timestamps = new ArrayList<>();

        for (FrameDto frame : frames) {
            Map<String, KeypointDto> byName = new HashMap<>();
            for (KeypointDto kp : frame.getKeypoints()) {
                byName.put(kp.getName(), kp);
            }

            timestamps.add(frame.getTimestampMs());

            KeypointDto lHip = byName.get("left_hip");
            KeypointDto lKnee = byName.get("left_knee");
            KeypointDto lAnkle = byName.get("left_ankle");
            KeypointDto rHip = byName.get("right_hip");
            KeypointDto rKnee = byName.get("right_knee");
            KeypointDto rAnkle = byName.get("right_ankle");

            if (allConfident(lHip, lKnee, lAnkle)) {
                leftAnkleY.add(lAnkle.getY());
                leftAnkleX.add(lAnkle.getX());
                leftKneeAngles.add(jointAngleDegrees(lHip, lKnee, lAnkle));
            }
            if (allConfident(rHip, rKnee, rAnkle)) {
                rightAnkleY.add(rAnkle.getY());
                rightAnkleX.add(rAnkle.getX());
                rightKneeAngles.add(jointAngleDegrees(rHip, rKnee, rAnkle));
            }
        }

        List<Integer> leftStepIndices = detectStepIndices(leftAnkleY);
        List<Integer> rightStepIndices = detectStepIndices(rightAnkleY);

        double sessionDurationMs = timestamps.isEmpty() ? 0
                : timestamps.get(timestamps.size() - 1) - timestamps.get(0);
        int totalSteps = leftStepIndices.size() + rightStepIndices.size();
        double cadence = sessionDurationMs > 0
                ? (totalSteps / (sessionDurationMs / 1000.0 / 60.0))
                : 0;

        double avgLeftStride = averageStrideLength(leftAnkleX, leftStepIndices);
        double avgRightStride = averageStrideLength(rightAnkleX, rightStepIndices);
        double symmetryPercent = computeSymmetryPercent(avgLeftStride, avgRightStride);

        double avgLeftKnee = average(leftKneeAngles);
        double avgRightKnee = average(rightKneeAngles);

        List<String> flags = new ArrayList<>();
        if (symmetryPercent < SYMMETRY_WARNING_THRESHOLD) {
            flags.add(String.format(
                    "Stride asymmetry detected (%.1f%% symmetry). One side is taking notably " +
                    "shorter or longer strides than the other.", symmetryPercent));
        }
        if (avgLeftKnee > 0 && (avgLeftKnee < MIN_HEALTHY_KNEE_ANGLE || avgLeftKnee > MAX_HEALTHY_KNEE_ANGLE)) {
            flags.add(String.format("Left knee angle (%.1f°) is outside the typical range.", avgLeftKnee));
        }
        if (avgRightKnee > 0 && (avgRightKnee < MIN_HEALTHY_KNEE_ANGLE || avgRightKnee > MAX_HEALTHY_KNEE_ANGLE)) {
            flags.add(String.format("Right knee angle (%.1f°) is outside the typical range.", avgRightKnee));
        }
        if (totalSteps < 4) {
            flags.add("Very few steps detected — try recording a longer clip (8-10s) with your full body in frame.");
        }

        GaitMetrics metrics = new GaitMetrics();
        metrics.setCadenceStepsPerMinute(round(cadence));
        metrics.setAvgLeftKneeAngleDeg(round(avgLeftKnee));
        metrics.setAvgRightKneeAngleDeg(round(avgRightKnee));
        metrics.setStrideSymmetryPercent(round(symmetryPercent));
        metrics.setAvgStrideLengthPx(round((avgLeftStride + avgRightStride) / 2.0));
        metrics.setStepsDetected(totalSteps);
        metrics.setFlags(flags);

        persist(metrics);
        return metrics;
    }

    /** Persist a summary row so the frontend can show progress-over-time trends. */
    private void persist(GaitMetrics metrics) {
        GaitSessionEntity entity = new GaitSessionEntity();
        entity.setCadenceStepsPerMinute(metrics.getCadenceStepsPerMinute());
        entity.setAvgLeftKneeAngleDeg(metrics.getAvgLeftKneeAngleDeg());
        entity.setAvgRightKneeAngleDeg(metrics.getAvgRightKneeAngleDeg());
        entity.setStrideSymmetryPercent(metrics.getStrideSymmetryPercent());
        entity.setAvgStrideLengthPx(metrics.getAvgStrideLengthPx());
        entity.setStepsDetected(metrics.getStepsDetected());
        entity.setFlagsJoined(String.join(" | ", metrics.getFlags()));
        repository.save(entity);
    }

    public List<GaitSessionEntity> history() {
        return repository.findAllByOrderByRecordedAtDesc();
    }

    // ---- geometry & signal processing helpers ----

    private boolean allConfident(KeypointDto... points) {
        for (KeypointDto p : points) {
            if (p == null || p.getScore() < 0.3) return false;
        }
        return true;
    }

    /** Angle at the knee joint, formed by the hip-knee and ankle-knee vectors. */
    private double jointAngleDegrees(KeypointDto hip, KeypointDto knee, KeypointDto ankle) {
        double v1x = hip.getX() - knee.getX();
        double v1y = hip.getY() - knee.getY();
        double v2x = ankle.getX() - knee.getX();
        double v2y = ankle.getY() - knee.getY();

        double dot = v1x * v2x + v1y * v2y;
        double mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        double mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
        if (mag1 == 0 || mag2 == 0) return 0;

        double cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.toDegrees(Math.acos(cosAngle));
    }

    /**
     * Detects footstrike frames as local minima in ankle-Y (the foot's lowest,
     * i.e. largest pixel-Y, point during a step — since image Y grows downward,
     * we look for local MAXIMA in raw Y here). A simple sliding-window peak
     * detector, good enough given MoveNet's frame-to-frame noise.
     */
    private List<Integer> detectStepIndices(List<Double> ankleY) {
        List<Integer> steps = new ArrayList<>();
        int window = 3;
        for (int i = window; i < ankleY.size() - window; i++) {
            double current = ankleY.get(i);
            boolean isPeak = true;
            for (int j = i - window; j <= i + window; j++) {
                if (j != i && ankleY.get(j) > current) {
                    isPeak = false;
                    break;
                }
            }
            // avoid double-counting steps that are too close together
            if (isPeak && (steps.isEmpty() || i - steps.get(steps.size() - 1) > window * 2)) {
                steps.add(i);
            }
        }
        return steps;
    }

    private double averageStrideLength(List<Double> ankleX, List<Integer> stepIndices) {
        if (stepIndices.size() < 2) return 0;
        double totalDistance = 0;
        int count = 0;
        for (int i = 1; i < stepIndices.size(); i++) {
            int prevIdx = stepIndices.get(i - 1);
            int currIdx = stepIndices.get(i);
            if (prevIdx < ankleX.size() && currIdx < ankleX.size()) {
                totalDistance += Math.abs(ankleX.get(currIdx) - ankleX.get(prevIdx));
                count++;
            }
        }
        return count > 0 ? totalDistance / count : 0;
    }

    private double computeSymmetryPercent(double left, double right) {
        if (left == 0 && right == 0) return 100;
        double larger = Math.max(left, right);
        double smaller = Math.min(left, right);
        if (larger == 0) return 100;
        return (smaller / larger) * 100.0;
    }

    private double average(List<Double> values) {
        if (values.isEmpty()) return 0;
        double sum = 0;
        for (double v : values) sum += v;
        return sum / values.size();
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
