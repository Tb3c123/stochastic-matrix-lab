import React from "react";
import { Trophy, Flame, ShieldAlert, Dna, Lock } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉", "#4", "#5", "#6"];

export const TournamentArenaBoard: React.FC<{
  evo: any;
  isDrawLocked?: boolean;
}> = ({ evo, isDrawLocked = false }) => {
  if (!evo || !evo.generation) return null;

  const freq = Number(evo.hit_frequency_pct || 0);
  const target = Number(evo.target_frequency_pct || 70);
  const pctBar = Math.min(100, Math.round((freq / Math.max(1, target)) * 100));
  const board: any[] = evo.leaderboard || [];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 border border-violet-500/40 p-5 md:p-6 space-y-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-violet-500/20 text-violet-200 border border-violet-400/40">
              <Dna className={`w-3.5 h-3.5 text-violet-300 ${evo.running ? "animate-spin" : ""}`} />
              Đấu Trường 16 Cá Thể • Thế Hệ #{evo.generation?.toLocaleString()}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Đã đào thải {Number(evo.total_culled || 0).toLocaleString()} kẻ yếu
            </span>
            {isDrawLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                <Lock className="w-3 h-3" /> Đã khóa chốt số chờ quay thưởng
              </span>
            )}
          </div>
          <h4 className="text-lg md:text-xl font-extrabold text-white">
            Cuộc Thi Chọn Lọc Tự Nhiên: Ưu Tiên Cá Thể Trúng Đều Tần Suất Cao
          </h4>
        </div>
        <div className="text-xs text-slate-300 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 font-mono">
          Chế độ:{" "}
          <b className={evo.mode === "cruise" ? "text-emerald-400" : "text-amber-300"}>
            {evo.mode === "cruise" ? "Duy Trì Đỉnh Cao 24/7" : "Đua Nước Rút Tăng Tần Suất"}
          </b>{" "}
          • Phiên bản Vua: <b className="text-violet-300">v{evo.champion_version || 1}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold flex items-center gap-1.5 text-emerald-300">
              <Trophy className="w-4 h-4 text-amber-400" /> KỶ LỤC TẦN SUẤT KỲ CÓ GIẢI
            </span>
            <span className="font-mono font-black text-emerald-300">
              Thắng {evo.winning_draws}/{evo.draws_in_window} kỳ (Mục tiêu: {target}%)
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white font-mono">{freq.toFixed(1)}%</span>
            <span className="text-xs text-slate-400">Quán quân: <b className="text-amber-300">{evo.champion_name}</b> ({evo.champion_age || 1} đời)</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-300 transition-all duration-500" style={{ width: `${pctBar}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Thực Chiến 30% Kỳ Cuối
          </span>
          <div className="text-2xl font-black text-white font-mono">{Number(evo.holdout_frequency_pct || 0).toFixed(1)}%</div>
          <span className="text-[11px] text-slate-400">Nổ kép nhiều dãy: <b className="text-slate-200">{evo.multi_hit_draws || 0} kỳ</b></span>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Độ Bền & Giải Đạt Được
          </span>
          <div className="text-lg font-black text-white font-mono">Max trượt: {evo.max_drought ?? 0} kỳ</div>
          <span className="text-[11px] text-slate-300 font-mono">
            6/6:<b>{evo.match_6}</b> • 5/6:<b>{(evo.jackpot_2 || 0) + (evo.match_5 || 0)}</b> • 4/6:<b>{evo.match_4}</b> • 3/6:<b>{evo.match_3}</b>
          </span>
        </div>
      </div>

      {board.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Hạng</th>
                <th className="py-2.5 px-3">Cá Thể Chiến Thuật</th>
                <th className="py-2.5 px-3">Tuổi Thọ</th>
                <th className="py-2.5 px-3">% Kỳ Trúng</th>
                <th className="py-2.5 px-3">Thực Chiến</th>
                <th className="py-2.5 px-3">Max Trượt</th>
                <th className="py-2.5 px-3">Tổng Giải (90 Ngày)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {board.map((b: any, i: number) => (
                <tr key={i} className={i === 0 ? "bg-amber-500/10 text-amber-200 font-bold" : "text-slate-300"}>
                  <td className="py-2 px-3">{MEDALS[i] || `#${b.rank}`}</td>
                  <td className="py-2 px-3 font-sans font-semibold">{b.bot_name}</td>
                  <td className="py-2 px-3">{b.age} đời</td>
                  <td className="py-2 px-3 text-emerald-300 font-bold">{b.hit_frequency_pct}% ({b.winning_draws}/{b.draws_total})</td>
                  <td className="py-2 px-3 text-sky-300">{b.holdout_frequency_pct}%</td>
                  <td className="py-2 px-3">{b.max_drought} kỳ</td>
                  <td className="py-2 px-3">6/6:{b.match_6} • 5/6:{(b.jackpot_2 || 0) + b.match_5} • 4/6:{b.match_4} • 3/6:{b.match_3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
