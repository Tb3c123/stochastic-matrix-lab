"use client";

import React, { useState, useEffect } from "react";
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
  BarChart3
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
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [evaluateNotice, setEvaluateNotice] = useState<string | null>(null);

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

  if (tickets.length === 0 && !loading) {
    return null;
  }

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const getStrategyBadge = (stratCode: string) => {
    switch (stratCode) {
      case "balanced":
        return {
          label: "Cân Bằng (Balanced)",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-400"
        };
      case "mean_reversion":
        return {
          label: "Hồi Quy (Mean Reversion)",
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
          dot: "bg-sky-400"
        };
      case "pure_random":
        return {
          label: "Ngẫu Nhiên (Pure Random)",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          dot: "bg-amber-400"
        };
      case "custom_manual":
        return {
          label: "Tự Chọn (Custom)",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          dot: "bg-purple-400"
        };
      default:
        return {
          label: stratCode || "Thuật Toán Chu Kỳ",
          bg: "bg-slate-700/30 text-slate-300 border-slate-700",
          dot: "bg-slate-400"
        };
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (selectedAlgoFilter === "all") return true;
    return t.strategy === selectedAlgoFilter;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">Sổ Theo Dõi Vé & Đánh Giá Độ Chính Xác Thuật Toán</h3>
            <p className="text-xs text-slate-400">
              Phân loại vé theo thuật toán sinh số, đánh giá mức độ tỉ lệ xác suất chính xác thực nghiệm và đối soát kỳ xổ tiếp theo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
            title="Kiểm tra đối soát kỳ xổ mới nhất & cập nhật mô hình học hỏi"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Đang Đối Soát..." : "Đối Soát Kỳ Mới"}
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
            <span className="text-[11px] text-slate-500">Dựa trên kiểm nghiệm 100 kỳ quá khứ & đối soát thực tế</span>
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

      {/* Filter by Algorithm */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-xs text-slate-400 font-semibold mr-1">Lọc theo thuật toán:</span>
        <button
          onClick={() => setSelectedAlgoFilter("all")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedAlgoFilter === "all"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
          }`}
        >
          Tất Cả ({tickets.length})
        </button>
        <button
          onClick={() => setSelectedAlgoFilter("balanced")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedAlgoFilter === "balanced"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
          }`}
        >
          Cân Bằng
        </button>
        <button
          onClick={() => setSelectedAlgoFilter("mean_reversion")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedAlgoFilter === "mean_reversion"
              ? "bg-sky-500 text-slate-950 shadow-md"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
          }`}
        >
          Hồi Quy
        </button>
        <button
          onClick={() => setSelectedAlgoFilter("pure_random")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedAlgoFilter === "pure_random"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
          }`}
        >
          Ngẫu Nhiên
        </button>
        <button
          onClick={() => setSelectedAlgoFilter("custom_manual")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedAlgoFilter === "custom_manual"
              ? "bg-purple-500 text-slate-950 shadow-md"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
          }`}
        >
          Tự Chọn
        </button>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => {
          const isPending = ticket.status === "pending";
          const isExpanded = expandedId === ticket.id;
          const analysis = ticket.predicted_analysis || {};
          const stratInfo = analysis.strategy_info || {};
          const matchResult = ticket.matched_results;
          const stratBadge = getStrategyBadge(ticket.strategy);

          return (
            <div
              key={ticket.id}
              className={`border rounded-2xl p-5 transition-all ${
                isPending
                  ? "bg-slate-800/30 border-slate-800 hover:border-slate-700"
                  : matchResult?.total_prize_vnd > 0
                  ? "bg-emerald-950/20 border-emerald-800/40"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Header Info & Strategy Tag */}
                <div className="flex flex-wrap items-center gap-3">
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

                  {/* Algorithm Tag */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${stratBadge.bg}`}>
                    <Dna className="w-3.5 h-3.5" /> Thuật toán: {stratBadge.label}
                  </span>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Vé {ticket.rows_count} dãy</span>
                    <span>•</span>
                    <span>Ngày quay: <b className="text-slate-300">{ticket.target_draw_date}</b></span>
                  </div>
                </div>

                {/* Accuracy & Probability Badges */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {/* Algorithm Accuracy Rating */}
                  <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Độ chính xác thuật toán:</span>
                    <b className="text-amber-400">{stratInfo.historical_accuracy_pct || 80.0}% ({stratInfo.confidence_rating || "A"})</b>
                  </div>

                  {/* Combined Win Probability */}
                  <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-300">
                    Xác suất trúng ít nhất 1 giải: <b className="text-white">{analysis.any_prize_probability_pct}%</b>
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
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2.5">
                {ticket.rows.map((row: number[], rIdx: number) => {
                  const evalRow = matchResult?.rows_evaluation?.[rIdx];
                  const matchedNums: number[] = evalRow?.matched_numbers || [];
                  const rowForecast = analysis?.row_forecasts?.[rIdx] || {};

                  return (
                    <div
                      key={rIdx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-850/50 p-3 rounded-xl border border-slate-800/60"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + rIdx)}
                        </span>

                        {/* Specific Algorithm used for this row */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              (rowForecast.algorithm_code || ticket.strategy) === "hybrid_exploitation_bayes"
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                : (rowForecast.algorithm_code || ticket.strategy) === "hybrid_mean_reversion"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                : (rowForecast.algorithm_code || ticket.strategy) === "hybrid_exploration_bandit"
                                ? "bg-violet-500/10 text-violet-400 border-violet-500/30"
                                : (rowForecast.algorithm_code || ticket.strategy) === "balanced"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : (rowForecast.algorithm_code || ticket.strategy) === "mean_reversion"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                : (rowForecast.algorithm_code || ticket.strategy) === "pure_random"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            }`}
                            title={`Thuật toán: ${rowForecast.algorithm_name || ticket.strategy}`}
                          >
                            {rowForecast.algorithm_name || (
                              ticket.strategy === "balanced"
                                ? "Cân Bằng"
                                : ticket.strategy === "mean_reversion"
                                ? "Hồi Quy (Số Trễ)"
                                : ticket.strategy === "pure_random"
                                ? "Ngẫu Nhiên"
                                : ticket.strategy === "hybrid_ai_learned"
                                ? (rIdx < 2 ? "AI Khai Thác" : rIdx === 2 ? "AI Hồi Quy" : "AI Thăm Dò")
                                : "Tự Chọn"
                            )}
                          </span>
                        </div>

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

                          {/* Special Number for Power 6/55 if present */}
                          {rowForecast.special_number && (
                            <>
                              <span className="text-amber-500 font-bold text-xs">+</span>
                              <span
                                className="w-8 h-8 rounded-full text-xs font-black flex items-center justify-center ball-gold text-slate-950 ring-2 ring-amber-400 shadow-md"
                                title="Số đặc biệt Jackpot 2"
                              >
                                {rowForecast.special_number < 10 ? `0${rowForecast.special_number}` : rowForecast.special_number}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Forecast Jackpot Probability saved for this row */}
                        {rowForecast.jackpot_probability_display && (
                          <div className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span>Dự Báo Độc Đắc: <b>{rowForecast.jackpot_probability_display}</b></span>
                          </div>
                        )}
                      </div>

                      {evalRow ? (
                        <div className="text-xs flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          <span className="text-slate-400">Trùng <b className="text-amber-400">{evalRow.match_count}/6</b></span>
                          <span className={`font-bold ${evalRow.prize_amount > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                            {evalRow.prize_name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">({evalRow.actual_accuracy_pct}% mục tiêu)</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Chờ mở thưởng để học hỏi đối soát thực tế
                        </span>
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
        })}
      </div>
    </div>
  );
};
