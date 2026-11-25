"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Activity } from "lucide-react";
import { DistributionTooltip } from "./DistributionTooltip";

interface SumRangeAreaCardProps {
  data: Array<{ range: string; "Số kỳ xuất hiện": number }>;
}

export const SumRangeAreaCard: React.FC<SumRangeAreaCardProps> = ({ data }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base md:text-lg text-slate-900">
            Biểu Đồ Phân Phối Tổng Dãy Số (Đường Chuông Gauss)
          </h3>
          <p className="text-xs text-slate-500">
            Tập trung cao nhất quanh giá trị kỳ vọng lý thuyết
          </p>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        100 Kỳ Gần Nhất
      </span>
    </div>

    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="range" stroke="#475569" fontSize={11} tickLine={false} />
          <YAxis stroke="#475569" fontSize={11} tickLine={false} />
          <Tooltip content={<DistributionTooltip />} />
          <Area
            type="monotone"
            dataKey="Số kỳ xuất hiện"
            stroke="#047857"
            strokeWidth={2}
            fill="#d1fae5"
            fillOpacity={0.7}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);
