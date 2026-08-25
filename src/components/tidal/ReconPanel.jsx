// Recondicionamento: em andamento, próximas e concluídas (30 dias).
import React from "react";
import MachineCard from "./MachineCard";
import { fmtHMS, fmtH, fmtDateTime, tierRecon, GREEN, LAV, BLUE } from "./tidalUtils";

function DoneCard({ m }) {
  const tier = tierRecon(m);
  const acc = Number(m.timer_accumulated_seconds) || 0;
  const meta = Number(m.tempo_estimado_segundos) || 0;
  return (
    <div className="td-mc" style={{ "--st": GREEN }}>
      <div className="td-mc-top">
        <span className="td-badge ok">✓ CONCLUÍDA</span>
        {tier && <span className="td-badge tier">{tier}</span>}
        <span className="td-dates">{fmtDateTime(m.dataConclusao)}</span>
      </div>
      <div className="td-mc-mid">
        <div className="td-ns"><b>{m.serie || "—"}</b><span>{m.modelo || "—"}</span></div>
        {acc >= 300 && (
          <div className="td-lcd" style={{ "--st": GREEN }}>
            <b>{fmtHMS(acc)}</b>
            <span>{meta > 0 ? `meta ${fmtH(meta)}` : "total"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReconPanel({ reconAnd, reconAF, reconCon }) {
  const active = reconAnd.filter((m) => m.timer_status === "running" || m.timer_status?.startsWith("paused"));
  const waiting = [...reconAnd.filter((m) => !(m.timer_status === "running" || m.timer_status?.startsWith("paused"))), ...reconAF];
  if (active.length + waiting.length + reconCon.length === 0)
    return <div className="td-empty">Sem máquinas em recondicionamento</div>;

  return (
    <div>
      {active.length > 0 && (
        <>
          <div className="td-sect"><i style={{ background: GREEN }} />Em andamento · <b>{active.length}</b></div>
          <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))" }}>
            {active.map((m, i) => <MachineCard key={m.id || i} m={m} showChips={false} />)}
          </div>
        </>
      )}
      {waiting.length > 0 && (
        <>
          <div className="td-sect"><i style={{ background: LAV }} />Próximas · <b>{waiting.length}</b></div>
          <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))" }}>
            {waiting.map((m, i) => <MachineCard key={m.id || i} m={m} showChips={false} showBar={false} />)}
          </div>
        </>
      )}
      {reconCon.length > 0 && (
        <>
          <div className="td-sect"><i style={{ background: BLUE }} />Concluídas · 30 dias · <b>{reconCon.length}</b></div>
          <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))" }}>
            {reconCon.map((m, i) => <DoneCard key={m.id || i} m={m} />)}
          </div>
        </>
      )}
    </div>
  );
}