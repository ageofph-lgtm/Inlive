// ─────────────────────────────────────────────────────────────────────────────
// AoVivoIndustrial — pele "INDUSTRIAL" (tela única, mesmo layout dinâmico do Ops).
// Papel técnico + hazard + glass · paleta laranja & prata.
// Mesma informação e funções do AoVivoOps — apenas pele visual diferente.
// Render-only: recebe os dados já calculados via props do AoVivo.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useMemo } from "react";

// ── Paleta industrial (laranja & prata sobre papel) ──────────────────────────
const ORANGE = "#E8730C", ORANGE_DARK = "#C25A08", SILVER = "#A8A8A8",
      SILVER_DK = "#6B6862", RED = "#C8102E", GREEN = "#1E7A46",
      BLUE = "#2A6BE0", PINK = "#C25A8C", BLUE_LIGHT = "#3A8FD0";
const BRAND = "#E8730C";
const TYPE = {
  nts: { key: "nts", color: RED, label: "NTS" },
  recon: { key: "recon", color: PINK, label: "RECON" },
  acp: { key: "acp", color: BLUE, label: "ACP" },
  servico: { key: "servico", color: SILVER_DK, label: "SERV. INT." }
};

// ── Helpers (idênticos ao Ops) ────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const abs = Math.abs(Math.round(s)); const sign = s < 0 ? "-" : "";
  return `${sign}${pad2(Math.floor(abs / 3600))}:${pad2(Math.floor(abs % 3600 / 60))}:${pad2(abs % 60)}`;
}
function useLiveTimer(m) {
  const ref = useRef(m);
  useEffect(() => { ref.current = m; });
  function calcNow(mm) {
    const acc = Number(mm?.timer_accumulated_seconds) || 0;
    const at = mm?.timer_started_at ? new Date(mm.timer_started_at).getTime() : null;
    if (mm?.timer_status === "running" && at) return acc + Math.floor((Date.now() - at) / 1000);
    return acc;
  }
  const [e, sE] = useState(() => calcNow(m));
  useEffect(() => {
    sE(calcNow(ref.current));
    if (m?.timer_status !== "running" || !m?.timer_started_at) return;
    const id = setInterval(() => sE(calcNow(ref.current)), 1000);
    return () => clearInterval(id);
  }, [m?.timer_status, m?.timer_started_at]);
  return e;
}
function getPausaMotivo(m) {
  if (!m?.timer_status?.startsWith("paused")) return null;
  return m.timer_status.split(":")[1] || "outros";
}
function getMondayUTC() {
  const n = new Date(), d = n.getUTCDay(), b = d === 0 ? 6 : d - 1, mn = new Date(n);
  mn.setUTCDate(n.getUTCDate() - b); mn.setUTCHours(0, 0, 0, 0); return mn;
}
function nsSplit(ns) {
  if (!ns) return { main: "—", sub: null };
  if (ns.includes("|")) { const [main, sub] = ns.split("|"); return { main, sub }; }
  return { main: ns, sub: null };
}
function fmtDateShort(v) {
  if (!v) return null;
  try { return new Date(String(v).length === 10 ? v + "T12:00:00" : v).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }); }
  catch { return null; }
}
function tierRecon(m) {
  const r = m.recondicao || {};
  return r.ouro ? "OURO" : r.prata ? "PRATA" : r.bronze ? "BRONZE" : r.ferro ? "FERRO" : null;
}
function isOverdue(m) {
  if (!m.previsao_fim) return false;
  const conc = m.estado?.startsWith("concluida") || m.estado === "concluida";
  if (conc) return false;
  try { return new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : "")) < new Date(); }
  catch { return false; }
}
function hasPrevisao(m) { return !!(m.previsao_inicio && m.previsao_fim); }
function computeDailyProductivity(totalCon, days = 14) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    buckets.push({ date: d, key: d.toISOString().slice(0, 10), count: 0 });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  (totalCon || []).forEach((m) => {
    if (!m.dataConclusao) return;
    let key;
    try { key = new Date(m.dataConclusao).toISOString().slice(0, 10); } catch { return; }
    const b = map.get(key);
    if (b) b.count++;
  });
  return buckets;
}
function computeWeeklyOnTime(totalCon, weeks = 6) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay(), diffMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today); monday.setDate(today.getDate() - diffMon);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday); start.setDate(monday.getDate() - i * 7);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    buckets.push({ start, end, total: 0, onTime: 0 });
  }
  (totalCon || []).forEach((m) => {
    if (!m.dataConclusao || !m.previsao_fim) return;
    let dc;
    try { dc = new Date(m.dataConclusao); } catch { return; }
    const b = buckets.find((bb) => dc >= bb.start && dc <= bb.end);
    if (!b) return;
    b.total++;
    try { const pf = new Date(m.previsao_fim + "T23:59:59"); if (dc <= pf) b.onTime++; } catch {}
  });
  return buckets.map((b) => ({
    label: `${pad2(b.start.getDate())}/${pad2(b.start.getMonth() + 1)}`,
    pct: b.total > 0 ? Math.round(b.onTime / b.total * 100) : null,
    total: b.total
  }));
}
function pctColor(pct) {
  if (pct === null || pct === undefined) return "rgba(20,20,20,.15)";
  if (pct >= 90) return GREEN;
  if (pct >= 70) return ORANGE;
  return RED;
}
function machineType(m) {
  if (m.tipo === "servico-interno") return TYPE.servico;
  if (m.tipo === "nova") return TYPE.nts;
  if (m.tipo === "usada") return TYPE.recon;
  return TYPE.acp;
}
const JORDAN_URL = "/watcher-logo.png";

function useRotatingWindow(items, size, intervalMs) {
  const n = items.length;
  const [off, setOff] = useState(0);
  useEffect(() => {
    if (n <= size) { setOff(0); return; }
    const id = setInterval(() => setOff((o) => (o + size) % n), intervalMs);
    return () => clearInterval(id);
  }, [n, size, intervalMs]);
  if (n <= size) return { slice: items, off: 0, rotating: false };
  const start = off % n;
  const slice = Array.from({ length: size }, (_, i) => items[(start + i) % n]);
  return { slice, off, rotating: true };
}

function TypeDot({ m, size = 7 }) {
  const t = machineType(m);
  return <span className="tdot" title={t.label}
    style={{ width: size, height: size, background: t.color, boxShadow: `0 0 4px ${t.color}66` }} />;
}

