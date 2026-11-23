"use client";

import React from "react";
import { Zap, Trophy } from "lucide-react";
import { EscalationStep } from "./types";

interface EscalationLadderBarProps {
  gameCode: string;
  escalationLevel: number;
  escalationInfo: EscalationStep;
  escalationLadder: EscalationStep[];
}

export const EscalationLadderBar: React.FC<EscalationLadderBarProps> = ({
  gameCode,
  escalationLevel,
  escalationInfo,
  escalationLadder
}) => (
  <>
    <div className="bg-slate-850/90 border border-violet-500/30 rounded-2xl p-4 md:p-5 space-y-3.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-violet-300">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>
            Thang Điều Khiển Áp Lực & Mở Rộng Vé (Tiến/Lùi Từng Bậc - Hysteresis
            Ladder):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">
            Trượt (0-2 số): Tiến +1 Bậc
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold">
            Giải phụ (3-5 số): Lùi -1 Bậc (Không reset về 0)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
            Nổ Độc Đắc: Lùi -2 Bậc
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {escalationLadder.map((step) => {
          const isCurrent = step.level === escalationLevel;
          return (
            <div
              key={step.level}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? "bg-gradient-to-br from-violet-600/25 to-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10"
                  : "bg-slate-900/60 border-slate-800 opacity-65"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-extrabold ${
                    isCurrent ? "text-amber-300" : "text-slate-400"
                  }`}
                >
                  BẬC {step.level} {isCurrent && "• ĐANG KÍCH HOẠT"}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-violet-300">
                  Phạt {step.penalty_multiplier.toFixed(2)}x
                </span>
              </div>
              <div className="text-xs font-bold text-white">
                Quy mô:{" "}
                <span className="text-emerald-400">
                  {step.ticket_count} Vé ({step.ticket_count * 5} dãy)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Phạt trượt (2/1/0 số):{" "}
                <b className="text-rose-300 font-mono">
                  {Math.round(-35 * step.penalty_multiplier)} /{" "}
                  {Math.round(-75 * step.penalty_multiplier)} /{" "}
                  {Math.round(-120 * step.penalty_multiplier)}đ
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="bg-slate-850/90 border border-amber-500/25 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-amber-300 font-bold shrink-0">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span>Hàm Mục Tiêu Săn Độc Đắc:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
          🎯 Độc Đắc (6/6): +10,000 pts
        </span>
        {gameCode === "power_6_55" && (
          <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 border border-yellow-400/30 text-yellow-300 font-bold">
            ⚡ Jackpot 2 (5+1): +5,000 pts
          </span>
        )}
        <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 font-semibold">
          Giải Nhất/Nhì/Ba (5-3 số): -2 / -5 / -10 pts (Lùi 1 bậc)
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-semibold">
          Trượt (2 / 1 / 0 số): Cơ sở -35 / -75 / -120 pts × Hệ số Bậc (
          {escalationInfo.penalty_multiplier?.toFixed(2) || "1.00"}x)
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
          ⚠️ Phạt Báo Hiệu Độc Đắc Sai (Dãy 8/8 cổng trượt giải 2/1/0 số): Phạt
          thêm -60 / -100 / -150 pts × Hệ số Bậc + Khóa lùi bậc
        </span>
      </div>
    </div>
  </>
);
