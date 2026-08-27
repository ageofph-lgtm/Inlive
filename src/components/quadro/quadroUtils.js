// Tema Quadro — paleta e helpers (papel/tinta editorial)
export const Q = {
  bg: "#FAF8F4", outer: "#EFEBE3", ink: "#191713", mut: "#8A8478",
  line: "#DDD8CF", line2: "#EDE9E1", faint: "#A8A29A",
  red: "#B42318", amber: "#B54708", green: "#05603A", blue: "#175CD3",
  pink: "#A11157", violet: "#5925DC", gray: "#7A756B",
  serif: "'Instrument Serif',Georgia,serif",
  mono: "'IBM Plex Mono',monospace",
  sans: "'Inter',system-ui,sans-serif",
};

export const TC = { nova: Q.red, usada: Q.pink, aluguer: Q.blue, "servico-interno": Q.gray };

export const pad2 = n => String(n).padStart(2, "0");

export const fmtHMS = s => {
  const a = Math.abs(Math.round(s || 0));
  return `${pad2(Math.floor(a / 3600))}:${pad2(Math.floor((a % 3600) / 60))}:${pad2(a % 60)}`;
};

export const fmtHM = s => {
  const a = Math.abs(Math.round(s || 0));
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60);
  return h > 0 ? `${h}h${pad2(m)}` : `${m}m`;
};

export const fmtDM = v => {
  if (!v) return "—";
  const d = new Date(String(v).length === 10 ? v + "T12:00:00" : v);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

export function elapsedOf(m) {
  const acc = Number(m?.timer_accumulated_seconds) || 0;
  const at = m?.timer_started_at ? new Date(m.timer_started_at).getTime() : null;
  if (m?.timer_status === "running" && at) return acc + Math.floor((Date.now() - at) / 1000);
  return acc;
}

export const tagOf = m =>
  m.prioridade ? "PRIO"
  : m.tipo === "nova" ? "NTS"
  : m.tipo === "usada" ? "REC"
  : m.tipo === "servico-interno" ? "SI" : "ACP";

export const PAUSA_COR = {
  aguarda_pecas: Q.amber, prioritaria: Q.red,
  aguarda_decisao: Q.violet, outros: Q.gray,
};

export const pausaMotivo = m => {
  if (!m?.timer_status?.startsWith("paused")) return null;
  return m.timer_status.split(":")[1] || "outros";
};