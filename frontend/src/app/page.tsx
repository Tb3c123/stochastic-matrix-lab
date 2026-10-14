"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Header } from "@/components/Header";
import { LatestDrawBanner } from "@/components/LatestDrawBanner";
import { NextDrawCountdown } from "@/components/NextDrawCountdown";
import { HotColdChart } from "@/components/HotColdChart";
import { LatenessMatrixChart } from "@/components/LatenessMatrixChart";
import { SumDistributionChart } from "@/components/SumDistributionChart";
import { SmartPickGenerator } from "@/components/SmartPickGenerator";
import { HybridLearningDashboard } from "@/components/HybridLearningDashboard";
import { SavedTicketsTracker } from "@/components/SavedTicketsTracker";
import { WinningHistoryTracker } from "@/components/WinningHistoryTracker";
import { NextDrawComparisonModal } from "@/components/NextDrawComparisonModal";
import { Disclaimer } from "@/components/Disclaimer";
import { RefreshCw, BarChart2 } from "lucide-react";

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<string>("mega_6_45");
  const [activeTab, setActiveTab] = useState<string>("analytics"); // analytics | generator | tickets | ai_learning | winning_history
  const [latestDraw, setLatestDraw] = useState<any>(null);
  const [hotColdData, setHotColdData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [backtestNumbers, setBacktestNumbers] = useState<number[] | null>(null);
  const [ticketsRefreshTrigger, setTicketsRefreshTrigger] = useState<number>(0);

  const fetchData = async (gameCode: string) => {
    setLoading(true);
    try {
      // 1. Fetch latest draw
      const drawRes = await fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${gameCode}`);
      const drawJson = await drawRes.json();
      if (drawJson.success) {
        setLatestDraw(drawJson.data);
      }

      // 2. Fetch hot/cold analytics
      const hcRes = await fetch(`${API_BASE_URL}/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`);
      const hcJson = await hcRes.json();
      if (hcJson.success) {
        setHotColdData(hcJson.data);
      }
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedGame);
  }, [selectedGame]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header
        selectedGame={selectedGame}
        onSelectGame={setSelectedGame}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Mobile Feature Tabs Bar */}
      <div className="flex md:hidden bg-slate-900 border-b border-slate-800 p-2 overflow-x-auto gap-2 text-xs font-bold shrink-0">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === "analytics"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-400 hover:text-white bg-slate-800"
          }`}
        >
          📊 Biểu Đồ
        </button>
        <button
          onClick={() => setActiveTab("generator")}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === "generator"
              ? "bg-amber-600 text-white shadow-md"
              : "text-slate-400 hover:text-white bg-slate-800"
          }`}
        >
          ✨ Sinh Vé
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === "tickets"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-slate-400 hover:text-white bg-slate-800"
          }`}
        >
          📑 Sổ Vé
        </button>
        <button
          onClick={() => setActiveTab("ai_learning")}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === "ai_learning"
              ? "bg-violet-600 text-white shadow-md"
              : "text-slate-400 hover:text-white bg-slate-800"
          }`}
        >
          🤖 AI Tự Học
        </button>
        <button
          onClick={() => setActiveTab("winning_history")}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
            activeTab === "winning_history"
              ? "bg-amber-500 text-slate-950 font-black shadow-md"
              : "text-amber-400/90 hover:text-white bg-slate-800"
          }`}
        >
          🏆 Lịch Sử Trúng
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Banner Section (Always Visible for Context) */}
        <div className="space-y-4">
          <LatestDrawBanner draw={latestDraw} gameCode={selectedGame} />
          {/* Real-time Countdown */}
          <NextDrawCountdown
            gameCode={selectedGame}
            currentDrawPeriod={latestDraw?.draw_period}
          />
        </div>

        {/* TAB 1: Biểu Đồ Phân Tích Chuyên Sâu */}
        {activeTab === "analytics" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-1">
                  <BarChart2 className="w-3.5 h-3.5" /> Dữ Liệu Lịch Sử & Thống Kê Toán Học
                </div>
                <h2 className="text-2xl font-extrabold text-white">Biểu Đồ Phân Tích Chuyên Sâu</h2>
                <p className="text-xs text-slate-400">
                  Toàn cảnh tần suất xuất hiện, chu kỳ trễ vắng mặt và phân phối chuẩn Gauss của các kỳ quay
                </p>
              </div>

              <button
                onClick={() => fetchData(selectedGame)}
                className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Làm Mới Dữ Liệu
              </button>
            </div>

            {/* 1. Hot / Cold Ranking Chart */}
            {hotColdData && (
              <HotColdChart
                hotNumbers={hotColdData.hot_numbers}
                coldNumbers={hotColdData.cold_numbers}
                totalDraws={hotColdData.total_draws_analyzed}
              />
            )}

            {/* 2. Lateness Matrix Chart */}
            <LatenessMatrixChart gameCode={selectedGame} />

            {/* 3. Sum Gaussian & Parity Distribution Charts */}
            <SumDistributionChart gameCode={selectedGame} />
          </section>
        )}

        {/* TAB 2: Sinh Vé Thông Minh */}
        {activeTab === "generator" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <SmartPickGenerator
              gameCode={selectedGame}
              onRunBacktest={(nums) => setBacktestNumbers(nums)}
              onTicketSaved={() => setTicketsRefreshTrigger((prev) => prev + 1)}
            />
          </section>
        )}

        {/* TAB 3: Sổ Theo Dõi & Đối Soát Vé */}
        {activeTab === "tickets" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <SavedTicketsTracker
              gameCode={selectedGame}
              refreshTrigger={ticketsRefreshTrigger}
            />
          </section>
        )}

        {/* TAB 4: AI Tự Học Thích Nghi (Hybrid Engine) */}
        {activeTab === "ai_learning" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <HybridLearningDashboard
              gameCode={selectedGame}
              onTicketGenerated={() => setTicketsRefreshTrigger((prev) => prev + 1)}
            />
          </section>
        )}

        {/* TAB 5: Lịch Sử Vé Trúng Thưởng */}
        {activeTab === "winning_history" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <WinningHistoryTracker
              gameCode={selectedGame}
              onNavigateToGenerator={() => setActiveTab("generator")}
              onNavigateToTickets={() => setActiveTab("tickets")}
            />
          </section>
        )}
      </main>

      {/* Next Draw Comparison & Forecast Modal */}
      {backtestNumbers && (
        <NextDrawComparisonModal
          numbers={backtestNumbers}
          gameCode={selectedGame}
          onClose={() => setBacktestNumbers(null)}
          onSaveAndTrack={() => setTicketsRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Transparency Disclaimer Footer */}
      <Disclaimer />
    </div>
  );
}
