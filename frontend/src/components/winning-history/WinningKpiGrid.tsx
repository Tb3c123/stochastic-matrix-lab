"use client";

import React from "react";
import {
  Trophy,
  Wallet,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { formatVND } from "./formatters";
import { WinningTierPills } from "./WinningTierPills";

interface WinningKpiGridProps {
  summary: any;
  totalSpentVnd: number;
  totalEvaluatedRows: number;
  totalWinningRowsCount: number;
  megaWinCount: number;
  powerWinCount: number;
  showWinBreakdown: boolean;
  onToggleWinBreakdown: () => void;
  selectedTierFilter: string;
  onSelectTierFilter: (tier: string) => void;
}

export const WinningKpiGrid: React.FC<WinningKpiGridProps> = ({
  summary,
  totalSpentVnd,
  totalEvaluatedRows,
  totalWinningRowsCount,
  megaWinCount,
  powerWinCount,
  showWinBreakdown,
  onToggleWinBreakdown,
  selectedTierFilter,
  onSelectTierFilter
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
      <div className="bg-slate-850/80 border border-amber-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Tổng Tiền Đã Trúng</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-xl md:text-2xl font-black text-amber-400 font-mono tracking-tight">
          {formatVND(summary.total_prize_vnd)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Từ {summary.total_winning_tickets} vé ({totalWinningRowsCount} dãy trúng)
        </p>
      </div>

      <div className="bg-slate-850/80 border border-rose-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-300">Số Tiền Đã Tiêu Hao</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-xl md:text-2xl font-black text-rose-400 font-mono tracking-tight">
          {formatVND(totalSpentVnd)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {summary.total_evaluated_tickets} vé ({totalEvaluatedRows} dãy × 10.000 đ)
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleWinBreakdown}
        className={`text-left rounded-2xl p-4 md:p-5 transition-all cursor-pointer relative overflow-hidden border ${
          showWinBreakdown
            ? "bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
            : "bg-slate-850/80 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800/80 shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            Số Lần / Vé Trúng
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Nhấn xem
            </span>
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            {showWinBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
            {summary.total_winning_tickets} <span className="text-xs font-semibold text-emerald-300">vé</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-sm font-bold text-amber-300 font-mono">
            {totalWinningRowsCount} <span className="text-xs font-normal text-slate-300">dãy trúng</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80">
          <span>
            Mega: <b className="text-red-400">{megaWinCount}</b> • Power: <b className="text-amber-400">{powerWinCount}</b>
          </span>
          <span className="text-emerald-400 font-semibold underline underline-offset-2">
            {showWinBreakdown ? "Đóng danh sách ▲" : "Xem vé nào trúng ▼"}
          </span>
        </div>
      </button>

      <div className="bg-slate-850/80 border border-slate-800 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Tỷ Lệ Vé Trúng</span>
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-xl md:text-2xl font-bold text-sky-400 font-mono">
          {summary.win_rate_pct}%
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Trên tổng {summary.total_evaluated_tickets} vé đã đối soát
        </p>
      </div>

      <div className="bg-slate-850/80 border border-slate-800 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Giải Lớn Nhất</span>
          <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-sm md:text-base font-bold text-white truncate" title={summary.highest_prize_name}>
          {summary.highest_prize_name}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Đạt kỷ lục cao nhất</p>
      </div>
    </div>

    <WinningTierPills
      tierCounts={summary.tier_counts}
      selectedTierFilter={selectedTierFilter}
      onSelectTierFilter={onSelectTierFilter}
    />
  </>
);
