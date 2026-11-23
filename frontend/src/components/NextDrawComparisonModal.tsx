"use client";

import React from "react";
import {
  X,
  Target,
  ShieldAlert,
  CheckCircle2,
  BookmarkCheck
} from "lucide-react";
import { UpcomingDrawCard } from "./comparison/UpcomingDrawCard";
import { ComparisonStatsGrid } from "./comparison/ComparisonStatsGrid";
import { useComparisonModal } from "./comparison/useComparisonModal";

interface NextDrawComparisonModalProps {
  numbers: number[];
  gameCode: string;
  onClose: () => void;
  onSaveAndTrack?: () => void;
}

export const NextDrawComparisonModal: React.FC<
  NextDrawComparisonModalProps
> = ({ numbers, gameCode, onClose, onSaveAndTrack }) => {
  const { upcomingInfo, saving, saveSuccess, handleSaveThisTicket } =
    useComparisonModal(gameCode, numbers, onClose, onSaveAndTrack);
  const isPower = gameCode === "power_6_55";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Đối Soát Dự Đoán Cho Kỳ Sắp Tới
              </h3>
              <p className="text-xs text-slate-400">
                {isPower ? "Power 6/55" : "Mega 6/45"} • Kỳ mở thưởng mục tiêu
                kế tiếp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200 uppercase tracking-wide">
                Quy Tắc Đối Soát Hệ Thống:
              </p>
              <p className="mt-0.5">
                Đối soát so sánh vé{" "}
                <b>chỉ được phép thực hiện cho kỳ mở thưởng sắp tới</b>, tuyệt
                đối không được phép đối soát trên các kỳ đã qua. Hệ thống sẽ
                khóa vé và tự động so khớp kết quả ngay khi kỳ mở thưởng sắp tới
                chính thức có kết quả!
              </p>
            </div>
          </div>

          {upcomingInfo && <UpcomingDrawCard upcomingInfo={upcomingInfo} />}
          <ComparisonStatsGrid numbers={numbers} isPower={isPower} />

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Đã lưu vé thành công! Hệ thống sẽ tự động so sánh đối soát ngay
                khi kỳ mở thưởng kết thúc.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveThisTicket}
              disabled={saving || saveSuccess}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <BookmarkCheck className="w-4 h-4" />
              {saving
                ? "Đang Lưu Vé..."
                : saveSuccess
                  ? "Đã Lưu & Đặt Lịch"
                  : "Lưu & Đặt Lịch Đối Soát Kỳ Sắp Tới"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
