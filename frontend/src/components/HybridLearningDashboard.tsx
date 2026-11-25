"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/config/api";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { GoldenSignalHeroBanner } from "./GoldenSignalHeroBanner";
import { TournamentArenaBoard } from "./hybrid-learning/TournamentArenaBoard";
import { ChampionGenomeStrip } from "./hybrid-learning/ChampionGenomeStrip";
import { AiTicketRowsPanel } from "./hybrid-learning/AiTicketRowsPanel";
import { LearningLogsPanel } from "./hybrid-learning/LearningLogsPanel";

interface HybridLearningProps {
  gameCode: string;
  refreshTrigger?: number;
  onChampionUpgraded?: () => void;
}

export const HybridLearningDashboard: React.FC<HybridLearningProps> = ({
  gameCode,
  refreshTrigger = 0,
  onChampionUpgraded,
}) => {
  const [statusData, setStatusData] = useState<any>(() => getClientCache(`status:${gameCode}`) || null);
  const [activeTicketIdx, setActiveTicketIdx] = useState<number>(0);
  const champVerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const cached = getClientCache(`status:${gameCode}`);
    if (cached) {
      setStatusData(cached);
      setActiveTicketIdx(0);
    }
    champVerRef.current = null;

    const fetchStatus = async (initial = false) => {
      if (!initial && typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`
        );
        const json = await res.json();
        if (mounted && json.success && json.data) {
          setClientCache(`status:${gameCode}`, json.data);
          setStatusData(json.data);
          const newVer = Number(json.data.champion_version || 0);
          if (champVerRef.current !== null && newVer > champVerRef.current) {
            onChampionUpgraded?.();
          }
          champVerRef.current = newVer;
          if (initial && !cached) {
            const batch: any[] = json.data.latest_ai_tickets || [];
            const bestIdx = batch.findIndex((t: any) => t.is_best_ai_ticket);
            setActiveTicketIdx(bestIdx >= 0 ? bestIdx : 0);
          }
        }
      } catch (e) {
        console.error("Fetch auto cycle status failed:", e);
      }
    };

    fetchStatus(true);
    const timer = setInterval(() => fetchStatus(false), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [gameCode, refreshTrigger, onChampionUpgraded]);

  if (!statusData) {
    return <div className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse" />;
  }

  const latestAiTickets: any[] =
    statusData.latest_ai_tickets?.length > 0
      ? statusData.latest_ai_tickets
      : statusData.latest_ai_ticket
        ? [statusData.latest_ai_ticket]
        : [];
  const selectedTicket =
    latestAiTickets[activeTicketIdx] || latestAiTickets[0] || null;
  const learningLogs = statusData.learning_logs || [];

  return (
    <div className="space-y-6">
      <GoldenSignalHeroBanner gameCode={gameCode} statusData={statusData} />

      <TournamentArenaBoard
        evo={statusData.evo_hunter}
        isDrawLocked={!!statusData.is_draw_locked}
      />

      <ChampionGenomeStrip evo={statusData.evo_hunter} />

      {selectedTicket && (
        <AiTicketRowsPanel
          latestAiTickets={latestAiTickets}
          selectedTicket={selectedTicket}
          activeTicketIdx={activeTicketIdx}
          onSelectTicketIdx={setActiveTicketIdx}
        />
      )}

      <LearningLogsPanel learningLogs={learningLogs} />
    </div>
  );
};
