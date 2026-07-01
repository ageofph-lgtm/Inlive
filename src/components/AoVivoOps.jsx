// ─────────────────────────────────────────────────────────────────────────────
// AoVivoOps — pele "OPERATIONS" (tela única, layout dinâmico).
// Cores por tipo de máquina (em todas as instâncias): ACP azul · NTS vermelho ·
// RECON rosa choque. Quadros pequenos (Prioritárias/NTS/A seguir/Standby) no
// canto inferior esquerdo; gantt no inferior direito; destaques + Desempenho no
// topo. Painéis aparecem/desaparecem consoante existam dados.
// Render-only: recebe os dados já calculados via props do AoVivo.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";

// ── Paleta ───────────────────────────────────────────────────────────────────
const RED = "#FB5E5E", BLUE = "#5B8CFF", PINK = "#FF2D95", GREEN = "#2FD3A5";
const ORANGE_DARK = "#E8730C", YELLOW_LIGHT = "#FFDD57", BLUE_LIGHT = "#5AB8FF";
const BRAND_RED = "#F5484D";
const TYPE = {
  nts:   { key: "nts",   color: RED,  label: "NTS"   },
  recon: { key: "recon", color: PINK, label: "RECON" },
  acp:   { key: "acp",   color: BLUE, label: "ACP"   },
};

