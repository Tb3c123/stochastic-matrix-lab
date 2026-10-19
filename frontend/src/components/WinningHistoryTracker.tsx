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
  const [showWinBreakdown, setShowWinBreakdown] = useState<boolean>(false);

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
  const totalWinningRowsCount = winningTickets.reduce(
    (acc, t) => acc + (t.winning_rows_count || (t.winning_rows ? t.winning_rows.length : 0)),
    0
  );
  const megaWinCount = winningTickets.filter((t) => t.game_code === "mega_6_45").length;
  const powerWinCount = winningTickets.filter((t) => t.game_code === "power_6_55").length;

  const handleSelectWinningTicket = (ticketId: number) => {
    setExpandedId(ticketId);
    const el = document.getElementById(`winning-ticket-${ticketId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
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
              Từ {summary.total_winning_tickets} vé ({totalWinningRowsCount} dãy trúng)
            </p>
          </div>

          {/* Card 2: Interactive Win Count & Ticket Inspector */}
          <button
            type="button"
            onClick={() => setShowWinBreakdown((prev) => !prev)}
            className={`text-left rounded-2xl p-4 md:p-5 transition-all cursor-pointer relative overflow-hidden border ${
              showWinBreakdown
                ? "bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                : "bg-slate-850/80 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800/80 shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                Số Lần / Vé Trúng
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Nhấn xem
                </span>
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                {showWinBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
                {summary.total_winning_tickets} <span className="text-xs font-semibold text-emerald-300">vé</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {totalWinningRowsCount} <span className="text-xs font-normal text-slate-300">dãy trúng</span>
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80">
              <span>
                Mega: <b className="text-red-400">{megaWinCount}</b> • Power: <b className="text-amber-400">{powerWinCount}</b>
              </span>
              <span className="text-emerald-400 font-semibold underline underline-offset-2">
                {showWinBreakdown ? "Đóng danh sách ▲" : "Xem vé nào trúng ▼"}
              </span>
            </div>
          </button>

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
              Trên tổng {summary.total_evaluated_tickets} vé đã đối soát
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

        {/* Interactive Drawer when user clicks "Số Lần / Vé Trúng" */}
        {showWinBreakdown && winningTickets.length > 0 && (
          <div className="mt-5 p-4 md:p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-emerald-300">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Danh Sách Tóm Tắt {winningTickets.length} Vé Trúng (Nhấn vào vé bất kỳ để nhảy tới & mở đủ 5 dãy):</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Tổng cộng <b className="text-amber-300">{totalWinningRowsCount} lần/dãy trúng giải</b>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {winningTickets.map((tItem, idx) => {
                const sBadge = getStrategyBadge(tItem.strategy);
                const wRows = tItem.winning_rows || [];
                const isSelected = expandedId === tItem.id;
                return (
                  <button
                    key={tItem.id || idx}
                    type="button"
                    onClick={() => handleSelectWinningTicket(tItem.id)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "bg-emerald-900/30 border-emerald-400 ring-1 ring-emerald-400"
                        : "bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            tItem.game_code === "power_6_55"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {tItem.game_code === "power_6_55" ? "6/55" : "6/45"}
                        </span>
                        <span className="text-xs font-bold text-white">
                          Vé #{tItem.id} • Kỳ #{tItem.target_draw_period}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        +{formatVND(tItem.total_prize_vnd)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
                      <span>Ngày: <b className="text-slate-200">{tItem.target_draw_date}</b></span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sBadge.cls}`}>
                        {sBadge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                      {wRows.map((wr: any, wIdx: number) => (
                        <span
                          key={wIdx}
                          className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300"
                        >
                          {wr.row_label || `Dãy ${String.fromCharCode(65 + (wr.row_index || wIdx))}`}: {wr.prize_name} ({wr.match_count}/6 số{wr.matched_special ? " + ĐB" : ""})
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clickable Prize Tier Counter Pill Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Phân bố giải thưởng (Nhấn để lọc):</span>
          <button
            type="button"
            onClick={() => setSelectedTierFilter(selectedTierFilter === "jackpot" ? "all" : "jackpot")}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              selectedTierFilter === "jackpot"
                ? "bg-amber-500/25 border-amber-400 text-white ring-1 ring-amber-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/50"
            }`}
          >
            Jackpot: <b className="text-amber-400">{(summary.tier_counts?.jackpot_1 || 0) + (summary.tier_counts?.jackpot_2 || 0)}</b>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTierFilter(selectedTierFilter === "first" ? "all" : "first")}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              selectedTierFilter === "first"
                ? "bg-red-500/25 border-red-400 text-white ring-1 ring-red-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:border-red-500/50"
            }`}
          >
            Giải Nhất: <b className="text-red-400">{summary.tier_counts?.first || 0}</b>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTierFilter(selectedTierFilter === "second" ? "all" : "second")}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              selectedTierFilter === "second"
                ? "bg-sky-500/25 border-sky-400 text-white ring-1 ring-sky-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500/50"
            }`}
          >
            Giải Nhì: <b className="text-sky-400">{summary.tier_counts?.second || 0}</b>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTierFilter(selectedTierFilter === "third" ? "all" : "third")}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              selectedTierFilter === "third"
                ? "bg-emerald-500/25 border-emerald-400 text-white ring-1 ring-emerald-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500/50"
            }`}
          >
            Giải Ba: <b className="text-emerald-400">{summary.tier_counts?.third || 0}</b>
          </button>
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
            const allRowsEval = ticket.all_rows_evaluation || [];
            const actualWinningNumbers = ticket.actual_winning_numbers || [];
            const actualSpecialNumber = ticket.actual_special_number;

            return (
              <div
                id={`winning-ticket-${ticket.id}`}
                key={ticket.id}
                className={`bg-slate-900 border rounded-2xl p-5 md:p-6 transition-all shadow-lg relative overflow-hidden ${
                  isExpanded
                    ? "border-emerald-400 ring-2 ring-emerald-500/20 shadow-emerald-500/10"
                    : "border-amber-500/30 hover:border-amber-500/50 shadow-amber-500/5"
                }`}
              >
                {/* Subtle gold gradient accent on left */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-emerald-400 to-amber-600"></div>

                {/* Top Header of the Winning Ticket */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Ticket ID Badge */}
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-300">
                      Vé #{ticket.id}
                    </span>

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

                  {/* Total Ticket Prize Won & Full 5-Row Toggle Button */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-emerald-300 font-bold">
                        Trúng {formatVND(ticket.total_prize_vnd)} ({winningRows.length}/{ticket.rows_count || 5} dãy)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isExpanded
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700"
                      }`}
                      title="Xem chi tiết toàn bộ 5 dãy của vé này"
                    >
                      <span>{isExpanded ? "Thu gọn vé" : "Xem đủ 5 dãy của vé"}</span>
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
                        <div className="flex items-center gap-1 pl-1">
                          <span className="text-amber-500 font-extrabold text-xs">+</span>
                          <span
                            className="w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-[11px] flex items-center justify-center font-mono shadow-sm"
                            title="Số đặc biệt Power 6/55"
                          >
                            {actualSpecialNumber < 10 ? `0${actualSpecialNumber}` : actualSpecialNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Trùng khớp cao nhất: <b className="text-emerald-400">{ticket.best_match_count}/6 số</b>
                  </span>
                </div>

                {/* Winning Rows List (or All 5 Rows when expanded) */}
                <div className="mt-4 space-y-2.5">
                  {(isExpanded && allRowsEval.length > 0 ? allRowsEval : winningRows).map((row: any, rIdx: number) => {
                    const rowNums: number[] = row.numbers || [];
                    const matchedNums: number[] = row.matched_numbers || [];
                    const isWinningRow = (row.prize_amount || 0) > 0;
                    const tierBadge = getTierBadge(row.prize_name || "Không trúng");

                    return (
                      <div
                        key={rIdx}
                        className={`rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border transition-all ${
                          isWinningRow
                            ? "bg-slate-850/70 border-amber-500/35 shadow-sm"
                            : "bg-slate-900/50 border-slate-800/80 opacity-75"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Row Label */}
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                              isWinningRow
                                ? "bg-gradient-to-br from-amber-500 to-red-600 text-white"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {row.row_label || `Dãy ${String.fromCharCode(65 + (row.row_index ?? rIdx))}`}
                          </span>

                          {/* Prize Tag */}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs border shrink-0 ${tierBadge.cls}`}>
                            {isWinningRow ? `${tierBadge.label} • ${formatVND(row.prize_amount)}` : "Không trúng giải"}
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
                              <div className="flex items-center gap-1 pl-1">
                                <span className="text-amber-500 font-extrabold text-xs">+</span>
                                <span
                                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-black flex items-center justify-center transition-all ${
                                    row.matched_special
                                      ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 ring-2 ring-yellow-200 shadow-md shadow-amber-500/50 scale-105 border-2 border-white animate-pulse"
                                      : "bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-sm"
                                  }`}
                                  title={`Số đặc biệt Power 6/55: ${row.special_number < 10 ? `0${row.special_number}` : row.special_number}${row.matched_special ? " (Trúng ĐB!)" : ""}`}
                                >
                                  {row.special_number < 10 ? `0${row.special_number}` : row.special_number}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Match count note */}
                        <div className="text-xs text-right font-medium text-slate-400 flex items-center gap-1.5 md:self-center">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isWinningRow ? "text-emerald-400" : "text-slate-600"}`} />
                          <span>
                            Trùng <b className="text-white">{row.match_count}/6 số</b>
                            {row.matched_special && <b className="text-amber-400"> + Số ĐB ★</b>}
                            {matchedNums.length > 0 && ` (${matchedNums.map((n: number) => (n < 10 ? `0${n}` : n)).join(", ")})`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expanded Details: Learning feedback */}
                {isExpanded && ticket.learning_feedback && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
                    <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-indigo-300 flex items-start gap-2">
                      <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <b className="text-white block mb-0.5">Phản hồi học hỏi thuật toán:</b>
                        {ticket.learning_feedback}
                      </div>
                    </div>
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
