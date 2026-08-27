import { Q } from "@/components/quadro/quadroUtils";

export default function QuadroReconStrip({ emCurso, fila, con, all }) {
  const total = emCurso + fila + con;
  const w = n => total > 0 ? (n / total * 100) + "%" : "33.33%";
  const tiers = ["ouro", "prata", "bronze", "ferro"].map(t => ({
    t, n: all.filter(m => m.recondicao?.[t]).length,
  })).filter(x => x.n > 0);
  const tierColor = { ouro: Q.amber, prata: "#6E6860", bronze: "#8A4B10", ferro: Q.faint };

  const seg = (n, label, bg, color, first) => n > 0 && (
    <div key={label} style={{
      width: w(n), background: bg, display: "flex", alignItems: "center", paddingLeft: 10,
      fontFamily: Q.mono, fontSize: 12, fontWeight: 600, color, overflow: "hidden", whiteSpace: "nowrap",
      borderLeft: first ? "none" : `1px solid ${Q.ink}`,
    }}>{n} {label}</div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flex: "none", marginTop: 11, padding: "8px 0", borderTop: `2px solid ${Q.ink}`, borderBottom: `1px solid ${Q.line}` }}>
      <h2 style={{ fontFamily: Q.serif, fontSize: 22, lineHeight: 1, flex: "none", whiteSpace: "nowrap", fontWeight: 400 }}>Recondicionamento</h2>
      <div style={{ display: "flex", flex: 1, height: 22, minWidth: 0, border: `1px solid ${Q.ink}` }}>
        {total === 0
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 10, fontFamily: Q.mono, fontSize: 12, color: Q.faint }}>sem máquinas</div>
          : <>
              {seg(emCurso, "em curso", Q.green, Q.bg, true)}
              {seg(fila, "em fila", "#F7E4EE", Q.pink, emCurso === 0)}
              {seg(con, "concluídas", "#E6EDFA", Q.blue, emCurso === 0 && fila === 0)}
            </>}
      </div>
      <div style={{ display: "flex", gap: 9, flex: "none" }}>
        {tiers.map(x => (
          <span key={x.t} style={{ fontFamily: Q.mono, fontSize: 11, fontWeight: 600, padding: "4px 9px", border: `1px solid ${Q.line}`, color: tierColor[x.t] }}>
            {x.t.toUpperCase()} {x.n}
          </span>
        ))}
      </div>
    </div>
  );
}