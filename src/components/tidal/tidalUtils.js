// Helpers partilhados pelo tema Tidal Light. Só formatação/derivação — sem lógica de dados.
import { useEffect, useRef, useState } from "react";

export const BLUE = "#007AFF";
export const GREEN = "#22C55E";
export const RED = "#EF4444";
export const AMBER = "#F59E0B";
export const LAV = "#8B5CF6";
export const SLATE = "#64748B";

export const pad2 = (n) => String(n).padStart(2, "0");

export function fmtHMS(s) {
  if (s === null || s === undefined) return "00:00:00";
  const a = Math.abs(Math.round(s));
  return `${pad2(Math.floor(a / 3600))}:${pad2(Math.floor((a % 3600) / 60))}:${pad2(a % 60)}`;
}

export function fmtH(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h${pad2(m)}`;
}

export function fmtDateShort(v) {
  if (!v) return null;
  const d = new Date(String(v).length === 10 ? v + "T12:00:00" : v);
  if (isNaN(d)) return null;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export const TYPE = {
  acp: { key: "acp", label: "ACP", color: BLUE },
  nts: { key: "nts", label: "NTS", color: RED },
  recon: { key: "recon", label: "RECON", color: LAV },
  interno: { key: "interno", label: "INT.", color: SLATE },
};

export function machineType(m) {
  if (m?.tipo === "servico-interno") return TYPE.interno;
  if (m?.tipo === "nova") return TYPE.nts;
  if (m?.tipo === "usada") return TYPE.recon;
  return TYPE.acp;
}

export function tierRecon(m) {
  const r = m?.recondicao || {};
  return r.ouro ? "OURO" : r.prata ? "PRATA" : r.bronze ? "BRONZE" : r.ferro ? "FERRO" : null;
}

export const PAUSA_COLS = [
  { key: "aguarda_pecas", label: "Aguarda Peças", color: AMBER },
  { key: "prioritaria", label: "Pausa para Prioritária", color: RED },
  { key: "aguarda_decisao", label: "Aguarda Decisão", color: LAV },
  { key: "outros", label: "Outros", color: SLATE },
];

export function getPausaMotivo(m) {
  if (!m?.timer_status?.startsWith("paused")) return null;
  return m.timer_status.split(":")[1] || m.timer_status.replace(/^paused[-_]?/, "") || "outros";
}

// Timer ao vivo — replica o comportamento do Watcher (acumulado + delta desde o play).
export function useLiveTimer(m) {
  const ref = useRef(m);
  useEffect(() => { ref.current = m; });
  const calc = (mm) => {
    const acc = Number(mm?.timer_accumulated_seconds) || 0;
    const at = mm?.timer_started_at ? new Date(mm.timer_started_at).getTime() : null;
    if (mm?.timer_status === "running" && at) return acc + Math.floor((Date.now() - at) / 1000);
    return acc;
  };
  const [e, sE] = useState(() => calc(m));
  useEffect(() => {
    sE(calc(ref.current));
    if (m?.timer_status !== "running" || !m?.timer_started_at) return;
    const id = setInterval(() => sE(calc(ref.current)), 1000);
    return () => clearInterval(id);
  }, [m?.timer_status, m?.timer_started_at]); // eslint-disable-line
  return e;
}

// Estado derivado do countdown de uma máquina, usado pelos cards.
export function timerState(m, elapsed) {
  const meta = Number(m?.tempo_estimado_segundos) || 0;
  const restante = meta > 0 ? meta - elapsed : null;
  const over = restante !== null && restante < 0;
  const risk = !over && meta > 0 && restante / meta < 0.2;
  const run = m?.timer_status === "running";
  const paused = !!m?.timer_status?.startsWith("paused");
  const pct = meta > 0 ? Math.min((elapsed / meta) * 100, 100) : 0;
  const color = over ? RED : risk ? AMBER : run ? GREEN : paused ? AMBER : SLATE;
  return { meta, restante, over, risk, run, paused, pct, color };
}

export const RESERVED_TASKS = ["EXPRESS", "VPS", "IMPREVISTOS", "⚡ IMPREVISTOS"];

export function realTasks(m) {
  return (m?.tarefas || []).filter((t) => !RESERVED_TASKS.includes(t.texto?.trim()));
}

export function hasExpress(m) {
  return !!(m?.isExpress || (m?.tarefas || []).some((t) => t.texto?.trim() === "EXPRESS"));
}

export function hasVps(m) {
  return !!(m?.isVps || (m?.tarefas || []).some((t) => t.texto?.trim() === "VPS"));
}

export const TECH_COLORS = {
  raphael: "#D97706", nuno: "#7C3AED", rogerio: "#EA580C", yano: "#0891B2", patrick: "#16A34A",
};

export function techOf(m) {
  const x = (m?.estado || "").match(/(?:em-preparacao|concluida)-(.+)/);
  const id = x ? x[1] : m?.tecnico || null;
  return { id, color: TECH_COLORS[id] || "#CBD5E1" };
}

export function getMondayLocal() {
  const n = new Date(), d = n.getDay(), b = d === 0 ? 6 : d - 1;
  const m = new Date(n); m.setDate(n.getDate() - b); m.setHours(0, 0, 0, 0);
  return m;
}