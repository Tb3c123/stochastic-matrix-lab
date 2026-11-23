"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Cpu } from "lucide-react";
import {
  DEFAULT_WEIGHTS,
  DEFAULT_ESCALATION_LADDER,
  EscalationStep
} from "./hybrid-learning/types";
import { EscalationLadderBar } from "./hybrid-learning/EscalationLadderBar";
import { AdaptiveWeightsGrid } from "./hybrid-learning/AdaptiveWeightsGrid";
import { AiTicketRowsPanel } from "./hybrid-learning/AiTicketRowsPanel";
import { LearningLogsPanel } from "./hybrid-learning/LearningLogsPanel";

interface HybridLearningProps {
  gameCode: string;
  onTicketGenerated?: () => void;
}

export const HybridLearningDashboard: React.FC<HybridLearningProps> = ({
  gameCode
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTicketIdx, setActiveTicketIdx] = useState<number>(0);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setStatusData(json.data);
          const batch: any[] = json.data.latest_ai_tickets || [];
          const bestIdx = batch.findIndex((t: any) => t.is_best_ai_ticket);
          setActiveTicketIdx(bestIdx >= 0 ? bestIdx : 0);
        }
      } catch (e) {
        console.error("Fetch auto cycle status failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [gameCode]);

  if (loading || !statusData) return null;

  const weights = statusData.weights || DEFAULT_WEIGHTS;
  const latestAiTickets: any[] =
    statusData.latest_ai_tickets && statusData.latest_ai_tickets.length > 0
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
            <Cpu className="w-3.5 h-3.5" /> Hệ Thống Tự Hành 100% • Nấc Thang
            Bậc 0 ↔ Bậc 3 (Không Reset Cứng)
          </div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            Cỗ Máy AI Tự Học & Săn Độc Đắc Theo Nấc Thang
          </h3>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Vận hành tự động hoàn toàn: <b>19:10</b> ngày quay tự cào kết quả &
            đối soát; <b>10:00 sáng</b> tự học theo cơ chế{" "}
            <i>Tiến/Lùi Từng Bậc</i> (Trượt tiến +1 bậc tăng phạt & thêm vé; Có
            giải phụ chỉ lùi -1 bậc để giữ đà bao vây).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-800/90 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">
              Cào & Đối soát: <b className="text-emerald-400">19:10 Ngày Xổ</b>
            </span>
          </div>
          <div className="bg-slate-800/90 border border-violet-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">
              AI Sinh vé mới:{" "}
              <b className="text-violet-300">10:00 Sáng Hàng Ngày</b>
            </span>
          </div>
        </div>
      </div>

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
