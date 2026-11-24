import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "@/config/api";
import { getClientCache, setClientCache, prefetchGameBundle } from "@/lib/clientCache";

export function useHomeLiveDraw(
  selectedGame: string,
  onSyncTrigger: () => void
) {
  const [latestDraw, setLatestDraw] = useState<any>(() => getClientCache(`draw:${selectedGame}`) || null);
  const [hotColdData, setHotColdData] = useState<any>(() => getClientCache(`hc:${selectedGame}`) || null);
  const champVerRef = useRef<number | null>(null);

  const fetchData = useCallback(async (gameCode: string) => {
    try {
      const [drawRes, hcRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${gameCode}`),
        fetch(`${API_BASE_URL}/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`),
      ]);
      const drawJson = await drawRes.json();
      if (drawJson.success) {
        setClientCache(`draw:${gameCode}`, drawJson.data);
        setLatestDraw(drawJson.data);
      }
      const hcJson = await hcRes.json();
      if (hcJson.success) {
        setClientCache(`hc:${gameCode}`, hcJson.data);
        setHotColdData(hcJson.data);
      }
    } catch (e) {
      console.error("Fetch data error:", e);
    }
  }, []);

  useEffect(() => {
    const cachedDraw = getClientCache(`draw:${selectedGame}`);
    const cachedHc = getClientCache(`hc:${selectedGame}`);
    if (cachedDraw) setLatestDraw(cachedDraw);
    if (cachedHc) setHotColdData(cachedHc);
    champVerRef.current = null;

    fetchData(selectedGame);
    prefetchGameBundle(selectedGame === "mega_6_45" ? "power_6_55" : "mega_6_45");

    const drawTimer = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${selectedGame}`);
        const j = await r.json();
        if (j.success && j.data) {
          setClientCache(`draw:${selectedGame}`, j.data);
          setLatestDraw((prev: any) => {
            if (prev?.draw_period && prev.draw_period !== j.data.draw_period) {
              fetchData(selectedGame);
              onSyncTrigger();
            }
            return j.data;
          });
        }
      } catch {}
    }, 30000);

    const verTimer = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${selectedGame}`);
        const j = await r.json();
        if (j?.success && j.data) {
          setClientCache(`status:${selectedGame}`, j.data);
          const nv = Number(j.data.champion_version || 0);
          if (champVerRef.current !== null && nv > champVerRef.current) {
            onSyncTrigger();
          }
          champVerRef.current = nv;
        }
      } catch {}
    }, 5000);

    return () => {
      clearInterval(drawTimer);
      clearInterval(verTimer);
    };
  }, [selectedGame, fetchData, onSyncTrigger]);

  return { latestDraw, hotColdData };
}
