"use client";

import React from "react";
import { Sparkles, RotateCcw, BookmarkCheck } from "lucide-react";
import { StrategyType } from "./types";

interface SmartPickToolbarProps {
  gameCode: string;
  rowCount: number;
  onRowCountChange: (count: number) => void;
  strategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  loading: boolean;
  saving: boolean;
  validRowsCount: number;
  onGenerateAll: () => void;
  onClearAll: () => void;
  onSaveTicket: () => void;
}

const ACCURACY_LABELS: Record<StrategyType, string> = {
  custom_manual: "58.0% (B+)",
  balanced: "82.5% (A+)",
  mean_reversion: "76.0% (A)",
  pure_random: "52.0% (B)"
};

export const SmartPickToolbar: React.FC<SmartPickToolbarProps> = ({
  gameCode,
  rowCount,
  onRowCountChange,
  strategy,
  onStrategyChange,
  loading,
  saving,
  validRowsCount,
  onGenerateAll,
  onClearAll,
  onSaveTicket
}) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-800">
    <div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
        <Sparkles className="w-3.5 h-3.5" /> Bộ 1 Vé -{" "}
        {gameCode === "power_6_55" ? "Power 6/55 (01-55)" : "Mega 6/45 (01-45)"}
      </div>
      <h3 className="text-2xl font-bold text-white">
        Soạn Vé & Tùy Chọn Thuật Toán Từng Dãy
      </h3>
      <p className="text-sm text-slate-400">
        Tự do điền tay hoặc chọn thuật toán tự động cho từng dãy số, lưu lại để
        hệ thống phân tích xác suất & đối soát tự động khi có kết quả.
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
        <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">
          Số dãy trên vé:
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRowCountChange(Math.max(1, rowCount - 1))}
            className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={10}
            value={rowCount}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                onRowCountChange(Math.max(1, Math.min(10, val)));
              }
            }}
            className="w-10 text-center font-bold text-amber-400 bg-slate-900 border border-slate-700 rounded-lg text-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={() => onRowCountChange(Math.min(10, rowCount + 1))}
            className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <select
          value={strategy}
          onChange={(e) => onStrategyChange(e.target.value as StrategyType)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs md:text-sm rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
        >
          <option value="custom_manual">✍️ Tự Điền Thủ Công (Điền Tay)</option>
          <option value="balanced">⚡ Thuật toán: Cân Bằng (Balanced)</option>
          <option value="mean_reversion">
            📈 Thuật toán: Hồi Quy (Mean Reversion)
          </option>
          <option value="pure_random">
            🎲 Thuật toán: Ngẫu Nhiên (Pure Random)
          </option>
        </select>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800/80 border border-slate-700/80 text-amber-400">
          <span>
            Độ chính xác: <b>{ACCURACY_LABELS[strategy]}</b>
          </span>
        </div>
      </div>

      <button
        onClick={onGenerateAll}
        disabled={loading}
        className="px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        title="Điền tự động số thuật toán cho tất cả các dãy"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />{" "}
        {loading ? "Đang Tính..." : "Điền Tự Động"}
      </button>

      <button
        onClick={onClearAll}
        className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
        title="Xóa trắng tất cả các dãy"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <button
        onClick={onSaveTicket}
        disabled={saving || validRowsCount === 0}
        className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        title="Lưu vé và đặt lịch theo dõi tự động cho kỳ xổ tiếp theo"
      >
        <BookmarkCheck className="w-4 h-4" />
        {saving ? "Đang Lưu..." : `Lưu Vé (${validRowsCount}/${rowCount} Dãy)`}
      </button>
    </div>
  </div>
);
