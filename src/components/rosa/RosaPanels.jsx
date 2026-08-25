// Painéis pequenos que orbitam o palco central (sempre visíveis, compactos).
import React from "react";
import {
  fmtHMS, fmtH, pad2, nsSplit, machineType, useLiveTimer, useRotatingWindow,
  fmtDateShort, PAUSA_COLS, getPausaMotivo, GREEN, RED, AMBER, LAV, BLUE,
} from "./rosaUtils";

function MiniRow({ m, v, vc, extra }) {
  const ns = nsSplit(m.serie);
  const t = machineType(m);
  return (
    <div className="rs-mrow">
      <span className="rs-tdot" style={{ background: t.color }} />
      <span className="rs-mns">{ns.main}</span>
      <span className="rs-mmo">{m.modelo || "—"}</span>
      {extra}
      <span className="rs-mv" style={{ color: vc }}>{v}</span>
    </div>
  );
}

export function PanelStandby({ standby, paused }) {
  if (standby.length === 0) return <div className="rs-empty sm">Sem máquinas em pausa</div>;
  const groups = PAUSA_COLS.map((c) => ({
    ...c, items: standby.filter((m) => (getPausaMotivo(m) || "outros") === c.key),
  })).filter((g) => g.items.length > 0);
  return (
    <div className="rs-mlist">
      {groups.map((g) => (
        <div key={g.key} className="rs-sbgroup">
          <div className="rs-sbhead"><i style={{ background: g.color }} />{g.label}<b>{g.items.length}</b></div>
          {g.items.slice(0, 4).map((m, i) => (
            <MiniRow key={m.id || i} m={m} v={fmtHMS(Number(m.timer_accumulated_seconds) || 0)} vc={g.color} />
          ))}
          {g.items.length > 4 && <div className="rs-more">+{g.items.length - 4}</div>}
        </div>
      ))}
    </div>
  );
}

export function PanelPrioritarias({ prioritarias, paused }) {
  const win = useRotatingWindow(prioritarias, 5, 9000, paused);
  if (prioritarias.length === 0) return <div className="rs-empty sm">Sem prioritárias activas ✓</div>;
  return (
    <div className="rs-mlist" key={win.off}>
      {win.slice.map((m, i) => {
        const fim = fmtDateShort(m.previsao_fim);
        const run = m.timer_status === "running";
        return <MiniRow key={m.id || i} m={m} v={fim ? `⚑ ${fim}` : "⚡"} vc={AMBER}
          extra={run ? <span className="rs-tag run">RUN</span> : null} />;
      })}
    </div>
  );
}

function NtsRow({ m }) {
  const elapsed = useLiveTimer(m);
  const meta = Number(m.tempo_estimado_segundos) || 0;
  const rest = meta > 0 ? meta - elapsed : null;
  const run = m.timer_status === "running";
  return <MiniRow m={m} v={rest !== null ? (rest < 0 ? "+" : "") + fmtHMS(Math.abs(rest)) : (meta ? fmtH(meta) : "—")}
    vc={rest !== null && rest < 0 ? RED : run ? GREEN : "#C9D2E0"}
    extra={run ? <span className="rs-tag run">RUN</span> : null} />;
}

export function PanelNts({ nts, paused }) {
  const win = useRotatingWindow(nts, 5, 9000, paused);
  if (nts.length === 0) return <div className="rs-empty sm">Sem máquinas NTS</div>;
  return <div className="rs-mlist" key={win.off}>{win.slice.map((m, i) => <NtsRow key={m.id || i} m={m} />)}</div>;
}

