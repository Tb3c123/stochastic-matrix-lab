"use client";

import React from "react";
import { Trophy, Sparkles, ArrowRight } from "lucide-react";

interface WinningEmptyStateProps {
  onNavigateToGenerator?: () => void;
  onNavigateToTickets?: () => void;
}

export const WinningEmptyState: React.FC<WinningEmptyStateProps> = ({
  onNavigateToGenerator,
  onNavigateToTickets
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
      <Trophy className="w-8 h-8" />
    </div>
    <div className="max-w-md mx-auto space-y-2">
      <h3 className="text-lg font-bold text-white">
        Chưa Có Vé Nào Trúng Thưởng Trong Bộ Lọc Này
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        Hãy lưu vé từ mục <b>Sinh Vé</b> hoặc <b>AI Tự Học</b>, sau đó đối soát
        khi có kết quả quay thưởng mới nhất để ghi nhận chiến thắng tại đây!
      </p>
    </div>
    <div className="flex items-center justify-center gap-3 pt-2">
      {onNavigateToGenerator && (
        <button
          onClick={onNavigateToGenerator}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" /> Soạn Vé Ngay
        </button>
      )}
      {onNavigateToTickets && (
        <button
          onClick={onNavigateToTickets}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          Xem Toàn Bộ Sổ Vé <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);
