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
  failedGates,
}) => (
  <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-800">Kết Luận Kiểm Định 8 Cổng DNA:</span>
        <span
          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
            isGoldenRow
              ? "bg-amber-100 text-amber-900 border border-amber-300"
              : gatesPassed >= 7
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-slate-200 text-slate-700"
          }`}
        >
          {isGoldenRow ? "ĐẠT TUYỆT ĐỐI 8/8 CỔNG DNA" : `Đạt ${gatesPassed}/8 Cổng DNA`}
        </span>
      </div>
      <span className="text-[11px] text-slate-600 font-mono">
        AC={rowForecast?.ac_value ?? audit?.metrics?.ac_value ?? "-"}/10 •{" "}
        {rowForecast?.primes_count ?? audit?.metrics?.primes_count ?? "-"} Ng.Tố •{" "}
        {rowForecast?.distinct_last_digits ?? audit?.metrics?.distinct_last_digits ?? "-"}/6 Đuôi
      </span>
    </div>

    {(passedGates.length > 0 || failedGates.length > 0) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 space-y-1">
          <span className="font-bold text-emerald-800 flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5" /> Đã Vượt Qua ({passedGates.length}/8):
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700">
            {passedGates.map((g: string, gIdx: number) => (
              <li key={gIdx}>{g}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1">
          <span className="font-bold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Chưa Đạt ({failedGates.length}/8):
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700">
            {failedGates.length > 0 ? (
              failedGates.map((fg: string, fgIdx: number) => (
                <li key={fgIdx} className="text-red-700">{fg}</li>
              ))
            ) : (
              <li className="text-emerald-800 font-semibold">Đã khóa trọn vẹn 8/8 Cổng DNA!</li>
            )}
          </ul>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1">
        <span className="font-bold text-slate-800">Ưu Điểm Phân Phối:</span>
        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
          {audit.pros.map((p: string, pIdx: number) => (
            <li key={pIdx}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1">
        <span className="font-bold text-slate-800">Lưu Ý Toán Học:</span>
        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
          {audit.cons.length > 0 ? (
            audit.cons.map((c: string, cIdx: number) => <li key={cIdx}>{c}</li>)
          ) : (
            <li className="text-emerald-700 italic">Dãy số không ghi nhận bất thường xác suất lớn</li>
          )}
        </ul>
      </div>
    </div>

    {audit.tactical_advice && (
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-slate-800">
        <Compass className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-blue-900">Chiến Thuật Phân Bổ:</span>
          <p className="text-[11px] text-slate-700 leading-relaxed">{audit.tactical_advice}</p>
        </div>
      </div>
    )}
  </div>
);
