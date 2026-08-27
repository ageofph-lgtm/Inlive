// ── TEMA INDUSTRIAL — papel técnico + hazard + glass · dados reais da oficina ──
export const CSS_INDUSTRIAL = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Archivo:wght@600;700;800;900&display=swap');

.ind-root{
  position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;
  background:
    repeating-linear-gradient(45deg, transparent 0 120px, rgba(0,0,0,0.012) 120px 240px),
    radial-gradient(1400px 700px at 70% -20%, rgba(255,255,255,0.7), transparent 60%),
    #E7E4DC;
  font-family:'IBM Plex Mono',monospace;color:#141414;
}
.ind-hazard{height:13px;flex-shrink:0;
  background:repeating-linear-gradient(-45deg,#151515 0 16px,#F2C11E 16px 32px);}
.ind-hazard.thin{height:9px}

/* ── HEADER ── */
.ind-header{flex-shrink:0;display:flex;align-items:center;gap:18px;
  background:#141414;color:#EDEAE2;padding:10px clamp(16px,1.8vw,30px);}
.ind-logo{width:clamp(20px,1.6vw,28px);height:clamp(20px,1.6vw,28px);background:#C8102E;flex-shrink:0}
.ind-title{font-family:'Archivo',sans-serif;font-weight:900;letter-spacing:.22em;
  font-size:clamp(15px,1.5vw,24px);line-height:1.05;text-transform:uppercase}
.ind-sub{font-size:clamp(8px,0.7vw,11px);letter-spacing:.3em;color:#9a968c;margin-top:2px;text-transform:uppercase}
.ind-hstat{text-align:right;line-height:1.05;padding-left:18px;border-left:1px solid rgba(255,255,255,.14)}
.ind-hstat .l{font-size:clamp(7px,0.62vw,10px);letter-spacing:.28em;color:#8d897f;text-transform:uppercase}
.ind-hstat .v{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:clamp(15px,1.35vw,22px);margin-top:2px}
.ind-clock{background:#EDEAE2;color:#141414;font-weight:700;
  font-size:clamp(19px,1.8vw,30px);padding:4px 14px;letter-spacing:.08em;
  font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 2px #141414, 0 0 0 2px #EDEAE2}
.ind-btn{background:transparent;border:1px solid rgba(255,255,255,.22);color:#9a968c;
  padding:5px 7px;cursor:pointer;display:flex;align-items:center}
.ind-btn:hover{color:#EDEAE2;border-color:#EDEAE2}

/* ── BODY ── */
.ind-body{flex:1;min-height:0;display:flex;gap:0;padding:clamp(12px,1.3vw,22px)}
.ind-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;gap:clamp(8px,1vw,16px)}

/* ── SECÇÃO (stencil) ── */
.ind-sec{display:flex;align-items:center;gap:10px;flex-shrink:0}
.ind-sec .tab{background:#141414;color:#EDEAE2;font-family:'Archivo',sans-serif;font-weight:800;
  letter-spacing:.2em;font-size:clamp(9px,0.8vw,13px);padding:3px 12px;text-transform:uppercase;white-space:nowrap}
.ind-sec.amber .tab{background:#8A7414}
.ind-sec.red .tab{background:#C8102E}
.ind-sec .cnt{font-weight:700;font-size:clamp(13px,1.15vw,19px);font-variant-numeric:tabular-nums}
.ind-sec .rule{flex:1;height:2px;background:#141414;opacity:.8}
.ind-sec .note{font-size:clamp(7px,0.65vw,10px);letter-spacing:.22em;color:rgba(20,20,20,.45);text-transform:uppercase;white-space:nowrap}

/* ── CARD DE MÁQUINA ── */
.ind-bay{position:relative;display:flex;flex-direction:column;min-height:0;overflow:hidden;
  border:1px solid rgba(20,20,20,.22);padding:clamp(8px,1vw,16px);
  background:rgba(255,255,255,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  box-shadow:0 1px 2px rgba(20,20,20,.06), inset 0 1px 0 rgba(255,255,255,.65)}
.ind-bay .num{font-size:clamp(8px,0.68vw,11px);font-weight:600;letter-spacing:.24em;
  color:rgba(20,20,20,.5);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ind-bay .serie{font-weight:700;font-size:clamp(15px,1.55vw,26px);letter-spacing:.02em;
  margin-top:clamp(4px,0.6vw,10px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ind-bay .modelo{font-size:clamp(9px,0.85vw,13px);color:rgba(20,20,20,.55);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ind-bay .foot{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:6px;padding-top:6px}
.ind-bay .timer{font-weight:700;font-size:clamp(15px,1.5vw,25px);letter-spacing:.04em;
  font-variant-numeric:tabular-nums;line-height:1}
.ind-badge{font-family:'Archivo',sans-serif;font-weight:800;letter-spacing:.14em;
  font-size:clamp(7px,0.62vw,10px);padding:3px 8px;color:#fff;text-transform:uppercase;white-space:nowrap}

.ind-bay.run{border:1.5px solid #1E7A46;background:linear-gradient(170deg,rgba(30,122,70,.10),rgba(255,255,255,.55) 60%)}
.ind-bay.run .timer{color:#14572f}
.ind-bay.wait{border:1.5px solid #C7A419;background:linear-gradient(170deg,rgba(199,164,25,.16),rgba(255,255,255,.5) 60%)}
.ind-bay.wait .timer{color:#6e5a08}
.ind-bay.late{border:1.5px solid #C8102E;background:linear-gradient(170deg,rgba(200,16,46,.10),rgba(255,255,255,.5) 60%);
  animation:indLate 1.6s ease-in-out infinite}
.ind-bay.late .timer{color:#C8102E}
@keyframes indLate{0%,100%{box-shadow:0 0 0 0 rgba(200,16,46,0)}50%{box-shadow:0 0 0 4px rgba(200,16,46,.14)}}
.ind-run-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#1E7A46;
  margin-right:5px;animation:indBlink 1.3s ease-in-out infinite;vertical-align:middle}
@keyframes indBlink{0%,100%{opacity:1}50%{opacity:.15}}

.ind-chip{font-size:clamp(7px,0.6vw,9px);font-weight:600;letter-spacing:.1em;padding:1px 6px;
  border:1px solid rgba(20,20,20,.25);color:rgba(20,20,20,.6);text-transform:uppercase;white-space:nowrap}
.ind-chip.prio{border-color:#C8102E;color:#C8102E}

/* área vazia */
.ind-empty{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;
  border:1px dashed rgba(20,20,20,.2);
  background:repeating-linear-gradient(45deg,transparent 0 10px,rgba(20,20,20,.035) 10px 20px),rgba(240,238,232,.6)}
.ind-empty span{font-family:'Archivo',sans-serif;font-weight:700;letter-spacing:.42em;
  font-size:clamp(9px,0.85vw,14px);color:rgba(20,20,20,.28);text-transform:uppercase}

/* ── LINHAS COMPACTAS (NTS / recon / listas) ── */
.ind-row{display:flex;align-items:center;gap:8px;padding:clamp(5px,0.6vw,9px) 8px;
  border-bottom:1px solid rgba(20,20,20,.12);
  background:rgba(255,255,255,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  margin-top:4px;overflow:hidden}
.ind-row .arr{font-weight:700;color:rgba(20,20,20,.4);flex-shrink:0}
.ind-row .info{flex:1;min-width:0}
.ind-row .s{font-weight:700;font-size:clamp(10px,0.92vw,15px);letter-spacing:.02em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ind-row .m{font-size:clamp(8px,0.68vw,11px);color:rgba(20,20,20,.5);margin-top:1px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ind-row .d{font-weight:700;font-size:clamp(9px,0.78vw,12px);letter-spacing:.08em;flex-shrink:0}
.ind-row .d.hoje{color:#C8102E}
.ind-row .d.ok{color:#1E7A46}

/* ── SIDEBAR ── */
.ind-side{width:clamp(230px,22vw,340px);flex-shrink:0;display:flex;flex-direction:column;min-height:0;
  border-left:2px solid #141414;padding-left:clamp(12px,1.3vw,22px);margin-left:clamp(12px,1.3vw,22px)}
.ind-side-title{display:flex;align-items:baseline;gap:8px;
  border-bottom:2px solid #141414;padding-bottom:6px;flex-shrink:0}
.ind-side-title .t{font-family:'Archivo',sans-serif;font-weight:900;letter-spacing:.16em;
  font-size:clamp(10px,0.95vw,15px);text-transform:uppercase}
.ind-side-title .n{font-size:clamp(9px,0.8vw,12px);color:rgba(20,20,20,.45);font-weight:600}
.ind-side-foot{flex-shrink:0;display:flex;gap:18px;border-top:2px solid #141414;
  padding-top:8px;margin-top:8px}
.ind-side-foot .l{font-size:clamp(7px,0.62vw,10px);letter-spacing:.24em;color:rgba(20,20,20,.5);text-transform:uppercase}
.ind-side-foot .v{font-weight:700;font-size:clamp(15px,1.4vw,23px);margin-top:2px}

/* ── FOOTER KPI ── */
.ind-footer{flex-shrink:0;display:flex;background:#141414;color:#EDEAE2;
  padding:9px clamp(16px,1.8vw,30px);gap:clamp(20px,3vw,60px)}
.ind-kpi .l{font-size:clamp(7px,0.62vw,10px);letter-spacing:.28em;color:#8d897f;text-transform:uppercase}
.ind-kpi .v{font-weight:700;font-size:clamp(17px,1.65vw,28px);margin-top:2px;line-height:1;
  font-variant-numeric:tabular-nums}
.ind-kpi .v.gold{color:#F2C11E}
.ind-kpi .v.green{color:#4ec37f}

.ind-loading{margin:auto;font-family:'Archivo',sans-serif;font-weight:800;letter-spacing:.4em;
  font-size:clamp(12px,1.1vw,18px);color:rgba(20,20,20,.4);text-transform:uppercase;
  animation:indBlink 1.2s ease-in-out infinite}
`;