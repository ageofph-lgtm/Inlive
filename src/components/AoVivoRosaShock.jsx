// ─────────────────────────────────────────────────────────────────────────────
// AoVivoRosaShock — tema "Rosa Shock / Glass Orbital".
// Janela única: KPIs no topo + painel de status à esquerda + palco central
// rotativo (Em andamento · Recondicionamento · Concluídas · Desempenho) com
// painéis pequenos a orbitar (Standby, Prioritárias, NTS, Próximas, Timeline).
// Render-only: recebe os dados já calculados via props do AoVivo.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from "react";
import { StageAndamento, StageRecon, StageConcluidas, StageDesempenho } from "@/components/rosa/RosaStage";
import { PanelStandby, PanelPrioritarias, PanelNts, PanelProximas, PanelTimeline } from "@/components/rosa/RosaPanels";
import { pad2, GREEN, RED, AMBER, LAV, BLUE, PINK } from "@/components/rosa/rosaUtils";

const LOGO = "/watcher-logo.png";
const STAGE_MS = 24000;

function Clock() {
  const [n, sN] = useState(new Date());
  useEffect(() => { const id = setInterval(() => sN(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="rs-clock">
      <b>{pad2(n.getHours())}:{pad2(n.getMinutes())}<i>:{pad2(n.getSeconds())}</i></b>
      <span>{n.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}</span>
    </div>
  );
}

export default function AoVivoRosaShock({ data, loading, paused, sPaused, cycleTheme, theme }) {
  const {
    machines = [], andamento = [], standby = [], prioritarias = [], proximas = [],
    ntsAnd = [], ntsAF = [], reconAnd = [], reconAF = [], reconCon = [],
    conSemana = [], totalCon = [], conHoje = [], avgH = 0,
  } = data || {};
  const nts = [...ntsAnd, ...ntsAF];
  const reconTotal = reconAnd.length + reconAF.length;

  const STAGES = [
    { id: "and", label: "Em andamento", color: GREEN, count: andamento.length },
    { id: "rec", label: "Recondicionamento", color: LAV, count: reconTotal + reconCon.length },
    { id: "con", label: "Concluídas · esta semana", color: BLUE, count: conSemana.length },
    { id: "des", label: "Desempenho", color: PINK, count: null },
  ];

  const [stage, setStage] = useState(0);
  const [prog, setProg] = useState(0);
  const startRef = useRef(Date.now());

  const goStage = (i) => { setStage((i + STAGES.length) % STAGES.length); setProg(0); startRef.current = Date.now(); };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = Date.now() - startRef.current;
      if (el >= STAGE_MS) { startRef.current = Date.now(); setProg(0); setStage((s) => (s + 1) % STAGES.length); }
      else setProg(el / STAGE_MS);
    }, 120);
    return () => clearInterval(id);
  }, [paused, STAGES.length]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight") goStage(stage + 1);
      if (e.key === "ArrowLeft") goStage(stage - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage]);

  const KPI = [
    { n: andamento.length, l: "Andamento", c: GREEN },
    { n: standby.length, l: "Standby", c: AMBER },
    { n: prioritarias.length, l: "Prioritárias", c: RED },
    { n: proximas.length, l: "Próximas", c: BLUE },
    { n: nts.length, l: "NTS", c: RED },
    { n: reconTotal, l: "Recon", c: LAV },
    { n: conSemana.length, l: "Semana", c: BLUE },
    { n: conHoje.length, l: "Hoje", c: GREEN },
    { n: avgH ? avgH + "h" : "—", l: "Méd./máq.", c: PINK },
    { n: totalCon.length, l: "Total 2026", c: "#fff" },
  ];

  const cur = STAGES[stage];

  return (
    <div className="rs-root">
      <style>{CSS_ROSA}</style>

      {/* KPI STRIP */}
      <header className="rs-head">
        <div className="rs-brand">
          <img src={LOGO} alt="" />
          <div><b>Watcher</b><span>Still Oficina</span></div>
        </div>
        <div className="rs-kpis">
          {KPI.map((k, i) => (
            <div key={i} className="rs-kpi" style={{ "--c": k.c }}>
              <b>{loading ? "—" : k.n}</b><span>{k.l}</span>
            </div>
          ))}
        </div>
        <button className="rs-tbtn" onClick={cycleTheme} title={`Tema: ${theme} → próximo`}>◐</button>
      </header>

      <div className="rs-body">
        {/* PAINEL STATUS */}
        <aside className="rs-side">
          <div className="rs-panel rs-status">
            <div className={`rs-live${paused ? " paused" : ""}`}><i />{paused ? "Em pausa" : "Ao vivo"}</div>
            <Clock />
            <div className="rs-slidec">
              <b>{pad2(stage + 1)}</b><span>/ {pad2(STAGES.length)}</span>
              <em>{cur.label}</em>
            </div>
            <div className="rs-stagelist">
              {STAGES.map((s, i) => (
                <button key={s.id} className={`rs-sitem${i === stage ? " on" : ""}`} onClick={() => goStage(i)}>
                  <i style={{ background: s.color }} />
                  <span>{s.label}</span>
                  {s.count !== null && <b>{s.count}</b>}
                </button>
              ))}
            </div>
            <div className="rs-nav">
              <button onClick={() => goStage(stage - 1)}>‹</button>
              <button className="mid" onClick={() => sPaused?.((p) => !p)}>{paused ? "▶ Retomar" : "❚❚ Pausar"}</button>
              <button onClick={() => goStage(stage + 1)}>›</button>
            </div>
          </div>
          <div className="rs-panel rs-flex">
            <h3 style={{ "--c": AMBER }}><i />Standby<b>{standby.length}</b></h3>
            <div className="rs-pb"><PanelStandby standby={standby} paused={paused} /></div>
          </div>
          <div className="rs-panel rs-flex">
            <h3 style={{ "--c": RED }}><i />Prioritárias<b>{prioritarias.length}</b></h3>
            <div className="rs-pb"><PanelPrioritarias prioritarias={prioritarias} paused={paused} /></div>
          </div>
        </aside>

        {/* PALCO — todas as janelas visíveis, a activa cresce */}
        <main className="rs-stagewrap">
          <div className="rs-stagegrid" style={{
            gridTemplateColumns: stage === 0 || stage === 2 ? "2.7fr 1fr" : "1fr 2.7fr",
            gridTemplateRows: stage === 0 || stage === 1 ? "2.6fr 1fr" : "1fr 2.6fr",
          }}>
            {STAGES.map((s, i) => (
              <div key={s.id} className={`rs-panel rs-stage${i === stage ? " on" : ""}`}
                style={{ "--c": s.color }} onClick={() => goStage(i)}>
                <div className="rs-stagehead">
                  <i />
                  <h2>{s.label}</h2>
                  {s.count !== null && <span className="rs-ct">{pad2(s.count)}</span>}
                  {i === stage && <div className="rs-progress"><i style={{ width: prog * 100 + "%" }} /></div>}
                </div>
                <div className="rs-stagebody">
                  {loading ? <div className="rs-empty">A carregar…</div>
                    : s.id === "and" ? <StageAndamento andamento={andamento} paused={paused} />
                    : s.id === "rec" ? <StageRecon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} paused={paused} />
                    : s.id === "con" ? <StageConcluidas conSemana={conSemana} paused={paused} />
                    : <StageDesempenho machines={machines} totalCon={totalCon} andamento={andamento}
                        standby={standby} prioritarias={prioritarias} reconTotal={reconTotal}
                        conSemana={conSemana} conHoje={conHoje} avgH={avgH} />}
                </div>
              </div>
            ))}
          </div>

          {/* ÓRBITA INFERIOR */}
          <div className="rs-orbit">
            <div className="rs-panel rs-orb">
              <h3 style={{ "--c": BLUE }}><i />Próximas · semana<b>{proximas.length}</b></h3>
              <div className="rs-pb"><PanelProximas proximas={proximas} paused={paused} /></div>
            </div>
            <div className="rs-panel rs-orb">
              <h3 style={{ "--c": PINK }}><i />Timeline · 14 dias</h3>
              <div className="rs-pb"><PanelTimeline machines={machines} /></div>
            </div>
            <div className="rs-panel rs-orb narrow">
              <h3 style={{ "--c": RED }}><i />NTS<b>{nts.length}</b></h3>
              <div className="rs-pb"><PanelNts nts={nts} paused={paused} /></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const CSS_ROSA = `
.rs-root{
  --pink:${PINK}; --lav:${LAV}; --green:${GREEN}; --red:${RED}; --amber:${AMBER}; --blue:${BLUE};
  --txt:#FFFFFF; --mut:rgba(255,255,255,.70); --faint:rgba(255,255,255,.42);
  --line:rgba(255,255,255,.10); --glass:rgba(255,255,255,.045); --glass2:rgba(255,255,255,.028);
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --gap:clamp(7px,.7vw,13px);
  position:absolute; inset:0; overflow:hidden; color:var(--txt);
  font-family:'Urbanist','Inter',-apple-system,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  display:flex; flex-direction:column; gap:var(--gap); padding:clamp(8px,.8vw,16px);
  background:
    radial-gradient(55% 40% at 88% -8%, rgba(255,45,149,.11), transparent 62%),
    radial-gradient(50% 40% at 5% 105%, rgba(255,45,149,.07), transparent 62%),
    #000000;
}
.rs-root *{box-sizing:border-box; margin:0; padding:0; font-family:inherit}
.rs-root button{cursor:pointer; border:none; background:none; color:inherit; font:inherit}

/* glass base */
.rs-root .rs-panel,.rs-root .rs-kpi,.rs-root .rs-tbtn{
  position:relative; background:var(--glass); border:1px solid var(--line); border-radius:20px;
  box-shadow:0 18px 50px -22px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.10);
}
/* detalhes em degradé branco nas pontas */
.rs-root .rs-panel::before,.rs-root .rs-kpi::before,.rs-root .rs-tbtn::before{
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1px; pointer-events:none; z-index:4;
  background:linear-gradient(135deg,rgba(255,255,255,.75) 0%,rgba(255,255,255,.06) 22%,
    transparent 46%,transparent 56%,rgba(255,255,255,.06) 80%,rgba(255,255,255,.55) 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
}
@supports ((backdrop-filter:blur(2px)) or (-webkit-backdrop-filter:blur(2px))){
  .rs-root .rs-panel,.rs-root .rs-kpi,.rs-root .rs-tbtn{
    -webkit-backdrop-filter:blur(22px) saturate(150%); backdrop-filter:blur(22px) saturate(150%);
  }
}
.rs-root .rs-panel{display:flex; flex-direction:column; min-height:0; overflow:hidden}

/* HEADER + KPIs */
.rs-root .rs-head{display:flex; align-items:stretch; gap:var(--gap); flex:none}
.rs-root .rs-brand{display:flex; align-items:center; gap:11px; padding-right:4px; flex:none}
.rs-root .rs-brand img{width:clamp(34px,2.6vw,46px); height:clamp(34px,2.6vw,46px); object-fit:contain;
  filter:drop-shadow(0 0 10px rgba(255,45,149,.6))}
.rs-root .rs-brand b{display:block; font-size:clamp(17px,1.4vw,25px); font-weight:800; letter-spacing:-.02em; line-height:1.05}
.rs-root .rs-brand span{display:block; font-size:clamp(9px,.72vw,12px); color:var(--mut); font-weight:600;
  letter-spacing:.16em; text-transform:uppercase}
.rs-root .rs-kpis{flex:1; display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:clamp(5px,.5vw,9px); min-width:0}
.rs-root .rs-kpi{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
  padding:clamp(5px,.5vw,10px) 4px; border-radius:16px; border-top:2px solid var(--c); overflow:hidden}
.rs-root .rs-kpi b{font-size:clamp(19px,1.85vw,32px); font-weight:800; line-height:1; letter-spacing:-.03em;
  font-variant-numeric:tabular-nums; color:var(--c); text-shadow:0 0 16px color-mix(in srgb,var(--c) 55%,transparent)}
.rs-root .rs-kpi span{font-size:clamp(8px,.62vw,11px); font-weight:700; letter-spacing:.07em; text-transform:uppercase;
  color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%}
.rs-root .rs-tbtn{width:clamp(36px,3vw,46px); border-radius:15px; font-size:18px; color:var(--mut); flex:none}
.rs-root .rs-tbtn:hover{color:#fff}

/* BODY */
.rs-root .rs-body{flex:1; min-height:0; display:flex; gap:var(--gap)}
.rs-root .rs-side{width:clamp(220px,19vw,320px); flex:none; display:flex; flex-direction:column; gap:var(--gap); min-height:0}
.rs-root .rs-flex{flex:1 1 0; min-height:0}
.rs-root .rs-stagewrap{flex:1; min-width:0; display:flex; flex-direction:column; gap:var(--gap)}
.rs-root .rs-stagegrid{flex:1; min-height:0; display:grid; gap:var(--gap);
  transition:grid-template-columns .7s cubic-bezier(.4,0,.2,1), grid-template-rows .7s cubic-bezier(.4,0,.2,1)}
.rs-root .rs-stage{min-height:0; min-width:0; cursor:pointer; opacity:.6;
  transition:opacity .5s ease, box-shadow .5s ease}
.rs-root .rs-stage.on{opacity:1; border-color:rgba(255,255,255,.20);
  box-shadow:0 22px 60px -22px rgba(0,0,0,.95), 0 0 0 1px rgba(255,45,149,.28),
    inset 0 1px 0 rgba(255,255,255,.14)}
.rs-root .rs-orbit{flex:0 0 clamp(150px,20vh,230px); display:flex; gap:var(--gap); min-height:0}
.rs-root .rs-orb{flex:1.25 1 0; min-width:0}
.rs-root .rs-orb.narrow{flex:.8 1 0}

/* Painel: cabeçalho */
.rs-root .rs-panel h3{display:flex; align-items:center; gap:8px; flex:none;
  padding:clamp(6px,.6vw,11px) clamp(9px,.9vw,15px);
  font-size:clamp(10px,.85vw,14px); font-weight:700; letter-spacing:.02em;
  border-bottom:1px solid rgba(255,255,255,.14)}
.rs-root .rs-panel h3 i{width:9px; height:9px; border-radius:3px; background:var(--c); flex:none;
  box-shadow:0 0 10px var(--c)}
.rs-root .rs-panel h3 b{margin-left:auto; font-variant-numeric:tabular-nums; font-size:clamp(12px,1vw,16px);
  color:var(--c)}
.rs-root .rs-pb{flex:1; min-height:0; overflow:hidden; padding:clamp(5px,.5vw,9px) clamp(7px,.7vw,12px) clamp(7px,.7vw,11px);
  display:flex; flex-direction:column}

/* STATUS panel */
.rs-root .rs-status{flex:none; gap:clamp(7px,.7vw,12px); padding:clamp(10px,1vw,16px)}
.rs-root .rs-live{display:inline-flex; align-items:center; gap:8px; align-self:flex-start;
  font-size:clamp(10px,.8vw,13px); font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--green); background:rgba(59,232,168,.14); border:1px solid rgba(59,232,168,.4);
  padding:5px 12px; border-radius:999px}
.rs-root .rs-live i{width:8px; height:8px; border-radius:50%; background:var(--green);
  box-shadow:0 0 8px var(--green); animation:rsBlink 1.6s infinite}
.rs-root .rs-live.paused{color:var(--amber); background:rgba(255,194,75,.14); border-color:rgba(255,194,75,.4)}
.rs-root .rs-live.paused i{background:var(--amber); box-shadow:0 0 8px var(--amber); animation:none}
@keyframes rsBlink{50%{opacity:.3}}
.rs-root .rs-clock b{display:block; font-size:clamp(30px,3vw,52px); font-weight:800; line-height:1;
  letter-spacing:-.03em; font-variant-numeric:tabular-nums}
.rs-root .rs-clock b i{font-style:normal; font-size:.45em; color:var(--pink); margin-left:2px}
.rs-root .rs-clock span{display:block; margin-top:3px; font-size:clamp(10px,.78vw,13px); color:var(--mut);
  font-weight:600; text-transform:capitalize}
.rs-root .rs-slidec{display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;
  padding-top:clamp(6px,.6vw,10px); border-top:1px solid rgba(255,255,255,.14)}
.rs-root .rs-slidec b{font-size:clamp(20px,1.8vw,30px); font-weight:800; color:var(--pink); line-height:1}
.rs-root .rs-slidec span{font-size:clamp(11px,.85vw,14px); color:var(--faint); font-weight:700}
.rs-root .rs-slidec em{flex:1 0 100%; font-style:normal; font-size:clamp(10px,.78vw,13px); color:var(--mut);
  font-weight:600; letter-spacing:.05em; text-transform:uppercase}
.rs-root .rs-stagelist{display:flex; flex-direction:column; gap:4px}
.rs-root .rs-sitem{display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:11px;
  background:var(--glass2); border:1px solid transparent; text-align:left}
.rs-root .rs-sitem i{width:8px; height:8px; border-radius:50%; flex:none}
.rs-root .rs-sitem span{flex:1; font-size:clamp(10px,.78vw,13px); font-weight:600; color:var(--mut);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-sitem b{font-size:clamp(11px,.85vw,14px); font-variant-numeric:tabular-nums; color:var(--faint)}
.rs-root .rs-sitem.on{background:rgba(255,255,255,.16); border-color:var(--line)}
.rs-root .rs-sitem.on span,.rs-root .rs-sitem.on b{color:#fff}
.rs-root .rs-nav{display:flex; gap:5px}
.rs-root .rs-nav button{flex:none; width:34px; height:32px; border-radius:10px; background:var(--glass2);
  border:1px solid var(--line); font-size:16px; color:var(--mut)}
.rs-root .rs-nav button.mid{flex:1; width:auto; font-size:clamp(10px,.78vw,12px); font-weight:700; letter-spacing:.06em}
.rs-root .rs-nav button:hover{color:#fff; background:rgba(255,255,255,.14)}

/* STAGE head */
.rs-root .rs-stagehead{display:flex; align-items:center; gap:11px; flex:none; position:relative;
  padding:clamp(8px,.8vw,14px) clamp(12px,1.2vw,20px);
  border-bottom:1px solid rgba(255,255,255,.16)}
.rs-root .rs-stagehead i{width:11px; height:11px; border-radius:4px; background:var(--c); flex:none;
  box-shadow:0 0 14px var(--c)}
.rs-root .rs-stagehead h2{font-size:clamp(15px,1.45vw,26px); font-weight:800; letter-spacing:-.02em}
.rs-root .rs-ct{margin-left:auto; font-size:clamp(15px,1.4vw,25px); font-weight:800; color:var(--c);
  font-variant-numeric:tabular-nums; text-shadow:0 0 16px color-mix(in srgb,var(--c) 50%,transparent)}
.rs-root .rs-progress{position:absolute; left:0; right:0; bottom:-1px; height:2px; background:rgba(255,255,255,.10)}
.rs-root .rs-progress i{display:block; height:100%; background:linear-gradient(90deg,var(--pink),var(--lav));
  box-shadow:0 0 10px var(--pink); transition:width .12s linear}
.rs-root .rs-stagebody{flex:1; min-height:0; overflow:hidden; padding:clamp(8px,.8vw,14px);
  display:flex; flex-direction:column; animation:rsFade .45s ease}
@keyframes rsFade{from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none}}

.rs-root .rs-grid{display:grid; gap:clamp(6px,.65vw,11px); flex:1; min-height:0;
  grid-auto-rows:minmax(0,1fr); animation:rsFade .4s ease}
.rs-root .rs-empty{flex:1; display:grid; place-items:center; color:var(--faint);
  font-size:clamp(12px,1vw,17px); font-weight:600; letter-spacing:.06em; text-transform:uppercase}
.rs-root .rs-empty.sm{font-size:clamp(9px,.75vw,12px); letter-spacing:.04em}

/* EM ANDAMENTO / CONCLUÍDAS cards */
.rs-root .rs-and-card,.rs-root .rs-con-card{display:flex; flex-direction:column; gap:clamp(4px,.45vw,8px);
  min-width:0; overflow:hidden; padding:clamp(7px,.75vw,13px) clamp(9px,.9vw,15px); border-radius:16px;
  background:rgba(255,255,255,.075); border:1px solid rgba(255,255,255,.16);
  border-left:3px solid var(--st,var(--blue))}
.rs-root .rs-con-card{border-left-color:var(--blue)}
.rs-root .rs-and-top{display:flex; align-items:center; gap:5px; flex-wrap:wrap; flex:none}
.rs-root .rs-badge{font-size:clamp(8px,.62vw,10.5px); font-weight:800; letter-spacing:.08em; padding:2px 7px;
  border-radius:6px; white-space:nowrap; color:var(--bc,#fff);
  background:color-mix(in srgb,var(--bc,#fff) 18%,transparent);
  border:1px solid color-mix(in srgb,var(--bc,#fff) 42%,transparent)}
.rs-root .rs-badge.run{--bc:${GREEN}} .rs-root .rs-badge.prio{--bc:${AMBER}}
.rs-root .rs-badge.exp{--bc:${AMBER}} .rs-root .rs-badge.vps{--bc:${BLUE}}
.rs-root .rs-badge.tier{--bc:${LAV}} .rs-root .rs-badge.ok{--bc:${BLUE}}
.rs-root .rs-and-dates{margin-left:auto; font-size:clamp(8.5px,.66vw,11px); color:var(--faint); font-weight:600;
  white-space:nowrap}
.rs-root .rs-and-mid{display:flex; align-items:center; gap:10px; min-width:0}
.rs-root .rs-ns{min-width:0; flex:1}
.rs-root .rs-ns b{display:block; font-size:clamp(15px,1.55vw,30px); font-weight:800; letter-spacing:-.02em;
  line-height:1.05; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-ns small{font-size:clamp(9px,.7vw,12px); color:var(--faint); font-weight:600}
.rs-root .rs-mo{display:block; font-size:clamp(9.5px,.75vw,13px); color:var(--mut); font-weight:600;
  letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-timer{flex:none; text-align:right; font-size:clamp(15px,1.5vw,28px); font-weight:800;
  letter-spacing:-.01em; font-variant-numeric:tabular-nums; line-height:1;
  text-shadow:0 0 14px rgba(255,255,255,.35)}
.rs-root .rs-timer small{display:block; font-size:clamp(8px,.6vw,10px); font-weight:700; letter-spacing:.1em;
  text-transform:uppercase; color:var(--faint); margin-top:2px; text-shadow:none}
.rs-root .rs-timer.over{color:var(--red); text-shadow:0 0 14px rgba(255,97,97,.5)}
.rs-root .rs-timer.ok{color:var(--blue); text-shadow:0 0 14px rgba(111,182,255,.45)}
.rs-root .rs-and-bar{display:flex; align-items:center; gap:8px; flex:none}
.rs-root .rs-bar{flex:1; height:7px; border-radius:99px; background:rgba(255,255,255,.14); overflow:hidden}
.rs-root .rs-bar i{display:block; height:100%; border-radius:99px; transition:width .6s ease}
.rs-root .rs-pct{font-size:clamp(10px,.8vw,13px); font-weight:800; font-variant-numeric:tabular-nums}
.rs-root .rs-meta{font-size:clamp(8.5px,.66vw,11px); color:var(--faint); font-weight:600}
.rs-root .rs-chips{display:flex; gap:4px; flex-wrap:wrap; overflow:hidden; flex:none}
.rs-root .rs-chip{font-size:clamp(8.5px,.66vw,11px); font-weight:600; padding:2px 7px; border-radius:6px;
  background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.16); color:var(--mut); white-space:nowrap;
  max-width:150px; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-chip.imp{color:var(--amber); border-color:rgba(255,194,75,.35); background:rgba(255,194,75,.12)}
.rs-root .rs-chip.done{color:var(--blue); border-color:rgba(111,182,255,.3); text-decoration:line-through}
.rs-root .rs-chip.dim{color:var(--faint)}

/* RECON stage */
.rs-root .rs-rec-stage{flex:1; min-height:0; display:flex; flex-direction:column; gap:clamp(6px,.6vw,11px)}
.rs-root .rs-rec-stage section{display:flex; flex-direction:column; gap:5px; min-height:0}
.rs-root .rs-rec-stage section.grow{flex:1; min-height:0}
.rs-root .rs-rec-stage h4{display:flex; align-items:center; gap:7px; flex:none;
  font-size:clamp(9px,.72vw,12px); font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--mut)}
.rs-root .rs-rec-stage h4 i{width:8px; height:8px; border-radius:50%}
.rs-root .rs-rec-stage h4 b{color:#fff}
.rs-root .rs-page{margin-left:auto; font-size:9.5px; color:var(--faint); font-weight:700; letter-spacing:.06em}
.rs-root .rs-rec-row{display:flex; gap:clamp(5px,.55vw,9px); min-height:0}
.rs-root .rs-rec-row.wrap{flex-wrap:wrap; align-content:flex-start; overflow:hidden}
.rs-root .rs-rec-card{flex:1 1 clamp(110px,10vw,170px); max-width:280px; min-width:0; display:flex; flex-direction:column; gap:1px;
  padding:clamp(5px,.55vw,10px) clamp(7px,.7vw,12px); border-radius:13px;
  background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); border-top:2px solid ${LAV}}
.rs-root .rs-rec-card.run{border-top-color:${GREEN}; background:rgba(59,232,168,.10)}
.rs-root .rs-rec-card.done{border-top-color:${BLUE}; background:rgba(111,182,255,.09)}
.rs-root .rs-rec-top{display:flex; align-items:center; gap:4px; flex-wrap:wrap}
.rs-root .rs-rec-card b{font-size:clamp(12px,1.05vw,20px); font-weight:800; letter-spacing:-.01em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-rec-t{font-size:clamp(10px,.85vw,14px); font-weight:800; font-variant-numeric:tabular-nums; color:var(--green)}
.rs-root .rs-rec-t.dim{color:var(--mut); font-weight:700}

/* DESEMPENHO */
.rs-root .rs-des{flex:1; min-height:0; display:flex; flex-direction:column; gap:clamp(7px,.7vw,12px)}
.rs-root .rs-des-row{display:flex; gap:clamp(7px,.7vw,12px); flex:1.15 1 0; min-height:0}
.rs-root .rs-des-row.charts{flex:1 1 0}
.rs-root .rs-des-box{flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:center; gap:6px;
  padding:clamp(7px,.7vw,13px); border-radius:16px; background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.15); overflow:hidden}
.rs-root .rs-des-box.grow{align-items:stretch}
.rs-root .rs-des-box h4{font-size:clamp(9px,.72vw,12px); font-weight:700; letter-spacing:.13em;
  text-transform:uppercase; color:var(--mut); flex:none; align-self:flex-start}
.rs-root .rs-des-box.stats{align-items:stretch; gap:clamp(3px,.35vw,7px)}
.rs-root .rs-stat{display:flex; align-items:center; gap:8px; font-size:clamp(9.5px,.76vw,13px)}
.rs-root .rs-stat i{width:8px; height:8px; border-radius:3px; flex:none}
.rs-root .rs-stat span{flex:1; color:var(--mut); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-stat b{font-weight:800; font-variant-numeric:tabular-nums}
.rs-root .rs-ring{position:relative; flex:1; min-height:0; aspect-ratio:1/1; display:grid; place-items:center; max-height:100%}
.rs-root .rs-ring svg{width:100%; height:100%; max-height:100%}
.rs-root .rs-ringc{position:absolute; inset:0; display:grid; place-content:center; text-align:center}
.rs-root .rs-ringc b{display:block; font-size:clamp(17px,1.7vw,30px); font-weight:800; line-height:1;
  font-variant-numeric:tabular-nums}
.rs-root .rs-ringc span{display:block; font-size:clamp(8px,.62vw,11px); color:var(--mut); font-weight:600;
  letter-spacing:.06em; text-transform:uppercase; margin-top:2px}
.rs-root .rs-legend{display:flex; gap:9px; flex-wrap:wrap; justify-content:center; flex:none;
  font-size:clamp(8.5px,.66vw,11px); color:var(--mut); font-weight:600}
.rs-root .rs-legend span{display:flex; align-items:center; gap:4px}
.rs-root .rs-legend i{width:8px; height:8px; border-radius:3px}
.rs-root .rs-legend b{color:#fff}
.rs-root .rs-bars{flex:1; min-height:0; display:flex; align-items:flex-end; gap:clamp(2px,.3vw,5px)}
.rs-root .rs-bcol{flex:1; min-width:0; display:flex; flex-direction:column; align-items:center;
  justify-content:flex-end; height:100%; gap:2px}
.rs-root .rs-bcol i{width:100%; border-radius:5px 5px 2px 2px; opacity:.75; transition:height .5s ease; min-height:2px}
.rs-root .rs-bcol.now i{opacity:1; box-shadow:0 0 12px currentColor}
.rs-root .rs-bval{font-size:clamp(8px,.62vw,11px); font-weight:800; font-variant-numeric:tabular-nums; color:var(--mut)}
.rs-root .rs-bcol.now .rs-bval{color:#fff}
.rs-root .rs-blab{font-size:clamp(7px,.56vw,9.5px); color:var(--faint); font-weight:600; white-space:nowrap}

/* MINI listas (orbita) */
.rs-root .rs-mlist{flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:3px;
  animation:rsFade .4s ease}
.rs-root .rs-mrow{display:flex; align-items:center; gap:6px; flex:none; padding:4px 8px; border-radius:9px;
  background:var(--glass2); border:1px solid rgba(255,255,255,.12)}
.rs-root .rs-tdot{width:7px; height:7px; border-radius:50%; flex:none}
.rs-root .rs-mns{font-size:clamp(10px,.82vw,14px); font-weight:800; letter-spacing:-.01em; white-space:nowrap; flex:none}
.rs-root .rs-mmo{font-size:clamp(8.5px,.66vw,11px); color:var(--mut); font-weight:600; min-width:0; flex:1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-mv{font-size:clamp(9.5px,.76vw,13px); font-weight:800; font-variant-numeric:tabular-nums;
  white-space:nowrap; flex:none}
.rs-root .rs-tag{font-size:8px; font-weight:800; letter-spacing:.08em; padding:1px 5px; border-radius:5px; flex:none}
.rs-root .rs-tag.run{color:${GREEN}; background:rgba(59,232,168,.16); border:1px solid rgba(59,232,168,.38)}
.rs-root .rs-sbgroup{display:flex; flex-direction:column; gap:2px; flex:none}
.rs-root .rs-sbhead{display:flex; align-items:center; gap:6px; font-size:clamp(8px,.62vw,10.5px); font-weight:700;
  letter-spacing:.1em; text-transform:uppercase; color:var(--mut); padding:3px 2px 1px}
.rs-root .rs-sbhead i{width:7px; height:7px; border-radius:2px; flex:none}
.rs-root .rs-sbhead b{margin-left:auto; color:#fff}
.rs-root .rs-more{font-size:9px; color:var(--faint); font-weight:700; padding:1px 4px}

/* PRÓXIMAS semana */
.rs-root .rs-week{flex:1; min-height:0; display:flex; flex-direction:column; gap:5px}
.rs-root .rs-wdays{flex:1; min-height:0; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px}
.rs-root .rs-wday{display:flex; flex-direction:column; min-height:0; overflow:hidden; border-radius:11px;
  background:var(--glass2); border:1px solid rgba(255,255,255,.12)}
.rs-root .rs-wday.today{border-color:rgba(255,45,149,.55); background:rgba(255,45,149,.12)}
.rs-root .rs-wdh{display:flex; align-items:center; justify-content:space-between; gap:4px; flex:none;
  padding:3px 7px; font-size:clamp(8px,.62vw,10.5px); font-weight:700; letter-spacing:.07em;
  text-transform:uppercase; color:var(--mut); border-bottom:1px solid rgba(255,255,255,.12)}
.rs-root .rs-wday.today .rs-wdh{color:#fff}
.rs-root .rs-wdh b{font-variant-numeric:tabular-nums}
.rs-root .rs-wdb{flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:3px; padding:4px 5px}
.rs-root .rs-wcard{border-left:2px solid var(--blue); padding:1px 5px; min-width:0}
.rs-root .rs-wcard b{display:block; font-size:clamp(9.5px,.76vw,13px); font-weight:800; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-wcard span{display:block; font-size:clamp(7.5px,.58vw,10px); color:var(--mut); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-wcard em{font-style:normal; font-size:clamp(7.5px,.58vw,10px); color:var(--amber); font-weight:700}
.rs-root .rs-wdempty{color:var(--faint); font-size:10px; text-align:center; padding-top:4px}
.rs-root .rs-wfoot{display:flex; gap:12px; flex:none; font-size:clamp(8.5px,.66vw,11px); color:var(--mut); font-weight:600}
.rs-root .rs-wfoot b{color:#fff}

/* TIMELINE mini */
.rs-root .rs-tl{flex:1; min-height:0; display:flex; flex-direction:column; gap:4px}
.rs-root .rs-tlscale{display:grid; grid-template-columns:repeat(15,1fr); margin-left:120px; flex:none;
  font-size:9px; color:var(--faint); font-weight:700; font-variant-numeric:tabular-nums}
.rs-root .rs-tlscale b{text-align:center}
.rs-root .rs-tlscale b.now{color:var(--pink)}
.rs-root .rs-tlrows{flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:3px; position:relative}
.rs-root .rs-tlnow{position:absolute; top:0; bottom:0; width:2px; background:var(--pink); z-index:3;
  box-shadow:0 0 10px var(--pink)}
.rs-root .rs-tlrow{display:grid; grid-template-columns:120px 1fr; align-items:center; gap:0; flex:none}
.rs-root .rs-tll{display:flex; align-items:center; gap:5px; padding-right:8px; min-width:0;
  font-size:clamp(9px,.72vw,12px); font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.rs-root .rs-tll i{width:6px; height:6px; border-radius:50%; flex:none}
.rs-root .rs-tltrack{position:relative; height:17px; border-radius:7px; background:rgba(255,255,255,.08)}
.rs-root .rs-tltrack i{position:absolute; top:0; height:17px; border-radius:7px; font-style:normal;
  display:flex; align-items:center; padding:0 7px; font-size:8.5px; font-weight:700; color:#150109;
  white-space:nowrap; overflow:hidden}
.rs-root .rs-tltrack i.run{background:${GREEN}} .rs-root .rs-tltrack i.over{background:${RED}; color:#fff}
.rs-root .rs-tltrack i.fila{background:rgba(255,255,255,.22); color:#fff}

@media (prefers-reduced-motion:reduce){.rs-root *{animation:none!important; transition:none!important}}
`;