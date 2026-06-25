// ─────────────────────────────────────────────────────────────────────────────
// AoVivoGlassNoir — Quinta pele de UI (super-dark, brilho diagonal branco do
// vidro + acentos vermelhos em detalhes: nome WATCHER, contornos, footer).
// Clone 1:1 do AoVivoGlass em layout, dimensões, slides e dados; muda apenas
// a paleta (fundo preto profundo, sem blobs coloridos) e acentos vermelhos.
// Recebe TODOS os dados já calculados via props. Render-only.
// Quando theme!=="glass-noir" no AoVivo, este componente nunca é montado.
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
// Fonte adaptativa para o NS: encolhe à medida que a série cresce, garantindo
// que nunca há corte. base = tamanho para séries curtas (≤9 chars), min = piso.
function nsFontSize(text, base, min = 14) {
  const len = (text || "").length;
  if (len <= 9) return base;
  return Math.max(min, Math.round(base - (len - 9) * (base * 0.07)));
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
// Tipo de intervenção visível (NTS / RECON / ACP) — em ordem de prioridade
function tipoIntervencao(m) {
  if (m.tipo === "nova") return { label: "NTS",   color: "var(--red)"    };
  if (tierRecon(m))      return { label: "RECON", color: "var(--purple)" };
  return                        { label: "ACP",   color: "var(--teal)"   };
}
function isOverdue(m) {
  if (!m.previsao_fim) return false;
  const conc = m.estado?.startsWith("concluida") || m.estado === "concluida";
  if (conc) return false;
  try { return new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : "")) < new Date(); }
  catch { return false; }
}

// Logo do mascote STILL (mesma URL que o AoVivo principal usa)
const JORDAN_URL = "https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png";

// ── CSS (adaptado do mockup) ────────────────────────────────────────────────
const CSS_GLASSNOIR = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');

.glassnoir-root {
  /* Super-dark + vermelho secundário em DETALHES (não em fundos) */
  --base:#050608;
  --txt:#F5F6FA; --txt2:rgba(245,246,250,.66); --txt3:rgba(245,246,250,.38);
  --green:#34C759; --orange:#FF9F0A; --red:#FF3344; --purple:#BF5AF2;
  --blue:#0A84FF; --teal:#64D2FF; --yellow:#FFD60A; --pink:#FF6482;
  --sky:#7DD3FC;
  --dgreen:#15803D;
  --shock:#FF2D78;
  --glass:rgba(255,255,255,.10); --glass2:rgba(255,255,255,.018);
  --stroke:rgba(255,51,68,.22); --spec:rgba(255,255,255,.38);
  font-family:'Inter',-apple-system,system-ui,sans-serif;
  background:var(--base); color:var(--txt);
  position:fixed; top:0; left:0; width:100vw; height:100vh; overflow:hidden;
  -webkit-font-smoothing:antialiased; letter-spacing:-.012em;
}
.glassnoir-root *, .glassnoir-root *::before, .glassnoir-root *::after { box-sizing:border-box; margin:0; padding:0; }

/* Fullscreen — usa todo o viewport, sem barras pretas */
#glassnoir-screen { width:100vw; height:100vh; position:fixed; top:0; left:0; overflow:hidden; }

/* Marca d'água do mascote em cada slide */
.watermark { position:absolute; bottom:0; right:0; width:32vw; height:62vh;
  pointer-events:none; z-index:0; opacity:0.10;
  background-image:url('${"https://media.base44.com/images/public/6a045759b56878764b71db11/b4686dedd_Gemini_Generated_Image_6i6wgc6i6wgc6i6w1.png"}');
  background-size:contain; background-repeat:no-repeat; background-position:bottom right;
  mix-blend-mode:luminosity; filter:drop-shadow(0 0 30px rgba(255,69,58,0.3)); }
/* Garante que o conteúdo do slide fica por cima da marca d'água */
.slide > *:not(.watermark) { position:relative; z-index:1; }

/* Noir: blobs tingidos de vermelho a baixa opacidade — halo subtil nos cantos
   (não os multi-cores do glass). Brilho diagonal branco do .glass continua protagonista. */
