import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";

export function useSavedTickets(gameCode: string, refreshTrigger: number) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [algoPerf, setAlgoPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluateNotice, setEvaluateNotice] = useState<string | null>(null);

  const fetchTicketsAndPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/tickets?game_code=${gameCode}`
      );
      const data = await res.json();
      if (data.success && data.data) setTickets(data.data);

      const perfRes = await fetch(
        `${API_BASE_URL}/api/v1/tickets/algorithms-performance?game_code=${gameCode}`
      );
      const perfData = await perfRes.json();
      if (perfData.success && perfData.data) setAlgoPerf(perfData.data);
    } catch (e) {
      console.error("Fetch saved tickets or performance failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tickets/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_code: gameCode })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEvaluateNotice(data.data.message);
        await fetchTicketsAndPerformance();
        setTimeout(() => setEvaluateNotice(null), 8000);
      }
    } catch (e) {
      console.error("Evaluate failed:", e);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    fetchTicketsAndPerformance();
  }, [gameCode, refreshTrigger]);

  return {
    tickets,
    algoPerf,
    loading,
    evaluating,
    evaluateNotice,
    fetchTicketsAndPerformance,
    handleEvaluate
  };
}
