"use client";

import React from "react";
import { Target } from "lucide-react";

interface OfficialDrawNumbersBarProps {
  period: string;
  winningNumbers: number[];
  specialNumber?: number | null;
  bestMatchCount: number;
}

export const OfficialDrawNumbersBar: React.FC<OfficialDrawNumbersBarProps> = ({
  period,
  winningNumbers,
  specialNumber,
  bestMatchCount
}) => (
  <div className="mt-4 p-3 bg-slate-850/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-2">
      <span className="text-slate-400 font-semibold flex items-center gap-1">
        <Target className="w-3.5 h-3.5 text-amber-400" /> Kết quả chính thức kỳ
        #{period}:
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {winningNumbers.map((num: number) => (
          <span
            key={num}
            className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-white font-bold text-[11px] flex items-center justify-center font-mono"
          >
            {num < 10 ? `0${num}` : num}
          </span>
        ))}
        {specialNumber && (
          <div className="flex items-center gap-1 pl-1">
            <span className="text-amber-500 font-extrabold text-xs">+</span>
            <span
              className="w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-[11px] flex items-center justify-center font-mono shadow-sm"
              title="Số đặc biệt Power 6/55"
            >
              {specialNumber < 10 ? `0${specialNumber}` : specialNumber}
            </span>
          </div>
        )}
      </div>
    </div>
    <span className="text-[11px] text-slate-400">
      Trùng khớp cao nhất:{" "}
      <b className="text-emerald-400">{bestMatchCount}/6 số</b>
    </span>
  </div>
);
