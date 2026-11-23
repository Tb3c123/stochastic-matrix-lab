"use client";

import React from "react";
import { Trophy } from "lucide-react";

interface AiTicketRowItemProps {
  row: number[];
  rIdx: number;
  forecast: any;
}

export const AiTicketRowItem: React.FC<AiTicketRowItemProps> = ({
  row,
  rIdx,
  forecast
}) => {
  const sum = row.reduce((a, b) => a + b, 0);
  const evens = row.filter((n) => n % 2 === 0).length;
  const isGoldenRow = !!forecast.is_golden_row;
  const gatesPassed = forecast.jackpot_gates_passed ?? (isGoldenRow ? 8 : 6);

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
        isGoldenRow
          ? "bg-gradient-to-r from-amber-950/35 via-slate-900/90 to-slate-900/90 border-amber-400/60 ring-1 ring-amber-400/30 shadow-md shadow-amber-500/10"
          : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shadow-md shrink-0 ${
            isGoldenRow
              ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black"
              : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
          }`}
        >
          {String.fromCharCode(65 + rIdx)}
        </span>

        {isGoldenRow ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/50 shrink-0">
            🎯 ĐẠT 8/8 CỔNG DNA ĐỘC ĐẮC ({forecast.row_beauty_score}đ — NÊN
            DÙNG)
          </span>
        ) : (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0"
            title={(forecast.failed_golden_gates || []).join(" | ")}
          >
            Đạt {gatesPassed}/8 Cổng DNA
          </span>
        )}

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
            rIdx < 2
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
              : rIdx === 2
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-violet-500/10 text-violet-400 border-violet-500/30"
          }`}
        >
          {forecast.algorithm_name ||
            (rIdx < 2
              ? "AI Khai Thác (Bayes + Gauss)"
              : rIdx === 2
                ? "AI Hồi Quy Chu Kỳ Trễ"
                : "AI Thăm Dò (Bandit Agent)")}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {row.map((num) => (
            <span
              key={num}
              className="w-9 h-9 rounded-full ball-red text-white font-bold text-sm flex items-center justify-center shadow-md"
            >
              {num < 10 ? `0${num}` : num}
            </span>
          ))}

          {forecast.special_number && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-amber-500 font-extrabold text-xs">+</span>
              <span
                className="w-9 h-9 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20"
                title="Bóng Đặc Biệt Jackpot 2 (Được chấm điểm theo Trọng số AI)"
              >
                {forecast.special_number < 10
                  ? `0${forecast.special_number}`
                  : forecast.special_number}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
        <span>
          Tổng: <b className="text-white">{sum}</b>
        </span>
        <span>
          Chẵn/Lẻ:{" "}
          <b className="text-white">
            {evens}C : {6 - evens}L
          </b>
        </span>
        {forecast.ac_value !== undefined && (
          <span>
            AC: <b className="text-emerald-300">{forecast.ac_value}/10</b>
          </span>
        )}
        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-300 font-semibold">
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>
            XS Độc Đắc:{" "}
            <b className="font-mono text-amber-400">
              {forecast.jackpot_probability_display || "1/8.14M (+18%)"}
            </b>
          </span>
        </div>
      </div>
    </div>
  );
};
