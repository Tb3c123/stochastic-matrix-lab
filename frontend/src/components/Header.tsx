import React from "react";
import { Sparkles } from "lucide-react";

interface HeaderProps {
  selectedGame: string;
  onSelectGame: (game: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const NAV_TABS = [
  { id: "ai_arena", label: "🎯 Số Đẹp & Đấu Trường AI" },
  { id: "tickets_hub", label: "🏆 Sổ Vé & Trúng Thưởng" },
  { id: "analytics", label: "📊 Thống Kê Cầu Số" },
];

export const Header: React.FC<HeaderProps> = ({
  selectedGame,
  onSelectGame,
  activeTab,
  onSelectTab,
}) => (
  <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
      <div
        className="flex items-center gap-2.5 shrink-0 cursor-pointer"
        onClick={() => onSelectTab("ai_arena")}
      >
        <div className="w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            VIETLOTT AI
          </span>
          <span className="hidden lg:inline-block text-[11px] font-semibold ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Darwinian Arena
          </span>
        </div>
      </div>

      <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold gap-1">
        {NAV_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === t.id
                ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
        <button
          onClick={() => onSelectGame("mega_6_45")}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
            selectedGame === "mega_6_45"
              ? "bg-red-700 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Mega 6/45
        </button>
        <button
          onClick={() => onSelectGame("power_6_55")}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
            selectedGame === "power_6_55"
              ? "bg-amber-600 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Power 6/55
        </button>
      </div>
    </div>
  </header>
);