function Clock() {
  const [n, sN] = useState(new Date());
  useEffect(() => { const id = setInterval(() => sN(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="clock">
      {pad2(n.getHours())}:{pad2(n.getMinutes())}
      <small>{n.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" })}</small>
    </div>
  );
}

function TriReactor({ pct }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const col = ORANGE;
  const tri = "M34,42 L166,42 L100,168 Z";
  return (
    <div className="trir">
      <svg viewBox="0 0 200 190" preserveAspectRatio="xMidYMid meet">
        <path d={tri} fill="none" stroke="rgba(20,20,20,.1)" strokeWidth="10" strokeLinejoin="round" />
        <path d={tri} pathLength="100" fill="none" stroke={col} strokeWidth="10"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="100" strokeDashoffset={100 - p}
          style={{ filter: `drop-shadow(0 0 4px ${col})` }} />
        <circle cx="100" cy="134" r="4" fill="#141414" />
      </svg>
      <div className="tric">
        <b>{p}<i>%</i></b>
        <span>No prazo</span>
      </div>
    </div>
  );
}

function DonutOnly({ machines, counts, total }) {
  const segs = [
    { ...TYPE.acp, n: counts.acp },
    { ...TYPE.nts, n: counts.nts },
    { ...TYPE.recon, n: counts.recon }];
  const r = 58, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(20,20,20,.08)" strokeWidth="16" />
        {segs.map((s, i) => {
          const frac = s.n / total;
          const dash = C * frac, off = -acc * C;
          acc += frac;
          if (s.n === 0) return null;
          return <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off}
            transform="rotate(-90 80 80)" strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 3px ${s.color}88)` }} />;
        })}
      </svg>
      <div className="donutc"><b>{machines.length}</b><span>máquinas</span></div>
    </div>
  );
}

function BarChart({ data, valueKey, colorFor, highlightLast }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="barchart">
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const h = v > 0 ? Math.max(v / max * 100, 6) : 2;
        const isLast = highlightLast && i === data.length - 1;
        return (
          <div key={i} className={`bx${isLast ? " now" : ""}`}>
            <i style={{ height: h + "%", background: colorFor ? colorFor(d, i) : ORANGE }} />
          </div>
        );
      })}
    </div>
  );
}

function StatBar({ label, value, display, max, color }) {
  const pct = max > 0 ? Math.min(100, value / max * 100) : 0;
  return (
    <div className="gstat">
      <div className="gl"><span className="lg"><i style={{ background: color }} />{label}</span><b>{display ?? value}</b></div>
      <div className="gb"><i style={{ width: pct + "%", background: color }} /></div>
    </div>
  );
}

function Desempenho({ noPrazoPct, gstats, gmax, machines, totalCon }) {
  const N_SLIDES = 3;
  const [view, setView] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setView((v) => (v + 1) % N_SLIDES), 8000);
    return () => clearInterval(id);
  }, []);

  const realMachines = machines.filter((m) => m.tipo !== "servico-interno");
  const counts = { nts: 0, acp: 0, recon: 0 };
  realMachines.forEach((m) => { counts[machineType(m).key]++; });
  const total = realMachines.length || 1;
  const typeStats = [
    [TYPE.acp.label, counts.acp, TYPE.acp.color],
    [TYPE.nts.label, counts.nts, TYPE.nts.color],
    [TYPE.recon.label, counts.recon, TYPE.recon.color]];
  const typeMax = Math.max(...typeStats.map((g) => g[1]), 1);

  const daily = useMemo(() => computeDailyProductivity(totalCon, 14), [totalCon?.length]);
  const dailyCounts = daily.map((d) => d.count);
  const avgPerDay = daily.length ? Math.round(dailyCounts.reduce((a, b) => a + b, 0) / daily.length * 10) / 10 : 0;
  const last7 = dailyCounts.slice(-7).reduce((a, b) => a + b, 0);
  const bestIdx = dailyCounts.reduce((best, v, i) => v > dailyCounts[best] ? i : best, 0);
  const bestDay = daily[bestIdx];
  const bestLabel = bestDay ? `${pad2(bestDay.date.getDate())}/${pad2(bestDay.date.getMonth() + 1)}` : "—";
  const dailyGmax = Math.max(avgPerDay, last7, bestDay?.count || 0, 1);

  return (
    <div className="cb desemp-cb">
      <div className="desemp-slide gaufade" key={view}>
        {view === 0 &&
          <>
            <div className="desemp-fig"><TriReactor pct={noPrazoPct} /></div>
            <div className="desemp-bars">
              {gstats.map((g, i) =>
                <div key={i} className="gstat">
                  <div className="gl"><span className="lg"><i style={{ background: g[2] }} />{g[0]}</span><b>{g[1]}</b></div>
                  <div className="gb"><i style={{ width: g[1] / gmax * 100 + "%", background: g[2] }} /></div>
                </div>
              )}
            </div>
          </>
        }
        {view === 1 &&
          <>
            <div className="desemp-fig desemp-fig--donut">
              <DonutOnly machines={realMachines} counts={counts} total={total} />
            </div>
            <div className="desemp-bars">
              {typeStats.map((g, i) =>
                <div key={i} className="gstat">
                  <div className="gl"><span className="lg"><i style={{ background: g[2] }} />{g[0]}</span><b>{g[1]}</b></div>
                  <div className="gb"><i style={{ width: g[1] / typeMax * 100 + "%", background: g[2] }} /></div>
                </div>
              )}
            </div>
          </>
        }
        {view === 2 &&
          <>
            <div className="desemp-fig desemp-fig--bars">
              <BarChart data={daily} valueKey="count" colorFor={() => ORANGE} highlightLast />
            </div>
            <div className="desemp-bars">
              <StatBar label="Média/dia · 14d" value={avgPerDay} max={dailyGmax} color={ORANGE} />
              <StatBar label="Últimos 7 dias" value={last7} max={dailyGmax} color={GREEN} />
              <StatBar label={`Melhor dia · ${bestLabel}`} value={bestDay?.count || 0} max={dailyGmax} color={SILVER_DK} />
            </div>
          </>
        }
      </div>
    </div>
  );
}

function Trow({ m }) {
  const elapsed = useLiveTimer(m);
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const ratio = meta > 0 ? elapsed / meta : 0;
  const restante = meta > 0 ? meta - elapsed : null;
  const over = restante !== null && restante < 0;
  const run = m.timer_status === "running";
  const paused = m.timer_status?.startsWith("paused");
  const crit = m.tipo === "nova" && over;
  const st = over ? RED : ratio >= 0.9 ? ORANGE : run ? GREEN : paused ? ORANGE : SILVER_DK;
  const ns = nsSplit(m.serie);
  const tt = machineType(m);
  const badges = [[tt.key, tt.label]];
  if (run) badges.push(["run", "RUN"]);
  if (m.prioridade) badges.push(["prio", "PRIO"]);
  return (
    <div className={`trow${crit ? " crit" : ""}`} style={{ "--st": st }}>
      <div className="nsc">
        <span className="sd" />
        <div style={{ minWidth: 0 }}>
          <div className="ns">{ns.main}{ns.sub && <small> · {ns.sub}</small>}</div>
          <div className="mo">{m.modelo || "—"}</div>
        </div>
      </div>
      <div className="badges">{badges.map(([c, l]) => <span key={l} className={`bdg ${c}`}>{l}</span>)}</div>
      <div className="prog">
        <div className="bar"><i style={{ width: Math.min(100, ratio * 100) + "%", background: st }} /></div>
        <div className="pct">{meta > 0 ? Math.min(100, Math.round(ratio * 100)) + "%" : "—"}</div>
      </div>
      <div className={`rem${over ? " over" : ""}`}>
        {restante !== null ? (over ? "+" : "") + fmtHMS(Math.abs(restante)) : fmtHMS(elapsed)}
        <small>{restante === null ? "DECORR." : over ? "ATRASO" : "RESTAM"}</small>
      </div>
    </div>
  );
}
function EmAndamento({ andamento }) {
  const win = useRotatingWindow(andamento, 7, 9000);
  const rows = [...win.slice].sort((a, b) => {
    const ra = (Number(a.tempo_estimado_segundos) || 0) - (Number(a.timer_accumulated_seconds) || 0);
    const rb = (Number(b.tempo_estimado_segundos) || 0) - (Number(b.timer_accumulated_seconds) || 0);
    return ra - rb;
  });
  return (
    <>
      <div className="thead"><div>Máquina</div><div>Estado</div><div>Progresso</div><div className="r">Restante</div><div /></div>
      <div className="trows" key={win.off}>{rows.map((m) => <Trow key={m.id} m={m} />)}</div>
    </>
  );
}

function MiniRow({ m, v, vc }) {
  const ns = nsSplit(m.serie);
  return (
    <div className="mrow">
      <div className="mtop">
        <TypeDot m={m} />
        <span className="mn">{ns.main}</span>
      </div>
      <div className="mbot">
        <span className="mm">{m.modelo || "—"}</span>
        <span className="mv" style={{ color: vc }}>{v}</span>
      </div>
    </div>
  );
}
function Prioritarias({ prioritarias }) {
  const win = useRotatingWindow(prioritarias, 4, 9000);
  return (
    <div className="mlist" key={win.off}>
      {win.slice.map((m, i) => {
        const fim = fmtDateShort(m.previsao_fim);
        return <MiniRow key={m.id || i} m={m} v={fim ? `⚑ ${fim}` : "⚡"} vc={ORANGE} />;
      })}
    </div>
  );
}
function NtsMiniRow({ m }) {
  const elapsed = useLiveTimer(m);
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const d = meta > 0 ? elapsed - meta : 0;
  const v = meta > 0 ? `Δ ${d > 0 ? "+" : ""}${fmtHMS(Math.abs(d))}` : "NTS";
  const vc = meta > 0 && d > 0 ? RED : GREEN;
  return <MiniRow m={m} v={v} vc={vc} />;
}
function Nts({ nts }) {
  const win = useRotatingWindow(nts, 4, 9000);
  return <div className="mlist" key={win.off}>{win.slice.map((m, i) => <NtsMiniRow key={m.id || i} m={m} />)}</div>;
}
function ASeguir({ proximas }) {
  const win = useRotatingWindow(proximas, 4, 9000);
  return (
    <div className="mlist" key={win.off}>
      {win.slice.map((m, i) => {
        const meta = Number(m.tempo_estimado_segundos) || 0;
        const h = meta > 0 ? Math.round(meta / 3600) + "h" : "";
        const wd = m.previsao_inicio ?
          new Date(m.previsao_inicio).toLocaleDateString("pt-PT", { weekday: "short" }).toUpperCase().replace(".", "") : "";
        const v = [wd, h].filter(Boolean).join(" · ") || "—";
        return <MiniRow key={m.id || i} m={m} v={v} vc={BLUE} />;
      })}
    </div>
  );
}
function Standby({ standby }) {
  const win = useRotatingWindow(standby, 4, 9000);
  return (
    <div className="mlist" key={win.off}>
      {win.slice.map((m, i) => <MiniRow key={m.id || i} m={m} v={fmtHMS(Number(m.timer_accumulated_seconds) || 0)} vc={ORANGE} />)}
    </div>
  );
}

function Timeline({ machines }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const BACK = 1, AHEAD = 13;
  const start = new Date(today); start.setDate(today.getDate() - BACK);
  const end = new Date(today); end.setDate(today.getDate() + AHEAD + 1);
  const totalMs = end - start;
  const days = Array.from({ length: 15 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const todayPct = (Date.now() - start.getTime()) / totalMs * 100;
  const blocks = machines.map((m) => {
    if (!m.previsao_inicio || !m.previsao_fim) return null;
    const pi = new Date(m.previsao_inicio + (String(m.previsao_inicio).length === 10 ? "T00:00:00" : ""));
    const pf = new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : ""));
    if (pf < start || pi > end) return null;
    const isActive = m.estado?.startsWith("em-preparacao");
    const run = m.timer_status === "running";
    const over = isActive && new Date() > pf;
    const a = (Math.max(pi, start) - start) / totalMs * 100;
    const b = (Math.min(pf, end) - start) / totalMs * 100;
    return { m, a, b, run, isActive, over };
  }).filter(Boolean)
    .sort((x, y) => x.isActive === y.isActive ? x.a - y.a : x.isActive ? -1 : 1)
    .slice(0, 7);
  return (
    <>
      <div className="tlhead">
        <div />
        <div className="tlscale">
          {days.map((d, i) =>
            <b key={i} className={d.toDateString() === today.toDateString() ? "now" : ""}>{pad2(d.getDate())}</b>
          )}
        </div>
      </div>
      <div className="tlrows">
        <div className="tnow" style={{ left: `calc(160px + ((100% - 160px)/100) * ${todayPct})` }} />
        {blocks.length === 0 ?
          <div className="tlempty">Sem máquinas com previsão na janela</div> :
          blocks.map((bl, i) => {
            const cls = bl.over ? "over" : bl.run || bl.isActive ? "run" : "fila";
            const ns = nsSplit(bl.m.serie).main;
            return (
              <div key={bl.m.id || i} className="tlrow">
                <div className="l"><TypeDot m={bl.m} size={6} /><span className="lt">{ns} · {bl.m.modelo || ""}</span></div>
                <div className="track">
                  <div className={`tbar ${cls}`} style={{ left: bl.a + "%", width: Math.max(bl.b - bl.a, 2) + "%" }}>{ns}</div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}

function Recon({ reconAnd, reconAF, reconCon }) {
  const active = reconAnd.filter((m) => m.timer_status === "running" || m.timer_status?.startsWith("paused"));
  const waiting = [...reconAnd.filter((m) => !(m.timer_status === "running" || m.timer_status?.startsWith("paused"))), ...reconAF];
  const nActive = active.length, nWait = waiting.length, nCon = reconCon.length;
  const total = Math.max(nActive + nWait + nCon, 1);
  const groups = [
    { key: "run", label: "Em curso", cls: "run", items: active },
    { key: "fila", label: "Fila", cls: "fila", items: waiting },
    { key: "done", label: "Concluída", cls: "done", items: reconCon }]
    .filter((g) => g.items.length > 0);
  const [view, sView] = useState(0);
  useEffect(() => {
    if (groups.length <= 1) { sView(0); return; }
    const id = setInterval(() => sView((v) => (v + 1) % groups.length), 9000);
    return () => clearInterval(id);
  }, [groups.length]);
  const g = groups[view % Math.max(groups.length, 1)];
  return (
    <>
      <div className="funnel">
        <div className="seg s1" style={{ width: nActive / total * 100 + "%" }}>{nActive || ""}</div>
        <div className="seg s2" style={{ width: nWait / total * 100 + "%" }}>{nWait} em fila</div>
        <div className="seg s3" style={{ width: nCon / total * 100 + "%" }}>{nCon || ""}</div>
      </div>
      <div className="recleg">
        <div className={`x${g?.key === "run" ? " on" : ""}`}><i style={{ background: GREEN }} />Em curso {nActive}</div>
        <div className={`x${g?.key === "fila" ? " on" : ""}`}><i style={{ background: PINK }} />Fila {nWait}</div>
        <div className={`x${g?.key === "done" ? " on" : ""}`}><i style={{ background: BLUE_LIGHT }} />Concl. {nCon}</div>
      </div>
      <div className="recchips" key={g ? g.key : "empty"}>
        {!g ?
          <div className="pxempty">Sem máquinas em recondicionamento</div> :
          g.items.map((m, i) => {
            const t = g.key === "fila" ? tierRecon(m) || "Fila" : g.label;
            return <div key={m.id || i} className={`rchip ${g.cls}`}>{g.key === "done" ? "✓ " : ""}{nsSplit(m.serie).main} · {t}</div>;
          })}
      </div>
    </>
  );
}

function Concluidas({ conSemana }) {
  const win = useRotatingWindow(conSemana, 6, 10000);
  return (
    <div className="clist" key={win.off}>
      {win.slice.map((m, i) => {
        const t = m.timer_accumulated_seconds ? fmtHMS(m.timer_accumulated_seconds) : "—";
        const ns = nsSplit(m.serie);
        const tier = tierRecon(m);
        return (
          <div key={m.id || i} className="crow">
            <div className="ck">✓</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="cn"><TypeDot m={m} size={6} />{ns.main}</div>
              <div className="cm">{m.modelo || "—"}{tier ? ` · ${tier}` : ""}</div>
            </div>
            <div className="cti">{t}</div>
          </div>
        );
      })}
    </div>
  );
}

function CardHead({ c, title, sub, ct }) {
  return (
    <div className="ch" style={{ "--c": c }}>
      <span className="mk" /><h3>{title}</h3>
      {sub && <span className="sub">{sub}</span>}
      {ct != null && <span className="ct">{pad2(ct)}</span>}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL (mesma estrutura do Ops) ─────────────────────────────
export default function AoVivoIndustrial({ data, loading, paused, cycleTheme, theme }) {
  const { machines = [], andamento = [], standby = [], prioritarias = [], proximas = [],
    ntsAnd = [], ntsAF = [], reconAnd = [], reconAF = [], reconCon = [],
    conSemana = [], totalCon = [], conHoje = [], avgH = 0 } = data || {};

  const nts = [...ntsAnd, ...ntsAF];
  const aSeguir = proximas.filter((m) => {
    const active = m.timer_status === "running" || m.timer_status?.startsWith("paused");
    if (active || !m.previsao_inicio) return false;
    const d = new Date(m.previsao_inicio + (String(m.previsao_inicio).length === 10 ? "T00:00:00" : ""));
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    return d >= t0;
  });
  const emCurso = andamento.length;
  const overdue = andamento.filter(isOverdue).length;
  const noPrazoPct = emCurso > 0 ? Math.round((1 - overdue / emCurso) * 100) : 100;
  const nRecon = reconAnd.length + reconAF.length;
  const nReconTotal = nRecon + reconCon.length;

  const KPI = [
    { n: emCurso, l: "Em andamento", c: GREEN },
    { n: prioritarias.length, l: "Prioritárias", c: ORANGE },
    { n: nts.length, l: "NTS", c: RED, alert: true },
    { n: nRecon, l: "Recon", c: PINK },
    { n: conSemana.length, l: "Concluídas · sem.", c: BLUE_LIGHT },
    { n: avgH ? avgH + "h" : "—", l: "Méd. por máq.", c: SILVER_DK },
    { n: totalCon.length, l: "Total 2026", c: ORANGE_DARK }
  ];

  const gstats = [
    ["Em andamento", emCurso, GREEN],
    ["Prioritárias", prioritarias.length, ORANGE],
    ["Standby", standby.length, SILVER_DK],
    ["Recon", nRecon, PINK]];
  const gmax = Math.max(...gstats.map((g) => g[1]), 1);

  const showAnd = emCurso > 0;
  const showRec = nReconTotal > 0;
  const showCon = conSemana.length > 0;
  const showPrio = prioritarias.length > 0;
  const showNts = nts.length > 0;
  const showProx = aSeguir.length > 0;
  const showStb = standby.length > 0;
  const hasTL = machines.some(hasPrevisao);
  const showSmall = showPrio || showNts || showProx || showStb;

  return (
    <div className="ind-root">
      <style>{CSS_INDUSTRIAL}</style>
      <div className="ind-hazard" />
      <div className="app">

        {/* HEADER */}
        <div className="head">
          <div className="logo"><img src={JORDAN_URL} alt="Watcher" /></div>
          <div className="brand"><b>WATCHER</b><span className="brand-sep">|</span><span className="brand-still">STILL OFICINA</span></div>
          <div className="right">
            <div className={`pill live${paused ? " paused" : ""}`}>
              <span className="dot" />{paused ? "Em pausa" : "Ao vivo"}
            </div>
            <Clock />
            <button className="themebtn" onClick={cycleTheme} title={`Tema: ${theme} → próximo`}>◐</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpis">
          {KPI.map((k, i) =>
            <div key={i} className={`kpi${k.alert ? " alert" : ""}`} style={{ "--c": k.c }}>
              <div className="lab"><i />{k.l}</div>
              <div className="num">{loading ? "—" : k.n}</div>
            </div>
          )}
        </div>

        {/* MAIN — flex dinâmico */}
        <div className="main">

          {/* TOPO: destaques + gauge */}
          <div className="top">
            {showAnd &&
              <div className="card hi and" style={{ "--c": GREEN }}>
                <CardHead c={GREEN} title="Em andamento" sub="tempo restante ao vivo" ct={emCurso} />
                <div className="cb"><EmAndamento andamento={andamento} /></div>
              </div>
            }
            {showRec &&
              <div className="card hi rec" style={{ "--c": PINK }}>
                <CardHead c={PINK} title="Recondicionamento" ct={nReconTotal} />
                <div className="cb"><Recon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} /></div>
              </div>
            }
            {showCon &&
              <div className="card hi con" style={{ "--c": BLUE_LIGHT }}>
                <CardHead c={BLUE_LIGHT} title="Concluídas" sub="esta semana" ct={conSemana.length} />
                <div className="cb"><Concluidas conSemana={conSemana} /></div>
              </div>
            }
            <div className="card gau" style={{ "--c": ORANGE }}>
              <CardHead c={ORANGE} title="Desempenho do dia" />
              <Desempenho noPrazoPct={noPrazoPct} gstats={gstats} gmax={gmax} machines={machines} totalCon={totalCon} />
            </div>
          </div>

          {/* INFERIOR: pequenos (esq.) + gantt (dir.) */}
          {(showSmall || hasTL) &&
            <div className="bottom">
              {showSmall &&
                <div className="smallzone">
                  {showPrio &&
                    <div className="card sm" style={{ "--c": ORANGE }}>
                      <CardHead c={ORANGE} title="Prioritárias" ct={prioritarias.length} />
                      <div className="cb"><Prioritarias prioritarias={prioritarias} /></div>
                    </div>
                  }
                  {showNts &&
                    <div className="card sm" style={{ "--c": RED }}>
                      <CardHead c={RED} title="NTS" ct={nts.length} />
                      <div className="cb"><Nts nts={nts} /></div>
                    </div>
                  }
                  {showProx &&
                    <div className="card sm" style={{ "--c": BLUE }}>
                      <CardHead c={BLUE} title="A seguir" ct={aSeguir.length} />
                      <div className="cb"><ASeguir proximas={aSeguir} /></div>
                    </div>
                  }
                  {showStb &&
                    <div className="card sm" style={{ "--c": SILVER_DK }}>
                      <CardHead c={SILVER_DK} title="Standby" ct={standby.length} />
                      <div className="cb"><Standby standby={standby} /></div>
                    </div>
                  }
                </div>
              }
              {hasTL &&
                <div className="ganttzone">
                  <div className="card tl" style={{ "--c": BLUE }}>
                    <CardHead c={BLUE} title="Linha do tempo" sub="próximos 14 dias" />
                    <div className="cb"><Timeline machines={machines} /></div>
                  </div>
                </div>
              }
            </div>
          }

        </div>
      </div>
      <div className="ind-hazard thin" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSS — INDUSTRIAL: papel técnico + hazard + glass · laranja & prata
// ─────────────────────────────────────────────────────────────────────────────
const CSS_INDUSTRIAL = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Archivo:wght@600;700;800;900&display=swap');

.ind-root{
  --bg:#FFFFFF; --txt:#141414; --mut:#6B6862; --faint:#9A968C;
  --line:rgba(20,20,20,.14); --line2:rgba(20,20,20,.22);
  /* painéis = vidro preto · KPIs = vidro prateado */
  --panel:rgba(0,0,0,.82); --panel2:rgba(255,255,255,.06);
  --kpi-bg:rgba(165,168,166,.42); --kpi-bd:rgba(165,168,166,.55);
  --card-bd:rgba(165,168,166,.45);
  /* texto dentro dos painéis pretos */
  --ct-txt:#EDEFF3; --ct-mut:rgba(220,222,228,.62); --ct-faint:rgba(200,202,210,.4);
  --ct-line:rgba(255,255,255,.08); --ct-line2:rgba(255,255,255,.14);
  --ct-row:rgba(255,255,255,.04); --ct-rowbd:rgba(255,255,255,.07);
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  --orange:#DD7900; --orange-dk:#B85F00; --silver:#A5A8A6; --silver-dk:#6E7170;
  --red:#C8102E; --pink:#C25A8C; --blue:#2A6BE0; --bluel:#3A8FD0; --green:#1E7A46;
  --gap:clamp(5px,.55vw,10px);
  position:absolute; inset:0; height:100%; width:100%;
  font-family:'IBM Plex Mono',monospace; color:var(--txt);
  letter-spacing:-.01em; -webkit-font-smoothing:antialiased; overflow:hidden;
  background:var(--bg);
}
.ind-root *{box-sizing:border-box; margin:0; padding:0}
/* fita zebrada laranja STILL + prata */
.ind-root .ind-hazard{height:13px; flex-shrink:0;
  background:repeating-linear-gradient(-45deg,#DD7900 0 16px,#A5A8A6 16px 32px)}
.ind-root .ind-hazard.thin{height:9px}
.ind-root .app{height:calc(100% - 22px); display:flex; flex-direction:column; padding:clamp(5px,.6vw,12px); gap:var(--gap)}

/* ===== glass base — KPIs prateado, painéis preto ===== */
.ind-root .kpi{
  background:var(--kpi-bg); border:1px solid var(--kpi-bd); border-radius:4px;
  box-shadow:0 1px 4px rgba(20,20,20,.1), inset 0 1px 0 rgba(255,255,255,.7); position:relative;
}
.ind-root .card{
  background:var(--panel); border:1px solid var(--card-bd); border-radius:4px;
  box-shadow:0 2px 10px rgba(20,20,20,.18), inset 0 1px 0 rgba(255,255,255,.06); position:relative;
}
.ind-root .pill,.ind-root .themebtn{
  background:var(--kpi-bg); border:1px solid var(--kpi-bd); border-radius:4px;
  box-shadow:0 1px 3px rgba(20,20,20,.08); position:relative;
}
@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .ind-root .kpi{ -webkit-backdrop-filter:blur(8px) saturate(140%); backdrop-filter:blur(8px) saturate(140%); background:rgba(165,168,166,.4); }
  .ind-root .card{ -webkit-backdrop-filter:blur(12px) saturate(120%); backdrop-filter:blur(12px) saturate(120%); background:rgba(0,0,0,.78); }
  .ind-root .pill,.ind-root .themebtn{ -webkit-backdrop-filter:blur(8px) saturate(140%); backdrop-filter:blur(8px) saturate(140%); background:rgba(165,168,166,.4); }
}
.ind-root .card::after,.ind-root .kpi::after{
  content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.5), transparent 22%);
}
.ind-root .card::after{ background:linear-gradient(180deg, rgba(255,255,255,.07), transparent 22%); }

/* ===== HEADER ===== */
.ind-root .head{display:flex; align-items:center; gap:14px; flex:none}
.ind-root .logo{width:clamp(36px,2.8vw,46px); height:clamp(36px,2.8vw,46px); border-radius:4px; overflow:hidden; flex:none;
  background:rgba(20,20,20,.06); border:1px solid var(--line);
  box-shadow:0 1px 3px rgba(20,20,20,.1); display:grid; place-items:center}
.ind-root .logo img{width:100%; height:100%; object-fit:contain}
.ind-root .brand{display:flex; align-items:baseline; gap:0}
.ind-root .brand b{font-family:'Archivo',sans-serif; font-size:clamp(17px,1.4vw,24px); font-weight:900; letter-spacing:.18em; line-height:1;
  color:var(--orange); text-shadow:0 0 8px rgba(232,115,12,.3)}
.ind-root .brand-sep{font-size:clamp(13px,1vw,18px); color:var(--silver-dk); font-weight:400; margin:0 6px; line-height:1}
.ind-root .brand-still{font-family:'Archivo',sans-serif; font-size:clamp(11px,.9vw,15px); color:var(--silver-dk); font-weight:700; letter-spacing:.14em; line-height:1}
.ind-root .head .right{margin-left:auto; display:flex; align-items:center; gap:12px}
.ind-root .pill{display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#141414; padding:7px 12px; border-radius:4px;
  text-transform:uppercase; letter-spacing:.08em}
.ind-root .pill .dot{width:8px; height:8px; border-radius:50%; background:var(--red);
  box-shadow:0 0 6px var(--red); animation:indbp 2s infinite}
.ind-root .pill.paused .dot{background:var(--orange); box-shadow:0 0 5px var(--orange); animation:none}
@keyframes indbp{50%{opacity:.4}}
.ind-root .clock{font-family:var(--mono); font-weight:700; font-size:clamp(12px,1.05vw,19px); color:#141414; font-variant-numeric:tabular-nums;
  background:rgba(165,168,166,.3); border:1px solid var(--kpi-bd); padding:5px 10px; border-radius:4px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
.ind-root .clock small{color:var(--silver-dk); font-weight:500; font-size:11px; margin-left:8px; text-transform:capitalize}
.ind-root .themebtn{width:34px; height:34px; border-radius:4px; color:#141414; font-size:15px; cursor:pointer; display:grid; place-items:center}
.ind-root .themebtn:hover{color:var(--orange); border-color:var(--orange)}

/* ===== KPI row — vidro prateado, texto escuro destacado ===== */
.ind-root .kpis{display:grid; grid-template-columns:repeat(7,1fr); gap:clamp(8px,.7vw,14px); flex:none}
.ind-root .kpi{padding:clamp(6px,.55vw,11px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; overflow:hidden; text-align:center}
.ind-root .kpi .lab{font-size:clamp(7px,.6vw,10px); font-weight:800; letter-spacing:.08em; color:#2A2825; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:6px}
.ind-root .kpi .lab i{width:7px; height:7px; border-radius:1px; background:var(--c); flex:none; box-shadow:0 0 5px var(--c)}
.ind-root .kpi .num{font-size:clamp(17px,1.7vw,28px); font-weight:700; line-height:1; letter-spacing:-.03em; font-family:var(--mono); color:#0A0A0A; text-shadow:0 1px 0 rgba(255,255,255,.4)}
.ind-root .kpi.alert{border-color:rgba(200,16,46,.5); background:rgba(200,16,46,.12)}
.ind-root .kpi.alert .num{color:var(--red)}

/* ===== MAIN — flex dinâmico ===== */
.ind-root .main{flex:1; min-height:0; display:flex; flex-direction:column; gap:var(--gap)}
.ind-root .top{display:flex; gap:var(--gap); flex:1.5 1 0; min-height:0}
.ind-root .bottom{display:flex; gap:var(--gap); flex:1 1 0; min-height:0}
.ind-root .top > .card{min-width:0}
.ind-root .top > .and{flex:2.4 1 0} .ind-root .top > .rec{flex:1.35 1 0}
.ind-root .top > .con{flex:1.35 1 0} .ind-root .top > .gau{flex:1.2 1 0}
.ind-root .smallzone{display:flex; gap:var(--gap); flex:2.1 1 0; min-width:0}
.ind-root .smallzone > .card{flex:1 1 0; min-width:0}
.ind-root .ganttzone{display:flex; flex:1.0 1 0; min-width:0}
.ind-root .ganttzone > .card{flex:1 1 0; min-width:0}

/* todos os cards = vidro preto, texto claro */
.ind-root .card{display:flex; flex-direction:column; min-height:0; overflow:hidden; color:var(--ct-txt)}
.ind-root .ch{display:flex; align-items:center; gap:9px; padding:7px 12px 6px; border-bottom:1px solid var(--ct-line); flex:none}
.ind-root .ch h3{font-family:'Archivo',sans-serif; font-size:clamp(9px,.82vw,13px); font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--ct-txt)}
.ind-root .ch .mk{width:8px; height:8px; border-radius:1px; background:var(--c); flex:none; box-shadow:0 0 8px var(--c)}
.ind-root .ch .sub{font-size:11px; color:var(--ct-mut); font-weight:500}
.ind-root .ch .ct{margin-left:auto; font-family:var(--mono); font-size:12px; font-weight:700; color:var(--ct-txt); background:var(--panel2); border:1px solid var(--ct-line2); padding:3px 9px; border-radius:3px}
.ind-root .cb{flex:1; min-height:0; overflow:hidden; padding:5px 9px 7px; display:flex; flex-direction:column}

.ind-root .card.sm .ch{padding:6px 10px 5px}
.ind-root .card.sm .ch h3{font-size:clamp(8px,.75vw,11px)}
.ind-root .card.sm .cb{padding:4px 7px 6px}

.ind-root .tdot{border-radius:50%; flex:none; display:inline-block}
.ind-root .pxempty{color:var(--ct-faint); font-size:12px; padding:14px 4px; text-align:center}

/* ===== EM ANDAMENTO (tabela) ===== */
.ind-root .thead,.ind-root .trow{display:grid; grid-template-columns:1.7fr 1.05fr 1.4fr .8fr 26px; gap:12px; align-items:center}
.ind-root .thead{padding:5px 10px; font-size:10px; font-weight:700; letter-spacing:.08em; color:var(--ct-mut); text-transform:uppercase; flex:none}
.ind-root .thead .r{text-align:right}
.ind-root .trows{display:flex; flex-direction:column; gap:3px; flex:1; min-height:0; animation:indFade .5s ease}
.ind-root .trow{padding:5px 8px; border-radius:4px; background:var(--ct-row); border:1px solid var(--ct-rowbd); position:relative}
.ind-root .trow.crit{background:rgba(200,16,46,.16); border-color:rgba(200,16,46,.4)}
.ind-root .trow .nsc{display:flex; align-items:center; gap:9px; min-width:0}
.ind-root .trow .sd{width:9px; height:9px; border-radius:50%; background:var(--st); flex:none; box-shadow:0 0 0 3px color-mix(in srgb,var(--st) 22%,transparent), 0 0 6px var(--st)}
.ind-root .trow .ns{font-family:var(--mono); font-weight:700; font-size:clamp(10px,.88vw,14px); color:var(--ct-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ind-root .trow .ns small{color:var(--ct-mut); font-weight:500; font-size:.8em}
.ind-root .trow .mo{font-size:11px; color:var(--ct-mut); font-family:var(--mono); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ind-root .badges{display:flex; gap:5px; flex-wrap:wrap}
.ind-root .bdg{font-size:9.5px; font-weight:700; letter-spacing:.04em; padding:2px 7px; border-radius:3px; white-space:nowrap; text-transform:uppercase}
.ind-root .bdg.prio{color:#FFC07A; background:rgba(232,115,12,.22)}
.ind-root .bdg.nts{color:#fff; background:var(--red)}
.ind-root .bdg.recon{color:#F0A8D0; background:rgba(194,90,140,.25)}
.ind-root .bdg.acp{color:#A8C8FF; background:rgba(42,107,224,.25)}
.ind-root .bdg.run{color:#7FE0B0; background:rgba(30,122,70,.25)}
.ind-root .bdg.servico{color:#C8C6C2; background:rgba(168,168,168,.2)}
.ind-root .prog{display:flex; align-items:center; gap:9px}
.ind-root .prog .bar{flex:1; height:7px; border-radius:100px; background:rgba(255,255,255,.08); overflow:hidden}
.ind-root .prog .bar i{display:block; height:100%; border-radius:100px; transition:width .6s ease; box-shadow:0 0 6px currentColor}
.ind-root .prog .pct{font-family:var(--mono); font-size:11.5px; font-weight:600; color:var(--ct-txt); width:36px; text-align:right}
.ind-root .rem{font-family:var(--mono); font-weight:700; font-size:clamp(12px,1.05vw,15px); text-align:right; color:var(--ct-txt)}
.ind-root .rem.over{color:#FF6B6B}
.ind-root .rem small{display:block; font-size:8.5px; color:var(--ct-mut); font-weight:600; letter-spacing:.04em}

/* ===== DESEMPENHO ===== */
.ind-root .desemp-cb{overflow:hidden}
.ind-root .desemp-slide{display:flex; flex-direction:column; gap:8px; height:100%; animation:indFade .5s ease}
.ind-root .desemp-fig{display:flex; justify-content:center; align-items:center; flex:1; min-height:0}
.ind-root .desemp-fig--donut{flex:1.2}
.ind-root .desemp-fig--bars{align-items:stretch; padding:2px 0}
.ind-root .desemp-bars{display:flex; flex-direction:column; gap:clamp(5px,.55vw,9px); flex-shrink:0; padding-top:6px; border-top:1px solid var(--ct-line)}
.ind-root .barchart{display:flex; align-items:flex-end; gap:clamp(2px,.3vw,4px); height:100%; width:100%}
.ind-root .barchart .bx{flex:1; display:flex; align-items:flex-end; justify-content:center; height:100%; min-width:0}
.ind-root .barchart .bx i{width:100%; border-radius:2px 2px 1px 1px; display:block; transition:height .5s ease; opacity:.7}
.ind-root .barchart .bx.now i{opacity:1; box-shadow:0 0 8px currentColor, inset 0 0 0 1.5px rgba(255,255,255,.4)}
.ind-root .gaufade{animation:indFade .5s ease}
.ind-root .trir{position:relative; width:clamp(80px,8vw,130px); flex:none; aspect-ratio:200/190}
.ind-root .trir svg{width:100%; height:100%; display:block}
.ind-root .trir .tric{position:absolute; left:0; right:0; top:39%; transform:translateY(-50%); text-align:center; pointer-events:none}
.ind-root .trir .tric b{display:block; font-family:var(--mono); font-weight:700; font-size:clamp(16px,1.8vw,26px); line-height:1; color:var(--ct-txt)}
.ind-root .trir .tric b i{font-style:normal; font-size:.5em; margin-left:1px; opacity:.85; vertical-align:.35em}
.ind-root .trir .tric span{display:block; font-size:7px; color:var(--ct-mut); font-weight:600; letter-spacing:.08em; text-transform:uppercase; margin-top:2px}
.ind-root .donut{position:relative; width:clamp(72px,7vw,110px); flex:none; aspect-ratio:1/1}
.ind-root .donut svg{width:100%; height:100%; display:block}
.ind-root .donutc{position:absolute; inset:0; display:grid; place-content:center; text-align:center}
.ind-root .donutc b{font-family:var(--mono); font-weight:700; font-size:clamp(14px,1.5vw,22px); line-height:1; color:var(--ct-txt)}
.ind-root .donutc span{font-size:9px; color:var(--ct-mut); font-weight:600; letter-spacing:.06em; text-transform:uppercase; margin-top:2px}
.ind-root .gstats{flex:1; display:flex; flex-direction:column; gap:clamp(8px,1.1vw,14px); min-width:0}
.ind-root .gstat .gl{display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:5px}
.ind-root .gstat .gl .lg{display:flex; align-items:center; gap:6px; color:var(--ct-mut); font-weight:500}
.ind-root .gstat .gl .lg i{width:9px; height:9px; border-radius:2px; flex:none}
.ind-root .gstat .gl b{font-family:var(--mono); font-weight:700; color:var(--ct-txt)}
.ind-root .gstat .gb{height:6px; border-radius:100px; background:rgba(255,255,255,.08); overflow:hidden}
.ind-root .gstat .gb i{display:block; height:100%; border-radius:100px; box-shadow:0 0 4px currentColor}

/* ===== quadros pequenos ===== */
.ind-root .mlist{display:flex; flex-direction:column; gap:3px; height:100%; overflow:hidden; justify-content:flex-start; animation:indFade .5s ease}
.ind-root .mrow{display:flex; flex-direction:column; gap:1px; background:var(--panel2); border:1px solid var(--ct-line); border-radius:4px; padding:4px 8px; flex-shrink:0}
.ind-root .mrow .mtop{display:flex; align-items:center; gap:6px; flex-shrink:0}
.ind-root .mrow .mn{font-family:var(--mono); font-weight:700; font-size:10.5px; color:var(--ct-txt); white-space:nowrap; overflow:visible}
.ind-root .mrow .mbot{display:flex; align-items:center; justify-content:space-between; gap:4px; padding-left:13px; flex-shrink:0}
.ind-root .mrow .mm{font-size:8.5px; color:var(--ct-mut); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1}
.ind-root .mrow .mv{font-family:var(--mono); font-weight:700; font-size:10px; white-space:nowrap; flex:none; margin-left:6px}

/* ===== TIMELINE ===== */
.ind-root .tlhead{display:grid; grid-template-columns:160px 1fr; align-items:center; padding:0 2px 7px; border-bottom:1px solid var(--ct-line); margin-bottom:8px; flex:none}
.ind-root .tlscale{display:grid; grid-template-columns:repeat(15,1fr); font-family:var(--mono); font-size:9.5px; color:var(--ct-faint)}
.ind-root .tlscale b{text-align:center; font-weight:600} .ind-root .tlscale b.now{color:#FF6B6B}
.ind-root .tlrows{display:flex; flex-direction:column; gap:5px; position:relative; flex:1; min-height:0; overflow:hidden}
.ind-root .tlrow{display:grid; grid-template-columns:160px 1fr; align-items:center}
.ind-root .tlrow .l{display:flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; color:var(--ct-mut); padding-right:10px; min-width:0}
.ind-root .tlrow .l .lt{white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ind-root .track{position:relative; height:20px; background:rgba(255,255,255,.04); border-radius:4px; border:1px solid var(--ct-line)}
.ind-root .tbar{position:absolute; top:0; height:20px; border-radius:3px; display:flex; align-items:center; padding:0 9px; font-family:var(--mono); font-size:9.5px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden}
.ind-root .tbar.run{background:var(--green)} .ind-root .tbar.over{background:var(--red)} .ind-root .tbar.fila{background:var(--silver); color:#141414}
.ind-root .tnow{position:absolute; top:0; bottom:0; width:2px; background:#FF6B6B; z-index:3; box-shadow:0 0 6px #FF6B6B}
.ind-root .tlempty{color:var(--ct-faint); font-size:12px; padding:14px 4px}

/* ===== RECON (funil) ===== */
.ind-root .funnel{display:flex; height:28px; border-radius:4px; overflow:hidden; margin-bottom:11px; flex:none; border:1px solid var(--ct-line)}
.ind-root .funnel .seg{display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:11px; font-weight:700; color:#fff; min-width:0}
.ind-root .funnel .s1{background:var(--green)}
.ind-root .funnel .s2{background:rgba(194,90,140,.35); color:#F0A8D0}
.ind-root .funnel .s3{background:rgba(58,143,208,.35); color:#A8D8F0}
.ind-root .recleg{display:flex; gap:14px; font-size:11px; margin-bottom:10px; flex:none; flex-wrap:wrap}
.ind-root .recleg .x{display:flex; align-items:center; gap:6px; color:var(--ct-mut); font-weight:500; opacity:.55; transition:opacity .3s}
.ind-root .recleg .x i{width:9px; height:9px; border-radius:2px}
.ind-root .recleg .x.on{color:var(--ct-txt); font-weight:700; opacity:1}
.ind-root .recchips{display:flex; gap:7px; flex-wrap:wrap; align-content:flex-start; overflow:hidden; flex:1; animation:indFade .5s ease}
.ind-root .rchip{font-family:var(--mono); font-size:11px; color:var(--ct-txt); background:var(--panel2); border:1px solid var(--ct-line2); border-radius:4px; padding:6px 10px; border-left:3px solid var(--pink); white-space:nowrap}
.ind-root .rchip.run{border-left-color:var(--green)} .ind-root .rchip.done{border-left-color:var(--bluel)}

/* ===== CONCLUÍDAS ===== */
.ind-root .clist{display:flex; flex-direction:column; gap:7px; height:100%; overflow:hidden; animation:indFade .5s ease}
.ind-root .crow{display:flex; align-items:center; gap:10px; background:var(--panel2); border:1px solid var(--ct-line); border-radius:4px; padding:7px 11px}
.ind-root .crow .ck{width:20px; height:20px; border-radius:3px; background:rgba(58,143,208,.25); color:#A8D8F0; display:grid; place-items:center; font-size:12px; flex:none}
.ind-root .crow .cn{display:flex; align-items:center; gap:6px; font-family:var(--mono); font-weight:600; font-size:13px; color:var(--ct-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ind-root .crow .cm{font-size:9.5px; color:var(--ct-mut); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ind-root .crow .cti{margin-left:auto; font-family:var(--mono); font-weight:700; font-size:12px; color:#A8D8F0}

@keyframes indFade{from{opacity:0} to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ind-root *{animation:none!important; transition:none!important}}
`;