import { Q, fmtHM } from "@/components/quadro/quadroUtils";

const MIN_TIMER = 300;

export default function QuadroConcluidas({ conSemana, totalCon }) {
  const sorted = [...conSemana].sort((a, b) => new Date(b.dataConclusao || 0) - new Date(a.dataConclusao || 0)).slice(0, 9);
  const todayStr = new Date().toDateString();
  const diaOf = m => {
    if (!m.dataConclusao) return "—";
    const d = new Date(m.dataConclusao);
    return d.toDateString() === todayStr ? "HOJE" : d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "").toUpperCase();
  };
  const tierOf = m => {
    const r = m.recondicao || {};
    return r.ouro ? "OURO" : r.prata ? "PRATA" : r.bronze ? "BRONZE" : r.ferro ? "FERRO" : "";
  };

  // No prazo — % das concluídas da semana dentro da meta
  const comMeta = conSemana.filter(m => Number(m.tempo_estimado_segundos) > 0 && (m.timer_accumulated_seconds || 0) >= MIN_TIMER);
  const noPrazo = comMeta.length > 0
    ? Math.round(comMeta.filter(m => m.timer_accumulated_seconds <= Number(m.tempo_estimado_segundos)).length / comMeta.length * 100)
    : null;

  // Média/dia — concluídas da semana / dias úteis decorridos
  const dow = new Date().getDay();
  const diasUteis = Math.min(Math.max(dow === 0 ? 5 : dow, 1), 5);
  const mediaDia = (conSemana.length / diasUteis).toFixed(1);

  // Últimos 14 dias
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toDateString();
    return totalCon.filter(m => m.dataConclusao && new Date(m.dataConclusao).toDateString() === key).length;
  });
  const dmax = Math.max(...daily, 1);

  return (
    <div style={{ width: 520, flex: "none", display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${Q.line}`, paddingLeft: 30 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flex: "none", marginBottom: 9 }}>
        <h2 style={{ fontFamily: Q.serif, fontSize: 32, lineHeight: 1, letterSpacing: "-.01em", fontWeight: 400 }}>Concluídas</h2>
        <span style={{ fontSize: 13, color: Q.mut, fontWeight: 500 }}>esta semana</span>
        <span style={{ marginLeft: "auto", fontFamily: Q.serif, fontSize: 46, lineHeight: 0.9, color: Q.blue }}>{String(conSemana.length).padStart(2, "0")}</span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 74px 52px", gap: 12, flex: "none", padding: "0 2px 6px",
        borderBottom: `1px solid ${Q.ink}`, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: Q.mut,
      }}>
        <div>Máquina</div><div style={{ textAlign: "right" }}>Tempo</div><div style={{ textAlign: "right" }}>Dia</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {sorted.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: Q.faint, fontSize: 14 }}>
            Nenhuma conclusão esta semana ainda
          </div>
        )}
        {sorted.map(m => {
          const tier = tierOf(m);
          return (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 74px 52px", gap: 12, alignItems: "center", flex: 1, minHeight: 0, borderBottom: `1px solid ${Q.line2}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 }}>
                <span style={{ color: Q.blue, fontSize: 14, flex: "none" }}>✓</span>
                <span style={{ fontFamily: Q.mono, fontSize: 16, fontWeight: 500, whiteSpace: "nowrap" }}>{m.serie || "—"}</span>
                <span style={{ fontSize: 13.5, color: "#6E6860", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>{m.modelo || ""}</span>
                {tier && <span style={{ flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", padding: "2px 6px", background: Q.line2, color: Q.gray }}>{tier}</span>}
              </div>
              <span style={{ fontFamily: Q.mono, fontSize: 15, fontWeight: 600, textAlign: "right" }}>
                {(m.timer_accumulated_seconds || 0) >= MIN_TIMER ? fmtHM(m.timer_accumulated_seconds) : "—"}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", color: Q.faint, textAlign: "right" }}>{diaOf(m)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ flex: "none", display: "flex", gap: 26, paddingTop: 11, marginTop: 8, borderTop: `2px solid ${Q.ink}` }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: Q.mut }}>No prazo</div>
          <div style={{ fontFamily: Q.serif, fontSize: 44, lineHeight: 0.9, color: Q.green, marginTop: 3 }}>
            {noPrazo === null ? "—" : <>{noPrazo}<span style={{ fontSize: ".4em", color: Q.faint }}>%</span></>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: Q.mut }}>Média / dia</div>
          <div style={{ fontFamily: Q.serif, fontSize: 44, lineHeight: 0.9, color: Q.blue, marginTop: 3 }}>{mediaDia}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: Q.mut }}>Últimos 14 dias</div>
          <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", gap: 4, height: 44 }}>
            {daily.map((v, i) => (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
                <i style={{
                  width: "100%", display: "block",
                  height: (v > 0 ? Math.max(v / dmax * 100, 6) : 3) + "%",
                  background: i === daily.length - 1 ? Q.blue : "#D3CEC4",
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}