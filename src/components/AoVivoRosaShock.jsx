import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Palette } from "lucide-react";
import { CSS_RS, P } from "@/components/rosashock/rsShared";
import RsAndamento from "@/components/rosashock/RsAndamento";
import RsRecon from "@/components/rosashock/RsRecon";
import RsConcluidas from "@/components/rosashock/RsConcluidas";
import RsDesempenho from "@/components/rosashock/RsDesempenho";
import { RsStandbyWidget, RsPrioWidget, RsNtsWidget, RsProximasWidget, RsMiniTimeline } from "@/components/rosashock/RsOrbit";

const DUR = 30000;

function RsClock() {
  const [n, sN] = useState(new Date());
  useEffect(() => { const id = setInterval(() => sN(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <>
      <div className="rs-clock">{n.toLocaleTimeString("pt-PT")}</div>
      <div className="rs-date">{n.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" })}</div>
    </>
  );
}

export default function AoVivoRosaShock({ data, loading, paused, sPaused, cycleTheme }) {
  const {
    machines, andamento, standby, prioritarias, proximas,
    ntsAnd, ntsAF, reconAnd, reconAF, reconCon,
    conSemana, totalCon, conHoje, avgH,
  } = data;

  const timelineMachines = [
    ...machines.filter(m => m.estado?.startsWith("em-preparacao") && m.previsao_inicio),
    ...machines.filter(m => m.estado === "a-fazer" && m.previsao_inicio),
  ];

  const VIEWS = [
    { id: "andamento", label: "Em Andamento", count: andamento.length, color: P.green },
    { id: "recon", label: "Recondicionamento", count: reconAnd.length + reconAF.length + reconCon.length, color: P.purple },
    { id: "concluidas", label: "Concluídas · Semana", count: conSemana.length, color: P.blue },
    { id: "desempenho", label: "Desempenho", count: undefined, color: P.pink },
  ];

  const [view, sView] = useState(0);
  const [prog, sProg] = useState(0);
  const startRef = useRef(Date.now());
  const goTo = useCallback(i => { sView(i); sProg(0); startRef.current = Date.now(); }, []);
  const next = useCallback(() => goTo((view + 1) % VIEWS.length), [view, goTo]); // eslint-disable-line
  const prev = useCallback(() => goTo((view - 1 + VIEWS.length) % VIEWS.length), [view, goTo]); // eslint-disable-line

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(next, Math.max(DUR - (Date.now() - startRef.current), 0));
    const p = setInterval(() => sProg(Math.min((Date.now() - startRef.current) / DUR, 1)), 100);
    return () => { clearTimeout(t); clearInterval(p); };
  }, [view, paused, next]);

  useEffect(() => {
    const h = e => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  const cur = VIEWS[view];
  const kpis = [
    { l: "Andamento", v: andamento.length, c: P.green },
    { l: "Standby", v: standby.length, c: P.yellow },
    { l: "Prioritárias", v: prioritarias.length, c: P.red },
    { l: "Timeline", v: timelineMachines.length, c: P.pink },
    { l: "Próximas", v: proximas.length, c: P.blue },
    { l: "NTS", v: ntsAnd.length + ntsAF.length, c: P.red },
    { l: "Recon", v: reconAnd.length + reconAF.length, c: P.purple },
    { l: "Esta semana", v: conSemana.length, c: P.blue },
    { l: "Hoje", v: conHoje.length, c: P.green },
    { l: "Méd.h/máq", v: avgH, c: P.yellow },
    { l: "Total 2026", v: totalCon.length, c: P.pink },
  ];

  const central =
    cur.id === "andamento" ? <RsAndamento items={andamento} /> :
    cur.id === "recon" ? <RsRecon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} /> :
    cur.id === "concluidas" ? <RsConcluidas items={conSemana} /> :
    <RsDesempenho machines={machines} totalCon={totalCon} conSemana={conSemana} conHoje={conHoje} avgH={avgH} />;

  return (
    <div className="rs-root">
      <style>{CSS_RS}</style>

      {/* ── KPI strip ── */}
      <div className="rs-kpibar">
        <div className="rs-brand rs-glass" style={{ borderRadius: 14 }}>
          <img src="/watcher-logo.png" alt="" />
          <div style={{ lineHeight: 1.15 }}>
            <b>WATCHER</b><br />
            <small>STILL OFICINA</small>
          </div>
        </div>
        {kpis.map((k, i) => (
          <div key={k.l} className={`rs-kpi${(i === 0 && cur.id === "andamento") || (i === 6 && cur.id === "recon") || (i === 7 && cur.id === "concluidas") ? " active" : ""}`}>
            <i style={{ background: k.c }} />
            <b>{loading ? "··" : k.v}</b>
            <span>{k.l}</span>
          </div>
        ))}
      </div>

      {/* ── Corpo ── */}
      <div className="rs-body">

        {/* Painel esquerdo */}
        <div className="rs-left">
          <div className="rs-glass rs-clockcard">
            <RsClock />
            <div>
              <span className={`rs-live${paused ? " paused" : ""}`}>
                <span className="d" />{paused ? "PAUSA" : "AO VIVO"}
              </span>
            </div>
          </div>

          <div className="rs-glass rs-viewcard">
            <div>
              <div className="rs-viewnum">{String(view + 1).padStart(2, "0")} / {String(VIEWS.length).padStart(2, "0")}</div>
              <div className="rs-viewlabel" style={{ color: cur.color }}>{cur.label}</div>
            </div>
            <div className="rs-prog"><div style={{ width: `${prog * 100}%` }} /></div>
            <div className="rs-dots">
              {VIEWS.map((v, i) => (
                <button key={v.id} className={i === view ? "on" : ""} onClick={() => goTo(i)} title={v.label} />
              ))}
            </div>
            <div className="rs-navrow">
              <button className="rs-btn" onClick={prev}><ChevronLeft size={12} /></button>
              <button className="rs-btn" onClick={() => sPaused(p => !p)}>
                {paused ? <Play size={11} /> : <Pause size={11} />}
              </button>
              <button className="rs-btn" onClick={next}><ChevronRight size={12} /></button>
            </div>
          </div>

          <div className="rs-glass rs-minis">
            <div className="rs-mini"><span>Esta semana</span><b style={{ color: P.blue }}>{conSemana.length}</b></div>
            <div className="rs-mini"><span>Hoje</span><b style={{ color: P.green }}>{conHoje.length}</b></div>
            <div className="rs-mini"><span>Méd. h/máq</span><b style={{ color: P.yellow }}>{avgH}</b></div>
            <div className="rs-mini"><span>Total 2026</span><b style={{ color: P.pink }}>{totalCon.length}</b></div>
            <div className="rs-mini"><span>Em produção</span><b style={{ color: P.green }}>{andamento.length}</b></div>
            <div className="rs-mini"><span>Frota ativa</span><b>{machines.length}</b></div>
            <button className="rs-btn" style={{ marginTop: "auto", flex: "0 0 auto" }} onClick={cycleTheme}>
              <Palette size={11} /> TEMA
            </button>
          </div>
        </div>

        {/* Quadro central rotativo */}
        <div className="rs-center">
          <div className="rs-glass rs-board" key={cur.id}>
            <div className="rs-board-head">
              <span className="rs-widget-dot" style={{ width: 10, height: 10, background: cur.color, boxShadow: `0 0 12px ${cur.color}` }} />
              <span className="rs-board-title">{cur.label}</span>
              {cur.count !== undefined && <span className="rs-board-count" style={{ color: cur.color }}>{cur.count}</span>}
            </div>
            {loading
              ? <div className="rs-empty" style={{ animation: "rsBlink 1.2s infinite" }}>A carregar…</div>
              : central}
          </div>
          <RsMiniTimeline machines={timelineMachines} />
        </div>

        {/* Widgets orbitantes */}
        <div className="rs-orbit">
          <RsStandbyWidget standby={standby} />
          <RsPrioWidget items={prioritarias} />
          <RsNtsWidget ntsAnd={ntsAnd} ntsAF={ntsAF} />
          <RsProximasWidget items={proximas} />
        </div>
      </div>
    </div>
  );
}