"use client";

import React, { useState, useEffect } from "react";
import { ScrollText, Trophy, Swords, Zap, Lock, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

const FILTERS = [
  { id: "all", label: "Tất Cả", icon: ScrollText },
  { id: "record", label: "Phá Kỷ Lục", icon: Trophy },
  { id: "round", label: "Nhịp Đấu", icon: Swords },
  { id: "live_score", label: "Thực Chiến 18:35", icon: Zap },
  { id: "standby", label: "Khóa Chốt 16:30", icon: Lock },
];

const BADGE_STYLE: Record<string, { label: string; cls: string }> = {
  record: { label: "🏆 KỶ LỤC", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  round: { label: "⚔️ NHỊP ĐẤU", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  live_score: { label: "⚡ 18:35", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  standby: { label: "🔒 16:30", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
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
          `${API_BASE_URL}/api/v1/auto-cycle/arena-logs?game_code=${gameCode}&limit=120&event_type=${filter}`
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
    <section className="w-full max-w-full overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col h-[calc(100dvh-250px)] min-h-[420px] max-h-[680px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <RefreshCw className="w-3 h-3 animate-spin" /> Trực tiếp 5s (RAM)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Hiển thị {items.length} bản ghi gần nhất • Khung cuộn cố định
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 truncate">
              Nhật Ký Thi Đấu Liên Tục ({gameCode === "power_6_55" ? "Power 6/55" : "Mega 6/45"})
            </h2>
          </div>

          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs font-semibold shrink-0">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                    filter === f.id ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain border border-slate-200 rounded-xl bg-[#fafbfc] divide-y divide-slate-200">
          {loading && items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Đang tải luồng nhật ký thi đấu...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Đấu trường đang ghi nhận các nhịp thi đấu mới (tự hiện sau vài giây)...
            </div>
          ) : (
            items.map((it, idx) => {
              const b = BADGE_STYLE[it.event_type] || BADGE_STYLE.round;
              return (
                <div key={`${it.timestamp}-${it.generation}-${idx}`} className="px-3.5 py-2.5 bg-white hover:bg-slate-50 transition-colors space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] border shrink-0 ${b.cls}`}>
                        {b.label}
                      </span>
                      <span className="font-mono text-slate-500 shrink-0">{it.timestamp}</span>
                      {it.generation > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold shrink-0">
                          Đời #{Number(it.generation).toLocaleString()}
                        </span>
                      )}
                      {it.draws_total > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-semibold shrink-0">
                          {it.winning_draws}/{it.draws_total} kỳ 6/6
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-500 shrink-0">
                      Nhịp: <b className="text-slate-800">{it.mode}</b>
                      {it.live_prestige > 0 && <> • Thực chiến: <b className="text-blue-800">+{Number(it.live_prestige).toLocaleString()}</b></>}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-snug break-words">{it.message}</p>

                  {Array.isArray(it.top_tribes) && it.top_tribes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-600">
                      {it.top_tribes.map((tStr: string, ti: number) => (
                        <span key={ti} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 max-w-full truncate">
                          #{ti + 1} {tStr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
