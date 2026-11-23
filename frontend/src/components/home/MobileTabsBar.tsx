"use client";

import React from "react";

interface MobileTabsBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const MOBILE_TABS = [
  {
    id: "analytics",
    label: "📊 Biểu Đồ",
    activeClass: "bg-blue-600 text-white shadow-md",
    inactiveClass: "text-slate-400 hover:text-white bg-slate-800"
  },
  {
    id: "generator",
    label: "✨ Sinh Vé",
    activeClass: "bg-amber-600 text-white shadow-md",
    inactiveClass: "text-slate-400 hover:text-white bg-slate-800"
  },
  {
    id: "tickets",
    label: "📑 Sổ Vé",
    activeClass: "bg-emerald-600 text-white shadow-md",
    inactiveClass: "text-slate-400 hover:text-white bg-slate-800"
  },
  {
    id: "ai_learning",
    label: "🤖 AI Tự Học",
    activeClass: "bg-violet-600 text-white shadow-md",
    inactiveClass: "text-slate-400 hover:text-white bg-slate-800"
  },
  {
    id: "winning_history",
    label: "🏆 Lịch Sử Trúng",
    activeClass: "bg-amber-500 text-slate-950 font-black shadow-md",
    inactiveClass: "text-amber-400/90 hover:text-white bg-slate-800"
  }
];

export const MobileTabsBar: React.FC<MobileTabsBarProps> = ({
  activeTab,
  onSelectTab
}) => (
  <div className="flex md:hidden bg-slate-900 border-b border-slate-800 p-2 overflow-x-auto gap-2 text-xs font-bold shrink-0">
    {MOBILE_TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
          activeTab === tab.id ? tab.activeClass : tab.inactiveClass
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
