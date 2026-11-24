"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, Dna, Lock } from "lucide-react";
import { GoldenSignalRowCard } from "./home/GoldenSignalRowCard";

const fmtBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function selectDiverseTopRows(goldenRows: any[], tickets: any[]): any[] {
  const pool: any[] = [
    ...goldenRows,
    ...tickets.flatMap((t: any, tIdx: number) =>
      (t.row_forecasts || []).map((fc: any, rIdx: number) => ({
        ...fc,
        ticket_id: t.id || tIdx,
        row_label: `Vé #${tIdx + 1} • Dãy ${String.fromCharCode(65 + rIdx)}`,
        variant_name: t.variant_name,
        target_draw_period: t.target_draw_period,
        target_draw_date: t.target_draw_date,
        sum: (fc.numbers || []).reduce((a: number, b: number) => a + b, 0),
      }))
    ),
  ];

  pool.sort(
    (a, b) =>
      (b.jackpot_gates_passed ?? 0) - (a.jackpot_gates_passed ?? 0) ||
      (b.row_beauty_score ?? 0) - (a.row_beauty_score ?? 0)
  );

  const selected: any[] = [];
  for (const maxShared of [2, 3]) {
    for (const cand of pool) {
      if (selected.length >= 4) break;
      const nums: number[] = cand.numbers || [];
      if (nums.length !== 6) continue;
      const tooClose = selected.some((ex) => {
        const exSet = new Set(ex.numbers || []);
        const shared = nums.filter((n) => exSet.has(n)).length;
        return shared > maxShared;
      });
      if (!tooClose) selected.push(cand);
    }
  }
  return selected;
}

export const GoldenSignalHeroBanner: React.FC<{
  gameCode: string;
  statusData: any;
}> = ({ gameCode, statusData }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  if (!statusData) return null;

  const evo = statusData.evo_hunter;
  const goldenRows: any[] = statusData.playable_golden_rows || [];
  const tickets: any[] = statusData.latest_ai_tickets || [];
  const topRows = selectDiverseTopRows(goldenRows, tickets);
  if (topRows.length === 0) return null;

  const perfectCnt = topRows.filter((r) => (r.jackpot_gates_passed ?? 0) >= 8).length;
  const period = topRows[0]?.target_draw_period || statusData.latest_ai_ticket?.target_draw_period || "";
  const drawDate = topRows[0]?.target_draw_date || statusData.latest_ai_ticket?.target_draw_date || "";

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAll = () => {
    const allText = topRows
      .map(
        (r: any, i: number) =>
          `#${i + 1} (${r.row_label}): ${(r.numbers || []).map(fmtBall).join(" ")}${
            r.special_number ? ` + ĐB:${fmtBall(r.special_number)}` : ""
          }`
      )
      .join("\n");
    copyText("ALL", allText);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-emerald-950/50 border-2 border-amber-400/70 p-6 md:p-7 shadow-2xl shadow-amber-500/15 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-amber-400/25">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              {perfectCnt > 0
                ? `TINH HOA QUÁN QUÂN 6/6 • ${perfectCnt}/4 BỘ ĐẠT TUYỆT ĐỐI 8/8 CỔNG DNA`
                : "4 BỘ SỐ BAO VÂY KHÁC BIỆT TỪ NHÀ VÔ ĐỊCH 6/6"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              Kỳ #{period} • {drawDate} (18:00)
            </span>
            {evo?.generation && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-200 border border-violet-400/40">
                <Dna className={`w-3.5 h-3.5 text-violet-300 ${evo.running ? "animate-spin" : ""}`} />
                Đời #{evo.generation.toLocaleString()} ({evo.squad_size || 12} quân) • Nổ {evo.recent_6_draws ?? 0}/10 kỳ sát nhất (Mới nhất: {evo.latest_6_date || "..."})
              </span>
            )}
            {statusData.is_draw_locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">
                <Lock className="w-3 h-3" /> Đã khóa chốt giờ quay
              </span>
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-white">
            Bộ Dãy Số Đẹp Kỳ Sắp Tới ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"} • Phiên bản Vua v{statusData.champion_version || 1})
          </h3>
        </div>

        <button
          onClick={handleCopyAll}
          className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 shrink-0 self-start lg:self-center"
        >
          {copiedKey === "ALL" ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
          {copiedKey === "ALL" ? "Đã Sao Chép Trọn Bộ!" : "Sao Chép Nguyên Bộ Số Đẹp"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {topRows.map((gr: any, idx: number) => (
          <GoldenSignalRowCard
            key={`${gr.ticket_id || idx}-${gr.row_label}-${idx}`}
            gr={gr}
            idx={idx}
            copiedKey={copiedKey}
            onCopy={copyText}
          />
        ))}
      </div>
    </div>
  );
};
