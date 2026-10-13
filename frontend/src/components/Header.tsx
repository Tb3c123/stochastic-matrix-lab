import React from "react";
import { Sparkles, BarChart3, ShieldCheck } from "lucide-react";

interface HeaderProps {
  selectedGame: string;
  onSelectGame: (game: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ selectedGame, onSelectGame }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-white">
              VIETLOT
            </span>
            <span className="text-xs font-semibold ml-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
              Analytics Engine
            </span>
          </div>
        </div>

        {/* Game Switcher Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => onSelectGame("mega_6_45")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
              selectedGame === "mega_6_45"
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mega 6/45
          </button>
          <button
            onClick={() => onSelectGame("power_6_55")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
              selectedGame === "power_6_55"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Power 6/55
          </button>
        </div>
      </div>
    </header>
  );
};
