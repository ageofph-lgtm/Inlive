// ReconCell — card do slide de Recondicionamento (extraído do AoVivo para
// manter o ficheiro da página gerível). Helpers locais auto-contidos.
import React, { useState, useEffect, useRef } from "react";

const pad2 = (n) => String(n).padStart(2, "0");
function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const abs = Math.abs(Math.round(s)), sign = s < 0 ? "-" : "";
  return `${sign}${pad2(Math.floor(abs / 3600))}:${pad2(Math.floor((abs % 3600) / 60))}:${pad2(abs % 60)}`;
}
function useLiveTimer(m) {
  const ref = useRef(m);
  useEffect(() => { ref.current = m; });
  function calcNow(mm) {
    const acc = Number(mm?.timer_accumulated_seconds) || 0;
    const at = mm?.timer_started_at ? new Date(mm.timer_started_at).getTime() : null;
    if (mm?.timer_status === "running" && at) return acc + Math.floor((Date.now() - at) / 1000);
    return acc;
  }
  const [e, sE] = useState(() => calcNow(m));
  useEffect(() => {
    sE(calcNow(ref.current));
    if (m?.timer_status !== "running" || !m?.timer_started_at) return;
    const id = setInterval(() => sE(calcNow(ref.current)), 1000);
    return () => clearInterval(id);
  }, [m?.timer_status, m?.timer_started_at]);
  return e;
}
function getModoTimer(m) {
  const est = Number(m?.tempo_estimado_segundos) || 0;
  const acc = Number(m?.timer_accumulated_seconds) || 0;
  if (est > 0) return "countdown";
  if (acc > 0) return "legacy";
  return "idle";
}
function calcRestante(m, elapsed) { return (Number(m?.tempo_estimado_segundos) || 0) - elapsed; }
function getEstadoCD(m, elapsed) {
  const est = Number(m?.tempo_estimado_segundos) || 0;
  if (est === 0) return null;
  const r = calcRestante(m, elapsed);
  if (r < 0) return "atraso";
  if (r / est < 0.20) return "aviso";
  return "ok";
}
const RECON_TEMPOS = {
  rx_fmx: { ferro: 6 * 3600, bronze: 15 * 3600, prata: 30 * 3600, ouro: 40 * 3600 },
  opx_sf: { ferro: 4 * 3600, bronze: 12 * 3600, prata: 21 * 3600, ouro: 25 * 3600 },
};
function getReconFamilia(modelo = "") {
  const m = modelo.toLowerCase();
  if (["rx", "fmx"].some((f) => m.includes(f))) return "rx_fmx";
  if (["opx", "exu-v", "exu", "sf"].some((f) => m.includes(f))) return "opx_sf";
  return null;
}
function getTempoRecon(m) {
  const fromDB = Number(m?.tempo_estimado_segundos) || 0;
  if (fromDB > 0) return fromDB;
  const recon = m?.recondicao || {};
  const cat = recon.ouro ? "ouro" : recon.prata ? "prata" : recon.bronze ? "bronze" : recon.ferro ? "ferro" : null;
  if (!cat) return 0;
  const familia = getReconFamilia(m?.modelo || "");
  if (!familia) return 0;
  return RECON_TEMPOS[familia]?.[cat] || 0;
}

