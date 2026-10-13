import React, { useState } from "react";
import { Sparkles, Dna, Play, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";

interface Ticket {
  numbers: number[];
  sum_value: number;
  odd_even_ratio: string;
}

interface SmartPickProps {
  gameCode: string;
  onRunBacktest: (numbers: number[]) => void;
}

export const SmartPickGenerator: React.FC<SmartPickProps> = ({ gameCode, onRunBacktest }) => {
  const [strategy, setStrategy] = useState<"balanced" | "mean_reversion" | "pure_random">("balanced");
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/generator/smart-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_code: gameCode,
          strategy: strategy,
          tickets_count: ticketCount
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTickets(data.data.tickets);
      }
    } catch (e) {
      console.error("Generate failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Thuật Toán Xác Suất
          </div>
          <h3 className="text-2xl font-bold text-white">Gợi Ý Bộ Số Thông Minh (Smart Pick)</h3>
          <p className="text-sm text-slate-400">Sinh vé có cơ sở toán học & kiểm định lịch sử (Backtesting)</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="balanced">Chiến lược Cân bằng (Balanced Buckets)</option>
            <option value="mean_reversion">Hồi quy Giá trị Trung bình (Mean Reversion)</option>
            <option value="pure_random">Ngẫu nhiên Tuyệt đối (Pure Random)</option>
          </select>

          <select
            value={ticketCount}
            onChange={(e) => setTicketCount(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value={1}>1 Vé</option>
            <option value={3}>3 Vé</option>
            <option value={5}>5 Vé</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> {loading ? "Đang Tính Toán..." : "Sinh Số Ngay"}
          </button>
        </div>
      </div>

      {/* Generated Tickets Display */}
      {tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket, idx) => (
            <div
              key={idx}
              className="bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">
                  #{idx + 1}
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {ticket.numbers.map((num) => (
                    <span
                      key={num}
                      className="w-10 h-10 md:w-11 md:h-11 rounded-full ball-red text-white font-bold text-sm md:text-base flex items-center justify-center shadow-md"
                    >
                      {num < 10 ? `0${num}` : num}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>Tổng: <b className="text-white">{ticket.sum_value}</b></span>
                  <span>Chẵn/Lẻ: <b className="text-white">{ticket.odd_even_ratio}</b></span>
                </div>

                <button
                  onClick={() => onRunBacktest(ticket.numbers)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" /> Thử Nghiệm Backtest
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
          <Dna className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-400">Chưa có vé nào được sinh</h4>
          <p className="text-xs text-slate-500 mt-1">Chọn chiến lược phía trên và bấm "Sinh Số Ngay" để xem gợi ý thuật toán.</p>
        </div>
      )}
    </div>
  );
};
