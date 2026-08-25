// Tema Tidal Light — painéis persistentes (todas as secções visíveis), foco em tempo real.
// Componente de apresentação: recebe todos os dados já calculados via props.
import React, { useEffect, useRef, useState } from "react";
import {
  Activity, PauseCircle, Flag, CalendarDays, CalendarClock, ListOrdered,
  Wrench, CheckCircle2, Moon,
} from "lucide-react";
import { TIDAL_CSS } from "./tidal/tidalStyles";
import MachineCard from "./tidal/MachineCard";
import StandbyPanel from "./tidal/StandbyPanel";
import TimelinePanel from "./tidal/TimelinePanel";
import ProximasPanel from "./tidal/ProximasPanel";
import NtsPanel from "./tidal/NtsPanel";
import ReconPanel from "./tidal/ReconPanel";
import ConcluidasPanel from "./tidal/ConcluidasPanel";
import { BLUE, GREEN, RED, AMBER, LAV, SLATE } from "./tidal/tidalUtils";

function Clock() {
  const [n, sN] = useState(new Date());
  useEffect(() => { const id = setInterval(() => sN(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="td-clock">
      <b>{n.toLocaleTimeString("pt-PT")}</b>
      <span>{n.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "2-digit" })}</span>
    </div>
  );
}

function Panel({ id, title, hint, count, icon, focus, children, style }) {
  return (
    <section id={id} className={`td-panel${focus ? " focus" : ""}`} style={style}>
      <header className="td-phead">
        {icon}
        <h3>{title}</h3>
        {hint && <em>{hint}</em>}
        {count !== undefined && <span className="ct">{String(count).padStart(2, "0")}</span>}
      </header>
      <div className="td-pbody">{children}</div>
    </section>
  );
}

export default function AoVivoTidal({ loading, cycleTheme, data }) {
  const {
    machines, andamento, standby, prioritarias, proximas,
    ntsAnd, ntsAF, reconAnd, reconAF, reconCon,
    conSemana, totalCon, conHoje, avgH,
  } = data;

  const [focus, setFocus] = useState(null);
  const clearRef = useRef(null);

  const timelineItems = machines.filter(
    (m) => (m.estado?.startsWith("em-preparacao") || m.estado === "a-fazer") && m.previsao_inicio
  );

  const goTo = (id) => {
    setFocus(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => setFocus(null), 2600);
  };
  useEffect(() => () => clearTimeout(clearRef.current), []);

  const NAV = [
    { id: "sec-andamento", label: "Em andamento", icon: <Activity size={19} /> },
    { id: "sec-standby", label: "Standby", icon: <PauseCircle size={19} /> },
    { id: "sec-prioritarias", label: "Prioritárias", icon: <Flag size={19} /> },
    { id: "sec-timeline", label: "Timeline", icon: <CalendarDays size={19} /> },
    { id: "sec-proximas", label: "Próximas", icon: <CalendarClock size={19} /> },
    { id: "sec-nts", label: "NTS", icon: <ListOrdered size={19} /> },
    { id: "sec-recon", label: "Recondicionamento", icon: <Wrench size={19} /> },
    { id: "sec-concluidas", label: "Concluídas", icon: <CheckCircle2 size={19} /> },
  ];

  const KPIS = [
    { l: "Andamento", v: andamento.length, c: GREEN, to: "sec-andamento" },
    { l: "Standby", v: standby.length, c: AMBER, to: "sec-standby" },
    { l: "Prioritárias", v: prioritarias.length, c: RED, to: "sec-prioritarias" },
    { l: "Timeline", v: timelineItems.length, c: BLUE, to: "sec-timeline" },
    { l: "Próximas", v: proximas.length, c: SLATE, to: "sec-proximas" },
    { l: "NTS", v: ntsAnd.length + ntsAF.length, c: RED, to: "sec-nts" },
    { l: "Recon", v: reconAnd.length + reconAF.length, c: LAV, to: "sec-recon" },
    { l: "Esta semana", v: conSemana.length, c: BLUE, to: "sec-concluidas" },
    { l: "Hoje", v: conHoje.length, c: GREEN, to: "sec-concluidas" },
    { l: "Méd.h/máq", v: avgH, c: SLATE, to: "sec-concluidas" },
    { l: "Total 2026", v: totalCon.length, c: "#0F172A", to: "sec-concluidas" },
  ];

  const nAnd = andamento.length;
  const andCols = nAnd <= 1 ? 1 : nAnd <= 6 ? 2 : 3;

  return (
    <div className="td-root">
      <style>{TIDAL_CSS}</style>

      <aside className="td-side">
        <img src="/watcher-logo.png" alt="" style={{ width: 30, height: 30, objectFit: "contain", marginBottom: 6 }} />
        {NAV.map((n) => (
          <button key={n.id} title={n.label} onClick={() => goTo(n.id)}
            className={focus === n.id ? "on" : ""}>{n.icon}</button>
        ))}
        <span className="sp" />
        <button title="Mudar tema" onClick={cycleTheme}><Moon size={18} /></button>
      </aside>

      <div className="td-main">
        <header className="td-top">
          <span className="td-brand">WATCHER</span>
          <span className="td-sub">Still Oficina</span>
          <span className="td-live"><i />LIVE</span>
          <Clock />
          <button className="td-ibtn" title="Mudar tema" onClick={cycleTheme}><Moon size={15} /></button>
        </header>

        <div className="td-kpis">
          {KPIS.map((k) => (
            <div key={k.l} className="td-kpi" onClick={() => goTo(k.to)}>
              <b style={{ color: k.c }}>{loading ? "··" : typeof k.v === "number" && Number.isInteger(k.v) ? String(k.v).padStart(2, "0") : k.v}</b>
              <span><i style={{ background: k.c }} />{k.l}</span>
            </div>
          ))}
        </div>

        <div className="td-body">
          {loading ? (
            <div className="td-empty" style={{ minHeight: 200, fontSize: 14 }}>A carregar dados…</div>
          ) : (
            <>
              <div className="td-row hero">
                <Panel id="sec-andamento" title="Em andamento" hint="tempo real"
                  count={nAnd} focus={focus === "sec-andamento"}
                  icon={<Activity size={17} color={GREEN} />}>
                  {nAnd === 0
                    ? <div className="td-empty">Nenhuma máquina em produção</div>
                    : (
                      <div className="td-grid" style={{ gridTemplateColumns: `repeat(${andCols},minmax(0,1fr))` }}>
                        {andamento.map((m, i) => (
                          <MachineCard key={m.id || i} m={m} hero={nAnd <= 4} ring />
                        ))}
                      </div>
                    )}
                </Panel>

                <Panel id="sec-standby" title="Standby" hint="motivos de pausa"
                  count={standby.length} focus={focus === "sec-standby"}
                  icon={<PauseCircle size={17} color={AMBER} />}>
                  <StandbyPanel standby={standby} />
                </Panel>
              </div>

              <div className="td-row three">
                <Panel id="sec-prioritarias" title="Prioritárias" count={prioritarias.length}
                  focus={focus === "sec-prioritarias"} icon={<Flag size={17} color={RED} />}>
                  {prioritarias.length === 0
                    ? <div className="td-empty">Sem prioritárias activas ✓</div>
                    : (
                      <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))" }}>
                        {prioritarias.map((m, i) => <MachineCard key={m.id || i} m={m} />)}
                      </div>
                    )}
                </Panel>

                <Panel id="sec-timeline" title="Timeline" hint="14 dias" count={timelineItems.length}
                  focus={focus === "sec-timeline"} icon={<CalendarDays size={17} color={BLUE} />}>
                  <TimelinePanel machines={timelineItems} />
                </Panel>

                <Panel id="sec-proximas" title="Próximas" hint="esta semana" count={proximas.length}
                  focus={focus === "sec-proximas"} icon={<CalendarClock size={17} color={SLATE} />}>
                  <ProximasPanel proximas={proximas} />
                </Panel>
              </div>

              <div className="td-row three">
                <Panel id="sec-nts" title="NTS" count={ntsAnd.length + ntsAF.length}
                  focus={focus === "sec-nts"} icon={<ListOrdered size={17} color={RED} />}>
                  <NtsPanel ntsAnd={ntsAnd} ntsAF={ntsAF} />
                </Panel>

                <Panel id="sec-recon" title="Recondicionamento"
                  count={reconAnd.length + reconAF.length + reconCon.length}
                  focus={focus === "sec-recon"} icon={<Wrench size={17} color={LAV} />}>
                  <ReconPanel reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} />
                </Panel>

                <Panel id="sec-concluidas" title="Concluídas" hint="esta semana" count={conSemana.length}
                  focus={focus === "sec-concluidas"} icon={<CheckCircle2 size={17} color={BLUE} />}>
                  <ConcluidasPanel conSemana={conSemana} />
                </Panel>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}