export default function ReconCell({ m, D, scale = 1 }) {
  const dark = D.dark;
  const run = m.timer_status === "running";
  const paused = m.timer_status?.startsWith("paused");
  const idle = !run && !paused;
  const elapsed = useLiveTimer(m);

  if (!idle) {
    const recon = m.recondicao || {};
    const rLabel = recon.prata ? "PRATA" : recon.bronze ? "BRONZE" : null;
    const isRCD = getModoTimer(m) === "countdown";
    const restRCD = isRCD ? calcRestante(m, elapsed) : null;
    const estadoRCD = isRCD ? getEstadoCD(m, elapsed) : null;
    const displayRCD = isRCD && restRCD !== null ? restRCD : elapsed;
    const timerCol = isRCD
      ? (estadoRCD === "atraso" ? "#EF4444" : estadoRCD === "aviso" ? "#F59E0B" : "#22C55E")
      : run ? "#22C55E" : "#F59E0B";
    const accent = "#a78bfa", rgb = "167,139,250";
    const topBorder = run ? "#22C55E" : "#F59E0B";
    const borderCol = run ? "rgba(34,197,94,0.5)" : "rgba(245,158,11,0.5)";
    return (
      <div style={{
        position: "relative", display: "flex", flexDirection: "column", padding: "8px 10px",
        background: dark ? (run ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.05)") : "#FFFFFF",
        border: dark ? `1px solid ${borderCol}` : "1px solid rgba(13,13,15,0.07)",
        borderTop: `3px solid ${topBorder}`,
        overflow: "hidden", height: "100%", boxSizing: "border-box",
        clipPath: dark ? "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" : "none",
        borderRadius: dark ? 0 : "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, zIndex: 1, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: timerCol,
              boxShadow: `0 0 6px ${timerCol}`, animation: run ? "blink 1.2s ease-in-out infinite" : "none",
            }} />
            <span style={{
              fontFamily: "'Chakra Petch',sans-serif", fontSize: "7px", fontWeight: 800, letterSpacing: "0.1em",
              padding: "1px 5px", color: run ? "#22C55E" : "#F59E0B",
              background: run ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
              border: `1px solid ${run ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
              borderRadius: dark ? 0 : "999px",
            }}>{run ? "RUN" : "PAUSED"}</span>
            <span style={{
              fontFamily: "'Chakra Petch',sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
              padding: "1px 5px", color: accent, background: `rgba(${rgb},0.12)`,
              border: `1px solid rgba(${rgb},0.4)`, borderRadius: dark ? 0 : "999px",
            }}>RECON</span>
            {rLabel && <span style={{
              fontFamily: "'Chakra Petch',sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.08em",
              padding: "1px 5px", color: "#9b5cf6", background: "rgba(155,92,246,0.15)",
              border: "1px solid rgba(155,92,246,0.4)", borderRadius: dark ? 0 : "999px",
            }}>{rLabel}</span>}
          </div>
          <span style={{
            fontFamily: "'DSDigital','DSEG7','Chakra Petch','Share Tech Mono',monospace",
            fontSize: `clamp(9px,${1.1 * scale}vw,${Math.round(16 * scale)}px)`,
            fontWeight: 400, color: timerCol, letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums", flexShrink: 0,
            textShadow: dark ? `0 0 10px ${timerCol}88` : "none",
          }}>
            {fmtHMS(displayRCD)}
            {isRCD && estadoRCD === "atraso" && <span style={{ marginLeft: 4, fontSize: "0.75em" }}>⚠</span>}
          </span>
        </div>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 1, gap: 2, padding: "4px 0", textAlign: "center", minHeight: 0,
        }}>
          <div style={{
            fontFamily: "'Chakra Petch',sans-serif",
            fontSize: `clamp(${Math.round(11 * scale)}px,${1.9 * scale}vw,${Math.round(26 * scale)}px)`,
            fontWeight: 900, color: dark ? "#f0f0f0" : "#0D0D0F", letterSpacing: "0.06em", lineHeight: 1.1,
            wordBreak: "break-all", maxWidth: "100%",
          }}>{m.serie || "—"}</div>
          <div style={{
            fontFamily: "'Chakra Petch',sans-serif",
            fontSize: `clamp(${Math.round(10 * scale)}px,${1.2 * scale}vw,${Math.round(17 * scale)}px)`,
            fontWeight: 700, color: dark ? "rgba(200,200,200,0.80)" : "#555",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
          }}>{m.modelo || "—"}</div>
        </div>
      </div>
    );
  }

  // IDLE — card minimalista
  const recon = m.recondicao || {};
  const rLabel = recon.prata ? "PRATA" : recon.bronze ? "BRONZE" : recon.ouro ? "OURO" : recon.ferro ? "FERRO" : null;
  const accent = "#9b5cf6", rgb = "155,92,246";
  const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }) : null;
  const tempoEst = getTempoRecon(m);
  const tempoEstLbl = tempoEst > 0 ? (() => {
    const h = Math.floor(tempoEst / 3600), mn = Math.floor((tempoEst % 3600) / 60);
    return mn === 0 ? `${h}h` : `${h}h ${mn}m`;
  })() : null;

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column", padding: "8px 10px",
      background: dark ? "rgba(155,92,246,0.06)" : "#FFFFFF",
      border: `1px solid rgba(${rgb},0.25)`, borderTop: `2px solid rgba(${rgb},0.5)`,
      overflow: "hidden", height: "100%", boxSizing: "border-box",
      clipPath: dark ? "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" : "none",
      borderRadius: dark ? 0 : "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3, zIndex: 1, flexShrink: 0, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Chakra Petch',sans-serif", fontSize: "7px", fontWeight: 800, letterSpacing: "0.12em",
          padding: "2px 7px", color: accent, background: `rgba(${rgb},0.12)`,
          border: `1px solid rgba(${rgb},0.35)`, borderRadius: dark ? 0 : "999px",
        }}>RECON</span>
        {rLabel && <span style={{
          fontFamily: "'Chakra Petch',sans-serif", fontSize: "7px", fontWeight: 800, letterSpacing: "0.1em",
          padding: "2px 6px", color: "#9b5cf6", background: "rgba(155,92,246,0.15)",
          border: "1px solid rgba(155,92,246,0.4)", borderRadius: dark ? 0 : "999px",
        }}>{rLabel}</span>}
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 1, gap: 2, textAlign: "center", minHeight: 0,
      }}>
        <div style={{
          fontFamily: "'Chakra Petch',sans-serif",
          fontSize: `clamp(${Math.round(11 * scale)}px,${2.0 * scale}vw,${Math.round(28 * scale)}px)`,
          fontWeight: 900, color: dark ? "rgba(220,200,255,0.95)" : "#2D1B5E",
          letterSpacing: "0.05em", lineHeight: 1.1, wordBreak: "break-all", maxWidth: "100%",
        }}>{m.serie || "—"}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, maxWidth: "100%", overflow: "hidden" }}>
          <div style={{
            fontFamily: "'Chakra Petch',sans-serif",
            fontSize: `clamp(${Math.round(9 * scale)}px,${1.1 * scale}vw,${Math.round(16 * scale)}px)`,
            fontWeight: 700, color: dark ? "rgba(200,180,240,0.75)" : "#5B4A8A", letterSpacing: "0.03em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
          }}>{m.modelo || "—"}</div>
          {tempoEstLbl && <span style={{
            fontFamily: "'Chakra Petch',sans-serif", fontSize: `clamp(8px,${0.9 * scale}vw,11px)`,
            fontWeight: 900, color: "#F59E0B", background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.4)", padding: "1px 5px", borderRadius: "3px",
            flexShrink: 0, whiteSpace: "nowrap", letterSpacing: "0.04em",
          }}>⏱{tempoEstLbl}</span>}
        </div>
      </div>

      {(m.previsao_inicio || m.previsao_fim) && (
        <div style={{
          zIndex: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, paddingTop: 5, borderTop: `1px solid rgba(${rgb},0.12)`,
        }}>
          {m.previsao_inicio && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: "8px", color: "#4D9FFF", opacity: 0.7, fontWeight: 700 }}>▶</span>
              <span style={{
                fontFamily: "'Chakra Petch',sans-serif",
                fontSize: `clamp(${Math.round(8 * scale)}px,${0.9 * scale}vw,${Math.round(13 * scale)}px)`,
                fontWeight: 800, color: "#4D9FFF", letterSpacing: "0.05em", fontVariantNumeric: "tabular-nums",
              }}>{fmtDate(m.previsao_inicio)}</span>
            </div>
          )}
          {m.previsao_inicio && m.previsao_fim && (
            <span style={{ color: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", fontSize: "12px" }}>·</span>
          )}
          {m.previsao_fim && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: "8px", color: "#22C55E", opacity: 0.7, fontWeight: 700 }}>✓</span>
              <span style={{
                fontFamily: "'Chakra Petch',sans-serif",
                fontSize: `clamp(${Math.round(8 * scale)}px,${0.9 * scale}vw,${Math.round(13 * scale)}px)`,
                fontWeight: 800, color: "#22C55E", letterSpacing: "0.05em", fontVariantNumeric: "tabular-nums",
              }}>{fmtDate(m.previsao_fim)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}