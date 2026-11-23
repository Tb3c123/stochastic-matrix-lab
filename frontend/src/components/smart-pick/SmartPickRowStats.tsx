"use client";

import React from "react";
import { Play, AlertCircle } from "lucide-react";
import { RowStats } from "./types";

interface SmartPickRowStatsProps {
  stats: RowStats | null;
  error?: string;
  isComplete: boolean;
  maxNumber: number;
  onRunBacktest: (numbers: number[]) => void;
}

export const SmartPickRowStats: React.FC<SmartPickRowStatsProps> = ({
  stats,
  error,
  isComplete,
  maxNumber,
  onRunBacktest
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
    {stats ? (
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="text-slate-400 flex flex-wrap items-center gap-2.5">
          <span>
            Tổng: <b className="text-white">{stats.sum}</b>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Chẵn/Lẻ: <b className="text-white">{stats.ratio}</b>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-medium">
            Có Thưởng: <b>{stats.anyPrizeRatio}</b> ({stats.deltaStr})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono"
            title="Xác suất giải Đặc Biệt / Jackpot"
          >
            🏆 Độc Đắc: <b>{stats.jackpotProbStr}</b>
          </span>
          <span
            className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-purple-300 font-mono"
            title="Xác suất trúng Giải Nhất (5 số)"
          >
            🥇 G1: <b>{stats.firstPrizeRatio}</b>
          </span>
          <span
            className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 text-sky-300 font-mono"
            title="Xác suất trúng Giải Nhì (4 số)"
          >
            🥈 G2: <b>{stats.secondPrizeRatio}</b>
          </span>
          <span
            className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono"
            title="Xác suất trúng Giải Ba (3 số)"
          >
            🥉 G3: <b>{stats.thirdPrizeRatio}</b>
          </span>
        </div>
      </div>
    ) : error ? (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{error}</span>
      </div>
    ) : (
      <span className="text-xs text-slate-500 italic">
        Điền đủ 6 số (01-{maxNumber}) để xem thông số & đối soát kỳ sắp tới
      </span>
    )}

    <button
      disabled={!isComplete}
      onClick={() => {
        if (stats) onRunBacktest(stats.sorted);
      }}
      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
        isComplete
          ? "text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer hover:border-amber-500/50 shadow-md"
          : "text-slate-600 bg-slate-900 border border-slate-800 cursor-not-allowed opacity-50"
      }`}
    >
      <Play
        className={`w-3.5 h-3.5 ${
          isComplete ? "text-amber-400" : "text-slate-600"
        }`}
      />
      🎯 Đối Soát Kỳ Sắp Tới
    </button>
  </div>
);
