import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/config/api";

export function useHomeLiveDraw(
  selectedGame: string,
  onNewOfficialDraw: () => void
) {
  const [latestDraw, setLatestDraw] = useState<any>(null);
  const [hotColdData, setHotColdData] = useState<any>(null);

  const fetchData = useCallback(async (gameCode: string) => {
    try {
      const [drawRes, hcRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${gameCode}`),
        fetch(`${API_BASE_URL}/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`)
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
    fetchData(selectedGame);
    const timer = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${selectedGame}`);
        const j = await r.json();
        if (j.success && j.data) {
          setLatestDraw((prev: any) => {
            if (prev?.draw_period && prev.draw_period !== j.data.draw_period) {
              onNewOfficialDraw();
            }
            return j.data;
          });
        }
      } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, [selectedGame, fetchData, onNewOfficialDraw]);

  return { latestDraw, hotColdData, fetchData };
}
