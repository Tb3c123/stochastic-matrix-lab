import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { DEFAULT_WINNING_SUMMARY } from "./formatters";

export function useWinningHistory(
  selectedGameFilter: string,
  selectedTierFilter: string
) {
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWinningHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/v1/tickets/winning-history`;
      const params = new URLSearchParams();
      if (selectedGameFilter !== "all") params.append("game_code", selectedGameFilter);
      if (selectedTierFilter !== "all") params.append("prize_tier", selectedTierFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) setHistoryData(json.data);
    } catch (e) {
      console.error("Fetch winning history failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinningHistory();
  }, [selectedGameFilter, selectedTierFilter]);

  const summary = historyData?.summary || DEFAULT_WINNING_SUMMARY;
  const rowCostVnd = summary.row_cost_vnd || 10000;
  const totalEvaluatedRows =
    summary.total_evaluated_rows || (summary.total_evaluated_tickets || 0) * 5;
  const totalSpentVnd =
    summary.total_spent_vnd || totalEvaluatedRows * rowCostVnd;
  const winningTickets: any[] = historyData?.winning_tickets || [];
  const totalWinningRowsCount = winningTickets.reduce(
    (acc, t) =>
      acc + (t.winning_rows_count || (t.winning_rows ? t.winning_rows.length : 0)),
    0
  );
  const megaWinCount = winningTickets.filter((t) => t.game_code === "mega_6_45").length;
  const powerWinCount = winningTickets.filter((t) => t.game_code === "power_6_55").length;

  return {
    loading,
    summary,
    rowCostVnd,
    totalEvaluatedRows,
    totalSpentVnd,
    winningTickets,
    totalWinningRowsCount,
    megaWinCount,
    powerWinCount,
    fetchWinningHistory
  };
}
