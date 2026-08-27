import { Q, fmtHMS, tagOf } from "@/components/quadro/quadroUtils";

function Row({ r }) {
  const m = r.m;
  const c = r.over ? Q.red : r.rest !== null && r.rest < 3600 ? Q.amber : Q.ink;
  const prio = !!m.prioridade;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "118px 1fr 52px", gap: 12, alignItems: "center",
      flex: 1, minHeight: 0, padding: "0 2px", borderBottom: `1px solid ${Q.line2}`,
      background: r.over ? "#FDF2F0" : "transparent",
    }}>
      <span style={{ fontFamily: Q.mono, fontSize: 20, fontWeight: 600, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: c }}>
        {r.rest === null ? fmtHMS(r.e) : (r.over ? "+" : "") + fmtHMS(Math.abs(r.rest))}
      </span>
      <div style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontFamily: Q.mono, fontSize: 16, fontWeight: 500, whiteSpace: "nowrap" }}>{m.serie || "—"}</span>
        <span style={{ fontSize: 13.5, color: "#6E6860", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>{m.modelo || ""}</span>
        <span style={{
          flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", padding: "2px 6px",
          background: prio ? Q.amber : Q.line2, color: prio ? Q.bg : Q.gray,
        }}>{tagOf(m)}</span>
      </div>
      <span style={{ fontFamily: Q.mono, fontSize: 14, fontWeight: 600, color: Q.mut, textAlign: "right" }}>
        {r.meta > 0 ? Math.min(999, Math.round((r.e / r.meta) * 100)) + "%" : "—"}
      </span>
    </div>
  );
}

export default function QuadroAndamento({ live }) {
  const cols = [live.slice(0, 10), live.slice(10, 20)];
  const nCols = cols[1].length > 0 ? 2 : 1;
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flex: "none", marginBottom: 9 }}>
        <h2 style={{ fontFamily: Q.serif, fontSize: 32, lineHeight: 1, letterSpacing: "-.01em", fontWeight: 400 }}>Em andamento</h2>
        <span style={{ fontFamily: Q.mono, fontSize: 19, fontWeight: 600, color: Q.green }}>{String(live.length).padStart(2, "0")}</span>
        <span style={{ fontSize: 13, color: Q.mut, fontWeight: 500 }}>por ordem do tempo que falta · vermelho é atraso</span>
      </div>
      {live.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: Q.faint, fontSize: 15, borderTop: `1px solid ${Q.ink}` }}>
          Nenhuma máquina em produção
        </div>
      ) : (
        <div style={{ display: "flex", gap: 26, flex: 1, minHeight: 0 }}>
          {cols.slice(0, nCols).map((col, ci) => (
            <div key={ci} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "118px 1fr 52px", gap: 12, flex: "none", padding: "0 2px 6px",
                borderBottom: `1px solid ${Q.ink}`, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: Q.mut,
              }}>
                <div>Falta</div><div>Máquina</div><div style={{ textAlign: "right" }}>%</div>
              </div>
              {col.map(r => <Row key={r.m.id} r={r} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}