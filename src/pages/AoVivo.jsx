import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon,
         ChevronLeft, ChevronRight, Pause, Play, Wrench, CalendarDays } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL    = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type":"application/json",
  "x-sagan-secret":"sagan-watcher-bridge-2026",
  "api_key":"f8517554492e492090b62dd501ad7e14",
};
const SLIDE_DURATION = 30000;
const JORDAN_URL = "https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png";

async function callBridge(p) {
  const r = await fetch(BRIDGE_URL,{method:"POST",headers:BRIDGE_HEADERS,body:JSON.stringify(p)});
  return (await r.json()).result || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2,"0");
function fmtHMS(s){ if(!s&&s!==0)return"00:00:00"; return`${pad2(Math.floor(s/3600))}:${pad2(Math.floor((s%3600)/60))}:${pad2(s%60)}`; }
function fmtDate(v){ if(!v)return"—"; return new Date(v).toLocaleDateString("pt-PT",{day:"2-digit",month:"short"}); }
function getMondayUTC(){ const n=new Date(),d=n.getUTCDay(),b=d===0?6:d-1,m=new Date(n); m.setUTCDate(n.getUTCDate()-b); m.setUTCHours(0,0,0,0); return m; }
function getFridayUTC(){ const f=new Date(getMondayUTC()); f.setUTCDate(f.getUTCDate()+4); f.setUTCHours(23,59,59,999); return f; }

// ── Design ────────────────────────────────────────────────────────────────────
// Paleta reduzida: vermelho STILL como accent primário, verde para RUN,
// âmbar para pausado/prio, cinza neutro para estados passivos
const C = {
  pink:"#c8102e",   // vermelho STILL — accent primário
  blue:"#9ca3af",   // cinza neutro (era azul)
  green:"#22C55E",  // verde — RUN ativo (estado crítico)
  yellow:"#F59E0B", // âmbar — prioritária/pausa (estado crítico)
  purple:"#a78bfa", // lilás suave — recon
  bronze:"#CD7F32", silver:"#C0C0C0",
  cyan:"#6b7280",   // cinza — era ciano
  red:"#EF4444",
};
// ── PALETA SEMÂNTICA POR CATEGORIA ──────────────────────────────────
// Accent = cor da borda/tag; estados críticos terão glow, passivos não
const CAT = {
  prio:     { accent:"#F59E0B", rgb:"245,158,11",   bg:"rgba(245,158,11,0.08)",  label:"PRIORITÁRIA" },
  recon:    { accent:"#a78bfa", rgb:"167,139,250",  bg:"rgba(167,139,250,0.08)", label:"RECOND." },
  nts:      { accent:"#c8102e", rgb:"200,16,46",    bg:"rgba(200,16,46,0.08)",   label:"NTS" },
  concluida:{ accent:"#22C55E", rgb:"34,197,94",    bg:"rgba(34,197,94,0.08)",   label:"CONCLUÍDA" },
  fila:     { accent:"#6b7280", rgb:"107,114,128",  bg:"rgba(107,114,128,0.05)", label:"FILA ACP" },
  express:  { accent:"#c8102e", rgb:"200,16,46",    bg:"rgba(200,16,46,0.08)",   label:"EXPRESS" },
  andamento:{ accent:"#6b7280", rgb:"107,114,128",  bg:"rgba(107,114,128,0.05)", label:"EM ANDAMENTO" },
};
// Resolver categoria de uma máquina
function getMachineCategory(m){
  const recon=m.recondicao||{};
  if(recon.bronze||recon.prata) return "recon";
  if(m.tipo==="nova") return "nts";
  if(m.prioridade===true) return "prio";
  if(m.express===true||m.urgente===true) return "express";
  if(m.estado?.startsWith("concluida")||m.estado==="concluida") return "concluida";
  return "andamento";
}
// STARK ARMOR PALETTE — aplicada apenas no modo dark (d=true)
const DT = d => ({
  bg:      d?"#0c0c0e":"#f4f5f7",           // dark: quase preto neutro | light: cinza frio
  surface: d?"#111114":"#ffffff",
  card:    d?"#18181c":"#ffffff",
  cardB:   d?"#1e1e24":"#e8e9ef",
  line:    d?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.10)",
  sub:     d?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",
  text:    d?"#f0f0f0":"#111118",
  muted:   d?"rgba(160,160,160,0.7)":"rgba(40,40,60,0.55)",
  hudLine: d?"rgba(200,16,46,0.3)":"rgba(200,16,46,0.25)",
  hudGlow: d?"rgba(200,16,46,0.08)":"rgba(200,16,46,0.05)",
  scanBg:  d?"rgba(200,16,46,0.02)":"rgba(200,16,46,0.01)",
  cardBg:  d?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.85)",
  rowBg:   d?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.7)",
  rowHov:  d?"rgba(255,255,255,0.03)":"rgba(200,16,46,0.04)",
  inputBg: d?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.9)",
  // cores semânticas — paleta reduzida
  ...C,
  // overrides por modo
  ...(d ? {
    pink:   "#c8102e",   // vermelho STILL
    blue:   "#9ca3af",   // cinza neutro
    cyan:   "#6b7280",   // cinza escuro
    muted:  "rgba(150,150,150,0.65)",
  } : {
    green:  "#16a34a",
    red:    "#dc2626",
    yellow: "#d97706",
    purple: "#7c3aed",
    pink:   "#c8102e",
    blue:   "#6b7280",
    cyan:   "#4b5563",
  }),
  dark: d,
});

// ── HUD primitives ────────────────────────────────────────────────────────────
// Corner brackets [⌜ ⌝ ⌞ ⌟] — define um frame táctico em qualquer container
function HudCorners({color, size=10, thickness=2, inset=-1, opacity=0.9}){
  const c = color, t = thickness, s = size, n = inset;
  const base = {position:"absolute", width:s, height:s, opacity, pointerEvents:"none"};
  return(
    <>
      <span style={{...base, top:n, left:n, borderTop:`${t}px solid ${c}`, borderLeft:`${t}px solid ${c}`}}/>
      <span style={{...base, top:n, right:n, borderTop:`${t}px solid ${c}`, borderRight:`${t}px solid ${c}`}}/>
      <span style={{...base, bottom:n, left:n, borderBottom:`${t}px solid ${c}`, borderLeft:`${t}px solid ${c}`}}/>
      <span style={{...base, bottom:n, right:n, borderBottom:`${t}px solid ${c}`, borderRight:`${t}px solid ${c}`}}/>
    </>
  );
}

// Tag angular [ TEXTO ] — substitui pills com aspecto táctico
function HudTag({color, label, dim=false, glow=false}){
  return(
    <span style={{
      fontFamily:"'Orbitron',monospace", fontSize:"clamp(8px,0.65vw,10px)",
      fontWeight:800, letterSpacing:"0.12em",
      padding:"2px 9px",
      color, background:`${color}${dim?"10":"22"}`,
      border:`1px solid ${color}${dim?"33":"88"}`,
      clipPath:"polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)",
      whiteSpace:"nowrap",
      boxShadow: glow ? `0 0 10px ${color}99, 0 0 20px ${color}44, inset 0 0 8px ${color}22` : `0 0 4px ${color}44`,
      animation: glow ? "hudPulse 1.8s ease-in-out infinite" : "none",
      textShadow: glow ? `0 0 8px ${color}` : "none",
    }}>{label}</span>
  );
}

// ── Live timer ────────────────────────────────────────────────────────────────
function useLiveTimer(m){
  const [e,sE]=useState(0);
  useEffect(()=>{
    const acc=m.timer_accumulated_seconds||0,run=m.timer_status==="running",at=m.timer_started_at?new Date(m.timer_started_at).getTime():null;
    if(run&&at){const u=()=>sE(acc+Math.floor((Date.now()-at)/1000));u();const id=setInterval(u,1000);return()=>clearInterval(id);}
    else sE(acc);
  },[m.timer_status,m.timer_started_at,m.timer_accumulated_seconds]);
  return e;
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock({D}){
  const [n,sN]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(id);},[]);
  return(
    <div style={{textAlign:"right",lineHeight:1.1,position:"relative",padding:"3px 10px 3px 12px",
      borderLeft:`1px solid ${D.line}`,borderRight:`1px solid ${D.line}`}}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(18px,1.5vw,24px)",fontWeight:900,
        color:D.text,letterSpacing:"0.08em",
        textShadow:D.dark?`0 0 12px ${D.cyan}66`:"none"}}>
        {n.toLocaleTimeString("pt-PT")}
      </div>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(9px,0.7vw,11px)",color:D.muted,
        textTransform:"uppercase",letterSpacing:"0.18em",fontWeight:600,marginTop:"1px"}}>
        {n.toLocaleDateString("pt-PT",{weekday:"short",day:"2-digit",month:"short"})}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BIG BOARD CELL — card compacto adaptável (usado em Em Andamento)
//  Tamanho adapta-se automaticamente ao nº de itens via CSS grid auto-fit
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  REACTOR GAUGE
// ─────────────────────────────────────────────────────────────────────────────

