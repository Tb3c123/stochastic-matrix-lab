"use client";

import React, { useState, useEffect } from "react";
import { Award, Clock, Trophy } from "lucide-react";
import {
  CountdownState,
  calculateNextDrawCountdown,
} from "../countdown/countdownUtils";

const fmtBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const fmtVND = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + " đ";

export const CompactDrawStatusBar: React.FC<{
  draw: any;
  gameCode: string;
}> = ({ draw, gameCode }) => {
  const [cd, setCd] = useState<CountdownState | null>(null);
  const isPower = gameCode === "power_6_55";

  useEffect(() => {
    const tick = () => setCd(calculateNextDrawCountdown(gameCode, draw?.draw_period, draw?.draw_date));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameCode, draw?.draw_period, draw?.draw_date]);

  if (!draw) {
    return <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />;
  }

  const units = cd
    ? [
        { k: "Ngày", v: cd.days, c: "text-slate-900" },
        { k: "Giờ", v: cd.hours, c: "text-slate-900" },
        { k: "Phút", v: cd.minutes, c: "text-amber-700" },
        { k: "Giây", v: cd.seconds, c: "text-red-700" },
      ]
    : [];

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 md:px-6 md:py-4 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
      <div className="lg:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:border-r lg:border-slate-200 lg:pr-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200">
              <Award className="w-3.5 h-3.5" /> Kỳ mới nhất #{draw.draw_period}
            </span>
            <span className="text-slate-500 font-mono">{draw.draw_date}</span>
            {draw.jackpot_1_amount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-700" /> {fmtVND(draw.jackpot_1_amount)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(draw.winning_numbers || []).map((n: number) => (
              <span
                key={n}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full ball-red flex items-center justify-center font-bold text-sm md:text-base font-mono"
              >
                {fmtBall(n)}
              </span>
            ))}
            {isPower && draw.special_number && (
              <>
                <span className="text-slate-400 font-bold text-sm">+</span>
                <span className="w-9 h-9 md:w-10 md:h-10 rounded-full ball-gold flex items-center justify-center font-bold text-sm md:text-base font-mono">
                  {fmtBall(draw.special_number)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {cd && (
        <div className="lg:col-span-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900 uppercase">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Kỳ tới {cd.nextPeriodStr}</span>
              {cd.isFinalBuyWindow && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300">
                  🔒 ĐÃ CHỐT SỐ • MUA VÉ TRƯỚC 17:45
                </span>
              )}
              {cd.isSalesClosed && !cd.isLive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-300">
                  ⏳ ĐÃ ĐÓNG VÉ • CHỜ XỔ
                </span>
              )}
              {cd.isLive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-700 text-white">
                  ĐANG QUAY
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 font-medium">
              {cd.targetDayOfWeek}, {cd.targetDateStr} • Chốt 16:30 • Đóng vé 17:45 • Xổ 18:00
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {units.map((u) => (
              <div
                key={u.k}
                className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 min-w-[46px]"
              >
                <span className={`text-sm md:text-base font-bold font-mono ${u.c}`}>
                  {u.v.toString().padStart(2, "0")}
                </span>
                <span className="text-[9px] font-semibold text-slate-500 uppercase">
                  {u.k}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
