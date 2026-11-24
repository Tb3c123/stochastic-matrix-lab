import React from "react";
import { Trophy, Flame, Crosshair, Dna, Lock } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉", "#4", "#5", "#6"];

export const TournamentArenaBoard: React.FC<{
  evo: any;
  isDrawLocked?: boolean;
}> = ({ evo, isDrawLocked = false }) => {
  if (!evo || !evo.generation) return null;

  const win6Draws = Number(evo.winning_draws || 0);
  const totalDraws = Number(evo.draws_in_window || 39);
  const freq = Number(evo.hit_frequency_pct || 0);
  const pctBar = Math.min(100, Math.round((win6Draws / Math.max(1, Math.round(totalDraws * 0.35))) * 100));
  const board: any[] = evo.leaderboard || [];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 border border-violet-500/40 p-5 md:p-6 space-y-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-violet-500/20 text-violet-200 border border-violet-400/40">
              <Dna className={`w-3.5 h-3.5 text-violet-300 ${evo.running ? "animate-spin" : ""}`} />
              Đấu Trường Sinh Tử 6/6 • Thế Hệ #{evo.generation?.toLocaleString()}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Đã khai tử {Number(evo.total_culled || 0).toLocaleString()} cá thể yếu
            </span>
            {isDrawLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                <Lock className="w-3 h-3" /> Đã khóa chốt số chờ quay thưởng
              </span>
            )}
          </div>
          <h4 className="text-lg md:text-xl font-extrabold text-white">
            Độ Khó Tuyệt Đối: Chỉ Chọn Lọc & Tính Điểm Hoàn Toàn Độc Đắc 6/6 (Loại Bỏ Giải Phụ)
          </h4>
        </div>
        <div className="text-xs text-slate-300 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 font-mono">
          Nhịp máy:{" "}
          <b className="text-emerald-400">
            {evo.mode === "night_boost" || evo.mode === "night_cooldown"
              ? "🌙 Bung Đêm 00:30–07:00 (Nhường qBittorrent)"
              : evo.mode === "day_idle"
                ? "💤 Ngủ Đông 0% CPU (Đợi 00:30 / Kỳ mới)"
                : "🍃 Eco Ban Ngày (<1% CPU)"}
          </b>{" "}
          • Vua: <b className="text-amber-300">v{evo.champion_version || 1}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-amber-500/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold flex items-center gap-1.5 text-amber-300">
              <Trophy className="w-4 h-4 text-amber-400" /> SỐ KỲ NỔ TRỌN VẸN ĐỘC ĐẮC 6/6
            </span>
            <span className="font-mono font-black text-emerald-300">
              {win6Draws} / {totalDraws} kỳ quay ({freq.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-amber-300 font-mono">
              {win6Draws} KỲ 6/6
            </span>
            <span className="text-xs text-slate-400">
              Quán quân: <b className="text-white">{evo.champion_name}</b> ({evo.champion_age || 1} đời)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${pctBar}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" /> Tổng Lần Khóa Trúng 6/6
          </span>
          <div className="text-2xl font-black text-white font-mono">
            {evo.match_6 || 0} <span className="text-xs text-slate-400 font-normal">dãy 6/6</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Holdout 30% cuối: <b className="text-sky-300">{Number(evo.holdout_frequency_pct || 0).toFixed(1)}% kỳ 6/6</b>
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-violet-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Bàn Đạp Tiệm Cận Đang Lên 6/6
          </span>
          <div className="text-2xl font-black text-violet-200 font-mono">
            {evo.match_5 || 0} <span className="text-xs text-slate-400 font-normal">dãy 5/6 sát nút</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Đang đột biến nốt 1 số cuối để cộng dồn thêm kỳ 6/6
          </span>
        </div>
      </div>

      {board.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Hạng</th>
                <th className="py-2.5 px-3">Cá Thể Chiến Binh (4 Đầu Vé)</th>
                <th className="py-2.5 px-3">Tuổi Thọ</th>
                <th className="py-2.5 px-3">Số Kỳ Nổ 6/6</th>
                <th className="py-2.5 px-3">Tổng Dãy 6/6</th>
                <th className="py-2.5 px-3">Tiệm Cận 5/6 (Sắp Lên 6/6)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {board.map((b: any, i: number) => (
                <tr
                  key={i}
                  className={
                    b.winning_draws > 0 && i === 0
                      ? "bg-amber-500/15 text-amber-200 font-bold"
                      : "text-slate-300"
                  }
                >
                  <td className="py-2 px-3">{MEDALS[i] || `#${b.rank}`}</td>
                  <td className="py-2 px-3 font-sans font-semibold">{b.bot_name}</td>
                  <td className="py-2 px-3">{b.age} đời</td>
                  <td className="py-2 px-3 text-amber-300 font-black">
                    {b.winning_draws} / {b.draws_total} kỳ ({b.hit_frequency_pct}%)
                  </td>
                  <td className="py-2 px-3 text-emerald-300 font-bold">{b.match_6} dãy 6/6</td>
                  <td className="py-2 px-3 text-violet-300">{b.match_5} dãy 5/6</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
