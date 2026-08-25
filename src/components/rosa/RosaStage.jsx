// Quadros grandes do palco central (Rosa Shock): Em andamento, Recondicionamento,
// Concluídas e Desempenho. Cada um adapta a densidade ao volume de dados.
import React, { useMemo } from "react";
import {
  fmtHMS, fmtH, pad2, nsSplit, tierRecon, machineType, useLiveTimer,
  useRotatingWindow, computeDailyProductivity, computeWeeklyOnTime,
  fmtDateShort, isOverdue, GREEN, RED, AMBER, LAV, BLUE, PINK, TYPE,
} from "./rosaUtils";

// ── Em andamento ────────────────────────────────────────────────────────────
function AndCard({ m, big }) {
  const elapsed = useLiveTimer(m);
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const restante = meta > 0 ? meta - elapsed : null;
  const over = restante !== null && restante < 0;
  const ratio = meta > 0 ? Math.min(elapsed / meta, 1) : 0;
  const risk = !over && meta > 0 && restante / meta < 0.2;
  const run = m.timer_status === "running";
  const st = over ? RED : risk ? AMBER : run ? GREEN : "#C9D2E0";
  const ns = nsSplit(m.serie);
  const t = machineType(m);
  const tasks = (m.tarefas || []).filter((x) => !x.concluida);
  const imp = Array.isArray(m.imprevistos) ? m.imprevistos : [];
  const hasExpress = m.isExpress || (m.tarefas || []).some((x) => x.texto === "EXPRESS");
  return (
    <div className={`rs-and-card${big ? " big" : ""}`} style={{ "--st": st }}>
      <div className="rs-and-top">
        <span className="rs-badge" style={{ "--bc": t.color }}>{t.label}</span>
        {run && <span className="rs-badge run">RUN</span>}
        {m.prioridade && <span className="rs-badge prio">⚡ PRIO</span>}
        {hasExpress && <span className="rs-badge exp">EXPRESS</span>}
        {m.isVps && <span className="rs-badge vps">VPS</span>}
        <span className="rs-and-dates">
          {fmtDateShort(m.previsao_inicio) && <>▶ {fmtDateShort(m.previsao_inicio)}</>}
          {fmtDateShort(m.previsao_fim) && <> · ✓ {fmtDateShort(m.previsao_fim)}</>}
        </span>
      </div>
      <div className="rs-and-mid">
        <div className="rs-ns">
          <b>{ns.main}</b>
          {ns.sub && <small>{ns.sub}</small>}
          <span className="rs-mo">{m.modelo || "—"}</span>
        </div>
        <div className={`rs-timer${over ? " over" : ""}`}>
          {restante !== null ? (over ? "+" : "") + fmtHMS(Math.abs(restante)) : fmtHMS(elapsed)}
          <small>{restante === null ? "decorrido" : over ? "atraso" : "restam"}</small>
        </div>
      </div>
      <div className="rs-and-bar">
        <div className="rs-bar"><i style={{ width: ratio * 100 + "%", background: st }} /></div>
        <span className="rs-pct">{meta > 0 ? Math.round(ratio * 100) + "%" : "—"}</span>
        {meta > 0 && <span className="rs-meta">meta {fmtH(meta)}</span>}
      </div>
      {(tasks.length > 0 || imp.length > 0) && (
        <div className="rs-chips">
          {tasks.slice(0, big ? 5 : 3).map((x, i) => <span key={i} className="rs-chip">{x.texto}</span>)}
          {tasks.length > (big ? 5 : 3) && <span className="rs-chip dim">+{tasks.length - (big ? 5 : 3)}</span>}
          {imp.slice(0, 2).map((x, i) => <span key={"i" + i} className="rs-chip imp">⚡ {x.descricao}</span>)}
        </div>
      )}
    </div>
  );
}

export function StageAndamento({ andamento, paused }) {
  const size = andamento.length <= 4 ? andamento.length || 1 : andamento.length <= 8 ? 8 : 9;
  const win = useRotatingWindow(andamento, size, 12000, paused);
  const n = win.slice.length;
  const cols = n <= 2 ? 1 : n <= 6 ? 2 : 3;
  if (andamento.length === 0) return <div className="rs-empty">Nenhuma máquina em produção</div>;
  return (
    <div className="rs-grid" key={win.off} style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
      {win.slice.map((m, i) => <AndCard key={m.id || i} m={m} big={n <= 4} />)}
    </div>
  );
}

