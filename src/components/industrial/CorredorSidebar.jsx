import React from "react";

export default function CorredorSidebar({ proximas, conSemana, conHoje, avgH }){
  const todayStr = new Date().toISOString().slice(0,10);

  const fmtDia = d => {
    if(!d) return "—";
    if(String(d).slice(0,10)===todayStr) return "HOJE";
    return new Date(d).toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"});
  };

  const rows = proximas.slice(0, 7);
  const con  = [...conSemana]
    .sort((a,b)=>new Date(b.dataConclusao||0)-new Date(a.dataConclusao||0))
    .slice(0, 5);

  return (
    <div className="ind-side">
      {/* ── Próximas entradas (real: previsao_inicio) ── */}
      <div className="ind-side-title">
        <span className="t">Corredor de Entrada</span>
        <span className="n">{String(proximas.length).padStart(2,"0")}</span>
      </div>
      <div style={{flex:1.4,minHeight:0,overflow:"hidden",display:"flex",flexDirection:"column",marginTop:4}}>
        {rows.length===0 && (
          <div style={{margin:"auto",fontSize:11,letterSpacing:".3em",color:"rgba(20,20,20,.3)"}}>VAZIO</div>
        )}
        {rows.map(m=>{
          const dia = fmtDia(m.previsao_inicio);
          return (
            <div key={m.id} className="ind-row">
              <span className="arr">›</span>
              <div className="info">
                <div className="s">{m.serie||"—"}</div>
                <div className="m">{m.modelo||"—"}</div>
              </div>
              <span className={`d ${dia==="HOJE"?"hoje":""}`}>{dia}</span>
            </div>
          );
        })}
        {proximas.length>rows.length && (
          <div style={{textAlign:"right",fontSize:10,color:"rgba(20,20,20,.4)",padding:"5px 8px"}}>
            +{proximas.length-rows.length} em fila
          </div>
        )}
      </div>

      {/* ── Concluídas da semana (real: dataConclusao) ── */}
      <div className="ind-side-title" style={{marginTop:10}}>
        <span className="t">Concluídas · Semana</span>
        <span className="n">{String(conSemana.length).padStart(2,"0")}</span>
      </div>
      <div style={{flex:1,minHeight:0,overflow:"hidden",display:"flex",flexDirection:"column",marginTop:4}}>
        {con.length===0 && (
          <div style={{margin:"auto",fontSize:11,letterSpacing:".3em",color:"rgba(20,20,20,.3)"}}>—</div>
        )}
        {con.map(m=>(
          <div key={m.id} className="ind-row">
            <span className="arr" style={{color:"#1E7A46"}}>✓</span>
            <div className="info">
              <div className="s">{m.serie||"—"}</div>
              <div className="m">{m.modelo||"—"}</div>
            </div>
            <span className="d ok">{fmtDia(m.dataConclusao)}</span>
          </div>
        ))}
        {conSemana.length>con.length && (
          <div style={{textAlign:"right",fontSize:10,color:"rgba(20,20,20,.4)",padding:"5px 8px"}}>
            +{conSemana.length-con.length}
          </div>
        )}
      </div>

      <div className="ind-side-foot">
        <div>
          <div className="l">Hoje</div>
          <div className="v">{String(conHoje.length).padStart(2,"0")}</div>
        </div>
        <div>
          <div className="l">Média / Máquina</div>
          <div className="v">{avgH}h</div>
        </div>
      </div>
    </div>
  );
}