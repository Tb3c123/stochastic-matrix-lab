import React from "react";
import { Trophy, Calendar, Hash, Award } from "lucide-react";

interface LatestDrawProps {
  draw: {
    draw_period: string;
    draw_date: string;
    winning_numbers: number[];
    special_number?: number | null;
    jackpot_1_amount: number;
  } | null;
  gameCode: string;
}

export const LatestDrawBanner: React.FC<LatestDrawProps> = ({ draw, gameCode }) => {
  if (!draw) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="flex gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-full bg-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const isPower = gameCode === "power_6_55";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
              <Award className="w-3.5 h-3.5" /> Kỳ Quay Mới Nhất
            </span>
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4" /> {draw.draw_date}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            Kỳ Quay #{draw.draw_period}
          </h2>
        </div>

        {draw.jackpot_1_amount > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Jackpot 1 Ước Tính</div>
              <div className="text-xl md:text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-200 to-white">
                {formatVND(draw.jackpot_1_amount)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Winning Balls */}
      <div className="pt-6">
        <div className="text-sm font-semibold text-slate-400 mb-3">Dãy số trúng thưởng:</div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {draw.winning_numbers.map((num) => (
            <div
              key={num}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full ball-red flex items-center justify-center text-white font-extrabold text-xl md:text-2xl transform hover:scale-110 transition-transform duration-200 cursor-default"
            >
              {num < 10 ? `0${num}` : num}
            </div>
          ))}

          {isPower && draw.special_number && (
            <>
              <div className="text-slate-600 font-bold text-2xl mx-1">+</div>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full ball-gold flex items-center justify-center text-slate-950 font-black text-xl md:text-2xl ring-4 ring-amber-400/30 transform hover:scale-110 transition-transform duration-200 cursor-default" title="Bóng Đặc Biệt Jackpot 2">
                {draw.special_number < 10 ? `0${draw.special_number}` : draw.special_number}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