.mesh { position:absolute; inset:-15%; z-index:0; filter:blur(14px); }
.blob { position:absolute; border-radius:50%; mix-blend-mode:screen; opacity:.10; animation:gdrift 28s ease-in-out infinite; }
.b1 { width:clamp(400px,40vw,700px); height:clamp(400px,40vw,700px); left:-5%; top:-12%; background:radial-gradient(circle,#FF3344,transparent 65%); }
.b2 { width:clamp(380px,38vw,660px); height:clamp(380px,38vw,660px); right:-7%; top:4%; background:radial-gradient(circle,#FF3344,transparent 68%); animation-delay:-7s; opacity:.07; }
.b3 { width:clamp(360px,36vw,620px); height:clamp(360px,36vw,620px); left:26%; bottom:-18%; background:radial-gradient(circle,#FF3344,transparent 68%); animation-delay:-13s; opacity:.05; }
.b4 { width:clamp(280px,28vw,480px); height:clamp(280px,28vw,480px); right:16%; bottom:-12%; background:radial-gradient(circle,#FF3344,transparent 65%); animation-delay:-19s; opacity:.09; }
@keyframes gdrift { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(60px,40px) scale(1.08); } 66% { transform:translate(-40px,30px) scale(.96); } }

.scan { position:absolute; inset:0; z-index:1; pointer-events:none; opacity:.5;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(255,255,255,.012) 2px 3px); }

.glass { position:relative; background:linear-gradient(155deg,var(--glass),var(--glass2));
  backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%);
  border:1px solid var(--stroke); border-radius:26px;
  box-shadow:0 16px 46px -18px rgba(0,0,0,.6), inset 0 1px 0 var(--spec); }
.glass::after { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:linear-gradient(150deg,rgba(255,255,255,.22),transparent 42%); }

.wrap { position:relative; z-index:3; height:100%; display:flex; flex-direction:column;
  padding:clamp(8px, 1vw, 18px) clamp(10px, 1.2vw, 22px) clamp(6px, 0.8vw, 14px); gap:clamp(6px, 0.7vw, 14px); }

/* chrome */
.chrome { display:flex; align-items:center; gap:clamp(8px, 1vw, 16px); }
.wm { display:flex; align-items:center; gap:12px; }
/* Ícone: logo do mascote — fundo transparente (multiply remove o branco em dark) */
.wm .ic { width:clamp(32px, 2.4vw, 44px); height:clamp(32px, 2.4vw, 44px); flex:none; position:relative;
  border-radius:12px; overflow:hidden;
  background:linear-gradient(160deg,rgba(255,107,107,0.18),rgba(255,69,58,0.12));
  border:1px solid rgba(255,107,107,0.32);
  box-shadow:0 6px 16px -4px var(--red), inset 0 1px 0 rgba(255,255,255,.18); }
.wm .ic img { width:100%; height:100%; object-fit:contain; object-position:center;
  mix-blend-mode:multiply; filter:brightness(1.45) contrast(1.15) drop-shadow(0 0 4px rgba(255,69,58,0.4)); }
.wm .tt { font-family:'Orbitron'; font-weight:800; letter-spacing:.14em; font-size:clamp(14px, 1.4vw, 22px); line-height:1;
  color:var(--red); text-shadow:0 0 16px rgba(255,51,68,.5); }
.wm .tt2 { font-family:'Orbitron'; font-weight:600; letter-spacing:.22em; font-size:11px;
  color:var(--txt2); margin-left:2px; padding-left:10px;
  border-left:1px solid var(--stroke); align-self:center; }
.live { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; letter-spacing:.04em;
  color:var(--green); padding:6px 13px; border-radius:100px; }
.live .d { width:8px; height:8px; border-radius:50%; background:var(--green);
  box-shadow:0 0 9px var(--green); animation:gpulse 2s infinite; }
.live.paused-pill { color:var(--orange); }
.live.paused-pill .d { background:var(--orange); box-shadow:0 0 9px var(--orange); }
@keyframes gpulse { 50% { opacity:.4; } }
.chrome .right { margin-left:auto; display:flex; align-items:center; gap:13px; }
.clock { font-family:'Orbitron'; font-weight:700; font-size:clamp(14px, 1.4vw, 22px); letter-spacing:.04em;
  padding:clamp(4px, 0.5vw, 6px) clamp(8px, 1vw, 15px); border-radius:clamp(8px, 1vw, 15px); }
.clock small { font-family:'Inter'; font-weight:600; font-size:11px; color:var(--txt2); margin-left:8px; letter-spacing:.1em; }
.themebtn { background:rgba(255,51,68,.06); border:1px solid var(--stroke); border-radius:12px;
  width:34px; height:34px; color:var(--red); cursor:pointer; font-size:16px; display:grid; place-items:center; }

/* KPIs */
.kpis { display:grid; grid-template-columns:repeat(11,1fr); gap:clamp(4px, 0.5vw, 9px); }
.kpi { padding:clamp(5px, 0.6vw, 10px) clamp(3px, 0.4vw, 7px); text-align:center;
  border-radius:clamp(8px, 0.9vw, 16px); position:relative; overflow:hidden; }
.kpi .v { font-family:'Orbitron'; font-weight:800; font-size:clamp(12px, 1.2vw, 20px);
  line-height:1; font-variant-numeric:tabular-nums; }
.kpi .k { font-size:clamp(7px, 0.6vw, 9px); font-weight:600; letter-spacing:.1em;
  color:var(--txt2); margin-top:clamp(2px, 0.3vw, 5px); }
.kpi.act { box-shadow:inset 0 0 0 1.5px var(--ac,var(--blue)),0 16px 46px -18px rgba(0,0,0,.6), inset 0 1px 0 var(--spec); }
.kpi.act .k { color:var(--txt); }
.c-grn .v { color:var(--green); } .c-amb .v { color:var(--orange); } .c-red .v { color:var(--red); }
.c-pur .v { color:var(--purple); } .c-blu .v { color:var(--blue); } .c-pnk .v { color:var(--pink); } .c-ink .v { color:var(--txt); }
.c-sky .v { color:var(--sky); }
.c-shock .v { color:var(--shock); }

/* stage */
.stage { flex:1; min-height:0; position:relative; }
.slide { position:absolute; inset:0; opacity:0; visibility:hidden; transform:scale(.99);
  transition:opacity .45s ease,transform .45s ease; display:flex; flex-direction:column; }
.slide.on { opacity:1; visibility:visible; transform:none; }
.stitle { display:flex; align-items:center; gap:12px; margin-bottom:clamp(6px,0.7vh,12px); }
.stitle .g { width:12px; height:12px; background:var(--ac,var(--green));
  clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); box-shadow:0 0 10px var(--ac,var(--green)); }
.stitle h2 { font-family:'Orbitron'; font-weight:800; letter-spacing:.1em; font-size:clamp(15px,1.6vw,22px); }
.stitle .ct { margin-left:auto; font-family:'Orbitron'; font-weight:700; font-size:13px; color:var(--ac,var(--green));
  padding:4px 11px; border-radius:100px; background:rgba(255,255,255,.06); border:1px solid var(--stroke); }

/* andamento — anéis + cartões */
/* Painel "Hoje na oficina" usa proporção do viewport — em ecrãs pequenos
   (Chromecast 1280×720) não come metade da tela. */
.andamento { flex:1; min-height:0; display:grid;
  grid-template-columns:clamp(200px, 17vw, 320px) 1fr; gap:clamp(6px, 0.8vw, 14px); isolation:isolate; }
.ringspanel { padding:clamp(10px, 1.1vw, 18px) clamp(12px, 1.2vw, 20px); display:flex; flex-direction:column; gap:clamp(6px, 0.7vw, 12px); min-width:0; }
/* Cabeçalho com logo mascote */
.rhead { display:flex; align-items:center; gap:10px; padding-bottom:clamp(8px,0.8vh,14px); border-bottom:1px solid var(--stroke); }
.rlogo { width:clamp(42px,4.5vw,60px); height:clamp(42px,4.5vw,60px); flex:none; border-radius:14px; overflow:hidden; position:relative;
  background:linear-gradient(160deg,rgba(255,107,107,0.20),rgba(255,69,58,0.10));
  border:1px solid rgba(255,107,107,0.35);
  box-shadow:0 8px 22px -8px var(--red), inset 0 1px 0 rgba(255,255,255,.2); }
.rlogo img { width:100%; height:100%; object-fit:contain;
  mix-blend-mode:multiply; filter:brightness(1.45) contrast(1.15) drop-shadow(0 0 6px rgba(255,69,58,0.4)); }
.ringspanel .rt { font-family:'Orbitron'; font-size:clamp(13px,1.3vw,17px); font-weight:800; letter-spacing:.06em; line-height:1.1; }
.ringspanel .rts { font-size:11px; font-weight:600; color:var(--txt3); letter-spacing:.14em; margin-top:3px; }
.ringspanel .rmid { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(8px,1vw,16px); overflow:visible; min-width:0; min-height:0; }
.ringwrap { width:clamp(100px, 10vw, 170px); height:clamp(100px, 10vw, 170px); position:relative; flex:none; padding:8px; box-sizing:content-box; }
.ringwrap svg { width:100%; height:100%; overflow:visible; }
.ringwrap svg { transform:rotate(-90deg); }
.rleg { display:flex; flex-direction:row; flex-wrap:wrap; justify-content:center; gap:clamp(8px,1.2vw,18px); min-width:0; }
.lg { display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; }
.lg .dot { width:8px; height:8px; border-radius:50%; box-shadow:0 0 8px currentColor; flex:none; margin-bottom:2px; }
.lg b { display:block; font-size:clamp(16px,1.6vw,22px); font-weight:800; line-height:1; font-variant-numeric:tabular-nums; white-space:nowrap; text-align:center; }
.lg span { font-size:clamp(9px,0.8vw,10px); color:var(--txt2); font-weight:600; text-align:center; letter-spacing:.04em; text-transform:uppercase; }
/* Bloco KPIs extra — 4 colunas */
.rkpis { display:grid; grid-template-columns:repeat(2,1fr); gap:clamp(4px,0.5vw,8px); padding-top:clamp(6px,0.7vh,12px);
  border-top:1px solid var(--stroke); min-width:0; }
.rkpis > div { display:flex; flex-direction:column; gap:2px; padding:clamp(5px,0.6vw,9px) clamp(4px,0.5vw,8px); border-radius:10px;
  background:rgba(255,255,255,.04); text-align:center; min-width:0; }
.rkpis b { font-family:'Orbitron'; font-size:clamp(13px,1.3vw,19px); font-weight:800; line-height:1;
  font-variant-numeric:tabular-nums; white-space:nowrap; }
.rkpis b i { font-style:normal; font-size:clamp(10px,1vw,13px); color:var(--txt2); margin-left:1px; }
.rkpis span { font-size:clamp(8px,0.7vw,9.5px); font-weight:600; color:var(--txt3); letter-spacing:.06em; text-transform:uppercase; line-height:1.2; word-break:break-word; }
/* Colunas adaptativas: cada card nunca fica mais estreito que 330px; com poucos
   cards alargam, com muitos quebram em mais colunas. Garante espaço p/ o NS. */
/* Cards: minimo reduzido para caber 3 colunas mesmo em viewports menores */
.cards { display:grid;
  grid-template-columns:repeat(auto-fill, minmax(clamp(280px, 24vw, 420px), 1fr));
  grid-auto-rows:auto;
  gap:clamp(6px, 0.8vw, 12px);
  align-content:start;
  overflow-y:auto; overflow-x:hidden;
  min-height:0; height:100%; }

/* CARDS — denso, sem espaço morto, com timer regressivo destacado */
/* Card: blocos distribuídos (space-between) para preencher a altura sem
   void. NS/modelo/timer ficam agrupados em .mid e nunca encolhem/cortam. */
.card { padding:clamp(10px,1.2vh,18px) clamp(12px,1.2vw,20px);
  display:flex; flex-direction:column;
  min-height:clamp(160px,22vh,280px);
  position:relative; overflow:hidden;
  border-radius:clamp(14px,1.4vw,24px); --st:var(--green);
  gap:clamp(6px,0.8vh,12px); justify-content:space-between; }
/* Faixa de tipo (NTS/RECON/ACP) no topo do card */
.card .typestrip { position:absolute; top:0; left:0; right:0; height:4px;
  background:var(--type,var(--teal)); box-shadow:0 0 12px var(--type,var(--teal)); }
.card .mid { flex:none; display:flex; flex-direction:column; gap:clamp(5px,0.6vh,12px); }
.card .top { display:flex; align-items:flex-start; gap:8px; flex:none; flex-wrap:wrap; }
.badges { display:flex; gap:6px; flex-wrap:wrap; }
.bdg { font-size:9.5px; font-weight:700; padding:3px 8px; border-radius:100px; letter-spacing:.04em; }
.bdg.type { font-size:11px; font-weight:800; padding:4px 11px; letter-spacing:.1em;
  color:var(--type,var(--teal)); background:rgba(255,255,255,.04);
  border:1px solid var(--type,var(--teal)); }
.bdg.run { color:var(--green); background:rgba(52,199,89,.18); }
.bdg.run i { font-style:normal; }
.bdg.paused { color:var(--orange); background:rgba(255,159,10,.18); }
.bdg.idle { color:var(--txt2); background:rgba(255,255,255,.06); }
.bdg.prio { color:#160d00; background:var(--orange); font-weight:800; }
.bdg.tier { color:var(--purple); background:rgba(191,90,242,.16); }
.bdg.over { color:#fff; background:var(--red); font-weight:800;
  animation:bdgPulse 1.4s ease-in-out infinite; }
@keyframes bdgPulse { 50% { opacity:.5; } }
/* Anel de progresso (continua a usar conic-gradient) */
.cring { margin-left:auto; width:clamp(52px,5.5vw,84px); height:clamp(52px,5.5vw,84px); border-radius:50%; flex:none; position:relative;
  background:conic-gradient(var(--st) calc(var(--p,0)*1%),rgba(255,255,255,.08) 0); }
.cring::before { content:''; position:absolute; inset:5px; border-radius:50%;
  background:rgba(8,9,14,.78); backdrop-filter:blur(6px); }
.cring .cc { position:absolute; inset:0; display:grid; place-content:center; text-align:center; z-index:1; line-height:1.05; }
.cring .cc b { font-size:11px; font-weight:800; font-variant-numeric:tabular-nums;
  color:var(--st); display:block; letter-spacing:.04em; }
.cring .cc span { font-size:8px; color:var(--txt3); font-weight:600; margin-top:3px; letter-spacing:.06em; }
/* Bloco central — NS gigante, modelo, técnico */
.card .central { display:flex; flex-direction:column; gap:4px; }
/* NS nunca corta: fonte vem inline (adaptativa) e o texto pode quebrar */
.card .ns { font-family:'Orbitron'; font-weight:800; letter-spacing:.02em; line-height:1.04;
  word-break:break-word; overflow-wrap:anywhere; flex-shrink:0; }
.card .ns small { font-size:.55em; color:var(--txt2); font-weight:700; }
.card .mo { font-size:clamp(11px,1.1vw,14px); color:var(--txt2); font-weight:500;
  word-break:break-word; overflow-wrap:anywhere; line-height:1.2; }
.card .tech { font-size:11px; color:var(--txt3); font-weight:600; letter-spacing:.05em;
  display:flex; align-items:center; gap:6px; }
.card .tech b { color:var(--teal); font-weight:700; }
/* Timer regressivo — protagonista */
.card .timer { display:flex; align-items:baseline; justify-content:space-between; gap:8px;
  padding:clamp(6px,0.7vh,10px) clamp(8px,0.9vw,12px); border-radius:12px; background:rgba(255,255,255,.04);
  border:1px solid var(--stroke); }
.card .timer .lbl { font-size:10px; font-weight:700; color:var(--txt3); letter-spacing:.16em; }
/* Timer secundário ao NS — fica menor para o NS ser sempre o protagonista */
.card .timer .val { font-family:'Orbitron'; font-weight:800; font-size:clamp(16px,1.8vw,22px); letter-spacing:.04em;
  font-variant-numeric:tabular-nums; color:var(--st);
  text-shadow:0 0 10px var(--st); }
.card .timer .meta { font-size:11px; color:var(--txt2); font-weight:600; letter-spacing:.06em;
  font-variant-numeric:tabular-nums; }
.card .timer.late .val { color:var(--red); text-shadow:0 0 14px var(--red); }
/* Lista de tarefas — ELEMENTO FLEXÍVEL: cresce para encher o espaço livre.
   É o único que pode desaparecer (overflow:hidden) quando falta espaço;
   NS/modelo/timer/datas ficam sempre intactos. */
.card .tasks { flex:1; min-height:0; display:flex; flex-direction:column;
  gap:clamp(3px,0.4vh,6px);
  overflow:hidden; align-content:flex-start; }
.card .tasklbl { font-size:10px; font-weight:700; letter-spacing:.14em; color:var(--txt3);
  text-transform:uppercase; flex:none; }
.card .tk { display:flex; align-items:center; gap:6px; flex:none;
  font-size:clamp(11px,1vw,13px); font-weight:500; color:#dfe2ea;
  background:rgba(255,255,255,.05); padding:clamp(3px,0.4vh,5px) clamp(8px,0.9vw,11px); border-radius:8px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card .tk .icon { flex:none; font-size:11px; color:var(--st); }
.card .tk.done { color:var(--txt2); }
.card .tk.done .txt { text-decoration:line-through; text-decoration-color:rgba(255,255,255,.3); }
.card .tk.done .icon { color:var(--green); }
.card .tk .txt { overflow:hidden; text-overflow:ellipsis; }
.card .dates { display:flex; gap:10px; font-size:clamp(10px,0.9vw,12px); font-weight:600; color:var(--txt2);
  font-variant-numeric:tabular-nums; padding-top:clamp(5px,0.6vh,8px); flex:none;
  border-top:1px solid var(--stroke); }
.card .dates b { color:var(--teal); }
.card .dates .e b { color:var(--green); }
.card .empty { margin-top:auto; padding-top:10px; font-size:11px; color:var(--txt3); font-weight:500;
  border-top:1px solid var(--stroke); }

/* grupos (standby) */
.groups { flex:1; min-height:0; display:grid; grid-template-columns:repeat(4,1fr); gap:clamp(8px, 1vw, 14px); }
.grp { display:flex; flex-direction:column; padding:0; overflow:hidden; }
.gh { display:flex; align-items:center; gap:8px; padding:14px 18px; font-size:12.5px; font-weight:700;
  letter-spacing:.04em; border-bottom:1px solid var(--stroke); }
.gh .gi { color:var(--st); }
.gh .gn { margin-left:auto; font-family:'Orbitron'; color:var(--st); }
.gb { padding:14px; display:flex; flex-direction:column; gap:12px; overflow:hidden; min-height:0; }
.box { padding:14px 15px; border-radius:18px; background:rgba(255,255,255,.05); border-left:3px solid var(--st); }
.box .bn { font-family:'Orbitron'; font-weight:700; font-size:18px; line-height:1.05;
  word-break:break-word; overflow-wrap:anywhere; }
.box .bm { font-size:11px; color:var(--txt2); margin:3px 0 6px; }
.box .bt { float:right; font-family:'Orbitron'; font-weight:700; color:var(--orange); }
.box .bnote { font-size:11.5px; color:#cfd3dc; clear:both; }
.gempty { padding:16px; font-size:11px; color:var(--txt3); text-align:center; }

/* gantt */
.gantt { flex:1; min-height:0; padding:clamp(12px, 1.4vw, 22px) clamp(14px, 1.5vw, 26px); display:flex; flex-direction:column; }
.gsc { display:grid; grid-template-columns:200px repeat(15,1fr); border-bottom:1px solid var(--stroke); padding-bottom:6px; }
.gsc .d { text-align:center; font-size:10px; color:var(--txt2); }
.gsc .d b { display:block; font-size:13px; font-weight:700; }
.gsc .d.now, .gsc .d.now b { color:var(--red); }
.grows { position:relative; flex:1; padding-top:10px; overflow:hidden; }
.gnow { position:absolute; top:0; bottom:0; width:2px; background:var(--red); box-shadow:0 0 10px var(--red); z-index:3; }
.grow { display:grid; grid-template-columns:200px repeat(15,1fr); align-items:center; height:38px; margin-bottom:5px; }
.grow .l { font-size:11px; color:#cfd3dc; line-height:1.1; word-break:break-word; overflow-wrap:anywhere; padding-right:10px; }
.gb2 { height:22px; border-radius:100px; display:flex; align-items:center; padding:0 13px; font-size:11px; font-weight:700;
  color:#06070c; white-space:nowrap; overflow:hidden; }
.gb2.run { background:var(--green); }
.gb2.over { background:var(--red); color:#fff; }
.gb2.fila { background:rgba(255,255,255,.12); color:var(--txt2); }

/* próximas */
.week { flex:1; min-height:0; display:grid; grid-template-columns:repeat(5,1fr); gap:clamp(6px, 0.8vw, 12px); }
.day { display:flex; flex-direction:column; overflow:hidden; }
.dh { display:flex; justify-content:space-between; padding:12px 15px; font-size:12px; font-weight:700;
  letter-spacing:.04em; border-bottom:1px solid var(--stroke); }
.dh.now { color:var(--teal); }
.dh .dd { color:var(--txt2); }
.db { padding:12px; display:flex; flex-direction:column; gap:10px; overflow:hidden; min-height:0; }
.mini { padding:11px 13px; border-radius:16px; background:rgba(255,255,255,.05); border-left:3px solid var(--st,var(--blue)); }
.mini .mn { font-family:'Orbitron'; font-weight:700; font-size:15px; line-height:1.05;
  word-break:break-word; overflow-wrap:anywhere; }
.mini .mm { font-size:10px; color:var(--txt2); margin:2px 0 4px; }
.mini .mh { font-size:11px; color:var(--orange); font-weight:600; }

/* nts (simplificado — só campos que existem) */
.ntsgrid { flex:1; min-height:0; display:grid; grid-template-columns:1fr 1fr; gap:clamp(8px, 1vw, 16px); overflow:hidden; }
.ntc { padding:22px 24px; display:flex; flex-direction:column; gap:14px; border:1px solid rgba(255,69,58,.3); overflow:hidden; min-height:0; }
.ntc::before { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:radial-gradient(110% 70% at 85% 0%,rgba(255,69,58,.12),transparent 55%); }
.ntc .nn { font-family:'Orbitron'; font-weight:800; line-height:1.04;
  word-break:break-word; overflow-wrap:anywhere; }
.ntc .nn small { font-size:.6em; color:var(--txt2); }
.ntc .nm { font-size:20px; font-weight:600; color:var(--txt2); margin-top:2px; letter-spacing:.02em; }
.ntc .nwhy { background:rgba(255,69,58,.1); color:#FFD9D6; border-radius:14px; padding:11px 14px;
  font-size:13px; font-weight:500; line-height:1.5;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.ntc .ntm { display:flex; align-items:center; gap:16px; padding:12px 14px; background:rgba(255,255,255,.05); border-radius:14px; }
.ntc .ntm .tl { font-family:'Orbitron'; font-weight:800; font-size:22px; color:var(--orange); font-variant-numeric:tabular-nums; }
.ntc .ntm .meta { font-size:11px; color:var(--txt2); }
.ntc .ntags { display:flex; flex-wrap:wrap; gap:6px; }
.ntc .ntags .t { font-size:11px; font-weight:500; padding:4px 10px; border-radius:8px; background:rgba(255,255,255,.06); color:#dfe2ea; }
.ntc .ntags .t.done { background:rgba(52,199,89,.14); color:var(--green); text-decoration:line-through; }
.ntc .nhead { display:flex; flex-direction:column; gap:4px; }
.ntc .nhead .nn { font-family:'Orbitron'; font-weight:800; line-height:1.04; word-break:break-word; overflow-wrap:anywhere; }
.ntc .nhead .nm { font-size:13px; font-weight:500; color:var(--txt2); }
.ntc .ntm { display:flex; align-items:center; gap:12px; padding:14px; background:rgba(255,69,58,.08); border-radius:12px; border:1px solid rgba(255,69,58,.15); }
.ntc .ntm svg { flex-shrink:0; }
.ntc .ntmdata { display:flex; flex-direction:column; gap:2px; }
.ntc .ntmdata .tl { font-family:'Orbitron'; font-weight:800; font-size:20px; color:var(--red); }
.ntc .ntmdata .meta { font-size:10px; color:var(--txt2); }
.ntc .nover { position:absolute; top:12px; right:14px; padding:"3px 8px"; border-radius:100px; background:var(--red); color:#fff; font-size:9px; font-weight:800; letter-spacing:.05em; }
.ntc .ng { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:auto; }
.ntc .gi { background:rgba(255,255,255,.05); border-radius:13px; padding:11px 12px; }
.ntc .gi .k { font-size:10px; color:var(--txt2); font-weight:600; letter-spacing:.04em; }
.ntc .gi .v { font-size:15px; font-weight:700; margin-top:3px; }
.gi .v.amb { color:var(--orange); } .gi .v.red { color:var(--red); } .gi .v.grn { color:var(--green); }

/* recon — secções que preenchem todo o espaço vertical */
.recon { flex:1; min-height:0; display:flex; flex-direction:column;
  gap:clamp(5px, 0.6vw, 10px); overflow:hidden;
  padding:clamp(8px, 1vw, 14px) clamp(10px, 1.2vw, 18px); }
.rsec { display:flex; flex-direction:column; gap:clamp(4px,0.5vh,8px); min-height:0; overflow:hidden; flex-shrink:0; }
.rsec-grow { flex:1; height:0; overflow:hidden; display:flex; flex-direction:column; gap:clamp(4px,0.5vh,8px); } /* PRÓXIMAS cresce: height:0+flex:1 força containment correcto */
.rs { font-size:clamp(9px,0.85vw,12px); font-weight:700; letter-spacing:.08em; color:var(--txt2); display:flex; align-items:center; gap:8px; flex-shrink:0; line-height:1; }
.rs b { color:var(--purple); font-family:'Orbitron'; font-size:clamp(12px,1.1vw,15px); }
.rs::after { content:''; flex:1; height:1px; background:var(--stroke); }
.rg { display:grid; gap:clamp(5px,0.6vw,11px); }
.rg-active { grid-auto-rows:minmax(0,1fr); height:clamp(84px, 11vh, 130px); overflow:hidden; flex-shrink:0; }
.rg-next { flex:1; height:0; min-height:0; grid-auto-rows:minmax(clamp(52px,7vh,76px), auto); overflow-y:auto; overflow-x:hidden; align-content:start; }
.rt2 { padding:clamp(8px,0.9vh,12px) clamp(10px,1vw,16px); border-radius:14px; border-top:3px solid var(--purple); background:rgba(255,255,255,.05);
  display:flex; flex-direction:column; justify-content:center; gap:clamp(3px,0.4vh,6px); min-height:0; overflow:hidden; }
.rt2.run { border-top-color:var(--green); }
.rt2.paus { border-top-color:var(--orange); }
.rt2 .t { font-size:11px; font-weight:800; color:var(--purple); letter-spacing:.1em; flex:none; }
.rt2.run .t { color:var(--green); } .rt2.paus .t { color:var(--orange); }
/* NS — protagonista, numa só linha; fonte adaptativa vem inline */
.rt2 .n { font-family:'Orbitron'; font-weight:800; line-height:1; color:#fff;
  white-space:nowrap; flex:none; overflow:hidden; text-overflow:ellipsis; }
.rt2 .m { font-size:clamp(10px,0.9vw,13px); color:var(--txt2); display:flex; justify-content:space-between; gap:6px; align-items:baseline; flex:none; }
.rt2 .m span:first-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rt2 .m .h { color:var(--orange); font-variant-numeric:tabular-nums; font-weight:700; flex:none; }
.rdone { display:flex; gap:5px; flex-wrap:wrap; max-height:clamp(58px,8vh,96px); overflow:hidden; align-content:flex-start; flex-shrink:0; }
.rchip { padding:5px 10px; border-radius:10px; background:rgba(52,199,89,.1); border:1px solid rgba(52,199,89,.26);
  font-size:clamp(10px,0.9vw,11.5px); font-weight:600; color:var(--green); white-space:nowrap; }
.rchip b { color:#cfd3dc; font-weight:600; margin-left:5px; }

/* concluídas */
.donec { flex:1; min-height:0; display:grid;
  gap:clamp(4px, 0.5vw, 8px); overflow:hidden; align-content:start; }
/* Card concluída — tema azul claro, NS protagonista, tipo + tarefas feitas */
.dc { padding:16px 20px; display:flex; flex-direction:column; gap:10px; overflow:hidden;
  border:1px solid rgba(125,211,252,.28); position:relative; }
.dc .dctop { display:flex; align-items:center; gap:10px; }
.dc .ck { width:40px; height:40px; border-radius:50%; background:var(--sky); display:grid; place-items:center;
  font-size:20px; color:#06121c; flex:none; font-weight:900; box-shadow:0 0 16px rgba(125,211,252,.4); }
.dc .badges { display:flex; gap:6px; flex-wrap:wrap; }
.dc .bdg { font-size:10px; font-weight:800; padding:3px 9px; border-radius:100px; letter-spacing:.08em; }
.dc .bdg.type { color:var(--type,var(--sky)); background:rgba(255,255,255,.04); border:1px solid var(--type,var(--sky)); }
.dc .bdg.tier { color:var(--purple); background:rgba(191,90,242,.16); }
.dc .dt { margin-left:auto; text-align:right; flex:none; }
.dc .dt b { font-family:'Orbitron'; font-weight:800; font-size:20px; color:var(--sky); font-variant-numeric:tabular-nums; }
.dc .dt span { display:block; font-size:11px; color:var(--txt2); }
.dc .dcmid { display:flex; flex-direction:column; gap:3px; }
.dc .dn { font-family:'Orbitron'; font-weight:800; line-height:1.04; color:#E3F4FF;
  word-break:break-word; overflow-wrap:anywhere; }
.dc .dm { font-size:16px; font-weight:600; color:var(--txt2);
  word-break:break-word; overflow-wrap:anywhere; line-height:1.2; }
.dc .dtasks { display:flex; flex-wrap:wrap; gap:5px; margin-top:auto; }
.dc .dtasks .tk { font-size:11px; font-weight:500; padding:3px 9px; border-radius:8px;
  background:rgba(125,211,252,.1); color:#BEE6FB; border:1px solid rgba(125,211,252,.22);
  display:inline-flex; align-items:center; gap:5px; max-width:100%;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dc .dtasks .tk::before { content:'✓'; color:var(--sky); font-weight:800; }
.dc .dtasks .more { font-size:11px; color:var(--txt3); font-weight:600; align-self:center; }

/* footer */
.foot { display:flex; align-items:center; gap:18px; font-size:10.5px; color:var(--txt3); font-weight:500; letter-spacing:.06em; }
.foot .lab { color:var(--txt2); font-family:'Orbitron'; font-weight:700; letter-spacing:.1em; }
.foot .prog { position:relative; flex:none; width:120px; height:3px; background:rgba(255,255,255,.08); border-radius:2px; overflow:hidden; }
.foot .prog > div { height:100%; background:var(--red); box-shadow:0 0 10px rgba(255,51,68,.6); transition:width .1s linear; }
.pips { display:flex; gap:6px; margin-left:auto; }
.pip { width:20px; height:5px; border-radius:3px; background:rgba(255,255,255,.18); transition:.3s; }
.pip.on { background:var(--red); width:30px; box-shadow:0 0 12px rgba(255,51,68,.7); }
.org { font-family:'Orbitron'; font-weight:700; letter-spacing:.06em; color:var(--txt2); }
.org em { color:var(--red); font-style:normal; }

@media (prefers-reduced-motion:reduce) { .glassnoir-root *, .glassnoir-root *::before, .glassnoir-root *::after { animation:none!important; transition:none!important; } }
`;

// ── CSS tema Stark Light (Iron Apple — claro, dourado, arc reactor) ──────────

// ── Card de máquina (usado em ANDAMENTO e PRIORITÁRIAS) ─────────────────────
// Layout denso: tipo (NTS/RECON/ACP) em destaque, NS gigante, timer REGRESSIVO,
// meta, técnico, tarefa activa, datas. Sem espaço morto.
function MachineCard({ m }) {
  const elapsed = useLiveTimer(m);
  const meta    = Number(m.tempo_estimado_segundos) || 0;
  const ratio   = meta > 0 ? elapsed / meta : 0;
  const restante = meta > 0 ? meta - elapsed : null; // ← TIMER REGRESSIVO
  const isLate  = restante !== null && restante < 0;
  const st      = isLate ? "var(--red)" : ratio >= 0.9 ? "var(--orange)" : "var(--green)";
  const run     = m.timer_status === "running";
  const paused  = m.timer_status?.startsWith("paused");
  const tier    = tierRecon(m);
  const ns      = nsSplit(m.serie);
  // Tarefas reais (ignora marcadores) — pendentes primeiro, depois as feitas
  const RESERVED = new Set(["EXPRESS", "VPS", "IMPREVISTOS"]);
  const allTasks = (m.tarefas || []).filter(t => (t.texto || "").trim() && !RESERVED.has((t.texto || "").trim()));
  const tasks    = [...allTasks.filter(t => !t.concluida), ...allTasks.filter(t => t.concluida)];
  const over    = isOverdue(m);
  const cringP  = Math.min(100, Math.max(0, ratio * 100));
  const metaH   = meta > 0 ? (() => {
    const h = Math.floor(meta / 3600), mn = Math.floor((meta % 3600) / 60);
    return mn === 0 ? `${h}h` : `${h}h${String(mn).padStart(2,"0")}`;
  })() : "—";
  const tipo    = tipoIntervencao(m);

  // Sinal +/- no timer regressivo
  const timerLabel = restante !== null
    ? (isLate ? `+${fmtHMS(-restante)}` : fmtHMS(restante))
    : fmtHMS(elapsed);

  return (
    <div className="card glass"
         style={{ "--st": st, "--p": cringP, "--type": tipo.color }}>
      <span className="typestrip" />

      {/* TOPO: badges + anel de progresso */}
      <div className="top">
        <div className="badges">
          <span className="bdg type">{tipo.label}</span>
          {tier && <span className="bdg tier">{tier}</span>}
          {run    && <span className="bdg run"><i>● </i>RUN</span>}
          {paused && <span className="bdg paused">PAUSADO</span>}
          {!run && !paused && <span className="bdg idle">IDLE</span>}
          {m.prioridade && <span className="bdg prio">⚡ PRIO</span>}
          {over && <span className="bdg over">ATRASADA</span>}
        </div>
        {meta > 0 && (
          <div className="cring">
            <div className="cc">
              <b>{isLate ? "⚠︎" : `${Math.round(Math.min(ratio, 1) * 100)}%`}</b>
              <span>{isLate ? "ATRASO" : "concluído"}</span>
            </div>
          </div>
        )}
      </div>

      {/* GRUPO CENTRAL: NS + modelo + timer (mantêm-se juntos e intactos) */}
      <div className="mid">
        <div className="central">
          <div className="ns" style={{ fontSize: nsFontSize(ns.main, 36, 22) + "px" }}>{ns.main}{ns.sub && <small> · {ns.sub}</small>}</div>
          <div className="mo">{m.modelo || "—"}</div>
        </div>
        {meta > 0 && (
          <div className={`timer${isLate ? " late" : ""}`}>
            <div>
              <div className="lbl">{isLate ? "ATRASO" : "RESTANTE"}</div>
              <div className="val">{timerLabel}</div>
            </div>
            <div className="meta">meta {metaH}</div>
          </div>
        )}
        {meta === 0 && (
          <div className="timer">
            <div>
              <div className="lbl">DECORRIDO</div>
              <div className="val" style={{ color: "var(--teal)" }}>{fmtHMS(elapsed)}</div>
            </div>
            <div className="meta">sem meta</div>
          </div>
        )}
      </div>

      {/* TAREFAS — preenchem o espaço livre; cortadas (não quebram o card) se faltar espaço */}
      {tasks.length > 0 && (
        <div className="tasks">
          <span className="tasklbl">Tarefas · {tasks.length}</span>
          {tasks.map((t, i) => (
            <div key={i} className={`tk${t.concluida ? " done" : ""}`}>
              <span className="icon">{t.concluida ? "✓" : "▸"}</span>
              <span className="txt">{t.texto}</span>
            </div>
          ))}
        </div>
      )}

      {/* DATAS */}
      {(m.previsao_inicio || m.previsao_fim) ? (
        <div className="dates">
          {m.previsao_inicio && <span>início <b>{fmtDateShort(m.previsao_inicio)}</b></span>}
          {m.previsao_fim    && <span className="e">entrega <b>{fmtDateShort(m.previsao_fim)}</b></span>}
        </div>
      ) : <div className="empty">— sem previsão definida —</div>}
    </div>
  );
}

// ── Slide: EM ANDAMENTO ─────────────────────────────────────────────────────
function SlideAndamento({ andamento, conHoje, conSemana, totalCon, avgH, machines, standby, prioritarias }) {
  // Stats reais (sem inventar campos)
  const emCurso      = andamento.length;
  const concHoje     = conHoje.length;
  const concSemana   = (conSemana || []).length;
  const emPausa      = standby.length;
  const emPrio       = prioritarias.length;
  const emAndOverdue = andamento.filter(isOverdue).length;
  const noPrazoPct   = emCurso > 0 ? Math.round((1 - emAndOverdue / emCurso) * 100) : 100;
  // Anéis: 3 métricas reais
  const ringMax = Math.max(emCurso + concSemana, 1);
  const rings = [
    { r: 86, c: "var(--sky)",    p: concSemana / Math.max(concSemana + emCurso, 1) },
    { r: 64, c: "var(--dgreen)", p: noPrazoPct / 100 },
    { r: 42, c: "var(--orange)", p: Math.min(1, emCurso / 8) },
  ];
  return (
    <div className="andamento">
      <div className="ringspanel glass">
        {/* Logo do mascote como brasão no topo do painel */}
        <div className="rhead">
          <div className="rlogo">
            <img src={JORDAN_URL} alt="" />
          </div>
          <div>
            <div className="rt">Hoje em oficina</div>
          </div>
        </div>
        <div className="rmid">
          <div className="ringwrap">
            <svg width="100%" height="100%" viewBox="0 0 200 200" style={{overflow:"visible"}}>
              {rings.map(({ r, c, p }, i) => {
                const C = 2 * Math.PI * r;
                return (
                  <g key={i}>
                    <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
                    <circle cx="100" cy="100" r={r} fill="none" stroke={c} strokeWidth="14" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - p)}
                      style={{ filter: `drop-shadow(0 0 8px ${c}) drop-shadow(0 0 16px ${c})` }} />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="rleg">
            <div className="lg" style={{ color: "var(--sky)" }}>
              <span className="dot" /><div><b>{concSemana}</b><span>Esta semana</span></div>
            </div>
            <div className="lg" style={{ color: "var(--dgreen)" }}>
              <span className="dot" /><div><b>{noPrazoPct}%</b><span>No prazo</span></div>
            </div>
            <div className="lg" style={{ color: "var(--orange)" }}>
              <span className="dot" /><div><b>{emCurso}</b><span>Em curso</span></div>
            </div>
          </div>
        </div>
        {/* KPIs extra dentro do painel — mais informação real, sem inventar */}
        <div className="rkpis">
          <div><b>{emPausa}</b><span>Pausadas</span></div>
          <div><b>{emPrio}</b><span>Prioritárias</span></div>
          <div><b>{avgH}<i>h</i></b><span>Média/máq</span></div>
          <div><b style={{ color: "var(--shock)" }}>{totalCon.length}</b><span>Total 2026</span></div>
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
      <div className="cards">
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
  const deltaLbl = meta > 0 ? (deltaSec > 0 ? `+${fmtHMS(deltaSec)}` : `${fmtHMS(-deltaSec)}`) : "—";
  const deltaCls = meta > 0 ? (deltaSec > 0 ? "red" : "grn") : "";

  return (
    <div className="ntc glass">
      {/* Topo — Série + Modelo */}
      <div className="nhead">
        <div className="nn" style={{ fontSize: nsFontSize(ns.main, 48, 30) + "px" }}>{ns.main}{ns.sub && <small> · {ns.sub}</small>}</div>
        <div className="nm">{m.modelo || "—"}</div>
      </div>
      
      {/* Observações — se existem */}
      {m.observacoes && <div className="nwhy">{m.observacoes}</div>}
      
      {/* Timer + Meta */}
      <div className="ntm">
        <svg width="48" height="48" viewBox="0 0 48 48" style={{flexShrink:0}}>
          <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,69,58,.1)" strokeWidth="2"/>
          <circle cx="24" cy="24" r="22" fill="none" stroke="var(--red)" strokeWidth="2" 
            strokeDasharray={`${(elapsed/meta)*138.2} 138.2`} strokeLinecap="round" style={{transform:"rotate(-90deg)", transformOrigin:"24px 24px"}}/>
          <text x="24" y="26" textAnchor="middle" fill="var(--red)" fontSize="10" fontWeight="800" fontFamily="Orbitron">⚛</text>
        </svg>
        <div className="ntmdata">
          <div className="tl">{fmtHMS(elapsed)}</div>
          <div className="meta">{meta > 0 ? `de ${Math.round(meta/3600)}h` : "—"}</div>
        </div>
      </div>
      
      {/* Tarefas */}
      {tasks.length > 0 && (
        <div className="ntags">
          {tasks.slice(0, 8).map((t, i) => (
            <span key={i} className={`t${t.concluida ? " done" : ""}`}>{t.texto}</span>
          ))}
        </div>
      )}
      
      {/* Grid KPIs */}
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
      
      {over && <div className="nover">ATRASADA</div>}
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
  // Espelha o AoVivo principal: "EM ANDAMENTO" = só running/paused.
  // As em-preparação IDLE caem para "PRÓXIMAS" junto com as a-fazer.
  const reconActive  = reconAnd.filter(m => m.timer_status === "running" || m.timer_status?.startsWith("paused"));
  const reconWaiting = [...reconAnd.filter(m => !(m.timer_status === "running" || m.timer_status?.startsWith("paused"))), ...reconAF];
  const nNext = reconWaiting.length;
  // Colunas das PRÓXIMAS: largas o suficiente para o NS caber numa só linha.
  const nextCols = nNext <= 3 ? (nNext || 1) : nNext <= 8 ? 4 : 5;
  return (
    <div className="recon glass">
      {/* EM ANDAMENTO */}
      <div className="rsec">
        <div className="rs">⚡ EM ANDAMENTO <b>{reconActive.length}</b></div>
        <div className="rg rg-active" style={{ gridTemplateColumns: `repeat(${Math.max(reconActive.length, 1)}, 1fr)` }}>
          {reconActive.length === 0
            ? <div style={{ color: "var(--txt3)", fontSize: 13, padding: 8, alignSelf: "center" }}>Nenhuma em curso</div>
            : reconActive.slice(0, 4).map(m => {
              const elapsed = (Number(m.timer_accumulated_seconds) || 0);
              const run = m.timer_status === "running";
              const paus = m.timer_status?.startsWith("paused");
              const cls = run ? "run" : paus ? "paus" : "";
              const tier = tierRecon(m);
              return (
                <div key={m.id} className={`rt2 ${cls}`}>
                  <div className="t">{run ? "EM CURSO" : paus ? "PAUSED" : "IDLE"}{tier ? ` · ${tier}` : ""}</div>
                  <div className="n" style={{ fontSize: nsFontSize(nsSplit(m.serie).main, 30, 18) + "px" }}>{nsSplit(m.serie).main}</div>
                  <div className="m"><span>{m.modelo}</span><span className="h">⏱ {fmtHMS(elapsed)}</span></div>
                </div>
              );
            })}
        </div>
      </div>

      {/* PRÓXIMAS — ocupa o espaço restante */}
      <div className="rsec rsec-grow">
        <div className="rs">⧖ PRÓXIMAS <b>{reconWaiting.length}</b></div>
        <div className="rg rg-next" style={{ gridTemplateColumns: `repeat(${nextCols}, 1fr)` }}>
          {reconWaiting.length === 0
            ? <div style={{ color: "var(--txt3)", fontSize: 13, padding: 8 }}>—</div>
            : reconWaiting.slice(0, 18).map(m => {
              const meta = Number(m.tempo_estimado_segundos) || 0;
              const h = meta > 0 ? `${Math.round(meta / 3600)}h` : "—";
              return (
                <div key={m.id} className="rt2">
                  <div className="t">{tierRecon(m) || "RECON"}</div>
                  <div className="n" style={{ fontSize: nsFontSize(nsSplit(m.serie).main, 22, 13) + "px" }}>{nsSplit(m.serie).main}</div>
                  <div className="m"><span>{m.modelo}</span><span className="h">{h}</span></div>
                </div>
              );
            })}
        </div>
      </div>

      {/* CONCLUÍDAS 30 DIAS */}
      <div className="rsec">
        <div className="rs">✓ CONCLUÍDAS · 30 DIAS <b>{reconCon.length}</b></div>
        <div className="rdone">
          {reconCon.length === 0
            ? <div style={{ color: "var(--txt3)", fontSize: 11 }}>—</div>
            : reconCon.slice(0, 10).map(m => (
              <div key={m.id} className="rchip">✓ {nsSplit(m.serie).main} <b>{m.modelo}{tierRecon(m) ? ` · ${tierRecon(m)}` : ""}</b></div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Slide: CONCLUÍDAS ───────────────────────────────────────────────────────
function SlideConcluidas({ conSemana }) {
  const n = conSemana.length;
  // Colunas: até 4 para poucos cards, mais colunas conforme cresce
  const cols = n <= 4 ? n || 1 : n <= 8 ? 4 : n <= 12 ? 4 : n <= 16 ? 4 : n <= 20 ? 5 : 6;
  // Escala do card: reduz padding/fonte conforme mais cards
  const compact = n > 12;
  const veryCompact = n > 20;
  return (
    <div className="donec" style={{
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridAutoRows: "1fr",
    }}>
      {conSemana.length === 0
        ? <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", color: "var(--txt3)", fontSize: 14 }}>Nada concluído esta semana</div>
        : conSemana.map(m => {
          const t = m.timer_accumulated_seconds ? fmtHMS(m.timer_accumulated_seconds) : "—";
          let ts = "—";
          if (m.dataConclusao) {
            try {
              const d = new Date(m.dataConclusao);
              ts = `${pad2(d.getDate())}/${pad2(d.getMonth()+1)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
            } catch { /* ignore */ }
          }
          const ns = nsSplit(m.serie);
          const tipo = tipoIntervencao(m);
          const tier = tierRecon(m);
          const RESERVED = new Set(["EXPRESS", "VPS", "IMPREVISTOS"]);
          const feitas = (m.tarefas || []).filter(tk => (tk.texto || "").trim() && !RESERVED.has((tk.texto || "").trim()));
          // Em modo muito compacto, esconde tarefas para ganhar espaço
          const showTasks = veryCompact ? [] : compact ? feitas.slice(0, 2) : feitas.slice(0, 4);
          const moreTasks = feitas.length - showTasks.length;
          const nsFz = veryCompact ? nsFontSize(ns.main, 18, 12) : compact ? nsFontSize(ns.main, 22, 14) : nsFontSize(ns.main, 30, 18);
          const pad = veryCompact ? "8px 10px" : compact ? "10px 14px" : "16px 20px";
          const gap = veryCompact ? "4px" : compact ? "6px" : "10px";
          return (
            <div key={m.id} className="dc glass" style={{ "--type": tipo.color, padding: pad, gap }}>
              <div className="dctop" style={{ gap: compact ? "6px" : "10px" }}>
                <div className="ck" style={compact ? { width: 28, height: 28, fontSize: 14 } : {}}>✓</div>
                <div className="badges">
                  <span className="bdg type" style={compact ? { fontSize: 9, padding: "2px 7px" } : {}}>{tipo.label}</span>
                  {tier && !veryCompact && <span className="bdg tier" style={compact ? { fontSize: 9 } : {}}>{tier}</span>}
                </div>
                {!veryCompact && (
                  <div className="dt">
                    <b style={compact ? { fontSize: 13 } : {}}>{t}</b>
                    <span>{ts}</span>
                  </div>
                )}
              </div>
              <div className="dcmid">
                <div className="dn" style={{ fontSize: nsFz + "px" }}>{ns.main}{ns.sub && <small style={{ fontSize: "0.6em", color: "var(--txt2)" }}> · {ns.sub}</small>}</div>
                {!veryCompact && <div className="dm" style={compact ? { fontSize: 12 } : {}}>{m.modelo || "—"}</div>}
              </div>
              {showTasks.length > 0 && (
                <div className="dtasks">
                  {showTasks.map((tk, i) => <span key={i} className="tk" style={{ fontSize: 10, padding: "2px 7px" }}>{tk.texto}</span>)}
                  {moreTasks > 0 && <span className="more">+{moreTasks}</span>}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function AoVivoGlassNoir({
  data, slide, prog, paused, SLIDES, next, prev, sPaused,
  cycleTheme, theme,
}) {
  const { machines, andamento, standby, prioritarias, proximas,
          ntsAnd, ntsAF, reconAnd, reconAF, reconCon,
          conSemana, totalCon, conHoje, avgH } = data;

  // Sem fit-to-screen — o #glassnoir-screen agora usa 100vw/100vh directos.
  // Mantemos um listener vazio para futuras adaptações de breakpoint.

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
    { v: conSemana.length,                   k: "ESTA SEMANA", c: "c-sky" },
    { v: conHoje.length,                     k: "HOJE",        c: "c-sky" },
    { v: avgH,                               k: "MÉD.H/MÁQ",   c: "c-ink" },
    { v: totalCon.length,                    k: "TOTAL 2026",  c: "c-shock" },
  ];

  const slideId    = SLIDES[slide]?.id;
  const slideLabel = SLIDES[slide]?.label;

  // Mapa slideId → cor de accent
  const SLIDE_ACCENT = {
    andamento: "var(--green)", standby: "var(--orange)", prioritarias: "var(--orange)",
    timeline: "var(--blue)", proximas: "var(--blue)", nts: "var(--red)",
    recon: "var(--purple)", concluidas: "var(--sky)",
  };

  return (
    <div className="glassnoir-root" data-theme={theme}>
      <style>{CSS_GLASSNOIR}</style>
      <div id="glassnoir-screen">
        <div className="mesh">
          <div className="blob b1" /><div className="blob b2" />
          <div className="blob b3" /><div className="blob b4" />
        </div>
        <div className="scan" />

        <div className="wrap">

          {/* CHROME */}
          <div className="chrome">
            <div className="wm">
              <div className="ic"><img src={JORDAN_URL} alt="" /></div>
              <div className="tt">WATCHER</div>
              <div className="tt2">OFICINA</div>
            </div>
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
            <section className={`slide${slideId === "andamento" ? " on" : ""}`} style={{ "--ac": "var(--green)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>EM ANDAMENTO</h2><span className="ct">×{pad2(andamento.length)}</span></div>
              <SlideAndamento andamento={andamento} conHoje={conHoje} conSemana={conSemana} totalCon={totalCon} avgH={avgH} machines={machines} standby={standby} prioritarias={prioritarias} />
            </section>

            <section className={`slide${slideId === "standby" ? " on" : ""}`} style={{ "--ac": "var(--orange)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>STANDBY</h2><span className="ct">×{pad2(standby.length)}</span></div>
              <SlideStandby standby={standby} />
            </section>

            <section className={`slide${slideId === "prioritarias" ? " on" : ""}`} style={{ "--ac": "var(--orange)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>PRIORITÁRIAS</h2><span className="ct">×{pad2(prioritarias.length)}</span></div>
              <SlidePrioritarias prioritarias={prioritarias} />
            </section>

            <section className={`slide${slideId === "timeline" ? " on" : ""}`} style={{ "--ac": "var(--blue)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>TIMELINE · 14 DIAS</h2><span className="ct">×{pad2(machines.filter(m => m.previsao_inicio && m.previsao_fim).length)}</span></div>
              <SlideTimeline machines={machines} />
            </section>

            <section className={`slide${slideId === "proximas" ? " on" : ""}`} style={{ "--ac": "var(--blue)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>PRÓXIMAS</h2><span className="ct">×{pad2(proximas.length)}</span></div>
              <SlideProximas proximas={proximas} />
            </section>

            <section className={`slide${slideId === "nts" ? " on" : ""}`} style={{ "--ac": "var(--red)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>NTS</h2><span className="ct">×{pad2(ntsAnd.length + ntsAF.length)}</span></div>
              <SlideNTS ntsAnd={ntsAnd} ntsAF={ntsAF} />
            </section>

            <section className={`slide${slideId === "recon" ? " on" : ""}`} style={{ "--ac": "var(--purple)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>RECONDICIONAMENTO</h2><span className="ct">×{pad2(reconAnd.length + reconAF.length)}</span></div>
              <SlideRecon reconAnd={reconAnd} reconAF={reconAF} reconCon={reconCon} />
            </section>

            <section className={`slide${slideId === "concluidas" ? " on" : ""}`} style={{ "--ac": "var(--sky)" }}><div className="watermark" />
              <div className="stitle"><span className="g" /><h2>CONCLUÍDAS · ESTA SEMANA</h2><span className="ct">×{pad2(conSemana.length)}</span></div>
              <SlideConcluidas conSemana={conSemana} />
            </section>
          </div>

          {/* FOOTER — slide actual + progresso + pips (sem assinatura) */}
          <div className="foot">
            <span className="lab">{slideLabel || "—"}</span>
            <span className="prog"><div style={{ width: `${(prog || 0) * 100}%` }} /></span>
            <span className="pips">
              {SLIDES.map((s, i) => (
                <span key={s.id} className={`pip${slide === i ? " on" : ""}`} />
              ))}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
