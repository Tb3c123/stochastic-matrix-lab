"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  Trophy,
  ChevronDown,
  ChevronUp,
  Dna,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatVND, formatDate, getStrategyBadge } from "./ticketFormatters";

interface TicketCardHeaderProps {
  ticket: any;
  isPending: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  stratInfo: any;
  matchResult: any;
  hasGoldenSignal: boolean;
  goldenRowsCount: number;
  maxGatesPassed: number;
  ticketBeautyScore: number;
  beautyGrade: string;
}

export const TicketCardHeader: React.FC<TicketCardHeaderProps> = ({
  ticket,
  isPending,
  isExpanded,
  onToggleExpand,
  stratInfo,
  matchResult,
  hasGoldenSignal,
  goldenRowsCount,
  maxGatesPassed,
  ticketBeautyScore,
  beautyGrade,
}) => {
  const stratBadge = getStrategyBadge(ticket.strategy);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {hasGoldenSignal && (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            CÓ {goldenRowsCount} DÃY ĐẠT 8/8 DNA
          </span>
        )}

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            isPending
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          {isPending ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {isPending ? `Chờ Kỳ Xổ #${ticket.target_draw_period}` : `Đã Đối Soát Kỳ #${ticket.target_draw_period}`}
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-100 text-slate-800 border-slate-200">
          <Dna className="w-3.5 h-3.5 text-slate-600" /> {stratBadge.label}
        </span>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Vé #{ticket.id} ({ticket.rows_count} dãy)</span>
          <span>•</span>
          <span>
            Ngày quay: <b className="text-slate-800">{formatDate(ticket.target_draw_date)}</b>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-semibold ${
            hasGoldenSignal
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>
            Chuẩn Độc Đắc:{" "}
            <b className="font-mono text-slate-900">
              {maxGatesPassed}/8 Cổng ({ticketBeautyScore}đ • {beautyGrade})
            </b>
          </span>
        </div>

        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Độ chính xác:</span>
          <b className="text-slate-900">
            {stratInfo.historical_accuracy_pct || 80.0}% ({stratInfo.confidence_rating || "A"})
          </b>
        </div>

        {matchResult && matchResult.total_prize_vnd > 0 && (
          <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> Trúng {formatVND(matchResult.total_prize_vnd)}
          </div>
        )}

        <button
          onClick={onToggleExpand}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer border border-slate-200"
          title="Xem chi tiết phân tích thuật toán"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
