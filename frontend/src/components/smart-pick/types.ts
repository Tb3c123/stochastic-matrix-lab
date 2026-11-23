export type StrategyType =
  | "balanced"
  | "mean_reversion"
  | "pure_random"
  | "custom_manual";

export interface RowSelection {
  label: string;
  inputs: string[];
  numbers: number[];
  specialInput?: string;
  specialNumber?: number | null;
  strategy?: StrategyType;
  error?: string;
}

export interface RowStats {
  sorted: number[];
  sum: number;
  ratio: string;
  jackpotProbStr: string;
  anyPrizeRatio: string;
  thirdPrizeRatio: string;
  secondPrizeRatio: string;
  firstPrizeRatio: string;
  deltaStr: string;
  cycleMultiplier: number;
  specialNum?: number | null;
}

export const ROW_LABELS = [
  "Dãy A",
  "Dãy B",
  "Dãy C",
  "Dãy D",
  "Dãy E",
  "Dãy F",
  "Dãy G",
  "Dãy H",
  "Dãy I",
  "Dãy K"
];

export function createEmptyRow(
  index: number,
  strategy: StrategyType
): RowSelection {
  return {
    label: ROW_LABELS[index] || `Dãy ${index + 1}`,
    inputs: ["", "", "", "", "", ""],
    numbers: [],
    specialInput: "",
    specialNumber: null,
    strategy
  };
}
