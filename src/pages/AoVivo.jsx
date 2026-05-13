import React, { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon,
         ChevronLeft, ChevronRight, Pause, Play, Wrench, CalendarDays } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL     = "https://watcherweb.base44.app/api/functions/watcherBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};
const REFRESH_MS  = 30_000;
const CAROUSEL_MS = 30_000;
const JORDAN_URL  = "https://media.base44.com/images/public/69c166ad19149fb0c07883cb/9c500bcc4_whatsapp_image_970602492293139.jpg";

// ── Paleta Stark Industrial ───────────────────────────────────────────────────
const P = {
  bg:        "#0a0a0f",
  surface:   "#12121a",
  card:      "#1a1a26",
  border:    "#2a2a3e",
  silver:    "#b0b8c8",
  silverDim: "#6a7280",
  red:       "#c0392b",
  amber:     "#d4a017",
  green:     "#27ae60",
  blue:      "#2980b9",
  purple:    "#8e44ad",
  pink:      "#e91e8c",
  cyan:      "#00bcd4",
  white:     "#e8eaf0",
};

// ── Mapeamento FrotaACP → campos canónicos ────────────────────────────────────
// FrotaACP usa: serie, modelo, tipo, recondicao, prioridade, estado, tecnico,
//               timer_status, timer_accumulated_seconds, timer_started_at,
//               previsao_inicio, previsao_fim, aguardaPecas, arquivada, dataConclusao

function normalize(m) {
  return {
    id:                m.id,
    serial_number:     m.serie        || m.serial_number || "---",
    equipment:         m.modelo       || m.equipment     || "",
    status:            m.estado       || m.status        || "",
    tecnico:           m.tecnico      || m.assigned_to   || "",
    timer_status:      m.timer_status || "",
    timer_accumulated: m.timer_accumulated_seconds || m.timer_accumulated || 0,
    timer_started_at:  m.timer_started_at || null,
    scheduled_start:   m.previsao_inicio  || m.start_date  || null,
    scheduled_end:     m.previsao_fim     || m.end_date    || null,
    category:          resolveCategory(m),
    updated_date:      m.updated_date || m.dataConclusao || null,
    arquivada:         m.arquivada || false,
    aguardaPecas:      m.aguardaPecas || false,
  };
}

function resolveCategory(m) {
  // prioridade = true/1 → "prio"
  if (m.prioridade === true || m.prioridade === 1 || m.prioridade === "true") return "prio";
  // recondicao = true/1 → "recon"
  if (m.recondicao === true || m.recondicao === 1 || m.recondicao === "true") return "recon";
  // tipo = "NTS" → "nts"
  const tipo = (m.tipo || "").toLowerCase();
  if (tipo === "nts" || tipo.includes("nts")) return "nts";
  if (tipo === "express" || tipo.includes("express")) return "express";
  // estado concluída
  const st = (m.estado || m.status || "").toLowerCase();
  if (st === "pronta" || st === "concluida" || st === "concluída") return "pronta";
  return "fila";
}

function catColor(m) {
  switch (m.category) {
    case "prio":   return P.red;
    case "recon":  return P.purple;
    case "nts":    return P.pink;
    case "pronta": return P.green;
    case "express":return P.blue;
    default:       return P.silver;
  }
}

