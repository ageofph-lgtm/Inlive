import React from "react";
import { fmtHMS, fmtDia, getPausaMotivo, PAUSA_COLS, WidgetShell, P } from "./rsShared";

function Row({ m, right, dotColor }) {
  return (
    <div className="rs-row">
      {dotColor && <span className="rs-dot" style={{ background: dotColor, width: 6, height: 6, boxShadow: `0 0 5px ${dotColor}` }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="ns">{m.serie || "—"}</div>
        <div className="md">{m.modelo || "—"}</div>
      </div>
      {right && <div className="rt">{right}</div>}
    </div>
  );
}

const More = ({ n }) => n > 0 ? <div className="rs-more">+{n} mais</div> : null;

// ── Standby: agrupado por motivo ──────────────────────────────────────────────
export function RsStandbyWidget({ standby }) {
  const MAX = 5;
  const shown = standby.slice(0, MAX);
  return (
    <WidgetShell title="Standby" count={standby.length} color={P.yellow}>
      {standby.length === 0
        ? <div className="rs-more" style={{ paddingTop: 8 }}>— sem pausas —</div>
        : <>
          {shown.map(m => {
            const motivo = getPausaMotivo(m) || "outros";
            const col = PAUSA_COLS.find(c => c.key === motivo) || PAUSA_COLS[3];
            return (
              <Row key={m.id} m={m} dotColor={col.color} right={
                <span className="rs-pill" style={{ color: col.color, background: `${col.color}22`, border: `1px solid ${col.color}55` }}>
                  {col.emoji} {col.label}
                </span>
              } />
            );
          })}
          <More n={standby.length - shown.length} />
        </>}
    </WidgetShell>
  );
}

// ── Prioritárias ──────────────────────────────────────────────────────────────
export function RsPrioWidget({ items }) {
  const MAX = 4;
  const shown = items.slice(0, MAX);
  return (
    <WidgetShell title="Prioritárias" count={items.length} color={P.red}>
      {items.length === 0
        ? <div className="rs-more" style={{ paddingTop: 8 }}>— sem prioritárias ✓ —</div>
        : <>
          {shown.map(m => {
            const run = m.timer_status === "running";
            const pau = m.timer_status?.startsWith("paused");
            const st = run ? P.green : pau ? P.yellow : P.red;
            return (
              <Row key={m.id} m={m} dotColor={st} right={
                <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, fontWeight: 700, color: st }}>
                  {run ? fmtHMS(Number(m.timer_accumulated_seconds) || 0) : pau ? "pausa" : "fila"}
                </span>
              } />
            );
          })}
          <More n={items.length - shown.length} />
        </>}
    </WidgetShell>
  );
}

// ── NTS: em curso + fila ──────────────────────────────────────────────────────
export function RsNtsWidget({ ntsAnd, ntsAF }) {
  const MAX = 4;
  const all = [
    ...ntsAnd.map(m => ({ m, tag: "curso", c: P.green })),
    ...ntsAF.map(m => ({ m, tag: "fila", c: P.blue })),
  ];
  const shown = all.slice(0, MAX);
  return (
    <WidgetShell title="NTS" count={all.length} color={P.red}>
      {all.length === 0
        ? <div className="rs-more" style={{ paddingTop: 8 }}>— sem NTS —</div>
        : <>
          {shown.map(({ m, tag, c }) => (
            <Row key={m.id} m={m} dotColor={c} right={
              <span className="rs-pill" style={{ color: c, background: `${c}22`, border: `1px solid ${c}55` }}>{tag}</span>
            } />
          ))}
          <More n={all.length - shown.length} />
        </>}
    </WidgetShell>
  );
}

// ── Próximas: fila com previsão ───────────────────────────────────────────────
export function RsProximasWidget({ items }) {
  const MAX = 5;
  const shown = items.slice(0, MAX);
  return (
    <WidgetShell title="Próximas" count={items.length} color={P.blue}>
      {items.length === 0
        ? <div className="rs-more" style={{ paddingTop: 8 }}>— sem previsões —</div>
        : <>
          {shown.map(m => (
            <Row key={m.id} m={m} dotColor={m.prioridade ? P.yellow : P.blue} right={
              <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, fontWeight: 700, color: P.blue }}>
                ▶ {fmtDia(m.previsao_inicio)}
              </span>
            } />
          ))}
          <More n={items.length - shown.length} />
        </>}
    </WidgetShell>
  );
}

// ── Mini timeline 14 dias ─────────────────────────────────────────────────────
export function RsMiniTimeline({ machines }) {
  const BACK = 1, AHEAD = 13;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - BACK);
  const end = new Date(today); end.setDate(today.getDate() + AHEAD + 1);
  const totalMs = end - start;
  const numDays = Math.round(totalMs / 86400000);
  const pctOf = ms => Math.max(0, Math.min(100, ((ms - start.getTime()) / totalMs) * 100));
  const nowPct = pctOf(Date.now());
  const days = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });

  const rows = machines
    .filter(m => m.previsao_inicio && m.previsao_fim)
    .sort((a, b) => {
      const aA = a.estado?.startsWith("em-preparacao") ? 0 : 1;
      const bA = b.estado?.startsWith("em-preparacao") ? 0 : 1;
      if (aA !== bA) return aA - bA;
      return new Date(a.previsao_inicio) - new Date(b.previsao_inicio);
    })
    .slice(0, 5);

  return (
    <div className="rs-glass rs-tl">
      <div className="rs-widget-head" style={{ marginBottom: 2 }}>
        <span className="rs-widget-dot" style={{ background: P.pink, boxShadow: `0 0 8px ${P.pink}` }} />
        <span className="rs-widget-title">Timeline · 14 dias</span>
        <span className="rs-widget-count" style={{ color: P.pink }}>{machines.filter(m => m.previsao_inicio).length}</span>
      </div>
      {rows.length === 0
        ? <div className="rs-more" style={{ padding: "6px 0" }}>— sem previsões definidas —</div>
        : <>
          <div className="rs-tl-days">
            {days.map((d, i) => (
              <span key={i} className={d.toDateString() === today.toDateString() ? "today" : ""}>
                {d.getDate()}
              </span>
            ))}
          </div>
          {rows.map(m => {
            const pi = new Date(m.previsao_inicio).getTime();
            const pf = new Date(m.previsao_fim).getTime() + 86400000;
            const left = pctOf(pi), right = pctOf(pf);
            const active = m.estado?.startsWith("em-preparacao");
            const overrun = Date.now() > pf;
            const col = overrun ? P.red : active ? P.pink : m.prioridade ? P.yellow : "rgba(255,255,255,.45)";
            return (
              <div key={m.id} className="rs-tl-row">
                <span className="rs-tl-ns">{m.serie || "—"}</span>
                <div className="rs-tl-track">
                  <div className="rs-tl-bar" style={{
                    left: `${left}%`, width: `${Math.max(right - left, 1.5)}%`,
                    background: col, boxShadow: active ? `0 0 6px ${col}` : "none",
                  }} />
                  <div className="rs-tl-now" style={{ left: `${nowPct}%` }} />
                </div>
              </div>
            );
          })}
        </>}
    </div>
  );
}