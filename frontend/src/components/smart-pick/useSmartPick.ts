import { useState, useEffect } from "react";
import { RowSelection, StrategyType, createEmptyRow } from "./types";
import { parseRowInputChange, parseSpecialInputChange } from "./rowStatsUtils";
import { fetchSmartPickTickets, saveSmartPickTicket } from "./smartPickApi";

const formatBall = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function applyTicketToRow(r: RowSelection, ticket: any, strat: StrategyType) {
  const spNum: number | null = ticket.special_number || null;
  return {
    ...r,
    inputs: ticket.numbers.map(formatBall),
    numbers: ticket.numbers,
    specialInput: spNum ? formatBall(spNum) : "",
    specialNumber: spNum,
    strategy: strat,
    error: undefined
  };
}

export function useSmartPick(gameCode: string, onTicketSaved?: () => void) {
  const isPower = gameCode === "power_6_55";
  const maxNumber = isPower ? 55 : 45;
  const [rowCount, setRowCount] = useState<number>(5);
  const [strategy, setStrategy] = useState<StrategyType>("custom_manual");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<RowSelection[]>(() =>
    Array.from({ length: 5 }, (_, i) => createEmptyRow(i, "custom_manual"))
  );

  useEffect(() => {
    setRows((prev) =>
      Array.from(
        { length: rowCount },
        (_, i) => prev[i] || createEmptyRow(i, strategy)
      )
    );
  }, [rowCount, gameCode]);

  const handleRandomFillSingle = async (rowIndex: number) => {
    setLoading(true);
    try {
      const data = await fetchSmartPickTickets(gameCode, strategy, 1);
      const ticket = data.success ? data.data?.tickets?.[0] : null;
      if (ticket?.numbers) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === rowIndex ? applyTicketToRow(r, ticket, strategy) : r
          )
        );
      }
    } catch (e) {
      console.error("Auto fill error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    setLoading(true);
    const fetchStrat = strategy === "custom_manual" ? "balanced" : strategy;
    if (strategy === "custom_manual") setStrategy("balanced");
    try {
      const data = await fetchSmartPickTickets(gameCode, fetchStrat, rowCount);
      if (data.success && data.data?.tickets) {
        const tickets = data.data.tickets;
        setRows((prev) =>
          prev.map((r, idx) =>
            tickets[idx] ? applyTicketToRow(r, tickets[idx], fetchStrat) : r
          )
        );
      }
    } catch (e) {
      console.error("Generate all error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTicket = async () => {
    const validRowsData = rows
      .filter((r) => r.numbers.length === 6 && !r.error)
      .map((r) => ({
        numbers: [...r.numbers].sort((a, b) => a - b),
        strategy: r.strategy || strategy,
        special_number: r.specialNumber || null
      }));
    if (validRowsData.length === 0) {
      alert("Vui lòng điền đủ 6 số hợp lệ cho ít nhất 1 dãy trước khi lưu vé!");
      return;
    }
    const rowStrats = validRowsData.map((d) => d.strategy);
    const distinctStrats = Array.from(new Set(rowStrats.filter(Boolean)));
    const effectiveStrategy =
      distinctStrats.length === 1
        ? distinctStrats[0]
        : distinctStrats.length > 1
          ? "mixed"
          : strategy;

    setSaving(true);
    try {
      const data = await saveSmartPickTicket({
        game_code: gameCode,
        strategy: effectiveStrategy,
        rows: validRowsData.map((d) => d.numbers),
        row_strategies: rowStrats,
        special_numbers: validRowsData.map((d) => d.special_number)
      });
      if (data.success && data.data) {
        setSaveSuccessMsg(
          `Đã lưu vé thành công (${validRowsData.length} dãy) cho Kỳ #${data.data.target_draw_period}! Hệ thống sẽ theo dõi và tự động đối soát học hỏi khi có kết quả.`
        );
        if (onTicketSaved) onTicketSaved();
        setTimeout(() => setSaveSuccessMsg(null), 7000);
      }
    } catch (e) {
      console.error("Save ticket failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return {
    isPower, maxNumber, rowCount, setRowCount, strategy, setStrategy,
    loading, saving, saveSuccessMsg, rows, setRows,
    handleRandomFillSingle, handleGenerateAll, handleSaveTicket,
    updateInput: (rIdx: number, inputIdx: number, val: string) =>
      setRows((prev) => prev.map((r, i) => (i === rIdx ? parseRowInputChange(r, inputIdx, val, maxNumber) : r))),
    updateSpecial: (rIdx: number, val: string) =>
      setRows((prev) => prev.map((r, i) => (i === rIdx ? parseSpecialInputChange(r, val, maxNumber) : r))),
    clearRow: (rIdx: number) =>
      setRows((prev) => prev.map((r, i) => (i === rIdx ? { ...r, inputs: ["", "", "", "", "", ""], numbers: [], error: undefined } : r))),
    clearAll: () =>
      setRows((prev) => prev.map((r) => ({ ...r, inputs: ["", "", "", "", "", ""], numbers: [], error: undefined })))
  };
}
