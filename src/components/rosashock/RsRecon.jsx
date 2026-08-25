import React from "react";
import { useLiveTimer, fmtHMS, fmtH, fmtDia, getModoTimer, calcRestante, getTempoRecon, reconTier, Chip, P } from "./rsShared";

function RsReconCard({ m, done = false }) {
  const elapsed = useLiveTimer(m);
  const run = m.timer_status === "running";
  const pausedM = m.timer_status?.startsWith("paused");
  const active = run || pausedM;
  const isCD = getModoTimer(m) === "countdown";
  const rest = isCD ? calcRestante(m, elapsed) : null;
  const late = isCD && rest !== null && rest < 0;
  const tier = reconTier(m);
  const tempoEst = getTempoRecon(m);
  const st = done ? P.green : late ? P.red : run ? P.green : pausedM ? P.yellow : P.purple;

  return (
    <div className="rs-card" style={{ borderColor: `${st}55`, padding: "8px 10px", gap: 4 }}>
      <div className="rs-card-top">
        <Chip color={st} solid={run}>{done ? "✓" : run ? "Run" : pausedM ? "Pausa" : "Fila"}</Chip>
        {tier && <Chip color={P.purple}>{tier}</Chip>}
        {active && !done && (
          <span className="rs-timer" style={{ color: st, fontSize: "clamp(11px,1vw,16px)" }}>
            {fmtHMS(isCD && rest !== null ? rest : elapsed)}
          </span>
        )}
        {!active && !done && tempoEst > 0 && (
          <span className="rs-timer" style={{ color: P.yellow, fontSize: "clamp(9px,.85vw,13px)" }}>⏱ {fmtH(tempoEst)}</span>
        )}
      </div>
      <div className="rs-card-mid">
        <div className="rs-ns" style={{ fontSize: "clamp(12px,1.25vw,20px)" }}>{m.serie || "—"}</div>
        <div className="rs-model">{m.modelo || "—"}</div>
      </div>
      {!done && (m.previsao_inicio || m.previsao_fim) && (
        <div className="rs-card-foot" style={{ justifyContent: "center" }}>
          <span className="rs-dates" style={{ margin: 0 }}>
            {fmtDia(m.previsao_inicio) || "—"} → {fmtDia(m.previsao_fim) || "—"}
          </span>
        </div>
      )}
      {done && m.dataConclusao && (
        <div className="rs-card-foot" style={{ justifyContent: "center" }}>
          <span className="rs-dates" style={{ margin: 0, color: P.green }}>✓ {fmtDia(m.dataConclusao)}</span>
        </div>
      )}
    </div>
  );
}

function Sec({ label, count, color }) {
  return (
    <div className="rs-sec">
      <b style={{ color }}>{label}</b>
      <span style={{ color }}>· {count}</span>
      <i />
    </div>
  );
}

export default function RsRecon({ reconAnd, reconAF, reconCon }) {
  const isActive = m => m.timer_status === "running" || m.timer_status?.startsWith("paused");
  const active = reconAnd.filter(isActive);
  const waiting = [...reconAnd.filter(m => !isActive(m)), ...reconAF];
  const total = active.length + waiting.length + reconCon.length;
  if (total === 0) return <div className="rs-empty">Sem máquinas em recondicionamento</div>;

  const gcols = n => n <= 3 ? Math.max(n, 1) : n <= 8 ? 4 : n <= 12 ? 5 : 6;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
      {active.length > 0 && (
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: "32%" }}>
          <Sec label="Em andamento" count={active.length} color={P.green} />
          <div className="rs-grid" style={{ gridTemplateColumns: `repeat(${gcols(active.length)},1fr)`, flex: 1 }}>
            {active.map(m => <RsReconCard key={m.id} m={m} />)}
          </div>
        </div>
      )}
      {waiting.length > 0 && (
        <div style={{ flex: 2, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Sec label="Próximas" count={waiting.length} color={P.purple} />
          <div className="rs-grid" style={{
            gridTemplateColumns: `repeat(${gcols(waiting.length)},1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(waiting.length / gcols(waiting.length))},1fr)`,
            flex: 1,
          }}>
            {waiting.map(m => <RsReconCard key={m.id} m={m} />)}
          </div>
        </div>
      )}
      {reconCon.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Sec label="Concluídas · 30 dias" count={reconCon.length} color={P.green} />
          <div className="rs-grid" style={{
            gridTemplateColumns: `repeat(${gcols(reconCon.length)},1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(reconCon.length / gcols(reconCon.length))},1fr)`,
            flex: 1,
          }}>
            {reconCon.map(m => <RsReconCard key={m.id} m={m} done />)}
          </div>
        </div>
      )}
    </div>
  );
}