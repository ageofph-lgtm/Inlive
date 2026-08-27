import { useState, useEffect } from "react";
import { Q, elapsedOf } from "@/components/quadro/quadroUtils";
import QuadroHeader from "@/components/quadro/QuadroHeader";
import QuadroKpis from "@/components/quadro/QuadroKpis";
import QuadroAndamento from "@/components/quadro/QuadroAndamento";
import QuadroConcluidas from "@/components/quadro/QuadroConcluidas";
import QuadroReconStrip from "@/components/quadro/QuadroReconStrip";
import QuadroTimeline from "@/components/quadro/QuadroTimeline";
import QuadroSmalls from "@/components/quadro/QuadroSmalls";
import QuadroAlmoco from "@/components/quadro/QuadroAlmoco";

// Tema Quadro — painel editorial papel/tinta 1920×1080 (escala para caber no ecrã)
export default function AoVivoQuadro({ loading, data, cycleTheme, isAlmoco }) {
  const [scale, setScale] = useState(1);
  const [, setTick] = useState(0);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => { window.removeEventListener("resize", fit); clearInterval(iv); };
  }, []);

  // linhas ao vivo — ordenadas pelo tempo que falta
  const live = (data.andamento || []).map(m => {
    const e = elapsedOf(m);
    const meta = Number(m.tempo_estimado_segundos) || 0;
    const rest = meta > 0 ? meta - e : null;
    return { m, e, meta, rest, over: rest !== null && rest < 0 };
  }).sort((a, b) => {
    if (a.rest === null && b.rest === null) return b.e - a.e;
    if (a.rest === null) return 1;
    if (b.rest === null) return -1;
    return a.rest - b.rest;
  });

  const nts = [...data.ntsAnd, ...data.ntsAF];
  const kpis = [
    { n: live.length, l: "Em andamento", c: Q.green },
    { n: live.filter(r => r.over).length, l: "Atrasadas", c: Q.red },
    { n: data.prioritarias.length, l: "Prioritárias", c: Q.amber },
    { n: nts.length, l: "NTS", c: "#7A2E0E" },
    { n: data.reconAnd.length + data.reconAF.length, l: "Recon", c: Q.pink },
    { n: data.conSemana.length, l: "Concl. semana", c: Q.blue },
    { n: data.totalCon.length, l: "Total 2026", c: Q.ink },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: Q.outer }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes ilPulse{50%{opacity:.3}}
      `}</style>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${scale})` }}>
        {isAlmoco ? (
          <QuadroAlmoco data={data} />
        ) : (
          <div style={{ width: 1920, height: 1080, overflow: "hidden", background: Q.bg, color: Q.ink, fontFamily: Q.sans, display: "flex", flexDirection: "column", padding: "26px 34px 22px" }}>
            <QuadroHeader cycleTheme={cycleTheme} />
            <QuadroKpis kpis={kpis} />
            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: Q.mono, fontSize: 16, color: Q.mut, letterSpacing: ".2em" }}>
                A CARREGAR…
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 34, flex: 1, minHeight: 0, paddingTop: 12 }}>
                  <QuadroAndamento live={live} />
                  <QuadroConcluidas conSemana={data.conSemana} totalCon={data.totalCon} />
                </div>
                <QuadroReconStrip
                  emCurso={data.reconAnd.length} fila={data.reconAF.length} con={data.reconCon.length}
                  all={[...data.reconAnd, ...data.reconAF]}
                />
                <div style={{ display: "flex", gap: 26, flex: "none", height: 196, paddingTop: 10 }}>
                  <QuadroTimeline machines={data.machines} />
                  <QuadroSmalls prioritarias={data.prioritarias} nts={nts} standby={data.standby} proximas={data.proximas} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}