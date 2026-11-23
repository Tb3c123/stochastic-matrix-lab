"use client";

import React from "react";
import { Clock } from "lucide-react";

interface SignalDetectorBannerProps {
  hasPlayableSignal: boolean;
  playableGoldenRows: any[];
  selectedTicket: any;
}

export const SignalDetectorBanner: React.FC<SignalDetectorBannerProps> = ({
  hasPlayableSignal,
  playableGoldenRows,
  selectedTicket
}) => {
  if (hasPlayableSignal) {
    return (
      <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-emerald-500/10 border border-amber-400/60 rounded-2xl p-4 shadow-lg shadow-amber-500/10 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow">
              🎯 TÍN HIỆU SĂN GIẢI ĐỘC ĐẮC ({playableGoldenRows.length} DÃY ĐẠT
              ĐỦ 8/8 CỔNG DNA JACKPOT)
            </span>
            <span className="text-xs text-emerald-300 font-semibold">
              Khóa trọn 8/8 Cổng DNA Độc Đắc: AC=10 (15/15 khoảng cách độc nhất)
              • 2–3 Số nguyên tố • ≥5 Đuôi khác nhau • 3C:3L & 3T:3C • Lõi Gauss
              • ≥2 số &gt;31
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {playableGoldenRows.map((gr: any, gIdx: number) => (
            <div
              key={gIdx}
              className="p-3 rounded-xl bg-slate-950/80 border border-amber-400/40 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black">
                  {gr.variant_name || `Vé #${gr.ticket_batch_index}`} •{" "}
                  {gr.row_label} (8/8 Cổng • {gr.row_beauty_score}đ)
                </span>
                <div className="flex items-center gap-1">
                  {(gr.numbers || []).map((n: number) => (
                    <span
                      key={n}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-[11px] flex items-center justify-center font-mono"
                    >
                      {n < 10 ? `0${n}` : n}
                    </span>
                  ))}
                  {gr.special_number && (
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-[11px] flex items-center justify-center font-mono ml-0.5">
                      +
                      {gr.special_number < 10
                        ? `0${gr.special_number}`
                        : gr.special_number}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                AC={gr.ac_value ?? 10}/10 • {gr.primes_count ?? 2} Ng.Tố • Tổng{" "}
                {gr.sum}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-0.5">
          <div className="font-bold text-slate-200">
            ⏸️ Kỳ #{selectedTicket.target_draw_period} chưa có dãy nào khóa đủ
            8/8 Cổng DNA Giải Độc Đắc (Cao nhất:{" "}
            {selectedTicket.max_gates_passed ?? 6}/8 cổng)
          </div>
          <p className="text-[11px] text-slate-400">
            Để săn Giải Độc Đắc 6/6, hệ thống đòi hỏi vượt qua tuyệt đối 8/8
            cổng (AC=10, 2–3 số nguyên tố, ≥5 đuôi số, đối xứng kép 3C:3L &
            3T:3C, lõi Gauss, ≥2 số &gt;31). Kỳ này chỉ theo dõi tự động.
          </p>
        </div>
      </div>
      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-400 shrink-0">
        Đạt Tối Đa {selectedTicket.max_gates_passed ?? 6}/8 Cổng DNA
      </span>
    </div>
  );
};
