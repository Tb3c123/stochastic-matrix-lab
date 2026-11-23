"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { AlgorithmComparisonChart } from "@/components/AlgorithmComparisonChart";
import { getStrategyBadge } from "./ticketFormatters";

interface AlgoPerformanceSectionProps {
  algoPerf: any[];
}

export const AlgoPerformanceSection: React.FC<AlgoPerformanceSectionProps> = ({
  algoPerf
}) => {
  if (algoPerf.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          Đánh Giá Mức Độ Tỉ Lệ Xác Suất Chính Xác Theo Từng Thuật Toán
        </h4>
        <span className="text-[11px] text-slate-500">
          Dựa trên kiểm nghiệm các kỳ quá khứ & đối soát thực tế
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {algoPerf.map((algo) => {
          const badge = getStrategyBadge(algo.strategy_code);
          return (
            <div
              key={algo.strategy_code}
              className="bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                  {algo.name.split("(")[0]}
                </span>
                <span className="text-xs font-black text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {algo.confidence_rating}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">
                    Độ chính xác thực nghiệm:
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    {algo.historical_accuracy_pct}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all"
                    style={{ width: `${algo.historical_accuracy_pct}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    Đã lưu: <b>{algo.total_tickets_saved} vé</b>
                  </span>
                  <span>
                    Đã đối soát: <b>{algo.evaluated_tickets} vé</b>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlgorithmComparisonChart data={algoPerf} />
    </div>
  );
};
