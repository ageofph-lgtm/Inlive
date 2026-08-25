import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  GANTT CHART — Timeline slide (extraído de AoVivo.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export default function GanttChart({ machines, D }) {
  const BACK = 1, AHEAD = 13;
  const today = new Date(); today.setHours(0,0,0,0);
  const startDay = new Date(today); startDay.setDate(startDay.getDate() - BACK);
  const endDay   = new Date(today); endDay.setDate(today.getDate() + AHEAD + 1);
  const totalMs  = endDay - startDay;
  const numDays  = Math.round(totalMs / 86400000);
  const pctRaw   = ms => ((ms - startDay.getTime()) / totalMs) * 100;
  const nowPct   = Math.max(0, Math.min(100, pctRaw(Date.now())));
  const ruleDays = Array.from({length: numDays + 1}, (_, i) => {
    const d = new Date(startDay); d.setDate(d.getDate() + i); return d;
  });

  const allRows = [];
  for (const m of machines) {
    const pi = m.previsao_inicio ? new Date(m.previsao_inicio) : null;
    const pf = m.previsao_fim    ? new Date(m.previsao_fim)    : null;
    const isActive = m.estado && m.estado.startsWith("em-preparacao");
    const isPrio   = m.prioridade === true;
    const run      = m.timer_status === "running";
    const overrun  = pi && pf ? new Date() > new Date(pf.getTime() + 86400000) : false;
    const isRecon  = m.tipo === "usada";
    allRows.push({ m, pi, pf, isActive, isPrio, run, overrun, isRecon, hasDate: !!(pi && pf) });
  }
  const sorted = [...allRows].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.hasDate && !b.hasDate) return -1;
    if (!a.hasDate && b.hasDate) return 1;
    if (a.hasDate && b.hasDate) return a.pi - b.pi;
    return 0;
  });

  const MAX_VISIBLE = 14;
  const rows = sorted.slice(0, MAX_VISIBLE);
  const FONT = "'Chakra Petch',sans-serif";
  const COL_W = 130;
  const ROW_H = 28;

  const barColor = b => {
    if (!b.hasDate) return null;
    if (b.overrun)            return { bg:"linear-gradient(90deg,#7f1d1d,#C8102E)", border:"rgba(239,68,68,0.7)", glow:"rgba(239,68,68,0.35)" };
    if (b.isActive && b.run)  return { bg:"linear-gradient(90deg,#C8102E,#ff4060,#ff6080)", border:"rgba(255,64,96,0.8)", glow:"rgba(200,16,46,0.5)" };
    if (b.isActive)           return { bg:"linear-gradient(90deg,#991B1B,#C8102E)", border:"rgba(200,16,46,0.6)", glow:"rgba(200,16,46,0.25)" };
    if (b.isPrio)             return { bg:D.dark?"rgba(120,80,20,0.55)":"rgba(176,141,46,0.4)", border:"rgba(245,158,11,0.5)", glow:"none" };
    if (b.isRecon)            return { bg:D.dark?"rgba(80,30,120,0.45)":"rgba(155,92,246,0.3)", border:"rgba(155,92,246,0.4)", glow:"none" };
    return { bg:D.dark?"rgba(255,255,255,0.07)":"rgba(13,13,15,0.08)", border:D.dark?"rgba(255,255,255,0.18)":"rgba(13,13,15,0.15)", glow:"none" };
  };

  if (rows.length === 0) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
        color:"rgba(180,180,180,0.4)",fontFamily:FONT,fontSize:"11px",letterSpacing:"0.2em"}}>
        SEM PREVISÕES DEFINIDAS · CONFIGURAR NO WATCHER
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden",gap:0}}>

      {/* ── HEADER: coluna vazia + régua de dias ── */}
      <div style={{display:"flex",flexShrink:0,height:38,
        borderBottom:`1px solid ${D.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,
        background:D.dark?"rgba(8,4,6,0.97)":"rgba(250,250,252,0.97)",
      }}>
        <div style={{width:COL_W,flexShrink:0,
          borderRight:`1px solid ${D.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`}}/>
        <div style={{flex:1,position:"relative",overflow:"hidden"}}>
          {ruleDays.map((d,i) => {
            const left    = (i / numDays) * 100;
            const isToday = d.toDateString() === today.toDateString();
            const isWE    = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={i} style={{
                position:"absolute",left:left+"%",width:(100/numDays)+"%",height:"100%",top:0,
                borderLeft:i>0?`1px solid ${D.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"}`:"none",
                background:isWE?(D.dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)"):"transparent",
              }}>
                <div style={{position:"absolute",top:"50%",left:"50%",
                  transform:"translate(-50%,-50%)",textAlign:"center",lineHeight:1.2}}>
                  <div style={{
                    fontFamily:FONT,fontWeight:isToday?700:500,
                    fontSize:isToday?"11px":"9px",
                    color:isToday?(D.dark?"#ffffff":"#C8102E")
                        :isWE?(D.dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.25)")
                        :(D.dark?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.45)"),
                    letterSpacing:"0.04em",
                    textShadow:isToday&&D.dark?"0 0 8px rgba(255,255,255,0.5)":"none",
                  }}>{d.toLocaleDateString("pt-PT",{day:"2-digit"})}</div>
                  <div style={{
                    fontFamily:FONT,fontSize:"7px",fontWeight:400,letterSpacing:"0.08em",
                    color:isToday?(D.dark?"rgba(255,100,100,0.9)":"#C8102E")
                        :(D.dark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.3)"),
                  }}>{d.toLocaleDateString("pt-PT",{month:"short"}).replace(".","").toUpperCase()}</div>
                </div>
              </div>
            );
          })}
          {nowPct>=0&&nowPct<=100&&(
            <div style={{position:"absolute",top:0,bottom:0,left:`calc(${nowPct}% - 1px)`,width:"2px",
              background:"#C8102E",
              boxShadow:D.dark?"0 0 8px rgba(200,16,46,0.8)":"0 0 4px rgba(200,16,46,0.5)",
              zIndex:10}}/>
          )}
        </div>
      </div>

      {/* ── LINHAS ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {rows.map((b, ri) => {
          const c      = barColor(b);
          const leftR  = b.hasDate?Math.max(0,Math.min(100,pctRaw(b.pi.getTime()))):null;
          const rightR = b.hasDate?Math.max(0,Math.min(100,pctRaw(b.pf.getTime()+86400000))):null;
          const wPct   = b.hasDate?Math.max(1.5,rightR-leftR):null;
          const isOdd  = ri%2===1;
          const fmtD   = d=>d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"});
          const nsColor= b.overrun ?(D.dark?"#FCA5A5":"#C8102E")
                       : b.isActive?(D.dark?"#ffffff":"#0D0D0F")
                       : b.isPrio  ?(D.dark?"#FCD34D":"#B08D2E")
                       : b.isRecon ?(D.dark?"#C4B5FD":"#7C3AED")
                       :             (D.dark?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.45)");
          return (
            <div key={b.m.id} style={{
              display:"flex",height:ROW_H+"px",flexShrink:0,
              borderBottom:`1px solid ${D.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}`,
              background:isOdd?(D.dark?"rgba(255,255,255,0.018)":"rgba(0,0,0,0.018)"):"transparent",
            }}>
              {/* coluna NS */}
              <div style={{width:COL_W,flexShrink:0,display:"flex",flexDirection:"column",
                justifyContent:"center",padding:"0 10px 0 8px",
                borderRight:`1px solid ${D.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)"}`,
                overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
                  {b.run&&<span style={{flexShrink:0,width:5,height:5,borderRadius:"50%",
                    background:"#22C55E",boxShadow:"0 0 6px #22C55E",
                    animation:"blink 1s ease-in-out infinite"}}/>}
                  {b.isPrio&&!b.run&&<span style={{flexShrink:0,fontSize:"8px",color:"#F59E0B"}}>⚑</span>}
                  <span style={{
                    fontFamily:FONT,fontWeight:b.isActive?700:500,
                    fontSize:"10px",letterSpacing:"0.04em",color:nsColor,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                    textShadow:b.isActive&&D.dark?`0 0 10px ${nsColor}55`:"none",
                  }}>{b.m.serie||"—"}</span>
                </div>
                <div style={{
                  fontFamily:FONT,fontSize:"7px",fontWeight:400,letterSpacing:"0.1em",
                  color:D.dark?"rgba(255,255,255,0.28)":"rgba(0,0,0,0.35)",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1,
                }}>{b.m.modelo||""}</div>
              </div>
              {/* área barras */}
              <div style={{flex:1,position:"relative",overflow:"hidden"}}>
                {ruleDays.map((d,i)=>{
                  const lft=(i/numDays)*100;
                  const isWE=d.getDay()===0||d.getDay()===6;
                  return(
                    <div key={"g"+i} style={{
                      position:"absolute",top:0,bottom:0,left:lft+"%",
                      width:(100/numDays)+"%",
                      borderLeft:i>0?`1px solid ${D.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"}`:"none",
                      background:isWE?(D.dark?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.015)"):"transparent",
                    }}/>
                  );
                })}
                {nowPct>=0&&nowPct<=100&&(
                  <div style={{position:"absolute",top:0,bottom:0,
                    left:`calc(${nowPct}% - 1px)`,width:"2px",
                    background:D.dark?"rgba(200,16,46,0.8)":"rgba(200,16,46,0.6)",
                    zIndex:5,pointerEvents:"none"}}/>
                )}
                {b.hasDate&&leftR!==null&&rightR>0&&leftR<100&&(
                  <div title={`${b.m.serie} · ${fmtD(b.pi)} → ${fmtD(b.pf)}`} style={{
                    position:"absolute",left:leftR+"%",width:wPct+"%",
                    top:"50%",transform:"translateY(-50%)",
                    height:"60%",background:c.bg,
                    border:`1px solid ${c.border}`,
                    boxShadow:c.glow!=="none"?`0 0 8px ${c.glow}`:"none",
                    borderRadius:"3px",display:"flex",alignItems:"center",
                    padding:"0 6px",overflow:"hidden",zIndex:2,minWidth:"4px",
                  }}>
                    {wPct>8&&(
                      <span style={{fontFamily:FONT,fontSize:"9px",fontWeight:700,
                        color:"#fff",letterSpacing:"0.05em",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>
                        {b.m.serie}
                      </span>
                    )}
                  </div>
                )}
                {!b.hasDate&&(
                  <div style={{
                    position:"absolute",top:"50%",transform:"translateY(-50%)",
                    left:4,right:4,height:"1px",
                    background:`repeating-linear-gradient(90deg,${D.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.1)"} 0,${D.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.1)"} 4px,transparent 4px,transparent 10px)`,
                  }}/>
                )}
              </div>
            </div>
          );
        })}
        {sorted.length>MAX_VISIBLE&&(
          <div style={{textAlign:"center",fontFamily:FONT,fontSize:"8px",letterSpacing:"0.12em",
            color:D.dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.3)",padding:"4px 0"}}>
            +{sorted.length-MAX_VISIBLE} MÁQUINAS NÃO VISÍVEIS
          </div>
        )}
      </div>

      {/* ── LEGENDA ── */}
      <div style={{display:"flex",gap:16,flexShrink:0,alignItems:"center",
        fontFamily:FONT,fontSize:"8px",letterSpacing:"0.1em",color:D.muted,
        paddingTop:5,borderTop:`1px solid ${D.line}`}}>
        {[
          {bg:"linear-gradient(90deg,#991B1B,#C8102E)",border:"rgba(200,16,46,0.6)",label:"EM CURSO"},
          {bg:D.dark?"rgba(255,255,255,0.07)":"rgba(13,13,15,0.08)",border:D.dark?"rgba(255,255,255,0.18)":"rgba(13,13,15,0.15)",label:"FILA"},
          {bg:"linear-gradient(90deg,#7f1d1d,#C8102E)",border:"rgba(239,68,68,0.7)",label:"ATRASADA"},
        ].map(lg=>(
          <span key={lg.label} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{display:"inline-block",width:14,height:7,borderRadius:2,
              background:lg.bg,border:`1px solid ${lg.border}`}}/>
            {lg.label}
          </span>
        ))}
        <span style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{display:"inline-block",width:2,height:12,background:"#C8102E",
            boxShadow:D.dark?"0 0 6px rgba(200,16,46,0.8)":"none"}}/>
          HOJE
        </span>
        <span style={{marginLeft:"auto",fontSize:"8px",color:D.muted}}>
          {sorted.filter(b=>b.hasDate).length} c/ DATA · {sorted.filter(b=>b.isActive).length} EM CURSO · {sorted.filter(b=>!b.hasDate).length} SEM DATA
        </span>
      </div>
    </div>
  );
}