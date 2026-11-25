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
  forecast,
}) => {
  const sum = row.reduce((a, b) => a + b, 0);
  const evens = row.filter((n) => n % 2 === 0).length;
  const isGoldenRow = !!forecast.is_golden_row;
  const gatesPassed = forecast.jackpot_gates_passed ?? (isGoldenRow ? 8 : 6);

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
        isGoldenRow
          ? "bg-amber-50/50 border-amber-300"
          : "bg-[#fafbfc] border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
            isGoldenRow
              ? "bg-amber-600 text-white"
              : "bg-slate-800 text-white"
          }`}
        >
          {String.fromCharCode(65 + rIdx)}
        </span>

        {isGoldenRow ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
            ĐẠT 8/8 CỔNG DNA ({forecast.row_beauty_score}đ)
          </span>
        ) : (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
            title={(forecast.failed_golden_gates || []).join(" | ")}
          >
            Đạt {gatesPassed}/8 Cổng DNA
          </span>
        )}

        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200 shrink-0">
          {forecast.council_badge ||
            forecast.algorithm_name ||
            (rIdx < 2 ? "AI Khai Thác" : rIdx === 2 ? "AI Chu Kỳ Trễ" : "AI Thăm Dò")}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {row.map((num) => (
            <span
              key={num}
              className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center font-mono ${
                isGoldenRow
                  ? "bg-amber-100 border-[1.5px] border-amber-600 text-slate-900"
                  : "ball-red"
              }`}
            >
              {num < 10 ? `0${num}` : num}
            </span>
          ))}

          {forecast.special_number && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-slate-400 font-bold text-xs">+</span>
              <span
                className="w-9 h-9 rounded-full ball-special font-bold text-sm flex items-center justify-center font-mono"
                title="Bóng Đặc Biệt Jackpot 2"
              >
                {forecast.special_number < 10
                  ? `0${forecast.special_number}`
                  : forecast.special_number}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
        <span>
          Tổng: <b className="text-slate-900">{sum}</b>
        </span>
        <span>
          Chẵn/Lẻ:{" "}
          <b className="text-slate-900">
            {evens}C : {6 - evens}L
          </b>
        </span>
        {forecast.ac_value !== undefined && (
          <span>
            AC: <b className="text-emerald-800">{forecast.ac_value}/10</b>
          </span>
        )}
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-900 font-semibold">
          <Trophy className="w-3 h-3 text-amber-700" />
          <span>
            XS Độc Đắc:{" "}
            <b className="font-mono text-amber-900">
              {forecast.jackpot_probability_display || "1/8.14M (+18%)"}
            </b>
          </span>
        </div>
      </div>
    </div>
  );
};
