"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { X, Target, Clock, ShieldAlert, CheckCircle2, BookmarkCheck, Sparkles, Trophy } from "lucide-react";

interface NextDrawComparisonModalProps {
  numbers: number[];
  gameCode: string;
  onClose: () => void;
  onSaveAndTrack?: () => void;
}

export const NextDrawComparisonModal: React.FC<NextDrawComparisonModalProps> = ({
  numbers,
  gameCode,
  onClose,
  onSaveAndTrack
}) => {
  const [upcomingInfo, setUpcomingInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchUpcoming = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/tickets/upcoming?game_code=${gameCode}`);
        const json = await res.json();
        if (json.success && json.data) {
          setUpcomingInfo(json.data);
        }
      } catch (e) {
        console.error("Fetch upcoming draw info failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [gameCode]);

  const handleSaveThisTicket = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tickets/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_code: gameCode,
          strategy: "balanced",
          rows: [[...numbers].sort((a, b) => a - b)]
        })
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        if (onSaveAndTrack) onSaveAndTrack();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e) {
      console.error("Save ticket failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const isPower = gameCode === "power_6_55";
  const jackpotChance = isPower ? "1 / 28,989,675" : "1 / 8,145,060";
  const anyPrizeChance = isPower ? "~1.83%" : "~2.38%";
  const sumVal = numbers.reduce((acc, curr) => acc + curr, 0);
  const evenCount = numbers.filter((n) => n % 2 === 0).length;
  const oddCount = 6 - evenCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Đối Soát Dự Đoán Cho Kỳ Sắp Tới</h3>
              <p className="text-xs text-slate-400">
                {isPower ? "Power 6/55" : "Mega 6/45"} • Kỳ mở thưởng mục tiêu kế tiếp
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Strict Rule Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200 uppercase tracking-wide">Quy Tắc Đối Soát Hệ Thống:</p>
              <p className="mt-0.5">
                Đối soát so sánh vé <b>chỉ được phép thực hiện cho kỳ mở thưởng sắp tới</b>, tuyệt đối không được phép đối soát trên các kỳ đã qua. Hệ thống sẽ khóa vé và tự động so khớp kết quả ngay khi kỳ mở thưởng sắp tới chính thức có kết quả!
              </p>
            </div>
          </div>

          {/* Target Upcoming Draw Box */}
          {upcomingInfo && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Kỳ Đối Soát Mục Tiêu
                </span>
                <div className="text-2xl font-black text-white mt-1">
                  Kỳ {upcomingInfo.target_upcoming_period}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dự kiến mở thưởng: <b>{upcomingInfo.target_upcoming_date}</b> lúc <b>{upcomingInfo.target_draw_time}</b></span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl text-center self-start sm:self-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Trạng Thái</span>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Chờ Mở Thưởng
                </span>
              </div>
            </div>
          )}

          {/* The Selected Row Balls */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Dãy Số Bạn Đã Chọn Đối Soát:
            </span>
            <div className="flex flex-wrap items-center gap-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-800 justify-center">
              {numbers.map((num) => (
                <div
                  key={num}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full ball-red text-white font-extrabold text-base md:text-xl flex items-center justify-center shadow-lg"
                >
                  {num < 10 ? `0${num}` : num}
                </div>
              ))}
            </div>
          </div>

          {/* Mathematical Forecast for Upcoming Draw */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Xác Suất Jackpot</span>
              <span className="text-xs font-bold text-amber-400 block mt-1">{jackpotChance}</span>
            </div>
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Tỷ Lệ Trúng Giải Ba</span>
              <span className="text-xs font-bold text-emerald-400 block mt-1">{anyPrizeChance}</span>
            </div>
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Tổng Dãy Số</span>
              <span className="text-xs font-bold text-white block mt-1">{sumVal}</span>
            </div>
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Tỷ Lệ Chẵn : Lẻ</span>
              <span className="text-xs font-bold text-white block mt-1">{evenCount}C : {oddCount}L</span>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đã lưu vé thành công! Hệ thống sẽ tự động so sánh đối soát ngay khi kỳ mở thưởng kết thúc.</span>
            </div>
          )}

          {/* Action Buttons */}
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
              {saving ? "Đang Lưu Vé..." : saveSuccess ? "Đã Lưu & Đặt Lịch" : "Lưu & Đặt Lịch Đối Soát Kỳ Sắp Tới"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
