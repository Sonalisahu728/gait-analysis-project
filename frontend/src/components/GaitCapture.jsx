import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";

/**
 * GaitCapture
 * ------------
 * Captures live camera video (front or back camera), runs MoveNet pose
 * detection in-browser, draws the detected skeleton on a canvas overlay,
 * records a short walking clip as a sequence of keypoint frames, and submits
 * it to the Spring Boot backend for gait analysis.
 *
 * Camera switching: the pose model loads once; the camera stream restarts
 * whenever `facingMode` changes ("user" = front, "environment" = back).
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

const CAMERA_LABELS = {
  user: "front camera",
  environment: "back camera",
};

export default function GaitCapture({
  onSessionComplete,
  recordSeconds = 8,
  defaultFacingMode = "environment", // back camera is easier for filming a walk
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const recordedFrames = useRef([]);

  const [status, setStatus] = useState("idle"); // idle | loading | ready | recording | done | submitting | error
  const [errorMsg, setErrorMsg] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(recordSeconds);

  const [modelReady, setModelReady] = useState(false);
  const [facingMode, setFacingMode] = useState(defaultFacingMode); // "user" | "environment"
  const [cameraCount, setCameraCount] = useState(0);
  const [cameraRetry, setCameraRetry] = useState(0);

  // 1) Load the pose model once.
  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      try {
        setStatus("loading");
        await tf.ready();
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (cancelled) {
          detector.dispose?.();
          return;
        }
        detectorRef.current = detector;
        setModelReady(true);
      } catch (err) {
        console.error("Model load failed:", err);
        if (!cancelled) {
          setErrorMsg("Could not load the pose model. Check your connection and reload.");
          setStatus("error");
        }
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      detectorRef.current?.dispose?.();
    };
  }, []);

  // 2) (Re)start the camera whenever the model is ready or the camera choice changes.
  useEffect(() => {
    if (!modelReady) return;
    let cancelled = false;
    let stream = null;

    async function startCamera() {
      try {
        setErrorMsg("");
        setStatus("loading");

        // "ideal" (not "exact") so devices with only one camera, like most
        // laptops, still work instead of throwing OverconstrainedError.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        // Count cameras so we only offer "Switch camera" when there is a choice.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setCameraCount(devices.filter((d) => d.kind === "videoinput").length);
          setStatus("ready");
        }
      } catch (err) {
        console.error("Camera start failed:", err);
        if (!cancelled) {
          setErrorMsg(
            err.name === "NotAllowedError"
              ? "Camera access was denied. Allow camera access in your browser settings, then try again."
              : err.name === "NotFoundError"
              ? "No camera was found on this device."
              : `Could not start the ${CAMERA_LABELS[facingMode]}.`
          );
          setStatus("error");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // Release the old camera before the next one starts (required on iOS Safari).
      const current = stream || videoRef.current?.srcObject;
      current?.getTracks?.().forEach((track) => track.stop());
    };
  }, [modelReady, facingMode, cameraRetry]);

  function switchCamera() {
    setFacingMode((mode) => (mode === "user" ? "environment" : "user"));
  }

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
      setErrorMsg("");
      setStatus("ready");
    } catch (err) {
      console.error("Failed to submit session:", err);
      setErrorMsg("Could not reach the backend. Is it running on port 8080?");
      setStatus("done"); // let them retry submit without re-recording
    }
  }

  const canSwitchCamera = status === "ready" && cameraCount > 1;
  // Front-camera preview is mirrored (like a selfie view). This is display
  // only; the keypoints sent to the backend are never mirrored.
  const mirrorPreview = facingMode === "user";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ position: "relative" }}>
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            borderRadius: 8,
            background: "#111",
            display: "block",
            transform: mirrorPreview ? "scaleX(-1)" : "none",
          }}
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
        {status === "loading" && modelReady && (
          <div
            style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", background: "rgba(0,0,0,0.5)", borderRadius: 8,
            }}
          >
            Starting {CAMERA_LABELS[facingMode]}…
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {status === "loading" && !modelReady && <p>Loading pose model…</p>}
        {status === "error" && (
          <>
            <p style={{ color: "#c00", margin: 0 }}>{errorMsg}</p>
            {modelReady && (
              <>
                <button onClick={() => setCameraRetry((n) => n + 1)}>Try again</button>
                {cameraCount > 1 && <button onClick={switchCamera}>Use other camera</button>}
              </>
            )}
          </>
        )}

        {status === "ready" && (
          <>
            <button onClick={startRecording}>Start walking — record {recordSeconds}s</button>
            {canSwitchCamera && (
              <button onClick={switchCamera}>
                Switch to {facingMode === "user" ? "back" : "front"} camera
              </button>
            )}
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Using {CAMERA_LABELS[facingMode]}
            </span>
          </>
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
