"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { Activity } from "lucide-react";
import { DistributionTooltip } from "./DistributionTooltip";

interface SumRangeAreaCardProps {
  data: Array<{ range: string; "Số kỳ xuất hiện": number }>;
}

export const SumRangeAreaCard: React.FC<SumRangeAreaCardProps> = ({ data }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base md:text-lg text-white">
            Biểu Đồ Phân Phối Tổng Dãy Số (Đường Chuông Gauss)
          </h3>
          <p className="text-xs text-slate-400">
            Tập trung cao nhất quanh giá trị kỳ vọng lý thuyết
          </p>
        </div>
      </div>
      <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
        100 Kỳ Gần Nhất
      </span>
    </div>

    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            opacity={0.5}
          />
          <XAxis
            dataKey="range"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
          />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
          <Tooltip content={<DistributionTooltip />} />
          <Area
            type="monotone"
            dataKey="Số kỳ xuất hiện"
            stroke="#a78bfa"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSum)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);
