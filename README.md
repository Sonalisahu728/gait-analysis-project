# AI Gait & Posture Analysis

A full-stack app that analyzes how you walk using nothing but a webcam. Pose detection
runs client-side in the browser (TensorFlow.js MoveNet); the joint-coordinate data is
sent to a Java Spring Boot backend, which computes real gait metrics — cadence, stride
symmetry, knee angle — and flags anything outside typical healthy ranges.

**⚠️ Not a medical device.** The reference ranges used for flagging are simplified and
illustrative, meant to demonstrate the engineering, not to diagnose anything. Say this
clearly in any demo or interview — it shows judgment, not a disclaimer of weakness.

## Architecture

```
┌─────────────────────┐        keypoints (JSON)        ┌──────────────────────┐
│   React frontend     │ ──────────────────────────────▶ │  Spring Boot backend │
│  (webcam + MoveNet)  │ ◀────────────────────────────── │  (gait math + JPA)   │
└─────────────────────┘        computed metrics          └──────────┬───────────┘
                                                                     │
                                                              ┌──────▼───────┐
                                                              │   Database    │
                                                              │ (H2 / Postgres)│
                                                              └───────────────┘
```

**Why pose detection runs in the browser, not the server:** no video ever leaves the
user's device — only numeric joint coordinates are sent over the network. That's better
for privacy, and much cheaper than uploading/storing video server-side. This is a
deliberate architectural choice worth explaining in an interview.

## Project structure

```
gait-analysis-project/
├── backend/     Spring Boot (Java 17, Maven)
└── frontend/    React + Vite + TensorFlow.js
```

## Running it locally

### 1. Backend

Requires Java 17+ and Maven.

```bash
cd backend
mvn spring-boot:run
```

This starts the API on `http://localhost:8080`, using an in-memory H2 database by
default (no setup needed — data resets each restart). You can browse the DB console at
`http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:gaitdb`, user: `sa`, no
password).

**Switching to Postgres later:** install Postgres, create a `gaitdb` database, then in
`backend/src/main/resources/application.properties` comment out the H2 block and
uncomment the Postgres block, filling in your credentials.

### 2. Frontend

Requires Node 18+.

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Grant camera access when
prompted. The Vite dev server proxies `/api/*` requests to the backend automatically —
see `vite.config.js`.

### 3. Try it

1. Stand a few steps back so your whole body is in frame.
2. Click "Start walking" and walk in place (or side-to-side) for 8 seconds.
3. Click "Analyze this walk" — the backend computes your metrics and returns them.
4. Repeat a few times and watch the history table build up.

## How the gait analysis actually works

This is the part worth understanding deeply before an interview — it's the whole
point of the project.

1. **Pose extraction (frontend):** MoveNet returns 17 keypoints per frame (nose,
   shoulders, hips, knees, ankles, etc.), each with an x/y pixel position and a
   confidence score.
2. **Step detection (backend):** for each ankle, we track its vertical position over
   time and detect local peaks (heel-strike moments) using a sliding-window peak
   detector — see `detectStepIndices()` in `GaitAnalysisService`.
3. **Stride length:** horizontal distance the ankle travels between consecutive
   footstrikes on the same side.
4. **Symmetry:** ratio of the smaller average stride (left or right) to the larger,
   as a percentage — 100% is perfectly even, lower means one leg is doing something
   different from the other.
5. **Knee angle:** computed with vector geometry — the angle at the knee formed by
   the hip→knee and ankle→knee vectors, using the dot product formula.
6. **Cadence:** total steps detected divided by the session duration, in steps per
   minute.
7. **Flagging:** each metric is compared against a simplified reference range; anything
   outside it produces a human-readable flag.

None of this calls an external AI API for the analysis — MoveNet does perception
(finding the joints), and the actual "intelligence" (turning coordinates into
meaningful biomechanical insight) is deterministic math you wrote and can explain
line by line. That's a much stronger interview story than "I called GPT-4."

## Known limitations (good to mention proactively — shows maturity)

- Stride length is in **pixel units**, not real-world distance, since there's no
  camera calibration step. A v2 could add a reference object (e.g. "stand next to a
  1m mark") to convert to real units.
- Single-camera 2D pose estimation can't fully capture depth/rotation — a person
  walking toward the camera is harder to analyze than walking across it.
- Step detection is a simple peak detector; a production system would likely use a
  more robust signal-processing approach (e.g. a Savitzky-Golay filter to smooth
  noise before peak detection).
- No authentication yet — every session is anonymous and shared. Adding user accounts
  (Spring Security + JWT) is a natural next milestone.

## Suggested next steps to extend this further

- Add user accounts so history is per-person, not global.
- Add a trends chart (e.g. with Recharts) showing symmetry/cadence over time.
- Calibrate pixel measurements to real-world units.
- Deploy: frontend to Vercel/Netlify, backend to Render/Railway with a managed
  Postgres instance.
