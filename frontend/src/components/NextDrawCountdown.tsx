"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Sparkles } from "lucide-react";
import {
  CountdownState,
  calculateNextDrawCountdown
} from "./countdown/countdownUtils";

interface NextDrawCountdownProps {
  gameCode: string;
  currentDrawPeriod?: string;
}

export const NextDrawCountdown: React.FC<NextDrawCountdownProps> = ({
  gameCode,
  currentDrawPeriod
}) => {
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const update = () => {
      setCountdown(calculateNextDrawCountdown(gameCode, currentDrawPeriod));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [gameCode, currentDrawPeriod]);

  if (!countdown) return null;

  const blocks = [
    { label: "Ngày", value: countdown.days, colorClass: "text-white" },
    { label: "Giờ", value: countdown.hours, colorClass: "text-white" },
    { label: "Phút", value: countdown.minutes, colorClass: "text-amber-400" },
    { label: "Giây", value: countdown.seconds, colorClass: "text-red-400" }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Lần Xổ Tiếp Theo{" "}
              {countdown.nextPeriodStr}
            </span>
            {countdown.isLive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                ĐANG QUAY THƯỞNG
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {countdown.targetDayOfWeek}, {countdown.targetDateStr} - 18:00
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {blocks.map((block, index) => (
          <React.Fragment key={block.label}>
            {index > 0 && (
              <span className="text-amber-400 font-bold text-lg">:</span>
            )}
            <div className="flex flex-col items-center bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 min-w-[54px]">
              <span
                className={`text-lg md:text-xl font-black font-mono ${block.colorClass}`}
              >
                {block.value.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                {block.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
