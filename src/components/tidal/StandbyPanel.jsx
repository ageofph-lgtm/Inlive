// Standby agrupado pelos 4 motivos de pausa do Watcher.
import React from "react";
import MachineCard from "./MachineCard";
import { PAUSA_COLS, getPausaMotivo } from "./tidalUtils";

export default function StandbyPanel({ standby }) {
  if (standby.length === 0) return <div className="td-empty">Sem máquinas em pausa</div>;
  return (
    <div className="td-sb">
      {PAUSA_COLS.map((col) => {
        const items = standby.filter((m) => (getPausaMotivo(m) || "outros") === col.key);
        return (
          <div key={col.key} className="td-sbcol">
            <div className="td-sbh">
              <i style={{ background: col.color }} />
              {col.label}
              <b>{items.length}</b>
            </div>
            {items.length === 0
              ? <span className="td-sbempty">—</span>
              : items.map((m, i) => <MachineCard key={m.id || i} m={m} showChips={false} />)}
          </div>
        );
      })}
    </div>
  );
}