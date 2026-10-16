"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Dna,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  ArrowRight
} from "lucide-react";

interface WinningHistoryTrackerProps {
  gameCode: string;
  onNavigateToGenerator?: () => void;
  onNavigateToTickets?: () => void;
}

export const WinningHistoryTracker: React.FC<WinningHistoryTrackerProps> = ({
  gameCode,
  onNavigateToGenerator,
  onNavigateToTickets
}) => {
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");
  const [selectedAlgoFilter, setSelectedAlgoFilter] = useState<string>("all");
  const fetchWinningHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/v1/tickets/winning-history`;
      const params = new URLSearchParams();
      if (selectedGameFilter !== "all") {
        params.append("game_code", selectedGameFilter);
      }
      if (selectedTierFilter !== "all") {
        params.append("prize_tier", selectedTierFilter);
      }
      if (selectedAlgoFilter !== "all") {
        params.append("strategy", selectedAlgoFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setHistoryData(json.data);
      }
    } catch (e) {
      console.error("Fetch winning history failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchWinningHistory();
  }, [selectedGameFilter, selectedTierFilter, selectedAlgoFilter]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const summary = historyData?.summary || {
    total_evaluated_tickets: 0,
    total_winning_tickets: 0,
    total_prize_vnd: 0,
    win_rate_pct: 0,
    highest_prize_name: "Chưa có",
    highest_prize_amount: 0,
    tier_counts: { jackpot_1: 0, jackpot_2: 0, first: 0, second: 0, third: 0 }
  };

  const winningTickets: any[] = historyData?.winning_tickets || [];

  const getTierBadge = (prizeName: string) => {
    const p = prizeName.toLowerCase();
    if (p.includes("jackpot 1")) {
      return {
        label: "JACKPOT 1",
        cls: "bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-500/20"
      };
    }
    if (p.includes("jackpot 2")) {
      return {
        label: "JACKPOT 2",
        cls: "bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 border-orange-300 font-black shadow-md"
      };
    }
    if (p.includes("nhất")) {
      return {
        label: "GIẢI NHẤT",
        cls: "bg-red-500/15 text-red-400 border-red-500/30 font-bold"
      };
    }
    if (p.includes("nhì")) {
      return {
        label: "GIẢI NHÌ",
        cls: "bg-sky-500/15 text-sky-400 border-sky-500/30 font-bold"
      };
    }
    if (p.includes("ba")) {
      return {
        label: "GIẢI BA",
        cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold"
      };
    }
    return {
      label: prizeName,
      cls: "bg-slate-800 text-slate-300 border-slate-700 font-semibold"
    };
  };

  const getStrategyBadge = (stratCode: string) => {
    switch (stratCode) {
      case "mixed":
        return {
          label: "🔀 Hỗn Hợp",
          cls: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30"
        };
      case "balanced":
        return {
          label: "⚡ Cân Bằng",
          cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        };
      case "mean_reversion":
        return {
          label: "📈 Hồi Quy",
          cls: "bg-sky-500/15 text-sky-400 border-sky-500/30"
        };
      case "pure_random":
        return {
          label: "🎲 Ngẫu Nhiên",
          cls: "bg-amber-500/15 text-amber-400 border-amber-500/30"
        };
      case "custom_manual":
      case "custom":
        return {
          label: "✍️ Điền Tay",
          cls: "bg-purple-500/15 text-purple-400 border-purple-500/30"
        };
      case "hybrid_ai_learned":
        return {
          label: "🤖 AI Hybrid",
          cls: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
        };
      default:
        return {
          label: stratCode || "Thuật Toán",
          cls: "bg-slate-800 text-slate-300 border-slate-700"
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header & Summary KPIs */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
              <Trophy className="w-3.5 h-3.5" /> Bảng Vàng Đối Soát Trúng Vé
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              Lịch Sử Vé Trúng Thưởng
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Lưu trữ vinh danh tất cả các vé và dãy số đã trúng thưởng qua các kỳ mở thưởng chính thức của Vietlott
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={fetchWinningHistory}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm Mới
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Total Won Amount */}
          <div className="bg-slate-850/80 border border-amber-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Tổng Tiền Đã Trúng</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl md:text-2xl font-black text-amber-400 font-mono tracking-tight">
              {formatVND(summary.total_prize_vnd)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Từ {summary.total_winning_tickets} vé trúng hợp lệ
            </p>
          </div>

          {/* Card 2: Win Count */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Số Lần / Vé Trúng</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl md:text-2xl font-bold text-emerald-400 font-mono">
              {summary.total_winning_tickets} <span className="text-xs text-slate-400 font-normal">vé</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Đã đối soát {summary.total_evaluated_tickets} vé
            </p>
          </div>

          {/* Card 3: Win Rate */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Tỷ Lệ Vé Trúng</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl md:text-2xl font-bold text-sky-400 font-mono">
              {summary.win_rate_pct}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Hiệu suất đối soát thực tế
            </p>
          </div>

          {/* Card 4: Highest Prize */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Giải Lớn Nhất</span>
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-sm md:text-base font-bold text-white truncate" title={summary.highest_prize_name}>
              {summary.highest_prize_name}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Đạt kỷ lục cao nhất
            </p>
          </div>
        </div>

        {/* Prize Tier Counter Pill Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Phân bố giải thưởng:</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Jackpot: <b className="text-amber-400">{(summary.tier_counts?.jackpot_1 || 0) + (summary.tier_counts?.jackpot_2 || 0)}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Giải Nhất: <b className="text-red-400">{summary.tier_counts?.first || 0}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Giải Nhì: <b className="text-sky-400">{summary.tier_counts?.second || 0}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Giải Ba: <b className="text-emerald-400">{summary.tier_counts?.third || 0}</b>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Game Filter */}
        <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => setSelectedGameFilter("all")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              selectedGameFilter === "all" ? "bg-amber-500 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Tất Cả Game
          </button>
          <button
            onClick={() => setSelectedGameFilter("mega_6_45")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              selectedGameFilter === "mega_6_45" ? "bg-red-500 text-white font-bold shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Mega 6/45
          </button>
          <button
            onClick={() => setSelectedGameFilter("power_6_55")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              selectedGameFilter === "power_6_55" ? "bg-amber-500 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Power 6/55
          </button>
        </div>

        {/* Tier Filter */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Hạng giải:</span>
          {[
            { id: "all", label: "Tất Cả" },
            { id: "jackpot", label: "Jackpot" },
            { id: "first", label: "Giải Nhất" },
            { id: "second", label: "Giải Nhì" },
            { id: "third", label: "Giải Ba" }
          ].map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTierFilter(tier.id)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedTierFilter === tier.id
                  ? "bg-slate-700 text-white border border-slate-600 shadow-sm"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Winning Tickets Feed */}
      {winningTickets.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">Chưa Có Vé Nào Trúng Thưởng Trong Bộ Lọc Này</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hãy lưu vé từ mục <b>Sinh Vé</b> hoặc <b>AI Tự Học</b>, sau đó đối soát khi có kết quả quay thưởng mới nhất để ghi nhận chiến thắng tại đây!
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Soạn Vé Ngay
              </button>
            )}
            {onNavigateToTickets && (
              <button
                onClick={onNavigateToTickets}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Xem Toàn Bộ Sổ Vé <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {winningTickets.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            const stratBadge = getStrategyBadge(ticket.strategy);
            const winningRows = ticket.winning_rows || [];
            const actualWinningNumbers = ticket.actual_winning_numbers || [];
            const actualSpecialNumber = ticket.actual_special_number;

            return (
              <div
                key={ticket.id}
                className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-5 md:p-6 transition-all shadow-lg shadow-amber-500/5 relative overflow-hidden"
              >
                {/* Subtle gold gradient accent on left */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-emerald-400 to-amber-600"></div>

                {/* Top Header of the Winning Ticket */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Game Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        ticket.game_code === "power_6_55"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {ticket.game_code === "power_6_55" ? "Power 6/55" : "Mega 6/45"}
                    </span>

                    {/* Draw period */}
                    <span className="text-xs font-bold text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Kỳ #{ticket.target_draw_period}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-slate-400">
                      Ngày quay: <b className="text-slate-300">{ticket.target_draw_date}</b>
                    </span>

                    {/* Strategy Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stratBadge.cls}`}>
                      {stratBadge.label}
                    </span>
                  </div>

                  {/* Total Ticket Prize Won */}
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-emerald-300 font-bold">
                        Trúng {formatVND(ticket.total_prize_vnd)}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                      title="Xem chi tiết các dãy và đối chiếu kết quả"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Official Winning Numbers for reference */}
                <div className="mt-4 p-3 bg-slate-850/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-400" /> Kết quả chính thức kỳ #{ticket.target_draw_period}:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {actualWinningNumbers.map((num: number) => (
                        <span
                          key={num}
                          className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-white font-bold text-[11px] flex items-center justify-center font-mono"
                        >
                          {num < 10 ? `0${num}` : num}
                        </span>
                      ))}
                      {actualSpecialNumber && (
                        <span
                          className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center font-mono"
                          title="Số đặc biệt Power 6/55"
                        >
                          {actualSpecialNumber < 10 ? `0${actualSpecialNumber}` : actualSpecialNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Trùng khớp cao nhất: <b className="text-emerald-400">{ticket.best_match_count}/6 số</b>
                  </span>
                </div>

                {/* Winning Rows List */}
                <div className="mt-4 space-y-3">
                  {winningRows.map((row: any, rIdx: number) => {
                    const rowNums: number[] = row.numbers || [];
                    const matchedNums: number[] = row.matched_numbers || [];
                    const tierBadge = getTierBadge(row.prize_name || "Giải Thưởng");

                    return (
                      <div
                        key={rIdx}
                        className="bg-slate-850/50 border border-amber-500/20 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Row Label */}
                          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {row.row_label || `Dãy ${String.fromCharCode(65 + (row.row_index || rIdx))}`}
                          </span>

                          {/* Prize Tag */}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs border shrink-0 ${tierBadge.cls}`}>
                            {tierBadge.label} • {formatVND(row.prize_amount)}
                          </span>

                          {/* 6 Ball Numbers */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {rowNums.map((num: number) => {
                              const isMatch = matchedNums.includes(num);
                              return (
                                <span
                                  key={num}
                                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                                    isMatch
                                      ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300 font-black shadow-md shadow-amber-500/30 scale-105"
                                      : "bg-slate-800 text-slate-400 border border-slate-700"
                                  }`}
                                >
                                  {num < 10 ? `0${num}` : num}
                                </span>
                              );
                            })}
                            {ticket.game_code === "power_6_55" && row.special_number && (
                              <span
                                className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-black flex items-center justify-center transition-all ${
                                  row.matched_special
                                    ? "bg-gradient-to-br from-amber-400 to-yellow-300 text-slate-950 ring-2 ring-yellow-200 shadow-md shadow-amber-500/50 scale-105"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                }`}
                                title={`Số đặc biệt Power 6/55: ${row.special_number < 10 ? `0${row.special_number}` : row.special_number}${row.matched_special ? " (Trúng ĐB!)" : ""}`}
                              >
                                {row.special_number < 10 ? `0${row.special_number}` : row.special_number}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Match count note */}
                        <div className="text-xs text-right font-medium text-slate-400 flex items-center gap-1.5 md:self-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            Trùng <b className="text-white">{row.match_count}/6 số</b>
                            {row.matched_special && <b className="text-amber-400"> + Số ĐB ★</b>}
                            {" "}({matchedNums.map((n: number) => (n < 10 ? `0${n}` : n)).join(", ")})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expanded Details: Learning feedback */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
                    {ticket.learning_feedback && (
                      <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-indigo-300 flex items-start gap-2">
                        <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <b className="text-white block mb-0.5">Phản hồi học hỏi thuật toán:</b>
                          {ticket.learning_feedback}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
