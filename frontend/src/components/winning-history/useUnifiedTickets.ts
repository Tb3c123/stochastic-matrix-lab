import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "@/config/api";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { DEFAULT_WINNING_SUMMARY } from "./formatters";
import { groupTicketsByDate } from "../saved-tickets/groupTickets";

export function useUnifiedTickets(
  gameCode: string,
  prizeTier: string,
  refreshTrigger: number
) {
  const winCacheKey = `win:${gameCode}:${prizeTier}`;
  const tktCacheKey = `tickets:${gameCode}`;

  const [winHistory, setWinHistory] = useState<any>(() => getClientCache(winCacheKey) || null);
  const [allTickets, setAllTickets] = useState<any[]>(() => getClientCache(tktCacheKey) || []);
  const [loading, setLoading] = useState<boolean>(() => !getClientCache(winCacheKey));

  useEffect(() => {
    let mounted = true;
    const cachedW = getClientCache(winCacheKey);
    const cachedT = getClientCache<any[]>(tktCacheKey);
    if (cachedW) {
      setWinHistory(cachedW);
      setLoading(false);
    } else {
      setLoading(true);
    }
    if (cachedT) setAllTickets(cachedT);

    const load = async (initial = false) => {
      if (!initial && typeof document !== "undefined" && document.hidden) return;
      try {
        const winParams = new URLSearchParams({
          game_code: gameCode,
          strategy: "hybrid_ai_learned",
        });
        if (prizeTier !== "all") winParams.set("prize_tier", prizeTier);

        const [wRes, tRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/tickets/winning-history?${winParams.toString()}`),
          fetch(`${API_BASE_URL}/api/v1/tickets?game_code=${gameCode}&strategy=hybrid_ai_learned`),
        ]);
        const wJson = await wRes.json();
        const tJson = await tRes.json();
        if (!mounted) return;
        if (wJson.success && wJson.data) {
          setClientCache(winCacheKey, wJson.data);
          setWinHistory(wJson.data);
        }
        if (tJson.success && tJson.data) {
          setClientCache(tktCacheKey, tJson.data);
          setAllTickets(tJson.data);
        }
      } catch (e) {
        console.error("Unified tickets fetch failed:", e);
      } finally {
        if (mounted && initial) setLoading(false);
      }
    };

    load(true);
    const timer = setInterval(() => load(false), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [gameCode, prizeTier, refreshTrigger, winCacheKey, tktCacheKey]);

  const summary = winHistory?.summary || DEFAULT_WINNING_SUMMARY;
  const winningTickets: any[] = winHistory?.winning_tickets || [];
  const totalWinningRowsCount = winningTickets.reduce(
    (acc, t) => acc + (t.winning_rows_count || t.winning_rows?.length || 0),
    0
  );
  const pendingTickets = useMemo(
    () => allTickets.filter((t) => t.status === "pending"),
    [allTickets]
  );
  const evaluatedGroups = useMemo(
    () => groupTicketsByDate(allTickets.filter((t) => t.status === "evaluated")),
    [allTickets]
  );

  return {
    loading,
    summary,
    winningTickets,
    totalWinningRowsCount,
    pendingTickets,
    evaluatedGroups,
  };
}
