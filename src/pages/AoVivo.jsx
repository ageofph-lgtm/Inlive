import React, { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon,
         ChevronLeft, ChevronRight, Pause, Play, Wrench, CalendarDays } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL     = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};
const REFRESH_MS   = 30_000;
const CAROUSEL_MS  = 30_000;
const JORDAN_URL   = "https://media.base44.com/images/public/69c166ad19149fb0c07883cb/9c500bcc4_whatsapp_image_970602492293139.jpg";

// ── Paleta Stark Industrial ───────────────────────────────────────────────────
const PALETTE = {
  bg:        "#0a0a0f",
  surface:   "#12121a",
  card:      "#1a1a26",
  border:    "#2a2a3e",
  silver:    "#b0b8c8",
  silverDim: "#6a7280",
  red:       "#c0392b",
  redGlow:   "#e74c3c",
  amber:     "#d4a017",
  green:     "#27ae60",
  blue:      "#2980b9",
  purple:    "#8e44ad",
  pink:      "#e91e8c",
  cyan:      "#00bcd4",
  white:     "#e8eaf0",
};

// cor semântica por categoria
const CAT_COLOR = {
  prioritaria: PALETTE.red,
  recon:       PALETTE.purple,
  nts:         PALETTE.pink,
  pronta:      PALETTE.green,
  fila:        PALETTE.silver,
  express:     PALETTE.blue,
};

function catColor(machine) {
  const st  = (machine.status || "").toLowerCase();
  const cat = (machine.category || machine.tipo || "").toLowerCase();
  if (st === "pronta" || st === "concluida" || st === "concluída") return PALETTE.green;
  if (cat.includes("prio") || cat.includes("uts"))    return PALETTE.red;
  if (cat.includes("recon"))                          return PALETTE.purple;
  if (cat.includes("nts"))                            return PALETTE.pink;
  if (cat.includes("express"))                        return PALETTE.blue;
  return PALETTE.silver;
}

function statusGlow(machine) {
  const c = catColor(machine);
  return `0 0 12px ${c}66, 0 0 4px ${c}44`;
}

// ── Fetch bridge ──────────────────────────────────────────────────────────────
async function fetchBridge(action, payload = {}) {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: BRIDGE_HEADERS,
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`Bridge ${res.status}`);
  return res.json();
}

