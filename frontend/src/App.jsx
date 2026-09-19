import { useEffect, useState } from "react";
import GaitCapture from "./components/GaitCapture.jsx";

export default function App() {
  const [latestMetrics, setLatestMetrics] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/gait-sessions");
      if (res.ok) setHistory(await res.json());
    } catch (err) {
      console.error("Could not load history:", err);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function handleSessionComplete(metrics) {
    setLatestMetrics(metrics);
    loadHistory();
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>AI Gait & Posture Analysis</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Stand a few steps back from your camera, walk in place or across the frame, and get
        instant feedback on your stride symmetry, cadence, and knee alignment.
      </p>

      <GaitCapture onSessionComplete={handleSessionComplete} recordSeconds={8} />

      {latestMetrics && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Latest Result</h2>
          <MetricsGrid metrics={latestMetrics} />
          {latestMetrics.flags?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Flags:</strong>
              <ul>
                {latestMetrics.flags.map((f, i) => (
                  <li key={i} style={{ color: "#b45309" }}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Session History</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th style={{ padding: 6 }}>Date</th>
                <th style={{ padding: 6 }}>Cadence</th>
                <th style={{ padding: 6 }}>Symmetry</th>
                <th style={{ padding: 6 }}>Steps</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 6 }}>{new Date(s.recordedAt).toLocaleString()}</td>
                  <td style={{ padding: 6 }}>{s.cadenceStepsPerMinute} steps/min</td>
                  <td style={{ padding: 6 }}>{s.strideSymmetryPercent}%</td>
                  <td style={{ padding: 6 }}>{s.stepsDetected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricsGrid({ metrics }) {
  const items = [
    ["Cadence", `${metrics.cadenceStepsPerMinute} steps/min`],
    ["Stride symmetry", `${metrics.strideSymmetryPercent}%`],
    ["Left knee angle", `${metrics.avgLeftKneeAngleDeg}°`],
    ["Right knee angle", `${metrics.avgRightKneeAngleDeg}°`],
    ["Avg stride length", `${metrics.avgStrideLengthPx} px`],
    ["Steps detected", metrics.stepsDetected],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
