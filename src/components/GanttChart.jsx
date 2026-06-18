// ─────────────────────────────────────────────────────────────────────────────
//  GANTT CHART — slide Timeline (extraído de AoVivo.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export default function GanttChart({ machines, D }) {
  const BACK = 1, AHEAD = 13;
  const today = new Date(); today.setHours(0,0,0,0);
  const startDay = new Date(today); startDay.setDate(startDay.getDate() - BACK);
  const endDay   = new Date(today); endDay.setDate(today.getDate() + AHEAD + 1);
  const totalMs  = endDay - startDay;
  const numDays  = Math.round(totalMs / 86400000);

  const pctRaw = ms => ((ms - startDay.getTime()) / totalMs) * 100;
  const nowPct = Math.max(0, Math.min(100, pctRaw(Date.now())));

  const ruleDays = Array.from({length: numDays + 1}, (_, i) => {
    const d = new Date(startDay); d.setDate(d.getDate() + i); return d;
  });

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
  const blocks = rawBlocks.sort((a,b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.pi - b.pi;
  });

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

  const MAX_VISIBLE = 12;
  const visibleBlocks = blocks.slice(0, MAX_VISIBLE);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0,flex:1,overflow:"hidden"}}>

      {/* Régua de dias */}
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
        {nowPct>=0 && nowPct<=100 && (
          <div style={{
            position:"absolute",top:0,bottom:0,left:nowPct+"%",
            width:"2px",background:D.dark?"linear-gradient(180deg,#ff2240,#d0d0d0)":"#C8102E",
            boxShadow:D.dark?"0 0 12px rgba(255,34,64,0.8),0 0 20px rgba(210,210,210,0.25)":"0 0 4px rgba(200,16,46,0.4)",
            zIndex:10,pointerEvents:"none",
          }}/>
        )}
      </div>

      {/* Carga por dia */}
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

      {/* Barras */}
      <div style={{
        flex:1,overflow:"hidden",
        position:"relative",
        display:"flex",flexDirection:"column",
        gap:5,padding:"8px 0",
      }}>
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
          {nowPct>=0&&nowPct<=100&&(
            <div style={{position:"absolute",top:0,bottom:0,left:nowPct+"%",
              width:"2px",
              background:D.dark?"linear-gradient(180deg,#ff2240,#d0d0d0)":"#C8102E",
              boxShadow:D.dark?"0 0 10px rgba(255,34,64,0.6)":"0 0 4px rgba(200,16,46,0.3)",
              opacity:D.dark?1:0.7,
              zIndex:5}}/>
          )}
        </div>

        {visibleBlocks.map((b)=>{
          const leftRaw  = pctRaw(b.pi.getTime());
          const rightRaw = pctRaw(b.pf.getTime()+86400000);
          const leftC    = Math.max(0,Math.min(100,leftRaw));
          const rightC   = Math.max(0,Math.min(100,rightRaw));
          const width    = Math.max(1.5, rightC-leftC);
          if(rightC<=0||leftC>=100) return null;
          const fmtD = d=>d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"});
          const isThin = width < 8;
          const labelRight = rightC < 62;
          return(
            <div key={b.m.id} style={{
              position:"relative",height:"36px",flexShrink:0,zIndex:1,
            }}>
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
              {isThin&&(
                <div style={{
                  position:"absolute",
                  top:"50%",transform:"translateY(-50%)",
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

      {/* Legenda */}
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