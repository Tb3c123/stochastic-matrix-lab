"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, Dna, Lock } from "lucide-react";
import { GoldenSignalRowCard } from "./home/GoldenSignalRowCard";

const fmtBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const COUNCIL_SLOTS = [
  { src: "king", prefOrigin: "raw_genome" },
  { src: "runner_up", prefOrigin: "raw_genome" },
  { src: "consensus", prefOrigin: "dna_golden" },
  { src: "maverick", prefOrigin: "dna_golden" },
];

function selectDiverseTopRows(goldenRows: any[], tickets: any[]): any[] {
  const pool: any[] = [
    ...tickets.flatMap((t: any, tIdx: number) =>
      (t.row_forecasts || []).map((fc: any, rIdx: number) => ({
        ...fc,
        ticket_id: t.id || tIdx,
        council_source: fc.council_source || t.council_source || "",
        council_badge: fc.council_badge || t.council_badge || "",
        row_origin: fc.row_origin || "dna_golden",
        origin_badge: fc.origin_badge || (fc.row_origin === "raw_genome" ? "🧬 Nguyên Bản Gia Tộc" : "✨ Chuẩn Vàng 8/8 DNA"),
        row_label: `Vé #${tIdx + 1} • Dãy ${String.fromCharCode(65 + rIdx)}`,
        variant_name: t.variant_name,
        target_draw_period: t.target_draw_period,
        target_draw_date: t.target_draw_date,
        sum: (fc.numbers || []).reduce((a: number, b: number) => a + b, 0),
      }))
    ),
    ...goldenRows,
  ];

  const selected: any[] = [];
  const canAdd = (nums: number[], cap: number) =>
    nums.length === 6 &&
    !selected.some((ex) => {
      const exSet = new Set(ex.numbers || []);
      return nums.filter((n) => exSet.has(n)).length > cap;
    });

  // Pass 1: 2 Raw Evolved Genome rows (King #1 + Live/Runner-Up) + 2 Golden 8/8 DNA rows (Consensus + Maverick)
  for (const { src, prefOrigin } of COUNCIL_SLOTS) {
    const cands = pool
      .filter((c) => c.council_source === src)
      .sort(
        (a, b) =>
          (a.row_origin === prefOrigin ? -1 : 1) - (b.row_origin === prefOrigin ? -1 : 1) ||
          (b.jackpot_gates_passed ?? 0) - (a.jackpot_gates_passed ?? 0) ||
          (b.row_beauty_score ?? 0) - (a.row_beauty_score ?? 0)
      );
    const pick = cands.find((c) => canAdd(c.numbers || [], 2)) || cands.find((c) => canAdd(c.numbers || [], 3));
    if (pick) selected.push(pick);
  }

  for (const maxShared of [2, 3]) {
    for (const cand of pool) {
      if (selected.length >= 4) break;
      if (!selected.includes(cand) && canAdd(cand.numbers || [], maxShared)) {
        selected.push(cand);
      }
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

  const rawCnt = topRows.filter((r) => r.row_origin === "raw_genome").length;
  const period = topRows[0]?.target_draw_period || statusData.latest_ai_ticket?.target_draw_period || "";
  const drawDate = topRows[0]?.target_draw_date || statusData.latest_ai_ticket?.target_draw_date || "";

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAll = () => {
    const allText = topRows
      .map((r: any, i: number) => `#${i + 1} [${r.council_badge || r.row_label} • ${r.origin_badge || ""}]: ${(r.numbers || []).map(fmtBall).join(" ")}${r.special_number ? ` + ĐB:${fmtBall(r.special_number)}` : ""}`)
      .join("\n");
    copyText("ALL", allText);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              {`CƠ CHẾ KÉP • ${rawCnt} BỘ NGUYÊN BẢN GIA TỘC + ${topRows.length - rawCnt} BỘ CHUẨN VÀNG 8/8 DNA`}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Kỳ #{period} • {drawDate} (18:00)
            </span>
            {evo?.generation && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                <Dna className={`w-3.5 h-3.5 text-slate-600 ${evo.running ? "animate-spin" : ""}`} />
                Đời #{evo.generation.toLocaleString()} ({evo.squad_size || 12} quân) • Tổng {evo.winning_draws ?? 0}/{evo.draws_in_window || 116} kỳ 6/6
              </span>
            )}
            {statusData.is_draw_locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <Lock className="w-3 h-3" />
                {statusData.standby_phase === "final_buy_window"
                  ? "BỘ SỐ CHỐT CUỐI NGÀY (16:30) • MUA VÉ TRƯỚC 17:45"
                  : "ĐÃ ĐÓNG CỔNG VÉ • CHỜ KẾT QUẢ XỔ & TỰ CHẤM 18:35"}
              </span>
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-900">
            Bộ Dãy Số Đẹp Kỳ Sắp Tới ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"} • Giữ Nguyên Bản Số Gia Tộc + Chuẩn Vàng DNA)
          </h3>
        </div>

        <button
          onClick={handleCopyAll}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 self-start lg:self-center"
        >
          {copiedKey === "ALL" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copiedKey === "ALL" ? "Đã Sao Chép Trọn Bộ!" : "Sao Chép Nguyên Bộ Hội Đồng"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {topRows.map((gr: any, idx: number) => (
          <GoldenSignalRowCard key={`${gr.ticket_id || idx}-${gr.row_label}-${idx}`} gr={gr} idx={idx} copiedKey={copiedKey} onCopy={copyText} />
        ))}
      </div>
    </div>
  );
};
