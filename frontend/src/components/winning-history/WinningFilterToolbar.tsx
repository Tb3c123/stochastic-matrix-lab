"use client";

import React from "react";

interface WinningFilterToolbarProps {
  selectedGameFilter: string;
  onSelectGameFilter: (game: string) => void;
  selectedTierFilter: string;
  onSelectTierFilter: (tier: string) => void;
}

const TIER_OPTIONS = [
  { id: "all", label: "Tất Cả" },
  { id: "jackpot", label: "Jackpot" },
  { id: "first", label: "Giải Nhất" },
  { id: "second", label: "Giải Nhì" },
  { id: "third", label: "Giải Ba" }
];

export const WinningFilterToolbar: React.FC<WinningFilterToolbarProps> = ({
  selectedGameFilter,
  onSelectGameFilter,
  selectedTierFilter,
  onSelectTierFilter
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold">
      <button
        onClick={() => onSelectGameFilter("all")}
        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
          selectedGameFilter === "all"
            ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Tất Cả Game
      </button>
      <button
        onClick={() => onSelectGameFilter("mega_6_45")}
        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
          selectedGameFilter === "mega_6_45"
            ? "bg-red-500 text-white font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Mega 6/45
      </button>
      <button
        onClick={() => onSelectGameFilter("power_6_55")}
        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
          selectedGameFilter === "power_6_55"
            ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Power 6/55
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-slate-400 font-semibold mr-1">Hạng giải:</span>
      {TIER_OPTIONS.map((tier) => (
        <button
          key={tier.id}
          onClick={() => onSelectTierFilter(tier.id)}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            selectedTierFilter === tier.id
              ? "bg-slate-700 text-white border border-slate-600 shadow-sm"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          {tier.label}
        </button>
      ))}
    </div>
  </div>
);
