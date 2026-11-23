"use client";

import React from "react";
import { Calendar, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { TicketDateGroup } from "./groupTickets";
import { formatDate, formatVND } from "./ticketFormatters";
import { SavedTicketCard } from "./SavedTicketCard";

interface DateGroupAccordionProps {
  group: TicketDateGroup;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  expandedId: number | null;
  onToggleExpandTicket: (ticketId: number) => void;
  openRowAudits: Record<string, boolean>;
  onToggleRowAudit: (ticketId: number, rowIdx: number) => void;
}

export const DateGroupAccordion: React.FC<DateGroupAccordionProps> = ({
  group,
  isCollapsed,
  onToggleCollapse,
  expandedId,
  onToggleExpandTicket,
  openRowAudits,
  onToggleRowAudit
}) => (
  <div className="border border-slate-800 rounded-3xl bg-slate-900/70 overflow-hidden shadow-xl transition-all">
    <div
      onClick={onToggleCollapse}
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
            {group.goldenRowsCount > 0 ? (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50">
                🎯 CÓ TÍN HIỆU ĐỘC ĐẮC: {group.goldenRowsCount} Dãy Đạt Đủ 8/8
                Cổng DNA (Trên {group.goldenTicketsCount} vé)
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                ⏸️ Chưa có dãy khóa đủ 8/8 Cổng DNA Độc Đắc — Chỉ theo dõi
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 pt-1">
            <span>{group.tickets.length} vé</span>
            <span>•</span>
            <span>{group.totalRows} dãy số</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">
              Đã đối soát kết quả
            </span>
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
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>

    {!isCollapsed && (
      <div className="p-4 sm:p-6 space-y-4 bg-slate-950/40">
        {group.tickets.map((ticket) => (
          <SavedTicketCard
            key={ticket.id}
            ticket={ticket}
            isExpanded={expandedId === ticket.id}
            onToggleExpand={() => onToggleExpandTicket(ticket.id)}
            openRowAudits={openRowAudits}
            onToggleRowAudit={onToggleRowAudit}
          />
        ))}
      </div>
    )}
  </div>
);
