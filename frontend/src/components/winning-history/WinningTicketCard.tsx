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
  const rowsToDisplay =
    isExpanded && allRowsEval.length > 0 ? allRowsEval : winningRows;

  return (
    <div
      className={`bg-slate-900/90 border rounded-2xl p-5 transition-all shadow-lg relative overflow-hidden ${
        isExpanded
          ? "border-emerald-400 ring-2 ring-emerald-500/20"
          : "border-amber-500/30 hover:border-amber-500/50"
      }`}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-emerald-400 to-amber-600" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-white flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Kỳ #{ticket.target_draw_period} • {ticket.target_draw_date}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-500/15 text-violet-200 border border-violet-500/30">
            {ticket.strategy_name || "Cá Thể Alpha AI"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-emerald-300 font-black font-mono">
              +{formatVND(ticket.total_prize_vnd)} ({winningRows.length}/
              {ticket.rows_count || 5} dãy trúng)
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
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
          <WinningTicketRowItem
            key={rIdx}
            row={row}
            rowIdx={rIdx}
            gameCode={ticket.game_code}
          />
        ))}
      </div>
    </div>
  );
};
