import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "@/config/api";

export function useHomeLiveDraw(
  selectedGame: string,
  onSyncTrigger: () => void
) {
  const [latestDraw, setLatestDraw] = useState<any>(null);
  const [hotColdData, setHotColdData] = useState<any>(null);
  const champVerRef = useRef<number | null>(null);

  const fetchData = useCallback(async (gameCode: string) => {
    try {
      const [drawRes, hcRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${gameCode}`),
        fetch(`${API_BASE_URL}/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`),
      ]);
      const drawJson = await drawRes.json();
      if (drawJson.success) setLatestDraw(drawJson.data);
      const hcJson = await hcRes.json();
      if (hcJson.success) setHotColdData(hcJson.data);
    } catch (e) {
      console.error("Fetch data error:", e);
    }
  }, []);

  useEffect(() => {
    champVerRef.current = null;
    fetchData(selectedGame);

    const drawTimer = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${selectedGame}`);
        const j = await r.json();
        if (j.success && j.data) {
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
        const nv = Number(j?.data?.champion_version || 0);
        if (champVerRef.current !== null && nv > champVerRef.current) {
          onSyncTrigger();
        }
        champVerRef.current = nv;
      } catch {}
    }, 6000);

    return () => {
      clearInterval(drawTimer);
      clearInterval(verTimer);
    };
  }, [selectedGame, fetchData, onSyncTrigger]);

  return { latestDraw, hotColdData };
}
