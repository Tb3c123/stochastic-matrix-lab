"use client";

import React from "react";
import { EscalationStep } from "./types";

interface AdaptiveWeightsGridProps {
  weights: {
    w_lateness: number;
    w_gauss_sum: number;
    w_hot: number;
  };
  banditReward: number;
  totalCyclesLearned: number;
  escalationLevel: number;
  escalationInfo: EscalationStep;
}

export const AdaptiveWeightsGrid: React.FC<AdaptiveWeightsGridProps> = ({
  weights,
  banditReward,
  totalCyclesLearned,
  escalationLevel,
  escalationInfo
}) => {
  const weightCards = [
    {
      label: "Trọng số Chu Kỳ Trễ",
      value: weights.w_lateness,
      textColor: "text-amber-400",
      barColor: "bg-amber-500",
      desc: "Ưu tiên khai thác các con số đạt điểm bão hòa vắng mặt."
    },
    {
      label: "Trọng số Tổng Gauss",
      value: weights.w_gauss_sum,
      textColor: "text-purple-400",
      barColor: "bg-purple-500",
      desc: "Duy trì tổng 6 số trong vùng chuông xác suất cao nhất."
    },
    {
      label: "Trọng số Tần Suất Hot",
      value: weights.w_hot,
      textColor: "text-red-400",
      barColor: "bg-red-500",
      desc: "Đón bắt quán tính các con số xuất hiện nhiều gần đây."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {weightCards.map((card) => (
        <div
          key={card.label}
          className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">{card.label}</span>
            <span className={`font-mono font-bold text-sm ${card.textColor}`}>
              {Math.round(card.value * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`${card.barColor} h-full rounded-full transition-all duration-500`}
              style={{ width: `${card.value * 100}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">{card.desc}</p>
        </div>
      ))}

      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-semibold">Điểm Jackpot-RL</span>
          <span
            className={`font-mono font-bold text-sm ${
              banditReward >= 0 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {banditReward >= 0 ? `+${banditReward}` : banditReward} pts
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
          <span>
            Chu kỳ đã học: <b className="text-white">{totalCyclesLearned}</b>
          </span>
          <span>
            Bậc hiện tại:{" "}
            <b className="text-amber-300">
              Bậc {escalationLevel} ({escalationInfo.ticket_count} vé)
            </b>
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Tự động leo/hạ từng nấc thang để tối ưu độ phủ săn Độc Đắc.
        </p>
      </div>
    </div>
  );
};
