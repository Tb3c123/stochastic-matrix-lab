"use client";

import React, { useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { useWinningHistory } from "./winning-history/useWinningHistory";
import { WinningKpiGrid } from "./winning-history/WinningKpiGrid";
import { WinBreakdownDrawer } from "./winning-history/WinBreakdownDrawer";
import { WinningFilterToolbar } from "./winning-history/WinningFilterToolbar";
import { WinningTicketCard } from "./winning-history/WinningTicketCard";
import { WinningEmptyState } from "./winning-history/WinningEmptyState";

interface WinningHistoryTrackerProps {
  gameCode: string;
  refreshTrigger?: number;
  onNavigateToGenerator?: () => void;
  onNavigateToTickets?: () => void;
}

export const WinningHistoryTracker: React.FC<WinningHistoryTrackerProps> = ({
  refreshTrigger = 0,
  onNavigateToGenerator,
  onNavigateToTickets
}) => {
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showWinBreakdown, setShowWinBreakdown] = useState<boolean>(false);

  const {
    loading,
    summary,
    rowCostVnd,
    totalEvaluatedRows,
    totalSpentVnd,
    winningTickets,
    totalWinningRowsCount,
    megaWinCount,
    powerWinCount,
    fetchWinningHistory
  } = useWinningHistory(selectedGameFilter, selectedTierFilter, refreshTrigger);

  const handleSelectWinningTicket = (ticketId: number) => {
    setExpandedId(ticketId);
    const el = document.getElementById(`winning-ticket-${ticketId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
              <Trophy className="w-3.5 h-3.5" /> Bảng Vàng Đối Soát Trúng Vé
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              Lịch Sử Vé Trúng Thưởng
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Lưu trữ vinh danh tất cả các vé và dãy số đã trúng thưởng qua các
              kỳ mở thưởng chính thức của Vietlott
            </p>
          </div>
          <button
            onClick={fetchWinningHistory}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm Mới
          </button>
        </div>

        <WinningKpiGrid
          summary={summary}
          totalSpentVnd={totalSpentVnd}
          totalEvaluatedRows={totalEvaluatedRows}
          totalWinningRowsCount={totalWinningRowsCount}
          megaWinCount={megaWinCount}
          powerWinCount={powerWinCount}
          showWinBreakdown={showWinBreakdown}
          onToggleWinBreakdown={() => setShowWinBreakdown((prev) => !prev)}
          selectedTierFilter={selectedTierFilter}
          onSelectTierFilter={setSelectedTierFilter}
        />

        {showWinBreakdown && winningTickets.length > 0 && (
          <WinBreakdownDrawer
            winningTickets={winningTickets}
            totalWinningRowsCount={totalWinningRowsCount}
            totalSpentVnd={totalSpentVnd}
            rowCostVnd={rowCostVnd}
            expandedId={expandedId}
            onSelectTicket={handleSelectWinningTicket}
          />
        )}
      </div>

      <WinningFilterToolbar
        selectedGameFilter={selectedGameFilter}
        onSelectGameFilter={setSelectedGameFilter}
        selectedTierFilter={selectedTierFilter}
        onSelectTierFilter={setSelectedTierFilter}
      />

      {winningTickets.length === 0 ? (
        <WinningEmptyState
          onNavigateToGenerator={onNavigateToGenerator}
          onNavigateToTickets={onNavigateToTickets}
        />
      ) : (
        <div className="space-y-4">
          {winningTickets.map((ticket) => (
            <WinningTicketCard
              key={ticket.id}
              ticket={ticket}
              isExpanded={expandedId === ticket.id}
              rowCostVnd={rowCostVnd}
              onToggleExpand={() =>
                setExpandedId(expandedId === ticket.id ? null : ticket.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
