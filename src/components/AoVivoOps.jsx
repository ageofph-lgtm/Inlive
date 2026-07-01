// ─────────────────────────────────────────────────────────────────────────────
// AoVivoOps — 6ª pele de UI: OPERATIONS (tela única, sem rotação de slides).
// Baseada no mockup inlive_v12_ops.html, com as correcções pedidas:
//  · Destaque forte (fundo branco / liquid-glass claro): EM ANDAMENTO,
//    RECONDICIONAMENTO, CONCLUÍDAS DA SEMANA.
//  · Destaque menor (glass escuro sóbrio): STANDBY, A SEGUIR, NTS.
//  · Gauge "Desempenho do dia" = triângulo invertido estilo reator ark.
//  · Logo InLive (mascote) no canto superior esquerdo; sem "atualizado há Xs".
//  · Efeito Apple "liquid glass" (iOS) sóbrio e leve — pensado para correr
//    bem tanto no PC como na TV/Chromecast (blur moderado + fallback sólido,
//    sem animações pesadas).
//  · Painéis que transbordam rodam subtilmente entre as máquinas.
// Recebe TODOS os dados já calculados via props do AoVivo. Render-only.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";

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
function tipoIntervencao(m) {
  if (m.tipo === "nova") return { label: "NTS",   color: "#FB5E5E" };
  if (tierRecon(m))      return { label: "RECON", color: "#A98BFA" };
  return                        { label: "ACP",   color: "#33C7E0" };
}
function isOverdue(m) {
  if (!m.previsao_fim) return false;
  const conc = m.estado?.startsWith("concluida") || m.estado === "concluida";
  if (conc) return false;
  try { return new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : "")) < new Date(); }
  catch { return false; }
}
const JORDAN_URL = "https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png";

