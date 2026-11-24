"use client";

import React from "react";
import { BarChart2 } from "lucide-react";
import { HotColdChart } from "@/components/HotColdChart";
import { LatenessMatrixChart } from "@/components/LatenessMatrixChart";
import { SumDistributionChart } from "@/components/SumDistributionChart";

interface AnalyticsSectionProps {
  selectedGame: string;
  hotColdData: any;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  selectedGame,
  hotColdData,
}) => (
  <section className="space-y-6 animate-in fade-in duration-300">
    <div className="pb-3 border-b border-slate-800">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-1">
        <BarChart2 className="w-3.5 h-3.5" /> Phân Tích Xác Suất & Chu Kỳ Lịch Sử
      </div>
      <h2 className="text-xl md:text-2xl font-extrabold text-white">
        Biểu Đồ Thống Kê Cầu Số Chuyên Sâu
      </h2>
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
