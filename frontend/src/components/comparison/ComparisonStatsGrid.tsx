"use client";

import React from "react";

interface ComparisonStatsGridProps {
  numbers: number[];
  isPower: boolean;
}

export const ComparisonStatsGrid: React.FC<ComparisonStatsGridProps> = ({
  numbers,
  isPower
}) => {
  const jackpotChance = isPower ? "1 / 28,989,675" : "1 / 8,145,060";
  const anyPrizeChance = isPower ? "~1.83%" : "~2.38%";
  const sumVal = numbers.reduce((acc, curr) => acc + curr, 0);
  const evenCount = numbers.filter((n) => n % 2 === 0).length;
  const oddCount = 6 - evenCount;

  return (
    <>
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Dãy Số Bạn Đã Chọn Đối Soát:
        </span>
        <div className="flex flex-wrap items-center gap-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-800 justify-center">
          {numbers.map((num) => (
            <div
              key={num}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full ball-red text-white font-extrabold text-base md:text-xl flex items-center justify-center shadow-lg"
            >
              {num < 10 ? `0${num}` : num}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">
            Xác Suất Jackpot
          </span>
          <span className="text-xs font-bold text-amber-400 block mt-1">
            {jackpotChance}
          </span>
        </div>
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">
            Tỷ Lệ Trúng Giải Ba
          </span>
          <span className="text-xs font-bold text-emerald-400 block mt-1">
            {anyPrizeChance}
          </span>
        </div>
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">Tổng Dãy Số</span>
          <span className="text-xs font-bold text-white block mt-1">
            {sumVal}
          </span>
        </div>
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">
            Tỷ Lệ Chẵn : Lẻ
          </span>
          <span className="text-xs font-bold text-white block mt-1">
            {evenCount}C : {oddCount}L
          </span>
        </div>
      </div>
    </>
  );
};
