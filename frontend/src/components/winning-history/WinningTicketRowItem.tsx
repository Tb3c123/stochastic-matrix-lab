"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { formatVND } from "./formatters";

interface WinningTicketRowItemProps {
  row: any;
  rowIdx: number;
  gameCode: string;
}

export const WinningTicketRowItem: React.FC<WinningTicketRowItemProps> = ({
  row,
  rowIdx,
  gameCode,
}) => {
  const rowNums: number[] = row.numbers || [];
  const matchedNums: number[] = row.matched_numbers || [];
  const isWinningRow = (row.prize_amount || 0) > 0;

  return (
    <div
      className={`rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border ${
        isWinningRow ? "bg-amber-50/40 border-amber-200" : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`px-2 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
            isWinningRow ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          {row.row_label || `Dãy ${String.fromCharCode(65 + (row.row_index ?? rowIdx))}`}
        </span>

        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
            isWinningRow
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-white text-slate-500 border-slate-200"
          }`}
        >
          {isWinningRow
            ? `${row.prize_name || "Trúng thưởng"} • ${formatVND(row.prize_amount)}`
            : "Không trúng giải"}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {rowNums.map((num: number) => {
            const isMatch = matchedNums.includes(num);
            return (
              <span
                key={num}
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-bold flex items-center justify-center font-mono ${
                  isMatch
                    ? "bg-amber-600 text-white border border-amber-700"
                    : "bg-white text-slate-600 border border-slate-300"
                }`}
              >
                {num < 10 ? `0${num}` : num}
              </span>
            );
          })}
          {gameCode === "power_6_55" && row.special_number && (
            <div className="flex items-center gap-1 pl-1">
              <span className="text-slate-400 font-bold text-xs">+</span>
              <span
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-bold flex items-center justify-center font-mono ${
                  row.matched_special ? "bg-emerald-700 text-white border border-emerald-800" : "ball-special"
                }`}
              >
                {row.special_number < 10 ? `0${row.special_number}` : row.special_number}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5 md:self-center">
        <CheckCircle2 className={`w-3.5 h-3.5 ${isWinningRow ? "text-emerald-700" : "text-slate-400"}`} />
        <span>
          Trùng <b className="text-slate-900">{row.match_count}/6 số</b>
          {row.matched_special && <b className="text-amber-800"> + Số ĐB ★</b>}
          {matchedNums.length > 0 && ` (${matchedNums.map((n: number) => (n < 10 ? `0${n}` : n)).join(", ")})`}
        </span>
      </div>
    </div>
  );
};
