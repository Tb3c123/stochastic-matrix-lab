"use client";

import React, { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { HybridLearningDashboard } from "@/components/HybridLearningDashboard";
import { UnifiedTicketsHub } from "@/components/UnifiedTicketsHub";
import { Disclaimer } from "@/components/Disclaimer";
import { MobileTabsBar } from "@/components/home/MobileTabsBar";
import { CompactDrawStatusBar } from "@/components/home/CompactDrawStatusBar";
import { AnalyticsSection } from "@/components/home/AnalyticsSection";
import { useHomeLiveDraw } from "@/components/home/useHomeLiveDraw";

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<string>("mega_6_45");
  const [activeTab, setActiveTab] = useState<string>("ai_arena");
  const [ticketsRefreshTrigger, setTicketsRefreshTrigger] = useState<number>(0);

  const triggerTicketsRefresh = useCallback(() => {
    setTicketsRefreshTrigger((prev) => prev + 1);
  }, []);

  const { latestDraw, hotColdData } = useHomeLiveDraw(
    selectedGame,
    triggerTicketsRefresh
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header
        selectedGame={selectedGame}
        onSelectGame={setSelectedGame}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <MobileTabsBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        <CompactDrawStatusBar draw={latestDraw} gameCode={selectedGame} />

        {activeTab === "ai_arena" && (
          <HybridLearningDashboard
            gameCode={selectedGame}
            refreshTrigger={ticketsRefreshTrigger}
            onChampionUpgraded={triggerTicketsRefresh}
          />
        )}

        {activeTab === "tickets_hub" && (
          <UnifiedTicketsHub
            gameCode={selectedGame}
            refreshTrigger={ticketsRefreshTrigger}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsSection
            selectedGame={selectedGame}
            hotColdData={hotColdData}
          />
        )}
      </main>

      <Disclaimer />
    </div>
  );
}
