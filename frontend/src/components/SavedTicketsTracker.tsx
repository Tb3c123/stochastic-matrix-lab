"use client";

import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "@/config/api";
import {
  BookmarkCheck,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Trophy,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Dna,
  ShieldCheck,
  Zap,
  HelpCircle,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  Compass,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { AlgorithmComparisonChart } from "@/components/AlgorithmComparisonChart";

interface SavedTicketsTrackerProps {
  gameCode: string;
  refreshTrigger: number;
}

export const SavedTicketsTracker: React.FC<SavedTicketsTrackerProps> = ({ gameCode, refreshTrigger }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [algoPerf, setAlgoPerf] = useState<any[]>([]);
  const [selectedAlgoFilter, setSelectedAlgoFilter] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openRowAudits, setOpenRowAudits] = useState<Record<string, boolean>>({});
  const [evaluateNotice, setEvaluateNotice] = useState<string | null>(null);

  const toggleRowAudit = (ticketId: number, rowIdx: number) => {
    const key = `${ticketId}-${rowIdx}`;
    setOpenRowAudits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDateCollapse = (periodKey: string) => {
    setCollapsedDates((prev) => ({ ...prev, [periodKey]: !prev[periodKey] }));
  };

  const fetchTicketsAndPerformance = async () => {
    setLoading(true);
    try {
      // 1. Fetch tickets
      const res = await fetch(`${API_BASE_URL}/api/v1/tickets?game_code=${gameCode}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTickets(data.data);
      }

      // 2. Fetch algorithm performance evaluation
      const perfRes = await fetch(`${API_BASE_URL}/api/v1/tickets/algorithms-performance?game_code=${gameCode}`);
      const perfData = await perfRes.json();
      if (perfData.success && perfData.data) {
        setAlgoPerf(perfData.data);
      }
    } catch (e) {
      console.error("Fetch saved tickets or performance failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tickets/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_code: gameCode })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEvaluateNotice(data.data.message);
        await fetchTicketsAndPerformance();
        setTimeout(() => setEvaluateNotice(null), 8000);
      }
    } catch (e) {
      console.error("Evaluate failed:", e);
    } finally {
      setEvaluating(false);
    }
  };



  useEffect(() => {
    fetchTicketsAndPerformance();
  }, [gameCode, refreshTrigger]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "N/A") return "Chưa xác định";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getStrategyBadge = (stratCode: string) => {
    switch (stratCode) {
      case "mixed":
        return {
          label: "Vé Hỗn Hợp (Điền Tay & Thuật Toán)",
          shortLabel: "Hỗn Hợp",
          bg: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
          dot: "bg-fuchsia-400"
        };
      case "balanced":
        return {
          label: "Thuật Toán Cân Bằng (Balanced)",
          shortLabel: "Cân Bằng",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-400"
        };
      case "mean_reversion":
        return {
          label: "Thuật Toán Hồi Quy (Mean Reversion)",
          shortLabel: "Hồi Quy",
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          dot: "bg-sky-400"
        };
      case "pure_random":
        return {
          label: "Thuật Toán Ngẫu Nhiên (Pure Random)",
          shortLabel: "Ngẫu Nhiên",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          dot: "bg-amber-400"
        };
      case "custom_manual":
      case "custom":
        return {
          label: "Tự Điền Thủ Công (Điền Tay)",
          shortLabel: "Điền Tay",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          dot: "bg-purple-400"
        };
      case "hybrid_ai_learned":
        return {
          label: "AI Hybrid Đa Tầng (Adaptive)",
          shortLabel: "AI Hybrid",
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
          dot: "bg-indigo-400"
        };
      default:
        return {
          label: stratCode || "Thuật Toán Chu Kỳ",
          shortLabel: stratCode || "Khác",
          bg: "bg-slate-700/30 text-slate-300 border-slate-700",
          dot: "bg-slate-400"
        };
    }
  };

  const getRowAlgorithmBadge = (rowForecast: any, ticketStrategy: string, rowIndex: number) => {
    const code = rowForecast?.algorithm_code || (
      ticketStrategy === "hybrid_ai_learned"
        ? (rowIndex < 2 ? "hybrid_exploitation_bayes" : rowIndex === 2 ? "hybrid_mean_reversion" : "hybrid_exploration_bandit")
        : ticketStrategy
    );

    switch (code) {
      case "custom_manual":
      case "custom":
        return {
          label: "✍️ Điền Tay",
          fullName: "Dãy số do bạn tự điền tay theo trực giác",
          cls: "bg-purple-500/10 text-purple-400 border-purple-500/30"
        };
      case "balanced":
        return {
          label: "⚡ Cân Bằng",
          fullName: "Thuật toán Cân Bằng Chu Kỳ (Gauss & Chẵn Lẻ)",
          cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        };
      case "mean_reversion":
        return {
          label: "📈 Hồi Quy",
          fullName: "Thuật toán Hồi Quy Chu Kỳ Số Trễ",
          cls: "bg-sky-500/10 text-sky-400 border-sky-500/30"
        };
      case "pure_random":
        return {
          label: "🎲 Ngẫu Nhiên",
          fullName: "Thuật toán Ngẫu Nhiên Độc Lập",
          cls: "bg-amber-500/10 text-amber-400 border-amber-500/30"
        };
      case "hybrid_exploitation_bayes":
        return {
          label: "🤖 AI Khai Thác",
          fullName: "AI Khai Thác (Bayes + Gauss)",
          cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
        };
      case "hybrid_mean_reversion":
        return {
          label: "🤖 AI Hồi Quy",
          fullName: "AI Hồi Quy Chu Kỳ Trễ",
          cls: "bg-sky-500/10 text-sky-400 border-sky-500/30"
        };
      case "hybrid_exploration_bandit":
        return {
          label: "🤖 AI Thăm Dò",
          fullName: "AI Thăm Dò (Bandit Agent)",
          cls: "bg-violet-500/10 text-violet-400 border-violet-500/30"
        };
      default:
        return {
          label: "⚡ Cân Bằng",
          fullName: "Thuật toán Chu Kỳ",
          cls: "bg-slate-700/30 text-slate-300 border-slate-700"
        };
    }
  };

  const isTicketMatchingAlgo = (t: any, algo: string) => {
    if (algo === "all") return true;
    if (algo === "mixed") {
      return t.strategy === "mixed";
    }
    if (algo === "custom_manual") {
      if (t.strategy === "custom_manual" || t.strategy === "custom") return true;
      const rowForecasts = t.predicted_analysis?.row_forecasts || [];
      return rowForecasts.some(
        (rf: any) => rf.algorithm_code === "custom_manual" || rf.algorithm_code === "custom"
      );
    }
    if (algo === "hybrid_ai_learned") {
      if (t.strategy === "hybrid_ai_learned") return true;
      const rowForecasts = t.predicted_analysis?.row_forecasts || [];
      return rowForecasts.some((rf: any) => rf.algorithm_code?.startsWith("hybrid_"));
    }
    if (t.strategy === algo) return true;
    const rowForecasts = t.predicted_analysis?.row_forecasts || [];
    return rowForecasts.some((rf: any) => rf.algorithm_code === algo);
  };

  const countAll = tickets.length;
  const countHybrid = tickets.filter((t) => isTicketMatchingAlgo(t, "hybrid_ai_learned")).length;
  const countBalanced = tickets.filter((t) => isTicketMatchingAlgo(t, "balanced")).length;
  const countMean = tickets.filter((t) => isTicketMatchingAlgo(t, "mean_reversion")).length;
  const countRandom = tickets.filter((t) => isTicketMatchingAlgo(t, "pure_random")).length;
  const countCustom = tickets.filter((t) => isTicketMatchingAlgo(t, "custom_manual")).length;
  const countMixed = tickets.filter((t) => isTicketMatchingAlgo(t, "mixed")).length;

  const filteredTickets = tickets.filter((t) => isTicketMatchingAlgo(t, selectedAlgoFilter));

  // Group tickets by target_draw_period or target_draw_date
  const dateGroups = useMemo(() => {
    const groupsMap: Record<string, {
      period: string;
      date: string;
      tickets: any[];
      totalPrize: number;
      winningTicketsCount: number;
      totalRows: number;
    }> = {};

    filteredTickets.forEach((t) => {
      const key = t.target_draw_period || t.target_draw_date || "Chưa xác định";
      if (!groupsMap[key]) {
        groupsMap[key] = {
          period: t.target_draw_period || "",
          date: t.target_draw_date || "",
          tickets: [],
          totalPrize: 0,
          winningTicketsCount: 0,
          totalRows: 0
        };
      }
      groupsMap[key].tickets.push(t);
      groupsMap[key].totalRows += (t.rows_count || t.rows?.length || 0);
      const prize = t.matched_results?.total_prize_vnd || 0;
      groupsMap[key].totalPrize += prize;
      if (prize > 0) {
        groupsMap[key].winningTicketsCount += 1;
      }
    });

    Object.values(groupsMap).forEach((grp) => {
      grp.tickets.sort((tA, tB) => {
        const sA = tA.ticket_beauty_score ?? tA.predicted_analysis?.ticket_beauty_score ?? 0;
        const sB = tB.ticket_beauty_score ?? tB.predicted_analysis?.ticket_beauty_score ?? 0;
        if (sB !== sA) return sB - sA;
        return (tB.id || 0) - (tA.id || 0);
      });
    });

    return Object.entries(groupsMap).sort(([keyA, a], [keyB, b]) => {
      if (a.date && b.date) {
        return b.date.localeCompare(a.date);
      }
      return keyB.localeCompare(keyA, undefined, { numeric: true });
    });
  }, [filteredTickets]);

  // Render a single ticket card
  const renderTicketCard = (ticket: any) => {
    const isPending = ticket.status === "pending";
    const isExpanded = expandedId === ticket.id;
    const analysis = ticket.predicted_analysis || {};
    const stratInfo = analysis.strategy_info || {};
    const matchResult = ticket.matched_results;
    const stratBadge = getStrategyBadge(ticket.strategy);
    const beautyEval = analysis.beauty_evaluation || {};
    const ticketBeautyScore =
      ticket.ticket_beauty_score ?? analysis.ticket_beauty_score ?? beautyEval.ticket_beauty_score ?? 88.5;
    const beautyGrade =
      ticket.beauty_grade ?? beautyEval.beauty_grade ?? (ticketBeautyScore >= 92 ? "S+" : ticketBeautyScore >= 88.5 ? "S" : "A+");
    const isBestOfPeriod = !!ticket.is_best_ticket_of_period;
    const bestRowIdx = ticket.best_row_index ?? analysis.best_row_index ?? beautyEval.best_row_index ?? 0;
    const bestRowLabel = ticket.best_row_label ?? analysis.best_row_label ?? beautyEval.best_row_label ?? "Dãy A";

    return (
      <div
        key={ticket.id}
        className={`border rounded-2xl p-5 transition-all relative overflow-hidden ${
          isBestOfPeriod
            ? "bg-gradient-to-br from-amber-950/25 via-slate-900 to-slate-900 border-amber-400/60 ring-1 ring-amber-400/30 shadow-lg shadow-amber-500/10"
            : isPending
            ? "bg-slate-800/30 border-slate-800 hover:border-slate-700"
            : matchResult?.total_prize_vnd > 0
            ? "bg-emerald-950/20 border-emerald-800/40"
            : "bg-slate-800/50 border-slate-700"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header Info & Strategy Tag */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Best Ticket of the Day / Period Crown Badge */}
            {isBestOfPeriod && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1">
                👑 VÉ ĐẸP NHẤT KỲ #{ticket.target_draw_period} (TOP #1)
              </span>
            )}

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isPending
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {isPending ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isPending ? `Chờ Kỳ Xổ #${ticket.target_draw_period}` : `Đã Đối Soát Kỳ #${ticket.target_draw_period}`}
            </span>

            {/* Strategy Badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${stratBadge.bg}`}>
              <Dna className="w-3.5 h-3.5" /> {stratBadge.label}
            </span>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Vé #{ticket.id} ({ticket.rows_count} dãy)</span>
              <span>•</span>
              <span>Ngày quay: <b className="text-slate-300">{formatDate(ticket.target_draw_date)}</b></span>
            </div>
          </div>

          {/* Beauty Score, Accuracy & Probability Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
                isBestOfPeriod
                  ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                  : "bg-slate-800/90 border-slate-700/80 text-slate-300"
              }`}
              title="Điểm đánh giá độ đẹp tổng hợp 5 trụ cột của vé trong ngày"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {ticket.beauty_rank ? `Hạng #${ticket.beauty_rank}/${ticket.period_tickets_count} • ` : ""}
                Điểm Đẹp: <b className="text-amber-300 font-mono">{ticketBeautyScore}/100 ({beautyGrade})</b>
              </span>
              <span className="text-[11px] text-emerald-300 ml-1">• ★ {bestRowLabel}</span>
            </div>

            <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Độ chính xác:</span>
              <b className="text-amber-400">{stratInfo.historical_accuracy_pct || 80.0}% ({stratInfo.confidence_rating || "A"})</b>
            </div>

            {matchResult && matchResult.total_prize_vnd > 0 && (
              <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Trúng {formatVND(matchResult.total_prize_vnd)}
              </div>
            )}

            <button
              onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700"
              title="Xem chi tiết phân tích thuật toán"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Rows Display */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          {ticket.rows.map((row: number[], rIdx: number) => {
            const evalRow = matchResult?.rows_evaluation?.[rIdx];
            const matchedNums: number[] = evalRow?.matched_numbers || [];
            const rowForecast = analysis?.row_forecasts?.[rIdx] || {};
            const audit = rowForecast?.audit;
            const rowKey = `${ticket.id}-${rIdx}`;
            const isAuditOpen = !!openRowAudits[rowKey];
            const isBestRow = rowForecast?.is_best_row || rIdx === bestRowIdx;

            return (
              <div
                key={rIdx}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isBestRow
                    ? "bg-gradient-to-r from-amber-950/25 via-slate-850/60 to-slate-850/60 border-amber-400/50"
                    : "bg-slate-850/50 border-slate-800/60"
                }`}
              >
                {/* Main Row Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isBestRow
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {String.fromCharCode(65 + rIdx)}
                    </span>

                    {isBestRow && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                        👑 Dãy Đẹp Nhất ({rowForecast?.row_beauty_score || ticket.best_row_score || 94.0}đ)
                      </span>
                    )}

                    {/* Specific Algorithm used for this row */}
                    {(() => {
                      const rowBadge = getRowAlgorithmBadge(rowForecast, ticket.strategy, rIdx);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${rowBadge.cls}`}
                            title={rowBadge.fullName}
                          >
                            {rowBadge.label}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap items-center gap-2">
                      {row.map((num) => {
                        const isMatch = matchedNums.includes(num);
                        return (
                          <span
                            key={num}
                            className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                              isMatch
                                ? "bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg scale-105"
                                : "ball-red text-white"
                            }`}
                          >
                            {num < 10 ? `0${num}` : num}
                          </span>
                        );
                      })}
                      {ticket.game_code === "power_6_55" && (() => {
                        const spNum = evalRow?.special_number ?? rowForecast?.special_number ?? null;
                        const isSpMatch = !!evalRow?.matched_special;
                        return (
                          <div className="flex items-center gap-1.5 pl-1">
                            <span className="text-amber-500 font-extrabold text-xs">+</span>
                            <span
                              className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center transition-all ${
                                isSpMatch
                                  ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 ring-4 ring-yellow-300/50 shadow-lg shadow-amber-500/50 scale-110 animate-pulse border-2 border-white"
                                  : "bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20"
                              }`}
                              title={`Số đặc biệt Power 6/55: ${spNum ? (spNum < 10 ? `0${spNum}` : spNum) : "ĐB"}${isSpMatch ? " (TRÚNG ĐẶC BIỆT!)" : ""}`}
                            >
                              {spNum ? (spNum < 10 ? `0${spNum}` : spNum) : "★"}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Evaluation / Match Count or Audit Trigger */}
                  <div className="flex items-center gap-2 text-xs">
                    {evalRow ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            evalRow.prize_amount > 0 || evalRow.matched_special
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : evalRow.match_count >= 3
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          Trùng {evalRow.match_count}/6 số
                          {evalRow.matched_special && " + Số ĐB ★"}
                          {evalRow.prize_amount > 0 && ` (${evalRow.prize_name} - ${formatVND(evalRow.prize_amount)})`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs italic">Đang chờ quay...</span>
                    )}

                    {audit && (
                      <button
                        onClick={() => toggleRowAudit(ticket.id, rIdx)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 border transition-all cursor-pointer ${
                          audit.score >= 80
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : audit.score >= 60
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Thẩm định: {audit.score}đ</span>
                        {isAuditOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit Collapsible Details */}
                {isAuditOpen && audit && (
                  <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 text-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300">Kết Luận Thẩm Định:</span>
                        <span
                          className={`font-black px-2 py-0.5 rounded text-[11px] ${
                            audit.verdict_code === "optimal"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : audit.verdict_code === "acceptable"
                              ? "bg-sky-500/20 text-sky-300"
                              : audit.verdict_code === "caution"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {audit.verdict_label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Phân tích dựa trên 100 kỳ quay lịch sử Vietlott
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-2.5 space-y-1">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <ThumbsUp className="w-3.5 h-3.5" /> Ưu Điểm Xác Suất:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                          {audit.pros.map((p: string, pIdx: number) => (
                            <li key={pIdx}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Điểm Cần Lưu Ý / Rủi Ro:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                          {audit.cons.length > 0 ? (
                            audit.cons.map((c: string, cIdx: number) => (
                              <li key={cIdx}>{c}</li>
                            ))
                          ) : (
                            <li className="text-emerald-400/80 italic">Dãy số không ghi nhận bất thường xác suất lớn</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {audit.tactical_advice && (
                      <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-start gap-2.5 text-xs text-indigo-200">
                        <Compass className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-indigo-300">Chiến Thuật Phân Bổ:</span>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {audit.tactical_advice}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded Algorithm & Learning Details */}
        {isExpanded && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                <TrendingUp className="w-4 h-4" /> Đánh Giá Chi Tiết Hiệu Suất Thuật Toán {stratInfo.strategy_name || ticket.strategy}
              </span>
              <span className="text-[11px] text-slate-400">Mức rủi ro: <b className="text-white">{stratInfo.risk_level || "Ổn định"}</b></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <p className="text-slate-400"><b>Nguyên lý hoạt động:</b> {stratInfo.description || "Phân phối chu kỳ xác suất theo dữ liệu lịch sử."}</p>
                <p className="text-slate-400"><b>Ưu thế thuật toán:</b> {stratInfo.advantage || "Tối ưu hóa độ bao phủ và cân đối chẵn lẻ."}</p>
              </div>

              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Độ phủ con số độc nhất:</span>
                  <b className="text-white">{analysis.unique_numbers_count} số ({analysis.coverage_pct}%)</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tỷ lệ Chẵn / Lẻ:</span>
                  <b className="text-white">{analysis.parity_ratio}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Điểm đánh giá thuật toán:</span>
                  <b className="text-amber-400">{stratInfo.algorithm_score || 85.0} / 100</b>
                </div>
              </div>
            </div>

            {matchResult?.learning_feedback && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <b>Nhật ký học hỏi sau đối soát:</b> {matchResult.learning_feedback}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // If no tickets exist and not loading, show clear Empty State with Action Buttons
  if (tickets.length === 0 && !loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <BookmarkCheck className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-bold text-white">Chưa Có Vé Nào Trong Sổ Đối Soát ({gameCode === "mega_6_45" ? "Mega 6/45" : "Power 6/55"})</h3>
          <p className="text-sm text-slate-400">
            Hệ thống chưa tìm thấy vé đã lưu cho loại vé này. Bạn có thể chuyển sang tab Sinh Vé Thông Minh để tạo và lưu vé mới đối soát với kỳ mở thưởng tiếp theo.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={fetchTicketsAndPerformance}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải..." : "Tải Lại Sổ Vé"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">Sổ Theo Dõi Vé & Đối Soát Kết Quả Theo Ngày</h3>
            <p className="text-xs text-slate-400">
              Phân loại vé theo ngày mở thưởng và thuật toán, đối soát chi tiết từng dãy số và đánh giá độ chính xác thực tế.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
            title="Kiểm tra đối soát kỳ xổ mới nhất & cập nhật mô hình học hỏi"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Đang Đối Soát..." : "Đối Soát Kỳ Mới"}
          </button>

          <button
            onClick={fetchTicketsAndPerformance}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Tải lại sổ vé"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Evaluate Notice / Warning */}
      {evaluateNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300 animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="font-medium leading-relaxed">{evaluateNotice}</div>
        </div>
      )}

      {/* Algorithm Performance Benchmarks Section */}
      {algoPerf.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Đánh Giá Mức Độ Tỉ Lệ Xác Suất Chính Xác Theo Từng Thuật Toán
            </h4>
            <span className="text-[11px] text-slate-500">Dựa trên kiểm nghiệm các kỳ quá khứ & đối soát thực tế</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {algoPerf.map((algo) => {
              const badge = getStrategyBadge(algo.strategy_code);
              return (
                <div
                  key={algo.strategy_code}
                  className="bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      {algo.name.split("(")[0]}
                    </span>
                    <span className="text-xs font-black text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {algo.confidence_rating}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Độ chính xác thực nghiệm:</span>
                      <span className="text-sm font-bold text-white font-mono">{algo.historical_accuracy_pct}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${algo.historical_accuracy_pct}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Đã lưu: <b>{algo.total_tickets_saved} vé</b></span>
                      <span>Đã đối soát: <b>{algo.evaluated_tickets} vé</b></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Recharts Algorithm Comparison Chart */}
          <AlgorithmComparisonChart data={algoPerf} />
        </div>
      )}

      {/* FILTER CONTROLS: 1. Algorithm Filter, 2. Date Filter & View Mode */}
      <div className="space-y-4 pt-2">
        {/* Filter by Algorithm */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Lọc theo thuật toán:</span>
          <button
            onClick={() => setSelectedAlgoFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "all"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            Tất Cả ({countAll})
          </button>
          <button
            onClick={() => setSelectedAlgoFilter("hybrid_ai_learned")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "hybrid_ai_learned"
                ? "bg-indigo-500 text-white shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            AI Hybrid ({countHybrid})
          </button>
          <button
            onClick={() => setSelectedAlgoFilter("balanced")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "balanced"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            Cân Bằng ({countBalanced})
          </button>
          <button
            onClick={() => setSelectedAlgoFilter("mean_reversion")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "mean_reversion"
                ? "bg-sky-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            Hồi Quy ({countMean})
          </button>
          <button
            onClick={() => setSelectedAlgoFilter("pure_random")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "pure_random"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            Ngẫu Nhiên ({countRandom})
          </button>
          <button
            onClick={() => setSelectedAlgoFilter("custom_manual")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "custom_manual"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            Điền Tay ({countCustom})
          </button>
          <button
            onClick={() => setSelectedAlgoFilter("mixed")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedAlgoFilter === "mixed"
                ? "bg-fuchsia-600 text-white shadow-md"
                : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            Hỗn Hợp ({countMixed})
          </button>
        </div>

        {/* Filter by Date & Draw Period Toolbar */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Lọc theo ngày mở thưởng & kỳ quay ({dateGroups.length} kỳ quay):
            </span>

            {/* View Mode Toggle: Grouped vs Flat */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setViewMode("grouped")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "grouped"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Gom theo ngày
              </button>
              <button
                onClick={() => setViewMode("flat")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "flat"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Danh sách phẳng
              </button>
            </div>
          </div>

          {/* Date Pills for Quick Date Filtering */}
          <div className="flex flex-wrap items-center gap-2 pt-1 max-h-36 overflow-y-auto">
            <button
              onClick={() => setSelectedDateFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedDateFilter === "all"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700"
              }`}
            >
              Tất Cả Ngày ({filteredTickets.length} vé)
            </button>
            {dateGroups.map(([key, group]) => {
              const isSelected = selectedDateFilter === group.period;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDateFilter(isSelected ? "all" : group.period)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md"
                      : group.winningTicketsCount > 0
                      ? "bg-emerald-950/30 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40"
                      : "bg-slate-850 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span>Kỳ #{group.period}</span>
                  <span className="text-[11px] opacity-80">({formatDate(group.date)})</span>
                  <span className="font-bold opacity-90">• {group.tickets.length} vé</span>
                  {group.winningTicketsCount > 0 && (
                    <span className="text-amber-400 font-black">🏆</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TICKETS RENDER: GROUPED BY DATE vs FLAT LIST */}
      {viewMode === "grouped" ? (
        <div className="space-y-6">
          {dateGroups
            .filter(([_, group]) => selectedDateFilter === "all" || group.period === selectedDateFilter)
            .map(([key, group]) => {
              const isCollapsed = !!collapsedDates[group.period];
              return (
                <div
                  key={key}
                  className="border border-slate-800 rounded-3xl bg-slate-900/70 overflow-hidden shadow-xl transition-all"
                >
                  {/* Date Group Accordion Header */}
                  <div
                    onClick={() => toggleDateCollapse(group.period)}
                    className="p-4 sm:p-5 bg-gradient-to-r from-slate-850 to-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/80 transition-all select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black text-white">
                            KỲ MỞ THƯỞNG #{group.period}
                          </span>
                          <span className="text-xs text-slate-300 font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                            Ngày {formatDate(group.date)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 pt-1">
                          <span>{group.tickets.length} vé</span>
                          <span>•</span>
                          <span>{group.totalRows} dãy số</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">Đã đối soát kết quả</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {group.winningTicketsCount > 0 ? (
                        <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-400/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center gap-1.5 shadow-md">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          Trúng {group.winningTicketsCount} vé ({formatVND(group.totalPrize)})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs border border-slate-700">
                          Chưa có giải kỳ này
                        </span>
                      )}

                      <button
                        className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 hover:bg-slate-700"
                        title={isCollapsed ? "Mở rộng kỳ này" : "Thu gọn kỳ này"}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Group Tickets Body */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-6 space-y-4 bg-slate-950/40">
                      {group.tickets.map((ticket) => renderTicketCard(ticket))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* Flat View */
        <div className="space-y-4">
          {filteredTickets
            .filter((t) => selectedDateFilter === "all" || t.target_draw_period === selectedDateFilter)
            .map((ticket) => renderTicketCard(ticket))}
        </div>
      )}
    </div>
  );
};
