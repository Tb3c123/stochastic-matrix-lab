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
  <section className="space-y-6">
    <div className="pb-3 border-b border-slate-200">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200 mb-1.5">
        <BarChart2 className="w-3.5 h-3.5 text-slate-600" /> Phân Tích Xác Suất & Chu Kỳ Lịch Sử
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-slate-900">
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
