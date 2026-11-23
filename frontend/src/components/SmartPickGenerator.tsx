import React from "react";
import { CheckCircle2 } from "lucide-react";
import { useSmartPick } from "./smart-pick/useSmartPick";
import { SmartPickToolbar } from "./smart-pick/SmartPickToolbar";
import { SmartPickRowItem } from "./smart-pick/SmartPickRowItem";

interface SmartPickProps {
  gameCode: string;
  onRunBacktest: (numbers: number[]) => void;
  onTicketSaved?: () => void;
}

export const SmartPickGenerator: React.FC<SmartPickProps> = ({
  gameCode,
  onRunBacktest,
  onTicketSaved
}) => {
  const {
    isPower,
    maxNumber,
    rowCount,
    setRowCount,
    strategy,
    setStrategy,
    loading,
    saving,
    saveSuccessMsg,
    rows,
    setRows,
    handleRandomFillSingle,
    handleGenerateAll,
    handleSaveTicket,
    updateInput,
    updateSpecial,
    clearRow,
    clearAll
  } = useSmartPick(gameCode, onTicketSaved);

  const validRowsCount = rows.filter(
    (r) => r.numbers.length === 6 && !r.error
  ).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      <SmartPickToolbar
        gameCode={gameCode}
        rowCount={rowCount}
        onRowCountChange={setRowCount}
        strategy={strategy}
        onStrategyChange={(newStrat) => {
          setStrategy(newStrat);
          setRows((prev) => prev.map((r) => ({ ...r, strategy: newStrat })));
        }}
        loading={loading}
        saving={saving}
        validRowsCount={validRowsCount}
        onGenerateAll={handleGenerateAll}
        onClearAll={clearAll}
        onSaveTicket={handleSaveTicket}
      />

      {saveSuccessMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-xs md:text-sm animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="font-medium">{saveSuccessMsg}</div>
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row, rIdx) => (
          <SmartPickRowItem
            key={rIdx}
            row={row}
            defaultStrategy={strategy}
            isPower={isPower}
            maxNumber={maxNumber}
            loading={loading}
            onStrategyChange={(newStrat) =>
              setRows((prev) =>
                prev.map((r, i) =>
                  i === rIdx ? { ...r, strategy: newStrat } : r
                )
              )
            }
            onInputChange={(inputIdx, val) => updateInput(rIdx, inputIdx, val)}
            onSpecialChange={(val) => updateSpecial(rIdx, val)}
            onRandomFill={() => handleRandomFillSingle(rIdx)}
            onClear={() => clearRow(rIdx)}
            onRunBacktest={onRunBacktest}
          />
        ))}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-slate-800/30 border border-slate-800/60 flex items-start gap-3 text-xs text-slate-400">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">
            Quy tắc đối soát:{" "}
          </span>
          Hệ thống quy định{" "}
          <b>
            đối soát so sánh vé chỉ được phép thực hiện cho kỳ mở thưởng sắp tới
          </b>
          , không đối soát các kỳ đã qua. Khi ưng ý với các con số, hãy bấm{" "}
          <b>&quot;Lưu Vé & Đặt Lịch Theo Dõi Kỳ Tiếp Theo&quot;</b> hoặc{" "}
          <b>&quot;🎯 Đối Soát Kỳ Sắp Tới&quot;</b> để hệ thống tự động đối soát
          ngay khi có kết quả mới nhất!
        </div>
      </div>
    </div>
  );
};
