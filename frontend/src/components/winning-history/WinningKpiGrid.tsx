"use client";

import React from "react";
import { Trophy, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import { formatVND } from "./formatters";
import { WinningTierPills } from "./WinningTierPills";

interface WinningKpiGridProps {
  summary: any;
  totalWinningRowsCount: number;
  selectedTierFilter: string;
  onSelectTierFilter: (tier: string) => void;
}

export const WinningKpiGrid: React.FC<WinningKpiGridProps> = ({
  summary,
  totalWinningRowsCount,
  selectedTierFilter,
  onSelectTierFilter,
}) => {
  const winDraws = summary.winning_draws_count ?? 0;
  const evalDraws = summary.evaluated_draws_count ?? 0;
  const drawPct = summary.draw_win_rate_pct ?? summary.win_rate_pct ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/80 border border-emerald-500/35 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">
              Tần Suất Kỳ Có Giải
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {drawPct}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Thắng <b className="text-emerald-300">{winDraws}</b> / {evalDraws} kỳ mở thưởng
          </p>
        </div>

        <div className="bg-slate-950/80 border border-sky-500/30 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300">
              Tổng Số Dãy Trúng
            </span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-300 font-mono">
            {totalWinningRowsCount} <span className="text-xs font-semibold text-slate-400">dãy</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Trên {summary.total_winning_tickets || 0} vé có giải
          </p>
        </div>

        <div className="bg-slate-950/80 border border-amber-500/35 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              Tổng Giải Thưởng Quy Đổi
            </span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-black text-amber-300 font-mono truncate">
            {formatVND(summary.total_prize_vnd || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Đối soát từ lịch sử Nhà Vô Địch AI
          </p>
        </div>

        <div className="bg-slate-950/80 border border-violet-500/30 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-300">
              Giải Cao Nhất Đạt Được
            </span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div
            className="mt-2 text-sm md:text-base font-extrabold text-white truncate"
            title={summary.highest_prize_name}
          >
            {summary.highest_prize_name || "Chưa có"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Tự nâng cấp khi có cá thể mới vượt mặt
          </p>
        </div>
      </div>

      <WinningTierPills
        tierCounts={summary.tier_counts}
        selectedTierFilter={selectedTierFilter}
        onSelectTierFilter={onSelectTierFilter}
      />
    </div>
  );
};
