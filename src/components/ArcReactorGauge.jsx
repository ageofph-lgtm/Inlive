// Arc Reactor Gauge — segmentos circulares estilo Iron Man
// Cor azul #38BDF8 (concluídas), texto branco, efeito de brilho animado
export default function ArcReactorGauge({pct, isLate, asec, scale, dark}) {
  const sz = Math.round((scale>=0.88?60:scale>=0.75?50:scale>=0.62?42:34)*scale);
  const cx = sz/2, cy = sz/2;
  const safePct = Math.min(pct, 100);
  const SEGS_OUT = 40, SEGS_IN = 32;
  const rOut = sz*0.44, rIn = sz*0.33;
  const segW = 3.2*scale, segH = Math.max(5, 7*scale);
  const segW2 = 2*scale, segH2 = Math.max(3, 5*scale);
  const activeSeg = Math.round((safePct/100)*SEGS_OUT);
  const color = "#38BDF8";
  const dimColor = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{marginTop:Math.round(8*scale),position:"relative",zIndex:1,
      display:"flex",alignItems:"center",justifyContent:"center",
      animation:"gaugeGlow 2.5s ease-in-out infinite"}}>
      <style>{`@keyframes gaugeGlow{0%,100%{filter:drop-shadow(0 0 3px rgba(56,189,248,0.2))}50%{filter:drop-shadow(0 0 10px rgba(56,189,248,0.6)) drop-shadow(0 0 18px rgba(56,189,248,0.25))}}`}</style>
      <svg width={sz} height={sz} style={{overflow:"visible"}}>
        {Array.from({length:SEGS_OUT},(_,i)=>{
          const angle = (i/SEGS_OUT)*360 - 90;
          const rad = angle*(Math.PI/180);
          const x = cx + rOut*Math.cos(rad);
          const y = cy + rOut*Math.sin(rad);
          const isActive = i < activeSeg;
          const isEdge = i === activeSeg-1 && !isLate;
          return (
            <rect key={`o${i}`} x={-segW/2} y={-segH/2} width={segW} height={segH} rx={segW*0.3}
              fill={isActive ? color : dimColor}
              transform={`translate(${x},${y}) rotate(${angle+90})`}
              style={{
                filter: isEdge&&dark ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color}88)` :
                        isActive&&dark ? `drop-shadow(0 0 2px ${color}66)` : "none",
                transition:"fill .3s",
              }}/>
          );
        })}
        {Array.from({length:SEGS_IN},(_,i)=>{
          const angle = (i/SEGS_IN)*360 - 90;
          const rad = angle*(Math.PI/180);
          const x = cx + rIn*Math.cos(rad);
          const y = cy + rIn*Math.sin(rad);
          const active = (i/SEGS_IN) < safePct/100;
          return (
            <rect key={`i${i}`} x={-segW2/2} y={-segH2/2} width={segW2} height={segH2} rx={1}
              fill={active ? `${color}55` : dimColor}
              transform={`translate(${x},${y}) rotate(${angle+90})`}/>
          );
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fontFamily="'DSDigital','DSEG7','Share Tech Mono',monospace" fontWeight={400}
          fontSize={Math.round((scale>=0.75?12:9)*scale)}
          fill="#fff"
          style={{filter:dark?`drop-shadow(0 0 6px ${color})`:"none"}}>
          {isLate?`+${Math.round(asec/60)}m`:Math.round(safePct)+"%"}
        </text>
      </svg>
    </div>
  );
}