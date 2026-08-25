import React from "react";
import { useLiveTimer, fmtHMS, fmtH, fmtDia, getModoTimer, calcRestante, splitTasks, Chip, TYPE_BADGE, P } from "./rsShared";

const TCLR = { raphael: "#FFD166", nuno: "#B68BFF", rogerio: "#FF8C69", yano: "#5CFFFF", patrick: "#90EE90" };

export default function RsMachineCard({ m, showTimer = true }) {
  const elapsed = useLiveTimer(m);
  const run = m.timer_status === "running";
  const pausedM = m.timer_status?.startsWith("paused");
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const isCD = getModoTimer(m) === "countdown";
  const rest = isCD ? calcRestante(m, elapsed) : null;
  const late = isCD && rest !== null && rest < 0;
  const risk = isCD && !late && rest !== null && meta > 0 && rest / meta < 0.2;
  const st = late ? P.red : risk ? P.yellow : run ? P.green : pausedM ? P.yellow : P.muted;
  const pct = meta > 0 ? Math.min((elapsed / meta) * 100, 100) : 0;
  const tid = (() => { const x = (m.estado || "").match(/(?:em-preparacao|concluida)-(.+)/); return x ? x[1] : (m.tecnico || null); })();
  const tc = TCLR[tid] || "rgba(255,255,255,.4)";
  const { real, hasExpress, hasVps } = splitTasks(m);
  const openTasks = real.filter(t => !t.concluida);
  const tb = TYPE_BADGE[m.tipo] || null;
  const imp = Array.isArray(m.imprevistos) ? m.imprevistos : [];
  const pausaLbl = pausedM ? (m.timer_status.split(":")[1] || "").replace(/_/g, " ") : null;

  return (
    <div className="rs-card" style={{ borderColor: `${st}66` }}>
      <div className="rs-card-top">
        <Chip color={st} solid={run}>{late ? "Atraso" : risk ? "Risco" : run ? "Run" : pausedM ? "Pausa" : "Idle"}</Chip>
        {pausaLbl && pausaLbl.length > 2 && <Chip color={P.yellow}>{pausaLbl}</Chip>}
        {tb && <Chip color={tb.c}>{tb.l}</Chip>}
        {m.prioridade && <Chip color={P.yellow}>⚡ Prio</Chip>}
        {hasExpress && <Chip color={P.yellow}>Express</Chip>}
        {hasVps && <Chip color={P.blue}>VPS</Chip>}
        {showTimer && (
          <span className="rs-timer" style={{ color: st }}>
            {fmtHMS(isCD && rest !== null ? rest : elapsed)}
          </span>
        )}
      </div>

      <div className="rs-card-mid">
        <div className="rs-ns">{m.serie || "—"}</div>
        <div className="rs-model">{m.modelo || "—"}</div>
      </div>

      {meta > 0 && (
        <div className="rs-bar">
          <div style={{ width: `${pct}%`, background: late ? P.red : `linear-gradient(90deg,${P.pink},${P.purple})` }} />
        </div>
      )}

      <div className="rs-card-foot">
        <span className="rs-dot" style={{ background: tc, boxShadow: `0 0 6px ${tc}` }} />
        {meta > 0 && <span className="rs-meta">meta {fmtH(meta)}</span>}
        {(m.previsao_inicio || m.previsao_fim) && (
          <span className="rs-dates">{fmtDia(m.previsao_inicio) || "—"} → {fmtDia(m.previsao_fim) || "—"}</span>
        )}
      </div>

      {(openTasks.length > 0 || imp.length > 0) && (
        <div className="rs-chips">
          {openTasks.slice(0, 4).map((t, i) => <span key={i} className="rs-chip">{t.texto}</span>)}
          {openTasks.length > 4 && <span className="rs-chip">+{openTasks.length - 4}</span>}
          {imp.slice(0, 2).map((iv, i) => <span key={"i" + i} className="rs-chip warn">⚡ {iv.descricao}</span>)}
          {imp.length > 2 && <span className="rs-chip warn">+{imp.length - 2}</span>}
        </div>
      )}
    </div>
  );
}