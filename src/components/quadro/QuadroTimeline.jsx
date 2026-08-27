import { Q, TC, pad2 } from "@/components/quadro/quadroUtils";

export default function QuadroTimeline({ machines }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - 1);
  const spanMs = 15 * 86400000;

  const days = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    return { n: pad2(d.getDate()), now: d.toDateString() === today.toDateString() };
  });
  const todayPct = (Date.now() - start.getTime()) / spanMs * 100;

  const rows = machines
    .filter(m => m.previsao_inicio && m.previsao_fim && (m.estado?.startsWith("em-preparacao") || m.estado === "a-fazer"))
    .map(m => {
      const pi = new Date(m.previsao_inicio + (String(m.previsao_inicio).length === 10 ? "T00:00:00" : ""));
      const pf = new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T00:00:00" : ""));
      const a = Math.max(0, Math.min(100, (pi - start) / spanMs * 100));
      const b = Math.max(0, Math.min(100, (pf.getTime() + 86400000 - start.getTime()) / spanMs * 100));
      const run = m.estado?.startsWith("em-preparacao");
      const over = run && Date.now() > pf.getTime() + 86400000;
      return { m, a, b, st: over ? "over" : run ? "run" : "fila", pi };
    })
    .filter(r => r.b > 0 && r.a < 100)
    .sort((x, y) => (x.st === "fila") - (y.st === "fila") || x.pi - y.pi)
    .slice(0, 7);

  const barBg = { over: { background: Q.red, color: Q.bg }, run: { background: Q.green, color: Q.bg }, fila: { background: "#D6D1C8", color: "#4A453D" } };

  return (
    <div style={{ flex: 1.35, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flex: "none", marginBottom: 6 }}>
        <h2 style={{ fontFamily: Q.serif, fontSize: 22, lineHeight: 1, whiteSpace: "nowrap", fontWeight: 400 }}>Linha do tempo</h2>
        <span style={{ fontSize: 12.5, color: Q.mut, fontWeight: 500, whiteSpace: "nowrap" }}>próximos 14 dias</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: Q.mut }}>
          {[["Atrasado", Q.red], ["Em curso", Q.green], ["Fila", "#D6D1C8"]].map(([l, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <i style={{ width: 9, height: 9, background: c }} />{l}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "132px 1fr", flex: "none", paddingBottom: 5, borderBottom: `1px solid ${Q.ink}` }}>
        <div />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(15,1fr)", fontFamily: Q.mono, fontSize: 11, color: Q.faint }}>
          {days.map((d, i) => <b key={i} style={{ textAlign: "center", fontWeight: 600, color: d.now ? Q.red : undefined }}>{d.n}</b>)}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: Q.red, zIndex: 3, left: `calc(132px + ((100% - 132px)/100) * ${todayPct})` }} />
        {rows.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: Q.faint, fontSize: 12 }}>
            Sem previsões definidas
          </div>
        )}
        {rows.map(r => (
          <div key={r.m.id} style={{ display: "grid", gridTemplateColumns: "132px 1fr", alignItems: "center", flex: 1, minHeight: 0, borderBottom: `1px solid ${Q.line2}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 12, minWidth: 0, overflow: "hidden" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: TC[r.m.tipo] || Q.gray, flex: "none" }} />
              <span style={{ fontFamily: Q.mono, fontSize: 12.5, color: "#6E6860", whiteSpace: "nowrap" }}>{r.m.serie || "—"}</span>
            </div>
            <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
              <div style={{
                position: "absolute", top: "50%", transform: "translateY(-50%)", height: 17,
                display: "flex", alignItems: "center", padding: "0 8px",
                fontFamily: Q.mono, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden",
                left: r.a + "%", width: Math.max(r.b - r.a, 3) + "%", ...barBg[r.st],
              }}>{r.m.modelo || ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}