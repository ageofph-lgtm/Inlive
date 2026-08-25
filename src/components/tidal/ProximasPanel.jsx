// Calendário semanal Seg-Sex + listas Sem Previsão e Semanas Seguintes.
import React from "react";
import { pad2, fmtH, machineType, getMondayLocal } from "./tidalUtils";

export default function ProximasPanel({ proximas }) {
  if (proximas.length === 0) return <div className="td-empty">Nenhuma máquina com previsão marcada</div>;

  const monday = getMondayLocal();
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const lastKey = days[4].toISOString().slice(0, 10);
  const todayKey = new Date().toISOString().slice(0, 10);

  const byDay = {};
  proximas.forEach((m) => {
    if (!m.previsao_inicio) return;
    const k = String(m.previsao_inicio).slice(0, 10);
    (byDay[k] = byDay[k] || []).push(m);
  });
  const semData = proximas.filter((m) => !m.previsao_inicio);
  const futuras = proximas.filter((m) => m.previsao_inicio && String(m.previsao_inicio).slice(0, 10) > lastKey);

  return (
    <div>
      <div className="td-week">
        {days.map((d) => {
          const k = d.toISOString().slice(0, 10);
          const items = byDay[k] || [];
          return (
            <div key={k} className={`td-wd${k === todayKey ? " today" : ""}`}>
              <div className="td-wdh">
                <span>{d.toLocaleDateString("pt-PT", { weekday: "short" })}</span>
                <b>{pad2(d.getDate())}/{pad2(d.getMonth() + 1)}</b>
              </div>
              <div className="td-wdb">
                {items.length === 0
                  ? <span className="td-sbempty">—</span>
                  : items.map((m, i) => {
                    const meta = Number(m.tempo_estimado_segundos) || 0;
                    return (
                      <div key={m.id || i} className="td-wc" style={{ "--bc": machineType(m).color }}>
                        <b>{m.serie || "—"}</b>
                        <span>{m.modelo || "—"}</span>
                        {(meta > 0 || m.prioridade) && (
                          <em>{meta > 0 ? `⏱ ${fmtH(meta)}` : ""}{m.prioridade ? " ⚡" : ""}</em>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {(semData.length > 0 || futuras.length > 0) && (
        <div className="td-wfoot">
          {semData.length > 0 && (
            <div>
              <h5>Sem previsão · {semData.length}</h5>
              {semData.map((m, i) => (
                <p key={m.id || i}><b>{m.serie || "—"}</b> · {m.modelo || "—"}</p>
              ))}
            </div>
          )}
          {futuras.length > 0 && (
            <div>
              <h5>Semanas seguintes · {futuras.length}</h5>
              {futuras.map((m, i) => (
                <p key={m.id || i}>
                  <b>{m.serie || "—"}</b> · {m.modelo || "—"} ·{" "}
                  {new Date(String(m.previsao_inicio).slice(0, 10) + "T12:00:00")
                    .toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}