"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { BarChart3, Info } from "lucide-react";

interface AlgoData {
  strategy_code: string;
  name: string;
  historical_accuracy_pct: number;
  confidence_rating: string;
  total_tickets_saved: number;
  evaluated_tickets: number;
  real_world_accuracy_pct: number;
}

interface AlgorithmComparisonChartProps {
  data: AlgoData[];
}

export const AlgorithmComparisonChart: React.FC<AlgorithmComparisonChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.name.split("(")[0].trim(),
    "Độ chính xác thực nghiệm (%)": d.historical_accuracy_pct,
    "Tỷ lệ trúng thực tế (%)": d.real_world_accuracy_pct,
    "Số vé đã lưu": d.total_tickets_saved
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center gap-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                {p.name}:
              </span>
              <span className="font-bold text-white font-mono">
                {p.value} {p.name.includes("(%)") ? "%" : "vé"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">Biểu Đồ So Sánh Mức Độ Chính Xác & Tỷ Lệ Trúng Của Thuật Toán</h4>
        </div>
        <span className="text-[11px] text-slate-400">Trực quan hóa mức độ tin cậy thực nghiệm và tỷ lệ đối soát</span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
              iconType="circle"
            />
            <Bar
              dataKey="Độ chính xác thực nghiệm (%)"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="Tỷ lệ trúng thực tế (%)"
              fill="#f59e0b"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