function BoardCell({m, D, forceCategory=null}){
  const dark     = D.dark;
  const elapsed  = useLiveTimer(m);
  const run      = m.timer_status==="running";
  const paused   = m.timer_status==="paused";
  const tasks    = m.tarefas||[];
  const done     = tasks.filter(t=>t.concluida).length;
  const pct      = tasks.length?Math.round(done/tasks.length*100):0;

  const catKey   = forceCategory || getMachineCategory(m);
  const cat      = CAT[catKey] || CAT.andamento;
  const accent   = cat.accent;
  const rgb      = cat.rgb;

  const timerCol  = run?"#22C55E":paused?"#F59E0B":"#6b7280";
  const timerGlow = run?"rgba(34,197,94,0.5)":"none";

  const recon  = m.recondicao||{};
  const rLabel = recon.prata?"PRATA":recon.bronze?"BRONZE":null;

  const topBorder = run?"#22C55E":accent;
  const borderCol = run?"rgba(34,197,94,0.5)":`rgba(${rgb},${dark?0.35:0.5})`;

  const cardBg = dark
    ? (run
      ? `linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(${rgb},0.06) 60%,rgba(10,4,8,0.98) 100%)`
      : `linear-gradient(135deg,rgba(${rgb},0.12) 0%,rgba(8,4,6,0.98) 100%)`)
    : (run
      ? `linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(${rgb},0.06) 60%,rgba(255,255,255,0.97) 100%)`
      : `linear-gradient(135deg,rgba(${rgb},0.08) 0%,rgba(255,255,255,0.97) 100%)`);

  // glow apenas em estados críticos: RUN, PRIORITÁRIA, ATRASADA
  const isCritical = run || catKey==="prio" || catKey==="express";
  const cardShadow = dark
    ? (run
      ? `0 0 14px rgba(34,197,94,0.18), 0 1px 4px rgba(0,0,0,0.6)`
      : isCritical
        ? `0 0 10px rgba(${rgb},0.18), 0 1px 4px rgba(0,0,0,0.6)`
        : `0 1px 4px rgba(0,0,0,0.5)`)
    : `0 1px 6px rgba(0,0,0,0.08)`;

  // Tudo o que não é essencial fica escondido quando o card é pequeno
  // Usamos uma estrutura de 2 secções: topo (sempre visível) e corpo (flex-grow)
  return(
    <div style={{
      position:"relative",
      display:"flex",flexDirection:"column",
      padding:"6px 8px 4px",
      background:cardBg,
      border:`1px solid ${borderCol}`,
      borderTop:`3px solid ${topBorder}`,
      boxShadow:cardShadow,
      overflow:"hidden",
      clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
    }}>
      {/* scan sweep */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
        background:run
          ?`linear-gradient(110deg,transparent 30%,rgba(34,197,94,${dark?0.05:0.03}) 50%,transparent 70%)`
          :`linear-gradient(135deg,rgba(${rgb},${dark?0.04:0.02}),transparent 60%)`,
        animation:run?"hudScan 5s linear infinite":"none"}}/>

      {/* ── LINHA 1: estado + timer ── sempre visível */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:4,zIndex:1,flexShrink:0}}>
        {/* estado dot + label */}
        <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0,overflow:"hidden"}}>
          <span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,
            background:run?"#22C55E":paused?"#F59E0B":accent,
            boxShadow:run?`0 0 6px #22C55E`:paused?`0 0 5px rgba(245,158,11,0.5)`:`0 0 5px rgba(${rgb},0.5)`,
            animation:run?"blink 1.2s ease-in-out infinite":"none"}}/>
          <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",
            fontWeight:700,letterSpacing:"0.1em",flexShrink:0,
            color:run?"#22C55E":paused?"#F59E0B":accent}}>
            {run?"RUN":paused?"PAUSED":"IDLE"}
          </span>
          {/* categoria tag */}
          <span style={{
            fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,letterSpacing:"0.08em",
            padding:"1px 5px",color:accent,
            background:`rgba(${rgb},0.15)`,border:`1px solid rgba(${rgb},0.4)`,
            clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)",
            whiteSpace:"nowrap",flexShrink:0,overflow:"hidden",maxWidth:"90px",textOverflow:"ellipsis"
          }}>{cat.label}</span>
          {rLabel&&<span style={{
            fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,letterSpacing:"0.08em",
            padding:"1px 5px",color:CAT.recon.accent,
            background:`rgba(155,92,246,0.15)`,border:`1px solid rgba(155,92,246,0.4)`,
            clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)",
            whiteSpace:"nowrap",flexShrink:0
          }}>{rLabel}</span>}
          {m.prioridade&&catKey!=="prio"&&<span style={{
            fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,
            padding:"1px 5px",color:CAT.prio.accent,
            background:`rgba(239,68,68,0.15)`,border:`1px solid rgba(239,68,68,0.4)`,
            clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)",
            whiteSpace:"nowrap",flexShrink:0
          }}>⚑</span>}
        </div>
        {/* timer — sempre visível, tamanho adapta */}
        <div style={{fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(11px,1.1vw,16px)",fontWeight:900,flexShrink:0,
          color:timerCol,letterSpacing:"0.04em",
          textShadow:run?`0 0 8px rgba(34,197,94,0.5)`:"none"}}>
          {fmtHMS(elapsed)}
        </div>
      </div>

      {/* ── LINHA 2: série + modelo + baia ── sempre visível */}
      <div style={{zIndex:1,flexShrink:0,marginTop:3}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"nowrap"}}>
          <div style={{fontFamily:"'Orbitron',monospace",
            fontSize:"clamp(11px,1.1vw,15px)",fontWeight:900,
            color:dark?"#f0f0f0":"#0d0e1a",letterSpacing:"0.06em",lineHeight:1.15,
            textShadow:"none",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0}}>
            {m.serie||"—"}
          </div>
          {/* BAIA */}
          {m.baia&&(
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:800,
              letterSpacing:"0.12em",padding:"2px 6px",flexShrink:0,
              color:"#4D9FFF",background:"rgba(77,159,255,0.12)",
              border:"1px solid rgba(77,159,255,0.4)",
              clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)"}}>
              {m.baia}
            </span>
          )}
        </div>
        <div style={{fontFamily:"'Rajdhani',system-ui,sans-serif",fontSize:"11px",fontWeight:500,
          color:dark?"rgba(140,140,140,0.75)":"rgba(30,30,60,0.55)",
          marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:"0.02em"}}>
          {m.modelo||"—"}
        </div>
        {/* MOTIVO PAUSA — só aparece quando paused */}
        {paused&&m.pausa_motivo&&(
          <div style={{marginTop:3,display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:800,
              letterSpacing:"0.1em",padding:"2px 7px",
              color:"#F59E0B",background:"rgba(245,158,11,0.12)",
              border:"1px solid rgba(245,158,11,0.4)",
              clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)"}}>
              ⏸ {m.pausa_motivo.toUpperCase()}
            </span>
          </div>
        )}
        {/* DATAS DE PREVISÃO — linha compacta sempre visível */}
        {(m.previsao_inicio||m.previsao_fim)&&(
          <div style={{marginTop:3,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            {m.previsao_inicio&&(
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:700,
                letterSpacing:"0.08em",padding:"2px 6px",
                color:"#4D9FFF",background:"rgba(77,159,255,0.10)",
                border:"1px solid rgba(77,159,255,0.35)",
                clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)",
                whiteSpace:"nowrap"}}>
                ▶ {new Date(m.previsao_inicio+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
              </span>
            )}
            {m.previsao_fim&&(
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:700,
                letterSpacing:"0.08em",padding:"2px 6px",
                color:"#22C55E",background:"rgba(34,197,94,0.10)",
                border:"1px solid rgba(34,197,94,0.35)",
                clipPath:"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)",
                whiteSpace:"nowrap"}}>
                ✓ {new Date(m.previsao_fim+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── CORPO: task + chips — flex-grow, desaparece quando não há espaço ── */}
      {tasks.length>0&&(
        <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",gap:3,
          marginTop:4,zIndex:1,overflow:"hidden"}}>
          {/* primeira tarefa */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,
            padding:"3px 6px",
            background:dark?`rgba(${rgb},0.1)`:`rgba(${rgb},0.07)`,
            borderLeft:`2px solid rgba(${rgb},0.6)`,overflow:"hidden"}}>
            <span style={{fontFamily:"monospace",fontSize:"8px",color:accent,
              letterSpacing:"0.15em",flexShrink:0,fontWeight:700}}>TASK</span>
            <span style={{fontFamily:"monospace",fontSize:"9px",
              color:dark?"rgba(210,210,210,0.85)":"rgba(20,20,50,0.85)",
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {tasks.filter(t=>!t.concluida)[0]?.texto || tasks[0]?.texto}
            </span>
          </div>
          {/* chips */}
          <div style={{display:"flex",flexWrap:"wrap",gap:3,overflow:"hidden"}}>
            {tasks.map((t,i)=>(
              <span key={i} style={{fontFamily:"monospace",
                fontSize:"8px",padding:"1px 5px",
                background:t.concluida?`rgba(34,197,94,0.12)`:`rgba(${rgb},0.08)`,
                color:t.concluida?"#16a34a":accent,
                border:`1px solid ${t.concluida?"rgba(34,197,94,0.35)":`rgba(${rgb},0.3)`}`,
                textDecoration:t.concluida?"line-through":"none",
                clipPath:"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                fontWeight:600,letterSpacing:"0.03em",whiteSpace:"nowrap"}}>
                {t.texto}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* barra de progresso — sempre na base */}
      {tasks.length>0&&pct>0&&(
        <div style={{height:2,background:`rgba(0,0,0,0.1)`,overflow:"hidden",zIndex:1,marginTop:2,flexShrink:0}}>
          <div style={{height:"100%",width:`${pct}%`,
            background:`linear-gradient(90deg,#c8102e,${accent})`,transition:"width 0.5s"}}/>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  BIG BOARD CELL — card compacto adaptável (usado em Em Andamento)
//  Tamanho adapta-se automaticamente ao nº de itens via CSS grid auto-fit
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  REACTOR GAUGE
// ─────────────────────────────────────────────────────────────────────────────

function BigBoard({items, D, isRecon=false}){
  const running = items.filter(m=>m.timer_status==="running");
  const paused  = items.filter(m=>m.timer_status!=="running");
  const nRun = running.length, nPause = paused.length;

  // Colunas adaptativas por contagem
  const cols = n => n<=1?1:n<=2?2:n<=4?2:n<=6?3:n<=9?4:5;
  const colsRun   = cols(nRun);
  const colsPause = cols(nPause);

  // Linhas de cada secção
  const rowsRun   = nRun>0?Math.ceil(nRun/colsRun):0;
  const rowsPause = nPause>0?Math.ceil(nPause/colsPause):0;

  // Peso proporcional: running tem 1.5x mais peso por linha (destaque visual)
  const wRun   = rowsRun   * 1.5;
  const wPause = rowsPause * 1.0;
  const wTotal = wRun + wPause || 1;
  // grid-template-rows em fr — distribui todo o espaço disponível
  const gridRows = [
    nRun>0   ? `${(wRun/wTotal*100).toFixed(1)}fr`   : null,
    nPause>0 ? `${(wPause/wTotal*100).toFixed(1)}fr` : null,
  ].filter(Boolean).join(" ");

  return(
    <div style={{
      display:"grid",
      gridTemplateRows: gridRows,
      gap:8,
      flex:1,
      minHeight:0,
      overflow:"hidden",
    }}>
      {/* ── RUNNING — mais altura, destaque ── */}
      {running.length>0&&(
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(${colsRun},1fr)`,
          gridTemplateRows:`repeat(${rowsRun},1fr)`,
          gap:8,
          minHeight:0,
          overflow:"hidden",
        }}>
          {running.map(m=>(
            <BoardCell key={m.id} m={m} D={D} isRecon={isRecon}/>
          ))}
        </div>
      )}
      {/* ── PAUSED/IDLE — menos altura ── */}
      {paused.length>0&&(
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(${colsPause},1fr)`,
          gridTemplateRows:`repeat(${rowsPause},1fr)`,
          gap:6,
          minHeight:0,
          overflow:"hidden",
        }}>
          {paused.map(m=>(
            <BoardCell key={m.id} m={m} D={D} isRecon={isRecon}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CALENDAR FILA — sem scroll, compacto, tudo visível
// ─────────────────────────────────────────────────────────────────────────────
function CalendarFila({items, D, concluidas=[]}){
  const monday = getMondayUTC(), friday = getFridayUTC();
  const days   = Array.from({length:5},(_,i)=>{ const d=new Date(monday); d.setUTCDate(monday.getUTCDate()+i); return d; });
  const todayStr = new Date().toISOString().slice(0,10);

  const withPrev    = items.filter(m=>{ if(!m.previsao_inicio)return false; const d=new Date(m.previsao_inicio); return d>=monday&&d<=friday; });
  const withoutPrev = items.filter(m=>!m.previsao_inicio);
  const futuras     = items.filter(m=>{ if(!m.previsao_inicio)return false; return new Date(m.previsao_inicio)>friday; });

  const byDay={};
  withPrev.forEach(m=>{ const k=new Date(m.previsao_inicio).toISOString().slice(0,10); if(!byDay[k])byDay[k]=[]; byDay[k].push(m); });

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"10px",height:"100%"}}>

      {/* ── Calendário semanal ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",flexShrink:0}}>
        {days.map(d=>{
          const key=d.toISOString().slice(0,10), isToday=key===todayStr, ms=byDay[key]||[];
          return(
            <div key={key} style={{background:D.card,border:`1.5px solid ${isToday?D.blue+"66":D.line}`,
              borderRadius:"10px",overflow:"hidden"}}>
              {/* Header dia */}
              <div style={{padding:"7px 10px",background:isToday?`rgba(200,16,46,0.12)`:D.sub+"33",
                borderBottom:`1px solid ${isToday?"rgba(200,16,46,0.4)":D.line}`,
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:900,
                  color:isToday?"#c8102e":D.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  {d.toLocaleDateString("pt-PT",{weekday:"short"})}
                </span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:isToday?"#c8102e":D.muted}}>
                  {d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                </span>
                {isToday&&<div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#c8102e",animation:"blink 1.5s ease-in-out infinite"}}/>}
              </div>
              {/* Máquinas */}
              <div style={{padding:"7px 8px",display:"flex",flexDirection:"column",gap:"5px",minHeight:"60px"}}>
                {ms.length===0
                  ?(()=>{
                    const dayKey=d.toISOString().slice(0,10);
                    const isPast=new Date(dayKey)<new Date(new Date().toISOString().slice(0,10));
                    const conDia=concluidas.filter(m=>{const raw=m.dataConclusao;if(!raw)return false;try{return new Date(raw).toISOString().slice(0,10)===dayKey;}catch{return false;}});
                    return isPast&&conDia.length>0
                      ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:"8px",gap:2}}>
                          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:900,color:D.green,textShadow:`0 0 8px rgba(34,197,94,0.5)`}}>{conDia.length}</div>
                          <div style={{fontFamily:"monospace",fontSize:"7px",color:`rgba(34,197,94,0.6)`,letterSpacing:"0.1em"}}>CONCLUÍDAS</div>
                        </div>
                      :<div style={{fontFamily:"monospace",fontSize:"9px",color:D.sub,textAlign:"center",paddingTop:"8px"}}>—</div>;
                  })()
                  :ms.map((m,i)=>(
                    <div key={i} style={{padding:"6px 8px",background:D.cardB,
                      borderLeft:`3px solid ${m.prioridade?D.yellow:D.blue}`,
                      borderRadius:"5px",overflow:"hidden"}}>
                      {/* NS grande */}
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:900,
                        color:D.blue,letterSpacing:"0.05em",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        textShadow:`0 0 8px ${D.blue}44`}}>
                        {m.serie||"—"}
                      </div>
                      {/* Modelo */}
                      <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,marginTop:"2px",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.modelo}
                      </div>
                      {/* Data entrega */}
                      {m.previsao_fim&&(
                        <div style={{display:"flex",alignItems:"center",gap:3,marginTop:"3px"}}>
                          <span style={{fontFamily:"monospace",fontSize:"7px",color:"#22C55E",opacity:0.8}}>✓</span>
                          <span style={{fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,
                            color:"#22C55E",letterSpacing:"0.06em"}}>
                            {new Date(m.previsao_fim+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                          </span>
                        </div>
                      )}
                      {/* Tarefas tiny */}
                      {(m.tarefas||[]).length>0&&(
                        <div style={{display:"flex",gap:"3px",flexWrap:"wrap",marginTop:"4px"}}>
                          {m.tarefas.map((t,j)=>(
                            <span key={j} style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",
                              borderRadius:"20px",background:`${D.blue}14`,color:D.blue,
                              border:`1px solid ${D.blue}25`}}>
                              {t.texto}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Fila sem previsão + Semanas seguintes (linha única compacta) ── */}
      {(withoutPrev.length>0||futuras.length>0)&&(
        <div style={{display:"grid",gridTemplateColumns:withoutPrev.length&&futuras.length?"1fr 1fr":"1fr",
          gap:"10px",flexShrink:0}}>

          {withoutPrev.length>0&&(
            <div>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"6px"}}>
                SEM PREVISÃO — {withoutPrev.length}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {withoutPrev.map((m,i)=>(
                  <div key={i} style={{background:D.card,border:`1px solid ${D.line}`,
                    borderLeft:`3px solid ${m.prioridade?D.yellow:D.blue}`,
                    borderRadius:"6px",padding:"7px 10px",
                    display:"flex",alignItems:"center",gap:"10px",overflow:"hidden"}}>
                    {m.prioridade&&<Flag size={9} color={D.yellow} style={{flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:800,
                        color:D.blue,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.serie||"—"}
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"1px"}}>
                        {m.modelo}
                      </div>
                    </div>
                    {(m.tarefas||[]).length>0&&(
                      <div style={{display:"flex",gap:"3px",flexShrink:0}}>
                        {m.tarefas.slice(0,3).map((t,j)=>(
                          <span key={j} style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",
                            borderRadius:"20px",background:`${D.blue}14`,color:D.blue,border:`1px solid ${D.blue}25`}}>
                            {t.texto}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {futuras.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                <div style={{width:"3px",height:"18px",borderRadius:"2px",background:`linear-gradient(180deg,${D.blue},${D.pink})`}}/>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:800,
                  letterSpacing:"0.1em",color:D.blue}}>SEMANAS SEGUINTES</span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:900,color:D.blue}}>{futuras.length}</span>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${D.blue}44,transparent)`}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {futuras.map((m,i)=>{
                  const dt=new Date(m.previsao_inicio);
                  const label=dt.toLocaleDateString("pt-PT",{weekday:"short",day:"2-digit",month:"2-digit"});
                  return(
                    <div key={i} style={{background:D.card,
                      border:`1px solid ${D.blue}22`,
                      borderLeft:`3px solid ${D.blue}`,
                      borderRadius:"6px",
                      padding:"8px 12px",display:"flex",alignItems:"center",gap:"12px",overflow:"hidden"}}>
                      {/* Data em destaque */}
                      <div style={{flexShrink:0,textAlign:"center",
                        background:`${D.blue}14`,border:`1px solid ${D.blue}33`,
                        borderRadius:"6px",padding:"5px 10px",minWidth:"72px"}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.08em",textTransform:"uppercase"}}>
                          {dt.toLocaleDateString("pt-PT",{weekday:"short"})}
                        </div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.04em",marginTop:"1px"}}>
                          {dt.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                        </div>
                      </div>
                      {/* Info máquina */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:800,
                          color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                          textShadow:`0 0 8px ${D.blue}33`}}>
                          {m.serie||"—"}
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"2px"}}>{m.modelo}</div>
                      </div>
                      {m.prioridade&&<Flag size={12} color={D.yellow} style={{flexShrink:0}}/>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROW ITEM — linha compacta (Prioritárias, NTS, Recon, Concluídas)
// ─────────────────────────────────────────────────────────────────────────────
function RowItem({m, idx, D, forceCategory=null, showTimer=true, showDate=false}){
  const dark    = D.dark;
  const elapsed = useLiveTimer(m);
  const run     = m.timer_status==="running";
  const tasks   = m.tarefas||[];
  const done    = tasks.filter(t=>t.concluida).length;
  const pct     = tasks.length?Math.round(done/tasks.length*100):0;
  const recon   = m.recondicao||{};
  const rLabel  = recon.prata?"PRATA":recon.bronze?"BRONZE":null;
  const isCon   = m.estado?.startsWith("concluida")||m.estado==="concluida";

  const catKey  = forceCategory || getMachineCategory(m);
  const cat     = CAT[catKey] || CAT.andamento;
  const accent  = cat.accent;
  const rgb     = cat.rgb;
  const timerCol= run?"#22C55E":"#F59E0B";

  return(
    <div style={{
      position:"relative",overflow:"hidden",
      display:"flex",alignItems:"center",gap:12,
      padding:"8px 12px",
      background:isCon
        ?`rgba(34,197,94,${dark?0.07:0.05})`
        :run
        ?`linear-gradient(90deg,rgba(34,197,94,${dark?0.08:0.06}),rgba(${rgb},${dark?0.06:0.04}))`
        :`rgba(${rgb},${dark?0.06:0.04})`,
      border:`1px solid rgba(${rgb},${dark?0.25:0.3})`,
      borderLeft:`3px solid ${run?"#22C55E":accent}`,
      boxShadow:(run||catKey==="prio")?`0 0 8px rgba(${rgb},${dark?0.18:0.1})`:`0 1px 3px rgba(0,0,0,${dark?0.4:0.06})`,
      borderRadius:"4px",
      clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
    }}>
      <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:700,
        color:`rgba(${rgb},${dark?0.5:0.6})`,flexShrink:0,width:"16px",textAlign:"right"}}>
        {String(idx+1).padStart(2,"0")}
      </span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(12px,1.05vw,14px)",fontWeight:900,
          color:dark?"#f0f0f0":"#0d0e1a",letterSpacing:"0.06em",
          textShadow:"none",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {m.serie||"—"}
        </div>
        <div style={{fontFamily:"'Rajdhani',system-ui,sans-serif",fontSize:"11px",fontWeight:500,
          color:dark?"rgba(140,140,140,0.75)":"rgba(30,30,60,0.55)",
          marginTop:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:"0.02em"}}>
          {m.modelo||"—"}
        </div>
        {tasks.length>0&&(
          <div style={{display:"flex",flexWrap:"nowrap",gap:3,marginTop:3,overflow:"hidden"}}>
            {tasks.slice(0,6).map((t,j)=>(
              <span key={j} style={{
                fontFamily:"monospace",fontSize:"8px",padding:"1px 5px",
                background:t.concluida?`rgba(34,197,94,0.1)`:`rgba(${rgb},0.08)`,
                color:t.concluida?"#16a34a":accent,
                border:`1px solid ${t.concluida?"rgba(34,197,94,0.3)":`rgba(${rgb},0.3)`}`,
                textDecoration:t.concluida?"line-through":"none",
                clipPath:"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                fontWeight:600,letterSpacing:"0.02em",whiteSpace:"nowrap",flexShrink:0,
              }}>{t.texto}</span>
            ))}
            {tasks.length>6&&<span style={{fontFamily:"monospace",fontSize:"8px",
              color:dark?"rgba(160,160,160,0.5)":"rgba(30,30,60,0.4)",flexShrink:0}}>
              +{tasks.length-6}
            </span>}
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
        <HudTag color={accent} label={cat.label} glow={dark&&(catKey==="prio"||catKey==="express")}/>
        {rLabel&&<HudTag color={CAT.recon.accent} label={rLabel} glow={false}/>}
        {m.prioridade&&catKey!=="prio"&&<HudTag color={CAT.prio.accent} label="⚑" glow={dark}/>}
      </div>
      {showDate&&(m.previsao_inicio||m.previsao_fim)&&(
        <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0,alignItems:"flex-end"}}>
          {m.previsao_inicio&&(
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontFamily:"monospace",fontSize:"7px",color:"#4D9FFF",opacity:0.8}}>▶</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:800,
                color:"#4D9FFF",letterSpacing:"0.06em",
                textShadow:dark?"0 0 6px rgba(77,159,255,0.5)":"none",whiteSpace:"nowrap"}}>
                {new Date(m.previsao_inicio+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
              </span>
            </div>
          )}
          {m.previsao_fim&&(
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontFamily:"monospace",fontSize:"7px",color:"#22C55E",opacity:0.8}}>✓</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:800,
                color:"#22C55E",letterSpacing:"0.06em",
                textShadow:dark?"0 0 6px rgba(34,197,94,0.5)":"none",whiteSpace:"nowrap"}}>
                {new Date(m.previsao_fim+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
              </span>
            </div>
          )}
        </div>
      )}
      {/* timer: se concluída mostra acumulado estático; senão mostra live */}
      {(isCon&&(m.timer_accumulated_seconds>0))?(
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(34,197,94,0.6)"}}>⏱</span>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(11px,0.95vw,13px)",
            fontWeight:900,color:"#22C55E",letterSpacing:"0.04em",
            textShadow:`0 0 8px rgba(34,197,94,0.5)`}}>
            {fmtHMS(m.timer_accumulated_seconds)}
          </div>
        </div>
      ):showTimer?(
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(12px,1vw,14px)",
          fontWeight:900,color:timerCol,letterSpacing:"0.04em",flexShrink:0,
          textShadow:run?`0 0 8px rgba(34,197,94,0.5)`:"none"}}>
          {fmtHMS(elapsed)}
        </div>
      ):null}
      {tasks.length>0&&(
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",
          background:`rgba(0,0,0,${dark?0.03:0.06})`}}>
          <div style={{height:"100%",width:`${pct}%`,
            background:`linear-gradient(90deg,#c8102e,${accent})`,
            boxShadow:`0 0 4px rgba(${rgb},0.4)`,transition:"width 0.5s"}}/>
        </div>
      )}
    </div>
  );
}

function SecLabel({label,D}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:"8px",
      padding:"8px 0 4px",flexShrink:0}}>
      <span style={{fontFamily:"'Rajdhani',system-ui,sans-serif",
        fontSize:"clamp(11px,0.82vw,13px)",fontWeight:700,letterSpacing:"0.12em",
        color:D.dark?D.muted:'rgba(30,30,60,0.5)',textTransform:"uppercase"}}>
        {label}
      </span>
      <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${D.muted}44,transparent)`}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SlideHead({title,icon,color,pulse,count,D}){
  const iconSize = "clamp(18px,1.6vw,26px)";
  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",gap:"14px",
      flexShrink:0,marginBottom:"14px",
      padding:"6px 12px 6px 14px",
      background:`linear-gradient(90deg, ${color}14 0%, transparent 80%)`,
      borderLeft:`3px solid ${color}`,
      clipPath:"polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)",
    }}>
      {/* bracket esquerdo */}
      <span style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:color,
        boxShadow:`0 0 12px ${color}cc`}}/>

      <div style={{color,filter:`drop-shadow(0 0 8px ${color})`,display:"flex",alignItems:"center"}}>
        {React.cloneElement(icon,{size:undefined,style:{width:iconSize,height:iconSize}})}
      </div>

      <span style={{fontFamily:"'Orbitron',monospace",
        fontSize:"clamp(18px,1.7vw,28px)",fontWeight:900,
        letterSpacing:"0.18em",
        color:"#e8e8e8",
        textShadow:`0 0 14px rgba(210,210,210,0.6), 0 0 4px ${color}aa`,
        textTransform:"uppercase"}}>
        {title}
      </span>

      {count!==undefined&&(
        <div style={{display:"flex",alignItems:"baseline",gap:"6px",
          padding:"3px 12px",
          background:`${color}1a`,border:`1px solid ${color}55`,
          clipPath:"polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)"}}>
          <span style={{fontFamily:"'Orbitron',monospace",
            fontSize:"clamp(9px,0.75vw,11px)",fontWeight:700,letterSpacing:"0.18em",
            color:`${color}cc`}}>×</span>
          <span style={{fontFamily:"'Orbitron',monospace",
            fontSize:"clamp(20px,1.9vw,30px)",fontWeight:900,color,
            textShadow:`0 0 12px ${color}88`,letterSpacing:"0.04em",lineHeight:1}}>
            {String(count).padStart(2,"0")}
          </span>
        </div>
      )}

      {pulse&&(
        <div style={{width:"10px",height:"10px",background:color,
          boxShadow:`0 0 12px ${color}, 0 0 24px ${color}88`,
          clipPath:"polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
          animation:"blink 1s ease-in-out infinite"}}/>
      )}

      <div style={{flex:1,height:"1px",
        background:`linear-gradient(90deg,${color}66,${color}11,transparent)`}}/>

      {/* tick marks na barra */}
      <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:"2px",height:i%2===0?"10px":"6px",
            background:`${color}${i===0?"":i===1?"aa":i===2?"77":"44"}`}}/>
        ))}
      </div>
    </div>
  );
}

function Empty({label,D}){
  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flex:1,
      flexDirection:"column",gap:"10px",
      color:D.dark?D.muted:'rgba(30,30,60,0.45)',fontFamily:"'Orbitron',monospace",
      fontSize:"clamp(13px,1.1vw,17px)",fontWeight:600,letterSpacing:"0.22em",
      textTransform:"uppercase"}}>
      <div style={{position:"relative",padding:"24px 40px",border:`1px dashed ${D.muted}55`}}>
        <HudCorners color={D.muted} size={14} thickness={2} inset={-2} opacity={0.5}/>
        {label}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  GANTT CHART — slide Timeline do AoVivo (v2 — mais claro, barras largas)
// ─────────────────────────────────────────────────────────────────────────────
function GanttChart({ machines, D }) {
  const BACK = 1, AHEAD = 13; // 1 dia atrás, 13 à frente = 14 dias visíveis
  const today = new Date(); today.setHours(0,0,0,0);
  const startDay = new Date(today); startDay.setDate(startDay.getDate() - BACK);
  const endDay   = new Date(today); endDay.setDate(today.getDate() + AHEAD + 1);
  const totalMs  = endDay - startDay;
  const numDays  = Math.round(totalMs / 86400000);

  // pct RAW sem clip — usamos para calcular left/width manualmente com clip correto
  const pctRaw = ms => ((ms - startDay.getTime()) / totalMs) * 100;
  const nowPct = Math.max(0, Math.min(100, pctRaw(Date.now())));

  const ruleDays = Array.from({length: numDays + 1}, (_, i) => {
    const d = new Date(startDay); d.setDate(d.getDate() + i); return d;
  });

  // Construir blocos — agrupados por data de início para evitar sobreposição
  const rawBlocks = [];
  for (const m of machines) {
    const pi = m.previsao_inicio ? new Date(m.previsao_inicio) : null;
    const pf = m.previsao_fim    ? new Date(m.previsao_fim)    : null;
    if (!pi || !pf) continue;
    const isActive = m.estado && m.estado.startsWith("em-preparacao");
    const isPrio   = m.prioridade === true;
    const run      = m.timer_status === "running";
    const overrun  = new Date() > new Date(pf.getTime() + 86400000);
    rawBlocks.push({ m, pi, pf, isActive, isPrio, run, overrun });
  }
  // Ordenar: em curso primeiro, depois por data de início
  const blocks = rawBlocks.sort((a,b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.pi - b.pi;
  });

  const BAR_H = 32, GAP = 6;

  const barBg = b => {
    if (b.overrun)            return "linear-gradient(90deg,#c0c0c0,#c8102e)";
    if (b.isActive && b.run)  return "linear-gradient(90deg,#c8102e,#ff2240,#e0e0e0)";
    if (b.isActive)           return "linear-gradient(90deg,rgba(200,16,46,0.85),rgba(210,210,210,0.7))";
    if (b.isPrio)             return "linear-gradient(90deg,rgba(210,210,210,0.6),rgba(200,16,46,0.4))";
    return "rgba(210,210,210,0.18)";
  };
  const barBorder = b => {
    if (b.overrun)    return "1.5px solid rgba(220,220,220,0.9)";
    if (b.isActive)   return "1.5px solid rgba(210,210,210,0.7)";
    if (b.isPrio)     return "1.5px dashed rgba(210,210,210,0.6)";
    return "1px solid rgba(210,210,210,0.25)";
  };
  const barShadow = b => {
    if (b.overrun)           return "0 2px 12px rgba(210,210,210,0.4)";
    if (b.isActive && b.run) return "0 2px 16px rgba(200,16,46,0.5),0 0 8px rgba(210,210,210,0.25)";
    if (b.isActive)          return "0 2px 8px rgba(200,16,46,0.3)";
    return "none";
  };

  if (blocks.length === 0) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
        color:"rgba(180,180,180,0.5)",fontFamily:"'Orbitron',monospace",fontSize:"11px",letterSpacing:"0.2em"}}>
        SEM PREVISÕES DEFINIDAS · CONFIGURAR NO WATCHER
      </div>
    );
  }

  // Número max de barras visíveis sem scroll (altura disponível / bar height)
  const MAX_VISIBLE = 12;
  const visibleBlocks = blocks.slice(0, MAX_VISIBLE);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0,flex:1,overflow:"hidden"}}>

      {/* ── Régua de dias — sticky ── */}
      <div style={{
        position:"relative",height:"36px",flexShrink:0,
        borderBottom:`1px solid rgba(210,210,210,0.2)`,
        background:D.dark?"rgba(14,5,9,0.97)":"rgba(245,246,250,0.98)",
        zIndex:5,
      }}>
        {ruleDays.map((d,i) => {
          const left    = (i / numDays) * 100;
          const isToday = d.toDateString() === today.toDateString();
          const isWE    = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={i} style={{
              position:"absolute", left:left+"%", top:0,
              width:(100/numDays)+"%", height:"100%",
              borderLeft: i>0 ? `1px solid ${isToday?"#ff2240":"rgba(210,210,210,0.12)"}` : "none",
              background: isWE ? "rgba(200,16,46,0.04)" : "transparent",
            }}>
              <div style={{
                position:"absolute", top:"50%", left:"50%",
                transform:"translate(-50%,-50%)",
                textAlign:"center",
                fontFamily:"'Orbitron',monospace",
                fontSize: isToday ? "11px" : "9px",
                fontWeight: isToday ? 900 : 600,
                color: isToday ? "#e8e8e8" : isWE ? "rgba(210,210,210,0.4)" : "rgba(180,180,180,0.6)",
                letterSpacing:"0.04em",
                textShadow: isToday ? "0 0 10px rgba(220,220,220,0.8)" : "none",
                whiteSpace:"nowrap",
                lineHeight:1.2,
              }}>
                <div>{d.toLocaleDateString("pt-PT",{day:"2-digit"})}</div>
                <div style={{fontSize:"7px",opacity:0.7}}>
                  {d.toLocaleDateString("pt-PT",{month:"short"}).replace(".","").toUpperCase()}
                </div>
              </div>
              {isToday && (
                <div style={{
                  position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
                  width:"100%",height:"3px",
                  background:"linear-gradient(90deg,transparent,#ff2240,#e0e0e0,transparent)",
                }}/>
              )}
            </div>
          );
        })}
        {/* Linha de agora na régua */}
        {nowPct>=0 && nowPct<=100 && (
          <div style={{
            position:"absolute",top:0,bottom:0,left:nowPct+"%",
            width:"2px",background:"linear-gradient(180deg,#ff2240,#d0d0d0)",
            boxShadow:"0 0 12px rgba(255,34,64,0.8),0 0 20px rgba(210,210,210,0.25)",
            zIndex:10,pointerEvents:"none",
          }}/>
        )}
      </div>

      {/* ── Barra de carga por dia — vermelho se sobrecarregado ── */}
      {ruleDays.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:`repeat(${numDays},1fr)`,gap:2,
          flexShrink:0,marginBottom:4}}>
          {ruleDays.map((d,i)=>{
            const key=d.toISOString().slice(0,10);
            const count=visibleBlocks.filter(b=>b.pi.toISOString().slice(0,10)<=key&&b.pf.toISOString().slice(0,10)>=key).length;
            const isWE=d.getDay()===0||d.getDay()===6;
            const isToday=key===new Date().toISOString().slice(0,10);
            const overload=count>=4;
            const warn=count===3;
            const barColor=overload?"#EF4444":warn?"#F59E0B":D.blue;
            return(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                <div style={{width:"100%",height:isToday?14:10,borderRadius:2,
                  background:isWE?"rgba(255,255,255,0.04)":count===0?"rgba(255,255,255,0.04)":`rgba(${barColor.replace("#","").match(/../g).map(h=>parseInt(h,16)).join(",")},${Math.min(0.9,0.15+count*0.15)})`,
                  border:`1px solid ${isToday?D.blue:overload?"rgba(239,68,68,0.5)":warn?"rgba(245,158,11,0.4)":"rgba(210,210,210,0.08)"}`,
                  boxShadow:overload?`0 0 6px rgba(239,68,68,0.4)`:isToday?`0 0 4px ${D.blue}55`:"none",
                  position:"relative",overflow:"hidden"}}>
                  {count>0&&!isWE&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:900,
                      color:overload?"#FCA5A5":warn?"#FCD34D":D.muted,letterSpacing:"0.05em"}}>{count}</span>
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Área de barras — rows fixas sem overflow ── */}
      <div style={{
        flex:1,overflow:"hidden",
        position:"relative",
        display:"flex",flexDirection:"column",
        gap:5,padding:"8px 0",
      }}>
        {/* Grade vertical — absolute sobre tudo */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0}}>
          {ruleDays.map((d,i)=>{
            const left=(i/numDays)*100;
            const isWE=d.getDay()===0||d.getDay()===6;
            return(
              <div key={"g"+i} style={{
                position:"absolute",top:0,bottom:0,left:left+"%",
                width:isWE?(100/numDays)+"%":"0",
                borderLeft:i>0?`1px dashed rgba(210,210,210,0.06)`:"none",
                background:isWE?"rgba(200,16,46,0.02)":"transparent",
              }}/>
            );
          })}
          {/* Linha HOJE */}
          {nowPct>=0&&nowPct<=100&&(
            <div style={{position:"absolute",top:0,bottom:0,left:nowPct+"%",
              width:"2px",background:"linear-gradient(180deg,#ff2240,#d0d0d0)",
              boxShadow:"0 0 10px rgba(255,34,64,0.6)",zIndex:5}}/>
          )}
        </div>

        {/* Barras — uma por row, altura fixa, nunca cortam */}
        {visibleBlocks.map((b)=>{
          const leftRaw  = pctRaw(b.pi.getTime());
          const rightRaw = pctRaw(b.pf.getTime()+86400000);
          const leftC    = Math.max(0,Math.min(100,leftRaw));
          const rightC   = Math.max(0,Math.min(100,rightRaw));
          const width    = Math.max(1.5, rightC-leftC);
          if(rightC<=0||leftC>=100) return null;
          const fmtD = d=>d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"});
          // barra demasiado estreita para mostrar texto dentro (< ~8% = ~115px em 1440px)
          const isThin = width < 8;
          // label fica à direita da barra se barra termina antes de 60%, senão à esquerda
          const labelRight = rightC < 62;
          return(
            <div key={b.m.id} style={{
              position:"relative",height:"36px",flexShrink:0,zIndex:1,
            }}>
              {/* Barra */}
              <div title={`${b.m.serie} · ${b.m.modelo} · ${fmtD(b.pi)} → ${fmtD(b.pf)}`}
                style={{
                  position:"absolute",
                  left:leftC+"%",width:width+"%",
                  top:"50%",transform:"translateY(-50%)",
                  height: isThin ? "100%" : "100%",
                  background:barBg(b),
                  border:barBorder(b),
                  boxShadow:barShadow(b),
                  borderRadius:"4px",
                  display:"flex",alignItems:"center",
                  padding: isThin ? "0" : "0 8px",
                  gap:5,
                  overflow:"hidden",
                  minWidth:"4px",
                }}>
                {!isThin&&b.run&&<span style={{flexShrink:0,width:6,height:6,borderRadius:"50%",
                  background:"#22C55E",boxShadow:"0 0 8px #22C55E",
                  animation:"blink 1s ease-in-out infinite"}}/>}
                {!isThin&&<span style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:900,
                  color:"#fff",letterSpacing:"0.06em",whiteSpace:"nowrap",flexShrink:0,
                  textShadow:"0 1px 5px rgba(0,0,0,0.9)"}}>
                  {b.m.serie||"—"}
                </span>}
                {!isThin&&width>12&&<span style={{fontFamily:"monospace",fontSize:"8px",
                  color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap",overflow:"hidden",
                  textOverflow:"ellipsis",flexShrink:1,minWidth:0}}>
                  {b.m.modelo}
                </span>}
                {!isThin&&b.isPrio&&<span style={{flexShrink:0,fontSize:"8px",fontFamily:"monospace",
                  background:"rgba(245,158,11,0.35)",color:"#F59E0B",
                  padding:"1px 4px",borderRadius:"3px",fontWeight:700}}>⚑</span>}
                {!isThin&&b.overrun&&<span style={{flexShrink:0,fontSize:"8px",fontFamily:"monospace",
                  background:"rgba(239,68,68,0.3)",color:"#FCA5A5",
                  padding:"1px 4px",borderRadius:"3px",fontWeight:700}}>ATRAS.</span>}
              </div>

              {/* Label externo — aparece quando a barra é demasiado estreita */}
              {isThin&&(
                <div style={{
                  position:"absolute",
                  top:"50%",transform:"translateY(-50%)",
                  // posiciona à direita ou esquerda da barra conforme espaço disponível
                  ...(labelRight
                    ? {left:`calc(${rightC}% + 5px)`}
                    : {right:`calc(${100-leftC}% + 5px)`,textAlign:"right"}
                  ),
                  display:"flex",flexDirection:"column",gap:1,
                  pointerEvents:"none",
                  zIndex:10,
                  maxWidth:"140px",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {b.run&&<span style={{width:5,height:5,borderRadius:"50%",flexShrink:0,
                      background:"#22C55E",boxShadow:"0 0 6px #22C55E",
                      animation:"blink 1s ease-in-out infinite"}}/>}
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:900,
                      color:"#e8e8e8",letterSpacing:"0.05em",whiteSpace:"nowrap",
                      textShadow:"0 0 8px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.8)"}}>
                      {b.m.serie||"—"}
                    </span>
                    {b.isPrio&&<span style={{fontSize:"8px",color:"#F59E0B",fontWeight:700}}>⚑</span>}
                    {b.overrun&&<span style={{fontSize:"7px",fontFamily:"monospace",
                      background:"rgba(239,68,68,0.3)",color:"#FCA5A5",
                      padding:"1px 3px",borderRadius:"2px",fontWeight:700}}>ATRAS.</span>}
                  </div>
                  <span style={{fontFamily:"monospace",fontSize:"8px",
                    color:"rgba(180,180,180,0.6)",whiteSpace:"nowrap",
                    textShadow:"0 0 6px rgba(0,0,0,0.9)"}}>
                    {fmtD(b.pi)}→{fmtD(b.pf)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {blocks.length>MAX_VISIBLE&&(
          <div style={{textAlign:"center",fontFamily:"monospace",fontSize:"9px",
            color:D.dark?"rgba(180,180,180,0.4)":"rgba(30,30,60,0.4)",letterSpacing:"0.1em",padding:"4px 0"}}>
            +{blocks.length-MAX_VISIBLE} MÁQUINAS NÃO VISÍVEIS
          </div>
        )}
      </div>

      {/* ── Legenda ── */}
      <div style={{
        display:"flex",gap:"16px",flexShrink:0,
        fontFamily:"monospace",fontSize:"9px",color:D.muted,letterSpacing:"0.08em",
        paddingTop:"6px",borderTop:`1px solid ${D.line}`,
        alignItems:"center",
      }}>
        <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{display:"inline-block",width:"14px",height:"8px",borderRadius:"3px",
            background:"linear-gradient(90deg,#c8102e,#c0c0c0)"}}/>
          EM CURSO
        </span>
        <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{display:"inline-block",width:"14px",height:"8px",borderRadius:"3px",
            background:"rgba(210,210,210,0.18)",border:"1px solid rgba(210,210,210,0.35)"}}/>
          FILA
        </span>
        <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{display:"inline-block",width:"14px",height:"8px",borderRadius:"3px",
            background:"linear-gradient(90deg,#c0c0c0,#c8102e)"}}/>
          ATRASADA
        </span>
        <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{display:"inline-block",width:"2px",height:"14px",
            background:"linear-gradient(180deg,#ff2240,#d0d0d0)",boxShadow:"0 0 8px rgba(255,34,64,0.8)"}}/>
          HOJE
        </span>
        <span style={{marginLeft:"auto",fontFamily:"'Orbitron',monospace",fontSize:"8px",color:D.muted}}>
          {blocks.length} MÁQUINAS · {blocks.filter(b=>b.isActive).length} EM CURSO · {blocks.filter(b=>!b.isActive).length} FILA
        </span>
      </div>
    </div>
  );
}


// ── SLIDES list ───────────────────────────────────────────────────────────────
const SLIDES=[
  {id:"andamento",    label:"EM ANDAMENTO"},
  {id:"prioritarias", label:"PRIORITÁRIAS"},
  {id:"timeline",     label:"TIMELINE"},
  {id:"proximas",     label:"PRÓXIMAS"},
  {id:"nts",          label:"NTS"},
  {id:"recon",        label:"RECOND."},
  {id:"concluidas",   label:"CONCLUÍDAS"},
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AoVivo(){
  const [dark,sDark] = useState(()=>{ try{return localStorage.getItem("theme")!=="light";}catch{return true;} });
  const navigate = useNavigate();
  const [machines,sM] = useState([]);
  const [loading,sL]  = useState(true);
  const [slide,sSlide]= useState(0);
  const [prog,sProg]  = useState(0);
  const [paused,sPaused]=useState(false);

  const D = DT(dark);
  const startRef=useRef(Date.now()), timerRef=useRef(null), progRef=useRef(null);

  const fetch0=useCallback(async()=>{
    try{const d=await callBridge({action:"list",entity:"FrotaACP"});sM((d||[]).filter(m=>!m.arquivada));}
    catch(e){console.warn(e);}finally{sL(false);}
  },[]);
  useEffect(()=>{fetch0();const id=setInterval(fetch0,30000);return()=>clearInterval(id);},[fetch0]);

  const goTo=useCallback(i=>{sSlide(i);sProg(0);startRef.current=Date.now();},[]);
  const next=useCallback(()=>goTo((slide+1)%SLIDES.length),[slide,goTo]);
  const prev=useCallback(()=>goTo((slide-1+SLIDES.length)%SLIDES.length),[slide,goTo]);

  useEffect(()=>{
    if(paused){clearTimeout(timerRef.current);clearInterval(progRef.current);return;}
    const el=Date.now()-startRef.current;
    timerRef.current=setTimeout(next,Math.max(SLIDE_DURATION-el,0));
    progRef.current=setInterval(()=>sProg(Math.min((Date.now()-startRef.current)/SLIDE_DURATION,1)),100);
    return()=>{clearTimeout(timerRef.current);clearInterval(progRef.current);};
  },[slide,paused,next]);

  useEffect(()=>{
    const h=e=>{
      if(e.key==="Escape")navigate("/");
      if(e.key==="ArrowRight")next();
      if(e.key==="ArrowLeft")prev();
      if(e.key===" "){e.preventDefault();sPaused(p=>!p);}
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[navigate,next,prev]);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const monday=getMondayUTC();
  const isRecon=m=>{const r=m.recondicao||{};return r.bronze===true||r.prata===true;};
  const r30=new Date(Date.now()-30*24*3600*1000);

  const andamento    = machines.filter(m=>(m.timer_status==="running"||m.timer_status==="paused")&&!m.estado?.startsWith("concluida")&&m.estado!=="concluida");
  const prioritarias = machines.filter(m=>m.prioridade===true&&!m.estado?.startsWith("concluida")&&m.estado!=="concluida");
  const filaACP      = machines.filter(m=>m.estado==="a-fazer"&&m.tipo!=="nova");
  // PRÓXIMAS: tudo com previsao_inicio, que não esteja concluído
  const proximas     = machines.filter(m=>{
    if(!m.previsao_inicio) return false;
    if(m.estado?.startsWith("concluida")||m.estado==="concluida") return false;
    if(m.arquivada) return false;
    return true;
  }).sort((a,b)=>{
    // prioritárias primeiro, depois por data crescente
    if(a.prioridade&&!b.prioridade) return -1;
    if(!a.prioridade&&b.prioridade) return 1;
    return new Date(a.previsao_inicio)-new Date(b.previsao_inicio);
  });
  const ntsAnd       = machines.filter(m=>m.tipo==="nova"&&m.estado?.startsWith("em-preparacao"));
  const ntsAF        = machines.filter(m=>m.tipo==="nova"&&m.estado==="a-fazer");
  const reconAnd     = machines.filter(m=>isRecon(m)&&m.estado?.startsWith("em-preparacao"));
  const reconAF      = machines.filter(m=>isRecon(m)&&m.estado==="a-fazer");
  const reconCon     = machines.filter(m=>{
    if(!isRecon(m))return false;
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida")return false;
    const raw=m.dataConclusao;if(!raw)return false;
    try{return new Date(raw)>=r30;}catch{return false;}
  });
  const conSemana=machines.filter(m=>{
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida")return false;
    const raw=m.dataConclusao;if(!raw)return false;
    try{return new Date(raw)>=monday;}catch{return false;}
  });
  const totalCon=machines.filter(m=>m.estado?.startsWith("concluida")||m.estado==="concluida");

  // ── Slide renders ─────────────────────────────────────────────────────────
  const slides={
    andamento:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",flex:1}}>
        <SlideHead title="EM ANDAMENTO" icon={<Activity size={16}/>} color={D.blue} D={D} count={andamento.length}/>
        {andamento.length===0?<Empty label="Nenhuma máquina em produção" D={D}/>:<BigBoard items={andamento} D={D}/>}
      </div>
    ),
    prioritarias:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="PRIORITÁRIAS" icon={<Flag size={16}/>} color={D.yellow} pulse D={D} count={prioritarias.length}/>
        {prioritarias.length===0?<Empty label="Sem prioritárias activas ✓" D={D}/>:
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {prioritarias.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} forceCategory="prio"/>)}
          </div>}
      </div>
    ),
    proximas:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="PRÓXIMAS" icon={<CalendarDays size={16}/>} color={D.blue} D={D} count={proximas.length}/>
        {proximas.length===0
          ?<Empty label="Nenhuma máquina com previsão marcada" D={D}/>
          :<CalendarFila items={proximas} D={D} concluidas={totalCon}/>
        }
      </div>
    ),
    nts:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="NTS" icon={<ListOrdered size={16}/>} color={D.pink} D={D} count={ntsAnd.length+ntsAF.length}/>
        {ntsAnd.length+ntsAF.length===0?<Empty label="Sem máquinas NTS" D={D}/>:
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {ntsAnd.length>0&&<><SecLabel label="▶ EM ANDAMENTO" D={D}/>{ntsAnd.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} forceCategory="nts" showDate={true}/>)}</>}
            {ntsAF.length>0&&<><SecLabel label="⏳ A FAZER" D={D}/>{ntsAF.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} forceCategory="nts" showTimer={false} showDate={true}/>)}</>}
          </div>}
      </div>
    ),
    recon:(()=>{
      const timerPriority=s=>s==="running"?0:s==="paused"?1:2;
      const reconAll=[...reconAnd,...reconAF].sort((a,b)=>timerPriority(a.timer_status)-timerPriority(b.timer_status));
      return(
        <div style={{display:"flex",flexDirection:"column",height:"100%",gap:"8px",overflow:"hidden",flex:1}}>
          <SlideHead title="RECONDICIONAMENTO" icon={<Wrench size={16}/>} color={D.purple} D={D} count={reconAnd.length+reconAF.length+reconCon.length}/>
          {reconAll.length+reconCon.length===0?<Empty label="Sem máquinas em recondicionamento" D={D}/>:
            <>
              {reconAll.length>0&&<BigBoard items={reconAll} D={D} isRecon={true}/>}
              {reconCon.length>0&&(
                <div style={{flexShrink:0}}>
                  <SecLabel label="✓ CONCLUÍDAS (30 DIAS)" D={D}/>
                  <div style={{display:"flex",flexDirection:"column",gap:"4px",marginTop:"4px"}}>
                    {reconCon.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} forceCategory="concluida" showTimer={false} showDate/>)}
                  </div>
                </div>
              )}
            </>}
        </div>
      );
    })(),
    timeline:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="TIMELINE · 14 DIAS" icon={<CalendarDays size={16}/>} color={D.pink} D={D}
          count={machines.filter(m=>(m.estado?.startsWith("em-preparacao")||m.estado==="a-fazer")&&m.previsao_inicio).length}/>
        <GanttChart machines={[
          ...machines.filter(m=>m.estado?.startsWith("em-preparacao")&&m.previsao_inicio),
          ...machines.filter(m=>m.estado==="a-fazer"&&m.previsao_inicio),
        ]} D={D}/>
      </div>
    ),
    concluidas:(()=>{
      const sorted=[...conSemana].sort((a,b)=>new Date(b.dataConclusao||0)-new Date(a.dataConclusao||0));
      const n=sorted.length;
      const cols=n<=4?2:n<=9?3:n<=16?4:5;
      return(
        <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
          <SlideHead title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={16}/>} color={D.green} D={D} count={n}/>
          {n===0?<Empty label="Nenhuma conclusão esta semana ainda" D={D}/>:
            <div style={{
              display:"grid",
              gridTemplateColumns:`repeat(${cols},1fr)`,
              gridAutoRows:"minmax(80px, 1fr)",
              gap:6,
              flex:1,
              minHeight:0,
              overflowY:"auto",
              overflowX:"hidden",
              paddingRight:2,
            }}>
              {sorted.map((m,i)=>{
                const dt=m.dataConclusao;
                const dateStr=dt?new Date(dt).toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
                const recon=m.recondicao||{};
                const rLabel=recon.prata?"PRATA":recon.bronze?"BRONZE":null;
                const tasks=m.tarefas||[];
                return(
                  <div key={m.id} style={{
                    position:"relative",
                    display:"flex",flexDirection:"column",gap:3,
                    padding:"6px 8px 5px",
                    background:D.dark
                      ?`linear-gradient(135deg,rgba(34,197,94,0.12) 0%,rgba(8,4,6,0.97) 100%)`
                      :`linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(255,255,255,0.97) 100%)`,
                    border:`1px solid rgba(34,197,94,0.35)`,
                    borderTop:`2px solid #22C55E`,
                    boxShadow:D.dark?`0 0 14px rgba(34,197,94,0.18)`:`0 2px 8px rgba(34,197,94,0.12)`,
                    overflow:"hidden",
                    clipPath:"polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                  }}>
                    {/* nº de ordem */}
                    <div style={{position:"absolute",top:4,right:6,fontFamily:"'Orbitron',monospace",
                      fontSize:"8px",fontWeight:700,color:`rgba(34,197,94,0.4)`,letterSpacing:"0.1em"}}>
                      {String(i+1).padStart(2,"0")}
                    </div>
                    {/* ícone ✓ */}
                    <div style={{position:"absolute",bottom:5,right:7,opacity:0.12}}>
                      <CheckCircle2 size={22} color="#22C55E"/>
                    </div>
                    {/* série + modelo */}
                    <div>
                      <div style={{fontFamily:"'Orbitron',monospace",
                        fontSize:"clamp(10px,0.9vw,13px)",fontWeight:900,
                        color:D.dark?"#e8e8e8":"#0d0e1a",letterSpacing:"0.05em",lineHeight:1.1,
                        textShadow:"none",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        paddingRight:"22px"}}>
                        {m.serie||"—"}
                      </div>
                      <div style={{fontFamily:"'Rajdhani',system-ui,sans-serif",fontSize:"11px",fontWeight:500,
                        color:D.dark?"rgba(140,140,140,0.7)":"rgba(30,30,60,0.55)",
                        marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.modelo||"—"}
                      </div>
                    </div>
                    {/* tarefas concluídas */}
                    {tasks.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:3,overflow:"hidden"}}>
                        {tasks.map((t,j)=>(
                          <span key={j} style={{
                            fontFamily:"monospace",fontSize:"8px",padding:"1px 5px",
                            background:`rgba(34,197,94,0.1)`,
                            color:"#22C55E",
                            border:`1px solid rgba(34,197,94,0.3)`,
                            textDecoration:"line-through",
                            clipPath:"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                            fontWeight:600,letterSpacing:"0.03em",whiteSpace:"nowrap",
                          }}>
                            {t.texto}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* rodapé: timer + tags + data */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      gap:4,marginTop:"auto",flexWrap:"nowrap",overflow:"hidden"}}>
                      <div style={{display:"flex",gap:3,alignItems:"center",overflow:"hidden"}}>
                        {(m.timer_accumulated_seconds>0)&&(
                          <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                            <span style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(34,197,94,0.6)"}}>⏱</span>
                            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:700,
                              color:"#22C55E",letterSpacing:"0.04em"}}>
                              {fmtHMS(m.timer_accumulated_seconds)}
                            </span>
                          </div>
                        )}
                        {rLabel&&<span style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:700,
                          padding:"1px 4px",color:CAT.recon.accent,
                          background:`rgba(155,92,246,0.15)`,border:`1px solid rgba(155,92,246,0.35)`,
                          clipPath:"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                          whiteSpace:"nowrap",flexShrink:0}}>{rLabel}</span>}
                        {m.prioridade&&<span style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:700,
                          padding:"1px 4px",color:"#F59E0B",
                          background:`rgba(245,158,11,0.15)`,border:`1px solid rgba(245,158,11,0.35)`,
                          clipPath:"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                          whiteSpace:"nowrap",flexShrink:0}}>⚑</span>}
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:"8px",fontWeight:700,
                        color:"#22C55E",letterSpacing:"0.04em",flexShrink:0,whiteSpace:"nowrap"}}>
                        {dateStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      );
    })(),
  };

  // KPIs
  // tempo médio das concluídas com timer (em horas)
  const withTimer = totalCon.filter(m=>(m.timer_accumulated_seconds||0)>0);
  const avgH = withTimer.length>0
    ? Math.round(withTimer.reduce((s,m)=>s+(m.timer_accumulated_seconds||0),0)/withTimer.length/3600*10)/10
    : 0;
  // concluídas hoje
  const todayStr2 = new Date().toISOString().slice(0,10);
  const conHoje = totalCon.filter(m=>{
    const raw=m.dataConclusao; if(!raw)return false;
    try{return new Date(raw).toISOString().slice(0,10)===todayStr2;}catch{return false;}
  });
  const kpis=[
    {l:"ANDAMENTO",   v:andamento.length,            c:D.blue  },
    {l:"PRIORITÁRIAS",v:prioritarias.length,         c:D.yellow},
    {l:"TIMELINE",    v:machines.filter(m=>(m.estado?.startsWith("em-preparacao")||m.estado==="a-fazer")&&m.previsao_inicio).length, c:D.pink},
    {l:"PRÓXIMAS",    v:proximas.length,               c:D.muted },
    {l:"NTS",         v:ntsAnd.length+ntsAF.length,  c:D.pink  },
    {l:"RECON",       v:reconAnd.length+reconAF.length,c:D.purple},
    {l:"ESTA SEMANA", v:conSemana.length,             c:D.green },
    {l:"HOJE",        v:conHoje.length,               c:D.cyan  },
    {l:"MÉD.h/MÁQ",  v:avgH,                         c:D.silver},
    {l:"TOTAL 2026",  v:totalCon.length,              c:D.sub   },
  ];

  return(
    <div style={{width:"100vw",height:"100vh",background:D.bg,color:D.text,
      display:"flex",flexDirection:"column",fontFamily:"'Rajdhani',system-ui,sans-serif",
      overflow:"hidden",position:"fixed",top:0,left:0}}>
      {/* ARMOR BACKGROUND — scanlines + hex grid + vignette */}
      {dark&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        background:`repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(200,16,46,0.018) 2px,rgba(200,16,46,0.018) 3px),radial-gradient(ellipse at 50% 100%,rgba(200,16,46,0.1),transparent 60%),radial-gradient(ellipse at 50% 0%,rgba(210,210,210,0.05),transparent 50%)`}}/>}
      {dark&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.35,
        backgroundImage:`linear-gradient(60deg,transparent 49%,rgba(210,210,210,0.015) 49%,rgba(210,210,210,0.015) 51%,transparent 51%),linear-gradient(-60deg,transparent 49%,rgba(210,210,210,0.015) 49%,rgba(210,210,210,0.015) 51%,transparent 51%)`,
        backgroundSize:"40px 70px"}}/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes hudScan{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes hudPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.7}}
        @keyframes hudFadeIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes helmetPulse{0%,100%{box-shadow:0 0 10px #5cffff,0 0 20px #5cffff}50%{box-shadow:0 0 4px #5cffff}}
        @keyframes armorSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:rgba(210,210,210,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(210,210,210,0.2);border-radius:2px}
        *{box-sizing:border-box}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{position:"relative",display:"flex",alignItems:"center",gap:"14px",
        padding:"10px clamp(14px,1.5vw,24px)",background:D.surface,
        borderBottom:`1px solid ${D.hudLine}`,flexShrink:0,flexWrap:"wrap",
        boxShadow:`0 0 20px ${D.hudGlow}, inset 0 -1px 0 ${D.hudLine}`}}>
        {/* faixa discreta na borda inferior */}
        <div style={{position:"absolute",bottom:-1,left:0,right:0,height:"1px",
          background:`linear-gradient(90deg, transparent, ${D.pink}88, transparent)`,
          opacity:0.6}}/>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0,
          paddingRight:"14px",borderRight:`1px solid ${D.line}`}}>
          <div style={{position:"relative",padding:"3px"}}>
            <HudCorners color={D.pink} size={8} thickness={1.5} inset={-1} opacity={0.9}/>
            <img src="https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png"
              alt="" style={{width:"clamp(34px,2.7vw,42px)",height:"clamp(34px,2.7vw,42px)",
              objectFit:"contain",filter:`drop-shadow(0 0 8px ${D.pink}aa)`,display:"block"}}/>
          </div>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",
              fontSize:"clamp(13px,1.1vw,17px)",fontWeight:900,
              letterSpacing:"0.22em",color:D.pink,
              textShadow:`0 0 12px ${D.pink}77`,lineHeight:1}}>
              WATCHER
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"3px"}}>
              <span style={{fontFamily:"'Orbitron',monospace",
                fontSize:"clamp(9px,0.7vw,11px)",fontWeight:700,
                letterSpacing:"0.2em",color:D.cyan}}>AO VIVO</span>
              <span style={{fontFamily:"monospace",fontSize:"clamp(8px,0.6vw,10px)",
                color:D.muted,letterSpacing:"0.1em"}}>· SYNC 30s</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:"4px",flex:1,justifyContent:"center",flexWrap:"wrap"}}>
          {SLIDES.map((s,i)=>{
            const active = i===slide;
            return(
              <button key={s.id} onClick={()=>goTo(i)} style={{
                position:"relative",
                fontFamily:"'Orbitron',monospace",
                fontSize:"clamp(9px,0.78vw,12px)",letterSpacing:"0.14em",fontWeight:active?900:600,
                padding:"6px 14px",cursor:"pointer",border:"none",
                background:active ? D.pink : D.sub,
                color:active?"#fff":D.muted,
                textShadow:"none",
                boxShadow:active?`0 2px 8px rgba(200,16,46,0.35)`:"none",
                clipPath:"polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
                transition:"all 0.2s",
              }}>
                <span style={{opacity:active?1:0.55,marginRight:"6px",fontSize:"0.85em"}}>
                  {String(i+1).padStart(2,"0")}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Controles */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
          <Clock D={D}/>

          <div style={{display:"flex",gap:"2px"}}>
            <button onClick={prev} title="Anterior" style={{
              background:D.sub,border:`1px solid ${D.line}`,
              padding:"6px 8px",cursor:"pointer",color:D.text,display:"flex",
              clipPath:"polygon(4px 0, 100% 0, 100% 100%, 0 100%, 0 4px)"}}>
              <ChevronLeft size={14}/>
            </button>
            <button onClick={()=>sPaused(p=>!p)} title={paused?"Retomar":"Pausar"} style={{
              background:paused?`${D.yellow}26`:D.sub,
              border:`1px solid ${paused?D.yellow:D.line}`,
              padding:"6px 12px",cursor:"pointer",
              color:paused?D.yellow:D.text,
              display:"flex",alignItems:"center",gap:"5px"}}>
              {paused?<Play size={12}/>:<Pause size={12}/>}
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(9px,0.7vw,11px)",
                fontWeight:700,letterSpacing:"0.12em"}}>
                {paused?"RETOMAR":"PAUSAR"}
              </span>
            </button>
            <button onClick={next} title="Seguinte" style={{
              background:D.sub,border:`1px solid ${D.line}`,
              padding:"6px 8px",cursor:"pointer",color:D.text,display:"flex",
              clipPath:"polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)"}}>
              <ChevronRight size={14}/>
            </button>
          </div>

          <button onClick={()=>{sDark(d=>!d);localStorage.setItem("theme",dark?"light":"dark");}}
            title="Tema" style={{
            background:D.sub,border:`1px solid ${D.line}`,
            padding:"6px 8px",cursor:"pointer",color:D.text,display:"flex"}}>
            {dark?<Sun size={13}/>:<Moon size={13}/>}
          </button>

          {/* LIVE indicator táctico */}
          <div style={{display:"flex",alignItems:"center",gap:"6px",
            padding:"4px 10px",
            background:`${D.green}1a`,border:`1px solid ${D.green}55`,
            clipPath:"polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)"}}>
            <div style={{width:"7px",height:"7px",background:D.green,
              boxShadow:`0 0 8px ${D.green}, 0 0 16px ${D.green}77`,
              clipPath:"polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
              animation:"blink 1.2s ease-in-out infinite"}}/>
            <span style={{fontFamily:"'Orbitron',monospace",
              fontSize:"clamp(9px,0.7vw,11px)",fontWeight:800,
              color:D.green,letterSpacing:"0.18em"}}>LIVE</span>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div style={{position:"relative",height:"3px",background:"rgba(210,210,210,0.08)",flexShrink:0,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${prog*100}%`,
          background:`linear-gradient(90deg,#c8102e,#ff2240,#c0c0c0,#e8e8e8)`,
          boxShadow:`0 0 10px rgba(255,34,64,0.7), 0 0 20px rgba(210,210,210,0.25)`,
          transition:"width 0.1s linear"}}/>
        {/* riscas tácticas */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          backgroundImage:`repeating-linear-gradient(90deg, transparent 0, transparent ${100/SLIDES.length}%, ${D.muted}55 ${100/SLIDES.length}%, ${D.muted}55 calc(${100/SLIDES.length}% + 1px))`}}/>
      </div>

      {/* KPI BAR */}
      <div style={{display:"flex",gap:"1px",
        background:`linear-gradient(180deg, ${D.scanBg}, transparent)`,
        borderBottom:`1px solid ${D.line}`,flexShrink:0}}>
        {kpis.map((k,i)=>{
          const isActive = (i===0&&SLIDES[slide].id==="andamento") ||
                           (i===1&&SLIDES[slide].id==="prioritarias") ||
                           (i===2&&SLIDES[slide].id==="timeline") ||
                           (i===3&&SLIDES[slide].id==="proximas") ||
                           (i===4&&SLIDES[slide].id==="nts") ||
                           (i===5&&SLIDES[slide].id==="recon") ||
                           (i===6&&SLIDES[slide].id==="concluidas");
          return(
            <div key={k.l} style={{position:"relative",flex:1,
              background:isActive?`linear-gradient(180deg, ${k.c}14, ${D.surface})`:D.surface,
              padding:"clamp(7px,0.8vw,11px) clamp(6px,0.8vw,10px)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
              borderTop:isActive?`2px solid ${k.c}`:`2px solid transparent`,
              transition:"all 0.3s"}}>
              {/* tick lateral */}
              <div style={{position:"absolute",top:"50%",left:0,transform:"translateY(-50%)",
                width:"2px",height:"60%",background:k.c,opacity:0.25}}/>
              <div style={{fontFamily:"'Orbitron',monospace",
                fontSize:"clamp(20px,1.95vw,32px)",fontWeight:900,color:k.c,
                textShadow:isActive?`0 0 14px ${k.c}aa`:`0 0 8px ${k.c}44`,
                letterSpacing:"0.04em",lineHeight:1}}>
                {loading?"··":String(k.v).padStart(2,"0")}
              </div>
              <div style={{fontFamily:"'Rajdhani',system-ui,sans-serif",
                fontSize:"clamp(9px,0.72vw,11px)",fontWeight:600,
                color:isActive?k.c:D.muted,
                letterSpacing:"0.08em",textAlign:"center",
                textTransform:"uppercase",
                opacity:isActive?1:0.7}}>
                {k.l}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SLIDE CONTENT — ocupa tudo, sem overflow ── */}
      <div style={{flex:1,padding:"clamp(14px,1.4vw,22px) clamp(18px,1.8vw,28px)",
        overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>

        {/* Grid HUD de fundo (dark only) */}
        {dark && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
            backgroundImage:`
              linear-gradient(${D.hudLine} 1px, transparent 1px),
              linear-gradient(90deg, ${D.hudLine} 1px, transparent 1px)
            `,
            backgroundSize:"60px 60px",
            opacity:0.06,
            maskImage:"radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage:"radial-gradient(ellipse at center, black 30%, transparent 80%)"}}/>
        )}

        {/* Slide counter big — canto superior direito do conteúdo */}
        <div style={{position:"absolute",top:"clamp(8px,0.9vw,14px)",right:"clamp(18px,1.8vw,28px)",
          zIndex:2,display:"flex",alignItems:"baseline",gap:"4px",
          fontFamily:"'Orbitron',monospace",pointerEvents:"none"}}>
          <span style={{fontSize:"clamp(26px,2.4vw,38px)",fontWeight:900,
            color:D.pink,textShadow:`0 0 14px ${D.pink}66`,
            letterSpacing:"0.04em",lineHeight:1}}>
            {String(slide+1).padStart(2,"0")}
          </span>
          <span style={{fontSize:"clamp(11px,0.9vw,14px)",fontWeight:700,
            color:D.muted,letterSpacing:"0.18em"}}>
            / {String(SLIDES.length).padStart(2,"0")}
          </span>
        </div>

        {/* Jordan mascote — com reticle táctico */}
        <div style={{
          position:"absolute",bottom:0,right:0,
          width:"clamp(180px,22%,260px)",
          height:"clamp(180px,22vw,260px)",
          pointerEvents:"none",
          zIndex:0,
          display:"flex",alignItems:"flex-end",justifyContent:"flex-end",
        }}>
          {/* Reticle de targeting */}
          <div style={{position:"absolute",inset:"6%",pointerEvents:"none",opacity:0.35}}>
            <HudCorners color={D.pink} size={18} thickness={2} inset={0} opacity={0.85}/>
            {/* Cruz central no reticle */}
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
              width:"10px",height:"10px"}}>
              <div style={{position:"absolute",top:0,bottom:0,left:"50%",width:"1px",
                background:D.pink,boxShadow:`0 0 6px ${D.pink}`}}/>
              <div style={{position:"absolute",left:0,right:0,top:"50%",height:"1px",
                background:D.pink,boxShadow:`0 0 6px ${D.pink}`}}/>
            </div>
          </div>
          {/* Neon glow */}
          <div style={{
            position:"absolute",bottom:0,right:0,
            width:"100%",height:"100%",
            backgroundImage:`url(${JORDAN_URL})`,
            backgroundSize:"contain",backgroundRepeat:"no-repeat",
            backgroundPosition:"bottom right",
            filter:"blur(22px) brightness(1.2) saturate(3) hue-rotate(-10deg)",
            opacity:0.5,
          }}/>
          {/* Imagem principal */}
          <img src={JORDAN_URL} alt=""
            style={{
              position:"relative",width:"100%",
              objectFit:"contain",objectPosition:"bottom right",
              opacity:0.82,
              filter:`drop-shadow(0 0 24px ${D.pink}cc) drop-shadow(0 0 8px ${D.pink}aa) drop-shadow(0 0 4px rgba(255,255,255,0.2))`,
              display:"block",
            }}/>
        </div>

        {loading
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
            position:"relative",zIndex:1,flexDirection:"column",gap:"14px"}}>
            <div style={{position:"relative",padding:"30px 60px"}}>
              <HudCorners color={D.pink} size={16} thickness={2} inset={0} opacity={0.9}/>
              <span style={{fontFamily:"'Orbitron',monospace",
                fontSize:"clamp(14px,1.1vw,18px)",fontWeight:800,
                color:D.pink,letterSpacing:"0.32em",textShadow:`0 0 10px ${D.pink}77`,
                animation:"blink 1s ease-in-out infinite"}}>
                A CARREGAR...
              </span>
            </div>
          </div>
          :<div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>{slides[SLIDES[slide].id]}</div>}
      </div>

      {/* FOOTER */}
      <div style={{position:"relative",padding:"6px clamp(14px,1.5vw,24px)",background:D.surface,
        borderTop:`1px solid ${D.hudLine}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,
        boxShadow:`inset 0 1px 0 ${D.hudLine}`}}>
        {/* faixa discreta na borda superior */}
        <div style={{position:"absolute",top:-1,left:0,right:0,height:"1px",
          background:`linear-gradient(90deg, transparent, ${D.pink}88, transparent)`,
          opacity:0.5}}/>

        {/* Slide dots */}
        <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>goTo(i)} title={SLIDES[i].label} style={{
              width:i===slide?"clamp(22px,2vw,30px)":"clamp(8px,0.7vw,11px)",
              height:"clamp(4px,0.4vw,6px)",
              background:i===slide
                ?`linear-gradient(90deg,${D.pink},${D.blue})`
                :i<slide?`${D.muted}55`:D.sub,
              border:"none",cursor:"pointer",
              transition:"width 0.3s",padding:0,
              boxShadow:i===slide?`0 0 8px ${D.pink}77`:"none",
              clipPath:i===slide
                ?"polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)"
                :"none"}}/>
          ))}
        </div>

        <div style={{fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(9px,0.7vw,11px)",fontWeight:600,
          color:D.muted,letterSpacing:"0.16em",
          display:"flex",gap:"clamp(8px,1vw,16px)",flexWrap:"wrap",justifyContent:"center"}}>
          <span><span style={{color:D.cyan}}>←→</span> NAV</span>
          <span><span style={{color:D.cyan}}>SPACE</span> PAUSE</span>
          <span><span style={{color:D.cyan}}>ESC</span> EXIT</span>
          <span><span style={{color:D.cyan}}>F11</span> FULL</span>
        </div>

        <div style={{fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(9px,0.7vw,11px)",fontWeight:700,
          color:D.muted,letterSpacing:"0.18em"}}>
          STILL OFICINA · <span style={{color:D.pink}}>FROTA ACP</span>
        </div>
      </div>
    </div>
  );
}