// Janela rotativa: se items > size, avança uma "página" a cada intervalo.
// Leve (um setInterval por painel) — sem animações caras, só troca de key.
function useRotatingWindow(items, size, intervalMs) {
  const n = items.length;
  const [off, setOff] = useState(0);
  useEffect(() => {
    if (n <= size) { setOff(0); return; }
    const id = setInterval(() => setOff(o => (o + size) % n), intervalMs);
    return () => clearInterval(id);
  }, [n, size, intervalMs]);
  if (n <= size) return { slice: items, off: 0, page: 0, pages: 1, rotating: false };
  const start = off % n;
  const slice = Array.from({ length: size }, (_, i) => items[(start + i) % n]);
  return { slice, off, page: Math.floor(start / size), pages: Math.ceil(n / size), rotating: true };
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

// ── Gauge: triângulo invertido estilo reator ark ─────────────────────────────
function TriReactor({ pct }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const col = p >= 85 ? "#2FD3A5" : p >= 60 ? "#F5B13D" : "#FB5E5E";
  const tri = "M26,54 L154,54 L90,160 Z";
  return (
    <div className="trir">
      <svg viewBox="0 0 180 180" preserveAspectRatio="xMidYMid meet">
        {/* triângulos concêntricos (profundidade do reator) */}
        <path d="M26,54 L154,54 L90,160 Z" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="11" strokeLinejoin="round" />
        <path d="M50,68 L130,68 L90,135 Z"  fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M66,78 L114,78 L90,118 Z"  fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="2" strokeLinejoin="round" />
        {/* progresso ao longo do triângulo exterior */}
        <path d={tri} pathLength="100" fill="none" stroke={col} strokeWidth="11"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="100" strokeDashoffset={100 - p}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        {/* núcleo */}
        <circle cx="90" cy="94" r="4.5" fill={col} style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
      </svg>
      <div className="tric"><b style={{ color: col }}>{p}%</b><span>No prazo</span></div>
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
  const st = over ? "#FB5E5E" : ratio >= 0.9 ? "#F5B13D" : run ? "#2FD3A5" : paused ? "#F5B13D" : "#9AA3B2";
  const ns = nsSplit(m.serie);
  const tier = tierRecon(m);
  const badges = [];
  if (m.tipo === "nova")       badges.push(["nts", "NTS"]);
  if (tier)                    badges.push(["recon", "RECON"]);
  if (run)                     badges.push(["run", "RUN"]);
  if (m.prioridade)            badges.push(["prio", "PRIO"]);
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

// ── NTS (destaque menor) ─────────────────────────────────────────────────────
function NtsRow({ m }) {
  const elapsed  = useLiveTimer(m);
  const meta     = Number(m.tempo_estimado_segundos) || 0;
  const deltaSec = meta > 0 ? elapsed - meta : 0;
  const bad      = deltaSec > 0;
  const ns       = nsSplit(m.serie);
  const dias = m.dataAtribuicao
    ? Math.max(0, Math.floor((Date.now() - new Date(m.dataAtribuicao).getTime()) / 86400000)) : null;
  const tags = [];
  if (dias != null) tags.push(`${dias}d`);
  tags.push(m.aguardaPecas ? "aguarda peças" : "peças OK");
  return (
    <div className="ntrow">
      <div className="t1">
        <span className="nns">{ns.main}{ns.sub && <small> · {ns.sub}</small>}</span>
        {meta > 0 && <span className={`delta2 ${bad ? "bad" : "ok"}`}>Δ {(bad ? "+" : "") + fmtHMS(Math.abs(deltaSec))}</span>}
      </div>
      {m.observacoes && <div className="why">{m.observacoes}</div>}
      <div className="meta2">{tags.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>
    </div>
  );
}

// ── TIMELINE / gantt (mesmo tamanho do mockup) ───────────────────────────────
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
    .slice(0, 5);
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
                <div className="l">{ns} · {bl.m.modelo || ""}</div>
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

// ── A SEGUIR (destaque menor) ────────────────────────────────────────────────
function Proximas({ proximas }) {
  const monday = getMondayUTC();
  const todayStr = new Date().toISOString().slice(0, 10);
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setUTCDate(monday.getUTCDate() + i); return d; });
  const byDay = {};
  proximas.forEach(m => {
    if (!m.previsao_inicio) return;
    const k = new Date(m.previsao_inicio).toISOString().slice(0, 10);
    (byDay[k] = byDay[k] || []).push(m);
  });
  const groups = days.map(d => ({ d, k: d.toISOString().slice(0, 10) }))
    .filter(g => (byDay[g.k] || []).length > 0);
  return (
    <div className="pxlist">
      {groups.length === 0
        ? <div className="pxempty">Sem entradas planeadas</div>
        : groups.map(({ d, k }) => (
          <div key={k} className={`pxgroup${k === todayStr ? " now" : ""}`}>
            <div className="pgh">{d.toLocaleDateString("pt-PT", { weekday: "long" }).toUpperCase()}<span>{(byDay[k] || []).length}</span></div>
            {(byDay[k] || []).slice(0, 4).map(m => {
              const meta = Number(m.tempo_estimado_segundos) || 0;
              const h = meta > 0 ? Math.round(meta / 3600) + "h" : "—";
              return (
                <div key={m.id} className="pxrow">
                  <div style={{ minWidth: 0 }}>
                    <div className="pn">{nsSplit(m.serie).main}</div>
                    <div className="pm">{m.modelo || "—"}</div>
                  </div>
                  <span className="ph">{h}</span>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

// ── RECONDICIONAMENTO (destaque · fundo claro) ───────────────────────────────
function Recon({ reconAnd, reconAF, reconCon }) {
  const active  = reconAnd.filter(m => m.timer_status === "running" || m.timer_status?.startsWith("paused"));
  const waiting = [...reconAnd.filter(m => !(m.timer_status === "running" || m.timer_status?.startsWith("paused"))), ...reconAF];
  const nActive = active.length, nWait = waiting.length, nCon = reconCon.length;
  const total = Math.max(nActive + nWait + nCon, 1);
  const chips = [
    ...active.map(m => ({ m, cls: m.timer_status === "running" ? "run" : "paus", t: m.timer_status === "running" ? "Em curso" : "Pausa" })),
    ...waiting.map(m => ({ m, cls: "", t: tierRecon(m) || "Fila" })),
  ];
  const win = useRotatingWindow(chips, 10, 10000);
  return (
    <>
      <div className="funnel">
        <div className="seg s1" style={{ width: (nActive / total * 100) + "%" }}>{nActive || ""}</div>
        <div className="seg s2" style={{ width: (nWait / total * 100) + "%" }}>{nWait} em fila</div>
        <div className="seg s3" style={{ width: (nCon / total * 100) + "%" }}>{nCon || ""}</div>
      </div>
      <div className="recleg">
        <div className="x"><i style={{ background: "#2FD3A5" }} />Em curso {nActive}</div>
        <div className="x"><i style={{ background: "#98A2B3" }} />Fila {nWait}</div>
        <div className="x"><i style={{ background: "#A98BFA" }} />Concl. {nCon}</div>
      </div>
      <div className="recchips" key={win.off}>
        {chips.length === 0
          ? <div className="pxempty">Sem máquinas em recondicionamento</div>
          : win.slice.map((c, i) => (
            <div key={(c.m.id || i) + "-" + i} className={`rchip ${c.cls}`}>{nsSplit(c.m.serie).main} · {c.t}</div>
          ))}
      </div>
    </>
  );
}

// ── STANDBY (destaque menor) ─────────────────────────────────────────────────
function Standby({ standby }) {
  const win = useRotatingWindow(standby, 5, 9000);
  return (
    <div className="slist" key={win.off}>
      {standby.length === 0
        ? <div className="pxempty">Nenhuma em standby</div>
        : win.slice.map((m, i) => {
          const motivo = getPausaMotivo(m);
          const c = motivo === "prioritaria" ? "#FB5E5E" : motivo === "aguarda_pecas" ? "#F5B13D" : "#A98BFA";
          return (
            <div key={(m.id || i)} className="srow" style={{ "--c": c }}>
              <span className="st2">{fmtHMS(Number(m.timer_accumulated_seconds) || 0)}</span>
              <div className="sn">{nsSplit(m.serie).main}</div>
              <div className="sm">{m.modelo || "—"}{m.observacoes ? ` · ${m.observacoes}` : ""}</div>
            </div>
          );
        })}
    </div>
  );
}

// ── CONCLUÍDAS DA SEMANA (destaque · fundo claro) ────────────────────────────
function Concluidas({ conSemana }) {
  const win = useRotatingWindow(conSemana, 6, 10000);
  return (
    <div className="clist" key={win.off}>
      {conSemana.length === 0
        ? <div className="pxempty">Nada concluído esta semana</div>
        : win.slice.map((m, i) => {
          const t = m.timer_accumulated_seconds ? fmtHMS(m.timer_accumulated_seconds) : "—";
          const ns = nsSplit(m.serie);
          const tier = tierRecon(m);
          return (
            <div key={(m.id || i)} className="crow">
              <div className="ck">✓</div>
              <div style={{ minWidth: 0 }}>
                <div className="cn">{ns.main}</div>
                <div className="cm">{m.modelo || "—"}{tier ? ` · ${tier}` : ""}</div>
              </div>
              <div className="cti">{t}</div>
            </div>
          );
        })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function AoVivoOps({ data, loading, paused, sPaused, cycleTheme, theme }) {
  const { machines = [], andamento = [], standby = [], prioritarias = [], proximas = [],
          ntsAnd = [], ntsAF = [], reconAnd = [], reconAF = [], reconCon = [],
          conSemana = [], totalCon = [], conHoje = [], avgH = 0 } = data || {};

  const nts = [...ntsAnd, ...ntsAF];
  const emCurso = andamento.length;
  const overdue = andamento.filter(isOverdue).length;
  const noPrazoPct = emCurso > 0 ? Math.round((1 - overdue / emCurso) * 100) : 100;
  const nRecon = reconAnd.length + reconAF.length;

  const KPI = [
    { n: emCurso,          l: "Em andamento",      c: "#2FD3A5" },
    { n: prioritarias.length, l: "Prioritárias",   c: "#F5B13D" },
    { n: nts.length,       l: "NTS",               c: "#FB5E5E", alert: true },
    { n: nRecon,           l: "Recon",             c: "#A98BFA" },
    { n: conSemana.length, l: "Concluídas · sem.", c: "#2FD3A5" },
    { n: avgH ? avgH + "h" : "—", l: "Méd. por máq.", c: "#33C7E0" },
    { n: totalCon.length,  l: "Total 2026",        c: "#5B8CFF" },
  ];

  const gmax = Math.max(emCurso, standby.length, prioritarias.length, nts.length, 1);
  const gstats = [
    ["Em andamento", emCurso,           "#2FD3A5"],
    ["Standby",      standby.length,    "#F5B13D"],
    ["Prioritárias", prioritarias.length, "#5B8CFF"],
    ["NTS críticas", nts.length,        "#FB5E5E"],
  ];

  const andWin = useRotatingWindow(andamento, 7, 9000);

  return (
    <div className="ops-root">
      <style>{CSS_OPS}</style>
      <div className="app">

        {/* HEADER */}
        <div className="head">
          <div className="logo"><img src={JORDAN_URL} alt="InLive" /></div>
          <div className="brand"><b>InLive · Oficina</b><span>Frota ACP · monitor de serviço</span></div>
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

        {/* MAIN */}
        <div className="main">

          {/* EM ANDAMENTO — destaque */}
          <div className="card hi and" style={{ "--c": "#2FD3A5" }}>
            <div className="ch"><span className="mk" /><h3>Em andamento</h3><span className="sub">tempo restante ao vivo</span><span className="ct">{pad2(emCurso)}</span></div>
            <div className="cb">
              <div className="thead"><div>Máquina</div><div>Estado</div><div>Progresso</div><div className="r">Restante</div><div /></div>
              <div className="trows" key={andWin.off}>
                {andamento.length === 0
                  ? <div className="pxempty">Sem máquinas em produção</div>
                  : [...andWin.slice].sort((a, b) => {
                      const ra = (Number(a.tempo_estimado_segundos) || 0) - (Number(a.timer_accumulated_seconds) || 0);
                      const rb = (Number(b.tempo_estimado_segundos) || 0) - (Number(b.timer_accumulated_seconds) || 0);
                      return ra - rb;
                    }).map(m => <Trow key={m.id} m={m} />)}
              </div>
            </div>
          </div>

          {/* DESEMPENHO — reator triangular */}
          <div className="card gau" style={{ "--c": "#2FD3A5" }}>
            <div className="ch"><span className="mk" /><h3>Desempenho do dia</h3></div>
            <div className="cb"><div className="gauwrap">
              <TriReactor pct={noPrazoPct} />
              <div className="gstats">
                {gstats.map((g, i) => (
                  <div key={i} className="gstat">
                    <div className="gl"><span>{g[0]}</span><b>{g[1]}</b></div>
                    <div className="gb"><i style={{ width: (g[1] / gmax * 100) + "%", background: g[2] }} /></div>
                  </div>
                ))}
              </div>
            </div></div>
          </div>

          {/* NTS — destaque menor */}
          <div className="card nts" style={{ "--c": "#FB5E5E" }}>
            <div className="ch"><span className="mk" /><h3>Alertas · NTS</h3><span className="ct">{pad2(nts.length)}</span></div>
            <div className="cb"><div className="ntlist">
              {nts.length === 0
                ? <div className="pxempty">Sem alertas NTS</div>
                : nts.slice(0, 3).map(m => <NtsRow key={m.id} m={m} />)}
            </div></div>
          </div>

          {/* TIMELINE */}
          <div className="card tl" style={{ "--c": "#5B8CFF" }}>
            <div className="ch"><span className="mk" /><h3>Linha do tempo</h3><span className="sub">próximos 14 dias</span></div>
            <div className="cb"><Timeline machines={machines} /></div>
          </div>

          {/* RECON — destaque */}
          <div className="card hi rec" style={{ "--c": "#A98BFA" }}>
            <div className="ch"><span className="mk" /><h3>Recondicionamento</h3><span className="ct">{pad2(nRecon)}</span></div>
            <div className="cb"><Recon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} /></div>
          </div>

          {/* CONCLUÍDAS — destaque */}
          <div className="card hi con" style={{ "--c": "#2FD3A5" }}>
            <div className="ch"><span className="mk" /><h3>Concluídas</h3><span className="sub">esta semana</span><span className="ct">{pad2(conSemana.length)}</span></div>
            <div className="cb"><Concluidas conSemana={conSemana} /></div>
          </div>

          {/* A SEGUIR — destaque menor */}
          <div className="card prx" style={{ "--c": "#5B8CFF" }}>
            <div className="ch"><span className="mk" /><h3>A seguir</h3><span className="ct">{pad2(proximas.length)}</span></div>
            <div className="cb"><Proximas proximas={proximas} /></div>
          </div>

          {/* STANDBY — destaque menor */}
          <div className="card stb" style={{ "--c": "#F5B13D" }}>
            <div className="ch"><span className="mk" /><h3>Standby</h3><span className="ct">{pad2(standby.length)}</span></div>
            <div className="cb"><Standby standby={standby} /></div>
          </div>

        </div>

        {/* FOOT */}
        <div className="foot">
          <span onClick={() => sPaused?.(p => !p)} style={{ cursor: "pointer" }}><span className="k">espaço</span> {paused ? "retomar" : "pausar"}</span>
          <span><span className="k">F</span> ecrã inteiro</span>
          <span className="org">STILL · OFICINA · FROTA ACP · {conHoje.length} hoje</span>
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
  --green:#2FD3A5; --amber:#F5B13D; --red:#FB5E5E; --blue:#5B8CFF; --purple:#A98BFA; --teal:#33C7E0;
  position:absolute; inset:0; height:100%; width:100%;
  font-family:'Inter',-apple-system,system-ui,sans-serif; color:var(--txt);
  letter-spacing:-.01em; -webkit-font-smoothing:antialiased; overflow:hidden;
  /* fundo preto com halos de cor muito subtis — dão "algo" ao vidro refractar */
  background:
    radial-gradient(60% 45% at 82% 8%, rgba(91,140,255,.10), transparent 60%),
    radial-gradient(55% 45% at 12% 92%, rgba(169,139,250,.09), transparent 60%),
    radial-gradient(50% 40% at 50% 120%, rgba(47,211,165,.06), transparent 60%),
    var(--bg);
}
.ops-root *{box-sizing:border-box; margin:0; padding:0}
.ops-root .app{height:100%; display:flex; flex-direction:column; padding:clamp(12px,1.1vw,20px); gap:clamp(9px,.85vw,15px)}

/* ===== glass base (leve): fill translúcido alto + realce especular; blur é bónus ===== */
.ops-root .kpi,.ops-root .card,.ops-root .pill,.ops-root .themebtn{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:18px;
  box-shadow:0 8px 30px -12px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08);
  position:relative;
}
@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .ops-root .kpi,.ops-root .card,.ops-root .pill,.ops-root .themebtn{
    -webkit-backdrop-filter:blur(9px) saturate(150%);
    backdrop-filter:blur(9px) saturate(150%);
    background:rgba(20,24,30,.5);
  }
  .ops-root .card.hi{ background:rgba(248,250,253,.82); }
}
/* realce especular no topo (fino, barato) */
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
.ops-root .brand b{font-size:clamp(16px,1.25vw,22px); font-weight:700; letter-spacing:-.02em; display:block; line-height:1.1}
.ops-root .brand span{font-size:clamp(10px,.8vw,12.5px); color:var(--mut); font-weight:500}
.ops-root .head .right{margin-left:auto; display:flex; align-items:center; gap:12px}
.ops-root .pill{display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--mut); padding:8px 13px; border-radius:11px}
.ops-root .pill .dot{width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 0 3px rgba(47,211,165,.18); animation:opsbp 2s infinite}
.ops-root .pill.paused .dot{background:var(--amber); box-shadow:0 0 0 3px rgba(245,177,61,.18); animation:none}
@keyframes opsbp{50%{opacity:.45}}
.ops-root .clock{font-family:var(--mono); font-weight:700; font-size:clamp(16px,1.35vw,23px); color:var(--txt); font-variant-numeric:tabular-nums}
.ops-root .clock small{color:var(--mut); font-weight:600; font-size:12px; margin-left:8px; text-transform:capitalize}
.ops-root .themebtn{width:36px; height:36px; border-radius:11px; color:var(--mut); font-size:16px; cursor:pointer; display:grid; place-items:center}
.ops-root .themebtn:hover{color:var(--txt)}

/* ===== KPI row ===== */
.ops-root .kpis{display:grid; grid-template-columns:repeat(7,1fr); gap:clamp(8px,.7vw,14px); flex:none}
.ops-root .kpi{padding:clamp(11px,.85vw,16px); display:flex; flex-direction:column; gap:8px; overflow:hidden}
.ops-root .kpi .lab{font-size:clamp(9px,.72vw,11px); font-weight:700; letter-spacing:.06em; color:var(--mut); text-transform:uppercase; display:flex; align-items:center; gap:6px}
.ops-root .kpi .lab i{width:7px; height:7px; border-radius:50%; background:var(--c); flex:none}
.ops-root .kpi .num{font-size:clamp(24px,2.2vw,36px); font-weight:700; line-height:1; letter-spacing:-.03em; font-family:var(--mono)}
.ops-root .kpi.alert{border-color:rgba(251,94,94,.4)} .ops-root .kpi.alert .num{color:var(--red)}

/* ===== MAIN grid ===== */
.ops-root .main{flex:1; min-height:0; display:grid; gap:clamp(9px,.85vw,15px);
  grid-template-columns:repeat(12,1fr); grid-template-rows:1.32fr 1fr 1fr;
  grid-template-areas:
    "and and and and and gau gau gau nts nts nts nts"
    "and and and and and tl  tl  tl  tl  tl  tl  tl"
    "rec rec rec rec con con con con prx prx stb stb";}
.ops-root .card{display:flex; flex-direction:column; min-height:0; overflow:hidden}
.ops-root .and{grid-area:and} .ops-root .gau{grid-area:gau} .ops-root .nts{grid-area:nts}
.ops-root .tl{grid-area:tl} .ops-root .rec{grid-area:rec} .ops-root .con{grid-area:con}
.ops-root .prx{grid-area:prx} .ops-root .stb{grid-area:stb}
.ops-root .ch{display:flex; align-items:center; gap:9px; padding:12px 16px 10px; border-bottom:1px solid var(--line); flex:none}
.ops-root .ch h3{font-size:clamp(12px,1vw,14px); font-weight:700; letter-spacing:.01em}
.ops-root .ch .mk{width:8px; height:8px; border-radius:3px; background:var(--c); flex:none; box-shadow:0 0 8px var(--c)}
.ops-root .ch .sub{font-size:11.5px; color:var(--faint); font-weight:500}
.ops-root .ch .ct{margin-left:auto; font-family:var(--mono); font-size:12px; font-weight:700; color:var(--mut); background:var(--panel2); border:1px solid var(--line); padding:3px 9px; border-radius:7px}
.ops-root .cb{flex:1; min-height:0; overflow:hidden; padding:9px 13px 12px; display:flex; flex-direction:column}

/* ---- painéis de destaque (fundo claro) — inversão de cores de texto ---- */
.ops-root .card.hi{color:var(--hi-txt); border-color:var(--hi-line)}
.ops-root .card.hi .ch{border-bottom-color:var(--hi-line)}
.ops-root .card.hi .ch .sub{color:#8892A0}
.ops-root .card.hi .ch .ct{color:var(--hi-mut); background:rgba(12,15,20,.05); border-color:var(--hi-line)}
.ops-root .card.hi .pxempty{color:var(--hi-mut)}

/* ===== EM ANDAMENTO (tabela) ===== */
.ops-root .thead,.ops-root .trow{display:grid; grid-template-columns:1.7fr .95fr 1.5fr .8fr 26px; gap:12px; align-items:center}
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
.ops-root .bdg.prio{color:#9A6800; background:rgba(245,177,61,.22)}
.ops-root .bdg.nts{color:#fff; background:var(--red)}
.ops-root .bdg.recon{color:#6B47C7; background:rgba(169,139,250,.22)}
.ops-root .bdg.run{color:#0B7A5A; background:rgba(47,211,165,.20)}
.ops-root .prog{display:flex; align-items:center; gap:9px}
.ops-root .prog .bar{flex:1; height:7px; border-radius:100px; background:rgba(12,15,20,.10); overflow:hidden}
.ops-root .prog .bar i{display:block; height:100%; border-radius:100px; transition:width .6s ease}
.ops-root .prog .pct{font-family:var(--mono); font-size:11.5px; font-weight:600; color:var(--hi-mut); width:36px; text-align:right}
.ops-root .rem{font-family:var(--mono); font-weight:700; font-size:clamp(12px,1.05vw,15px); text-align:right; color:var(--hi-txt)}
.ops-root .rem.over{color:var(--red)}
.ops-root .rem small{display:block; font-size:8.5px; color:var(--hi-mut); font-weight:600; letter-spacing:.04em}
.ops-root .tech{width:22px; height:22px; border-radius:6px; background:rgba(12,15,20,.08); display:grid; place-items:center; font-size:9px; font-weight:700; color:var(--hi-txt); margin-left:auto; font-family:var(--mono)}

/* ===== GAUGE (reator triangular) ===== */
.ops-root .gauwrap{display:flex; align-items:center; gap:14px; height:100%}
.ops-root .trir{position:relative; width:clamp(120px,10vw,170px); flex:none; aspect-ratio:1/1}
.ops-root .trir svg{width:100%; height:100%; display:block}
.ops-root .trir .tric{position:absolute; left:0; right:0; top:44%; transform:translateY(-50%); text-align:center}
.ops-root .trir .tric b{display:block; font-family:var(--mono); font-weight:700; font-size:clamp(22px,2.1vw,32px); line-height:1}
.ops-root .trir .tric span{font-size:9.5px; color:var(--mut); font-weight:600; letter-spacing:.05em; text-transform:uppercase}
.ops-root .gstats{flex:1; display:flex; flex-direction:column; gap:clamp(8px,1vw,13px); min-width:0}
.ops-root .gstat .gl{display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px}
.ops-root .gstat .gl span{color:var(--mut); font-weight:500} .ops-root .gstat .gl b{font-family:var(--mono); font-weight:700}
.ops-root .gstat .gb{height:6px; border-radius:100px; background:rgba(255,255,255,.08); overflow:hidden}
.ops-root .gstat .gb i{display:block; height:100%; border-radius:100px}

/* ===== NTS ===== */
.ops-root .ntlist{display:flex; flex-direction:column; gap:8px; height:100%; overflow:hidden}
.ops-root .ntrow{background:rgba(251,94,94,.07); border:1px solid rgba(251,94,94,.22); border-radius:12px; padding:10px 12px; display:flex; flex-direction:column; gap:5px}
.ops-root .ntrow .t1{display:flex; align-items:center; gap:8px}
.ops-root .ntrow .nns{font-family:var(--mono); font-weight:700; font-size:14px} .ops-root .ntrow .nns small{color:var(--mut); font-weight:500; font-size:.82em}
.ops-root .ntrow .delta2{margin-left:auto; font-family:var(--mono); font-weight:700; font-size:13px} .delta2.bad{color:var(--red)} .delta2.ok{color:var(--green)}
.ops-root .ntrow .why{font-size:11.5px; color:#F3B6B6; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.ops-root .ntrow .meta2{display:flex; gap:7px; font-family:var(--mono); font-size:10px; color:var(--mut); flex-wrap:wrap}
.ops-root .ntrow .tag{background:rgba(255,255,255,.06); border:1px solid var(--line); padding:2px 7px; border-radius:6px}

/* ===== TIMELINE ===== */
.ops-root .tlhead{display:grid; grid-template-columns:160px 1fr; align-items:center; padding:0 2px 7px; border-bottom:1px solid var(--line); margin-bottom:8px; flex:none}
.ops-root .tlscale{display:grid; grid-template-columns:repeat(15,1fr); font-family:var(--mono); font-size:9.5px; color:var(--faint)}
.ops-root .tlscale b{text-align:center; font-weight:600} .ops-root .tlscale b.now{color:var(--red)}
.ops-root .tlrows{display:flex; flex-direction:column; gap:5px; position:relative; flex:1; min-height:0; overflow:hidden}
.ops-root .tlrow{display:grid; grid-template-columns:160px 1fr; align-items:center}
.ops-root .tlrow .l{font-family:var(--mono); font-size:11px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:10px}
.ops-root .track{position:relative; height:20px; background:rgba(255,255,255,.04); border-radius:7px}
.ops-root .tbar{position:absolute; top:0; height:20px; border-radius:7px; display:flex; align-items:center; padding:0 9px; font-family:var(--mono); font-size:9.5px; font-weight:600; color:#08110D; white-space:nowrap; overflow:hidden}
.ops-root .tbar.run{background:var(--green)} .ops-root .tbar.over{background:var(--red); color:#fff} .ops-root .tbar.fila{background:rgba(255,255,255,.14); color:var(--mut)}
.ops-root .tnow{position:absolute; top:0; bottom:0; width:2px; background:var(--red); z-index:3; box-shadow:0 0 8px var(--red)}
.ops-root .tlempty{color:var(--faint); font-size:12px; padding:14px 4px}

/* ===== RECON (funil) ===== */
.ops-root .funnel{display:flex; height:28px; border-radius:9px; overflow:hidden; margin-bottom:11px; flex:none}
.ops-root .funnel .seg{display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:11px; font-weight:700; color:#0B0D11; min-width:0}
.ops-root .funnel .s1{background:var(--green)} .ops-root .funnel .s2{background:rgba(12,15,20,.14); color:var(--hi-mut)} .ops-root .funnel .s3{background:var(--purple)}
.ops-root .recleg{display:flex; gap:14px; font-size:11px; margin-bottom:10px; flex:none; flex-wrap:wrap}
.ops-root .recleg .x{display:flex; align-items:center; gap:6px; color:var(--hi-mut)} .ops-root .recleg .x i{width:9px; height:9px; border-radius:3px}
.ops-root .recchips{display:flex; gap:7px; flex-wrap:wrap; align-content:flex-start; overflow:hidden; flex:1; animation:opsFade .5s ease}
.ops-root .rchip{font-family:var(--mono); font-size:11px; color:var(--hi-txt); background:rgba(12,15,20,.05); border:1px solid var(--hi-line); border-radius:8px; padding:6px 10px; border-left:3px solid var(--purple); white-space:nowrap}
.ops-root .rchip.run{border-left-color:var(--green)} .ops-root .rchip.paus{border-left-color:var(--amber)}

/* ===== A SEGUIR ===== */
.ops-root .pxlist{display:flex; flex-direction:column; gap:7px; height:100%; overflow:hidden}
.ops-root .pxgroup .pgh{font-size:10px; font-weight:700; letter-spacing:.05em; color:var(--faint); text-transform:uppercase; margin:2px 0 5px; display:flex; justify-content:space-between}
.ops-root .pxgroup.now .pgh{color:var(--blue)}
.ops-root .pxrow{display:flex; align-items:center; gap:10px; background:var(--panel2); border:1px solid var(--line); border-radius:9px; padding:7px 11px; margin-bottom:5px}
.ops-root .pxrow .pn{font-family:var(--mono); font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .pxrow .pm{font-size:10px; color:var(--mut); font-family:var(--mono)}
.ops-root .pxrow .ph{margin-left:auto; font-family:var(--mono); font-size:11px; font-weight:700; color:var(--amber)}
.ops-root .pxempty{color:var(--faint); font-size:12px; padding:14px 4px; text-align:center}

/* ===== STANDBY ===== */
.ops-root .slist{display:flex; flex-direction:column; gap:8px; height:100%; overflow:hidden; animation:opsFade .5s ease}
.ops-root .srow{background:var(--panel2); border:1px solid var(--line); border-radius:10px; padding:8px 11px; border-left:3px solid var(--c)}
.ops-root .srow .sn{font-family:var(--mono); font-weight:600; font-size:13px}
.ops-root .srow .sm{font-size:10px; color:var(--mut); font-family:var(--mono); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .srow .st2{float:right; font-family:var(--mono); font-weight:700; font-size:12px; color:var(--amber)}

/* ===== CONCLUÍDAS ===== */
.ops-root .clist{display:flex; flex-direction:column; gap:7px; height:100%; overflow:hidden; animation:opsFade .5s ease}
.ops-root .crow{display:flex; align-items:center; gap:10px; background:rgba(12,15,20,.04); border:1px solid var(--hi-line); border-radius:10px; padding:7px 11px}
.ops-root .crow .ck{width:20px; height:20px; border-radius:6px; background:rgba(47,211,165,.18); color:#0B7A5A; display:grid; place-items:center; font-size:12px; flex:none}
.ops-root .crow .cn{font-family:var(--mono); font-weight:600; font-size:13px; color:var(--hi-txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .crow .cm{font-size:9.5px; color:var(--hi-mut); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.ops-root .crow .cti{margin-left:auto; font-family:var(--mono); font-weight:700; font-size:12px; color:#0B7A5A}

/* ===== FOOT ===== */
.ops-root .foot{flex:none; display:flex; align-items:center; gap:16px; font-size:10.5px; color:var(--faint); font-family:var(--mono)}
.ops-root .foot .k{color:var(--mut); border:1px solid var(--line); border-radius:5px; padding:1px 6px; margin-right:4px}
.ops-root .foot .org{margin-left:auto; font-weight:700; color:var(--mut)}

@keyframes opsFade{from{opacity:0} to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ops-root *{animation:none!important; transition:none!important}}
`;
