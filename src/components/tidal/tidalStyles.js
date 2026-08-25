// Folha de estilos do tema Tidal Light — injectada uma vez pelo AoVivoTidal.
export const TIDAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@font-face{font-family:'DSDigital';src:url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7-Classic/DSEG7Classic-Regular.woff2') format('woff2');font-weight:400;font-display:swap;}

.td-root{--bg:#F7F8FA;--surface:#EFF2F6;--card:#FFFFFF;--line:#E2E8F0;--text:#1E293B;
  --muted:#64748B;--faint:#94A3B8;--blue:#007AFF;--green:#22C55E;--red:#EF4444;--amber:#F59E0B;--lav:#8B5CF6;
  --sh:0 1px 2px rgba(15,23,42,.04),0 6px 20px -8px rgba(15,23,42,.10);
  --shp:0 1px 2px rgba(15,23,42,.05),0 12px 32px -12px rgba(15,23,42,.16);
  position:fixed;inset:0;display:flex;background:var(--bg);color:var(--text);
  font-family:'Inter',system-ui,sans-serif;overflow:hidden;-webkit-font-smoothing:antialiased}
.td-root *{box-sizing:border-box}
.td-root ::-webkit-scrollbar{width:6px;height:6px}
.td-root ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:6px}

/* ── Sidebar ─────────────────────────────────────────────────────── */
.td-side{width:62px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);
  display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0}
.td-side button{width:40px;height:40px;border:none;border-radius:12px;background:transparent;color:var(--faint);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .22s ease}
.td-side button:hover{background:#E2E8F0;color:var(--muted)}
.td-side button.on{background:var(--blue);color:#fff;box-shadow:0 6px 16px -6px rgba(0,122,255,.6)}
.td-side .sp{flex:1}

/* ── Main ────────────────────────────────────────────────────────── */
.td-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}

.td-top{flex-shrink:0;display:flex;align-items:center;gap:14px;padding:10px 20px;
  background:rgba(255,255,255,.78);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}
.td-brand{font-size:24px;font-weight:800;letter-spacing:-.03em}
.td-sub{font-size:12px;font-weight:600;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;
  padding-left:14px;border-left:1px solid var(--line)}
.td-live{margin-left:auto;display:flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;
  background:#FEE7EA;color:#DC2626;font-size:11px;font-weight:700;letter-spacing:.1em}
.td-live i{width:7px;height:7px;border-radius:50%;background:#DC2626;animation:tdBlink 1.4s ease-in-out infinite}
.td-clock{text-align:right;line-height:1.15}
.td-clock b{display:block;font-size:19px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.td-clock span{font-size:10.5px;font-weight:500;color:var(--muted);text-transform:capitalize}
.td-ibtn{width:32px;height:32px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--muted);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s}
.td-ibtn:hover{background:var(--surface);color:var(--text)}

/* ── KPI strip ───────────────────────────────────────────────────── */
.td-kpis{flex-shrink:0;display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:8px;padding:12px 20px 4px}
.td-kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:9px 10px;
  display:flex;flex-direction:column;align-items:center;gap:2px;box-shadow:var(--sh);cursor:pointer;transition:.25s}
.td-kpi:hover{transform:translateY(-2px);box-shadow:var(--shp)}
.td-kpi b{font-size:clamp(17px,1.6vw,24px);font-weight:700;letter-spacing:-.03em;line-height:1.05;
  font-variant-numeric:tabular-nums}
.td-kpi span{font-size:8.5px;font-weight:600;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;
  text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:flex;align-items:center;gap:4px}
.td-kpi span i{width:5px;height:5px;border-radius:50%;flex-shrink:0}

/* ── Grelha de painéis ───────────────────────────────────────────── */
.td-body{flex:1;min-height:0;overflow-y:auto;padding:12px 20px 20px;display:flex;flex-direction:column;gap:14px}
.td-row{display:grid;gap:14px}
.td-row.hero{grid-template-columns:1.45fr 1fr}
.td-row.three{grid-template-columns:1fr 1.15fr 1fr}

.td-panel{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--sh);
  display:flex;flex-direction:column;overflow:hidden;scroll-margin-top:12px;transition:box-shadow .3s,border-color .3s}
.td-panel.focus{border-color:rgba(0,122,255,.45);box-shadow:0 0 0 3px rgba(0,122,255,.12),var(--shp)}
.td-phead{flex-shrink:0;display:flex;align-items:center;gap:9px;padding:13px 16px 10px}
.td-phead h3{margin:0;font-size:15px;font-weight:700;letter-spacing:-.02em}
.td-phead em{font-style:normal;font-size:11px;font-weight:500;color:var(--faint)}
.td-phead .ct{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--muted);background:var(--surface);
  border-radius:8px;padding:2px 8px;font-variant-numeric:tabular-nums}
