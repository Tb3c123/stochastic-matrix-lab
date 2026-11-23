"use client";

import React, { useState, useMemo } from "react";
import { isTicketMatchingAlgo } from "./saved-tickets/rowAlgoBadges";
import { groupTicketsByDate } from "./saved-tickets/groupTickets";
import { useSavedTickets } from "./saved-tickets/useSavedTickets";
import { SavedTicketsEmptyState } from "./saved-tickets/SavedTicketsEmptyState";
import { SavedTicketsHeader } from "./saved-tickets/SavedTicketsHeader";
import { AlgoPerformanceSection } from "./saved-tickets/AlgoPerformanceSection";
import { TicketFilterControls } from "./saved-tickets/TicketFilterControls";
import { SavedTicketCard } from "./saved-tickets/SavedTicketCard";
import { DateGroupAccordion } from "./saved-tickets/DateGroupAccordion";

interface SavedTicketsTrackerProps {
  gameCode: string;
  refreshTrigger: number;
}

export const SavedTicketsTracker: React.FC<SavedTicketsTrackerProps> = ({
  gameCode,
  refreshTrigger
}) => {
  const {
    tickets,
    algoPerf,
    loading,
    evaluating,
    evaluateNotice,
    fetchTicketsAndPerformance,
    handleEvaluate
  } = useSavedTickets(gameCode, refreshTrigger);

  const [selectedAlgoFilter, setSelectedAlgoFilter] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openRowAudits, setOpenRowAudits] = useState<Record<string, boolean>>({});

  const toggleRowAudit = (ticketId: number, rowIdx: number) => {
    const key = `${ticketId}-${rowIdx}`;
    setOpenRowAudits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDateCollapse = (periodKey: string) => {
    setCollapsedDates((prev) => ({ ...prev, [periodKey]: !prev[periodKey] }));
  };

  const filteredTickets = useMemo(
    () => tickets.filter((t) => isTicketMatchingAlgo(t, selectedAlgoFilter)),
    [tickets, selectedAlgoFilter]
  );

  const dateGroups = useMemo(
    () => groupTicketsByDate(filteredTickets),
    [filteredTickets]
  );

  if (tickets.length === 0 && !loading) {
    return (
      <SavedTicketsEmptyState
        gameCode={gameCode}
        loading={loading}
        onRefresh={fetchTicketsAndPerformance}
      />
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
      <SavedTicketsHeader
        loading={loading}
        evaluating={evaluating}
        evaluateNotice={evaluateNotice}
        onEvaluate={handleEvaluate}
        onRefresh={fetchTicketsAndPerformance}
      />

      <AlgoPerformanceSection algoPerf={algoPerf} />

      <TicketFilterControls
        tickets={tickets}
        filteredTicketsCount={filteredTickets.length}
        dateGroups={dateGroups}
        selectedAlgoFilter={selectedAlgoFilter}
        onSelectAlgoFilter={setSelectedAlgoFilter}
        selectedDateFilter={selectedDateFilter}
        onSelectDateFilter={setSelectedDateFilter}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {viewMode === "grouped" ? (
        <div className="space-y-6">
          {dateGroups
            .filter(([, group]) =>
              selectedDateFilter === "all"
                ? true
                : selectedDateFilter === "golden_only"
                  ? group.goldenRowsCount > 0
                  : group.period === selectedDateFilter
            )
            .map(([key, group]) => (
              <DateGroupAccordion
                key={key}
                group={group}
                isCollapsed={!!collapsedDates[group.period]}
                onToggleCollapse={() => toggleDateCollapse(group.period)}
                expandedId={expandedId}
                onToggleExpandTicket={(id) =>
                  setExpandedId(expandedId === id ? null : id)
                }
                openRowAudits={openRowAudits}
                onToggleRowAudit={toggleRowAudit}
              />
            ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets
            .filter((t) =>
              selectedDateFilter === "all"
                ? true
                : selectedDateFilter === "golden_only"
                  ? !!(t.has_golden_signal || (t.golden_rows_count ?? 0) > 0)
                  : t.target_draw_period === selectedDateFilter
            )
            .map((ticket) => (
              <SavedTicketCard
                key={ticket.id}
                ticket={ticket}
                isExpanded={expandedId === ticket.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === ticket.id ? null : ticket.id)
                }
                openRowAudits={openRowAudits}
                onToggleRowAudit={toggleRowAudit}
              />
            ))}
        </div>
      )}
    </div>
  );
};
