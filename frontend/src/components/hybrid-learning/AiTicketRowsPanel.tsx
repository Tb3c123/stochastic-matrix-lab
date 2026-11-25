"use client";

import React from "react";
import { Brain, CheckCircle2 } from "lucide-react";
import { formatDrawDateWithDay } from "./types";
import { AiTicketRowItem } from "./AiTicketRowItem";

interface AiTicketRowsPanelProps {
  latestAiTickets: any[];
  selectedTicket: any;
  activeTicketIdx: number;
  onSelectTicketIdx: (idx: number) => void;
}

export const AiTicketRowsPanel: React.FC<AiTicketRowsPanelProps> = ({
  latestAiTickets,
  selectedTicket,
  activeTicketIdx,
  onSelectTicketIdx,
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-slate-700" /> Chi Tiết {latestAiTickets.length} Vé Hội Đồng • Kỳ #{selectedTicket.target_draw_period}
        </span>
        <span className="text-xs text-slate-600">
          Ngày mở thưởng:{" "}
          <b className="text-slate-900">
            {formatDrawDateWithDay(selectedTicket.target_draw_date)}
          </b>
        </span>
      </div>
      <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Tự động chờ đối soát ({latestAiTickets.length * 5} dãy bao vây)
      </span>
    </div>

    {latestAiTickets.length > 1 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {latestAiTickets.map((tItem: any, idx: number) => {
          const hasGolden = !!tItem.has_golden_signal;
          const isSelected = activeTicketIdx === idx;
          return (
            <button
              key={tItem.id || idx}
              onClick={() => onSelectTicketIdx(idx)}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-between gap-2 cursor-pointer text-left ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{tItem.variant_name || `Vé #${idx + 1}`}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                  isSelected
                    ? "bg-white/20 text-white font-bold"
                    : hasGolden
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-200 text-slate-700"
                }`}
              >
                {tItem.max_gates_passed ?? 7}/8 DNA
              </span>
            </button>
          );
        })}
      </div>
    )}

    <div className="space-y-2.5">
      {(selectedTicket.rows || []).map((row: number[], rIdx: number) => (
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
