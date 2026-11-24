import { API_BASE_URL } from "@/config/api";

const MEM_CACHE: Record<string, any> = {};
const PREFETCHED: Record<string, boolean> = {};

export function getClientCache<T = any>(key: string): T | undefined {
  return MEM_CACHE[key];
}

export function setClientCache<T = any>(key: string, val: T): T {
  MEM_CACHE[key] = val;
  return val;
}

export function prefetchGameBundle(gameCode: string): void {
  if (PREFETCHED[gameCode]) return;
  PREFETCHED[gameCode] = true;

  setTimeout(() => {
    fetch(`${API_BASE_URL}/api/v1/draws/latest?game_code=${gameCode}`)
      .then((r) => r.json())
      .then((j) => j?.success && setClientCache(`draw:${gameCode}`, j.data))
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/v1/analytics/hot-cold?game_code=${gameCode}&window_size=100`)
      .then((r) => r.json())
      .then((j) => j?.success && setClientCache(`hc:${gameCode}`, j.data))
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/v1/auto-cycle/status?game_code=${gameCode}`)
      .then((r) => r.json())
      .then((j) => j?.success && setClientCache(`status:${gameCode}`, j.data))
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/v1/tickets/winning-history?game_code=${gameCode}&strategy=hybrid_ai_learned&prize_tier=jackpot_6`)
      .then((r) => r.json())
      .then((j) => j?.success && setClientCache(`win:${gameCode}:jackpot_6`, j.data))
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/v1/tickets?game_code=${gameCode}&strategy=hybrid_ai_learned`)
      .then((r) => r.json())
      .then((j) => j?.success && setClientCache(`tickets:${gameCode}`, j.data))
      .catch(() => {});
  }, 250);
}
