"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PieChart } from "lucide-react";
import { DistributionTooltip } from "./DistributionTooltip";

interface ParityBarCardProps {
  data: Array<{ ratio: string; "Tần suất": number }>;
}

export const ParityBarCard: React.FC<ParityBarCardProps> = ({ data }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
          <PieChart className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base md:text-lg text-slate-900">
            Biểu Đồ Tỷ Lệ Chẵn : Lẻ
          </h3>
          <p className="text-xs text-slate-500">
            Phân bố số lượng chẵn/lẻ trong mỗi kỳ mở thưởng
          </p>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
        Cân Bằng 3:3 Chiếm Ưu Thế
      </span>
    </div>

    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="ratio" stroke="#475569" fontSize={11} tickLine={false} />
          <YAxis stroke="#475569" fontSize={11} tickLine={false} />
          <Tooltip content={<DistributionTooltip />} />
          <Bar dataKey="Tần suất" fill="#1d4ed8" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
