import { RowSelection, RowStats } from "./types";

export function parseRowInputChange(
  row: RowSelection,
  inputIndex: number,
  val: string,
  maxNumber: number
): RowSelection {
  const cleanVal = val.replace(/\D/g, "").slice(0, 2);
  const newInputs = [...row.inputs];
  newInputs[inputIndex] = cleanVal;

  const parsedNums = newInputs
    .map((s) => (s !== "" ? parseInt(s, 10) : null))
    .filter((n): n is number => n !== null && !isNaN(n));

  let err: string | undefined = undefined;
  const invalidRange = parsedNums.some((n) => n < 1 || n > maxNumber);
  if (invalidRange) {
    err = `Số phải từ 01 đến ${maxNumber}`;
  } else if (new Set(parsedNums).size !== parsedNums.length) {
    err = "Các con số trong 6 số chính không được trùng nhau";
  }

  return {
    ...row,
    inputs: newInputs,
    numbers: parsedNums,
    strategy: "custom_manual",
    error: err
  };
}

export function parseSpecialInputChange(
  row: RowSelection,
  val: string,
  maxNumber: number
): RowSelection {
  const cleanVal = val.replace(/\D/g, "").slice(0, 2);
  const parsed = cleanVal !== "" ? parseInt(cleanVal, 10) : null;
  let err = row.error;

  if (parsed !== null) {
    if (parsed < 1 || parsed > maxNumber) {
      err = `Số đặc biệt phải từ 01 đến ${maxNumber}`;
    } else if (row.numbers.includes(parsed)) {
      err = "Số đặc biệt trùng với 1 trong 6 số chính";
    } else {
      err = undefined;
    }
  }

  return {
    ...row,
    specialInput: cleanVal,
    specialNumber:
      parsed && parsed >= 1 && parsed <= maxNumber ? parsed : null,
    error: err
  };
}

function formatRatio(inv: number): string {
  if (inv >= 1000000) return `1/${(inv / 1000000).toFixed(2)}M`;
  if (inv >= 1000) return `1/${(inv / 1000).toFixed(1)}K`;
  return `1/${Math.round(inv)}`;
}

export function calculateRowStats(
  numbers: number[],
  isPower: boolean,
  specialNum?: number | null
): RowStats | null {
  if (numbers.length !== 6) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, curr) => acc + curr, 0);
  const evens = sorted.filter((n) => n % 2 === 0).length;
  const odds = 6 - evens;

  const baseRatio = isPower ? "1/28.98M" : "1/8.14M";
  let sumFactor = 0.9;
  if (isPower) {
    if (sum >= 140 && sum <= 185) sumFactor = 1.15;
    else if (sum >= 120 && sum <= 200) sumFactor = 1.05;
  } else {
    if (sum >= 120 && sum <= 160) sumFactor = 1.15;
    else if (sum >= 100 && sum <= 175) sumFactor = 1.05;
  }

  let parityFactor = 0.4;
  if (evens === 3) parityFactor = 1.12;
  else if (evens === 2 || evens === 4) parityFactor = 1.06;
  else if (evens === 1 || evens === 5) parityFactor = 0.85;

  const decades = new Set(sorted.map((n) => Math.floor(n / 10))).size;
  const spreadFactor = decades >= 4 ? 1.08 : decades === 3 ? 1.02 : 0.85;
  const specialFactor = isPower && specialNum ? 1.08 : 1.0;

  const cycleMultiplier = Number(
    (sumFactor * parityFactor * spreadFactor * specialFactor).toFixed(2)
  );
  const deltaPct = Math.round((cycleMultiplier - 1.0) * 100);
  const deltaStr = deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`;

  const pAnyBase = isPower ? 75 : 42;
  const pThirdBase = isPower ? 78.7 : 44.56;
  const pSecondBase = isPower ? 1643 : 733;
  const pFirstBase = isPower ? 100659 : 34808;

  return {
    sorted,
    sum,
    ratio: `${evens}C : ${odds}L`,
    jackpotProbStr: `${baseRatio} (${deltaStr})`,
    anyPrizeRatio: formatRatio(pAnyBase / cycleMultiplier),
    thirdPrizeRatio: formatRatio(pThirdBase / cycleMultiplier),
    secondPrizeRatio: formatRatio(pSecondBase / cycleMultiplier),
    firstPrizeRatio: formatRatio(pFirstBase / cycleMultiplier),
    deltaStr,
    cycleMultiplier,
    specialNum
  };
}
