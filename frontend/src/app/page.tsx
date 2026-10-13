"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { LatestDrawBanner } from "@/components/LatestDrawBanner";
import { HotColdChart } from "@/components/HotColdChart";
import { SmartPickGenerator } from "@/components/SmartPickGenerator";
import { BacktestModal } from "@/components/BacktestModal";
import { Disclaimer } from "@/components/Disclaimer";
import { RefreshCw } from "lucide-react";

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<string>("mega_6_45");
  const [latestDraw, setLatestDraw] = useState<any>(null);
  const [hotColdData, setHotColdData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [backtestNumbers, setBacktestNumbers] = useState<number[] | null>(null);

  const fetchData = async (gameCode: string) => {
    setLoading(true);
    try {
      // 1. Fetch latest draw
      const drawRes = await fetch(`http://localhost:8000/api/v1/draws/latest?game_code=${gameCode}`);
      const drawJson = await drawRes.json();
      if (drawJson.success) {
        setLatestDraw(drawJson.data);
      }

      // 2. Fetch hot/cold analytics
      const hcRes = await fetch(`http://localhost:8000/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`);
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
      <Header selectedGame={selectedGame} onSelectGame={setSelectedGame} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        {/* Banner Section */}
        <LatestDrawBanner draw={latestDraw} gameCode={selectedGame} />

        {/* Hot / Cold Analytics */}
        {hotColdData && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Thống Kê Tần Suất Chu Kỳ</h3>
                <p className="text-xs text-slate-400">Tần suất xuất hiện của các con số trong {hotColdData.total_draws_analyzed} kỳ gần đây</p>
              </div>
              <button
                onClick={() => fetchData(selectedGame)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Làm Mới
              </button>
            </div>
            <HotColdChart
              hotNumbers={hotColdData.hot_numbers}
              coldNumbers={hotColdData.cold_numbers}
              totalDraws={hotColdData.total_draws_analyzed}
            />
          </section>
        )}

        {/* Smart Generator & Backtester Section */}
        <section>
          <SmartPickGenerator
            gameCode={selectedGame}
            onRunBacktest={(nums) => setBacktestNumbers(nums)}
          />
        </section>
      </main>

      {/* Backtest Modal */}
      {backtestNumbers && (
        <BacktestModal
          numbers={backtestNumbers}
          gameCode={selectedGame}
          onClose={() => setBacktestNumbers(null)}
        />
      )}

      {/* Transparency Disclaimer Footer */}
      <Disclaimer />
    </div>
  );
}
