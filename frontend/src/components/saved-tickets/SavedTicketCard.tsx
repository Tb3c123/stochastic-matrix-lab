"use client";

import React from "react";
import { TicketCardHeader } from "./TicketCardHeader";
import { TicketRowItem } from "./TicketRowItem";
import { TicketExpandedDetails } from "./TicketExpandedDetails";

interface SavedTicketCardProps {
  ticket: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  openRowAudits: Record<string, boolean>;
  onToggleRowAudit: (ticketId: number, rowIdx: number) => void;
}

export const SavedTicketCard: React.FC<SavedTicketCardProps> = ({
  ticket,
  isExpanded,
  onToggleExpand,
  openRowAudits,
  onToggleRowAudit
}) => {
  const isPending = ticket.status === "pending";
  const analysis = ticket.predicted_analysis || {};
  const stratInfo = analysis.strategy_info || {};
  const matchResult = ticket.matched_results;
  const beautyEval = analysis.beauty_evaluation || {};
  const ticketBeautyScore =
    ticket.ticket_beauty_score ??
    analysis.ticket_beauty_score ??
    beautyEval.ticket_beauty_score ??
    88.5;
  const beautyGrade =
    ticket.beauty_grade ??
    beautyEval.beauty_grade ??
    (ticketBeautyScore >= 96 ? "S+" : ticketBeautyScore >= 88.5 ? "A+" : "A");
  const goldenRowsCount =
    ticket.golden_rows_count ??
    analysis.golden_rows_count ??
    beautyEval.golden_rows_count ??
    0;
  const maxGatesPassed =
    ticket.max_gates_passed ??
    beautyEval.max_gates_passed ??
    (goldenRowsCount > 0 ? 8 : 6);
  const hasGoldenSignal = !!(
    ticket.has_golden_signal ??
    analysis.has_golden_signal ??
    goldenRowsCount > 0
  );

  return (
    <div
      className={`border rounded-2xl p-5 transition-all relative overflow-hidden ${
        hasGoldenSignal
          ? "bg-gradient-to-br from-amber-950/25 via-slate-900 to-slate-900 border-amber-400/60 ring-1 ring-amber-400/30 shadow-lg shadow-amber-500/10"
          : isPending
            ? "bg-slate-800/30 border-slate-800 hover:border-slate-700"
            : matchResult?.total_prize_vnd > 0
              ? "bg-emerald-950/20 border-emerald-800/40"
              : "bg-slate-800/50 border-slate-700"
      }`}
    >
      <TicketCardHeader
        ticket={ticket}
        isPending={isPending}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        stratInfo={stratInfo}
        matchResult={matchResult}
        hasGoldenSignal={hasGoldenSignal}
        goldenRowsCount={goldenRowsCount}
        maxGatesPassed={maxGatesPassed}
        ticketBeautyScore={ticketBeautyScore}
        beautyGrade={beautyGrade}
      />

      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
        {ticket.rows.map((row: number[], rIdx: number) => (
          <TicketRowItem
            key={rIdx}
            ticket={ticket}
            row={row}
            rIdx={rIdx}
            evalRow={matchResult?.rows_evaluation?.[rIdx]}
            rowForecast={analysis?.row_forecasts?.[rIdx] || {}}
            isAuditOpen={!!openRowAudits[`${ticket.id}-${rIdx}`]}
            onToggleAudit={() => onToggleRowAudit(ticket.id, rIdx)}
          />
        ))}
      </div>

      {isExpanded && (
        <TicketExpandedDetails
          ticket={ticket}
          analysis={analysis}
          stratInfo={stratInfo}
          matchResult={matchResult}
        />
      )}
    </div>
  );
};
