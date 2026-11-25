import React from "react";
import { Trophy, Flame, Crosshair, Dna, Lock, Zap } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉", "#4", "#5", "#6"];

export const TournamentArenaBoard: React.FC<{
  evo: any;
  isDrawLocked?: boolean;
}> = ({ evo, isDrawLocked = false }) => {
  if (!evo || !evo.generation) return null;

  const rec6 = Number(evo.recent_6_draws || 0);
  const recTot = Number(evo.recent_total || 15);
  const win6Draws = Number(evo.winning_draws || 0);
  const totalDraws = Number(evo.draws_in_window || 117);
  const monthsLabel = `${Math.max(3, Math.round(Number(evo.days_back || 270) / 30))} Tháng`;
  const squadSz = Number(evo.squad_size || 12);
  const pctBar = Math.min(100, Math.round((rec6 / Math.max(1, recTot)) * 100));
  const board: any[] = evo.leaderboard || [];

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
              <Dna className={`w-3.5 h-3.5 text-slate-600 ${evo.running ? "animate-spin" : ""}`} />
              Đội Hình {squadSz} Đấu Sĩ ({squadSz >= 30 ? "Đại Quân Đêm" : "Tinh Nhuệ Ngày"}) • Đời #{evo.generation?.toLocaleString()}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
              Đã loại {Number(evo.total_culled || 0).toLocaleString()} cá thể yếu
            </span>
            {isDrawLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                <Lock className="w-3 h-3" />
                {evo.standby_phase === "final_buy_window"
                  ? "Đã chốt số cuối 16:30 • Mời mua vé trước 17:45"
                  : "Tạm nghỉ thi đấu • Chờ kết quả xổ 18:35"}
              </span>
            )}
          </div>
          <h4 className="text-lg md:text-xl font-bold text-slate-900">
            Đấu Trường 8 Gia Tộc Chống Bản Sao: Khóa Cấp Độ Dòng & Hội Đồng 4 Nguồn Bỏ Phiếu
          </h4>
        </div>
        <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono">
          Nhịp:{" "}
          <b className="text-emerald-800">
            {evo.mode === "draw_standby" || isDrawLocked
              ? "⏸️ Tạm Nghỉ Chờ Xổ (0% CPU)"
              : evo.mode === "night_boost" || evo.mode === "night_cooldown"
                ? "🌙 36 Quân Đêm (00:30–07:00)"
                : evo.mode === "day_idle"
                  ? "💤 Ngủ Đông 0% CPU"
                  : "🍃 12 Quân Eco (<1% CPU)"}
          </b>{" "}
          • Vua: <b className="text-amber-800">v{evo.champion_version || 1}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="md:col-span-2 rounded-xl bg-amber-50/50 border border-amber-200 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-bold flex items-center gap-1.5 text-amber-900">
              <Trophy className="w-4 h-4 text-amber-700" /> NỔ 6/6 Ở {recTot} KỲ GẦN HÔM NAY NHẤT
            </span>
            <span className="font-mono font-bold text-emerald-800">
              Mới nhất: {evo.latest_6_date || "Đang khóa..."}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-amber-900 font-mono">
              {rec6} / {recTot} KỲ GẦN
            </span>
            <span className="text-xs text-slate-600">
              Quán quân: <b className="text-slate-900">{evo.champion_name}</b>
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-amber-100 overflow-hidden">
            <div className="h-full bg-amber-600 transition-all duration-500" style={{ width: `${pctBar}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" /> Bề Dày {monthsLabel} Lịch Sử
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {win6Draws} / {totalDraws} <span className="text-xs text-slate-500 font-normal">kỳ 6/6</span>
          </div>
          <span className="text-[11px] text-slate-600">
            Tiệm cận sắp nổ thêm: <b className="text-slate-900">{evo.match_5 || 0} dãy 5/6</b>
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Uy Tín Thắng Giờ Quay Thật
          </span>
          <div className="text-2xl font-extrabold text-blue-800 font-mono">
            +{Number(evo.live_prestige || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-600">
            Chấm tự động lúc 18:35 (suy giảm x0.85/kỳ)
          </span>
        </div>
      </div>

      {board.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Hạng</th>
                <th className="py-2.5 px-3">Gia Tộc Đấu Sĩ (Khác Gen 100%)</th>
                <th className="py-2.5 px-3">Tuổi Gia Tộc</th>
                <th className="py-2.5 px-3">Nổ Kỳ Gần Nhất</th>
                <th className="py-2.5 px-3">Tổng {monthsLabel}</th>
                <th className="py-2.5 px-3">Tiệm Cận 5/6</th>
                <th className="py-2.5 px-3">Thực Chiến 18:35</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {board.map((b: any, i: number) => (
                <tr key={i} className={b.recent_6_draws > 0 && i === 0 ? "bg-amber-50/70 text-slate-900 font-bold" : "text-slate-700 hover:bg-slate-50"}>
                  <td className="py-2.5 px-3">{MEDALS[i] || `#${b.rank}`}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{b.bot_name}</span>
                    {b.live_prestige > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                        <Zap className="w-2.5 h-2.5" /> Thực chiến
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 font-semibold">{b.age} đời</td>
                  <td className="py-2.5 px-3 text-amber-800 font-bold">
                    {b.recent_6_draws ?? 0} / {b.recent_total ?? 15} kỳ
                  </td>
                  <td className="py-2.5 px-3 text-emerald-800 font-semibold">{b.winning_draws}/{b.draws_total} kỳ 6/6</td>
                  <td className="py-2.5 px-3 text-slate-700">{b.match_5 ?? 0} dãy 5/6</td>
                  <td className="py-2.5 px-3 text-blue-800 font-semibold">+{Number(b.live_prestige || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
