from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEVELOPMENT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    database_url: str = "sqlite:///./careerpal.db"
    secret_key: str = DEFAULT_DEVELOPMENT_SECRET
    access_token_expire_minutes: int = 60
    environment: str = "local"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    model_config = SettingsConfigDict(env_prefix="CAREERPAL_", env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def require_non_default_secret_outside_local(self) -> "Settings":
        if self.environment not in {"local", "test"} and self.secret_key == DEFAULT_DEVELOPMENT_SECRET:
            raise ValueError("secret_key must be configured outside local and test environments")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
