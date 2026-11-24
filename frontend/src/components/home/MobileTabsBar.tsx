"use client";

import React from "react";

interface MobileTabsBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const MOBILE_TABS = [
  {
    id: "ai_arena",
    label: "🎯 Số Đẹp & AI",
    activeCls: "bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black shadow-md",
  },
  {
    id: "tickets_hub",
    label: "🏆 Sổ Vé & Trúng",
    activeCls: "bg-emerald-500 text-slate-950 font-black shadow-md",
  },
  {
    id: "analytics",
    label: "📊 Cầu Số",
    activeCls: "bg-sky-500 text-slate-950 font-black shadow-md",
  },
];

export const MobileTabsBar: React.FC<MobileTabsBarProps> = ({
  activeTab,
  onSelectTab,
}) => (
  <div className="grid grid-cols-3 md:hidden bg-slate-900/95 border-b border-slate-800 p-2 gap-1.5 text-xs font-bold">
    {MOBILE_TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
          activeTab === tab.id
            ? tab.activeCls
            : "text-slate-400 hover:text-white bg-slate-800/70"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
