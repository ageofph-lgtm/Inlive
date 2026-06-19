import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon,
         ChevronLeft, ChevronRight, Pause, Play, Wrench, CalendarDays } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
// Chama directamente a saganBridge do Watcher com segredo read-only.
// Read-only enforced pelo saganBridge (INLIVE_READ_SECRET só permite list/filter/get).
const BRIDGE_URL    = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type":"application/json",
  "x-sagan-secret":"82fa97ccb55b2b3d2939ea2567617bb5096ee3a7a1b8e421",
  "api_key":"f8517554492e492090b62dd501ad7e14"
};
const SLIDE_DURATION = 30000;
const MIN_TIMER_SECONDS = 300; // < 5 min = timer inválido, ignorado em stats e display
const JORDAN_URL = "https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png";

async function callBridge(p) {
  const r = await fetch(BRIDGE_URL,{method:"POST",headers:BRIDGE_HEADERS,body:JSON.stringify(p)});
  return (await r.json()).result || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2,"0");
function fmtHMS(s){ if(!s&&s!==0)return"00:00:00"; const abs=Math.abs(Math.round(s)); const sign=s<0?"-":""; return`${sign}${pad2(Math.floor(abs/3600))}:${pad2(Math.floor((abs%3600)/60))}:${pad2(abs%60)}`; }

// ── Countdown helpers ──
function getModoTimer(m){
  const est=Number(m?.tempo_estimado_segundos)||0;
  const acc=Number(m?.timer_accumulated_seconds)||0;
  if(est>0)return"countdown";
  if(acc>0)return"legacy";
  return"idle";
}
function calcRestanteAoVivo(m, elapsed){
  const est=Number(m?.tempo_estimado_segundos)||0;
  return est - elapsed;
}
function getEstadoCD(m, elapsed){
  const est=Number(m?.tempo_estimado_segundos)||0;
  if(est===0)return null;
  const r=calcRestanteAoVivo(m,elapsed);
  if(r<0)return"atraso";
  if(r/est<0.20)return"aviso";
  return"ok";
}
function fmtDate(v){ if(!v)return"—"; return new Date(v).toLocaleDateString("pt-PT",{day:"2-digit",month:"short"}); }
// Extrai motivo de pausa: "paused:aguarda_pecas" → "aguarda_pecas"; "paused" → "outros"
const getPausaMotivo = (mx) => {
  if (!mx?.timer_status?.startsWith("paused")) return null;
  return mx.timer_status.split(":")[1] || "outros";
};
function getMondayUTC(){ const n=new Date(),d=n.getUTCDay(),b=d===0?6:d-1,m=new Date(n); m.setUTCDate(n.getUTCDate()-b); m.setUTCHours(0,0,0,0); return m; }
function getFridayUTC(){ const f=new Date(getMondayUTC()); f.setUTCDate(f.getUTCDate()+4); f.setUTCHours(23,59,59,999); return f; }

// ── Tempo estimado RECON (espelho do countdown.js do Watcher) ─────────────────
const RECON_TEMPOS = {
  rx_fmx:  { ferro:6*3600,  bronze:15*3600, prata:30*3600, ouro:40*3600 },
  opx_sf:  { ferro:4*3600,  bronze:12*3600, prata:21*3600, ouro:25*3600 },
};
function getReconFamiliaAV(modelo=""){
  const m=modelo.toLowerCase();
  if(["rx","fmx"].some(f=>m.includes(f))) return"rx_fmx";
  if(["opx","exu-v","exu","sf"].some(f=>m.includes(f))) return"opx_sf";
  return null;
}
/** Devolve o tempo estimado em segundos para uma máquina RECON idle
 *  Usa tempo_estimado_segundos da DB se disponível, senão calcula pela tabela */
function getTempoReconAV(m){
  const fromDB = Number(m?.tempo_estimado_segundos)||0;
  if(fromDB>0) return fromDB;
  const recon = m?.recondicao||{};
  const cat   = recon.ouro?"ouro":recon.prata?"prata":recon.bronze?"bronze":recon.ferro?"ferro":null;
  if(!cat) return 0;
  const familia = getReconFamiliaAV(m?.modelo||"");
  if(!familia) return 0;
  return RECON_TEMPOS[familia]?.[cat]||0;
}

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
  concluida:{ accent:"#38BDF8", rgb:"56,189,248",   bg:"rgba(56,189,248,0.08)",  label:"CONCLUÍDA" },
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
// PALETA DUAL: dark = Stark Armor | light = Iron Apple
const DT = d => ({
  // ── Superfícies ──────────────────────────────────────────────────────────
  bg:      d?"#0c0c0e":"#F2F2F4",
  surface: d?"#111114":"#FFFFFF",
  card:    d?"#18181c":"#FFFFFF",
  cardB:   d?"#1e1e24":"#EAEAEC",
  line:    d?"rgba(255,255,255,0.08)":"rgba(13,13,15,0.06)",
  sub:     d?"rgba(255,255,255,0.04)":"rgba(13,13,15,0.03)",
  text:    d?"#f0f0f0":"#0D0D0F",
  muted:   d?"rgba(160,160,160,0.7)":"#8E8E93",
  // ── HUD lines (apenas dark usa scan lines) ───────────────────────────────
  hudLine: d?"rgba(200,16,46,0.3)":"rgba(200,16,46,0.10)",
  hudGlow: d?"rgba(200,16,46,0.08)":"transparent",
  scanBg:  d?"rgba(200,16,46,0.02)":"transparent",
  cardBg:  d?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.92)",
  rowBg:   d?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.80)",
  rowHov:  d?"rgba(255,255,255,0.03)":"rgba(200,16,46,0.04)",
  inputBg: d?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.9)",
  // ── Cores semânticas base ────────────────────────────────────────────────
  ...C,
  // ── Overrides por modo ───────────────────────────────────────────────────
  ...(d ? {
    // Dark — Stark Armor (inalterado)
    pink:   "#c8102e",
    blue:   "#9ca3af",
    cyan:   "#6b7280",
    muted:  "rgba(150,150,150,0.65)",
  } : {
    // Light — Iron Apple palette
    pink:   "#c8102e",   // iron-red
    blue:   "#0A6EBF",   // arc-blue
    green:  "#16A34A",   // status-run
    yellow: "#B08D2E",   // iron-gold
    red:    "#DC2626",   // status-blocked
    purple: "#7C3AED",   // status-recond
    cyan:   "#0A6EBF",   // arc-blue (alias)
    muted:  "#8E8E93",
  }),
  // ── Iron Apple extras (usados nos overrides de componente) ───────────────
  ironRed:       d?"#c8102e":"#C8102E",
  ironRedDeep:   d?"#8b0e22":"#8B0E22",
  ironRedTint:   d?"rgba(200,16,46,0.12)":"#FBE9EC",
  ironGold:      d?"#D4A857":"#B08D2E",
  ironGoldBright:d?"#D4A857":"#D4A857",
  ironGoldTint:  d?"rgba(212,168,87,0.12)":"#F8F1DD",
  arcBlue:       d?"#4D9FFF":"#0A6EBF",
  arcBlueTint:   d?"rgba(77,159,255,0.12)":"#E8F1FB",
  shadowCard:    d?"0 1px 4px rgba(0,0,0,0.5)":"0 1px 2px rgba(13,13,15,0.04), 0 8px 24px -8px rgba(13,13,15,0.08)",
  shadowPop:     d?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 1px rgba(13,13,15,0.06), 0 2px 4px rgba(13,13,15,0.04)",
  bgGradient:    d
    ?"none"
    :"radial-gradient(1200px 600px at 85% -10%, rgba(200,16,46,0.04), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(176,141,46,0.04), transparent 60%)",
  dark: d,
});

// ── HUD primitives ────────────────────────────────────────────────────────────
// Corner brackets [⌜ ⌝ ⌞ ⌟] — define um frame táctico em qualquer container
function HudCorners({color, size=10, thickness=2, inset=-1, opacity=0.9, D=null}){
  // Apenas renderiza no dark mode — no Iron Apple light os corners são suprimidos
  if(D&&!D.dark) return null;
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
  // dark injectado via contexto global — usamos window.__aovivo_dark como fallback
  const isDark = typeof document !== "undefined" && document.body.dataset.theme !== "light";
  return(
    <span style={{
      fontFamily:"'Russo One',sans-serif",
      fontSize:"clamp(8px,0.65vw,10px)",
      fontWeight:800,
      letterSpacing:isDark?"0.12em":"0.1em",
      padding:"2px 9px",
      color,
      background:`${color}${dim?"10":"16"}`,
      border:`1px solid ${color}${dim?"25":"44"}`,
      clipPath:isDark?"polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)":"none",
      borderRadius:isDark?0:"999px",
      whiteSpace:"nowrap",
      textTransform:"uppercase",
      boxShadow: glow&&isDark ? `0 0 10px ${color}99, 0 0 20px ${color}44, inset 0 0 8px ${color}22` : "none",
      animation: glow&&isDark ? "hudPulse 1.8s ease-in-out infinite" : "none",
      textShadow: glow&&isDark ? `0 0 8px ${color}` : "none",
    }}>{label}</span>
  );
}

