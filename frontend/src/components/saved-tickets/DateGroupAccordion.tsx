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
  onToggleRowAudit,
}) => (
  <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
    <div
      onClick={onToggleCollapse}
      className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-slate-900">
              KỲ MỞ THƯỞNG #{group.period}
            </span>
            <span className="text-xs text-slate-700 font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200">
              Ngày {formatDate(group.date)}
            </span>
            {group.goldenRowsCount > 0 ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                {group.goldenRowsCount} Dãy Đạt Đủ 8/8 Cổng DNA (Trên {group.goldenTicketsCount} vé)
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Chưa có dãy khóa đủ 8/8 Cổng DNA
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-1">
            <span>{group.tickets.length} vé</span>
            <span>•</span>
            <span>{group.totalRows} dãy số</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Đã đối soát kết quả</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {group.winningTicketsCount > 0 ? (
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-700" />
            Trúng {group.winningTicketsCount} vé ({formatVND(group.totalPrize)})
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-white text-slate-500 text-xs border border-slate-200">
            Chưa có giải kỳ này
          </span>
        )}

        <button
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100"
          title={isCollapsed ? "Mở rộng kỳ này" : "Thu gọn kỳ này"}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>

    {!isCollapsed && (
      <div className="p-4 sm:p-5 space-y-4 bg-[#fafbfc]">
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