// ── Timer helpers ─────────────────────────────────────────────────────────────
function fmtTimer(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function elapsedSec(machine) {
  const acc  = machine.timer_accumulated || 0;
  const isR  = machine.timer_status === "running";
  if (!isR) return acc;
  const started = machine.timer_started_at
    ? new Date(machine.timer_started_at).getTime()
    : Date.now();
  return acc + Math.floor((Date.now() - started) / 1000);
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function addWorkdays(date, n) {
  const d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function fmtDate(d) {
  if (!d) return "--";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-PT", { day:"2-digit", month:"2-digit" });
}

function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ── HUD corner decoration ─────────────────────────────────────────────────────
function HudCorners({ size = 8, color = PALETTE.silver, opacity = 0.5 }) {
  const s = { position:"absolute", width: size, height: size, opacity };
  const b = `2px solid ${color}`;
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
function KpiBar({ machines, darkMode }) {
  const total    = machines.length;
  const running  = machines.filter(m => m.timer_status === "running").length;
  const paused   = machines.filter(m => m.timer_status === "paused").length;
  const done     = machines.filter(m => ["pronta","concluida","concluída"].includes((m.status||"").toLowerCase())).length;
  const waiting  = machines.filter(m => (m.status||"").toLowerCase() === "aguarda material").length;
  const prio     = machines.filter(m => (m.category||m.tipo||"").toLowerCase().includes("prio")).length;
  const express  = machines.filter(m => (m.category||m.tipo||"").toLowerCase().includes("express")).length;

  const kpis = [
    { label:"TOTAL",   value: total,   color: PALETTE.silver  },
    { label:"RUNNING", value: running, color: PALETTE.green   },
    { label:"PAUSED",  value: paused,  color: PALETTE.amber   },
    { label:"DONE",    value: done,    color: PALETTE.green    },
    { label:"WAIT",    value: waiting, color: PALETTE.amber    },
    { label:"PRIO",    value: prio,    color: PALETTE.red      },
    { label:"EXPRESS", value: express, color: PALETTE.blue     },
  ];

  return (
    <div style={{
      display:"flex", gap:1, padding:"6px 12px",
      background: darkMode ? "#0d0d14" : "#f0f2f5",
      borderBottom:`1px solid ${PALETTE.border}`,
    }}>
      {kpis.map(k => (
        <div key={k.label} style={{
          flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", padding:"4px 0",
          borderRight:`1px solid ${PALETTE.border}`,
        }}>
          <span style={{
            fontFamily:"'Orbitron',monospace", fontSize:18, fontWeight:700,
            color: k.color, lineHeight:1,
          }}>{k.value}</span>
          <span style={{
            fontSize:8, letterSpacing:1, color: PALETTE.silverDim,
            fontFamily:"monospace", marginTop:2,
          }}>{k.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Machine Card (grande = running, pequeno = paused/outros) ──────────────────
function MachineCard({ machine, darkMode, large = false }) {
  const [elapsed, setElapsed] = useState(() => elapsedSec(machine));
  const isRunning = machine.timer_status === "running";
  const isPaused  = machine.timer_status === "paused";
  const col       = catColor(machine);
  const h         = large ? 155 : 110;

  useEffect(() => {
    setElapsed(elapsedSec(machine));
    if (!isRunning) return;
    const iv = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [machine.timer_status, machine.timer_accumulated, machine.timer_started_at, isRunning]);

  const timerColor  = isRunning ? PALETTE.green : isPaused ? PALETTE.amber : PALETTE.silverDim;
  const borderStyle = `1.5px solid ${col}`;
  const ns = machine.serial_number || machine.frota || "---";
  const model = machine.equipment || machine.modelo || "";
  const tech  = machine.assigned_to || machine.tecnico || "";

  return (
    <div style={{
      position:"relative",
      background: darkMode ? PALETTE.card : "#ffffff",
      border: borderStyle,
      boxShadow: statusGlow(machine),
      borderRadius:4,
      height: h,
      minWidth: large ? 200 : 140,
      padding:"8px 10px",
      display:"flex", flexDirection:"column", justifyContent:"space-between",
      overflow:"hidden",
    }}>
      <HudCorners size={6} color={col} opacity={0.7} />

      {/* NS em destaque */}
      <div style={{
        fontFamily:"'Orbitron',monospace", fontSize: large ? 15 : 11,
        fontWeight:700, color: PALETTE.white, letterSpacing:1,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
      }}>{ns}</div>

      {/* Modelo */}
      {model && (
        <div style={{
          fontSize: large ? 10 : 8, color: PALETTE.silverDim,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}>{model}</div>
      )}

      {/* Técnico */}
      {tech && (
        <div style={{
          fontSize:8, color: col, fontWeight:600,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}>👤 {tech}</div>
      )}

      {/* Timer */}
      {(isRunning || isPaused) && (
        <div style={{
          fontFamily:"'Orbitron',monospace", fontSize: large ? 13 : 10,
          fontWeight:700, color: timerColor, letterSpacing:1,
        }}>{fmtTimer(elapsed)}</div>
      )}

      {/* Badge status */}
      <div style={{
        fontSize:7, padding:"2px 5px",
        background: col + "33", color: col,
        border:`1px solid ${col}66`, borderRadius:2,
        fontWeight:700, letterSpacing:1, alignSelf:"flex-start",
        textTransform:"uppercase",
      }}>
        {machine.status || "—"}
      </div>

      {/* Indicador running */}
      {isRunning && (
        <div style={{
          position:"absolute", top:4, right:4,
          width:6, height:6, borderRadius:"50%",
          background: PALETTE.green,
          boxShadow:`0 0 6px ${PALETTE.green}`,
          animation:"pulse 1.5s infinite",
        }} />
      )}
    </div>
  );
}

// ── Slide: Em Andamento ───────────────────────────────────────────────────────
function SlideAndamento({ machines, darkMode }) {
  const running = machines.filter(m => m.timer_status === "running");
  const paused  = machines.filter(m => m.timer_status === "paused");

  return (
    <div style={{ flex:1, overflowY:"hidden", padding:"12px 16px", display:"flex", flexDirection:"column", gap:12 }}>
      {running.length > 0 && (
        <div>
          <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.green, marginBottom:8, fontFamily:"monospace" }}>
            ▶ EM EXECUÇÃO ({running.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {running.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} large />)}
          </div>
        </div>
      )}
      {paused.length > 0 && (
        <div>
          <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.amber, marginBottom:8, fontFamily:"monospace" }}>
            ⏸ PAUSADAS ({paused.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {paused.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} />)}
          </div>
        </div>
      )}
      {running.length === 0 && paused.length === 0 && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          color:PALETTE.silverDim, fontFamily:"monospace", fontSize:13 }}>
          NENHUMA MÁQUINA EM ANDAMENTO
        </div>
      )}
    </div>
  );
}

// ── Slide: Prioritárias ───────────────────────────────────────────────────────
function SlidePrioritarias({ machines, darkMode }) {
  const prio = machines.filter(m =>
    (m.category||m.tipo||"").toLowerCase().includes("prio") ||
    (m.category||m.tipo||"").toLowerCase().includes("uts")
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.red, marginBottom:8, fontFamily:"monospace" }}>
        🔴 PRIORITÁRIAS / UTS ({prio.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {prio.length === 0
          ? <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA PRIORITÁRIA</div>
          : prio.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} large />)
        }
      </div>
    </div>
  );
}

// ── Slide: Fila ACP ───────────────────────────────────────────────────────────
function SlideFilaACP({ machines, darkMode }) {
  const fila = machines.filter(m => {
    const st  = (m.status||"").toLowerCase();
    const cat = (m.category||m.tipo||"").toLowerCase();
    return (st === "a-fazer" || st === "a fazer" || st === "queue") && !cat.includes("nts");
  }).sort((a,b) => {
    const ap = (a.category||"").toLowerCase().includes("prio") ? 0 : 1;
    const bp = (b.category||"").toLowerCase().includes("prio") ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ad = a.scheduled_start || a.start_date || "";
    const bd = b.scheduled_start || b.start_date || "";
    if (ad && bd) return new Date(ad) - new Date(bd);
    if (ad) return -1; if (bd) return 1;
    return 0;
  });

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.silver, marginBottom:8, fontFamily:"monospace" }}>
        📋 FILA ACP ({fila.length})
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {fila.length === 0
          ? <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12 }}>FILA VAZIA</div>
          : fila.map((m, i) => {
            const col = catColor(m);
            const ns  = m.serial_number || m.frota || "---";
            const sd  = m.scheduled_start || m.start_date;
            const ed  = m.scheduled_end   || m.end_date;
            return (
              <div key={m.id} style={{
                display:"flex", alignItems:"center", gap:8,
                background: darkMode ? PALETTE.card : "#fff",
                border:`1px solid ${col}44`,
                borderLeft:`3px solid ${col}`,
                borderRadius:3, padding:"6px 10px",
                position:"relative",
              }}>
                <span style={{ fontFamily:"monospace", color:PALETTE.silverDim, fontSize:10, minWidth:20 }}>#{i+1}</span>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:12, color:PALETTE.white, fontWeight:700, minWidth:120 }}>{ns}</span>
                <span style={{ fontSize:10, color:PALETTE.silverDim, flex:1 }}>{m.equipment || m.modelo || ""}</span>
                <span style={{ fontSize:9, color:col, fontWeight:600 }}>{m.assigned_to || m.tecnico || ""}</span>
                {sd && (
                  <span style={{ fontSize:9, color:PALETTE.silverDim, fontFamily:"monospace" }}>
                    {fmtDate(sd)} → {fmtDate(ed)}
                  </span>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ── Slide: NTS ────────────────────────────────────────────────────────────────
function SlideNTS({ machines, darkMode }) {
  const nts = machines.filter(m => (m.category||m.tipo||"").toLowerCase().includes("nts"));
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.pink, marginBottom:8, fontFamily:"monospace" }}>
        🔁 NTS — NÃO FROTA ACP ({nts.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {nts.length === 0
          ? <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA NTS</div>
          : nts.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} />)
        }
      </div>
    </div>
  );
}

// ── Slide: Recondicionamento ──────────────────────────────────────────────────
function SlideRecon({ machines, darkMode }) {
  const recon = machines.filter(m => (m.category||m.tipo||"").toLowerCase().includes("recon"));
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.purple, marginBottom:8, fontFamily:"monospace" }}>
        🔧 RECONDICIONAMENTO ({recon.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {recon.length === 0
          ? <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA EM RECON</div>
          : recon.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} />)
        }
      </div>
    </div>
  );
}

// ── Slide: Concluídas ─────────────────────────────────────────────────────────
function SlideConcluidas({ machines, darkMode }) {
  const done = machines
    .filter(m => ["pronta","concluida","concluída"].includes((m.status||"").toLowerCase()))
    .sort((a,b) => new Date(b.updated_date||0) - new Date(a.updated_date||0));

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.green, marginBottom:8, fontFamily:"monospace" }}>
        ✅ CONCLUÍDAS ({done.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {done.length === 0
          ? <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA CONCLUÍDA</div>
          : done.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} />)
        }
      </div>
    </div>
  );
}

