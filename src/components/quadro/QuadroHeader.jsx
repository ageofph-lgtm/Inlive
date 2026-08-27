import { Q, pad2 } from "@/components/quadro/quadroUtils";

export default function QuadroHeader({ live = true, cycleTheme }) {
  const now = new Date();
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flex: "none", paddingBottom: 11, borderBottom: `2px solid ${Q.ink}` }}>
      <img src="/watcher-logo.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", flex: "none", filter: "grayscale(1) brightness(.2)" }} />
      <div style={{ fontFamily: Q.serif, fontSize: 42, lineHeight: 0.9, letterSpacing: "-.02em", whiteSpace: "nowrap", cursor: cycleTheme ? "pointer" : "default" }}
        onClick={cycleTheme} title="Mudar tema">
        Oficina STILL
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: Q.mut, paddingBottom: 5, whiteSpace: "nowrap" }}>
        Painel de chão de fábrica
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingBottom: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: live ? Q.red : Q.amber, animation: live ? "ilPulse 2s infinite" : "none" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: Q.mut }}>
            {live ? "Ao vivo" : "Em pausa"}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: Q.mono, fontSize: 42, fontWeight: 500, lineHeight: 0.92, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>
            {pad2(now.getHours())}:{pad2(now.getMinutes())}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: Q.mut, marginTop: 5 }}>
            {now.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>
      </div>
    </div>
  );
}