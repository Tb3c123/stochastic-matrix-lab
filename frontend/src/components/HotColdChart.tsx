import React from "react";
import { Flame, Snowflake, BarChart2 } from "lucide-react";

interface NumberStat {
  number: number;
  frequency: number;
  percentage: number;
  status: string;
}

interface HotColdProps {
  hotNumbers: NumberStat[];
  coldNumbers: NumberStat[];
  totalDraws: number;
}

export const HotColdChart: React.FC<HotColdProps> = ({ hotNumbers, coldNumbers, totalDraws }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Hot Numbers */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Số Xuất Hiện Nhiều (Hot)</h3>
              <p className="text-xs text-slate-400">Dựa trên {totalDraws} kỳ quay gần nhất</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {hotNumbers.slice(0, 6).map((item) => (
            <div key={item.number} className="flex items-center justify-between bg-slate-800/40 border border-slate-800 rounded-xl p-2.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full ball-red flex items-center justify-center text-white font-bold text-sm">
                  {item.number < 10 ? `0${item.number}` : item.number}
                </span>
                <span className="text-sm font-semibold text-slate-300">Số {item.number}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.percentage * 3, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-red-400 min-w-14 text-right">
                  {item.frequency} lần
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cold Numbers */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Snowflake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Số Xuất Hiện Ít (Cold)</h3>
              <p className="text-xs text-slate-400">Dựa trên {totalDraws} kỳ quay gần nhất</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {coldNumbers.slice(0, 6).map((item) => (
            <div key={item.number} className="flex items-center justify-between bg-slate-800/40 border border-slate-800 rounded-xl p-2.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full ball-blue flex items-center justify-center text-white font-bold text-sm">
                  {item.number < 10 ? `0${item.number}` : item.number}
                </span>
                <span className="text-sm font-semibold text-slate-300">Số {item.number}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.percentage * 3, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-blue-400 min-w-14 text-right">
                  {item.frequency} lần
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