// ── Helpers locais (duplicados p/ isolamento; pequenos e estáveis) ──────────
const pad2 = n => String(n).padStart(2, "0");
function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const abs = Math.abs(Math.round(s)); const sign = s < 0 ? "-" : "";
  return `${sign}${pad2(Math.floor(abs/3600))}:${pad2(Math.floor((abs%3600)/60))}:${pad2(abs%60)}`;
}
function useLiveTimer(m) {
  const ref = useRef(m);
  useEffect(() => { ref.current = m; });
  function calcNow(mm) {
    const acc = Number(mm?.timer_accumulated_seconds) || 0;
    const at  = mm?.timer_started_at ? new Date(mm.timer_started_at).getTime() : null;
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
// Tipo de máquina (para o indicador discreto em qualquer quadro)
function machineType(m) {
  if (m.tipo === "nova") return TYPE.nts;
  if (tierRecon(m))      return TYPE.recon;
  return TYPE.acp;
}
const JORDAN_URL = "https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png";

// Janela rotativa: se items > size, avança uma "página" a cada intervalo.
function useRotatingWindow(items, size, intervalMs) {
  const n = items.length;
  const [off, setOff] = useState(0);
  useEffect(() => {
    if (n <= size) { setOff(0); return; }
    const id = setInterval(() => setOff(o => (o + size) % n), intervalMs);
    return () => clearInterval(id);
  }, [n, size, intervalMs]);
  if (n <= size) return { slice: items, off: 0, rotating: false };
  const start = off % n;
  const slice = Array.from({ length: size }, (_, i) => items[(start + i) % n]);
  return { slice, off, rotating: true };
}

// Indicador de tipo discreto (dot colorido) — usado em qualquer quadro
function TypeDot({ m, size = 7 }) {
  const t = machineType(m);
  return <span className="tdot" title={t.label}
    style={{ width: size, height: size, background: t.color, boxShadow: `0 0 5px ${t.color}` }} />;
}

// ── Relógio ──────────────────────────────────────────────────────────────────
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

// ── Gauge: triângulo invertido (reator ark) — vermelho com glow ──────────────
function TriReactor({ pct }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const col = BLUE_LIGHT;
  const tri = "M34,42 L166,42 L100,168 Z";
  return (
    <div className="trir">
      <svg viewBox="0 0 200 190" preserveAspectRatio="xMidYMid meet">
        <path d={tri} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" strokeLinejoin="round" />
        <path d={tri} pathLength="100" fill="none" stroke={col} strokeWidth="10"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="100" strokeDashoffset={100 - p}
          style={{ filter: `drop-shadow(0 0 4px #fff) drop-shadow(0 0 10px ${col}99)` }} />
        <circle cx="100" cy="134" r="4" fill="#fff" style={{ filter: `drop-shadow(0 0 6px #fff)` }} />
      </svg>
      <div className="tric">
        <b style={{ color: "#fff", textShadow: `0 0 10px rgba(255,255,255,.7), 0 2px 8px rgba(0,0,0,.6)` }}>{p}<i>%</i></b>
        <span>No prazo</span>
      </div>
    </div>
  );
}

// ── Donut: distribuição das máquinas por tipo (NTS/ACP/RECON) ────────────────
function TypeDonut({ machines }) {
  const counts = { nts: 0, acp: 0, recon: 0 };
  machines.forEach(m => { counts[machineType(m).key]++; });
  const total = machines.length || 1;
  const segs = [
    { ...TYPE.acp,   n: counts.acp },
    { ...TYPE.nts,   n: counts.nts },
    { ...TYPE.recon, n: counts.recon },
  ];
  const r = 58, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="gauwrap">
      <div className="donut">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="16" />
          {segs.map((s, i) => {
            const frac = s.n / total;
            const dash = C * frac, off = -acc * C;
            acc += frac;
            if (s.n === 0) return null;
            return <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off}
              transform="rotate(-90 80 80)" strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />;
          })}
        </svg>
        <div className="donutc"><b>{machines.length}</b><span>máquinas</span></div>
      </div>
      <div className="gstats">
        {segs.map((s, i) => (
          <div key={i} className="gstat">
            <div className="gl"><span className="lg"><i style={{ background: s.color }} />{s.label}</span><b>{s.n}</b></div>
            <div className="gb"><i style={{ width: (s.n / total * 100) + "%", background: s.color }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Desempenho do dia — rota entre reator "no prazo" e donut de tipos ─────────
function Desempenho({ noPrazoPct, gstats, gmax, machines }) {
  const [view, setView] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setView(v => (v + 1) % 2), 8000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="cb">
      <div className="gauwrap gaufade" key={view}>
        {view === 0 ? (
          <>
            <TriReactor pct={noPrazoPct} />
            <div className="gstats">
              {gstats.map((g, i) => (
                <div key={i} className="gstat">
                  <div className="gl"><span className="lg"><i style={{ background: g[2] }} />{g[0]}</span><b>{g[1]}</b></div>
                  <div className="gb"><i style={{ width: (g[1] / gmax * 100) + "%", background: g[2] }} /></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <TypeDonut machines={machines} />
        )}
      </div>
    </div>
  );
}

// ── EM ANDAMENTO (destaque · fundo claro) ────────────────────────────────────
function Trow({ m }) {
  const elapsed  = useLiveTimer(m);
  const meta     = Number(m.tempo_estimado_segundos) || 0;
  const ratio    = meta > 0 ? elapsed / meta : 0;
  const restante = meta > 0 ? meta - elapsed : null;
  const over     = restante !== null && restante < 0;
  const run      = m.timer_status === "running";
  const paused   = m.timer_status?.startsWith("paused");
  const crit     = m.tipo === "nova" && over;
  const st = over ? RED : ratio >= 0.9 ? "#F5B13D" : run ? GREEN : paused ? "#F5B13D" : "#9AA3B2";
  const ns = nsSplit(m.serie);
  const tt = machineType(m);
  const badges = [[tt.key, tt.label]];
  if (run)          badges.push(["run", "RUN"]);
  if (m.prioridade) badges.push(["prio", "PRIO"]);
  const ini = (m.serie || "").replace(/[^0-9]/g, "").slice(-2) || "··";
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
      <div className="tech">{ini}</div>
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
      <div className="trows" key={win.off}>{rows.map(m => <Trow key={m.id} m={m} />)}</div>
    </>
  );
}

// ── Quadros pequenos: linha compacta em 2 níveis (NS nunca truncado) ─────────
function MiniRow({ m, v, vc }) {
  return (
    <div className="mrow">
      <div className="mtop"><TypeDot m={m} /><span className="mn">{nsSplit(m.serie).main}</span></div>
      <div className="mbot"><span className="mm">{m.modelo || "—"}</span><span className="mv" style={{ color: vc }}>{v}</span></div>
    </div>
  );
}
function Prioritarias({ prioritarias }) {
  const win = useRotatingWindow(prioritarias, 4, 9000);
  return (
    <div className="mlist" key={win.off}>
      {win.slice.map((m, i) => {
        const fim = fmtDateShort(m.previsao_fim);
        return <MiniRow key={m.id || i} m={m} v={fim ? `⚑ ${fim}` : "⚡"} vc={ORANGE_DARK} />;
      })}
    </div>
  );
}
function NtsMiniRow({ m }) {
  const elapsed = useLiveTimer(m);
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const d = meta > 0 ? elapsed - meta : 0;
  const v = meta > 0 ? `Δ ${(d > 0 ? "+" : "")}${fmtHMS(Math.abs(d))}` : "NTS";
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
        const wd = m.previsao_inicio
          ? new Date(m.previsao_inicio).toLocaleDateString("pt-PT", { weekday: "short" }).toUpperCase().replace(".", "")
          : "";
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
      {win.slice.map((m, i) => <MiniRow key={m.id || i} m={m} v={fmtHMS(Number(m.timer_accumulated_seconds) || 0)} vc={YELLOW_LIGHT} />)}
    </div>
  );
}

// ── GANTT / linha do tempo (inferior direito) ────────────────────────────────
function Timeline({ machines }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const BACK = 1, AHEAD = 13;
  const start = new Date(today); start.setDate(today.getDate() - BACK);
  const end   = new Date(today); end.setDate(today.getDate() + AHEAD + 1);
  const totalMs = end - start;
  const days = Array.from({ length: 15 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const todayPct = ((Date.now() - start.getTime()) / totalMs) * 100;
  const blocks = machines.map(m => {
    if (!m.previsao_inicio || !m.previsao_fim) return null;
    const pi = new Date(m.previsao_inicio + (String(m.previsao_inicio).length === 10 ? "T00:00:00" : ""));
    const pf = new Date(m.previsao_fim    + (String(m.previsao_fim).length    === 10 ? "T23:59:59" : ""));
    if (pf < start || pi > end) return null;
    const isActive = m.estado?.startsWith("em-preparacao");
    const run = m.timer_status === "running";
    const over = isActive && new Date() > pf;
    const a = ((Math.max(pi, start) - start) / totalMs) * 100;
    const b = ((Math.min(pf, end)   - start) / totalMs) * 100;
    return { m, a, b, run, isActive, over };
  }).filter(Boolean)
    .sort((x, y) => (x.isActive === y.isActive) ? x.a - y.a : x.isActive ? -1 : 1)
    .slice(0, 7);
  return (
    <>
      <div className="tlhead">
        <div />
        <div className="tlscale">
          {days.map((d, i) => (
            <b key={i} className={d.toDateString() === today.toDateString() ? "now" : ""}>{pad2(d.getDate())}</b>
          ))}
        </div>
      </div>
      <div className="tlrows">
        <div className="tnow" style={{ left: `calc(160px + ((100% - 160px)/100) * ${todayPct})` }} />
        {blocks.length === 0
          ? <div className="tlempty">Sem máquinas com previsão na janela</div>
          : blocks.map((bl, i) => {
            const cls = bl.over ? "over" : (bl.run || bl.isActive) ? "run" : "fila";
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

// ── RECONDICIONAMENTO (destaque) — rota entre em curso, fila e concluídas ────
function Recon({ reconAnd, reconAF, reconCon }) {
  const active  = reconAnd.filter(m => m.timer_status === "running" || m.timer_status?.startsWith("paused"));
  const waiting = [...reconAnd.filter(m => !(m.timer_status === "running" || m.timer_status?.startsWith("paused"))), ...reconAF];
  const nActive = active.length, nWait = waiting.length, nCon = reconCon.length;
  const total = Math.max(nActive + nWait + nCon, 1);
  const chips = [
    ...active.map(m => ({ m, cls: "run",  t: "Em curso"  })),
    ...waiting.map(m => ({ m, cls: "fila", t: tierRecon(m) || "Fila" })),
    ...reconCon.map(m => ({ m, cls: "done", t: "Concluída" })),
  ];
  const win = useRotatingWindow(chips, 10, 9000);
  return (
    <>
      <div className="funnel">
        <div className="seg s1" style={{ width: (nActive / total * 100) + "%" }}>{nActive || ""}</div>
        <div className="seg s2" style={{ width: (nWait / total * 100) + "%" }}>{nWait} em fila</div>
        <div className="seg s3" style={{ width: (nCon / total * 100) + "%" }}>{nCon || ""}</div>
      </div>
      <div className="recleg">
        <div className="x"><i style={{ background: GREEN }} />Em curso {nActive}</div>
        <div className="x"><i style={{ background: PINK }} />Fila {nWait}</div>
        <div className="x"><i style={{ background: BLUE_LIGHT }} />Concl. {nCon}</div>
      </div>
      <div className="recchips" key={win.off}>
        {chips.length === 0
          ? <div className="pxempty">Sem máquinas em recondicionamento</div>
          : win.slice.map((c, i) => (
            <div key={(c.m.id || i) + "-" + i} className={`rchip ${c.cls}`}>{c.cls === "done" ? "✓ " : ""}{nsSplit(c.m.serie).main} · {c.t}</div>
          ))}
      </div>
    </>
  );
}

// ── CONCLUÍDAS DA SEMANA (destaque) — detalhes em azul claro ─────────────────
function Concluidas({ conSemana }) {
  const win = useRotatingWindow(conSemana, 6, 10000);
  return (
    <div className="clist" key={win.off}>
      {win.slice.map((m, i) => {
        const t = m.timer_accumulated_seconds ? fmtHMS(m.timer_accumulated_seconds) : "—";
        const ns = nsSplit(m.serie);
        const tier = tierRecon(m);
        return (
          <div key={(m.id || i)} className="crow">
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

// ── Cabeçalho de painel ──────────────────────────────────────────────────────
function CardHead({ c, title, sub, ct }) {
  return (
    <div className="ch" style={{ "--c": c }}>
      <span className="mk" /><h3>{title}</h3>
      {sub && <span className="sub">{sub}</span>}
      {ct != null && <span className="ct">{pad2(ct)}</span>}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function AoVivoOps({ data, loading, paused, cycleTheme, theme }) {
  const { machines = [], andamento = [], standby = [], prioritarias = [], proximas = [],
          ntsAnd = [], ntsAF = [], reconAnd = [], reconAF = [], reconCon = [],
          conSemana = [], totalCon = [], conHoje = [], avgH = 0 } = data || {};

  const nts = [...ntsAnd, ...ntsAF];
  const aSeguir = proximas.filter(m => {
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
    { n: emCurso,          l: "Em andamento",      c: GREEN },
    { n: prioritarias.length, l: "Prioritárias",   c: ORANGE_DARK },
    { n: nts.length,       l: "NTS",               c: RED, alert: true },
    { n: nRecon,           l: "Recon",             c: PINK },
    { n: conSemana.length, l: "Concluídas · sem.", c: BLUE_LIGHT },
    { n: avgH ? avgH + "h" : "—", l: "Méd. por máq.", c: "#33C7E0" },
    { n: totalCon.length,  l: "Total 2026",        c: BLUE },
  ];

  // Gauge — estatísticas do dia (cores da paleta reflectidas)
  const gstats = [
    ["Em andamento", emCurso,             GREEN],
    ["Prioritárias", prioritarias.length, ORANGE_DARK],
    ["Standby",      standby.length,      YELLOW_LIGHT],
    ["Recon",        nRecon,              PINK],
  ];
  const gmax = Math.max(...gstats.map(g => g[1]), 1);

  // Flags dinâmicas
  const showAnd  = emCurso > 0;
  const showRec  = nReconTotal > 0;
  const showCon  = conSemana.length > 0;
  const showPrio = prioritarias.length > 0;
  const showNts  = nts.length > 0;
  const showProx = aSeguir.length > 0;
  const showStb  = standby.length > 0;
  const hasTL    = machines.some(hasPrevisao);
  const showSmall = showPrio || showNts || showProx || showStb;

  return (
    <div className="ops-root">
      <style>{CSS_OPS}</style>
      <div className="app">

        {/* HEADER */}
        <div className="head">
          <div className="logo"><img src={JORDAN_URL} alt="Watcher" /></div>
          <div className="brand"><b>Watcher</b><span>STILL</span></div>
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
          {KPI.map((k, i) => (
            <div key={i} className={`kpi${k.alert ? " alert" : ""}`} style={{ "--c": k.c }}>
              <div className="lab"><i />{k.l}</div>
              <div className="num">{loading ? "—" : k.n}</div>
            </div>
          ))}
        </div>

        {/* MAIN — flex dinâmico */}
        <div className="main">

          {/* TOPO: destaques + gauge */}
          <div className="top">
            {showAnd && (
              <div className="card hi and" style={{ "--c": GREEN }}>
                <CardHead c={GREEN} title="Em andamento" sub="tempo restante ao vivo" ct={emCurso} />
                <div className="cb"><EmAndamento andamento={andamento} /></div>
              </div>
            )}
            {showRec && (
              <div className="card hi rec" style={{ "--c": PINK }}>
                <CardHead c={PINK} title="Recondicionamento" ct={nReconTotal} />
                <div className="cb"><Recon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} /></div>
              </div>
            )}
            {showCon && (
              <div className="card hi con" style={{ "--c": BLUE_LIGHT }}>
                <CardHead c={BLUE_LIGHT} title="Concluídas" sub="esta semana" ct={conSemana.length} />
                <div className="cb"><Concluidas conSemana={conSemana} /></div>
              </div>
            )}
            {/* Desempenho — sempre visível, rotativo (reator ↔ donut) */}
            <div className="card gau" style={{ "--c": RED }}>
              <CardHead c={RED} title="Desempenho do dia" />
              <Desempenho noPrazoPct={noPrazoPct} gstats={gstats} gmax={gmax} machines={machines} />
            </div>
          </div>

          {/* INFERIOR: pequenos (esq.) + gantt (dir.) */}
          {(showSmall || hasTL) && (
            <div className="bottom">
              {showSmall && (
                <div className="smallzone">
                  {showPrio && (
                    <div className="card sm" style={{ "--c": ORANGE_DARK }}>
                      <CardHead c={ORANGE_DARK} title="Prioritárias" ct={prioritarias.length} />
                      <div className="cb"><Prioritarias prioritarias={prioritarias} /></div>
                    </div>
                  )}
                  {showNts && (
                    <div className="card sm" style={{ "--c": RED }}>
                      <CardHead c={RED} title="NTS" ct={nts.length} />
                      <div className="cb"><Nts nts={nts} /></div>
                    </div>
                  )}
                  {showProx && (
                    <div className="card sm" style={{ "--c": BLUE }}>
                      <CardHead c={BLUE} title="A seguir" ct={aSeguir.length} />
                      <div className="cb"><ASeguir proximas={aSeguir} /></div>
                    </div>
                  )}
                  {showStb && (
                    <div className="card sm" style={{ "--c": YELLOW_LIGHT }}>
                      <CardHead c={YELLOW_LIGHT} title="Standby" ct={standby.length} />
                      <div className="cb"><Standby standby={standby} /></div>
                    </div>
                  )}
                </div>
              )}
              {hasTL && (
                <div className="ganttzone">
                  <div className="card tl" style={{ "--c": BLUE }}>
                    <CardHead c={BLUE} title="Linha do tempo" sub="próximos 14 dias" />
                    <div className="cb"><Timeline machines={machines} /></div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSS — liquid glass sóbrio, leve (multiplataforma PC + TV/Chromecast)
// ─────────────────────────────────────────────────────────────────────────────
const CSS_OPS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

.ops-root{
  --bg:#080A0D; --txt:#E7EAF0; --mut:#9AA3B2; --faint:#626B7A;
  --line:rgba(255,255,255,.09); --line2:rgba(255,255,255,.14);
  --panel:rgba(20,24,30,.62); --panel2:rgba(255,255,255,.035);
  --hi:rgba(248,250,253,.93); --hi-txt:#0C0F14; --hi-mut:#5A6472; --hi-line:rgba(12,15,20,.08);
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --red:#FB5E5E; --pink:#FF2D95; --blue:#5B8CFF; --bluel:#5AB8FF; --green:#2FD3A5; --orange:#E8730C; --yellow:#FFDD57;
  --gap:clamp(9px,.85vw,15px);
  position:absolute; inset:0; height:100%; width:100%;
  font-family:'Inter',-apple-system,system-ui,sans-serif; color:var(--txt);
  letter-spacing:-.01em; -webkit-font-smoothing:antialiased; overflow:hidden;
  background:
    radial-gradient(60% 45% at 82% 8%, rgba(91,140,255,.10), transparent 60%),
    radial-gradient(55% 45% at 12% 92%, rgba(255,45,149,.08), transparent 60%),
    radial-gradient(50% 40% at 50% 120%, rgba(47,211,165,.06), transparent 60%),
    var(--bg);
}
.ops-root *{box-sizing:border-box; margin:0; padding:0}
.ops-root .app{height:100%; display:flex; flex-direction:column; padding:clamp(12px,1.1vw,20px); gap:var(--gap)}

/* ===== glass base ===== */
.ops-root .kpi,.ops-root .card,.ops-root .pill,.ops-root .themebtn{
  background:var(--panel); border:1px solid var(--line); border-radius:18px;
  box-shadow:0 8px 30px -12px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08); position:relative;
}
@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .ops-root .kpi,.ops-root .card,.ops-root .pill,.ops-root .themebtn{
    -webkit-backdrop-filter:blur(9px) saturate(150%); backdrop-filter:blur(9px) saturate(150%);
    background:rgba(20,24,30,.5);
  }
  .ops-root .card.hi{ background:rgba(248,250,253,.82); }
}
.ops-root .card::after,.ops-root .kpi::after{
  content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.10), transparent 26%);
}
.ops-root .card.hi::after{ background:linear-gradient(180deg, rgba(255,255,255,.7), transparent 22%); }

/* ===== HEADER ===== */
.ops-root .head{display:flex; align-items:center; gap:14px; flex:none}
.ops-root .logo{width:clamp(38px,3vw,48px); height:clamp(38px,3vw,48px); border-radius:13px; overflow:hidden; flex:none;
  background:rgba(255,255,255,.04); border:1px solid var(--line);
  box-shadow:0 6px 18px -6px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12); display:grid; place-items:center}
.ops-root .logo img{width:100%; height:100%; object-fit:contain}
.ops-root .brand b{font-size:clamp(18px,1.45vw,26px); font-weight:800; letter-spacing:-.02em; display:block; line-height:1;
  color:${BRAND_RED}; text-shadow:0 0 12px rgba(245,72,77,.45)}
.ops-root .brand span{font-size:clamp(10px,.82vw,13px); color:var(--mut); font-weight:700; letter-spacing:.28em}
.ops-root .head .right{margin-left:auto; display:flex; align-items:center; gap:12px}
.ops-root .pill{display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--mut); padding:8px 13px; border-radius:11px}
.ops-root .pill .dot{width:8px; height:8px; border-radius:50%; background:var(--red);
  box-shadow:0 0 7px var(--red), 0 0 0 3px rgba(251,94,94,.18); animation:opsbp 2s infinite}
.ops-root .pill.paused .dot{background:var(--yellow); box-shadow:0 0 6px var(--yellow),0 0 0 3px rgba(255,221,87,.18); animation:none}
@keyframes opsbp{50%{opacity:.5}}
.ops-root .clock{font-family:var(--mono); font-weight:700; font-size:clamp(16px,1.35vw,23px); color:var(--txt); font-variant-numeric:tabular-nums}
.ops-root .clock small{color:var(--mut); font-weight:600; font-size:12px; margin-left:8px; text-transform:capitalize}
.ops-root .themebtn{width:36px; height:36px; border-radius:11px; color:var(--mut); font-size:16px; cursor:pointer; display:grid; place-items:center}
.ops-root .themebtn:hover{color:var(--txt)}

/* ===== KPI row ===== */
.ops-root .kpis{display:grid; grid-template-columns:repeat(7,1fr); gap:clamp(8px,.7vw,14px); flex:none}
.ops-root .kpi{padding:clamp(11px,.85vw,16px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; overflow:hidden; text-align:center}
.ops-root .kpi .lab{font-size:clamp(9px,.72vw,11px); font-weight:700; letter-spacing:.06em; color:var(--mut); text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:6px}
.ops-root .kpi .lab i{width:7px; height:7px; border-radius:50%; background:var(--c); flex:none; box-shadow:0 0 6px var(--c)}
.ops-root .kpi .num{font-size:clamp(24px,2.2vw,36px); font-weight:700; line-height:1; letter-spacing:-.03em; font-family:var(--mono); color:#fff}
.ops-root .kpi.alert{border-color:rgba(251,94,94,.4)}

/* ===== MAIN — flex dinâmico ===== */
.ops-root .main{flex:1; min-height:0; display:flex; flex-direction:column; gap:var(--gap)}
.ops-root .top{display:flex; gap:var(--gap); flex:1.55 1 0; min-height:0}
.ops-root .bottom{display:flex; gap:var(--gap); flex:1 1 0; min-height:0}
.ops-root .top > .card{min-width:0}
.ops-root .top > .and{flex:2.4 1 0} .ops-root .top > .rec{flex:1.35 1 0}
.ops-root .top > .con{flex:1.35 1 0} .ops-root .top > .gau{flex:1.2 1 0}
.ops-root .smallzone{display:flex; gap:var(--gap); flex:1.75 1 0; min-width:0}
.ops-root .smallzone > .card{flex:1 1 0; min-width:0}
.ops-root .ganttzone{display:flex; flex:1.3 1 0; min-width:0}
.ops-root .ganttzone > .card{flex:1 1 0; min-width:0}

.ops-root .card{display:flex; flex-direction:column; min-height:0; overflow:hidden}
.ops-root .ch{display:flex; align-items:center; gap:9px; padding:12px 16px 10px; border-bottom:1px solid var(--line); flex:none}
.ops-root .ch h3{font-size:clamp(12px,1vw,14px); font-weight:700; letter-spacing:.01em}
.ops-root .ch .mk{width:8px; height:8px; border-radius:3px; background:var(--c); flex:none; box-shadow:0 0 8px var(--c)}
.ops-root .ch .sub{font-size:11.5px; color:var(--faint); font-weight:500}
.ops-root .ch .ct{margin-left:auto; font-family:var(--mono); font-size:12px; font-weight:700; color:var(--mut); background:var(--panel2); border:1px solid var(--line); padding:3px 9px; border-radius:7px}
.ops-root .cb{flex:1; min-height:0; overflow:hidden; padding:9px 13px 12px; display:flex; flex-direction:column}

.ops-root .card.sm .ch{padding:10px 13px 8px}
.ops-root .card.sm .ch h3{font-size:clamp(11px,.9vw,13px)}
.ops-root .card.sm .cb{padding:8px 10px 10px}

/* indicador de tipo discreto */
.ops-root .tdot{border-radius:50%; flex:none; display:inline-block}

/* ---- destaques (fundo claro) ---- */
.ops-root .card.hi{color:var(--hi-txt); border-color:var(--hi-line)}
.ops-root .card.hi .ch{border-bottom-color:var(--hi-line)}
.ops-root .card.hi .ch .sub{color:#8892A0}
.ops-root .card.hi .ch .ct{color:var(--hi-mut); background:rgba(12,15,20,.05); border-color:var(--hi-line)}
.ops-root .card.hi .pxempty{color:var(--hi-mut)}

/* ===== EM ANDAMENTO (tabela) ===== */
.ops-root .thead,.ops-root .trow{display:grid; grid-template-columns:1.7fr 1.05fr 1.4fr .8fr 26px; gap:12px; align-items:center}
.ops-root .thead{padding:5px 10px; font-size:10px; font-weight:700; letter-spacing:.05em; color:var(--hi-mut); text-transform:uppercase; flex:none}
.ops-root .thead .r{text-align:right}
.ops-root .trows{display:flex; flex-direction:column; gap:6px; flex:1; min-height:0; animation:opsFade .5s ease}
.ops-root .trow{padding:9px 10px; border-radius:11px; background:rgba(12,15,20,.04); border:1px solid rgba(12,15,20,.06); position:relative}
.ops-root .trow.crit{background:rgba(251,94,94,.10); border-color:rgba(251,94,94,.32)}
.ops-root .trow .nsc{display:flex; align-items:center; gap:9px; min-width:0}
.ops-root .trow .sd{width:9px; height:9px; border-radius:50%; background:var(--st); flex:none; box-shadow:0 0 0 3px color-mix(in srgb,var(--st) 22%,transparent)}
.ops-root .trow .ns{font-family:var(--mono); font-weight:700; font-size:clamp(13px,1.05vw,16px); color:var(--hi-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .trow .ns small{color:var(--hi-mut); font-weight:500; font-size:.8em}
.ops-root .trow .mo{font-size:11px; color:var(--hi-mut); font-family:var(--mono); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .badges{display:flex; gap:5px; flex-wrap:wrap}
.ops-root .bdg{font-size:9.5px; font-weight:700; letter-spacing:.02em; padding:2px 7px; border-radius:6px; white-space:nowrap}
.ops-root .bdg.prio{color:#9A5200; background:rgba(232,115,12,.20)}
.ops-root .bdg.nts{color:#fff; background:var(--red)}
.ops-root .bdg.recon{color:#B01E6B; background:rgba(255,45,149,.18)}
.ops-root .bdg.acp{color:#2A6BE0; background:rgba(91,140,255,.18)}
.ops-root .bdg.run{color:#0B7A5A; background:rgba(47,211,165,.20)}
.ops-root .prog{display:flex; align-items:center; gap:9px}
.ops-root .prog .bar{flex:1; height:7px; border-radius:100px; background:rgba(12,15,20,.10); overflow:hidden}
.ops-root .prog .bar i{display:block; height:100%; border-radius:100px; transition:width .6s ease}
.ops-root .prog .pct{font-family:var(--mono); font-size:11.5px; font-weight:600; color:var(--hi-mut); width:36px; text-align:right}
.ops-root .rem{font-family:var(--mono); font-weight:700; font-size:clamp(12px,1.05vw,15px); text-align:right; color:var(--hi-txt)}
.ops-root .rem.over{color:var(--red)}
.ops-root .rem small{display:block; font-size:8.5px; color:var(--hi-mut); font-weight:600; letter-spacing:.04em}
.ops-root .tech{width:22px; height:22px; border-radius:6px; background:rgba(12,15,20,.08); display:grid; place-items:center; font-size:9px; font-weight:700; color:var(--hi-txt); margin-left:auto; font-family:var(--mono)}

/* ===== GAUGE / DONUT ===== */
.ops-root .gauwrap{display:flex; align-items:center; gap:14px; height:100%}
.ops-root .gaufade{animation:opsFade .5s ease}
.ops-root .trir{position:relative; width:clamp(128px,11vw,180px); flex:none; aspect-ratio:200/190}
.ops-root .trir svg{width:100%; height:100%; display:block}
.ops-root .trir .tric{position:absolute; left:0; right:0; top:39%; transform:translateY(-50%); text-align:center; pointer-events:none}
.ops-root .trir .tric b{display:block; font-family:var(--mono); font-weight:700; font-size:clamp(24px,2.4vw,36px); line-height:1}
.ops-root .trir .tric b i{font-style:normal; font-size:.5em; margin-left:1px; opacity:.85; vertical-align:.35em}
.ops-root .trir .tric span{display:block; font-size:7px; color:var(--txt); opacity:.8; font-weight:600; letter-spacing:.03em; text-transform:uppercase; margin-top:2px; text-shadow:0 1px 8px rgba(0,0,0,.7)}
.ops-root .donut{position:relative; width:clamp(120px,10vw,164px); flex:none; aspect-ratio:1/1}
.ops-root .donut svg{width:100%; height:100%; display:block}
.ops-root .donutc{position:absolute; inset:0; display:grid; place-content:center; text-align:center}
.ops-root .donutc b{font-family:var(--mono); font-weight:700; font-size:clamp(22px,2vw,32px); line-height:1}
.ops-root .donutc span{font-size:9px; color:var(--mut); font-weight:600; letter-spacing:.06em; text-transform:uppercase; margin-top:2px}
.ops-root .gstats{flex:1; display:flex; flex-direction:column; gap:clamp(8px,1.1vw,14px); min-width:0}
.ops-root .gstat .gl{display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:5px}
.ops-root .gstat .gl .lg{display:flex; align-items:center; gap:6px; color:var(--mut); font-weight:500}
.ops-root .gstat .gl .lg i{width:9px; height:9px; border-radius:3px; flex:none}
.ops-root .gstat .gl b{font-family:var(--mono); font-weight:700}
.ops-root .gstat .gb{height:6px; border-radius:100px; background:rgba(255,255,255,.08); overflow:hidden}
.ops-root .gstat .gb i{display:block; height:100%; border-radius:100px}

/* ===== quadros pequenos: 2 níveis (NS nunca truncado) ===== */
.ops-root .mlist{display:flex; flex-direction:column; gap:6px; height:100%; overflow:hidden; animation:opsFade .5s ease}
.ops-root .mrow{display:flex; flex-direction:column; gap:3px; background:var(--panel2); border:1px solid var(--line); border-radius:9px; padding:7px 10px}
.ops-root .mrow .mtop{display:flex; align-items:center; gap:7px; min-width:0}
.ops-root .mrow .mn{font-family:var(--mono); font-weight:600; font-size:12.5px; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .mrow .mbot{display:flex; align-items:center; justify-content:space-between; gap:8px; padding-left:14px}
.ops-root .mrow .mm{font-size:9.5px; color:var(--mut); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0}
.ops-root .mrow .mv{font-family:var(--mono); font-weight:700; font-size:11px; white-space:nowrap; flex:none}

/* ===== TIMELINE ===== */
.ops-root .tlhead{display:grid; grid-template-columns:160px 1fr; align-items:center; padding:0 2px 7px; border-bottom:1px solid var(--line); margin-bottom:8px; flex:none}
.ops-root .tlscale{display:grid; grid-template-columns:repeat(15,1fr); font-family:var(--mono); font-size:9.5px; color:var(--faint)}
.ops-root .tlscale b{text-align:center; font-weight:600} .ops-root .tlscale b.now{color:var(--red)}
.ops-root .tlrows{display:flex; flex-direction:column; gap:5px; position:relative; flex:1; min-height:0; overflow:hidden}
.ops-root .tlrow{display:grid; grid-template-columns:160px 1fr; align-items:center}
.ops-root .tlrow .l{display:flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; color:var(--mut); padding-right:10px; min-width:0}
.ops-root .tlrow .l .lt{white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .track{position:relative; height:20px; background:rgba(255,255,255,.04); border-radius:7px}
.ops-root .tbar{position:absolute; top:0; height:20px; border-radius:7px; display:flex; align-items:center; padding:0 9px; font-family:var(--mono); font-size:9.5px; font-weight:600; color:#08110D; white-space:nowrap; overflow:hidden}
.ops-root .tbar.run{background:var(--green)} .ops-root .tbar.over{background:var(--red); color:#fff} .ops-root .tbar.fila{background:rgba(255,255,255,.14); color:var(--mut)}
.ops-root .tnow{position:absolute; top:0; bottom:0; width:2px; background:var(--red); z-index:3; box-shadow:0 0 8px var(--red)}
.ops-root .tlempty{color:var(--faint); font-size:12px; padding:14px 4px}

/* ===== RECON (funil) ===== */
.ops-root .funnel{display:flex; height:28px; border-radius:9px; overflow:hidden; margin-bottom:11px; flex:none}
.ops-root .funnel .seg{display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:11px; font-weight:700; color:#0B0D11; min-width:0}
.ops-root .funnel .s1{background:var(--green)}
.ops-root .funnel .s2{background:rgba(255,45,149,.20); color:#B01E6B}
.ops-root .funnel .s3{background:rgba(90,184,255,.24); color:#1E7BC0}
.ops-root .recleg{display:flex; gap:14px; font-size:11px; margin-bottom:10px; flex:none; flex-wrap:wrap}
.ops-root .recleg .x{display:flex; align-items:center; gap:6px; color:var(--hi-mut)} .ops-root .recleg .x i{width:9px; height:9px; border-radius:3px}
.ops-root .recchips{display:flex; gap:7px; flex-wrap:wrap; align-content:flex-start; overflow:hidden; flex:1; animation:opsFade .5s ease}
.ops-root .rchip{font-family:var(--mono); font-size:11px; color:var(--hi-txt); background:rgba(12,15,20,.05); border:1px solid var(--hi-line); border-radius:8px; padding:6px 10px; border-left:3px solid var(--pink); white-space:nowrap}
.ops-root .rchip.run{border-left-color:var(--green)} .ops-root .rchip.done{border-left-color:var(--bluel)}

/* ===== CONCLUÍDAS — detalhes azul claro ===== */
.ops-root .clist{display:flex; flex-direction:column; gap:7px; height:100%; overflow:hidden; animation:opsFade .5s ease}
.ops-root .crow{display:flex; align-items:center; gap:10px; background:rgba(12,15,20,.04); border:1px solid var(--hi-line); border-radius:10px; padding:7px 11px}
.ops-root .crow .ck{width:20px; height:20px; border-radius:6px; background:rgba(90,184,255,.20); color:#1E7BC0; display:grid; place-items:center; font-size:12px; flex:none}
.ops-root .crow .cn{display:flex; align-items:center; gap:6px; font-family:var(--mono); font-weight:600; font-size:13px; color:var(--hi-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .crow .cm{font-size:9.5px; color:var(--hi-mut); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .crow .cti{margin-left:auto; font-family:var(--mono); font-weight:700; font-size:12px; color:#1E7BC0}

.ops-root .pxempty{color:var(--faint); font-size:12px; padding:14px 4px; text-align:center}

@keyframes opsFade{from{opacity:0} to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ops-root *{animation:none!important; transition:none!important}}
`;