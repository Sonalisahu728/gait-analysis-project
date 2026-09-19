import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";

/**
 * GaitCapture
 * ------------
 * Captures live webcam video, runs MoveNet pose detection in-browser,
 * draws the detected skeleton on a canvas overlay, records a short walking
 * clip as a sequence of keypoint frames, and submits it to the Spring Boot
 * backend for gait analysis.
 */

const KEYPOINT_NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle",
];

const SKELETON_EDGES = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
];

const MIN_CONFIDENCE = 0.3;

export default function GaitCapture({ onSessionComplete, recordSeconds = 8 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const recordedFrames = useRef([]);

  const [status, setStatus] = useState("idle"); // idle | loading | ready | recording | done | submitting | error
  const [errorMsg, setErrorMsg] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(recordSeconds);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        setStatus("loading");
        await tf.ready();
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (cancelled) return;
        detectorRef.current = detector;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus("ready");
      } catch (err) {
        console.error("Setup failed:", err);
        if (!cancelled) {
          setErrorMsg(
            err.name === "NotAllowedError"
              ? "Camera access was denied. Please allow camera access and reload."
              : "Could not start camera or load the pose model."
          );
          setStatus("error");
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach((track) => track.stop());
      detectorRef.current?.dispose?.();
    };
  }, []);

  function drawFrame(video, canvas, keypoints) {
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00e5a0";
    for (const kp of keypoints) {
      if (kp.score < MIN_CONFIDENCE) continue;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.strokeStyle = "#00e5a0";
    ctx.lineWidth = 2;
    for (const [i, j] of SKELETON_EDGES) {
      const a = keypoints[i];
      const b = keypoints[j];
      if (a.score < MIN_CONFIDENCE || b.score < MIN_CONFIDENCE) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  useEffect(() => {
    if (status !== "ready" && status !== "recording") return;

    async function loop() {
      const video = videoRef.current;
      const detector = detectorRef.current;
      const canvas = canvasRef.current;

      if (video && detector && canvas && video.readyState >= 2) {
        const poses = await detector.estimatePoses(video);
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints;
          drawFrame(video, canvas, keypoints);

          if (status === "recording") {
            recordedFrames.current.push({
              timestampMs: performance.now(),
              keypoints: keypoints.map((kp, idx) => ({
                name: KEYPOINT_NAMES[idx],
                x: kp.x,
                y: kp.y,
                score: kp.score,
              })),
            });
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status]);

  useEffect(() => {
    if (status !== "recording") return;
    setSecondsLeft(recordSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setStatus("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, recordSeconds]);

  function startRecording() {
    recordedFrames.current = [];
    setStatus("recording");
  }

  async function submitSession() {
    setStatus("submitting");
    try {
      const response = await fetch("/api/gait-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: recordedFrames.current }),
      });
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const metrics = await response.json();
      onSessionComplete?.(metrics);
      setStatus("ready");
    } catch (err) {
      console.error("Failed to submit session:", err);
      setErrorMsg("Could not reach the backend. Is it running on port 8080?");
      setStatus("done"); // let them retry submit without re-recording
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ position: "relative" }}>
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas
          ref={canvasRef}
          style={{ width: "100%", borderRadius: 8, background: "#111", display: "block" }}
        />
        {status === "recording" && (
          <div
            style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(0,0,0,0.6)", color: "#fff",
              padding: "4px 10px", borderRadius: 6, fontFamily: "monospace",
            }}
          >
            REC {secondsLeft}s
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        {status === "loading" && <p>Loading camera and pose model…</p>}
        {status === "error" && <p style={{ color: "#c00" }}>{errorMsg}</p>}

        {status === "ready" && (
          <button onClick={startRecording}>Start walking — record {recordSeconds}s</button>
        )}

        {status === "done" && (
          <>
            <span>Captured {recordedFrames.current.length} frames.</span>
            <button onClick={submitSession}>Analyze this walk</button>
            <button onClick={() => setStatus("ready")}>Record again</button>
          </>
        )}

        {status === "submitting" && <p>Analyzing…</p>}
        {errorMsg && status === "done" && <p style={{ color: "#c00" }}>{errorMsg}</p>}
      </div>
    </div>
  );
}
