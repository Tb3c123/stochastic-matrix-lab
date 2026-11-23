"use client";

import React from "react";
import { RefreshCw, BarChart2 } from "lucide-react";
import { HotColdChart } from "@/components/HotColdChart";
import { LatenessMatrixChart } from "@/components/LatenessMatrixChart";
import { SumDistributionChart } from "@/components/SumDistributionChart";

interface AnalyticsSectionProps {
  selectedGame: string;
  hotColdData: any;
  onRefresh: () => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  selectedGame,
  hotColdData,
  onRefresh
}) => (
  <section className="space-y-8 animate-in fade-in duration-300">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-1">
          <BarChart2 className="w-3.5 h-3.5" /> Dữ Liệu Lịch Sử & Thống Kê Toán
          Học
        </div>
        <h2 className="text-2xl font-extrabold text-white">
          Biểu Đồ Phân Tích Chuyên Sâu
        </h2>
        <p className="text-xs text-slate-400">
          Toàn cảnh tần suất xuất hiện, chu kỳ trễ vắng mặt và phân phối chuẩn
          Gauss của các kỳ quay
        </p>
      </div>

      <button
        onClick={onRefresh}
        className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer self-start sm:self-center"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Làm Mới Dữ Liệu
      </button>
    </div>

    {hotColdData && (
      <HotColdChart
        hotNumbers={hotColdData.hot_numbers}
        coldNumbers={hotColdData.cold_numbers}
        totalDraws={hotColdData.total_draws_analyzed}
      />
    )}

    <LatenessMatrixChart gameCode={selectedGame} />
    <SumDistributionChart gameCode={selectedGame} />
  </section>
);
