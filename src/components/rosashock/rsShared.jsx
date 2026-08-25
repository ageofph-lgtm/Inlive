import React, { useState, useEffect, useRef } from "react";

// ── Paleta Rosa Shock ─────────────────────────────────────────────────────────
export const P = {
  pink: "#FF2D78",
  green: "#34D399",
  yellow: "#FBBF24",
  red: "#F87171",
  blue: "#7DD3FC",
  purple: "#C4B5FD",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.6)",
  faint: "rgba(255,255,255,0.35)",
};

export const pad2 = n => String(n).padStart(2, "0");

export function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const abs = Math.abs(Math.round(s));
  const sign = s < 0 ? "-" : "";
  return `${sign}${pad2(Math.floor(abs / 3600))}:${pad2(Math.floor((abs % 3600) / 60))}:${pad2(abs % 60)}`;
}

export const fmtH = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h${pad2(m)}`;
};

export const fmtDia = v => {
  if (!v) return null;
  const d = String(v).length === 10 ? new Date(v + "T12:00:00") : new Date(v);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
};

// ── Timer helpers (espelho de AoVivo.jsx) ─────────────────────────────────────
export function useLiveTimer(m) {
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
  }, [m?.timer_status, m?.timer_started_at]); // eslint-disable-line
  return e;
}

export function getModoTimer(m) {
  const est = Number(m?.tempo_estimado_segundos) || 0;
  const acc = Number(m?.timer_accumulated_seconds) || 0;
  if (est > 0) return "countdown";
  if (acc > 0) return "legacy";
  return "idle";
}

export function calcRestante(m, elapsed) {
  return (Number(m?.tempo_estimado_segundos) || 0) - elapsed;
}

export const getPausaMotivo = mx => {
  if (!mx?.timer_status?.startsWith("paused")) return null;
  return mx.timer_status.split(":")[1] || "outros";
};

export const PAUSA_COLS = [
  { key: "aguarda_pecas", label: "Aguarda Peças", color: "#FBBF24", emoji: "📦" },
  { key: "prioritaria", label: "P/ Prioritária", color: "#F87171", emoji: "🚨" },
  { key: "aguarda_decisao", label: "Aguarda Decisão", color: "#C4B5FD", emoji: "⏳" },
  { key: "outros", label: "Outros", color: "#94A3B8", emoji: "💬" },
];

export const TYPE_BADGE = {
  nova: { l: "NTS", c: "#F87171" },
  usada: { l: "RECON", c: "#C4B5FD" },
  aluguer: { l: "ACP", c: "#7DD3FC" },
  "servico-interno": { l: "SERV. INT.", c: "#94A3B8" },
};

// ── Tempo estimado RECON ──────────────────────────────────────────────────────
const RECON_TEMPOS = {
  rx_fmx: { ferro: 6 * 3600, bronze: 15 * 3600, prata: 30 * 3600, ouro: 40 * 3600 },
  opx_sf: { ferro: 4 * 3600, bronze: 12 * 3600, prata: 21 * 3600, ouro: 25 * 3600 },
};
export function getTempoRecon(m) {
  const fromDB = Number(m?.tempo_estimado_segundos) || 0;
  if (fromDB > 0) return fromDB;
  const r = m?.recondicao || {};
  const cat = r.ouro ? "ouro" : r.prata ? "prata" : r.bronze ? "bronze" : r.ferro ? "ferro" : null;
  if (!cat) return 0;
  const mo = (m?.modelo || "").toLowerCase();
  const fam = ["rx", "fmx"].some(f => mo.includes(f)) ? "rx_fmx"
    : ["opx", "exu-v", "exu", "sf"].some(f => mo.includes(f)) ? "opx_sf" : null;
  if (!fam) return 0;
  return RECON_TEMPOS[fam]?.[cat] || 0;
}
export function reconTier(m) {
  const r = m?.recondicao || {};
  return r.ouro ? "OURO" : r.prata ? "PRATA" : r.bronze ? "BRONZE" : r.ferro ? "FERRO" : null;
}

const RESERVED = new Set(["EXPRESS", "VPS", "IMPREVISTOS", "⚡ IMPREVISTOS"]);
export function splitTasks(m) {
  const all = m.tarefas || [];
  return {
    real: all.filter(t => !RESERVED.has(t.texto?.trim?.())),
    hasExpress: m.isExpress || all.some(t => t.texto?.trim?.() === "EXPRESS"),
    hasVps: m.isVps || all.some(t => t.texto?.trim?.() === "VPS"),
  };
}

// ── Primitivas UI ─────────────────────────────────────────────────────────────
export function Chip({ color, children, solid = false }) {
  return (
    <span className="rs-pill" style={{
      color: solid ? "#1a0510" : color,
      background: solid ? color : `${color}22`,
      border: `1px solid ${color}${solid ? "" : "55"}`,
    }}>{children}</span>
  );
}

export function WidgetShell({ title, count, color, children }) {
  return (
    <div className="rs-glass rs-widget">
      <div className="rs-widget-head">
        <span className="rs-widget-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="rs-widget-title">{title}</span>
        {count !== undefined && <span className="rs-widget-count" style={{ color }}>{count}</span>}
      </div>
      <div className="rs-widget-body">{children}</div>
    </div>
  );
}

// ── CSS global do tema ────────────────────────────────────────────────────────
export const CSS_RS = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap');
.rs-root{position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;
  font-family:'Inter','Chakra Petch',sans-serif;color:#fff;
  background:
    radial-gradient(1100px 700px at 88% -12%,rgba(255,45,120,.50),transparent 62%),
    radial-gradient(900px 620px at -8% 112%,rgba(196,16,90,.45),transparent 60%),
    radial-gradient(700px 500px at 55% 55%,rgba(255,45,120,.14),transparent 65%),
    linear-gradient(135deg,#33081d 0%,#5c0f36 45%,#8f1249 100%);}
.rs-root *{box-sizing:border-box}
.rs-root ::-webkit-scrollbar{width:0;height:0}
.rs-glass{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.22);
  border-radius:18px;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  box-shadow:0 8px 32px rgba(20,0,10,.30);}
@keyframes rsFade{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
@keyframes rsBlink{0%,100%{opacity:1}50%{opacity:.25}}

/* KPI strip */
.rs-kpibar{display:flex;gap:8px;padding:10px 14px 6px;flex-shrink:0;align-items:stretch}
.rs-brand{display:flex;align-items:center;gap:8px;padding:6px 14px;flex-shrink:0}
.rs-brand img{width:26px;height:26px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,45,120,.8))}
.rs-brand b{font-weight:900;letter-spacing:.14em;font-size:clamp(12px,1vw,15px)}
.rs-brand small{color:rgba(255,255,255,.55);font-weight:600;letter-spacing:.2em;font-size:clamp(8px,.65vw,10px)}
.rs-kpi{flex:1;min-width:0;padding:7px 4px;text-align:center;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.18);border-radius:14px;position:relative;overflow:hidden;transition:all .3s}
.rs-kpi.active{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.45)}
.rs-kpi b{display:block;font-size:clamp(16px,1.55vw,26px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.rs-kpi span{display:block;font-size:clamp(7px,.58vw,9px);color:rgba(255,255,255,.6);
  letter-spacing:.08em;text-transform:uppercase;margin-top:3px;font-weight:600;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-kpi i{position:absolute;top:0;left:12%;right:12%;height:2px;border-radius:2px}

/* Layout */
.rs-body{flex:1;display:flex;gap:10px;padding:6px 14px 12px;min-height:0}
.rs-left{width:clamp(150px,13.5vw,200px);display:flex;flex-direction:column;gap:10px;flex-shrink:0;min-height:0}
.rs-center{flex:1;display:flex;flex-direction:column;gap:8px;min-width:0;min-height:0}
.rs-orbit{width:clamp(215px,21vw,300px);display:flex;flex-direction:column;gap:8px;flex-shrink:0;min-height:0}

/* Painel esquerdo */
.rs-clockcard{padding:12px;text-align:center;flex-shrink:0}
.rs-clock{font-family:'Chakra Petch',sans-serif;font-size:clamp(20px,2vw,30px);font-weight:700;
  letter-spacing:.06em;font-variant-numeric:tabular-nums;line-height:1}
.rs-date{font-size:clamp(8px,.7vw,11px);color:rgba(255,255,255,.6);text-transform:uppercase;
  letter-spacing:.12em;margin-top:4px;font-weight:600}
.rs-live{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:3px 12px;
  border-radius:99px;background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.4);
  font-size:9px;font-weight:800;letter-spacing:.16em;color:#34D399}
.rs-live.paused{background:rgba(251,191,36,.15);border-color:rgba(251,191,36,.4);color:#FBBF24}
.rs-live .d{width:6px;height:6px;border-radius:50%;background:currentColor;animation:rsBlink 1.3s infinite}
.rs-viewcard{padding:12px;flex-shrink:0;display:flex;flex-direction:column;gap:8px}
.rs-viewlabel{font-size:clamp(10px,.85vw,13px);font-weight:800;letter-spacing:.04em;line-height:1.2}
.rs-viewnum{font-family:'Chakra Petch',sans-serif;font-size:9px;color:rgba(255,255,255,.5);letter-spacing:.2em}
.rs-dots{display:flex;gap:5px;align-items:center}
.rs-dots button{height:5px;border:none;border-radius:99px;cursor:pointer;padding:0;transition:all .3s;
  background:rgba(255,255,255,.25);width:10px}
.rs-dots button.on{width:26px;background:linear-gradient(90deg,#FF2D78,#C4B5FD)}
.rs-navrow{display:flex;gap:5px}
.rs-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:6px 4px;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);border-radius:10px;
  color:#fff;cursor:pointer;font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.08em}
.rs-btn:hover{background:rgba(255,255,255,.18)}
.rs-minis{padding:10px 12px;display:flex;flex-direction:column;gap:7px;flex:1;min-height:0;overflow:hidden}
.rs-mini{display:flex;align-items:baseline;justify-content:space-between;gap:6px}
.rs-mini span{font-size:clamp(7px,.62vw,9px);color:rgba(255,255,255,.55);text-transform:uppercase;
  letter-spacing:.08em;font-weight:600}
.rs-mini b{font-size:clamp(13px,1.15vw,18px);font-weight:800;font-variant-numeric:tabular-nums}

/* Quadro central */
.rs-board{flex:1;min-height:0;padding:14px 16px;display:flex;flex-direction:column;overflow:hidden;animation:rsFade .45s ease}
.rs-board-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-shrink:0}
.rs-board-title{font-size:clamp(15px,1.4vw,22px);font-weight:900;letter-spacing:.02em}
.rs-board-count{font-family:'Chakra Petch',sans-serif;font-size:clamp(13px,1.2vw,18px);font-weight:700;
  padding:2px 12px;border-radius:99px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25)}
.rs-prog{height:4px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden;flex-shrink:0}
.rs-prog>div{height:100%;background:linear-gradient(90deg,#FF2D78,#C4B5FD);border-radius:99px;transition:width .1s linear}
.rs-grid{display:grid;gap:10px;flex:1;min-height:0;overflow:hidden}
.rs-empty{flex:1;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5);
  font-size:clamp(11px,1vw,15px);font-weight:600;letter-spacing:.1em;text-transform:uppercase}

/* Cards máquinas */
.rs-card{display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:10px 12px;gap:6px;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);border-radius:16px;
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.rs-card-top{display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex-shrink:0}
.rs-pill{font-size:clamp(7px,.6vw,9px);font-weight:800;letter-spacing:.08em;padding:2px 8px;
  border-radius:99px;white-space:nowrap;text-transform:uppercase}
.rs-timer{margin-left:auto;font-family:'Chakra Petch',sans-serif;font-size:clamp(13px,1.35vw,21px);
  font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.03em;flex-shrink:0}
.rs-card-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:0;text-align:center;gap:2px}
.rs-ns{font-size:clamp(15px,1.7vw,28px);font-weight:900;letter-spacing:.04em;line-height:1.05;
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rs-model{font-size:clamp(8px,.75vw,12px);font-weight:600;color:rgba(255,255,255,.62);
  letter-spacing:.14em;text-transform:uppercase;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rs-bar{height:6px;border-radius:99px;background:rgba(0,0,0,.28);overflow:hidden;flex-shrink:0}
.rs-bar>div{height:100%;border-radius:99px;transition:width .5s}
.rs-card-foot{display:flex;align-items:center;gap:7px;flex-shrink:0;flex-wrap:wrap}
.rs-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.rs-meta{font-size:clamp(7px,.62vw,10px);color:rgba(255,255,255,.6);font-weight:600;letter-spacing:.06em}
.rs-dates{margin-left:auto;font-family:'Chakra Petch',sans-serif;font-size:clamp(8px,.7vw,11px);
  font-weight:600;color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums;white-space:nowrap}
.rs-chips{display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0;overflow:hidden;max-height:38px}
.rs-chip{font-size:clamp(7px,.62vw,9px);font-weight:600;padding:1px 7px;border-radius:99px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.85);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.rs-chip.warn{background:rgba(251,191,36,.14);border-color:rgba(251,191,36,.4);color:#FBBF24}
.rs-chip.done{text-decoration:line-through;opacity:.6}

/* Secções internas (recon) */
.rs-sec{display:flex;align-items:center;gap:8px;flex-shrink:0;padding:4px 0}
.rs-sec b{font-size:clamp(9px,.8vw,12px);font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.rs-sec i{flex:1;height:1px;background:rgba(255,255,255,.15)}
.rs-sec span{font-size:clamp(9px,.8vw,12px);font-weight:800;opacity:.7}

/* Widgets orbitantes */
.rs-widget{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:9px 11px}
.rs-widget-head{display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-shrink:0}
.rs-widget-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.rs-widget-title{font-size:clamp(8px,.72vw,11px);font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(255,255,255,.85);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-widget-count{font-family:'Chakra Petch',sans-serif;font-size:clamp(12px,1.1vw,17px);font-weight:800;line-height:1}
.rs-widget-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:4px}
.rs-row{display:flex;align-items:center;gap:7px;padding:4px 8px;background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.13);border-radius:10px;flex-shrink:0;overflow:hidden}
.rs-row .ns{font-size:clamp(9px,.8vw,12px);font-weight:800;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;letter-spacing:.03em}
.rs-row .md{font-size:clamp(7px,.6vw,9px);color:rgba(255,255,255,.5);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;font-weight:500}
.rs-row .rt{margin-left:auto;flex-shrink:0;display:flex;align-items:center;gap:4px}
.rs-more{font-size:8px;color:rgba(255,255,255,.45);text-align:center;font-weight:600;letter-spacing:.1em;flex-shrink:0}

/* Mini timeline */
.rs-tl{flex-shrink:0;padding:8px 12px;display:flex;flex-direction:column;gap:3px;overflow:hidden}
.rs-tl-days{display:flex;flex-shrink:0;margin-left:86px}
.rs-tl-days span{flex:1;text-align:center;font-family:'Chakra Petch',sans-serif;font-size:7px;
  color:rgba(255,255,255,.45);font-weight:600}
.rs-tl-days span.today{color:#FF2D78;font-weight:800}
.rs-tl-row{display:flex;align-items:center;gap:0;height:15px;flex-shrink:0}
.rs-tl-ns{width:86px;flex-shrink:0;font-size:8px;font-weight:700;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;color:rgba(255,255,255,.8);padding-right:6px}
.rs-tl-track{flex:1;position:relative;height:9px;background:rgba(0,0,0,.22);border-radius:99px;overflow:hidden}
.rs-tl-bar{position:absolute;top:0;bottom:0;border-radius:99px;min-width:4px}
.rs-tl-now{position:absolute;top:-2px;bottom:-2px;width:2px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.8);z-index:3}

/* Desempenho */
.rs-perf{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:10px;overflow:hidden}
.rs-perf-card{padding:10px 12px;display:flex;flex-direction:column;min-height:0;overflow:hidden;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:16px}
.rs-perf-title{font-size:clamp(8px,.72vw,11px);font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(255,255,255,.75);margin-bottom:6px;flex-shrink:0}
.rs-bars{flex:1;min-height:0;display:flex;align-items:flex-end;gap:3px}
.rs-bcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end}
.rs-bcol .v{font-family:'Chakra Petch',sans-serif;font-size:8px;font-weight:700;color:rgba(255,255,255,.85)}
.rs-bcol .b{width:100%;border-radius:5px 5px 2px 2px;min-height:2px}
.rs-bcol .l{font-size:6.5px;color:rgba(255,255,255,.45);font-weight:600;white-space:nowrap}
.rs-donutwrap{flex:1;display:flex;align-items:center;gap:12px;min-height:0}
.rs-donutlegend{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
.rs-donutlegend div{display:flex;align-items:center;gap:6px;font-size:clamp(8px,.72vw,11px);font-weight:600}
.rs-donutlegend b{margin-left:auto;font-family:'Chakra Petch',sans-serif;font-weight:800}
.rs-stats{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;min-height:0}
.rs-stat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:12px;overflow:hidden}
.rs-stat b{font-family:'Chakra Petch',sans-serif;font-size:clamp(16px,1.6vw,26px);font-weight:800;line-height:1}
.rs-stat span{font-size:clamp(6.5px,.58vw,9px);color:rgba(255,255,255,.55);font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;text-align:center;padding:0 4px}
`;