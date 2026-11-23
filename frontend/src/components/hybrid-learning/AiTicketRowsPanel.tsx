"use client";

import React from "react";
import { Brain, CheckCircle2 } from "lucide-react";
import { formatDrawDateWithDay } from "./types";
import { SignalDetectorBanner } from "./SignalDetectorBanner";
import { AiTicketRowItem } from "./AiTicketRowItem";

interface AiTicketRowsPanelProps {
  latestAiTickets: any[];
  selectedTicket: any;
  activeTicketIdx: number;
  onSelectTicketIdx: (idx: number) => void;
  hasPlayableSignal: boolean;
  playableGoldenRows: any[];
}

export const AiTicketRowsPanel: React.FC<AiTicketRowsPanelProps> = ({
  latestAiTickets,
  selectedTicket,
  activeTicketIdx,
  onSelectTicketIdx,
  hasPlayableSignal,
  playableGoldenRows
}) => (
  <div className="bg-slate-850/80 border border-violet-500/30 rounded-2xl p-5 md:p-6 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> Tổ Hợp {latestAiTickets.length} Vé
          AI Cho Kỳ Tới #{selectedTicket.target_draw_period}
        </span>
        <span className="text-xs text-slate-400">
          Lần xổ:{" "}
          <b className="text-amber-300">
            {formatDrawDateWithDay(selectedTicket.target_draw_date)}
          </b>
        </span>
      </div>
      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu {latestAiTickets.length}{" "}
        vé ({latestAiTickets.length * 5} dãy) vào sổ đối soát
      </span>
    </div>

    <SignalDetectorBanner
      hasPlayableSignal={hasPlayableSignal}
      playableGoldenRows={playableGoldenRows}
      selectedTicket={selectedTicket}
    />

    {latestAiTickets.length > 1 && (
      <div className="flex flex-wrap items-center gap-2">
        {latestAiTickets.map((tItem: any, idx: number) => {
          const hasGolden = !!tItem.has_golden_signal;
          const isSelected = activeTicketIdx === idx;
          return (
            <button
              key={tItem.id || idx}
              onClick={() => onSelectTicketIdx(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? hasGolden
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20 font-black"
                    : "bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/20"
                  : hasGolden
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                    : "bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {hasGolden && (
                <span>🎯 {tItem.golden_rows_count} Dãy Đạt 8/8 Cổng</span>
              )}
              <span>{tItem.variant_name || `Vé #${idx + 1}`}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isSelected && hasGolden
                    ? "bg-slate-950/25 text-slate-950 font-black"
                    : "bg-slate-950/50 text-slate-300"
                }`}
              >
                {tItem.max_gates_passed ?? 6}/8 cổng
              </span>
            </button>
          );
        })}
      </div>
    )}

    <div className="space-y-2.5">
      {selectedTicket.rows.map((row: number[], rIdx: number) => (
        <AiTicketRowItem
          key={rIdx}
          row={row}
          rIdx={rIdx}
          forecast={selectedTicket.row_forecasts?.[rIdx] || {}}
        />
      ))}
    </div>
  </div>
);
