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
  isLiveMode?: boolean;
}

export const WinningKpiGrid: React.FC<WinningKpiGridProps> = ({
  summary,
  totalWinningRowsCount,
  selectedTierFilter,
  onSelectTierFilter,
  isLiveMode = false,
}) => {
  const winDraws = summary.winning_draws_count ?? 0;
  const evalDraws = summary.evaluated_draws_count ?? 0;
  const drawPct = summary.draw_win_rate_pct ?? summary.win_rate_pct ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Tần Suất Kỳ Có Giải</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">{drawPct}%</div>
          <p className="text-[11px] text-slate-600 mt-1">
            Thắng <b className="text-emerald-800">{winDraws}</b> / {evalDraws} kỳ mở thưởng
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">Tổng Số Dãy Trúng</span>
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {totalWinningRowsCount} <span className="text-xs font-semibold text-slate-500">dãy</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">
            Trên {summary.total_winning_tickets || 0} vé có giải
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Tổng Giải Thưởng Quy Đổi</span>
            <Trophy className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-extrabold text-amber-900 font-mono truncate">
            {formatVND(summary.total_prize_vnd || 0)}
          </div>
          <p className="text-[11px] text-slate-600 mt-1">
            {isLiveMode ? "Tiền thưởng thật từ vé chốt trước 17:45" : "Mô phỏng hồi tố toán học (không phải tiền thật)"}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Giải Cao Nhất Đạt Được</span>
            <Sparkles className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-sm md:text-base font-bold text-slate-900 truncate" title={summary.highest_prize_name}>
            {summary.highest_prize_name || "Chưa có"}
          </div>
          <p className="text-[11px] text-slate-600 mt-1">
            {isLiveMode ? "Cập nhật tự động sau 18:35 mỗi kỳ quay" : "Tự nâng cấp khi có cá thể mới vượt mặt"}
          </p>
        </div>
      </div>

      {!isLiveMode && (
        <WinningTierPills
          tierCounts={summary.tier_counts}
          selectedTierFilter={selectedTierFilter}
          onSelectTierFilter={onSelectTierFilter}
        />
      )}
    </div>
  );
};
