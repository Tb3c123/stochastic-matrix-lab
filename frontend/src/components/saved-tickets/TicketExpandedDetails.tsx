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
  matchResult,
}) => (
  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-3">
    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
      <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
        <TrendingUp className="w-4 h-4 text-amber-700" /> Đánh Giá Chi Tiết Thuật Toán {stratInfo.strategy_name || ticket.strategy}
      </span>
      <span className="text-[11px] text-slate-500">
        Mức rủi ro: <b className="text-slate-900">{stratInfo.risk_level || "Ổn định"}</b>
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div className="space-y-1.5 text-slate-600">
        <p>
          <b className="text-slate-900">Nguyên lý hoạt động:</b>{" "}
          {stratInfo.description || "Phân phối chu kỳ xác suất theo dữ liệu lịch sử."}
        </p>
        <p>
          <b className="text-slate-900">Ưu thế thuật toán:</b>{" "}
          {stratInfo.advantage || "Tối ưu hóa độ bao phủ và cân đối chẵn lẻ."}
        </p>
      </div>
      <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex justify-between">
          <span className="text-slate-500">Độ phủ con số độc nhất:</span>
          <b className="text-slate-900">{analysis.unique_numbers_count} số ({analysis.coverage_pct}%)</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tỷ lệ Chẵn / Lẻ:</span>
          <b className="text-slate-900">{analysis.parity_ratio}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Điểm đánh giá thuật toán:</span>
          <b className="text-amber-800">{stratInfo.algorithm_score || 85.0} / 100</b>
        </div>
      </div>
    </div>
    {matchResult?.learning_feedback && (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
        <b>Nhật ký học hỏi sau đối soát:</b> {matchResult.learning_feedback}
      </div>
    )}
  </div>
);
