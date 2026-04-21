import { useState, useRef } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post("http://127.0.0.1:8000/predict", form);
      setResult(data);
    } catch (e) {
      setError("❌ Could not connect to backend. Make sure it's running.");
    } finally {
      setLoading(false);
    }
  };

  const isFake = result?.label === "FAKE";

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>AI FORENSICS</div>
          <h1 style={styles.title}>
            DEEP<span style={styles.titleAccent}>FAKE</span>
            <br />DETECTOR
          </h1>
          <p style={styles.subtitle}>
            Upload a video — our ResNet50 model analyzes faces frame by frame
          </p>
        </div>

        {/* Upload Zone */}
        <div
          style={{
            ...styles.dropzone,
            borderColor: drag ? "#00ff88" : file ? "#00ff88" : "#333",
            background: drag ? "rgba(0,255,136,0.05)" : "rgba(255,255,255,0.02)",
          }}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {!file ? (
            <div style={styles.dropContent}>
              <div style={styles.uploadIcon}>⬆</div>
              <p style={styles.dropText}>Drop video here or click to upload</p>
              <p style={styles.dropSub}>MP4, AVI, MOV supported</p>
            </div>
          ) : (
            <div style={styles.dropContent}>
              <video
                src={preview}
                style={styles.videoPreview}
                controls
                onClick={(e) => e.stopPropagation()}
              />
              <p style={styles.fileName}>📁 {file.name}</p>
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <button
          style={{
            ...styles.btn,
            opacity: !file || loading ? 0.5 : 1,
            cursor: !file || loading ? "not-allowed" : "pointer",
          }}
          onClick={analyze}
          disabled={!file || loading}
        >
          {loading ? (
            <span style={styles.btnContent}>
              <span style={styles.spinner} /> ANALYZING...
            </span>
          ) : (
            "🔍 ANALYZE VIDEO"
          )}
        </button>

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Result Card */}
        {result && (
          <div style={{
            ...styles.resultCard,
            borderColor: isFake ? "#ff4444" : "#00ff88",
            boxShadow: isFake
              ? "0 0 40px rgba(255,68,68,0.2)"
              : "0 0 40px rgba(0,255,136,0.2)",
          }}>
            <div style={styles.resultIcon}>{isFake ? "⚠️" : "✅"}</div>
            <div style={{
              ...styles.resultLabel,
              color: isFake ? "#ff4444" : "#00ff88",
            }}>
              {result.label}
            </div>
            <div style={styles.resultSub}>
              {(isFake ? result.fake_pct : result.real_pct).toFixed(1)}% confidence
              · {result.frames_analyzed} frames analyzed
            </div>

            {/* Bars */}
            <div style={styles.bars}>
              <div style={styles.barRow}>
                <span style={styles.barLabel}>🔴 Fake</span>
                <span style={styles.barPct}>{result.fake_pct}%</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: `${result.fake_pct}%`,
                  background: "#ff4444",
                }} />
              </div>

              <div style={{ ...styles.barRow, marginTop: 16 }}>
                <span style={styles.barLabel}>🟢 Real</span>
                <span style={styles.barPct}>{result.real_pct}%</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: `${result.real_pct}%`,
                  background: "#00ff88",
                }} />
              </div>
            </div>

            <button
              style={styles.resetBtn}
              onClick={() => { setFile(null); setPreview(null); setResult(null); }}
            >
              ↩ Analyze Another Video
            </button>
          </div>
        )}

        <p style={styles.footer}>
          Trained on FaceForensics++ · ResNet50 · 96.22% accuracy
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#fff",
    fontFamily: "'Courier New', monospace",
    position: "relative",
    overflowX: "hidden",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  container: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "60px 24px 40px",
    position: "relative",
    zIndex: 1,
  },
  header: { textAlign: "center", marginBottom: 40 },
  badge: {
    display: "inline-block",
    border: "1px solid #00ff88",
    color: "#00ff88",
    fontSize: 11,
    letterSpacing: 4,
    padding: "4px 12px",
    marginBottom: 20,
  },
  title: {
    fontSize: "clamp(42px, 10vw, 72px)",
    fontWeight: 900,
    letterSpacing: -2,
    lineHeight: 1,
    margin: "0 0 16px",
  },
  titleAccent: { color: "#00ff88" },
  subtitle: { color: "#666", fontSize: 14, letterSpacing: 1 },
  dropzone: {
    border: "1px dashed",
    borderRadius: 8,
    padding: 32,
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: 16,
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropContent: { textAlign: "center", width: "100%" },
  uploadIcon: { fontSize: 48, marginBottom: 12, color: "#333" },
  dropText: { fontSize: 16, color: "#aaa", margin: "0 0 8px" },
  dropSub: { fontSize: 12, color: "#444" },
  videoPreview: {
    width: "100%",
    maxHeight: 240,
    borderRadius: 6,
    marginBottom: 12,
  },
  fileName: { fontSize: 12, color: "#666", margin: 0 },
  btn: {
    width: "100%",
    padding: "16px",
    background: "#00ff88",
    color: "#000",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 3,
    fontFamily: "'Courier New', monospace",
    marginBottom: 16,
    transition: "opacity 0.2s",
  },
  btnContent: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid #000",
    borderTopColor: "transparent",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  error: {
    background: "rgba(255,68,68,0.1)",
    border: "1px solid #ff4444",
    borderRadius: 6,
    padding: 16,
    color: "#ff4444",
    fontSize: 13,
    marginBottom: 16,
  },
  resultCard: {
    border: "1px solid",
    borderRadius: 8,
    padding: 32,
    textAlign: "center",
    marginBottom: 24,
    transition: "all 0.3s",
  },
  resultIcon: { fontSize: 48, marginBottom: 8 },
  resultLabel: {
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: 8,
    marginBottom: 8,
  },
  resultSub: { color: "#666", fontSize: 13, marginBottom: 24 },
  bars: { textAlign: "left", marginBottom: 24 },
  barRow: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  barLabel: { fontSize: 13, color: "#aaa" },
  barPct: { fontSize: 13, color: "#aaa" },
  barTrack: { background: "#1a1a1a", borderRadius: 4, height: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.8s ease" },
  resetBtn: {
    background: "transparent",
    border: "1px solid #333",
    color: "#666",
    padding: "10px 20px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Courier New', monospace",
    letterSpacing: 1,
  },
  footer: { textAlign: "center", color: "#333", fontSize: 11, letterSpacing: 2 },
};
