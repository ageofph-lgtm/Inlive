import React from "react";
import RsMachineCard from "./RsMachineCard";

export default function RsAndamento({ items }) {
  if (items.length === 0) return <div className="rs-empty">Nenhuma máquina em produção</div>;
  const n = items.length;
  const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  return (
    <div className="rs-grid" style={{
      gridTemplateColumns: `repeat(${cols},1fr)`,
      gridTemplateRows: `repeat(${rows},1fr)`,
    }}>
      {items.map(m => <RsMachineCard key={m.id} m={m} />)}
    </div>
  );
}