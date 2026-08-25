// Concluídas desta semana: timer acumulado, meta, tarefas ✓ e data de conclusão.
import React, { useMemo } from "react";
import {
  fmtHMS, fmtH, fmtDateTime, machineType, tierRecon, realTasks, GREEN, RED,
} from "./tidalUtils";

export default function ConcluidasPanel({ conSemana }) {
  const sorted = useMemo(
    () => [...conSemana].sort((a, b) => new Date(b.dataConclusao || 0) - new Date(a.dataConclusao || 0)),
    [conSemana]
  );
  if (sorted.length === 0) return <div className="td-empty">Nenhuma conclusão esta semana ainda</div>;

  return (
    <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(225px,1fr))" }}>
      {sorted.map((m, i) => {
        const type = machineType(m);
        const tier = tierRecon(m);
        const acc = Number(m.timer_accumulated_seconds) || 0;
        const meta = Number(m.tempo_estimado_segundos) || 0;
        const late = meta > 0 && acc > meta;
        const tasks = realTasks(m);
        return (
          <div key={m.id || i} className="td-mc" style={{ "--st": late ? RED : GREEN }}>
            <div className="td-mc-top">
              <span className="td-badge ok">✓</span>
              <span className="td-badge" style={{ "--bc": type.color }}>{type.label}</span>
              {tier && <span className="td-badge tier">{tier}</span>}
              {m.prioridade && <span className="td-badge prio">⚡</span>}
              <span className="td-dates">{fmtDateTime(m.dataConclusao)}</span>
            </div>
            <div className="td-mc-mid">
              <div className="td-ns"><b>{m.serie || "—"}</b><span>{m.modelo || "—"}</span></div>
              {acc >= 300 && (
                <div className="td-lcd" style={{ "--st": late ? RED : GREEN }}>
                  <b>{fmtHMS(acc)}</b>
                  <span>{meta > 0 ? `meta ${fmtH(meta)}` : "total"}</span>
                </div>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="td-chips">
                {tasks.slice(0, 4).map((t, j) => <span key={j} className="td-chip done">✓ {t.texto}</span>)}
                {tasks.length > 4 && <span className="td-chip dim">+{tasks.length - 4}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}