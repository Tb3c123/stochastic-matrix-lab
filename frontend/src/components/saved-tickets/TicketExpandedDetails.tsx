"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

interface TicketExpandedDetailsProps {
  ticket: any;
  analysis: any;
  stratInfo: any;
  matchResult: any;
}

export const TicketExpandedDetails: React.FC<TicketExpandedDetailsProps> = ({
  ticket,
  analysis,
  stratInfo,
  matchResult
}) => (
  <div className="mt-4 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-3">
    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
      <span className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
        <TrendingUp className="w-4 h-4" /> Đánh Giá Chi Tiết Hiệu Suất Thuật
        Toán {stratInfo.strategy_name || ticket.strategy}
      </span>
      <span className="text-[11px] text-slate-400">
        Mức rủi ro:{" "}
        <b className="text-white">{stratInfo.risk_level || "Ổn định"}</b>
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div className="space-y-1.5">
        <p className="text-slate-400">
          <b>Nguyên lý hoạt động:</b>{" "}
          {stratInfo.description ||
            "Phân phối chu kỳ xác suất theo dữ liệu lịch sử."}
        </p>
        <p className="text-slate-400">
          <b>Ưu thế thuật toán:</b>{" "}
          {stratInfo.advantage || "Tối ưu hóa độ bao phủ và cân đối chẵn lẻ."}
        </p>
      </div>
      <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
        <div className="flex justify-between">
          <span className="text-slate-400">Độ phủ con số độc nhất:</span>
          <b className="text-white">
            {analysis.unique_numbers_count} số ({analysis.coverage_pct}%)
          </b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Tỷ lệ Chẵn / Lẻ:</span>
          <b className="text-white">{analysis.parity_ratio}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Điểm đánh giá thuật toán:</span>
          <b className="text-amber-400">
            {stratInfo.algorithm_score || 85.0} / 100
          </b>
        </div>
      </div>
    </div>
    {matchResult?.learning_feedback && (
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <b>Nhật ký học hỏi sau đối soát:</b> {matchResult.learning_feedback}
      </div>
    )}
  </div>
);
