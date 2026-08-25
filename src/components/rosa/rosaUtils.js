// Helpers partilhados do tema Rosa Shock (glass orbital).
import { useState, useEffect, useRef } from "react";

export const PINK = "#FF2D95";
export const PINK_SOFT = "#FF7FBF";
export const LAV = "#B98CFF";
export const GREEN = "#3BE8A8";
export const RED = "#FF6161";
export const AMBER = "#FFC24B";
export const BLUE = "#6FB6FF";
export const WHITE = "#FFFFFF";

export const TYPE = {
  nts: { key: "nts", color: RED, label: "NTS" },
  recon: { key: "recon", color: LAV, label: "RECON" },
  acp: { key: "acp", color: BLUE, label: "ACP" },
  servico: { key: "servico", color: "#B9C2D0", label: "SERV. INT." },
};

export const pad2 = (n) => String(n).padStart(2, "0");

export function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const abs = Math.abs(Math.round(s));
  const sign = s < 0 ? "-" : "";
  return `${sign}${pad2(Math.floor(abs / 3600))}:${pad2(Math.floor((abs % 3600) / 60))}:${pad2(abs % 60)}`;
}

export function fmtH(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h${pad2(m)}`;
}

export function useLiveTimer(m) {
  const ref = useRef(m);
  useEffect(() => { ref.current = m; });
  function calcNow(mm) {
    const acc = Number(mm?.timer_accumulated_seconds) || 0;
    const at = mm?.timer_started_at ? new Date(mm.timer_started_at).getTime() : null;
    if (mm?.timer_status === "running" && at) return acc + Math.floor((Date.now() - at) / 1000);
    return acc;
  }
  const [e, sE] = useState(() => calcNow(m));
  useEffect(() => {
    sE(calcNow(ref.current));
    if (m?.timer_status !== "running" || !m?.timer_started_at) return;
    const id = setInterval(() => sE(calcNow(ref.current)), 1000);
    return () => clearInterval(id);
  }, [m?.timer_status, m?.timer_started_at]);
  return e;
}

export function nsSplit(ns) {
  if (!ns) return { main: "—", sub: null };
  if (ns.includes("|")) { const [main, sub] = ns.split("|"); return { main, sub }; }
  return { main: ns, sub: null };
}

export function fmtDateShort(v) {
  if (!v) return null;
  try {
    return new Date(String(v).length === 10 ? v + "T12:00:00" : v)
      .toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
  } catch { return null; }
}

export function tierRecon(m) {
  const r = m.recondicao || {};
  return r.ouro ? "OURO" : r.prata ? "PRATA" : r.bronze ? "BRONZE" : r.ferro ? "FERRO" : null;
}

export function machineType(m) {
  if (m.tipo === "servico-interno") return TYPE.servico;
  if (m.tipo === "nova") return TYPE.nts;
  if (m.tipo === "usada") return TYPE.recon;
  return TYPE.acp;
}

export function getPausaMotivo(m) {
  if (!m?.timer_status?.startsWith("paused")) return null;
  return m.timer_status.split(":")[1] || "outros";
}

export const PAUSA_COLS = [
  { key: "aguarda_pecas", label: "Aguarda peças", color: AMBER },
  { key: "prioritaria", label: "Pausa p/ prioritária", color: RED },
  { key: "aguarda_decisao", label: "Aguarda decisão", color: LAV },
  { key: "outros", label: "Outros", color: "#B9C2D0" },
];

export function isOverdue(m) {
  if (!m.previsao_fim) return false;
  if (m.estado?.startsWith("concluida") || m.estado === "concluida") return false;
  try {
    return new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : "")) < new Date();
  } catch { return false; }
}

export function hasPrevisao(m) { return !!(m.previsao_inicio && m.previsao_fim); }

/** Janela rotativa: se items > size, avança uma página a cada intervalo. */
export function useRotatingWindow(items, size, intervalMs, paused = false) {
  const n = items.length;
  const [off, setOff] = useState(0);
  useEffect(() => {
    if (n <= size || paused) { if (n <= size) setOff(0); return; }
    const id = setInterval(() => setOff((o) => (o + size) % n), intervalMs);
    return () => clearInterval(id);
  }, [n, size, intervalMs, paused]);
  if (n <= size) return { slice: items, off: 0, page: 1, pages: 1, rotating: false };
  const start = off % n;
  const slice = Array.from({ length: size }, (_, i) => items[(start + i) % n]);
  return { slice, off, page: Math.floor(start / size) + 1, pages: Math.ceil(n / size), rotating: true };
}

export function computeDailyProductivity(totalCon, days = 14) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    buckets.push({ date: d, key: d.toISOString().slice(0, 10), count: 0 });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  (totalCon || []).forEach((m) => {
    if (!m.dataConclusao) return;
    let key;
    try { key = new Date(m.dataConclusao).toISOString().slice(0, 10); } catch { return; }
    const b = map.get(key);
    if (b) b.count++;
  });
  return buckets;
}

export function computeWeeklyOnTime(totalCon, weeks = 6) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay(), diffMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today); monday.setDate(today.getDate() - diffMon);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday); start.setDate(monday.getDate() - i * 7);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    buckets.push({ start, end, total: 0, onTime: 0 });
  }
  (totalCon || []).forEach((m) => {
    if (!m.dataConclusao || !m.previsao_fim) return;
    let dc;
    try { dc = new Date(m.dataConclusao); } catch { return; }
    const b = buckets.find((bb) => dc >= bb.start && dc <= bb.end);
    if (!b) return;
    b.total++;
    try { if (dc <= new Date(m.previsao_fim + "T23:59:59")) b.onTime++; } catch { /* ignore */ }
  });
  return buckets.map((b) => ({
    label: `${pad2(b.start.getDate())}/${pad2(b.start.getMonth() + 1)}`,
    pct: b.total > 0 ? Math.round((b.onTime / b.total) * 100) : null,
    total: b.total,
  }));
}