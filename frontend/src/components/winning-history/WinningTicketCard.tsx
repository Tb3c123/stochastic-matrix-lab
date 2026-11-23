"use client";

import React from "react";
import {
  Trophy,
  Calendar,
  Wallet,
  ChevronDown,
  ChevronUp,
  Zap
} from "lucide-react";
import { formatVND, getStrategyBadge } from "./formatters";
import { WinningTicketRowItem } from "./WinningTicketRowItem";
import { OfficialDrawNumbersBar } from "./OfficialDrawNumbersBar";

interface WinningTicketCardProps {
  ticket: any;
  isExpanded: boolean;
  rowCostVnd: number;
  onToggleExpand: () => void;
}

export const WinningTicketCard: React.FC<WinningTicketCardProps> = ({
  ticket,
  isExpanded,
  rowCostVnd,
  onToggleExpand
}) => {
  const stratBadge = getStrategyBadge(ticket.strategy);
  const winningRows = ticket.winning_rows || [];
  const allRowsEval = ticket.all_rows_evaluation || [];
  const rowsToDisplay =
    isExpanded && allRowsEval.length > 0 ? allRowsEval : winningRows;

  return (
    <div
      id={`winning-ticket-${ticket.id}`}
      className={`bg-slate-900 border rounded-2xl p-5 md:p-6 transition-all shadow-lg relative overflow-hidden ${
        isExpanded
          ? "border-emerald-400 ring-2 ring-emerald-500/20 shadow-emerald-500/10"
          : "border-amber-500/30 hover:border-amber-500/50 shadow-amber-500/5"
      }`}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-emerald-400 to-amber-600"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-300">
            Vé #{ticket.id}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              ticket.game_code === "power_6_55"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-red-500/20 text-red-300 border border-red-500/40"
            }`}
          >
            {ticket.game_code === "power_6_55" ? "Power 6/55" : "Mega 6/45"}
          </span>
          <span className="text-xs font-bold text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Kỳ #{ticket.target_draw_period}
          </span>
          <span className="text-xs text-slate-400">
            Ngày quay: <b className="text-slate-300">{ticket.target_draw_date}</b>
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stratBadge.cls}`}
          >
            {stratBadge.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs text-rose-300 font-semibold">
              Tiêu hao:{" "}
              {formatVND(
                ticket.ticket_cost_vnd || (ticket.rows_count || 5) * rowCostVnd
              )}{" "}
              ({ticket.rows_count || 5} dãy × 10.000 đ)
            </span>
          </div>
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-emerald-300 font-bold">
              Trúng {formatVND(ticket.total_prize_vnd)} ({winningRows.length}/
              {ticket.rows_count || 5} dãy)
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
              isExpanded
                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                : "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700"
            }`}
            title="Xem chi tiết toàn bộ 5 dãy của vé này"
          >
            <span>{isExpanded ? "Thu gọn vé" : "Xem đủ 5 dãy của vé"}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <OfficialDrawNumbersBar
        period={ticket.target_draw_period}
        winningNumbers={ticket.actual_winning_numbers || []}
        specialNumber={ticket.actual_special_number}
        bestMatchCount={ticket.best_match_count}
      />

      <div className="mt-4 space-y-2.5">
        {rowsToDisplay.map((row: any, rIdx: number) => (
          <WinningTicketRowItem
            key={rIdx}
            row={row}
            rowIdx={rIdx}
            gameCode={ticket.game_code}
          />
        ))}
      </div>

      {isExpanded && ticket.learning_feedback && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
          <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-indigo-300 flex items-start gap-2">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-white block mb-0.5">
                Phản hồi học hỏi thuật toán:
              </b>
              {ticket.learning_feedback}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
