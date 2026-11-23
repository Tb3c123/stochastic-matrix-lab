"use client";

import React from "react";
import { ThumbsUp, AlertTriangle, Compass } from "lucide-react";

interface TicketRowAuditPanelProps {
  audit: any;
  rowForecast: any;
  isGoldenRow: boolean;
  gatesPassed: number;
  passedGates: string[];
  failedGates: string[];
}

export const TicketRowAuditPanel: React.FC<TicketRowAuditPanelProps> = ({
  audit,
  rowForecast,
  isGoldenRow,
  gatesPassed,
  passedGates,
  failedGates
}) => (
  <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 text-xs space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-300">
          Kết Luận Kiểm Định Giải Độc Đắc (8 Cổng DNA):
        </span>
        <span
          className={`font-black px-2 py-0.5 rounded text-[11px] ${
            isGoldenRow
              ? "bg-amber-400 text-slate-950"
              : gatesPassed >= 7
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-slate-800 text-slate-300"
          }`}
        >
          {isGoldenRow
            ? "🎯 ĐẠT TUYỆT ĐỐI 8/8 CỔNG DNA ĐỘC ĐẮC — NÊN SỬ DỤNG"
            : `Đạt ${gatesPassed}/8 Cổng DNA (Chưa Khóa Đủ 8/8)`}
        </span>
      </div>
      <span className="text-[11px] text-slate-400 font-mono">
        AC={rowForecast?.ac_value ?? audit?.metrics?.ac_value ?? "-"}/10 •{" "}
        {rowForecast?.primes_count ?? audit?.metrics?.primes_count ?? "-"} Số
        Ng.Tố •{" "}
        {rowForecast?.distinct_last_digits ??
          audit?.metrics?.distinct_last_digits ??
          "-"}
        /6 Đuôi
      </span>
    </div>

    {(passedGates.length > 0 || failedGates.length > 0) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-2.5 space-y-1">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5" /> Cổng DNA Độc Đắc Đã Vượt Qua (
            {passedGates.length}/8):
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
            {passedGates.map((g: string, gIdx: number) => (
              <li key={gIdx}>{g}</li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Cổng DNA Độc Đắc Chưa Đạt (
            {failedGates.length}/8):
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
            {failedGates.length > 0 ? (
              failedGates.map((fg: string, fgIdx: number) => (
                <li key={fgIdx} className="text-rose-300">
                  {fg}
                </li>
              ))
            ) : (
              <li className="text-emerald-400 font-bold">
                ✅ Đã khóa trọn vẹn 8/8 Cổng DNA Giải Độc Đắc — Không có điểm
                yếu cấu trúc!
              </li>
            )}
          </ul>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          Ưu Điểm Phân Phối:
        </span>
        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
          {audit.pros.map((p: string, pIdx: number) => (
            <li key={pIdx}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          Lưu Ý Toán Học:
        </span>
        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
          {audit.cons.length > 0 ? (
            audit.cons.map((c: string, cIdx: number) => <li key={cIdx}>{c}</li>)
          ) : (
            <li className="text-emerald-400/80 italic">
              Dãy số không ghi nhận bất thường xác suất lớn
            </li>
          )}
        </ul>
      </div>
    </div>

    {audit.tactical_advice && (
      <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-start gap-2.5 text-xs text-indigo-200">
        <Compass className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-indigo-300">
            Chiến Thuật Phân Bổ:
          </span>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {audit.tactical_advice}
          </p>
        </div>
      </div>
    )}
  </div>
);
