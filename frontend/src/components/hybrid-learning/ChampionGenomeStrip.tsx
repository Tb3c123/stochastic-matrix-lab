import React from "react";
import { Sliders } from "lucide-react";

export const ChampionGenomeStrip: React.FC<{ evo: any }> = ({ evo }) => {
  const g = evo?.champion_weights;
  if (!g) return null;

  const metrics = [
    { label: "EWMA Trung Hạn", val: `${Math.round((g.w_hot || 0) * 100)}%`, cls: "text-rose-300" },
    { label: "Sóng Ngắn Hạn", val: `${Math.round((g.w_hot_fast || 0) * 100)}%`, cls: "text-orange-300" },
    { label: "Chu Kỳ Gan (Hazard)", val: `${Math.round((g.w_lateness || 0) * 100)}%`, cls: "text-amber-300" },
    { label: "Chuyển Tiếp Markov", val: `${Math.round((g.w_markov || 0) * 100)}%`, cls: "text-violet-300" },
    { label: "Tương Hợp Cặp Số", val: `${Math.round((g.w_pair || 0) * 100)}%`, cls: "text-sky-300" },
    { label: "Tâm Chuông Gauss", val: `${Math.round((g.w_gauss_sum || 0) * 100)}%`, cls: "text-emerald-300" },
    { label: "Phễu Chọn Số (Pool)", val: `${g.pool_size || 24} số`, cls: "text-white" },
    { label: "Bước Xoay / Chống Trùng", val: `S=${g.wheel_stride || 5} • ≤${g.max_overlap || 3} số`, cls: "text-amber-200" },
  ];

  return (
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          Hồ Sơ Bộ Gen 10 Tham Số Của Quán Quân ({evo.champion_name})
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          100% Công thức xác định • Tự động truyền lại cho kỳ tới
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl bg-slate-900/90 border border-slate-800/90 px-3 py-2 flex flex-col justify-between"
          >
            <span className="text-[10px] text-slate-400 font-medium truncate">
              {m.label}
            </span>
            <span className={`text-xs md:text-sm font-black font-mono mt-0.5 ${m.cls}`}>
              {m.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
