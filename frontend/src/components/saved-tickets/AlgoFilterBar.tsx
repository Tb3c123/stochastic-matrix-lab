"use client";

import React from "react";
import { isTicketMatchingAlgo } from "./rowAlgoBadges";

interface AlgoFilterBarProps {
  tickets: any[];
  selectedAlgoFilter: string;
  onSelectAlgoFilter: (algo: string) => void;
}

export const AlgoFilterBar: React.FC<AlgoFilterBarProps> = ({
  tickets,
  selectedAlgoFilter,
  onSelectAlgoFilter
}) => {
  const algoButtons = [
    { id: "all", label: "Tất Cả", count: tickets.length, activeCls: "bg-amber-500 text-slate-950 shadow-md" },
    { id: "hybrid_ai_learned", label: "AI Hybrid", count: tickets.filter((t) => isTicketMatchingAlgo(t, "hybrid_ai_learned")).length, activeCls: "bg-indigo-500 text-white shadow-md" },
    { id: "balanced", label: "Cân Bằng", count: tickets.filter((t) => isTicketMatchingAlgo(t, "balanced")).length, activeCls: "bg-emerald-500 text-slate-950 shadow-md" },
    { id: "mean_reversion", label: "Hồi Quy", count: tickets.filter((t) => isTicketMatchingAlgo(t, "mean_reversion")).length, activeCls: "bg-sky-500 text-slate-950 shadow-md" },
    { id: "pure_random", label: "Ngẫu Nhiên", count: tickets.filter((t) => isTicketMatchingAlgo(t, "pure_random")).length, activeCls: "bg-amber-500 text-slate-950 shadow-md" },
    { id: "custom_manual", label: "Điền Tay", count: tickets.filter((t) => isTicketMatchingAlgo(t, "custom_manual")).length, activeCls: "bg-purple-500 text-white shadow-md" },
    { id: "mixed", label: "Hỗn Hợp", count: tickets.filter((t) => isTicketMatchingAlgo(t, "mixed")).length, activeCls: "bg-fuchsia-600 text-white shadow-md" }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-400 font-semibold mr-1">
        Lọc theo thuật toán:
      </span>
      {algoButtons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onSelectAlgoFilter(btn.id)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedAlgoFilter === btn.id
              ? btn.activeCls
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
          }`}
        >
          {btn.label} ({btn.count})
        </button>
      ))}
    </div>
  );
};
