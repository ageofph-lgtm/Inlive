import { useLiveTimer, getModoTimer, calcRestanteAoVivo, getMachineCategory, CAT, fmtHMS } from "../pages/AoVivo";

// Re-export shared utilities from the main file
// BoardCell — card compacto adaptável (usado em Em Andamento)
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

export default function BoardCell({m, D, forceCategory=null, scale=1, compact=false}){
  const dark     = D.dark;
  const elapsed  = useLiveTimer(m);
  const run      = m.timer_status==="running";
  const paused   = m.timer_status?.startsWith("paused");
  const allTasks = m.tarefas||[];
  const RESERVED = new Set(["EXPRESS","VPS","IMPREVISTOS","⚡ IMPREVISTOS"]);
  const realTasks = allTasks.filter(t=>!t.concluida && !RESERVED.has(t.texto?.trim?.()));
  const doneCount = allTasks.filter(t=>t.concluida && !RESERVED.has(t.texto?.trim?.())).length;
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

  const P  = s => `${Math.round(s*scale)}px`;
  const FS = s => `${Math.round(s*scale)}px`;
  const pad = Math.round(10*scale);

  const showDatas = scale>=0.55 && (m.previsao_inicio||m.dataEntrada||m.previsao_fim);
  const barH      = Math.max(3, Math.round(5*scale));
  const imp        = Array.isArray(m.imprevistos)?m.imprevistos:[];
  const totalImpH  = imp.reduce((s,iv)=>s+Number(iv.horas_extra||0),0);

  return(
    <div style={{
      position:"relative",
      display:"flex",flexDirection:"column",
      height:"100%",width:"100%",
      boxSizing:"border-box",
      overflow:"hidden",
      borderRadius:dark?0:"8px",
      background:dark
        ?`linear-gradient(160deg,color-mix(in srgb,${st} 9%,#0d0d10) 0%,#090909 45%)`
        :`linear-gradient(160deg,color-mix(in srgb,${st} 5%,#fff) 0%,#fff 45%)`,
      border:`1px solid color-mix(in srgb,${st} 25%,transparent)`,
      boxShadow:`0 0 0 1px rgba(0,0,0,.45),0 8px 32px -12px color-mix(in srgb,${st} 50%,transparent)`,
      animation:isLate?"pulseCard 1.4s ease-in-out infinite":"none",
      clipPath:dark?"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))":"none",
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,zIndex:3,
        background:`linear-gradient(90deg,${st},transparent 70%)`,boxShadow:`0 0 10px ${st}`}}/>
      <div style={{position:"absolute",top:8,bottom:8,left:0,width:3,zIndex:3,
        borderRadius:"0 3px 3px 0",background:tc,boxShadow:dark?`0 0 5px ${tc}44`:"none"}}/>
      {(isRisk||isLate)&&dark&&(<>
        <div style={{position:"absolute",top:4,right:4,width:8,height:8,zIndex:4,
          borderTop:`1.5px solid ${st}`,borderRight:`1.5px solid ${st}`,opacity:.65}}/>
        <div style={{position:"absolute",bottom:4,left:4,width:8,height:8,zIndex:4,
          borderBottom:`1.5px solid ${st}`,borderLeft:`1.5px solid ${st}`,opacity:.65}}/>
      </>)}

      {/* ROW 1: badges + timer */}
      <div style={{
        flexShrink:0,
        display:"flex",alignItems:"center",gap:Math.round(4*scale),
        padding:`${Math.round(8*scale)}px ${Math.round(14*scale)}px ${Math.round(6*scale)}px ${Math.round(16*scale)}px`,
        borderBottom:`1px solid ${dark?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)"}`,
        flexWrap:"wrap",overflow:"hidden",
      }}>
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
            const reason = m.timer_status?.replace?.(/^paused:?/i,"")?.replace(/_/g," ")?.trim?.();
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
        <div style={{marginLeft:"auto",textAlign:"right",flexShrink:0}}>
          <div style={{position:"relative",display:"inline-block"}}>
            <div style={{
              fontFamily:"'DSEG7','Share Tech Mono',monospace",
              fontWeight:400,
              fontSize:FS(scale>=0.88?22:scale>=0.75?18:14),
              letterSpacing:".04em",lineHeight:1,
              color:dark?`${st}18`:"rgba(0,0,0,0.07)",
              userSelect:"none",position:"absolute",top:0,right:0,
            }}>{"88:88:88"}</div>
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

      {/* ROW 2: NS plate */}
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
        {(()=>{
          const ns = m.serie||"—";
          const len = ns.length;
          const base = scale>=0.88?36:scale>=0.75?27:scale>=0.62?21:16;
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
        {/* Arc Reactor gauge */}
        {meta>0&&(()=>{
          const sz      = Math.round((scale>=0.88?60:scale>=0.75?50:scale>=0.62?42:34)*scale);
          const cx      = sz/2, cy = sz/2;
          const safePct = Math.min(pct, 100);
          const SEGS_OUT = 40;
          const rOut  = sz*0.44;
          const segW  = 3.2*scale, segH = Math.max(5, 7*scale);
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
                <text x={cx} y={cy}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Digital-7 V7','DSEG7','Share Tech Mono',monospace"
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

      {/* ROW 3: datas */}
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

      {/* RODAPÉ */}
      <div style={{
        flexShrink:0,
        display:"flex",flexDirection:"column",
        gap:Math.round(3*scale),
        padding:`${Math.round(5*scale)}px ${Math.round(12*scale)}px ${Math.round(7*scale)}px ${Math.round(14*scale)}px`,
        borderTop:`1px solid ${dark?"rgba(255,255,255,.04)":"rgba(0,0,0,.05)"}`,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:Math.round(5*scale),flexWrap:"wrap",overflow:"hidden"}}>
          <div style={{width:Math.round(7*scale),height:Math.round(7*scale),borderRadius:"50%",
            background:tc,boxShadow:dark?`0 0 5px ${tc}`:"none",flexShrink:0}}/>
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
          <span style={{marginLeft:"auto"}}/>
        </div>
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