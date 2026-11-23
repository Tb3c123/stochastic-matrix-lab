export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "N/A") return "Chưa xác định";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function getStrategyBadge(stratCode: string) {
  switch (stratCode) {
    case "mixed":
      return {
        label: "Vé Hỗn Hợp (Điền Tay & Thuật Toán)",
        shortLabel: "Hỗn Hợp",
        bg: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
        dot: "bg-fuchsia-400"
      };
    case "balanced":
      return {
        label: "Thuật Toán Cân Bằng (Balanced)",
        shortLabel: "Cân Bằng",
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-400"
      };
    case "mean_reversion":
      return {
        label: "Thuật Toán Hồi Quy (Mean Reversion)",
        shortLabel: "Hồi Quy",
        bg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        dot: "bg-sky-400"
      };
    case "pure_random":
      return {
        label: "Thuật Toán Ngẫu Nhiên (Pure Random)",
        shortLabel: "Ngẫu Nhiên",
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dot: "bg-amber-400"
      };
    case "custom_manual":
    case "custom":
      return {
        label: "Tự Điền Thủ Công (Điền Tay)",
        shortLabel: "Điền Tay",
        bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        dot: "bg-purple-400"
      };
    case "hybrid_ai_learned":
      return {
        label: "AI Hybrid Đa Tầng (Adaptive)",
        shortLabel: "AI Hybrid",
        bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        dot: "bg-indigo-400"
      };
    default:
      return {
        label: stratCode || "Thuật Toán Chu Kỳ",
        shortLabel: stratCode || "Khác",
        bg: "bg-slate-700/30 text-slate-300 border-slate-700",
        dot: "bg-slate-400"
      };
  }
}
