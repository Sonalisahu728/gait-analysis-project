package com.gaitapp.model;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class GaitSessionRequest {

    @NotEmpty(message = "frames cannot be empty")
    private List<FrameDto> frames;

    public GaitSessionRequest() {}

    public List<FrameDto> getFrames() { return frames; }
    public void setFrames(List<FrameDto> frames) { this.frames = frames; }
}
