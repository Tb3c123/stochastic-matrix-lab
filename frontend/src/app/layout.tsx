import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vietlot Analytics - Nền Tảng Phân Tích & Xác Suất Xổ Số",
  description: "Hệ thống phân tích dữ liệu, thống kê chu kỳ trễ, mô phỏng xác suất và kiểm định ngẫu nhiên cho xổ số Vietlott (Mega 6/45, Power 6/55).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-[#f6f7f9] text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
