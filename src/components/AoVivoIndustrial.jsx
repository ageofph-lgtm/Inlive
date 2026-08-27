import React, { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import { CSS_INDUSTRIAL } from "@/components/industrial/industrialStyles";
import BayCard from "@/components/industrial/BayCard";
import CorredorSidebar from "@/components/industrial/CorredorSidebar";

export default function AoVivoIndustrial({ loading, data, cycleTheme }){
  const { andamento, standby, prioritarias, proximas,
          ntsAnd, ntsAF, reconAnd, reconAF, conSemana, totalCon, avgH } = data;

  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(id); },[]);

  // Baías: activas (running) primeiro, depois pausadas
  const active = [...andamento, ...standby];
  const BAYS   = Math.max(8, Math.ceil(active.length/4)*4);
  const cols   = 4;
  const bays   = Array.from({length:BAYS}, (_,i)=>active[i]||null);

  // No prazo: % de máquinas com meta ainda dentro do tempo
  const withMeta = active.filter(m=>Number(m.tempo_estimado_segundos)>0);
  const onTime = withMeta.filter(m=>{
    const acc = Number(m.timer_accumulated_seconds)||0;
    const at  = m.timer_started_at ? new Date(m.timer_started_at).getTime() : null;
    const el  = m.timer_status==="running"&&at ? acc+Math.floor((Date.now()-at)/1000) : acc;
    return el <= Number(m.tempo_estimado_segundos);
  }).length;
  const noPrazo = withMeta.length ? Math.round(onTime/withMeta.length*100) : 100;

  const kpis = [
    { l:"Andamento",    v:String(andamento.length).padStart(2,"0") },
    { l:"Standby",      v:String(standby.length).padStart(2,"0") },
    { l:"Prioritárias", v:String(prioritarias.length).padStart(2,"0") },
    { l:"NTS",          v:String(ntsAnd.length+ntsAF.length).padStart(2,"0") },
    { l:"Recond.",      v:String(reconAnd.length+reconAF.length).padStart(2,"0") },
    { l:"Entregues 2026", v:String(totalCon.length), gold:true },
  ];

  return (
    <div className="ind-root">
      <style>{CSS_INDUSTRIAL}</style>
      <div className="ind-hazard"/>

      {/* HEADER */}
      <div className="ind-header">
        <div className="ind-logo"/>
        <div>
          <div className="ind-title">Oficina Still</div>
          <div className="ind-sub">Planta de Baías · Ao Vivo</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:18}}>
          <div className="ind-hstat">
            <div className="l">Ocupação</div>
            <div className="v">{active.length}/{BAYS}</div>
          </div>
          <div className="ind-hstat">
            <div className="l">No Prazo</div>
            <div className="v">{noPrazo}%</div>
          </div>
          <div className="ind-clock">
            {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}
          </div>
          <button className="ind-btn" onClick={cycleTheme} title="Mudar tema">
            <Layers size={13}/>
          </button>
        </div>
      </div>

      {/* BODY */}
      {loading ? (
        <div className="ind-body"><div className="ind-loading">A carregar</div></div>
      ) : (
        <div className="ind-body">
          <div className="ind-bays" style={{gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {bays.map((m,i)=><BayCard key={m?m.id:`free-${i}`} idx={i} m={m}/>)}
          </div>
          <CorredorSidebar proximas={proximas} conSemana={conSemana} avgH={avgH}/>
        </div>
      )}

      {/* FOOTER */}
      <div className="ind-footer">
        {kpis.map(k=>(
          <div className="ind-kpi" key={k.l}>
            <div className="l">{k.l}</div>
            <div className={`v ${k.gold?"gold":""}`}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="ind-hazard thin"/>
    </div>
  );
}