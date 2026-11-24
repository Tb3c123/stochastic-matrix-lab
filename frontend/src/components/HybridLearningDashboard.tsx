"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/config/api";
import { Cpu } from "lucide-react";
import {
  DEFAULT_WEIGHTS,
  DEFAULT_ESCALATION_LADDER,
  EscalationStep
} from "./hybrid-learning/types";
import { TournamentArenaBoard } from "./hybrid-learning/TournamentArenaBoard";
import { EscalationLadderBar } from "./hybrid-learning/EscalationLadderBar";
import { AdaptiveWeightsGrid } from "./hybrid-learning/AdaptiveWeightsGrid";
import { AiTicketRowsPanel } from "./hybrid-learning/AiTicketRowsPanel";
import { LearningLogsPanel } from "./hybrid-learning/LearningLogsPanel";

interface HybridLearningProps {
  gameCode: string;
  onTicketGenerated?: () => void;
}

export const HybridLearningDashboard: React.FC<HybridLearningProps> = ({
  gameCode,
  onTicketGenerated
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTicketIdx, setActiveTicketIdx] = useState<number>(0);
  const champVerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    champVerRef.current = null;
    setLoading(true);

    const fetchStatus = async (initial = false) => {
      if (!initial && typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`
        );
        const json = await res.json();
        if (mounted && json.success && json.data) {
          setStatusData(json.data);
          const newVer = Number(json.data.champion_version || 0);
          if (champVerRef.current !== null && newVer > champVerRef.current) {
            onTicketGenerated?.();
          }
          champVerRef.current = newVer;
          if (initial) {
            const batch: any[] = json.data.latest_ai_tickets || [];
            const bestIdx = batch.findIndex((t: any) => t.is_best_ai_ticket);
            setActiveTicketIdx(bestIdx >= 0 ? bestIdx : 0);
          }
        }
      } catch (e) {
        console.error("Fetch auto cycle status failed:", e);
      } finally {
        if (mounted && initial) setLoading(false);
      }
    };

    fetchStatus(true);
    const timer = setInterval(() => fetchStatus(false), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [gameCode, onTicketGenerated]);

  if (loading || !statusData) return null;

  const weights = statusData.weights || DEFAULT_WEIGHTS;
  const latestAiTickets: any[] =
    statusData.latest_ai_tickets?.length > 0
      ? statusData.latest_ai_tickets
      : statusData.latest_ai_ticket
        ? [statusData.latest_ai_ticket]
        : [];
  const playableGoldenRows: any[] = statusData.playable_golden_rows || [];
  const hasPlayableSignal: boolean =
    statusData.has_playable_signal ?? playableGoldenRows.length > 0;
  const selectedTicket =
    latestAiTickets[activeTicketIdx] || latestAiTickets[0] || null;
  const learningLogs = statusData.learning_logs || [];
  const banditReward = Math.round(statusData.bandit_cumulative_reward || 0);
  const escalationLevel: number = statusData.escalation_level ?? 0;
  const escalationInfo: EscalationStep = statusData.escalation_info || {
    level: escalationLevel,
    penalty_multiplier: 1.0,
    ticket_count: 1,
    label: "Bậc 0: Tinh Hoa Hội Tụ (1 Vé • Phạt 1.00x)"
  };
  const escalationLadder: EscalationStep[] =
    statusData.escalation_ladder || DEFAULT_ESCALATION_LADDER;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Cpu className="w-3.5 h-3.5" /> Hệ Thống Tự Hành 100% • Đồng Bộ Trực Tiếp 5 Giây
          </div>
          <h3 className="text-2xl font-bold text-white">
            Đấu Trường Tiến Hóa AI & Kết Tinh Vé Tần Suất Cao
          </h3>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            <b>17:45</b> tự khóa chốt vé kỳ quay; <b>18:35</b> tự cào kết quả & chấm điểm; <b>24/7</b> đấu loại 16 cá thể tìm công thức nổ đều nhất.
          </p>
        </div>
      </div>

      <TournamentArenaBoard
        evo={statusData.evo_hunter}
        isDrawLocked={!!statusData.is_draw_locked}
      />

      <EscalationLadderBar
        gameCode={gameCode}
        escalationLevel={escalationLevel}
        escalationInfo={escalationInfo}
        escalationLadder={escalationLadder}
      />

      <AdaptiveWeightsGrid
        weights={weights}
        banditReward={banditReward}
        totalCyclesLearned={statusData.total_cycles_learned}
        escalationLevel={escalationLevel}
        escalationInfo={escalationInfo}
      />

      {selectedTicket && (
        <AiTicketRowsPanel
          latestAiTickets={latestAiTickets}
          selectedTicket={selectedTicket}
          activeTicketIdx={activeTicketIdx}
          onSelectTicketIdx={setActiveTicketIdx}
          hasPlayableSignal={hasPlayableSignal}
          playableGoldenRows={playableGoldenRows}
        />
      )}

      <LearningLogsPanel learningLogs={learningLogs} />
    </div>
  );
};
