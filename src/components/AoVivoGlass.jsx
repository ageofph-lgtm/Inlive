// ─────────────────────────────────────────────────────────────────────────────
// AoVivoGlass — Terceira pele de UI (Apple-style, glassmorphism).
// Recebe TODOS os dados já calculados via props do AoVivo. Não faz fetch,
// não decide rotação, não toca em estado partilhado. Render-only.
// Quando theme!=="glass" no AoVivo, este componente nunca é montado.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";

// ── Helpers locais (duplicados para isolamento; pequenos e estáveis) ────────
const pad2 = n => String(n).padStart(2, "0");
function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const abs = Math.abs(Math.round(s)); const sign = s < 0 ? "-" : "";
  return `${sign}${pad2(Math.floor(abs/3600))}:${pad2(Math.floor((abs%3600)/60))}:${pad2(abs%60)}`;
}
function useLiveTimer(m) {
  const ref = useRef(m);
  useEffect(() => { ref.current = m; });
  function calcNow(mm) {
    const acc = Number(mm?.timer_accumulated_seconds) || 0;
    const at  = mm?.timer_started_at ? new Date(mm.timer_started_at).getTime() : null;
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
function getPausaMotivo(m) {
  if (!m?.timer_status?.startsWith("paused")) return null;
  return m.timer_status.split(":")[1] || "outros";
}
function getMondayUTC() {
  const n = new Date(), d = n.getUTCDay(), b = d === 0 ? 6 : d - 1, mn = new Date(n);
  mn.setUTCDate(n.getUTCDate() - b); mn.setUTCHours(0, 0, 0, 0); return mn;
}
function nsSplit(ns) {
  // Mostra "SERIE | sufixo" se a série tiver pipe (convenção opcional do utilizador).
  // Caso contrário devolve a série inteira sem inventar cliente.
  if (!ns) return { main: "—", sub: null };
  if (ns.includes("|")) { const [main, sub] = ns.split("|"); return { main, sub }; }
  return { main: ns, sub: null };
}
function fmtDateShort(v) {
  if (!v) return null;
  try { return new Date(String(v).length === 10 ? v + "T12:00:00" : v).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }); }
  catch { return null; }
}
function tierRecon(m) {
  const r = m.recondicao || {};
  return r.ouro ? "OURO" : r.prata ? "PRATA" : r.bronze ? "BRONZE" : r.ferro ? "FERRO" : null;
}
function isOverdue(m) {
  if (!m.previsao_fim) return false;
  const conc = m.estado?.startsWith("concluida") || m.estado === "concluida";
  if (conc) return false;
  try { return new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : "")) < new Date(); }
  catch { return false; }
}

// ── CSS (adaptado do mockup) ────────────────────────────────────────────────
const CSS_GLASS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');

.glass-root {
  --base:#06070C;
  --txt:#F5F6FA; --txt2:rgba(245,246,250,.62); --txt3:rgba(245,246,250,.36);
  --green:#34C759; --orange:#FF9F0A; --red:#FF453A; --purple:#BF5AF2;
  --blue:#0A84FF; --teal:#64D2FF; --yellow:#FFD60A; --pink:#FF6482;
  --glass:rgba(255,255,255,.08); --glass2:rgba(255,255,255,.045);
  --stroke:rgba(255,255,255,.14); --spec:rgba(255,255,255,.34);
  font-family:'Inter',-apple-system,system-ui,sans-serif;
  background:var(--base); color:var(--txt);
  position:fixed; top:0; left:0; width:100vw; height:100vh; overflow:hidden;
  -webkit-font-smoothing:antialiased; letter-spacing:-.012em;
}
.glass-root *, .glass-root *::before, .glass-root *::after { box-sizing:border-box; margin:0; padding:0; }

#glass-screen { width:1920px; height:1080px; position:fixed; top:50%; left:50%; transform-origin:center center; overflow:hidden; }

