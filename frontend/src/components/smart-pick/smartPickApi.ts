import { API_BASE_URL } from "@/config/api";
import { StrategyType } from "./types";

export async function fetchSmartPickTickets(
  gameCode: string,
  strategy: StrategyType,
  ticketsCount: number
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/generator/smart-pick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_code: gameCode,
      strategy,
      tickets_count: ticketsCount
    })
  });
  return res.json();
}

export async function saveSmartPickTicket(payload: {
  game_code: string;
  strategy: string;
  rows: number[][];
  row_strategies: StrategyType[];
  special_numbers: Array<number | null>;
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/tickets/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}
