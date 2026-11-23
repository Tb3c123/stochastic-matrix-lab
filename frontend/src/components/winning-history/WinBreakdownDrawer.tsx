"use client";

import React from "react";
import { Award } from "lucide-react";
import { formatVND, getStrategyBadge } from "./formatters";

interface WinBreakdownDrawerProps {
  winningTickets: any[];
  totalWinningRowsCount: number;
  totalSpentVnd: number;
  rowCostVnd: number;
  expandedId: number | null;
  onSelectTicket: (ticketId: number) => void;
}

export const WinBreakdownDrawer: React.FC<WinBreakdownDrawerProps> = ({
  winningTickets,
  totalWinningRowsCount,
  totalSpentVnd,
  rowCostVnd,
  expandedId,
  onSelectTicket
}) => (
  <div className="mt-5 p-4 md:p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in duration-200">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
      <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-emerald-300">
        <Award className="w-4 h-4 text-emerald-400" />
        <span>
          Danh Sách Tóm Tắt {winningTickets.length} Vé Trúng (Nhấn vào vé bất kỳ
          để nhảy tới & mở đủ 5 dãy):
        </span>
      </div>
      <span className="text-[11px] text-slate-400">
        Tổng cộng{" "}
        <b className="text-amber-300">{totalWinningRowsCount} lần/dãy trúng giải</b>{" "}
        • Tiêu hao toàn bộ:{" "}
        <b className="text-rose-400">{formatVND(totalSpentVnd)}</b>
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
      {winningTickets.map((tItem, idx) => {
        const sBadge = getStrategyBadge(tItem.strategy);
        const wRows = tItem.winning_rows || [];
        const isSelected = expandedId === tItem.id;
        const tRowsCount = tItem.rows_count || 5;
        const tCostVnd = tItem.ticket_cost_vnd || tRowsCount * rowCostVnd;

        return (
          <button
            key={tItem.id || idx}
            type="button"
            onClick={() => onSelectTicket(tItem.id)}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              isSelected
                ? "bg-emerald-900/30 border-emerald-400 ring-1 ring-emerald-400"
                : "bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    tItem.game_code === "power_6_55"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {tItem.game_code === "power_6_55" ? "6/55" : "6/45"}
                </span>
                <span className="text-xs font-bold text-white">
                  Vé #{tItem.id} • Kỳ #{tItem.target_draw_period}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-400 block">
                  +{formatVND(tItem.total_prize_vnd)}
                </span>
                <span className="text-[10px] font-mono text-rose-400/90 block">
                  Vốn: -{formatVND(tCostVnd)} ({tRowsCount} dãy)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
              <span>
                Ngày: <b className="text-slate-200">{tItem.target_draw_date}</b>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sBadge.cls}`}
              >
                {sBadge.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
              {wRows.map((wr: any, wIdx: number) => (
                <span
                  key={wIdx}
                  className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300"
                >
                  {wr.row_label ||
                    `Dãy ${String.fromCharCode(65 + (wr.row_index || wIdx))}`}
                  : {wr.prize_name} ({wr.match_count}/6 số
                  {wr.matched_special ? " + ĐB" : ""})
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