.mesh { position:absolute; inset:-15%; z-index:0; filter:blur(8px); }
.blob { position:absolute; border-radius:50%; mix-blend-mode:screen; opacity:.5; animation:gdrift 28s ease-in-out infinite; }
.b1 { width:760px; height:760px; left:-5%; top:-12%; background:radial-gradient(circle,#5B3FD6,transparent 62%); }
.b2 { width:720px; height:720px; right:-7%; top:4%; background:radial-gradient(circle,#0A84FF,transparent 62%); animation-delay:-7s; }
.b3 { width:680px; height:680px; left:26%; bottom:-18%; background:radial-gradient(circle,#26B6A0,transparent 62%); animation-delay:-13s; }
.b4 { width:520px; height:520px; right:16%; bottom:-12%; background:radial-gradient(circle,#FF6482,transparent 64%); animation-delay:-19s; opacity:.36; }
@keyframes gdrift { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(60px,40px) scale(1.08); } 66% { transform:translate(-40px,30px) scale(.96); } }

.scan { position:absolute; inset:0; z-index:1; pointer-events:none; opacity:.5;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(255,255,255,.012) 2px 3px); }

.glass { position:relative; background:linear-gradient(155deg,var(--glass),var(--glass2));
  backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%);
  border:1px solid var(--stroke); border-radius:26px;
  box-shadow:0 16px 46px -18px rgba(0,0,0,.6), inset 0 1px 0 var(--spec); }
.glass::after { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:linear-gradient(150deg,rgba(255,255,255,.14),transparent 26%); }

.wrap { position:relative; z-index:3; height:100%; display:flex; flex-direction:column; padding:22px 28px 16px; gap:16px; }

/* chrome */
.chrome { display:flex; align-items:center; gap:16px; }
.wm { display:flex; align-items:center; gap:11px; }
.wm .ic { width:34px; height:34px; border-radius:11px; background:linear-gradient(160deg,#FF6B6B,#FF453A);
  display:grid; place-items:center; font-family:'Orbitron'; font-weight:900; font-size:15px; color:#fff;
  box-shadow:0 6px 16px -4px var(--red); }
.wm .tt { font-family:'Orbitron'; font-weight:800; letter-spacing:.14em; font-size:22px; }
.live { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; letter-spacing:.04em;
  color:var(--green); padding:6px 13px; border-radius:100px; }
.live .d { width:8px; height:8px; border-radius:50%; background:var(--green);
  box-shadow:0 0 9px var(--green); animation:gpulse 2s infinite; }
.live.paused-pill { color:var(--orange); }
.live.paused-pill .d { background:var(--orange); box-shadow:0 0 9px var(--orange); }
@keyframes gpulse { 50% { opacity:.4; } }
.chrome .right { margin-left:auto; display:flex; align-items:center; gap:13px; }
.clock { font-family:'Orbitron'; font-weight:700; font-size:22px; letter-spacing:.04em; padding:6px 15px; border-radius:15px; }
.clock small { font-family:'Inter'; font-weight:600; font-size:11px; color:var(--txt2); margin-left:8px; letter-spacing:.1em; }
.themebtn { background:rgba(255,255,255,.06); border:1px solid var(--stroke); border-radius:12px;
  width:34px; height:34px; color:var(--txt); cursor:pointer; font-size:16px; display:grid; place-items:center; }

/* KPIs */
.kpis { display:grid; grid-template-columns:repeat(11,1fr); gap:9px; }
.kpi { padding:11px 8px; text-align:center; border-radius:18px; position:relative; overflow:hidden; }
.kpi .v { font-family:'Orbitron'; font-weight:800; font-size:23px; line-height:1; font-variant-numeric:tabular-nums; }
.kpi .k { font-size:9px; font-weight:600; letter-spacing:.1em; color:var(--txt2); margin-top:5px; }
.kpi.act { box-shadow:inset 0 0 0 1.5px var(--ac,var(--blue)),0 16px 46px -18px rgba(0,0,0,.6), inset 0 1px 0 var(--spec); }
.kpi.act .k { color:var(--txt); }
.c-grn .v { color:var(--green); } .c-amb .v { color:var(--orange); } .c-red .v { color:var(--red); }
.c-pur .v { color:var(--purple); } .c-blu .v { color:var(--blue); } .c-pnk .v { color:var(--pink); } .c-ink .v { color:var(--txt); }

/* stage */
.stage { flex:1; min-height:0; position:relative; }
.slide { position:absolute; inset:0; opacity:0; visibility:hidden; transform:scale(.99);
  transition:opacity .45s ease,transform .45s ease; display:flex; flex-direction:column; }
.slide.on { opacity:1; visibility:visible; transform:none; }
.stitle { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.stitle .g { width:12px; height:12px; background:var(--ac,var(--green));
  clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); box-shadow:0 0 10px var(--ac,var(--green)); }
.stitle h2 { font-family:'Orbitron'; font-weight:800; letter-spacing:.1em; font-size:22px; }
.stitle .ct { margin-left:auto; font-family:'Orbitron'; font-weight:700; font-size:13px; color:var(--ac,var(--green));
  padding:4px 11px; border-radius:100px; background:rgba(255,255,255,.06); border:1px solid var(--stroke); }

/* andamento — anéis + cartões */
.andamento { flex:1; min-height:0; display:grid; grid-template-columns:430px 1fr; gap:16px; }
.ringspanel { padding:24px 26px; display:flex; flex-direction:column; }
.ringspanel .rt { font-size:14px; font-weight:700; color:var(--txt2); letter-spacing:.02em; }
.ringspanel .rmid { flex:1; display:flex; align-items:center; justify-content:center; gap:24px; }
.ringwrap { width:200px; height:200px; position:relative; flex:none; }
.ringwrap svg { transform:rotate(-90deg); }
.rleg { display:flex; flex-direction:column; gap:16px; }
.lg { display:flex; align-items:center; gap:11px; }
.lg .dot { width:13px; height:13px; border-radius:50%; box-shadow:0 0 10px currentColor; flex:none; }
.lg b { display:block; font-size:22px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
.lg span { font-size:12px; color:var(--txt2); font-weight:500; }
.ringspanel .rfoot { display:flex; justify-content:space-between; padding-top:18px; border-top:1px solid var(--stroke);
  font-size:13px; color:var(--txt2); }
.ringspanel .rfoot b { color:var(--txt); font-weight:700; }
.cards { display:grid; grid-template-columns:repeat(3,1fr); grid-auto-rows:1fr; gap:14px; min-height:0; }

.card { padding:16px 18px; display:flex; flex-direction:column; min-height:0; position:relative; overflow:hidden;
  border-radius:24px; --st:var(--green); }
.card .top { display:flex; align-items:flex-start; gap:7px; }
.badges { display:flex; gap:6px; flex-wrap:wrap; }
.bdg { font-size:9.5px; font-weight:700; padding:3px 8px; border-radius:100px; letter-spacing:.02em; }
.bdg.run { color:var(--green); background:rgba(52,199,89,.16); }
.bdg.run i { font-style:normal; }
.bdg.paused { color:var(--orange); background:rgba(255,159,10,.16); }
.bdg.idle { color:var(--txt2); background:rgba(255,255,255,.06); }
.bdg.prio { color:#160d00; background:var(--orange); font-weight:800; }
.bdg.nts { color:var(--red); background:rgba(255,69,58,.16); }
.bdg.recon { color:var(--purple); background:rgba(191,90,242,.16); }
.bdg.tier { color:var(--txt2); background:rgba(255,255,255,.08); }
.bdg.over { color:#fff; background:var(--red); }
.cring { margin-left:auto; width:74px; height:74px; border-radius:50%; flex:none; position:relative;
  background:conic-gradient(var(--st) calc(var(--p,0)*1%),rgba(255,255,255,.1) 0); }
.cring::before { content:''; position:absolute; inset:5px; border-radius:50%; background:rgba(8,9,14,.66); backdrop-filter:blur(6px); }
.cring .cc { position:absolute; inset:0; display:grid; place-content:center; text-align:center; z-index:1; line-height:1; }
.cring .cc b { font-size:13px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--st); display:block; }
.cring .cc span { font-size:8px; color:var(--txt3); font-weight:600; margin-top:2px; }
.card .ns { font-family:'Orbitron'; font-weight:800; font-size:27px; letter-spacing:.01em; line-height:1; margin-top:14px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card .ns small { font-size:17px; color:var(--txt2); font-weight:700; }
.card .mo { font-size:12.5px; color:var(--txt2); font-weight:500; margin-top:5px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card .task { margin-top:8px; }
.card .task span { font-size:11.5px; font-weight:500; color:#dfe2ea; background:rgba(255,255,255,.06);
  padding:3px 9px; border-radius:8px; display:inline-block; max-width:100%;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card .dates { margin-top:auto; display:flex; gap:14px; font-size:12px; font-weight:600; color:var(--txt2);
  font-variant-numeric:tabular-nums; padding-top:10px; }
.card .dates b { color:var(--teal); }
.card .dates .e b { color:var(--green); }
.card .empty { margin-top:auto; padding-top:10px; font-size:11px; color:var(--txt3); font-weight:500; }

/* grupos (standby) */
.groups { flex:1; min-height:0; display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.grp { display:flex; flex-direction:column; padding:0; overflow:hidden; }
.gh { display:flex; align-items:center; gap:8px; padding:14px 18px; font-size:12.5px; font-weight:700;
  letter-spacing:.04em; border-bottom:1px solid var(--stroke); }
.gh .gi { color:var(--st); }
.gh .gn { margin-left:auto; font-family:'Orbitron'; color:var(--st); }
.gb { padding:14px; display:flex; flex-direction:column; gap:12px; overflow:hidden; min-height:0; }
.box { padding:14px 15px; border-radius:18px; background:rgba(255,255,255,.05); border-left:3px solid var(--st); }
.box .bn { font-family:'Orbitron'; font-weight:700; font-size:20px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.box .bm { font-size:11px; color:var(--txt2); margin:3px 0 6px; }
.box .bt { float:right; font-family:'Orbitron'; font-weight:700; color:var(--orange); }
.box .bnote { font-size:11.5px; color:#cfd3dc; clear:both; }
.gempty { padding:16px; font-size:11px; color:var(--txt3); text-align:center; }

/* gantt */
.gantt { flex:1; min-height:0; padding:22px 26px; display:flex; flex-direction:column; }
.gsc { display:grid; grid-template-columns:200px repeat(15,1fr); border-bottom:1px solid var(--stroke); padding-bottom:6px; }
.gsc .d { text-align:center; font-size:10px; color:var(--txt2); }
.gsc .d b { display:block; font-size:13px; font-weight:700; }
.gsc .d.now, .gsc .d.now b { color:var(--red); }
.grows { position:relative; flex:1; padding-top:10px; overflow:hidden; }
.gnow { position:absolute; top:0; bottom:0; width:2px; background:var(--red); box-shadow:0 0 10px var(--red); z-index:3; }
.grow { display:grid; grid-template-columns:200px repeat(15,1fr); align-items:center; height:38px; margin-bottom:5px; }
.grow .l { font-size:12px; color:#cfd3dc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:10px; }
.gb2 { height:22px; border-radius:100px; display:flex; align-items:center; padding:0 13px; font-size:11px; font-weight:700;
  color:#06070c; white-space:nowrap; overflow:hidden; }
.gb2.run { background:var(--green); }
.gb2.over { background:var(--red); color:#fff; }
.gb2.fila { background:rgba(255,255,255,.12); color:var(--txt2); }

/* próximas */
.week { flex:1; min-height:0; display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
.day { display:flex; flex-direction:column; overflow:hidden; }
.dh { display:flex; justify-content:space-between; padding:12px 15px; font-size:12px; font-weight:700;
  letter-spacing:.04em; border-bottom:1px solid var(--stroke); }
.dh.now { color:var(--teal); }
.dh .dd { color:var(--txt2); }
.db { padding:12px; display:flex; flex-direction:column; gap:10px; overflow:hidden; min-height:0; }
.mini { padding:11px 13px; border-radius:16px; background:rgba(255,255,255,.05); border-left:3px solid var(--st,var(--blue)); }
.mini .mn { font-family:'Orbitron'; font-weight:700; font-size:16px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mini .mm { font-size:10px; color:var(--txt2); margin:2px 0 4px; }
.mini .mh { font-size:11px; color:var(--orange); font-weight:600; }

/* nts (simplificado — só campos que existem) */
.ntsgrid { flex:1; min-height:0; display:grid; grid-template-columns:1fr 1fr; gap:16px; overflow:hidden; }
.ntc { padding:22px 24px; display:flex; flex-direction:column; gap:14px; border:1px solid rgba(255,69,58,.3); overflow:hidden; min-height:0; }
.ntc::before { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:radial-gradient(110% 70% at 85% 0%,rgba(255,69,58,.12),transparent 55%); }
.ntc .nn { font-family:'Orbitron'; font-weight:800; font-size:30px; line-height:1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ntc .nn small { font-size:18px; color:var(--txt2); }
.ntc .nm { font-size:13px; color:var(--txt2); margin-top:-6px; }
.ntc .nwhy { background:rgba(255,69,58,.1); color:#FFD9D6; border-radius:14px; padding:11px 14px;
  font-size:13px; font-weight:500; line-height:1.5;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.ntc .ntm { display:flex; align-items:center; gap:16px; padding:12px 14px; background:rgba(255,255,255,.05); border-radius:14px; }
.ntc .ntm .tl { font-family:'Orbitron'; font-weight:800; font-size:22px; color:var(--orange); font-variant-numeric:tabular-nums; }
.ntc .ntm .meta { font-size:11px; color:var(--txt2); }
.ntc .ntags { display:flex; flex-wrap:wrap; gap:6px; }
.ntc .ntags .t { font-size:11px; font-weight:500; padding:4px 10px; border-radius:8px; background:rgba(255,255,255,.06); color:#dfe2ea; }
.ntc .ntags .t.done { background:rgba(52,199,89,.14); color:var(--green); text-decoration:line-through; }
.ntc .ng { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:auto; }
.ntc .gi { background:rgba(255,255,255,.05); border-radius:13px; padding:11px 12px; }
.ntc .gi .k { font-size:10px; color:var(--txt2); font-weight:600; letter-spacing:.04em; }
.ntc .gi .v { font-size:15px; font-weight:700; margin-top:3px; }
.gi .v.amb { color:var(--orange); } .gi .v.red { color:var(--red); } .gi .v.grn { color:var(--green); }

/* recon */
.recon { flex:1; min-height:0; display:flex; flex-direction:column; gap:10px; overflow:hidden; padding:20px 24px; }
.rs { font-size:12px; font-weight:700; letter-spacing:.06em; color:var(--txt2); display:flex; align-items:center; gap:10px; flex-shrink:0; }
.rs b { color:var(--purple); font-family:'Orbitron'; }
.rs::after { content:''; flex:1; height:1px; background:var(--stroke); }
.rg { display:grid; grid-template-columns:repeat(6,1fr); gap:9px; }
.rt2 { padding:11px 13px; border-radius:16px; border-top:2px solid var(--purple); background:rgba(255,255,255,.05); }
.rt2.run { border-top-color:var(--green); }
.rt2.paus { border-top-color:var(--orange); }
.rt2 .t { font-size:9px; font-weight:700; color:var(--purple); letter-spacing:.06em; }
.rt2.run .t { color:var(--green); } .rt2.paus .t { color:var(--orange); }
.rt2 .n { font-family:'Orbitron'; font-weight:700; font-size:15px; margin-top:3px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rt2 .m { font-size:9.5px; color:var(--txt2); margin-top:2px; display:flex; justify-content:space-between; }
.rt2 .m .h { color:var(--orange); font-variant-numeric:tabular-nums; }
.rdone { display:flex; gap:9px; flex-wrap:wrap; }
.rchip { padding:8px 13px; border-radius:13px; background:rgba(52,199,89,.1); border:1px solid rgba(52,199,89,.26);
  font-size:11.5px; font-weight:600; color:var(--green); }
.rchip b { color:#cfd3dc; font-weight:600; margin-left:5px; }

/* concluídas */
.donec { flex:1; min-height:0; display:grid; grid-template-columns:1fr 1fr; grid-auto-rows:1fr; gap:14px; overflow:hidden; }
.dc { padding:18px 22px; display:flex; align-items:center; gap:18px; overflow:hidden; border:1px solid rgba(52,199,89,.22); }
.dc .ck { width:46px; height:46px; border-radius:50%; background:var(--green); display:grid; place-items:center;
  font-size:22px; color:#06070c; flex:none; font-weight:900; }
.dc .dn { font-family:'Orbitron'; font-weight:700; font-size:22px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dc .dm { font-size:12px; color:var(--txt2); margin-top:3px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dc .dt { margin-left:auto; text-align:right; flex:none; }
.dc .dt b { font-family:'Orbitron'; font-weight:700; font-size:22px; color:var(--green); font-variant-numeric:tabular-nums; }
.dc .dt span { display:block; font-size:11px; color:var(--txt2); }

/* footer */
.foot { display:flex; align-items:center; gap:18px; font-size:10.5px; color:var(--txt3); font-weight:500; letter-spacing:.06em; }
.foot .lab { color:var(--txt2); font-family:'Orbitron'; font-weight:700; letter-spacing:.1em; }
.foot .prog { position:relative; flex:none; width:120px; height:3px; background:rgba(255,255,255,.08); border-radius:2px; overflow:hidden; }
.foot .prog > div { height:100%; background:var(--green); transition:width .1s linear; }
.pips { display:flex; gap:6px; margin-left:auto; }
.pip { width:20px; height:5px; border-radius:3px; background:rgba(255,255,255,.18); transition:.3s; }
.pip.on { background:var(--txt); width:30px; }
.org { font-family:'Orbitron'; font-weight:700; letter-spacing:.06em; color:var(--txt2); }
.org em { color:var(--red); font-style:normal; }

@media (prefers-reduced-motion:reduce) { .glass-root *, .glass-root *::before, .glass-root *::after { animation:none!important; transition:none!important; } }
`;

// ── Card de máquina (usado em ANDAMENTO e PRIORITÁRIAS) ─────────────────────
function MachineCard({ m }) {
  const elapsed = useLiveTimer(m);
  const meta    = Number(m.tempo_estimado_segundos) || 0;
  const ratio   = meta > 0 ? elapsed / meta : 0;
  const st      = ratio >= 1 ? "var(--red)" : ratio >= 0.9 ? "var(--orange)" : "var(--green)";
  const run     = m.timer_status === "running";
  const paused  = m.timer_status?.startsWith("paused");
  const tier    = tierRecon(m);
  const ns      = nsSplit(m.serie);
  const tasks   = m.tarefas || [];
  const activeTask = tasks.find(t => !t.concluida) || tasks[0];
  const over    = isOverdue(m);
  const cringP  = Math.min(100, Math.max(0, ratio * 100));
  const totH    = meta > 0 ? Math.round(meta / 3600) + "h" : "—";

  return (
    <div className="card glass" style={{ "--st": st, "--p": cringP }}>
      <div className="top">
        <div className="badges">
          {run    && <span className="bdg run"><i>● </i>RUN</span>}
          {paused && <span className="bdg paused">PAUSED</span>}
          {!run && !paused && <span className="bdg idle">IDLE</span>}
          {m.prioridade && <span className="bdg prio">PRIORITÁRIA</span>}
          {tier && <span className="bdg recon">RECON</span>}
          {tier && <span className="bdg tier">{tier}</span>}
          {m.tipo === "nova" && <span className="bdg nts">NTS</span>}
          {over && <span className="bdg over">ATRAS.</span>}
        </div>
        {meta > 0 && (
          <div className="cring">
            <div className="cc">
              <b>{fmtHMS(elapsed)}</b>
              <span>/ {totH}</span>
            </div>
          </div>
        )}
      </div>
      <div className="ns">{ns.main}{ns.sub && <small> · {ns.sub}</small>}</div>
      <div className="mo">{m.modelo || "—"}</div>
      {activeTask && <div className="task"><span>{activeTask.texto}</span></div>}
      {(m.previsao_inicio || m.previsao_fim) ? (
        <div className="dates">
          {m.previsao_inicio && <span>▸ <b>{fmtDateShort(m.previsao_inicio)}</b></span>}
          {m.previsao_fim    && <span className="e">✓ <b>{fmtDateShort(m.previsao_fim)}</b></span>}
        </div>
      ) : <div className="empty">— sem previsão —</div>}
    </div>
  );
}

// ── Slide: EM ANDAMENTO ─────────────────────────────────────────────────────
function SlideAndamento({ andamento, conHoje, totalCon, avgH, machines }) {
  // Stats reais (sem inventar campos)
  const emCurso     = andamento.length;
  const concHoje    = conHoje.length;
  const emAndOverdue = andamento.filter(isOverdue).length;
  const noPrazoPct  = emCurso > 0 ? Math.round((1 - emAndOverdue / emCurso) * 100) : 100;
  // Anéis: 3 métricas reais → concluídas-hoje (vs em-curso+hoje), no-prazo, em-curso
  const ringMax = Math.max(emCurso + concHoje, 1);
  const rings = [
    { r: 86, c: "var(--green)",  p: concHoje / ringMax },
    { r: 64, c: "var(--teal)",   p: noPrazoPct / 100 },
    { r: 42, c: "var(--orange)", p: Math.min(1, emCurso / 8) },
  ];
  return (
    <div className="andamento">
      <div className="ringspanel glass">
        <div className="rt">Hoje na oficina</div>
        <div className="rmid">
          <div className="ringwrap">
            <svg width="200" height="200" viewBox="0 0 200 200">
              {rings.map(({ r, c, p }, i) => {
                const C = 2 * Math.PI * r;
                return (
                  <g key={i}>
                    <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="16" />
                    <circle cx="100" cy="100" r={r} fill="none" stroke={c} strokeWidth="16" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - p)}
                      style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="rleg">
            <div className="lg" style={{ color: "var(--green)" }}>
              <span className="dot" /><div><b>{concHoje}</b><span>Concluídas hoje</span></div>
            </div>
            <div className="lg" style={{ color: "var(--teal)" }}>
              <span className="dot" /><div><b>{noPrazoPct}%</b><span>No prazo</span></div>
            </div>
            <div className="lg" style={{ color: "var(--orange)" }}>
              <span className="dot" /><div><b>{emCurso}</b><span>Em curso</span></div>
            </div>
          </div>
        </div>
        <div className="rfoot">
          <span>Méd. <b>{avgH}h</b>/máq</span>
          <span>Total 2026 · <b>{totalCon.length}</b></span>
        </div>
      </div>
      <div className="cards">
        {andamento.length === 0
          ? <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", color: "var(--txt3)", fontSize: 14 }}>Sem máquinas em produção</div>
          : andamento.slice(0, 6).map(m => <MachineCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}

// ── Slide: STANDBY ──────────────────────────────────────────────────────────
const PAUSA_COLS = [
  { key: "aguarda_pecas",   label: "AGUARDA PEÇAS",          color: "var(--orange)", icon: "◳" },
  { key: "prioritaria",     label: "PAUSA P/ PRIORITÁRIA",   color: "var(--red)",    icon: "◉" },
  { key: "aguarda_decisao", label: "AGUARDA DECISÃO",        color: "var(--purple)", icon: "⧖" },
  { key: "outros",          label: "OUTROS",                 color: "var(--txt3)",   icon: "…" },
];
function SlideStandby({ standby }) {
  return (
    <div className="groups">
      {PAUSA_COLS.map(col => {
        const items = standby.filter(m => (getPausaMotivo(m) || "outros") === col.key);
        return (
          <div key={col.key} className="grp glass" style={{ "--st": col.color }}>
            <div className="gh">
              <span className="gi">{col.icon}</span>{col.label}
              <span className="gn">{items.length}</span>
            </div>
            <div className="gb">
              {items.length === 0
                ? <div className="gempty">—</div>
                : items.map(m => (
                  <div key={m.id} className="box" style={{ "--st": col.color }}>
                    <span className="bt">{fmtHMS(Number(m.timer_accumulated_seconds) || 0)}</span>
                    <div className="bn">{m.serie || "—"}</div>
                    <div className="bm">{m.modelo}{tierRecon(m) ? ` · ${tierRecon(m)}` : ""}</div>
                    {m.observacoes && <div className="bnote">{m.observacoes}</div>}
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Slide: PRIORITÁRIAS ─────────────────────────────────────────────────────
function SlidePrioritarias({ prioritarias }) {
  return (
    <div className="andamento" style={{ gridTemplateColumns: "1fr" }}>
      <div className="cards" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {prioritarias.length === 0
          ? <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", color: "var(--txt3)", fontSize: 14 }}>Sem prioritárias</div>
          : prioritarias.slice(0, 8).map(m => <MachineCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}

// ── Slide: TIMELINE ─────────────────────────────────────────────────────────
function SlideTimeline({ machines }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const BACK = 1, AHEAD = 13;
  const start = new Date(today); start.setDate(today.getDate() - BACK);
  const end   = new Date(today); end.setDate(today.getDate() + AHEAD + 1);
  const totalMs = end - start;
  const days = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });
  const todayPct = ((Date.now() - start.getTime()) / totalMs) * 100;
  const blocks = machines
    .map(m => {
      if (!m.previsao_inicio || !m.previsao_fim) return null;
      const pi = new Date(m.previsao_inicio + (String(m.previsao_inicio).length === 10 ? "T00:00:00" : ""));
      const pf = new Date(m.previsao_fim    + (String(m.previsao_fim).length    === 10 ? "T23:59:59" : ""));
      if (pf < start || pi > end) return null;
      const isActive = m.estado?.startsWith("em-preparacao");
      const run      = m.timer_status === "running";
      const over     = isActive && new Date() > pf;
      const a = ((Math.max(pi, start) - start) / totalMs) * 100;
      const b = ((Math.min(pf, end)   - start) / totalMs) * 100;
      return { m, a, b, run, isActive, over };
    })
    .filter(Boolean)
    .sort((x, y) => (x.isActive === y.isActive) ? x.a - y.a : x.isActive ? -1 : 1)
    .slice(0, 11);

  return (
    <div className="gantt glass">
      <div className="gsc">
        <div />
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className={`d${isToday ? " now" : ""}`}>
              <b>{pad2(d.getDate())}</b>{d.toLocaleDateString("pt-PT", { month: "short" }).toUpperCase().replace(".", "")}
            </div>
          );
        })}
      </div>
      <div className="grows">
        <div className="gnow" style={{ left: `calc(200px + ((100% - 200px)/100) * ${todayPct})` }} />
        {blocks.length === 0
          ? <div style={{ padding: 24, color: "var(--txt3)", fontSize: 13 }}>Sem máquinas com previsão na janela</div>
          : blocks.map((bl, i) => {
            const cls = bl.over ? "over" : bl.run ? "run" : bl.isActive ? "run" : "fila";
            const ns  = nsSplit(bl.m.serie).main;
            return (
              <div key={bl.m.id || i} className="grow">
                <div className="l">{ns} · {bl.m.modelo || ""}</div>
                <div className="gb2" style={{ ...{ gridColumn: "2 / -1" }, position: "relative" }}>
                  <div className={`gb2 ${cls}`} style={{
                    position: "absolute",
                    left:  `${bl.a}%`,
                    width: `${Math.max(bl.b - bl.a, 2)}%`,
                    height: 22,
                  }}>{ns}</div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Slide: PRÓXIMAS (semana corrente) ───────────────────────────────────────
function SlideProximas({ proximas }) {
  const monday = getMondayUTC();
  const todayStr = new Date().toISOString().slice(0, 10);
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday); d.setUTCDate(monday.getUTCDate() + i); return d;
  });
  const byDay = {};
  proximas.forEach(m => {
    if (!m.previsao_inicio) return;
    const k = new Date(m.previsao_inicio).toISOString().slice(0, 10);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(m);
  });

  return (
    <div className="week">
      {days.map(d => {
        const k = d.toISOString().slice(0, 10);
        const isToday = k === todayStr;
        const ms = byDay[k] || [];
        return (
          <div key={k} className="day glass">
            <div className={`dh${isToday ? " now" : ""}`}>
              {d.toLocaleDateString("pt-PT", { weekday: "long" }).toUpperCase()}
              <span className="dd">{fmtDateShort(d.toISOString().slice(0,10))}</span>
            </div>
            <div className="db">
              {ms.length === 0
                ? <div style={{ color: "var(--txt3)", fontSize: 11, textAlign: "center", padding: 12 }}>—</div>
                : ms.slice(0, 5).map(m => {
                  const meta = Number(m.tempo_estimado_segundos) || 0;
                  const h = meta > 0 ? Math.round(meta / 3600) + "h" : null;
                  const stColor = m.prioridade ? "var(--orange)" : tierRecon(m) ? "var(--purple)" : "var(--teal)";
                  return (
                    <div key={m.id} className="mini" style={{ "--st": stColor }}>
                      <div className="mn">{nsSplit(m.serie).main}</div>
                      <div className="mm">{m.modelo}</div>
                      {h && <div className="mh">⏱ {h}</div>}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Slide: NTS (simplificado para campos reais) ─────────────────────────────
// Sem etapas S1/S2/S3 — usamos: NS, modelo, observações (PORQUÊ),
// tarefas como tags (concluída=riscada), timer activo, KPIs reais.
function NTSCard({ m }) {
  const elapsed = useLiveTimer(m);
  const meta    = Number(m.tempo_estimado_segundos) || 0;
  const ns      = nsSplit(m.serie);
  const tasks   = m.tarefas || [];
  const done    = tasks.filter(t => t.concluida).length;
  const over    = isOverdue(m);
  const diasOficina = m.dataAtribuicao
    ? Math.max(0, Math.floor((Date.now() - new Date(m.dataAtribuicao).getTime()) / 86400000))
    : null;
  const deltaSec = meta > 0 ? elapsed - meta : 0;
  const deltaLbl = meta > 0 ? (deltaSec > 0 ? `+${fmtHMS(deltaSec)}` : `${fmtHMS(-deltaSec)} folga`) : "—";
  const deltaCls = meta > 0 ? (deltaSec > 0 ? "red" : "grn") : "";

  return (
    <div className="ntc glass">
      <div>
        <div className="nn">{ns.main}{ns.sub && <small> · {ns.sub}</small>}</div>
        <div className="nm">{m.modelo || "—"}</div>
      </div>
      {m.observacoes && <div className="nwhy">{m.observacoes}</div>}
      <div className="ntm">
        <div className="tl">{fmtHMS(elapsed)}</div>
        <div className="meta">
          {meta > 0 ? `de ${Math.round(meta/3600)}h estimadas` : "sem estimativa"}
          {m.tecnico && ` · ${m.tecnico}`}
        </div>
      </div>
      {tasks.length > 0 && (
        <div className="ntags">
          {tasks.slice(0, 8).map((t, i) => (
            <span key={i} className={`t${t.concluida ? " done" : ""}`}>{t.texto}</span>
          ))}
        </div>
      )}
      <div className="ng">
        <div className="gi">
          <div className="k">EM OFICINA</div>
          <div className={`v ${diasOficina != null && diasOficina > 5 ? "amb" : ""}`}>{diasOficina != null ? `${diasOficina}d` : "—"}</div>
        </div>
        <div className="gi">
          <div className="k">Δ ALVO</div>
          <div className={`v ${deltaCls}`}>{deltaLbl}</div>
        </div>
        <div className="gi">
          <div className="k">PEÇAS</div>
          <div className={`v ${m.aguardaPecas ? "amb" : "grn"}`}>{m.aguardaPecas ? "a aguardar" : "ok"}</div>
        </div>
        <div className="gi">
          <div className="k">TAREFAS</div>
          <div className={`v ${tasks.length > 0 && done === tasks.length ? "grn" : ""}`}>{done}/{tasks.length || 0}</div>
        </div>
      </div>
      {over && <div style={{ position: "absolute", top: 12, right: 14, padding: "3px 8px", borderRadius: 100, background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: ".05em" }}>ATRASADA</div>}
    </div>
  );
}
function SlideNTS({ ntsAnd, ntsAF }) {
  // Mostra primeiro NTS em preparação; se houver vagas, completa com NTS a-fazer.
  const items = [...ntsAnd, ...ntsAF].slice(0, 2);
  return (
    <div className="ntsgrid">
      {items.length === 0
        ? <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", color: "var(--txt3)", fontSize: 14 }}>Sem máquinas NTS</div>
        : items.map(m => <NTSCard key={m.id} m={m} />)}
    </div>
  );
}

// ── Slide: RECON ────────────────────────────────────────────────────────────
function SlideRecon({ reconAnd, reconAF, reconCon }) {
  const reconActive = reconAnd; // em preparação
  return (
    <div className="recon glass">
      <div className="rs">⚡ EM ANDAMENTO <b>{reconActive.length}</b></div>
      <div className="rg" style={{ gridTemplateColumns: reconActive.length <= 2 ? "1fr 1fr" : "repeat(4,1fr)" }}>
        {reconActive.length === 0
          ? <div style={{ color: "var(--txt3)", fontSize: 12, padding: 8 }}>—</div>
          : reconActive.slice(0, 4).map(m => {
            const elapsed = (Number(m.timer_accumulated_seconds) || 0);
            const run = m.timer_status === "running";
            const paus = m.timer_status?.startsWith("paused");
            const cls = run ? "run" : paus ? "paus" : "";
            const tier = tierRecon(m);
            return (
              <div key={m.id} className={`rt2 ${cls}`}>
                <div className="t">{run ? "EM CURSO" : paus ? "PAUSED" : "IDLE"}{tier ? ` · ${tier}` : ""}</div>
                <div className="n" style={{ fontSize: 18 }}>{nsSplit(m.serie).main}</div>
                <div className="m"><span>{m.modelo}</span><span className="h">⏱ {fmtHMS(elapsed)}</span></div>
              </div>
            );
          })}
      </div>
      <div className="rs">⧖ PRÓXIMAS <b>{reconAF.length}</b></div>
      <div className="rg">
        {reconAF.length === 0
          ? <div style={{ color: "var(--txt3)", fontSize: 12, padding: 8 }}>—</div>
          : reconAF.slice(0, 12).map(m => {
            const meta = Number(m.tempo_estimado_segundos) || 0;
            const h = meta > 0 ? `${Math.round(meta / 3600)}h` : "—";
            return (
              <div key={m.id} className="rt2">
                <div className="t">{tierRecon(m) || "RECON"}</div>
                <div className="n">{nsSplit(m.serie).main}</div>
                <div className="m"><span>{m.modelo}</span><span className="h">{h}</span></div>
              </div>
            );
          })}
      </div>
      <div className="rs">✓ CONCLUÍDAS · 30 DIAS <b>{reconCon.length}</b></div>
      <div className="rdone">
        {reconCon.length === 0
          ? <div style={{ color: "var(--txt3)", fontSize: 11 }}>—</div>
          : reconCon.slice(0, 10).map(m => (
            <div key={m.id} className="rchip">✓ {nsSplit(m.serie).main} <b>{m.modelo}{tierRecon(m) ? ` · ${tierRecon(m)}` : ""}</b></div>
          ))}
      </div>
    </div>
  );
}

// ── Slide: CONCLUÍDAS ───────────────────────────────────────────────────────
function SlideConcluidas({ conSemana }) {
  return (
    <div className="donec">
      {conSemana.length === 0
        ? <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", color: "var(--txt3)", fontSize: 14 }}>Nada concluído esta semana</div>
        : conSemana.slice(0, 8).map(m => {
          const t = m.timer_accumulated_seconds ? fmtHMS(m.timer_accumulated_seconds) : "—";
          let ts = "—";
          if (m.dataConclusao) {
            try {
              const d = new Date(m.dataConclusao);
              ts = `${pad2(d.getDate())}/${pad2(d.getMonth()+1)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
            } catch { /* ignore */ }
          }
          return (
            <div key={m.id} className="dc glass">
              <div className="ck">✓</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="dn">{nsSplit(m.serie).main}</div>
                <div className="dm">{m.modelo}</div>
              </div>
              <div className="dt">
                <b>{t}</b>
                <span>{ts}</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function AoVivoGlass({
  data, slide, prog, paused, SLIDES, next, prev, sPaused,
  cycleTheme, theme,
}) {
  const { machines, andamento, standby, prioritarias, proximas,
          ntsAnd, ntsAF, reconAnd, reconAF, reconCon,
          conSemana, totalCon, conHoje, avgH } = data;

  // Fit-to-screen 1920×1080
  useEffect(() => {
    const fit = () => {
      const el = document.getElementById("glass-screen");
      if (!el) return;
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      el.style.transform = `translate(-50%,-50%) scale(${s})`;
    };
    window.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", fit);
    fit();
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("fullscreenchange", fit);
    };
  }, []);

  // Relógio
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  // KPIs reais (sem inventar)
  const kpis = [
    { v: andamento.length,    k: "ANDAMENTO",    c: "c-grn" },
    { v: standby.length,      k: "STANDBY",      c: "c-amb" },
    { v: prioritarias.length, k: "PRIORITÁRIAS", c: "c-amb" },
    { v: machines.filter(m => (m.estado?.startsWith("em-preparacao") || m.estado === "a-fazer") && m.previsao_inicio).length, k: "TIMELINE", c: "c-blu" },
    { v: proximas.length,                    k: "PRÓXIMAS",    c: "c-ink" },
    { v: ntsAnd.length + ntsAF.length,       k: "NTS",         c: "c-red" },
    { v: reconAnd.length + reconAF.length,   k: "RECON",       c: "c-pur" },
    { v: conSemana.length,                   k: "ESTA SEMANA", c: "c-grn" },
    { v: conHoje.length,                     k: "HOJE",        c: "c-ink" },
    { v: avgH,                               k: "MÉD.H/MÁQ",   c: "c-ink" },
    { v: totalCon.length,                    k: "TOTAL 2026",  c: "c-pnk" },
  ];

  const slideId    = SLIDES[slide]?.id;
  const slideLabel = SLIDES[slide]?.label;

  // Mapa slideId → cor de accent
  const SLIDE_ACCENT = {
    andamento: "var(--green)", standby: "var(--orange)", prioritarias: "var(--orange)",
    timeline: "var(--blue)", proximas: "var(--blue)", nts: "var(--red)",
    recon: "var(--purple)", concluidas: "var(--green)",
  };

  return (
    <div className="glass-root">
      <style>{CSS_GLASS}</style>
      <div id="glass-screen">
        <div className="mesh">
          <div className="blob b1" /><div className="blob b2" />
          <div className="blob b3" /><div className="blob b4" />
        </div>
        <div className="scan" />

        <div className="wrap">

          {/* CHROME */}
          <div className="chrome">
            <div className="wm"><div className="ic">W</div><div className="tt">WATCHER</div></div>
            <div className={`live glass${paused ? " paused-pill" : ""}`}>
              <span className="d" /><span>{paused ? "PAUSA" : "LIVE"}</span>
            </div>
            <div className="right">
              <div className="clock glass">
                <span>{pad2(now.getHours())}:{pad2(now.getMinutes())}:{pad2(now.getSeconds())}</span>
                <small>{now.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()}</small>
              </div>
              <button className="themebtn" onClick={cycleTheme} title={`Tema: ${theme}`} aria-label="Mudar tema">◐</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpis">
            {kpis.map((kp, i) => (
              <div key={i} className={`kpi glass ${kp.c}${slide === i ? " act" : ""}`}
                   style={slide === i ? { "--ac": SLIDE_ACCENT[slideId] } : undefined}>
                <div className="v">{kp.v}</div>
                <div className="k">{kp.k}</div>
              </div>
            ))}
          </div>

          {/* STAGE */}
          <div className="stage">
            <section className={`slide${slideId === "andamento" ? " on" : ""}`} style={{ "--ac": "var(--green)" }}>
              <div className="stitle"><span className="g" /><h2>EM ANDAMENTO</h2><span className="ct">×{pad2(andamento.length)}</span></div>
              <SlideAndamento andamento={andamento} conHoje={conHoje} totalCon={totalCon} avgH={avgH} machines={machines} />
            </section>

            <section className={`slide${slideId === "standby" ? " on" : ""}`} style={{ "--ac": "var(--orange)" }}>
              <div className="stitle"><span className="g" /><h2>STANDBY</h2><span className="ct">×{pad2(standby.length)}</span></div>
              <SlideStandby standby={standby} />
            </section>

            <section className={`slide${slideId === "prioritarias" ? " on" : ""}`} style={{ "--ac": "var(--orange)" }}>
              <div className="stitle"><span className="g" /><h2>PRIORITÁRIAS</h2><span className="ct">×{pad2(prioritarias.length)}</span></div>
              <SlidePrioritarias prioritarias={prioritarias} />
            </section>

            <section className={`slide${slideId === "timeline" ? " on" : ""}`} style={{ "--ac": "var(--blue)" }}>
              <div className="stitle"><span className="g" /><h2>TIMELINE · 14 DIAS</h2><span className="ct">×{pad2(machines.filter(m => m.previsao_inicio && m.previsao_fim).length)}</span></div>
              <SlideTimeline machines={machines} />
            </section>

            <section className={`slide${slideId === "proximas" ? " on" : ""}`} style={{ "--ac": "var(--blue)" }}>
              <div className="stitle"><span className="g" /><h2>PRÓXIMAS</h2><span className="ct">×{pad2(proximas.length)}</span></div>
              <SlideProximas proximas={proximas} />
            </section>

            <section className={`slide${slideId === "nts" ? " on" : ""}`} style={{ "--ac": "var(--red)" }}>
              <div className="stitle"><span className="g" /><h2>NTS</h2><span className="ct">×{pad2(ntsAnd.length + ntsAF.length)}</span></div>
              <SlideNTS ntsAnd={ntsAnd} ntsAF={ntsAF} />
            </section>

            <section className={`slide${slideId === "recon" ? " on" : ""}`} style={{ "--ac": "var(--purple)" }}>
              <div className="stitle"><span className="g" /><h2>RECONDICIONAMENTO</h2><span className="ct">×{pad2(reconAnd.length + reconAF.length)}</span></div>
              <SlideRecon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} />
            </section>

            <section className={`slide${slideId === "concluidas" ? " on" : ""}`} style={{ "--ac": "var(--green)" }}>
              <div className="stitle"><span className="g" /><h2>CONCLUÍDAS · ESTA SEMANA</h2><span className="ct">×{pad2(conSemana.length)}</span></div>
              <SlideConcluidas conSemana={conSemana} />
            </section>
          </div>

          {/* FOOTER */}
          <div className="foot">
            <span className="lab">{slideLabel || "—"}</span>
            <span className="prog"><div style={{ width: `${(prog || 0) * 100}%` }} /></span>
            <span className="pips">
              {SLIDES.map((s, i) => (
                <span key={s.id} className={`pip${slide === i ? " on" : ""}`} />
              ))}
            </span>
            <span className="org">STILL OFICINA <em>·</em> FROTA ACP</span>
          </div>

        </div>
      </div>
    </div>
  );
}
