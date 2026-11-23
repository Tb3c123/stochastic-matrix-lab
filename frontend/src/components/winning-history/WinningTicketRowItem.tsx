"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { formatVND, getTierBadge } from "./formatters";

interface WinningTicketRowItemProps {
  row: any;
  rowIdx: number;
  gameCode: string;
}

export const WinningTicketRowItem: React.FC<WinningTicketRowItemProps> = ({
  row,
  rowIdx,
  gameCode
}) => {
  const rowNums: number[] = row.numbers || [];
  const matchedNums: number[] = row.matched_numbers || [];
  const isWinningRow = (row.prize_amount || 0) > 0;
  const tierBadge = getTierBadge(row.prize_name || "Không trúng");

  return (
    <div
      className={`rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border transition-all ${
        isWinningRow
          ? "bg-slate-850/70 border-amber-500/35 shadow-sm"
          : "bg-slate-900/50 border-slate-800/80 opacity-75"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
            isWinningRow
              ? "bg-gradient-to-br from-amber-500 to-red-600 text-white"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          {row.row_label ||
            `Dãy ${String.fromCharCode(65 + (row.row_index ?? rowIdx))}`}
        </span>

        <span
          className={`px-2.5 py-0.5 rounded-full text-xs border shrink-0 ${tierBadge.cls}`}
        >
          {isWinningRow
            ? `${tierBadge.label} • ${formatVND(row.prize_amount)}`
            : "Không trúng giải"}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {rowNums.map((num: number) => {
            const isMatch = matchedNums.includes(num);
            return (
              <span
                key={num}
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  isMatch
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300 font-black shadow-md shadow-amber-500/30 scale-105"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {num < 10 ? `0${num}` : num}
              </span>
            );
          })}
          {gameCode === "power_6_55" && row.special_number && (
            <div className="flex items-center gap-1 pl-1">
              <span className="text-amber-500 font-extrabold text-xs">+</span>
              <span
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-black flex items-center justify-center transition-all ${
                  row.matched_special
                    ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 ring-2 ring-yellow-200 shadow-md shadow-amber-500/50 scale-105 border-2 border-white animate-pulse"
                    : "bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-sm"
                }`}
                title={`Số đặc biệt Power 6/55: ${
                  row.special_number < 10
                    ? `0${row.special_number}`
                    : row.special_number
                }${row.matched_special ? " (Trúng ĐB!)" : ""}`}
              >
                {row.special_number < 10
                  ? `0${row.special_number}`
                  : row.special_number}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-right font-medium text-slate-400 flex items-center gap-1.5 md:self-center">
        <CheckCircle2
          className={`w-3.5 h-3.5 ${
            isWinningRow ? "text-emerald-400" : "text-slate-600"
          }`}
        />
        <span>
          Trùng <b className="text-white">{row.match_count}/6 số</b>
          {row.matched_special && (
            <b className="text-amber-400"> + Số ĐB ★</b>
          )}
          {matchedNums.length > 0 &&
            ` (${matchedNums
              .map((n: number) => (n < 10 ? `0${n}` : n))
              .join(", ")})`}
        </span>
      </div>
    </div>
  );
};
