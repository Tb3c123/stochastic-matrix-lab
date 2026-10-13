from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.schemas.common import ResponseEnvelope
from app.routers import games, draws, analytics, generator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & seed default games on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend for Vietlott Analytics, Historical Draw Data, Number Generator & Backtesting Engine.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Next.js frontend and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return ResponseEnvelope(
        success=True,
        data={
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

app.include_router(games.router, prefix=settings.API_V1_STR)
app.include_router(draws.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(generator.router, prefix=settings.API_V1_STR)
