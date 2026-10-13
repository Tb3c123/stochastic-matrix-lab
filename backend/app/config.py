from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Vietlott Analytics & Probability Engine"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///./vietlot.db"
    VIETLOTT_BASE_URL: str = "https://vietlott.vn"
    GITHUB_DATA_FALLBACK_URL: str = "https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data"

settings = Settings()
