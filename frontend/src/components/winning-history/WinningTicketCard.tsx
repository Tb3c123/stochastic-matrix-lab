"use client";

import React from "react";
import { Trophy, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { formatVND } from "./formatters";
import { WinningTicketRowItem } from "./WinningTicketRowItem";
import { OfficialDrawNumbersBar } from "./OfficialDrawNumbersBar";

interface WinningTicketCardProps {
  ticket: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const WinningTicketCard: React.FC<WinningTicketCardProps> = ({
  ticket,
  isExpanded,
  onToggleExpand,
}) => {
  const winningRows = ticket.winning_rows || [];
  const allRowsEval = ticket.all_rows_evaluation || [];
  const rowsToDisplay = isExpanded && allRowsEval.length > 0 ? allRowsEval : winningRows;

  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition-colors shadow-sm relative overflow-hidden ${
        isExpanded ? "border-emerald-400" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-600" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            Kỳ #{ticket.target_draw_period} • {ticket.target_draw_date}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {ticket.strategy_name || "Cá Thể Alpha AI"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-700" />
            <span className="text-xs text-emerald-800 font-bold font-mono">
              +{formatVND(ticket.total_prize_vnd)} ({winningRows.length}/{ticket.rows_count || 5} dãy trúng)
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? "Thu gọn" : "Xem đủ 5 dãy"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <OfficialDrawNumbersBar
        period={ticket.target_draw_period}
        winningNumbers={ticket.actual_winning_numbers || []}
        specialNumber={ticket.actual_special_number}
        bestMatchCount={ticket.best_match_count}
      />

      <div className="mt-3.5 space-y-2">
        {rowsToDisplay.map((row: any, rIdx: number) => (
          <WinningTicketRowItem key={rIdx} row={row} rowIdx={rIdx} gameCode={ticket.game_code} />
        ))}
      </div>
    </div>
  );
};
