export function getRowAlgorithmBadge(
  rowForecast: any,
  ticketStrategy: string,
  rowIndex: number
) {
  const code =
    rowForecast?.algorithm_code ||
    (ticketStrategy === "hybrid_ai_learned"
      ? rowIndex < 2
        ? "hybrid_exploitation_bayes"
        : rowIndex === 2
          ? "hybrid_mean_reversion"
          : "hybrid_exploration_bandit"
      : ticketStrategy);

  switch (code) {
    case "custom_manual":
    case "custom":
      return {
        label: "✍️ Điền Tay",
        fullName: "Dãy số do bạn tự điền tay theo trực giác",
        cls: "bg-purple-500/10 text-purple-400 border-purple-500/30"
      };
    case "balanced":
      return {
        label: "⚡ Cân Bằng",
        fullName: "Thuật toán Cân Bằng Chu Kỳ (Gauss & Chẵn Lẻ)",
        cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      };
    case "mean_reversion":
      return {
        label: "📈 Hồi Quy",
        fullName: "Thuật toán Hồi Quy Chu Kỳ Số Trễ",
        cls: "bg-sky-500/10 text-sky-400 border-sky-500/30"
      };
    case "pure_random":
      return {
        label: "🎲 Ngẫu Nhiên",
        fullName: "Thuật toán Ngẫu Nhiên Độc Lập",
        cls: "bg-amber-500/10 text-amber-400 border-amber-500/30"
      };
    case "hybrid_exploitation_bayes":
      return {
        label: "🤖 AI Khai Thác",
        fullName: "AI Khai Thác (Bayes + Gauss)",
        cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
      };
    case "hybrid_mean_reversion":
      return {
        label: "🤖 AI Hồi Quy",
        fullName: "AI Hồi Quy Chu Kỳ Trễ",
        cls: "bg-sky-500/10 text-sky-400 border-sky-500/30"
      };
    case "hybrid_exploration_bandit":
      return {
        label: "🤖 AI Thăm Dò",
        fullName: "AI Thăm Dò (Bandit Agent)",
        cls: "bg-violet-500/10 text-violet-400 border-violet-500/30"
      };
    default:
      return {
        label: "⚡ Cân Bằng",
        fullName: "Thuật toán Chu Kỳ",
        cls: "bg-slate-700/30 text-slate-300 border-slate-700"
      };
  }
}

export function isTicketMatchingAlgo(t: any, algo: string): boolean {
  if (algo === "all") return true;
  if (algo === "mixed") return t.strategy === "mixed";
  const rowForecasts = t.predicted_analysis?.row_forecasts || [];
  if (algo === "custom_manual") {
    if (t.strategy === "custom_manual" || t.strategy === "custom") return true;
    return rowForecasts.some(
      (rf: any) =>
        rf.algorithm_code === "custom_manual" || rf.algorithm_code === "custom"
    );
  }
  if (algo === "hybrid_ai_learned") {
    if (t.strategy === "hybrid_ai_learned") return true;
    return rowForecasts.some((rf: any) =>
      rf.algorithm_code?.startsWith("hybrid_")
    );
  }
  if (t.strategy === algo) return true;
  return rowForecasts.some((rf: any) => rf.algorithm_code === algo);
}
