import React from "react";
import { Flag } from "lucide-react";

function getMondayUTC(){ const n=new Date(),d=n.getUTCDay(),b=d===0?6:d-1,m=new Date(n); m.setUTCDate(n.getUTCDate()-b); m.setUTCHours(0,0,0,0); return m; }
function getFridayUTC(){ const f=new Date(getMondayUTC()); f.setUTCDate(f.getUTCDate()+4); f.setUTCHours(23,59,59,999); return f; }

// ─────────────────────────────────────────────────────────────────────────────
//  CALENDAR FILA — sem scroll, compacto, tudo visível (extraído de AoVivo.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export default function CalendarFila({items, D, concluidas=[]}){
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
                <span style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"10px",fontWeight:900,
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
                          <div style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"13px",fontWeight:900,color:D.green,textShadow:`0 0 8px rgba(34,197,94,0.5)`}}>{conDia.length}</div>
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
                        fontFamily:"'Chakra Petch',sans-serif",
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
                            fontFamily:"'Chakra Petch',sans-serif",
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
                      <div style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"12px",fontWeight:800,
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
                <span style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"10px",fontWeight:800,
                  letterSpacing:"0.1em",color:D.blue}}>SEMANAS SEGUINTES</span>
                <span style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"14px",fontWeight:900,color:D.blue}}>{futuras.length}</span>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${D.blue}44,transparent)`}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {futuras.map((m,i)=>{
                  const dt=new Date(m.previsao_inicio);
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
                        <div style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"9px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.08em",textTransform:"uppercase"}}>
                          {dt.toLocaleDateString("pt-PT",{weekday:"short"})}
                        </div>
                        <div style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"13px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.04em",marginTop:"1px"}}>
                          {dt.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                        </div>
                      </div>
                      {/* Info máquina */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:"13px",fontWeight:800,
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