// ── Fetch bridge ──────────────────────────────────────────────────────────────
async function fetchFrota() {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: BRIDGE_HEADERS,
    body: JSON.stringify({ action: "list", entity: "FrotaACP" }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Bridge ${res.status}: ${txt.slice(0,120)}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data || data.items || [];
  // filtrar arquivadas
  return list.filter(m => !m.arquivada).map(normalize);
}

// ── Timer helpers ─────────────────────────────────────────────────────────────
function fmtTimer(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function elapsedSec(m) {
  const acc = m.timer_accumulated || 0;
  if (m.timer_status !== "running") return acc;
  const started = m.timer_started_at ? new Date(m.timer_started_at).getTime() : Date.now();
  return acc + Math.floor((Date.now() - started) / 1000);
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("pt-PT", { day:"2-digit", month:"2-digit" });
}
function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ── HUD corners ───────────────────────────────────────────────────────────────
function HudCorners({ size = 7, color = P.silver, opacity = 0.6 }) {
  const s = { position:"absolute", width:size, height:size, opacity };
  const b = `1.5px solid ${color}`;
  return (
    <>
      <span style={{ ...s, top:0, left:0,  borderTop:b, borderLeft:b  }} />
      <span style={{ ...s, top:0, right:0, borderTop:b, borderRight:b }} />
      <span style={{ ...s, bottom:0, left:0,  borderBottom:b, borderLeft:b  }} />
      <span style={{ ...s, bottom:0, right:0, borderBottom:b, borderRight:b }} />
    </>
  );
}

// ── KPI bar ───────────────────────────────────────────────────────────────────
function KpiBar({ machines, dark }) {
  const total   = machines.length;
  const running = machines.filter(m => m.timer_status === "running").length;
  const paused  = machines.filter(m => m.timer_status === "paused").length;
  const done    = machines.filter(m => m.category === "pronta").length;
  const wait    = machines.filter(m => m.aguardaPecas).length;
  const prio    = machines.filter(m => m.category === "prio").length;
  const express = machines.filter(m => m.category === "express").length;
  const kpis = [
    { label:"TOTAL",   v:total,   c:P.silver  },
    { label:"RUNNING", v:running, c:P.green   },
    { label:"PAUSED",  v:paused,  c:P.amber   },
    { label:"DONE",    v:done,    c:P.green   },
    { label:"WAIT",    v:wait,    c:P.amber   },
    { label:"PRIO",    v:prio,    c:P.red     },
    { label:"EXPRESS", v:express, c:P.blue    },
  ];
  return (
    <div style={{ display:"flex", gap:0, background: dark ? "#0d0d14":"#e8eaf0",
      borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>
      {kpis.map(k => (
        <div key={k.label} style={{ flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", padding:"5px 0",
          borderRight:`1px solid ${P.border}` }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:16, fontWeight:700,
            color:k.c, lineHeight:1 }}>{k.v}</span>
          <span style={{ fontSize:7, letterSpacing:1, color:P.silverDim,
            fontFamily:"monospace", marginTop:2 }}>{k.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Machine Card ──────────────────────────────────────────────────────────────
function MachineCard({ machine: m, dark, large }) {
  const [elapsed, setElapsed] = useState(() => elapsedSec(m));
  const isR = m.timer_status === "running";
  const isP = m.timer_status === "paused";
  const col = catColor(m);
  const h   = large ? 155 : 112;

  useEffect(() => {
    setElapsed(elapsedSec(m));
    if (!isR) return;
    const iv = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [m.timer_status, m.timer_accumulated, m.timer_started_at]);

  const timerColor = isR ? P.green : isP ? P.amber : P.silverDim;

  return (
    <div style={{
      position:"relative",
      background: dark ? P.card : "#fff",
      border:`1.5px solid ${col}`,
      boxShadow:`0 0 12px ${col}55, 0 0 4px ${col}33`,
      borderRadius:4,
      height:h, minWidth: large ? 190 : 138,
      padding:"8px 10px",
      display:"flex", flexDirection:"column", justifyContent:"space-between",
      overflow:"hidden",
    }}>
      <HudCorners size={6} color={col} />

      {/* NS */}
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize: large ? 14:10,
        fontWeight:700, color:P.white, letterSpacing:1,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {m.serial_number}
      </div>

      {/* Modelo */}
      {m.equipment && (
        <div style={{ fontSize: large?10:8, color:P.silverDim,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {m.equipment}
        </div>
      )}

      {/* Técnico */}
      {m.tecnico && (
        <div style={{ fontSize:8, color:col, fontWeight:600,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          👤 {m.tecnico}
        </div>
      )}

      {/* Timer */}
      {(isR || isP) && (
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize: large?13:10,
          fontWeight:700, color:timerColor, letterSpacing:1 }}>
          {fmtTimer(elapsed)}
        </div>
      )}

      {/* Status badge */}
      <div style={{
        fontSize:7, padding:"2px 5px",
        background:`${col}22`, color:col,
        border:`1px solid ${col}55`, borderRadius:2,
        fontWeight:700, letterSpacing:1, alignSelf:"flex-start",
        textTransform:"uppercase",
      }}>{m.status || "—"}</div>

      {/* Dot running */}
      {isR && (
        <div style={{
          position:"absolute", top:5, right:5,
          width:6, height:6, borderRadius:"50%",
          background:P.green, boxShadow:`0 0 6px ${P.green}`,
          animation:"pulse 1.5s infinite",
        }} />
      )}
    </div>
  );
}

// ── Slide: Em Andamento ───────────────────────────────────────────────────────
function SlideAndamento({ machines, dark }) {
  const running = machines.filter(m => m.timer_status === "running");
  const paused  = machines.filter(m => m.timer_status === "paused");
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px", display:"flex", flexDirection:"column", gap:10 }}>
      {running.length > 0 && (
        <div>
          <div style={{ fontSize:9, letterSpacing:2, color:P.green, marginBottom:8, fontFamily:"monospace" }}>
            ▶ EM EXECUÇÃO ({running.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {running.map(m => <MachineCard key={m.id} machine={m} dark={dark} large />)}
          </div>
        </div>
      )}
      {paused.length > 0 && (
        <div>
          <div style={{ fontSize:9, letterSpacing:2, color:P.amber, marginBottom:8, fontFamily:"monospace" }}>
            ⏸ PAUSADAS ({paused.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {paused.map(m => <MachineCard key={m.id} machine={m} dark={dark} />)}
          </div>
        </div>
      )}
      {running.length === 0 && paused.length === 0 && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          color:P.silverDim, fontFamily:"monospace", fontSize:13 }}>
          NENHUMA MÁQUINA EM ANDAMENTO
        </div>
      )}
    </div>
  );
}

// ── Slide: Prioritárias ───────────────────────────────────────────────────────
function SlidePrioritarias({ machines, dark }) {
  const prio = machines.filter(m => m.category === "prio");
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.red, marginBottom:8, fontFamily:"monospace" }}>
        🔴 PRIORITÁRIAS / UTS ({prio.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {prio.length === 0
          ? <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA PRIORITÁRIA</div>
          : prio.map(m => <MachineCard key={m.id} machine={m} dark={dark} large />)}
      </div>
    </div>
  );
}

// ── Slide: Fila ACP ───────────────────────────────────────────────────────────
function SlideFilaACP({ machines, dark }) {
  const fila = machines
    .filter(m => !["pronta","concluida","concluída"].includes((m.status||"").toLowerCase())
              && m.timer_status !== "running"
              && m.timer_status !== "paused"
              && m.category !== "nts")
    .sort((a,b) => {
      const ap = a.category === "prio" ? 0 : 1;
      const bp = b.category === "prio" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (a.scheduled_start && b.scheduled_start)
        return new Date(a.scheduled_start) - new Date(b.scheduled_start);
      if (a.scheduled_start) return -1;
      if (b.scheduled_start) return 1;
      return 0;
    });

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.silver, marginBottom:8, fontFamily:"monospace" }}>
        📋 FILA ACP ({fila.length})
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {fila.length === 0
          ? <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12 }}>FILA VAZIA</div>
          : fila.map((m, i) => {
            const col = catColor(m);
            return (
              <div key={m.id} style={{
                display:"flex", alignItems:"center", gap:8,
                background: dark ? P.card : "#fff",
                border:`1px solid ${col}44`,
                borderLeft:`3px solid ${col}`,
                borderRadius:3, padding:"6px 10px",
              }}>
                <span style={{ fontFamily:"monospace", color:P.silverDim, fontSize:10, minWidth:22 }}>#{i+1}</span>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:P.white, fontWeight:700, minWidth:110 }}>
                  {m.serial_number}
                </span>
                <span style={{ fontSize:10, color:P.silverDim, flex:1 }}>{m.equipment}</span>
                <span style={{ fontSize:9, color:col, fontWeight:600 }}>{m.tecnico}</span>
                {m.scheduled_start && (
                  <span style={{ fontSize:9, color:P.silverDim, fontFamily:"monospace" }}>
                    {fmtDate(m.scheduled_start)} → {fmtDate(m.scheduled_end)}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Slide: NTS ────────────────────────────────────────────────────────────────
function SlideNTS({ machines, dark }) {
  const nts = machines.filter(m => m.category === "nts");
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.pink, marginBottom:8, fontFamily:"monospace" }}>
        🔁 NTS — NÃO FROTA ACP ({nts.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {nts.length === 0
          ? <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA NTS</div>
          : nts.map(m => <MachineCard key={m.id} machine={m} dark={dark} />)}
      </div>
    </div>
  );
}

// ── Slide: Recondicionamento ──────────────────────────────────────────────────
function SlideRecon({ machines, dark }) {
  const recon = machines.filter(m => m.category === "recon");
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.purple, marginBottom:8, fontFamily:"monospace" }}>
        🔧 RECONDICIONAMENTO ({recon.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {recon.length === 0
          ? <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA EM RECON</div>
          : recon.map(m => <MachineCard key={m.id} machine={m} dark={dark} />)}
      </div>
    </div>
  );
}

// ── Slide: Concluídas ─────────────────────────────────────────────────────────
function SlideConcluidas({ machines, dark }) {
  const done = machines
    .filter(m => m.category === "pronta")
    .sort((a,b) => new Date(b.updated_date||0) - new Date(a.updated_date||0));
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.green, marginBottom:8, fontFamily:"monospace" }}>
        ✅ CONCLUÍDAS ({done.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {done.length === 0
          ? <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA CONCLUÍDA</div>
          : done.map(m => <MachineCard key={m.id} machine={m} dark={dark} />)}
      </div>
    </div>
  );
}

// ── Slide: Express ────────────────────────────────────────────────────────────
function SlideExpress({ machines, dark }) {
  const exp = machines.filter(m => m.category === "express");
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"10px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.blue, marginBottom:8, fontFamily:"monospace" }}>
        ⚡ EXPRESS ({exp.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {exp.length === 0
          ? <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA EXPRESS</div>
          : exp.map(m => <MachineCard key={m.id} machine={m} dark={dark} large />)}
      </div>
    </div>
  );
}

// ── Slide: Gantt ──────────────────────────────────────────────────────────────
function SlideGantt({ machines, dark }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const DAYS  = 14;
  const days  = Array.from({ length:DAYS }, (_,i) => {
    const d = new Date(today); d.setDate(d.getDate()+i); return d;
  });
  const scheduled = machines
    .filter(m => m.scheduled_start && m.scheduled_end)
    .slice(0, 22);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"10px 16px", overflow:"hidden" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:P.cyan, marginBottom:6, fontFamily:"monospace" }}>
        📅 TIMELINE — 14 DIAS ({scheduled.length} máquinas)
      </div>
      {/* Header datas */}
      <div style={{ display:"flex", paddingLeft:132, marginBottom:2, flexShrink:0 }}>
        {days.map((d,i) => {
          const isToday = d.getTime()===today.getTime();
          return (
            <div key={i} style={{
              flex:1, textAlign:"center", fontSize:7, fontFamily:"monospace",
              color: isToday ? P.red : P.silverDim,
              borderRight:`1px solid ${P.border}33`,
              background: isToday ? P.red+"11" : "transparent",
              padding:"1px 0",
            }}>{d.getDate()}/{d.getMonth()+1}</div>
          );
        })}
      </div>
      {/* Rows */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {scheduled.length === 0 ? (
          <div style={{ color:P.silverDim, fontFamily:"monospace", fontSize:12, padding:16 }}>SEM AGENDAMENTOS</div>
        ) : scheduled.map(m => {
          const sd = new Date(m.scheduled_start); sd.setHours(0,0,0,0);
          const ed = new Date(m.scheduled_end);   ed.setHours(0,0,0,0);
          const startOff = Math.max(0, daysDiff(today, sd));
          const dur      = Math.max(1, daysDiff(sd, ed)+1);
          const leftPct  = (startOff / DAYS) * 100;
          const widPct   = Math.min((dur / DAYS) * 100, 100 - leftPct);
          const col      = catColor(m);
          return (
            <div key={m.id} style={{
              display:"flex", alignItems:"center",
              height:32, borderBottom:`1px solid ${P.border}22`,
            }}>
              <div style={{ width:132, minWidth:132, paddingRight:6,
                fontFamily:"'Orbitron',monospace", fontSize:9, color:P.white,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {m.serial_number}
              </div>
              <div style={{ flex:1, position:"relative", height:18 }}>
                {days.map((_,i) => (
                  <div key={i} style={{
                    position:"absolute", left:`${(i/DAYS)*100}%`,
                    top:0, bottom:0, width:1, background:`${P.border}44`
                  }} />
                ))}
                <div style={{
                  position:"absolute", left:"0%",
                  top:0, bottom:0, width:2, background:`${P.red}77`
                }} />
                {leftPct < 100 && (
                  <div style={{
                    position:"absolute",
                    left:`${leftPct}%`, width:`${Math.max(widPct,0.5)}%`,
                    top:"10%", height:"80%",
                    background:`${col}cc`,
                    border:`1px solid ${col}`,
                    borderRadius:2,
                    display:"flex", alignItems:"center",
                    paddingLeft:3, overflow:"hidden",
                  }}>
                    {widPct > 10 && (
                      <span style={{ fontFamily:"'Orbitron',monospace", fontSize:7,
                        color:"#fff", whiteSpace:"nowrap", fontWeight:700 }}>
                        {m.serial_number}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────────────────
const SLIDES = [
  { id:"andamento",    label:"EM ANDAMENTO", icon:<Play size={13}/>,         color:P.green  },
  { id:"prioritarias", label:"PRIORITÁRIAS", icon:<Flag size={13}/>,         color:P.red    },
  { id:"gantt",        label:"TIMELINE",     icon:<CalendarDays size={13}/>, color:P.cyan   },
  { id:"fila",         label:"FILA ACP",     icon:<ListOrdered size={13}/>,  color:P.silver },
  { id:"nts",          label:"NTS",          icon:<Wrench size={13}/>,       color:P.pink   },
  { id:"recon",        label:"RECON",        icon:<Activity size={13}/>,     color:P.purple },
  { id:"concluidas",   label:"CONCLUÍDAS",   icon:<CheckCircle2 size={13}/>, color:P.green  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AoVivo() {
  const [machines,  setMachines]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [slideIdx,  setSlideIdx]  = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [dark,      setDark]      = useState(true);
  const [lastSync,  setLastSync]  = useState(null);
  const carouselRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const list = await fetchFrota();
      setMachines(list);
      setLastSync(new Date());
      setError(null);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); const iv = setInterval(loadData, REFRESH_MS); return () => clearInterval(iv); }, [loadData]);

  const next = useCallback(() => setSlideIdx(i => (i+1) % SLIDES.length), []);
  const prev = useCallback(() => setSlideIdx(i => (i-1+SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) { clearInterval(carouselRef.current); return; }
    carouselRef.current = setInterval(next, CAROUSEL_MS);
    return () => clearInterval(carouselRef.current);
  }, [paused, next]);

  useEffect(() => {
    const h = e => {
      if (e.key==="ArrowRight") next();
      else if (e.key==="ArrowLeft") prev();
      else if (e.key===" ") setPaused(p=>!p);
    };
    window.addEventListener("keydown",h);
    return () => window.removeEventListener("keydown",h);
  }, [next, prev]);

  const sl = SLIDES[slideIdx];

  const renderSlide = () => {
    const p = { machines, dark };
    switch(sl.id) {
      case "andamento":    return <SlideAndamento    {...p}/>;
      case "prioritarias": return <SlidePrioritarias {...p}/>;
      case "gantt":        return <SlideGantt        {...p}/>;
      case "fila":         return <SlideFilaACP      {...p}/>;
      case "nts":          return <SlideNTS          {...p}/>;
      case "recon":        return <SlideRecon        {...p}/>;
      case "concluidas":   return <SlideConcluidas   {...p}/>;
      default:             return null;
    }
  };

  const bg = dark ? P.bg : "#f0f2f5";

  return (
    <div style={{ width:"100vw", height:"100vh", background:bg, color:P.white,
      display:"flex", flexDirection:"column", fontFamily:"'Inter',sans-serif",
      overflow:"hidden", position:"relative" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;600&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes progress{from{width:0}to{width:100%}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${P.border};border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10,
        padding:"6px 14px",
        background: dark ? "#0d0d14" : "#1a1a2e",
        borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>

        {/* Brand */}
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:130 }}>
          <div style={{ width:5, height:22,
            background:`linear-gradient(180deg,${P.red},${P.amber})`, borderRadius:1 }} />
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:900,
              color:P.white, letterSpacing:3, lineHeight:1 }}>OFICINA STILL</div>
            <div style={{ fontSize:7, color:P.silverDim, letterSpacing:2, fontFamily:"monospace" }}>
              AO VIVO • {machines.length} MÁQ
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, flex:1, justifyContent:"center", flexWrap:"wrap" }}>
          {SLIDES.map((s,i) => (
            <button key={s.id} onClick={() => setSlideIdx(i)} style={{
              display:"flex", alignItems:"center", gap:3,
              padding:"4px 8px",
              background: i===slideIdx ? `${s.color}22` : "transparent",
              border:`1px solid ${i===slideIdx ? s.color : P.border}`,
              borderRadius:3, cursor:"pointer",
              color: i===slideIdx ? s.color : P.silverDim,
              fontSize:8, fontFamily:"monospace", letterSpacing:1, transition:"all .2s",
            }}>
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {[
            { onClick:prev, children:<ChevronLeft size={14}/> },
            { onClick:()=>setPaused(p=>!p), children: paused?<Play size={14}/>:<Pause size={14}/>,
              color: paused?P.amber:P.green },
            { onClick:next, children:<ChevronRight size={14}/> },
            { onClick:()=>setDark(d=>!d), children: dark?<Sun size={14}/>:<Moon size={14}/> },
            { onClick:loadData, children:"SYNC", isText:true, color:P.cyan },
          ].map((b,i) => (
            <button key={i} onClick={b.onClick} style={{
              background:"transparent",
              border:`1px solid ${P.border}`,
              color: b.color || P.silverDim,
              borderRadius:3, padding: b.isText?"3px 8px":"4px 6px",
              cursor:"pointer", display:"flex", alignItems:"center",
              fontSize:8, fontFamily:"monospace",
            }}>{b.children}</button>
          ))}
          {lastSync && (
            <span style={{ fontSize:7, color:P.silverDim, fontFamily:"monospace" }}>
              {lastSync.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
            </span>
          )}
        </div>
      </div>

      <KpiBar machines={machines} dark={dark} />

      {/* Slide title bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8,
        padding:"5px 16px",
        background: dark ? P.surface : "#e8eaf0",
        borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>
        <span style={{ color:sl.color }}>{sl.icon}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700,
          letterSpacing:2, color:sl.color }}>{sl.label}</span>
        <div style={{ flex:1, height:2, background:P.border, borderRadius:1, overflow:"hidden" }}>
          {!paused && <div style={{
            height:"100%", background:sl.color, borderRadius:1,
            animation:`progress ${CAROUSEL_MS/1000}s linear`
          }} />}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {loading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:10 }}>
            <div style={{ width:32, height:32, border:`3px solid ${P.border}`,
              borderTop:`3px solid ${P.red}`, borderRadius:"50%",
              animation:"spin 1s linear infinite" }} />
            <div style={{ fontFamily:"monospace", color:P.silverDim, fontSize:11 }}>
              INICIALIZANDO SISTEMAS…
            </div>
          </div>
        ) : error ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:8 }}>
            <div style={{ color:P.red, fontFamily:"monospace", fontSize:12 }}>⚠ {error}</div>
            <button onClick={loadData} style={{
              padding:"6px 14px", background:`${P.red}22`,
              border:`1px solid ${P.red}`, color:P.red,
              borderRadius:3, cursor:"pointer", fontFamily:"monospace", fontSize:9,
            }}>RETRY</button>
          </div>
        ) : renderSlide()}
      </div>

      {/* Dots */}
      <div style={{ display:"flex", justifyContent:"center", gap:5,
        padding:"5px", background: dark?"#0d0d14":"#1a1a2e",
        borderTop:`1px solid ${P.border}`, flexShrink:0 }}>
        {SLIDES.map((s,i) => (
          <div key={i} onClick={()=>setSlideIdx(i)} style={{
            width: i===slideIdx ? 16 : 6, height:6, borderRadius:3,
            background: i===slideIdx ? s.color : P.border,
            cursor:"pointer", transition:"all .3s",
          }} />
        ))}
      </div>

      {/* Jordan watermark */}
      <img src={JORDAN_URL} alt="Jordan" style={{
        position:"fixed", bottom:38, right:10,
        width:34, height:34, borderRadius:"50%",
        opacity:.22, objectFit:"cover",
        border:`1px solid ${P.border}`, pointerEvents:"none",
      }} />
    </div>
  );
}
