import React from "react";
import { Flame, Snowflake } from "lucide-react";

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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Số Xuất Hiện Nhiều (Hot)</h3>
            <p className="text-xs text-slate-500">Dựa trên {totalDraws} kỳ quay gần nhất</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {hotNumbers.slice(0, 6).map((item) => (
            <div key={item.number} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full ball-red flex items-center justify-center font-bold text-sm font-mono">
                  {item.number < 10 ? `0${item.number}` : item.number}
                </span>
                <span className="text-sm font-semibold text-slate-800">Số {item.number}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-700 h-2 rounded-full"
                    style={{ width: `${Math.min(item.percentage * 3, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-red-700 min-w-14 text-right font-mono">
                  {item.frequency} lần
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Số Xuất Hiện Ít (Cold)</h3>
            <p className="text-xs text-slate-500">Dựa trên {totalDraws} kỳ quay gần nhất</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {coldNumbers.slice(0, 6).map((item) => (
            <div key={item.number} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full ball-blue flex items-center justify-center font-bold text-sm font-mono">
                  {item.number < 10 ? `0${item.number}` : item.number}
                </span>
                <span className="text-sm font-semibold text-slate-800">Số {item.number}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-700 h-2 rounded-full"
                    style={{ width: `${Math.min(item.percentage * 3, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-blue-700 min-w-14 text-right font-mono">
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