export function PanelProximas({ proximas, paused }) {
  const monday = (() => { const n = new Date(); const d = n.getDay(); const b = d === 0 ? 6 : d - 1; const m = new Date(n); m.setDate(n.getDate() - b); m.setHours(0, 0, 0, 0); return m; })();
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const todayStr = new Date().toISOString().slice(0, 10);
  const byDay = {};
  proximas.forEach((m) => {
    if (!m.previsao_inicio) return;
    const k = String(m.previsao_inicio).slice(0, 10);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(m);
  });
  const semData = proximas.filter((m) => !m.previsao_inicio);
  const futuras = proximas.filter((m) => m.previsao_inicio && String(m.previsao_inicio).slice(0, 10) > days[4].toISOString().slice(0, 10));
  if (proximas.length === 0) return <div className="rs-empty sm">Nenhuma máquina com previsão</div>;
  return (
    <div className="rs-week">
      <div className="rs-wdays">
        {days.map((d) => {
          const k = d.toISOString().slice(0, 10);
          const items = byDay[k] || [];
          return (
            <div key={k} className={`rs-wday${k === todayStr ? " today" : ""}`}>
              <div className="rs-wdh">
                {d.toLocaleDateString("pt-PT", { weekday: "short" })}
                <b>{pad2(d.getDate())}/{pad2(d.getMonth() + 1)}</b>
              </div>
              <div className="rs-wdb">
                {items.length === 0 ? <span className="rs-wdempty">—</span> : items.slice(0, 4).map((m, i) => {
                  const t = machineType(m);
                  const meta = Number(m.tempo_estimado_segundos) || 0;
                  return (
                    <div key={m.id || i} className="rs-wcard" style={{ borderLeftColor: t.color }}>
                      <b>{nsSplit(m.serie).main}</b>
                      <span>{m.modelo || "—"}</span>
                      <em>{meta > 0 ? `⏱ ${fmtH(meta)}` : ""}{m.prioridade ? " ⚑" : ""}</em>
                    </div>
                  );
                })}
                {items.length > 4 && <span className="rs-more">+{items.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {(semData.length > 0 || futuras.length > 0) && (
        <div className="rs-wfoot">
          {semData.length > 0 && <span>Sem previsão <b>{semData.length}</b></span>}
          {futuras.length > 0 && <span>Semanas seguintes <b>{futuras.length}</b></span>}
        </div>
      )}
    </div>
  );
}

export function PanelTimeline({ machines }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - 1);
  const end = new Date(today); end.setDate(today.getDate() + 14);
  const totalMs = end - start;
  const days = Array.from({ length: 15 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const nowPct = ((Date.now() - start.getTime()) / totalMs) * 100;
  const blocks = machines.map((m) => {
    if (!m.previsao_inicio || !m.previsao_fim) return null;
    const pi = new Date(m.previsao_inicio + (String(m.previsao_inicio).length === 10 ? "T00:00:00" : ""));
    const pf = new Date(m.previsao_fim + (String(m.previsao_fim).length === 10 ? "T23:59:59" : ""));
    if (pf < start || pi > end) return null;
    const isActive = m.estado?.startsWith("em-preparacao");
    const over = isActive && new Date() > pf;
    return {
      m,
      a: ((Math.max(pi, start) - start) / totalMs) * 100,
      b: ((Math.min(pf, end) - start) / totalMs) * 100,
      isActive, over,
    };
  }).filter(Boolean).sort((x, y) => (x.isActive === y.isActive ? x.a - y.a : x.isActive ? -1 : 1)).slice(0, 8);
  if (blocks.length === 0) return <div className="rs-empty sm">Sem máquinas com previsão na janela</div>;
  return (
    <div className="rs-tl">
      <div className="rs-tlscale">{days.map((d, i) => (
        <b key={i} className={d.toDateString() === today.toDateString() ? "now" : ""}>{pad2(d.getDate())}</b>
      ))}</div>
      <div className="rs-tlrows">
        <div className="rs-tlnow" style={{ left: `calc(120px + ((100% - 120px)/100) * ${nowPct})` }} />
        {blocks.map((bl, i) => (
          <div key={bl.m.id || i} className="rs-tlrow">
            <span className="rs-tll">
              <i style={{ background: machineType(bl.m).color }} />
              {nsSplit(bl.m.serie).main}
            </span>
            <span className="rs-tltrack">
              <i className={bl.over ? "over" : bl.isActive ? "run" : "fila"}
                style={{ left: bl.a + "%", width: Math.max(bl.b - bl.a, 2) + "%" }}>
                {bl.m.modelo || ""}
              </i>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}