import React from "react";
import { Sparkles, Trophy } from "lucide-react";

interface HeaderProps {
  selectedGame: string;
  onSelectGame: (game: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedGame,
  onSelectGame,
  activeTab,
  onSelectTab
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 shrink-0 cursor-pointer" onClick={() => onSelectTab("analytics")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-white">
              VIETLOT
            </span>
            <span className="hidden sm:inline-block text-xs font-semibold ml-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
              Analytics Engine
            </span>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <nav className="hidden md:flex items-center bg-slate-950/60 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => onSelectTab("analytics")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            📊 Biểu Đồ Thống Kê
          </button>
          <button
            onClick={() => onSelectTab("generator")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "generator"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            ✨ Sinh Vé Thông Minh
          </button>
          <button
            onClick={() => onSelectTab("tickets")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "tickets"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            📑 Sổ Đối Soát Vé
          </button>
          <button
            onClick={() => onSelectTab("ai_learning")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "ai_learning"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            🤖 AI Tự Học (Hybrid)
          </button>
        </nav>

        {/* Right Section: Lịch Sử Trúng + Game Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Nút Lịch Sử Trúng dời qua để chung với Mega 6/45 và Power 6/55 */}
          <button
            onClick={() => onSelectTab("winning_history")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-bold border ${
              activeTab === "winning_history"
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/30 scale-105"
                : "bg-slate-800/90 text-amber-400 hover:text-amber-300 hover:bg-slate-800 border-amber-500/30 hover:border-amber-500/50"
            }`}
            title="Xem bảng vàng các lần trúng thưởng"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-extrabold hidden sm:inline">Lịch Sử Trúng</span>
            <span className="font-extrabold sm:hidden">Trúng Thưởng</span>
          </button>

          {/* Game Switcher Tabs */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => onSelectGame("mega_6_45")}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                selectedGame === "mega_6_45"
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mega 6/45
            </button>
            <button
              onClick={() => onSelectGame("power_6_55")}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                selectedGame === "power_6_55"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Power 6/55
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
