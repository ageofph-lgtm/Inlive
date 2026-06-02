import { useState, useEffect } from "react";

const JORDAN_URL = "https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png";

function AlmocoClock() {
  const [t, sT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => sT(new Date()), 1000); return () => clearInterval(id); }, []);
  const h = String(t.getHours()).padStart(2, "0");
  const m = String(t.getMinutes()).padStart(2, "0");
  const s = String(t.getSeconds()).padStart(2, "0");
  return (
    <div style={{
      fontFamily: "'Orbitron',monospace",
      fontSize: "clamp(36px,6vw,72px)", fontWeight: 900,
      color: "#FF2D78",
      letterSpacing: "0.12em",
      textShadow: "0 0 20px #FF2D78, 0 0 40px #FF2D78, 0 0 80px rgba(255,45,120,0.7), 0 0 120px rgba(255,45,120,0.4)",
      fontVariantNumeric: "tabular-nums",
      animation: "almocoGlow 2s ease-in-out infinite",
    }}>{h}:{m}:{s}</div>
  );
}

export default function AlmocoScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg,#0a0005 0%,#110010 50%,#0a0005 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Orbitron',monospace", gap: 20, overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&display=swap');
        @keyframes almocoGlow {
          0%, 100% { text-shadow: 0 0 20px #FF2D78, 0 0 40px #FF2D78, 0 0 80px rgba(255,45,120,0.7); }
          50% { text-shadow: 0 0 30px #FF2D78, 0 0 60px #FF2D78, 0 0 120px rgba(255,45,120,0.9), 0 0 160px rgba(255,45,120,0.5); }
        }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.2} }
      `}</style>

      {/* scanlines rosa */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,45,120,0.018) 2px,rgba(255,45,120,0.018) 4px)",
        zIndex: 0
      }} />

      {/* glow radial de fundo */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(255,45,120,0.08) 0%, transparent 65%)",
        zIndex: 0,
      }} />

      {/* marca d'água Jordan */}
      <img src={JORDAN_URL} alt="" style={{
        position: "absolute", bottom: 24, right: 24,
        width: "clamp(60px,6vw,90px)", opacity: 0.1, pointerEvents: "none", zIndex: 0
      }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          fontSize: "clamp(64px,9vw,100px)", lineHeight: 1,
          filter: "drop-shadow(0 0 28px rgba(255,45,120,0.7)) drop-shadow(0 0 60px rgba(255,45,120,0.4))",
        }}>
          🍽️
        </div>

        <div style={{
          fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 900, letterSpacing: "0.15em",
          color: "#FF2D78",
          textShadow: "0 0 20px #FF2D78, 0 0 40px #FF2D78, 0 0 80px rgba(255,45,120,0.8), 0 0 120px rgba(255,45,120,0.5)",
          textTransform: "uppercase",
          animation: "almocoGlow 2s ease-in-out infinite",
        }}>Horário de Almoço</div>

        <div style={{
          fontSize: "clamp(14px,2vw,24px)", fontWeight: 700, letterSpacing: "0.25em",
          color: "#FF2D78",
          textShadow: "0 0 12px #FF2D78, 0 0 28px rgba(255,45,120,0.7)",
          opacity: 0.8,
        }}>12:30 — 13:30</div>

        <AlmocoClock />

        <div style={{
          marginTop: 8, padding: "10px 32px",
          border: "1px solid rgba(255,45,120,0.25)", borderRadius: 8,
          fontSize: "clamp(9px,1vw,12px)", fontWeight: 600, letterSpacing: "0.1em",
          color: "rgba(255,45,120,0.5)", textAlign: "center", lineHeight: 1.8,
          boxShadow: "0 0 20px rgba(255,45,120,0.08), inset 0 0 20px rgba(255,45,120,0.04)",
        }}>
          Todos os timers foram pausados automaticamente<br />
          <span style={{ color: "rgba(255,45,120,0.3)" }}>
            Os técnicos retomam manualmente às 13:30
          </span>
        </div>
      </div>
    </div>
  );
}