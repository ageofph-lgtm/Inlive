// Gantt de 14 dias com linha HOJE e barras de estado.
import React from "react";
import { pad2, machineType, BLUE, RED } from "./tidalUtils";

export default function TimelinePanel({ machines }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - 1);
  const end = new Date(today); end.setDate(today.getDate() + 14);
  const totalMs = end - start;
  const days = Array.from({ length: 15 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const nowPct = ((Date.now() - start.getTime()) / totalMs) * 100;

  const rows = machines.map((m) => {
    if (!m.previsao_inicio) return null;
    const pi = new Date(String(m.previsao_inicio).length === 10 ? m.previsao_inicio + "T00:00:00" : m.previsao_inicio);
    const rawFim = m.previsao_fim || m.previsao_inicio;
    const pf = new Date(String(rawFim).length === 10 ? rawFim + "T23:59:59" : rawFim);
    if (isNaN(pi) || isNaN(pf) || pf < start || pi > end) return null;
    const isActive = !!m.estado?.startsWith("em-preparacao");
    return {
      m, isActive, over: isActive && new Date() > pf,
      a: ((Math.max(pi, start) - start) / totalMs) * 100,
      b: ((Math.min(pf, end) - start) / totalMs) * 100,
    };
  }).filter(Boolean).sort((x, y) => (x.isActive === y.isActive ? x.a - y.a : x.isActive ? -1 : 1));

  if (rows.length === 0) return <div className="td-empty">Sem máquinas com previsão nesta janela</div>;

  return (
    <div className="td-tl">
      <div className="td-tlscale">
        {days.map((d, i) => (
          <b key={i} className={d.toDateString() === today.toDateString() ? "now" : ""}>{pad2(d.getDate())}</b>
        ))}
      </div>
      <div className="td-tlrows">
        <div className="td-tlnow" style={{ left: `calc(96px + ((100% - 96px)/100) * ${nowPct})` }} />
        {rows.map((r, i) => (
          <div key={r.m.id || i} className="td-tlrow">
            <span className="td-tll">
              <i style={{ background: machineType(r.m).color }} />
              {r.m.serie || "—"}
            </span>
            <span className="td-tltrack">
              <i className={r.over ? "over" : r.isActive ? "run" : "fila"}
                style={{ left: r.a + "%", width: Math.max(r.b - r.a, 2) + "%" }}>
                {r.m.modelo || ""}
              </i>
            </span>
          </div>
        ))}
      </div>
      <div className="td-leg">
        <span><i style={{ background: BLUE }} />Em curso</span>
        <span><i style={{ background: "#94A3B8" }} />Em fila</span>
        <span><i style={{ background: RED }} />Atrasada</span>
      </div>
    </div>
  );
}