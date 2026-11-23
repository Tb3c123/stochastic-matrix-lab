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
  onToggleAudit
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
      className={`rounded-xl border transition-all overflow-hidden ${
        isGoldenRow
          ? "bg-gradient-to-r from-amber-950/25 via-slate-850/60 to-slate-850/60 border-amber-400/50"
          : "bg-slate-850/50 border-slate-800/60"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
              isGoldenRow
                ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {String.fromCharCode(65 + rIdx)}
          </span>

          {isGoldenRow ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
              🎯 ĐẠT 8/8 CỔNG DNA ĐỘC ĐẮC (
              {rowForecast?.row_beauty_score || 98.0}đ — NÊN DÙNG)
            </span>
          ) : (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0"
              title={failedGates.join(" | ")}
            >
              Đạt {gatesPassed}/8 Cổng DNA
            </span>
          )}

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${rowBadge.cls}`}
            title={rowBadge.fullName}
          >
            {rowBadge.label}
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
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                evalRow.prize_amount > 0 || evalRow.matched_special
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : evalRow.match_count >= 3
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              Trùng {evalRow.match_count}/6 số
              {evalRow.matched_special && " + Số ĐB ★"}
              {evalRow.prize_amount > 0 &&
                ` (${evalRow.prize_name} - ${formatVND(evalRow.prize_amount)})`}
            </span>
          ) : (
            <span className="text-slate-500 text-xs italic">
              Đang chờ quay...
            </span>
          )}

          {audit && (
            <button
              onClick={onToggleAudit}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 border transition-all cursor-pointer ${
                isGoldenRow
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30"
                  : gatesPassed >= 7
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Kiểm định DNA: {gatesPassed}/8 cổng</span>
              {isAuditOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
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
