package com.gaitapp.model;

import java.util.List;

public class FrameDto {
    private double timestampMs;
    private List<KeypointDto> keypoints;

    public FrameDto() {}

    public double getTimestampMs() { return timestampMs; }
    public void setTimestampMs(double timestampMs) { this.timestampMs = timestampMs; }

    public List<KeypointDto> getKeypoints() { return keypoints; }
    public void setKeypoints(List<KeypointDto> keypoints) { this.keypoints = keypoints; }
}
