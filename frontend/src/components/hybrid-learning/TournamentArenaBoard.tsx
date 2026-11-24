import React from "react";
import { Trophy, Flame, Crosshair, Dna, Lock, Zap } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉", "#4", "#5", "#6"];

export const TournamentArenaBoard: React.FC<{
  evo: any;
  isDrawLocked?: boolean;
}> = ({ evo, isDrawLocked = false }) => {
  if (!evo || !evo.generation) return null;

  const rec6 = Number(evo.recent_6_draws || 0);
  const recTot = Number(evo.recent_total || 10);
  const win6Draws = Number(evo.winning_draws || 0);
  const totalDraws = Number(evo.draws_in_window || 117);
  const monthsLabel = `${Math.max(3, Math.round(Number(evo.days_back || 270) / 30))} Tháng`;
  const squadSz = Number(evo.squad_size || 12);
  const pctBar = Math.min(100, Math.round((rec6 / Math.max(1, recTot)) * 100));
  const board: any[] = evo.leaderboard || [];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 border border-violet-500/40 p-5 md:p-6 space-y-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-violet-500/20 text-violet-200 border border-violet-400/40">
              <Dna className={`w-3.5 h-3.5 text-violet-300 ${evo.running ? "animate-spin" : ""}`} />
              Đội Hình {squadSz} Đấu Sĩ ({squadSz >= 30 ? "Đại Quân Đêm" : "Tinh Nhuệ Ngày"}) • Đời #{evo.generation?.toLocaleString()}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Đã loại {Number(evo.total_culled || 0).toLocaleString()} cá thể yếu
            </span>
            {isDrawLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                <Lock className="w-3 h-3" /> Đã khóa chốt chờ xổ 18:35
              </span>
            )}
          </div>
          <h4 className="text-lg md:text-xl font-extrabold text-white">
            Luật Cưỡng Bức Mới: Bắt Buộc Công Phá 10 Kỳ Sát Hiện Tại Nhất & Cộng Điểm Thực Chiến 18:35
          </h4>
        </div>
        <div className="text-xs text-slate-300 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 font-mono">
          Nhịp:{" "}
          <b className="text-emerald-400">
            {evo.mode === "night_boost" || evo.mode === "night_cooldown"
              ? "🌙 36 Quân Đêm (00:30–07:00)"
              : evo.mode === "day_idle"
                ? "💤 Ngủ Đông 0% CPU"
                : "🍃 12 Quân Eco (<1% CPU)"}
          </b>{" "}
          • Vua: <b className="text-amber-300">v{evo.champion_version || 1}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-amber-500/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold flex items-center gap-1.5 text-amber-300">
              <Trophy className="w-4 h-4 text-amber-400" /> NỔ 6/6 Ở {recTot} KỲ GẦN HÔM NAY NHẤT
            </span>
            <span className="font-mono font-black text-emerald-300">
              Kỳ 6/6 mới nhất: {evo.latest_6_date || "Đang khóa..."}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-amber-300 font-mono">
              {rec6} / {recTot} KỲ GẦN
            </span>
            <span className="text-xs text-slate-400">
              Quán quân: <b className="text-white">{evo.champion_name}</b>
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500" style={{ width: `${pctBar}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" /> Bề Dày {monthsLabel} Lịch Sử
          </span>
          <div className="text-2xl font-black text-white font-mono">
            {win6Draws} / {totalDraws} <span className="text-xs text-slate-400 font-normal">kỳ 6/6</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Tiệm cận sắp nổ thêm: <b className="text-violet-300">{evo.match_5 || 0} dãy 5/6</b>
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Uy Tín Thắng Giờ Quay Thật
          </span>
          <div className="text-2xl font-black text-sky-300 font-mono">
            +{Number(evo.live_prestige || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Chấm tự động lúc 18:35 (suy giảm x0.85/kỳ)
          </span>
        </div>
      </div>

      {board.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Hạng</th>
                <th className="py-2.5 px-3">Chiến Binh (4 Đầu Vé)</th>
                <th className="py-2.5 px-3">Tuổi Thọ</th>
                <th className="py-2.5 px-3">Nổ Kỳ Gần Nhất</th>
                <th className="py-2.5 px-3">Kỳ 6/6 Mới Nhất</th>
                <th className="py-2.5 px-3">Tổng {monthsLabel}</th>
                <th className="py-2.5 px-3">Điểm Thực Chiến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {board.map((b: any, i: number) => (
                <tr key={i} className={b.recent_6_draws > 0 && i === 0 ? "bg-amber-500/15 text-amber-200 font-bold" : "text-slate-300"}>
                  <td className="py-2 px-3">{MEDALS[i] || `#${b.rank}`}</td>
                  <td className="py-2 px-3 font-sans font-semibold flex items-center gap-1.5">
                    <span>{b.bot_name}</span>
                    {b.live_prestige > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                        <Zap className="w-2.5 h-2.5" /> Thực chiến
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">{b.age} đời</td>
                  <td className="py-2 px-3 text-amber-300 font-black">
                    {b.recent_6_draws ?? 0} / {b.recent_total ?? 10} kỳ
                  </td>
                  <td className="py-2 px-3 text-emerald-300">{b.latest_6_date || "—"}</td>
                  <td className="py-2 px-3">{b.winning_draws}/{b.draws_total} kỳ 6/6</td>
                  <td className="py-2 px-3 text-sky-300">+{Number(b.live_prestige || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
