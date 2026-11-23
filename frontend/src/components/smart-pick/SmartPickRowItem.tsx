"use client";

import React from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { RowSelection, StrategyType } from "./types";
import { calculateRowStats } from "./rowStatsUtils";
import { SmartPickRowStats } from "./SmartPickRowStats";
import { SmartPickBallInputs } from "./SmartPickBallInputs";

interface SmartPickRowItemProps {
  row: RowSelection;
  defaultStrategy: StrategyType;
  isPower: boolean;
  maxNumber: number;
  loading: boolean;
  onStrategyChange: (strategy: StrategyType) => void;
  onInputChange: (inputIdx: number, val: string) => void;
  onSpecialChange: (val: string) => void;
  onRandomFill: () => void;
  onClear: () => void;
  onRunBacktest: (numbers: number[]) => void;
}

const STRATEGY_BADGE_CLASSES: Record<StrategyType, string> = {
  balanced: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  mean_reversion: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  pure_random: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  custom_manual: "bg-purple-500/10 text-purple-400 border-purple-500/30"
};

export const SmartPickRowItem: React.FC<SmartPickRowItemProps> = ({
  row,
  defaultStrategy,
  isPower,
  maxNumber,
  loading,
  onStrategyChange,
  onInputChange,
  onSpecialChange,
  onRandomFill,
  onClear,
  onRunBacktest
}) => {
  const isComplete = row.numbers.length === 6 && !row.error;
  const stats = isComplete
    ? calculateRowStats(row.numbers, isPower, row.specialNumber)
    : null;
  const rowStrat = row.strategy || defaultStrategy;

  return (
    <div
      className={`border rounded-2xl p-4 md:p-5 transition-all ${
        isComplete
          ? "bg-slate-800/50 border-slate-700"
          : row.error
            ? "bg-red-950/20 border-red-900/50"
            : "bg-slate-800/30 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
              {row.label.replace("Dãy ", "")}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{row.label}</span>
                <select
                  value={rowStrat}
                  onChange={(e) =>
                    onStrategyChange(e.target.value as StrategyType)
                  }
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${STRATEGY_BADGE_CLASSES[rowStrat]}`}
                  title="Phương thức / Thuật toán áp dụng cho dãy số này"
                >
                  <option value="custom_manual">✍️ Điền Tay</option>
                  <option value="balanced">⚡ Cân Bằng</option>
                  <option value="mean_reversion">📈 Hồi Quy</option>
                  <option value="pure_random">🎲 Ngẫu Nhiên</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                {isComplete
                  ? "✓ Đã điền đủ 6 số"
                  : `Đã điền ${row.numbers.length}/6 số`}
              </p>
            </div>
          </div>

          <SmartPickBallInputs
            inputs={row.inputs}
            error={row.error}
            isPower={isPower}
            specialInput={row.specialInput}
            onInputChange={onInputChange}
            onSpecialChange={onSpecialChange}
          />

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRandomFill}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1"
              title="Gợi ý ngẫu nhiên cho dãy này"
            >
              <Sparkles className="w-3 h-3" /> Gợi ý dãy
            </button>
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
              title="Xóa dãy này"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <SmartPickRowStats
          stats={stats}
          error={row.error}
          isComplete={isComplete}
          maxNumber={maxNumber}
          onRunBacktest={onRunBacktest}
        />
      </div>
    </div>
  );
};
