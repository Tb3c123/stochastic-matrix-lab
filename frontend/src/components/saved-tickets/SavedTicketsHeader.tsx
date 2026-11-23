"use client";

import React from "react";
import { BookmarkCheck, RefreshCw, AlertCircle } from "lucide-react";

interface SavedTicketsHeaderProps {
  loading: boolean;
  evaluating: boolean;
  evaluateNotice: string | null;
  onEvaluate: () => void;
  onRefresh: () => void;
}

export const SavedTicketsHeader: React.FC<SavedTicketsHeaderProps> = ({
  loading,
  evaluating,
  evaluateNotice,
  onEvaluate,
  onRefresh
}) => (
  <>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <BookmarkCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-white">
            Sổ Theo Dõi Vé & Đối Soát Kết Quả Theo Ngày
          </h3>
          <p className="text-xs text-slate-400">
            Phân loại vé theo ngày mở thưởng và thuật toán, đối soát chi tiết
            từng dãy số và đánh giá độ chính xác thực tế.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onEvaluate}
          disabled={evaluating}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
          title="Kiểm tra đối soát kỳ xổ mới nhất & cập nhật mô hình học hỏi"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-amber-400 ${
              evaluating ? "animate-spin" : ""
            }`}
          />
          {evaluating ? "Đang Đối Soát..." : "Đối Soát Kỳ Mới"}
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          title="Tải lại sổ vé"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>

    {evaluateNotice && (
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300 animate-in fade-in duration-300">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="font-medium leading-relaxed">{evaluateNotice}</div>
      </div>
    )}
  </>
);
