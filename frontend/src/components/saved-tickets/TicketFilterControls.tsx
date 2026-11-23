"use client";

import React from "react";
import { Calendar, Layers } from "lucide-react";
import { TicketDateGroup } from "./groupTickets";
import { formatDate } from "./ticketFormatters";
import { AlgoFilterBar } from "./AlgoFilterBar";

interface TicketFilterControlsProps {
  tickets: any[];
  filteredTicketsCount: number;
  dateGroups: Array<[string, TicketDateGroup]>;
  selectedAlgoFilter: string;
  onSelectAlgoFilter: (algo: string) => void;
  selectedDateFilter: string;
  onSelectDateFilter: (date: string) => void;
  viewMode: "grouped" | "flat";
  onChangeViewMode: (mode: "grouped" | "flat") => void;
}

export const TicketFilterControls: React.FC<TicketFilterControlsProps> = ({
  tickets,
  filteredTicketsCount,
  dateGroups,
  selectedAlgoFilter,
  onSelectAlgoFilter,
  selectedDateFilter,
  onSelectDateFilter,
  viewMode,
  onChangeViewMode
}) => (
  <div className="space-y-4 pt-2">
    <AlgoFilterBar
      tickets={tickets}
      selectedAlgoFilter={selectedAlgoFilter}
      onSelectAlgoFilter={onSelectAlgoFilter}
    />

    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-amber-400" />
          Lọc theo ngày mở thưởng & kỳ quay ({dateGroups.length} kỳ quay):
        </span>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => onChangeViewMode("grouped")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === "grouped"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Gom theo ngày
          </button>
          <button
            onClick={() => onChangeViewMode("flat")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === "flat"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Danh sách phẳng
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 max-h-36 overflow-y-auto">
        <button
          onClick={() => onSelectDateFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedDateFilter === "all"
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700"
          }`}
        >
          Tất Cả Ngày ({filteredTicketsCount} vé)
        </button>
        <button
          onClick={() =>
            onSelectDateFilter(
              selectedDateFilter === "golden_only" ? "all" : "golden_only"
            )
          }
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
            selectedDateFilter === "golden_only"
              ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-300 shadow-md"
              : "bg-amber-500/15 text-amber-300 border-amber-400/40 hover:bg-amber-500/25"
          }`}
          title="Chỉ lọc những kỳ mở thưởng hiếm hoi có xuất hiện dãy số khóa đủ 8/8 Cổng DNA Giải Độc Đắc 6/6 đáng để sử dụng"
        >
          🎯 Chỉ Kỳ Có Tín Hiệu Độc Đắc 8/8 Cổng (
          {dateGroups.filter(([, g]) => g.goldenRowsCount > 0).length}/
          {dateGroups.length} kỳ)
        </button>
        {dateGroups.map(([key, group]) => {
          const isSelected = selectedDateFilter === group.period;
          return (
            <button
              key={key}
              onClick={() =>
                onSelectDateFilter(isSelected ? "all" : group.period)
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                isSelected
                  ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md"
                  : group.goldenRowsCount > 0
                    ? "bg-amber-950/30 text-amber-200 border-amber-500/40 hover:bg-amber-900/40"
                    : group.winningTicketsCount > 0
                      ? "bg-emerald-950/30 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40"
                      : "bg-slate-850 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700"
              }`}
            >
              <span>Kỳ #{group.period}</span>
              <span className="text-[11px] opacity-80">
                ({formatDate(group.date)})
              </span>
              <span className="font-bold opacity-90">
                • {group.tickets.length} vé
              </span>
              {group.goldenRowsCount > 0 && (
                <span className="text-amber-300 font-black">
                  🎯{group.goldenRowsCount} dãy 8/8 cổng
                </span>
              )}
              {group.winningTicketsCount > 0 && (
                <span className="text-emerald-400 font-black">🏆</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