.td-pbody{flex:1;min-height:0;overflow:auto;padding:0 16px 14px}

.td-empty{display:flex;align-items:center;justify-content:center;min-height:70px;padding:16px;
  font-size:12px;font-weight:500;color:var(--faint);text-align:center}
.td-sect{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);
  display:flex;align-items:center;gap:6px;margin:6px 0 7px}
.td-sect i{width:6px;height:6px;border-radius:50%}
.td-sect b{color:var(--text)}
.td-grid{display:grid;gap:9px}

/* ── Cards de máquina ────────────────────────────────────────────── */
.td-mc{position:relative;background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 12px;
  display:flex;flex-direction:column;gap:7px;overflow:hidden;transition:.25s}
.td-mc:hover{box-shadow:var(--sh)}
.td-mc::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;
  background:var(--st,#CBD5E1)}
.td-mc.hero{padding:13px 14px;gap:9px}
.td-mc.alert{border-color:rgba(239,68,68,.4);background:linear-gradient(180deg,#FEF2F3,#fff 60%)}
.td-mc-top{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding-left:6px}
.td-mc-mid{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding-left:6px}
.td-ns{min-width:0}
.td-ns b{display:block;font-size:clamp(14px,1.35vw,20px);font-weight:700;letter-spacing:-.02em;line-height:1.1;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-ns span{display:block;font-size:10.5px;font-weight:500;color:var(--muted);margin-top:1px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-lcd{text-align:right;flex-shrink:0}
.td-lcd b{display:block;font-family:'DSDigital','Inter',monospace;font-size:clamp(13px,1.25vw,19px);
  font-weight:400;letter-spacing:.02em;line-height:1;color:var(--st,#334155)}
.td-lcd span{display:block;font-size:8.5px;font-weight:600;letter-spacing:.1em;color:var(--faint);
  text-transform:uppercase;margin-top:3px}

.td-badge{font-size:8.5px;font-weight:700;letter-spacing:.08em;padding:2.5px 7px;border-radius:6px;
  white-space:nowrap;color:var(--bc,#475569);background:color-mix(in srgb,var(--bc,#94A3B8) 12%,#fff);
  border:1px solid color-mix(in srgb,var(--bc,#94A3B8) 30%,#fff)}
.td-badge.run{--bc:#22C55E}
.td-badge.pause{--bc:#F59E0B}
.td-badge.prio{--bc:#EF4444}
.td-badge.exp{--bc:#F59E0B}
.td-badge.vps{--bc:#007AFF}
.td-badge.ok{--bc:#22C55E}
.td-badge.tier{--bc:#8B5CF6}
.td-dates{margin-left:auto;font-size:9.5px;font-weight:600;color:var(--faint);white-space:nowrap;
  font-variant-numeric:tabular-nums}
.td-tech{width:7px;height:7px;border-radius:50%;flex-shrink:0}

.td-bar{display:flex;align-items:center;gap:8px;padding-left:6px}
.td-bar .tr{flex:1;height:6px;border-radius:99px;background:#EEF2F7;overflow:hidden}
.td-bar .tr i{display:block;height:100%;border-radius:99px;transition:width .6s ease}
.td-bar b{font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;min-width:34px;text-align:right}
.td-bar em{font-style:normal;font-size:9.5px;font-weight:500;color:var(--faint);white-space:nowrap}

.td-chips{display:flex;flex-wrap:wrap;gap:4px;padding-left:6px}
.td-chip{font-size:9px;font-weight:500;padding:2px 7px;border-radius:6px;background:#F1F5F9;color:#475569;
  max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.td-chip.imp{background:#FFF7ED;color:#C2410C}
.td-chip.done{background:#ECFDF5;color:#15803D;text-decoration:line-through}
.td-chip.dim{background:transparent;color:var(--faint)}

/* ── Anel de progresso ───────────────────────────────────────────── */
.td-ring{position:relative;flex-shrink:0}
.td-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:9.5px;font-weight:700;font-variant-numeric:tabular-nums}

/* ── Standby colunas ─────────────────────────────────────────────── */
.td-sb{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.td-sbcol{display:flex;flex-direction:column;gap:6px;min-width:0}
.td-sbh{display:flex;align-items:center;gap:6px;font-size:9.5px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;color:var(--muted);padding-bottom:5px;border-bottom:1px solid var(--line)}
.td-sbh i{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.td-sbh b{margin-left:auto;font-size:11px;color:var(--text)}
.td-sbempty{font-size:10px;color:var(--faint);padding:6px 2px}

/* ── Semana (Próximas) ───────────────────────────────────────────── */
.td-week{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
.td-wd{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#FCFDFE;min-width:0}
.td-wd.today{border-color:rgba(0,122,255,.45);background:#F5FAFF}
.td-wdh{padding:6px 8px;background:var(--surface);display:flex;flex-direction:column;gap:1px}
.td-wdh span{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.td-wd.today .td-wdh span{color:var(--blue)}
.td-wdh b{font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.td-wdb{padding:6px;display:flex;flex-direction:column;gap:5px;min-height:56px}
.td-wc{border-left:3px solid var(--bc,#CBD5E1);background:#fff;border-radius:6px;padding:4px 6px;
  box-shadow:0 1px 2px rgba(15,23,42,.05);min-width:0}
.td-wc b{display:block;font-size:10.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-wc span{display:block;font-size:8.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-wc em{font-style:normal;font-size:8.5px;font-weight:600;color:var(--blue)}
.td-wfoot{display:flex;gap:14px;margin-top:9px;padding-top:9px;border-top:1px solid var(--line);flex-wrap:wrap}
.td-wfoot>div{min-width:0;flex:1}
.td-wfoot h5{margin:0 0 5px;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.td-wfoot p{margin:0 0 3px;font-size:10px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-wfoot p b{font-weight:700;color:var(--text)}

/* ── Timeline ────────────────────────────────────────────────────── */
.td-tl{display:flex;flex-direction:column;gap:6px;min-width:0}
.td-tlscale{display:flex;margin-left:96px;gap:0}
.td-tlscale b{flex:1;text-align:center;font-size:9px;font-weight:600;color:var(--faint);font-variant-numeric:tabular-nums}
.td-tlscale b.now{color:#fff;background:var(--red);border-radius:5px;padding:1px 0}
.td-tlrows{position:relative;display:flex;flex-direction:column;gap:5px}
.td-tlnow{position:absolute;top:0;bottom:0;width:2px;background:rgba(239,68,68,.55);z-index:2}
.td-tlrow{display:flex;align-items:center;gap:8px}
.td-tll{width:88px;flex-shrink:0;display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-tll i{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.td-tltrack{position:relative;flex:1;height:20px;background:#F1F5F9;border-radius:7px;overflow:hidden}
.td-tltrack i{position:absolute;top:2px;bottom:2px;border-radius:6px;font-style:normal;font-size:8.5px;
  font-weight:600;color:#fff;display:flex;align-items:center;padding:0 6px;overflow:hidden;white-space:nowrap}
.td-tltrack i.run{background:var(--blue)}
.td-tltrack i.fila{background:#94A3B8}
.td-tltrack i.over{background:var(--red)}
.td-leg{display:flex;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid var(--line);flex-wrap:wrap}
.td-leg span{display:flex;align-items:center;gap:5px;font-size:9.5px;font-weight:600;color:var(--muted)}
.td-leg i{width:8px;height:8px;border-radius:3px}

@keyframes tdBlink{0%,100%{opacity:1}50%{opacity:.25}}

@media (max-width:1400px){
  .td-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}
  .td-row.hero,.td-row.three{grid-template-columns:1fr}
  .td-sb{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (max-width:820px){
  .td-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
  .td-sb,.td-week{grid-template-columns:repeat(2,minmax(0,1fr))}
}
`;