// ── Recondicionamento ───────────────────────────────────────────────────────
function ReconCardMini({ m, tone }) {
  const ns = nsSplit(m.serie);
  const tier = tierRecon(m);
  const elapsed = useLiveTimer(m);
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const run = m.timer_status === "running";
  const rest = meta > 0 ? meta - elapsed : null;
  return (
    <div className={`rs-rec-card ${tone}`}>
      <div className="rs-rec-top">
        {tier && <span className="rs-badge tier">{tier}</span>}
        {tone === "run" && <span className="rs-badge run">{run ? "RUN" : "PAUSA"}</span>}
        {tone === "done" && <span className="rs-badge ok">✓</span>}
      </div>
      <b>{ns.main}</b>
      <span className="rs-mo">{m.modelo || "—"}</span>
      {tone === "run" && <span className="rs-rec-t">{rest !== null ? fmtHMS(rest) : fmtHMS(elapsed)}</span>}
      {tone === "fila" && meta > 0 && <span className="rs-rec-t dim">⏱ {fmtH(meta)}</span>}
      {tone === "done" && m.timer_accumulated_seconds > 0 && (
        <span className="rs-rec-t dim">{fmtHMS(m.timer_accumulated_seconds)}</span>
      )}
    </div>
  );
}

export function StageRecon({ reconAnd, reconAF, reconCon, paused }) {
  const active = reconAnd.filter((m) => m.timer_status === "running" || m.timer_status?.startsWith("paused"));
  const waiting = [...reconAnd.filter((m) => !(m.timer_status === "running" || m.timer_status?.startsWith("paused"))), ...reconAF];
  const winW = useRotatingWindow(waiting, 12, 11000, paused);
  const winC = useRotatingWindow(reconCon, 8, 11000, paused);
  if (active.length + waiting.length + reconCon.length === 0)
    return <div className="rs-empty">Sem máquinas em recondicionamento</div>;
  return (
    <div className="rs-rec-stage">
      {active.length > 0 && (
        <section>
          <h4><i style={{ background: GREEN }} />Em curso <b>{active.length}</b></h4>
          <div className="rs-rec-row">{active.map((m, i) => <ReconCardMini key={m.id || i} m={m} tone="run" />)}</div>
        </section>
      )}
      {waiting.length > 0 && (
        <section className="grow">
          <h4><i style={{ background: LAV }} />Próximas <b>{waiting.length}</b>
            {winW.rotating && <span className="rs-page">{winW.page}/{winW.pages}</span>}</h4>
          <div className="rs-rec-row wrap" key={"w" + winW.off}>
            {winW.slice.map((m, i) => <ReconCardMini key={m.id || i} m={m} tone="fila" />)}
          </div>
        </section>
      )}
      {reconCon.length > 0 && (
        <section>
          <h4><i style={{ background: BLUE }} />Concluídas · 30 dias <b>{reconCon.length}</b>
            {winC.rotating && <span className="rs-page">{winC.page}/{winC.pages}</span>}</h4>
          <div className="rs-rec-row wrap" key={"c" + winC.off}>
            {winC.slice.map((m, i) => <ReconCardMini key={m.id || i} m={m} tone="done" />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Concluídas da semana ────────────────────────────────────────────────────
export function StageConcluidas({ conSemana, paused }) {
  const sorted = useMemo(
    () => [...conSemana].sort((a, b) => new Date(b.dataConclusao || 0) - new Date(a.dataConclusao || 0)),
    [conSemana]
  );
  const win = useRotatingWindow(sorted, 9, 12000, paused);
  if (sorted.length === 0) return <div className="rs-empty">Nenhuma conclusão esta semana</div>;
  const n = win.slice.length;
  const cols = n <= 2 ? 1 : n <= 6 ? 2 : 3;
  return (
    <div className="rs-grid" key={win.off} style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
      {win.slice.map((m, i) => {
        const ns = nsSplit(m.serie);
        const t = machineType(m);
        const tier = tierRecon(m);
        const meta = Number(m.tempo_estimado_segundos) || 0;
        const acc = Number(m.timer_accumulated_seconds) || 0;
        const late = meta > 0 && acc > meta;
        const tasks = (m.tarefas || []).filter((x) => !["EXPRESS", "VPS", "IMPREVISTOS"].includes(x.texto?.trim()));
        return (
          <div key={m.id || i} className="rs-con-card">
            <div className="rs-and-top">
              <span className="rs-badge ok">✓ CONCLUÍDA</span>
              <span className="rs-badge" style={{ "--bc": t.color }}>{t.label}</span>
              {tier && <span className="rs-badge tier">{tier}</span>}
              <span className="rs-and-dates">
                {m.dataConclusao
                  ? new Date(m.dataConclusao).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </span>
            </div>
            <div className="rs-and-mid">
              <div className="rs-ns"><b>{ns.main}</b><span className="rs-mo">{m.modelo || "—"}</span></div>
              {acc >= 300 && (
                <div className={`rs-timer${late ? " over" : " ok"}`}>
                  {fmtHMS(acc)}<small>{meta > 0 ? `meta ${fmtH(meta)}` : "total"}</small>
                </div>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="rs-chips">
                {tasks.slice(0, 4).map((x, j) => <span key={j} className="rs-chip done">✓ {x.texto}</span>)}
                {tasks.length > 4 && <span className="rs-chip dim">+{tasks.length - 4}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Desempenho ──────────────────────────────────────────────────────────────
function Bars({ data, valueKey, color, labelKey }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="rs-bars">
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        return (
          <div key={i} className={`rs-bcol${i === data.length - 1 ? " now" : ""}`}>
            <span className="rs-bval">{d[valueKey] === null ? "—" : v}</span>
            <i style={{ height: (v > 0 ? Math.max((v / max) * 100, 5) : 2) + "%", background: color }} />
            <span className="rs-blab">{labelKey ? d[labelKey] : `${pad2(d.date.getDate())}/${pad2(d.date.getMonth() + 1)}`}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StageDesempenho({ machines, totalCon, andamento, standby, prioritarias, reconTotal, conSemana, conHoje, avgH }) {
  const daily = useMemo(() => computeDailyProductivity(totalCon, 14), [totalCon]);
  const weekly = useMemo(() => computeWeeklyOnTime(totalCon, 6), [totalCon]);
  const real = machines.filter((m) => m.tipo !== "servico-interno");
  const counts = { nts: 0, acp: 0, recon: 0 };
  real.forEach((m) => { const k = machineType(m).key; if (counts[k] !== undefined) counts[k]++; });
  const totalReal = real.length || 1;
  const overdue = andamento.filter(isOverdue).length;
  const noPrazo = andamento.length > 0 ? Math.round((1 - overdue / andamento.length) * 100) : 100;
  const dailyCounts = daily.map((d) => d.count);
  const last7 = dailyCounts.slice(-7).reduce((a, b) => a + b, 0);
  const avgDay = Math.round((dailyCounts.reduce((a, b) => a + b, 0) / daily.length) * 10) / 10;
  const segs = [
    { ...TYPE.acp, n: counts.acp },
    { ...TYPE.nts, n: counts.nts },
    { ...TYPE.recon, n: counts.recon },
  ];
  const r = 54, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="rs-des">
      <div className="rs-des-row">
        <div className="rs-des-box">
          <h4>No prazo · em curso</h4>
          <div className="rs-ring">
            <svg viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="12" />
              <circle cx="65" cy="65" r={r} fill="none" stroke={noPrazo >= 90 ? GREEN : noPrazo >= 70 ? AMBER : RED}
                strokeWidth="12" strokeLinecap="round" transform="rotate(-90 65 65)"
                strokeDasharray={`${(C * noPrazo) / 100} ${C}`} />
            </svg>
            <div className="rs-ringc"><b>{noPrazo}%</b><span>{overdue} atrasadas</span></div>
          </div>
        </div>
        <div className="rs-des-box">
          <h4>Distribuição por tipo</h4>
          <div className="rs-ring">
            <svg viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="12" />
              {segs.map((s, i) => {
                const frac = s.n / totalReal;
                const dash = C * frac, off = -acc * C;
                acc += frac;
                if (!s.n) return null;
                return <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={s.color} strokeWidth="12"
                  strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} transform="rotate(-90 65 65)" />;
              })}
            </svg>
            <div className="rs-ringc"><b>{real.length}</b><span>máquinas</span></div>
          </div>
          <div className="rs-legend">
            {segs.map((s, i) => <span key={i}><i style={{ background: s.color }} />{s.label} <b>{s.n}</b></span>)}
          </div>
        </div>
        <div className="rs-des-box stats">
          <h4>Números do dia</h4>
          {[
            ["Em andamento", andamento.length, GREEN],
            ["Standby", standby.length, AMBER],
            ["Prioritárias", prioritarias.length, RED],
            ["Recondicionamento", reconTotal, LAV],
            ["Concluídas hoje", conHoje.length, BLUE],
            ["Concluídas semana", conSemana.length, BLUE],
            ["Média por máquina", avgH ? avgH + "h" : "—", PINK],
            ["Média/dia · 14d", avgDay, PINK],
            ["Últimos 7 dias", last7, GREEN],
          ].map(([l, v, c], i) => (
            <div key={i} className="rs-stat"><i style={{ background: c }} /><span>{l}</span><b>{v}</b></div>
          ))}
        </div>
      </div>
      <div className="rs-des-row charts">
        <div className="rs-des-box grow">
          <h4>Produtividade diária · 14 dias</h4>
          <Bars data={daily} valueKey="count" color={PINK} />
        </div>
        <div className="rs-des-box grow">
          <h4>% no prazo · 6 semanas</h4>
          <Bars data={weekly} valueKey="pct" color={GREEN} labelKey="label" />
        </div>
      </div>
    </div>
  );
}