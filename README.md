# 🎰 Vietlott AI Analytics & Self-Learning Platform

Nền tảng phân tích thống kê xác suất, sinh số thông minh và hệ thống tự học thích nghi đa tầng (Ensemble Hybrid Learning) dành cho các sản phẩm xổ số điện toán tự chọn Vietlott (**Mega 6/45** và **Power 6/55**).

---

## 🌟 Tính Năng Nổi Bật

1. **Phân Tích Thống Kê & Trực Quan Hóa Đồ Thị Chuyên Sâu**:
   - **Tần Suất Xuất Hiện (Hot/Cold Numbers)**: Thống kê số về nhiều nhất và ít nhất qua 100 kỳ quay.
   - **Ma Trận Chu Kỳ Trễ (Lateness Matrix)**: Tính toán số kỳ vắng mặt liên tiếp hiện tại và kỷ lục vắng mặt cao nhất (Max Gap) cho từng số từ 1 đến 45 (Mega) hoặc 55 (Power).
   - **Phân Phối Chuẩn Gauss & Chẵn/Lẻ**: Biểu đồ phân bổ tổng dãy số và tỷ lệ chẵn/lẻ bám sát không gian tổ hợp lý thuyết.

2. **Bộ Sinh Số Thông Minh (Smart Pick Generator)**:
   - Hỗ trợ tùy chỉnh số lượng dãy trên vé (mặc định 5 dãy, từ A đến E hoặc nhiều hơn).
   - Tích hợp 4 thuật toán chiến lược:
     - **Cân Bằng Phân Phối (Balanced)**
     - **Hồi Quy Trung Bình (Mean Reversion - Bắt số trễ)**
     - **Ngẫu Nhiên Thuần Túy (Pure Random)**
     - **AI Hybrid Learning (Trọng số thích ứng Bayes + Bandit)**
   - Hiển thị tỷ lệ xác suất trúng độc đắc và hệ số khuếch đại chu kỳ theo thời gian thực cho từng dãy số.

3. **Nguyên Tắc Đối Soát Kỳ Tương Lai (Strict Future Draw Tracking)**:
   - **Quy tắc bất di bất dịch**: Vé đã lưu chỉ được phép theo dõi và đối soát cho **kỳ sắp tới**, tuyệt đối không đối soát trên các kỳ đã qua nhằm đảm bảo tính khách quan và minh bạch của thuật toán.
   - Khi có kết quả mở thưởng chính thức, hệ thống tự động đối chiếu từng dãy số, tính số cặp số trúng và giải thưởng thực tế (Jackpot 1, Jackpot 2, Giải Nhất, Nhì, Ba).

4. **Thuật Toán Tự Học Kết Hợp Đa Tầng (Ensemble Hybrid Learning)**:
   - **Bayesian Adaptive Weights**: Tự động điều chỉnh 4 trọng số thành phần ($w_{lateness}, w_{gauss\_sum}, w_{hot}, w_{parity}$) dựa trên gradient sai số thực tế sau mỗi kỳ quay.
   - **Multi-Armed Bandit Reinforcement**: Áp dụng chiến lược cân bằng Thăm dò (Exploration) và Khai thác (Exploitation) khi chọn số.
   - Lưu trữ lịch sử học hỏi và biểu diễn trực quan trên giao diện qua các thanh đo động.

5. **Tự Động Hóa Chu Kỳ Hàng Ngày (Auto-Cycle Scheduler)**:
   - Background worker tự động kích hoạt sau ngày mở thưởng vào **10:00 sáng**:
     $$\text{Cào Kết Quả Mới} \longrightarrow \text{Đối Soát Vé} \longrightarrow \text{Học Hỏi Cập Nhật Trọng Số} \longrightarrow \text{Tự Sinh 1 Vé 5 Dãy Mới}$$
   - Hỗ trợ nút kích hoạt vòng lặp thủ công trực tiếp trên UI.

---

## 🏗️ Kiến Trúc Hệ Thống (Tech Stack)

- **Backend**:
  - [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+) - RESTful API bất đồng bộ hiệu năng cao.
  - [SQLAlchemy 2.0 (Async)](https://www.sqlalchemy.org/) + SQLite / PostgreSQL - Quản trị CSDL và quan hệ ORM.
  - [Polars](https://pola.rs/) & [NumPy](https://numpy.org/) - Xử lý tính toán thống kê và phân tích vector tốc độ cao.
  - [HTTPX](https://www.python-httpx.org/) & [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) - Dual-Source Ingestion Crawler (Cào Vietlott Portal + GitHub Mirror).
  - [Pytest](https://pytest.org/) - Bộ kiểm thử tự động đạt 100% test coverage.

- **Frontend**:
  - [Next.js 15](https://nextjs.org/) (App Router, React 19) - Giao diện SSR & Client Components tối ưu.
  - [Tailwind CSS](https://tailwindcss.com/) - Dark Mode Theme phong cách tương lai, tối ưu cho hiển thị bảng thống kê.
  - [Recharts](https://recharts.org/) - Biểu đồ trực quan hóa số liệu động.
  - [Lucide React](https://lucide.dev/) - Hệ thống biểu tượng giao diện hiện đại.

---

## 🚀 Khởi Động Nhanh (Quick Start)

### Cách 1: Chạy Bằng Docker Compose (Khuyên Dùng)

```bash
# Clone repository
git clone https://github.com/your-repo/vietlot.git
cd vietlot

# Khởi chạy fullstack chỉ với 1 lệnh
docker compose up -d --build
```
- Truy cập Giao diện Web: [http://localhost:3000](http://localhost:3000)
- Truy cập API Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Cách 2: Chạy Thủ Công Trên Môi Trường Local

#### 1. Yêu Cầu Tiên Quyết
- Python 3.9+
- Node.js 18+ & npm

#### 2. Khởi Động Backend
```bash
cd backend

# Tạo và kích hoạt virtual environment (nếu chưa có)
python3 -m venv .venv
source .venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt

# Chạy server FastAPI
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Khởi Động Frontend
```bash
cd frontend

# Cài đặt packages
npm install

# Khởi chạy Next.js development server
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## 🧪 Chạy Kiểm Thử (Testing)

```bash
cd backend
.venv/bin/pytest tests/
```
Toàn bộ 23/23 tests (Analytics, Crawler, Generator, API, Auto-cycle, Database, Tickets) sẽ chạy và kiểm chứng độ chính xác.

---

## 📚 Tài Liệu Hướng Dẫn Vận Hành

Xem chi tiết hướng dẫn vận hành, bảo trì, xử lý sự cố và cơ chế thuật toán tại:
👉 [docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md)

---

## ⚖️ Tuyên Bố Miễn Trừ Trách Nhiệm (Disclaimer)
Xổ số điện toán là trò chơi quay số ngẫu nhiên độc lập về mặt toán học. Các số liệu phân tích, chu kỳ trễ, trọng số Bayes hay dự đoán của AI trên nền tảng chỉ mang tính chất tham khảo học thuật và giải trí, **không đảm bảo bất kỳ tỷ lệ trúng thưởng 100% nào**. Người chơi cần có trách nhiệm và tuân thủ các quy định pháp luật.
