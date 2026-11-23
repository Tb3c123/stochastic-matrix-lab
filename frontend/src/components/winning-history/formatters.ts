export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export const DEFAULT_WINNING_SUMMARY = {
  total_evaluated_tickets: 0,
  total_evaluated_rows: 0,
  row_cost_vnd: 10000,
  total_spent_vnd: 0,
  total_winning_tickets: 0,
  total_prize_vnd: 0,
  net_profit_vnd: 0,
  win_rate_pct: 0,
  highest_prize_name: "Chưa có",
  highest_prize_amount: 0,
  tier_counts: { jackpot_1: 0, jackpot_2: 0, first: 0, second: 0, third: 0 }
};

export function getTierBadge(prizeName: string): { label: string; cls: string } {
  const p = prizeName.toLowerCase();
  if (p.includes("jackpot 1")) {
    return {
      label: "JACKPOT 1",
      cls: "bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-500/20"
    };
  }
  if (p.includes("jackpot 2")) {
    return {
      label: "JACKPOT 2",
      cls: "bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 border-orange-300 font-black shadow-md"
    };
  }
  if (p.includes("nhất")) {
    return {
      label: "GIẢI NHẤT",
      cls: "bg-red-500/15 text-red-400 border-red-500/30 font-bold"
    };
  }
  if (p.includes("nhì")) {
    return {
      label: "GIẢI NHÌ",
      cls: "bg-sky-500/15 text-sky-400 border-sky-500/30 font-bold"
    };
  }
  if (p.includes("ba")) {
    return {
      label: "GIẢI BA",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold"
    };
  }
  return {
    label: prizeName,
    cls: "bg-slate-800 text-slate-300 border-slate-700 font-semibold"
  };
}

export function getStrategyBadge(stratCode: string): {
  label: string;
  cls: string;
} {
  switch (stratCode) {
    case "mixed":
      return {
        label: "🔀 Hỗn Hợp",
        cls: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30"
      };
    case "balanced":
      return {
        label: "⚡ Cân Bằng",
        cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      };
    case "mean_reversion":
      return {
        label: "📈 Hồi Quy",
        cls: "bg-sky-500/15 text-sky-400 border-sky-500/30"
      };
    case "pure_random":
      return {
        label: "🎲 Ngẫu Nhiên",
        cls: "bg-amber-500/15 text-amber-400 border-amber-500/30"
      };
    case "custom_manual":
    case "custom":
      return {
        label: "✍️ Điền Tay",
        cls: "bg-purple-500/15 text-purple-400 border-purple-500/30"
      };
    case "hybrid_ai_learned":
      return {
        label: "🤖 AI Hybrid",
        cls: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
      };
    default:
      return {
        label: stratCode || "Thuật Toán",
        cls: "bg-slate-800 text-slate-300 border-slate-700"
      };
  }
}
