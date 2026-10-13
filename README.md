# 🔬 Stochastic Matrix Lab (SML)

**Advanced Discrete Sequence Analytics, Multi-Armed Bandit & Adaptive Bayesian Optimization Engine**

An experimental mathematical and data analytics platform designed for modeling discrete random sequences, combination space distributions, Markov gap intervals, and reinforcement-driven heuristic optimization.

---

## 🌟 Core Research & Algorithmic Capabilities

1. **Statistical Inference & High-Dimensional Visualizations**:
   - **Frequency Density & Spectral Distribution**: Frequency analysis across discrete sample windows ($N = 100$).
   - **Lateness Interval Decay (Markov Gap Matrix)**: Tracks consecutive absence steps and maximum historical recurrence intervals across sample sets $S \in [1, 45]$ and $S \in [1, 55]$.
   - **Gaussian Sum Distribution & Parity Ratio**: Bell curve modeling comparing empirical sample sums against theoretical combinatorial limits $\binom{45}{6}$ and $\binom{55}{6}$.

2. **Heuristic Sample Vector Generator**:
   - Multi-vector batch generation (vectors $A$ through $E$).
   - 4 selectable exploration strategies:
     - **Balanced Distribution Partitioning (Entropy-balanced)**
     - **Mean Reversion Gap Recovery (Targeting high-lateness elements)**
     - **Pure Uniform Pseudo-Random Sampling**
     - **Adaptive Ensemble Bayesian + Bandit Reinforcement**
   - Real-time probability multiplier calculations and distribution scoring.

3. **Strict Out-of-Sample Forward Verification**:
   - Enforces forward-looking evaluation integrity: Generated vectors are locked to upcoming sequence batches, strictly preventing lookahead bias or data contamination.
   - Automated discrepancy calculation and payoff evaluation upon incoming stream events.

4. **Multi-Armed Bandit & Bayesian Recalibration Loop**:
   - **Bayesian Adaptive Weights**: Dynamically updates component weights ($w_{lateness}, w_{gauss\_sum}, w_{hot}, w_{parity}$) using error gradient feedback after each batch.
   - **Multi-Armed Bandit Agent**: Balances exploration of sparse combinations with exploitation of optimal Gaussian centers.
   - Real-time parameter telemetry rendered via dynamic visual dashboard indicators.

5. **Closed-Loop Automated Ingestion Pipeline**:
   - Daily scheduled background service executing:
     $$\text{Data Ingestion} \longrightarrow \text{Vector Matching} \longrightarrow \text{Bayesian Weight Tuning} \longrightarrow \text{Candidate Vector Synthesis}$$
   - On-demand pipeline execution triggered via REST endpoints or UI controls.

---

## 🏗️ Architecture & Technology Stack

- **Backend Service**:
  - [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+) - Asynchronous, high-throughput RESTful architecture.
  - [SQLAlchemy 2.0 (Async)](https://www.sqlalchemy.org/) + SQLite / PostgreSQL - Asynchronous ORM and relational state persistence.
  - [Polars](https://pola.rs/) & [NumPy](https://numpy.org/) - High-performance vectorized arithmetic and matrix transformations.
  - [HTTPX](https://www.python-httpx.org/) & [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) - Resilient dual-stream data ingestion engine.
  - [Pytest](https://pytest.org/) - 100% automated test suite coverage with AsyncIO fixtures.

- **Frontend Interface**:
  - [Next.js 15](https://nextjs.org/) (App Router, React 19) - Responsive SSR & client-side dashboard state management.
  - [Tailwind CSS](https://tailwindcss.com/) - Dark analytical telemetry theme.
  - [Recharts](https://recharts.org/) - Dynamic Gaussian curve and frequency distribution charts.
  - [Lucide React](https://lucide.dev/) - Technical typography and iconography.

---

## 🚀 Getting Started

### Method 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/Tb3c123/stochastic-matrix-lab.git
cd stochastic-matrix-lab

# Build and run containers
docker compose up -d --build
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- OpenAPI Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Method 2: Manual Local Setup

#### Prerequisites
- Python 3.9+
- Node.js 18+ & npm

#### 1. Backend Service
```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Application
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

---

## 🧪 Verification & Automated Testing

Run the full automated test suite:

```bash
cd backend
.venv/bin/pytest tests -v
```

All 23 test units validate database schemas, vector generation distributions, bandit weight recalibration, and dual-source ingestion.

---

## 📄 License & Attribution

This project is released under the MIT Open Source License. Designed for statistical modeling, academic research, and machine learning experimentation.
