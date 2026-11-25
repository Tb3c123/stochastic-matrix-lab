import React from "react";
import { ShieldAlert } from "lucide-react";

export const Disclaimer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm md:text-base font-bold text-slate-900">
                Tuyên Bố Miễn Trừ Trách Nhiệm & Nguyên Tắc Khoa Học (Disclaimer)
              </h4>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Nền tảng <b>VIETLOT Analytics</b> là một dự án nghiên cứu khoa học dữ liệu, phục vụ mục đích học tập, thống kê toán học và mô phỏng xác suất thuần túy.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 pt-1">
                <li>
                  <b>Tính độc lập ngẫu nhiên (IID)</b>: Mọi kỳ quay xổ số là các biến cố ngẫu nhiên độc lập. Các thuật toán thống kê (Hot/Cold, Lateness, Mean Reversion) chỉ phân tích hành vi trong quá khứ và không thể bảo đảm hoặc cam kết trúng thưởng ở kỳ tương lai.
                </li>
                <li>
                  <b>Phi thương mại & Tuân thủ pháp luật</b>: Nền tảng không tổ chức cá cược, không bán vé hộ, và không thu phí dự đoán. Hãy chơi có trách nhiệm và coi xổ số là hình thức giải trí vui vẻ.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 mt-6">
          © 2026 Vietlot Analytics Platform. Xây dựng theo tiêu chuẩn Agentic AI SDLC Kit.
        </div>
      </div>
    </footer>
  );
};