// ── Live timer ────────────────────────────────────────────────────────────────
function useLiveTimer(m){
  const ref=useRef(m);
  useEffect(()=>{ref.current=m;}); // sempre actualizado

  function calcNow(mm){
    const acc=Number(mm?.timer_accumulated_seconds)||0;
    const at=mm?.timer_started_at?new Date(mm.timer_started_at).getTime():null;
    if(mm?.timer_status==="running"&&at) return acc+Math.floor((Date.now()-at)/1000);
    return acc;
  }

  const [e,sE]=useState(()=>calcNow(m));

  useEffect(()=>{
    sE(calcNow(ref.current)); // sincronizar imediatamente quando dados mudam
    if(m?.timer_status!=="running"||!m?.timer_started_at) return;
    const id=setInterval(()=>sE(calcNow(ref.current)),1000);
    return()=>clearInterval(id);
  // só reiniciar interval se mudou o play (novo timer_started_at) ou parou
  },[m?.timer_status,m?.timer_started_at]); // eslint-disable-line

  return e;
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock({D}){
  const [n,sN]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(id);},[]);
  return(
    <div style={{textAlign:"right",lineHeight:1.1,position:"relative",padding:"3px 10px 3px 12px",
      borderLeft:`1px solid ${D.line}`,borderRight:`1px solid ${D.line}`}}>
      <div style={{
        fontFamily:"'Russo One',sans-serif",
        fontSize:"clamp(18px,1.5vw,24px)",
        fontWeight:D.dark?900:600,
        color:D.text,
        letterSpacing:D.dark?"0.08em":"-0.02em",
        fontVariantNumeric:"tabular-nums",
        textShadow:D.dark?`0 0 12px ${D.cyan}66`:"none"}}>
        {n.toLocaleTimeString("pt-PT")}
      </div>
      <div style={{
        fontFamily:"'Russo One',sans-serif",
        fontSize:"clamp(9px,0.7vw,11px)",color:D.muted,
        textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:600,marginTop:"1px"}}>
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

function BoardCell({m, D, forceCategory=null, scale=1, compact=false}){
  const dark     = D.dark;
  const elapsed  = useLiveTimer(m);
  const run      = m.timer_status==="running";
  const paused   = m.timer_status?.startsWith("paused");
  const allTasks = m.tarefas||[];
  // Filtrar tasks reservadas (EXPRESS, VPS, IMPREVISTOS) para não duplicar com badges visuais
  const RESERVED = new Set(["EXPRESS","VPS","IMPREVISTOS","⚡ IMPREVISTOS"]);
  const realTasks = allTasks.filter(t=>!t.concluida && !RESERVED.has(t.texto?.trim?.()));
  const doneCount = allTasks.filter(t=>t.concluida && !RESERVED.has(t.texto?.trim?.())).length;
  // Injectar badges EXPRESS e VPS como tasks virtuais no topo
  const virtualTasks = [];
  const hasExpress = m.isExpress || allTasks.some(t=>t.texto==="EXPRESS");
  if (hasExpress) virtualTasks.push({texto:"EXPRESS", _virtual:true, _color:"#F59E0B"});
  if (m.isVps)    virtualTasks.push({texto:"VPS",     _virtual:true, _color:"#4D9FFF"});
  const tasks = [...virtualTasks, ...realTasks];

  const catKey   = forceCategory||getMachineCategory(m);
  const cat      = CAT[catKey]||CAT.andamento;

  const modoTimer= getModoTimer(m);
  const isCD     = modoTimer==="countdown";
  const meta     = Number(m.tempo_estimado_segundos)||0;
  const restante = isCD?calcRestanteAoVivo(m,elapsed):null;
  const isLate   = isCD&&restante!==null&&restante<0;
  const isRisk   = isCD&&!isLate&&restante!==null&&(restante/meta)<0.20;

  const st = isLate ?(dark?"#FF3344":"#DC2626")
           : isRisk ?(dark?"#FFB200":"#B08D2E")
           : run    ?(dark?"#2BE564":"#16A34A")
           : paused ?(dark?"#FFB200":"#B08D2E")
           :          cat.accent;

  const TCLR={raphael:"#FFD166",nuno:"#B68BFF",rogerio:"#FF8C69",yano:"#5CFFFF",patrick:"#90EE90"};
  const tid =(()=>{const e=m.estado||"";const x=e.match(/(?:em-preparacao|concluida)-(.+)/);return x?x[1]:(m.tecnico||null);})();
  const tc  = TCLR[tid]||"rgba(130,130,130,0.4)";

  const TB={
    nova:   {l:"NTS",  c:dark?"#FF3344":"#DC2626", b:"rgba(255,51,68,.08)",   br:"rgba(255,51,68,.28)"},
    usada:  {l:"RECON",c:dark?"#9B7BFF":"#7C3AED", b:"rgba(155,123,255,.08)", br:"rgba(155,123,255,.28)"},
    aluguer:{l:"ACP",  c:dark?"#4D9FFF":"#0A6EBF", b:"rgba(77,159,255,.08)",  br:"rgba(77,159,255,.28)"},
  };
  const tb = TB[m.tipo||m.tipo_origem||m.tipoOrigem||""]||null;
  const prio=!!m.prioridade;

  const pct  = meta>0?Math.min((elapsed/meta)*100,100):0;
  const rsec = Math.max(meta-elapsed,0);
  const asec = elapsed-meta;
  const fd   = d=>d?new Date(d+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"}):null;
  const fh   = s=>{const h=Math.floor(s/3600),mn=Math.floor((s%3600)/60);return mn===0?`${h}h`:`${h}h${String(mn).padStart(2,"0")}`;};

  // escala de padding/font baseada em scale — tudo proporcional, sem clamp fixo
  const P  = s => `${Math.round(s*scale)}px`;   // padding proporcional
  const FS = s => `${Math.round(s*scale)}px`;    // font-size proporcional
  const pad = Math.round(10*scale);              // padding base

  const showDatas = scale>=0.55 && (m.previsao_inicio||m.dataEntrada||m.previsao_fim);
  const barH      = Math.max(3, Math.round(5*scale));
  // tasks + imprevistos — serão mostrados como chips no rodapé, nunca como bloco separado
  const imp        = Array.isArray(m.imprevistos)?m.imprevistos:[];
  const totalImpH  = imp.reduce((s,iv)=>s+Number(iv.horas_extra||0),0);

  return(
    <div style={{
      position:"relative",
      display:"flex",flexDirection:"column",
      height:"100%",width:"100%",
      boxSizing:"border-box",
      overflow:"hidden",        // NUNCA expande
      borderRadius:dark?0:"8px",
      background:dark
        ?`linear-gradient(160deg,color-mix(in srgb,${st} 9%,#0d0d10) 0%,#090909 45%)`
        :`linear-gradient(160deg,color-mix(in srgb,${st} 5%,#fff) 0%,#fff 45%)`,
      border:`1px solid color-mix(in srgb,${st} 25%,transparent)`,
      boxShadow:`0 0 0 1px rgba(0,0,0,.45),0 8px 32px -12px color-mix(in srgb,${st} 50%,transparent)`,
      animation:isLate?"pulseCard 1.4s ease-in-out infinite":"none",
      clipPath:dark?"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))":"none",
    }}>
      {/* linha de topo = estado */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,zIndex:3,
        background:`linear-gradient(90deg,${st},transparent 70%)`,boxShadow:`0 0 10px ${st}`}}/>
      {/* spine = técnico */}
      <div style={{position:"absolute",top:8,bottom:8,left:0,width:3,zIndex:3,
        borderRadius:"0 3px 3px 0",background:tc,boxShadow:dark?`0 0 5px ${tc}44`:"none"}}/>
      {/* HUD corners */}
      {(isRisk||isLate)&&dark&&(<>
        <div style={{position:"absolute",top:4,right:4,width:8,height:8,zIndex:4,
          borderTop:`1.5px solid ${st}`,borderRight:`1.5px solid ${st}`,opacity:.65}}/>
        <div style={{position:"absolute",bottom:4,left:4,width:8,height:8,zIndex:4,
          borderBottom:`1.5px solid ${st}`,borderLeft:`1.5px solid ${st}`,opacity:.65}}/>
      </>)}

      {/* ── ROW 1: badges + timer ── */}
      <div style={{
        flexShrink:0,
        display:"flex",alignItems:"center",gap:Math.round(4*scale),
        padding:`${Math.round(8*scale)}px ${Math.round(14*scale)}px ${Math.round(6*scale)}px ${Math.round(16*scale)}px`,
        borderBottom:`1px solid ${dark?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)"}`,
        flexWrap:"wrap",overflow:"hidden",
      }}>
        {/* estado badge */}
        {isLate&&<Pill st={st} dark={dark} scale={scale}>✕</Pill>}
        {isRisk&&!isLate&&<Pill st={st} dark={dark} scale={scale}>⚠</Pill>}
        {!isRisk&&!isLate&&run&&(
          <span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:700,
            fontSize:FS(9),letterSpacing:".09em",
            padding:`${Math.round(2*scale)}px ${Math.round(6*scale)}px`,
            borderRadius:2,color:dark?"#2BE564":"#16A34A",
            background:"rgba(43,229,100,.1)",border:"1px solid rgba(43,229,100,.28)",
            display:"inline-flex",alignItems:"center",gap:3,flexShrink:0}}>
            <span style={{width:Math.round(5*scale),height:Math.round(5*scale),borderRadius:"50%",
              background:dark?"#2BE564":"#16A34A",boxShadow:"0 0 5px #2BE564",
              animation:"blink 1.6s infinite",flexShrink:0}}/>RUN
          </span>
        )}
        {paused&&!run&&(<>
          <Pill st={dark?"#FFB200":"#B08D2E"} dark={dark} scale={scale}>⏸</Pill>
          {(()=>{
            const reason = m.timer_status?.replace?.(/^paused[-_]?/i,"")?.replace(/_/g," ")?.trim?.();
            const label = reason && reason.length>2 && reason.toLowerCase()!=="true" ? reason.toUpperCase() : null;
            return label ? (
              <span style={{
                fontFamily:"'Russo One',sans-serif",fontWeight:600,
                fontSize:FS(8),letterSpacing:".1em",
                padding:`${Math.round(2*scale)}px ${Math.round(6*scale)}px`,
                borderRadius:2,color:dark?"#FFB200":"#B08D2E",
                background:"rgba(251,191,36,.08)",
                border:"1px solid rgba(251,191,36,.22)",
                flexShrink:0,maxWidth:`${Math.round(90*scale)}px`,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              }}>{label}</span>
            ) : null;
          })()}
        </>)}
        {prio&&<span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:800,
          fontSize:FS(9),padding:`${Math.round(2*scale)}px ${Math.round(5*scale)}px`,
          borderRadius:2,color:"#0a0a0a",background:"#FFB200",flexShrink:0}}>⚡</span>}
        {tb&&<Pill st={tb.c} dark={dark} scale={scale}>{tb.l}</Pill>}
        {/* % pill removido — percentagem vai dentro do arco circular */}
        {/* timer — fonte LCD digital */}
        <div style={{marginLeft:"auto",textAlign:"right",flexShrink:0}}>
          {/* Timer 7-segment LCD */}
          <div style={{position:"relative",display:"inline-block"}}>
            {/* ghost — dígitos apagados para dar efeito LCD */}
            <div style={{
              fontFamily:"'DSEG7','Share Tech Mono',monospace",
              fontWeight:400,
              fontSize:FS(scale>=0.88?22:scale>=0.75?18:14),
              letterSpacing:".04em",lineHeight:1,
              color:dark?`${st}18`:"rgba(0,0,0,0.07)",
              userSelect:"none",position:"absolute",top:0,right:0,
            }}>{"88:88:88"}</div>
            {/* valor real */}
            <div style={{
              fontFamily:"'DSEG7','Share Tech Mono',monospace",
              fontWeight:400,
              fontSize:FS(scale>=0.88?22:scale>=0.75?18:14),
              letterSpacing:".04em",color:st,lineHeight:1,
              textShadow:dark?`0 0 10px ${st},0 0 20px ${st}55`:"none",
              animation:run&&dark?"timerPulse 2s ease-in-out infinite":"none",
              position:"relative",zIndex:1,
            }}>
              {fmtHMS(isCD&&restante!==null?restante:elapsed)}
            </div>
          </div>
          {meta>0&&(
            <div style={{
              fontFamily:"'Russo One',sans-serif",
              fontWeight:600,
              fontSize:FS(8),
              color:dark?"rgba(255,255,255,0.85)":"rgba(0,0,0,0.75)",
              letterSpacing:".12em",marginTop:2,
            }}>
              /{fh(meta)} meta
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 2: NS plate (flex:1 — absorve espaço disponível) ── */}
      <div style={{
        flex:1,minHeight:0,overflow:"hidden",
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        padding:`${Math.round(10*scale)}px ${Math.round(10*scale)}px`,
        margin:`${Math.round(8*scale)}px ${Math.round(10*scale)}px ${Math.round(4*scale)}px`,
        background:dark?"rgba(0,0,0,.5)":"rgba(0,0,0,.03)",
        border:`1px solid ${dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)"}`,
        borderRadius:dark?"2px":"8px",
        position:"relative",
      }}>
        {dark&&run&&<div style={{position:"absolute",inset:0,pointerEvents:"none",
          background:`radial-gradient(ellipse 80% 50% at 50% 110%,${st}12,transparent)`}}/>}
        {/* NS — font-size adaptativo ao comprimento do série */}
        {(()=>{
          const ns = m.serie||"—";
          const len = ns.length;
          // base por scale, depois reduz proporcionalmente ao comprimento
          const base = scale>=0.88?36:scale>=0.75?27:scale>=0.62?21:16;
          // a partir de 10 chars começa a comprimir; cada char extra -1.5px
          const fsSerie = len<=9 ? base : Math.max(base*0.55, base - (len-9)*2.2);
          return (
            <div style={{
              fontFamily:"'Russo One','Orbitron',sans-serif",
              fontWeight:400,
              letterSpacing:len>11?"0em":".04em",
              textAlign:"center",lineHeight:1,
              fontSize:`${Math.round(fsSerie*scale)}px`,
              color:dark?"#fff":"#0D0D0F",
              textShadow:dark?"0 0 20px rgba(255,255,255,.15),0 0 40px rgba(255,255,255,.06)":"none",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              maxWidth:"100%",position:"relative",zIndex:1}}>
              {ns}
            </div>
          );
        })()}
        {/* modelo */}
        <div style={{
          fontFamily:"'Exo 2',sans-serif",
          fontWeight:400,
          fontSize:FS(scale>=0.88?11:scale>=0.75?9:7.5),
          letterSpacing:".22em",
          textTransform:"uppercase",
          color:dark?"rgba(180,180,190,.55)":"#999",
          marginTop:Math.round(3*scale),position:"relative",zIndex:1,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>
          {m.modelo||"—"}
        </div>
        {/* ── REATOR ARC — segmentos estilo Arc Reactor ── */}
        {meta>0&&(()=>{
          const sz      = Math.round((scale>=0.88?60:scale>=0.75?50:scale>=0.62?42:34)*scale);
          const cx      = sz/2, cy = sz/2;
          const safePct = Math.min(pct, 100);
          // outer ring: segmentos grandes (progress)
          const SEGS_OUT = 40;
          const rOut  = sz*0.44;
          const segW  = 3.2*scale, segH = Math.max(5, 7*scale);
          // inner ring: segmentos pequenos decorativos
          const SEGS_IN = 32;
          const rIn   = sz*0.33;
          const segW2 = 2*scale, segH2 = Math.max(3, 5*scale);
          const activeSeg = Math.round((safePct/100)*SEGS_OUT);
          const color = isLate?"#FF3344":st;
          const dimColor = dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)";
          return (
            <div style={{marginTop:Math.round(8*scale),position:"relative",zIndex:1,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width={sz} height={sz} style={{overflow:"visible"}}>
                {/* outer ring — segmentos de progresso */}
                {Array.from({length:SEGS_OUT},(_,i)=>{
                  const angle = (i/SEGS_OUT)*360 - 90;
                  const rad   = angle*(Math.PI/180);
                  const x     = cx + rOut*Math.cos(rad);
                  const y     = cy + rOut*Math.sin(rad);
                  const isActive = i < activeSeg;
                  const isEdge   = i === activeSeg-1 && !isLate;
                  return (
                    <rect key={`o${i}`}
                      x={-segW/2} y={-segH/2}
                      width={segW} height={segH}
                      rx={segW*0.3}
                      fill={isActive ? color : dimColor}
                      transform={`translate(${x},${y}) rotate(${angle+90})`}
                      style={{
                        filter: isEdge&&dark ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color}88)` :
                                isActive&&dark ? `drop-shadow(0 0 2px ${color}66)` : "none",
                        transition:"fill .3s",
                      }}
                    />
                  );
                })}
                {/* inner ring — decorativo, intensidade proporcional */}
                {Array.from({length:SEGS_IN},(_,i)=>{
                  const angle  = (i/SEGS_IN)*360 - 90;
                  const rad    = angle*(Math.PI/180);
                  const x      = cx + rIn*Math.cos(rad);
                  const y      = cy + rIn*Math.sin(rad);
                  const frac   = i/SEGS_IN;
                  const active = frac < safePct/100;
                  return (
                    <rect key={`i${i}`}
                      x={-segW2/2} y={-segH2/2}
                      width={segW2} height={segH2}
                      rx={1}
                      fill={active ? `${color}55` : dimColor}
                      transform={`translate(${x},${y}) rotate(${angle+90})`}
                    />
                  );
                })}
                {/* % no centro */}
                <text x={cx} y={cy}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="'DSEG7','Share Tech Mono',monospace"
                  fontWeight={400}
                  fontSize={Math.round((scale>=0.75?12:9)*scale)}
                  fill={isLate?"#FF3344":st}
                  style={{filter:dark?`drop-shadow(0 0 6px ${color})`:"none"}}>
                  {isLate?`+${Math.round(asec/60)}m`:Math.round(safePct)+"%"}
                </text>
              </svg>
            </div>
          );
        })()}
      </div>

      {/* ── ROW 3: datas inline (só se scale>=0.55) ── */}
      {showDatas&&(
        <div style={{
          flexShrink:0,overflow:"hidden",
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:Math.round(6*scale),flexWrap:"nowrap",
          padding:`0 ${Math.round(14*scale)}px`,
          marginBottom:Math.round(5*scale),
        }}>
          {(m.previsao_inicio||m.dataEntrada)&&(
            <span style={{display:"inline-flex",alignItems:"center",gap:Math.round(2*scale),flexShrink:0}}>
              <span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:700,
                fontSize:FS(scale>=0.75?10:8),
                color:dark?"rgba(140,140,140,.4)":"#bbb"}}>{"<"}</span>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontWeight:700,
                fontSize:FS(scale>=0.75?12:10),
                color:dark?"#6FC3FF":"#0A6EBF"}}>
                {fd(m.previsao_inicio||m.dataEntrada)}
              </span>
            </span>
          )}
          {(m.previsao_inicio||m.dataEntrada)&&m.previsao_fim&&(
            <span style={{color:dark?"rgba(255,255,255,.12)":"rgba(0,0,0,.12)",
              fontSize:FS(9),fontFamily:"'Exo 2',sans-serif"}}>·</span>
          )}
          {m.previsao_fim&&(
            <span style={{display:"inline-flex",alignItems:"center",gap:Math.round(2*scale),flexShrink:0}}>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontWeight:700,
                fontSize:FS(scale>=0.75?12:10),
                color:isLate?(dark?"#FF3344":"#DC2626"):isRisk?(dark?"#FFB200":"#B08D2E"):(dark?"#2BE564":"#16A34A")}}>
                {fd(m.previsao_fim)}
              </span>
              <span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:700,
                fontSize:FS(scale>=0.75?10:8),
                color:isLate?(dark?"#FF3344":"#DC2626"):isRisk?(dark?"#FFB200":"#B08D2E"):(dark?"#2BE564":"#16A34A")}}>{">"}</span>
            </span>
          )}
        </div>
      )}

      {/* ── RODAPÉ: técnico (dot) + tasks/imprevistos como chips + meta ── */}
      <div style={{
        flexShrink:0,
        display:"flex",flexDirection:"column",
        gap:Math.round(3*scale),
        padding:`${Math.round(5*scale)}px ${Math.round(12*scale)}px ${Math.round(7*scale)}px ${Math.round(14*scale)}px`,
        borderTop:`1px solid ${dark?"rgba(255,255,255,.04)":"rgba(0,0,0,.05)"}`,
      }}>
        {/* linha 1: técnico dot + chips de tasks + meta */}
        <div style={{display:"flex",alignItems:"center",gap:Math.round(5*scale),flexWrap:"wrap",overflow:"hidden"}}>
          {/* dot técnico */}
          <div style={{width:Math.round(7*scale),height:Math.round(7*scale),borderRadius:"50%",
            background:tc,boxShadow:dark?`0 0 5px ${tc}`:"none",flexShrink:0}}/>

          {/* chips de tasks e badges (EXPRESS, VPS, tarefas reais) */}
          {tasks.length>0&&tasks.slice(0,scale>=0.75?5:3).map((t,i)=>(
            <span key={i} style={{
              fontFamily:"'Exo 2',sans-serif",fontWeight:700,
              fontSize:FS(scale>=0.75?9:8),letterSpacing:".07em",
              padding:`${Math.round(1.5*scale)}px ${Math.round(5*scale)}px`,
              borderRadius:2,flexShrink:0,maxWidth:`${Math.round(120*scale)}px`,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              background:t._virtual
                ?(dark?`rgba(${t._color==='#F59E0B'?'245,158,11':'77,159,255'},.12)`:`rgba(${t._color==='#F59E0B'?'245,158,11':'77,159,255'},.1)`)
                :(dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)"),
              color:t._virtual?(t._color):(dark?"rgba(200,200,200,.7)":"#555"),
              border:`1px solid ${t._virtual?(dark?`${t._color}40`:`${t._color}50`):(dark?"rgba(255,255,255,.08)":"rgba(0,0,0,.1)")}`,
            }}>
              {t._virtual&&t.texto==="EXPRESS"?"⚡ ":t._virtual&&t.texto==="VPS"?"● ":""}{t.texto}
            </span>
          ))}
          {tasks.length>(scale>=0.75?5:3)&&(
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:FS(7.5),
              color:dark?"rgba(140,140,140,.35)":"#bbb",flexShrink:0}}>
              +{tasks.length-(scale>=0.75?5:3)}
            </span>
          )}

          {/* META removido do rodapé — está no topo do card */}
          <span style={{marginLeft:"auto"}}/>
        </div>

        {/* linha 2: imprevistos como chips (só se existirem) */}
        {imp.length>0&&(
          <div style={{display:"flex",alignItems:"center",gap:Math.round(4*scale),flexWrap:"wrap",overflow:"hidden"}}>
            <span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:700,
              fontSize:FS(7),letterSpacing:".12em",
              color:dark?"rgba(251,146,60,.5)":"#D97706",flexShrink:0}}>+{totalImpH}h</span>
            {imp.slice(0,scale>=0.75?3:2).map((iv,i)=>(
              <span key={i} style={{
                fontFamily:"'Exo 2',sans-serif",fontWeight:600,
                fontSize:FS(scale>=0.75?8.5:7.5),letterSpacing:".04em",
                padding:`${Math.round(1.5*scale)}px ${Math.round(5*scale)}px`,
                borderRadius:2,flexShrink:0,
                maxWidth:`${Math.round(140*scale)}px`,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                background:dark?"rgba(251,146,60,.07)":"rgba(251,146,60,.08)",
                color:dark?"#FB923C":"#D97706",
                border:`1px solid ${dark?"rgba(251,146,60,.2)":"rgba(251,146,60,.3)"}`,
              }}>
                ⚡ {iv.descricao}
              </span>
            ))}
            {imp.length>(scale>=0.75?3:2)&&(
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:FS(7.5),
                color:dark?"rgba(251,146,60,.3)":"#D97706",flexShrink:0}}>
                +{imp.length-(scale>=0.75?3:2)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Pill auxiliar para badges no BoardCell v6
function Pill({st, dark, scale, children}){
  const s = scale||1;
  return(
    <span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:700,
      fontSize:`${Math.round(9*s)}px`,letterSpacing:".09em",
      padding:`${Math.round(2*s)}px ${Math.round(6*s)}px`,
      borderRadius:2,color:st,
      background:`color-mix(in srgb,${st} 10%,transparent)`,
      border:`1px solid color-mix(in srgb,${st} 28%,transparent)`,
      display:"inline-flex",alignItems:"center",gap:2,
      whiteSpace:"nowrap",flexShrink:0}}>
      {children}
    </span>
  );
}

function BadgePillV2({color,bg,border,children}){
  return(
    <span style={{fontFamily:"'Exo 2',sans-serif",fontWeight:700,fontSize:10,
      letterSpacing:".1em",padding:"3px 7px",borderRadius:3,
      color,background:bg,border:`1px solid ${border}`,
      display:"inline-flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BIG BOARD CELL — card compacto adaptável (usado em Em Andamento)
//  Tamanho adapta-se automaticamente ao nº de itens via CSS grid auto-fit
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  REACTOR GAUGE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  RECON CELL — card minimalista para máquinas IDLE no slide Recon
//  Card activo/pausado → BoardCell normal
//  Card IDLE → só NS + modelo + datas, sem timer, sem badges
// ─────────────────────────────────────────────────────────────────────────────
function ReconCell({m, D, scale=1}){
  const dark   = D.dark;
  const run    = m.timer_status==="running";
  const paused = m.timer_status?.startsWith("paused");
  const idle   = !run && !paused;
  const elapsed = useLiveTimer(m);

  // Cards activos/pausados → layout dedicado (NS visível + timer menor)
  if(!idle){
    const recon  = m.recondicao||{};
    const rLabel = recon.prata?"PRATA":recon.bronze?"BRONZE":null;
    const modoCD   = getModoTimer(m);
    const isRCD    = modoCD === "countdown";
    const restRCD  = isRCD ? calcRestanteAoVivo(m, elapsed) : null;
    const estadoRCD= isRCD ? getEstadoCD(m, elapsed) : null;
    const displayRCD = isRCD && restRCD !== null ? restRCD : elapsed;
    const timerCol = isRCD
      ? (estadoRCD==="atraso"?"#EF4444":estadoRCD==="aviso"?"#F59E0B":"#22C55E")
      : run?"#22C55E":"#F59E0B";
    const accent   = "#a78bfa";
    const rgb      = "167,139,250";
    const topBorder= run?"#22C55E":"#F59E0B";
    const borderCol= run?"rgba(34,197,94,0.5)":"rgba(245,158,11,0.5)";
    return(
      <div style={{
        position:"relative",display:"flex",flexDirection:"column",
        padding:"8px 10px",
        background:dark?(run?"rgba(34,197,94,0.06)":"rgba(245,158,11,0.05)"):"#FFFFFF",
        border:dark?`1px solid ${borderCol}`:"1px solid rgba(13,13,15,0.07)",
        borderTop:`3px solid ${topBorder}`,
        overflow:"hidden",height:"100%",boxSizing:"border-box",
        clipPath:dark?"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))":"none",
        borderRadius:dark?0:"10px",
      }}>
        {/* sweep só quando running */}
        {run&&<div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,bottom:0,width:"60%",
            background:"linear-gradient(105deg,transparent 0%,rgba(255,45,120,0.08) 40%,rgba(255,45,120,0.18) 50%,rgba(255,45,120,0.08) 60%,transparent 100%)",
            animation:"cardSweep 2.8s cubic-bezier(0.4,0,0.6,1) infinite",filter:"blur(3px)"}}/>
        </div>}
        {/* topo: estado + RECON/PRATA + timer */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:4,zIndex:1,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:3}}>
            <span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,
              background:timerCol,
              boxShadow:`0 0 6px ${timerCol}`,
              animation:run?"blink 1.2s ease-in-out infinite":"none"}}/>
            <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:800,
              letterSpacing:"0.1em",padding:"1px 5px",
              color:run?"#22C55E":"#F59E0B",
              background:run?"rgba(34,197,94,0.12)":"rgba(245,158,11,0.12)",
              border:`1px solid ${run?"rgba(34,197,94,0.4)":"rgba(245,158,11,0.4)"}`,
              clipPath:dark?"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)":"none",
              borderRadius:dark?0:"999px"}}>
              {run?"RUN":"PAUSED"}
            </span>
            <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:700,
              letterSpacing:"0.08em",padding:"1px 5px",
              color:accent,background:`rgba(${rgb},0.12)`,
              border:`1px solid rgba(${rgb},0.4)`,
              clipPath:dark?"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)":"none",
              borderRadius:dark?0:"999px"}}>RECON</span>
            {rLabel&&<span style={{fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:700,
              letterSpacing:"0.08em",padding:"1px 5px",color:"#9b5cf6",
              background:"rgba(155,92,246,0.15)",border:"1px solid rgba(155,92,246,0.4)",
              clipPath:dark?"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)":"none",
              borderRadius:dark?0:"999px"}}>{rLabel}</span>}
          </div>
          {/* timer pequeno */}
          <span style={{fontFamily:"'Russo One',sans-serif",
            fontSize:`clamp(9px,${1.1*scale}vw,${Math.round(16*scale)}px)`,
            fontWeight:900,color:timerCol,letterSpacing:"0.04em",
            fontVariantNumeric:"tabular-nums",flexShrink:0,
            textShadow:dark?`0 0 10px ${timerCol}88`:"none"}}>
            {fmtHMS(displayRCD)}
            {isRCD&&estadoRCD==="atraso"&&<span style={{marginLeft:4,fontSize:"0.75em"}}>⚠</span>}
          </span>
        </div>
        {/* centro: NS + modelo */}
        <div style={{flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          zIndex:1,gap:2,padding:"4px 0",textAlign:"center",minHeight:0}}>
          <div style={{
            fontFamily:"'Russo One',sans-serif",
            fontSize:`clamp(${Math.round(11*scale)}px,${1.9*scale}vw,${Math.round(26*scale)}px)`,
            fontWeight:900,
            color:dark?"#f0f0f0":"#0D0D0F",
            letterSpacing:"0.06em",lineHeight:1.1,
            wordBreak:"break-all",textAlign:"center",maxWidth:"100%",
          }}>{m.serie||"—"}</div>
          <div style={{
            fontFamily:"'Exo 2',sans-serif",
            fontSize:`clamp(${Math.round(10*scale)}px,${1.2*scale}vw,${Math.round(17*scale)}px)`,
            fontWeight:700,color:dark?"rgba(200,200,200,0.80)":"#555",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",
          }}>{m.modelo||"—"}</div>
        </div>
      </div>
    );
  }

  // IDLE — card minimalista
  const recon   = m.recondicao||{};
  const rLabel  = recon.prata?"PRATA":recon.bronze?"BRONZE":recon.ouro?"OURO":recon.ferro?"FERRO":null;
  const accent  = "#9b5cf6"; // roxo recon
  const rgb     = "155,92,246";
  const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"}) : null;
  const tempoEst = getTempoReconAV(m);
  const tempoEstLbl = tempoEst>0 ? (() => {
    const h=Math.floor(tempoEst/3600), mn=Math.floor((tempoEst%3600)/60);
    return mn===0?`${h}h`:`${h}h${mn>0?` ${mn}m`:""}`;
  })() : null;

  return(
    <div style={{
      position:"relative",
      display:"flex",flexDirection:"column",
      padding:"8px 10px",
      background:dark?"rgba(155,92,246,0.06)":"#FFFFFF",
      border:`1px solid rgba(${rgb},0.25)`,
      borderTop:`2px solid rgba(${rgb},0.5)`,
      overflow:"hidden",
      height:"100%",
      boxSizing:"border-box",
      clipPath:dark?"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))":"none",
      borderRadius:dark?0:"10px",
    }}>
      {/* fundo subtil */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:`linear-gradient(135deg,rgba(${rgb},${dark?0.04:0.02}),transparent 60%)`}}/>

      {/* topo: badge RECON/PRATA + tempo estimado */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        zIndex:1,flexShrink:0,marginBottom:4}}>
        {/* badges esquerda */}
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{
            fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:800,
            letterSpacing:"0.12em",padding:"2px 7px",
            color:accent,background:`rgba(${rgb},0.12)`,
            border:`1px solid rgba(${rgb},0.35)`,
            clipPath:dark?"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)":"none",
            borderRadius:dark?0:"999px",
          }}>RECON</span>
          {rLabel&&<span style={{
            fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:800,
            letterSpacing:"0.1em",padding:"2px 6px",
            color:"#9b5cf6",background:"rgba(155,92,246,0.15)",
            border:"1px solid rgba(155,92,246,0.4)",
            clipPath:dark?"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)":"none",
            borderRadius:dark?0:"999px",
          }}>{rLabel}</span>}
        </div>
        {/* tempo estimado movido para junto do modelo no centro */}
      </div>

      {/* NS + modelo + tempo — tudo no centro */}
      <div style={{flex:1,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        zIndex:1,gap:2,textAlign:"center",minHeight:0}}>
        <div style={{
          fontFamily:"'Russo One',sans-serif",
          fontSize:`clamp(${Math.round(11*scale)}px,${2.0*scale}vw,${Math.round(28*scale)}px)`,
          fontWeight:900,
          color:dark?"rgba(220,200,255,0.95)":"#2D1B5E",
          letterSpacing:"0.05em",lineHeight:1.1,
          wordBreak:"break-all",
          textAlign:"center",
          maxWidth:"100%",
        }}>
          {m.serie||"—"}
        </div>
        {/* modelo + tempo estimado na mesma linha */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:5,flexWrap:"nowrap",maxWidth:"100%",overflow:"hidden",
        }}>
          <div style={{
            fontFamily:"'Exo 2',sans-serif",
            fontSize:`clamp(${Math.round(9*scale)}px,${1.1*scale}vw,${Math.round(16*scale)}px)`,
            fontWeight:700,
            color:dark?"rgba(200,180,240,0.75)":"#5B4A8A",
            letterSpacing:"0.03em",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
            flex:"0 1 auto",minWidth:0,
          }}>
            {m.modelo||"—"}
          </div>
          {tempoEstLbl&&(
            <span style={{
              fontFamily:"'Russo One',sans-serif",
              fontSize:`clamp(8px,${0.9*scale}vw,11px)`,
              fontWeight:900,
              color:"#F59E0B",
              background:"rgba(245,158,11,0.15)",
              border:"1px solid rgba(245,158,11,0.4)",
              padding:"1px 5px",
              borderRadius:"3px",
              flexShrink:0,
              whiteSpace:"nowrap",
              letterSpacing:"0.04em",
            }}>⏱{tempoEstLbl}</span>
          )}
        </div>
      </div>

      {/* bottom: datas */}
      {(m.previsao_inicio||m.previsao_fim)&&(
        <div style={{
          zIndex:1,flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:8,paddingTop:5,
          borderTop:`1px solid rgba(${rgb},0.12)`,
        }}>
          {m.previsao_inicio&&(
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"8px",
                color:"#4D9FFF",opacity:0.7,fontWeight:700}}>▶</span>
              <span style={{fontFamily:"'Russo One',sans-serif",
                fontSize:`clamp(${Math.round(8*scale)}px,${0.9*scale}vw,${Math.round(13*scale)}px)`,
                fontWeight:800,color:"#4D9FFF",letterSpacing:"0.05em",
                fontVariantNumeric:"tabular-nums"}}>
                {fmtDate(m.previsao_inicio)}
              </span>
            </div>
          )}
          {m.previsao_inicio&&m.previsao_fim&&(
            <span style={{color:dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.1)",fontSize:"12px"}}>·</span>
          )}
          {m.previsao_fim&&(
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"8px",
                color:"#22C55E",opacity:0.7,fontWeight:700}}>✓</span>
              <span style={{fontFamily:"'Russo One',sans-serif",
                fontSize:`clamp(${Math.round(8*scale)}px,${0.9*scale}vw,${Math.round(13*scale)}px)`,
                fontWeight:800,color:"#22C55E",letterSpacing:"0.05em",
                fontVariantNumeric:"tabular-nums"}}>
                {fmtDate(m.previsao_fim)}
              </span>
            </div>
          )}
          {!m.previsao_inicio&&!m.previsao_fim&&(
            <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"7px",
              color:dark?"rgba(155,92,246,0.35)":"rgba(155,92,246,0.3)",letterSpacing:"0.1em"}}>
              — SEM DATA —
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function BigBoard({items, D, isRecon=false}){
  const n = items.length;
  if(n===0) return null;

  // Colunas adaptativas
  const cols = n===1?2:n<=4?2:n<=6?3:n<=9?4:5;
  const rows = Math.ceil(n/cols);

  // Escala de fonte proporcional ao nº de itens
  const scale = n<=2?1.0:n<=4?0.88:n<=6?0.75:n<=9?0.62:n<=16?0.52:0.44;

  return(
    <div style={{
      display:"grid",
      gridTemplateColumns:`repeat(${cols},1fr)`,
      gridTemplateRows:`repeat(${rows}, 1fr)`,
      gap:isRecon?6:8,
      flex:1,
      minHeight:0,
      overflow:"hidden",
    }}>
      {items.map(m=>(
        isRecon
          ? <ReconCell key={m.id} m={m} D={D} scale={scale}/>
          : <BoardCell key={m.id} m={m} D={D} scale={scale}/>
      ))}
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
            <div key={key} style={{
              background:D.dark?D.card:"#FFFFFF",
              border:D.dark?`1.5px solid ${isToday?D.blue+"66":D.line}`:`1px solid ${isToday?"rgba(200,16,46,0.2)":"rgba(13,13,15,0.06)"}`,
              borderRadius:D.dark?"10px":"12px",
              overflow:"hidden",
              boxShadow:D.dark?"none":"0 1px 2px rgba(13,13,15,0.04), 0 4px 12px -4px rgba(13,13,15,0.06)"}}>
              {/* Header dia */}
              <div style={{padding:"7px 10px",
                background:isToday?(D.dark?`rgba(200,16,46,0.12)`:"rgba(200,16,46,0.06)"):(D.dark?D.sub+"33":"rgba(13,13,15,0.03)"),
                borderBottom:`1px solid ${isToday?(D.dark?"rgba(200,16,46,0.4)":"rgba(200,16,46,0.2)"):(D.dark?D.line:"rgba(13,13,15,0.06)")}`,
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"10px",fontWeight:900,
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
                          <div style={{fontFamily:"'Russo One',sans-serif",fontSize:"13px",fontWeight:900,color:D.green,textShadow:`0 0 8px rgba(34,197,94,0.5)`}}>{conDia.length}</div>
                          <div style={{fontFamily:"monospace",fontSize:"7px",color:`rgba(34,197,94,0.6)`,letterSpacing:"0.1em"}}>CONCLUÍDAS</div>
                        </div>
                      :<div style={{fontFamily:"monospace",fontSize:"9px",color:D.sub,textAlign:"center",paddingTop:"8px"}}>—</div>;
                  })()
                  :ms.map((m,i)=>(
                    <div key={i} style={{padding:"6px 8px",
                      background:D.dark?D.cardB:"rgba(255,255,255,0.7)",
                      border:D.dark?"none":"1px solid rgba(13,13,15,0.06)",
                      borderLeft:`3px solid ${m.prioridade?D.yellow:D.blue}`,
                      borderRadius:"5px",overflow:"hidden",
                      boxShadow:D.dark?"none":"0 1px 2px rgba(13,13,15,0.04)"}}>
                      {/* NS grande */}
                      <div style={{
                        fontFamily:"'Russo One',sans-serif",
                        fontSize:"11px",fontWeight:D.dark?900:600,
                        color:D.dark?D.blue:"#0D0D0F",
                        letterSpacing:D.dark?"0.05em":"-0.01em",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        textShadow:D.dark?`0 0 8px ${D.blue}44`:"none"}}>
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
                          <span style={{
                            fontFamily:"'Russo One',sans-serif",
                            fontSize:"8px",fontWeight:D.dark?700:600,
                            color:"#16A34A",
                            letterSpacing:D.dark?"0.06em":"0.02em",
                            fontVariantNumeric:"tabular-nums"}}>
                            {new Date(m.previsao_fim+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                          </span>
                        </div>
                      )}
                      {/* Tempo estimado no calendário */}
                      {Number(m.tempo_estimado_segundos)>0&&(()=>{
                        const est=Number(m.tempo_estimado_segundos);
                        const hh=Math.floor(est/3600); const mm=Math.floor((est%3600)/60);
                        const lbl=hh===0?`${mm}min`:mm===0?`${hh}h`:`${hh}h ${mm}min`;
                        const isExp=m.isExpress||m.tarefas?.some(t=>t.texto==="EXPRESS");
                        return(
                          <div style={{display:"flex",alignItems:"center",gap:3,marginTop:"3px"}}>
                            <span style={{fontFamily:"monospace",fontSize:"7px",fontWeight:700,
                              padding:"1px 5px",borderRadius:"3px",
                              background:isExp?"rgba(245,158,11,0.15)":"rgba(77,159,255,0.12)",
                              color:isExp?"#F59E0B":D.blue,
                              border:isExp?"1px solid rgba(245,158,11,0.35)":`1px solid ${D.blue}33`}}>
                              ⏱ {lbl}
                            </span>
                          </div>
                        );
                      })()}
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
                      <div style={{fontFamily:"'Russo One',sans-serif",fontSize:"12px",fontWeight:800,
                        color:D.blue,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.serie||"—"}
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"1px"}}>
                        {m.modelo}
                      </div>
                      {Number(m.tempo_estimado_segundos)>0&&(()=>{
                        const est=Number(m.tempo_estimado_segundos);
                        const hh=Math.floor(est/3600); const mm=Math.floor((est%3600)/60);
                        const lbl=hh===0?`${mm}min`:mm===0?`${hh}h`:`${hh}h ${mm}min`;
                        return(
                          <span style={{fontFamily:"monospace",fontSize:"7px",fontWeight:700,
                            padding:"1px 5px",borderRadius:"3px",marginTop:"3px",display:"inline-block",
                            background:"rgba(77,159,255,0.12)",color:D.blue,border:`1px solid ${D.blue}33`}}>
                            ⏱ {lbl}
                          </span>
                        );
                      })()}
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
                <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"10px",fontWeight:800,
                  letterSpacing:"0.1em",color:D.blue}}>SEMANAS SEGUINTES</span>
                <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"14px",fontWeight:900,color:D.blue}}>{futuras.length}</span>
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
                      padding:"12px 14px",display:"flex",alignItems:"center",gap:"12px",overflow:"hidden"}}>
                      {/* Data em destaque */}
                      <div style={{flexShrink:0,textAlign:"center",
                        background:`${D.blue}14`,border:`1px solid ${D.blue}33`,
                        borderRadius:"6px",padding:"5px 10px",minWidth:"72px"}}>
                        <div style={{fontFamily:"'Russo One',sans-serif",fontSize:"9px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.08em",textTransform:"uppercase"}}>
                          {dt.toLocaleDateString("pt-PT",{weekday:"short"})}
                        </div>
                        <div style={{fontFamily:"'Russo One',sans-serif",fontSize:"13px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.04em",marginTop:"1px"}}>
                          {dt.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                        </div>
                      </div>
                      {/* Info máquina */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Russo One',sans-serif",fontSize:"13px",fontWeight:800,
                          color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                          textShadow:`0 0 8px ${D.blue}33`}}>
                          {m.serie||"—"}
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"2px"}}>{m.modelo}</div>
                        {Number(m.tempo_estimado_segundos)>0&&(()=>{
                          const est=Number(m.tempo_estimado_segundos);
                          const hh=Math.floor(est/3600); const mm2=Math.floor((est%3600)/60);
                          const lbl=hh===0?`${mm2}min`:mm2===0?`${hh}h`:`${hh}h ${mm2}min`;
                          const isExp=m.isExpress||m.tarefas?.some(t=>t.texto==="EXPRESS");
                          return(
                            <span style={{fontFamily:"monospace",fontSize:"8px",fontWeight:700,
                              padding:"1px 6px",borderRadius:"3px",marginTop:"4px",display:"inline-block",
                              background:isExp?"rgba(245,158,11,0.15)":"rgba(77,159,255,0.12)",
                              color:isExp?"#F59E0B":D.blue,
                              border:isExp?"1px solid rgba(245,158,11,0.35)":`1px solid ${D.blue}33`}}>
                              ⏱ {lbl}
                            </span>
                          );
                        })()}
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
//  ROW ITEM — card centrado estilo BoardCell (NTS, Prioritárias, Concluídas)
// ─────────────────────────────────────────────────────────────────────────────
function RowItem({m, idx, D, forceCategory=null, showTimer=true, showDate=false}){
  const dark    = D.dark;
  const elapsed = useLiveTimer(m);
  const run     = m.timer_status==="running";
  const paused  = m.timer_status?.startsWith("paused");
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

  const modoTimerR  = getModoTimer(m);
  const isCDR       = modoTimerR === "countdown";
  const restanteCDR = isCDR ? calcRestanteAoVivo(m, elapsed) : null;
  const estadoCDR   = isCDR ? getEstadoCD(m, elapsed) : null;
  const displayTimeR= isCDR && restanteCDR !== null ? restanteCDR : elapsed;

  const timerCol= isCDR
    ? (estadoCDR==="atraso"?"#EF4444":estadoCDR==="aviso"?"#F59E0B":"#22C55E")
    : run?"#22C55E":paused?"#F59E0B":"#6b7280";

  const topBorder = run?"#22C55E":accent;
  const borderCol = run?"rgba(34,197,94,0.55)":`rgba(${rgb},${dark?0.4:0.5})`;
  const cardBg = dark
    ?(run
      ?`linear-gradient(160deg,rgba(34,197,94,0.08) 0%,rgba(${rgb},0.05) 50%,rgba(8,4,6,0.99) 100%)`
      :`linear-gradient(160deg,rgba(${rgb},0.10) 0%,rgba(8,4,6,0.99) 100%)`)
    :"#FFFFFF";

  const timerDisplay = isCon
    ? (m.timer_accumulated_seconds>=60 ? fmtHMS(m.timer_accumulated_seconds) : null)
    : showTimer ? fmtHMS(displayTimeR) : null;
  const timerFinalCol = isCon ? "#22C55E" : timerCol;

  return(
    <div style={{
      position:"relative",
      display:"flex",flexDirection:"column",
      padding:"10px 12px 10px",
      background:dark?cardBg:"#FFFFFF",
      border:dark?`1px solid ${borderCol}`:`1px solid rgba(13,13,15,0.07)`,
      borderTop:`3px solid ${topBorder}`,
      boxShadow:dark?(run?`0 0 18px rgba(34,197,94,0.18), 0 2px 8px rgba(0,0,0,0.7)`:`0 2px 6px rgba(0,0,0,0.5)`):`0 2px 10px rgba(0,0,0,0.07)`,
      overflow:"hidden",
      borderRadius:dark?0:"14px",
      clipPath:dark?"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))":"none",
      boxSizing:"border-box",
      minHeight:"130px",
    }}>
      {/* sweep running */}
      {run&&dark&&(
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,bottom:0,width:"60%",
            background:"linear-gradient(105deg,transparent 0%,rgba(255,45,120,0.08) 40%,rgba(255,45,120,0.18) 50%,rgba(255,45,120,0.08) 60%,transparent 100%)",
            animation:"cardSweep 2.8s cubic-bezier(0.4,0,0.6,1) infinite",filter:"blur(3px)"}}/>
        </div>
      )}

      {/* ── TOPO: badges esq + timer dir ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,zIndex:1,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"nowrap",minWidth:0,overflow:"hidden"}}>
          <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
            background:isCon?"#22C55E":run?"#22C55E":paused?"#F59E0B":accent,
            boxShadow:isCon?`0 0 8px #22C55E`:run?`0 0 8px #22C55E`:paused?`0 0 6px rgba(245,158,11,0.6)`:`0 0 6px rgba(${rgb},0.6)`,
            animation:run?"blink 1.2s ease-in-out infinite":"none"}}/>
          <span style={{
            fontFamily:"'Russo One',sans-serif",fontSize:"8px",fontWeight:800,letterSpacing:"0.12em",flexShrink:0,
            padding:"2px 7px",
            background:isCon?"rgba(34,197,94,0.12)":run?"rgba(34,197,94,0.12)":paused?"rgba(245,158,11,0.12)":`rgba(${rgb},0.12)`,
            border:`1px solid ${isCon?"rgba(34,197,94,0.4)":run?"rgba(34,197,94,0.4)":paused?"rgba(245,158,11,0.4)":`rgba(${rgb},0.4)`}`,
            clipPath:dark?"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)":"none",
            borderRadius:dark?0:"999px",
            color:isCon?"#22C55E":run?"#22C55E":paused?"#F59E0B":accent}}>
            {isCon?"DONE":run?"RUN":paused?"PAUSED":"IDLE"}
          </span>
          <span style={{
            fontFamily:"'Russo One',sans-serif",fontSize:"8px",fontWeight:700,letterSpacing:"0.08em",
            padding:"2px 7px",color:accent,background:`rgba(${rgb},0.12)`,
            border:`1px solid rgba(${rgb},0.4)`,
            clipPath:dark?"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)":"none",
            borderRadius:dark?0:"999px",textTransform:"uppercase",whiteSpace:"nowrap",flexShrink:0}}>
            {cat.label}
          </span>
          {rLabel&&<span style={{fontFamily:"'Russo One',sans-serif",fontSize:"8px",fontWeight:700,
            padding:"2px 6px",color:CAT.recon.accent,
            background:"rgba(155,92,246,0.15)",border:"1px solid rgba(155,92,246,0.4)",
            clipPath:dark?"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)":"none",
            borderRadius:dark?0:"999px",flexShrink:0}}>{rLabel}</span>}
          {m.prioridade&&catKey!=="prio"&&<span style={{fontFamily:"'Russo One',sans-serif",fontSize:"8px",fontWeight:700,
            padding:"2px 6px",color:CAT.prio.accent,
            background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",
            clipPath:dark?"polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)":"none",
            borderRadius:dark?0:"999px",flexShrink:0}}>⚑ PRIO</span>}
        </div>
        {/* Timer topo direito */}
        {timerDisplay&&(
          <div style={{fontFamily:"'Russo One',sans-serif",fontSize:"clamp(12px,1.6vw,22px)",
            fontWeight:900,flexShrink:0,color:timerFinalCol,letterSpacing:"0.06em",
            fontVariantNumeric:"tabular-nums",
            textShadow:dark?`0 0 14px ${timerFinalCol}99`:"none"}}>
            {timerDisplay}
            {isCDR&&estadoCDR==="atraso"&&<span style={{marginLeft:4,fontSize:"0.7em",animation:"blink 0.8s infinite"}}>⚠</span>}
          </div>
        )}
        {showDate&&(m.previsao_inicio||m.previsao_fim)&&!timerDisplay&&(
          <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0,alignItems:"flex-end"}}>
            {m.previsao_inicio&&(
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{fontFamily:"monospace",fontSize:"7px",color:"#4D9FFF",opacity:0.8}}>▶</span>
                <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"10px",fontWeight:800,
                  color:"#4D9FFF",letterSpacing:"0.06em",
                  textShadow:dark?"0 0 6px rgba(77,159,255,0.5)":"none",whiteSpace:"nowrap"}}>
                  {new Date(m.previsao_inicio+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                </span>
              </div>
            )}
            {m.previsao_fim&&(
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{fontFamily:"monospace",fontSize:"7px",color:"#22C55E",opacity:0.8}}>✓</span>
                <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"10px",fontWeight:800,
                  color:"#22C55E",letterSpacing:"0.06em",
                  textShadow:dark?"0 0 6px rgba(34,197,94,0.5)":"none",whiteSpace:"nowrap"}}>
                  {new Date(m.previsao_fim+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CENTRO: NS + Modelo centrados, flex:1 ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        zIndex:1,gap:4,padding:"6px 0",textAlign:"center",minHeight:0}}>
        {/* NS */}
        <div style={{
          fontFamily:"'Russo One',sans-serif",
          fontSize:"clamp(13px,1.8vw,26px)",fontWeight:900,
          color:dark?"#f5f5f5":"#0D0D0F",
          letterSpacing:"0.1em",lineHeight:1.1,
          textShadow:dark?`0 0 18px rgba(240,240,240,0.2), 0 0 36px rgba(${rgb},0.15)`:"none",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",
        }}>
          {m.serie||"—"}
        </div>
        {/* Modelo */}
        <div style={{
          fontFamily:dark?"'Exo 2',sans-serif":"'Exo 2',sans-serif",
          fontSize:"clamp(10px,1.1vw,15px)",fontWeight:dark?700:600,
          color:dark?"rgba(200,200,200,0.80)":"#555",
          letterSpacing:dark?"0.06em":"0.01em",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",
        }}>
          {m.modelo||"—"}
        </div>
        {/* Tags */}
        {tasks.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center",marginTop:2,overflow:"hidden",maxHeight:"32px"}}>
            {tasks.slice(0,5).map((t,j)=>(
              <span key={j} style={{
                fontFamily:"monospace",fontSize:"8px",padding:"1px 6px",
                background:t.concluida?`rgba(34,197,94,0.1)`:`rgba(${rgb},0.08)`,
                color:t.concluida?"#16a34a":accent,
                border:`1px solid ${t.concluida?"rgba(34,197,94,0.3)":`rgba(${rgb},0.3)`}`,
                textDecoration:t.concluida?"line-through":"none",
                clipPath:"polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)",
                fontWeight:600,whiteSpace:"nowrap",flexShrink:0,
              }}>{t.texto}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── BARRA progresso ── */}
      {tasks.length>0&&(
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"3px",
          background:`rgba(0,0,0,0.15)`}}>
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
      <div style={{width:D.dark?"2px":"2px",height:"12px",borderRadius:"2px",flexShrink:0,
        background:D.dark?`linear-gradient(180deg,${D.pink},${D.muted})`:"#C8102E",opacity:D.dark?1:0.6}}/>
      <span style={{
        fontFamily:D.dark?"'Exo 2',sans-serif":"'Exo 2',sans-serif",
        fontSize:"clamp(11px,0.82vw,13px)",fontWeight:700,
        letterSpacing:D.dark?"0.12em":"0.14em",
        color:D.dark?D.muted:"#8E8E93",textTransform:"uppercase"}}>
        {label}
      </span>
      <div style={{flex:1,height:"1px",background:D.dark?`linear-gradient(90deg,${D.muted}44,transparent)`:"rgba(13,13,15,0.07)"}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SlideHead({title,icon,color,pulse,count,D}){
  const dark = D.dark;
  const iconSize = "clamp(18px,1.6vw,26px)";
  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",gap:"14px",
      flexShrink:0,marginBottom:"14px",
      padding:dark?"6px 12px 6px 14px":"4px 0 10px 0",
      background:dark?`linear-gradient(90deg, ${color}14 0%, transparent 80%)`:"transparent",
      borderLeft:dark?`3px solid ${color}`:"none",
      borderBottom:dark?"none":`1px solid rgba(13,13,15,0.07)`,
      clipPath:dark?"polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)":"none",
    }}>
      {/* bracket esquerdo — dark only */}
      {dark&&<span style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:color,
        boxShadow:`0 0 12px ${color}cc`}}/>}

      <div style={{color,filter:dark?`drop-shadow(0 0 8px ${color})`:"none",display:"flex",alignItems:"center"}}>
        {React.cloneElement(icon,{size:undefined,style:{width:iconSize,height:iconSize}})}
      </div>

      <span style={{
        fontFamily:"'Russo One',sans-serif",
        fontSize:"clamp(18px,1.7vw,28px)",fontWeight:dark?900:700,
        letterSpacing:dark?"0.18em":"-0.03em",
        color:dark?"#e8e8e8":"#0D0D0F",
        textShadow:dark?`0 0 14px rgba(210,210,210,0.6), 0 0 4px ${color}aa`:"none",
        textTransform:"uppercase"}}>
        {title}
      </span>

      {count!==undefined&&(
        <div style={{display:"flex",alignItems:"baseline",gap:"6px",
          padding:dark?"3px 12px":"3px 10px",
          background:dark?`${color}1a`:"rgba(13,13,15,0.06)",
          border:dark?`1px solid ${color}55`:`1px solid rgba(13,13,15,0.10)`,
          clipPath:dark?"polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)":"none",
          borderRadius:dark?0:"8px"}}>
          <span style={{
            fontFamily:"'Russo One',sans-serif",
            fontSize:"clamp(9px,0.75vw,11px)",fontWeight:700,
            letterSpacing:dark?"0.18em":"0.02em",
            color:dark?`${color}cc`:"#5C5C61"}}>×</span>
          <span style={{
            fontFamily:"'Russo One',sans-serif",
            fontSize:"clamp(20px,1.9vw,30px)",fontWeight:dark?900:700,
            color:dark?color:"#0D0D0F",
            textShadow:dark?`0 0 12px ${color}88`:"none",
            letterSpacing:dark?"0.04em":"-0.04em",lineHeight:1,
            fontVariantNumeric:"tabular-nums"}}>
            {String(count).padStart(2,"0")}
          </span>
        </div>
      )}

      {pulse&&(
        <div style={{width:"10px",height:"10px",background:color,
          boxShadow:dark?`0 0 12px ${color}, 0 0 24px ${color}88`:"none",
          borderRadius:dark?0:"50%",
          clipPath:dark?"polygon(50% 0, 100% 50%, 50% 100%, 0 50%)":"none",
          animation:"blink 1s ease-in-out infinite"}}/>
      )}

      <div style={{flex:1,height:"1px",
        background:dark?`linear-gradient(90deg,${color}66,${color}11,transparent)`:"rgba(13,13,15,0.07)"}}/>

      {/* tick marks — dark only */}
      {dark&&(
        <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:"2px",height:i%2===0?"10px":"6px",
              background:`${color}${i===0?"":i===1?"aa":i===2?"77":"44"}`}}/>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({label,D}){
  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flex:1,
      flexDirection:"column",gap:"10px",
      color:D.dark?D.muted:"#8E8E93",
      fontFamily:"'Russo One',sans-serif",
      fontSize:"clamp(13px,1.1vw,17px)",fontWeight:600,
      letterSpacing:D.dark?"0.22em":"0.05em",
      textTransform:"uppercase"}}>
      <div style={{position:"relative",padding:"24px 40px",
        border:D.dark?`1px dashed ${D.muted}55`:"1px solid rgba(13,13,15,0.08)",
        borderRadius:D.dark?0:"14px",
        background:D.dark?"transparent":"rgba(255,255,255,0.6)",
        boxShadow:D.dark?"none":"0 2px 8px rgba(13,13,15,0.04)"}}>
        {D.dark&&<HudCorners color={D.muted} size={14} thickness={2} inset={-2} opacity={0.5} D={D}/>}
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

  const isDarkMode = D.dark;
  const barBg = b => {
    if (isDarkMode) {
      if (b.overrun)            return "linear-gradient(90deg,#c0c0c0,#c8102e)";
      if (b.isActive && b.run)  return "linear-gradient(90deg,#c8102e,#ff2240,#e0e0e0)";
      if (b.isActive)           return "linear-gradient(90deg,rgba(200,16,46,0.85),rgba(210,210,210,0.7))";
      if (b.isPrio)             return "linear-gradient(90deg,rgba(210,210,210,0.6),rgba(200,16,46,0.4))";
      return "rgba(210,210,210,0.18)";
    } else {
      if (b.overrun)            return "linear-gradient(90deg,#B08D2E,#C8102E)";
      if (b.isActive && b.run)  return "linear-gradient(90deg,#C8102E,#ff2240)";
      if (b.isActive)           return "linear-gradient(90deg,#C8102E,rgba(200,16,46,0.75))";
      if (b.isPrio)             return "linear-gradient(90deg,#B08D2E,rgba(176,141,46,0.6))";
      return "rgba(13,13,15,0.08)";
    }
  };
  const barBorder = b => {
    if (isDarkMode) {
      if (b.overrun)    return "1.5px solid rgba(220,220,220,0.9)";
      if (b.isActive)   return "1.5px solid rgba(210,210,210,0.7)";
      if (b.isPrio)     return "1.5px dashed rgba(210,210,210,0.6)";
      return "1px solid rgba(210,210,210,0.25)";
    } else {
      if (b.overrun)    return "1.5px solid rgba(200,16,46,0.7)";
      if (b.isActive)   return "1.5px solid rgba(200,16,46,0.5)";
      if (b.isPrio)     return "1.5px dashed rgba(176,141,46,0.6)";
      return "1px solid rgba(13,13,15,0.12)";
    }
  };
  const barShadow = b => {
    if (isDarkMode) {
      if (b.overrun)           return "0 2px 12px rgba(210,210,210,0.4)";
      if (b.isActive && b.run) return "0 2px 16px rgba(200,16,46,0.5),0 0 8px rgba(210,210,210,0.25)";
      if (b.isActive)          return "0 2px 8px rgba(200,16,46,0.3)";
      return "none";
    } else {
      if (b.isActive && b.run) return "0 1px 6px rgba(200,16,46,0.3)";
      if (b.isActive)          return "0 1px 4px rgba(200,16,46,0.2)";
      return "0 1px 2px rgba(13,13,15,0.06)";
    }
  };

  if (blocks.length === 0) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
        color:"rgba(180,180,180,0.5)",fontFamily:"'Russo One',sans-serif",fontSize:"11px",letterSpacing:"0.2em"}}>
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
        background:D.dark?"rgba(14,5,9,0.97)":"rgba(255,255,255,0.95)",
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
                fontFamily:"'Russo One',sans-serif",
                fontSize: isToday ? "11px" : "9px",
                fontWeight: isToday ? (D.dark?900:700) : 600,
                color: isToday ? (D.dark?"#e8e8e8":"#C8102E") : isWE ? (D.dark?"rgba(210,210,210,0.4)":"#B8B8BD") : (D.dark?"rgba(180,180,180,0.6)":"#8E8E93"),
                letterSpacing: D.dark?"0.04em":"0.01em",
                textShadow: isToday&&D.dark ? "0 0 10px rgba(220,220,220,0.8)" : "none",
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
                  background:D.dark?"linear-gradient(90deg,transparent,#ff2240,#e0e0e0,transparent)":"#C8102E",
                opacity:D.dark?1:0.6,
                }}/>
              )}
            </div>
          );
        })}
        {/* Linha de agora na régua */}
        {nowPct>=0 && nowPct<=100 && (
          <div style={{
            position:"absolute",top:0,bottom:0,left:nowPct+"%",
            width:"2px",background:D.dark?"linear-gradient(180deg,#ff2240,#d0d0d0)":"#C8102E",
            boxShadow:D.dark?"0 0 12px rgba(255,34,64,0.8),0 0 20px rgba(210,210,210,0.25)":"0 0 4px rgba(200,16,46,0.4)",
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
                    <span style={{
                      fontFamily:"'Russo One',sans-serif",
                      fontSize:"7px",fontWeight:D.dark?900:600,
                      color:overload?"#FCA5A5":warn?"#FCD34D":(D.dark?D.muted:"#8E8E93"),
                      letterSpacing:D.dark?"0.05em":"0.02em"}}>
                      {count}
                    </span>
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
              width:"2px",
              background:D.dark?"linear-gradient(180deg,#ff2240,#d0d0d0)":"#C8102E",
              boxShadow:D.dark?"0 0 10px rgba(255,34,64,0.6)":"0 0 4px rgba(200,16,46,0.3)",
              opacity:D.dark?1:0.7,
              zIndex:5}}/>
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
                {!isThin&&<span style={{
                  fontFamily:"'Russo One',sans-serif",
                  fontSize:"11px",fontWeight:D.dark?900:600,
                  color:"#fff",letterSpacing:D.dark?"0.06em":"-0.01em",
                  whiteSpace:"nowrap",flexShrink:0,
                  textShadow:"0 1px 5px rgba(0,0,0,0.7)",
                  fontVariantNumeric:"tabular-nums"}}>
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
                    <span style={{
                      fontFamily:"'Russo One',sans-serif",
                      fontSize:"10px",fontWeight:D.dark?900:600,
                      color:D.dark?"#e8e8e8":"#0D0D0F",
                      letterSpacing:D.dark?"0.05em":"-0.01em",
                      whiteSpace:"nowrap",
                      textShadow:D.dark?"0 0 8px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.8)":"none",
                      fontVariantNumeric:"tabular-nums"}}>
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
        <span style={{marginLeft:"auto",fontFamily:"'Russo One',sans-serif",fontSize:"8px",color:D.muted}}>
          {blocks.length} MÁQUINAS · {blocks.filter(b=>b.isActive).length} EM CURSO · {blocks.filter(b=>!b.isActive).length} FILA
        </span>
      </div>
    </div>
  );
}


// ── SLIDES list ───────────────────────────────────────────────────────────────
const SLIDES=[
  {id:"andamento",    label:"EM ANDAMENTO"},
  {id:"standby",      label:"STANDBY"},
  {id:"prioritarias", label:"PRIORITÁRIAS"},
  {id:"timeline",     label:"TIMELINE"},
  {id:"proximas",     label:"PRÓXIMAS"},
  {id:"nts",          label:"NTS"},
  {id:"recon",        label:"RECOND."},
  {id:"concluidas",   label:"CONCLUÍDAS"},
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
// ── Relógio para tela de almoço ──────────────────────────────────────────────
function AlmocoClock(){
  const [t,sT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>sT(new Date()),1000);return()=>clearInterval(id);},[]);
  const h=String(t.getHours()).padStart(2,"0");
  const m=String(t.getMinutes()).padStart(2,"0");
  const s=String(t.getSeconds()).padStart(2,"0");
  return(
    <div style={{
      fontFamily:"'Russo One',sans-serif",
      fontSize:"clamp(36px,6vw,72px)",fontWeight:900,
      color:"#FF2D78",letterSpacing:"0.12em",
      textShadow:"0 0 14px rgba(255,45,120,0.45)",
      fontVariantNumeric:"tabular-nums",
    }}>{h}:{m}:{s}</div>
  );
}

