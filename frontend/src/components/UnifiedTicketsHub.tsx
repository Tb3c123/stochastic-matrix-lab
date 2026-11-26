"use client";

import React, { useState } from "react";
import { Trophy, Clock, ListChecks, Zap, CheckCircle2 } from "lucide-react";
import { useUnifiedTickets } from "./winning-history/useUnifiedTickets";
import { WinningKpiGrid } from "./winning-history/WinningKpiGrid";
import { WinningTicketCard } from "./winning-history/WinningTicketCard";
import { SavedTicketCard } from "./saved-tickets/SavedTicketCard";
import { DateGroupAccordion } from "./saved-tickets/DateGroupAccordion";

export const UnifiedTicketsHub: React.FC<{ gameCode: string; latestDraw?: any; refreshTrigger: number }> = ({
  gameCode, latestDraw, refreshTrigger,
}) => {
  const [viewMode, setViewMode] = useState<"live" | "winning" | "pending" | "all">("live");
  const [tierFilter, setTierFilter] = useState<string>("jackpot_6");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [openRowAudits, setOpenRowAudits] = useState<Record<string, boolean>>({});

  const effectiveTier = viewMode === "live" ? "live_real_time" : tierFilter;
  const { loading, summary, winningTickets, totalWinningRowsCount, pendingTickets, liveEvaluatedGroups, evaluatedGroups } =
    useUnifiedTickets(gameCode, effectiveTier, refreshTrigger);

  const toggleRowAudit = (ticketId: number, rowIdx: number) =>
    setOpenRowAudits((p) => ({ ...p, [`${ticketId}-${rowIdx}`]: !p[`${ticketId}-${rowIdx}`] }));

  if (loading && winningTickets.length === 0 && pendingTickets.length === 0) {
    return <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />;
  }

  const horizonLabel = gameCode === "power_6_55" ? "12 Tháng" : "9 Tháng";
  const modeTabs = [
    { id: "live" as const, icon: Zap, label: `Thắng Thời Gian Thật (${liveEvaluatedGroups.length} kỳ)` },
    { id: "pending" as const, icon: Clock, label: `Chờ Quay (${pendingTickets.length})` },
    { id: "winning" as const, icon: Trophy, label: `Hồi Tố 6/6 (${winningTickets.length})` },
    { id: "all" as const, icon: ListChecks, label: `Đủ ${evaluatedGroups.length} Kỳ (${horizonLabel})` },
  ];

  const renderGroupList = (groups: [string, any][], prefix: string) =>
    groups.map(([key, group]) => (
      <DateGroupAccordion
        key={`${prefix}-${key}`}
        group={group}
        isCollapsed={!!collapsedDates[`${prefix}-${group.period}`]}
        onToggleCollapse={() => setCollapsedDates((p) => ({ ...p, [`${prefix}-${group.period}`]: !p[`${prefix}-${group.period}`] }))}
        expandedId={expandedId}
        onToggleExpandTicket={(id) => setExpandedId(expandedId === id ? null : id)}
        openRowAudits={openRowAudits}
        onToggleRowAudit={toggleRowAudit}
      />
    ));

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-700" />
              Sổ Vé & Lịch Sử Trúng ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"})
            </h2>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Đã đồng bộ kết quả chính thức mới nhất:{" "}
                <b className="text-slate-900">
                  Kỳ #{latestDraw?.draw_period || "..."} ({latestDraw?.draw_date || "..."})
                </b>{" "}
                • Vé chốt thực chiến được bảo toàn vĩnh viễn.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs font-semibold">
            {modeTabs.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setViewMode(m.id);
                    if (m.id === "winning" && tierFilter === "live_real_time") setTierFilter("jackpot_6");
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === m.id
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-600 hover:text-slate-900"
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
          isLiveMode={viewMode === "live"}
          onSelectTierFilter={(t) => {
            setTierFilter(t);
            if (viewMode !== "live") setViewMode("winning");
          }}
        />
      </div>

      {viewMode === "live" && (
        <div className="space-y-4">
          {winningTickets.map((t) => (
            <WinningTicketCard key={t.id} ticket={t} isExpanded={expandedId === t.id} onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)} />
          ))}
          {liveEvaluatedGroups.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
              Chưa có kỳ quay thật nào được đối soát (hệ thống sẽ tự lưu vĩnh viễn ngay từ kỳ mở thưởng tiếp theo).
            </div>
          ) : (
            renderGroupList(liveEvaluatedGroups, "live")
          )}
        </div>
      )}

      {viewMode === "winning" && (
        <div className="space-y-4">
          {winningTickets.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
              Đang công phá các kỳ Độc Đắc 6/6 sát hiện tại...
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

      {viewMode === "all" && <div className="space-y-5">{renderGroupList(evaluatedGroups, "bt")}</div>}
    </section>
  );
};
