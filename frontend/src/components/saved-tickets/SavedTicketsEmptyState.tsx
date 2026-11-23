"use client";

import React from "react";
import { BookmarkCheck, RefreshCw } from "lucide-react";

interface SavedTicketsEmptyStateProps {
  gameCode: string;
  loading: boolean;
  onRefresh: () => void;
}

export const SavedTicketsEmptyState: React.FC<SavedTicketsEmptyStateProps> = ({
  gameCode,
  loading,
  onRefresh
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-center shadow-2xl space-y-6">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
      <BookmarkCheck className="w-8 h-8" />
    </div>
    <div className="max-w-md mx-auto space-y-2">
      <h3 className="text-xl font-bold text-white">
        Chưa Có Vé Nào Trong Sổ Đối Soát (
        {gameCode === "mega_6_45" ? "Mega 6/45" : "Power 6/55"})
      </h3>
      <p className="text-sm text-slate-400">
        Hệ thống chưa tìm thấy vé đã lưu cho loại vé này. Bạn có thể chuyển sang
        tab Sinh Vé Thông Minh để tạo và lưu vé mới đối soát với kỳ mở thưởng
        tiếp theo.
      </p>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Đang tải..." : "Tải Lại Sổ Vé"}
      </button>
    </div>
  </div>
);
