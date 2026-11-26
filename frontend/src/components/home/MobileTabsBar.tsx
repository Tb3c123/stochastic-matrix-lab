"use client";

import React from "react";

interface MobileTabsBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const MOBILE_TABS = [
  { id: "ai_arena", label: "🎯 Số Đẹp" },
  { id: "tickets_hub", label: "🏆 Sổ Vé" },
  { id: "arena_logs", label: "📜 Nhật Ký" },
  { id: "analytics", label: "📊 Cầu Số" },
];

export const MobileTabsBar: React.FC<MobileTabsBarProps> = ({
  activeTab,
  onSelectTab,
}) => (
  <div className="grid grid-cols-4 md:hidden bg-white border-b border-slate-200 p-2 gap-1 text-[11px] font-semibold">
    {MOBILE_TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        className={`py-2 px-1.5 rounded-lg text-center transition-colors cursor-pointer ${
          activeTab === tab.id
            ? "bg-slate-900 text-white font-bold"
            : "text-slate-600 hover:text-slate-900 bg-slate-100"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
