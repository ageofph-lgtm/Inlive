import React from "react";

export default function CorredorSidebar({ proximas, conSemana, avgH }){
  const todayStr = new Date().toISOString().slice(0,10);
  const rows = proximas.slice(0, 8);

  const fmtDia = d => {
    if(!d) return "—";
    if(d.slice(0,10)===todayStr) return "HOJE";
    return new Date(d+"T12:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"short"})
      .replace(".","").replace(" ","/").toUpperCase();
  };

  return (
    <div className="ind-side">
      <div className="ind-side-title">
        <span className="t">Corredor de Entrada</span>
        <span className="n">{String(proximas.length).padStart(2,"0")}</span>
      </div>
      <div className="ind-side-list">
        {rows.length===0 && (
          <div style={{margin:"auto",fontSize:11,letterSpacing:".3em",color:"rgba(20,20,20,.3)"}}>VAZIO</div>
        )}
        {rows.map(m=>{
          const dia = fmtDia(m.previsao_inicio);
          return (
            <div key={m.id} className="ind-side-row">
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
          <div style={{textAlign:"right",fontSize:10,color:"rgba(20,20,20,.4)",padding:"6px 8px"}}>
            +{proximas.length-rows.length} em fila
          </div>
        )}
      </div>
      <div className="ind-side-foot">
        <div>
          <div className="l">Concluídas · Sem.</div>
          <div className="v">{String(conSemana.length).padStart(2,"0")}</div>
        </div>
        <div>
          <div className="l">Média / Máquina</div>
          <div className="v">{avgH}h</div>
        </div>
      </div>
    </div>
  );
}