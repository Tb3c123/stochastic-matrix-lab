"use client";

import React from "react";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { formatVND } from "./ticketFormatters";
import { getRowAlgorithmBadge } from "./rowAlgoBadges";
import { TicketRowBalls } from "./TicketRowBalls";
import { TicketRowAuditPanel } from "./TicketRowAuditPanel";

interface TicketRowItemProps {
  ticket: any;
  row: number[];
  rIdx: number;
  evalRow: any;
  rowForecast: any;
  isAuditOpen: boolean;
  onToggleAudit: () => void;
}

export const TicketRowItem: React.FC<TicketRowItemProps> = ({
  ticket,
  row,
  rIdx,
  evalRow,
  rowForecast,
  isAuditOpen,
  onToggleAudit,
}) => {
  const matchedNums: number[] = evalRow?.matched_numbers || [];
  const audit = rowForecast?.audit;
  const isGoldenRow = !!rowForecast?.is_golden_row;
  const gatesPassed = rowForecast?.jackpot_gates_passed ?? (isGoldenRow ? 8 : 6);
  const passedGates: string[] = rowForecast?.passed_golden_gates || [];
  const failedGates: string[] = rowForecast?.failed_golden_gates || [];
  const rowBadge = getRowAlgorithmBadge(rowForecast, ticket.strategy, rIdx);
  const spNum = evalRow?.special_number ?? rowForecast?.special_number ?? null;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isGoldenRow ? "bg-amber-50/40 border-amber-300" : "bg-[#fafbfc] border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
              isGoldenRow ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-800"
            }`}
          >
            {String.fromCharCode(65 + rIdx)}
          </span>

          {isGoldenRow ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
              8/8 CỔNG DNA ({rowForecast?.row_beauty_score || 98.0}đ)
            </span>
          ) : (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-slate-200 shrink-0"
              title={failedGates.join(" | ")}
            >
              Đạt {gatesPassed}/8 Cổng DNA
            </span>
          )}

          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200 shrink-0" title={rowBadge.fullName}>
            {rowForecast?.council_badge || rowBadge.label}
          </span>

          <TicketRowBalls
            row={row}
            matchedNums={matchedNums}
            isPower={ticket.game_code === "power_6_55"}
            specialNum={spNum}
            isSpecialMatch={!!evalRow?.matched_special}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {evalRow ? (
            <span
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs border ${
                evalRow.prize_amount > 0 || evalRow.matched_special
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : evalRow.match_count >= 3
                    ? "bg-emerald-50/60 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              Trùng {evalRow.match_count}/6 số
              {evalRow.matched_special && " + Số ĐB ★"}
              {evalRow.prize_amount > 0 && ` (${evalRow.prize_name} - ${formatVND(evalRow.prize_amount)})`}
            </span>
          ) : (
            <span className="text-slate-500 text-xs italic">Đang chờ quay...</span>
          )}

          {audit && (
            <button
              onClick={onToggleAudit}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1 border cursor-pointer transition-colors ${
                isGoldenRow
                  ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>DNA: {gatesPassed}/8</span>
              {isAuditOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {isAuditOpen && audit && (
        <TicketRowAuditPanel
          audit={audit}
          rowForecast={rowForecast}
          isGoldenRow={isGoldenRow}
          gatesPassed={gatesPassed}
          passedGates={passedGates}
          failedGates={failedGates}
        />
      )}
    </div>
  );
};
