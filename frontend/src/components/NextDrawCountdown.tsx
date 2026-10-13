"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Sparkles, AlertCircle } from "lucide-react";

interface NextDrawCountdownProps {
  gameCode: string;
  currentDrawPeriod?: string;
}

interface CountdownState {
  targetDateStr: string;
  targetDayOfWeek: string;
  nextPeriodStr: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

export const NextDrawCountdown: React.FC<NextDrawCountdownProps> = ({ gameCode, currentDrawPeriod }) => {
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const calculateNextDraw = () => {
      const now = new Date();
      // Vietlott draw days:
      // Mega 6/45: Wednesday (3), Friday (5), Sunday (0)
      // Power 6/55: Tuesday (2), Thursday (4), Saturday (6)
      const validDays = gameCode === "power_6_55" ? [2, 4, 6] : [0, 3, 5];

      // Next draw time is 18:00:00 (6:00 PM)
      let target = new Date(now);
      target.setHours(18, 0, 0, 0);

      // If today is a valid draw day and it's already past 18:30, move to tomorrow
      const isTodayValid = validDays.includes(now.getDay());
      const isPastTodayDraw = now.getHours() > 18 || (now.getHours() === 18 && now.getMinutes() >= 30);

      if (!isTodayValid || isPastTodayDraw) {
        // Find next day in validDays
        let daysToAdd = 1;
        while (true) {
          const testDate = new Date(now);
          testDate.setDate(now.getDate() + daysToAdd);
          if (validDays.includes(testDate.getDay())) {
            target = new Date(testDate);
            target.setHours(18, 0, 0, 0);
            break;
          }
          daysToAdd++;
        }
      }

      const diffMs = target.getTime() - now.getTime();
      const isLive = diffMs <= 0 && diffMs >= -30 * 60 * 1000; // Within 18:00 - 18:30

      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const hours = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
      const minutes = Math.max(0, Math.floor((diffMs / 1000 / 60) % 60));
      const seconds = Math.max(0, Math.floor((diffMs / 1000) % 60));

      const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const targetDayOfWeek = dayNames[target.getDay()];
      const targetDateStr = `${target.getDate().toString().padStart(2, "0")}/${(target.getMonth() + 1).toString().padStart(2, "0")}/${target.getFullYear()}`;

      let nextPeriodStr = "";
      if (currentDrawPeriod) {
        try {
          const pNum = parseInt(currentDrawPeriod.replace(/\D/g, ""), 10);
          if (!isNaN(pNum)) {
            nextPeriodStr = `#${(pNum + 1).toString().padStart(5, "0")}`;
          }
        } catch {
          nextPeriodStr = "";
        }
      }

      setCountdown({
        targetDateStr,
        targetDayOfWeek,
        nextPeriodStr,
        days,
        hours,
        minutes,
        seconds,
        isLive
      });
    };

    calculateNextDraw();
    const interval = setInterval(calculateNextDraw, 1000);
    return () => clearInterval(interval);
  }, [gameCode, currentDrawPeriod]);

  if (!countdown) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left Info */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Lần Xổ Tiếp Theo {countdown.nextPeriodStr}
            </span>
            {countdown.isLive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                ĐANG QUAY THƯỞNG
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{countdown.targetDayOfWeek}, {countdown.targetDateStr} - 18:00</span>
          </div>
        </div>
      </div>

      {/* Right Countdown Blocks */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex flex-col items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 min-w-[54px]">
          <span className="text-lg md:text-xl font-black text-white font-mono">{countdown.days.toString().padStart(2, "0")}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Ngày</span>
        </div>
        <span className="text-amber-400 font-bold text-lg">:</span>

        <div className="flex flex-col items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 min-w-[54px]">
          <span className="text-lg md:text-xl font-black text-white font-mono">{countdown.hours.toString().padStart(2, "0")}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Giờ</span>
        </div>
        <span className="text-amber-400 font-bold text-lg">:</span>

        <div className="flex flex-col items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 min-w-[54px]">
          <span className="text-lg md:text-xl font-black text-amber-400 font-mono">{countdown.minutes.toString().padStart(2, "0")}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Phút</span>
        </div>
        <span className="text-amber-400 font-bold text-lg">:</span>

        <div className="flex flex-col items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 min-w-[54px]">
          <span className="text-lg md:text-xl font-black text-red-400 font-mono">{countdown.seconds.toString().padStart(2, "0")}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Giây</span>
        </div>
      </div>
    </div>
  );
};
