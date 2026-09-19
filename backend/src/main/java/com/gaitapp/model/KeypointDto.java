package com.gaitapp.model;

/**
 * One joint's position as detected by MoveNet in the browser, for a single frame.
 * Coordinates are in pixel space relative to the video frame.
 */
public class KeypointDto {
    private String name;   // e.g. "left_knee", "right_ankle"
    private double x;
    private double y;
    private double score;  // model confidence, 0.0 - 1.0

    public KeypointDto() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }
}
