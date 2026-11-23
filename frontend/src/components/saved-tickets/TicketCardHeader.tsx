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
  Sparkles
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
  beautyGrade
}) => {
  const stratBadge = getStrategyBadge(ticket.strategy);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {hasGoldenSignal && (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1">
            🎯 CÓ {goldenRowsCount} DÃY ĐẠT 8/8 CỔNG DNA ĐỘC ĐẮC
          </span>
        )}

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            isPending
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}
        >
          {isPending ? (
            <Clock className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          {isPending
            ? `Chờ Kỳ Xổ #${ticket.target_draw_period}`
            : `Đã Đối Soát Kỳ #${ticket.target_draw_period}`}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${stratBadge.bg}`}
        >
          <Dna className="w-3.5 h-3.5" /> {stratBadge.label}
        </span>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>
            Vé #{ticket.id} ({ticket.rows_count} dãy)
          </span>
          <span>•</span>
          <span>
            Ngày quay:{" "}
            <b className="text-slate-300">
              {formatDate(ticket.target_draw_date)}
            </b>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            hasGoldenSignal
              ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
              : "bg-slate-800/90 border-slate-700/80 text-slate-300"
          }`}
          title="Kiểm định 8 Cổng DNA Giải Độc Đắc 6/6 (Chỉ báo hiệu sử dụng khi đạt tuyệt đối 8/8 cổng)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Chuẩn Độc Đắc:{" "}
            <b className="text-amber-300 font-mono">
              {maxGatesPassed}/8 Cổng ({ticketBeautyScore}đ • {beautyGrade})
            </b>
          </span>
          {hasGoldenSignal ? (
            <span className="text-[11px] text-emerald-300 ml-1">
              • ★ {goldenRowsCount} dãy khóa 8/8 cổng
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 ml-1">
              • Chưa khóa đủ 8/8 cổng
            </span>
          )}
        </div>

        <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Độ chính xác:</span>
          <b className="text-amber-400">
            {stratInfo.historical_accuracy_pct || 80.0}% (
            {stratInfo.confidence_rating || "A"})
          </b>
        </div>

        {matchResult && matchResult.total_prize_vnd > 0 && (
          <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-bold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> Trúng{" "}
            {formatVND(matchResult.total_prize_vnd)}
          </div>
        )}

        <button
          onClick={onToggleExpand}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700"
          title="Xem chi tiết phân tích thuật toán"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
