"use client";

import React, { useState, useEffect } from "react";
import { ScrollText, Trophy, Swords, Zap, Lock, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

const FILTERS = [
  { id: "all", label: "Tất Cả Sự Kiện", icon: ScrollText },
  { id: "record", label: "Phá Kỷ Lục 6/6", icon: Trophy },
  { id: "round", label: "Nhịp Thi Đấu Liên Tục", icon: Swords },
  { id: "live_score", label: "Chấm Thực Chiến 18:35", icon: Zap },
  { id: "standby", label: "Khóa Chốt 16:30", icon: Lock },
];

const BADGE_STYLE: Record<string, { label: string; cls: string }> = {
  record: { label: "🏆 PHÁ KỶ LỤC", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  round: { label: "⚔️ NHỊP ĐẤU", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  live_score: { label: "⚡ THỰC CHIẾN 18:35", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  standby: { label: "🔒 KHÓA CHỐT 16:30", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

export const ArenaLogsPage: React.FC<{ gameCode: string }> = ({ gameCode }) => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async (initial = false) => {
      if (!initial && typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/auto-cycle/arena-logs?game_code=${gameCode}&limit=150&event_type=${filter}`
        );
        const json = await res.json();
        if (mounted && json.success) {
          setItems(json.data?.items || []);
        }
      } catch (e) {
        console.error("Load arena logs failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    setLoading(true);
    load(true);
    const t = setInterval(() => load(false), 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [gameCode, filter]);

  return (
    <section className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" /> Tự động cập nhật trực tiếp mỗi 5 giây (Lưu trên RAM — 0 hại ổ cứng)
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Nhật Ký Thi Đấu & Tự Học Liên Tục ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"})
            </h2>
          </div>

          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs font-semibold">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                    filter === f.id ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Đang tải luồng nhật ký thi đấu...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Đấu trường đang ghi nhận các nhịp thi đấu mới (sẽ tự hiện sau vài giây)...
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-[#fafbfc]">
            {items.map((it, idx) => {
              const b = BADGE_STYLE[it.event_type] || BADGE_STYLE.round;
              return (
                <div key={`${it.timestamp}-${it.generation}-${idx}`} className="p-3.5 md:p-4 bg-white hover:bg-slate-50 transition-colors space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${b.cls}`}>
                        {b.label}
                      </span>
                      <span className="font-mono font-semibold text-slate-500">{it.timestamp}</span>
                      {it.generation > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold">
                          Đời #{Number(it.generation).toLocaleString()}
                        </span>
                      )}
                      {it.draws_total > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-semibold">
                          Tổng {it.winning_draws}/{it.draws_total} kỳ 6/6
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Nhịp: <b className="text-slate-800">{it.mode}</b>
                      {it.live_prestige > 0 && <> • Thực chiến: <b className="text-blue-800">+{Number(it.live_prestige).toLocaleString()}</b></>}
                    </span>
                  </div>

                  <p className="text-xs md:text-sm text-slate-800 font-medium leading-relaxed">{it.message}</p>

                  {Array.isArray(it.top_tribes) && it.top_tribes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-500">Top 3 lúc ghi:</span>
                      {it.top_tribes.map((tStr: string, ti: number) => (
                        <span key={ti} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                          #{ti + 1} {tStr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
