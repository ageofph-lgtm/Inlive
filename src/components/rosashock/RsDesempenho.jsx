import React from "react";
import { P } from "./rsShared";

const TYPE = {
  acp: { label: "ACP", color: P.blue },
  nts: { label: "NTS", color: P.red },
  recon: { label: "RECON", color: P.purple },
};
const typeKey = m => m.tipo === "nova" ? "nts" : m.tipo === "usada" ? "recon" : "acp";

function dailyBuckets(totalCon, days = 14) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    buckets.push({ date: d, key: d.toISOString().slice(0, 10), count: 0 });
  }
  const map = Object.fromEntries(buckets.map(b => [b.key, b]));
  totalCon.forEach(m => {
    if (!m.dataConclusao) return;
    try {
      const k = new Date(m.dataConclusao).toISOString().slice(0, 10);
      if (map[k]) map[k].count++;
    } catch { /* ignore */ }
  });
  return buckets;
}

function weeklyOnTime(totalCon, weeks = 6) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay(), diffMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today); monday.setDate(today.getDate() - diffMon);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday); start.setDate(monday.getDate() - i * 7);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    buckets.push({ start, end, total: 0, onTime: 0 });
  }
  totalCon.forEach(m => {
    if (!m.dataConclusao) return;
    let dc; try { dc = new Date(m.dataConclusao); } catch { return; }
    const b = buckets.find(x => dc >= x.start && dc <= x.end);
    if (!b) return;
    b.total++;
    if (m.previsao_fim) {
      const limit = new Date(m.previsao_fim + "T23:59:59");
      if (dc <= limit) b.onTime++;
    } else {
      b.onTime++;
    }
  });
  return buckets;
}

export default function RsDesempenho({ machines, totalCon, conSemana, conHoje, avgH }) {
  const daily = dailyBuckets(totalCon);
  const dmax = Math.max(...daily.map(b => b.count), 1);
  const weekly = weeklyOnTime(totalCon);
  const real = machines.filter(m => m.tipo !== "servico-interno");
  const counts = { acp: 0, nts: 0, recon: 0 };
  real.forEach(m => { counts[typeKey(m)]++; });
  const total = real.length || 1;

  const r = 46, C = 2 * Math.PI * r;
  let acc = 0;
  const segs = [
    { ...TYPE.acp, n: counts.acp },
    { ...TYPE.nts, n: counts.nts },
    { ...TYPE.recon, n: counts.recon },
  ];

  return (
    <div className="rs-perf">
      {/* Produtividade diária — 14 dias */}
      <div className="rs-perf-card">
        <div className="rs-perf-title">Produtividade diária · 14 dias</div>
        <div className="rs-bars">
          {daily.map((b, i) => {
            const isToday = i === daily.length - 1;
            return (
              <div key={b.key} className="rs-bcol">
                {b.count > 0 && <span className="v">{b.count}</span>}
                <div className="b" style={{
                  height: `${Math.max((b.count / dmax) * 78, 2)}%`,
                  background: isToday ? P.pink : "rgba(255,255,255,.35)",
                  boxShadow: isToday ? `0 0 8px ${P.pink}88` : "none",
                }} />
                <span className="l">{b.date.toLocaleDateString("pt-PT", { day: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* % No prazo — 6 semanas */}
      <div className="rs-perf-card">
        <div className="rs-perf-title">% No prazo · 6 semanas</div>
        <div className="rs-bars">
          {weekly.map((b, i) => {
            const pct = b.total > 0 ? Math.round((b.onTime / b.total) * 100) : null;
            const isCur = i === weekly.length - 1;
            return (
              <div key={i} className="rs-bcol">
                <span className="v">{pct === null ? "—" : `${pct}%`}</span>
                <div className="b" style={{
                  height: `${pct === null ? 2 : Math.max(pct * 0.75, 3)}%`,
                  background: pct === null ? "rgba(255,255,255,.15)"
                    : pct >= 80 ? P.green : pct >= 50 ? P.yellow : P.red,
                  boxShadow: isCur ? "0 0 8px rgba(255,255,255,.3)" : "none",
                }} />
                <span className="l">{b.start.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Donut por tipo */}
      <div className="rs-perf-card">
        <div className="rs-perf-title">Frota por tipo</div>
        <div className="rs-donutwrap">
          <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="13" />
              {segs.map((s, i) => {
                const frac = s.n / total;
                const dash = C * frac, off = -acc * C;
                acc += frac;
                if (s.n === 0) return null;
                return <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="13"
                  strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off}
                  transform="rotate(-90 60 60)" strokeLinecap="butt" />;
              })}
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", lineHeight: 1,
            }}>
              <b style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 22, fontWeight: 800 }}>{real.length}</b>
              <span style={{ fontSize: 7, color: "rgba(255,255,255,.55)", letterSpacing: ".1em", textTransform: "uppercase" }}>máquinas</span>
            </div>
          </div>
          <div className="rs-donutlegend">
            {segs.map(s => (
              <div key={s.label}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                {s.label}
                <b>{s.n}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="rs-perf-card">
        <div className="rs-perf-title">Resumo</div>
        <div className="rs-stats">
          <div className="rs-stat"><b style={{ color: P.blue }}>{conSemana.length}</b><span>Esta semana</span></div>
          <div className="rs-stat"><b style={{ color: P.green }}>{conHoje.length}</b><span>Hoje</span></div>
          <div className="rs-stat"><b style={{ color: P.yellow }}>{avgH}</b><span>Méd. h/máq</span></div>
          <div className="rs-stat"><b style={{ color: P.pink }}>{totalCon.length}</b><span>Total concluídas</span></div>
        </div>
      </div>
    </div>
  );
}