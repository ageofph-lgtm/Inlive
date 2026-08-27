import { Q } from "@/components/quadro/quadroUtils";

export default function QuadroKpis({ kpis }) {
  return (
    <div style={{ display: "flex", flex: "none", borderBottom: `1px solid ${Q.line}` }}>
      {kpis.map((k, i) => (
        <div key={k.l} style={{
          flex: 1, minWidth: 0, padding: "10px 0 12px", display: "flex", flexDirection: "column",
          overflow: "hidden", ...(i > 0 ? { borderLeft: `1px solid ${Q.line}`, paddingLeft: 20 } : {}),
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: Q.mut, whiteSpace: "nowrap" }}>{k.l}</div>
          <div style={{ fontFamily: Q.serif, fontSize: 44, lineHeight: 0.92, letterSpacing: "-.02em", marginTop: 4, color: k.c }}>{k.n}</div>
        </div>
      ))}
    </div>
  );
}