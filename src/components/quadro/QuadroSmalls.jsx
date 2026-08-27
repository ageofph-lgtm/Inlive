import { Q, TC, fmtHM, fmtDM, pad2, elapsedOf, pausaMotivo, PAUSA_COR } from "@/components/quadro/quadroUtils";

const MOTIVO_LBL = { aguarda_pecas: "Aguarda peças", prioritaria: "P/ prioritária", aguarda_decisao: "Aguarda decisão", outros: "Outros" };

function Panel({ title, n, c, items }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flex: "none", marginBottom: 6 }}>
        <h2 style={{ fontFamily: Q.serif, fontSize: 22, lineHeight: 1, whiteSpace: "nowrap", fontWeight: 400 }}>{title}</h2>
        <span style={{ fontFamily: Q.mono, fontSize: 15, fontWeight: 600, color: c }}>{pad2(n)}</span>
      </div>
      <div style={{ flex: "none", height: 1, background: Q.ink }} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {items.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", color: Q.faint, fontSize: 12 }}>—</div>
        )}
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minHeight: 0, borderBottom: `1px solid ${Q.line2}`, overflow: "hidden" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: it.dot, flex: "none" }} />
            <span style={{ fontFamily: Q.mono, fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", flex: "none" }}>{it.ns}</span>
            <span style={{ fontSize: 11.5, color: Q.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>{it.sub}</span>
            <span style={{ fontFamily: Q.mono, fontSize: 13, fontWeight: 600, flex: "none", whiteSpace: "nowrap", color: it.vc }}>{it.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuadroSmalls({ prioritarias, nts, standby, proximas }) {
  const dotOf = m => TC[m.tipo] || Q.gray;

  const pPrio = prioritarias.slice(0, 5).map(m => ({
    ns: m.serie || "—", sub: m.modelo || "", dot: dotOf(m), v: fmtDM(m.previsao_fim), vc: Q.amber,
  }));
  const pNts = nts.slice(0, 5).map(m => ({
    ns: m.serie || "—", sub: m.modelo || "", dot: Q.red, v: fmtDM(m.previsao_fim), vc: m.previsao_fim ? Q.ink : Q.faint,
  }));
  const pStb = standby.slice(0, 5).map(m => {
    const mo = pausaMotivo(m) || "outros";
    return { ns: m.serie || "—", sub: MOTIVO_LBL[mo] || mo, dot: PAUSA_COR[mo] || Q.gray, v: fmtHM(elapsedOf(m)), vc: Q.violet };
  });
  const pSeg = proximas.slice(0, 5).map(m => ({
    ns: m.serie || "—", sub: m.modelo || "", dot: dotOf(m), v: fmtDM(m.previsao_inicio), vc: Q.blue,
  }));

  return (
    <>
      <Panel title="Prioritárias" n={prioritarias.length} c={Q.amber} items={pPrio} />
      <Panel title="NTS" n={nts.length} c={Q.red} items={pNts} />
      <Panel title="Standby" n={standby.length} c={Q.violet} items={pStb} />
      <Panel title="A seguir" n={proximas.length} c={Q.blue} items={pSeg} />
    </>
  );
}