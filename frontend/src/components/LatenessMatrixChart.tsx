"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface LatenessMatrixProps {
  gameCode: string;
}

export const LatenessMatrixChart: React.FC<LatenessMatrixProps> = ({ gameCode }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLateness = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/analytics/lateness?game_code=${gameCode}`);
        const json = await res.json();
        if (json.success && json.data?.lateness_matrix) {
          // Sort by current lateness descending, take top 16 numbers
          const matrix = json.data.lateness_matrix;
          const sorted = [...matrix]
            .sort((a: any, b: any) => b.current_lateness - a.current_lateness)
            .slice(0, 16)
            .map((item: any) => ({
              number: item.number < 10 ? `Số 0${item.number}` : `Số ${item.number}`,
              "Số kỳ chưa về hiện tại": item.current_lateness,
              "Kỷ lục vắng mặt (Max Gap)": item.max_gap
            }));
          setData(sorted);
        }
      } catch (e) {
        console.error("Fetch lateness failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLateness();
  }, [gameCode]);

  if (loading || data.length === 0) return null;

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
                {p.value} kỳ
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white">
              Biểu Đồ Chu Kỳ Trễ (Top Con Số Vắng Mặt Lâu Nhất)
            </h3>
            <p className="text-xs text-slate-400">
              Số kỳ liên tiếp chưa xuất hiện so với kỷ lục vắng mặt dài nhất trong lịch sử (Cơ sở cho thuật toán Hồi quy)
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> Top 16 Số Lạnh Nhất
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="number"
              stroke="#94a3b8"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              tickLine={false}
              interval={0}
            />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "15px", fontSize: "12px" }}
              iconType="circle"
            />
            <Bar
              dataKey="Số kỳ chưa về hiện tại"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="Kỷ lục vắng mặt (Max Gap)"
              fill="#64748b"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
