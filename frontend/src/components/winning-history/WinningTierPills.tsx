"use client";

import React from "react";

interface WinningTierPillsProps {
  tierCounts: any;
  selectedTierFilter: string;
  onSelectTierFilter: (tier: string) => void;
}

export const WinningTierPills: React.FC<WinningTierPillsProps> = ({
  tierCounts,
  selectedTierFilter,
  onSelectTierFilter
}) => {
  const tierPills = [
    {
      id: "jackpot_6",
      label: "🎯 Tuyệt Đối 6/6",
      count: tierCounts?.jackpot_1 || 0,
      activeCls:
        "bg-amber-500/30 border-amber-300 text-amber-200 font-black ring-1 ring-amber-400",
      hoverCls: "hover:border-amber-500/50",
      numCls: "text-amber-300"
    },
    {
      id: "first",
      label: "Giải Nhất",
      count: tierCounts?.first || 0,
      activeCls: "bg-red-500/25 border-red-400 text-white ring-1 ring-red-400",
      hoverCls: "hover:border-red-500/50",
      numCls: "text-red-400"
    },
    {
      id: "second",
      label: "Giải Nhì",
      count: tierCounts?.second || 0,
      activeCls: "bg-sky-500/25 border-sky-400 text-white ring-1 ring-sky-400",
      hoverCls: "hover:border-sky-500/50",
      numCls: "text-sky-400"
    },
    {
      id: "third",
      label: "Giải Ba",
      count: tierCounts?.third || 0,
      activeCls:
        "bg-emerald-500/25 border-emerald-400 text-white ring-1 ring-emerald-400",
      hoverCls: "hover:border-emerald-500/50",
      numCls: "text-emerald-400"
    }
  ];

  return (
    <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-400 font-semibold mr-1">
        Phân bố giải thưởng (Nhấn để lọc):
      </span>
      {tierPills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() =>
            onSelectTierFilter(selectedTierFilter === pill.id ? "all" : pill.id)
          }
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            selectedTierFilter === pill.id
              ? pill.activeCls
              : `bg-slate-800 border-slate-700 text-slate-300 ${pill.hoverCls}`
          }`}
        >
          {pill.label}: <b className={pill.numCls}>{pill.count}</b>
        </button>
      ))}
    </div>
  );
};