// ── Slide: Gantt Timeline ─────────────────────────────────────────────────────
function SlideGantt({ machines, darkMode }) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const days = Array.from({ length:14 }, (_,i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  const totalDays = 14;

  const scheduled = machines.filter(m => {
    const sd = m.scheduled_start || m.start_date;
    const ed = m.scheduled_end   || m.end_date;
    return sd && ed;
  }).slice(0,20);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"12px 16px", overflow:"hidden" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.cyan, marginBottom:8, fontFamily:"monospace" }}>
        📅 TIMELINE — 14 DIAS ÚTEIS
      </div>

      {/* Header datas */}
      <div style={{ display:"flex", marginBottom:4, paddingLeft:140 }}>
        {days.map((d,i) => {
          const isToday = d.getTime() === today.getTime();
          const isSun = d.getDay() === 0, isSat = d.getDay() === 6;
          return (
            <div key={i} style={{
              flex:1, textAlign:"center", fontSize:7, fontFamily:"monospace",
              color: isToday ? PALETTE.red : isSat||isSun ? PALETTE.silverDim+"66" : PALETTE.silverDim,
              borderRight:`1px solid ${PALETTE.border}`,
              background: isToday ? PALETTE.red+"11" : "transparent",
              padding:"2px 0",
            }}>
              {d.getDate()}/{d.getMonth()+1}
              {isToday && <div style={{ width:2, height:2, background:PALETTE.red, margin:"0 auto", borderRadius:"50%" }} />}
            </div>
          );
        })}
      </div>

      {/* Rows */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {scheduled.length === 0 ? (
          <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12, padding:16 }}>
            SEM AGENDAMENTOS
          </div>
        ) : scheduled.map(m => {
          const sd   = new Date(m.scheduled_start || m.start_date);
          const ed   = new Date(m.scheduled_end   || m.end_date);
          sd.setHours(0,0,0,0); ed.setHours(0,0,0,0);
          const startOff = Math.max(0, daysDiff(today, sd));
          const dur      = Math.max(1, daysDiff(sd, ed) + 1);
          const leftPct  = (startOff / totalDays) * 100;
          const widPct   = Math.min((dur / totalDays) * 100, 100 - leftPct);
          const col      = catColor(m);
          const ns       = m.serial_number || m.frota || "---";

          return (
            <div key={m.id} style={{
              display:"flex", alignItems:"center",
              height:34, borderBottom:`1px solid ${PALETTE.border}22`,
            }}>
              {/* Label */}
              <div style={{
                width:140, minWidth:140, paddingRight:8, overflow:"hidden",
                fontFamily:"'Orbitron',monospace", fontSize:10, color:PALETTE.white,
                textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>{ns}</div>

              {/* Barra */}
              <div style={{ flex:1, position:"relative", height:20, overflow:"hidden" }}>
                {/* grid lines */}
                {days.map((_,i) => (
                  <div key={i} style={{
                    position:"absolute", left:`${(i/totalDays)*100}%`,
                    top:0, bottom:0, width:1,
                    background: PALETTE.border + "44",
                  }} />
                ))}

                {/* TODAY line */}
                <div style={{
                  position:"absolute",
                  left:`${(0/totalDays)*100}%`,
                  top:0, bottom:0, width:2,
                  background: PALETTE.red + "88",
                }} />

                {/* Bar */}
                {leftPct < 100 && (
                  <div style={{
                    position:"absolute",
                    left:`${leftPct}%`,
                    width:`${widPct}%`,
                    top:"15%", height:"70%",
                    background: col + "cc",
                    border:`1px solid ${col}`,
                    borderRadius:2,
                    display:"flex", alignItems:"center",
                    paddingLeft:4, overflow:"hidden",
                  }}>
                    {widPct > 12 && (
                      <span style={{
                        fontFamily:"'Orbitron',monospace", fontSize:8,
                        color:"#fff", whiteSpace:"nowrap", fontWeight:700,
                      }}>{ns}</span>
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

// ── Slide: Express ────────────────────────────────────────────────────────────
function SlideExpress({ machines, darkMode }) {
  const exp = machines.filter(m => (m.category||m.tipo||"").toLowerCase().includes("express"));
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
      <div style={{ fontSize:9, letterSpacing:2, color:PALETTE.blue, marginBottom:8, fontFamily:"monospace" }}>
        ⚡ EXPRESS ({exp.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {exp.length === 0
          ? <div style={{ color:PALETTE.silverDim, fontFamily:"monospace", fontSize:12 }}>NENHUMA EXPRESS</div>
          : exp.map(m => <MachineCard key={m.id} machine={m} darkMode={darkMode} large />)
        }
      </div>
    </div>
  );
}

// ── Slides config ─────────────────────────────────────────────────────────────
const SLIDES = [
  { id:"andamento",    label:"EM ANDAMENTO",    icon: <Play size={14}/>,          color: PALETTE.green  },
  { id:"prioritarias", label:"PRIORITÁRIAS",    icon: <Flag size={14}/>,          color: PALETTE.red    },
  { id:"gantt",        label:"TIMELINE",        icon: <CalendarDays size={14}/>,  color: PALETTE.cyan   },
  { id:"fila",         label:"FILA ACP",        icon: <ListOrdered size={14}/>,   color: PALETTE.silver },
  { id:"nts",          label:"NTS",             icon: <Wrench size={14}/>,        color: PALETTE.pink   },
  { id:"recon",        label:"RECON",           icon: <Activity size={14}/>,      color: PALETTE.purple },
  { id:"concluidas",   label:"CONCLUÍDAS",      icon: <CheckCircle2 size={14}/>,  color: PALETTE.green  },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function AoVivo() {
  const [machines,  setMachines]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [slideIdx,  setSlideIdx]  = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [darkMode,  setDarkMode]  = useState(true);
  const [lastSync,  setLastSync]  = useState(null);
  const carouselRef = useRef(null);

  // Fetch machines
  const fetchMachines = useCallback(async () => {
    try {
      const data = await fetchBridge("list_machines");
      const list = Array.isArray(data) ? data
                 : data.machines || data.data || data.items || [];
      setMachines(list);
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
    const iv = setInterval(fetchMachines, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchMachines]);

  // Carousel
  const next = useCallback(() => setSlideIdx(i => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setSlideIdx(i => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) { clearInterval(carouselRef.current); return; }
    carouselRef.current = setInterval(next, CAROUSEL_MS);
    return () => clearInterval(carouselRef.current);
  }, [paused, next]);

  // Keyboard
  useEffect(() => {
    const handler = e => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") setPaused(p => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const currentSlide = SLIDES[slideIdx];
  const bg = darkMode ? PALETTE.bg : "#f0f2f5";
  const textPrimary = darkMode ? PALETTE.white : "#1a1a2e";

  const renderSlide = () => {
    const props = { machines, darkMode };
    switch (currentSlide.id) {
      case "andamento":    return <SlideAndamento    {...props} />;
      case "prioritarias": return <SlidePrioritarias {...props} />;
      case "gantt":        return <SlideGantt        {...props} />;
      case "fila":         return <SlideFilaACP      {...props} />;
      case "nts":          return <SlideNTS          {...props} />;
      case "recon":        return <SlideRecon        {...props} />;
      case "concluidas":   return <SlideConcluidas   {...props} />;
      default:             return null;
    }
  };

  return (
    <div style={{
      width:"100vw", height:"100vh",
      background: bg, color: textPrimary,
      display:"flex", flexDirection:"column",
      fontFamily:"'Inter',sans-serif",
      overflow:"hidden", position:"relative",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${PALETTE.border}; border-radius:2px }
      `}</style>

      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center",
        padding:"8px 16px",
        background: darkMode ? "#0d0d14" : "#1a1a2e",
        borderBottom:`1px solid ${PALETTE.border}`,
        gap:12, flexShrink:0,
      }}>
        {/* Logo / Title */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:6, height:24,
            background:`linear-gradient(180deg,${PALETTE.red},${PALETTE.amber})`,
            borderRadius:1,
          }} />
          <div>
            <div style={{
              fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:900,
              color: PALETTE.white, letterSpacing:3, lineHeight:1,
            }}>OFICINA STILL</div>
            <div style={{ fontSize:8, color:PALETTE.silverDim, letterSpacing:2, fontFamily:"monospace" }}>
              AO VIVO • {machines.length} MÁQUINAS
            </div>
          </div>
        </div>

        {/* Slide tabs */}
        <div style={{ display:"flex", gap:2, flex:1, justifyContent:"center" }}>
          {SLIDES.map((s,i) => (
            <button key={s.id}
              onClick={() => setSlideIdx(i)}
              style={{
                display:"flex", alignItems:"center", gap:4,
                padding:"4px 10px",
                background: i === slideIdx ? s.color + "22" : "transparent",
                border:`1px solid ${i === slideIdx ? s.color : PALETTE.border}`,
                borderRadius:3, cursor:"pointer",
                color: i === slideIdx ? s.color : PALETTE.silverDim,
                fontSize:8, fontFamily:"monospace", letterSpacing:1,
                transition:"all .2s",
              }}>
              {s.icon}
              <span style={{ display: window.innerWidth < 900 ? "none" : "inline" }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={prev} style={{ ...btnStyle }}><ChevronLeft size={14}/></button>
          <button onClick={() => setPaused(p=>!p)} style={{ ...btnStyle, color: paused ? PALETTE.amber : PALETTE.green }}>
            {paused ? <Play size={14}/> : <Pause size={14}/>}
          </button>
          <button onClick={next} style={{ ...btnStyle }}><ChevronRight size={14}/></button>
          <button onClick={() => setDarkMode(d=>!d)} style={{ ...btnStyle }}>
            {darkMode ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <button onClick={fetchMachines} style={{ ...btnStyle, fontSize:8, fontFamily:"monospace", padding:"4px 8px", color:PALETTE.cyan }}>
            SYNC
          </button>
        </div>

        {/* Last sync */}
        {lastSync && (
          <div style={{ fontSize:7, color:PALETTE.silverDim, fontFamily:"monospace", whiteSpace:"nowrap" }}>
            {lastSync.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </div>
        )}
      </div>

      {/* KPI bar */}
      <KpiBar machines={machines} darkMode={darkMode} />

      {/* Slide title */}
      <div style={{
        padding:"6px 16px",
        borderBottom:`1px solid ${PALETTE.border}`,
        background: darkMode ? PALETTE.surface : "#e8eaf0",
        display:"flex", alignItems:"center", gap:8, flexShrink:0,
      }}>
        <span style={{ color: currentSlide.color }}>{currentSlide.icon}</span>
        <span style={{
          fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700,
          letterSpacing:2, color: currentSlide.color,
        }}>{currentSlide.label}</span>
        {/* progress bar */}
        <div style={{ flex:1, height:2, background: PALETTE.border, borderRadius:1 }}>
          {!paused && (
            <div style={{
              height:"100%", background: currentSlide.color,
              borderRadius:1,
              animation: `progress ${CAROUSEL_MS/1000}s linear infinite`,
            }} />
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {loading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:12 }}>
            <div style={{
              width:32, height:32, border:`3px solid ${PALETTE.border}`,
              borderTop:`3px solid ${PALETTE.red}`, borderRadius:"50%",
              animation:"spin 1s linear infinite",
            }} />
            <div style={{ fontFamily:"monospace", color:PALETTE.silverDim, fontSize:11 }}>
              INICIALIZANDO SISTEMAS…
            </div>
          </div>
        ) : error ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:8 }}>
            <div style={{ color:PALETTE.red, fontFamily:"monospace", fontSize:13 }}>⚠ {error}</div>
            <button onClick={fetchMachines} style={{
              padding:"6px 16px", background:PALETTE.red+"22",
              border:`1px solid ${PALETTE.red}`, color:PALETTE.red,
              borderRadius:3, cursor:"pointer", fontFamily:"monospace", fontSize:10,
            }}>RETRY</button>
          </div>
        ) : (
          renderSlide()
        )}
      </div>

      {/* Slide dots */}
      <div style={{
        display:"flex", justifyContent:"center", gap:6,
        padding:"6px", background: darkMode ? "#0d0d14" : "#1a1a2e",
        borderTop:`1px solid ${PALETTE.border}`, flexShrink:0,
      }}>
        {SLIDES.map((s,i) => (
          <div key={i} onClick={() => setSlideIdx(i)} style={{
            width: i === slideIdx ? 16 : 6,
            height:6, borderRadius:3,
            background: i === slideIdx ? s.color : PALETTE.border,
            cursor:"pointer", transition:"all .3s",
          }} />
        ))}
      </div>

      {/* Jordan watermark */}
      <img src={JORDAN_URL} alt="Jordan"
        style={{
          position:"fixed", bottom:40, right:12,
          width:36, height:36, borderRadius:"50%",
          opacity:0.25, objectFit:"cover",
          border:`1px solid ${PALETTE.border}`,
          pointerEvents:"none",
        }}
      />

      {/* Spin keyframe */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes progress{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}

const btnStyle = {
  background:"transparent",
  border:`1px solid ${PALETTE.border}`,
  color: PALETTE.silverDim,
  borderRadius:3, padding:"4px 6px",
  cursor:"pointer", display:"flex", alignItems:"center",
  transition:"all .2s",
};
