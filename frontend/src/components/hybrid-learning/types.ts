export interface EscalationStep {
  level: number;
  penalty_multiplier: number;
  ticket_count: number;
  label: string;
}

export const DEFAULT_WEIGHTS = {
  w_lateness: 0.35,
  w_gauss_sum: 0.25,
  w_hot: 0.25,
  w_parity: 0.15
};

export const DEFAULT_ESCALATION_LADDER: EscalationStep[] = [
  {
    level: 0,
    penalty_multiplier: 1.0,
    ticket_count: 1,
    label: "Bậc 0: Tinh Hoa Hội Tụ (1 Vé • Phạt 1.00x)"
  },
  {
    level: 1,
    penalty_multiplier: 1.3,
    ticket_count: 2,
    label: "Bậc 1: Mở Rộng Quét Trễ (2 Vé • Phạt 1.30x)"
  },
  {
    level: 2,
    penalty_multiplier: 1.65,
    ticket_count: 3,
    label: "Bậc 2: Đột Biến Đa Cực (3 Vé • Phạt 1.65x)"
  },
  {
    level: 3,
    penalty_multiplier: 2.0,
    ticket_count: 4,
    label: "Bậc 3: Bao Vây Tối Đa (4 Vé • Phạt 2.00x)"
  }
];

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];

export function formatDrawDateWithDay(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      const dayName = DAY_NAMES[d.getDay()];
      return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]} - 18:00`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
