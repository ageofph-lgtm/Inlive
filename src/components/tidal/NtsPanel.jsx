// NTS: em preparação + a fazer.
import React from "react";
import MachineCard from "./MachineCard";
import { GREEN, RED } from "./tidalUtils";

export default function NtsPanel({ ntsAnd, ntsAF }) {
  if (ntsAnd.length + ntsAF.length === 0) return <div className="td-empty">Sem máquinas NTS</div>;
  return (
    <div>
      {ntsAnd.length > 0 && (
        <>
          <div className="td-sect"><i style={{ background: GREEN }} />Em preparação · <b>{ntsAnd.length}</b></div>
          <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))" }}>
            {ntsAnd.map((m, i) => <MachineCard key={m.id || i} m={m} showChips={false} />)}
          </div>
        </>
      )}
      {ntsAF.length > 0 && (
        <>
          <div className="td-sect"><i style={{ background: RED }} />A fazer · <b>{ntsAF.length}</b></div>
          <div className="td-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))" }}>
            {ntsAF.map((m, i) => <MachineCard key={m.id || i} m={m} showChips={false} showBar={false} />)}
          </div>
        </>
      )}
    </div>
  );
}