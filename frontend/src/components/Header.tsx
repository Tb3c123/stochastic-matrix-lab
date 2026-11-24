import React from "react";
import { Sparkles } from "lucide-react";

interface HeaderProps {
  selectedGame: string;
  onSelectGame: (game: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const NAV_TABS = [
  {
    id: "ai_arena",
    label: "🎯 Số Đẹp & Đấu Trường AI",
    activeCls: "bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black shadow-md shadow-amber-500/25",
  },
  {
    id: "tickets_hub",
    label: "🏆 Sổ Vé & Trúng Thưởng",
    activeCls: "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/25",
  },
  {
    id: "analytics",
    label: "📊 Thống Kê Cầu Số",
    activeCls: "bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/25",
  },
];

export const Header: React.FC<HeaderProps> = ({
  selectedGame,
  onSelectGame,
  activeTab,
  onSelectTab,
}) => (
  <header className="border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
      <div
        className="flex items-center gap-2.5 shrink-0 cursor-pointer"
        onClick={() => onSelectTab("ai_arena")}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-white to-emerald-300">
            VIETLOTT AI
          </span>
          <span className="hidden lg:inline-block text-[11px] font-bold ml-2 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
            Darwinian Arena
          </span>
        </div>
      </div>

      <nav className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
        {NAV_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === t.id
                ? t.activeCls
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
        <button
          onClick={() => onSelectGame("mega_6_45")}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
            selectedGame === "mega_6_45"
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Mega 6/45
        </button>
        <button
          onClick={() => onSelectGame("power_6_55")}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
            selectedGame === "power_6_55"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Power 6/55
        </button>
      </div>
    </div>
  </header>
);
