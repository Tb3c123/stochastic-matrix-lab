"use client";

import React, { useState } from "react";
import { Trophy, Clock, ListChecks, Zap, CheckCircle2 } from "lucide-react";
import { useUnifiedTickets } from "./winning-history/useUnifiedTickets";
import { WinningKpiGrid } from "./winning-history/WinningKpiGrid";
import { WinningTicketCard } from "./winning-history/WinningTicketCard";
import { SavedTicketCard } from "./saved-tickets/SavedTicketCard";
import { DateGroupAccordion } from "./saved-tickets/DateGroupAccordion";

export const UnifiedTicketsHub: React.FC<{
  gameCode: string;
  latestDraw?: any;
  refreshTrigger: number;
}> = ({ gameCode, latestDraw, refreshTrigger }) => {
  const [viewMode, setViewMode] = useState<"winning" | "live" | "pending" | "all">("winning");
  const [tierFilter, setTierFilter] = useState<string>("jackpot_6");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [openRowAudits, setOpenRowAudits] = useState<Record<string, boolean>>({});

  const effectiveTier = viewMode === "live" ? "live_real_time" : tierFilter;
  const {
    loading,
    summary,
    winningTickets,
    totalWinningRowsCount,
    pendingTickets,
    evaluatedGroups,
  } = useUnifiedTickets(gameCode, effectiveTier, refreshTrigger);

  const toggleRowAudit = (ticketId: number, rowIdx: number) => {
    const key = `${ticketId}-${rowIdx}`;
    setOpenRowAudits((p) => ({ ...p, [key]: !p[key] }));
  };

  if (loading && winningTickets.length === 0 && pendingTickets.length === 0) {
    return <div className="h-64 rounded-3xl bg-slate-900/80 border border-slate-800 animate-pulse" />;
  }

  const modeTabs = [
    { id: "winning" as const, icon: Trophy, label: `Kỳ Độc Đắc 6/6`, activeCls: "bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black shadow-md" },
    { id: "live" as const, icon: Zap, label: `Thắng Thời Gian Thật`, activeCls: "bg-violet-500 text-white font-black shadow-md" },
    { id: "pending" as const, icon: Clock, label: `Chờ Quay (${pendingTickets.length})`, activeCls: "bg-emerald-500 text-slate-950 font-black shadow-md" },
    { id: "all" as const, icon: ListChecks, label: `Đủ ${evaluatedGroups.length} Kỳ (90 Ngày)`, activeCls: "bg-sky-500 text-slate-950 font-black shadow-md" },
  ];

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/25 border border-slate-800 rounded-3xl p-6 md:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Sổ Vé & Lịch Sử Trúng ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"})
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Đã đồng bộ kết quả chính thức mới nhất:{" "}
                <b className="text-emerald-300">
                  Kỳ #{latestDraw?.draw_period || "..."} ({latestDraw?.draw_date || "..."})
                </b>{" "}
                • Vé chốt thực chiến được bảo toàn vĩnh viễn.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 gap-1.5 text-xs font-bold">
            {modeTabs.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setViewMode(m.id);
                    if (m.id === "winning" && tierFilter === "live_real_time") setTierFilter("jackpot_6");
                  }}
                  className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === m.id ? m.activeCls : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <WinningKpiGrid
          summary={summary}
          totalWinningRowsCount={totalWinningRowsCount}
          selectedTierFilter={effectiveTier}
          onSelectTierFilter={(t) => {
            setTierFilter(t);
            setViewMode("winning");
          }}
        />
      </div>

      {(viewMode === "winning" || viewMode === "live") && (
        <div className="space-y-4">
          {winningTickets.length === 0 ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-sm text-slate-400">
              {viewMode === "live"
                ? "Chưa có vé khóa chốt trước 17:45 nào nổ giải ở giờ quay thật (hệ thống sẽ tự lưu vĩnh viễn ngay từ kỳ mở thưởng tiếp theo)."
                : "Đang công phá các kỳ Độc Đắc 6/6 sát hiện tại..."}
            </div>
          ) : (
            winningTickets.map((t) => (
              <WinningTicketCard key={t.id} ticket={t} isExpanded={expandedId === t.id} onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)} />
            ))
          )}
        </div>
      )}

      {viewMode === "pending" && (
        <div className="space-y-4">
          {pendingTickets.map((t) => (
            <SavedTicketCard key={t.id} ticket={t} isExpanded={expandedId === t.id} onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)} openRowAudits={openRowAudits} onToggleRowAudit={toggleRowAudit} />
          ))}
        </div>
      )}

      {viewMode === "all" && (
        <div className="space-y-5">
          {evaluatedGroups.map(([key, group]) => (
            <DateGroupAccordion
              key={key}
              group={group}
              isCollapsed={!!collapsedDates[group.period]}
              onToggleCollapse={() => setCollapsedDates((p) => ({ ...p, [group.period]: !p[group.period] }))}
              expandedId={expandedId}
              onToggleExpandTicket={(id) => setExpandedId(expandedId === id ? null : id)}
              openRowAudits={openRowAudits}
              onToggleRowAudit={toggleRowAudit}
            />
          ))}
        </div>
      )}
    </section>
  );
};
