"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/config/api";
import { Sparkles, Copy, Check, ArrowRight, Dna, Lock } from "lucide-react";
import { GoldenSignalRowCard } from "./home/GoldenSignalRowCard";

const fmtBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const GoldenSignalHeroBanner: React.FC<{
  gameCode: string;
  refreshTrigger?: number;
  onOpenAiTab: () => void;
  onChampionUpgraded?: () => void;
}> = ({ gameCode, refreshTrigger = 0, onOpenAiTab, onChampionUpgraded }) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const verRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = (force = false) => {
      if (!force && typeof document !== "undefined" && document.hidden) return;
      fetch(`${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`)
        .then((r) => r.json())
        .then((j) => {
          if (!mounted || !j.success || !j.data) return;
          setStatusData(j.data);
          const nv = Number(j.data.champion_version || 0);
          if (verRef.current !== null && nv > verRef.current) {
            onChampionUpgraded?.();
          }
          verRef.current = nv;
        })
        .catch(() => {});
    };
    load(true);
    const timer = setInterval(() => load(false), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [gameCode, refreshTrigger, onChampionUpgraded]);

  if (!statusData) return null;

  const evo = statusData.evo_hunter;
  const goldenRows: any[] = statusData.playable_golden_rows || [];
  const tickets: any[] = statusData.latest_ai_tickets || [];
  const topRows: any[] =
    goldenRows.length > 0
      ? goldenRows
      : tickets.slice(0, 2).flatMap((t: any) =>
          (t.row_forecasts || [])
            .map((fc: any, idx: number) => ({
              ...fc, row_label: `Dãy ${String.fromCharCode(65 + idx)}`,
              variant_name: t.variant_name, target_draw_period: t.target_draw_period,
              target_draw_date: t.target_draw_date,
              sum: (fc.numbers || []).reduce((a: number, b: number) => a + b, 0),
            }))
            .slice(0, 2)
        );

  if (topRows.length === 0) return null;

  const isPerfect8 = goldenRows.length > 0;
  const period = topRows[0]?.target_draw_period || statusData.latest_ai_ticket?.target_draw_period || "";
  const drawDate = topRows[0]?.target_draw_date || statusData.latest_ai_ticket?.target_draw_date || "";

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAll = () => {
    const allText = topRows
      .map((r: any, i: number) => `#${i + 1} (${r.row_label}): ${(r.numbers || []).map(fmtBall).join(" ")}${r.special_number ? ` + ĐB:${fmtBall(r.special_number)}` : ""}`)
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
              {isPerfect8 ? `TINH HOA ALPHA • ${goldenRows.length} DÃY ĐẠT 8/8 CỔNG DNA` : "BỘ SỐ KẾT TINH TỪ NHÀ VÔ ĐỊCH TẦN SUẤT"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              Kỳ #{period} • {drawDate} (18:00)
            </span>
            {evo?.generation && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-200 border border-violet-400/40">
                <Dna className={`w-3.5 h-3.5 text-violet-300 ${evo.running ? "animate-spin" : ""}`} />
                Giải đấu Đời #{evo.generation.toLocaleString()} • Nổ {evo.winning_draws}/{evo.draws_in_window} kỳ ({evo.hit_frequency_pct}%) • Max trượt {evo.max_drought} kỳ
              </span>
            )}
            {statusData.is_draw_locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">
                <Lock className="w-3 h-3" /> Đã khóa chốt giờ quay
              </span>
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-white">
            Bộ Dãy Số Đẹp Kỳ Sắp Tới ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"} • v{statusData.champion_version || 1})
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={handleCopyAll} className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/50 flex items-center gap-1.5 cursor-pointer transition-all">
            {copiedKey === "ALL" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === "ALL" ? "Đã Chép Trọn Bộ!" : "Sao Chép Nguyên Bộ Số Đẹp"}
          </button>
          <button onClick={onOpenAiTab} className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20">
            Xem Bảng Xếp Hạng 16 AI <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {topRows.map((gr: any, idx: number) => (
          <GoldenSignalRowCard
            key={`${gr.ticket_id || idx}-${gr.row_label}`}
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
