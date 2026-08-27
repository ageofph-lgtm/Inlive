import React, { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import { CSS_INDUSTRIAL } from "@/components/industrial/industrialStyles";
import IndMachineCard from "@/components/industrial/IndMachineCard";
import CorredorSidebar from "@/components/industrial/CorredorSidebar";

function Sec({ label, count, tone="", note }){
  return (
    <div className={`ind-sec ${tone}`}>
      <span className="tab">{label}</span>
      <span className="cnt">{String(count).padStart(2,"0")}</span>
      <span className="rule"/>
      {note && <span className="note">{note}</span>}
    </div>
  );
}

function ListRow({ m, right, rightClass="" }){
  return (
    <div className="ind-row">
      <span className="arr">›</span>
      <div className="info">
        <div className="s">{m.serie||"—"}</div>
        <div className="m">{m.modelo||"—"}</div>
      </div>
      {m.prioridade && <span className="ind-chip prio">⚑</span>}
      <span className={`d ${rightClass}`}>{right}</span>
    </div>
  );
}

export default function AoVivoIndustrial({ loading, data, cycleTheme }){
  const { andamento, standby, prioritarias, proximas,
          ntsAnd, ntsAF, reconAnd, reconAF,
          conSemana, conHoje, totalCon, avgH } = data;

  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(id); },[]);

  // No prazo: % das máquinas activas com meta ainda dentro do tempo
  const active = [...andamento, ...standby];
  const withMeta = active.filter(m=>Number(m.tempo_estimado_segundos)>0);
  const onTime = withMeta.filter(m=>{
    const acc = Number(m.timer_accumulated_seconds)||0;
    const at  = m.timer_started_at ? new Date(m.timer_started_at).getTime() : null;
    const el  = m.timer_status==="running"&&at ? acc+Math.floor((Date.now()-at)/1000) : acc;
    return el <= Number(m.tempo_estimado_segundos);
  }).length;
  const noPrazo = withMeta.length ? Math.round(onTime/withMeta.length*100) : 100;

  const nts   = [...ntsAnd, ...ntsAF];
  const recon = [...reconAnd, ...reconAF];
  const fmtD  = d => d ? new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"}) : "—";
  const estadoLbl = m => m.estado?.startsWith("em-preparacao") ? "EM CURSO" : "FILA";
  const tierLbl = m => {
    const r=m.recondicao||{};
    return r.ouro?"OURO":r.prata?"PRATA":r.bronze?"BRONZE":r.ferro?"FERRO":"";
  };

  const colsA = Math.min(Math.max(andamento.length,1),3);
  const colsS = Math.min(Math.max(standby.length,1),4);

  const kpis = [
    { l:"Andamento",    v:String(andamento.length).padStart(2,"0"), cls:"green" },
    { l:"Standby",      v:String(standby.length).padStart(2,"0") },
    { l:"Prioritárias", v:String(prioritarias.length).padStart(2,"0") },
    { l:"NTS",          v:String(nts.length).padStart(2,"0") },
    { l:"Recond.",      v:String(recon.length).padStart(2,"0") },
    { l:"Semana",       v:String(conSemana.length).padStart(2,"0") },
    { l:"Entregues 2026", v:String(totalCon.length), cls:"gold" },
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
          <div className="ind-sub">Painel de Produção · Ao Vivo</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:18}}>
          <div className="ind-hstat">
            <div className="l">Em Curso</div>
            <div className="v">{andamento.length}</div>
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
          <div className="ind-main">

            {/* EM ANDAMENTO — timers reais a correr */}
            <div style={{flex:andamento.length?1.3:0.5,minHeight:0,display:"flex",flexDirection:"column",gap:6}}>
              <Sec label="Em Andamento" count={andamento.length} note="timers activos"/>
              {andamento.length===0
                ? <div className="ind-empty"><span>Nenhum timer activo</span></div>
                : <div style={{flex:1,minHeight:0,display:"grid",gap:10,
                    gridTemplateColumns:`repeat(${colsA},1fr)`,gridAutoRows:"1fr"}}>
                    {andamento.map(m=><IndMachineCard key={m.id} m={m} topLabel="Em produção"/>)}
                  </div>}
            </div>

            {/* STANDBY — motivos de pausa reais */}
            <div style={{flex:standby.length?1.1:0.4,minHeight:0,display:"flex",flexDirection:"column",gap:6}}>
              <Sec label="Standby" count={standby.length} tone="amber" note="motivos de pausa"/>
              {standby.length===0
                ? <div className="ind-empty"><span>Sem pausas</span></div>
                : <div style={{flex:1,minHeight:0,display:"grid",gap:10,
                    gridTemplateColumns:`repeat(${colsS},1fr)`,gridAutoRows:"1fr"}}>
                    {standby.map(m=><IndMachineCard key={m.id} m={m} topLabel="Pausada"/>)}
                  </div>}
            </div>

            {/* NTS + RECON — filas reais */}
            <div style={{flex:0.9,minHeight:0,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{minHeight:0,display:"flex",flexDirection:"column",gap:6,overflow:"hidden"}}>
                <Sec label="NTS" count={nts.length} tone="red"/>
                <div style={{flex:1,minHeight:0,overflow:"hidden"}}>
                  {nts.length===0
                    ? <div className="ind-empty" style={{height:"100%"}}><span>Vazio</span></div>
                    : nts.slice(0,4).map(m=>(
                        <ListRow key={m.id} m={m}
                          right={m.previsao_fim?fmtD(m.previsao_fim):estadoLbl(m)}
                          rightClass={m.estado?.startsWith("em-preparacao")?"ok":""}/>
                      ))}
                  {nts.length>4 && <div style={{textAlign:"right",fontSize:10,color:"rgba(20,20,20,.4)",padding:"4px 8px"}}>+{nts.length-4}</div>}
                </div>
              </div>
              <div style={{minHeight:0,display:"flex",flexDirection:"column",gap:6,overflow:"hidden"}}>
                <Sec label="Recondicionamento" count={recon.length}/>
                <div style={{flex:1,minHeight:0,overflow:"hidden"}}>
                  {recon.length===0
                    ? <div className="ind-empty" style={{height:"100%"}}><span>Vazio</span></div>
                    : recon.slice(0,4).map(m=>(
                        <ListRow key={m.id} m={m}
                          right={tierLbl(m)||estadoLbl(m)}
                          rightClass={m.estado?.startsWith("em-preparacao")?"ok":""}/>
                      ))}
                  {recon.length>4 && <div style={{textAlign:"right",fontSize:10,color:"rgba(20,20,20,.4)",padding:"4px 8px"}}>+{recon.length-4}</div>}
                </div>
              </div>
            </div>
          </div>

          <CorredorSidebar proximas={proximas} conSemana={conSemana} conHoje={conHoje} avgH={avgH}/>
        </div>
      )}

      {/* FOOTER */}
      <div className="ind-footer">
        {kpis.map(k=>(
          <div className="ind-kpi" key={k.l}>
            <div className="l">{k.l}</div>
            <div className={`v ${k.cls||""}`}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="ind-hazard thin"/>
    </div>
  );
}