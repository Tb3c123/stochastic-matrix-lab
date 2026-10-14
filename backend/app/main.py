import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.schemas.common import ResponseEnvelope
from app.routers import games, draws, analytics, generator, tickets, auto_cycle
from app.services.scheduler import auto_cycle_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & seed default games on startup
    await init_db()
    # Start automated 10:00 AM daily continuous learning scheduler
    worker_task = asyncio.create_task(auto_cycle_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend for Vietlott Analytics, Historical Draw Data, Number Generator & Backtesting Engine.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Next.js frontend (Vercel & local clients)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
@app.get("/doc", include_in_schema=False)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")

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
app.include_router(tickets.router, prefix=settings.API_V1_STR)
app.include_router(auto_cycle.router, prefix=settings.API_V1_STR)
