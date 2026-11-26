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
    <div className="rounded-xl bg-[#fafbfc] border border-slate-200 p-4 md:p-5 flex flex-col justify-between gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
            BỘ #{idx + 1} • {gr.jackpot_gates_passed ?? 8}/8 DNA
          </span>
          {gr.origin_badge && (
            <span
              className={`px-2 py-1 rounded-lg font-semibold text-[11px] border ${
                gr.row_origin === "raw_genome"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              {gr.origin_badge}
            </span>
          )}
          {gr.council_badge && (
            <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-[11px]">
              {gr.council_badge}
            </span>
          )}
        </div>
        <button
          onClick={() => onCopy(rowKey, rowStr)}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
        >
          {copiedKey === rowKey ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
          {copiedKey === rowKey ? "Đã chép" : "Chép dãy"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 py-1">
        {(gr.numbers || []).map((n: number) => (
          <span
            key={n}
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-amber-100 border-[1.5px] border-amber-600 text-slate-900 font-bold text-base md:text-lg flex items-center justify-center font-mono"
          >
            {fmtBall(n)}
          </span>
        ))}
        {gr.special_number && (
          <span
            className="w-11 h-11 md:w-12 md:h-12 rounded-full ball-special font-bold text-sm md:text-base flex items-center justify-center font-mono ml-1"
            title="Bóng Đặc Biệt Jackpot 2"
          >
            +{fmtBall(gr.special_number)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-mono">
        <span className="text-emerald-800 font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> AC={gr.ac_value ?? 10}/10 • {gr.primes_count ?? 2} Nguyên tố • {gr.distinct_last_digits ?? 6}/6 Đuôi
        </span>
        <span>
          Tổng <b className="text-slate-900">{gr.sum}</b> • {gr.parity || "3C : 3L"} • {gr.low_high_ratio || "3T : 3C"}
        </span>
      </div>
    </div>
  );
};