export default function AoVivo(){
  const [dark,sDark] = useState(()=>{ try{return localStorage.getItem("theme")!=="light";}catch{return true;} });
  const navigate = useNavigate();
  const [machines,sM] = useState([]);
  const [loading,sL]  = useState(true);
  const [slide,sSlide]= useState(0);
  const [prog,sProg]  = useState(0);
  const [paused,sPaused]=useState(false);

  // ── Tela de almoço ─────────────────────────────────────────────────────────
  const [isAlmoco, setIsAlmoco] = useState(()=>{
    const now=new Date(); const t=now.getHours()*60+now.getMinutes();
    return t>=12*60+30 && t<13*60+30;
  });
  useEffect(()=>{
    const check=()=>{
      const now=new Date(); const t=now.getHours()*60+now.getMinutes();
      setIsAlmoco(t>=12*60+30 && t<13*60+30);
    };
    const id=setInterval(check,15000); // verifica a cada 15s
    return()=>clearInterval(id);
  },[]);

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

  // Em Andamento: só timers a CORRER (running)
  const andamento    = machines.filter(m=>m.timer_status==="running"&&!m.timer_status?.startsWith("paused")&&!m.estado?.startsWith("concluida")&&m.estado!=="concluida");
  // Standby: timers PAUSADOS (paused) — fora de concluídas
  const standby      = machines.filter(m=>m.timer_status?.startsWith("paused")&&!m.estado?.startsWith("concluida")&&m.estado!=="concluida");

  // Motivos de pausa — mesma ordem do Watcher
  const PAUSA_COLS=[
    { key:"aguarda_pecas",   label:"Aguarda Peças",          color:"#F59E0B", emoji:"📦" },
    { key:"prioritaria",     label:"Pausa para Prioritária", color:"#EF4444", emoji:"🚨" },
    { key:"aguarda_decisao", label:"Aguarda Decisão",        color:"#8B5CF6", emoji:"⏳" },
    { key:"outros",          label:"Outros",                 color:"#6B7280", emoji:"💬" },
  ];
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
    standby:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",flex:1}}>
        <SlideHead title="STANDBY" icon={<Pause size={16}/>} color={D.yellow} D={D} count={standby.length}/>
        {standby.length===0
          ?<Empty label="Sem máquinas em pausa" D={D}/>
          :(()=>{
            // Sempre mostrar as 4 colunas fixas (mesmo que vazias)
            const colFmt=(hex)=>{
              const r=parseInt(hex.slice(1,3),16);const g=parseInt(hex.slice(3,5),16);const b=parseInt(hex.slice(5,7),16);
              return `${r},${g},${b}`;
            };
            const fmtAcc=(s)=>{const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);return h>0?`${h}h${String(m).padStart(2,"0")}m`:`${m}min`;};
            return(
              <div style={{flex:1,overflow:"hidden",display:"grid",
                gridTemplateColumns:"repeat(4,1fr)",
                gap:dark?"10px":"12px",padding:"8px 0"}}>
                {PAUSA_COLS.map(col=>{
                  const items=standby.filter(m=>(getPausaMotivo(m)||"outros")===col.key);
                  const rgb=colFmt(col.color);
                  return(
                    <div key={col.key} style={{display:"flex",flexDirection:"column",gap:"8px",overflow:"hidden",minHeight:0}}>
                      {/* ── Header da coluna ── */}
                      <div style={{display:"flex",alignItems:"center",gap:"8px",
                        padding:"8px 14px",flexShrink:0,
                        background:dark?`rgba(${rgb},0.07)`:`rgba(${rgb},0.05)`,
                        border:`1px solid rgba(${rgb},0.22)`,
                        borderBottom:`2px solid ${col.color}`,
                        borderRadius:dark?"4px 4px 0 0":"10px 10px 0 0"}}>
                        <span style={{fontSize:"15px",lineHeight:1}}>{col.emoji}</span>
                        <span style={{fontFamily:"'Russo One',sans-serif",
                          fontSize:"9px",fontWeight:800,color:col.color,
                          letterSpacing:dark?"0.12em":"0.06em",
                          textTransform:"uppercase",flex:1,lineHeight:1.2}}>{col.label}</span>
                        {/* contador */}
                        {items.length>0&&(
                          <span style={{fontFamily:"'Russo One',sans-serif",
                            fontSize:"16px",fontWeight:900,color:col.color,
                            lineHeight:1,textShadow:dark?`0 0 10px ${col.color}88`:"none"}}>
                            {items.length}
                          </span>
                        )}
                      </div>
                      {/* ── Lista de máquinas ── */}
                      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:"5px",padding:"0 2px"}}>
                        {items.length===0?(
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                            height:"60px",opacity:0.25}}>
                            <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"8px",
                              letterSpacing:"0.15em",color:col.color}}>—</span>
                          </div>
                        ):items.map((m,i)=>(
                          <RowItem key={m.id} m={m} idx={i} D={D} forceCategory={getMachineCategory(m)} showTimer={true}/>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        }
      </div>
    ),
    prioritarias:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="PRIORITÁRIAS" icon={<Flag size={16}/>} color={D.yellow} pulse D={D} count={prioritarias.length}/>
        {prioritarias.length===0?<Empty label="Sem prioritárias activas ✓" D={D}/>:(()=>{
          const n=prioritarias.length;
          const cols=n<=2?2:n<=4?2:n<=6?3:4;
          const rows=Math.ceil(n/cols);
          return(
            <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`,gap:8,flex:1,minHeight:0,overflow:"hidden"}}>
              {prioritarias.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} forceCategory="prio"/>)}
            </div>
          );
        })()}
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
        {ntsAnd.length+ntsAF.length===0?<Empty label="Sem máquinas NTS" D={D}/>:(()=>{
          const all=[...ntsAnd,...ntsAF];
          const n=all.length;
          const cols=n<=2?2:n<=4?2:n<=6?3:4;
          const rows=Math.ceil(n/cols);
          return(
            <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`,gap:8,flex:1,minHeight:0,overflow:"hidden"}}>
              {ntsAnd.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} forceCategory="nts" showDate={true}/>)}
              {ntsAF.map((m,i)=><RowItem key={m.id} m={m} idx={ntsAnd.length+i} D={D} forceCategory="nts" showTimer={false} showDate={true}/>)}
            </div>
          );
        })()}
      </div>
    ),
    recon:(()=>{
      const reconActive  = reconAnd.filter(m=>m.timer_status==="running"||m.timer_status?.startsWith("paused"));
      const reconWaiting = [...reconAnd.filter(m=>!m.timer_status||m.timer_status==="idle"||(!m.timer_status?.startsWith("paused")&&m.timer_status!=="running")),...reconAF];
      const nA=reconActive.length, nW=reconWaiting.length, nC=reconCon.length;
      const total=nA+nW+nC;

      // Colunas: baseadas no maior grupo (próximas) para uniformidade
      const colsA = nA<=2?3:nA<=4?4:nA<=6?5:6;
      const colsW = nW<=4?4:nW<=8?5:nW<=12?6:nW<=18?7:8;
      const colsC = nC<=4?4:nC<=8?5:nC<=12?6:nC<=18?7:8;

      // Escala: próximas e concluídas quase iguais, activas levemente maior
      const scaleW = nW<=6?0.80:nW<=10?0.70:nW<=15?0.60:0.52;
      const scaleC = scaleW * 1.0;   // mesmo tamanho que próximas
      const scaleA = scaleW * 1.25;  // levemente maior

      // Label centralizado grande
      const SectionLabel = ({emoji, text, count, color}) => (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:8,padding:"5px 0 4px",flexShrink:0,
        }}>
          {emoji&&<span style={{fontSize:"13px"}}>{emoji}</span>}
          <span style={{
            fontFamily:"'Russo One',sans-serif",
            fontSize:"clamp(11px,1.1vw,15px)",fontWeight:800,
            letterSpacing:"0.18em",color,textTransform:"uppercase",
          }}>{text}</span>
          <span style={{
            fontFamily:"'Russo One',sans-serif",
            fontSize:"clamp(11px,1.0vw,14px)",fontWeight:900,
            color,opacity:0.55,
          }}>· {count}</span>
        </div>
      );

      // Divider
      const Divider = ({color}) => (
        <div style={{height:"1px",flexShrink:0,
          background:color||( dark?"rgba(167,139,250,0.15)":"rgba(124,58,237,0.1)"),
          margin:"2px 6px"}}/>
      );

      return(
        <div style={{display:"flex",flexDirection:"column",height:"100%",gap:0,overflow:"hidden",flex:1}}>
          <SlideHead title="RECONDICIONAMENTO" icon={<Wrench size={16}/>} color={D.purple} D={D} count={nA+nW+nC}/>
          {total===0?<Empty label="Sem máquinas em recondicionamento" D={D}/>:(
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:4,minHeight:0,overflow:"hidden"}}>

              {/* ── EM ANDAMENTO — levemente maior, centrado ── */}
              {nA>0&&(
                <div style={{flexShrink:0}}>
                  <SectionLabel emoji="⚡" text="EM ANDAMENTO" count={nA}
                    color={dark?"rgba(34,197,94,0.9)":"#16a34a"}/>
                  <div style={{
                    display:"grid",
                    gridTemplateColumns:`repeat(${colsA},1fr)`,
                    justifyContent:"center",
                    gap:6,
                    /* EM ANDAMENTO — altura reduzida para dar espaço às PRÓXIMAS */
                    height:"clamp(70px,12vh,120px)",
                  }}>
                    {reconActive.map(m=><ReconCell key={m.id} m={m} D={D} scale={scaleA}/>)}
                  </div>
                </div>
              )}

              {nA>0&&(nW>0||nC>0)&&<Divider/>}

              {/* ── PRÓXIMAS — menores, flex 1 ── */}
              {nW>0&&(
                <div style={{flex:nC>0?2.8:1,display:"flex",flexDirection:"column",minHeight:0}}>
                  <SectionLabel emoji="⏳" text="PRÓXIMAS" count={nW}
                    color={dark?"rgba(167,139,250,0.85)":"#7c3aed"}/>
                  <div style={{
                    display:"grid",
                    gridTemplateColumns:`repeat(${colsW},1fr)`,
                    gridTemplateRows:`repeat(${Math.ceil(nW/colsW)},1fr)`,
                    gap:5,
                    flex:1,
                    minHeight:0,
                    overflow:"hidden",
                  }}>
                    {reconWaiting.map(m=><ReconCell key={m.id} m={m} D={D} scale={scaleW}/>)}
                  </div>
                </div>
              )}

              {nC>0&&<Divider color={dark?"rgba(34,197,94,0.15)":"rgba(22,163,74,0.1)"}/>}

              {/* ── CONCLUÍDAS — quase do mesmo tamanho que próximas, grid de cards ── */}
              {nC>0&&(
                <div style={{flex:nW>0?0.8:1,display:"flex",flexDirection:"column",minHeight:0}}>
                  <SectionLabel emoji="✓" text="CONCLUÍDAS — 30 DIAS" count={nC}
                    color={dark?"rgba(34,197,94,0.80)":"#16a34a"}/>
                  <div style={{
                    display:"grid",
                    gridTemplateColumns:`repeat(${colsC},1fr)`,
                    gridTemplateRows:`repeat(${Math.ceil(nC/colsC)},1fr)`,
                    gap:5,
                    flex:1,
                    minHeight:0,
                    overflow:"hidden",
                  }}>
                    {reconCon.map(m=>{
                      const rr=m.recondicao||{};
                      const rl=rr.prata?"PRATA":rr.bronze?"BRONZE":null;
                      const rgb="167,139,250";
                      return(
                        <div key={m.id} style={{
                          position:"relative",
                          display:"flex",flexDirection:"column",
                          alignItems:"center",justifyContent:"center",
                          padding:"6px 8px",gap:3,textAlign:"center",
                          background:dark?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.04)",
                          border:dark?"1px solid rgba(34,197,94,0.22)":"1px solid rgba(34,197,94,0.15)",
                          borderTop:"2px solid #22C55E",
                          borderRadius:dark?0:"8px",
                          clipPath:dark?"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))":"none",
                          overflow:"hidden",height:"100%",boxSizing:"border-box",
                        }}>
                          {/* ✓ badge */}
                          <div style={{position:"absolute",top:4,right:6,
                            fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:800,
                            color:"#22C55E",opacity:0.5}}>✓</div>
                          {rl&&<div style={{position:"absolute",top:4,left:6,
                            fontFamily:"'Russo One',sans-serif",fontSize:"6px",fontWeight:800,
                            padding:"1px 4px",color:"#9b5cf6",
                            background:"rgba(155,92,246,0.15)",border:"1px solid rgba(155,92,246,0.35)"}}>
                            {rl}
                          </div>}
                          <div style={{
                            fontFamily:"'Russo One',sans-serif",
                            fontSize:`clamp(${Math.round(10*scaleC)}px,${1.8*scaleC}vw,${Math.round(24*scaleC)}px)`,
                            fontWeight:900,
                            color:dark?"#a7f3d0":"#065f46",
                            letterSpacing:"0.05em",lineHeight:1.1,
                            wordBreak:"break-all",textAlign:"center",maxWidth:"100%",
                          }}>{m.serie||"—"}</div>
                          <div style={{
                            fontFamily:"'Exo 2',sans-serif",
                            fontSize:`clamp(${Math.round(9*scaleC)}px,${1.1*scaleC}vw,${Math.round(15*scaleC)}px)`,
                            fontWeight:700,
                            color:dark?"rgba(134,239,172,0.65)":"#16a34a",
                            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",
                          }}>{m.modelo||"—"}</div>
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
          <SlideHead title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={16}/>} color="#38BDF8" D={D} count={n}/>
          {n===0?<Empty label="Nenhuma conclusão esta semana ainda" D={D}/>:
            <div style={{
              display:"grid",
              gridTemplateColumns:`repeat(${cols},1fr)`,
              gridAutoRows:"minmax(0, 1fr)",
              gap:8,
              flex:1,
              minHeight:0,
              overflowY:"auto",
              overflowX:"hidden",
              paddingRight:2,
            }}>
              {sorted.map((m,i)=>{
                const dt=m.dataConclusao;
                const dateStr=dt?new Date(dt).toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
                const timeStr=dt?new Date(dt).toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"}):"";
                const recon=m.recondicao||{};
                const rLabel=recon.prata?"PRATA":recon.bronze?"BRONZE":null;
                const tasks=m.tarefas||[];
                return(
                  <div key={m.id} style={{
                    position:"relative",
                    display:"flex",flexDirection:"column",
                    padding:"8px 10px 8px",
                    background:D.dark
                      ?`linear-gradient(135deg,rgba(56,189,248,0.10) 0%,rgba(8,4,6,0.97) 100%)`
                      :`linear-gradient(135deg,rgba(56,189,248,0.08) 0%,rgba(255,255,255,0.97) 100%)`,
                    border:`1px solid rgba(56,189,248,0.30)`,
                    borderTop:`2px solid #38BDF8`,
                    boxShadow:D.dark?`0 0 14px rgba(56,189,248,0.14)`:`0 2px 8px rgba(56,189,248,0.10)`,
                    overflow:"hidden",
                    clipPath:"polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                  }}>
                    {/* nº de ordem */}
                    <div style={{position:"absolute",top:4,right:6,
                      fontFamily:"'Share Tech Mono',monospace",
                      fontSize:"8px",fontWeight:400,color:`rgba(56,189,248,0.35)`,letterSpacing:"0.1em"}}>
                      {String(i+1).padStart(2,"0")}
                    </div>
                    {/* série + modelo — protagonistas */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",padding:"4px 0 2px",textAlign:"center"}}>
                      <div style={{
                        fontFamily:"'Russo One',sans-serif",
                        fontWeight:400,
                        fontSize:"clamp(12px,1.3vw,18px)",
                        color:D.dark?"#e0f2fe":"#0D0D0F",
                        letterSpacing:"0.03em",lineHeight:1.1,
                        textShadow:D.dark?"0 0 16px rgba(56,189,248,0.25)":"none",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        maxWidth:"100%"}}>
                        {m.serie||"—"}
                      </div>
                      <div style={{
                        fontFamily:"'Exo 2',sans-serif",
                        fontWeight:400,fontSize:"clamp(8px,0.8vw,11px)",
                        letterSpacing:".22em",textTransform:"uppercase",
                        color:D.dark?"rgba(148,209,242,0.55)":"#555",
                        marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        maxWidth:"100%"}}>
                        {m.modelo||"—"}
                      </div>
                    </div>

                    {/* timer acumulado — destaque */}
                    {((m.timer_accumulated_seconds||0)>=MIN_TIMER_SECONDS)&&(
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                        gap:2,margin:"3px 0 2px"}}>
                        {/* timer LCD */}
                        <div style={{position:"relative",display:"inline-block"}}>
                          <div style={{
                            fontFamily:"'DSEG7','Share Tech Mono',monospace",fontWeight:400,
                            fontSize:"clamp(14px,1.4vw,20px)",letterSpacing:".04em",lineHeight:1,
                            color:D.dark?"rgba(56,189,248,0.12)":"rgba(0,0,0,0.07)",
                            position:"absolute",top:0,right:0,userSelect:"none",
                          }}>{"88:88:88"}</div>
                          <div style={{
                            fontFamily:"'DSEG7','Share Tech Mono',monospace",fontWeight:400,
                            fontSize:"clamp(14px,1.4vw,20px)",letterSpacing:".04em",lineHeight:1,
                            color:"#38BDF8",position:"relative",zIndex:1,
                            textShadow:D.dark?"0 0 10px rgba(56,189,248,0.7),0 0 20px rgba(56,189,248,0.35)":"none",
                          }}>
                            {fmtHMS(m.timer_accumulated_seconds)}
                          </div>
                        </div>
                        {/* meta abaixo do timer */}
                        {(()=>{
                          const meta_s = Number(m.tempo_estimado_segundos)||0;
                          if(meta_s<60) return null;
                          const fh2=s=>{const h=Math.floor(s/3600),mn=Math.floor((s%3600)/60);return mn===0?`${h}h`:`${h}h${String(mn).padStart(2,"0")}`;};
                          const diff = m.timer_accumulated_seconds - meta_s;
                          const overColor = diff>0?"#FB923C":"rgba(56,189,248,0.55)";
                          return (
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{
                                fontFamily:"'Exo 2',sans-serif",fontSize:"clamp(8px,0.7vw,10px)",
                                fontWeight:400,letterSpacing:".14em",
                                color:D.dark?"rgba(255,255,255,0.35)":"#aaa",
                              }}>META</span>
                              <span style={{
                                fontFamily:"'Share Tech Mono',monospace",
                                fontSize:"clamp(8px,0.75vw,11px)",fontWeight:400,
                                letterSpacing:".06em",color:overColor,
                              }}>
                                {fh2(meta_s)}{diff!==0&&<span style={{fontSize:"0.85em",marginLeft:2}}>{diff>0?`+${fh2(diff)}`:fh2(diff)}</span>}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* tarefas — lista centralizada com check ✓ */}
                    {(()=>{
                      const doneTasks = tasks.filter(t=>!["EXPRESS","VPS","IMPREVISTOS","⚡ IMPREVISTOS"].includes(t.texto?.trim()));
                      if(doneTasks.length===0) return null;
                      const show = doneTasks.slice(0,5);
                      const more = doneTasks.length - show.length;
                      return (
                        <div style={{display:"flex",flexDirection:"column",gap:"3px",
                          margin:"4px 0 2px",overflow:"hidden",alignItems:"center"}}>
                          {show.map((t,j)=>(
                            <div key={j} style={{display:"flex",alignItems:"center",gap:5,
                              maxWidth:"100%",overflow:"hidden"}}>
                              <span style={{
                                color:"#38BDF8",
                                fontSize:"clamp(9px,0.85vw,11px)",
                                flexShrink:0,lineHeight:1,
                              }}>✓</span>
                              <span style={{
                                fontFamily:"'Exo 2',sans-serif",
                                fontSize:"clamp(9px,0.85vw,12px)",
                                fontWeight:500,
                                letterSpacing:".04em",
                                color:D.dark?"rgba(148,209,242,0.85)":"#0369a1",
                                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                                textDecoration:"line-through",
                                textDecorationColor:"rgba(56,189,248,0.4)",
                              }}>
                                {t.texto}
                              </span>
                            </div>
                          ))}
                          {more>0&&(
                            <span style={{
                              fontFamily:"'Share Tech Mono',monospace",
                              fontSize:"9px",color:"rgba(56,189,248,0.40)",
                            }}>
                              +{more} tarefas
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* rodapé: badges + data conclusão */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      gap:4,marginTop:"auto",flexWrap:"nowrap",overflow:"hidden"}}>
                      <div style={{display:"flex",gap:3,alignItems:"center",overflow:"hidden"}}>
                        {rLabel&&<span style={{fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:600,
                          padding:"1px 4px",color:CAT.recon.accent,
                          background:`rgba(155,92,246,0.15)`,border:`1px solid rgba(155,92,246,0.35)`,
                          whiteSpace:"nowrap",flexShrink:0,borderRadius:2}}>{rLabel}</span>}
                        {m.prioridade&&<span style={{fontFamily:"'Russo One',sans-serif",fontSize:"7px",fontWeight:600,
                          padding:"1px 4px",color:"#F59E0B",
                          background:`rgba(245,158,11,0.15)`,border:`1px solid rgba(245,158,11,0.35)`,
                          whiteSpace:"nowrap",flexShrink:0,borderRadius:2}}>⚑</span>}
                      </div>
                      <div style={{
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:"8px",fontWeight:400,
                        color:D.dark?"rgba(56,189,248,0.55)":"#0284c7",
                        letterSpacing:"0.04em",flexShrink:0,whiteSpace:"nowrap"}}>
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
  const withTimer = totalCon.filter(m=>(m.timer_accumulated_seconds||0)>=MIN_TIMER_SECONDS);
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
    {l:"ANDAMENTO",   v:andamento.length,            c:D.green},
    {l:"STANDBY",     v:standby.length,              c:D.yellow},
    {l:"PRIORITÁRIAS",v:prioritarias.length,         c:D.yellow},
    {l:"TIMELINE",    v:machines.filter(m=>(m.estado?.startsWith("em-preparacao")||m.estado==="a-fazer")&&m.previsao_inicio).length, c:D.pink},
    {l:"PRÓXIMAS",    v:proximas.length,               c:D.muted },
    {l:"NTS",         v:ntsAnd.length+ntsAF.length,  c:D.pink  },
    {l:"RECON",       v:reconAnd.length+reconAF.length,c:D.purple},
    {l:"ESTA SEMANA", v:conSemana.length,             c:D.green },
    {l:"HOJE",        v:conHoje.length,               c:D.cyan  },
    {l:"MÉD.h/MÁQ",  v:avgH,                         c:D.silver},
    {l:"TOTAL 2026",  v:totalCon.length,              c:"#FF2D78"},
  ];


  const SHARED_STYLE = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Share+Tech+Mono&family=Orbitron:wght@600;700;800;900&display=swap');
      /* DSEG7 — timer LCD 7-segment */
      @font-face{font-family:'DSEG7';src:url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7Classic/DSEG7Classic-Regular.woff2') format('woff2');font-weight:400;}
      @font-face{font-family:'DSEG7';src:url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7Classic/DSEG7Classic-Bold.woff2') format('woff2');font-weight:700;}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
      @keyframes hudScan{0%{background-position:200% 0}100%{background-position:-200% 0}}
      @keyframes cardSweep{0%{left:-60%}100%{left:130%}}
      @keyframes hudPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.7}}
      @keyframes hudFadeIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes arcNeon{0%{stroke-dashoffset:0;opacity:1}50%{opacity:0.7}100%{stroke-dashoffset:0;opacity:1}}
      @keyframes neonDot{0%,100%{opacity:0;transform:rotate(0deg)}25%{opacity:1}75%{opacity:0.5}}
      @keyframes timerPulse{0%,100%{text-shadow:0 0 8px currentColor,0 0 16px currentColor}50%{text-shadow:0 0 4px currentColor}}
      @keyframes helmetPulse{0%,100%{box-shadow:0 0 10px #5cffff,0 0 20px #5cffff}50%{box-shadow:0 0 4px #5cffff}}
      @keyframes armorSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:rgba(210,210,210,0.04)}
      ::-webkit-scrollbar-thumb{background:rgba(210,210,210,0.2);border-radius:2px}
      *{box-sizing:border-box}
    `}</style>
  );
  // ── Tela de almoço 12:30–13:30 ──────────────────────────────────────────────
  if(isAlmoco) return(
    <div style={{
      position:"fixed",inset:0,
      background:"linear-gradient(135deg,#030803 0%,#061006 50%,#030803 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Russo One',sans-serif",gap:20,overflow:"hidden",
    }}>
      {SHARED_STYLE}
      {/* scanlines */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,45,120,0.012) 2px,rgba(255,45,120,0.012) 4px)",
        zIndex:0}}/>

      {/* Jordan — igual às outras páginas */}
      <div style={{position:"absolute",bottom:0,right:0,
        width:"clamp(220px,28vw,380px)",pointerEvents:"none",zIndex:2}}>
        <img src={JORDAN_URL} alt="Jordan" style={{
          position:"relative",width:"100%",
          objectFit:"contain",objectPosition:"bottom right",
          opacity:0.82,
          filter:`drop-shadow(0 0 24px #FF2D78cc) drop-shadow(0 0 8px #FF2D78aa) drop-shadow(0 0 4px rgba(255,255,255,0.2))`,
          display:"block",
        }}/>
      </div>

      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <div style={{fontSize:"clamp(56px,8vw,88px)",lineHeight:1,
          filter:"drop-shadow(0 0 12px rgba(255,45,120,0.3))"}}>
          🍽️
        </div>
        <div style={{
          fontSize:"clamp(24px,3.5vw,42px)",fontWeight:900,letterSpacing:"0.15em",
          color:"#FF2D78",textShadow:"0 0 12px rgba(255,45,120,0.5)",
          textTransform:"uppercase",
        }}>Horário de Almoço</div>
        <div style={{
          fontSize:"clamp(13px,1.8vw,22px)",fontWeight:700,letterSpacing:"0.25em",
          color:"rgba(255,45,120,0.55)",
        }}>12:30 — 13:30</div>
        <AlmocoClock/>
        <div style={{
          marginTop:8,padding:"10px 32px",
          border:"1px solid rgba(255,45,120,0.15)",borderRadius:8,
          fontSize:"clamp(9px,1vw,12px)",fontWeight:600,letterSpacing:"0.1em",
          color:"rgba(255,45,120,0.35)",textAlign:"center",lineHeight:1.8,
        }}>
          Todos os timers foram pausados automaticamente<br/>
          <span style={{color:"rgba(255,45,120,0.2)"}}>
            Os técnicos retomam manualmente às 13:30
          </span>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{width:"100vw",height:"100vh",background:D.dark?D.bg:`radial-gradient(1200px 600px at 85% -10%, rgba(200,16,46,0.04), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(176,141,46,0.04), transparent 60%), #F2F2F4`,color:D.text,
      display:"flex",flexDirection:"column",fontFamily:D.dark?"'Exo 2',sans-serif":"'Exo 2',sans-serif",
      overflow:"hidden",position:"fixed",top:0,left:0,inset:0}}>
      {/* ARMOR BACKGROUND — scanlines + hex grid + vignette */}
      {dark&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        background:`repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(200,16,46,0.018) 2px,rgba(200,16,46,0.018) 3px),radial-gradient(ellipse at 50% 100%,rgba(200,16,46,0.1),transparent 60%),radial-gradient(ellipse at 50% 0%,rgba(210,210,210,0.05),transparent 50%)`}}/>}
      {dark&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.35,
        backgroundImage:`linear-gradient(60deg,transparent 49%,rgba(210,210,210,0.015) 49%,rgba(210,210,210,0.015) 51%,transparent 51%),linear-gradient(-60deg,transparent 49%,rgba(210,210,210,0.015) 49%,rgba(210,210,210,0.015) 51%,transparent 51%)`,
        backgroundSize:"40px 70px"}}/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Share+Tech+Mono&family=Orbitron:wght@600;700;800;900&display=swap');
      /* DSEG7 — timer LCD 7-segment */
      @font-face{font-family:'DSEG7';src:url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7Classic/DSEG7Classic-Regular.woff2') format('woff2');font-weight:400;}
      @font-face{font-family:'DSEG7';src:url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7Classic/DSEG7Classic-Bold.woff2') format('woff2');font-weight:700;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes hudScan{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes cardSweep{0%{left:-60%}100%{left:130%}}
        @keyframes hudPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.7}}
        @keyframes hudFadeIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes helmetPulse{0%,100%{box-shadow:0 0 10px #5cffff,0 0 20px #5cffff}50%{box-shadow:0 0 4px #5cffff}}
        @keyframes armorSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:rgba(210,210,210,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(210,210,210,0.2);border-radius:2px}
        *{box-sizing:border-box}
      `}</style>

      {/* ── MICRO STRIP ── */}
      <div style={{display:"flex",alignItems:"center",gap:"10px",
        padding:"4px clamp(10px,1.2vw,18px)",
        background:D.dark?D.surface:"rgba(255,255,255,0.82)",
        borderBottom:`1px solid ${D.dark?D.hudLine:"rgba(13,13,15,0.07)"}`,
        flexShrink:0}}>

        {/* ESQUERDA: logo + WATCHER maior, puxado pro centro */}
        <img src="https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png"
          alt="" style={{width:"26px",height:"26px",objectFit:"contain",
          filter:D.dark?`drop-shadow(0 0 6px ${D.pink}aa)`:"none",flexShrink:0}}/>
        <span style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(13px,1.1vw,16px)",
          fontWeight:900,letterSpacing:"0.22em",color:D.dark?D.pink:"#0D0D0F",
          textShadow:D.dark?`0 0 10px ${D.pink}77`:"none"}}>WATCHER</span>

        {/* STILL OFICINA — entre WATCHER e LIVE */}
        <span style={{
          fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(9px,0.75vw,11px)",
          fontWeight:600,
          letterSpacing:"0.22em",
          color:D.dark?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.55)",
          marginRight:"auto",
          paddingLeft:"clamp(8px,1vw,16px)",
          borderLeft:`1px solid ${D.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,
          marginLeft:"clamp(8px,1vw,16px)",
        }}>STILL OFICINA</span>

        {/* CENTRO: LIVE + Relógio menor + nav */}
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {/* LIVE — à esquerda do relógio */}
          <div style={{display:"flex",alignItems:"center",gap:"4px",
            padding:"2px 7px",
            background:dark?`${D.green}1a`:"rgba(22,163,74,0.08)",
            border:dark?`1px solid ${D.green}55`:"1px solid rgba(22,163,74,0.18)",
            borderRadius:dark?0:"999px",
            clipPath:dark?"polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)":"none"}}>
            <div style={{width:"5px",height:"5px",background:D.green,
              clipPath:"polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
              animation:"blink 1.2s ease-in-out infinite"}}/>
            <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"8px",fontWeight:800,
              color:D.green,letterSpacing:"0.15em"}}>LIVE</span>
          </div>

          {/* Relógio — menor */}
          <div style={{transform:"scale(0.82)",transformOrigin:"center"}}>
            <Clock D={D}/>
          </div>

          {/* Nav prev/pause/next */}
          <div style={{display:"flex",gap:"2px"}}>
            <button onClick={prev} style={{background:D.dark?D.sub:"rgba(255,255,255,0.9)",
              border:`1px solid ${D.dark?D.line:"rgba(13,13,15,0.08)"}`,
              padding:"3px 6px",cursor:"pointer",color:D.text,display:"flex",
              borderRadius:D.dark?0:"8px",
              clipPath:D.dark?"polygon(3px 0, 100% 0, 100% 100%, 0 100%, 0 3px)":"none"}}>
              <ChevronLeft size={12}/>
            </button>
            <button onClick={()=>sPaused(p=>!p)} style={{
              background:paused?(dark?`${D.yellow}26`:"rgba(217,119,6,0.08)"):(dark?D.sub:"rgba(255,255,255,0.9)"),
              border:`1px solid ${paused?D.yellow:(dark?D.line:"rgba(13,13,15,0.08)")}`,
              padding:"3px 8px",cursor:"pointer",color:paused?D.yellow:D.text,
              display:"flex",alignItems:"center",gap:"4px",borderRadius:dark?0:"8px"}}>
              {paused?<Play size={10}/>:<Pause size={10}/>}
              <span style={{fontFamily:"'Russo One',sans-serif",fontSize:"9px",fontWeight:700,letterSpacing:"0.1em"}}>
                {paused?"RETOMAR":"PAUSAR"}
              </span>
            </button>
            <button onClick={next} style={{background:D.sub,border:`1px solid ${D.line}`,
              padding:"3px 6px",cursor:"pointer",color:D.text,display:"flex",
              borderRadius:D.dark?0:"8px",
              clipPath:D.dark?"polygon(0 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%)":"none"}}>
              <ChevronRight size={12}/>
            </button>
          </div>
        </div>

        {/* DIREITA: botão tema */}
        <button onClick={()=>{sDark(d=>!d);localStorage.setItem("theme",dark?"light":"dark");}}
          style={{background:dark?D.sub:"rgba(255,255,255,0.9)",
          border:`1px solid ${dark?D.line:"rgba(13,13,15,0.08)"}`,
          padding:"3px 6px",cursor:"pointer",color:D.text,display:"flex",borderRadius:dark?0:"8px",
          marginLeft:"auto"}}>
          {dark?<Sun size={11}/>:<Moon size={11}/>}
        </button>
      </div>
      {/* PROGRESS BAR */}
      <div style={{position:"relative",height:"2px",background:dark?"rgba(210,210,210,0.08)":"rgba(13,13,15,0.06)",flexShrink:0,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${prog*100}%`,
          background:dark?`linear-gradient(90deg,#c8102e,#ff2240,#c0c0c0,#e8e8e8)`:`linear-gradient(90deg,#C8102E,#B08D2E)`,
          boxShadow:dark?`0 0 8px rgba(255,34,64,0.7)`:"none",
          transition:"width 0.1s linear"}}/>
      </div>

      {/* KPI BAR */}
      <div style={{display:"flex",gap:D.dark?"1px":"0",
        background:D.dark?`linear-gradient(180deg, ${D.scanBg}, transparent)`:"rgba(255,255,255,0.6)",
        borderBottom:`1px solid ${D.dark?D.line:"rgba(13,13,15,0.06)"}`,
        flexShrink:0}}>
        {kpis.map((k,i)=>{
          const isActive = (i===0&&SLIDES[slide].id==="andamento") ||
                           (i===1&&SLIDES[slide].id==="standby") ||
                           (i===2&&SLIDES[slide].id==="prioritarias") ||
                           (i===3&&SLIDES[slide].id==="timeline") ||
                           (i===4&&SLIDES[slide].id==="proximas") ||
                           (i===5&&SLIDES[slide].id==="nts") ||
                           (i===6&&SLIDES[slide].id==="recon") ||
                           (i===7&&SLIDES[slide].id==="concluidas");
          return(
            <div key={k.l} style={{position:"relative",flex:1,
              background:isActive
                ?(dark?`linear-gradient(180deg, ${k.c}14, ${D.surface})`:`rgba(${k.c.replace("#","").match(/.{2}/g).map(h=>parseInt(h,16)).join(",")},0.04)`)
                :(dark?D.surface:"#FFFFFF"),
              padding:"clamp(7px,0.8vw,11px) clamp(6px,0.8vw,10px)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
              borderTop:isActive?`2px solid ${k.c}`:`2px solid transparent`,
              transition:"all 0.3s"}}>
              {/* tick lateral */}
              <div style={{position:"absolute",top:"50%",left:0,transform:"translateY(-50%)",
                width:"2px",height:"60%",background:k.c,opacity:0.25}}/>
              <div style={{
                fontFamily:"'Russo One',sans-serif",
                fontSize:"clamp(20px,1.95vw,32px)",fontWeight:700,
                color:isActive?k.c:(D.dark?k.c:"#0D0D0F"),
                textShadow:D.dark?(isActive?`0 0 14px ${k.c}aa`:`0 0 8px ${k.c}44`):"none",
                letterSpacing:D.dark?"0.04em":"-0.04em",lineHeight:1,
                fontVariantNumeric:"tabular-nums"}}>
                {loading?"··":String(k.v).padStart(2,"0")}
              </div>
              <div style={{
                fontFamily:D.dark?"'Exo 2',sans-serif":"'Exo 2',sans-serif",
                fontSize:"clamp(9px,0.72vw,11px)",fontWeight:D.dark?600:700,
                color:isActive?k.c:D.muted,
                letterSpacing:D.dark?"0.08em":"0.14em",textAlign:"center",
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
          fontFamily:"'Russo One',sans-serif",pointerEvents:"none"}}>
          <span style={{
            fontSize:"clamp(26px,2.4vw,38px)",fontWeight:900,
            color:D.dark?D.pink:"#C8102E",
            textShadow:D.dark?`0 0 14px ${D.pink}66`:"none",
            letterSpacing:D.dark?"0.04em":"-0.02em",lineHeight:1}}>
            {String(slide+1).padStart(2,"0")}
          </span>
          <span style={{fontSize:"clamp(11px,0.9vw,14px)",fontWeight:700,
            color:D.muted,letterSpacing:"0.18em"}}>
            / {String(SLIDES.length).padStart(2,"0")}
          </span>
        </div>

        {/* Jordan mascote */}
        <div style={{
          position:"absolute",bottom:0,right:0,
          width:"clamp(180px,22%,260px)",
          height:"clamp(180px,22vw,260px)",
          pointerEvents:"none",
          zIndex:0,
          display:"flex",alignItems:"flex-end",justifyContent:"flex-end",
        }}>
          {/* Reticle de targeting — dark only */}
          {dark&&(
            <div style={{position:"absolute",inset:"6%",pointerEvents:"none",opacity:0.35}}>
              <HudCorners color={D.pink} size={18} thickness={2} inset={0} opacity={0.85} D={D}/>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                width:"10px",height:"10px"}}>
                <div style={{position:"absolute",top:0,bottom:0,left:"50%",width:"1px",
                  background:D.pink,boxShadow:`0 0 6px ${D.pink}`}}/>
                <div style={{position:"absolute",left:0,right:0,top:"50%",height:"1px",
                  background:D.pink,boxShadow:`0 0 6px ${D.pink}`}}/>
              </div>
            </div>
          )}
          {/* Neon glow — dark only */}
          {dark&&(
            <div style={{
              position:"absolute",bottom:0,right:0,
              width:"100%",height:"100%",
              backgroundImage:`url(${JORDAN_URL})`,
              backgroundSize:"contain",backgroundRepeat:"no-repeat",
              backgroundPosition:"bottom right",
              filter:"blur(22px) brightness(1.2) saturate(3) hue-rotate(-10deg)",
              opacity:0.5,
            }}/>
          )}
          {/* Imagem principal */}
          <img src={JORDAN_URL} alt=""
            style={{
              position:"relative",width:"100%",
              objectFit:"contain",objectPosition:"bottom right",
              opacity:dark?0.82:0.45,
              filter:dark?`drop-shadow(0 0 24px ${D.pink}cc) drop-shadow(0 0 8px ${D.pink}aa) drop-shadow(0 0 4px rgba(255,255,255,0.2))`:"drop-shadow(0 2px 8px rgba(0,0,0,0.18)) contrast(1.05)",
              display:"block",
            }}/>
        </div>

        {loading
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
            position:"relative",zIndex:1,flexDirection:"column",gap:"14px"}}>
            <div style={{position:"relative",padding:"30px 60px",
              background:dark?"transparent":"rgba(255,255,255,0.8)",
              borderRadius:dark?0:"16px",
              border:dark?"none":"1px solid rgba(13,13,15,0.07)",
              boxShadow:dark?"none":"0 8px 32px -8px rgba(13,13,15,0.08)"}}>
              {dark&&<HudCorners color={D.pink} size={16} thickness={2} inset={0} opacity={0.9} D={D}/>}
              <span style={{
                fontFamily:"'Russo One',sans-serif",
                fontSize:"clamp(14px,1.1vw,18px)",fontWeight:dark?800:700,
                color:D.pink,letterSpacing:dark?"0.32em":"0.05em",
                textShadow:dark?`0 0 10px ${D.pink}77`:"none",
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


      </div>
    </div>
  );
}