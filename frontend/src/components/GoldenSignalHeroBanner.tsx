"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Sparkles, Copy, Check, ArrowRight, ShieldCheck } from "lucide-react";

interface GoldenSignalHeroBannerProps {
  gameCode: string;
  refreshTrigger?: number;
  onOpenAiTab: () => void;
}

const fmtBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const GoldenSignalHeroBanner: React.FC<GoldenSignalHeroBannerProps> = ({
  gameCode,
  refreshTrigger = 0,
  onOpenAiTab,
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`)
      .then((r) => r.json())
      .then((json) => {
        if (mounted && json.success && json.data) setStatusData(json.data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [gameCode, refreshTrigger]);

  if (!statusData) return null;

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
            .filter((fc: any) => (fc.jackpot_gates_passed ?? 0) >= 7)
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
      .map((r: any, i: number) => {
        const ns = (r.numbers || []).map(fmtBall).join(" ");
        return `#${i + 1} (${r.row_label}): ${ns}${r.special_number ? ` + ĐB:${fmtBall(r.special_number)}` : ""}`;
      })
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
              {isPerfect8 ? `THỜI ĐIỂM VÀNG • ${goldenRows.length} BỘ SỐ ĐẠT CHUẨN 8/8 CỔNG DNA` : "BỘ DÃY SỐ ĐẸP TIỀM NĂNG CAO KỲ TỚI"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              Kỳ Mở Thưởng #{period} • {drawDate} (18:00)
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-white">
            Bộ Dãy Số Đẹp Khuyên Dùng Cho Kỳ Sắp Tới ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"})
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={handleCopyAll} className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/50 flex items-center gap-1.5 cursor-pointer transition-all">
            {copiedKey === "ALL" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === "ALL" ? "Đã Chép Trọn Bộ!" : "Sao Chép Nguyên Bộ Số Đẹp"}
          </button>
          <button onClick={onOpenAiTab} className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20">
            Xem Phân Tích 4 Vé AI <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {topRows.map((gr: any, idx: number) => {
          const rowKey = `${gr.ticket_id || idx}-${gr.row_label}`;
          const rowStr = (gr.numbers || []).map(fmtBall).join(" ") + (gr.special_number ? ` + ĐB:${fmtBall(gr.special_number)}` : "");
          return (
            <div key={rowKey} className="rounded-2xl bg-slate-950/90 border border-amber-400/50 p-4 md:p-5 flex flex-col justify-between gap-3.5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs">
                    🎯 BỘ #{idx + 1} • {gr.row_label} ({gr.jackpot_gates_passed ?? 8}/8 CỔNG DNA • {gr.row_beauty_score ?? 99.5}đ)
                  </span>
                  <span className="text-xs font-bold text-amber-300/90">{gr.variant_name}</span>
                </div>
                <button onClick={() => copyText(rowKey, rowStr)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer">
                  {copiedKey === rowKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === rowKey ? "Đã chép" : "Chép dãy"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 py-1">
                {(gr.numbers || []).map((n: number) => (
                  <span key={n} className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black text-base md:text-lg flex items-center justify-center font-mono shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/60">
                    {fmtBall(n)}
                  </span>
                ))}
                {gr.special_number && (
                  <>
                    <span className="text-amber-400 font-black text-lg">+</span>
                    <span className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-emerald-400/20 border-2 border-emerald-400 text-emerald-300 font-black text-base md:text-lg flex items-center justify-center font-mono" title="Bóng Đặc Biệt Jackpot 2">
                      {fmtBall(gr.special_number)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-[11px] text-slate-300 font-mono">
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> AC={gr.ac_value ?? 10}/10 • {gr.primes_count ?? 2} Nguyên tố • {gr.distinct_last_digits ?? 6}/6 Đuôi
                </span>
                <span>Tổng <b className="text-amber-300">{gr.sum}</b> • {gr.parity || "3C : 3L"} • {gr.low_high_ratio || "3T : 3C"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
