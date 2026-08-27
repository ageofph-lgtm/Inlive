import React, { useState, useEffect } from "react";

function calcNow(m){
  const acc = Number(m?.timer_accumulated_seconds)||0;
  const at  = m?.timer_started_at ? new Date(m.timer_started_at).getTime() : null;
  if(m?.timer_status==="running" && at) return acc + Math.floor((Date.now()-at)/1000);
  return acc;
}
const fmtHM = s => {
  const abs = Math.abs(Math.round(s));
  return `${s<0?"-":""}${Math.floor(abs/3600)}:${String(Math.floor((abs%3600)/60)).padStart(2,"0")}`;
};

export default function BayCard({ idx, m }){
  const [elapsed, setElapsed] = useState(()=>m?calcNow(m):0);
  useEffect(()=>{
    if(!m) return;
    setElapsed(calcNow(m));
    const id = setInterval(()=>setElapsed(calcNow(m)), 1000);
    return ()=>clearInterval(id);
  },[m?.id, m?.timer_status, m?.timer_started_at, m?.timer_accumulated_seconds]); // eslint-disable-line

  if(!m){
    return (
      <div className="ind-bay free">
        <span className="num">Baía {idx+1}</span>
        <span className="disp">Disponível</span>
      </div>
    );
  }

  const run    = m.timer_status==="running";
  const meta   = Number(m.tempo_estimado_segundos)||0;
  const rest   = meta>0 ? meta-elapsed : null;
  const late   = rest!==null && rest<0;
  const state  = late?"late":run?"run":"wait";
  const badge  = late?"Atrasada":run?"A trabalhar":"Em espera";
  const badgeBg= late?"#C8102E":run?"#1E7A46":"#8A7414";

  return (
    <div className={`ind-bay ${state}`}>
      <span className="num">Baía {idx+1}</span>
      <div className="serie">{m.serie||"—"}</div>
      <div className="modelo">{m.modelo||"—"}</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6,overflow:"hidden",maxHeight:22}}>
        {m.prioridade && <span className="ind-chip prio">⚑ Prio</span>}
        {m.tipo==="nova" && <span className="ind-chip">NTS</span>}
        {m.tipo==="usada" && <span className="ind-chip">Recon</span>}
        {meta>0 && <span className="ind-chip">meta {fmtHM(meta)}h</span>}
      </div>
      <div className="foot">
        <span className="timer">
          {run && <span className="ind-run-dot"/>}
          {fmtHM(rest!==null?rest:elapsed)}
        </span>
        <span className="ind-badge" style={{background:badgeBg}}>{badge}</span>
      </div>
    </div>
  );
}