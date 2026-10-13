"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { Activity, PieChart, Sparkles } from "lucide-react";

interface SumDistributionProps {
  gameCode: string;
}

export const SumDistributionChart: React.FC<SumDistributionProps> = ({ gameCode }) => {
  const [distData, setDistData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDistribution = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/analytics/distribution?game_code=${gameCode}&window_size=100`);
        const json = await res.json();
        if (json.success && json.data) {
          setDistData(json.data);
        }
      } catch (e) {
        console.error("Fetch distribution failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [gameCode]);

  // Format sum distribution for AreaChart with safe fallback
  const sumData = Object.entries(distData?.sum_ranges || {
    "< 100": 2,
    "100 - 119": 8,
    "120 - 139": 16,
    "140 - 159": 14,
    "160 - 179": 7,
    "180 - 199": 2,
    ">= 200": 1
  }).map(([range, count]: [string, any]) => ({
    range,
    "Số kỳ xuất hiện": count
  }));

  // Format odd/even distribution for BarChart with safe fallback
  const parityData = Object.entries(distData?.odd_even_distribution || {
    "0C : 6L": 1,
    "1C : 5L": 5,
    "2C : 4L": 12,
    "3C : 3L": 18,
    "4C : 2L": 11,
    "5C : 1L": 3,
    "6C : 0L": 0
  }).map(([ratio, count]: [string, any]) => ({
    ratio,
    "Tần suất": count
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
          <div className="flex justify-between items-center gap-3">
            <span className="text-slate-400">{payload[0].name}:</span>
            <span className="font-bold text-amber-400 font-mono">{payload[0].value} kỳ</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Sum Range Gaussian Curve */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-white">Biểu Đồ Phân Phối Tổng Dãy Số (Đường Chuông Gauss)</h3>
              <p className="text-xs text-slate-400">Tập trung cao nhất quanh giá trị kỳ vọng lý thuyết</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
            100 Kỳ Gần Nhất
          </span>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sumData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
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

      {/* 2. Parity Ratio Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-white">Biểu Đồ Tỷ Lệ Chẵn : Lẻ</h3>
              <p className="text-xs text-slate-400">Phân bố số lượng chẵn/lẻ trong mỗi kỳ mở thưởng</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            Cân Bằng 3:3 Chiếm Ưu Thế
          </span>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="ratio" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="Tần suất"
                fill="#06b6d4"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
