import { Q, fmtHMS } from "@/components/quadro/quadroUtils";
import QuadroHeader from "@/components/quadro/QuadroHeader";

export default function QuadroAlmoco({ data }) {
  const now = new Date();
  const endMs = new Date(now).setHours(13, 30, 0, 0);
  const retoma = fmtHMS(Math.max(0, Math.round((endMs - Date.now()) / 1000)));
  const pausadas = data.machines.filter(m => m.timer_status?.startsWith("paused") && !m.estado?.startsWith("concluida")).length;
  const todayStr = new Date().toDateString();
  const conHoje = data.conHoje?.length ?? data.conSemana.filter(m => m.dataConclusao && new Date(m.dataConclusao).toDateString() === todayStr).length;

  const stats = [
    { l: "Máquinas em pausa", n: pausadas, c: Q.amber },
    { l: "Concluídas hoje", n: conHoje, c: Q.blue },
    { l: "Concluídas esta semana", n: data.conSemana.length, c: Q.blue },
    { l: "Retomam às", n: "13:30", c: Q.ink },
  ];

  return (
    <div style={{ width: 1920, height: 1080, overflow: "hidden", background: Q.bg, color: Q.ink, fontFamily: Q.sans, display: "flex", flexDirection: "column", padding: "26px 34px 30px" }}>
      <QuadroHeader live={false} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 0 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".26em", textTransform: "uppercase", color: Q.amber }}>Paragem programada</div>
        <h1 style={{ fontFamily: Q.serif, fontSize: 186, lineHeight: 0.86, letterSpacing: "-.035em", fontWeight: 400, marginTop: 14 }}>Horário de almoço</h1>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 70, marginTop: 38, paddingTop: 26, borderTop: `2px solid ${Q.ink}`, width: "100%" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: Q.mut }}>Das — às</div>
            <div style={{ fontFamily: Q.mono, fontSize: 74, fontWeight: 500, lineHeight: 1, letterSpacing: "-.04em", marginTop: 10 }}>12:30 — 13:30</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: Q.mut }}>Retoma em</div>
            <div style={{ fontFamily: Q.mono, fontSize: 74, fontWeight: 500, lineHeight: 1, letterSpacing: "-.04em", marginTop: 10, fontVariantNumeric: "tabular-nums", color: Q.amber }}>{retoma}</div>
          </div>
          <div style={{ marginLeft: "auto", maxWidth: 430, paddingLeft: 34, borderLeft: `1px solid ${Q.line}` }}>
            <div style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 500 }}>Todos os timers foram pausados automaticamente</div>
            <div style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 500, color: Q.mut, marginTop: 8 }}>Os técnicos retomam manualmente às 13:30</div>
          </div>
        </div>
      </div>
      <div style={{ flex: "none", display: "flex", borderTop: `2px solid ${Q.ink}` }}>
        {stats.map((s, i) => (
          <div key={s.l} style={{
            flex: 1, minWidth: 0, padding: "14px 0 0", display: "flex", flexDirection: "column", overflow: "hidden",
            ...(i > 0 ? { borderLeft: `1px solid ${Q.line}`, paddingLeft: 22 } : {}),
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: Q.mut, whiteSpace: "nowrap" }}>{s.l}</div>
            <div style={{ fontFamily: Q.serif, fontSize: 52, lineHeight: 0.92, letterSpacing: "-.02em", marginTop: 4, color: s.c }}>{s.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}