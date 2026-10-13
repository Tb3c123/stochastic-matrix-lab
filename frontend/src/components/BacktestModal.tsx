import React, { useState, useEffect } from "react";
import { X, Play, Trophy, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

interface BacktestModalProps {
  numbers: number[];
  gameCode: string;
  onClose: () => void;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({ numbers, gameCode, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/v1/generator/backtest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_code: gameCode,
            selected_numbers: numbers,
            window_size: 100
          })
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (e) {
        console.error("Backtest error:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [numbers, gameCode]);

  const formatVND = (val: number) => new Intl.NumberFormat("vi-VN").format(val) + " đ";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Kết Quả Mô Phỏng Lịch Sử</h3>
            <p className="text-xs text-slate-400">Đối soát {numbers.map(n => (n < 10 ? `0${n}` : n)).join(", ")}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 animate-pulse">
            Đang đối soát với lịch sử các kỳ quay...
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Số Kỳ Kiểm Thử</div>
                <div className="text-2xl font-bold text-white mt-1">{data.draws_tested} Kỳ</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Tổng Vốn (10k/kỳ)</div>
                <div className="text-2xl font-bold text-slate-300 mt-1">{formatVND(data.estimated_cost_vnd)}</div>
              </div>
            </div>

            {/* Match breakdown */}
            <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Thống Kê Giải Trúng</div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-400 font-semibold">Trúng 6 số (Jackpot):</span>
                <span className="font-bold text-white">{data.matches_summary.match_6} lần</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400 font-semibold">Trúng 5 số (Giải Nhất):</span>
                <span className="font-bold text-white">{data.matches_summary.match_5} lần</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400 font-semibold">Trúng 4 số (Giải Nhì):</span>
                <span className="font-bold text-white">{data.matches_summary.match_4} lần</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400 font-semibold">Trúng 3 số (Giải Ba):</span>
                <span className="font-bold text-white">{data.matches_summary.match_3} lần</span>
              </div>
            </div>

            {/* ROI summary */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Tổng Tiền Thưởng:</div>
                <div className="text-xl font-bold text-emerald-400">{formatVND(data.estimated_winnings_vnd)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Lợi Nhuận / Tỷ Suất:</div>
                <div className={`text-xl font-black ${data.roi_percentage >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.roi_percentage >= 0 ? `+${data.roi_percentage}%` : `${data.roi_percentage}%`}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 italic flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              Kết quả backtest mang tính chất thống kê lịch sử ngẫu nhiên, không đại diện cho tương lai.
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-red-400 text-sm">Không thể kết nối máy chủ phân tích.</div>
        )}
      </div>
    </div>
  );
};
