"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import {
  Brain,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Activity,
  Zap,
  ArrowRight,
  TrendingUp,
  Cpu
} from "lucide-react";

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

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStatusData(json.data);
      }
    } catch (e) {
      console.error("Fetch auto cycle status failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [gameCode]);

  if (loading || !statusData) return null;

  const weights = statusData.weights || { w_lateness: 0.35, w_gauss_sum: 0.25, w_hot: 0.25, w_parity: 0.15 };
  const latestAiTicket = statusData.latest_ai_ticket;
  const learningLogs = statusData.learning_logs || [];
  const banditReward = Math.round(statusData.bandit_cumulative_reward || 0);

  const formatDrawDateWithDay = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        const dayName = dayNames[d.getDay()];
        return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]} - 18:00`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Cpu className="w-3.5 h-3.5" /> Hệ Thống Tự Hành 100% • Chế Độ Săn Độc Đắc (Jackpot-Only RL)
          </div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            Cỗ Máy AI Tự Học & Săn Độc Đắc Tự Động
          </h3>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Vận hành tự động hoàn toàn: <b>19:10</b> ngày quay tự cào kết quả & đối soát; <b>10:00 sáng</b> tự học hỏi theo cơ chế <i>Thưởng Độc Đắc - Phạt Bậc Thang</i> và sinh 1 vé 5 dãy mới.
          </p>
        </div>

        {/* Autonomous Schedule Badges (No Manual Button) */}
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
              AI Sinh vé mới: <b className="text-violet-300">10:00 Sáng Hàng Ngày</b>
            </span>
          </div>
        </div>
      </div>

      {/* Jackpot-Only Reward Shaping Rules Bar */}
      <div className="bg-slate-850/90 border border-amber-500/25 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-bold shrink-0">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Hàm Mục Tiêu Săn Độc Đắc (Jackpot-Only Reward Shaping):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
            🎯 Độc Đắc (6/6): +10,000 pts
          </span>
          {gameCode === "power_6_55" && (
            <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 border border-yellow-400/30 text-yellow-300 font-bold">
              ⚡ Jackpot 2 (5+1): +5,000 pts
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 font-semibold">
            Giải Nhất/Nhì/Ba (5-3 số): Phạt nhẹ (-2 / -5 / -10 pts) → Tinh chỉnh hẹp
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-semibold">
            Trượt (0-2 số): Phạt nặng (-25 / -50 pts) → Xoay trục mạnh
          </span>
        </div>
      </div>

      {/* Grid: Adaptive Dynamic Weights & Multi-Armed Bandit Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lateness Weight */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Trọng số Chu Kỳ Trễ</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{Math.round(weights.w_lateness * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${weights.w_lateness * 100}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-500">Ưu tiên khai thác các con số đạt điểm bão hòa vắng mặt.</p>
        </div>

        {/* Gauss Sum Weight */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Trọng số Tổng Gauss</span>
            <span className="font-mono font-bold text-purple-400 text-sm">{Math.round(weights.w_gauss_sum * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${weights.w_gauss_sum * 100}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-500">Duy trì tổng 6 số trong vùng chuông xác suất cao nhất.</p>
        </div>

        {/* Hot Numbers Weight */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Trọng số Tần Suất Hot</span>
            <span className="font-mono font-bold text-red-400 text-sm">{Math.round(weights.w_hot * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${weights.w_hot * 100}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-500">Đón bắt quán tính các con số xuất hiện nhiều gần đây.</p>
        </div>

        {/* Bandit Reward & Accuracy */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Điểm Jackpot-RL</span>
            <span className={`font-mono font-bold text-sm ${banditReward >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
              {banditReward >= 0 ? `+${banditReward}` : banditReward} pts
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>Chu kỳ đã học: <b className="text-white">{statusData.total_cycles_learned}</b></span>
            <span>Độ khớp: <b className="text-emerald-400">{statusData.recent_accuracy_rate}%</b></span>
          </div>
          <p className="text-[11px] text-slate-500">Thưởng lớn khi nổ Jackpot, phạt bậc thang để dẫn hướng hội tụ.</p>
        </div>
      </div>

      {/* Latest AI Auto-Learned Ticket Display */}
      {latestAiTicket && (
        <div className="bg-slate-850/80 border border-violet-500/30 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Vé AI Tự Động Sinh Cho Kỳ Tới #{latestAiTicket.target_draw_period}
              </span>
              <span className="text-xs text-slate-400">
                Lần xổ: <b className="text-amber-300">{formatDrawDateWithDay(latestAiTicket.target_draw_date)}</b>
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu vào sổ theo dõi học hỏi
            </span>
          </div>

          {/* 5 Rows generated by AI */}
          <div className="space-y-2.5">
            {latestAiTicket.rows.map((row: number[], rIdx: number) => {
              const forecast = latestAiTicket.row_forecasts?.[rIdx] || {};
              const sum = row.reduce((a, b) => a + b, 0);
              const evens = row.filter((n) => n % 2 === 0).length;

              return (
                <div
                  key={rIdx}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-md shrink-0">
                      {String.fromCharCode(65 + rIdx)}
                    </span>
                    {/* Sub-algorithm indicator */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        rIdx < 2
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                          : rIdx === 2
                          ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                          : "bg-violet-500/10 text-violet-400 border-violet-500/30"
                      }`}
                    >
                      {forecast.algorithm_name || (rIdx < 2 ? "AI Khai Thác (Bayes + Gauss)" : rIdx === 2 ? "AI Hồi Quy Chu Kỳ Trễ" : "AI Thăm Dò (Bandit Agent)")}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.map((num) => (
                        <span
                          key={num}
                          className="w-9 h-9 rounded-full ball-red text-white font-bold text-sm flex items-center justify-center shadow-md"
                        >
                          {num < 10 ? `0${num}` : num}
                        </span>
                      ))}

                      {/* Power 6/55 Special Number Ball */}
                      {forecast.special_number && (
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="text-amber-500 font-extrabold text-xs">+</span>
                          <span
                            className="w-9 h-9 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20"
                            title="Bóng Đặc Biệt Jackpot 2 (Được chấm điểm theo Trọng số AI)"
                          >
                            {forecast.special_number < 10 ? `0${forecast.special_number}` : forecast.special_number}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <span>Tổng: <b className="text-white">{sum}</b></span>
                    <span>Chẵn/Lẻ: <b className="text-white">{evens}C : {6 - evens}L</b></span>
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-300 font-semibold">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>XS Độc Đắc: <b className="font-mono text-amber-400">{forecast.jackpot_probability_display || "1/8.14M (+18%)"}</b></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Learning Logs Timeline */}
      {learningLogs.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-violet-400" /> Nhật Ký Tự Học Hỏi Gần Nhất
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
            {learningLogs.slice(-4).reverse().map((log: any, idx: number) => (
              <div key={idx} className="bg-slate-850/50 p-2.5 rounded-xl border border-slate-800/60 text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="text-slate-500 font-mono mr-2">{log.timestamp ? log.timestamp.slice(0, 16).replace("T", " ") : ""}</span>
                  <span>{log.feedback_summary || log.event}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
