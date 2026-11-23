"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Header } from "@/components/Header";
import { LatestDrawBanner } from "@/components/LatestDrawBanner";
import { NextDrawCountdown } from "@/components/NextDrawCountdown";
import { GoldenSignalHeroBanner } from "@/components/GoldenSignalHeroBanner";
import { SmartPickGenerator } from "@/components/SmartPickGenerator";
import { HybridLearningDashboard } from "@/components/HybridLearningDashboard";
import { SavedTicketsTracker } from "@/components/SavedTicketsTracker";
import { WinningHistoryTracker } from "@/components/WinningHistoryTracker";
import { NextDrawComparisonModal } from "@/components/NextDrawComparisonModal";
import { Disclaimer } from "@/components/Disclaimer";
import { MobileTabsBar } from "@/components/home/MobileTabsBar";
import { AnalyticsSection } from "@/components/home/AnalyticsSection";

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<string>("mega_6_45");
  const [activeTab, setActiveTab] = useState<string>("analytics");
  const [latestDraw, setLatestDraw] = useState<any>(null);
  const [hotColdData, setHotColdData] = useState<any>(null);
  const [, setLoading] = useState<boolean>(true);
  const [backtestNumbers, setBacktestNumbers] = useState<number[] | null>(null);
  const [ticketsRefreshTrigger, setTicketsRefreshTrigger] = useState<number>(0);

  const fetchData = async (gameCode: string) => {
    setLoading(true);
    try {
      const drawRes = await fetch(
        `${API_BASE_URL}/api/v1/draws/latest?game_code=${gameCode}`
      );
      const drawJson = await drawRes.json();
      if (drawJson.success) {
        setLatestDraw(drawJson.data);
      }

      const hcRes = await fetch(
        `${API_BASE_URL}/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`
      );
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

  const triggerTicketsRefresh = () => {
    setTicketsRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header
        selectedGame={selectedGame}
        onSelectGame={setSelectedGame}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <MobileTabsBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="space-y-4">
          <LatestDrawBanner draw={latestDraw} gameCode={selectedGame} />
          <NextDrawCountdown
            gameCode={selectedGame}
            currentDrawPeriod={latestDraw?.draw_period}
          />
          <GoldenSignalHeroBanner
            gameCode={selectedGame}
            refreshTrigger={ticketsRefreshTrigger}
            onOpenAiTab={() => setActiveTab("ai_learning")}
          />
        </div>

        {activeTab === "analytics" && (
          <AnalyticsSection
            selectedGame={selectedGame}
            hotColdData={hotColdData}
            onRefresh={() => fetchData(selectedGame)}
          />
        )}

        {activeTab === "generator" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <SmartPickGenerator
              gameCode={selectedGame}
              onRunBacktest={(nums) => setBacktestNumbers(nums)}
              onTicketSaved={triggerTicketsRefresh}
            />
          </section>
        )}

        {activeTab === "tickets" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <SavedTicketsTracker
              gameCode={selectedGame}
              refreshTrigger={ticketsRefreshTrigger}
            />
          </section>
        )}

        {activeTab === "ai_learning" && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <HybridLearningDashboard
              gameCode={selectedGame}
              onTicketGenerated={triggerTicketsRefresh}
            />
          </section>
        )}

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

      {backtestNumbers && (
        <NextDrawComparisonModal
          numbers={backtestNumbers}
          gameCode={selectedGame}
          onClose={() => setBacktestNumbers(null)}
          onSaveAndTrack={triggerTicketsRefresh}
        />
      )}

      <Disclaimer />
    </div>
  );
}
