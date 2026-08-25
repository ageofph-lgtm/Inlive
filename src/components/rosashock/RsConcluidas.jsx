import React from "react";
import { fmtHMS, fmtH, splitTasks, reconTier, Chip, P } from "./rsShared";

const MIN_TIMER = 300;

export default function RsConcluidas({ items }) {
  if (items.length === 0) return <div className="rs-empty">Nenhuma conclusão esta semana ainda</div>;
  const sorted = [...items].sort((a, b) => new Date(b.dataConclusao || 0) - new Date(a.dataConclusao || 0));
  const n = sorted.length;
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : 5;
  const rows = Math.ceil(n / cols);

  return (
    <div className="rs-grid" style={{
      gridTemplateColumns: `repeat(${cols},1fr)`,
      gridTemplateRows: `repeat(${rows},1fr)`,
    }}>
      {sorted.map(m => {
        const { real, hasExpress, hasVps } = splitTasks(m);
        const tier = reconTier(m);
        const acc = Number(m.timer_accumulated_seconds) || 0;
        const meta = Number(m.tempo_estimado_segundos) || 0;
        const dt = m.dataConclusao ? new Date(m.dataConclusao) : null;
        const dateStr = dt ? dt.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
        const isInt = m.tipo === "servico-interno";
        return (
          <div key={m.id} className="rs-card" style={{ borderColor: `${P.green}55`, gap: 4 }}>
            <div className="rs-card-top">
              <Chip color={P.green}>✓ Done</Chip>
              {isInt && <Chip color="#94A3B8">Serv. Int.</Chip>}
              {tier && <Chip color={P.purple}>{tier}</Chip>}
              {m.prioridade && <Chip color={P.yellow}>⚡</Chip>}
              {hasExpress && <Chip color={P.yellow}>Express</Chip>}
              {hasVps && <Chip color={P.blue}>VPS</Chip>}
              {acc >= MIN_TIMER && (
                <span className="rs-timer" style={{ color: P.green, fontSize: "clamp(11px,1vw,16px)" }}>{fmtHMS(acc)}</span>
              )}
            </div>
            <div className="rs-card-mid">
              <div className="rs-ns" style={{ fontSize: "clamp(13px,1.4vw,22px)" }}>{m.serie || "—"}</div>
              <div className="rs-model">{m.modelo || "—"}</div>
              {acc >= MIN_TIMER && meta >= 60 && (
                <span className="rs-meta" style={{ marginTop: 2 }}>meta {fmtH(meta)}</span>
              )}
            </div>
            {real.length > 0 && (
              <div className="rs-chips" style={{ justifyContent: "center" }}>
                {real.slice(0, 3).map((t, i) => <span key={i} className="rs-chip done">✓ {t.texto}</span>)}
                {real.length > 3 && <span className="rs-chip">+{real.length - 3}</span>}
              </div>
            )}
            <div className="rs-card-foot" style={{ justifyContent: "center" }}>
              <span className="rs-dates" style={{ margin: 0 }}>{dateStr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}