"use client";

import React from "react";
import { Clock, Sparkles } from "lucide-react";

interface UpcomingDrawCardProps {
  upcomingInfo: {
    target_upcoming_period: string;
    target_upcoming_date: string;
    target_draw_time: string;
  };
}

export const UpcomingDrawCard: React.FC<UpcomingDrawCardProps> = ({
  upcomingInfo
}) => (
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
        <span>
          Dự kiến mở thưởng: <b>{upcomingInfo.target_upcoming_date}</b> lúc{" "}
          <b>{upcomingInfo.target_draw_time}</b>
        </span>
      </div>
    </div>

    <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl text-center self-start sm:self-center">
      <span className="text-[10px] text-slate-400 uppercase font-bold block">
        Trạng Thái
      </span>
      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        Chờ Mở Thưởng
      </span>
    </div>
  </div>
);
