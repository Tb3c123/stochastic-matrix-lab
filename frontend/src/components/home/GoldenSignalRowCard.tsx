import React from "react";
import { Copy, Check, ShieldCheck } from "lucide-react";

const fmtBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const GoldenSignalRowCard: React.FC<{
  gr: any;
  idx: number;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}> = ({ gr, idx, copiedKey, onCopy }) => {
  const rowKey = `${gr.ticket_id || idx}-${gr.row_label}`;
  const rowStr =
    (gr.numbers || []).map(fmtBall).join(" ") +
    (gr.special_number ? ` + ĐB:${fmtBall(gr.special_number)}` : "");

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-amber-400/50 p-4 md:p-5 flex flex-col justify-between gap-3.5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs">
            🎯 BỘ #{idx + 1} • {gr.jackpot_gates_passed ?? 8}/8 DNA ({gr.row_beauty_score ?? 98.5}đ)
          </span>
          {gr.council_badge && (
            <span className="px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-200 font-bold text-[11px]">
              {gr.council_badge}
            </span>
          )}
        </div>
        <button
          onClick={() => onCopy(rowKey, rowStr)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer"
        >
          {copiedKey === rowKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copiedKey === rowKey ? "Đã chép" : "Chép dãy"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 py-1">
        {(gr.numbers || []).map((n: number) => (
          <span
            key={n}
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black text-base md:text-lg flex items-center justify-center font-mono shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/60"
          >
            {fmtBall(n)}
          </span>
        ))}
        {gr.special_number && (
          <span
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-emerald-400/20 border-2 border-emerald-400 text-emerald-300 font-black text-sm md:text-base flex items-center justify-center font-mono ml-1"
            title="Bóng Đặc Biệt Jackpot 2"
          >
            +{fmtBall(gr.special_number)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-[11px] text-slate-300 font-mono">
        <span className="text-emerald-300 font-bold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> AC={gr.ac_value ?? 10}/10 • {gr.primes_count ?? 2} Nguyên tố • {gr.distinct_last_digits ?? 6}/6 Đuôi
        </span>
        <span>
          Tổng <b className="text-amber-300">{gr.sum}</b> • {gr.parity || "3C : 3L"} • {gr.low_high_ratio || "3T : 3C"}
        </span>
      </div>
    </div>
  );
};
