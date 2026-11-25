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
  onSelectTierFilter,
}) => {
  const tierPills = [
    { id: "jackpot_6", label: "🎯 Tuyệt Đối 6/6", count: tierCounts?.jackpot_1 || 0 },
    { id: "first", label: "Giải Nhất", count: tierCounts?.first || 0 },
    { id: "second", label: "Giải Nhì", count: tierCounts?.second || 0 },
    { id: "third", label: "Giải Ba", count: tierCounts?.third || 0 },
  ];

  return (
    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-600 font-semibold mr-1">
        Phân bố giải thưởng (Nhấn để lọc):
      </span>
      {tierPills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onSelectTierFilter(selectedTierFilter === pill.id ? "all" : pill.id)}
          className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
            selectedTierFilter === pill.id
              ? "bg-slate-900 border-slate-900 text-white font-bold"
              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {pill.label}: <b className="font-mono">{pill.count}</b>
        </button>
      ))}
    </div>
  );
};
