// Card de máquina do tema Tidal Light — usado no hero, prioritárias, standby e NTS.
import React from "react";
import {
  fmtHMS, fmtH, fmtDateShort, machineType, tierRecon, useLiveTimer, timerState,
  realTasks, hasExpress, hasVps, techOf,
} from "./tidalUtils";

function Ring({ pct, color, size = 34 }) {
  const r = (size - 5) / 2, C = 2 * Math.PI * r;
  return (
    <div className="td-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeDasharray={`${(C * Math.min(pct, 100)) / 100} ${C}`} />
      </svg>
      <b style={{ color }}>{Math.round(pct)}</b>
    </div>
  );
}

export default function MachineCard({ m, hero = false, showBar = true, showChips = true, ring = false }) {
  const elapsed = useLiveTimer(m);
  const t = timerState(m, elapsed);
  const type = machineType(m);
  const tier = tierRecon(m);
  const tech = techOf(m);
  const tasks = realTasks(m);
  const imp = Array.isArray(m.imprevistos) ? m.imprevistos : [];
  const ini = fmtDateShort(m.previsao_inicio || m.dataEntrada);
  const fim = fmtDateShort(m.previsao_fim);

  return (
    <div className={`td-mc${hero ? " hero" : ""}${t.over ? " alert" : ""}`} style={{ "--st": t.color }}>
      <div className="td-mc-top">
        <span className="td-tech" style={{ background: tech.color }} />
        <span className="td-badge" style={{ "--bc": type.color }}>{type.label}</span>
        {t.run && <span className="td-badge run">RUN</span>}
        {t.paused && !t.run && <span className="td-badge pause">PAUSED</span>}
        {m.prioridade && <span className="td-badge prio">⚡ PRIO</span>}
        {hasExpress(m) && <span className="td-badge exp">EXPRESS</span>}
        {hasVps(m) && <span className="td-badge vps">VPS</span>}
        {tier && <span className="td-badge tier">{tier}</span>}
        {(ini || fim) && (
          <span className="td-dates">{ini ? `▶ ${ini}` : ""}{ini && fim ? " · " : ""}{fim ? `✓ ${fim}` : ""}</span>
        )}
      </div>

      <div className="td-mc-mid">
        <div className="td-ns">
          <b>{m.serie || "—"}</b>
          <span>{m.modelo || "—"}</span>
        </div>
        {ring && t.meta > 0 && <Ring pct={t.pct} color={t.color} size={hero ? 40 : 34} />}
        <div className="td-lcd" style={{ "--st": t.color }}>
          <b>{t.restante !== null ? (t.over ? "+" : "") + fmtHMS(t.restante) : fmtHMS(elapsed)}</b>
          <span>{t.restante === null ? "decorrido" : t.over ? "atraso" : "restam"}</span>
        </div>
      </div>

      {showBar && (
        <div className="td-bar">
          <span className="tr"><i style={{ width: t.pct + "%", background: t.color }} /></span>
          <b style={{ color: t.color }}>{t.meta > 0 ? Math.round(t.pct) + "%" : "—"}</b>
          {t.meta > 0 && <em>meta {fmtH(t.meta)}</em>}
        </div>
      )}

      {showChips && (tasks.length > 0 || imp.length > 0) && (
        <div className="td-chips">
          {tasks.slice(0, hero ? 4 : 3).map((x, i) => <span key={i} className="td-chip">{x.texto}</span>)}
          {tasks.length > (hero ? 4 : 3) && (
            <span className="td-chip dim">+{tasks.length - (hero ? 4 : 3)}</span>
          )}
          {imp.slice(0, 2).map((x, i) => <span key={"i" + i} className="td-chip imp">⚡ {x.descricao}</span>)}
        </div>
      )}
    </div>
  );
}